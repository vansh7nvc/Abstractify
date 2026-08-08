# Issue #11: 🐳 Docker & Self-Hosting Deployment Package

**Labels**: `enhancement`, `help wanted`, `devops`  
**Difficulty**: `Medium`  
**Target Files**: `Dockerfile` (NEW), `docker-compose.yml` (NEW), `.dockerignore` (NEW), [`README.md`](../README.md)

---

## 📌 Problem & Context

Privacy-focused research institutions, universities, and corporate R&D teams often require self-hosted applications that run locally inside private networks or air-gapped environments without relying on public serverless deployments.

---

## 🎯 Goal

Provide a production-ready **Docker container setup** and `docker-compose.yml` file so anyone can spin up a fully functional local instance of AbstractiFy with a single command (`docker compose up -d`).

---

## ⚙️ Technical Specification

### Files to Add

1. **`Dockerfile`**:
   ```dockerfile
   FROM node:20-alpine AS builder
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .

   EXPOSE 8888
   CMD ["npx", "netlify", "dev", "--host", "0.0.0.0"]
   ```

2. **`docker-compose.yml`**:
   ```yaml
   version: '3.8'
   services:
     abstractify:
       build: .
       ports:
         - "8888:8888"
       environment:
         - GEMINI_API_KEY=${GEMINI_API_KEY}
       env_file:
         - .env
       restart: unless-stopped
   ```

3. **`.dockerignore`**:
   ```
   node_modules
   .git
   .netlify
   dist
   *.log
   ```

---

## ✅ Acceptance Criteria

- [ ] Create optimized multi-stage `Dockerfile` using Node 20 Alpine.
- [ ] Create `docker-compose.yml` configured to pass environment variables (`GEMINI_API_KEY`).
- [ ] Create `.dockerignore` to keep image footprint under 200MB.
- [ ] Verify `docker compose up` starts server on `http://localhost:8888`.
- [ ] Add Docker setup instructions to `README.md` under Quick Start.

---

## 💡 Code Guidance

- Test build: `docker build -t abstractify:latest .`
- Test run: `docker run -p 8888:8888 --env-file .env abstractify:latest`
