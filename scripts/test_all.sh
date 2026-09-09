#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if [ -x venv/bin/python ]; then
  FINPATH_TEST_PYTHON=venv/bin/python
elif command -v python3 >/dev/null 2>&1; then
  FINPATH_TEST_PYTHON=python3
else
  echo "Python is required for the full suite; install python3 or create venv/bin/python." >&2
  exit 1
fi

for FINPATH_TEST_RUNTIME in node npm; do
  if ! command -v "$FINPATH_TEST_RUNTIME" >/dev/null 2>&1; then
    echo "$FINPATH_TEST_RUNTIME is required for the full suite; run ./scripts/bootstrap_node.sh." >&2
    exit 1
  fi
done

node --test scripts/test_all.test.mjs
"$FINPATH_TEST_PYTHON" -m compileall -q app.py project tests
"$FINPATH_TEST_PYTHON" -m pytest -q

if [ ! -d node_modules ]; then
  npm ci
fi
npm run typecheck
npm test
npm run build
