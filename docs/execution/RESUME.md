# FinPath execution resume — 2026-11-10

**B69/C33 scenario perturbations & sensitivity drivers registered and in progress (`codex/scenario-sensitivity-reconciliation`). 69 of 73 registered tasks done.** Baseline `main` `24bf4362b633acc23cddbf7a2b5673dbc7f4a1c9` ([PR #158](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/158) merged, `main` CI [`42877768988`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/42877768988) `SUCCESS`). Active contract: [B69 contract](prompts/B69.md). Do not repeat completed B68/B70/B78/B71 releases.

## Working copy and exact next action

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. `Documents/ChatGPT` is stale at PR #138; preserve it. Current implementation branch is `codex/scenario-sensitivity-reconciliation`.

1. Write failing behavioral regressions first (`src/lib/scenarioSensitivityReconciliation.test.ts`), then implement **B69 / C33** across `src/lib/calculatorStudios.ts`, `src/lib/calculatorEngagement.ts`, `src/CalculatorLibrary.tsx`, and `scripts/smoke/c33-scenarios-sensitivity.mjs`.
2. Run `./scripts/test_all.sh`, conduct independent adversarial review, open PR #159, verify exact-head CI, deploy and verify isolated preview candidate + shared beta (`codex/finpath-quality-execution`), record `C33` evidence/submission/review, merge PR #159, and verify `main` CI green.
3. **Owner directive (2026-11-10 — `/unslop` staged visual overhaul):** Immediately after current work (`B69 / C33`) finishes and deploys, apply the `/unslop` skill (`/Users/Rakesh/.gemini/config/skills/unslop/SKILL.md` — 9-pass redline craft: 4px spacing grid, one tinted neutral ramp + single high-contrast accent, zero decorative glows/blobs/gradient text/emoji/uppercase-tracked slop, sentence-case labels, 400–600 weights with tabular figures, nested radii, quiet chrome with one rich focal chart/moment, purposeful `cubic-bezier(0.22, 1, 0.36, 1)` motion) across the site in shippable stages, pushing, releasing, and deploying to the shared beta (`codex/finpath-quality-execution`) and `main` after every stage so each visual stage is immediately live on the site if usage limits hit:
   - **B74 / C36 (Unslop Stage A — Calculator library & shared studio template):** Apply all 9 `/unslop` passes to `/calculators` and the shared calculator studio experience (`CalculatorLibrary.tsx`, studio headers, input panels, result hero, scenario cards, sensitivity drivers, schedule tables, and scope notices), deploy to beta, and merge.
   - **B76 / C39 (Unslop Stage B — Dedicated calculators, charts, workspace & legacy CSS retirement):** Apply all 9 `/unslop` passes to dedicated calculators (`HeroFireExample`, `XirrCalculator`, compound/savings/cashflow/vehicle/housing views), shared chart chrome, and signed-in workspace (`/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/reports`, `/settings`), retiring legacy `src/styles.css` slop rules, deploy to beta, and merge.
   - **B72 / C34, B73 / C35, B75 / C37:** Remaining calculator input validation (`B72`), dedicated planner/FIRE benchmark & currency fixes (`B73`), and schedule/copy refinements (`B75`), each released and deployed step by step.

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
