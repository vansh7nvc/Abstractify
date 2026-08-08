# Issue #09: 🔍 Paper Recommendation Engine (Semantic Scholar Recommendations API)

**Labels**: `enhancement`, `help wanted`, `backend`, `frontend`  
**Difficulty**: `Medium`  
**Target Files**: [`netlify/functions/recommend.ts`](../netlify/functions/), [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html)

---

## 📌 Problem & Context

When researchers find a highly relevant landmark paper, keyword search often fails to capture similar papers that use different terminology. Semantic Scholar provides a dedicated **Recommendations API** (`/recommendations/v1/papers/forpaper/{paper_id}`) that returns AI-recommended papers based on graph embeddings and citation overlaps.

---

## 🎯 Goal

Add a **"Find Similar Papers" (🔍)** action on each paper card that queries a new serverless function (`recommend.ts`) and pops up an interactive modal displaying recommended publications with similarity scores and one-click search inclusion.

---

## ⚙️ Technical Specification

### Serverless Function (`netlify/functions/recommend.ts`)
- **Endpoint**: `POST /.netlify/functions/recommend`
- **Request Body**: `{ "paperId": "64a3299b4006ad735782cb8bbb3d2a5486182da3", "limit": 10 }`
- **Upstream API**:
  `GET https://api.semanticscholar.org/recommendations/v1/papers/forpaper/{paper_id}?fields=title,authors,year,abstract,citationCount,externalIds,openAccessPdf`
- **Response**: List of recommended paper objects normalized for AbstractiFy client UI.

### UI Workflow
1. Add **"🔍 Find Similar"** button on paper cards in search results.
2. Clicking button opens a slide-over modal: `Recommended Papers similar to [Paper Title]`.
3. Displays list of recommended papers with similarity metrics.
4. Button **"➕ Add to Workspace"**: Appends paper card into current active search result list.

---

## ✅ Acceptance Criteria

- [ ] Create serverless function `netlify/functions/recommend.ts`.
- [ ] Connect to Semantic Scholar Recommendations API.
- [ ] Add `Find Similar` button to paper cards in `public/app.js`.
- [ ] Create recommendation modal UI in `public/index.html`.
- [ ] Allow users to append recommended papers into their active workspace search matrix and citation network graph.
- [ ] Implement error handling and rate-limiting safeguards (5 req/min).

---

## 💡 Code Guidance

- Use standard headers and utility helpers from `netlify/functions/_utils.ts`.
- Test with standard Semantic Scholar IDs or DOI inputs.
