# Issue #08: ⚠️ Retraction & Scientific Reliability Check (CrossRef API)

**Labels**: `enhancement`, `help wanted`, `api`, `backend`  
**Difficulty**: `Medium`  
**Target Files**: [`netlify/functions/retraction-check.ts`](../netlify/functions/), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Scientific integrity is critical. Researchers occasionally build literature reviews on top of papers that have been **retracted**, corrected, or flagged with **Expressions of Concern** post-publication. Citing retracted papers undermines research credibility.

The [CrossRef Event Data & Works API](https://api.crossref.org/) tracks paper updates, retractions, and corrections via the `update-to` relation metadata.

---

## 🎯 Goal

Build a reliability verification mechanism that automatically checks paper DOIs against CrossRef metadata, flagging retracted papers with a prominent **⚠️ RETRACTED** warning banner and displaying notice details.

---

## ⚙️ Technical Specification

### Serverless Function (`netlify/functions/retraction-check.ts`)
- **Endpoint**: `POST /.netlify/functions/retraction-check`
- **Request Body**: `{ "dois": ["10.1016/...", "10.1038/..."] }`
- **Logic**:
  - Query `https://api.crossref.org/works/{doi}` in batch or parallel.
  - Parse `update-to` array or `assertion` records.
  - Detect `type: "retraction"`, `"correction"`, or `"expression-of-concern"`.
- **Response Schema**:
  ```json
  {
    "10.1016/j.cell.2020.01.001": {
      "isRetracted": true,
      "type": "retraction",
      "reason": "Data manipulation in Figure 4",
      "noticeDoi": "10.1016/j.cell.2020.05.012",
      "updatedDate": "2020-05-15"
    }
  }
  ```

### UI Implementation
- On retracted paper cards: Render red glowing banner: `⚠️ WARNING: This paper was RETRACTED on May 15, 2020`.
- In Study Comparison Matrix: Add a column `Reliability Status` (Green `Verified` / Red `Retracted` / Orange `Corrected`).

---

## ✅ Acceptance Criteria

- [ ] Create TypeScript serverless function `retraction-check.ts` under `netlify/functions/`.
- [ ] Query CrossRef REST API for retraction metadata for batch DOIs.
- [ ] Display prominent red warning badge (`⚠️ RETRACTED`) on affected paper cards.
- [ ] Render warning banner on Study Comparison Matrix rows.
- [ ] Provide direct link to formal retraction notice PDF/webpage.
- [ ] Cache retraction check results in `sessionStorage` to avoid duplicate API calls.

---

## 💡 Code Guidance

- Reference existing Netlify serverless functions like `netlify/functions/search.ts`.
- Test using known retracted DOIs (e.g. `10.1016/S0140-6736(97)11096-0`).
