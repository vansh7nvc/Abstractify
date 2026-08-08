# ⚡ Getting Started with AbstractiFy

Get AbstractiFy running locally in under 5 minutes.

---

## 📋 Prerequisites

Before starting, ensure you have installed:

- **Node.js** v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Netlify CLI** (`npm install -g netlify-cli`)
- A **Google Gemini API Key** ([Get free key at Google AI Studio](https://aistudio.google.com/app/apikey))

---

## 🚀 Step-by-Step Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/vansh7nvc/Abstractify.git
cd Abstractify
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to create your local `.env` file:
```bash
cp .env.example .env
```
Open `.env` and add your Gemini API key:
```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

### 4. Start the Local Netlify Server
```bash
netlify dev
```

### 5. Open App in Browser
Navigate to `http://localhost:8888` (or `http://localhost:3000`).

---

## 💻 1-Click Cloud IDE (GitHub Codespaces)

Don't want to install Node.js locally? Launch AbstractiFy instantly in your browser:

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/vansh7nvc/Abstractify)

---

## 🛠️ Developer Commands

| Command | Description |
|---|---|
| `npm run dev` | Start local Netlify dev server |
| `npm run validate` | Run `typecheck` + `lint` + `format:check` simultaneously |
| `npm run lint` | Run ESLint static code analysis |
| `npm run lint:fix` | Automatically fix ESLint formatting warnings |
| `npm run format` | Format TypeScript backend files with Prettier |
| `npm run typecheck` | Perform strict TypeScript type checking (`tsc --noEmit`) |
