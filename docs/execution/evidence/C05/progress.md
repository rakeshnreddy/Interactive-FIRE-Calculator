# C05 Progress Digest

- **Checkpoint**: C05 (Dedicated calculator families)
- **Current Task**: B22, B23, B24 Complete — Submitted for Primary Review
- **Task Order**: B22 → B23 → B24
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `8d9a4c4b6fc52e6900222a76f2df6355694c9d96`
- **Immutable Preview URL**: https://f51c818b.interactive-fire-calculator.pages.dev
- **Preview Deployment ID**: `f51c818b-7da1-44f2-8773-24651178669e`
- **Candidate Preview Smoke**: 84/84 public calculator routes verified without authentication (`docs/execution/evidence/C05/hosted-smoke.log`)

## Status Overview

| Task | Title | Status | Completed Contract Rows | Failing / Blocked Rows | Local Tests |
|---|---|---|---|---|---|
| **B22** | Unify compound-interest and savings-goal presentation | ready_for_review | 6/6 verified | None (Screen-reader deferred to B31 per ACCESSIBILITY_DEFERRALS.md) | 92/92 pass |
| **B23** | Unify budget, net-worth and emergency-fund presentation | ready_for_review | 7/7 verified | None (Screen-reader deferred to B31 per ACCESSIBILITY_DEFERRALS.md) | 36/36 pass |
| **B24** | Refine FIRE calculator into the flagship decision experience | ready_for_review | 7/7 verified | None (Screen-reader deferred to B31 per ACCESSIBILITY_DEFERRALS.md) | 4/4 component, 23/23 engine pass |

## Verification & Implementation Summary

### Task B22 (Compound Interest & Savings Goal)
- Unified header with `<p className="calculator-scope-note">` across both growth tools.
- Removed duplicate 3-card trust banner (`.compound-trust-strip`), lifting controls ~100px higher towards the fold (remediating V10).
- Fixed numeric input and select typography in `src/styles.css` ensuring 100% of numeric controls compute to 16px (remediating V11).
- Kept contribution timing, currency caveats, exact-vs-rounded contribution explanation, and full annual audit schedules reachable via progressive disclosures.
- Real Chrome Playwright test passed (`docs/execution/evidence/B22/verify_b22.cjs`) generating 20 screenshot artifacts across 1440, 768, 390, 320 viewports in light and dark modes with 0 console errors and 0 page exceptions.

### Task B23 (Net Worth, Budget, Emergency Fund)
- Unified `NetWorthCalculator`, `BudgetCalculator`, and `EmergencyFundCalculator` under the standard header pattern with `<p className="calculator-scope-note">`.
- Removed redundant `.compound-trust-strip` 3-card banner across all three cashflow calculators (remediating V10).
- Converted long static FAQ cards into native collapsible `<details className="compound-analysis-card compound-faq-card">` with an accessible `<summary>`, collapsing secondary content by default.
- Added distinct accounting labels without color dependence:
  - Net Worth: Shows "Estimated net deficit" and "Net deficit (liabilities exceed assets)" when liabilities exceed assets.
  - Budget: Shows "Monthly deficit" and "Monthly deficit (spending exceeds income)" when expenses exceed take-home pay.
  - Emergency Fund: Shows "Reserve target fully covered" with a "Fully funded" badge when liquid assets satisfy target months.
- Distinguish blank/unpopulated from $0 using `—` (em dash) in `moneyFormatter`.
- Real Chrome Playwright test passed (`docs/execution/evidence/B23/verify_b23.cjs`) generating 30 screenshot artifacts across 1440, 768, 390, 320 viewports with 0 console errors and 0 page exceptions.

### Task B24 (FIRE Calculator Flagship Refinement)
- Unified header with `<p className="calculator-scope-note">` ("Answer one retirement planning question at a time. Plan retirement portfolio targets or test sustainable annual withdrawals across customizable inflation and market regimes.") (remediating V10).
- Refactored `Field` and `InfoTip` in `src/App.tsx`:
  - Extracted label to separate `<label htmlFor={id}>` containing only concise accessible names ("Current age", "Retirement age", "Plan end age", "Annual withdrawal need", "Current portfolio").
  - Associated helper text via `aria-describedby` pointing to `${id}-help` on the input (remediating V12).
  - Replaced focusable `<span>` info-tips with accessible native `<button type="button" className="info-dot" aria-expanded={isOpen} aria-label={`Help for ${label}`}>` controls outside the `<label>`.
  - Added unit indicators: currency prefix `$` and duration suffix `years` via `.calculator-input-control`.
- Defined clear stale result state after input changes:
  - Prior calculated result remains visible for reference rather than vanishing.
  - Card marked with `is-stale` class and visible warning badge `<div className="stale-result-badge" role="status" aria-live="polite">` ("Inputs changed since last calculation. Click Calculate to update results.").
  - Button transitions to "Recalculate".
  - Clicking "Recalculate" computes fresh results with current inputs and clears the stale badge.
- Preserved both FIRE planning modes ("FIRE number" and "Withdrawal") and all advanced assumption modules. `src/lib/fire.ts` remains frozen and untouched.
- Enforced winning 16px font-size and 1.5 line-height across `.core-fire-form input[type="number"], .quick-calculator input[type="number"]`.
- Built regression test suite in `src/FireCalculator.test.tsx` (4/4 tests pass).
- Real Chrome Playwright verification passed (`docs/execution/evidence/B24/verify_b24.cjs`) with 0 console errors and 0 page exceptions, capturing 14 screenshot artifacts across all viewports and stale state.

### Live Preview Verification (`docs/execution/evidence/C05/hosted-browser.json`)
- Live preview deployed: https://f51c818b.interactive-fire-calculator.pages.dev
- 84/84 public calculator routes verified without authentication.
- B22, B23, B24 live user journeys verified on the hosted preview using Playwright Chrome (`verify_hosted_c05.cjs`), capturing 9 screenshot artifacts with 0 console errors and 0 page exceptions.
