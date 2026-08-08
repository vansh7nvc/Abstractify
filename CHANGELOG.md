# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Community contributor issue specifications in `issues/` directory (9 detailed issue specs)
- `CONTRIBUTING.md` — comprehensive contributor guide
- `CODE_OF_CONDUCT.md` — Contributor Covenant v2.1
- `SECURITY.md` — vulnerability disclosure policy
- `.github/` — issue templates, PR template, CI/CD workflows, governance configs
- `CHANGELOG.md` — this file

### Changed
- Renamed research notebook from `Coding_Blocks_Research_Paper_Intelligence_System.ipynb` to `AbstractiFy_Research_Intelligence_System.ipynb`
- Updated `README.md` project structure to reflect new directories and files

---

## [1.0.0] - 2026-08-08

### Added
- **Hybrid Semantic Search**: Dual-source querying via Semantic Scholar and OpenAlex APIs with L2-normalized vector re-ranking using Google Gemini embeddings
- **Consensus Meter**: AI-powered classification of findings across top papers with support/contradiction visualization
- **Study Comparison Matrix**: Automated extraction of design, methodology, outcomes, and limitations into interactive spreadsheet with CSV export
- **Interactive Citation Network Graph**: vis-network powered visualization with 2-degree citation depth, physics simulation, and year-based color coding
- **PDF Reading Assistant**: Upload and chunk PDFs with in-document vector chat (RAG) powered by Gemini
- **Equation Explainer**: Regex-based LaTeX parser with structured variable and logic breakdowns
- **Smart Citation Context**: Citation intent classification (supports, contradicts, extends, methodological) with surrounding context extraction
- **Flexible Credentials Management**: Secure Background Mode with server-side keys + BYOK (Bring Your Own Key) mode
- **Serverless Architecture**: 9 Netlify TypeScript serverless functions for search, consensus, comparison, citation, network, PDF processing
- **Security Headers**: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` via `netlify.toml`
- **Developer Tooling**: ESLint, Prettier, TypeScript compiler configuration
- **MIT License**

[Unreleased]: https://github.com/vansh7nvc/Abstractify/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/vansh7nvc/Abstractify/releases/tag/v1.0.0
