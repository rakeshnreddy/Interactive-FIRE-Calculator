# B08 working implementation contract

Checkpoint / task / status: C04 / B08 (mortgage payoff reconciliation regression) / in_progress
Baseline / branch / writer: 7ad9d6c / codex/finpath-quality-execution / FinPath implementation agent
User-visible outcome: For any fixed-rate amortizing mortgage or loan (specifically verified on $200,000 / 6.5% / 30y and $300,000 / 6.5% / 30y, as well as 15-year loans and prepayments), the headline Payoff Months metric and the Monthly Amortization Schedule row count agree exactly. The final payment row displays ending balance $0, note 'Final payment', and an actual payment amount that settles remaining balance plus accrued interest. Material debt is never forgiven; negligible floating-point residues ($\le \$0.005$) are settled accurately. Sums of principal and interest reconcile with total payments.
Non-goals: `src/lib/fire.ts` remains completely untouched. No schema changes, no new calculation libraries, and no hardcoded 360 values.

## Implementation requirements

| ID | Criterion | Observed defect | Exact expected behavior | Likely function / file | Fixture | Assertion | Negative case | Evidence output |
|---|---|---|---|---|---|---|---|---|
| R01 | Headline vs schedule reconciliation | $200,000 / 6.5% / 30y reports 361 payoff months vs 360 schedule rows | Headline payoff months equals schedule rows count (360) | `payoffDebt` (`src/lib/seoCalculators.ts`), `amortizationRows` (`src/lib/calculatorStudios.ts`) | $200,000 / 6.5% / 30y | `headlineMonths === 360 && schedule.rows.length === 360` | Omit tolerance: produces 361 payoff months | `src/lib/mortgageReconciliation.test.ts` |
| R02 | Zero-rate & standard terms | N/A (guard against division-by-zero regressions) | 0% interest on 10y produces 120 months and 120 rows; 15y at 5.75% produces 180 months and 180 rows | `loanPayment`, `payoffDebt` (`src/lib/seoCalculators.ts`) | $120,000 / 0% / 10y; $250,000 / 5.75% / 15y | `months === years * 12 && finalBal === 0` | Hardcoding 360 fails 15y and 10y tests | `src/lib/mortgageReconciliation.test.ts` |
| R03 | Extra payment & final payment adjustment | Extra payments can produce float residue on accelerated payoff | Extra principal accelerates payoff; final payment is $\le$ regular payment; ending balance is 0 | `payoffDebt`, `amortizationRows` | $200,000 / 6.5% / 30y with $300/mo extra principal | `schedule.rows.length === headlineMonths && lastRow.endingBalance === 0 && lastRow.payment <= regularOutflow` | Excessive payment overpays or underpays principal | `src/lib/mortgageReconciliation.test.ts` |
| R04 | Floating residual vs material debt | Binary float math leaves $3.94 \times 10^{-9}$ USD residue treated as unpaid debt | Residue $\le \$0.005$ settles loan at final scheduled period; residue $> \$0.005$ requires additional payment | `payoffDebt`, `stepAmortizingBalance` | $200k 6.5% 30y (residual $3.94e-9$) vs underpaid loan ($5.00 remaining) | Float residue settles; material residue continues to next month | Setting tolerance to $100 forgives material debt prematurely | `src/lib/mortgageReconciliation.test.ts` |
| R05 | Sums & balance reconciliation | Sum of scheduled principal had slight rounding drift from original loan amount | Total principal paid equals original principal within 0.01; total paid equals principal + interest | `amortizationRows`, `stepAmortizingBalance` | $200,000 / 6.5% / 30y | `abs(totalPrincipal - 200000) < 0.01 && abs(totalPaid - (totalPrincipal + totalInterest)) < 0.01` | Mismatched payment sum fails reconciliation | `src/lib/mortgageReconciliation.test.ts` |

## Validation requirements

| ID | Expected result | Test command / layer | Evidence destination | Actual result |
|---|---|---|---|---|
| V01 | Mortgage reconciliation test suite passes all cases | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/mortgageReconciliation.test.ts` | `docs/execution/evidence/B08/validation-matrix.md` | Pending |
| V02 | Full repository test suite passes with zero regressions | `PATH="/opt/homebrew/bin:$PATH" ./scripts/test_all.sh` | `docs/execution/evidence/B08/validation-matrix.md` | Pending |
| V03 | Browser verification on mobile 390px (light & dark) confirms 360 payoff months and 360 schedule rows | Playwright browser runner | `docs/execution/evidence/B08/validation-matrix.md` | Pending |
