# Financial Platform Handoff

## Phase 26 active handoff — Savings Goal excellence pass

- Date: August 9, 2026.
- Completed calculators: `/calculators/compound-interest` and `/calculators/savings-goal` (2 of 82).
- Next calculator: `/calculators/net-worth`.
- Remaining high-standard calculator passes: 80.
- Engine: `src/lib/savingsGoalCalculator.ts`, formula version `finpath-savings-goal-v2`.
- Route UI: `src/SavingsGoalCalculator.tsx`, isolated by slug before the generic calculator detail.
- Research and formula contract: `docs/calculators/savings-goal.md`.
- Preserve: the stable Savings Goal URL/title/default inputs, the legacy shared `savings-goal` formula and `$428.600434` registry oracle, SIP Goal’s `54660.927689` oracle, all public routes, and `src/lib/fire.ts`.
- Corrected route oracle: `425.28168253155314` for a $100,000 goal, $10,000 current savings, 10 years, and an 8% nominal rate compounded monthly with month-end contributions.
- Shipped contract: exact inverse solve, nominal/APY, independent frequencies/timing, fractional terms, current-plan and catch-up analysis, contribution step-up/top-up, balance fee, target inflation/basis, milestones, isolated scenarios, target/deadline sensitivity, true runway, reconciling schedules, locale/currency display, v1/v2 links, route draft, raw CSV, save values, resolved Goal target, precise Goal deadline, and saved-run reload.
- Currency boundary: calculator/share/export support seven currencies; Goal creation is visibly limited to USD until the Goals schema/API/UI store currency.
- Deferred: Goal currency migration, taxes, live APY/CPI/FX, exact product ledgers, tiered/transaction fees, Monte Carlo, arbitrary cash-flow ledgers, and multi-goal optimization.
- Local verification: 79 Python tests, 1,234 frontend tests across 24 files, TypeScript, production build, 84-route public smoke, direct Savings Goal/SIP Goal/Compound/FIRE `200`, desktop/mobile/theme/forced-colors/reduced-motion browser QA, and no pending remote D1 migrations.
- Verification complete: implementation committed and pushed, Cloudflare preview deployed, all 84 calculator routes passed, Savings Goal/SIP Goal/Compound/FIRE returned `200`, and the unauthenticated save API returned `401`.
- Production Clerk remains a separate launch blocker and is not part of this public calculator pass.
- Implementation commit: `854bb44` (`Build savings goal excellence experience`), pushed to `origin/codex/cloudflare-pages-theme-plan`.
- Preview verified: `https://e25810bb.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Full gate: 79 Python tests, TypeScript, 1,234 frontend tests across 24 files, and production build.
- Live gate: all 84 public calculator paths passed without authentication; Savings Goal, SIP Goal, Compound Interest, and FIRE returned `200`; unauthenticated `/api/calculator-results` returned `401`; deployed desktop/mobile browser checks had no console errors, failed resources, overlays, or horizontal overflow.
- Compound Interest follow-up: commit `6b18058` moves contribution and compounding cadence into Quick Start, visibly reconciles `$10,000 × 120` monthly deposits versus `$10,000 × 10` annual deposits, removes the zero-inflation buying-power output, and stacks panels at `1180px`. Full verification passed with 1,235 frontend tests; all 84 routes and direct Compound/Savings Goal/SIP Goal/FIRE checks passed at `https://5ac16caf.interactive-fire-calculator.pages.dev`, with the save API correctly returning `401` signed out.

Last updated: August 9, 2026

This document captures the current product direction, technical context, current repo state, and next implementation plan for a fresh coding session.

## Executive Summary

The product scope has expanded. The FIRE calculator is no longer the whole product. It should become the first planning module inside a comprehensive personal financial tracker and planner website.

The target product is a full personal finance platform where individual users can create accounts, store financial data, track goals, save plans, and revisit progress over time. The FIRE calculator remains important, but it should be treated as an initial calculator module inside a broader logged-in financial dashboard.

## Current Repository State

- Branch: `codex/cloudflare-pages-theme-plan`
- Remote branch: `origin/codex/cloudflare-pages-theme-plan`
- Current app stack: React, TypeScript, Vite
- Deployment target: Cloudflare Pages
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview from this branch: `https://5ac16caf.interactive-fire-calculator.pages.dev`
- Existing draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`

Recent commits on this branch:

- `d456c59 Create financial platform shell`
- `dbd158e Add financial platform handoff context`
- `98723ac Replace stress ending hero metric`
- `2282784 Refine calculator landing experience`
- `2e1ac23 Add guided retirement assumptions`

Phase 1 Product Shell and IA is complete. Phase 2 has a provider-ready Clerk auth shell and Pages Function identity endpoint. Clerk development credentials are wired locally and into Cloudflare Pages preview secrets, but real production auth is blocked until a Clerk production instance/domain is configured. Phases 3 through 25 are complete for preview/development. The financial tracker, goals, versioned planning, reviewed imports, deterministic insights, privacy controls, public calculator library, durable calculator saves, decision studios, comprehensive optional schedules, content/metadata hardening, side-by-side comparison, deterministic outcome drivers, recent history, dashboard follow-ups, and export/share loop are active. A post-roadmap review now organizes the 82 exact calculator routes into 8 user-facing decision toolkits and applies the precision-led light/dark visual system in `PRODUCT.md` and `DESIGN.md`. The calculator roadmap is 100% complete; production Clerk configuration and hosted signed-in verification are the remaining launch-critical work.

## Current Code Shape

Production target:

- `src/` contains the TypeScript React app.
- `PRODUCT.md` contains the audience, product purpose, voice, principles, and anti-references.
- `DESIGN.md` contains the current precision-led light/dark visual system and component rules.
- `public/assets/finpath-product-hero.jpg` is the generated landing product hero asset.
- `src/auth.tsx` contains the Clerk browser auth boundary and user identity projection.
- `src/lib/fire.ts` contains the deterministic FIRE calculation engine.
- `src/lib/fire.test.ts` contains Vitest coverage for the TypeScript model.
- `src/PlanningWorkspace.tsx` contains the signed-in plan library, explicit imports, history, and comparison UI.
- `src/ProjectionChart.tsx` lazy-loads the Recharts projection visualization for the FIRE calculator results view.
- `src/lib/planWorkspace.ts` and `src/lib/planHealth.ts` contain tested import and deterministic health rules.
- `src/lib/insights.ts` contains the deterministic, evidence-linked recommendation rules used by Reports and Dashboard.
- `src/lib/transactionAnalytics.ts` contains transaction filters, category suggestions, monthly cashflow rollups, top expense category summaries, recent-row summaries, and uncategorized counts.
- `src/BalanceImportPanel.tsx` contains the lazy-loaded CSV review, commit, template, and history UI.
- `src/lib/balanceCsv.ts` contains bounded local CSV parsing and template generation.
- `src/TransactionImportPanel.tsx` contains the lazy-loaded transaction CSV review, commit, template, and history UI.
- `src/lib/transactionCsv.ts` contains bounded local transaction CSV parsing and template generation.
- `src/CalculatorLibrary.tsx` contains the public calculator hub and shared calculator detail layout.
- `src/lib/calculatorToolkits.ts` maps every exact calculator route into 1 of 8 user-facing decision toolkits.
- `src/lib/seoCalculators.ts` contains the tested public calculator registry and formula engine.
- `src/lib/calculatorStudios.ts` contains decision-studio metadata, scenario values, chart primitives, route-specific examples, and related-calculator rules.
- `functions/api/calculator-results/index.ts` and `functions/_lib/calculatorResults.ts` contain the authenticated calculator result save/list contract and downstream goal/account/plan draft mapping.
- `docs/CALCULATOR_VALUE_ROADMAP.md` contains the per-calculator value audit, shared studio plan, visualization inventory, and Phase 20-25 roadmap.
- `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md` contains the strict per-calculator implementation standard that keeps each route from shipping as a thin formula page.
- `docs/CALCULATOR_LIBRARY_REVIEW.md` records the consolidation review, overlap decisions, route-retention standard, and UI/theme review.
- `docs/PRODUCTION_AUTH_RUNBOOK.md` records the fail-closed production domain, Clerk, Cloudflare secret, deployment, and verification process.
- `scripts/check_production_auth.mjs` verifies production configuration and hosted signed-out behavior without printing key values.
- `scripts/deploy_production.sh` refuses unsafe branches or development-key bundles before a production Pages deployment.
- `functions/api/health.ts` contains a Cloudflare Pages Function health endpoint.
- `functions/api/me.ts` contains the Clerk-backed Pages Function identity endpoint.
- `functions/api/profile.ts` contains the D1-backed authenticated profile endpoint.
- `functions/api/plans/index.ts` and `functions/api/plans/[id].ts` contain D1-backed authenticated FIRE plan endpoints.
- `functions/api/plans/[id]/versions.ts` and `functions/api/plans/[id]/versions/[versionNumber].ts` expose user-scoped immutable history.
- `functions/api/accounts/` contains D1-backed authenticated financial account and balance endpoints.
- `functions/api/imports/account-balances/` contains authenticated import history, preview, and commit endpoints.
- `functions/api/imports/transactions/` contains authenticated transaction import history, preview, and commit endpoints.
- `functions/api/account-data/export.ts` and `functions/api/account-data/index.ts` contain authenticated account data export and delete endpoints.
- `functions/api/transactions/index.ts` and `functions/api/transactions/[id].ts` contain authenticated transaction list, create, read, update, and remove endpoints.
- `functions/api/goals/` contains D1-backed authenticated goal endpoints.
- `functions/api/dashboard.ts` contains the authenticated account and goal summary endpoint.
- `functions/_lib/persistence.ts` centralizes D1 binding checks and user/profile creation.
- `functions/_lib/firePlans.ts` centralizes FIRE plan persistence, payload validation, versioning, and archival.
- `functions/_lib/accounts.ts` centralizes financial account, balance, and summary validation/persistence.
- `functions/_lib/balanceImports.ts` centralizes account matching, row validation, duplicate/conflict review, and atomic import commits.
- `functions/_lib/transactionImports.ts` centralizes transaction row validation, duplicate review, and atomic import commits without account-balance mutation.
- `functions/_lib/accountData.ts` centralizes authenticated user-data export and deletion behavior.
- `functions/_lib/transactions.ts` centralizes transaction validation, account ownership checks, CRUD, and summary behavior.
- `functions/_lib/goals.ts` centralizes goal validation, persistence, progress, deadline, and summary behavior.
- `functions/_lib/` contains shared Pages Function helpers for JSON responses and Clerk session validation.
- `migrations/` contains D1 SQL migrations.
- `public/_redirects` handles SPA routing.
- `wrangler.toml` configures the Cloudflare Pages project.
- `dist/` is generated output.

Legacy reference:

- `app.py`, `project/`, `templates/`, `static/`, and Python tests remain as the old Flask/Jinja app and parity/reference harness.
- The legacy Flask app should not be deployed to Cloudflare Pages.

Local scripts:

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
./scripts/test_all.sh
npm run cf:deploy
```

Run legacy Flask app:

```bash
APP_TARGET=legacy ./scripts/run_local.sh
```

## Current Product Pivot

Old direction:

- Interactive FIRE calculator hosted on Cloudflare Pages.

New direction:

- Comprehensive financial tracker and planner with account creation, persisted financial data, goals, plans, and planning modules.

FIRE calculator role:

- First calculator/planning module.
- Public demo capability for unauthenticated users.
- Saved FIRE plans for authenticated users.
- One part of a larger planning workspace.

## Current Phase Status

Phase 1 is complete:

- `/` is a public landing page for the broader financial platform.
- `/calculators/fire` contains the dedicated FIRE calculator module.
- Placeholder app-shell routes exist for Dashboard, Accounts, Transactions, Goals, Plans, Calculators, Reports, and Settings.
- FIRE calculator core inputs and `Calculate` are visible in the first viewport on desktop and mobile QA sizes.
- Advanced FIRE assumptions are behind progressive disclosure.
- The existing FIRE engine in `src/lib/fire.ts` remains intact.

Current Phase 2 state:

- Clerk was selected after comparing current Clerk, Auth0, and Better Auth docs.
- `@clerk/react` is installed and wraps the app when `VITE_CLERK_PUBLISHABLE_KEY` is present.
- Landing/topbar/mobile auth actions use real Clerk sign-up, sign-in, and sign-out controls when configured.
- Authenticated routes are gated when signed out or when auth env is missing.
- `/calculators/fire` remains public as the unauthenticated demo.
- Signed-in profile basics are limited to Clerk identity fields.
- `GET /api/me` validates Clerk sessions in Pages Functions and returns only `userId`, `sessionId`, optional `orgId`, and optional `orgRole`.
- FIRE plan saves are local browser drafts when signed out and account-backed D1 plans when signed in.
- Clerk CLI is linked to app `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) with development instance `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`.
- Local ignored env files are present: `.env.local` and `.dev.vars`.
- Cloudflare Pages preview secrets include `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- Cloudflare Pages production secrets are intentionally empty until Clerk production keys exist.
- `clerk doctor --spotlight` reports no production instance configured.
- `clerk deploy status` reports production deployment is `not_started` and requires `clerk deploy` with human/domain setup.

Current Phase 4 state:

- Manual financial accounts for assets and liabilities are stored in D1 behind Clerk-authenticated Pages Functions.
- Users can create, read, update, and archive accounts.
- Users can record account balances and read recent balance history.
- `/dashboard` shows signed-in net worth, assets, liabilities, active account count, and recent account balances from D1.
- `/accounts` includes the signed-in account creation form, account cards, balance recording forms, and recent balance rows.
- Local Pages dev API verification passed for unauthenticated `401`, account create/list/read, balance add/history, dashboard summary, and account archival.
- Browser QA passed for signed-in `/dashboard` and `/accounts` at `1280x720` and `390x844` with no console errors or horizontal overflow.
- `./scripts/test_all.sh` passed before deploy.
- Deployed preview API verification passed at `https://5d15bc5c.interactive-fire-calculator.pages.dev`.
- Deployed signed-out `/dashboard` browser gate smoke passed with no console errors or horizontal overflow.
- Disposable D1 rows and Clerk development users created during verification were removed afterward.
- Goal tracking remains isolated from account and plan writes.

Current Phase 5 state:

- Users can create, read, update, and soft-archive goals behind Clerk-authenticated Pages Functions.
- Goal types cover retirement, emergency funds, debt payoff, home, education, travel, and custom goals.
- Goals track target/current amounts, target dates, and active, paused, or completed status.
- `/goals` provides creation, progress/status updates, deadline context, and archival.
- `/dashboard` combines account summaries with aggregate goal funding, active/overdue counts, and the next target.
- Local API lifecycle verification and signed-in desktop/mobile browser QA passed without console errors or horizontal overflow.
- Goal unit coverage brings the Vitest suite to 19 passing tests.
- FIRE calculation behavior and saved plan writes remain unchanged.
- The Phase 5 build is deployed at `https://06ad2b4d.interactive-fire-calculator.pages.dev`; its authenticated goal lifecycle and dashboard aggregation passed live API checks.
- Disposable Clerk and D1 verification data was removed from local, preview, and production stores afterward.

Current Phase 6 state:

- `/plans` is a complete signed-in workspace for multiple plans and immutable labeled versions.
- Saves use explicit plan IDs and optimistic concurrency; stale expected-version writes return `409`.
- Users can preview and undo profile age plus selected account or retirement-goal imports.
- Account import rules require active assets, dated balances, and the profile currency; retirement-goal targets stay benchmarks rather than silently becoming final-value assumptions.
- Scenario configurations and seed provenance are stored in each immutable snapshot.
- Historical versions can be loaded and two selected versions can be compared by health, portfolio, annual spending, and scenario count.
- Deterministic health explanations cover funding gap, spending coverage, ending balance, and calculator warnings without changing the FIRE engine.
- Local Pages Function lifecycle tests and signed-in desktop/mobile browser QA passed with no console errors or horizontal overflow.
- The existing D1 schema was sufficient; no new migration was required.
- Phase 6 is deployed at `https://f047c87a.interactive-fire-calculator.pages.dev`; live version APIs and signed-out desktop/mobile routes passed verification and disposable data was removed.
- Hosted signed-in browser verification still requires the Clerk production instance/domain because the current development instance is localhost-only for browser sign-in.

Current Phase 7 state:

- `/accounts` supports generated templates and review-first account-balance CSV imports.
- CSV parsing happens locally; normalized row fields are revalidated in authenticated Pages Functions.
- Every row is classified as ready, duplicate, or rejected with account/date/amount/currency evidence.
- Commit repeats validation and atomically writes approved balances plus a `balance_imports` audit record.
- Import history, account cards, net worth, and dashboard totals refresh after commit.
- Migration `0002_balance_import_history.sql` is applied locally and to both remote D1 databases.
- Files are bounded to 256 KB/500 rows. Raw files are not retained, and R2/Queues remain unnecessary for this synchronous path.
- Transaction categorization is deliberately outside the balance-snapshot contract.
- Unit, local authenticated API, and signed-in desktop/mobile browser verification pass; `npm audit` reports zero vulnerabilities.
- Phase 7 is deployed at `https://67e3a1ca.interactive-fire-calculator.pages.dev`; the live import lifecycle and public/signed-out routes passed verification and disposable data was removed.
- Hosted signed-in browser verification still requires the Clerk production instance/domain because the current development instance is localhost-only for browser sign-in.

Current Phase 8 state:

- `/reports` is a signed-in workspace for deterministic insights and recommendations.
- Plan health now emits prioritized next actions with evidence, assumptions, rationale, and uncertainty language.
- Dashboard surfaces the top three priority insights so recommendations are visible from the signed-in home view.
- Account trends are shown only when persisted balance history has at least two distinct dated snapshots; otherwise setup prompts explain what data is missing.
- Goal recommendations cover overdue targets, nearest active funding pace, and aggregate funded progress with explicit limitations.
- The method boundary states that Phase 8 uses saved app data and rule-based logic only; no AI summaries, external account analysis, or new persistence were added.
- `src/lib/fire.ts` remains unchanged.
- Phase 8 is deployed at `https://fa829950.interactive-fire-calculator.pages.dev`; local signed-in Reports/Dashboard QA and deployed signed-out/public smoke checks passed.
- Hosted signed-in browser verification still requires the Clerk production instance/domain because the current development instance is localhost-only for browser sign-in.

Current Phase 9 state:

- `/settings` includes authenticated profile defaults plus privacy controls for account-data export and account-data deletion.
- `GET /api/account-data/export` returns a user-scoped D1 export covering identity row, profile, accounts, balances, goals, plans, plan versions, FIRE payloads, assumptions, audit rows, balance imports, and transactions.
- `DELETE /api/account-data` requires the exact phrase `DELETE MY FINPATH DATA`, deletes D1-owned data in dependency order, and explicitly does not delete the Clerk identity.
- Route accessibility was hardened with a skip link, main landmark target, active navigation states, mobile menu controls, inert hidden file inputs, and chart semantics.
- The Planning workspace, Balance Import panel, and projection chart are lazy-loaded to reduce the main Vite bundle.
- Local signed-in API lifecycle verification passed for export, wrong-confirmation rejection, correct deletion, post-delete empty account/goal/plan state, and disposable Clerk user cleanup.
- Local and deployed signed-out desktop/mobile smoke checks passed with no console errors or horizontal overflow.
- `./scripts/test_all.sh` passed before deploy.
- Phase 9 is deployed at `https://4dfecf5e.interactive-fire-calculator.pages.dev`.
- Hosted signed-in browser verification still requires the Clerk production instance/domain because the current development instance is localhost-only for browser sign-in.

Next recommended phase:

- Complete production Clerk setup and hosted signed-in verification for launch readiness.

Current Phase 10 state:

- `/transactions` is a signed-in manual ledger workspace for income, expenses, transfers, and adjustments.
- `GET`/`POST /api/transactions` and `GET`/`PUT`/`DELETE /api/transactions/:id` are user-scoped behind Clerk-authenticated Pages Functions.
- Transaction validation covers ISO dates, positive integer cents, transaction types, descriptions, optional categories, optional notes, and optional active owned account links.
- The ledger shows net cash flow, income, expenses, latest transaction date, and transfer totals.
- Users can create unlinked transactions, optionally attach active owned accounts, edit saved rows inline, and remove rows.
- Balance CSV imports remain separate from transactions; no categorization or reconciliation automation has been added yet.
- Account-data deletion clears loaded transaction state in the SPA after confirmed D1 deletion.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 55 frontend tests, and production build.
- Unit tests, local authenticated API verification, signed-out browser gate checks, and signed-in desktop/mobile browser QA passed with disposable Clerk/local D1 data removed afterward.
- Phase 10 is deployed at `https://82e4b4b6.interactive-fire-calculator.pages.dev`; live HTTP smoke passed for `/transactions`, `/calculators/fire`, and unauthenticated `GET /api/transactions -> 401`.
- `src/lib/fire.ts` remains unchanged.

Current Phase 11 state:

- `/transactions` includes search, type, category, account, and date-range filters over the signed-in manual ledger.
- Category entry is polished with starter/saved suggestions and consistent uncategorized labeling.
- Transaction analytics live in `src/lib/transactionAnalytics.ts` with tests for filtering, category options, cashflow rollups, top categories, recent rows, and uncategorized counts.
- `/dashboard` includes monthly cashflow context with income, expenses, net, row count, top expense categories, and recent manual transactions.
- `/reports` includes deterministic transaction insights for missing income rows, negative monthly cashflow, top expense categories, and uncategorized cleanup.
- Balance CSV imports remain separate from transactions; Phase 11 does not add transaction import, matching, or reconciliation automation.
- Local signed-out gate checks, signed-in desktop/mobile transaction filtering, dashboard cashflow, and reports transaction insight browser QA passed with no console errors or horizontal overflow.
- Disposable Clerk and local D1 verification data was removed afterward.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 63 frontend tests, and production build.
- Phase 11 is deployed at `https://959f0a17.interactive-fire-calculator.pages.dev`.
- Hosted signed-in browser verification still requires the Clerk production instance/domain because the current development instance is localhost-only for browser sign-in.
- `src/lib/fire.ts` remains unchanged.

Current Phase 3 state:

- D1 preview database exists: `finpath-preview` (`0dbad68e-7493-452f-8504-98d4c61ee5da`).
- D1 production database exists: `finpath-production` (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`).
- `wrangler.toml` binds both databases as `DB`.
- `migrations/0001_initial_financial_platform_schema.sql` creates the initial relational schema.
- The first migration has been applied locally, to preview D1, and to production D1.
- Shared Pages Function auth helpers exist in `functions/_lib/`.
- `GET` and `PUT /api/profile` create/read/update the signed-in user's basic profile in D1.
- `GET`/`POST /api/plans` and `GET`/`PUT`/`DELETE /api/plans/:id` create/list/read/version/archive signed-in user FIRE plans in D1.
- The FIRE calculator save panel uses account-backed plan storage when signed in and browser localStorage drafts when signed out.
- The Settings route includes a D1-backed profile form for display name, household name, currency, birth year, and target retirement age.
- Local Pages dev API verification passed with a disposable Clerk development user token for profile read/update, plan create/list/read/update/delete, unauthenticated `401`, and archived-plan `404`.
- Deployed preview API verification passed at `https://0fe386db.interactive-fire-calculator.pages.dev`; disposable D1 rows and the temporary Clerk development user were removed afterward.
- Browser smoke checks passed for signed-out `/calculators/fire` and `/settings` at `1280x720` and `390x844` with no console errors or horizontal overflow.

## Target Product Vision

Build a personal finance planning platform where users can:

- create accounts and sign in
- save a financial profile
- track assets, liabilities, income, expenses, and goals
- store and compare financial plans
- model FIRE and retirement scenarios
- track goal progress over time
- update assumptions as life changes
- eventually import data from CSV or financial account connections

The product should feel like a practical financial command center, not a marketing landing page and not a one-off calculator.

## Target Information Architecture

For authenticated users:

- Dashboard
- Accounts
- Transactions
- Goals
- Plans
- Calculators
- Reports
- Settings

For unauthenticated users:

- Public landing page
- Sign in / create account
- Browse public calculators
- Product feature overview
- Privacy/security explanation

Calculator modules:

- FIRE calculator
- Retirement income planner
- Emergency fund calculator
- Debt payoff planner
- Savings goal planner
- Mortgage/rent comparison
- Education or family goal planner
- Tax-aware withdrawal planner later

## Recommended Cloudflare Architecture

Keep the current Cloudflare Pages direction, but evolve it into a full-stack app.

Recommended pieces:

- Cloudflare Pages for the React frontend.
- Pages Functions or Workers for API routes.
- D1 for relational user/account/goal/plan data.
- R2 for uploaded documents, exports, and imports later.
- KV only for cache or low-risk ephemeral metadata.
- Queues later for import processing, categorization, and notification jobs.

Auth decision has been made: Clerk is the selected Phase 2 provider.

Required Clerk configuration:

- Browser build env: `VITE_CLERK_PUBLISHABLE_KEY`.
- Pages Functions env/secrets: `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
- Optional but recommended: `CLERK_AUTHORIZED_PARTIES`, comma-separated origins for local Pages dev and deployed Pages/custom domains.
- Examples live in `.env.example` and `.dev.vars.example`.
- Current Clerk state: app `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) has a development instance but no production instance. `clerk deploy` must be completed with an owned domain before production auth can be called done.
- Avoid using Cloudflare Access as primary consumer auth. It is better suited for internal/private apps.

## Data Model Direction

Initial entities:

- `users`
- `user_profiles`
- `financial_accounts`
- `account_balances`
- `transactions`
- `assets`
- `liabilities`
- `goals`
- `plans`
- `plan_versions`
- `fire_plan_inputs`
- `fire_plan_results`
- `scenarios`
- `assumptions`
- `audit_log`

Important product constraints:

- Users must be able to export data.
- Users must be able to delete account data.
- Financial planning disclaimers must be clear.
- Avoid storing unnecessary sensitive data in early phases.
- Treat all stored financial data as private and high sensitivity.

## Current FIRE Calculator Features

The TypeScript app currently supports:

- FIRE number calculation from annual withdrawal need.
- Annual withdrawal calculation from a given portfolio.
- Multi-period return and inflation assumptions.
- Start-of-year and end-of-year withdrawal timing.
- Desired ending portfolio value.
- One-off income/expense events.
- Recurring income streams.
- Recurring spending phases.
- Base, guardrail, and upside scenario comparison.
- Local saved plans using browser localStorage.
- JSON export/import.
- Light/dark mode.
- Three moods: Aurora, Lagoon, Ember.

Current persistence behavior:

- Signed-out saved plans remain local browser state.
- Signed-in saved plans are account-backed D1 records with versioned FIRE inputs/results.
- Profile defaults are account-backed D1 records.

## Front Page Audit

The current front page is still not good enough for the new product direction.

Observed issues:

- The page tries to be a landing page, calculator, navigation hub, and planner workspace at the same time.
- The main headline is too large and competes with the calculator.
- The calculator is pushed to the side on desktop.
- On desktop at `1280x720`, the `Calculate` button is below the fold.
- On mobile at `390x844`, the `Calculate` button is roughly 1600px down the page.
- Mode cards and segmented mode controls duplicate each other.
- Top nav, hero secondary buttons, breadcrumbs, and tuning buttons create redundant navigation.
- Clicking `Results` still leaves the calculator hero visible, so the app feels like it did not really navigate.
- Results can show projections while the hero still says `Ready to calculate`, creating contradictory state.
- Glassmorphism is over-applied. Too many nested cards and borders reduce hierarchy.
- Advanced inputs appear too early instead of behind progressive disclosure.

Design conclusion:

- Do not continue polishing the current first page incrementally.
- Redesign the first page around the new product architecture.

## Front Page Redesign Target

Unauthenticated public page:

- Primary headline: broad financial planner/tracker value proposition, not only FIRE.
- Primary actions: `Create account`, `Sign in`, `Browse calculators`.
- Short feature sections: Track, Plan, Compare, Improve.
- Clear privacy/security note.
- FIRE calculator appears as a demo/module, not the entire page.

Authenticated app page:

- Dashboard first.
- Net worth snapshot.
- Goal progress.
- Saved plans.
- Recent account changes.
- Planning modules.
- FIRE calculator as one module card or route.

FIRE calculator page:

- H1: `FIRE Calculator`.
- One calculator shell.
- One mode control, not duplicated cards plus segmented control.
- Core inputs and `Calculate` visible in first viewport.
- Advanced assumptions collapsed below.
- Results/tabs shown only after calculation or when a saved plan is loaded.

## Updated Roadmap

### Phase 1: Product Reframe And UX Architecture

Goal: stop treating the FIRE calculator as the whole app.

Tasks:

- Redesign unauthenticated public landing page.
- Define authenticated dashboard layout.
- Move FIRE calculator into `/calculators/fire` or equivalent route/state.
- Remove redundant front-page navigation links.
- Replace current first page with a coherent public landing or logged-in dashboard shell.
- Establish route model for Dashboard, Goals, Plans, Calculators, Settings.

Acceptance:

- First viewport has one clear purpose.
- Primary action is visible without scrolling.
- FIRE demo is accessible but not the whole app.
- Navigation labels map to distinct screens.

### Phase 2: Auth And User Accounts

Goal: allow users to create accounts and access signed-in shell state.

Tasks:

- Select auth provider.
- Add sign up/sign in/sign out flows.
- Add signed-in shell state and basic identity display.
- Gate authenticated app routes.
- Keep `/` and `/calculators/fire` public.
- Add Pages Function session validation.
- Configure production Clerk instance/domain before launch.

Acceptance:

- User can sign up/sign in.
- Signed-out app routes clearly gate access.
- Public FIRE demo remains usable.
- `/api/me` validates real sessions.
- Production auth is not called complete until production Clerk keys/domain exist.

### Phase 3: Server Persistence

Goal: store user-owned profile and FIRE plan data behind authenticated Pages Functions.

Tasks:

- Create D1 databases, binding, and migrations.
- Add authenticated D1 profile endpoint.
- Add user-owned FIRE plan API routes.
- Store FIRE plan snapshots/results as versioned D1 records.
- Wire signed-in FIRE saves to account-backed storage.
- Keep localStorage only for unauthenticated demo drafts.
- Add Settings profile form backed by D1.

Acceptance:

- User profile can be read and updated through `/api/profile`.
- User can save, list, load, update, and delete account-backed FIRE plans.
- User data is isolated by Clerk user ID.
- Signed-out users cannot access persistence APIs.

### Phase 4: Financial Tracker MVP

Goal: move from calculator to tracker.

Tasks:

- Add financial accounts model.
- Add manual asset/liability balances.
- Add net worth dashboard.
- Add account balance history.

Acceptance:

- User can track net worth manually.
- User can create assets and liabilities.
- User can record current balances and see recent balance history.
- Dashboard shows current net worth, assets, liabilities, active accounts, and recent account balances.

### Phase 5: Goals System

Goal: add goal progress tracking on top of saved account data.

Tasks:

- Add goals with target amount, target date, current amount, and category.
- Add goal create/list/read/update/archive APIs.
- Add signed-in Goals route UI.
- Add dashboard goal progress summaries and next actions.
- Link goals to plans later only after the goal model is stable.

Acceptance:

- User can create goals.
- User can update goal progress manually.
- Dashboard shows goal progress and next actions.

### Phase 6: Planning Workspace

Status: complete for preview/development.

Delivered:

- Multiple plans and immutable plan versions with labels, notes, scenarios, and optional goal links.
- Explicit preview/apply/undo connections from profile, selected accounts, and retirement goals.
- Version history and two-version comparison.
- Optimistic concurrency and stale-write protection.
- Deterministic plan health evidence.

Acceptance met:

- User can maintain multiple plans.
- Plans can be compared.
- FIRE results can use saved account data instead of only manual calculator inputs.

### Phase 7: Imports And Automation

Status: complete for preview/development.

Delivered:

- Bounded account-balance CSV parsing and account-aware template generation.
- Row-level review for ready, duplicate, and rejected snapshots.
- Authenticated revalidation, atomic commit, audit history, and dashboard refresh.
- Lazy frontend loading and zero raw-file retention.
- Evidence that R2 and Queues are not needed for the current bounded path.

Acceptance met:

- User can import CSV data.
- Imported data can be reviewed before saving.
- Dashboard updates from imported data.

### Phase 8: Advanced Insight Layer

Status: complete for preview/development.

Delivered:

- Prioritized plan next actions derived from deterministic health checks.
- Signed-in Reports workspace with evidence cards, suggested next steps, assumptions, and uncertainty.
- Dashboard priority insight rollup.
- Goal recommendations for overdue goals, active funding pace, and aggregate funded progress.
- Account trend observations only when persisted dated balance history supports them.
- Explicit rule-based method/privacy language and no AI-generated summaries.

Acceptance met:

- User gets understandable recommendations.
- Insights explain assumptions and uncertainty.

### Phase 9: Hardening and Launch

Status: complete for preview/development.

Delivered:

- Authenticated account-data export and D1 data deletion endpoints.
- Settings privacy controls with export download and explicit delete confirmation.
- Accessibility hardening for landmarks, navigation state, mobile menu controls, hidden inputs, and projection chart semantics.
- Bundle splitting for Planning, Balance Import, and projection chart surfaces.
- Launch-readiness notes that keep production Clerk setup separate from preview/development completion.

Acceptance met:

- User-owned app data can be exported.
- User-owned D1 app data can be deleted without pretending to delete Clerk identity.
- Signed-out routes remain gated and public FIRE remains usable.
- Main app bundle is smaller and route-level surfaces lazy-load.
- Production auth/domain setup remains visible as the launch blocker.

### Phase 10: Transactions MVP

Status: complete for preview/development.

Delivered:

- Authenticated user-scoped transaction APIs backed by the existing D1 `transactions` table.
- Shared transaction validation and summary helpers.
- Signed-in `/transactions` manual ledger workspace.
- Create, inline edit, optional account linking, and row removal UI.
- Summary tiles for net cash flow, income, expenses, latest transaction date, and transfers.
- Test coverage and local API/browser verification.

Acceptance met:

- User can manually track income, expenses, transfers, and adjustments.
- Transaction rows are isolated by Clerk user ID.
- Public FIRE and existing accounts/goals/plans/reports/settings behavior stays stable.
- Balance imports remain separate from transaction categorization and reconciliation.

### Phase 11: Transaction Categorization and Cashflow Automation

Status: complete for preview/development.

Delivered:

- Tested transaction analytics helpers for filters, category options, monthly cashflow rollups, top expense categories, recent rows, and uncategorized counts.
- Search, type, category, account, and date-range filters in the signed-in Transactions workspace.
- Starter/saved category suggestions and consistent uncategorized labeling.
- Dashboard monthly cashflow tile and detail panel.
- Reports and Dashboard transaction insights that remain deterministic and evidence-linked.
- Browser QA for signed-out gate, signed-in desktop/mobile filtering, dashboard cashflow, and reports transaction insight states.

Acceptance met:

- Manual transaction rows can be searched and filtered without losing all-ledger totals.
- Cashflow context appears on Dashboard and Reports using saved transactions.
- Balance imports remain separate from transactions.
- Transaction imports, matching, and reconciliation are not implied or automated.
- Public FIRE and existing accounts/goals/plans/settings behavior stays stable.

### Phase 12: Review-first Transaction Import and Reconciliation Planning

Status: complete for preview/development.

Delivered:

- Separate transaction CSV import contract under `/transactions`.
- Local CSV parsing and authenticated server review/commit endpoints under `functions/api/imports/transactions/`.
- Row-level ready, duplicate, and rejected review states with account-link evidence.
- Import audit history in `transaction_imports`.
- Commit behavior that inserts only approved transaction rows and never mutates account balances.
- Account-data export/delete coverage for transaction import history.

Acceptance met:

- Transaction imports remain separate from account-balance imports.
- Review happens before commit and again during commit.
- Reconciliation and balance effects are not implied or automated.
- Public FIRE and existing accounts/goals/plans/reports/settings behavior stays stable.

### Phases 13-16 and Phase 18: Public Calculator Library

Status: complete for preview/development.

Delivered:

- Public `/calculators` hub with search and user-facing decision categories.
- Shared calculator detail framework with H1, intro, inputs, results, explanation, FAQ, and conversion CTA.
- 82 public calculator routes spanning planning, investing, borrowing, tax, India, and US-specific decisions.
- Tested TypeScript calculator registry/formula engine in `src/lib/seoCalculators.ts`.
- Route-level title/description/canonical/JSON-LD updates plus `public/sitemap.xml` and `public/robots.txt`.
- Public access without auth; signed-out conversion CTAs prompt account creation and preserve the latest calculator draft/result before the auth flow.

Acceptance met:

- The requested calculator library is available without authentication.
- India and US calculator needs are both represented without making geography the public organizing principle.
- Calculator formula logic is isolated from `src/lib/fire.ts`.
- Durable account-backed calculator result saving is implemented in Phase 17 and should be reused by later calculator studios.

### Phase 19: Calculator UX and Formula Assurance

Status: complete for preview/development.

Delivered:

- Public calculator copy no longer exposes internal acquisition or search strategy.
- Landing hero, ready band, footer, topbar, mobile nav, and signed-out gates now include a clear path to `/calculators`.
- Calculator detail pages explain what the calculator answers, how to read the result, and what each input/output means through hover/focus help.
- Calculator currency labels use the calculator context, including INR for India calculators and GST/TDS.
- Formula and unit fixes cover monthly-compounded principal, SIP contribution timing, payoff-time units, SWP runway units, balance-transfer payment effects, paycheck annualization, and zero-rate PPF.
- Vitest coverage now has an individual expected-output test for every public calculator route, edge-case tests for zero rates/payoff loops/paycheck annualization/balance-transfer payments, and quality-contract tests for every calculator route.

Verification and deployment:

- `migrations/0003_transaction_import_history.sql` is applied locally and to both remote D1 databases.
- Remote `0003` was applied with direct `wrangler d1 execute --file` plus a guarded `d1_migrations` insert after the Wrangler migrations subcommand hit a Cloudflare query endpoint authorization error.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 258 frontend tests, and production build.
- Previous app deploy before Phase 17: `npm run cf:deploy` deployed to `https://3c829b65.interactive-fire-calculator.pages.dev`.
- Live route smoke passed for `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/mortgage`, `/calculators/fire`, and `/transactions` returning `200`.

### Phase 17: Calculator-to-Account Conversion Layer

Status: complete for preview/development.

Delivered:

- Added `saved_calculator_results` D1 storage for user-owned calculator snapshots, calculator metadata, conversion destination, and created entity references.
- Added authenticated `GET`/`POST /api/calculator-results` for signed-in saved result listing and creation.
- Saves create downstream goal/account/plan drafts where safe; transaction-oriented calculator saves remain durable workflow results and do not mutate the transaction ledger.
- Signed-out calculator users preserve the latest inputs/result before opening account creation, then can restore and save after sign-in.
- Dashboard shows saved calculator result cards with the destination, headline metric, creation date, and shortcut to the relevant workspace.
- Account-data export/delete includes saved calculator results.
- Public calculator usage remains unauthenticated.

Verification and deployment:

- `migrations/0004_saved_calculator_results.sql` is applied locally and to both configured remote D1 databases.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 261 frontend tests across 15 files, and production build.
- `npm run cf:deploy` deployed to `https://0fe9ade0.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke passed for `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/mortgage`, `/calculators/fire`, and `/transactions` returning `200`.
- Live API smoke returned unauthenticated `401` for `GET /api/calculator-results`.

### Phase 20: Calculator Decision Studio Foundation

Status: complete for preview/development.

Delivered:

- Added `src/lib/calculatorStudios.ts` as the shared decision-studio layer for calculator family metadata, scenario values, chart primitives, examples, and related route rules.
- Calculator detail pages now have a conservative/base/optimistic scenario lens that changes result interpretation without replacing the user's base inputs.
- Shared chart-ready primitives now cover timeline, waterfall, comparison, and amortization previews across every current route.
- Each calculator detail page now includes a route-specific example loader and related calculators from the same decision workflow.
- Public-copy guard tests cover the new studio metadata so internal search/acquisition strategy does not leak into calculator UI copy.

Verification and deployment:

- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 440 frontend tests across 16 files, and production build.
- Local Playwright CLI screenshots rendered `/calculators/sip` at `1280x720` and `/calculators/amortization` at `390x844`, including a full-page mobile check of scenario controls, chart preview, example, related calculators, and FAQ.
- `npm run cf:deploy` deployed to `https://2e1c808a.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke passed for `/`, `/calculators`, `/calculators/sip`, `/calculators/amortization`, `/calculators/roi`, `/calculators/fire`, and `/transactions` returning `200`.
- Live API smoke returned unauthenticated `401` for `GET /api/calculator-results`.
- Live Playwright CLI screenshot rendered `/calculators/sip` at `390x844`.
- Completion after implementation: comprehensive calculator program is 32% complete; 68% remains.

### Phase 20-25: Calculator Value and Visualization Roadmap

Status: Phase 25 complete; all planned calculator phases are complete for preview/development.

Source of truth: `docs/CALCULATOR_VALUE_ROADMAP.md`.
High-standard contract: `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md`.

Intent:

- Keep all existing calculator routes and search entry points.
- Combine overlapping calculators internally through shared decision studios instead of removing public pages.
- Make calculators valuable beyond basic arithmetic by adding scenarios, timelines, sensitivity, visualizations, saved follow-ups, and dashboard links.
- Apply the same high standard to every calculator: useful decision framing, input/output explanations, tested formulas, baseline visual read, route-specific comprehensive visuals, scenarios, save flows, and responsive QA.
- Preserve user-first public copy while keeping search strategy internal.
- `/calculators/amortization` now includes a full payment-by-payment monthly table with year labels, cumulative interest, custom period views, and CSV export. Future polish can deepen date-aware payment labels and chart variants.
- Apply the same period-table standard to adjacent calculators: loan/EMI/mortgage schedules, debt payoff tables, SIP/deposit contribution schedules, SWP/retirement withdrawal schedules, tax/paycheck bracket or period tables, and cashflow/category breakdown tables.
- Phase 22 implemented the new loan/mortgage route backlog: mortgage payoff, biweekly mortgage, recast, points/rate buydown, 15-vs-30, ARM, interest-only mortgage, balloon loan, closing costs, escrow, DTI, loan comparison, APR, home equity loan, FHA, VA, FHA-vs-conventional, India prepayment/foreclosure/balance transfer, flat-vs-reducing rate, India loan eligibility, and stamp duty/registration.

Phase status:

- Phase 20: Complete for preview/development. Decision studio foundation, shared metadata, chart primitives, scenarios, route-specific examples, related calculators, and public-copy guard tests are in place.
- Phase 21: Complete for preview/development. Growth, goal, retirement, withdrawal, distribution, benefit, inflation, and return calculators now have expandable optional schedule/detail tables where period-by-period detail is useful.
- Phase 22: Complete for preview/development. Loan, debt, home, and vehicle visualizers plus missing loan/mortgage calculator routes are implemented with optional payment/detail tables, custom period views, CSV export, and true multi-debt snowball vs avalanche comparison.
- Phase 23: Complete for preview/development. Income, tax, budget, and protection calculators now have richer estimate logic and collapsed optional detail tables for gross-to-net, bracket/slab, runway, and protection-gap reads.
- Phase 24: Complete for preview/development. Formula-aware route content, assumptions, FAQs, crawlable links, metadata/schema/sitemap tests, duplicate-content guards, and all-route no-auth smoke coverage are in place.
- Phase 25: Complete for preview/development. Scenario comparison, deterministic outcome drivers, recent saved history, dashboard follow-ups, input-only share links, and summary export are in place.

Phase 21 verification and deployment:

- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 480 frontend tests across 16 files, and production build.
- Local visual smoke rendered SIP desktop/full-page and retirement mobile/full-page views. A Chrome-driven mobile check confirmed the SIP schedule disclosure is closed by default, opens on click, renders 10 rows, keeps table overflow inside the wrapper, and keeps the document width at `390px`.
- `npm run cf:deploy` deployed to `https://c41f598d.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke returned `200` for `/`, `/calculators`, `/calculators/sip`, `/calculators/retirement`, `/calculators/xirr`, `/calculators/fire`, and `/transactions`; unauthenticated `GET /api/calculator-results` returned `401`.

Phase 22 verification and deployment:

- `npm run typecheck` passed; `npm test` passed with 664 frontend tests across 16 files; `npm run build` passed.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 664 frontend tests, and production build.
- `npm run cf:deploy` deployed to `https://ca04df60.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke returned `200` for `/`, `/calculators`, `/calculators/amortization`, `/calculators/home-loan-prepayment`, `/calculators/mortgage-payoff`, `/calculators/fire`, and `/transactions`; unauthenticated `GET /api/calculator-results` returned `401`.
- Live sitemap smoke confirmed `mortgage-payoff`, `home-loan-prepayment`, `debt-to-income`, and `fha-vs-conventional`.

Phase 23 verification and deployment:

- `npm run typecheck` passed; `npm test` passed with 682 frontend tests across 16 files; `npm run build` passed.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 682 frontend tests, and production build.
- `npm run cf:deploy` deployed to `https://62099a61.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke returned `200` for `/`, `/calculators`, `/calculators/income-tax-india`, `/calculators/income-tax-us`, `/calculators/paycheck`, `/calculators/fire`, and `/transactions`; unauthenticated `GET /api/calculator-results` returned `401`.
- Live sitemap smoke confirmed `income-tax-india`, `income-tax-us`, `paycheck`, `life-insurance-needs`, and `calculators/fire`.

Phase 24 verification and deployment:

- `npm run typecheck` passed; `npm test` passed with 852 frontend tests across 18 files; `npm run build` passed.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 852 frontend tests, and production build.
- Local agent-browser QA passed for the calculator hub, India tax, US tax, crawlable related navigation, route metadata/schema, closed-by-default detail tables, console state, and desktop/mobile overflow.
- `npm run cf:deploy` deployed to `https://45c8e45c.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- `npm run smoke:calculators -- https://45c8e45c.interactive-fire-calculator.pages.dev` verified all 84 public calculator-library paths without authentication.
- Live HTTP smoke returned `200` for `/`, `/calculators/fire`, and `/transactions`; unauthenticated `GET /api/calculator-results` returned `401`.
- Live mobile amortization checks confirmed the title, canonical, `index, follow`, WebApplication/FAQ schema, four related links, five visible FAQs, closed detail schedule, no console errors, and `390px` document width.

Phase 25 verification and deployment:

- No schema or Pages Function change was needed; Phase 25 reuses the existing user-scoped `saved_calculator_results` history.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 1,019 frontend tests across 19 files, and production build.
- Local agent-browser QA passed desktop mortgage comparison and sensitivity, shared SIP input/scenario restoration, copy-link and summary-export actions, signed-out history prompts, closed schedule details, console state, and desktop/mobile overflow.
- The lightweight dashboard follow-up helper remains in the main bundle while the engagement engine stays in the lazy calculator chunk.
- `npm run cf:deploy` deployed to `https://bd0e9f28.interactive-fire-calculator.pages.dev`; branch alias remains `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- `npm run smoke:calculators -- https://bd0e9f28.interactive-fire-calculator.pages.dev` verified all 84 public calculator-library paths without authentication.
- Live shared SIP restoration and mobile drawer checks passed; `/`, `/calculators/fire`, and `/dashboard` returned `200`; unauthenticated `GET /api/calculator-results` returned `401`.

Post-roadmap calculator consolidation and visual-system verification:

- Kept all 82 exact calculator routes and reorganized the hub into 8 user-facing decision toolkits with progressive disclosure and exact search.
- Added `PRODUCT.md`, rewrote `DESIGN.md`, and added `docs/CALCULATOR_LIBRARY_REVIEW.md` as the product, visual, and consolidation sources of truth.
- Added 92 toolkit tests. `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 1,111 frontend tests across 20 files, and production build.
- Local and live browser QA covered landing and calculator CTAs, all 8 toolkit panels, all 82 toolkit links, exact-search URL state, amortization detail/schedule disclosure, FIRE, signed-out Dashboard, light/dark persistence, console state, and desktop/mobile overflow.
- `npm run cf:deploy` deployed to `https://8fb17051.interactive-fire-calculator.pages.dev`; `npm run smoke:calculators` verified all 84 public calculator-library paths without authentication.
- Live representative routes returned `200`; unauthenticated `GET /api/calculator-results` returned `401`.
- Calculator program and design consolidation are 100% complete. Production Clerk setup remains the separate launch blocker.

Deploy/handoff rule:

- After each app deploy, record what shipped, preview URL, tests, smoke routes, percent complete, percent remaining, and blockers.
- Current comprehensive calculator completion is 100%; 0% remains in the planned calculator roadmap. Production Clerk setup remains a separate launch blocker.

## Immediate Next Coding Session Recommendation

Complete production Clerk setup and hosted signed-in verification.

Current checkpoint:

- Clerk CLI `2.1.0` is installed.
- Clerk production status is `not_started` with no production domain or instance.
- The Pages project has no custom domain beyond `interactive-fire-calculator.pages.dev`.
- The Pages production secret set is empty.
- Production preflight and deployment guards are implemented and intentionally fail until those external requirements are satisfied.
- Phase 2 is 90% complete. The next required input is the owned production domain and DNS access.
- Calculator payoff inputs and the public shell have completed a post-Phase-25 quality pass: recurring monthly/yearly extra payments, yearly investment top-ups, reconciled schedules, a calmer dropdown-based navigation, and the vivid precision light/dark visual system are implemented. These do not remove the production Clerk blocker.

Recommended first slice:

1. Choose an owned production hostname and attach it to `interactive-fire-calculator` in Cloudflare Pages.
2. Follow `docs/PRODUCTION_AUTH_RUNBOOK.md` to run `clerk deploy`, add DNS records, and complete any OAuth setup.
3. Set the production frontend key and Pages Function secrets, then run `npm run auth:preflight`.
4. Merge to `main` and run `npm run cf:deploy:production`.
5. Verify real hosted sign-up, sign-in, sign-out, `/api/me`, signed-in route access, saved calculator history, destination follow-ups, export/delete, and cleanup.
6. Keep production launch status blocked until this flow passes end to end.

Reason:

The product now has identity-ready auth integration, persistence, reviewed imports, goals, versioned planning, rule-based insights, privacy controls, a manual Transactions ledger, a broad public calculator library, durable calculator saves, decision studios, comprehensive family visualizers, hardened public content/metadata, comparison, deterministic sensitivity, history, follow-ups, and export/share. The planned calculator program is complete. Production auth still cannot be called launch-ready until a Clerk production instance/domain exists and the hosted production flow is verified end to end.

## Testing Requirements

Before every push:

```bash
./scripts/test_all.sh
```

For frontend-only iterations, at minimum:

```bash
npm run typecheck
npm test
npm run build
```

After significant UI changes:

- Run local dev server with `./scripts/run_local.sh`.
- Use browser QA on desktop and mobile.
- Confirm no text overlaps.
- Confirm primary action is visible in first viewport.
- Confirm navigation labels map to distinct screens.
- Confirm breadcrumbs only appear when meaningful.

## Deployment Requirements

Deploy with:

```bash
npm run cf:deploy
```

Current branch alias:

```text
https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev
```

## Open Decisions

- Auth provider: Clerk selected for Phase 2.
- Whether to keep Vite SPA or move to a framework with richer routing/loaders.
- Whether Pages Functions are enough for API needs or if a separate Worker should own API routes.
- D1 schema and migration strategy.
- Whether to keep legacy Flask parity tests long term.
- How much financial data to store in MVP.
- Production retention/SLA and full identity deletion policy beyond the preview D1 account-data delete/export controls.

## New Session Starter Prompt

Use this prompt to start the next coding session:

```text
We are in /Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator on branch codex/cloudflare-pages-theme-plan.

Read these first:
docs/PROJECT_MEMORY.md
docs/FINANCIAL_PLATFORM_TRACKER.md
docs/FINANCIAL_PLATFORM_HANDOFF.md
docs/CALCULATOR_VALUE_ROADMAP.md

The product scope has changed from a standalone FIRE calculator to a comprehensive personal financial tracker and planner platform. FIRE is now the first calculator module inside a larger app.

Phases 1 and 3 through 25 are complete for preview/development. Clerk development auth is integrated, but real production auth is blocked until a Clerk production instance/domain and production keys are configured. D1 stores profiles, saved plans and versions, accounts, balances, goals, import history, transactions, saved calculator results, and account-data export/delete readiness behind authenticated user-scoped Pages Functions. The public calculator library keeps all 82 calculator routes plus FIRE available without auth. The calculator program is 100% complete with route-specific content, tested metadata, comprehensive schedules, scenario comparison, deterministic outcome drivers, recent saved history, dashboard follow-ups, share links, exports, and all-route public smoke coverage.

Next goal: complete production Clerk setup and hosted signed-in verification. Keep production launch status blocked until that flow passes.

Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when app behavior changes.
```
