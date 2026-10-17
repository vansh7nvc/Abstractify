# Issue #38: 🐇 Cascading Miller Columns & Infinite Exploratory Canvas UI/UX (ResearchRabbit Pattern)

**Labels**: `enhancement`, `help wanted`, `frontend`, `ui/ux`, `area: graph`, `difficulty: hard`  
**Difficulty**: `Hard`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Traditional academic search engines present static, pagination-locked card lists. When a user clicks a paper to view its abstract or citations, they either open a disruptive modal or navigate away from their search results, severing their exploratory train of thought.

**ResearchRabbit** solved this by introducing **Miller Columns (cascading context panes)** paired with a synchronized citation graph ("Spotify for Papers"). A researcher can branch out across multiple papers, authors, and reference lists without losing spatial context.

---

## 🎯 Goal

Transform Abstractify's workspace UI from a single vertical list into an **Infinite Exploratory Canvas** with **Cascading Miller Columns** and **Bidirectional Graph Synchronization**:
1. Clicking any paper card slides open a new column to the right (`Search Results` → `Paper Overview` → `Similar Work` → `Author Bibliography` → `Citations`).
2. Selecting or hovering over any card in any column smoothly animates, centers, and highlights the corresponding node in the `vis-network` citation graph.
3. Users can drag and drop papers into customizable "Paper Playlist" collection drawers.

---

## ⚙️ Technical Specification

### 1. Cascading Column Architecture (`public/app.js`)

```typescript
interface ColumnPane {
    id: string;
    level: number;
    title: string;
    type: 'search' | 'paper_detail' | 'similar_papers' | 'author_profile' | 'citation_lineage';
    entityId: string; // DOI, OpenAlex ID, or Query
    data: any;
}

class MillerColumnManager {
    private stack: ColumnPane[] = [];
    private container: HTMLElement;

    pushColumn(pane: Omit<ColumnPane, 'level'>): void;
    popToLevel(level: number): void;
    scrollToActiveColumn(): void;
    syncWithGraph(activeEntityId: string): void;
}
```

### 2. Bidirectional Graph Synchronization
- **Column to Graph**: Hovering over any card in an active column highlights its corresponding node in the `vis-network` graph canvas with a glowing border and dims unlinked nodes.
- **Graph to Column**: Clicking a node inside the citation graph automatically scrolls the Miller column viewport to the paper's card or slides open a new column pane.

### 3. Collection Playlists Drawer
- A collapsible left sidebar ("Saved Playlists" / "Research Crates") allowing one-click or drag-and-drop bookmarking of papers into named collections, persisted to `localStorage` (or Upstash Redis via Issue #22).

### 4. Layout & Visual Polish (`public/styles.css`)
- Smooth CSS `transform: translateX()` transitions (cubic-bezier easing).
- Custom minimal scrollbar on the horizontal axis.
- Sleek dark theme styling matching the Slate aesthetic (Issue #16).

---

## ✅ Acceptance Criteria

- [ ] Implement `MillerColumnManager` in `public/app.js` supporting dynamic adding/removing of cascading panes.
- [ ] Maintain active breadcrumb trail in the top header showing the exploration path (e.g., `Search: SGLT2` > `Paper: DAPA-CKD` > `Author: Heerspink`).
- [ ] Bidirectionally synchronize node highlighting and canvas panning with the `vis-network` citation graph.
- [ ] Implement drag-and-drop or one-click "Add to Collection" drawer.
- [ ] Ensure responsive horizontal scrolling with smooth touch and trackpad gestures.
- [ ] Zero layout thrashing or memory leaks when opening $> 6$ nested column levels.
