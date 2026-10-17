# Issue #37: 🔌 Abstractify Model Context Protocol (MCP) Server

**Labels**: `enhancement`, `help wanted`, `backend`, `area: ai`, `mcp`, `difficulty: hard`  
**Difficulty**: `Hard`  
**Target Files**: `mcp/server.ts` (NEW), `mcp/tools/` (NEW), `server.json` (NEW), [`package.json`](../package.json), [`netlify/functions/_utils.ts`](../netlify/functions/_utils.ts)

---

## 📌 Problem & Context

AI coding assistants and autonomous agents (such as Claude Code, Cursor, Antigravity IDE, and GitHub Copilot) frequently need to ground their code, documentation, and scientific answers in real, peer-reviewed literature and calibrated consensus. Currently, Abstractify's research intelligence features are accessible only via the web UI and serverless API endpoints.

By building an official **Abstractify MCP Server** (using the Model Context Protocol architecture proven by tools like REA), agents everywhere will be able to query scientific consensus, check study methodologies, and reason over academic controversies directly from their development environments.

---

## 🎯 Goal

Build and distribute `@abstractify/mcp` — a TypeScript MCP server built with `@modelcontextprotocol/sdk` exposing Abstractify's hybrid literature search, consensus classification, study comparison matrix, LaTeX equation explainer, and Cortex dialectical reasoning engine to AI agents over standard I/O (`stdio`) and Streamable HTTP (with optional SSE compatibility transport).

---

## ⚙️ Technical Specification

### 1. Project Layout (`mcp/`)

```
Abstractify/
├── server.json                         # MCP Registry server manifest
├── mcp/
│   ├── server.ts                       # Entrypoint creating McpServer instance
│   ├── contracts.ts                    # Zod schemas for tool inputs and outputs
│   └── tools/
│       ├── search.ts                   # search_scientific_literature
│       ├── consensus.ts                # assess_scientific_consensus
│       ├── compare.ts                  # extract_study_comparison_matrix
│       ├── math.ts                     # explain_paper_equation
│       └── cortex.ts                   # cortex_dialectical_synthesis
```

### 2. Tool Catalog & Capabilities

| Tool Name | Parameters | Capabilities | Output Schema |
|---|---|---|---|
| `search_scientific_literature` | `query: string`, `limit?: number`, `yearRange?: [number, number]` | Hybrid Semantic Scholar + OpenAlex search with local vector re-ranking | JSON array of papers with DOI, citation count, open-access status, and abstract snippets |
| `assess_scientific_consensus` | `claim: string`, `maxPapers?: number` | Queries top papers and classifies claim support vs contradiction | Percentage consensus meter, sample size weights, and auditable study quotes |
| `extract_study_comparison_matrix` | `paperIds: string[]` or `query: string` | Extracts structured study parameters using Gemini schema parsing | Table of study design (RCT/cohort), sample size $n$, intervention, outcomes, limitations |
| `explain_paper_equation` | `latexEquation: string`, `contextText?: string` | Mathematical breakdown of variables, operators, and scientific interpretation | Step-by-step LaTeX formula breakdown and variable dictionary |
| `cortex_dialectical_synthesis` | `controversyQuery: string` | Runs Cortex epistemic calculus and dialectical boundary resolution | Calibrated credence score, boundary condition ($\Delta\kappa$), and ECE reliability |

### 3. Server Initialization (`mcp/server.ts`)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
    name: "io.github.vansh7nvc/abstractify",
    version: "1.0.0",
});

// Register tools with Zod schema validation...
```

### 4. Transport Support
- **`stdio`**: Default transport for local execution via `npx @abstractify/mcp` in Claude Desktop, Cursor, and Antigravity IDE.
- **Serverless/HTTP**: Optional route or wrapper to invoke via Netlify serverless functions.

---

## ✅ Acceptance Criteria

- [ ] Add `@modelcontextprotocol/sdk` and `zod` to `package.json`.
- [ ] Implement `mcp/server.ts` with graceful startup and error logging.
- [ ] Implement all 5 core tools with strict Zod input/output schemas.
- [ ] Provide `server.json` compliant with official MCP Registry specifications.
- [ ] Add `npm run mcp` script to `package.json` for immediate testing with `stdio`.
- [ ] Write Vitest test suite (`mcp/__tests__/mcp-server.test.ts`) validating tool execution with mock payloads.
