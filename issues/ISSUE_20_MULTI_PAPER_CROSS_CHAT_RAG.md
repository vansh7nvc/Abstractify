# Issue #20: 📚 Multi-Paper Cross-Chat RAG (Multi-Document Retrieval)

**Labels**: `enhancement`, `help wanted`, `backend`, `ai`, `rag`  
**Difficulty**: `Medium`  
**Target Files**: [`netlify/functions/pdf-upload.ts`](../netlify/functions/), [`netlify/functions/pdf-chat.ts`](../netlify/functions/), [`public/app.js`](../public/app.js), [`public/index.html`](../public/index.html)

---

## 📌 Problem & Context

Currently, AbstractiFy's PDF reading assistant allows uploading only **one PDF at a time**. Researchers working on systematic reviews need to upload 2 to 5 papers simultaneously and ask comparative RAG questions (e.g. *"How do Paper A and Paper B differ in their neural network architectures?"*).

---

## 🎯 Goal

Extend the PDF upload dropzone and serverless RAG chat pipeline to accept multiple PDF files concurrently, building a unified, multi-document in-memory vector index with per-document citation tags.

---

## ⚙️ Technical Specification

### Ingestion Pipeline (`netlify/functions/pdf-upload.ts`)
- Modify upload handler to process `FormData` containing multiple PDF files.
- Tag each chunk with document metadata:
  ```json
  {
    "docId": "doc_1",
    "filename": "Vaswani2017.pdf",
    "paperTitle": "Attention Is All You Need",
    "chunkIndex": 3,
    "text": "..."
  }
  ```

### Cross-Chat RAG Engine (`netlify/functions/pdf-chat.ts`)
- Perform L2-normalized vector similarity matching across merged multi-document chunks.
- Format context window to attribute source document explicitly:
  ```
  [Source: Vaswani2017.pdf - Page 4]
  "The Transformer uses multi-head attention..."

  [Source: Devlin2018.pdf - Page 2]
  "BERT relies on bidirectional Transformer encoders..."
  ```
- Prompt Gemini to compare and synthesize across documents with explicit inline source citations.

### UI Enhancements
- Multi-file drag-and-drop file upload zone.
- Color-coded document pills in chat header showing active loaded documents.
- Inline citation badges in assistant replies (clicking badge scrolls to relevant chunk).

---

## ✅ Acceptance Criteria

- [ ] Support multi-file selection (`<input type="file" multiple>`) in PDF dropzone.
- [ ] Parse and chunk multiple PDFs concurrently in `pdf-upload.ts`.
- [ ] Tag all chunks with source document title, filename, and page numbers.
- [ ] Perform comparative multi-document vector RAG in `pdf-chat.ts`.
- [ ] Render color-coded source document badges in assistant responses.
- [ ] Provide clear/remove individual document buttons in sidebar.

---

## 💡 Code Guidance

- Modify `handlePdfFile` in `public/app.js` to process `FileList` array.
- Update prompt template in `netlify/functions/pdf-chat.ts`.
