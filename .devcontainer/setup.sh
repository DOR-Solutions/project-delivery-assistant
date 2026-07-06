#!/usr/bin/env bash
# Auto-runs once when the Codespace is created: installs backend + frontend deps.
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Setting up MAX.ai backend (Python)…"
cd "$ROOT/backend"
python3 -m venv .venv
./.venv/bin/pip install --upgrade pip -q
./.venv/bin/pip install -r requirements.txt -q

echo "==> Setting up MAX.ai frontend (Node)…"
cd "$ROOT/frontend"
npm install

echo "✓ Setup complete. Run  ./start.sh  to launch the app."
