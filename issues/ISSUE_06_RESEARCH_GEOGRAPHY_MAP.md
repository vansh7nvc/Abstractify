# Issue #06: 🗺️ Research Geography Map (Leaflet + OpenAlex Geolocation)

**Labels**: `enhancement`, `help wanted`, `frontend`, `api`  
**Difficulty**: `Medium`  
**Target Files**: [`public/index.html`](../public/index.html), [`public/app.js`](../public/app.js), [`public/styles.css`](../public/styles.css)

---

## 📌 Problem & Context

Scientific research is a global effort, but publication lists fail to communicate *where* major advancements are taking place globally. OpenAlex provides institution geolocation data (latitude and longitude) for authors and research centers worldwide.

---

## 🎯 Goal

Build an interactive world map panel using **[Leaflet.js](https://leafletjs.com/)** that plots institutions publishing research on the user's search query, displaying publication hotspots, top collaborating universities, and country-level activity.

---

## ⚙️ Technical Specification

### External Libraries (CDN)
Add to `public/index.html`:
```html
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
```

### Data Extraction from OpenAlex
OpenAlex works API returns institutional geolocation details:
```json
"authorships": [
  {
    "institutions": [
      {
        "display_name": "Stanford University",
        "country_code": "US",
        "geo": {
          "latitude": 37.4275,
          "longitude": -122.1697
        }
      }
    ]
  }
]
```

### Map Render Workflow in `public/app.js`
1. Initialize map on `#research-map-container` with dark tiles (`CartoDB DarkMatter` tile layer).
2. Extract coordinates for all paper authorships in search results.
3. Group publications by institution.
4. Render circle markers where radius scales with paper count:
   $$\text{Radius} = \max(6, \text{Paper Count} \times 4)$$
5. Add popup on marker click:
   - Institution Name & Flag Icon
   - Number of active publications in current search
   - Top contributing authors

---

## ✅ Acceptance Criteria

- [ ] Add Leaflet CSS/JS CDN to `public/index.html`.
- [ ] Add a new workspace section: `🗺️ Research Geography Map`.
- [ ] Extract latitude/longitude from OpenAlex authorship metadata.
- [ ] Render interactive map with dark theme tiles (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`).
- [ ] Plot markers sized by institutional publication count.
- [ ] Display rich tooltip on marker click with institution details and paper links.
- [ ] Smooth map reset on new search query execution.

---

## 💡 Code Guidance

- Initialize map in `initMap()` in `public/app.js`.
- Style map container `#research-map-container` with fixed height `400px` and rounded borders in `public/styles.css`.
