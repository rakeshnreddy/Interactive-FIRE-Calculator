#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

mode="${1:-dev}"

usage() {
  cat <<'USAGE'
Usage:
  ./scripts/check_local.sh             Run local checks, then start the Vite dev server.
  ./scripts/check_local.sh dev         Same as default.
  ./scripts/check_local.sh preview     Run local checks, then serve the production build.
  ./scripts/check_local.sh ci          Run local checks only and exit.
  ./scripts/check_local.sh cloudflare  Run local checks, then start Cloudflare Pages dev.

Local URLs:
  Vite dev:            http://127.0.0.1:5173
  Vite production:     shown by npm run preview
  Cloudflare Pages:    shown by wrangler pages dev

Stop a running local server with Ctrl-C.
USAGE
}

case "$mode" in
  -h|--help|help)
    usage
    exit 0
    ;;
  dev|preview|ci|cloudflare)
    ;;
  *)
    echo "Unknown mode '$mode'." >&2
    usage >&2
    exit 1
    ;;
esac

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js 20+ and npm 10+, or run ./scripts/bootstrap_node.sh." >&2
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Installing npm dependencies..."
  npm install
fi

echo "Running TypeScript checks..."
npm run typecheck

echo "Running unit tests..."
npm test

echo "Building production bundle..."
npm run build

case "$mode" in
  ci)
    echo "Local checks passed."
    ;;
  dev)
    echo "Local checks passed. Starting Vite dev server at http://127.0.0.1:5173"
    npm run dev
    ;;
  preview)
    echo "Local checks passed. Starting production preview."
    npm run preview
    ;;
  cloudflare)
    echo "Local checks passed. Starting Cloudflare Pages dev server."
    npm run cf:dev
    ;;
esac
