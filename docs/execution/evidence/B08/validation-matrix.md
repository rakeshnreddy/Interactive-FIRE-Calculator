# B08 Validation Matrix: Mortgage Payoff Reconciliation Regression

- **Task**: B08 — Mortgage payoff reconciliation regression
- **Checkpoint**: C04
- **Date**: 2026-09-13
- **Tested Baseline**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`

## Implementation Requirements Matrix

| ID | Criterion | Expected Behavior | Verification Method / Fixture | Outcome | Observations |
|---|---|---|---|---|---|
| R01 | Headline vs schedule reconciliation | $200k / 6.5% / 30y yields headline 360 months and 360 schedule rows | Unit test `mortgageReconciliation.test.ts` & Playwright mobile 390px browser | **PASS** | Headline months: 360; Schedule rows: 360; Last row: Period 360, Ending balance \$0, Note: "Final payment" |
| R02 | Zero-rate & non-standard terms | 0% interest and 15y loans calculate accurate periods without hardcoded 360 | Unit test: \$120k / 0% / 10y (120 mo) & \$250k / 5.75% / 15y (180 mo) | **PASS** | 0% 10y: 120 mo, 120 rows, final balance \$0. 15y: 180 mo, 180 rows, final balance \$0 |
| R03 | Extra payment & final payment adjustment | Extra payments accelerate payoff; final payment $\le$ regular payment; balance is settled | Unit test: \$200k / 6.5% / 30y with \$300/mo extra principal | **PASS** | Payoff in 214 mo; final payment \$1,364.55 $\le$ regular outflow \$1,564.14; ending balance \$0 |
| R04 | Floating residual vs material debt | Residual $\le \$0.005$ settles loan; material debt ($>\$0.005$) requires next payment | Unit test: floating residual (\$3.94e-9) vs debt-payoff (\$1,000 at 0% / \$300 payment) | **PASS** | Floating residual settled cleanly at month 360; debt-payoff requires month 4 to settle \$100 residual debt |
| R05 | Sums & balance reconciliation | Sum of scheduled principal equals original principal; total paid equals principal + interest | Unit test sum reduction over all schedule rows | **PASS** | Sum of principal: \$200,000.00; total paid matches sum(principal + interest) within machine precision |

## Validation Results

| ID | Gate | Command / Layer | Target | Result | Evidence |
|---|---|---|---|---|---|
| V01 | Targeted Regression Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/mortgageReconciliation.test.ts` | 7 unit tests covering all edge cases | **PASS** (7/7 passed) | `src/lib/mortgageReconciliation.test.ts` |
| V02 | Full Studio & SEO Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/seoCalculators.test.ts src/lib/calculatorStudios.test.ts` | 641 tests across all calculator families | **PASS** (641/641 passed) | Unit test runner |
| V03 | Mobile 390px Browser Verification | `node docs/execution/evidence/B08/verify_b08.cjs` | Mobile 390px Chromium in Light & Dark modes | **PASS** (4/4 cases passed) | `docs/execution/evidence/B08/browser-verification.json` and screenshots |
