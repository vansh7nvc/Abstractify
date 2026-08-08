# Issue #18: 💾 Saved Research Sessions (localStorage Persistence)

**Labels**: `enhancement`, `good first issue`, `frontend`, `ux`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Researchers work on literature reviews over days or weeks. Currently, refreshing or navigating away from AbstractiFy clears active search results, consensus analyses, and comparison matrices, requiring users to re-run expensive API queries.

---

## 🎯 Goal

Implement a **Saved Sessions** sidebar panel that allows users to bookmark, tag, name, and restore previous research searches and analyses directly from `localStorage`.

---

## ⚙️ Technical Specification

### State Storage Schema (`localStorage`)
Save serialized session objects under `abstractify_saved_sessions`:

```json
[
  {
    "id": "session_1706000000000",
    "title": "Quantum ML in Drug Discovery",
    "query": "Quantum machine learning protein folding",
    "date": "2026-08-08T17:00:00Z",
    "tags": ["Quantum", "Biology"],
    "paperCount": 12,
    "consensusScore": 82,
    "searchResults": [...],
    "consensusData": {...},
    "matrixData": [...]
  }
]
```

### UI Features
1. **Header Action**: Add `💾 Save Session` button next to workspace title.
2. **Sidebar Panel**: "Recent Research Sessions" showing saved cards with tags, date, paper count, and restore/delete actions.
3. **Restore Handler**: Clicking a saved session card instantly populates `state.searchResults`, `state.consensusData`, `state.matrixData`, and re-renders workspace views without making network requests.

---

## ✅ Acceptance Criteria

- [ ] Add `Save Session` button in workspace dashboard.
- [ ] Render `Recent Sessions` sidebar list.
- [ ] Save full search state (query, results, consensus, matrix) to `localStorage`.
- [ ] Restore saved sessions instantly on click without API calls.
- [ ] Cap saved sessions at 10 to prevent `localStorage` quota overflow, with clear/delete controls.
- [ ] Allow session tagging and custom naming.

---

## 💡 Code Guidance

- Use `JSON.stringify()` and `JSON.parse()` for `localStorage`.
- Handle quota exceeded errors (`QuotaExceededError`) gracefully.
