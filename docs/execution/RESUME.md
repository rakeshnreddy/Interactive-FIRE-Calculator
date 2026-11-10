# FinPath execution resume — 2026-11-10

**B71/C32 debt/loan reconciliation accepted; shared beta verified. 69 of 72 registered tasks done.** Accepted product commit `b39e5ab89a860c20b890ccb38e8a2d4faf875450`, baseline `main` `e2b77cebf279bdaaf26e2697eb910f7518cae1c6`, [PR #158](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/158), [C32 review](reviews/C32.md), [B71 submission](submissions/B71.md), [B71 contract](prompts/B71.md), [hosted evidence](evidence/C32/hosted.json), [provenance manifest](evidence/C32/manifest.json). Final documentation CI, merge, and `main` CI authority is the PR #158 landing receipt. Resolve its actual state before starting the next checkpoint; do not repeat completed B68/B70/B78/B71 releases.

## Working copy and exact next action

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. `Documents/ChatGPT` is stale at PR #138; preserve it. Current implementation branch is `codex/debt-loan-reconciliation`. Only owned changes were staged.

1. If PR #158 is open, wait for exact final-head CI on the documentation commit, merge PR #158 to `main`, and verify `main` CI green.
2. Once `main` is updated and `main` CI is green, register **B69 / C33** (Scenario sensitivity and return/XIRR disclosure from `docs/calculator-excellence/ANALYSIS_2026-10-18.md`) before implementation (`docs/execution/prompts/B69.md`, `TASK_STATUS.json`, `CHECKPOINTS.md`, `EXECUTION_BACKLOG.md`).
3. Remaining backlog after B71/C32:
   - **B69 / C33:** Scenario sensitivity and return/XIRR disclosure (input clamping, distinct scenario vectors, honest sensitivity labels, XIRR out-of-range convergence state, inflation-adjusted withdrawal schedules).
   - **B72 / C34:** US tax rules & retirement catch-up truth (2025 IRS brackets, Secure 2.0 catch-up, Roth MAGI phase-out, HSA family/individual toggle, Social Security bend points).
   - **B73 / C35:** India statutory schemes & tax regime truth (FY 2025-26 Section 87A rebate, NPS 75% equity cap, SSY whole-year deposit validation, SCSS ₹30L cap, HRA metro toggle).
   - **B74 / C36:** Calculator library & shared calculator template visual rollout (`CalculatorLibrary.tsx` & shared studio views).
   - **B75 / C37:** Dedicated calculator visual rollout & chart language (`HeroFireExample`, `XirrCalculator`, compound/savings/cashflow/vehicle/housing dedicated views).
   - **B76 / C39:** Signed-in workspace visual rollout & final legacy CSS retirement (`PlanningWorkspace`, `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/reports`, `/settings`).

## Verified shared-beta release (C32 / B71)

- **Stable beta alias:** [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev)
- **Beta immutable URL:** [`https://d8f0a5f4.interactive-fire-calculator.pages.dev`](https://d8f0a5f4.interactive-fire-calculator.pages.dev) (`d8f0a5f4-13fb-4bb3-99a3-5a76dbcc758c`)
- **Candidate immutable URL:** [`https://d416d469.interactive-fire-calculator.pages.dev`](https://d416d469.interactive-fire-calculator.pages.dev) (`d416d469-7c72-46c4-b5fe-0017cb1db723`)
- **Product source SHA:** `b39e5ab89a860c20b890ccb38e8a2d4faf875450`
- **Exact-head product CI:** [`42863937608`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/42863937608) (`SUCCESS`)
- **Suite & hosted verification:** 30 Node checks, 111 Vitest files / 2,863 tests, `tsc --noEmit`, build, 92 prerenders, and bundle isolation passed (`./scripts/test_all.sh`). Candidate, beta immutable, and beta alias all passed 84 public routes (`smoke_public_calculators.mjs`), and candidate + beta immutable both passed `scripts/hosted_smoke.mjs --scenario c32-debt-loans` (`preflight`, `d1-reachable`, `sign-in`, 10 `signed-in-shell` cases, 28 `anonymous-account-gates` cases, 64 `debt-loan-routes` cases with CSV final-row reconciliation, and verified 16-table zero-row cleanup on preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`).

## Compatibility and boundaries

- Never edit `src/lib/fire.ts` unless explicitly contracted.
- Rollback must retain all 14 `calculatorModelVersions` entries (`payback-v2`, `catch-up-v2`, `monthly-periodic-v1`, `dated-xirr-v1`, `vehicle-cost-v1`, `housing-budget-v1`, `savings-goal-monthly-v1`, `retirement-exact-term-v1`, `debt-payoff-v2`, `debt-strategy-v2`, `balance-transfer-v2`, `mortgage-recast-v2`, `pmi-ltv-v1`, `loan-boundary-v1`) and their slug mappings in `src/lib/calculatorModelVersion.ts`.
- Only preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` may be used. Production remains `3399dbbd8d7f0e6379972356a790b236e6b177b1` with automatic deployments off; never touch production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6`.
- OA-1/OA-3 production auth, B51 real-user evidence, B13/B14, and native reader/zoom deferrals remain gated. Raw logs in `docs/execution/evidence/**/raw/` remain untracked.
