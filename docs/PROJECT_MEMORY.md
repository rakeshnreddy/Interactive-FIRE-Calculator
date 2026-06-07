# Project Memory

Last updated: June 7, 2026

## Repository

- Path: `/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator`
- Branch: `codex/cloudflare-pages-theme-plan`
- Remote branch: `origin/codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://343e5503.interactive-fire-calculator.pages.dev`

## Product Direction

The product is no longer a standalone FIRE calculator. It is becoming a comprehensive personal financial tracker and planner where users can eventually create accounts, store financial data, track goals, save plans, and revisit progress over time.

FIRE remains important, but it is now the first calculator/planning module inside the broader platform.

## Current Architecture

- React + TypeScript + Vite app in `src/`.
- FIRE engine in `src/lib/fire.ts`.
- FIRE tests in `src/lib/fire.test.ts`.
- Cloudflare Pages Function health endpoint in `functions/api/health.ts`.
- SPA routing supported by `public/_redirects`.
- Legacy Flask/Jinja app remains in `app.py`, `project/`, `templates/`, and `static/` for reference/parity only.

## Completed Work

Phase 1 Product Shell and IA is complete:

- `/` public financial platform landing page.
- `/calculators/fire` dedicated FIRE calculator module.
- `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/calculators`, `/reports`, and `/settings` app shell routes.
- Compact FIRE calculator with one planning-question control.
- Advanced FIRE assumptions behind progressive disclosure.
- Results and compare views appear after calculation.
- Browser QA performed on desktop and mobile.

## Next Phase

Start Phase 2: Auth and User Accounts.

Recommended first Phase 2 slice:

1. Research and choose auth provider for Cloudflare Pages/Functions.
2. Decide whether auth should be Clerk/Auth0 for speed or Better Auth for more app-owned infrastructure.
3. Add sign up, sign in, sign out, and signed-in shell state.
4. Keep unauthenticated FIRE calculator demo available.
5. Do not add D1 persistence until the auth choice and user identity model are stable.

## Working Rules

- Do not deploy Flask to Cloudflare Pages.
- Do not rewrite the FIRE engine unless the task is explicitly about calculation behavior.
- Preserve legacy Flask tests unless the user explicitly asks to remove the legacy reference app.
- Use `apply_patch` for manual edits.
- Run `./scripts/test_all.sh` before pushing.
- Deploy with `npm run cf:deploy` when ready.
- If context is getting tight, update this file and `docs/FINANCIAL_PLATFORM_TRACKER.md`, push all changes, deploy if app behavior changed, and provide the handoff prompt below.

## Useful Commands

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
./scripts/test_all.sh
npm run typecheck
npm test
npm run build
npm run cf:deploy
```

## Handoff Prompt

Use this prompt to start a new session:

```text
We are working in this repo:

/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator

Branch:
codex/cloudflare-pages-theme-plan

Remote:
origin/codex/cloudflare-pages-theme-plan

First read:
docs/PROJECT_MEMORY.md
docs/FINANCIAL_PLATFORM_TRACKER.md
docs/FINANCIAL_PLATFORM_HANDOFF.md

Product context:
The product has pivoted from a standalone FIRE calculator to a comprehensive personal financial tracker and planner. FIRE is now only the first calculator module inside the broader platform.

Current status:
Phase 1 Product Shell and IA is complete. The app has a public landing page, full target IA placeholder routes, and a dedicated compact FIRE calculator route at /calculators/fire.

Next goal:
Start Phase 2: Auth and User Accounts.

Do not deploy Flask to Cloudflare Pages. Keep the FIRE engine in src/lib/fire.ts intact unless calculation behavior is explicitly in scope. Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when ready.
```
