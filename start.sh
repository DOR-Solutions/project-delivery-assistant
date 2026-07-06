#!/usr/bin/env bash
# Launch MAX.ai as a single service: the FastAPI backend serves the built
# frontend AND the API on one port. Works on Railway (Nixpacks) and Codespaces.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"

PYTHON_BIN="${PYTHON_BIN:-$(command -v python3 || command -v python || true)}"
if [ -z "$PYTHON_BIN" ]; then
  echo "Python interpreter not found" >&2
  exit 1
fi

if [ -f "$ROOT/.venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . "$ROOT/.venv/bin/activate"
  PYTHON_BIN="$ROOT/.venv/bin/python"
elif [ -f "/opt/venv/bin/activate" ]; then
  # shellcheck disable=SC1091
  . /opt/venv/bin/activate
  PYTHON_BIN="/opt/venv/bin/python"
fi

cd "$ROOT/backend"
"$PYTHON_BIN" -m pip install --upgrade pip -q
"$PYTHON_BIN" -m pip install -r requirements.txt -q

cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  npm install
fi
echo "==> Building frontend…"
npm run build

cd "$ROOT/backend"
exec "$PYTHON_BIN" -m uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}"
