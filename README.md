# MAX.ai — Project Intelligence (Full-Stack)

A futurist project-intelligence platform for a busy airport (Heathrow UMP): it takes
live and historic project data, models a portfolio of programmes, predicts risk,
runs live what-if scenarios, surfaces cross-project synergies and drives a look-ahead plan.
A **React + TypeScript** frontend and a **Python / FastAPI** backend with a database,
server-side document parsing, a deterministic forecasting/risk engine, and an AI layer.

## Platform features

* **Portfolio intelligence** — every programme (T1–T5 + UMP) carries a completion %,
  RAG health, workstreams, gate position (G0–G8), milestones and its own risk register.
* **Command Center** — per-project dashboard: KPI strip, health donut, planned-vs-actual
  bag throughput, risk distribution, workstream completion, gate progression and top risks/tasks.
* **What-if scenario simulator** — drag bag volume / crew / extra completion and MAX
  recalculates utilisation, projected completion, risk index and SAT-date shift **live**.
* **Foresight** — cross-portfolio look-ahead: predicted pressure points and resource synergies.
* **Dashboard** — executive RAG roll-up and delivery-confidence ranking.
* **Ingest** — drop PDF/DOCX/XLSX/CSV; parsed server-side into structured insight.
* **Ask MAX** — UMP-aware AI chat (live with a key, offline heuristic fallback otherwise).

```
max-ai-system/
├── backend/                 FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py          app + CORS + startup seed
│   │   ├── database.py      SQLAlchemy engine/session (SQLite default, Postgres-ready)
│   │   ├── models.py        Project, Document, Risk, Report, BagDay
│   │   ├── schemas.py       Pydantic I/O models
│   │   ├── engine.py        deterministic engine: risk, utilisation, gates, health/RAG, what-if, forecast
│   │   ├── portfolio.py     rich per-project intelligence (completion, workstreams, gates, risks)
│   │   ├── parsing.py       PDF (pdfplumber) · XLSX (openpyxl) · DOCX (python-docx) · CSV/TXT
│   │   ├── ai.py            Anthropic proxy + offline heuristic fallback
│   │   ├── seed.py          T5 PILZ demo data (projects, risks, directs, mitigation)
│   │   └── routers/         /projects /documents /ops (summary·portfolio·whatif·foresight) /ai
│   └── tests/test_engine.py unit tests for the engine
└── frontend/                React + Vite + TypeScript
    └── src/
        ├── lib/api.ts       typed API client
        ├── App.tsx          portfolio sidebar + workspace routing + theme
        └── views/           CommandCenter, Portfolio, Dashboard, Foresight, Ingest,
                             Terminals, Documents, Forecast, RiskEngine, Chat
```

## Run locally

### 1. Backend (terminal 1)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate     # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # optionally add MAXAI_ANTHROPIC_KEY for live AI
uvicorn app.main:app --reload --port 8000
```
API runs at http://localhost:8000 — docs at http://localhost:8000/docs

### 2. Frontend (terminal 2)
```bash
cd frontend
npm install
npm run dev
```
App runs at http://localhost:5173 (proxies `/api` to the backend).

### Or with Docker
```bash
docker compose up --build
```

## What's wired up

* Project intelligence summary — `GET /api/ops/summary?project_id=…` (completion, health, KPIs, workstreams, gates, throughput, risks, tasks)
* Portfolio roll-up — `GET /api/ops/portfolio` (RAG counts, averages, per-project cards)
* What-if simulator — `POST /api/ops/whatif` (bag volume × crew × extra completion → utilisation, projected completion, risk index, SAT shift)
* Foresight — `GET /api/ops/foresight` (predicted pressure points + cross-project synergies)
* Document ingest & analysis — `POST /api/documents/upload` parses PDF/XLSX/DOCX server-side and extracts insights
* Impact assessment — `GET /api/ops/impact?area=HBS12`
* Bag forecast (directs + manual mitigation) — `GET /api/ops/forecast`
* AI chat — `POST /api/ai/chat` (live with a key, offline fallback otherwise)

## Production notes (next steps for your team)

* Swap SQLite → PostgreSQL by setting `DATABASE_URL` (SQLAlchemy models are unchanged).
* Add auth (JWT/OAuth) middleware and per-user/project authorization.
* Move long parsing/AI work to a task queue (Celery/RQ) for large files.
* Replace the modelled portfolio data in `portfolio.py` with live feeds (Maximo, bag-count exports, P6).
* The deterministic engine (`engine.py`) is the heart of MAX and is fully unit-tested.
