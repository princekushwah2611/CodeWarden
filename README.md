# 🛡️ CodeWarden

> **An agentic AI reviewer that watches every pull request for security risk and standards drift.**

CodeWarden is an autonomous code review agent that integrates directly with GitHub to review pull requests in real time. It performs multi-layered static security scans (Semgrep + OWASP Top 10), pairs findings with an LLM reasoning engine (Claude), and enforces team-specific coding standards using a Retrieval-Augmented Generation (RAG) pipeline powered by ChromaDB.

---

## 🌟 Key Capabilities

1. **Security Scanner Agent**
   - Combines deterministic AST/SAST scanning (Semgrep OWASP Top 10 rulesets) with LLM deep reasoning.
   - Categorizes issues with precise severity (`critical`, `high`, `medium`, `low`) and explains *why* the vulnerability is risky and *how* to remediate it.
   - In-code suppression support via `// codewarden-ignore` comments.

2. **RAG Standards Agent**
   - Ingests and vectorizes your team's internal engineering guidelines, conventions, and style guides.
   - Dynamically retrieves standard chunks matching changed files in PR diffs.
   - Enforces team conventions without generic or noisy lint warnings.

3. **Intelligent Aggregation Layer**
   - Merges findings from both agents, eliminates duplicates, and ranks them by severity.
   - Posts line-specific GitHub comments and a formatted review summary with clear emojis and action recommendations (`approve`, `comment`, or `request-changes`).

4. **Interactive Developer Dashboard**
   - Dark-mode-first developer UI built with React 19, Tailwind CSS v4, and Recharts.
   - Overview metrics: Total PRs, Critical issues caught, Average response time, and Team health score.
   - Detailed repository settings, standards document management, and review inspection with syntax-highlighted diffs and inline finding markers.

---

## 🏗️ Architecture

```
                       ┌────────────────────┐
                       │   GitHub Repo       │
                       │  (PR opened/synced) │
                       └─────────┬───────────┘
                                 │ webhook event
                                 ▼
                       ┌────────────────────┐
                       │  Ingestion Service  │
                       │  (Node.js/Express)  │
                       │  - verify webhook   │
                       │  - fetch diff via   │
                       │    Octokit.js       │
                       └─────────┬───────────┘
                                 │ diff + file context
                 ┌───────────────┴────────────────┐
                 ▼                                 ▼
       ┌───────────────────┐             ┌────────────────────┐
       │ Security Scanner   │             │ RAG Standards Agent │
       │  - Semgrep (SAST)  │             │  - embed diff query │
       │  - LLM reasoning   │             │  - retrieve from    │
       │    (Claude API)    │             │    ChromaDB         │
       └─────────┬──────────┘             └──────────┬──────────┘
                 │                                    │
                 └───────────────┬────────────────────┘
                                 ▼
                       ┌────────────────────┐
                       │  Aggregation Layer  │
                       │  - merge findings   │
                       │  - dedupe & rank    │
                       │  - decide action    │
                       └─────────┬───────────┘
                                 ▼
                 ┌───────────────┴────────────────┐
                 ▼                                 ▼
       ┌───────────────────┐             ┌────────────────────┐
       │ GitHub Comment API │             │  SQLite / Prisma   │
       │ (posts review)     │             │  → feeds Dashboard  │
       └────────────────────┘             └──────────┬──────────┘
                                                       ▼
                                            ┌────────────────────┐
                                            │  React Dashboard    │
                                            └────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 20.0.0
- Python 3.9+ with `semgrep` installed (`pip install semgrep` or `brew install semgrep`)
- ChromaDB running locally (`pip install chromadb && chroma run --port 8000`) or Docker
- Anthropic API Key (for Claude reasoning)
- OpenAI API Key (for embeddings)
- GitHub App credentials (App ID, Private Key, Webhook Secret)

### 1. Installation

```bash
git clone https://github.com/your-username/CodeWarden.git
cd CodeWarden

# Install dependencies for both server and dashboard
npm install
```

### 2. Environment Setup

Copy `.env.example` to `.env` in the root or `server/`:

```bash
cp .env.example server/.env
```

Fill in your configuration:
- `GITHUB_APP_ID`: Your GitHub App ID
- `GITHUB_PRIVATE_KEY_PATH`: Path to your `.pem` private key
- `GITHUB_WEBHOOK_SECRET`: The webhook secret defined in your GitHub App
- `ANTHROPIC_API_KEY`: Your Anthropic API key
- `OPENAI_API_KEY`: Your OpenAI API key
- `DATABASE_URL`: `"file:./codewarden.db"`
- `PORT`: `3001`
- `CHROMA_URL`: `"http://localhost:8000"`

### 3. Database Migration

Initialize the SQLite database with Prisma:

```bash
npm run db:push --workspace=server
```

### 4. Running the Application

In development mode:

```bash
# Run both server (port 3001) and dashboard (port 5173) concurrently
npm run dev

# Or run individually:
npm run dev:server
npm run dev:dashboard
```

- **Dashboard:** [http://localhost:5173](http://localhost:5173)
- **API Server:** [http://localhost:3001](http://localhost:3001)
- **Health Check:** [http://localhost:3001/api/health](http://localhost:3001/api/health)

---

## 📁 Repository Structure

```
CodeWarden/
├── server/                         # Express + TypeScript Backend
│   ├── prisma/
│   │   └── schema.prisma           # Prisma models (Repo, Review, Finding, StandardsDoc)
│   ├── src/
│   │   ├── config/                 # Zod environment validation
│   │   ├── github/                 # Octokit integration, diff parsing, comment posting
│   │   ├── scanner/                # Semgrep SAST runner + LLM security agent
│   │   ├── rag/                    # Markdown chunking, vector embeddings, standards agent
│   │   ├── agents/                 # Aggregator layer & finding ranking
│   │   ├── api/                    # REST API endpoints for the dashboard
│   │   └── utils/                  # Structured Pino logging & LLM client wrapper
│   └── tsconfig.json
├── dashboard/                      # React 19 + Vite + Tailwind CSS v4 Frontend
│   ├── src/
│   │   ├── components/             # Reusable UI cards, tables, diff viewer, sidebar
│   │   ├── pages/                  # Overview, Repos, RepoDetail, ReviewDetail
│   │   ├── lib/                    # API client
│   │   └── styles/                 # Dark-mode styling
│   └── vite.config.ts
├── package.json                    # Monorepo workspaces configuration
└── README.md
```

---

## 📄 License

MIT © [Prince Singh Kushwah](https://github.com/princesinghkushwah)
