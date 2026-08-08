# Issue #04: 📚 Bibliography Generator (APA / MLA / Chicago / IEEE / BibTeX)

**Labels**: `enhancement`, `good first issue`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

When writing research papers or literature reviews, scholars spend significant time formatting citations according to specific academic publisher guidelines (APA, MLA, IEEE, BibTeX). AbstractiFy gathers paper metadata from Semantic Scholar and OpenAlex, but currently lacks a quick citation generator.

---

## 🎯 Goal

Implement a **Bibliography Generator** modal/sidebar feature that formats selected search results or cited publications into proper **APA 7th**, **MLA 9th**, **Chicago 17th**, **IEEE**, and **BibTeX** reference entries with one-click copy and `.bib`/`.txt` file download.

---

## ⚙️ Technical Specification

### Citation Styles Supported
1. **APA 7th**: `Author, A. A. (Year). Title of article. Journal Name, Volume(Issue), Pages. https://doi.org/DOI`
2. **MLA 9th**: `Author, A. A. "Title of Article." Journal Name, vol. Volume, no. Issue, Year, pp. Pages.`
3. **Chicago**: `Author, A. A. "Title of Article." Journal Name Volume, no. Issue (Year): Pages.`
4. **IEEE**: `[1] A. A. Author, "Title of article," Journal Name, vol. Volume, no. Issue, pp. Pages, Year.`
5. **BibTeX**:
   ```bibtex
   @article{authorYearKey,
     author = {Author, A. A.},
     title = {{Title of Article}},
     journal = {Journal Name},
     year = {Year},
     doi = {DOI}
   }
   ```

### UI Components
- Add a **"📚 Export Bibliography"** button in the workspace toolbar.
- Opens a modal with:
  - Format selector dropdown (`APA 7th`, `MLA 9th`, `Chicago`, `IEEE`, `BibTeX`).
  - Formatted preview text area with syntax highlighting or copy-to-clipboard functionality.
  - Buttons: **"📋 Copy to Clipboard"** and **"📥 Download (.bib / .txt)"**.

---

## ✅ Acceptance Criteria

- [ ] Add `Export Bibliography` action button to top workspace header and search results bar.
- [ ] Format list of current search results into selected citation style (APA, MLA, Chicago, IEEE, BibTeX).
- [ ] Handle missing fields gracefully (e.g. missing volume/issue or missing DOI).
- [ ] Include one-click `Copy to Clipboard` with success toast notification.
- [ ] Support downloading citations as `.bib` file for reference managers (EndNote, Zotero, Mendeley, Overleaf).
- [ ] Support multi-select checkboxes on paper cards to generate citations for specific selected papers.

---

## 💡 Code Guidance

- Add helper functions `formatAPA()`, `formatBibTeX()`, etc. in `public/app.js`.
- Add modal markup in `public/index.html`.
- Reference guidelines: [APA Style 7th Edition](https://apastyle.apa.org/), [BibTeX Standard](https://www.bibtex.org/).
