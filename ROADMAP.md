# 🗺️ AbstractiFy Public Roadmap & Progress Tracker

> **De-jargonize research. Find consensus. Map the science.**

This public roadmap outlines the development phases, shipped milestones, and open community issues for **AbstractiFy**. We invite researchers, students, and open-source contributors to claim items and contribute!

---

## 📊 Overall Progress

```
Phase 1 — Polish & Visibility        [████████████████████] 100% Shipped
Phase 2 — Core Feature Depth         [████░░░░░░░░░░░░░░░░]  25% In Progress
Phase 3 — DevOps & Security          [████████████████████] 100% Active
Phase 4 — Open Source Readiness      [████████████████████] 100% Complete
```

---

## 🚀 Development Phases

### Phase 1 — Polish & Visibility (`100% Complete`)

- [x] **Live Netlify Deployment**: Live production URL at [`abstractify1.netlify.app`](https://abstractify1.netlify.app)
- [x] **README Overhaul**: Architecture diagrams, badges, setup instructions
- [x] **Repository Hygiene**: TypeScript default attributes, ESLint, Prettier, MIT License

---

### Phase 2 — Core Feature Depth (`Track A - In Progress`)

- [x] **Export Suite**: Export Consensus, Matrix, and Citation Graph to Markdown (`.md`), CSV (`.csv`), JSON (`.json`), and BibTeX (`.bib`).
- [ ] **Dark Mode & Dynamic Theme System**: Sleek Dark Slate toggle with CSS variables. (Spec: [`issues/ISSUE_16`](issues/ISSUE_16_DARK_MODE_THEME_SYSTEM.md))
- [ ] **Research Trend Timeline**: Animated Chart.js line chart showing annual publication volume. (Spec: [`issues/ISSUE_17`](issues/ISSUE_17_RESEARCH_TREND_TIMELINE.md))
- [ ] **Saved Research Sessions**: Bookmark, tag, and restore previous search state from `localStorage`. (Spec: [`issues/ISSUE_18`](issues/ISSUE_18_SAVED_RESEARCH_SESSIONS.md))
- [ ] **Research Gap Detector**: Gemini LLM analysis of unanswered research questions. (Spec: [`issues/ISSUE_19`](issues/ISSUE_19_RESEARCH_GAP_DETECTOR.md))
- [ ] **Multi-Paper Cross-Chat RAG**: Upload 2–3 PDFs simultaneously with cross-document RAG. (Spec: [`issues/ISSUE_20`](issues/ISSUE_20_MULTI_PAPER_CROSS_CHAT_RAG.md))

---

### Phase 3 — DevOps & Security (`100% Complete & Active`)

- [x] **GitHub Actions CI Pipeline**: TypeScript typecheck, ESLint, format checking on all PRs.
- [x] **CodeQL SAST Scanner**: Static security analysis scanning for XSS, injection, and prototype pollution.
- [x] **npm Dependency Audit**: Automated weekly audit checking for high/critical package vulnerabilities.
- [x] **Gitleaks Secret Scanner**: Secret scanner preventing committed API keys and credentials.
- [x] **Security Headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- [x] **PR Auto-Labeler & Welcome Bot**: Automated labeling and contributor greeting workflows.

---

### Phase 4 — Open Source Contributor Suite (`100% Ready`)

We have created **20 detailed community issue specifications** in the [`issues/`](issues/) directory.

| # | Issue | Difficulty | Target Area | Spec Link |
|---|---|---|---|---|
| 01 | 🔓 Open Access Finder (Unpaywall API) | `Easy` | API / Frontend | [Spec](issues/ISSUE_01_OPEN_ACCESS_FINDER.md) |
| 02 | 🧮 KaTeX Math Rendering | `Easy` | Frontend | [Spec](issues/ISSUE_02_KATEX_MATH_RENDERING.md) |
| 03 | 📸 Panel Screenshot Export (html2canvas) | `Easy` | Frontend | [Spec](issues/ISSUE_03_PANEL_SCREENSHOT_EXPORT.md) |
| 04 | 📚 Bibliography Generator | `Easy` | Frontend | [Spec](issues/ISSUE_04_BIBLIOGRAPHY_GENERATOR.md) |
| 05 | ⏱ Reading Time Estimator | `Easy` | Frontend | [Spec](issues/ISSUE_05_READING_TIME_ESTIMATOR.md) |
| 06 | 🗺️ Research Geography Map (Leaflet) | `Medium` | GIS / Frontend | [Spec](issues/ISSUE_06_RESEARCH_GEOGRAPHY_MAP.md) |
| 07 | 🏅 Altmetric Attention Badges | `Medium` | API / Frontend | [Spec](issues/ISSUE_07_ALTMETRIC_ATTENTION_BADGES.md) |
| 08 | ⚠️ Retraction & Reliability Check | `Medium` | API / Backend | [Spec](issues/ISSUE_08_RETRACTION_RELIABILITY_CHECK.md) |
| 09 | 🔍 Paper Recommendation Engine | `Medium` | Backend / AI | [Spec](issues/ISSUE_09_PAPER_RECOMMENDATION_ENGINE.md) |
| 10 | 📥 Zotero & Mendeley RIS Exporter | `Easy` | Frontend | [Spec](issues/ISSUE_10_ZOTERO_MENDELEY_RIS_EXPORT.md) |
| 11 | 🐳 Docker & Self-Hosting Package | `Medium` | DevOps | [Spec](issues/ISSUE_11_DOCKER_LOCAL_DEPLOYMENT.md) |
| 12 | 🎙️ Abstract-to-Audio Podcast Summary | `Medium` | AI / Speech | [Spec](issues/ISSUE_12_ABSTRACT_TO_PODCAST_TTS.md) |
| 13 | ⌨️ Keyboard Shortcuts & Accessibility | `Easy` | UX / Frontend | [Spec](issues/ISSUE_13_KEYBOARD_SHORTCUTS_ACCESSIBILITY.md) |
| 14 | 📊 Plausible Privacy Analytics | `Easy` | Frontend | [Spec](issues/ISSUE_14_PLAUSIBLE_ANALYTICS_INTEGRATION.md) |
| 15 | 🧩 Web Extension Manifest v3 | `Hard` | Browser Extension | [Spec](issues/ISSUE_15_CHROME_EXTENSION_SPEC.md) |
| 16 | 🎨 Dark Mode & Theme System | `Easy` | UI / Frontend | [Spec](issues/ISSUE_16_DARK_MODE_THEME_SYSTEM.md) |
| 17 | 📈 Research Trend Timeline | `Medium` | API / Frontend | [Spec](issues/ISSUE_17_RESEARCH_TREND_TIMELINE.md) |
| 18 | 💾 Saved Research Sessions | `Easy` | UX / Frontend | [Spec](issues/ISSUE_18_SAVED_RESEARCH_SESSIONS.md) |
| 19 | 🧠 Research Gap Detector | `Medium` | AI / Backend | [Spec](issues/ISSUE_19_RESEARCH_GAP_DETECTOR.md) |
| 20 | 📚 Multi-Paper Cross-Chat RAG | `Medium` | RAG / Backend | [Spec](issues/ISSUE_20_MULTI_PAPER_CROSS_CHAT_RAG.md) |

---

## 🎯 Open Source Program Targets

- **GSSoC 2026 Ready** (GirlScript Summer of Code)
- **Hacktoberfest** (Annual October Event)

To claim an issue, browse the [`issues/`](issues/) directory, comment on the corresponding issue on GitHub, and submit a PR!
