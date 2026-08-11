#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

if ! command -v npm >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    echo "npm was not found. Installing Node.js and npm with Homebrew..."
    brew install node
  else
    echo "npm is required for the TypeScript/Cloudflare app. Install Node.js 20+ and npm 10+." >&2
    exit 1
  fi
fi

npm install
