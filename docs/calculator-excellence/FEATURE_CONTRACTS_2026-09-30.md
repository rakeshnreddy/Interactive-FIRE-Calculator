# B50 calculator feature dispositions and bounded contracts — 2026-09-30

This is a design/engineering contract document, not a second task tracker. Canonical status remains TASK_STATUS.json. B50 completes planning; it does not declare 83 engines certified or implement the proposals below. Source inspection uses C17 source after B46/B52/B49; prior individual findings remain in the 83-route matrix.

The primary thesis stays **understand a decision, save it, revisit actual progress**. Do not buy traffic or build paywalls before genuine B51 user evidence. The next work should correct misleading decision states before adding controls. A real pilot can run alongside later narrow calculator features.

## Complete route disposition

“Current slice” means the assigned UI/input/chart/copy improvement is covered by C15–C17; additional mathematical capabilities are not implied. “Queued” below means an architectural proposal, not an authorized implementation task. Only F-01 to F-03 have complete first implementation contracts. Other rows state the one capability to scope next, not a feature bundle.

| # | Route | Disposition | Exact boundary / next useful change |
|---|---|---|---|
| 01 | `compound-interest` | Current slice | B44 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 02 | `savings-goal` | Current slice | B44 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 03 | `net-worth` | Queued small feature contract | Dated snapshot/history; valuation date and stale-balance cue. Current totals stay manual; no price feed. |
| 04 | `budget` | Current slice | B44 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 05 | `emergency-fund` | Current slice | B44 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 06 | `retirement` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 07 | `debt-payoff` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 08 | `investment-return` | Implemented bounded contract | B57/B58 at C22: before-input scope and empty dated-mode link; neutral sensitivity labels and precise exclusions; point-to-point arithmetic unchanged. |
| 09 | `sip` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 10 | `step-up-sip` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 11 | `sip-goal` | Queued small feature contract | Provide target date, current contribution comparison and a clearly bounded inflation option in its later family contract. |
| 12 | `lumpsum-mutual-fund` | Queued small feature contract | Put reinvestment and exclusion of fees/taxes beside the answer; keep optional costs neutral until chosen. |
| 13 | `swp` | Queued small feature contract | State constant withdrawal and return before the result; spec inflation, timing and horizon controls separately. |
| 14 | `emi` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 15 | `home-loan-emi` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 16 | `car-loan-emi` | Queued small feature contract | Clarify financed amount; draft on-road price, down payment and fees as explicit additions. |
| 17 | `personal-loan-emi` | Queued small feature contract | Add a visible APR comparison link; later add fees with a sourced net-disbursal convention. |
| 18 | `income-tax-india` | Externally gated | B49 scope completed. Before expanded tax coverage: country/year/rule specialist checks, marginal relief and regime-specific income basis contract. |
| 19 | `salary-india` | No additional feature justified | B49 labels the CTC-based approximation. Test demand before replacing it with statutory payroll; never claim payslip accuracy. |
| 20 | `hra-exemption` | Queued small feature contract | B49 scope completed. Explicit qualifying salary/city/regime contract using official rules and independent eligibility negatives. |
| 21 | `fd` | Implemented bounded contract | B60/C24: deposit-specific copy, yearly-compounded cumulative basis before fields, tax/TDS/fee/premature-penalty exclusions, deposit + interest = maturity line and exact-term schedule. Payout mode and compounding frequency remain unbuilt future contracts. |
| 22 | `rd` | Implemented bounded contract | B61/C25: end-of-month instalments, monthly compounding at rate ÷ 12 and exclusions before fields; extra yearly deposit separated from instalments; deposits + interest = maturity line; exact-term schedule (B62). |
| 23 | `ppf` | Queued small feature contract | B49 scope completed. Deposit-date interest/limits contract with official scheme text; no prediction of notified rates. |
| 24 | `epf` | Queued small feature contract | B49 scope completed. Separate EPF/EPS contribution-basis contract; do not count employer pension allocation as savings. |
| 25 | `nps` | Externally gated | B49 separates user annuity assumptions from eligibility. Sector/exit/corpus rule selection requires a dated PFRDA contract. |
| 26 | `gratuity` | Externally gated | B49 removes universal entitlement/tax-free claims. Labour Code wage/eligibility/rounding rules need a new dated legal/model contract. |
| 27 | `home-loan-prepayment` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 28 | `home-loan-foreclosure` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 29 | `home-loan-balance-transfer-india` | Implemented bounded contract | F-01: honest no-payment-benefit/payback states; separate future contract for independent terms and fee financing. |
| 30 | `flat-vs-reducing-rate` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 31 | `loan-eligibility-india` | No additional feature justified | B49 borrowing-limit assumptions explicit. Approval/credit matching is not a FinPath calculation feature. |
| 32 | `stamp-duty-registration` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 33 | `mortgage` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 34 | `mortgage-affordability` | Implemented bounded contract | B59/C23 reserves entered tax, homeowners/supplementary insurance, HOA and mortgage insurance within existing caps, with monthly visuals and no-room/overage states. Fixed 36% is a disclosed planning assumption; no lender rule, cash-to-close or reserve automation. |
| 35 | `mortgage-refinance` | Implemented bounded contract | F-01: honest no-payment-benefit/payback states; current same-term/financed-fee approximation stays explicit. |
| 36 | `amortization` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 37 | `extra-mortgage-payment` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 38 | `mortgage-payoff` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 39 | `biweekly-mortgage-payment` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 40 | `mortgage-recast` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 41 | `mortgage-points` | Implemented bounded contract | F-01: semantic no-break-even, beyond-horizon and no-upfront-cost states. |
| 42 | `15-vs-30-year-mortgage` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 43 | `arm-mortgage` | Queued small feature contract | Expose initial period and assumed reset rate beside payment shock; source future cap controls separately. |
| 44 | `interest-only-mortgage` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 45 | `balloon-loan` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 46 | `closing-costs` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 47 | `escrow` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 48 | `debt-to-income` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 49 | `loan-comparison` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 50 | `apr` | Current slice | B49 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 51 | `home-equity-loan` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 52 | `fha-loan` | Queued small feature contract | B49 scope completed. A separate dated MIP duration/loan applicability contract; no qualification verdict. |
| 53 | `va-loan` | Queued small feature contract | B49 scope completed. Funding-fee/exemption selection contract with owner-reviewed eligibility conditions. |
| 54 | `fha-vs-conventional` | Queued small feature contract | B49 exposes fixed assumptions. Separate duration/offer comparison contract; never infer qualification. |
| 55 | `rent-vs-buy` | Queued small feature contract | Show included versus excluded ownership costs; add missing friction only through explicit contracts. |
| 56 | `credit-card-payoff` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 57 | `debt-snowball-avalanche` | Queued small feature contract | Use debt rows with editable names and a later add/remove contract; keep one identical payment budget. |
| 58 | `auto-loan` | Queued small feature contract | Clarify loan amount; draft taxes, trade-in and down payment independently of current engine. |
| 59 | `personal-loan` | Queued small feature contract | Link to fee-inclusive APR and make omissions visible; draft fee treatment explicitly. |
| 60 | `student-loan-payoff` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 61 | `401k` | Externally gated | B49 scope completed. Dated contribution-limit/catch-up rules; plan-specific match/vesting require explicit user plan data. |
| 62 | `roth-vs-traditional-ira` | Externally gated | B49 preserves equal out-of-pocket comparison. Dated eligibility/deductibility/qualified-withdrawal contract before rule automation. |
| 63 | `paycheck` | No additional feature justified | B49 labels entered withholding and links official estimator. Full W-4/payroll replication is outside current product wedge. |
| 64 | `income-tax-us` | Externally gated | B49 exposes verified 2026 single-filer basis and state placeholder. Filing-status/credit rules require a separately versioned year/country contract. |
| 65 | `social-security-break-even` | Implemented bounded contract | B49 warns that zero when the later benefit is not higher is not immediate break-even. Small semantic catch-up-state repair before age/benefit automation. |
| 66 | `rmd` | Queued small feature contract | B49 honest manual mode. Age/account/table selector only under a dated IRS divisor and inherited-account contract. |
| 67 | `cagr` | Implemented bounded contract | B57/B58 at C22: appropriate-method guidance and neutral sensitivity cases; CAGR and historical records unchanged. |
| 68 | `xirr` | Implemented bounded contract | F-02: explicit dated return mode. Preserve the existing equal-monthly mode. |
| 69 | `inflation` | Queued small feature contract | Add a clearly separated future-cost versus present-purchasing-power mode only through a tested contract. |
| 70 | `rule-of-72` | Queued small feature contract | Explain approximation and optionally compare exact doubling time; handle zero/negative rates explicitly. |
| 71 | `capital-gains-tax` | No additional feature justified | B49 entered-rate scope is explicit. Full jurisdiction/asset tax tables have no validated repeated-user need yet. |
| 72 | `gst` | Queued small feature contract | State exclusive-of-tax mode; draft inclusive/exclusive toggle with a sourced reverse-tax contract. |
| 73 | `tds` | No additional feature justified | B49 entered-rate scope is explicit. Do not build a section/year engine until user demand and reviewed rules exist. |
| 74 | `down-payment` | Current slice | B47 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 75 | `pmi` | Queued small feature contract | B49 scope completed. Quote-based cancellation milestone contract with servicer conditions; no invented removal date. |
| 76 | `heloc` | Queued small feature contract | B49 repayment-only scope completed. Separate draw/repay/rate-reset model, not a relabeled amortization line. |
| 77 | `balance-transfer` | Queued small feature contract | B49 finite promo copy corrected. Separate entered post-promo APR and negative-payoff-state contract; promo duration already exists. |
| 78 | `cd` | Implemented bounded contract | B60/C24: CD principal/term copy, APY applied once a year without reconversion, liquidity/penalty/tax exclusions with dated CFPB sources, exact-term schedule. |
| 79 | `hysa` | Current slice | B48 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 80 | `life-insurance-needs` | Queued small feature contract | Show resources/liabilities/support years and exclusions; source existing cover, inflation and discounting controls before expansion. |
| 81 | `lease-vs-buy` | Implemented bounded contract | F-03: vehicle-specific residual equity at a common horizon; no changes to housing rent-vs-buy. |
| 82 | `roi` | Current slice | B45 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |
| 83 | `fire` | Current slice | B43 covers this matrix finding. Keep the existing model and decision-specific chart/table; no extra feature justified by this audit alone. |

## F-01 — truthful payback states before more refinancing controls

**B53 accepted at C19.** Original user problem: the earlier `refinance`/`points` cases return numeric zero months when monthly savings are not positive. Zero looks like immediate recovery. Affected aliases: mortgage-refinance, home-loan-balance-transfer-india, mortgage-points. Do not extend this contract to other formulas without reproducing their state.

**Implement one change:** add an explicit payback display state: `no-payment-saving`, `no-upfront-cost`, `payback-within-horizon`, `payback-after-horizon`. For positive savings and positive cost, existing cost/savings arithmetic can remain a clearly labeled simplified payback estimate. For nonpositive savings, omit the numeric payback metric and show “No payment saving in this model”; never encode undefined payback as zero/Infinity. For positive savings with zero cost, zero payback is legitimate and labeled “No switching/points cost entered.” A fee-financed refinance is NOT a proven full economic break-even: disclose the existing financed-fee and same-term approximation. Independent terms, fee-mode controls, amortization/equity NPV and prepayment penalties need their own later contract.

**Reference:** [CFPB refinancing decision guide](https://files.consumerfinance.gov/f/documents/cfpb_should_i_refinance_handout.pdf) provides decision context about comparing costs/goals; it does not validate our approximation. Mathematical convention is explicit here: fixed end-of-month payment `P*r/(1-(1+r)^(-n))`, or `P/n` when r=0; positive-cost simplified payback `cost/(oldPayment-newPayment)` only when denominator >0. No market-rate or approval claim. India alias uses the same arithmetic, not US eligibility rules; [RBI EMI disclosure FAQ](https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQRFIR10012025.pdf) is the jurisdiction-specific contract context.

**Independent expected numbers (Decimal derivation, not engine output):**

| Case | Inputs | Expected |
|---|---|---|
| Worse fee-financed refinance | P=12,000; both rates 0%; n=12; financed fees=1,200 | Old payment=1,000; new=1,100; savings=-100; no-payment-saving; no numeric payback. |
| Equal offers | P=12,000; both rates 0%; n=12; fees=0 | Both payments=1,000; savings=0; no-payment-saving. |
| Better, free refinance | P=12,000; old APR=12%; new APR=0%; n=12; fees=0 | Old payment=1,066.185464140; new=1,000; savings=66.185464140; no-upfront-cost. |
| Point cost exceeds horizon benefit | P=12,000; old APR=12%; new APR=0%; n=12; points paid upfront=1,000 | Payback=15.109057751 months (>12); lifetime saving=-205.774430319; payback-after-horizon. |

Controls: keep existing entered values, explicit rates/costs, no silent defaults added; preserve B45 raw editing. UI: show state beside monthly saving; retain payment comparison bars and a table whose payback cell is text when not applicable. Chart units stay currency; do not plot no-payback as zero. Exports include the semantic state. Tests: all four fixtures, tiny/negative savings, invalid cost/rate/term, same input edits/rounding, saved reopen and CSV.

Likely files: seoCalculators.ts, generic result DTO/rendering, calculatorDetailSchedules.ts, calculatorStudio.ts, result summary/export parser tests. Keep fire.ts byte-identical. Migration decision: new outputs must carry a versioned display-state field or omit nonnumeric metrics; update all consumers/parser/export before publishing. Old saved snapshots retain their original numeric values and a legacy-model notice; reopening creates a new calculation only after explicit save. Never backfill records or silently rewrite historical comparisons. Rollback: revert UI/engine integration while retaining read support for the new version; no D1 migration. Privacy: no financial event values; existing consented calculator-action category only. Acceptance: no absent payback shown as immediate, displayed/table/export state agree, unchanged monthly-payment goldens and full suite. Estimated effort 4–8 engineering hours plus focused review; no owner secret required.

## F-02 — explicit dated cash-flow return, preserving monthly mode

**B54 accepted at C20.** Original user problem: `/xirr` previously computes a periodic monthly IRR for equal contributions. Preserve that honest mode and add a separately labeled dated mode for statement cash flows; investment-return/CAGR may link to it, not silently change their formula.

**Source and formula:** [Microsoft XIRR definition](https://support.microsoft.com/en-us/excel/functions/xirr-function), checked 2026-09-30. Solve `sum(C_i/(1+r)^((date_i-date_0)/365))=0`, r>-1. Use UTC calendar-day differences and signed cash flows. A source's implementation example is not our test oracle; independently derived fixtures below are the acceptance oracle.

**Narrow first scope:** manual dated rows, add/remove, deterministic ISO dates and amounts; no import parser in this slice. Sort/aggregate same-day rows before solving. Require both signs, at least two distinct dates and one sign change (negative investments followed by positive proceeds). Multiple sign changes are explicitly unsupported in v1 and must return a useful ambiguity state; do not select one root by guess. Bounded bracketed solver with a documented supported-rate interval and residual tolerance; failure is a semantic state, never zero return. Negative unique returns are valid.

| Cash flows / dates | Independent expected |
|---|---|
| -1,000 on 2025-01-01; +1,100 on 2026-01-01 | +10% (365 days). |
| -1,000 on 2025-01-01; +900 on 2026-01-01 | -10%. |
| -1,000 on 2025-01-01; +1,210 on 2027-01-01 | +10% (730 days). |
| -1,000 on 2025-01-01; +500 on 2026-01-01; +600 on 2027-01-01 | 6.394102980%: solve `1000q²-500q-600=0`, q=1+r. |
| -100; +230 after 365 days; -132 after 730 days | Unsupported multiple sign changes; the polynomial has +10% and +20% roots. Do not choose either. |
| All positive / all negative / only one date / invalid date / unequal rows | Validation error, no rate. |

Controls: required real dates/amounts begin empty; optional “Use example cash flows” action; no silently prefilled returns. Negative amounts accepted. Calendar picker plus editable date field, explicit investment/proceeds sign convention. UI: rate + elapsed days + residual, signed cash-flow timeline and exact date/amount table; never draw a smoothed wealth forecast from IRR. Every visual ties to the same dated input rows and supports a text table.

Likely files: new pure lib/datedReturns.ts and tests, route mode adapter, dedicated row editor, safe share/export/save parser. Non-goals: multiple-root selection, bank integration, bulk import, risk/forecasting, taxes. Saved version decision: preserve original monthly snapshots (including originally unversioned ones); new monthly results use `monthly-periodic-v1`; new `dated-xirr-v1` stores validated ISO dates and signed values. Existing API normalizer currently expects numeric input maps: explicitly extend that calculator contract/parser/export and enforce item/byte bounds before exposing save. Old monthly snapshots remain immutable; no automatic inferred dates. Dates/amounts never enter telemetry or public URLs without explicit existing share action. D1 schema migration only if the inspected payload contract requires one, with owner authority; do not assume JSON flexibility equals API support. Rollback: disable dated mode, keep its read/export support. Tests: fixtures, leap/calendar differences, sorted/duplicate dates, unsupported sign pattern, nonconvergence, negative rate, raw editing, API roundtrip, tenant isolation using local fixtures. Acceptance: displayed solver residual and exact-table flow reconciliation, existing monthly goldens preserved, full suite. Effort 1–2 engineering days plus API review; no financial-account connection needed.

## F-03 — vehicle lease/buy comparison with residual equity

**B55 accepted at C21.** User problem: the shared rent-buy model credits loan principal reduction but does not value depreciation/resale or purchase down payment as economic cost. The vehicle alias needs its own model. Preserve housing `/rent-vs-buy` and its existing amortization behavior.

**Decision and source:** compare net cash cost at the same ownership horizon; [FTC financing/leasing guidance](https://consumer.ftc.gov/articles/financing-or-leasing-car), checked 2026-09-30, distinguishes use payments from ownership and explains lease depreciation/fees. User resale value is an assumption, never a market forecast. Mathematical convention: `buyNetCost = downPayment + paymentsPaid + remainingLoan - resaleValue`; `leaseCost = leaseUpfront + leaseMonthly * horizonMonths`. Regular loan payments cease at payoff. Rate/term are the loan's; horizon is independent.

| Case | Inputs | Expected at horizon |
|---|---|---|
| Mid-term resale | Price=25,000; down=5,000; P=20,000; APR=0; term=48m; horizon=24m; resale=14,000; lease=350/m; lease upfront=0 | Buy payment=416.666666667; paid=10,000; remaining=10,000; equity=4,000; buy net cost=11,000; lease cost=8,400; buying costs 2,600 more. |
| Zero resale explicitly chosen | Same, resale=0 | Buy net cost=25,000; lease=8,400; difference=16,600. |
| Full term | Same price/loan; horizon=48m; resale=8,000 | Remaining=0; buy net cost=17,000; lease=16,800; difference=200. |
| Beyond payoff | Horizon=60m; resale=6,000; lease=350/m | Payment count=48; remaining=0; buy net cost=19,000; lease=21,000; difference=-2,000. |
| Invalid | Negative price/down/rate/resale; down>price; horizon<=0; lease horizon beyond the actual offered lease period without explicit extension assumption | Error; no comparison. |

Controls: price/down/rate/loan term, common horizon, lease payment and required resale assumption; zero resale allowed only when entered or explicitly chosen. Lease upfront costs optional 0 with excluded-cost cue. Do not add automatic tax/mileage/insurance estimates. State exclusions (purchase/lease taxes, maintenance, insurance, mileage/wear/termination charges, opportunity cost); additional costs require another scoped contract. Visuals: net cost bars on a common currency basis plus a separate ownership-equity stack; reconcile both to the same horizon table. Never mix monthly payment with net multi-year cost on one axis. Negative net cost under entered appreciation remains visible, not clamped.

Likely files: lib/vehicleLeaseBuy.ts/tests, route adapter and result/chart/schedule metadata. No shared rent-buy rewrite. New version `vehicle-cost-v1`; old saved alias results retain a legacy approximation label and original numbers. Reopening requires explicit missing resale/horizon fields; no silently inferred value or automatic snapshot mutation. No D1 migration planned; inspect save/share DTO and add safe payload version support. Rollback: disable new route adapter but continue reading new snapshots. No financial analytics; only consented safe action categories. Acceptance: all fixtures, optional zero costs, payoff boundary, exact chart/table/net-cost reconciliation, source/horizon labels, mobile and keyboard, untouched housing goldens/full suite. Effort 1–2 engineering days plus review.

## Remaining scope omissions and sequencing

The table identifies 24 B49 routes separately. Missing benefits/tax/insurance/eligibility features are not silently promised. Current limitations remain visible. The most urgent follow-on after F-01 is the tiny SSA catch-up semantic repair (later benefit <= early benefit must have no catch-up state); country/year rule automation is lower priority. Expand employer match, dated snapshot history, debt rows, GST inclusive mode or other controls only with one new reviewed contract per decision. Existing annual FIRE saving, finite balance-transfer promo duration, and housing loan-term/equity controls already exist and must not be presented as missing.

Astra implementation disposition after owner continuation: B53/B56 at C19, B54 at C20 and B55 at C21 are accepted. Their bounded contracts are implemented; this does not certify all proposed capabilities in the route matrix. C21 explicitly allows a separately entered continuation cost beyond the quoted lease period. The owner deferred C18/B51/OA-5 real-user observation; it remains open and is not passed by code or synthetic fixtures. B13 paid and B14 mobile remain locked on genuine retention/owner criteria. Canonical task/checkpoint status remains in TASK_STATUS.json and CHECKPOINTS.md.
