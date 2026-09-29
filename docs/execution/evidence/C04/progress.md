# C04 Progress Digest

- **Checkpoint**: C04 (Generic calculator and chart truth)
- **Current Task**: C04 Verification Repair Complete (B08, B20, B21 submitted with truthful evidence)
- **Task Order**: B08 → B20 → B21
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`
- **Candidate Code SHA**: `733e76c` (`733e76c217058cafc3e5d418f09cb55ced531f4c`)
- **Immutable Preview URL**: https://21a762ad.interactive-fire-calculator.pages.dev
- **Preview Deployment ID**: `21a762ad-81f0-424b-af4f-05cbdf5a3a5d`
- **Exact Candidate CI URL**: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34748104825

## Status Overview

| Task | Title | Status | Completed Contract Rows | Failing / Blocked Rows | Local Commit |
|---|---|---|---|---|---|
| **B08** | Mortgage payoff reconciliation regression | blocked | 5/5 automated passed | native-zoom-200 blocked | `c3f22f4` |
| **B20** | Reorder generic calculators around inputs and answer | blocked | 6/6 automated passed | native-zoom-200 blocked | `22b3250` |
| **B21** | Make shared charts numerically honest and accessible | blocked | 6/6 automated passed | native-zoom-200 blocked | `1295c17` |

## Truthful Verification and Evaluator Repair Summary

- **Candidate Code SHA**: `733e76c` (`733e76c217058cafc3e5d418f09cb55ced531f4c`)
- **Evaluator Schema & Negative Tests (25/25 Passing)**:
  - `docs/execution/evidence/C04/test_evaluator_c04.cjs` implements 25 regression tests covering all 5 review omission reproductions (missing CAGR fields, missing telemetry arrays, NaN/Infinity/null contrast ratios, missing requested/observed mode, ID-only media row) plus zoom collector errors, false pass flags, missing/duplicate/unexpected IDs, theme mismatches, unscaled 0.1, firstInputY bounds, console errors, and page exceptions.
  - Strict evaluator enforces boolean-only pass flags, finite numeric ranges, exact case IDs, telemetry arrays, theme distinctness, and exit codes (0 for PASS, 1 for FAIL, 2 for BLOCKED).
- **R1 Units (Preserved & Verified)**:
  - CAGR default 12.47% and negative -12.94% verified in chart row and semantic table across light and dark modes on hosted preview.
  - Waterfall groups only compatible measures; `formatChartValue` eliminates magnitude guessing.
- **R2 Mortgage Math & Documentation Fix (Preserved & Verified)**:
  - Positive opening principal (0.005) preserved; boundary cases (1000.004, 1000.005, 1000.006) verified.
  - Mortgage payoff rounding documentation (`docs/calculators/mortgage-payoff-rounding.md`) corrected: explains that exactly 0.005 rounds to 0.01 under half-up rounding, and distinguishes FinPath's inclusive settlement rule ($currentBalance + interest \le scheduledPayment + 0.005$) as an explicit financial modeling policy.
- **R3 Real Theme Modes (Preserved & Verified)**:
  - Real theme application via `finpath.colorMode` and `.app[data-mode]`.
  - Computed canvas/text colors verified differing between light (`rgb(244, 248, 251)`) and dark (`rgb(8, 21, 28)`).
- **R4 Live Verification Observations (`docs/execution/evidence/C04/hosted-browser.json`)**:
  - **Actual Keyboard Interaction**: Real `button.calculator-help-btn` (`About <metric>`) focused and actuated via Playwright `page.keyboard.press('Enter')` and `'Space'` on Mortgage and SIP calculators. Verified `aria-expanded="true"`, help text visible in DOM, and retained keyboard focus without DOM attribute tampering.
  - **Media Emulation**: Independent CDP media emulation via `Emulation.setEmulatedMedia` for `prefers-reduced-transparency` (verified `backdropFilter: 'none'`, alpha 1 in light and dark) and `prefers-reduced-motion` (verified animation/transition suppression across DOM).
  - **Composed Contrast**: Sampled changed surfaces (primary metric, field helper, visual heading, scope note) in light and dark against underlying material backgrounds, calculating unrounded ratios with pixel sampling (minRatio: 5.48 >= 4.5 threshold).
  - **Native Zoom 200%**: Exception-to-success and `Emulation.setPageScaleFactor` substitute removed. Attempted CUA application zoom via keyboard and System Events accessibility probe; truthfully recorded as `BLOCKED` with limitation and assisted action; evaluator exits with code 2.
  - **Telemetry**: 0 console errors, 0 page exceptions, 0 evaluation errors.
- **Hosted Smoke Tests**: 84/84 public calculator routes verified without authentication (`docs/execution/evidence/C04/hosted-smoke.log`).
- **Cloudflare Pages Preview**:
  - URL: https://21a762ad.interactive-fire-calculator.pages.dev
  - Deployment ID: `21a762ad-81f0-424b-af4f-05cbdf5a3a5d`
  - Effective D1 DB Binding: `0dbad68e-7493-452f-8504-98d4c61ee5da` (isolated preview DB)
- **Exact Remaining Condition**:
  - Automated verification completely passes (13/14 cases, 25/25 evaluator regression tests, full suite, exact CI). Checkpoint C04 is blocked on native 200% browser UI zoom verification, which requires interactive desktop Chrome CUA control not available in headless CLI environments.
