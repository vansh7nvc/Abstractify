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

We have published **20 live community issues** on our [GitHub Issues Page](https://github.com/vansh7nvc/Abstractify/issues).

| # | Issue | Difficulty | Target Area | Live Issue Link |
|---|---|---|---|---|
| 01 | 🔓 Open Access Finder (Unpaywall API) | `Easy` | API / Frontend | [Issue #1](https://github.com/vansh7nvc/Abstractify/issues/1) |
| 02 | 🧮 KaTeX Math Rendering | `Easy` | Frontend | [Issue #2](https://github.com/vansh7nvc/Abstractify/issues/2) |
| 03 | 📸 Panel Screenshot Export (html2canvas) | `Easy` | Frontend | [Issue #3](https://github.com/vansh7nvc/Abstractify/issues/3) |
| 04 | 📚 Bibliography Generator | `Easy` | Frontend | [Issue #4](https://github.com/vansh7nvc/Abstractify/issues/4) |
| 05 | ⏱ Reading Time Estimator | `Easy` | Frontend | [Issue #5](https://github.com/vansh7nvc/Abstractify/issues/5) |
| 06 | 🗺️ Research Geography Map (Leaflet) | `Medium` | GIS / Frontend | [Issue #6](https://github.com/vansh7nvc/Abstractify/issues/6) |
| 07 | 🏅 Altmetric Attention Badges | `Medium` | API / Frontend | [Issue #7](https://github.com/vansh7nvc/Abstractify/issues/7) |
| 08 | ⚠️ Retraction & Reliability Check | `Medium` | API / Backend | [Issue #8](https://github.com/vansh7nvc/Abstractify/issues/8) |
| 09 | 🔍 Paper Recommendation Engine | `Medium` | Backend / AI | [Issue #9](https://github.com/vansh7nvc/Abstractify/issues/9) |
| 10 | 📥 Zotero & Mendeley RIS Exporter | `Easy` | Frontend | [Issue #10](https://github.com/vansh7nvc/Abstractify/issues/10) |
| 11 | 🐳 Docker & Self-Hosting Package | `Medium` | DevOps | [Issue #11](https://github.com/vansh7nvc/Abstractify/issues/11) |
| 12 | 🎙️ Abstract-to-Audio Podcast Summary | `Medium` | AI / Speech | [Issue #12](https://github.com/vansh7nvc/Abstractify/issues/12) |
| 13 | ⌨️ Keyboard Shortcuts & Accessibility | `Easy` | UX / Frontend | [Issue #13](https://github.com/vansh7nvc/Abstractify/issues/13) |
| 14 | 📊 Plausible Privacy Analytics | `Easy` | Frontend | [Issue #14](https://github.com/vansh7nvc/Abstractify/issues/14) |
| 15 | 🧩 Web Extension Manifest v3 | `Hard` | Browser Extension | [Issue #15](https://github.com/vansh7nvc/Abstractify/issues/15) |
| 16 | 🎨 Dark Mode & Theme System | `Easy` | UI / Frontend | [Issue #16](https://github.com/vansh7nvc/Abstractify/issues/16) |
| 17 | 📈 Research Trend Timeline | `Medium` | API / Frontend | [Issue #17](https://github.com/vansh7nvc/Abstractify/issues/17) |
| 18 | 💾 Saved Research Sessions | `Easy` | UX / Frontend | [Issue #18](https://github.com/vansh7nvc/Abstractify/issues/18) |
| 19 | 🧠 Research Gap Detector | `Medium` | AI / Backend | [Issue #19](https://github.com/vansh7nvc/Abstractify/issues/19) |
| 20 | 📚 Multi-Paper Cross-Chat RAG | `Medium` | RAG / Backend | [Issue #20](https://github.com/vansh7nvc/Abstractify/issues/20) |

---

## 🎯 Open Source Program Targets

- **GSSoC 2026 Ready** (GirlScript Summer of Code)
- **Hacktoberfest** (Annual October Event)

To claim an issue, browse the [`issues/`](issues/) directory, comment on the corresponding issue on GitHub, and submit a PR!
