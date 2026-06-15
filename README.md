# MAX.ai — Project Intelligence (Full-Stack)

Production-ready scaffold that turns the MAX.ai prototype into a real multi-user system:
a **React + TypeScript** frontend and a **Python / FastAPI** backend with a database,
server-side document parsing, a deterministic forecasting/risk engine, and an AI layer.

```
max-ai-system/
├── backend/                 FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py          app + CORS + startup seed
│   │   ├── database.py      SQLAlchemy engine/session (SQLite default, Postgres-ready)
│   │   ├── models.py        Project, Document, Risk, Report, BagDay
│   │   ├── schemas.py       Pydantic I/O models
│   │   ├── engine.py        deterministic engine: risk score, utilisation, impact, forecast, daily tasks
│   │   ├── parsing.py       PDF (pdfplumber) · XLSX (openpyxl) · DOCX (python-docx) · CSV/TXT
│   │   ├── ai.py            Anthropic proxy + offline heuristic fallback
│   │   ├── seed.py          T5 PILZ demo data (projects, risks, directs, mitigation)
│   │   └── routers/         /projects /documents /ops /ai
│   └── tests/test_engine.py unit tests for the engine
└── frontend/                React + Vite + TypeScript
    └── src/
        ├── lib/api.ts       typed API client
        ├── App.tsx          sidebar + routing + project switcher + theme
        └── views/           CommandCenter, Terminals, Documents, Forecast, RiskEngine, Chat
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

* Projects by terminal (T1–T5) — `GET /api/projects/by-terminal`
* Document upload & analysis — `POST /api/documents/upload` parses PDF/XLSX/DOCX server-side and extracts insights
* Ops summary / daily tasks / KPIs — `GET /api/ops/summary`
* Impact assessment — `GET /api/ops/impact?area=HBS12`
* Bag forecast (directs + manual mitigation) — `GET /api/ops/forecast`
* AI chat — `POST /api/ai/chat` (live with a key, offline fallback otherwise)

## Production notes (next steps for your team)

* Swap SQLite → PostgreSQL by setting `DATABASE_URL` (SQLAlchemy models are unchanged).
* Add auth (JWT/OAuth) middleware and per-user/project authorization.
* Move long parsing/AI work to a task queue (Celery/RQ) for large files.
* Add the remaining prototype views (Look-Ahead, Daily Ops detail, What-if) — the pattern is established in `views/`.
* The deterministic engine (`engine.py`) is the heart of MAX and is fully unit-tested.
