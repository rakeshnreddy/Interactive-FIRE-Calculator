# B21 Working Contract: Numerically Honest and Accessible Shared Charts

- **Task**: B21 — Make shared charts numerically honest and accessible
- **Checkpoint**: C04
- **Date**: 2026-09-13
- **Owner**: FinPath implementation agent
- **Baseline Commit**: `22b3250` (post-B20)

## Context & User Problem

In generic calculators:
1. When a chart entry is zero (e.g. $0 extra payment, 0 balance, or 0 tax), the chart rendered a minimum 8% width positive bar (`Math.max(8, ...)`), misrepresenting zero as a positive magnitude.
2. Negative values (e.g. net negative cashflow, negative capital gains, or net loss) were passed through `Math.abs()`, inverting negative quantities into positive bars without sign indication or directional baseline.
3. The `.calculator-visual-bars` block rendered the first 4 metrics on a shared bar chart. In calculators like Mortgage, this mixed currency ($1,896 payment, $382,633 interest) with tenure (360 months), normalizing completely unrelated units onto an absurd shared scale.
4. Secondary series (e.g. comparison values) only had an unlabeled visual track with no accessible text value or swatch pairing in the legend.
5. No semantic table or text alternative was available for screen readers or tabular analysis.

## Requirements Matrix

| ID | Criterion | Specification | Verification Method |
|---|---|---|---|
| R01 | True zero representation | Zero-valued entries have bar fill width = 0%; optional zero marker is distinct from quantitative filled bars. | Unit tests in `src/lib/calculatorChartTruth.test.tsx` & Playwright inspection |
| R02 | Negative value support & baseline | Negative values are visually differentiated with negative styling/direction from a zero baseline, preserving sign and truth. | Unit tests with negative fixture & Playwright |
| R03 | Elimination of heterogeneous multi-unit bars | Remove `.calculator-visual-bars` that normalized unrelated units (currency, months, percent) onto a shared scale. | DOM query asserting absence of `.calculator-visual-bars` |
| R04 | Two labeled series with swatches & values | Both primary and secondary values are textually exposed with proper formatting; legend includes visual swatches. | Unit tests asserting primary and secondary labels/values and `.calculator-legend-swatch` |
| R05 | Accessible tabular alternative | Provide a semantic `<table>` alternative with `<thead>`, `<tbody>`, `scope="col"`, `scope="row"` for all chart entries. | Unit tests & accessibility inspection |
| R06 | Engine purity | Zero changes to financial formulas, engine math, or rounding rules. | Vitest full studio and SEO suite |

## Verification Gates

| ID | Gate | Target |
|---|---|---|
| V01 | Targeted Chart Truth Unit Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/calculatorChartTruth.test.tsx` (tests for zero, negative, dual series, accessible table) |
| V02 | Full Studio & SEO Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/seoCalculators.test.ts src/lib/calculatorStudios.test.ts` (641 tests pass) |
| V03 | Multi-Viewport Browser Verification | `node docs/execution/evidence/B21/verify_b21.cjs` testing Mortgage, SIP, India Tax, and negative fixture across 320, 390, 768, 1440 viewports in Light & Dark modes |
