# Financial Platform Tracker

Last updated: June 22, 2026

This tracker is the working source of truth for moving the product from a standalone FIRE calculator into a full personal financial tracker and planner.

## Current Status

- Branch: `codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://61627f11.interactive-fire-calculator.pages.dev`
- Current production target: React, TypeScript, Vite, Cloudflare Pages
- Legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

## Phase Progress

| Phase | Status | Completion | Notes |
| --- | --- | ---: | --- |
| Phase 1: Product Shell and IA | Complete | 100% | Public landing, app shell, target IA placeholders, FIRE module route, compact calculator UX, and progressive disclosure are in place. |
| Phase 2: Auth and User Accounts | Dev credentials wired, production instance blocked | 85% | Clerk selected and integrated; sign-up/sign-in/sign-out controls, signed-in shell state, route gates, `/api/me`, local dev env, and Cloudflare Pages preview secrets exist. Real production auth needs a Clerk production instance/domain before it can be marked complete. |
| Phase 3: Server Persistence | Preview/server complete | 100% | D1 schema, shared auth/DB helpers, authenticated profile API, user-owned FIRE plan APIs, account-backed plan saves, Settings profile form, and signed-out local demo saves are in place. Production usage still depends on the Phase 2 Clerk production instance/domain. |
| Phase 4: Financial Tracker MVP | Preview/server complete | 100% | Manual accounts, assets, liabilities, balance history, account archival, and dashboard net worth summaries are in place. |
| Phase 5: Goals System | Preview/server complete | 100% | User-owned goal CRUD, progress and deadline tracking, signed-in Goals workspace, and dashboard goal summaries are in place. Plan links remain deliberate Phase 6 scope. |
| Phase 6: Planning Workspace | Not started | 0% | Add plan versions, scenario history, and profile/account-connected FIRE inputs. |
| Phase 7: Imports and Automation | Not started | 0% | Add CSV imports, review flows, optional R2 storage, and optional queues. |
| Phase 8: Insights and Recommendations | Not started | 0% | Add plan health explanations, spending insights, and retirement risk guidance. |
| Phase 9: Hardening and Launch | Not started | 0% | Privacy/export/delete flows, accessibility, performance, monitoring, and launch readiness. |

## Design System Milestone

- [x] Add the requested Revolut-inspired `DESIGN.md` reference.
- [x] Establish a FinPath-specific black, white, and restrained cobalt token system.
- [x] Preserve glassmorphism for real navigation, tool, account, goal, and auth panels.
- [x] Replace the fake landing dashboard with an optimized product-led hero asset.
- [x] Recompose the landing page with a full-bleed hero, concise CTAs, editorial capability rows, module entry points, privacy context, and footer.
- [x] Self-host Inter and standardize pill buttons, accessible fields, panel geometry, focus rings, and mobile touch targets.
- [x] Remove mood-gradient controls while preserving light/dark mode.
- [x] Add route-focus management, live status regions, reduced-motion behavior, and reduced-transparency fallbacks.
- [x] Verify landing, FIRE calculator, and signed-out route gates at desktop and mobile widths with no horizontal overflow.
- [x] Deploy the design milestone to `https://61627f11.interactive-fire-calculator.pages.dev` and verify the live hero asset, console, and responsive framing.

This milestone is intentionally separate from Phase 6 behavior. Phase 6 remains the next product phase.

## Phase 1 Completion Checklist

- [x] `/` is a public platform landing page.
- [x] FIRE calculator is no longer the whole front page.
- [x] FIRE calculator lives at `/calculators/fire`.
- [x] Target authenticated IA routes exist:
  - `/dashboard`
  - `/accounts`
  - `/transactions`
  - `/goals`
  - `/plans`
  - `/calculators`
  - `/reports`
  - `/settings`
- [x] Placeholder routes have distinct headings and content.
- [x] Top-level navigation labels map to distinct screens.
- [x] Calculator has one planning-question mode control.
- [x] Duplicate hero links and duplicate mode cards were removed.
- [x] Core FIRE inputs and `Calculate` are visible in the first viewport on desktop and mobile QA sizes.
- [x] Advanced FIRE assumptions are hidden behind progressive disclosure.
- [x] Existing FIRE engine in `src/lib/fire.ts` remains intact.
- [x] Current test suite passes before push.
- [x] Cloudflare Pages preview deploy succeeds.

## Phase 2 Entry Criteria

- Phase 1 merged or accepted as the product shell baseline.
- Auth provider decision made or explicitly scoped as the first Phase 2 task.
- Clerk selected for fastest robust consumer auth on the current Vite SPA + Cloudflare Pages/Functions stack.
- Confirm persistence direction:
  - D1 for relational user/profile/account/goal/plan data.
  - Pages Functions or Workers for API routes.

## Phase 2 Progress Checklist

- [x] Researched Clerk, Auth0, and Better Auth against current official docs.
- [x] Selected Clerk for the current Cloudflare Pages/Functions implementation.
- [x] Added `@clerk/react` browser auth boundary.
- [x] Added sign-up, sign-in, sign-out, signed-in profile basics, and signed-in shell state.
- [x] Kept `/` and `/calculators/fire` unauthenticated.
- [x] Gated `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/reports`, and `/settings`.
- [x] Added Clerk-backed Pages Function `GET /api/me` for session validation and basic identity.
- [x] Added `.env.example` and `.dev.vars.example`.
- [x] Confirmed earlier deployed `/api/me` returned `503 {"authConfigured":false}` while credentials were absent.
- [x] Did not add D1 persistence.
- [x] Link Clerk development app and pull local env.
- [x] Configure Cloudflare Pages preview secrets for Clerk development keys.
- [x] Redeploy with real `VITE_CLERK_PUBLISHABLE_KEY` build env.
- [ ] Verify real sign up, sign in, sign out, signed-in route access, and authenticated `/api/me`.
- [ ] Create/configure Clerk production instance for an owned launch domain.

## Required Clerk Configuration

- Browser build env: `VITE_CLERK_PUBLISHABLE_KEY`.
- Pages Functions env/secrets: `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
- Optional but recommended: `CLERK_AUTHORIZED_PARTIES`, comma-separated origins for local Pages dev and deployed Pages/custom domains.
- Current Clerk app: `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`).
- Current Clerk development instance: `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`.
- Local ignored env files are present: `.env.local` and `.dev.vars`.
- Cloudflare Pages preview secrets now include `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- Cloudflare Pages production secrets are intentionally empty until Clerk production keys exist.
- `clerk doctor --spotlight` reports the production instance is not configured.
- `clerk deploy status` reports production deployment is `not_started` and requires `clerk deploy` with human/domain setup.

## Open Decisions

- Auth provider: Clerk selected for Phase 2.
- Production auth domain for Clerk deployment.
- Whether to keep Vite SPA or move to a framework with richer routing/loaders.
- Whether Pages Functions are enough for API needs or if a separate Worker should own API routes.
- D1 schema and migration strategy: initial schema lives in `migrations/0001_initial_financial_platform_schema.sql`; use Wrangler D1 migrations for local, preview, and production DB changes.
- How much sensitive financial data to store in the first MVP.
- Data export and deletion policy.
- Whether legacy Flask parity tests remain long term.

## Phase 3 Progress Checklist

- [x] Create Cloudflare D1 databases:
  - Preview: `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`)
  - Production: `finpath-production` (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`)
- [x] Add `DB` D1 binding to `wrangler.toml`.
- [x] Add first migration for users, profiles, accounts, balances, transactions, goals, plans, plan versions, FIRE payloads, assumptions, and audit log.
- [x] Apply migration locally, to preview D1, and to production D1.
- [x] Add shared Pages Function Clerk auth helper.
- [x] Add authenticated `GET`/`PUT /api/profile` endpoint backed by D1.
- [x] Verify `/api/profile` with a real Clerk development user token in local Pages dev.
- [x] Add authenticated user-owned FIRE plan APIs:
  - `GET`/`POST /api/plans`
  - `GET`/`PUT`/`DELETE /api/plans/:id`
- [x] Store plan snapshots and calculation results in D1 plan versions.
- [x] Wire signed-in FIRE saves to account-backed API storage.
- [x] Keep signed-out FIRE demo drafts in browser localStorage.
- [x] Wire Settings profile basics to the D1-backed profile API.
- [x] Browser-test signed-out FIRE and Settings gate at `1280x720` and `390x844`.

## Phase 3 Verification Notes

- Local Pages dev authenticated API verification passed with a disposable Clerk development user:
  - `GET /api/profile` -> `200`
  - `PUT /api/profile` -> `200`
  - unauthenticated `GET /api/plans` -> `401`
  - authenticated `POST /api/plans` -> `201`
  - authenticated `GET /api/plans` -> `200`
  - authenticated `PUT /api/plans/:id` -> `200` with version increment
  - authenticated `GET /api/plans/:id` -> `200`
  - authenticated `DELETE /api/plans/:id` -> `200`
  - archived plan read -> `404`
- Deployed preview `https://0fe386db.interactive-fire-calculator.pages.dev` passed the same authenticated profile and plan API flow; disposable test D1 rows and the temporary Clerk development user were removed afterward.
- Browser smoke checks passed for `/calculators/fire` and `/settings` signed-out gate at desktop and mobile widths with no console errors and no horizontal overflow.
- Full repository verification must still be run before each push with `./scripts/test_all.sh`.

## Phase 4 Progress Checklist

- [x] Add shared account and balance validation/persistence helpers in `functions/_lib/accounts.ts`.
- [x] Add authenticated account endpoints:
  - `GET`/`POST /api/accounts`
  - `GET`/`PUT`/`DELETE /api/accounts/:id`
- [x] Add authenticated balance endpoints:
  - `GET`/`POST /api/accounts/:id/balances`
- [x] Add authenticated `GET /api/dashboard` summary endpoint.
- [x] Wire `/dashboard` to D1-backed net worth, assets, liabilities, active account count, and recent balances.
- [x] Wire `/accounts` to manual asset/liability creation, balance recording, recent balance history, and account archival.
- [x] Keep `/` and `/calculators/fire` public and unauthenticated.
- [x] Keep FIRE calculation behavior unchanged in `src/lib/fire.ts`.
- [x] Keep account-tracker writes separate from FIRE plan persistence.
- [x] Keep goals as Phase 5 scope.

## Phase 4 Verification Notes

- Local Pages dev authenticated API verification passed with disposable Clerk development users:
  - unauthenticated `GET /api/accounts` -> `401`
  - authenticated initial `GET /api/accounts` -> `200`
  - authenticated `POST /api/accounts` for an asset -> `201`
  - authenticated `POST /api/accounts` for a liability -> `201`
  - authenticated `GET /api/accounts` returned the expected assets, liabilities, and net worth summary
  - authenticated `GET /api/dashboard` returned the expected recent account and summary data
  - authenticated `POST /api/accounts/:id/balances` -> `201`
  - authenticated `GET /api/accounts/:id/balances` -> `200`
  - authenticated `DELETE /api/accounts/:id` archived the account and subsequent read returned `404`
- Browser checks passed for signed-out `/dashboard` gates.
- Browser checks passed for signed-in `/dashboard` and `/accounts` at `1280x720` and `390x844`.
- The signed-in browser checks verified seeded data for `$40,000` assets, `$15,000` liabilities, and `$25,000` net worth.
- No console errors or horizontal overflow were found in the checked desktop or mobile views.
- `./scripts/test_all.sh` passed before deploy.
- `npm run cf:deploy` deployed the Phase 4 tracker-ready state to `https://5d15bc5c.interactive-fire-calculator.pages.dev`.
- Deployed preview API verification passed for unauthenticated account rejection, authenticated account create/list, dashboard summary, balance add/history, and account archival.
- Deployed signed-out `/dashboard` browser gate smoke passed with no console errors or horizontal overflow.
- Disposable D1 rows and Clerk development users created during verification were removed afterward.

## Phase 5 Progress Checklist

- [x] Add shared goal validation, persistence, and summary helpers in `functions/_lib/goals.ts`.
- [x] Add authenticated goal endpoints:
  - `GET`/`POST /api/goals`
  - `GET`/`PUT`/`DELETE /api/goals/:id`
- [x] Scope every goal read and write to the authenticated user.
- [x] Validate goal type, status, amounts, and target dates at the API boundary.
- [x] Soft-archive goals and exclude archived rows from active reads and summaries.
- [x] Derive progress percentage, remaining amount, overdue state, and days until target.
- [x] Wire `/goals` to manual creation, progress/status updates, deadlines, and archival.
- [x] Add goal funding, active/overdue counts, and next-goal context to `/dashboard`.
- [x] Keep the public `/calculators/fire` demo available and leave `src/lib/fire.ts` unchanged.
- [x] Keep goal persistence isolated from saved FIRE plan writes until Phase 6.

## Phase 5 Verification Notes

- Goal validation and summary coverage passes in `src/goals.test.ts`; the Vitest suite has 19 passing tests.
- Local Pages dev API verification passed for unauthenticated rejection plus authenticated create, list, read, update, dashboard summary, archive, and archived-goal `404` behavior.
- Signed-in browser QA passed for `/goals` and `/dashboard` at `1280x720` and `390x844`.
- The browser flow covered goal creation, funding/status updates, archival, responsive layout, and dashboard aggregation.
- No console errors, overlapping text, or horizontal overflow were found in the checked views.
- `npm run cf:deploy` deployed the Phase 5 goal-ready state to `https://06ad2b4d.interactive-fire-calculator.pages.dev`.
- The deployed API passed unauthenticated rejection plus authenticated create, list, update, dashboard aggregation, archive, and archived-goal `404` checks.
- Disposable Clerk and D1 verification data is removed after local and deployed checks.

## Required Verification Before Push

Run:

```bash
./scripts/test_all.sh
```

For frontend-only iterations, at minimum:

```bash
npm run typecheck
npm test
npm run build
```

For significant UI changes:

- Browser-test desktop at `1280x720`.
- Browser-test mobile at `390x844`.
- Confirm no horizontal overflow.
- Confirm no overlapping text.
- Confirm primary action is visible in the first viewport.
- Confirm navigation labels map to distinct screens.
