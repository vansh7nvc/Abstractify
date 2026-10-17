# 🗺️ AbstractiFy Public Roadmap & Progress Tracker

> **De-jargonize research. Find consensus. Map the science.**

This public roadmap outlines the development phases, shipped milestones, and open community issues for **AbstractiFy**. We invite researchers, students, and open-source contributors to claim items and contribute!

---

## 📊 Overall Progress

```
Phase 1 — Polish & Visibility        [████████████████████] 100% Shipped
Phase 2 — Core Feature Depth         [████░░░░░░░░░░░░░░░░]  25% In Progress
Phase 3 — DevOps & Security          [████████████████████] 100% Active
Phase 4 — Open Source Contributor    [████████████████████] 100% Complete
Phase 5 — Serverless Data & Scaling  [░░░░░░░░░░░░░░░░░░░░]   0% Planned
Phase 6 — Cortex Cognitive Engine    [░░░░░░░░░░░░░░░░░░░░]   0% Research
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

We have published **39 live community issues** on our [GitHub Issues Page](https://github.com/vansh7nvc/Abstractify/issues).

| # | Issue | Difficulty | Target Area | Spec Link |
|---|---|---|---|---|
| 01 | 🔓 Open Access Finder (Unpaywall API) | `Easy` | API / Frontend | [`ISSUE_01`](issues/ISSUE_01_OPEN_ACCESS_FINDER.md) |
| 02 | 🧮 KaTeX Math Rendering | `Easy` | Frontend | [`ISSUE_02`](issues/ISSUE_02_KATEX_MATH_RENDERING.md) |
| 03 | 📸 Panel Screenshot Export (html2canvas) | `Easy` | Frontend | [`ISSUE_03`](issues/ISSUE_03_PANEL_SCREENSHOT_EXPORT.md) |
| 04 | 📚 Bibliography Generator | `Easy` | Frontend | [`ISSUE_04`](issues/ISSUE_04_BIBLIOGRAPHY_GENERATOR.md) |
| 05 | ⏱ Reading Time Estimator | `Easy` | Frontend | [`ISSUE_05`](issues/ISSUE_05_READING_TIME_ESTIMATOR.md) |
| 06 | 🗺️ Research Geography Map (Leaflet) | `Medium` | GIS / Frontend | [`ISSUE_06`](issues/ISSUE_06_RESEARCH_GEOGRAPHY_MAP.md) |
| 07 | 🏅 Altmetric Attention Badges | `Medium` | API / Frontend | [`ISSUE_07`](issues/ISSUE_07_ALTMETRIC_ATTENTION_BADGES.md) |
| 08 | ⚠️ Retraction & Reliability Check | `Medium` | API / Backend | [`ISSUE_08`](issues/ISSUE_08_RETRACTION_RELIABILITY_CHECK.md) |
| 09 | 🔍 Paper Recommendation Engine | `Medium` | Backend / AI | [`ISSUE_09`](issues/ISSUE_09_PAPER_RECOMMENDATION_ENGINE.md) |
| 10 | 📥 Zotero & Mendeley RIS Exporter | `Easy` | Frontend | [`ISSUE_10`](issues/ISSUE_10_ZOTERO_MENDELEY_RIS_EXPORT.md) |
| 11 | 🐳 Docker & Self-Hosting Package | `Medium` | DevOps | [`ISSUE_11`](issues/ISSUE_11_DOCKER_LOCAL_DEPLOYMENT.md) |
| 12 | 🎙️ Abstract-to-Audio Podcast Summary | `Medium` | AI / Speech | [`ISSUE_12`](issues/ISSUE_12_ABSTRACT_TO_PODCAST_TTS.md) |
| 13 | ⌨️ Keyboard Shortcuts & Accessibility | `Easy` | UX / Frontend | [`ISSUE_13`](issues/ISSUE_13_KEYBOARD_SHORTCUTS_ACCESSIBILITY.md) |
| 14 | 📊 Plausible Privacy Analytics | `Easy` | Frontend | [`ISSUE_14`](issues/ISSUE_14_PLAUSIBLE_ANALYTICS_INTEGRATION.md) |
| 15 | 🧩 Web Extension Manifest v3 | `Hard` | Browser Extension | [`ISSUE_15`](issues/ISSUE_15_CHROME_EXTENSION_SPEC.md) |
| 16 | 🎨 Dark Mode & Theme System | `Easy` | UI / Frontend | [`ISSUE_16`](issues/ISSUE_16_DARK_MODE_THEME_SYSTEM.md) |
| 17 | 📈 Research Trend Timeline | `Medium` | API / Frontend | [`ISSUE_17`](issues/ISSUE_17_RESEARCH_TREND_TIMELINE.md) |
| 18 | 💾 Saved Research Sessions | `Easy` | UX / Frontend | [`ISSUE_18`](issues/ISSUE_18_SAVED_RESEARCH_SESSIONS.md) |
| 19 | 🧠 Research Gap Detector | `Medium` | AI / Backend | [`ISSUE_19`](issues/ISSUE_19_RESEARCH_GAP_DETECTOR.md) |
| 20 | 📚 Multi-Paper Cross-Chat RAG | `Medium` | RAG / Backend | [`ISSUE_20`](issues/ISSUE_20_MULTI_PAPER_CROSS_CHAT_RAG.md) |
| 21 | 🧠 Self-Learning Agent Core (Dual Memory) | `Hard` | Backend / AI | [`ISSUE_21`](issues/ISSUE_21_SELF_LEARNING_AGENT_CORE.md) |
| 22 | 🗄️ Upstash Redis Session Persistence & Cache | `Medium` | Backend / Database | [`ISSUE_22`](issues/ISSUE_22_UPSTASH_REDIS_INTEGRATION.md) |
| 23 | 🧬 Upstash Vector DB Reasoning Memory | `Medium` | Backend / AI | [`ISSUE_23`](issues/ISSUE_23_UPSTASH_VECTOR_INTEGRATION.md) |
| 24 | 📨 Upstash QStash Async Task Queue | `Medium` | Backend / DevOps | [`ISSUE_24`](issues/ISSUE_24_UPSTASH_QSTASH_TASK_QUEUE.md) |
| 25 | 🌐 PubMed & MEDLINE Biomedical Search | `Easy` | Backend / API | [`ISSUE_25`](issues/ISSUE_25_PUBMED_MEDLINE_INTEGRATION.md) |
| 26 | 📚 CORE API Open-Access Full-Text Search | `Easy` | Backend / API | [`ISSUE_26`](issues/ISSUE_26_CORE_API_FULLTEXT_SEARCH.md) |
| 27 | 🔬 arXiv Preprint Server Search | `Easy` | Backend / API | [`ISSUE_27`](issues/ISSUE_27_ARXIV_PREPRINT_SEARCH.md) |
| 28 | 🔗 Crossref DOI Resolution & Retraction Check | `Easy` | Backend / API | [`ISSUE_28`](issues/ISSUE_28_CROSSREF_DOI_RETRACTION_CHECK.md) |
| 29 | 🧪 Europe PMC & bioRxiv Life Sciences Search | `Easy` | Backend / API | [`ISSUE_29`](issues/ISSUE_29_EUROPE_PMC_BIORXIV_SEARCH.md) |
| 30 | 🔭 NASA ADS, DBLP & DOAJ Integrations | `Medium` | Backend / API | [`ISSUE_30`](issues/ISSUE_30_NASA_ADS_DBLP_DOAJ_INTEGRATION.md) |
| 31 | 🔓 Unpaywall Real-Time PDF Link Resolver | `Easy` | Backend / API | [`ISSUE_31`](issues/ISSUE_31_UNPAYWALL_OPEN_ACCESS_RESOLVER.md) |
| 32 | 🤖 Multi-Agent Orchestration System | `Hard` | Backend / AI | [`ISSUE_32`](issues/ISSUE_32_MULTI_AGENT_ORCHESTRATION_SYSTEM.md) |
| 33 | ⚡ Real-Time SSE Streaming & Thought Traces UI | `Medium` | Frontend / AI | [`ISSUE_33`](issues/ISSUE_33_REALTIME_SSE_STREAMING_UI.md) |
| 34 | ☁️ Cloudflare R2 PDF & Artifact Storage | `Medium` | Backend / Storage | [`ISSUE_34`](issues/ISSUE_34_CLOUDFLARE_R2_STORAGE.md) |
| 35 | 🧩 Multi-Source Paper Deduplicator & Ranker | `Medium` | Backend / AI | [`ISSUE_35`](issues/ISSUE_35_MULTI_SOURCE_DEDUPLICATOR_RANKER.md) |
| 36 | 🧠 Cortex — Epistemic Cognitive Architecture | `Research` | Core AI / Research | `[Internal In-Lab Research]` |
| 37 | 🔌 Abstractify Model Context Protocol (MCP) Server | `Hard` | Backend / AI | [`ISSUE_37`](issues/ISSUE_37_ABSTRACTIFY_MCP_SERVER.md) |
| 38 | 🐇 Cascading Miller Columns & Infinite Canvas UI/UX | `Hard` | Frontend / Graph | [`ISSUE_38`](issues/ISSUE_38_MILLER_COLUMNS_EXPLORATORY_CANVAS.md) |
| 39 | 🔬 In-Document PDF Visual Copilot & Formula Explainer | `Hard` | Frontend / AI | [`ISSUE_39`](issues/ISSUE_39_INDOC_PDF_VISUAL_COPILOT.md) |

---

### Phase 5 — Serverless Data Layer & Unified Ingestion (`Track B`)

- [ ] Upstash Redis connection pooling, distributed caching, and session storage.
- [ ] Upstash Vector integration for persistent embeddings and semantic recommendations.
- [ ] Parallel multi-source ingestion pipeline querying 12+ academic indexes simultaneously.
- [ ] Crossref metadata validation and automated retraction alerts.

---

### Phase 6 — Cortex Epistemic Cognitive Engine (`Track C - Research`)

- [ ] Perception Module: Atomic claim extraction with empirical effect size ($d$) and sample size ($n$).
- [ ] Epistemic Graph: Directed, evidence-weighted belief network with Bayesian confidence calculus.
- [ ] Dialectical Reasoner: Computational thesis–antithesis–synthesis debate modeling.
- [ ] Metacognition & Curiosity Engines: Explicit epistemic states and topology-driven gap discovery.

---

## 🎯 Open Source Program Targets

- **GSSoC 2026 Ready** (GirlScript Summer of Code)
- **Hacktoberfest** (Annual October Event)

To claim an issue, browse the [`issues/`](issues/) directory, comment on the corresponding issue on GitHub, and submit a PR!
