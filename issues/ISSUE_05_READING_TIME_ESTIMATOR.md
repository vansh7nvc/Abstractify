# Issue #05: ⏱ Reading Time & Academic Complexity Estimator

**Labels**: `enhancement`, `good first issue`, `frontend`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Researchers often skim dozens of papers daily. Uploading a 40-page technical PDF can take anywhere from 10 minutes to 2 hours to digest fully depending on density, word count, mathematical notation, and vocabulary complexity. Giving users immediate visibility into estimated reading time and paper complexity helps them manage reading queues efficiently.

---

## 🎯 Goal

Calculate and display an **Estimated Reading Time** badge (e.g. `⏱ ~14 min read • Technical Density: High`) on paper cards and in the PDF Chat sidebar after PDF parsing or search result indexing.

---

## ⚙️ Technical Specification

### Algorithm Specification
1. **Word Count Extraction**: Extract total word count $W$ from paper abstract or parsed PDF text chunks.
2. **Formula Density Factor ($F$)**: Count occurrences of mathematical symbols/LaTeX blocks ($/\\begin\{equation\}|\$|\$\$|\\int|\\sum/g$).
3. **Academic Complexity Scoring ($C$)**:
   - Average words per sentence $> 25$ adds $+15\%$ reading time multiplier.
   - High frequency of multi-syllabic academic vocabulary adds $+10\%$ multiplier.
4. **Formula**:
   $$\text{Base Reading Time (mins)} = \frac{W}{180}$$
   $$\text{Adjusted Reading Time} = \text{Base Reading Time} \times \left(1 + 0.2 \times \frac{\text{Formulas}}{\text{Sentences}}\right)$$

### UI Indicator
Display a compact badge on paper cards:
- `⏱ 8 min read` (Easy / Overview)
- `⏱ 18 min read • High Complexity 🧪` (Heavy technical / mathematical paper)

---

## ✅ Acceptance Criteria

- [ ] Calculate word count and formula density upon PDF upload or search result rendering.
- [ ] Render reading time badge (`⏱ ~X min read`) on paper cards in main workspace.
- [ ] Render complexity badge (`Low`, `Moderate`, `Dense`) based on sentence length and mathematical density.
- [ ] Display reading estimate in PDF Chat header next to uploaded file name.
- [ ] Provide hover tooltip detailing the score breakdown (e.g. `1,850 words • 14 LaTeX equations`).

---

## 💡 Code Guidance

- Modify PDF upload callback and `renderPaperCards()` in `public/app.js`.
- Add badge styling `.badge-reading-time` in `public/styles.css`.
