# Issue #39: 🔬 In-Document PDF Visual Copilot & Coordinate-Mapped Explainer (SciSpace Pattern)

**Labels**: `enhancement`, `help wanted`, `frontend`, `backend`, `ui/ux`, `area: ai`, `difficulty: hard`  
**Difficulty**: `Hard`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css), [`netlify/functions/pdf-explain-math.ts`](../netlify/functions/pdf-explain-math.ts), [`netlify/functions/pdf-chat.ts`](../netlify/functions/pdf-chat.ts)

---

## 📌 Problem & Context

Abstractify currently parses uploaded academic PDFs into text chunks for background RAG chat and regex-based LaTeX equation extraction. However, users are forced to interact through a generic chat box instead of the actual document layout.

**SciSpace (Typeset.io)** established the gold standard for reading academic literature by overlaying interactive AI tools directly onto the rendered PDF canvas: users can highlight any sentence, equation, or table bounding box to receive contextual floating breakdowns without losing visual grounding.

---

## 🎯 Goal

Embed a visual **PDF Reader & AI Overlay** inside Abstractify using **PDF.js** with coordinate-mapped selection:
1. Render uploaded research PDFs with crisp canvas rendering and a transparent selectable text layer.
2. When a user selects text or draws a bounding box around an equation/table, an anchored floating tooltip menu appears with quick actions:
   - 🧮 **Explain Equation**: Deconstructs math symbols, operators, and derivations (calls `pdf-explain-math.ts`).
   - 💡 **De-Jargonize**: Simplifies dense academic jargon into plain English.
   - 📊 **Summarize Table**: Explains rows, columns, statistical significance ($p$-values, confidence intervals).
   - 🔗 **Citation Preview**: Resolves bracketed references (e.g. `[14]`) into an inline tooltip showing paper title and DOI.

---

## ⚙️ Technical Specification

### 1. PDF.js Viewer Integration (`public/app.js`)
- Load PDF.js via CDN or bundle.
- Render dual layers:
  - `<canvas>` for visual page rendering (with retina scale support).
  - `<div class="textLayer">` positioned precisely over the canvas to enable native text selection and coordinate capture.

### 2. Floating Action Popover (`PDFCopilotPopover`)
- Calculate selection bounding rect (`window.getSelection().getRangeAt(0).getBoundingClientRect()`).
- Anchor the popover menu 10px above the selection with smart edge-collision detection (preventing clipping on screen edges).

```typescript
interface HighlightTriggerPayload {
    selectedText: string;
    pageNumber: number;
    boundingBox: { top: number; left: number; width: number; height: number };
    actionType: 'explain_math' | 'de_jargonize' | 'summarize_table' | 'resolve_citation';
}
```

### 3. Backend Coordination
- Extend [`netlify/functions/pdf-explain-math.ts`](../netlify/functions/pdf-explain-math.ts) to accept contextual text surrounding the highlighted formula for higher semantic accuracy.
- Cache popular paper explanations in Upstash Redis (Issue #22) to deliver instant sub-second tooltips.

---

## ✅ Acceptance Criteria

- [ ] Render uploaded PDFs in a dedicated dual-pane reader workspace inside `public/index.html`.
- [ ] Implement text and region selection listener capable of drawing a bounding box around an equation, chart, or table and capturing precise page coordinates and text content.
- [ ] Render floating popover with interactive options for **Explain Equation**, **De-Jargonize**, and **Summarize Table**, each actively processing selected content and displaying rendered explanations.
- [ ] Connect "Explain Equation" directly to `netlify/functions/pdf-explain-math.ts` and render formatted KaTeX output.
- [ ] Detect in-text citations (`[1]`, `(Smith et al., 2021)`) and render hover tooltip resolving the reference.
- [ ] Fully responsive on desktop viewports with zoom, page navigation, and search controls.
