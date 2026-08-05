# Financial Platform Tracker

Last updated: July 27, 2026

This tracker is the working source of truth for moving the product from a standalone FIRE calculator into a full personal financial tracker and planner.

## Current Status

- Branch: `codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://baadb7c6.interactive-fire-calculator.pages.dev`
- Current production target: React, TypeScript, Vite, Cloudflare Pages
- Legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

## Phase Progress

| Phase | Status | Completion | Notes |
| --- | --- | ---: | --- |
| Phase 1: Product Shell and IA | Complete | 100% | Public landing, app shell, target IA placeholders, FIRE module route, compact calculator UX, and progressive disclosure are in place. |
| Phase 2: Auth and User Accounts | Code and deployment safeguards complete; owned domain blocked | 90% | Clerk integration, route gates, `/api/me`, identity-scoped persistence, production preflight, live-key bundle guard, explicit production-branch deployment, and runbook are complete. An owned domain, Clerk production instance/DNS, production secrets, and hosted signed-in verification remain. |
| Phase 3: Server Persistence | Preview/server complete | 100% | D1 schema, shared auth/DB helpers, authenticated profile API, user-owned FIRE plan APIs, account-backed plan saves, Settings profile form, and signed-out local demo saves are in place. Production usage still depends on the Phase 2 Clerk production instance/domain. |
| Phase 4: Financial Tracker MVP | Preview/server complete | 100% | Manual accounts, assets, liabilities, balance history, account archival, and dashboard net worth summaries are in place. |
| Phase 5: Goals System | Preview/server complete | 100% | User-owned goal CRUD, progress and deadline tracking, signed-in Goals workspace, and dashboard goal summaries are in place. |
| Phase 6: Planning Workspace | Preview/server complete | 100% | Signed-in plan library, immutable version history, stale-write protection, comparisons, explicit profile/account/goal imports, and deterministic health checks are in place. |
| Phase 7: Imports and Automation | Preview/server complete | 100% | Review-first account-balance CSV imports, duplicate/conflict handling, atomic commits, audit history, and dashboard refresh are in place. |
| Phase 8: Insights and Recommendations | Preview/app complete | 100% | Rule-based Reports recommendations, dashboard priority insights, account/goal/plan evidence, and uncertainty language are in place. |
| Phase 9: Hardening and Launch | Preview/app complete | 100% | Authenticated D1 export/delete readiness, Settings privacy controls, accessibility pass, bundle splitting, launch notes, and verification are in place. Production launch still depends on the Phase 2 Clerk production instance/domain. |
| Phase 10: Transactions MVP | Preview/app complete | 100% | User-scoped manual transaction APIs and a signed-in Transactions ledger are in place for income, expenses, transfers, and adjustments. Balance imports remain separate from categorization. |
| Phase 11: Transaction Categorization and Cashflow Automation | Preview/app complete | 100% | Transaction search/filtering, category suggestions, monthly cashflow rollups, dashboard cashflow context, and reports transaction insights are in place. Transaction imports and reconciliation remain separate future scope. |
| Phase 12: Review-first Transaction Import and Reconciliation Planning | Preview/app complete | 100% | A separate transaction CSV import flow now reviews ready, duplicate, and rejected rows before commit, stores import history, and never mutates account balances. |
| Phase 13: Calculator Foundation | Preview/app complete | 100% | `/calculators` is a public searchable hub with shared calculator layout, stable routes, route metadata, JSON-LD, robots, and sitemap coverage. |
| Phase 14: Core Planning Calculators | Preview/app complete | 100% | Compound interest, savings goal, net worth, budget, emergency fund, retirement, debt payoff, and investment return calculators are live. |
| Phase 15: India Calculator Set | Preview/app complete | 100% | SIP, step-up SIP, SIP goal, mutual fund, SWP, EMI, tax, salary, HRA, FD/RD, PPF, EPF, NPS, and gratuity calculators are live. |
| Phase 16: US Calculator Set | Preview/app complete | 100% | Mortgage, refinance, amortization, rent-vs-buy, credit, debt, loan, 401(k), IRA, paycheck, tax, Social Security, and RMD calculators are live. |
| Phase 17: Calculator-to-Account Conversion Layer | Preview/server complete | 100% | Durable calculator result saves, signed-out draft preservation, signed-in save CTAs, downstream goal/account/plan draft creation, transaction-workflow result storage, dashboard saved-result cards, and account-data export/delete coverage are in place. |
| Phase 18: Calculator Library Scale-Out | Preview/app complete | 100% | CAGR, XIRR, inflation, Rule of 72, capital gains, GST/TDS, down payment, PMI, HELOC, balance transfer, CD/HYSA, insurance, lease-vs-buy, and ROI calculators are live. |
| Phase 19: Calculator UX and Formula Assurance | Preview/app complete | 100% | Calculator copy now uses user-facing decision framing, the landing hero links to the full library, detail pages explain inputs/results with hover/focus help, and every calculator has an individual expected-output test. |
| Phase 20: Calculator Decision Studio Foundation | Preview/app complete | 100% | Shared decision-studio metadata, reusable scenario state, chart-ready visual primitives, route-specific example loaders, related-calculator navigation, and public-copy guard tests are in place for every current calculator route. |
| Phase 21: Growth, Goal, and Retirement Visualizers | Preview/app complete | 100% | Expandable optional breakdown tables and schedule data now cover growth, goal, retirement, withdrawal, distribution, benefit, inflation, and return calculators while keeping the main result UI clean. |
| Phase 22: Loan, Debt, Home, and Vehicle Visualizers | Preview/app complete | 100% | Added complete optional amortization/payment/payoff/refinance/prepayment/PMI/rent-buy tables, custom period views, CSV schedule export, true multi-debt snowball/avalanche comparison, and the missing loan/mortgage/India home-loan routes. |
| Phase 23: Income, Tax, Budget, and Protection Deepening | Preview/app complete | 100% | Gross-to-net tables, India old/new regime estimates, US bracket estimates, budget cashflow, emergency runway, and protection-gap planning are in place. |
| Phase 24: Calculator Search Preservation and Content Quality | Preview/app complete | 100% | Stable URLs, formula-aware route content, visible assumptions and FAQs, tested canonicals/schema/sitemap coverage, crawlable internal links, duplicate-content guards, and no-auth smoke coverage for all public calculators are in place. |
| Phase 25: Engagement and Personalization Loop | Preview/app complete | 100% | Side-by-side scenarios, deterministic outcome drivers, recent saved-run history, explicit reload, dashboard follow-ups, input-only share links, schedule CSVs, and scenario-summary export are in place. |
| Phase 26: Calculator-by-Calculator Excellence Pass | In progress | 1.2% | Calculator 1 of 82, Compound Interest, has a dedicated versioned engine and high-standard public experience. 81 calculators remain; Savings Goal is next. |
| Post-roadmap: Calculator Consolidation and Visual System Refresh | Preview/app complete | 100% | All 82 exact routes remain, but the hub now presents 8 decision toolkits with exact search and progressive disclosure. Product/design contracts, a neutral teal-blue-coral light/dark system, restrained glass, persistent theme preference, and refreshed landing/detail/app surfaces are deployed at `https://8fb17051.interactive-fire-calculator.pages.dev`. |

## Phase 26 Calculator 1 Checkpoint

- [x] Research authoritative formula conventions, official calculators, competitors, uncertainty language, accessibility, locale formatting, and CSV interoperability.
- [x] Preserve the legacy Compound default and keep 401(k), HYSA, and FIRE behavior unchanged.
- [x] Add the typed `finpath-compound-v2` dated-cash-flow engine with explicit validation and finite-output safeguards.
- [x] Add beginner Quick Start, collapsed Advanced Options, and expandable expert analysis.
- [x] Add true chart data, annual/event schedules, fee drag, real value, target gap/timing, milestones, and 3×3 sensitivity.
- [x] Add versioned share/restoration, route-specific draft, raw CSV, signed-in save boundary, and saved-run reload.
- [x] Add exact locale/currency display controls without implying FX conversion.
- [x] Add finance golden tests, timing/frequency matrix, validation/overflow cases, invariants, save-payload integration, and full shared regressions.
- [ ] Record final commit, pushed branch, preview URL, and deployed smoke results after release.

Research and exact deferred decisions: `docs/COMPOUND_INTEREST_RESEARCH.md`.

## Design System Milestone

The original Revolut-inspired milestone below is historical. The current visual source of truth is the post-Phase-25 precision-led system in `DESIGN.md` and `PRODUCT.md`.

- [x] Consolidate the calculator hub into 8 decision toolkits while retaining all exact routes.
- [x] Replace the purple/photo wash with neutral light and dark canvases, teal primary action, blue comparison data, and warm secondary emphasis.
- [x] Restrict glass to navigation, search, and primary grouped work surfaces.
- [x] Standardize cards and controls at 8px geometry with restrained borders and shadows.
- [x] Make the full calculator library the primary landing action and retain FIRE as a direct secondary path.
- [x] Persist color-mode preference and honor system preference on first visit.
- [x] Add toolkit completeness tests and browser-check desktop/mobile light/dark layouts with no horizontal overflow.

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

This milestone remains the visual baseline for the completed Planning Workspace and future product phases.

Post-roadmap consolidation verification:

- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 1,111 frontend tests across 20 files, and production build.
- Local desktop/mobile browser QA passed the landing page, toolkit hub, exact search, amortization detail, FIRE workspace, signed-out Dashboard gate, light/dark themes, theme persistence, console state, and document-width checks.
- Toolkit coverage confirmed 8 panels expose all 82 exact routes exactly once; searching `mortgage refinance` returns the precise route and preserves the query in the URL.
- `npm run cf:deploy` deployed to `https://8fb17051.interactive-fire-calculator.pages.dev`; `npm run smoke:calculators` verified all 84 public calculator-library paths without authentication.
- Live `/`, `/calculators`, representative India/US/global calculators, `/calculators/fire`, and `/dashboard` returned `200`; unauthenticated `/api/calculator-results` returned `401`.
- Calculator program and this consolidation/design checkpoint are 100% complete. The remaining launch blocker is still production Clerk instance/domain/keys and hosted signed-in verification.

Production auth readiness checkpoint:

- Clerk CLI updated from `1.5.0` to `2.1.0`; diagnostics pass except for the intentionally unconfigured production instance.
- `clerk deploy --mode agent` reports `not_started`, no domain, no production instance ID, and no pending DNS records because production creation has not begun.
- Cloudflare Pages currently lists only `interactive-fire-calculator.pages.dev`; no owned custom domain is attached and the production Pages secret set is empty.
- Added `.env.production.example`, `npm run auth:preflight`, and `npm run cf:deploy:production`.
- Preflight validates a live frontend key, owned HTTPS origin, Clerk completion, required Pages secret names, exact bundle key, absence of the configured development key, and hosted public/API status.
- Production deploy refuses non-`main` branches by default and explicitly deploys with `--branch main` after the full repository suite and bundle checks.
- Added `docs/PRODUCTION_AUTH_RUNBOOK.md`. Phase 2 is now 90% complete; the remaining 10% requires the product owner's domain/DNS choice and real hosted identity flow.

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
- Production retention/SLA and full identity deletion policy beyond the preview D1 account-data delete/export controls.
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

## Phase 6 Progress Checklist

- [x] Add authenticated version-history endpoints:
  - `GET /api/plans/:id/versions`
  - `GET /api/plans/:id/versions/:versionNumber`
- [x] Preserve immutable snapshots, results, version labels, notes, creation times, scenario sets, and optional retirement-goal links.
- [x] Require an expected version number for signed-in updates and return `409` for stale writes.
- [x] Stop matching account plans by name; updates now use explicit plan identity.
- [x] Replace the `/plans` placeholder with a signed-in Planning Workspace.
- [x] Support separate `Save new version` and `Save as new plan` commands.
- [x] Restore the most recently updated signed-in plan when the workspace is revisited.
- [x] Add explicit, previewable, reversible imports from profile ages, selected dated same-currency asset accounts, or one retirement goal.
- [x] Keep retirement goal target amounts as visible benchmarks rather than silently mapping them to final-value assumptions.
- [x] Add immutable version history, scenario counts, two-version comparison, and historical-version loading.
- [x] Add deterministic portfolio-gap, spending-coverage, ending-balance, and engine-warning explanations without changing `src/lib/fire.ts`.
- [x] Keep the unauthenticated FIRE calculator and browser-local signed-out drafts available.

## Phase 6 Verification Notes

- Vitest coverage now includes plan payload/version parsing, health derivation, account/goal seed rules, invalid source rejection, and one-step undo; 30 frontend tests pass.
- Local Pages Functions verification passed for authenticated plan creation, version-list/read, version append, stale-write `409`, invalid-version `400`, and unauthenticated `401`.
- Signed-in browser QA passed the populated `/plans` flow at `1440x900` and `390x844`, including account import preview/apply, immutable version save, new-plan creation, archive, comparison, reload restoration, and responsive control geometry.
- Browser checks found no console errors, horizontal overflow, or overlapping workspace controls.
- The existing D1 schema already supported this scope, so Phase 6 required no migration.
- `npm run cf:deploy` deployed Phase 6 to `https://f047c87a.interactive-fire-calculator.pages.dev`.
- The deployed authenticated API passed create, version list/read, version append, stale-write `409`, archive, and unauthenticated `401`; disposable D1 and Clerk records were removed afterward.
- The deployed public FIRE route and signed-out `/plans` gate passed desktop/mobile browser smoke with no console errors or horizontal overflow.
- Clerk development instances do not complete browser sign-in on the non-localhost Pages preview origin; live signed-in browser verification remains part of the existing Phase 2 production-instance/domain blocker.

## Phase 7 Progress Checklist

- [x] Choose account-balance CSV as the narrow first import contract.
- [x] Require exactly `account`, `balance_date`, `balance`, and `currency` headers while allowing any column order.
- [x] Parse CSV locally with Papa Parse and send only normalized row fields for authenticated server review.
- [x] Bound files to 256 KB and 500 balance rows.
- [x] Match active owned accounts by ID or unambiguous exact name.
- [x] Validate ISO dates, non-negative decimal amounts, account currency, row shape, and unique row numbers at the API boundary.
- [x] Mark existing snapshots and repeated rows as duplicates without writing them.
- [x] Reject unknown/ambiguous accounts, currency mismatches, malformed fields, and conflicting same-day balances.
- [x] Re-run review during commit so client changes cannot bypass ownership or validation.
- [x] Write the import audit record and approved balances in one transactional D1 batch.
- [x] Add recent import history and a generated account-aware CSV template.
- [x] Refresh account history, net worth, and dashboard summaries after commit.
- [x] Keep the import workbench in a route-specific lazy chunk so public pages do not load CSV tooling.
- [x] Add migration `0002_balance_import_history.sql` and apply it locally, to preview D1, and to production D1.
- [x] Update Wrangler to `4.103.0`; `npm audit` reports zero known vulnerabilities.
- [x] Defer R2 and Queues: the bounded synchronous path does not store raw files and remains below the current D1 Free query limit.
- [x] Keep transaction categorization out of a balance-snapshot import; it remains future transaction scope.

## Phase 7 Verification Notes

- Vitest now covers CSV parsing/template generation plus payload, account match, amount/date/currency, duplicate, and conflict rules; 41 frontend tests pass.
- Local Pages Functions verification passed account creation, mixed-row preview, atomic commit, import history, refreshed account state, repeat commit rejection, malformed payload `400`, and unauthenticated `401`.
- The local review fixture produced exactly `1 ready / 2 duplicates / 1 rejected`, committed one balance, and updated the dashboard total.
- Signed-in browser QA passed on `/accounts` and `/dashboard` at `1440x900` and `390x844`, including file selection, review evidence, commit, history, repeat-file review, lazy chunk loading, and responsive table containment.
- Browser checks found no console errors, horizontal page overflow, or overlapping controls.
- `npm run cf:deploy` deployed Phase 7 to `https://67e3a1ca.interactive-fire-calculator.pages.dev`.
- The live authenticated import flow passed mixed-row preview, atomic commit, import history, account/dashboard refresh to `$2,500`, repeat-commit rejection, and unauthenticated `401`.
- The deployed public FIRE route and signed-out `/accounts` gate passed desktop/mobile browser smoke with no console errors or horizontal overflow.
- Disposable local, preview/production D1, and Clerk verification records were removed after testing.
- Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

## Phase 8 Progress Checklist

- [x] Extend deterministic plan-health checks into prioritized next actions.
- [x] Include traceable plan evidence, assumptions, rationale, and uncertainty for each plan recommendation.
- [x] Add a rule-based signed-in `/reports` workspace for insights and recommendations.
- [x] Add dashboard priority insights so the highest-value actions are visible from `/dashboard`.
- [x] Add account trend observations only when active accounts have at least two distinct persisted balance dates.
- [x] Add setup prompts instead of trend claims when account history is insufficient.
- [x] Add goal recommendations for overdue goals, nearest active funding pace, and aggregate funded progress.
- [x] Add explicit method/privacy language that says insights are rule-based and use saved app data only.
- [x] Keep AI-generated summaries out of the product until privacy and safety constraints are explicit.
- [x] Keep Phase 8 frontend-only; no D1 migration or new persistence table was added.
- [x] Keep `src/lib/fire.ts` unchanged.

## Phase 8 Verification Notes

- Vitest now covers plan-health actions and the full insight rule set; 48 frontend tests pass.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 48 frontend tests, and production build.
- Local signed-out Reports gate passed at `1280x720` with no console errors or horizontal overflow.
- Local signed-in Reports passed with a disposable Clerk development user at `1280x720`, including prioritized plan actions, evidence cards, and method boundary.
- Local signed-in Dashboard passed after auth settled, showing three priority insight rows and the Reports action with no console errors or horizontal overflow.
- Local mobile Reports passed at `390x844` with no console errors or horizontal overflow.
- Public mobile FIRE route remained usable at `390x844`; the calculator and Calculate action were visible with no console errors or horizontal overflow.
- The disposable Clerk development user created for browser QA was deleted.
- `npm run cf:deploy` deployed Phase 8 to `https://fa829950.interactive-fire-calculator.pages.dev`.
- Deployed signed-out `/reports` and public mobile `/calculators/fire` smoke checks passed with no console errors or horizontal overflow.
- Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

## Phase 9 Progress Checklist

- [x] Add a shared account-data helper for D1 export, exact deletion confirmation parsing, and hard deletion of local account data.
- [x] Add authenticated `GET /api/account-data/export` with no-store JSON responses.
- [x] Add authenticated `DELETE /api/account-data` requiring `DELETE MY FINPATH DATA`.
- [x] Explicitly delete user-scoped `audit_log` rows before deleting the root `users` row because that table uses `ON DELETE SET NULL`.
- [x] Keep Clerk identity deletion out of D1 deletion and state that clearly in API/UI copy.
- [x] Add Settings privacy controls for JSON export and D1 data deletion.
- [x] Clear loaded signed-in profile, account, goal, and plan state after confirmed D1 deletion.
- [x] Add skip link, main landmark target, nav `aria-current`, mobile menu `aria-controls`, dynamic mobile menu labels, chart accessible label, and non-focusable hidden file inputs.
- [x] Lazy-load `/plans` Planning Workspace and the Recharts projection chart.
- [x] Keep public `/calculators/fire`, imports, planning, reports, and `src/lib/fire.ts` behavior unchanged.
- [x] Keep launch readiness blocked on production Clerk instance/domain and production keys.

## Phase 9 Verification Notes

- `src/accountData.test.ts` covers deletion confirmation, export shape, archived-row inclusion, parsed FIRE JSON payloads, and delete ordering.
- `npm run typecheck` passed.
- `npm test` passed with 51 frontend tests across 9 files.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 51 frontend tests, and production build.
- Production build now emits lazy chunks for `PlanningWorkspace`, `BalanceImportPanel`, and `ProjectionChart`; the main JS chunk dropped from about 756 kB to about 401 kB after lazy-loading Planning and Recharts.
- Local Pages dev browser QA passed landing, FIRE, Settings gate, signed-in Settings privacy controls, projection chart loading, and mobile FIRE/Settings at `390x844` with no console errors or horizontal overflow.
- Local signed-in API verification passed with a disposable Clerk development user:
  - profile/account/goal/plan seed returned `200/201/201/201`
  - account-data export counted profile, account, balance, goal, plan, version, FIRE input, and FIRE result rows
  - wrong deletion confirmation returned `400`
  - confirmed deletion returned `200`
  - post-delete account, goal, and plan lists returned empty arrays
  - Clerk identity deletion remained separate and the disposable Clerk user was deleted after QA
- `npm run cf:deploy` deployed Phase 9 to `https://4dfecf5e.interactive-fire-calculator.pages.dev`.
- Deployed signed-out landing, FIRE calculator, Settings gate, and mobile FIRE/Settings smoke checks passed with no console errors or horizontal overflow.
- Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

## Phase 10 Progress Checklist

- [x] Define transaction payload validation for income, expense, transfer, and adjustment rows.
- [x] Add authenticated transaction list/create/read/update/remove helpers using the existing `transactions` table.
- [x] Add authenticated Pages Functions:
  - `GET`/`POST /api/transactions`
  - `GET`/`PUT`/`DELETE /api/transactions/:id`
- [x] Scope every transaction read and write to the authenticated Clerk user.
- [x] Validate ISO transaction dates, positive integer cents, transaction types, descriptions, optional categories, optional notes, and optional owned account links.
- [x] Replace the `/transactions` placeholder with a signed-in manual ledger workspace.
- [x] Add ledger summary tiles for net cash flow, income, expenses, latest date, and transfers.
- [x] Support create, inline update, and row removal from the Transactions UI.
- [x] Keep transaction work isolated from account-balance imports until matching/categorization rules are explicit.
- [x] Keep public FIRE, Settings privacy controls, Reports insights, planning, accounts, and goals stable.
- [x] Keep `src/lib/fire.ts` unchanged.

## Phase 10 Verification Notes

- `src/transactions.test.ts` covers create/update payload parsing, invalid dates/amounts/types, nullable optional fields, empty update rejection, and summary math.
- `npm run typecheck` passed.
- `npm test` passed with 55 frontend tests across 10 files.
- `npm run build` passed with the transaction workspace included in the app bundle.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 55 frontend tests, and production build.
- Local Pages dev authenticated API verification passed with a disposable Clerk development user:
  - unauthenticated `GET /api/transactions` returned `401`
  - initial authenticated list returned empty transactions and summary
  - invalid amount returned `400`
  - account-linked create returned `201`
  - update/read/list summary returned the expected expense and net cash-flow totals
  - delete returned `200`
  - read after delete returned `404`
- Local signed-out `/transactions` browser gate passed.
- Local signed-in `/transactions` browser QA passed with a Clerk test account, including creating a manual expense row, status messaging, desktop layout, and `390x844` mobile layout.
- Browser checks found no console errors or horizontal page overflow.
- Disposable Clerk users and local D1 verification rows were removed afterward.
- `npm run cf:deploy` deployed Phase 10 to `https://82e4b4b6.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke passed for `/transactions`, `/calculators/fire`, and unauthenticated `GET /api/transactions -> 401`.
- Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

## Phase 11 Progress Checklist

- [x] Add tested transaction analytics helpers for filtering, category options, monthly cashflow, top expense categories, recent transactions, and uncategorized counts.
- [x] Add search, type, category, account, and date-range filters to `/transactions`.
- [x] Add saved/starter category suggestions and consistent uncategorized labeling for manual transactions.
- [x] Add visible-row summary math while preserving all-row ledger summaries.
- [x] Add Dashboard monthly cashflow tile and detailed cashflow panel.
- [x] Add transaction insights to Dashboard and Reports without AI summaries or external account analysis.
- [x] Keep balance CSV imports separate from transaction rows.
- [x] Keep transaction matching, account reconciliation, and transaction import automation as explicit future scope.
- [x] Keep production Clerk setup visible as the launch-critical blocker until an owned domain and production keys are configured.
- [x] Keep `src/lib/fire.ts` unchanged.

## Phase 11 Verification Notes

- `src/lib/transactionAnalytics.test.ts` covers query/type/account/category/date filtering, unlinked and uncategorized filtering, category normalization/options, and cashflow rollups.
- `src/lib/insights.test.ts` now covers negative monthly cashflow, missing income rows, top category concentration, and uncategorized cleanup insights.
- `npm run typecheck` passed.
- `npm test` passed with 63 frontend tests across 11 files.
- `npm run build` passed with the Phase 11 transaction analytics UI included.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 63 frontend tests, and production build.
- Local signed-out `/transactions` browser gate passed.
- Local signed-in `/transactions` browser QA passed with a Clerk test account, including transaction creation, category suggestions, category/search/date/account filters, empty filtered state, and clear filters.
- Local signed-in `/dashboard` browser QA passed with monthly cashflow tile, cashflow detail panel, top categories, recent rows, and transaction insights.
- Local signed-in `/reports` browser QA passed with transaction insight cards and evidence.
- Mobile QA at `390x844` passed for Transactions, Dashboard, and Reports with no console errors or horizontal overflow.
- Disposable Clerk users and local D1 verification rows were removed afterward.
- `npm run cf:deploy` deployed Phase 11 to `https://959f0a17.interactive-fire-calculator.pages.dev`.
- Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

## Phase 12: Review-first Transaction Import and Reconciliation Planning

- [x] Define a transaction CSV import contract that remains separate from account-balance snapshot imports.
- [x] Add review-first transaction import parsing with server-side row validation.
- [x] Classify rows as ready, duplicate, or rejected with clear account-link evidence.
- [x] Commit only reviewed ready rows and store transaction import history.
- [x] Keep transaction imports from mutating account balances or reconciliation snapshots.
- [x] Keep production Clerk setup visible as the launch-critical blocker until an owned domain and production keys are configured.

## Phase 13-19 Public Calculator Roadmap

- [x] Phase 13: Replace `/calculators` placeholder with a public searchable calculator hub.
- [x] Phase 13: Add shared calculator layout with H1, intro, inputs, results, explanation, FAQ, and conversion CTA.
- [x] Phase 13: Add stable public calculator routes, page titles, descriptions, canonical paths, JSON-LD, robots, and sitemap entries.
- [x] Phase 14: Add the eight core planning calculators.
- [x] Phase 15: Add the India calculator set.
- [x] Phase 16: Add the US calculator set.
- [x] Phase 17: Add durable signed-in "save result" flows that create goals, accounts, plans, or transaction-tracking drafts.
- [x] Phase 17: Preserve signed-out calculator drafts/results through sign-up and surface saved calculator-derived items on Dashboard.
- [x] Phase 18: Add calculator scale-out routes.
- [x] Phase 19: Remove internal strategy framing from public copy and group the hub by user decisions.
- [x] Phase 19: Add landing-page paths to the calculator library in the hero, ready band, footer, topbar, mobile nav, and signed-out gates.
- [x] Phase 19: Add calculator input/result help affordances, unit-aware currency labels, and per-calculator guidance.
- [x] Phase 19: Add individual expected-output tests for every calculator and edge-case coverage for zero rates, payoff loops, paycheck annualization, and balance-transfer payments.
- [x] Keep every public calculator usable without auth.
- [x] Keep `src/lib/fire.ts` unchanged.

## Phase 20-25 Calculator Value Roadmap

Detailed audit and implementation plan: `docs/CALCULATOR_VALUE_ROADMAP.md`.
Per-calculator high-standard contract: `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md`.

- Current comprehensive-calculator completion estimate: 100%. All planned calculator phases are complete for preview/development; 0% remains in the calculator roadmap. Production Clerk setup and hosted signed-in verification remain a separate launch blocker.
- [x] Phase 17: Complete durable calculator save flows before deeper calculator expansion.
- [x] Phase 20: Add code-level calculator quality/studio contracts while preserving every existing public route.
- [x] Phase 20: Add baseline visual-read and decision-check UI to calculator detail pages.
- [x] Phase 20: Add shared scenario state, chart primitives, route-specific examples, and related-calculator navigation.
- [x] Phase 21: Upgrade growth, goal, retirement, and return calculators with expandable optional schedule/detail tables for contribution/growth splits, goal funding paths, retirement corpus gaps, withdrawal runway, RMD distributions, Social Security break-even, inflation paths, and return/cashflow paths.
- [x] Phase 22: Upgrade loan, debt, home, and vehicle calculators with complete payment-by-payment amortization tables, yearly rollups, custom period views, payoff calendars, prepayment sensitivity, break-even charts, and multi-debt strategy comparison.
- [x] Phase 22: Add missing loan/mortgage calculators, including mortgage payoff, biweekly mortgage, recast, points/rate buydown, 15-vs-30, ARM, interest-only, balloon loan, closing costs, escrow, DTI, loan comparison, APR, home equity loan, FHA, VA, FHA-vs-conventional, India prepayment, India foreclosure, India balance transfer, flat-vs-reducing rate, India loan eligibility, and stamp duty/registration.
- [x] Phase 23: Upgrade income, tax, budget, and protection calculators with waterfalls, category/cashflow visuals, richer assumptions, and estimate disclaimers.
- [x] Phase 24: Preserve stable public URLs with self-canonicals, sitemap coverage, route-specific content, structured data, crawlable internal links, duplicate-content guards, and public no-auth smoke coverage.
- [x] Phase 25: Add saved scenario comparison, recent calculator history, dashboard follow-up cards, and export/share options for schedules, payoff tables, deposit tables, withdrawal tables, and summaries.
- [x] Keep internal search/acquisition strategy out of user-facing copy.
- [x] Combine calculator implementations through shared studios, not by removing or redirecting public calculator routes.
- [x] After each app deploy, record preview URL, tests, smoke routes, completed work, completion percentage, remaining percentage, and blockers.

## Phase 20 High-Standard Foundation Checkpoint

- Completed: per-calculator high-standard implementation plan in `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md`.
- Completed: `src/lib/calculatorQuality.ts` quality contracts for every current public calculator route.
- Completed: calculator detail pages now show why the calculator matters, a baseline visual read of the computed metrics, and decision checks.
- Completed: quality-contract tests ensure every current route has calculation, visual, scenario, validation, interpretation, and conversion expectations.
- Tests: `npm run typecheck` passed; `npm test` passed with 258 tests across 14 frontend files; `npm run build` passed; `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 258 frontend tests, and production build.
- Deploy: `npm run cf:deploy` deployed to `https://3c829b65.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live route smoke: `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/mortgage`, `/calculators/fire`, and `/transactions` returned `200`.
- Completion after deploy: comprehensive calculator program was 12% complete; 88% remained.
- Remaining blockers at that checkpoint: production Clerk setup was still the launch blocker; Phase 17 durable calculator save flows remained next product work; full route-specific visualizations/schedules/tax engines were still pending in Phases 20-25.

## Phase 17 Calculator-to-Account Conversion Checkpoint

- Completed: `migrations/0004_saved_calculator_results.sql` adds durable user-owned calculator result storage with calculator metadata, input/result snapshots, conversion destination, created entity references, and dashboard-friendly indexes.
- Completed: `POST /api/calculator-results` validates signed-in save requests, stores the calculator result, and safely creates downstream drafts where appropriate: goals for goal-oriented calculators, accounts for balance/liability calculators, generic plan drafts for plan-oriented calculators, and durable transaction-workflow results without mutating the ledger.
- Completed: `GET /api/calculator-results` returns signed-in saved calculator results for Dashboard and future destination surfaces.
- Completed: signed-out calculator users keep their last calculator draft/result in local storage before opening sign-up, so the result can be restored and saved after sign-in.
- Completed: Dashboard now shows saved calculator result cards with the calculator title, destination, headline metric, creation date, and a shortcut to the intended workspace.
- Completed: account-data export/delete now includes saved calculator results, and delete removes them with the rest of user-owned D1 data.
- D1 migration status: `0004_saved_calculator_results.sql` is applied locally and to both configured remote D1 databases.
- Tests before deploy: `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 261 frontend tests across 15 files, and production build.
- Deploy: `npm run cf:deploy` deployed to `https://0fe9ade0.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke: `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/mortgage`, `/calculators/fire`, and `/transactions` returned `200`.
- Live API smoke: unauthenticated `GET /api/calculator-results` returned `401 {"error":"Unauthorized"}`.
- Completion after implementation: comprehensive calculator program is 20% complete; 80% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 20-25 route-specific visualizations, schedules, tax engines, missing routes, exports, and personalization remain.

## Phase 20 Decision Studio Foundation Completion Checkpoint

- Completed: `src/lib/calculatorStudios.ts` adds shared decision-studio metadata for every calculator family while preserving every existing public route.
- Completed: calculator detail pages now include a reusable scenario lens with conservative, base, and optimistic states. Scenario results apply as temporary result lenses without replacing the user's base inputs.
- Completed: shared chart-ready primitives now cover timeline, waterfall, comparison, and amortization previews so later phases can deepen family-specific visuals without reworking the page structure.
- Completed: every calculator has a route-specific example loader and related-calculator navigation scoped to the same decision workflow.
- Completed: `src/lib/calculatorStudios.test.ts` verifies studio metadata, scenarios, chart data, examples, related routes, amortization primitives, bounded scenario values, and public-copy guardrails across every current route.
- Tests before deploy: `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 440 frontend tests across 16 files, and production build.
- Local visual smoke: Playwright CLI screenshots rendered `/calculators/sip` at `1280x720` and `/calculators/amortization` at `390x844`; full-page mobile amortization showed scenario controls, chart preview, example, decision checks, related calculators, and FAQ without visible overlap. Clerk emitted the expected development-key warning only.
- Deploy: `npm run cf:deploy` deployed to `https://2e1c808a.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke: `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/roi`, `/calculators/fire`, and `/transactions` returned `200`.
- Live API smoke: unauthenticated `GET /api/calculator-results` returned `401 {"error":"Unauthorized"}`.
- Live visual smoke: Playwright CLI screenshot rendered `/calculators/sip` at `390x844`.
- Completion after implementation: comprehensive calculator program is 32% complete; 68% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 21-25 rich family visualizations, full schedules, statutory/tax engines, missing route buildout, exports, and personalization remain.

## Phase 21 Growth, Goal, Retirement, and Return Visualizers Completion Checkpoint

- Completed: `src/lib/calculatorStudios.ts` now builds reusable detailed schedules for the Phase 21 calculator families instead of leaving them as one-number or chart-only results.
- Completed: growth and savings calculators now expose optional annual contribution/deposit, growth, cumulative deposit, and ending-balance tables for compound interest, SIP, step-up SIP, RD, FD/CD, HYSA, lumpsum, and savings-goal routes.
- Completed: retirement calculators now expose optional retirement savings, PPF, EPF, NPS, SWP withdrawal, RMD distribution, Social Security break-even, and gratuity/service-year schedules.
- Completed: return and inflation calculators now expose optional return-path, approximate XIRR cashflow, Rule of 72 milestone, and inflation path tables where a period-by-period breakdown adds value.
- Completed: calculator detail pages render these detailed breakdowns as collapsed-by-default glass panels with scroll-safe responsive tables, keeping the primary result and CTA clean.
- Completed: `src/lib/calculatorStudios.test.ts` verifies schedule coverage for Phase 21 routes, reconciles key final schedule balances to headline calculator outputs, checks savings-goal gap closure, and confirms snapshot calculators do not get unnecessary period tables.
- Tests before deploy: `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 480 frontend tests across 16 files, and production build.
- Local visual smoke: Playwright CLI screenshots rendered `/calculators/sip` desktop/full-page and `/calculators/retirement` mobile/full-page. A Chrome-driven mobile check opened the SIP schedule disclosure and confirmed it is closed by default, opens on click, renders 10 rows, keeps table overflow inside the wrapper, and keeps the document width at `390px`.
- Deploy: `npm run cf:deploy` deployed to `https://c41f598d.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke: `/`, `/calculators`, `/calculators/sip`, `/calculators/retirement`, `/calculators/xirr`, `/calculators/fire`, and `/transactions` returned `200`.
- Live API smoke: unauthenticated `GET /api/calculator-results` returned `401 {"error":"Unauthorized"}`.
- Live expanded-table smoke: `/calculators/sip` mobile schedule disclosure was closed by default, opened on click, rendered 10 rows, kept internal table overflow at `680px`, and kept the document width at `390px`.
- Completion after implementation: comprehensive calculator program is 48% complete; 52% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 22-25 loan/debt/home visualizers, full monthly amortization schedules, statutory/tax engines, missing routes, exports, and personalization remain.

## Phase 22 Loan, Debt, Home, and Vehicle Visualizers Completion Checkpoint

- Completed: `src/lib/seoCalculators.ts` now includes 82 public calculator routes, adding the Phase 22 borrowing backlog: mortgage payoff, biweekly mortgage, recast, points/rate buydown, 15-vs-30, ARM, interest-only mortgage, balloon loan, closing costs, escrow, DTI, loan comparison, APR, home equity loan, FHA, VA, FHA-vs-conventional, India home-loan prepayment/foreclosure/balance transfer, flat-vs-reducing rate, India loan eligibility, and stamp duty/registration.
- Completed: `src/lib/calculatorStudios.ts` now builds collapsed-by-default detail tables for loan/EMI/mortgage amortization, debt payoff, true multi-debt snowball vs avalanche, balance transfer, refinance, mortgage points, recast, loan comparison, prepayment, balloon, biweekly, interest-only, PMI, rent-vs-buy, lease-vs-buy, closing-cost, escrow, DTI, APR, loan eligibility, and stamp duty routes.
- Completed: `/calculators/amortization` now produces a full 360-row monthly payment schedule with payment number, year, payment, principal, interest, ending balance, cumulative interest, year-close notes, custom period views, and CSV export from the expandable schedule panel.
- Completed: calculator detail pages now include a reusable schedule toolbar for first-year, first-five-year, final-year, and full-schedule views on long tables. CSV export downloads the complete table.
- Completed: `debt-snowball-avalanche` now accepts multiple named debts with separate balances, APRs, minimum payments, and extra payoff budget instead of using a single weighted balance.
- Completed: `public/sitemap.xml` includes the new Phase 22 calculator routes.
- Completed: `src/lib/seoCalculators.test.ts` locks individual expected outputs for all 82 calculator routes; `src/lib/calculatorStudios.test.ts` verifies Phase 22 schedule coverage, full amortization row count, refinance break-even rows, and prepayment comparison rows.
- Tests before deploy: `npm run typecheck` passed; `npm test` passed with 664 frontend tests across 16 files; `npm run build` passed; `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 664 frontend tests, and production build.
- Deploy: `npm run cf:deploy` deployed to `https://ca04df60.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke: `/`, `/calculators`, `/calculators/amortization`, `/calculators/home-loan-prepayment`, `/calculators/mortgage-payoff`, `/calculators/fire`, and `/transactions` returned `200`.
- Live API smoke: unauthenticated `GET /api/calculator-results` returned `401 {"error":"Unauthorized"}`.
- Live sitemap smoke: `sitemap.xml` includes `mortgage-payoff`, `home-loan-prepayment`, `debt-to-income`, and `fha-vs-conventional`.
- Completion after implementation: comprehensive calculator program is 66% complete; 34% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 25 personalization/history/follow-up loops remain.

## Phase 23 Income, Tax, Budget, and Protection Deepening Completion Checkpoint

- Completed: `src/lib/seoCalculators.ts` now uses richer route-specific engines for India old-vs-new income tax, US single-filer income-tax estimates, paycheck take-home, salary take-home, and Roth-vs-traditional IRA comparison instead of generic effective-rate shortcuts.
- Completed: India income tax now shows simplified AY 2026-27 old/new regime slab estimates with deductions, rebate handling, 4% cess, old/new tax, lower-regime net income, and explicit planning-estimate assumptions.
- Completed: US income tax now shows a simplified 2026 single-filer federal bracket estimate with the 2026 standard deduction and a clearly separated state/local placeholder rate.
- Completed: paycheck and salary calculators now model pre-tax/post-tax deductions, withholding/payroll deductions, annual and recurring take-home, and taxable wages/pay.
- Completed: `src/lib/calculatorStudios.ts` now builds collapsed-by-default detail tables for budget cashflow, emergency runway, life-insurance protection gap, India tax comparison, US bracket estimate, paycheck gross-to-net, salary gross-to-net, HRA, GST, TDS, capital gains, and Roth-vs-traditional routes.
- Completed: the shared calculator detail UI already keeps these tables optional through collapsed glass panels, responsive table wrappers, period filters for long schedules, and CSV export where table data exists.
- Completed: `src/lib/calculatorQuality.ts` codifies the new India tax, US tax, paycheck/salary, and Roth/traditional calculation and visual expectations.
- Completed: `src/lib/seoCalculators.test.ts` locks the changed expected outputs and adds route-specific India/US tax assertions; `src/lib/calculatorStudios.test.ts` verifies Phase 23 schedule coverage plus old/new regime rows, US bracket rows, paycheck/salary recurring views, emergency runway, budget annual pace, and protection gap rows.
- Tests before deploy: `npm run typecheck` passed; `npm test` passed with 682 frontend tests across 16 files; `npm run build` passed; `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 682 frontend tests, and production build.
- Deploy: `npm run cf:deploy` deployed to `https://62099a61.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke: `/`, `/calculators`, `/calculators/income-tax-india`, `/calculators/income-tax-us`, `/calculators/paycheck`, `/calculators/fire`, and `/transactions` returned `200`.
- Live API smoke: unauthenticated `GET /api/calculator-results` returned `401 {"error":"Unauthorized"}`.
- Live sitemap smoke: `sitemap.xml` includes `income-tax-india`, `income-tax-us`, `paycheck`, `life-insurance-needs`, and `calculators/fire`.
- Completion after implementation: comprehensive calculator program is 80% complete; 20% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 24 content/structured-data hardening and Phase 25 personalization/history/follow-up loops remain.

### Phase 24 completion checkpoint

- Shipped formula-aware public content for all 82 calculator routes, including route-specific descriptions, explanations, visible assumptions, input guidance, interpretation FAQs, and shared-engine route distinctions.
- Converted calculator hub cards and related-calculator navigation into real crawlable links while preserving SPA navigation and the existing glass-panel design.
- Extracted route metadata into tested utilities covering unique titles/descriptions, self-canonicals, public/private robots rules, Open Graph/Twitter tags, complete calculator-hub schema, free WebApplication offers, and visible FAQ schema.
- Added content-quality, near-duplicate, metadata, structured-data, sitemap completeness, and DOM metadata replacement tests. Frontend coverage is now 852 tests across 18 files.
- Added `npm run smoke:calculators -- <base-url>` and verified all 84 public calculator-library paths without authentication.
- Verification passed: `npm run typecheck`, `npm test`, `npm run build`, and `./scripts/test_all.sh` with 79 Python tests plus 852 frontend tests.
- Local desktop/mobile browser QA passed for the hub, India tax, US tax, related-link navigation, schema, collapsed detail tables, console state, and horizontal overflow.
- Deploy: `npm run cf:deploy` deployed to `https://45c8e45c.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live smoke: all 84 public calculator-library paths passed without auth; `/`, `/calculators/fire`, and `/transactions` returned `200`; unauthenticated `/api/calculator-results` returned `401`; live mobile amortization metadata/schema/link/disclosure/overflow checks passed.
- Completion after implementation: comprehensive calculator program is 92% complete; 8% remains.
- Remaining blockers: production Clerk setup is still the launch blocker; Phase 25 saved comparisons, history, follow-ups, export/share, and final flow QA remain.

### Phase 25 completion checkpoint

- Added a collapsed-by-default comparison drawer to every public calculator with conservative, base, and optimistic headline results and explicit changed-input labels.
- Added deterministic one-input sensitivity analysis for every calculator; the top outcome drivers are ranked by headline-result movement in a bounded 10% test range.
- Added recent signed-in history on calculator routes using the existing `saved_calculator_results` records. Selecting a run compares it with the current result; loading its inputs remains an explicit separate action.
- Added dashboard follow-up labels and actions based on whether a saved result already created its goal, account, or plan destination. Transaction-oriented results direct users to real cashflow tracking without inventing ledger rows.
- Added input-only share links with route-safe parsing, input clamping, scenario restoration, and no account data. Added scenario-summary CSV export while retaining existing schedule/detail CSV export.
- Preserved lazy loading by splitting the lightweight dashboard follow-up helper from the calculator engagement engine; the main app chunk stayed near its Phase 24 size.
- Added 167 Phase 25 engagement tests covering every calculator's finite sensitivity output and share-link round trip plus export and follow-up behavior. Frontend coverage is now 1,019 tests across 19 files.
- Verification passed: `./scripts/test_all.sh` with 79 Python tests, TypeScript typecheck, 1,019 frontend tests, and production build.
- Local browser QA passed desktop mortgage comparison/drivers, shared SIP restoration, copy/export actions, mobile layout, closed schedules, console state, and horizontal overflow.
- Deploy: `npm run cf:deploy` deployed to `https://bd0e9f28.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live smoke: all 84 public calculator-library paths passed without auth; live shared SIP restoration and mobile comparison drawer checks passed; `/`, `/calculators/fire`, and `/dashboard` returned `200`; unauthenticated `/api/calculator-results` returned `401`.
- Completion after implementation: comprehensive calculator program is 100% complete; 0% remains.
- Remaining launch blocker: create/configure the Clerk production instance/domain and production keys, then verify the real hosted signed-in flow.

## Phase 12-19 Verification Notes

- `migrations/0003_transaction_import_history.sql` is applied locally and to both remote D1 databases.
- Remote `0003` was applied with `wrangler d1 execute --file` and recorded in `d1_migrations` because `wrangler d1 migrations apply --remote` hit a Cloudflare query endpoint authorization error even though direct D1 execute succeeded.
- `npm run typecheck` passed.
- `npm test` passed with 198 frontend tests across 14 files.
- `npm run build` passed with `CalculatorLibrary`, `TransactionImportPanel`, `BalanceImportPanel`, `PlanningWorkspace`, and `ProjectionChart` split into lazy chunks.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 198 frontend tests, and production build.
- Local browser QA passed for `/`, calculator hub, SIP calculator, mortgage calculator, balance transfer calculator, FIRE route, and signed-out Transactions gate at desktop and `390x844` mobile widths with no console errors, no horizontal overflow, and no visible internal strategy copy.
- `npm run cf:deploy` deployed Phase 19 to `https://afdbe589.interactive-fire-calculator.pages.dev`.
- Live browser smoke passed for `/`, `/calculators`, `/calculators/sip`, `/calculators/mortgage`, `/calculators/fire`, and signed-out `/transactions` at mobile width with no console errors or horizontal overflow.
- Live API smoke returned unauthenticated `401` for `GET /api/imports/transactions`, `POST /api/imports/transactions/preview`, and `POST /api/imports/transactions/commit`.

## Post-Phase-25 Payoff and Visual Quality Checkpoint

- Completed: loan, EMI, mortgage, amortization, debt-payoff, home-loan prepayment/foreclosure, and mortgage recast routes now expose zero-default additional monthly and yearly payments where they materially change the payoff.
- Completed: payoff results show the required payment, accelerated payoff period, time saved, total interest, interest saved, and total paid; monthly schedules and charts use the same simulation and apply yearly extras every 12th payment.
- Completed: compound interest, SIP, step-up SIP, RD, EPF, NPS, retirement, 401(k), and HYSA routes now support a zero-default additional yearly contribution with reconciled projections and schedules.
- Completed: optional payment and contribution fields are collapsed by default to keep calculator input panels clean.
- Completed: the landing page now has a quieter hero, direct calculator paths, three solid decision-family bands, and a focused private-workspace CTA. Desktop navigation exposes four frequent routes and groups the rest in an accessible workspace dropdown; mobile uses a collapsed workspace disclosure.
- Completed: `DESIGN.md` now defines the vivid precision color roles, selective glass treatment, navigation grouping, and optional calculator-input contract for both light and dark modes.
- Verification: dedicated formula and schedule tests cover zero defaults, route coverage, payoff acceleration, interest savings, yearly payment timing, prepayment combinations, and yearly investment top-ups.
- Verification: `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 1,146 frontend tests across 20 files, and production build. Desktop and `390x844` browser QA passed the landing page, light/dark palette tokens, desktop dropdown, collapsed mobile workspace group, optional mortgage payments, accelerated result metrics, and horizontal-overflow checks.
- Deploy: `npm run cf:deploy` deployed to `https://baadb7c6.interactive-fire-calculator.pages.dev`; the branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live smoke: all 84 public calculator-library paths passed without authentication. Hosted landing and mortgage checks confirmed the new navigation, final theme tokens, collapsed optional payments, default 360-month mortgage path, and no horizontal overflow.
- Product completion remains 100% for the planned calculator roadmap. Remaining launch work is unchanged: production Clerk domain/instance/keys and hosted signed-in verification.

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
