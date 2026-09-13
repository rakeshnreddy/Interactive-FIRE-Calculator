# C04 Progress Digest

- **Checkpoint**: C04 (Generic calculator and chart truth)
- **Current Task**: B20 (Reorder generic calculators around inputs and the answer)
- **Task Order**: B08 → B20 → B21
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`

## Status Overview

| Task | Title | Status | Completed Contract Rows | Failing / Blocked Rows | Local Commit |
|---|---|---|---|---|---|
| **B08** | Mortgage payoff reconciliation regression | in_progress (provisionally complete) | 5/5 | None | Pending B08 commit |
| **B20** | Reorder generic calculators around inputs and answer | in_progress | 0/6 | None | Pending |
| **B21** | Make shared charts numerically honest and accessible | pending | 0/6 | None | Pending |

## Current Task Details (B20)
- **Previous Task (B08) Outcome**:
  - Reconciled fixed-payment formula and schedule termination with `LOAN_RESIDUAL_TOLERANCE = 0.005`.
  - \$200,000 / 6.5% / 30y yields exactly 360 payoff months and 360 schedule rows in both themes.
  - 7/7 unit tests pass in `src/lib/mortgageReconciliation.test.ts`.
  - 641/641 tests pass in `seoCalculators.test.ts` and `calculatorStudios.test.ts`.
  - 4/4 browser cases pass at 390px with 0 console errors.
  - Contract: `contracts/B08-working.md`; Matrix: `docs/execution/evidence/B08/validation-matrix.md`; Submission: `docs/execution/submissions/B08.md`.
- **Exact Next Action**: Commit B08 changes locally, then begin B20: baseline measurement of first visible input document y on mortgage, SIP, and India-tax at 390px, and reordering introductory blocks below working area.
