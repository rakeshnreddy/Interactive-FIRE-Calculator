# Project Memory

Last updated: July 6, 2026

## Repository

- Path: `/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator`
- Branch: `codex/cloudflare-pages-theme-plan`
- Remote branch: `origin/codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://afdbe589.interactive-fire-calculator.pages.dev`

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
- Authenticated immutable version endpoints in `functions/api/plans/[id]/versions.ts` and `functions/api/plans/[id]/versions/[versionNumber].ts`.
- Authenticated D1-backed goal endpoints in `functions/api/goals/index.ts` and `functions/api/goals/[id].ts`.
- Signed-in Planning Workspace in `src/PlanningWorkspace.tsx`.
- Explicit plan import rules and deterministic health explanations in `src/lib/planWorkspace.ts` and `src/lib/planHealth.ts`.
- Review-first balance CSV UI in `src/BalanceImportPanel.tsx` with local parsing/template helpers in `src/lib/balanceCsv.ts`.
- Authenticated balance import review, commit, and history endpoints under `functions/api/imports/account-balances/`.
- Shared import validation, duplicate detection, atomic D1 commit, and history rules in `functions/_lib/balanceImports.ts`.
- Review-first transaction CSV UI in `src/TransactionImportPanel.tsx` with local parsing/template helpers in `src/lib/transactionCsv.ts`.
- Authenticated transaction import review, commit, and history endpoints under `functions/api/imports/transactions/`.
- Shared transaction import validation, duplicate detection, atomic D1 commit, and history rules in `functions/_lib/transactionImports.ts`.
- Authenticated D1-backed transaction endpoints in `functions/api/transactions/index.ts` and `functions/api/transactions/[id].ts`.
- Shared transaction validation, ownership checks, CRUD, and summary rules in `functions/_lib/transactions.ts`.
- Transaction filtering, category suggestions, and cashflow rollups in `src/lib/transactionAnalytics.ts`.
- Public calculator library in `src/CalculatorLibrary.tsx` and tested calculator engines/registry in `src/lib/seoCalculators.ts`.
- Public calculator sitemap and robots files in `public/sitemap.xml` and `public/robots.txt`.
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

Phase 6 Planning Workspace is complete for preview/development:

- `/plans` is now a signed-in working surface rather than a placeholder.
- Users can create multiple plans, append immutable labeled versions, load historical versions, archive plans, and compare two saved versions.
- Version-list and version-detail Pages Functions are user-scoped and exclude archived plans.
- Plan updates use optimistic concurrency with `expectedVersionNumber`; stale writes return `409` and prompt a reload instead of overwriting newer work.
- Signed-in saves use plan IDs rather than plan-name matching, and the latest plan is restored on a later signed-in visit.
- Profile current age/retirement age and one explicitly selected portfolio source can be previewed before import and undone immediately afterward.
- Account imports accept only selected active assets with dated balances in the profile currency; retirement goals can seed current funding and target age while target amount remains a benchmark.
- Every snapshot retains its scenario configuration and seed provenance.
- Version comparison shows portfolio, annual spending, scenario count, and deterministic health status.
- Health evidence covers portfolio target, spending coverage, ending balance, and calculator warnings without changing `src/lib/fire.ts` or offering Phase 8 recommendations.
- Local authenticated API checks passed create/read/version/conflict/auth boundaries, and signed-in desktop/mobile browser QA passed the full workflow with no console errors or horizontal overflow.
- The existing D1 schema was sufficient; no Phase 6 migration was needed.
- `npm run cf:deploy` deployed Phase 6 to `https://f047c87a.interactive-fire-calculator.pages.dev`.
- The deployed authenticated version API and signed-out desktop/mobile route smoke passed; all disposable Clerk and D1 records were removed.
- A Clerk development instance cannot complete browser sign-in on the non-localhost Pages preview origin, so hosted signed-in browser verification remains tied to the documented Phase 2 production-instance/domain blocker.

Phase 7 Imports and Automation is complete for preview/development:

- Accounts now includes a review-first balance CSV workbench with generated account-aware templates.
- The exact contract is `account,balance_date,balance,currency`, with any header order accepted and a 256 KB/500-row bound.
- Papa Parse handles CSV structure locally; only normalized row fields reach authenticated Pages Functions.
- Server review resolves active owned accounts, converts decimal amounts to integer cents, validates dates/currencies, and classifies every row as ready, duplicate, or rejected.
- Existing snapshots and repeated file rows are skipped; unknown/ambiguous accounts, malformed fields, and different same-day balances are rejected with row-level evidence.
- Commit re-runs the complete review and transactionally writes one audit record plus all approved balances.
- Recent import history is stored in the new `balance_imports` table created by `migrations/0002_balance_import_history.sql`.
- Migration `0002` is applied locally and to both configured remote D1 databases.
- Account cards, net worth, and dashboard summaries refresh after a successful import.
- The import panel and Papa Parse live in a separate lazy bundle; public routes do not load CSV tooling.
- R2 and Queues are deliberately deferred because raw files are not retained and the bounded multi-row D1 batch stays within the current Free query cap.
- Balance imports do not invent transaction categories; categorization remains future transaction scope.
- Unit, local authenticated API, and signed-in desktop/mobile browser verification pass. Wrangler is current and `npm audit` reports zero vulnerabilities.
- `npm run cf:deploy` deployed Phase 7 to `https://67e3a1ca.interactive-fire-calculator.pages.dev`.
- The live authenticated import lifecycle, account/dashboard refresh, repeat protection, and signed-out desktop/mobile route smoke passed; all disposable D1 and Clerk records were removed.
- Hosted signed-in browser verification remains tied to the documented Phase 2 production-instance/domain blocker.

Phase 8 Insights and Recommendations is complete for preview/development:

- `src/lib/planHealth.ts` now extends deterministic health checks into prioritized next actions with cited evidence, assumptions, rationale, and uncertainty language.
- `src/lib/insights.ts` builds the signed-in insight layer from the current FIRE plan, account balance history, goals, and a rule-based privacy/method boundary.
- `/reports` is now a signed-in workspace with priority counts, recommendation cards, evidence grids, suggested next steps, and collapsible assumptions/uncertainty.
- `/dashboard` includes the top three priority insights so next actions are visible without opening Reports.
- Account trend observations are emitted only for active accounts with at least two distinct persisted balance dates; single-snapshot accounts get setup prompts instead of fake trend claims.
- Goal recommendations cover overdue targets, nearest active funding pace, and aggregate funded progress with explicit limitations.
- Recommendations remain deterministic and traceable; no AI summaries, new persistence, or external account analysis were added.
- `src/lib/fire.ts` remains unchanged.
- Unit coverage now includes plan-health actions and the full insight rule set; frontend tests have 48 passing tests.
- Local signed-out Reports gate, signed-in Reports, signed-in Dashboard insights, mobile Reports, and public mobile FIRE browser QA passed with no console errors or horizontal overflow.
- `npm run cf:deploy` deployed Phase 8 to `https://fa829950.interactive-fire-calculator.pages.dev`.
- The deployed signed-out Reports gate and public mobile FIRE route passed live smoke checks. Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

Phase 9 Hardening and Launch is complete for preview/development, with production launch still blocked by the Phase 2 Clerk production-instance/domain requirement:

- `functions/_lib/accountData.ts` centralizes authenticated user data export, exact deletion confirmation parsing, and D1 account-data deletion.
- Authenticated `GET /api/account-data/export` returns a no-store JSON export with user, profile, accounts, balances, goals, plans, versions, FIRE payloads, assumptions, import history, transactions, and user-scoped audit rows.
- Authenticated `DELETE /api/account-data` requires the exact phrase `DELETE MY FINPATH DATA`, deletes user-owned D1 rows including audit rows before the root user row, and explicitly does not delete the Clerk identity.
- `/settings` now includes glassy privacy controls for JSON export and D1 data deletion alongside the D1-backed profile form.
- Signed-in deletion clears loaded profile, account, goal, and plan state in the SPA so stale financial data is not left on screen.
- Accessibility hardening adds a skip link, a stable `main` target, `aria-current` navigation state, mobile menu `aria-controls` plus open/close labels, accessible chart labeling, and removes hidden file inputs from the tab order.
- Performance hardening lazy-loads `PlanningWorkspace` and the Recharts projection chart. The built main JS chunk dropped from about 756 kB to about 401 kB; `/plans`, CSV imports, and projection charts now load as separate chunks.
- Monitoring/launch readiness now relies on the existing `GET /api/health`, Cloudflare Pages deployment logs, D1-bound API verification, and the documented production Clerk blocker; no external monitoring provider was added.
- `src/accountData.test.ts` covers deletion confirmation, export shape, archived-row inclusion, parsed FIRE JSON payloads, and delete ordering.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 51 frontend tests, and production build.
- Local browser QA passed for landing, FIRE, Settings gate, signed-in Settings privacy controls, chart lazy loading, and mobile FIRE/Settings at `390x844` with no console errors or horizontal overflow.
- Local signed-in Pages Function verification passed with a disposable Clerk development user: profile/account/goal/plan seed, account-data export summary, wrong-confirmation `400`, confirmed deletion `200`, zero accounts/goals/plans after deletion, and disposable Clerk cleanup.
- `npm run cf:deploy` deployed Phase 9 to `https://4dfecf5e.interactive-fire-calculator.pages.dev`.
- The deployed signed-out landing, FIRE, Settings gate, and mobile FIRE/Settings smoke checks passed with no console errors or horizontal overflow. Hosted signed-in browser verification remains tied to the existing Phase 2 Clerk production-instance/domain blocker.

Phase 10 Transactions MVP is complete for preview/development:

- `functions/_lib/transactions.ts` centralizes transaction payload parsing, date/amount/description validation, optional owned-account checks, user-scoped CRUD, hard removal, and ledger summaries.
- Authenticated `GET`/`POST /api/transactions` and `GET`/`PUT`/`DELETE /api/transactions/:id` now use the existing `transactions` table from migration `0001`.
- `/transactions` is a signed-in manual ledger workspace for adding income, expenses, transfers, and adjustments.
- The ledger includes summary tiles for net cash flow, income, expenses, latest transaction date, and transfer totals.
- Users can create transactions without linking an account, optionally attach an active owned account, edit saved rows inline, and remove rows.
- Balance CSV imports remain separate from transaction categorization and do not create transactions.
- Account data deletion clears transaction state in the SPA after confirmed D1 deletion.
- `src/transactions.test.ts` covers transaction payload validation, update validation, nullable optional fields, and summary math.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 55 frontend tests, and production build.
- Local authenticated API verification passed unauthenticated rejection, create validation, account-linked create, update, read, list summary, delete, and deleted-row `404`; disposable Clerk and local D1 data were removed.
- Local signed-out `/transactions` gate and signed-in `/transactions` desktop/mobile browser QA passed with no console errors or horizontal overflow.
- `npm run cf:deploy` deployed Phase 10 to `https://82e4b4b6.interactive-fire-calculator.pages.dev`.
- Live HTTP smoke passed for `/transactions`, `/calculators/fire`, and unauthenticated `GET /api/transactions -> 401`.
- `src/lib/fire.ts` remains unchanged.

Phase 11 Transaction Categorization and Cashflow Automation is complete for preview/development:

- `src/lib/transactionAnalytics.ts` now centralizes transaction filtering, category normalization, category suggestion options, visible-row filtering, monthly cashflow rollups, top expense categories, recent transactions, and uncategorized counts.
- `/transactions` now includes search, type, category, account, and date-range filters with clear visible-row summary math.
- Manual transaction category entry is polished with saved/starter category suggestions and uncategorized labeling.
- `/dashboard` now includes a monthly cashflow summary tile plus a detailed cashflow panel with income, expenses, net, row count, top expense categories, and recent manual transactions.
- `/reports` and Dashboard insights now include deterministic transaction recommendations for missing income rows, negative monthly cashflow, top expense category concentration, and uncategorized cleanup.
- Balance CSV imports remain separate from transactions; Phase 11 does not add transaction import, matching, or reconciliation automation.
- `src/lib/transactionAnalytics.test.ts` covers filters, categories, and cashflow rollups; `src/lib/insights.test.ts` covers transaction insight behavior.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 63 frontend tests, and production build.
- Local signed-out gate checks, signed-in desktop/mobile transaction filtering, dashboard cashflow, and reports transaction insight browser QA passed with no console errors or horizontal overflow.
- Disposable Clerk and local D1 verification data were removed after QA.
- `npm run cf:deploy` deployed Phase 11 to `https://959f0a17.interactive-fire-calculator.pages.dev`.
- `src/lib/fire.ts` remains unchanged.

Phase 12 Review-first Transaction Import and Reconciliation Planning is complete for preview/development:

- `/transactions` now includes a separate transaction CSV import workbench, distinct from account-balance imports.
- The exact transaction CSV contract is `transaction_date,description,amount,type,category,account,notes`, with any header order accepted and a 256 KB/500-row bound.
- Papa Parse handles CSV structure locally; only normalized row fields reach authenticated Pages Functions.
- Server review validates dates, positive amounts, transaction types, descriptions, optional category/notes, and optional active owned account links by ID or unambiguous exact name.
- Rows are classified as ready, duplicate, or rejected before commit, including duplicate detection against existing transactions and repeated file rows.
- Commit re-runs the complete review and writes one import audit record plus all approved transaction rows in D1.
- Transaction imports do not mutate `account_balances`, net-worth snapshots, or FIRE assumptions.
- Recent transaction import history is stored in the new `transaction_imports` table created by `migrations/0003_transaction_import_history.sql`.
- Migration `0003` is applied locally and to both configured remote D1 databases; the remote tables were created with `wrangler d1 execute --file` and recorded in `d1_migrations` after `wrangler d1 migrations apply --remote` hit a Cloudflare query endpoint authorization error.
- Account-data export/delete includes transaction import history.
- Unit coverage covers local CSV parsing, server payload validation, review states, and account-data export inclusion.
- `src/lib/fire.ts` remains unchanged.

Phases 13-16 and Phase 18 Public Calculator Library are complete for preview/development:

- `/calculators` is now a public searchable calculator hub instead of a placeholder.
- Stable public routes exist for 59 calculator pages across core planning, investing, borrowing, tax, India, and US-specific financial decisions.
- Shared calculator pages include H1 copy, a short intro, input panel, result panel, explanation notes, FAQ, and a conversion CTA.
- The library includes the requested calculators, including SIP, EMI, mortgage, compound interest, debt payoff, 401(k), tax-estimate, PPF/EPF/NPS, CAGR, XIRR, GST, PMI, HYSA, ROI, and more.
- Public calculators remain usable without auth; signed-out users see account-creation CTAs after results.
- Calculator routes update browser titles, descriptions, canonicals, and JSON-LD FAQ/application schema client-side.
- `public/sitemap.xml` lists the calculator hub, FIRE route, and every calculator route.
- Conversion CTAs route to the intended signed-in surfaces, but durable account-backed "save result" behavior remains Phase 17 scope.
- Calculator formula tests cover every calculator route with individual expected-output assertions plus edge cases for zero-rate loans, PPF, paycheck annualization, payoff loops, and balance-transfer payments.
- Phase 19 keeps public calculator copy user-facing, adds landing-page entry points to the full library, exposes input/result help in the calculator UI, and fixes calculator formula/unit issues found during review.
- `src/lib/fire.ts` remains unchanged.
- `./scripts/test_all.sh` passed with 79 Python tests, TypeScript typecheck, 198 frontend tests, and production build.
- Local browser smoke passed for `/calculators`, `/calculators/sip`, `/calculators/mortgage`, `/calculators/fire`, and signed-out `/transactions` at desktop and `390x844` mobile widths with no console errors or horizontal overflow.
- `npm run cf:deploy` deployed this milestone to `https://afdbe589.interactive-fire-calculator.pages.dev`.
- Live smoke passed for calculator hub, SIP calculator, mortgage calculator, FIRE route, signed-out Transactions gate, and unauthenticated `401` responses on transaction import endpoints.

## Next Phase

Phase 12 and the public calculator library through Phase 16 plus Phase 19 are implemented for preview/development. The next product-build phase is Phase 17 Calculator-to-Account Conversion Layer: durable save-result flows that turn calculator outputs into signed-in goals, accounts, plans, or transaction-tracking drafts. The next launch-critical step remains production Clerk setup, but the product owner has chosen to continue product phases and deal with that blocker later.

Remaining Phase 2 work:

1. Verify real sign up, sign in, sign out, signed-in route access, and `/api/me` on the Cloudflare Pages preview with a test user.
2. Run `clerk deploy` in a human terminal and configure the Clerk production instance for an owned domain.
3. Pull/set production Clerk keys when the production instance exists.
4. Re-run `./scripts/test_all.sh`, redeploy, and verify the production auth flow.
5. Do not call production auth launch-ready until a Clerk production instance/domain and production keys exist.

Phase 17 candidate first slice:

1. Add signed-in calculator save actions that create the intended goal/account/plan/transaction draft or durable saved calculator result.
2. Preserve signed-out calculator inputs/results through Clerk sign-up so users do not lose context.
3. Surface saved calculator-derived items on Dashboard and the relevant destination workspace.
4. Keep public calculators usable without auth and keep signed-out save CTAs honest.
5. Keep production Clerk setup as the launch-critical blocker until an owned domain and production keys are configured.

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
Phases 1 and 3 through 16 plus Phase 19 are complete for preview/development. Phase 12 adds reviewed transaction CSV imports, and Phases 13-16 plus Phase 18 add the public calculator library. Phase 19 completed calculator UX/formula assurance. Phase 17 durable calculator-to-account saves remain next. Phase 2 still has one launch blocker: Clerk needs a production instance/domain and production keys.

Next goal:
Either complete production Clerk setup for launch readiness or begin Phase 17 Calculator-to-Account Conversion Layer. Keep Clerk production auth/domain setup as a launch blocker.

Do not deploy Flask to Cloudflare Pages. Keep the FIRE engine in src/lib/fire.ts intact unless calculation behavior is explicitly in scope. Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when ready.
```

## Detailed Phase 17 Candidate Handoff Prompt

Use this more detailed prompt when starting the coding session that should begin the next product-build phase:

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
Phases 1 and 3 through 16 plus Phase 19 are complete for preview/development. Clerk development auth is integrated, but production auth is not launch-ready because the Clerk app has no production instance/domain or production keys. D1 stores profiles, saved FIRE plans, immutable versions, accounts, balances, goals, balance import audit history, transaction import audit history, transactions, and authenticated account-data export/delete readiness behind user-scoped Pages Functions. `/transactions` is a signed-in manual ledger with reviewed transaction CSV imports, search, filters, category suggestions, and visible-row summary math. `/calculators` is a public calculator hub with user-facing decision categories and 59 public calculator routes. `/dashboard` includes monthly transaction cashflow context; `/reports` includes deterministic transaction insights. `/plans` supports versioned planning and health evidence; `/accounts` supports manual balances plus reviewed balance CSV imports. `/settings` includes profile defaults plus privacy export/delete controls. `/calculators/fire` remains public. The FIRE engine in `src/lib/fire.ts` is intact. The legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

Latest known Cloudflare Pages preview:
https://afdbe589.interactive-fire-calculator.pages.dev

Branch alias:
https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev

Goal:
Begin Phase 17 candidate: Calculator-to-Account Conversion Layer, unless the product owner chooses to pause product expansion for production Clerk setup first.

Phase 17 candidate target:
- Add durable signed-in save-result flows for calculator outputs.
- Map calculator results into existing app surfaces: goals, accounts/liabilities, plans, or transaction-tracking drafts.
- Preserve signed-out calculator inputs/results through Clerk sign-up.
- Surface saved calculator-derived items on Dashboard and relevant destination workspaces.
- Preserve public calculator access without auth.
- Preserve public FIRE, accounts, goals, plans, reports, imports, Settings privacy controls, and `src/lib/fire.ts`.
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
- Keep Phase 8 recommendations deterministic and traceable; do not add AI-generated financial guidance until privacy, safety, and evidence constraints are explicit.
- Decide whether calculator saves can use existing goals/accounts/plans directly or need a small user-scoped calculator-results table.
- Keep calculator-derived writes explicit, reversible, and visible before creating durable user data.
- Keep the production Clerk blocker visible in all launch-readiness summaries.
- Update the three project memory documents as each phase slice completes.

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
