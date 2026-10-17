# Issue #15: 🧩 Web Extension (Manifest v3) Specification

**Labels**: `enhancement`, `help wanted`, `extension`  
**Difficulty**: `Hard`  
**Target Files**: `extension/` (NEW directory: `manifest.json`, `popup.html`, `popup.js`, `background.js`)

---

## 📌 Problem & Context

Researchers often stumble upon academic paper URLs (arXiv, Nature, PubMed, IEEE Xplore, ScienceDirect) while browsing the web. Navigating back to AbstractiFy to paste DOIs or titles introduces context switching.

---

## 🎯 Goal

Build a browser extension (Chrome / Firefox / Edge Manifest v3) that detects academic papers on any webpage, adds a right-click context menu **"Analyze with AbstractiFy"**, and opens an instant side panel with Consensus & Citation insights.

---

## ⚙️ Technical Specification

### Extension Architecture (`extension/`)
1. **`manifest.json`**:
   ```json
   {
     "manifest_version": 3,
     "name": "AbstractiFy Research Companion",
     "version": "1.0.0",
     "description": "Instant academic consensus and AI synthesis for any research paper URL.",
     "permissions": ["contextMenus", "activeTab", "sidePanel"],
     "background": {
       "service_worker": "background.js"
     },
     "action": {
       "default_popup": "popup.html"
     }
   }
   ```

2. **`background.js`**:
   - Register context menu: `chrome.contextMenus.create({ id: "abstractify-analyze", title: "Analyze with AbstractiFy", contexts: ["selection", "link"] })`.
   - On click: Extract DOI/URL and redirect to `https://abstractify1.netlify.app?doi=...`.

4. **`content-scripts/publisher-scrapers.js` (NEW)**:
   - Dedicated scrapers for major paywalls: ScienceDirect/Elsevier, Nature Springer, Wiley, IEEE Xplore, and PubMed.
   - Extracts paper title, authors, DOI, and open-access PDF links directly from the publisher's rendered DOM.

---

## 🔍 Reverse-Engineering Blueprint with REA (`rea-agents`)

Rather than hand-crafting DOM scrapers for dozens of evolving journal websites, contributors can use **REA (`npx rea-agents@latest`)** to inspect and extract battle-tested content scripts from existing open-source and commercial extensions (like the Zotero Connector and Scite extension):

```bash
# 1. Download and extract Zotero Connector or Scite .crx / source
# 2. Run REA JavaScript application analyzer to map out publisher content scripts
npx -y rea-agents@latest analyze-javascript-application ./scrapes/unpacked-zotero-extension --json > zotero-scrapers.json
```
Inspect the output to borrow URL match patterns (`*://*.sciencedirect.com/*`, `*://*.nature.com/articles/*`) and their resilient DOI extraction selectors (`meta[name="citation_doi"]`, `meta[name="dc.identifier"]`).

---

## ✅ Acceptance Criteria

- [ ] Create `extension/` directory with valid Manifest v3 specification.
- [ ] Implement right-click context menu "Analyze with AbstractiFy".
- [ ] Implement `publisher-scrapers.js` covering Nature, ScienceDirect, Wiley, IEEE, and PubMed.
- [ ] Auto-extract DOI regex patterns (`10.\d{4,9}/[-._;()/:A-Z0-9]+`) and `<meta name="citation_doi">` tags.
- [ ] Open AbstractiFy web app side-panel pre-populated with extracted paper DOI.
- [ ] Provide packaging build script in `package.json` (`npm run build:extension`).

---

## 💡 Code Guidance

- Test extension loading via Chrome `chrome://extensions` → Load unpacked → select `extension/` folder.
- Use REA inspection results to verify fallback meta tags for single-page application publisher sites.
