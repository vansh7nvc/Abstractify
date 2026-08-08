# 🔌 AbstractiFy API Reference

AbstractiFy exposes 7 Netlify serverless function endpoints under `/api/*`.

---

## 1. Search Endpoint (`POST /api/search`)

Perform hybrid academic search across Semantic Scholar and OpenAlex.

### Request Payload
```json
{
  "query": "physical exercise decrease beta-amyloid accumulation"
}
```

### Response
```json
{
  "success": true,
  "results": [
    {
      "id": "S2_12345",
      "title": "Exercise Effects on Beta-Amyloid Cleared in AD Models",
      "authors": ["Dr. Jane Doe", "Dr. John Smith"],
      "year": 2024,
      "venue": "Journal of Neuroscience",
      "abstract": "We demonstrated that aerobic exercise reduces amyloid burden...",
      "citationCount": 42,
      "doi": "10.1016/j.jneuro.2024.01.002",
      "openAccessPdf": "https://arxiv.org/pdf/2401.00000.pdf"
    }
  ]
}
```

---

## 2. Consensus Meter Endpoint (`POST /api/consensus`)

Classify scientific findings and compute consensus metrics.

### Request Payload
```json
{
  "query": "does exercise reduce beta-amyloid?",
  "papers": [...]
}
```

### Response
```json
{
  "success": true,
  "consensusScore": 78.5,
  "supportCount": 8,
  "contradictCount": 2,
  "neutralCount": 2,
  "summaryText": "The current scientific consensus strongly supports that regular physical exercise..."
}
```

---

## 3. Comparison Matrix Endpoint (`POST /api/compare`)

Extract structured parameters for side-by-side study comparison.

### Request Payload
```json
{
  "papers": [...]
}
```

### Response
```json
{
  "success": true,
  "matrix": [
    {
      "title": "Exercise Effects on Beta-Amyloid",
      "methodology": "Randomized Controlled Trial (n=120)",
      "primaryOutcome": "34% reduction in plaque burden",
      "limitations": "Short 12-week follow-up window"
    }
  ]
}
```

---

## 4. PDF Chat & RAG Endpoint (`POST /api/pdf-chat`)

Perform in-document vector RAG chat on uploaded paper chunks.

### Request Payload
```json
{
  "message": "What sample size was used in Experiment 2?",
  "chunks": ["Page 1 text...", "Page 2 text..."]
}
```

---

## 5. LaTeX Math Equation Explainer (`POST /api/pdf-explain-math`)

Explain mathematical formulas and variable definitions.

### Request Payload
```json
{
  "equation": "E = mc^2",
  "context": "Mass-energy equivalence derivation in Special Relativity"
}
```
