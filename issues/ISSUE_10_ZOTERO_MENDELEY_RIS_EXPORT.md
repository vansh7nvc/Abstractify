# Issue #10: 📥 Zotero & Mendeley RIS Citation Exporter

**Labels**: `enhancement`, `good first issue`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Researchers rely heavily on reference management software such as **Zotero**, **Mendeley**, **EndNote**, and **RefWorks** to manage their bibliographies. While JSON and CSV exports are helpful for developers, reference managers natively import the **RIS (`.ris`)** format.

---

## 🎯 Goal

Implement an **Export to RIS** feature that converts search results and cited publications into standardized `.ris` files for direct one-click import into Zotero and Mendeley.

---

## ⚙️ Technical Specification

### RIS Format Standard
Each paper entry in RIS format uses tagged two-character keys:

```ris
TY  - JOUR
TI  - Attention Is All You Need
AU  - Vaswani, Ashish
AU  - Shazeer, Noam
PY  - 2017
JO  - Advances in Neural Information Processing Systems
DO  - 10.48550/arXiv.1706.03762
UR  - https://arxiv.org/abs/1706.03762
AB  - The dominant sequence transduction models are based on complex recurrent or convolutional neural networks...
ER  - 
```

### Key Tags
- `TY  - JOUR` (Publication type: Journal article)
- `TI  - Title`
- `AU  - Author Name` (One tag per author)
- `PY  - Publication Year`
- `JO  - Journal / Venue`
- `DO  - DOI`
- `UR  - URL`
- `AB  - Abstract`
- `ER  - ` (End of Record)

---

## ✅ Acceptance Criteria

- [ ] Add `.ris` option to bibliography/export options.
- [ ] Format search results according to the official RIS specification.
- [ ] Support multi-author tag repetition (`AU  - Author 1`, `AU  - Author 2`).
- [ ] Trigger download as `abstractify_references_[timestamp].ris`.
- [ ] Validate import compatibility in Zotero and Mendeley.

---

## 💡 Code Guidance

- Add `formatRIS(papers)` generator function in `public/app.js`.
- Use MIME type `application/x-research-info-systems` or `text/plain` for file download.
