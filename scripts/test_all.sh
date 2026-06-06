#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x venv/bin/python ]; then
  venv/bin/python -m compileall -q app.py project tests
  venv/bin/python -m pytest -q
elif command -v python3 >/dev/null 2>&1; then
  python3 -m compileall -q app.py project tests
  python3 -m pytest -q
else
  echo "Python was not found; skipping legacy Flask tests." >&2
fi

if command -v npm >/dev/null 2>&1; then
  if [ ! -d node_modules ]; then
    npm install
  fi
  npm run typecheck
  npm test
  npm run build
else
  echo "npm was not found; skipping TypeScript tests and build." >&2
fi
