# 🤝 Contributor Playbook & Workflow

Thank you for contributing to AbstractiFy! This playbook explains our issue assignment, PR review, and quality standards.

---

## 🙋 Claiming an Issue

1. Browse our [20 Open Issues](https://github.com/vansh7nvc/Abstractify/issues).
2. Filter by [`good first issue`](https://github.com/vansh7nvc/Abstractify/labels/good%20first%20issue) if you are new to the repository.
3. Comment `"assign me"` or `"I'd like to work on this"` on the issue.
4. Our **Issue Auto-Assign Bot** will automatically assign the issue to you and post a welcome confirmation!

---

## 🛠️ Pull Request Checklist

Before submitting your PR, ensure:

1. **Branch Naming**: Use `feature/issue-name` or `fix/issue-name`.
2. **Issue Linking**: Include `Closes #XX` in your PR description.
3. **Automated Validation**: Run `npm run validate` locally:
   ```bash
   npm run validate
   ```
   This ensures TypeScript types compile (`typecheck`), ESLint passes (`lint`), and Prettier formatting is clean (`format:check`).

---

## 🤖 Automated PR Review Engine

When you submit a PR, our CI pipeline automatically runs:
- **CodeQL Security Analysis** (SAST XSS and credential leak scanner)
- **Gitleaks Secret Scanner** (prevents secret leaks)
- **Dependency Security Audit** (`npm audit`)
- **Automated PR Review Bot**:
  - If your PR passes all checks, it receives an instant green review comment!
  - If checks fail, a detailed diagnostic report lists exact line numbers so you can fix them quickly.
