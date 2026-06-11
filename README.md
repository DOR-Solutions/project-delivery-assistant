# Project Delivery Assistant

A full-stack project delivery management system with a built-in AI assistant.
Track projects and tasks, monitor delivery health and risk, and chat with a
virtual project manager powered by Claude.

## Features

- **Projects & Tasks** — full CRUD with status, priority, assignees, and due dates.
- **Delivery analytics** — per-project completion %, blocked/overdue counts, and an
  explainable risk score, plus a portfolio-wide overview.
- **AI assistant** — chat grounded in your project/task data, powered by the Claude API.
  Runs in an offline rule-based fallback mode when no API key is configured, so the
  app is always usable.
- **Zero-config storage** — SQLite database, created automatically on first run. No
  external database server required.

## Tech stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Frontend | React 18 + Vite                     |
| Backend  | Node.js + Express                   |
| Database | SQLite (`better-sqlite3`)           |
| AI       | Claude API (`@anthropic-ai/sdk`)    |

## Quick start

From the repository root:

```bash
# 1. Install all dependencies (backend + frontend)
npm run install:all

# 2. (Optional) seed sample projects and tasks
npm run seed

# 3a. Development — run backend and frontend in two terminals
npm run dev:backend      # API on http://localhost:5000
npm run dev:frontend     # UI  on http://localhost:3000 (proxies /api to :5000)
```

Open **http://localhost:3000** in development.

### Production (single server)

The backend serves the built frontend, so you only run one process:

```bash
npm run build     # builds frontend/dist
npm start         # serves API + UI on http://localhost:5000
```

Open **http://localhost:5000**.

## Configuration

Backend configuration lives in `backend/.env` (see `backend/.env.example`):

| Variable            | Default               | Description                                            |
| ------------------- | --------------------- | ------------------------------------------------------ |
| `PORT`              | `5000`                | API server port.                                       |
| `DB_PATH`           | `backend/data/app.db` | SQLite file location (`:memory:` for ephemeral).       |
| `ANTHROPIC_API_KEY` | _(empty)_             | Enables real Claude AI. Omit to use offline fallback.  |
| `ANTHROPIC_MODEL`   | `claude-sonnet-4-6`   | Claude model to use.                                   |

To enable the full AI assistant, get a key from
[console.anthropic.com](https://console.anthropic.com/) and set
`ANTHROPIC_API_KEY` in `backend/.env`.

## API reference

| Method | Endpoint                                | Description                       |
| ------ | --------------------------------------- | --------------------------------- |
| GET    | `/health`                               | Health + AI status.               |
| GET    | `/api/projects`                         | List projects (with task counts). |
| POST   | `/api/projects`                         | Create a project.                 |
| GET    | `/api/projects/:id`                     | Get a project with its tasks.     |
| PUT    | `/api/projects/:id`                     | Update a project.                 |
| DELETE | `/api/projects/:id`                     | Delete a project (cascades).      |
| GET    | `/api/projects/:id/tasks`               | List a project's tasks.           |
| POST   | `/api/projects/:id/tasks`               | Create a task.                    |
| PUT    | `/api/projects/:id/tasks/:taskId`       | Update a task.                    |
| DELETE | `/api/projects/:id/tasks/:taskId`       | Delete a task.                    |
| GET    | `/api/analytics/overview`               | Portfolio metrics.                |
| GET    | `/api/analytics/projects/:id`           | Per-project health + risk.        |
| GET    | `/api/ai/status`                        | Whether real AI is enabled.       |
| POST   | `/api/ai/chat`                          | Chat with the assistant.          |

## Tests

```bash
npm test     # backend integration tests (uses an in-memory database)
```

## Project structure

```
backend/
  index.js              # Express app + entry point
  db/
    database.js         # SQLite connection + schema bootstrap
    schema.sql          # Table definitions
    seed.js             # Sample data
  routes/               # projects, tasks, ai, analytics
  services/aiService.js # Claude integration + offline fallback
  test/api.test.js      # Integration tests
frontend/
  index.html
  vite.config.js
  src/
    App.jsx
    api.js              # API client
    components/         # ProjectList, ProjectDetail, AnalyticsOverview, AiChat
```
