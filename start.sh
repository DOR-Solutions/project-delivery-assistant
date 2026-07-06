#!/usr/bin/env bash
# Launch MAX.ai as a single service: the FastAPI backend serves the built
# frontend AND the API on one port. Works on Railway (Nixpacks) and Codespaces.
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Use whichever Python is available (no venv — Railway installs to the system env)
PY="$(command -v python3 || command -v python)"

# Backend dependencies
cd "$ROOT/backend"
"$PY" -m pip install --upgrade pip -q
"$PY" -m pip install -r requirements.txt -q

# Build the frontend (the backend serves the static build)
cd "$ROOT/frontend"
[ -d node_modules ] || npm install
echo "==> Building frontend…"
npm run build

# Serve from the backend, binding Railway's port (falls back to 8000)
cd "$ROOT/backend"
exec "$PY" -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
