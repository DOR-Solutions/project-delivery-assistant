#!/usr/bin/env bash
# Launch MAX.ai as a single service: the backend (FastAPI) serves the built
# frontend AND the API on one port (8000) — robust for Codespaces forwarding.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend deps (idempotent)
cd "$ROOT/backend"
[ -d .venv ] || { python3 -m venv .venv && ./.venv/bin/pip install --upgrade pip -q; }
./.venv/bin/pip install -r requirements.txt -q

# Build the frontend (the backend serves the static build)
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
echo "==> Building frontend…"
npm run build

# Serve everything from the backend on :8000 (0.0.0.0 so the forwarder can reach it)
cd "$ROOT/backend"
echo "==> MAX.ai is live on http://localhost:8000  — open the forwarded PORT 8000"
exec ./.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
