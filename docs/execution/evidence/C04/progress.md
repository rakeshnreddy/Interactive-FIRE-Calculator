# C04 Progress Digest

- **Checkpoint**: C04 (Generic calculator and chart truth)
- **Current Task**: B21 (Make shared charts numerically honest and accessible)
- **Task Order**: B08 → B20 → B21
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`

## Status Overview

| Task | Title | Status | Completed Contract Rows | Failing / Blocked Rows | Local Commit |
|---|---|---|---|---|---|
| **B08** | Mortgage payoff reconciliation regression | in_progress (provisionally complete) | 5/5 | None | `6dacd29` |
| **B20** | Reorder generic calculators around inputs and answer | in_progress (provisionally complete) | 6/6 | None | `22b3250` |
| **B21** | Make shared charts numerically honest and accessible | in_progress (provisionally complete) | 6/6 | None | Pending B21 commit |

## Current Task Details (B21 Complete, Transition to Combined C04 Verification)
- **B21 Outcome**:
  - True zero geometry: bar fill width is strictly 0% on zero values (no fake 8% minimum bar width); added distinct `.calculator-zero-marker`.
  - Negative values & baseline: removed `Math.abs()` sanitization in `calculatorStudios.ts` charts; added signed positioning from `.calculator-chart-baseline` and `.is-negative` styling.
  - Eliminated heterogeneous multi-unit bars: removed `.calculator-visual-bars` multi-metric chart completely.
  - Dual-series exposure: primary and secondary values both rendered in text with matching `.calculator-legend-swatch` items.
  - Semantic tabular alternative: added accessible `<table className="calculator-chart-table">` inside `<details className="calculator-chart-table-details">` with `th[scope="col"]` and `th[scope="row"]`.
  - 5/5 unit tests pass in `src/lib/calculatorChartTruth.test.tsx`.
  - 658/658 total unit tests pass across all suites.
  - 13/13 browser test cases pass across 320, 390, 768, 1440 viewports in both themes with 0 console errors.
  - Contract: `contracts/B21-working.md`; Matrix: `docs/execution/evidence/B21/validation-matrix.md`; Submission: `docs/execution/submissions/B21.md`.
- **Exact Next Action**: Commit B21 changes separately, then execute combined C04 verification (full suite `./scripts/test_all.sh`, git push, isolated preview deployment, calculator smoke test, CI check, packet validation, and update submissions with candidate SHA, CI URL, and preview URL).
