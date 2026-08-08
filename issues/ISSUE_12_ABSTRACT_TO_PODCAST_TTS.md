# Issue #12: 🎙️ Abstract-to-Audio Podcast Summary (Speech Synthesis)

**Labels**: `enhancement`, `help wanted`, `frontend`, `ai`  
**Difficulty**: `Medium`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Researchers often listen to academic content while commuting or multi-tasking. Complex scientific abstracts can be converted into conversational 2-minute audio summaries (similar to NotebookLM audio overviews).

---

## 🎯 Goal

Add a **"🎙️ Listen to Summary"** button on paper cards and Consensus summaries that uses the browser-native **Web Speech API** (`window.speechSynthesis`) or Google Gemini TTS to play a synthesized audio briefing of key findings.

---

## ⚙️ Technical Specification

### UI Controls
- Add a audio playback pill on paper cards: `🎙️ Play Audio Briefing`.
- Controls: Play, Pause, Resume, Speed Selector (`1.0x`, `1.25x`, `1.5x`), Voice Selector.

### Audio Generation Workflow
1. Extract paper title, key findings, and consensus conclusion.
2. Format into conversational speech script:
   > *"Here is a 60-second summary of '[Title]'. Published in [Year] by [Author]. Key takeaway: [Synthesis]."*
3. Pass text to `SpeechSynthesisUtterance`:
   ```javascript
   const utterance = new SpeechSynthesisUtterance(speechText);
   utterance.rate = selectedSpeed;
   utterance.pitch = 1.0;
   window.speechSynthesis.speak(utterance);
   ```

---

## ✅ Acceptance Criteria

- [ ] Add `🎙️ Audio Briefing` button on paper cards and Consensus Meter panel.
- [ ] Generate conversational spoken audio scripts from paper metadata.
- [ ] Implement Play / Pause / Resume controls with active speech visualizer animation.
- [ ] Add playback speed controls (`1.0x`, `1.25x`, `1.5x`, `2.0x`).
- [ ] Gracefully handle browsers without Speech Synthesis API support.

---

## 💡 Code Guidance

- Check Web Speech API documentation on MDN.
- Add `.audio-playing-wave` CSS animation in `public/styles.css`.
