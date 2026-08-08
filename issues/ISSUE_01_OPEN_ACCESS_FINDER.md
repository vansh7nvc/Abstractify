# Issue #01: 🔓 Open Access Finder — Unpaywall Integration

**Labels**: `enhancement`, `good first issue`, `api`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Currently, when users search for academic papers on AbstractiFy, paper cards display metadata (authors, citations, year, venue) and abstract links. However, users frequently want to read the full open-access PDF immediately without navigating behind paywalls.

The [Unpaywall API](https://unpaywall.org/products/api) is a free database of 50M+ open-access scholarly articles with direct links to legal full-text PDFs.

---

## 🎯 Goal

Enhance paper cards by querying the Unpaywall API for papers with a DOI and displaying a green **🔓 Open Access** badge with a direct **"Read Full Text PDF"** button when a free full text is available.

---

## ⚙️ Technical Specification

### API Details
- **Endpoint**: `GET https://api.unpaywall.org/v2/{doi}?email=unpaywall-support@abstractify.app`
- **Authentication**: None required (requires email parameter in query string).
- **Key Fields**:
  - `is_oa`: `boolean` (true if open access available)
  - `best_oa_location.url_for_pdf`: `string` (direct link to the free PDF file)
  - `best_oa_location.license`: `string` (e.g. `cc-by`, `cc-by-nc`)

### UI Changes
1. **Paper Cards**:
   - Add an asynchronous post-rendering step in `renderPaperCards()` in `app.js`.
   - For papers with a valid DOI (`paper.doi`), make a rate-limited request to Unpaywall.
   - If `is_oa === true` and `best_oa_location.url_for_pdf` exists:
     - Display a styled green badge: `🔓 Open Access`.
     - Render a primary button: `📄 Read Full Text (PDF)` that opens `url_for_pdf` in a new tab (`target="_blank" rel="noopener"`).

---

## ✅ Acceptance Criteria

- [ ] Fetch OA status for papers with valid DOIs after search results render.
- [ ] Display green `🔓 Open Access` badge on matching paper cards.
- [ ] Add `Read Full Text` button linking directly to the PDF URL (`best_oa_location.url_for_pdf`).
- [ ] Gracefully handle missing DOIs, 404 responses, or non-OA papers (no broken icons or error logs).
- [ ] Implement request batching or rate limiting (e.g., 100ms stagger between requests) to respect Unpaywall guidelines.
- [ ] Include tooltip showing OA license if available (e.g. `License: CC-BY 4.0`).

---

## 💡 Code Guidance

- Modify `renderPaperCards()` in `public/app.js`.
- Add CSS styling in `public/styles.css` for `.oa-badge` (emerald green text/border with glassmorphism glow).
- Test with known open-access DOIs such as `10.1038/s41586-020-2649-2` or `10.1371/journal.pone.0000000`.
