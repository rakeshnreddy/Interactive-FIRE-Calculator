# Financial Platform Handoff

Last updated: June 24, 2026

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
- Latest known preview from this branch: `https://4dfecf5e.interactive-fire-calculator.pages.dev`
- Existing draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`

Recent commits on this branch:

- `d456c59 Create financial platform shell`
- `dbd158e Add financial platform handoff context`
- `98723ac Replace stress ending hero metric`
- `2282784 Refine calculator landing experience`
- `2e1ac23 Add guided retirement assumptions`

Phase 1 Product Shell and IA is complete. Phase 2 has a provider-ready Clerk auth shell and Pages Function identity endpoint. Clerk development credentials are wired locally and into Cloudflare Pages preview secrets, but real production auth is blocked until a Clerk production instance/domain is configured. Phases 3 through 9 are complete for preview/development: D1 persistence, manual financial tracking, goals, versioned planning, reviewed balance CSV imports, deterministic Reports insights, authenticated account-data export/delete readiness, accessibility hardening, and bundle splitting are active. The FinPath interpretation of the installed Revolut-inspired reference applies across the landing page and product shell, with glassmorphism retained for functional panels. See `docs/FINANCIAL_PLATFORM_TRACKER.md` and `docs/PROJECT_MEMORY.md` for ongoing status and handoff prompts.

## Current Code Shape

Production target:

- `src/` contains the TypeScript React app.
- `DESIGN.md` contains the installed Revolut-inspired visual reference and FinPath design tokens.
- `public/assets/finpath-product-hero.jpg` is the generated landing product hero asset.
- `src/auth.tsx` contains the Clerk browser auth boundary and user identity projection.
- `src/lib/fire.ts` contains the deterministic FIRE calculation engine.
- `src/lib/fire.test.ts` contains Vitest coverage for the TypeScript model.
- `src/PlanningWorkspace.tsx` contains the signed-in plan library, explicit imports, history, and comparison UI.
- `src/ProjectionChart.tsx` lazy-loads the Recharts projection visualization for the FIRE calculator results view.
- `src/lib/planWorkspace.ts` and `src/lib/planHealth.ts` contain tested import and deterministic health rules.
- `src/lib/insights.ts` contains the deterministic, evidence-linked recommendation rules used by Reports and Dashboard.
- `src/BalanceImportPanel.tsx` contains the lazy-loaded CSV review, commit, template, and history UI.
- `src/lib/balanceCsv.ts` contains bounded local CSV parsing and template generation.
- `functions/api/health.ts` contains a Cloudflare Pages Function health endpoint.
- `functions/api/me.ts` contains the Clerk-backed Pages Function identity endpoint.
- `functions/api/profile.ts` contains the D1-backed authenticated profile endpoint.
- `functions/api/plans/index.ts` and `functions/api/plans/[id].ts` contain D1-backed authenticated FIRE plan endpoints.
- `functions/api/plans/[id]/versions.ts` and `functions/api/plans/[id]/versions/[versionNumber].ts` expose user-scoped immutable history.
- `functions/api/accounts/` contains D1-backed authenticated financial account and balance endpoints.
- `functions/api/imports/account-balances/` contains authenticated import history, preview, and commit endpoints.
- `functions/api/account-data/export.ts` and `functions/api/account-data/index.ts` contain authenticated account data export and delete endpoints.
- `functions/api/goals/` contains D1-backed authenticated goal endpoints.
- `functions/api/dashboard.ts` contains the authenticated account and goal summary endpoint.
- `functions/_lib/persistence.ts` centralizes D1 binding checks and user/profile creation.
- `functions/_lib/firePlans.ts` centralizes FIRE plan persistence, payload validation, versioning, and archival.
- `functions/_lib/accounts.ts` centralizes financial account, balance, and summary validation/persistence.
- `functions/_lib/balanceImports.ts` centralizes account matching, row validation, duplicate/conflict review, and atomic import commits.
- `functions/_lib/accountData.ts` centralizes authenticated user-data export and deletion behavior.
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

- Either complete production Clerk setup for launch readiness or begin Phase 10 Transactions MVP. Keep Clerk production auth/domain setup visible as the remaining launch blocker.

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
- Try FIRE calculator demo
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
- Primary actions: `Create account`, `Sign in`, `Try FIRE calculator`.
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

## Immediate Next Coding Session Recommendation

Begin Phase 10 candidate: Transactions MVP, unless product ownership chooses to pause product expansion and finish production Clerk setup first.

Recommended first slice:

1. Use the existing `transactions` table from `migrations/0001_initial_financial_platform_schema.sql`.
2. Add user-scoped transaction list/create/update/archive APIs behind Clerk auth.
3. Replace the `/transactions` placeholder with a signed-in ledger workspace.
4. Keep transaction writes separate from account-balance CSV imports until linking rules are explicit.
5. Continue tracking Clerk production auth/domain setup as a launch blocker.

Reason:

The product now has identity, persistence, reviewed imports, goals, versioned planning, rule-based insights, privacy controls, accessibility hardening, and performance splitting. The next product gap in the existing IA is a usable Transactions ledger. Production auth still cannot be called launch-ready until a Clerk production instance/domain exists and the hosted production flow is verified end to end.

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

The product scope has changed from a standalone FIRE calculator to a comprehensive personal financial tracker and planner platform. FIRE is now the first calculator module inside a larger app.

Phases 1 and 3 through 9 are complete for preview/development. Clerk development auth is integrated, but real production auth is blocked until a Clerk production instance/domain and production keys are configured. D1 stores profiles, saved FIRE plans and immutable versions, accounts, balances, goals, balance import history, and account-data export/delete readiness behind authenticated user-scoped Pages Functions. The Accounts workspace supports reviewed CSV imports, Planning includes comparisons and deterministic health evidence, Reports shows evidence-linked rule-based recommendations, Settings includes privacy controls, and the public FIRE calculator remains available.

Next goal: begin Phase 10 candidate, Transactions MVP, unless product ownership chooses to pause product expansion and finish production Clerk setup first. Keep production Clerk setup as a launch blocker.

Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when app behavior changes.
```
