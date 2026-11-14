# FinPath execution resume — 2026-11-14

**C37/B75 accepted and shared-beta verified at `e9e4963d0eff19c3c6cf20bcb0b2b50089633254` ([PR #164](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/164), [review](reviews/C37.md)). 75 of 78 registered tasks done — all 10 bounded checkpoints (`B68`–`B78` / `C30`–`C39`) from `docs/calculator-excellence/ANALYSIS_2026-10-18.md` are now accepted and shared-beta verified.** Do not repeat completed B68/B70/B78/B71/B69/B74/B76/B72/B73/B75 releases.

## Working copy and exact next action

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. `Documents/ChatGPT` is stale at PR #138; preserve it.

1. Confirm `main` is at merged [PR #164](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/164) and `main` CI is green.
2. Execute the user-requested **staged `/unslop` visual overhaul pass** on top of the already-shipped visual stages (`B70/C31` shell/tokens, `B78/C38` homepage, `B74/C36` Stage A studios, `B76/C39` Stage B dedicated/charts/workspace/legacy CSS retirement): audit rendered desktop/mobile light/dark surfaces against `/unslop` (`signs.md`, `tokens.md`, `visuals.md`), establish direction and visual craft improvements, and release/deploy sequentially in small stages to candidate + shared beta (`codex/finpath-quality-execution`) + `main` after each stage.
3. Production cutover (`OA-1`, `OA-3`), real-user validation (`B51`), paid offer (`B13`), and mobile capability study (`B14`) remain owner-gated.

## Verified shared-beta release (C37 / B75)

- **Stable beta alias:** [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev)
- **Beta immutable URL:** [`https://54c96047.interactive-fire-calculator.pages.dev`](https://54c96047.interactive-fire-calculator.pages.dev) (`54c96047-fbbc-4982-a65b-b9ce8018f451`)
- **Candidate immutable URL:** [`https://f4433442.interactive-fire-calculator.pages.dev`](https://f4433442.interactive-fire-calculator.pages.dev) (`f4433442-1dcd-4eba-bb6f-09d00c9bc0e2`)
- **Product source SHA:** `e9e4963d0eff19c3c6cf20bcb0b2b50089633254`
- **Exact-head product CI:** [`43626312918`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/43626312918) (`SUCCESS`)
- **Suite & hosted verification:** Focused Vitest suites passed `670/670` across `4` files (`12/12` in `src/ChartsSchedulesCopyHonesty.test.tsx`); `PATH=/opt/homebrew/bin:$PATH ./scripts/test_all.sh` passed (`30` Node script checks, `117` Vitest files / `2,957` tests, `tsc --noEmit`, build, `92` prerendered routes + `404.html`, and bundle isolation `26` standard + `28` preview-auth production assets with `0` fixture leaks). Candidate, beta immutable, and beta alias all passed 84 public routes (`smoke_public_calculators.mjs`), and candidate + beta immutable both passed `scripts/hosted_smoke.mjs --scenario c37-charts-schedules-copy` (all 6 stages passed, including `10` `signed-in-shell` cases + `6` focus checks, `28` `anonymous-account-gates` cases, `40` layout cases across `5` routes + `10` interactive DOM checks, `errors: []`, and verified 16-table zero-row cleanup + Clerk provider deletion on preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`).

## Compatibility and boundaries

- Never edit `src/lib/fire.ts` unless explicitly contracted.
- Rollback must retain all 14 `calculatorModelVersions` entries (`payback-v2`, `catch-up-v2`, `monthly-periodic-v1`, `dated-xirr-v1`, `vehicle-cost-v1`, `housing-budget-v1`, `savings-goal-monthly-v1`, `retirement-exact-term-v1`, `debt-payoff-v2`, `debt-strategy-v2`, `balance-transfer-v2`, `mortgage-recast-v2`, `pmi-ltv-v1`, `loan-boundary-v1`) and their slug mappings in `src/lib/calculatorModelVersion.ts`.
- Only preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da` may be used. Production remains `3399dbbd8d7f0e6379972356a790b236e6b177b1` with automatic deployments off; never touch production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6`.
- OA-1/OA-3 production auth, B51 real-user evidence, B13/B14, and native reader/zoom deferrals remain gated. Raw logs in `docs/execution/evidence/**/raw/` remain untracked.
