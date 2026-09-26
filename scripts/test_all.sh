#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

for FINPATH_TEST_RUNTIME in node npm; do
  if ! command -v "$FINPATH_TEST_RUNTIME" >/dev/null 2>&1; then
    echo "$FINPATH_TEST_RUNTIME is required for the full suite; run ./scripts/bootstrap_node.sh." >&2
    exit 1
  fi
done

node --test scripts/test_all.test.mjs
node --test scripts/build_preview_auth.test.mjs

if [ ! -d node_modules ]; then
  npm ci
fi
npm run typecheck
npm test
npm run build
