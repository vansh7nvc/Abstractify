# Issue #02: 🧮 KaTeX Math Rendering Engine Integration

**Labels**: `enhancement`, `good first issue`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

AbstractiFy includes an **Equation Explainer** and PDF chat capability that parses LaTeX math formulas from uploaded academic papers. Currently, LaTeX expressions like `$\nabla \times \mathbf{E} = -\frac{\partial \mathbf{B}}{\partial t}$` or `$$\sum_{i=1}^n x_i$$` are rendered as raw text. This makes mathematical expressions hard to read.

---

## 🎯 Goal

Integrate the lightweight, ultra-fast [KaTeX library](https://katex.org/) via CDN to cleanly render inline (`$...$`) and block (`$$...$$`) LaTeX equations into beautifully formatted mathematical notation throughout the UI.

---

## ⚙️ Technical Specification

### External Dependencies (CDN)
Add to `public/index.html` inside `<head>`:
```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
<script defer src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js" crossorigin="anonymous"></script>
```

### Logic Implementation
1. **Equation Explainer**:
   - In `renderFormulas()` and `explainEquation()` in `public/app.js`, wrap equation targets with `katex.render(equationString, element, { throwOnError: false })`.
2. **Chat Messages & PDF Chunking**:
   - In `addChatMessage()`, invoke `renderMathInElement(messageElement, { delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}] })` after appending message DOM node.

---

## ✅ Acceptance Criteria

- [ ] Add KaTeX CSS and JS CDN scripts to `public/index.html`.
- [ ] Render formulas in the **Equation Explainer** panel using KaTeX.
- [ ] Auto-render math expressions inside chat responses from Gemini and PDF chunks.
- [ ] Handle invalid LaTeX syntax gracefully using `throwOnError: false` (displays fallback raw text in red without throwing JavaScript exceptions).
- [ ] Support both inline (`$E = mc^2$`) and block display (`$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$`) modes.
- [ ] Ensure font styling matches dark/light mode themes seamlessly.

---

## 💡 Code Guidance

- Check `public/app.js` around `explainEquation()` and `renderFormulas()`.
- Test formula input: `\sigma = \sqrt{\frac{1}{N} \sum_{i=1}^N (x_i - \mu)^2}`.
- Make sure KaTeX script has loaded before calling `katex.render()`.
