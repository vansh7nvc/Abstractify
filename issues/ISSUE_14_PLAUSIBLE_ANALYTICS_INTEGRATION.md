# Issue #14: 📊 Plausible Privacy Analytics & Custom Event Tracking

**Labels**: `enhancement`, `good first issue`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js)

---

## 📌 Problem & Context

To demonstrate real-world usage impact on resume and portfolio evaluations (e.g. *"100+ active research sessions monthly"*), AbstractiFy needs lightweight, privacy-respecting analytics without cookies or GDPR consent banners.

[Plausible Analytics](https://plausible.io/) is an open-source, cookie-less web analytics script under 1KB.

---

## 🎯 Goal

Integrate Plausible script into `public/index.html` and dispatch custom events (`search_performed`, `consensus_generated`, `pdf_uploaded`, `export_triggered`) to track platform engagement.

---

## ⚙️ Technical Specification

### Script Integration
Add to `public/index.html`:
```html
<script defer data-domain="abstractify1.netlify.app" src="https://plausible.io/js/script.tagged-events.js"></script>
<script>
  window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }
</script>
```

### Event Tracking Functions
In `public/app.js`:
- On search: `plausible('SearchPerformed', { props: { queryLength: query.length } })`
- On Consensus analysis: `plausible('ConsensusGenerated')`
- On PDF upload: `plausible('PdfUploaded')`
- On Export: `plausible('ExportTriggered', { props: { format: exportType } })`

---

## ✅ Acceptance Criteria

- [ ] Add Plausible script tag with `data-domain="abstractify1.netlify.app"`.
- [ ] Add `plausible()` custom event triggers for search, consensus, comparison, PDF upload, and export events.
- [ ] Ensure analytics fail gracefully if blocked by ad-blockers (no JavaScript errors).
- [ ] Document analytics setup in `SECURITY.md` (privacy compliance).

---

## 💡 Code Guidance

- Safe wrapper helper function:
  ```javascript
  function trackEvent(eventName, props = {}) {
    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props });
    }
  }
  ```
