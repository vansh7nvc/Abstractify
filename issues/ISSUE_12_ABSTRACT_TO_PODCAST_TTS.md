# Issue #12: 🎙️ Abstract-to-Podcast Audio Summary (Two-Host Structured Dialogue & TTS)

**Labels**: `enhancement`, `help wanted`, `frontend`, `backend`, `ai`, `difficulty: medium`  
**Difficulty**: `Medium`  
**Target Files**: `netlify/functions/podcast-script.ts` (NEW), `public/js/tts.js` (NEW), [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css), `netlify/functions/__tests__/podcast_script.test.ts` (NEW), `public/__tests__/tts.test.js` (NEW)

---

## 📌 Problem & Context

Researchers frequently consume scientific literature while commuting or multitasking. However, feeding raw abstracts directly into a single TTS voice produces a dry, monotonous read-aloud experience that is difficult to absorb.

Per production guidance from community discussion (Issue #12 comments), the most listenable format is an intermediate **two-host conversational dialogue** (similar to NotebookLM audio overviews). Converting paper metadata and consensus syntheses into structured dialogue turns (`[{"speaker": "A", "text": "..."}, {"speaker": "B", "text": "..."}]`) delivered by alternating voices creates an engaging, natural briefing.

### Architectural Decision: v1 Client-Side TTS vs. v2 Server-Side Audio Pipeline
- **v1 Client-Side TTS (`window.speechSynthesis`)**: Deliberate zero-cost / serverless constraint decision. Netlify synchronous serverless functions enforce a strict 10s execution timeout. Client-side synthesis incurs zero hosting costs and runs instantly. *Known limitation*: OS-dependent voice timbres across platforms and lack of audio file caching.
- **v2 Server-Side Audio Pipeline (Planned Roadmap)**: When backend storage budget permits, a server-side TTS engine (e.g. `edge-tts`) running in a **Netlify Background Function** (filename ends in `-background`, 15 min timeout) will synthesize cached `.mp3` files. The real v2 blocker is storage, not compute. Netlify Blobs (1GB free) or Cloudflare R2 (10GB free, Issue #34) may cover `.mp3` caching without a separate Redis/CDN store — verify limits before planning.
- **Durable Contract**: The intermediate structured turns JSON schema (`speaker: 'A' | 'B'` and `text`) serves as the durable, canonical contract. Audio rendering is derived and disposable, guaranteeing zero breaking changes when migrating to v2.

---

## 🎯 Goal

1. Generate structured two-host dialogue scripts (`speaker: 'A' | 'B'`) directly from paper metadata or Consensus Meter syntheses using Google Gemini with compact JSON output and Upstash Redis caching.
2. Provide a **"🎙️ Audio Briefing"** button on paper cards and the Consensus Meter panel.
3. Deliver audio using dual alternating voices (Host A / Host B) via the browser Web Speech API (`window.speechSynthesis`) for v1.
4. Provide an interactive dialogue transcript preview showing turns with live active-speaker highlighting, serving both as an accessibility feature and as a text fallback when browser voices are unavailable.

---

## ⚙️ Technical Specification

### 1. Dialogue Script Generation (`netlify/functions/podcast-script.ts`)
- **Route**: `POST /api/podcast-script`
- **Request Payload**:
  ```json
  {
    "type": "paper" | "consensus",
    "paper": { "id": "...", "title": "...", "authors": [...], "year": 2024, "abstract": "...", "consensusStance": "supports" },
    "query": "quantum machine learning",
    "consensus": { "consensusScore": 85, "summaryText": "..." }
  }
  ```
- **Output Schema**:
  ```json
  {
    "turns": [
      { "speaker": "A", "text": "Hey everyone, welcome back. Today we're looking at a fascinating paper on..." },
      { "speaker": "B", "text": "Right, and what caught my attention immediately was..." }
    ],
    "cached": false
  }
  ```
- **Token Budget & Generation Constraints**:
  - **Abstract Pre-Processing Cap**: Cap input abstract text at ~350 words prior to prompt construction.
  - **Output Token Ceiling**: Set `maxOutputTokens` to `1536` (accommodating a ~16-turn, ~485-word spoken dialogue with safety margin).
  - **Compact JSON Instruction**: Explicitly instruct Gemini in the prompt: `Output compact, single-line JSON without formatting newlines or indentation to minimize token overhead.` (reclaims ~75 structural whitespace tokens).
  - **Empirical Token Logging**: Log `usage.output_tokens` on every generation to monitor empirical p95 token consumption.
  - **Truncation & Parse Error Recovery**: If `finishReason === "MAX_TOKENS"`, treat the generation as failed: log `usage.candidatesTokenCount`, retry once with the abstract trimmed further, and never cache the result. Trim to the last complete turn and validate terminal punctuation. A repaired array produces a podcast that ends mid-thought, which is worse than no output.
- **Distributed Cache**: Hash dialogue turns and store in Upstash Redis via `cacheSet(key, turns, 86400 * 30)` for instant, zero-marginal-cost re-listening. **Never cache partial/truncated results** (`finishReason === "MAX_TOKENS"`).
- **Deterministic Fallback**: Local two-host script generator if Gemini API key is not provided, network fails, or truncation invalidates JSON.

### 2. Dual-Voice Playback Engine (`public/js/tts.js`)
- **`TTSManager` Class**:
  - Auto-detects and pairs distinct voices (Voice A for Speaker A, Voice B for Speaker B) prioritizing natural English voices.
  - Sequential turn-by-turn playback queue switching voices dynamically between turns.
  - Speed selector support: `1.0x`, `1.25x`, `1.5x`, `2.0x`.
  - Chrome speech synthesis keep-alive handling to prevent automatic 15-second pauses.
  - Event hooks: `onTurnChange(index, turn)`, `onStateChange(state)`, `onComplete()`, `onError(err)`.

### 3. UI Controls & Styling (`public/index.html`, `public/styles.css`, `public/app.js`)
- **Card & Panel Triggers**:
  - `🎙️ Audio Briefing` button on paper cards (`#results-list`) and Consensus Meter panel (`#consensus-progress-box`).
- **Podcast Player Dock (`#podcast-player-dock`)**:
  - Bottom docked player with Oxford Blue and Ivory Paper styling.
  - Active sound wave equalizer animation (`.audio-playing-wave`).
  - Play, Pause, Resume, Stop controls.
  - Speed toggle chips (`1.0x`, `1.25x`, `1.5x`, `2.0x`).
  - Customizable Host A and Host B voice dropdown selectors.
  - "View Transcript" drawer toggle button.
- **Dialogue Transcript Modal (`#podcast-transcript-modal`)**:
  - Renders the conversation turns with distinct Host A and Host B tags.
  - Dynamically highlights and scrolls to the currently active spoken turn.
  - Accessible presentation: displays readable dialogue for hearing accessibility or if speech synthesis is unsupported in the visitor's browser.

---

## ✅ Acceptance Criteria

- [ ] Add `🎙️ Audio Briefing` button on paper cards and Consensus Meter panel.
- [ ] Implement backend `/api/podcast-script` endpoint generating two-host structured dialogue turns (`speaker` and `text`) with Gemini.
- [ ] Set `maxOutputTokens: 1536` with compact JSON prompt enforcement and log `usage.output_tokens`.
- [ ] Implement truncation rejection on `finishReason == "MAX_TOKENS"`: retry once with trimmed abstract, never cache partial, deterministic local fallback for all other failures.
- [ ] Cache dialogue turns in Upstash Redis to prevent redundant LLM generations.
- [ ] Implement dual-voice playback engine alternating between Host A and Host B via `window.speechSynthesis`.
- [ ] Implement audio dock with Play, Pause, Resume, Stop controls and `.audio-playing-wave` equalizer animation.
- [ ] Add playback speed controls (`1.0x`, `1.25x`, `1.5x`, `2.0x`) and customizable Host A/B voice selectors.
- [ ] Provide interactive dialogue transcript drawer showing turns with live active-speaker highlighting.
- [ ] Maintain test coverage >85% with unit tests for backend endpoint and frontend TTS manager.

---

## 💡 Code Guidance

- Keep schema minimal (`speaker` and `text`); avoid extra emotional tags that induce flat LLM prose.
- Provide a spoken example in the prompt with contractions and lively back-and-forth cadence.
- Cache on the turns hash; keep turns as the durable artifact so audio rendering is derived and disposable.
- Explicitly prompt for compact single-line JSON to avoid wasting token budget on formatting whitespace.
- Feature-detect `speechSynthesis` and available voices before attempting playback.
