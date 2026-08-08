# Issue #16: 🎨 Dark Mode & Dynamic Theme System

**Labels**: `enhancement`, `good first issue`, `frontend`, `ui`  
**Difficulty**: `Easy`  
**Target Files**: [`public/styles.css`](../public/styles.css), [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js)

---

## 📌 Problem & Context

Researchers often spend long hours reading paper abstracts and reviewing literature at night. While AbstractiFy currently features a light editorial design, lacking a Dark Mode theme causes eye strain and limits user preference customization.

---

## 🎯 Goal

Implement a **Dark Mode / Theme Toggle** button in the header that seamlessly switches the workspace between Dark Slate (`#0F172A`) and Light Editorial (`#FDFAF6`) themes using CSS custom properties, persisting user selection in `localStorage`.

---

## ⚙️ Technical Specification

### CSS Custom Properties (`public/styles.css`)
Define theme tokens on `:root` and `[data-theme="dark"]`:

```css
:root {
  --bg-primary: #FDFAF6;
  --bg-surface: #FFFFFF;
  --text-primary: #1A1A1A;
  --text-secondary: #555555;
  --border-color: #D1CDC7;
  --accent-color: #002147;
}

[data-theme="dark"] {
  --bg-primary: #0F172A;
  --bg-surface: #1E293B;
  --text-primary: #F8FAFC;
  --text-secondary: #94A3B8;
  --border-color: #334155;
  --accent-color: #38BDF8;
}
```

### UI Toggle Component
- Add a theme toggle icon button (`🌙` / `☀️`) in the top navigation header.
- On click:
  ```javascript
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  ```

---

## ✅ Acceptance Criteria

- [ ] Define CSS custom variables for dark and light modes.
- [ ] Add Theme Toggle button (`☀️` / `🌙`) in workspace header.
- [ ] Toggle `data-theme="dark"` attribute on `<html>` root element.
- [ ] Persist theme preference in `localStorage`.
- [ ] Auto-detect system preference (`prefers-color-scheme: dark`) on first visit.
- [ ] Ensure full text contrast and visibility across Consensus, Matrix, and Graph panels in Dark Mode.

---

## 💡 Code Guidance

- Modify `:root` color tokens in `public/styles.css`.
- Add event listener in `public/app.js`.
