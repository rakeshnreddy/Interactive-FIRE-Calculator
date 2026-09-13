# C04 Progress Digest

- **Checkpoint**: C04 (Generic calculator and chart truth)
- **Current Task**: B20 (Reorder generic calculators around inputs and the answer)
- **Task Order**: B08 → B20 → B21
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`

## Status Overview

| Task | Title | Status | Completed Contract Rows | Failing / Blocked Rows | Local Commit |
|---|---|---|---|---|---|
| **B08** | Mortgage payoff reconciliation regression | in_progress (provisionally complete) | 5/5 | None | `6dacd29` |
| **B20** | Reorder generic calculators around inputs and answer | in_progress (provisionally complete) | 6/6 | None | Pending B20 commit |
| **B21** | Make shared charts numerically honest and accessible | pending | 0/6 | None | Pending |

## Current Task Details (B20 Complete, Transition to B21)
- **B20 Outcome**:
  - Reordered layout: moved 4 introductory context cards below the calculator grid into `.calculator-methodology-panel`.
  - Added `.calculator-scope-note` below exact H1.
  - First editable input $y$ on 390px mobile viewport reduced from $1133\text{px}$ – $1207\text{px}$ down to $456\text{px}$ – $516\text{px}$ (well under $650\text{px}$ threshold).
  - Replaced title-only tooltip dots with visible `.calculator-field-helper` linked via `aria-describedby`.
  - Designated `.calculator-result-metric-primary` with visually dominant scale.
  - Replaced metric help dots with accessible `<button type="button" class="calculator-help-btn">` disclosures, preserving keyboard focus on toggle.
  - 5/5 unit tests pass in `src/CalculatorLibraryDetail.test.tsx`.
  - 11/11 browser test cases pass across 320, 390, 768, 1440 viewports in both themes with 0 console errors.
  - Contract: `contracts/B20-working.md`; Matrix: `docs/execution/evidence/B20/validation-matrix.md`; Submission: `docs/execution/submissions/B20.md`.
- **Exact Next Action**: Commit B20 changes locally, then begin B21: inventorying `CalculatorStudioVisual`, removing multi-unit bar comparisons, plotting true zero, supporting negative values, and ensuring accessible alternatives.
