# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | ✅ Actively supported |
| < 1.0   | ❌ No longer supported |

## Reporting a Vulnerability

We take the security of AbstractiFy seriously. If you discover a security vulnerability, please report it responsibly.

### ⚠️ Do NOT open a public GitHub issue for security vulnerabilities.

Instead, please report vulnerabilities by emailing:

**📧 vansh7nvc@gmail.com**

Include the following in your report:

- **Description** of the vulnerability
- **Steps to reproduce** (if applicable)
- **Impact assessment** — what could an attacker do with this vulnerability?
- **Affected component** — frontend (`public/`), serverless functions (`netlify/functions/`), or configuration
- **Suggested fix** (if you have one)

### What to Expect

| Step | Timeline |
|---|---|
| Acknowledgement of your report | Within **48 hours** |
| Initial assessment and triage | Within **5 business days** |
| Fix development and testing | Within **14 business days** |
| Public disclosure (after fix) | Coordinated with reporter |

We will keep you informed about the progress of addressing the vulnerability.

## Security Considerations

### API Key Management

- **Server-side keys** are stored as Netlify environment variables and never exposed to the client.
- **BYOK (Bring Your Own Key)** mode sends user-provided API keys via HTTP headers only — they are never persisted server-side or logged.
- The `.env` file is excluded from version control via `.gitignore`.

### Security Headers

AbstractiFy enforces security headers via `netlify.toml`:

- `X-Frame-Options: DENY` — prevents clickjacking
- `X-Content-Type-Options: nosniff` — prevents MIME-type sniffing
- `Referrer-Policy: strict-origin-when-cross-origin` — limits referrer information leakage
- `Permissions-Policy` — restricts browser feature access

### Dependency Security

- Dependencies are monitored via [Dependabot](.github/dependabot.yml) for automated vulnerability alerts and update PRs.
- We recommend running `npm audit` periodically to check for known vulnerabilities.

## Acknowledgements

We appreciate security researchers and community members who help keep AbstractiFy safe. Responsible disclosures will be credited in our release notes (with your permission).
