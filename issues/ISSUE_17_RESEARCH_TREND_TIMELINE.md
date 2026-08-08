# Issue #17: 📈 Research Trend Timeline (Chart.js + OpenAlex API)

**Labels**: `enhancement`, `help wanted`, `frontend`, `api`  
**Difficulty**: `Medium`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Scientific fields experience cycles of growth, breakthroughs, and declines. When researchers investigate a query, they need to know whether interest in the topic is expanding or fading over time.

---

## 🎯 Goal

Build an interactive **Research Trend Timeline** chart panel using [Chart.js](https://www.chartjs.org/) that queries the OpenAlex `/works?group_by=publication_year` endpoint and plots annual publication volume for the active search query.

---

## ⚙️ Technical Specification

### External Library (CDN)
Add to `public/index.html`:
```html
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
```

### OpenAlex Data Fetch
Query OpenAlex API for publication year counts:
```
GET https://api.openalex.org/works?search={query}&group_by=publication_year
```

Response Schema:
```json
{
  "group_by": [
    { "key": "2023", "count": 1420 },
    { "key": "2022", "count": 1150 },
    { "key": "2021", "count": 890 }
  ]
}
```

### Chart.js Render Workflow
1. In `public/app.js`, create canvas element inside `#trend-timeline-container`.
2. Sort year groups chronologically (e.g. 2010 to 2026).
3. Render animated gradient line chart with tooltips:
   - X-Axis: Publication Year
   - Y-Axis: Total Publications
   - Hover Tooltip: `Year 2023: 1,420 papers published`

---

## ✅ Acceptance Criteria

- [ ] Add Chart.js CDN script to `public/index.html`.
- [ ] Add `📈 Research Trend Timeline` workspace section panel.
- [ ] Query OpenAlex `group_by=publication_year` endpoint upon workspace search.
- [ ] Render animated line chart showing annual publication trends over time.
- [ ] Add decade milestone markers (e.g. breakthrough years).
- [ ] Support topic trend comparison (overlay 2 search query lines).

---

## 💡 Code Guidance

- Initialize chart: `new Chart(ctx, { type: 'line', data: ..., options: ... })`.
- Style chart canvas in dark/light mode harmoniously in `public/styles.css`.
