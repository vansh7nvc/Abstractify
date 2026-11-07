# Abstractify Issue Categorization & Technical Dependency Analysis

## Overview
This document categorizes all 39 issue specifications in the `issues/` directory (`ISSUE_01_*.md` through `ISSUE_39_*.md`) based on task similarity, functional domain, architectural layer, and technical dependencies. It establishes the global execution order and tracks progress through each implementation cluster.

---

## 1. Issue Categorization by Task Similarity & Dependencies

### Cluster 1: Foundational Frontend UX & Scholarly Utility Suite ✅ **[100% COMPLETE]**
*Scope*: Pure client-side UI/UX improvements, design system foundations, math rendering, accessibility, citation export, and local browser persistence.  
*Architectural Layer*: Frontend (`public/`)  
*Technical Prerequisites*: Zero external API tokens or secrets. Self-contained in browser runtime.  
*Status*: **All 7 issues implemented, covered by unit tests, CodeRabbit reviewed, CI verified, and merged into `main`.**

| Issue | Title | Type / Labels | Target Files | Key Technical Scope | Status | PR |
|---|---|---|---|---|---|---|
| **ISSUE_16** | 🎨 Dark Mode & Dynamic Theme System | `Easy`, `frontend`, `ui` | `public/styles.css`, `public/index.html`, `public/app.js` | CSS custom properties, theme toggle, system preference detection, localStorage persistence. | **MERGED** | [#118](https://github.com/vansh7nvc/Abstractify/pull/118) |
| **ISSUE_02** | 🧮 KaTeX Math Rendering Engine Integration | `Easy`, `frontend` | `public/index.html`, `public/app.js`, `public/styles.css` | KaTeX CDN integration, formula parsing (`$...$`, `$$...$$`), safe fallback rendering. | **MERGED** | [#119](https://github.com/vansh7nvc/Abstractify/pull/119) |
| **ISSUE_13** | ⌨️ Keyboard Shortcuts & Accessibility | `Easy`, `frontend`, `ux` | `public/app.js`, `public/index.html`, `public/styles.css` | Global `Cmd+K`/`Ctrl+K` command palette, WCAG AA ARIA roles, focus trap, shortcut help modal. | **MERGED** | [#120](https://github.com/vansh7nvc/Abstractify/pull/120) |
| **ISSUE_05** | ⏱ Reading Time & Academic Complexity Estimator | `Easy`, `frontend` | `public/app.js`, `public/styles.css` | 200 WPM reading speed heuristic + equation density multiplier, complexity rating pills. | **MERGED** | [#121](https://github.com/vansh7nvc/Abstractify/pull/121) |
| **ISSUE_04** | 📚 Bibliography Generator (APA / MLA / Chicago / IEEE / BibTeX) | `Easy`, `frontend` | `public/app.js`, `public/index.html`, `public/styles.css` | Multi-format citation generator modal with copy-to-clipboard and formatted file download. | **MERGED** | [#122](https://github.com/vansh7nvc/Abstractify/pull/122) |
| **ISSUE_03** | 📸 Panel Screenshot Export (html2canvas) | `Easy`, `frontend` | `public/index.html`, `public/app.js`, `public/styles.css` | 2x high-resolution PNG export of Consensus Meter, Comparison Matrix, and Citation Graph. | **MERGED** | [#123](https://github.com/vansh7nvc/Abstractify/pull/123) |
| **ISSUE_18** | 💾 Saved Research Sessions (localStorage Persistence) | `Easy`, `frontend`, `ux` | `public/app.js`, `public/index.html`, `public/styles.css` | Session state serialization to localStorage, session modal, 1-click restore, quota protection. | **MERGED** | [#124](https://github.com/vansh7nvc/Abstractify/pull/124) |

---

### Cluster 2: Multi-Source Literature Ingestion & Academic Search Engine Pipeline
*Scope*: Broadening paper acquisition across biomedical, preprints, and open-access repositories with automated deduplication and re-ranking.
*Architectural Layer*: Serverless backend (`netlify/functions/search/`)
*Technical Prerequisites*: Normalized `Paper` type in `_utils.ts`.

| Issue | Title | Type / Labels | Target Files | Key Technical Scope | Status | PR |
|---|---|---|---|---|---|---|
| **ISSUE_25** | 🌐 PubMed & MEDLINE Biomedical Search Integration | `Easy`, `backend`, `api` | `netlify/functions/search/sources/pubmed.ts`, `search.ts` | NCBI E-Utilities integration, MeSH headings, biomedical query translation. | **MERGED** | [#126](https://github.com/vansh7nvc/Abstractify/pull/126) |
| **ISSUE_26** | 📚 CORE API Open-Access Full-Text Search Integration | `Easy`, `backend`, `api` | `netlify/functions/search/sources/core-api.ts`, `search.ts` | CORE v3 API client for open-access repositories and full-text downloads. | **MERGED** | [#127](https://github.com/vansh7nvc/Abstractify/pull/127) |
| **ISSUE_27** | 🔬 arXiv Preprint Server Search Integration | `Easy`, `backend`, `api` | `netlify/functions/search/sources/arxiv.ts`, `search.ts` | arXiv Atom XML API feed parser, category filtering, preprint links. | **MERGED** | [#128](https://github.com/vansh7nvc/Abstractify/pull/128) |
| **ISSUE_28** | 🔗 Crossref DOI Resolution & Retraction Status Check | `Easy`, `backend`, `api` | `netlify/functions/search/sources/crossref.ts`, `doi-check.ts` | Canonical Crossref metadata lookup, Crossmark status check, polite pool headers. | Planned | |
| **ISSUE_29** | 🧪 Europe PMC & bioRxiv Life Sciences Search Integration | `Easy`, `backend`, `api` | `netlify/functions/search/sources/europe-pmc.ts`, `biorxiv.ts` | Europe PMC REST API & bioRxiv/medRxiv preprint servers. | Planned | |
| **ISSUE_30** | 🔭 NASA ADS, DBLP & DOAJ Domain Search Integrations | `Medium`, `backend`, `api` | `netlify/functions/search/sources/nasa-ads.ts`, `dblp.ts`, `doaj.ts` | Astrophysics, Computer Science, and Directory of Open Access Journals adapters. | Planned | |
| **ISSUE_31** | 🔓 Unpaywall Real-Time Open Access PDF Link Resolver | `Easy`, `backend`, `api` | `netlify/functions/search/sources/unpaywall.ts`, `oa-resolver.ts` | Resolves DOIs to legal open-access full-text PDF URLs with 14-day caching. | Planned | |
| **ISSUE_35** | 🧩 Multi-Source Paper Deduplicator & Hybrid Cross-Ranker | `Medium`, `backend`, `ai` | `netlify/functions/search/deduplicator.ts`, `ranker.ts` | Reciprocal Rank Fusion (RRF) and fuzzy title deduplication across all sources. | Planned | |

---

### Cluster 3: Research Verification, Reliability & External Scholarly Intelligence
*Scope*: Enhancing academic paper cards and workspace panels with external impact metrics, geolocation, retraction warnings, and analytics.
*Architectural Layer*: Frontend UI & API Enrichers
*Technical Prerequisites*: Paper objects from search and UI containers from Cluster 1.

| Issue | Title | Type / Labels | Target Files | Key Technical Scope |
|---|---|---|---|---|
| **ISSUE_01** | 🔓 Open Access Finder (Unpaywall Client Integration) | `Easy`, `api`, `frontend` | `public/app.js`, `public/index.html` | Client-side Unpaywall check, green OA badge, direct PDF link button. |
| **ISSUE_06** | 🗺️ Research Geography Map (Leaflet + OpenAlex) | `Medium`, `frontend`, `api` | `public/index.html`, `public/app.js` | Interactive world map plotting publishing institutions using Leaflet and OpenAlex. |
| **ISSUE_07** | 🏅 Altmetric Attention Badges & Social Impact Score | `Medium`, `api`, `frontend` | `public/app.js`, `public/index.html` | Altmetric badge donut integration, social breakdown hover, buzz score sorting. |
| **ISSUE_08** | ⚠️ Retraction & Scientific Reliability Check (CrossRef) | `Medium`, `api`, `backend` | `netlify/functions/retraction-check.ts`, `public/app.js` | CrossRef retraction metadata check, retraction warning banners on cards. |
| **ISSUE_09** | 🔍 Paper Recommendation Engine (Semantic Scholar) | `Medium`, `backend`, `frontend` | `netlify/functions/recommend.ts`, `public/app.js` | Related paper recommendations via Semantic Scholar citation graph embeddings. |
| **ISSUE_14** | 📊 Plausible Privacy Analytics & Custom Events | `Easy`, `frontend` | `public/index.html`, `public/app.js` | Cookieless analytics script, custom event dispatcher with ad-blocker protection. |
| **ISSUE_17** | 📈 Research Trend Timeline (Chart.js + OpenAlex) | `Medium`, `frontend`, `api` | `public/index.html`, `public/app.js` | Yearly publication volume timeline chart powered by OpenAlex API and Chart.js. |

---

### Cluster 4: Enterprise Cloud Infrastructure, Persistence & Scalability
*Scope*: Serverless caching, vector storage, async background queues, and containerization.
*Architectural Layer*: Cloud Infrastructure & DevOps
*Technical Prerequisites*: Upstash and Cloudflare service credentials.

| Issue | Title | Type / Labels | Target Files | Key Technical Scope |
|---|---|---|---|---|
| **ISSUE_11** | 🐳 Docker & Self-Hosting Deployment Package | `Medium`, `devops` | `Dockerfile`, `docker-compose.yml` | Multi-stage production container for self-hosting with port 8888 mapping. |
| **ISSUE_22** | 🗄️ Upstash Redis Integration (Distributed Cache) | `Medium`, `backend`, `database` | `shared/redis.ts`, `sessions.ts` | Serverless distributed cache for search and session persistence (Closed). |
| **ISSUE_23** | 🧬 Upstash Vector DB (Reasoning Chains & Memory) | `Medium`, `backend`, `database` | `shared/vector.ts`, `recommend.ts` | High-dimensional vector database for paper embeddings and similarity (Closed). |
| **ISSUE_24** | 📨 Upstash QStash Async Task Queue | `Medium`, `backend`, `devops` | `shared/queue.ts`, `tasks/worker.ts` | Serverless asynchronous job queue with cryptographic HMAC verification. |
| **ISSUE_34** | ☁️ Cloudflare R2 Persistent PDF & Export Storage | `Medium`, `backend`, `storage` | `shared/storage.ts`, `pdf-upload.ts` | S3-compatible zero-egress object storage for uploaded PDFs and export artifacts. |

---

### Cluster 5: Multi-Modal Document AI, Audio Summarization & Interactive PDF Studio
*Scope*: Advanced generative AI, multi-document retrieval-augmented generation (RAG), and audio synthesis.
*Architectural Layer*: AI Pipelines & Document Processing
*Technical Prerequisites*: Google Gemini API key, PDF text parsing, and KaTeX rendering.

| Issue | Title | Type / Labels | Target Files | Key Technical Scope |
|---|---|---|---|---|
| **ISSUE_12** | 🎙️ Abstract-to-Podcast Audio Summary (TTS & Dialogue) | `Medium`, `frontend`, `backend`, `ai` | `podcast-script.ts`, `tts.js` | Two-host conversational script generator with dual-voice Web Speech synthesis. |
| **ISSUE_19** | 🧠 Research Gap Detector (Gemini AI Analysis) | `Medium`, `backend`, `ai` | `gap-detector.ts`, `public/app.js` | LLM analysis extracting unaddressed research questions, missing datasets, and ideas. |
| **ISSUE_20** | 📚 Multi-Paper Cross-Chat RAG (Multi-Document) | `Medium`, `backend`, `ai`, `rag` | `pdf-upload.ts`, `pdf-chat.ts` | Multi-PDF upload with cross-document vector indexing and comparative question answering. |
| **ISSUE_39** | 🔬 In-Document PDF Visual Copilot & Coordinate Explainer | `Hard`, `frontend`, `backend`, `ai` | `public/app.js`, `pdf-explain-math.ts` | PDF.js canvas overlay, text selection anchor, and coordinate-mapped formula explainer. |

---

### Cluster 6: Advanced Cognitive AI, Autonomous Multi-Agent Orchestration & Protocol Ecosystem
*Scope*: Epistemic architectures, autonomous sub-agent orchestration, streaming protocols, browser extensions, and infinite canvas.
*Architectural Layer*: Cognitive Architecture & Ecosystem
*Technical Prerequisites*: Multi-source search, vector memory, and foundational UI canvas.

| Issue | Title | Type / Labels | Target Files | Key Technical Scope |
|---|---|---|---|---|
| **ISSUE_15** | 🧩 Web Extension (Manifest v3) Specification | `Hard`, `extension` | `extension/*` | Chrome/Firefox extension detecting papers on publisher sites and opening sidebar. |
| **ISSUE_21** | 🧠 Self-Learning Agent Core (Dual Memory & Adaptive) | `Hard`, `backend`, `ai` | `agent/orchestrator.ts` | ReAct agent with short-term (Redis) and long-term (Vector) memory and self-reflection. |
| **ISSUE_32** | 🤖 Multi-Agent Orchestration System | `Hard`, `backend`, `ai` | `agent/sub-agents/*` | 5-sub-agent supervisor architecture (Search, Analysis, Writing, Method, Memory). |
| **ISSUE_33** | ⚡ Real-Time SSE Streaming & Thought Traces UI | `Medium`, `frontend`, `backend` | `agent/stream.ts`, `stream-renderer.js` | Server-Sent Events stream for token streaming, reasoning steps, and tool execution. |
| **ISSUE_36** | 🧠 Cortex Epistemic Cognitive Architecture | `Hard`, `research`, `ai` | `cortex/*` | 7-module epistemic framework for formal dialectical reasoning (Closed). |
| **ISSUE_37** | 🔌 Abstractify Model Context Protocol (MCP) Server | `Hard`, `mcp`, `backend` | `mcp/server.ts` | MCP server exposing search, consensus, and graph tools over stdio/SSE. |
| **ISSUE_38** | 🐇 Cascading Miller Columns & Infinite Canvas UI | `Hard`, `frontend`, `ui/ux` | `public/app.js`, `public/styles.css` | Multi-column sliding canvas with bidirectional citation graph synchronization. |

---

## 2. Recommended Global Execution Order

The technical dependencies dictate the following sequential execution roadmap:

1. **Phase 1: Cluster 1 (Foundational Frontend UX & Scholarly Utility Suite)** ✅ **[COMPLETE]**  
   *Rationale*: Builds the visual design system, KaTeX math engine, keyboard navigation, and export formatting. Requires no external credentials and creates the UI substrate for all subsequent features.
2. **Phase 2: Cluster 2 (Multi-Source Literature Ingestion & Search Pipeline)**  
   *Rationale*: Expands literature acquisition into biomedical, open-access, and preprint repositories. Feeds rich paper streams into the application.
3. **Phase 3: Cluster 4 (Enterprise Cloud Infrastructure, Persistence & Scalability)**  
   *Rationale*: Solidifies Redis caching, vector databases, and queueing needed for high-load operations.
4. **Phase 4: Cluster 3 (Research Verification, Reliability & External Scholarly Intelligence)**  
   *Rationale*: Enriches paper search results with maps, charts, citation impact, and retraction notices.
5. **Phase 5: Cluster 5 (Multi-Modal Document AI, Audio Summarization & Interactive PDF Studio)**  
   *Rationale*: Leverages ingested papers and vector storage to deliver audio podcasts, cross-paper RAG, and PDF copilot.
6. **Phase 6: Cluster 6 (Advanced Cognitive AI, Autonomous Multi-Agent Orchestration & Protocol Ecosystem)**  
   *Rationale*: Top-level cognitive architectures, autonomous multi-agent pipelines, MCP protocol, and infinite canvas.
