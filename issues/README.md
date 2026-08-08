# 🎯 AbstractiFy Community Issues & Roadmap

Welcome to the **AbstractiFy Community Contributor Suite**! This directory contains detailed specifications for open-source features, enhancements, and API integrations that are ready for community contributors.

---

## 🗺️ Issues Index

| # | Issue Title | Target Area | Difficulty | File Spec |
|---|---|---|---|---|
| 01 | 🔓 Open Access Finder (Unpaywall API) | API / Frontend | `Easy` | [`ISSUE_01_OPEN_ACCESS_FINDER.md`](ISSUE_01_OPEN_ACCESS_FINDER.md) |
| 02 | 🧮 KaTeX Math Rendering | Frontend | `Easy` | [`ISSUE_02_KATEX_MATH_RENDERING.md`](ISSUE_02_KATEX_MATH_RENDERING.md) |
| 03 | 📸 Panel Screenshot Export (html2canvas) | Frontend | `Easy` | [`ISSUE_03_PANEL_SCREENSHOT_EXPORT.md`](ISSUE_03_PANEL_SCREENSHOT_EXPORT.md) |
| 04 | 📚 Bibliography Generator (APA/MLA/BibTeX) | Frontend | `Easy` | [`ISSUE_04_BIBLIOGRAPHY_GENERATOR.md`](ISSUE_04_BIBLIOGRAPHY_GENERATOR.md) |
| 05 | ⏱ Reading Time Estimator | Frontend | `Easy` | [`ISSUE_05_READING_TIME_ESTIMATOR.md`](ISSUE_05_READING_TIME_ESTIMATOR.md) |
| 06 | 🗺️ Research Geography Map (Leaflet + OpenAlex) | Frontend / GIS | `Medium` | [`ISSUE_06_RESEARCH_GEOGRAPHY_MAP.md`](ISSUE_06_RESEARCH_GEOGRAPHY_MAP.md) |
| 07 | 🏅 Altmetric Attention Badges | API / Frontend | `Medium` | [`ISSUE_07_ALTMETRIC_ATTENTION_BADGES.md`](ISSUE_07_ALTMETRIC_ATTENTION_BADGES.md) |
| 08 | ⚠️ Retraction & Reliability Check (CrossRef) | API / Backend | `Medium` | [`ISSUE_08_RETRACTION_RELIABILITY_CHECK.md`](ISSUE_08_RETRACTION_RELIABILITY_CHECK.md) |
| 09 | 🔍 Paper Recommendation Engine | Serverless / Backend | `Medium` | [`ISSUE_09_PAPER_RECOMMENDATION_ENGINE.md`](ISSUE_09_PAPER_RECOMMENDATION_ENGINE.md) |
| 10 | 📥 Zotero & Mendeley RIS Exporter | Frontend | `Easy` | [`ISSUE_10_ZOTERO_MENDELEY_RIS_EXPORT.md`](ISSUE_10_ZOTERO_MENDELEY_RIS_EXPORT.md) |
| 11 | 🐳 Docker & Self-Hosting Deployment Package | DevOps | `Medium` | [`ISSUE_11_DOCKER_LOCAL_DEPLOYMENT.md`](ISSUE_11_DOCKER_LOCAL_DEPLOYMENT.md) |
| 12 | 🎙️ Abstract-to-Audio Podcast Summary | Frontend / AI | `Medium` | [`ISSUE_12_ABSTRACT_TO_PODCAST_TTS.md`](ISSUE_12_ABSTRACT_TO_PODCAST_TTS.md) |
| 13 | ⌨️ Keyboard Shortcuts & Accessibility | Frontend / UX | `Easy` | [`ISSUE_13_KEYBOARD_SHORTCUTS_ACCESSIBILITY.md`](ISSUE_13_KEYBOARD_SHORTCUTS_ACCESSIBILITY.md) |
| 14 | 📊 Plausible Privacy Analytics | Frontend | `Easy` | [`ISSUE_14_PLAUSIBLE_ANALYTICS_INTEGRATION.md`](ISSUE_14_PLAUSIBLE_ANALYTICS_INTEGRATION.md) |
| 15 | 🧩 Web Extension Manifest v3 | Browser Extension | `Hard` | [`ISSUE_15_CHROME_EXTENSION_SPEC.md`](ISSUE_15_CHROME_EXTENSION_SPEC.md) |
| 16 | 🎨 Dark Mode & Dynamic Theme System | Frontend / UI | `Easy` | [`ISSUE_16_DARK_MODE_THEME_SYSTEM.md`](ISSUE_16_DARK_MODE_THEME_SYSTEM.md) |
| 17 | 📈 Research Trend Timeline (Chart.js + OpenAlex) | Frontend / API | `Medium` | [`ISSUE_17_RESEARCH_TREND_TIMELINE.md`](ISSUE_17_RESEARCH_TREND_TIMELINE.md) |
| 18 | 💾 Saved Research Sessions (localStorage) | Frontend / UX | `Easy` | [`ISSUE_18_SAVED_RESEARCH_SESSIONS.md`](ISSUE_18_SAVED_RESEARCH_SESSIONS.md) |
| 19 | 🧠 Research Gap Detector (Gemini AI) | Backend / AI | `Medium` | [`ISSUE_19_RESEARCH_GAP_DETECTOR.md`](ISSUE_19_RESEARCH_GAP_DETECTOR.md) |
| 20 | 📚 Multi-Paper Cross-Chat RAG (Multi-PDF) | Backend / RAG | `Medium` | [`ISSUE_20_MULTI_PAPER_CROSS_CHAT_RAG.md`](ISSUE_20_MULTI_PAPER_CROSS_CHAT_RAG.md) |

---

## 🏷️ Labeling Taxonomy

- `good first issue`: Ideal for first-time open-source contributors or developers getting familiar with the codebase.
- `help wanted`: Features requiring slightly more complex logic, external API integrations, or serverless functions.
- `enhancement`: Feature request or UX improvement.
- `frontend`: Modifies `public/index.html`, `public/app.js`, or `public/styles.css`.
- `backend`: Modifies Netlify TypeScript serverless functions under `netlify/functions/`.
- `api`: Integrates with external academic APIs (Unpaywall, CrossRef, Altmetric, Semantic Scholar).
- `devops`: Docker, GitHub Actions, or deployment setup.
- `extension`: Web browser extension code under `extension/`.
- `rag`: Retrieval-Augmented Generation / vector search features.
- `ai`: Artificial intelligence & LLM integration features.

---

## 🚀 How to Contribute

1. **Pick an issue** from the index above and read its detailed markdown specification file.
2. **Fork & Clone** the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/Abstractify.git
   cd Abstractify
   npm install
   ```
3. **Create a feature branch**:
   ```bash
   git checkout -b feature/issue-01-open-access-finder
   ```
4. **Follow the Acceptance Criteria** in the issue specification document.
5. **Test locally**:
   ```bash
   npx netlify dev
   ```
6. **Submit a Pull Request** linking to the issue!
