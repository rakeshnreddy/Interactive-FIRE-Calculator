# FinPath execution resume — 2026-11-21

**C44/B83 (Stage 1: Option A Split Financial Workbench & above-the-fold visual chart across all 75 shared studio calculators) accepted and shared-beta verified at `b22877cebb122db8024d8a67b8a01d08815ec83d` ([PR #169](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/169), [review](reviews/C44.md), [Gemini Argon review notes](GEMINI_ARGON_REVIEW_NOTES.md)). 80 of 83 registered tasks done.** All autonomous calculator-excellence (`B68`–`B75`), `/unslop` visual overhaul (`B70`, `B78`, `B74`, `B76`, `B79`, `B80`), FIRE Calculator Option A workbench & `/unslop` redline (`B81`, `B82`), and Stage 1 Shared Studio Split Workbench (`B83`) checkpoints are complete. Do not repeat completed releases.

## Working copy and exact next action

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. `Documents/ChatGPT` is stale at PR #138; preserve it.

1. **Optional Stage 2 rollout:** Apply the Option A Split Financial Workbench pattern to the remaining 8 dedicated planners (`/calculators/compound-interest`, `/calculators/savings-goal`, `/calculators/budget`, `/calculators/net-worth`, `/calculators/emergency-fund`, `/calculators/xirr`, `/calculators/lease-vs-buy`, and `/calculators/mortgage-affordability`) if requested by the owner.
2. **Remaining work is owner-gated only:** Production auth cutover (`OA-1`, `OA-3`), real-user cohort validation (`B51` / `OA-5`), paid offer (`B13`), mobile capability study (`B14`), and deferred native screen-reader & 200%-zoom sweeps (`DEFERRED_CHECKS.md`).

## Verified shared-beta release (C44 / B83)

- **Stable beta alias:** [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) (verified serving `assets/main-DsdrrSbO.js` & `assets/main-BYgDBc7q.css`)
- **Beta immutable URL:** [`https://090cdedb.interactive-fire-calculator.pages.dev`](https://090cdedb.interactive-fire-calculator.pages.dev) (`090cdedb-0983-4fb6-b940-c29f509a8cf7`)
- **Candidate immutable URL:** [`https://c64321b9.interactive-fire-calculator.pages.dev`](https://c64321b9.interactive-fire-calculator.pages.dev) (`c64321b9-ca6a-43d4-9c76-9b8136ca10d0`)
- **Product source SHA:** `b22877cebb122db8024d8a67b8a01d08815ec83d`
- **Exact-head product CI:** [`44978472742`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44978472742) (`SUCCESS`)
- **Suite & hosted verification:** `PATH=/opt/homebrew/bin:$PATH ./scripts/test_all.sh` passed (`30` Node script checks, `121` Vitest files / `2,974` tests including `5/5` in `src/CalculatorStudioWorkbench.test.tsx`, `tsc --noEmit`, Vite build `264.11 kB` / `40.66 kB` gzip CSS, `92` prerendered routes + `404.html`, and bundle isolation `26` standard + `28` preview-auth production assets with `0` fixture leaks). Candidate, immutable beta, and stable beta alias all passed 84 public routes (`smoke_public_calculators.mjs`), and candidate + immutable beta both passed all 7 stages of `scripts/hosted_smoke.mjs --scenario c41-unslop-final-polish` (`16` routes / `74` live cases including `/calculators/mortgage` and `/calculators/sip` Option A workbench fold & single-border checks, `/calculators/fire#calculated`, `/calculators/fire#refinements`, and signed-in `/dashboard`, `globalMinContrast: 4.58`, cold-load `/calculators/mortgage` `LCP: 428ms`, `CLS: 0.0348`, `errors: []`, and verified 16-table zero-row cleanup + Clerk provider deletion on preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`).

## Compatibility and boundaries

- Never edit `src/lib/fire.ts` unless explicitly contracted.
- Rollback must retain all 14 `calculatorModelVersions` entries (`payback-v2`, `catch-up-v2`, `monthly-periodic-v1`, `dated-xirr-v1`, `vehicle-cost-v1`, `housing-budget-v1`, `savings-goal-monthly-v1`, `retirement-exact-term-v1`, `debt-payoff-v2`, `debt-strategy-v2`, `balance-transfer-v2`, `mortgage-recast-v2`, `pmi-ltv-v1`, `loan-boundary-v1`) and their slug mappings in `src/lib/calculatorModelVersion.ts`.
- Only preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` may be used. Production remains `3399dbbd8d7f0e6379972356a790b236e6b177b1` with automatic deployments off; never touch production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6`.
- OA-1/OA-3 production auth, B51 real-user evidence, B13/B14, and native reader/zoom deferrals remain gated. Raw logs in `docs/execution/evidence/**/raw/` remain untracked.
