#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

target="${APP_TARGET:-web}"

case "$target" in
  web)
    if ! command -v npm >/dev/null 2>&1; then
      echo "npm is not installed. Run ./scripts/bootstrap_node.sh first." >&2
      exit 1
    fi
    if [ ! -d node_modules ]; then
      npm install
    fi
    npm run dev
    ;;
  legacy)
    ./scripts/run_legacy.sh
    ;;
  *)
    echo "Unknown APP_TARGET '$target'. Use APP_TARGET=web or APP_TARGET=legacy." >&2
    exit 1
    ;;
esac
