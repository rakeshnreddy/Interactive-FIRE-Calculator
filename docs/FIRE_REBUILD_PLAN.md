# Interactive FIRE Calculator Rebuild Plan

> Product scope update, June 7, 2026: this plan is now historical context for the FIRE module rebuild. The broader product direction is a comprehensive personal financial tracker and planner with the FIRE calculator as the first planning module. Read [Financial platform handoff](FINANCIAL_PLATFORM_HANDOFF.md) before starting new work.

## Product Intent

Build a practical retirement and FIRE planning tool that helps a user answer four core questions:

1. How much portfolio value do I need to support my expected expenses?
2. Given a portfolio, what initial annual spending level is sustainable?
3. How do return, inflation, cashflow events, withdrawal timing, and desired final balance affect the plan?
4. How do multiple scenarios compare side by side?

The calculator should be educational and transparent. It must clearly state that deterministic projections are planning estimates, not financial advice.

## Current State Summary

The codebase started as a Flask/Jinja application with Plotly charts. A TypeScript rewrite is now being introduced at the repository root as the future production app for Cloudflare Pages, while the Flask code remains as a legacy parity harness until the new app reaches feature parity.

The legacy product has three partially overlapping flows:

- Wizard flow: expenses, rates, one-offs, summary, results.
- Compare flow: client-generated scenario cards submitted to `/compare`.
- Legacy direct calculator flow: still implemented in `/`, `/update`, and `templates/result.html`, but not exposed from the current home page.

The app has useful foundations, but early agent-generated drift created duplicated logic, stale tests, inconsistent UI dependencies, and ambiguous calculation semantics.

## High-Risk Findings

### Calculation

- `find_max_annual_expense` previously under-estimated sustainable withdrawals because it did not expand the upper bisection bound when the initial guess was still sustainable.
- `annual_simulation` returns different balance semantics for start-of-year and end-of-year withdrawals.
- One-off event years are ambiguous. The core expects relative years starting at 1, but wizard tests and user-facing labels suggest calendar years.
- Core validation is thin: invalid withdrawal timing, malformed rate periods, unrealistic rates, and out-of-range events are not consistently rejected.
- There is no structured per-year result record, so routes and templates infer meaning from parallel arrays.

### UI And Presentation

- The app mixes Bootstrap classes, custom Tailwind-like utilities, and custom CSS. Bootstrap was referenced but not loaded before cleanup.
- `templates/result.html` contained a pasted copy of `main.css` after the real template block.
- Compare UI hardcodes scenarios in JavaScript and ignores server-provided/query-prefill scenarios.
- Settings and theme behavior use inconsistent local storage keys and some unavailable runtime helpers.
- Mobile navigation, modal accessibility, tooltips, and live update feedback need accessibility work.

### Tests And Tooling

- Tests did not collect because generated artifacts were present in Python files.
- `pytest` was not listed in project dependencies.
- Many route tests are stale: old field names, missing Flask app contexts, removed helper mocks, and outdated validation expectations.
- Finance tests were mostly green, but the max-withdrawal assertion had been disabled.

## Rebuild Principles

- One calculation engine, many presentation surfaces.
- One validated input schema shared by wizard, compare, exports, AJAX, and future APIs.
- Structured year-by-year output instead of parallel arrays with implicit meaning.
- Deterministic formulas first; advanced Monte Carlo and tax support only after the deterministic contract is stable.
- UI controls must match real behavior. Do not show save/load, export, or compare affordances until they work.
- Tests should pin contracts before broad UI polish.

## Technical Direction

### Language And Framework Decision

Use TypeScript, React, and Vite for the production rewrite.

Rationale:

- Cloudflare Pages runs static assets and JavaScript/TypeScript Pages Functions; it does not host Python/Flask/Gunicorn directly.
- The calculator is an interactive planning workspace, so a typed React SPA is a better fit than server-rendered Flask templates.
- Vite keeps the build small, fast, and Cloudflare Pages-friendly.
- The finance model can be tested with Vitest and eventually shared by browser UI and optional Pages Functions.
- Flask remains useful during migration because its Python tests provide golden calculator fixtures.

Astro remains a good option if the product later becomes content-heavy, but the first production target is Vite + React because the first screen should be the usable calculator, not a content shell.

### Target Repository Shape

- `src/`: TypeScript React application.
- `src/lib/fire.ts`: deterministic FIRE model and solvers.
- `src/lib/*.test.ts`: TypeScript parity tests.
- `functions/`: optional Cloudflare Pages Functions.
- `public/`: static assets and SPA redirects.
- `dist/`: generated Cloudflare Pages output.
- `app.py`, `project/`, `templates/`, `static/`: legacy Flask app retained until parity.

### Cloudflare Pages Decision

Deploy `dist/` from `npm run build` to a Pages project named `interactive-fire-calculator`.

Current Cloudflare account state on June 6, 2026:

- Existing Pages projects: `ipl-playoff-pulse`, `spy-options-analyzer-web`.
- Created Pages project: `interactive-fire-calculator`.
- Current deployment URL: `https://025c08aa.interactive-fire-calculator.pages.dev`.
- Current branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`.
- Production auto-deploy is disabled until the TypeScript rewrite is ready to merge.

Deployment flow:

1. Build locally with `npm run build`.
2. Preview with `npm run cf:dev`.
3. Deploy with `./scripts/deploy_cloudflare_pages.sh` or `npm run cf:deploy`.
4. After the first successful deployment, connect GitHub main branch to Cloudflare Pages for automatic preview and production builds.

Do not deploy the Flask app directly to Cloudflare Pages. Any future server behavior must be implemented as TypeScript Pages Functions or moved to a separate Worker/API service.

### Theme Direction

Consolidate theme choice to three moods with light/dark variants:

- Aurora: balanced blue, teal, and rose.
- Lagoon: teal, sky, and warm gold.
- Ember: coral, indigo, and mint.

The production UI should use glassy panels, blended gradients, high-contrast text, compact controls, and stable responsive dimensions. Navigation must expose desktop tabs, mobile menu behavior, and clickable breadcrumbs.

## Target Calculation Model

Create a core module that exposes:

- `PlanInput`
  - `initial_portfolio`
  - `initial_annual_expenses`
  - `desired_final_value`
  - `withdrawal_timing`
  - `periods`
  - `one_off_events`
  - `currency`
- `RatePeriod`
  - `duration_years`
  - `nominal_return`
  - `inflation`
- `CashflowEvent`
  - `year`
  - `amount`
  - `label`
  - `kind`
- `YearResult`
  - `year`
  - `starting_balance`
  - `withdrawal`
  - `one_off_cashflow`
  - `growth`
  - `ending_balance`
  - `inflation_rate`
  - `return_rate`
  - `is_depleted`
- `PlanResult`
  - `required_portfolio`
  - `max_annual_expense`
  - `final_balance`
  - `years`
  - `warnings`

The old tuple-returning functions can remain as compatibility wrappers until routes are migrated.

## Step-Based Task System

### Phase 0: Stabilize The Repository

Owner: main agent plus test-maintenance worker.

Tasks:

- Fix syntax and generated-marker artifacts.
- Add development dependency metadata for tests.
- Restore test collection.
- Separate stale tests from real regressions.
- Add a basic smoke command for local verification.

Acceptance:

- `python -m compileall app.py project tests` passes.
- `pytest tests/test_finance_core.py` passes.
- Full pytest suite runs to completion, even if route tests still fail while being updated.

### Phase 1: Calculation Contract

Owner: calculation worker.

Tasks:

- Add structured dataclasses for inputs and year results.
- Normalize one-off year semantics as relative plan years (`1` through total duration).
- Add validation for periods, rates, withdrawal timing, desired final value, and events.
- Fix start/end withdrawal timeline consistency.
- Keep compatibility wrappers for current routes.
- Add inverse/property tests for required portfolio and max expense.
- Port the validated contract to `src/lib/fire.ts`.
- Preserve Python golden cases in Vitest parity tests before changing semantics.

Acceptance:

- Deterministic core tests cover start and end withdrawals, multi-period rates, one-offs, desired final value, zero withdrawals, negative returns, and high final-value cases.
- `find_required_portfolio` and `find_max_annual_expense` converge to simulations that meet the desired final value within tolerance.

### Phase 2: Input Normalization Layer

Owner: backend routes worker.

Tasks:

- Create parser functions for wizard form data, compare form data, query-prefill data, and AJAX JSON.
- Make all parsers return the same validated `PlanInput` shape.
- Replace duplicate parsing logic in `project/routes.py` and `project/wizard_routes.py`.
- Standardize error messages and HTTP status codes for JSON endpoints.

Acceptance:

- Wizard, compare, and AJAX recalculation use shared parsing helpers.
- Compare accepts both current client field names and query-prefill values.
- Route tests verify invalid inputs return clear user-facing errors.

### Phase 3: UI Foundation

Owner: UI worker.

Tasks:

- Build the production UI in React/TypeScript.
- Consolidate theme moods to Aurora, Lagoon, and Ember with light/dark variants.
- Implement glassmorphic panels, gradient backgrounds, and compact controls.
- Implement desktop navigation, mobile navigation, and clickable breadcrumbs.
- Keep the legacy Flask CSS functional until the Vite app replaces it.

Acceptance:

- Main pages render correctly on mobile and desktop.
- Calculator, results, compare, assumptions, mobile menu, mood controls, and breadcrumbs work without console errors.
- Color variables resolve and text has acceptable contrast.

### Phase 4: Interactive Results Experience

Owner: frontend/results worker.

Tasks:

- Rebuild results view around the structured `YearResult` model.
- Show key metrics, assumptions, warnings, charts, and an accessible year-by-year table.
- Keep what-if changes client-side for the first Cloudflare Pages release.
- Add Pages Functions only for share links, persistence, or server-generated exports after browser parity.

Acceptance:

- Changing annual expenses updates required portfolio and charts.
- Changing portfolio updates max spending and charts.
- Tables, charts, and key metrics all refer to the same simulation data.

### Phase 5: Scenario Comparison

Owner: compare worker.

Tasks:

- Replace the legacy hardcoded compare template with typed scenario state.
- Add base, guardrail, and upside variants first.
- Add user-defined scenario editing after the base planner is stable.
- Support URL/localStorage prefill after state schema is finalized.

Acceptance:

- Query params from results prefill scenario 1.
- Reordering scenarios does not submit the wrong fields.
- Disabled scenarios are excluded cleanly.
- Summary table and combined charts reflect the same API response.

### Phase 6: Documentation And Trust

Owner: docs/content worker.

Tasks:

- Update README to match shipped features.
- Add explanation of nominal return, inflation, desired final balance, withdrawal timing, and one-off event semantics.
- Add disclaimer and methodology notes.
- Move unshipped features to planned enhancements.

Acceptance:

- README usage instructions match the live UI.
- Users can understand what the calculator assumes and what it does not model.

## Suggested Multi-Agent Split

- Calculation agent: owns `src/lib/fire.ts`, TypeScript parity tests, `project/financial_calcs.py`, and `tests/test_finance_core.py`.
- App agent: owns `src/App.tsx`, React state, navigation, breadcrumbs, and interactive flows.
- Theme agent: owns `src/styles.css`, mood tokens, responsive layout, and visual QA.
- Cloudflare agent: owns `package.json`, `wrangler.toml`, `functions/`, deployment scripts, and Pages project setup.
- Legacy agent: owns compatibility cleanup in `project/`, `templates/`, and `static/` until migration is complete.
- QA agent: owns Python tests, Vitest tests, browser smoke tests, and regression scenarios.
- Documentation agent: owns README, methodology, and feature roadmap.

Agents must use disjoint write sets when working in parallel. Any change that alters the calculation schema should be merged before route/UI workers begin schema-dependent edits.

## Immediate Completed Cleanup

- Restored Python test collection by removing generated artifacts from `tests/test_app.py`.
- Added `requirements-dev.txt` with `pytest`.
- Fixed `find_max_annual_expense` upper-bound expansion and re-enabled the disabled max-withdrawal assertion.
- Removed the pasted CSS tail from `templates/result.html`.
- Removed generated markers from `static/css/main.css`.
- Loaded Bootstrap explicitly in `templates/base.html`.
- Added CSS aliases for stale `--mockup-fire-*` variables.
- Added a Vite + React + TypeScript Cloudflare Pages app scaffold.
- Ported the deterministic finance model to `src/lib/fire.ts`.
- Added Vitest parity tests for the Python finance baselines.
- Added Cloudflare Pages config, `_redirects`, and `/api/health` Pages Function.
- Added local scripts for Node bootstrap, web dev, legacy dev, all tests, and Pages deploy.

## Next Recommended Sprint

1. Install Node/npm locally and generate the lockfile with `./scripts/bootstrap_node.sh`.
2. Run `./scripts/test_all.sh` and fix any TypeScript dependency or Cloudflare config drift.
3. Browser-test the Vite app across planner, results, compare, assumptions, mobile nav, breadcrumbs, and all three moods in light/dark.
4. Expand the React app with editable custom scenarios and year-by-year table export.
5. Keep the Cloudflare Pages project connected to GitHub previews, then enable production auto-deploy after the PR merges.

## Scope Expansion: Comprehensive Retirement Calculator

Date: June 6, 2026

The TypeScript/Cloudflare rewrite foundation is about 70% complete for the original migration scope:
calculation parity, a modern React app shell, theme moods, chart/table results, scenario comparison,
Cloudflare deployment, and local scripts are in place.

The expanded product scope is broader than the original migration. Against the new goal of a
comprehensive retirement calculator website, the product is closer to 65% complete after the first
guided-assumptions sprint. The next work should prioritize scenario persistence refinements,
sensitivity analysis, and risk modeling before advanced tax/account modeling.

### Current Product Feedback

- The engine already calculates both inverse questions, but the UI does not make them first-class:
  users need an explicit path for "annual withdrawal need to FIRE number" and another path for
  "FIRE number to annual withdrawal amount."
- The first screen reads like an internal planning dashboard. It should become a cleaner hero
  workspace with short, clickable calculator panels and fewer explanatory paragraphs.
- The core planner exposes advanced assumptions before the user has picked a goal. That makes the
  app feel busier than the workflow needs to be.
- "Current portfolio" is overloaded. In withdrawal-income mode, the same value is really the
  portfolio or FIRE number the user wants to test.
- Results, tables, warnings, and scenarios are useful, but they should be positioned as secondary
  detail after the primary calculator path is clear.
- The current warning cards are valuable but visually prominent. Future iterations should compress
  them into a health strip or expandable diagnostics panel.
- The copy needs to be more professional and terse. Labels should carry meaning; long helper text
  should move into methodology or tooltips.

### High-Value Feature Backlog

Priority 0: Core calculator clarity

- Need-to-number calculator: annual withdrawal need, final estate target, return/inflation periods,
  and one-off cash flows produce a required FIRE number.
- Number-to-income calculator: given a portfolio or FIRE number, timeline, final estate target,
  return/inflation periods, and one-off cash flows produce an initial annual withdrawal amount.
- Clickable hero panels for both calculators, Results, and Scenario Compare.
- Compact primary result panel that changes based on the selected calculator path.
- Progressive disclosure for advanced assumptions.

Priority 1: Retirement planning completeness

- Age-based timeline: current age, retirement age, end age, and optional life expectancy.
- Income streams: Social Security, pensions, rental income, annuities, part-time income, and start/end years.
- Expense phases: baseline retirement spending, early retirement bridge spending, healthcare,
  mortgage payoff, education, travel, and late-life care.
- Saved scenarios in localStorage plus JSON import/export.
- Shareable scenario links using URL-safe encoded state.
- Better diagnostics: depletion year, funding gap, safe withdrawal rate, margin of safety, and
  assumption stress labels.

Priority 2: Risk and strategy modeling

- Withdrawal strategies: constant real spending, fixed-percent withdrawal, guardrails, and variable
  percentage withdrawal.
- Sequence-risk presets and sensitivity analysis for returns, inflation, and spending.
- Monte Carlo success probability using configurable return/volatility assumptions.
- Historical backtesting against major market periods.
- Lean FIRE, Fat FIRE, Coast FI, and Barista FI calculators that reuse the same model.

Priority 3: Taxes, accounts, and household modeling

- Account buckets: taxable, traditional pre-tax, Roth, cash, and pension-like income.
- Basic tax estimates for federal/state ordinary income and capital gains.
- Required minimum distribution and Roth conversion planning hooks.
- Household mode for spouse/partner income streams and staggered retirement ages.
- Healthcare and insurance assumptions before Medicare eligibility.

Priority 4: Trust, education, and conversion quality

- Methodology page explaining nominal returns, inflation, withdrawal timing, and limitations.
- Plain-language disclaimers that the tool is educational and not financial advice.
- PDF report export with inputs, charts, scenarios, and warnings.
- Accessible keyboard flow, screen-reader labels, and color contrast audits.
- SEO/content pages for FIRE number, safe withdrawal rate, retirement income, and Monte Carlo planning.

### Phased Implementation Plan

Phase A: First-screen product clarity

- Add explicit calculator modes: "Find my FIRE number" and "Find my annual withdrawal."
- Replace the dense dashboard hero with short clickable panels.
- Make the active calculator mode control field labels, primary result labels, and result emphasis.
- Reduce visible copy in the planner, results, compare, and assumptions sections.
- Keep all existing deterministic math and tests intact.

Phase B: Guided retirement assumptions

- Add age-based timeline inputs and convert them to modeled duration.
- Add income streams and expense phases as structured rows.
- Add local scenario save/load and JSON import/export.
- Add better validation states near the fields that caused each warning.

Phase C: Scenario and risk expansion

- Add sensitivity panels for return, inflation, and spending changes.
- Add guardrail withdrawal strategy and sequence-risk presets.
- Add Monte Carlo and historical backtest modules once deterministic contracts are stable.

Phase D: Tax/account modeling

- Add account buckets and basic tax treatment.
- Introduce retirement-account-specific constraints only after simple account buckets are stable.
- Keep tax estimates visibly labeled as rough planning estimates.

Phase E: Sharing, reports, and production hardening

- Add URL share links, report export, and methodology pages.
- Add browser E2E tests for navigation, theme modes, calculator mode switching, exports, and mobile.
- Enable production Cloudflare deployment after PR review and final QA.

### Immediate Phase A Tasks

1. Add `CalculatorMode` state and calculator metadata in `src/App.tsx`.
2. Replace the current hero summary with concise clickable panels.
3. Make planner fields and primary metrics mode-aware.
4. Add a compact result highlight that explicitly shows both inverse outputs.
5. Update CSS for hero panels, mode cards, compact copy, and responsive behavior.
6. Validate with typecheck, Vitest, production build, and browser QA on desktop and mobile.

### Completed Phase B Slice

- Added age-based timeline inputs and synchronized the modeled market-period duration.
- Added recurring income streams for Social Security, pension, rental, annuity, or work income.
- Added recurring expense phases for healthcare bridges, mortgage, travel, and late-life care.
- Extended the deterministic engine with recurring cash-flow validation and year-by-year output
  for base withdrawal, recurring income, recurring expense, and net withdrawal.
- Added local saved plans plus JSON import/export for complete scenario snapshots.
- Added field-level diagnostics from structured model warnings.
- Expanded projection CSV/table output to include recurring income and expense columns.
