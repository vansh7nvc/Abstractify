# Issue #13: ⌨️ Keyboard Shortcuts & Accessibility (Cmd+K Search Modal)

**Labels**: `enhancement`, `good first issue`, `frontend`, `ux`  
**Difficulty**: `Easy`  
**Target Files**: [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Power users expect keyboard-driven navigation (like Spotlight, Raycast, or VS Code `Ctrl+K` / `Cmd+K` palettes). Additionally, ensuring ARIA accessibility tags allows researchers with visual impairments or screen readers to navigate AbstractiFy smoothly.

---

## 🎯 Goal

Implement global keyboard shortcuts (`Cmd+K` / `Ctrl+K` search modal trigger, `Esc` modal dismiss, `/` focus search) and add WCAG-compliant ARIA accessibility attributes throughout the workspace.

---

## ⚙️ Technical Specification

### Keyboard Shortcuts
- `Ctrl+K` / `Cmd+K`: Open Quick Search Modal anywhere in the app.
- `/`: Focus search input bar.
- `Esc`: Close any active modal (Settings, Bibliography, Screenshots, Search).
- `Alt+1` / `Alt+2` / `Alt+3`: Switch between Consensus, Matrix, and Citation Graph workspace views.

### Accessibility Enhancements
- Add `aria-label`, `role="dialog"`, `role="tab"`, and `aria-expanded` attributes to interactive elements.
- Ensure all color contrasts pass WCAG AA standards (4.5:1 ratio).
- Add visible focus indicators (`outline: 2px solid #3B82F6`) for keyboard tab navigation.

---

## ✅ Acceptance Criteria

- [ ] Add global keydown listener in `public/app.js` for `Cmd+K` / `Ctrl+K`.
- [ ] Render floating Command Palette search modal.
- [ ] Add `Esc` key handler to dismiss open modals.
- [ ] Add ARIA accessibility attributes to modals, tabs, and paper cards.
- [ ] Ensure full keyboard navigation capability (`Tab` / `Shift+Tab`) across all workspace controls.

---

## 💡 Code Guidance

- Add event listener: `document.addEventListener('keydown', handleGlobalShortcuts)`.
- Use `e.metaKey || e.ctrlKey` to support both macOS and Windows/Linux.
