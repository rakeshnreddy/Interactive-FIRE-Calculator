#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

env_file="${FINPATH_PRODUCTION_ENV_FILE:-.env.production.local}"
project_name="${FINPATH_CLOUDFLARE_PROJECT:-interactive-fire-calculator}"
production_branch="${FINPATH_PRODUCTION_BRANCH:-main}"
current_branch="$(git branch --show-current)"

if [ "$current_branch" != "$production_branch" ] && [ "${FINPATH_ALLOW_PRODUCTION_FROM_BRANCH:-0}" != "1" ]; then
  echo "Production deploy refused from '$current_branch'. Merge and deploy from '$production_branch', or set FINPATH_ALLOW_PRODUCTION_FROM_BRANCH=1 for an intentional exception." >&2
  exit 1
fi

if [ ! -f "$env_file" ]; then
  echo "Missing $env_file. Copy .env.production.example and add the live Clerk publishable key and owned production origin." >&2
  exit 1
fi

echo "Checking Clerk, domain, and Cloudflare production configuration..."
node scripts/check_production_auth.mjs \
  --env-file "$env_file" \
  --check-cloudflare \
  --project-name "$project_name"

echo "Running the complete repository verification suite..."
./scripts/test_all.sh

echo "Verifying that the production bundle contains only the live Clerk key..."
node scripts/check_production_auth.mjs \
  --env-file "$env_file" \
  --check-cloudflare \
  --project-name "$project_name" \
  --dist dist

echo "Deploying the verified production bundle..."
npx wrangler pages deploy dist --project-name "$project_name" --branch "$production_branch"
