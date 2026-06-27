<div align="center">

# 📈 INVEST.TERMINAL

### Institutional AI Investment Research Platform

*Multi-agent LangGraph pipeline for institutional-grade equity analysis*

[![JavaScript](https://img.shields.io/badge/JavaScript-99%25-F7DF1E?style=flat-square&logo=javascript&logoColor=black)](https://github.com/Navadeep206/AI-Investment-Research-Agent)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev)
[![LangGraph](https://img.shields.io/badge/LangGraph-StateGraph-6B2FBF?style=flat-square)](https://langchain.com/langgraph)
[![Gemini](https://img.shields.io/badge/Gemini-2.5%20Flash-4285F4?style=flat-square&logo=google&logoColor=white)](https://deepmind.google/gemini)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-336791?style=flat-square&logo=postgresql&logoColor=white)](https://neon.tech)

</div>

---

## Overview

**INVEST.TERMINAL** is a full-stack, production-ready AI investment research platform that deploys a 4-agent LangGraph committee pipeline to perform institutional-grade equity analysis on any publicly traded company or stock ticker.

The system collects live market data and web evidence, routes it through a sequential multi-agent deliberation workflow, and produces a structured investment verdict — complete with confidence scoring, evidence quality metrics, bear case challenges, and a full audit trail — all persisted to a PostgreSQL database.

> **Not a toy. Not a demo.** This is a working research terminal built for placement demonstrations of real multi-agent AI system design.

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   INVEST.TERMINAL                      │
│              React Frontend (Vite)                     │
└──────────────────────┬─────────────────────────────────┘
                       │ REST API
┌──────────────────────▼─────────────────────────────────┐
│              Express.js API Server                     │
│  Rate Limiting · Request Tracing · Response Standards  │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│           LangGraph StateGraph Pipeline                │
│                                                        │
│  ┌──────────────┐    ┌──────────────┐                  │
│  │  Research    │───▶│  Scoring     │                  │
│  │  Agent       │    │  Agent       │                  │
│  └──────────────┘    └──────┬───────┘                  │
│                             │                          │
│  ┌──────────────┐    ┌──────▼───────┐                  │
│  │  Committee   │◀───│  Devil's     │                  │
│  │  Agent       │    │  Advocate    │                  │
│  └──────┬───────┘    └──────────────┘                  │
│         │                                              │
│    INVEST / WATCH / PASS verdict                       │
└──────────────────────┬─────────────────────────────────┘
                       │
┌──────────────────────▼─────────────────────────────────┐
│            PostgreSQL (Neon Serverless)                 │
│      Smart Cache · Evidence Ledger · Audit Trail       │
└────────────────────────────────────────────────────────┘
```

---

## Key Features

### 🤖 Multi-Agent AI Committee
- **Research Agent** — Fetches structured company data (revenue, market cap, industry) from Yahoo Finance + Wikipedia, runs parallel Tavily web crawls for live evidence, and builds a business overview.
- **Scoring Agent** — Evaluates 5 dimensions using Gemini 2.5 Flash: Business Quality, Growth Potential, Competitive Moat, Financial Strength, Risk Level. Produces a weighted Overall Score.
- **Devil's Advocate Agent** — Stress-tests the scorecard by generating a structured bear case, key concerns, and worst-case scenario using adversarial LLM prompting.
- **Committee Agent** — Acts as chair of the AI committee. Weighs all agent outputs, applies guardrail overrides, and delivers a final `INVEST` / `WATCH` / `PASS` recommendation with conviction score.

### 📊 Evidence Quality Engine
- Scores every analysis across 5 dimensions: **Credibility**, **Freshness**, **Diversity**, **Completeness**, **Confidence**
- Produces a composite Evidence Quality Score (0–100) stored per analysis
- Evidence tiered as **Tier A / B / C** based on source authority and recency

### ⚡ Smart Caching System
- Automatic cache hit detection based on recency thresholds (24-hour max cache age)
- Self-healing cache: detects stale or incomplete records and auto-repairs with fresh data
- Cache metadata panel: tracks Data Source, Freshness Score, Evidence Age, Request IDs
- Event-driven refresh: detects material events (earnings, leadership changes) and forces fresh pipeline runs

### 🧾 PDF Report Generation
- Full institutional-quality PDF reports generated server-side using `pdfmake`
- Includes executive summary, agent reasoning chains, evidence ledger, confidence calibration breakdown
- Comparison reports: side-by-side dual-company PDF benchmarking

### 📁 Portfolio Builder
- Multi-stock portfolio analysis with weighted scoring
- Diversification scoring and risk distribution charts

### 🔀 Company Comparison
- Dual parallel pipeline execution for head-to-head analysis
- Radar chart visualization comparing all scorecard dimensions

### 🛡️ Production Hardening
- Per-request UUID tracing (`X-Request-ID` header)
- Rate limiting on analysis, comparison, and portfolio routes
- Request monitoring middleware with latency tracking
- Standardized API response envelope with `success`, `timestamp`, `requestId`

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 · Vite · Tailwind CSS v4 · Recharts |
| **Fonts** | IBM Plex Sans (UI) · IBM Plex Mono (metrics) |
| **Routing** | React Router v7 |
| **Backend** | Node.js · Express.js |
| **AI Pipeline** | LangGraph StateGraph · LangChain Community |
| **LLM** | Google Gemini 2.5 Flash |
| **Web Search** | Tavily Search API |
| **Financial Data** | Yahoo Finance · Wikipedia |
| **Database** | PostgreSQL via Neon Serverless |
| **ORM** | Prisma |
| **PDF Engine** | pdfmake |
| **Icons** | Lucide React |

---

## Project Structure

```
ai-investment-committee/
├── client/                          # React frontend
│   ├── public/
│   │   └── favicon.svg              # INVEST.TERMINAL brand favicon
│   └── src/
│       ├── assets/logo.svg          # SVG logo mark
│       ├── components/
│       │   ├── Sidebar.jsx          # Navigation + system telemetry
│       │   └── DecisionTimeline.jsx # Agent step visualization
│       ├── pages/
│       │   ├── Analyze.jsx          # Main analysis terminal
│       │   ├── Dashboard.jsx        # Portfolio overview
│       │   ├── Compare.jsx          # Dual company comparison
│       │   ├── History.jsx          # Analysis history
│       │   ├── PortfolioBuilder.jsx # Portfolio constructor
│       │   ├── AnalysisDetail.jsx   # Full report view
│       │   └── Settings.jsx         # About / system specs
│       └── services/
│           └── apiService.js        # Axios API client
│
└── server/                          # Express.js backend
    ├── prisma/
    │   └── schema.prisma            # Database models
    └── src/
        ├── agents/
        │   ├── researchAgent.js     # Company research + evidence collection
        │   ├── scoringAgent.js      # Multi-dimension scoring
        │   ├── devilAdvocateAgent.js# Bear case generation
        │   └── committeeAgent.js    # Final verdict + confidence scoring
        ├── graph/
        │   └── investmentGraph.js   # LangGraph StateGraph definition
        ├── services/
        │   ├── analysisService.js   # Pipeline orchestration
        │   ├── cacheService.js      # Smart cache management
        │   ├── evidenceService.js   # Tavily evidence collection
        │   ├── sourceRankingService.js # Evidence quality scoring
        │   ├── companyResearchService.js # Yahoo Finance / Wikipedia
        │   ├── comparisonService.js # Dual-company analysis
        │   ├── portfolioService.js  # Portfolio analysis
        │   └── reportService.js     # PDF generation (pdfmake)
        ├── middleware/
        │   ├── requestId.js         # UUID request tracing
        │   ├── requestMonitor.js    # Latency monitoring
        │   ├── responseStandardizer.js # API response envelope
        │   └── rateLimiter.js       # Rate limiting
        └── controllers/
            ├── analysisController.js
            ├── comparisonController.js
            ├── historyController.js
            └── reportController.js
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18
- PostgreSQL database (or [Neon](https://neon.tech) free tier)
- Google Gemini API key
- Tavily Search API key

### 1. Clone the Repository

```bash
git clone https://github.com/Navadeep206/AI-Investment-Research-Agent.git
cd AI-Investment-Research-Agent/ai-investment-committee
```

### 2. Set Up the Server

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
DATABASE_URL=postgresql://your_neon_connection_string
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
PORT=5001
```

Run Prisma migrations:

```bash
npx prisma migrate dev
npx prisma generate
```

Start the server:

```bash
npm run dev
```

### 3. Set Up the Client

```bash
cd ../client
npm install
```

Create a `.env` file in `client/`:

```env
VITE_API_URL=http://localhost:5001/api
```

Start the dev server:

```bash
npm run dev
```

The terminal will be available at `http://localhost:5173`.

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/analyze` | Run full multi-agent pipeline for a company |
| `GET` | `/api/history` | Retrieve all past analyses |
| `GET` | `/api/analysis/:id` | Get full record by ID |
| `POST` | `/api/compare` | Run parallel analysis on two companies |
| `POST` | `/api/portfolio` | Analyse a portfolio of stocks |
| `GET` | `/api/report/:id` | Download PDF report |
| `GET` | `/api/cache/stats` | Cache metrics and coverage |
| `GET` | `/api/health` | System health check |

---

## UI Screens

| Screen | Description |
|---|---|
| **Analyze Terminal** | Main search interface — type any ticker or company name, trigger the pipeline, watch agents execute in real time |
| **AI Decision Timeline** | Step-by-step visual of the 4 agent stages: Research → Scoring → Devil's Advocate → Committee |
| **Executive Dashboard** | Committee verdict, scorecard grid, evidence ledger, material events, confidence calibration |
| **Compare** | Side-by-side dual company benchmarking with radar chart |
| **Portfolio Builder** | Multi-stock portfolio with risk distribution pie chart |
| **History** | Searchable analysis history with recommendations |
| **About** | System telemetry, engine specs, cache stats |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string (Neon recommended) |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key for all LLM calls |
| `TAVILY_API_KEY` | ✅ | Tavily Search API key for evidence collection |
| `PORT` | Optional | Server port (default: `5001`) |
| `VITE_API_URL` | ✅ (client) | Backend API base URL |

---

## Design System

The frontend uses a premium dark institutional terminal aesthetic:

- **Background**: `#0A0E17` — deep navy dark
- **Surface**: `#111827` — elevated card surface
- **Accent**: `#10B981` — emerald green (all interactive elements)
- **Warning**: `#F59E0B` — amber
- **Danger**: `#EF4444` — red
- **Primary Font**: IBM Plex Sans
- **Monospace Font**: IBM Plex Mono (scores, metrics, terminal data)

---

## Author

**Navadeep Guduru**
- GitHub: [@Navadeep206](https://github.com/Navadeep206)

---

## License

This project is for educational and demonstration purposes.

---

<div align="center">
<sub>Built with LangGraph · Gemini · React · Node.js · PostgreSQL</sub>
</div>
