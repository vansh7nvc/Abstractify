# Issue #19: 🧠 Research Gap Detector (Gemini AI Analysis)

**Labels**: `enhancement`, `help wanted`, `backend`, `ai`  
**Difficulty**: `Medium`  
**Target Files**: [`netlify/functions/gap-detector.ts`](../netlify/functions/) (NEW), [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html)

---

## 📌 Problem & Context

Identifying unanswered research questions, unaddressed edge cases, and methodological gaps in existing literature is the hardest part of writing a thesis or grant proposal. Researchers must read dozens of paper discussion sections to find where current science stops.

---

## 🎯 Goal

Build a **Research Gap Detector** serverless function and UI panel that uses Google Gemini to analyze search results and distill unaddressed research questions, missing datasets, and promising future research directions.

---

## ⚙️ Technical Specification

### Serverless Function (`netlify/functions/gap-detector.ts`)
- **Endpoint**: `POST /.netlify/functions/gap-detector`
- **Request Body**: `{ "query": "...", "papers": [...] }`
- **Prompt Strategy**:
  Extract paper abstracts, limitations, and future work notes. Pass to Gemini model (`gemini-2.5-flash` or `gemini-1.5-flash`) with structured JSON schema output:
  ```json
  {
    "identifiedGaps": [
      {
        "category": "Methodological",
        "description": "Lack of longitudinal studies beyond 12-month evaluation periods.",
        "affectedPapers": ["Paper A", "Paper B"],
        "proposedOpportunity": "Conduct 3-year cohort study analyzing long-term retention."
      }
    ],
    "unansweredQuestions": [
      "How does model performance degrade under extreme domain shifts?"
    ]
  }
  ```

### UI Panel
- Render a new workspace card: **"🧠 Unaddressed Research Gaps & Opportunities"**.
- Display category pills (`Methodological`, `Data Gap`, `Algorithmic`, `Clinical`).
- Provide one-click "Copy Research Topic Idea" button for students and authors.

---

## ✅ Acceptance Criteria

- [ ] Create TypeScript serverless function `gap-detector.ts` under `netlify/functions/`.
- [ ] Send structured Gemini prompt requesting JSON output for research gaps.
- [ ] Add `Research Gap Detector` panel in workspace dashboard.
- [ ] Display categorized gaps with affected papers and proposed research opportunities.
- [ ] Provide one-click copy button for research topic ideas.

---

## 💡 Code Guidance

- Reference existing Gemini JSON schema prompts in `netlify/functions/compare.ts`.
- Use `getHeaders()` for client-side API authentication.
