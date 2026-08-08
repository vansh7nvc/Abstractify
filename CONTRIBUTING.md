# 🤝 Contributing to AbstractiFy

Thank you for considering contributing to **AbstractiFy**! Every contribution makes this project better for researchers, students, and developers worldwide. This guide will help you get started.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Standards](#coding-standards)
- [Commit Conventions](#commit-conventions)
- [Branch Naming](#branch-naming)
- [Pull Request Process](#pull-request-process)
- [Issue Guidelines](#issue-guidelines)
- [Your First Contribution](#your-first-contribution)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to **vansh7nvc@gmail.com**.

---

## Getting Started

AbstractiFy is a premium academic search and synthesis portal powered by open-access APIs and Google Gemini. Before contributing, please:

1. **Read the [README](README.md)** to understand the project's features and architecture.
2. **Check existing [Issues](https://github.com/vansh7nvc/Abstractify/issues)** to see if your idea or bug is already tracked.
3. **Browse the [`issues/`](issues/) directory** for detailed community contributor specifications.

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher
- [Netlify CLI](https://docs.netlify.com/cli/get-started/) (`npm install -g netlify-cli`)
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey)
- Git

### Installation

```bash
# 1. Fork the repository on GitHub, then clone your fork
git clone https://github.com/YOUR_USERNAME/Abstractify.git
cd Abstractify

# 2. Add the upstream remote
git remote add upstream https://github.com/vansh7nvc/Abstractify.git

# 3. Install dependencies
npm install

# 4. Configure environment variables
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY

# 5. Start the local dev server
netlify dev

# 6. Open http://localhost:8888 in your browser
```

### Useful Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local Netlify dev server |
| `npm run lint` | Run ESLint on serverless functions |
| `npm run lint:fix` | Auto-fix ESLint issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |
| `npm run typecheck` | TypeScript type checking |

---

## Project Structure

```
Abstractify/
├── public/                    # Frontend (static files served by Netlify)
│   ├── index.html             # Landing page + workspace UI
│   ├── app.js                 # Client-side controller
│   └── styles.css             # Custom styling
│
├── netlify/functions/         # Serverless API layer (TypeScript)
│   ├── _utils.ts              # Shared utilities, API keys, Gemini client
│   ├── search.ts              # Hybrid semantic search + re-ranking
│   ├── consensus.ts           # Consensus Meter classification
│   ├── compare.ts             # Study Comparison Matrix
│   ├── citation-context.ts    # Smart citation intent analysis
│   ├── network-graph.ts       # Citation network builder
│   ├── pdf-upload.ts          # PDF chunking handler
│   ├── pdf-chat.ts            # In-document vector chat (RAG)
│   └── pdf-explain-math.ts    # LaTeX equation explainer
│
├── issues/                    # Community contributor issue specifications
├── docs/                      # PRD & project documentation
├── research/                  # Research prototype notebooks
└── .github/                   # GitHub workflows, templates, automation
```

---

## Coding Standards

### General

- **Language**: TypeScript for serverless functions, vanilla JavaScript for frontend.
- **Formatting**: All code is formatted with [Prettier](https://prettier.io/). Run `npm run format` before committing.
- **Linting**: ESLint enforces code quality. Run `npm run lint` and fix all errors before submitting.
- **Type Safety**: Run `npm run typecheck` to ensure no TypeScript errors.

### Style Guidelines

- Use **`const`** by default; use **`let`** only when reassignment is necessary. Never use **`var`**.
- Prefer **async/await** over raw Promises or callbacks.
- Use descriptive variable and function names (e.g., `fetchPaperMetadata` not `getData`).
- Add JSDoc comments to exported functions.
- Keep functions focused — one function, one responsibility.

---

## Commit Conventions

We use [Conventional Commits](https://www.conventionalcommits.org/) to maintain a clean, automatable commit history.

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Description |
|---|---|
| `feat` | A new feature |
| `fix` | A bug fix |
| `docs` | Documentation changes only |
| `style` | Formatting changes (no logic change) |
| `refactor` | Code restructuring (no feature/fix) |
| `test` | Adding or updating tests |
| `chore` | Build process, dependencies, tooling |
| `perf` | Performance improvements |

### Examples

```
feat(search): add OpenAlex fallback for failed Semantic Scholar queries
fix(pdf-chat): handle empty chunk arrays gracefully
docs(readme): update project structure with issues directory
chore(deps): bump @google/genai to 2.12.0
```

---

## Branch Naming

Create branches from `main` using this convention:

```
<type>/issue-<number>-<short-description>
```

### Examples

```
feature/issue-01-open-access-finder
fix/issue-42-consensus-meter-crash
docs/update-contributing-guide
chore/upgrade-eslint-config
```

---

## Pull Request Process

1. **Sync your fork** with the latest upstream changes:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/issue-01-open-access-finder
   ```

3. **Make your changes** following the coding standards above.

4. **Verify your changes** pass all checks:
   ```bash
   npm run lint
   npm run typecheck
   npm run format:check
   ```

5. **Commit using Conventional Commits** and push:
   ```bash
   git push origin feature/issue-01-open-access-finder
   ```

6. **Open a Pull Request** against `main` on the upstream repository.

7. **Fill out the PR template** completely — including related issue numbers and screenshots for UI changes.

8. **Address review feedback** promptly. Maintainers may request changes before merging.

### PR Review Criteria

- ✅ All CI checks pass (lint, typecheck, format)
- ✅ PR description clearly explains what and why
- ✅ Related issue is linked (`Closes #XX`)
- ✅ No unrelated changes included
- ✅ UI changes include before/after screenshots

---

## Issue Guidelines

### Reporting Bugs

Use the [Bug Report template](https://github.com/vansh7nvc/Abstractify/issues/new?template=bug_report.yml) and include:
- Clear description of the problem
- Steps to reproduce
- Expected vs. actual behavior
- Browser and OS information
- Screenshots or console errors if applicable

### Requesting Features

Use the [Feature Request template](https://github.com/vansh7nvc/Abstractify/issues/new?template=feature_request.yml) and include:
- Problem the feature solves
- Proposed solution
- Alternatives considered

### Labels

| Label | Meaning |
|---|---|
| `good first issue` | Great for first-time contributors |
| `help wanted` | Needs community help |
| `enhancement` | Feature request |
| `bug` | Confirmed bug |
| `documentation` | Documentation improvement |
| `frontend` | Changes to `public/` |
| `backend` | Changes to `netlify/functions/` |
| `api` | External API integration |

---

## Your First Contribution

New to open source? Here's how to get started:

1. **Look for `good first issue` labels** — these are specifically scoped for newcomers.
2. **Browse the [`issues/`](issues/) directory** — each file contains a detailed specification with acceptance criteria, API details, and file targets.
3. **Comment on the issue** to let maintainers know you're working on it.
4. **Don't be afraid to ask questions** — open a Discussion or comment on the issue if you need help.

### Recommended First Issues

| Issue | Difficulty | Area |
|---|---|---|
| [Open Access Finder](issues/ISSUE_01_OPEN_ACCESS_FINDER.md) | Easy | API + Frontend |
| [KaTeX Math Rendering](issues/ISSUE_02_KATEX_MATH_RENDERING.md) | Easy | Frontend |
| [Panel Screenshot Export](issues/ISSUE_03_PANEL_SCREENSHOT_EXPORT.md) | Easy | Frontend |
| [Reading Time Estimator](issues/ISSUE_05_READING_TIME_ESTIMATOR.md) | Easy | Frontend |

---

## 💙 Thank You

Every contribution, no matter how small — a typo fix, a documentation update, a bug report — makes AbstractiFy better. We appreciate your time and effort!

**Happy contributing! 🎓✨**
