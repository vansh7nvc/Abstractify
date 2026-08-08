# 💬 Community Support & Troubleshooting

Welcome to the **AbstractiFy Support Guide**! This document explains how to get help, report bugs, and troubleshoot common setup issues.

---

## 🙋 Getting Help

Before asking for support, please check if your question is answered in the documentation:

1. **Check the [README](README.md)** for general setup and architecture details.
2. **Check the [Contributing Guide](CONTRIBUTING.md)** for local development environment setup.
3. **Check the [Public Roadmap](ROADMAP.md)** and [`issues/`](issues/) directory for planned features.

---

## ❓ Where to Post?

| Goal | Channel | Link |
|---|---|---|
| Report a bug | GitHub Issues (Bug Report form) | [Open Bug Report](https://github.com/vansh7nvc/Abstractify/issues/new?template=bug_report.yml) |
| Request a feature | GitHub Issues (Feature Request form) | [Request Feature](https://github.com/vansh7nvc/Abstractify/issues/new?template=feature_request.yml) |
| Report a security vulnerability | Private Email (Security Policy) | Email `vansh7nvc@gmail.com` (See [SECURITY.md](SECURITY.md)) |
| General questions & discussions | GitHub Discussions | [Open Discussion](https://github.com/vansh7nvc/Abstractify/discussions) |

---

## 🔧 Frequently Asked Questions (FAQ)

### 1. `netlify dev` fails to start locally
- Ensure Node.js v18+ is installed (`node -v`).
- Install `netlify-cli` globally: `npm install -g netlify-cli`.
- Run `npm install` inside the project folder before starting `netlify dev`.

### 2. Gemini API returns 401 Unauthorized or 403 Forbidden
- Verify `GEMINI_API_KEY` in your local `.env` file (copied from `.env.example`).
- If using **BYOK (Bring Your Own Key)** mode, open the Credentials Settings modal in the app UI and paste your key.

### 3. Serverless functions return CORS errors
- Local functions are served at `http://localhost:8888/.netlify/functions/`.
- Ensure you are accessing the app through `http://localhost:8888` (Netlify Dev proxy) rather than opening `index.html` directly as a local file (`file://`).

---

## 💙 Support Ethics

We are committed to maintaining a friendly, welcoming environment. All community interactions are subject to our [Code of Conduct](CODE_OF_CONDUCT.md).
