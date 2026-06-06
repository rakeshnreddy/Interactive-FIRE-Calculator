# Interactive FIRE Calculator

A modern retirement and FIRE planning calculator for exploring required portfolio size, sustainable annual spending, withdrawal timing, inflation, return periods, one-off cash flows, and scenario comparisons.

## Current Direction

This repository is moving from a legacy Flask/Jinja app to a TypeScript, React, and Vite app designed for Cloudflare Pages.

- Production target: `src/` TypeScript app built to `dist/`
- Deployment target: Cloudflare Pages
- Legacy reference: `app.py`, `project/`, `templates/`, and `static/`
- Calculation parity: Python tests plus TypeScript Vitest tests

## Run Locally

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
```

The new app runs with Vite. To run the legacy Flask app:

```bash
APP_TARGET=legacy ./scripts/run_local.sh
```

## Test

```bash
./scripts/test_all.sh
```

This runs the legacy Python tests when Python dependencies are available, then runs TypeScript type checks, Vitest, and the Vite build when `npm` is available.

## Cloudflare Pages

```bash
./scripts/deploy_cloudflare_pages.sh
```

Cloudflare settings:

- Build command: `npm run build`
- Output directory: `dist`
- Project name: `interactive-fire-calculator`
- Config: `wrangler.toml`

## Product Scope

The calculator supports:

- Required FIRE number from annual expenses
- Maximum sustainable annual expense from an existing portfolio
- Multi-period return and inflation assumptions
- Start-of-year and end-of-year withdrawal timing
- Desired final portfolio value
- Signed one-off cash flows
- Base, guardrail, and upside comparison views
- Three visual moods with light and dark modes

## Calculation Contract

One-off years are relative plan years starting at `1`. Positive one-off amounts are inflows; negative amounts are expenses.

Rates are nominal annual returns. Inflation adjusts the withdrawal amount after each year. The desired final value is currently treated as a nominal ending balance target.

## Documentation

- [Comprehensive rebuild plan](docs/FIRE_REBUILD_PLAN.md)
- [Cloudflare Pages deployment notes](docs/CLOUDFLARE_PAGES.md)
