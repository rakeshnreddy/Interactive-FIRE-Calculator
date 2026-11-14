# FinPath execution resume — 2026-11-14

**C35/B73 accepted and shared-beta verified at `171c3f57c7d725b882accd947a68a2b7edd94dd0` ([PR #163](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/163), [review](reviews/C35.md)). 74 of 77 registered tasks done.** Do not repeat completed B68/B70/B78/B71/B69/B74/B76/B72/B73 releases.

## Working copy and exact next action

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. `Documents/ChatGPT` is stale at PR #138; preserve it.

1. Confirm `main` is at merged [PR #163](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/163) and `main` CI is green.
2. Register and execute **B75 / C37 (Charts, schedules, statutory provenance links & P2/P3 copy honesty across all studios)** from `docs/calculator-excellence/ANALYSIS_2026-10-18.md` (`TAX-05`, `TAX-08`, `TAX-09`, `RET-04`, `RET-05`, `RET-07`, `RET-08`, `RINC-05`, `RINC-06`, `RINC-09`, `RINC-11`, `RINC-14`, `RINC-16`, `DEBT-04`, `DEBT-06`, `DEBT-07`, `GGS-04`, `GGS-05`, `GGS-06`, `GGS-08`, `GGS-09`, `GGS-10`, `LH-09`, `LH-10`, `LH-11`): write failing tests first while keeping headline engine goldens preserved and legacy snapshots readable, run `./scripts/test_all.sh` + independent adversarial review + exact-head CI, deploy candidate and shared beta (`codex/finpath-quality-execution`) with `hosted_smoke.mjs`, write closure docs, and merge to `main`.

## Verified shared-beta release (C35 / B73)

- **Stable beta alias:** [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev)
- **Beta immutable URL:** [`https://2dbcfae0.interactive-fire-calculator.pages.dev`](https://2dbcfae0.interactive-fire-calculator.pages.dev) (`2dbcfae0-7f99-489e-aea7-06ba8587f7e3`)
- **Candidate immutable URL:** [`https://1ed863af.interactive-fire-calculator.pages.dev`](https://1ed863af.interactive-fire-calculator.pages.dev) (`1ed863af-8ca1-4595-99bb-9c568df8667e`)
- **Product source SHA:** `171c3f57c7d725b882accd947a68a2b7edd94dd0`
- **Exact-head product CI:** [`43620374133`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/43620374133) (`SUCCESS`)
- **Suite & hosted verification:** 30 Node script checks, 116 Vitest files / 2,945 tests (`6/6` in `src/DedicatedPlannersIntegrity.test.tsx`), `tsc --noEmit`, build, 92 prerendered routes + `404.html`, and bundle isolation (26 standard and 28 preview-auth production assets, `0` fixture leaks) passed (`./scripts/test_all.sh`). Candidate, beta immutable, and beta alias all passed 84 public routes (`smoke_public_calculators.mjs`), and candidate + beta immutable both passed `scripts/hosted_smoke.mjs --scenario c35-dedicated-planners` (all 6 stages passed, including 10 `signed-in-shell` cases + 6 focus checks, 28 `anonymous-account-gates` cases, 40 layout cases across 5 routes, 6 interactive DOM & signed-in persistence checks, `errors: []`, and verified 16-table zero-row cleanup + Clerk provider deletion on preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`).

## Compatibility and boundaries

- Never edit `src/lib/fire.ts` unless explicitly contracted.
- Rollback must retain all 14 `calculatorModelVersions` entries (`payback-v2`, `catch-up-v2`, `monthly-periodic-v1`, `dated-xirr-v1`, `vehicle-cost-v1`, `housing-budget-v1`, `savings-goal-monthly-v1`, `retirement-exact-term-v1`, `debt-payoff-v2`, `debt-strategy-v2`, `balance-transfer-v2`, `mortgage-recast-v2`, `pmi-ltv-v1`, `loan-boundary-v1`) and their slug mappings in `src/lib/calculatorModelVersion.ts`.
- Only preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` may be used. Production remains `3399dbbd8d7f0e6379972356a790b236e6b177b1` with automatic deployments off; never touch production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6`.
- OA-1/OA-3 production auth, B51 real-user evidence, B13/B14, and native reader/zoom deferrals remain gated. Raw logs in `docs/execution/evidence/**/raw/` remain untracked.
