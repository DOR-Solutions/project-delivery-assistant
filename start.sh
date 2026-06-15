#!/usr/bin/env bash
# Launch MAX.ai: backend API on :8000 (background) + frontend UI on :5173.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Backend deps (idempotent) + start
cd "$ROOT/backend"
[ -d .venv ] || { python3 -m venv .venv && ./.venv/bin/pip install --upgrade pip -q; }
# Always sync requirements (fast when satisfied; picks up new deps like python-pptx)
./.venv/bin/pip install -r requirements.txt -q
echo "==> Starting backend API on http://localhost:8000 …"
./.venv/bin/uvicorn app.main:app --port 8000 > /tmp/maxai-backend.log 2>&1 &
sleep 2

# Frontend deps (idempotent) + start
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
echo "==> Starting frontend UI on http://localhost:5173 …"
echo "    (open the forwarded port 5173 when prompted)"
npm run dev
