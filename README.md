# 🎓 AbstractiFy

> **De-jargonize research. Find consensus. Map the science.**

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen?style=flat-square&logo=netlify)](https://abstractify1.netlify.app)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/vansh7nvc/Abstractify)
[![MIT License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Netlify Functions](https://img.shields.io/badge/Netlify-Serverless-00C7B7?style=flat-square&logo=netlify&logoColor=white)
![Gemini](https://img.shields.io/badge/Google%20Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)
[![CodeQL Scan](https://img.shields.io/badge/CodeQL-Security%20Scan-brightgreen?style=flat-square&logo=github)](.github/workflows/codeql.yml)
[![Gitleaks Scan](https://img.shields.io/badge/Gitleaks-Secret%20Scan-blueviolet?style=flat-square&logo=github)](.github/workflows/gitleaks.yml)
[![Contributing](https://img.shields.io/badge/contributions-welcome-orange?style=flat-square)](CONTRIBUTING.md)
[![GSSoC 2026](https://img.shields.io/badge/GSSoC-2026%20Ready-ff69b4?style=flat-square)](issues/)
[![Hacktoberfest](https://img.shields.io/badge/Hacktoberfest-2026-9B51E0?style=flat-square)](issues/)
[![Security Policy](https://img.shields.io/badge/security-policy-critical?style=flat-square)](SECURITY.md)
[![Roadmap](https://img.shields.io/badge/roadmap-public-informational?style=flat-square)](ROADMAP.md)

![AbstractiFy Landing Page](public/screenshots/landing_page.png)

---

## ⚡ Why AbstractiFy? (Feature Comparison)

| Feature | AbstractiFy 🎓 | Google Scholar | Elicit | Consensus.ai |
|---|:---:|:---:|:---:|:---:|
| **100% Free & Open Source** | ✅ MIT | ✅ Free | ❌ Paid Tier | ❌ Paid Tier |
| **Consensus Meter** | ✅ Free | ❌ No | ❌ No | 💰 Paid |
| **Study Comparison Matrix** | ✅ Free | ❌ No | 💰 Paid | 💰 Paid |
| **Citation Network Graph** | ✅ Interactive | ❌ No | ❌ No | ❌ No |
| **Obsidian Graph & BibTeX Sync** | ✅ Native | ❌ No | ❌ No | ❌ No |
| **Local Vector Search (BYOK)** | ✅ Free | ❌ No | ❌ No | ❌ No |
| **PDF In-Doc Equation Explainer** | ✅ Native | ❌ No | ❌ No | ❌ No |

---

> **AbstractiFy** is a premium, zero-cost academic search and synthesis portal that transforms research exploration from static paper lists into an interactive, consensus-driven intelligence suite. Powered by open-access academic APIs and Google Gemini, it enables researchers, graduate students, and developers to explore 200M+ publications with semantic understanding.

---

## 📸 Screenshots

### 🏛️ Landing Page
![AbstractiFy Landing Page](public/screenshots/landing_page.png)

### ⚙️ Credentials Settings — BYOK Mode
![BYOK Settings](public/screenshots/settings_byok.png)

---

## ✨ Features

### 🔍 Hybrid Semantic Search & Global Ingestion
Dynamically queries **Semantic Scholar** and **OpenAlex** APIs across 200M+ publications. Performs real-time L2-normalized vector similarity re-ranking using local text embeddings from Google Gemini.

### 📊 The Consensus Meter
Classifies findings from the top relevant papers on a query assertion (e.g., *"Does physical exercise decrease beta-amyloid accumulation?"*). Visualises support vs. contradiction balances with a clean percentage progress bar and synthesises a brief 150-word overview of the current scientific consensus.

### 🧮 Study Comparison Matrix
Auto-extracts design parameters, core methodologies, primary outcomes, and limitations using structured JSON generation (Gemini schema parsing). Renders findings in an interactive spreadsheet format with one-click **CSV export**.

### 🕸️ Interactive Citation Network Graph
Visualises reference and citation lineages up to 2 degrees of depth using **vis-network**. Physics-stabilised, draggable HTML/JS network representations that colour-code papers by publication year and scale nodes proportionally to citation count.

### 💬 Reading Assistant & Equation Explainer
Upload academic PDFs, perform local chunking and index mapping. A regex-based parser identifies LaTeX math equations (`$`/`$$`) and runs a structured breakdown to explain variables and mathematical logic using simple analogies.

### 🔗 Smart Citation Context
Analyses how a paper is cited by others — classifying citation intent (supports, contradicts, extends, methodological) and extracting surrounding context for deeper understanding.

### 🔒 Flexible Credentials Management
- **Secure Background Mode**: Runs with pre-configured server-side keys without exposing secrets to the client.
- **Bring Your Own Key (BYOK)**: Input your custom Gemini API key securely in the frontend settings panel.

---

## 🏗️ Architecture

```mermaid
graph TD
    User["User Browser"] -->|Search / Upload| FE["Frontend (Vanilla JS + CSS)"]
    FE -->|API Requests| BF["Netlify Serverless Functions (TypeScript)"]

    subgraph External_APIs["External APIs"]
        SS["Semantic Scholar API"]
        OA["OpenAlex API"]
        GEM["Google Gemini API"]
    end

    BF --> SS
    BF --> OA
    BF --> GEM

    FE -->|Vector Embeddings| EMBED["In-Memory Vector Search Index"]
    FE -->|Graph Rendering| VIS["vis-network Interactive Graph"]
```

---

## 📂 Project Structure

```
Abstractify/
├── public/                             # Frontend (served as static files)
│   ├── index.html                      # Landing page + workspace UI
│   ├── app.js                          # Client-side controller (~34KB)
│   ├── styles.css                      # Custom styling
│   └── screenshots/                    # App screenshots
│
├── netlify/functions/                  # Serverless API layer (TypeScript)
│   ├── _utils.ts                       # Shared: API keys, Gemini client, types
│   ├── search.ts                       # Hybrid semantic search + re-ranking
│   ├── consensus.ts                    # Consensus Meter classification
│   ├── compare.ts                      # Study Comparison Matrix extraction
│   ├── citation-context.ts            # Smart citation intent analysis
│   ├── network-graph.ts               # Citation network builder
│   ├── pdf-upload.ts                   # PDF chunking handler
│   ├── pdf-chat.ts                     # In-document vector chat (RAG)
│   └── pdf-explain-math.ts            # LaTeX equation explainer
│
├── research/                           # AbstractiFy Research Intelligence Notebook
│   └── AbstractiFy_Research_Intelligence_System.ipynb
│
├── .github/                            # GitHub automation & community health
│   ├── ISSUE_TEMPLATE/                 # Structured YAML issue forms
│   │   ├── bug_report.yml              # Bug report form
│   │   ├── feature_request.yml         # Feature request form
│   │   ├── documentation.yml           # Documentation improvement form
│   │   └── config.yml                  # Issue chooser settings
│   ├── workflows/                      # GitHub Actions CI/CD
│   │   ├── ci.yml                      # Lint + Typecheck + Format pipeline
│   │   ├── stale.yml                   # Auto-close stale issues/PRs
│   │   └── release-drafter.yml         # Automated release notes
│   ├── PULL_REQUEST_TEMPLATE.md        # PR checklist template
│   ├── CODEOWNERS                      # Code review ownership
│   ├── FUNDING.yml                     # GitHub Sponsors config
│   ├── dependabot.yml                  # Dependency update automation
│   └── release-drafter.yml             # Release drafter categories
│
├── .eslintrc.json                      # ESLint config
├── .prettierrc                         # Prettier config
├── .gitattributes                      # GitHub language detection
├── .env.example                        # Environment variable template
├── CONTRIBUTING.md                     # Contributor guide
├── CODE_OF_CONDUCT.md                  # Contributor Covenant v2.1
├── SECURITY.md                         # Vulnerability disclosure policy
├── CHANGELOG.md                        # Release history (Keep a Changelog)
├── LICENSE                             # MIT License
├── netlify.toml                        # Build config + security headers
├── package.json                        # Dependencies & scripts
└── tsconfig.json                       # TypeScript compiler options
```

---

## ⚙️ Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`)
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/vansh7nvc/Abstractify.git
cd Abstractify

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 4. Start the dev server
netlify dev

# 5. Open http://localhost:8888
```

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local Netlify dev server |
| `npm run validate` | Run typecheck + lint + format checks in one command |
| `npm run lint` | Run ESLint on serverless functions |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | TypeScript type checking |

---

## 🌐 Deployment

Deploy to Netlify in a single command:

```bash
netlify deploy --prod
```

> [!IMPORTANT]
> Configure `GEMINI_API_KEY` in **Netlify Site Settings** → **Environment variables** so serverless functions can access the model in production without exposing the key on the client.

---

## 🛡️ Security

- **Security headers** enforced via `netlify.toml` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`)
- **No client-side API key exposure** in Secure Background Mode
- **BYOK keys** are sent via headers, never persisted server-side
- For vulnerability reports, see our [Security Policy](SECURITY.md)

---

## 🗺️ Roadmap

Check out our public [ROADMAP.md](ROADMAP.md) to track project progress across Phase 1 to Phase 4.

---

## 🤝 Contributing & Community Support

We welcome contributions from everyone! Whether it's fixing a typo, improving documentation, or building a new feature — every contribution matters.

- 📖 Read the [Contributing Guide](CONTRIBUTING.md) to get started
- 🎯 Browse [20 community issue specifications](issues/) ready for open source contributors
- 🏷️ Look for [`good first issue`](https://github.com/vansh7nvc/Abstractify/labels/good%20first%20issue) labels
- 💬 Read the [Community Support Guide](SUPPORT.md) for help & FAQ
- 📋 Check the [Code of Conduct](CODE_OF_CONDUCT.md)

---

## 📋 Changelog

All notable changes are documented in the [CHANGELOG](CHANGELOG.md), following the [Keep a Changelog](https://keepachangelog.com/) format.

---

## 🏆 Contributors Hall of Fame

Thank you to all our amazing open-source contributors! 💖

<a href="https://github.com/vansh7nvc/Abstractify/graphs/contributors">
  <img src="https://contrib.rocks/preview?repo=vansh7nvc%2FAbstractify" alt="AbstractiFy Contributors" />
</a>

Want to see your avatar here? Check out our [`good first issue`](https://github.com/vansh7nvc/Abstractify/labels/good%20first%20issue) list and submit your first PR! 🚀

---

## ⭐ Star History

If you find AbstractiFy useful, consider giving it a ⭐ on GitHub — it helps the project grow!

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).

**Copyright © 2026 Vansh Sharma**
