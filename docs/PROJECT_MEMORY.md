# Project Memory

Last updated: June 22, 2026

## Repository

- Path: `/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator`
- Branch: `codex/cloudflare-pages-theme-plan`
- Remote branch: `origin/codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://61627f11.interactive-fire-calculator.pages.dev`

## Product Direction

The product is no longer a standalone FIRE calculator. It is becoming a comprehensive personal financial tracker and planner where users can eventually create accounts, store financial data, track goals, save plans, and revisit progress over time.

FIRE remains important, but it is now the first calculator/planning module inside the broader platform.

## Current Architecture

- React + TypeScript + Vite app in `src/`.
- Clerk is selected for consumer auth. The browser auth boundary lives in `src/auth.tsx`.
- FIRE engine in `src/lib/fire.ts`.
- FIRE tests in `src/lib/fire.test.ts`.
- Cloudflare Pages Function health endpoint in `functions/api/health.ts`.
- Clerk-backed Pages Function identity endpoint in `functions/api/me.ts`.
- Authenticated D1-backed profile endpoint in `functions/api/profile.ts`.
- Authenticated D1-backed FIRE plan endpoints in `functions/api/plans/index.ts` and `functions/api/plans/[id].ts`.
- Authenticated D1-backed goal endpoints in `functions/api/goals/index.ts` and `functions/api/goals/[id].ts`.
- Shared Pages Function helpers in `functions/_lib/`.
- D1 migrations in `migrations/`.
- SPA routing supported by `public/_redirects`.
- Legacy Flask/Jinja app remains in `app.py`, `project/`, `templates/`, and `static/` for reference/parity only.
- `DESIGN.md` defines the Revolut-inspired FinPath visual language used by the React app.

## Completed Work

Phase 1 Product Shell and IA is complete:

- `/` public financial platform landing page.
- `/calculators/fire` dedicated FIRE calculator module.
- `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/calculators`, `/reports`, and `/settings` app shell routes.
- Compact FIRE calculator with one planning-question control.
- Advanced FIRE assumptions behind progressive disclosure.
- Results and compare views appear after calculation.
- Browser QA performed on desktop and mobile.

Phase 2 provider-ready auth shell is implemented and Clerk development credentials are wired, but production auth is not complete because the Clerk app has no production instance/domain yet:

- Clerk was chosen over Auth0 and Better Auth for the current Vite SPA + Cloudflare Pages/Functions shape.
- Clerk CLI is linked to app `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) with development instance `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`.
- `@clerk/react` wraps the app when `VITE_CLERK_PUBLISHABLE_KEY` is present.
- Landing and topbar actions use real Clerk sign-up/sign-in/sign-out controls when configured.
- Authenticated app routes are gated when signed out or when auth env is missing.
- `/calculators/fire` remains public and unauthenticated.
- Signed-in profile display is limited to Clerk identity fields only.
- `/api/me` validates Clerk sessions in Pages Functions and returns only basic identity.
- FIRE plan saves remain browser-local; no D1 persistence was added.
- Local ignored env files are present: `.env.local` from `clerk env pull` and `.dev.vars` for Pages Functions local dev.
- Cloudflare Pages preview secrets now include `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`; production secrets are intentionally empty until Clerk production keys exist.
- `clerk doctor --spotlight` reports no production instance configured. `clerk deploy status` says production deployment is `not_started` and requires a human terminal/domain setup.
- `npm run cf:deploy` deployed the gated auth-ready state to `https://3894ea1a.interactive-fire-calculator.pages.dev`.
- Verification passed with `./scripts/test_all.sh` and browser QA at `1280x720` and `390x844`.

Phase 3 server persistence is complete for preview/development:

- D1 preview database: `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`).
- D1 production database: `finpath-production` (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`).
- `wrangler.toml` binds both databases as `DB`.
- `migrations/0001_initial_financial_platform_schema.sql` creates the first relational schema for users, profiles, accounts, balances, transactions, goals, plans, plan versions, FIRE payloads, assumptions, and audit log.
- The first migration has been applied locally, to preview D1, and to production D1.
- `functions/_lib/session.ts` centralizes Clerk request validation for Pages Functions.
- `functions/_lib/persistence.ts` centralizes D1 binding checks and user/profile creation.
- `functions/_lib/firePlans.ts` centralizes FIRE plan payload validation, versioned writes, reads, and archival.
- `GET` and `PUT /api/profile` create/read/update a signed-in user's D1 profile.
- `GET`/`POST /api/plans` and `GET`/`PUT`/`DELETE /api/plans/:id` create/list/read/version/archive signed-in user FIRE plans in D1.
- The FIRE calculator save panel uses account-backed plan storage when signed in and browser localStorage drafts when signed out.
- The Settings route includes a D1-backed profile form for display name, household name, currency, birth year, and target retirement age.
- Local Pages dev verification passed with a disposable Clerk development user token for profile read/update, plan create/list/read/update/delete, unauthenticated `401`, and archived-plan `404`.
- Deployed preview verification passed at `https://0fe386db.interactive-fire-calculator.pages.dev` for the same authenticated profile and plan API flow; disposable D1 rows and the temporary Clerk development user were removed afterward.
- Browser smoke checks passed for signed-out `/calculators/fire` and `/settings` at `1280x720` and `390x844` with no console errors or horizontal overflow.
- `npm run cf:deploy` deployed the Phase 3 persistence-ready state to `https://0fe386db.interactive-fire-calculator.pages.dev`.

Phase 4 Financial Tracker MVP is complete for preview/development:

- `functions/_lib/accounts.ts` centralizes account, balance, and dashboard summary validation/persistence.
- Authenticated account endpoints now exist:
  - `GET`/`POST /api/accounts`
  - `GET`/`PUT`/`DELETE /api/accounts/:id`
  - `GET`/`POST /api/accounts/:id/balances`
- Authenticated `GET /api/dashboard` returns recent accounts and latest-balance net worth summary data.
- `/dashboard` now shows signed-in net worth, assets, liabilities, active account count, and recent account balances from D1.
- `/accounts` now lets signed-in users manually create assets/liabilities, record balances, view recent balance history, and archive accounts.
- Signed-out authenticated app routes still show sign-in gates; the public landing page and `/calculators/fire` demo remain unauthenticated.
- The FIRE engine in `src/lib/fire.ts` remains intact.
- Local Pages dev API verification passed for unauthenticated `401`, account create/list/read, balance add/history, dashboard summary, and account archival.
- Browser QA passed for signed-in `/dashboard` and `/accounts` at `1280x720` and `390x844` with no console errors or horizontal overflow.
- Deployed preview API verification passed at `https://5d15bc5c.interactive-fire-calculator.pages.dev` for unauthenticated account rejection, authenticated account create/list, dashboard summary, balance add/history, and account archival; disposable D1 rows and Clerk development users were removed afterward.
- Deployed signed-out `/dashboard` browser gate smoke passed with no console errors or horizontal overflow.
- `npm run cf:deploy` deployed the Phase 4 tracker-ready state to `https://5d15bc5c.interactive-fire-calculator.pages.dev`.

Phase 5 Goals System is complete for preview/development:

- `functions/_lib/goals.ts` centralizes goal validation, user-scoped D1 persistence, derived progress, overdue state, deadline calculations, and aggregate summaries.
- Authenticated `GET`/`POST /api/goals` and `GET`/`PUT`/`DELETE /api/goals/:id` support manual goal creation, updates, reads, and soft archival.
- Goals support retirement, emergency fund, debt payoff, home, education, travel, and custom categories plus active, paused, and completed states.
- `/goals` is a signed-in workspace for creating goals, updating funding and status, reviewing progress/deadlines, and archiving goals.
- `/dashboard` includes goal funding, active/overdue counts, and the next target alongside account summaries.
- Goal writes remain isolated from FIRE plan persistence; `src/lib/fire.ts` is unchanged.
- Local authenticated API lifecycle checks and signed-in browser QA passed at `1280x720` and `390x844` with no console errors or horizontal overflow.
- Goal unit coverage brings the frontend suite to 19 passing tests.
- `npm run cf:deploy` deployed the Phase 5 goal-ready state to `https://06ad2b4d.interactive-fire-calculator.pages.dev`.
- Deployed API verification passed for unauthenticated rejection plus authenticated create, list, update, dashboard aggregation, archive, and archived-goal `404`; disposable Clerk and D1 data was removed afterward.

Pre-Phase 6 design system overhaul is complete:

- Added the requested Revolut-inspired `DESIGN.md` reference and translated it into a distinct FinPath system rather than copying Revolut branding.
- Rebuilt the landing page around a full-bleed product hero, concise conversion path, editorial capability rows, module entry points, and a compact trust/footer treatment.
- Added a generated, optimized product hero asset at `public/assets/finpath-product-hero.jpg`.
- Replaced mood gradients with a black/white/cobalt language while retaining glassmorphism for navigation, planner panels, account/goal surfaces, and auth gates.
- Self-hosted Inter through `@fontsource-variable/inter` and standardized pill actions, 12px inputs, 16-20px panels, focus states, and mobile touch targets.
- Removed the public mood switcher, fixed duplicate dashboard labeling, hid the raw Clerk user ID from the normal profile band, added route focus management, live status regions, and reduced-motion/transparency fallbacks.
- Desktop and mobile visual checks passed for landing, FIRE calculator, and signed-out account gates with no horizontal overflow.
- `npm run cf:deploy` deployed the design-system milestone to `https://61627f11.interactive-fire-calculator.pages.dev`; live desktop/mobile hero, asset, console, and overflow checks passed.

## Next Phase

Begin Phase 6 Planning Workspace, while keeping the remaining Phase 2 production-auth launch blocker visible.

Remaining Phase 2 work:

1. Verify real sign up, sign in, sign out, signed-in route access, and `/api/me` on the Cloudflare Pages preview with a test user.
2. Run `clerk deploy` in a human terminal and configure the Clerk production instance for an owned domain.
3. Pull/set production Clerk keys when the production instance exists.
4. Re-run `./scripts/test_all.sh`, redeploy, and verify the production auth flow.
5. Do not call production auth launch-ready until a Clerk production instance/domain and production keys exist.

Phase 6 first slice:

1. Turn saved FIRE plans into a focused planning workspace with version and scenario history.
2. Let users deliberately seed plan inputs from profile, accounts, and goals without silently changing calculator assumptions.
3. Add plan comparison across saved versions and concise plan health explanations.
4. Preserve the public FIRE demo and existing user-owned D1 boundaries.

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
Phase 1 Product Shell and IA is complete. Phase 2 has a Clerk provider-ready auth shell, route gates, signed-in shell state, and /api/me identity validation. Clerk development credentials are configured locally and in Cloudflare Pages preview secrets, but real production auth is blocked until a Clerk production instance/domain is configured. Phase 3 server persistence is complete for preview/development with D1-backed profile persistence and saved FIRE plans. Phase 4 Financial Tracker MVP is complete with manual accounts, balance history, and dashboard net worth summaries. Phase 5 Goals System is complete with user-owned goal APIs, progress/deadline tracking, a signed-in Goals workspace, and dashboard goal summaries.

Next goal:
Begin Phase 6 Planning Workspace with plan scenario/version history, deliberate profile/account/goal input connections, comparison, and plan health explanations. Keep Clerk production auth/domain setup as a launch blocker.

Do not deploy Flask to Cloudflare Pages. Keep the FIRE engine in src/lib/fire.ts intact unless calculation behavior is explicitly in scope. Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when ready.
```

## Detailed Phase 6 Handoff Prompt

Use this more detailed prompt when starting the coding session that should begin Phase 6:

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

Current state:
Phases 1, 3, 4, and 5 are complete for preview/development. Clerk development auth is integrated, but production auth is not launch-ready because the Clerk app has no production instance/domain or production keys. D1 stores profiles, saved FIRE plans, accounts, balances, and goals behind user-scoped Pages Functions. `/goals` supports manual goal creation, progress/status updates, deadlines, and archival; `/dashboard` combines account and goal summaries. `/calculators/fire` remains public. The FIRE engine in `src/lib/fire.ts` is intact. The legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

Latest known Cloudflare Pages preview:
https://61627f11.interactive-fire-calculator.pages.dev

Branch alias:
https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev

Goal:
Begin Phase 6: Planning Workspace.

Phase 6 target:
- Add a signed-in workspace for saved FIRE plans and their version/scenario history.
- Support clear comparison between plan versions or scenarios.
- Offer explicit controls to seed plan inputs from profile, account, and goal data.
- Add concise plan health explanations without changing the deterministic FIRE engine.
- Keep the existing account, balance, and goal data intact.
- Keep the unauthenticated FIRE calculator demo available.
- Do not call production auth launch-ready until a Clerk production instance/domain and production keys exist.

Important decision:
Clerk is the selected provider. Do not switch providers unless the product owner explicitly redirects. Avoid Cloudflare Access as primary consumer auth.

Required Clerk environment:
- Browser build env: `VITE_CLERK_PUBLISHABLE_KEY`.
- Pages Functions env/secrets: `CLERK_PUBLISHABLE_KEY` plus `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
- Optional but recommended: `CLERK_AUTHORIZED_PARTIES` as comma-separated origins for local Pages dev and deployed Pages/custom domains.
- Examples live in `.env.example` and `.dev.vars.example`.
- Current Clerk state: app `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) has a development instance but no production instance. `clerk deploy` must be completed with a real owned domain before production auth can be called done.

Implementation guidance:
- Start from the existing versioned plan schema and `functions/_lib/firePlans.ts` before adding migrations.
- Keep plan input imports explicit and reversible; never silently infer or overwrite assumptions.
- Split backend plan/version work from frontend workspace work when parallelizing edits.
- Update the three project memory documents when Phase 6 scope is settled.

Required verification before push:
./scripts/test_all.sh

For frontend-only iterations:
npm run typecheck
npm test
npm run build

For UI/app-shell changes:
- Run local dev server with `./scripts/run_local.sh`.
- Browser-test desktop at 1280x720 and mobile at 390x844.
- Confirm signed-out landing and FIRE demo work.
- Confirm app routes show correct signed-out/sign-in state.
- Confirm dashboard/account summaries match API data.
- Confirm no horizontal overflow or overlapping text.

Deploy:
npm run cf:deploy

If blocked by missing provider credentials or product decisions:
- Do not fake production auth and call it complete.
- Keep implementation limited to preview/development auth if production Clerk is still unavailable.
- Update `docs/FINANCIAL_PLATFORM_TRACKER.md` and `docs/PROJECT_MEMORY.md` with exact blockers, required env vars, and next steps.
- Push any useful documentation or preparatory code.
```
