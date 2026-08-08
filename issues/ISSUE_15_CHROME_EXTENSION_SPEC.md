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

3. **`popup.html` & `popup.js`**:
   - Quick search widget embedded directly inside extension popup window.

---

## ✅ Acceptance Criteria

- [ ] Create `extension/` directory with valid Manifest v3 specification.
- [ ] Implement right-click context menu "Analyze with AbstractiFy".
- [ ] Auto-extract DOI regex patterns (`10.\d{4,9}/[-._;()/:A-Z0-9]+`) from current active browser tab URL or highlighted text.
- [ ] Open AbstractiFy web app pre-populated with extracted paper DOI.
- [ ] Provide packaging build script in `package.json` (`npm run build:extension`).

---

## 💡 Code Guidance

- Test extension loading via Chrome `chrome://extensions` → Load unpacked → select `extension/` folder.
