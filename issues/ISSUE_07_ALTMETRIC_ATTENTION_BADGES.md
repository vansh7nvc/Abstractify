# Issue #07: 🏅 Altmetric Attention Badges & Social Impact Score

**Labels**: `enhancement`, `help wanted`, `api`, `frontend`  
**Difficulty**: `Medium`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Academic citations take months or years to accumulate, whereas public interest, news coverage, tweets, blog posts, Wikipedia citations, and policy document mentions happen immediately. [Altmetric](https://www.altmetric.com/) tracks social and public engagement with scientific publications.

---

## 🎯 Goal

Embed **Altmetric Attention Donut Badges** on paper cards and provide a sortable "Public Buzz Score" filter so users can identify papers gaining viral attention in news media and social channels.

---

## ⚙️ Technical Specification

### API Endpoint
- **URL**: `GET https://api.altmetric.com/v1/doi/{doi}`
- **Auth**: Free endpoint (no API key required for basic badge & breakdown metrics).
- **Response Schema**:
  ```json
  {
    "score": 142.5,
    "images": {
      "small": "https://images.altmetric.com/?size=100&score=143&types=mttttttt"
    },
    "cited_by_posts_count": 85,
    "cited_by_tweeters_count": 62,
    "cited_by_msm_count": 12,
    "cited_by_wikipedia_count": 3
  }
  ```

### Implementation Steps
1. In `public/app.js`, after search results render, query Altmetric for all papers with valid DOIs.
2. Render small donut badge image or custom SVG score pill on paper card metadata bar.
3. Add interactive hover tooltip:
   - 📰 News Outlets: `12`
   - 🐤 Tweets/X Posts: `62`
   - 📖 Wikipedia References: `3`
   - 💬 Blog Mentions: `8`
4. Add a "Sort by Altmetric Score" option to search result sorting controls.

---

## ✅ Acceptance Criteria

- [ ] Fetch Altmetric attention metrics for papers with valid DOIs.
- [ ] Display Altmetric donut badge or score pill on paper cards.
- [ ] Render detailed hover breakdown tooltip (news, tweets, Wikipedia, policy docs).
- [ ] Add `Sort by Buzz Score (Altmetric)` dropdown option in workspace sorting menu.
- [ ] Handle papers with 0 social attention gracefully (no broken images or console errors).

---

## 💡 Code Guidance

- Modify `renderPaperCards()` in `public/app.js`.
- Use Altmetric API embed script or fetch JSON directly via client fetch.
- Style badge tooltip in `public/styles.css`.
