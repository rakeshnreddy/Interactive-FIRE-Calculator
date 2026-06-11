# Financial Platform Handoff

Last updated: June 11, 2026

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
- Latest known preview from this branch: `https://2801f6a1.interactive-fire-calculator.pages.dev`
- Existing draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`

Recent commits on this branch:

- `d456c59 Create financial platform shell`
- `dbd158e Add financial platform handoff context`
- `98723ac Replace stress ending hero metric`
- `2282784 Refine calculator landing experience`
- `2e1ac23 Add guided retirement assumptions`

Phase 1 Product Shell and IA is complete. Phase 2 has a provider-ready Clerk auth shell and Pages Function identity endpoint. Clerk development credentials are wired locally and into Cloudflare Pages secrets, but real production auth is blocked until a Clerk production instance/domain is configured. See `docs/FINANCIAL_PLATFORM_TRACKER.md` and `docs/PROJECT_MEMORY.md` for ongoing status and handoff prompts.

## Current Code Shape

Production target:

- `src/` contains the TypeScript React app.
- `src/auth.tsx` contains the Clerk browser auth boundary and user identity projection.
- `src/lib/fire.ts` contains the deterministic FIRE calculation engine.
- `src/lib/fire.test.ts` contains Vitest coverage for the TypeScript model.
- `functions/api/health.ts` contains a Cloudflare Pages Function health endpoint.
- `functions/api/me.ts` contains the Clerk-backed Pages Function identity endpoint.
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
- FIRE plan saves remain local browser drafts; no D1 persistence has been added.
- Clerk CLI is linked to app `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) with development instance `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`.
- Local ignored env files are present: `.env.local` and `.dev.vars`.
- Cloudflare Pages production and preview secrets include `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- `clerk doctor --spotlight` reports no production instance configured.
- `clerk deploy status` reports production deployment is `not_started` and requires `clerk deploy` with human/domain setup.

Next recommended phase:

- Finish Phase 2 by verifying real hosted sign-up/sign-in/sign-out with a test user, then configuring Clerk production auth for an owned launch domain.

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

Current limitation:

- Saved plans are local browser state only. They are not account-backed.

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

### Phase 2: Auth And User Persistence

Goal: allow users to create accounts and save data.

Tasks:

- Select auth provider.
- Add sign up/sign in/sign out flows.
- Add user profile persistence.
- Create D1 database and migrations.
- Add Pages Function API routes for user-owned plans.
- Replace localStorage saved plans with authenticated saved plans.
- Keep localStorage only for unauthenticated demo drafts.

Acceptance:

- User can sign up/sign in.
- User can save a FIRE plan to server storage.
- User can list/load/delete saved FIRE plans.
- User data is isolated by user ID.

### Phase 3: Financial Tracker MVP

Goal: move from calculator to tracker.

Tasks:

- Add financial accounts model.
- Add manual asset/liability balances.
- Add net worth dashboard.
- Add account balance history.
- Add goals with target amount, target date, current amount, and category.

Acceptance:

- User can track net worth manually.
- User can create goals.
- Dashboard shows progress and next actions.

### Phase 4: Planning System

Goal: connect goals and saved financial data to plans.

Tasks:

- Add plans and plan versions.
- Connect FIRE plan inputs to user profile/accounts/goals.
- Add scenario history.
- Add plan comparison across saved versions.
- Add plan health explanations.

Acceptance:

- User can maintain multiple plans.
- Plans can be compared.
- FIRE results can use saved account data instead of only manual calculator inputs.

### Phase 5: Imports And Automation

Goal: reduce manual entry burden.

Tasks:

- Add CSV import for transactions or account balances.
- Add categorization.
- Add R2 storage for uploaded files if needed.
- Add background jobs with Queues if import processing grows.

Acceptance:

- User can import CSV data.
- Imported data can be reviewed before saving.
- Dashboard updates from imported data.

### Phase 6: Advanced Insight Layer

Goal: make the platform more useful than static tracking.

Tasks:

- Add plan health engine.
- Add goal recommendations.
- Add spending insights.
- Add retirement risk explanations.
- Consider AI-assisted summaries only after data privacy constraints are clear.

Acceptance:

- User gets understandable recommendations.
- Insights explain assumptions and uncertainty.

## Immediate Next Coding Session Recommendation

Finish Phase 2: Auth and User Accounts.

Recommended first slice:

1. Verify real sign up, sign in, sign out, signed-in route access, and `/api/me` on the Pages preview with a test user.
2. Run `clerk deploy` in a human terminal and configure the Clerk production instance for an owned domain.
3. Pull/set production Clerk keys when the production instance exists.
4. Re-run verification and redeploy for production auth.
5. Keep `/calculators/fire` public and do not add D1 persistence until identity is stable.

Reason:

The code now has a real Clerk-ready auth boundary, route gates, local development keys, and Cloudflare Pages secrets. Production auth cannot be called complete until a Clerk production instance/domain exists and the hosted flow is verified end to end.

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
- Privacy and user data deletion/export policy.

## New Session Starter Prompt

Use this prompt to start the next coding session:

```text
We are in /Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator on branch codex/cloudflare-pages-theme-plan.

Read these first:
docs/PROJECT_MEMORY.md
docs/FINANCIAL_PLATFORM_TRACKER.md
docs/FINANCIAL_PLATFORM_HANDOFF.md

The product scope has changed from a standalone FIRE calculator to a comprehensive personal financial tracker and planner platform. FIRE is now the first calculator module inside a larger app.

Phase 1 Product Shell and IA is complete. Phase 2 selected Clerk and implemented a provider-ready auth shell, route gates, signed-in profile basics, and a Clerk-backed /api/me Pages Function. Clerk development credentials are configured locally and in Cloudflare Pages secrets, but real production auth is blocked until a Clerk production instance/domain is configured. Keep the unauthenticated FIRE calculator demo available. Do not add D1 persistence until the auth/user identity model is stable.

Next goal: verify real hosted sign up, sign in, sign out, signed-in route access, and /api/me with a test user, then configure the Clerk production instance for an owned launch domain.

Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when app behavior changes.
```
