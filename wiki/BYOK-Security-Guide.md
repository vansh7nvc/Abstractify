# 🔒 BYOK & Security Architecture Guide

AbstractiFy enforces strict security standards to ensure zero credential leaks and safe API key usage.

---

## 🔑 Credential Modes

### 1. Secure Background Mode (Production Default)
- In production on Netlify, the serverless API accesses `process.env.GEMINI_API_KEY`.
- **Client Security**: No API key is ever exposed in client-side HTML, JS bundles, or browser memory.

### 2. Bring Your Own Key (BYOK) Mode
- Users can input their personal Gemini API key in the frontend Settings panel.
- **Client Storage**: Stored strictly in client-side `localStorage`.
- **Header Transmission**: Passed to Netlify functions via encrypted HTTPS request header (`X-Gemini-Key`).
- **Server Persistence**: Netlify functions use the header key in-memory for the single request and **NEVER** save or log it to disk or log files.

---

## 🛡️ Security Headers & Content Security Policy

Configured in `netlify.toml`:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocations=()"
```

---

## 🚨 Security Vulnerability Disclosure

If you discover a potential security flaw or credential vulnerability, please read our [SECURITY.md](https://github.com/vansh7nvc/Abstractify/blob/main/SECURITY.md) policy and email `security@abstractify.app`. Do not open public GitHub issues for security vulnerabilities.
