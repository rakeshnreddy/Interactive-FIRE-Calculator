# B21 Validation Matrix: Numerically Honest and Accessible Shared Charts

- **Task**: B21 — Make shared charts numerically honest and accessible
- **Checkpoint**: C04
- **Date**: 2026-09-13
- **Baseline Commit**: `22b3250` (post-B20)

## Implementation Requirements Matrix

| ID | Criterion | Expected Behavior | Verification Method / Fixture | Outcome | Observations |
|---|---|---|---|---|---|
| R01 | True zero representation | Zero-valued entries have bar fill width = 0%; optional zero marker is distinct from quantitative filled bars; no fake 8% minimum width | Unit tests in `src/lib/calculatorChartTruth.test.tsx` & Playwright inspection on Mortgage Month 0 interest and Month 360 balance | **PASS** | Month 0 interest has `width: 0%` and `.calculator-zero-marker`; Month 360 principal balance has `width: 0%` and `.calculator-zero-marker`. Verified in unit tests and browser DOM. |
| R02 | Negative value support & baseline | Negative values are visually differentiated with negative styling/direction from a zero baseline (`.calculator-chart-baseline`), preserving sign and truth | Unit tests with negative entries & Playwright on CAGR calculator (`final = 5000`, `initial = 10000`) | **PASS** | All rows in CAGR fixture render `.is-negative`, display negative return percentages (`-12.94%`), render `.calculator-chart-baseline`, and position fills to the left of the baseline. |
| R03 | Elimination of heterogeneous multi-unit bars | Remove `.calculator-visual-bars` that normalized unrelated units (currency, months, percent) onto a shared scale | DOM query across Mortgage, SIP, India Tax asserting total absence of `.calculator-visual-bars` | **PASS** | `.calculator-visual-bars` count is 0 in all calculators across both themes and all viewports. |
| R04 | Two labeled series with swatches & values | Both primary and secondary values are textually exposed with proper formatting; legend includes visual swatches (`.calculator-legend-swatch`) | Unit tests and Playwright asserting primary and secondary labels/values and swatches | **PASS** | Swatch count $\ge 1$ across all calculators. Primary and secondary values both rendered in text with matching legend swatches (`.swatch-primary`, `.swatch-secondary`). |
| R05 | Accessible tabular alternative | Provide a semantic `<table>` alternative with `<thead>`, `<tbody>`, `scope="col"`, `scope="row"` for all chart entries inside `<details>` | Unit tests & Playwright accessibility inspection | **PASS** | Semantic table `<table className="calculator-chart-table">` present with proper `th[scope="col"]` and `th[scope="row"]` headers inside expandable details. |
| R06 | Engine purity | Zero changes to financial formulas, engine math, or rounding rules. `src/lib/fire.ts` untouched. | Git status check and Vitest full studio and SEO test suite | **PASS** | `src/lib/fire.ts` is unmodified; all 641 engine and studio calculation tests pass without regression. |

## Validation Results

| ID | Gate | Command / Layer | Target | Result | Evidence |
|---|---|---|---|---|---|
| V01 | Targeted Chart Truth Unit Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/calculatorChartTruth.test.tsx` | 5 unit tests covering zero width, negative geometry, dual series values, swatches, and accessible table | **PASS** (5/5 passed) | `src/lib/calculatorChartTruth.test.tsx` |
| V02 | Full Studio & SEO Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/seoCalculators.test.ts src/lib/calculatorStudios.test.ts src/CalculatorLibraryDetail.test.tsx src/lib/mortgageReconciliation.test.ts` | 658 tests across all calculator suites | **PASS** (658/658 passed) | Vitest test runner |
| V03 | Multi-Viewport Browser Verification | `PATH="/opt/homebrew/bin:$PATH" node docs/execution/evidence/B21/verify_b21.cjs` | 13 test cases across Mortgage, SIP, India Tax, CAGR (negative fixture) at 320, 390, 768, 1440 in Light & Dark modes | **PASS** (13/13 cases passed) | `docs/execution/evidence/B21/verify_b21_results.json` and 13 screenshots |
