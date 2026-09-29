# Interactive FIRE Calculator

A modern retirement and FIRE planning calculator for exploring required portfolio size, sustainable annual spending, withdrawal timing, inflation, return periods, one-off cash flows, and scenario comparisons.

## Product Direction Update

The product scope has expanded beyond a standalone FIRE calculator. The current target is a comprehensive personal financial tracker and planner where users can create accounts, store financial data, track goals, and save planning scenarios. The FIRE calculator is now the first planning module inside that broader platform.

For a clean coding-session handoff, read [Financial platform handoff](docs/FINANCIAL_PLATFORM_HANDOFF.md) first.

## Architecture

This repository is a modern TypeScript, React, and Vite single-page application deployed to Cloudflare Pages with Cloudflare Functions and D1.

- Production target: `src/` TypeScript app built to `dist/`
- Backend / API target: `functions/` Cloudflare Pages Functions with Cloudflare D1
- Deployment target: Cloudflare Pages
- Test suite: TypeScript Vitest unit/integration tests and Node.js test runners

## Run Locally

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
```

## Test

```bash
./scripts/test_all.sh
```

This requires Node.js and npm (Python is no longer required following legacy-stack retirement). It verifies the test runner's failure paths, runs TypeScript checks, Vitest, and the production build. Missing Node dependencies are installed with `npm ci` from the lockfile. The GitHub `Full suite` PR check runs the same command without application or deployment secrets; production-auth verification remains a separate mandatory release gate.

## Cloudflare Pages

```bash
./scripts/deploy_cloudflare_pages.sh
```

Cloudflare settings:

- Build command: `npm run build`
- Output directory: `dist`
- Project name: `interactive-fire-calculator`
- Config: `wrangler.toml`

Preview deployments from feature branches use:

```bash
npm run cf:deploy
```

Production authentication and deployment use the fail-closed runbook:

```bash
npm run auth:preflight
npm run cf:deploy:production
```

Read [Production authentication runbook](docs/PRODUCTION_AUTH_RUNBOOK.md) before either command. Production requires an owned custom domain and completed Clerk production instance; the deployment script rejects the configured development Clerk key and non-production branches.

## Product Scope

The calculator supports:

- Required FIRE number from annual expenses
- Maximum sustainable annual expense from an existing portfolio
- Multi-period return and inflation assumptions
- Start-of-year and end-of-year withdrawal timing
- Desired final portfolio value
- Signed one-off cash flows
- Base, guardrail, and upside comparison views
- Persistent light and dark product themes

## Calculation Contract

One-off years are relative plan years starting at `1`. Positive one-off amounts are inflows; negative amounts are expenses.

Rates are nominal annual returns. Inflation adjusts the withdrawal amount after each year. The desired final value is currently treated as a nominal ending balance target.

## Documentation

- [Financial platform handoff](docs/FINANCIAL_PLATFORM_HANDOFF.md)
- [Production authentication runbook](docs/PRODUCTION_AUTH_RUNBOOK.md)
- [Comprehensive rebuild plan](docs/FIRE_REBUILD_PLAN.md)
- [Cloudflare Pages deployment notes](docs/CLOUDFLARE_PAGES.md)
