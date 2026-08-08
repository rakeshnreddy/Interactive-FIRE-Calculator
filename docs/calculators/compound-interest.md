# Compound Interest Calculator Research and Formula Contract

Last updated: August 9, 2026

Route: `/calculators/compound-interest`

Formula version: `finpath-compound-v2`

## Product conclusion

Compound growth is a dated cash-flow problem once rate basis, compounding, contribution timing, fees, inflation, or future deposits and withdrawals vary. FinPath therefore uses a calculator-local event engine for this route instead of changing the legacy shared `compound` formula.

The original default remains intentionally compatible:

- $10,000 starting amount.
- $500 end-of-month contribution.
- 10 years.
- 8% nominal annual rate.
- Monthly compounding.
- $0 annual anniversary top-up.
- Projected ending value: `113669.41993630132` before display rounding.

The generic formula used by `/calculators/401k` and `/calculators/hysa` remains unchanged.

## User needs

### Beginner

- Enter starting amount, regular contribution, term, and annual rate.
- See ending value, capital invested, net growth, and an actual balance path immediately.
- Understand that the result is a constant-assumption projection, not a promise.

### Intermediate

- Choose contribution frequency and beginning/end timing.
- Choose nominal rate or APY and avoid double-counting APY compounding.
- Model contribution increases, anniversary top-ups, fees, inflation, a target, and one future deposit or withdrawal.
- Compare lower/base/higher return cases and a two-variable sensitivity table.

### Advanced

- Inspect every formula convention and the exact cash-flow order.
- Reconcile headline, annual summary, and detailed event schedule.
- Export raw precision, restore a versioned share link, change exact locale/currency display, inspect milestone and target timing, and save a run.

## Formula conventions

Let:

- `P` be starting principal.
- `j` be a nominal annual rate.
- `R` be APY/effective annual rate.
- `m` be compoundings per year.
- `T` be elapsed years.

Nominal annual accumulation factor:

```text
(1 + j / m) ^ m
```

APY/effective annual accumulation factor:

```text
1 + R
```

APY already includes within-year compounding. The UI therefore hides compounding frequency in APY mode.

Recurring event boundaries:

- End timing uses `k / q` for `k = 1...floor(T × q)` and includes a contribution exactly at the horizon.
- Beginning timing uses `k / q` starting at `k = 0` and excludes the next period’s contribution exactly at the horizon.
- `q` is the selected contribution frequency.

Annual contribution increases begin only after one completed contribution year:

```text
contribution(k) = initial × (1 + increase) ^ floor((k - 1) / q)
```

The existing annual top-up is an anniversary event at full years 1, 2, and so on. It is not described as a calendar-year-end deposit because the calculator does not request a start date.

For annual percentage-of-assets fee `f` over interval `dt`:

```text
gross ending = opening × grossAnnualFactor ^ dt
fee = gross ending × (1 - (1 - f) ^ dt)
net ending = gross ending - fee
```

This convention applies the annual fee proportionally after gross return over each interval.

For inflation `p`:

```text
real ending value = nominal ending value / (1 + p) ^ T
real annual return = grossAnnualFactor × (1 - f) / (1 + p) - 1
```

Future deposits are applied before withdrawals when they share a timestamp. A withdrawal is funded only to the available balance; the investment balance cannot become negative.

All calculations retain full JavaScript numeric precision. Formatting is applied only at the display boundary. CSV exports raw values with 15 significant digits and CRLF rows.

## Worked references

- The legacy preset produces `113669.41993630132`.
- $10,000 starting capital, $500 end-of-month, 10 years, 6% nominal, monthly compounding produces approximately $100,133.64.
- The same contribution at the beginning of each month produces approximately $100,543.34.
- The published OpenStax example of $250 per month at 3.75% nominal, monthly compounding, for eight years produces approximately $27,938.20.

## Authoritative sources

Every source below was accessed August 8, 2026.

- [CFPB Regulation DD definitions](https://www.consumerfinance.gov/rules-policy/regulations/1030/2/) distinguishes an annual interest rate that does not include compounding.
- [CFPB Regulation DD Appendix A](https://www.consumerfinance.gov/rules-policy/regulations/1030/a/) defines APY calculation conventions.
- [CFPB: interest rate versus APR](https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-loan-interest-rate-and-the-apr-en-733/) explains why a generic investment return should not be mislabeled as a lending APR that may include fees.
- [CFPB Regulation DD payment of interest](https://www.consumerfinance.gov/rules-policy/regulations/1030/7/) distinguishes accrual and crediting conventions.
- [OpenStax: stated versus effective rates](https://openstax.org/books/principles-finance/pages/8-4-stated-versus-effective-rates) explains effective-rate conversion.
- [OpenStax: compound interest](https://openstax.org/books/contemporary-mathematics/pages/6-4-compound-interest) documents nominal compound formulas.
- [OpenStax: annuities](https://openstax.org/books/principles-finance/pages/8-2-annuities) documents ordinary-annuity and annuity-due timing.
- [OpenStax: methods of savings](https://openstax.org/books/contemporary-mathematics/pages/6-6-methods-of-savings) documents the recurring-deposit shortcut and its aligned-period requirement.
- [Microsoft FV](https://support.microsoft.com/en-us/excel/functions/fv-function) documents end (`type=0`) and beginning (`type=1`) payment timing and consistent period units.
- [Investor.gov Compound Interest Calculator](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator) provides the official investor-education comparison baseline.
- [Investor.gov fee bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated) explains both direct fee cost and foregone growth.
- [FINRA Savings Calculator](https://savingscalculator.nga.finra.org/) supports beginning deposits, inflation, and inflation-linked contributions.
- [FINRA calculator disclaimer](https://www.finra.org/investors/tools-and-calculators/tools-and-calculators-disclaimer) describes calculator results as hypothetical approximations.
- [BLS purchasing power and constant dollars](https://www.bls.gov/cpi/factsheets/purchasing-power-constant-dollars.htm) supports the real-value calculation.
- [ECMA-402](https://402.ecma-international.org/) defines locale-aware number and currency formatting.
- [WCAG 2.2 labels and instructions](https://www.w3.org/WAI/WCAG22/Understanding/labels-or-instructions.html), [error suggestions](https://www.w3.org/WAI/WCAG22/Understanding/error-suggestion.html), and [non-text contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast) govern input definitions, error recovery, chart contrast, and non-color communication.
- [RFC 4180](https://www.rfc-editor.org/info/rfc4180/) provides the CSV interoperability reference.

## Competitor feature audit

Every competitor page below was reviewed August 8, 2026. Competitors informed feature discovery only; formula decisions use the authoritative sources above.

| Tool | Useful observed behavior | FinPath decision |
| --- | --- | --- |
| [Investor.gov](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator) | Initial amount, monthly contribution including negative values, rate variance, compound frequency | Keep lower/base/higher as deterministic sensitivity; model withdrawals explicitly instead of overloading the contribution field |
| [ASIC Moneysmart](https://moneysmart.gov.au/budgeting/compound-interest-calculator) | Contribution and compound frequencies, delayed-start comparison, effective rate, assumptions | Expose timing and effective rate; keep the method audit visible |
| [FINRA Savings](https://savingscalculator.nga.finra.org/) | Beginning-period deposits, inflation, contribution inflation adjustment | Support beginning/end timing, inflation, and annual contribution change |
| [Bankrate](https://www.bankrate.com/banking/savings/compound-savings-calculator/) | Weekly, biweekly, monthly, annual contributions and several compound frequencies | Support independent frequencies, but do not ask for APY plus compounding without clarifying the double-counting risk |
| [Calculator.net](https://www.calculator.net/interest-calculator.html) | Years plus months, additions, timing, inflation, tax, accumulation table | Support fractional time and schedule; defer the jurisdictionally simplistic tax shortcut |
| [The Calculator Site](https://www.thecalculatorsite.com/finance/calculators/compoundinterestcalculator.php) | Deposits, withdrawals, annual increases, schedules, effective rate | Use progressive disclosure to avoid equivalent density |
| [TransUnion](https://www.transunion.com/tools/compound-interest-calculator) | Contribution/compound frequencies, start date, expandable schedules | Keep relative timing for now; exact calendar rules are deferred |
| [MoneyHelper Savings](https://www.moneyhelper.org.uk/en/savings/how-to-save/savings-calculator) | Goal time and required-saving workflows | Keep required-contribution solving on `/calculators/savings-goal` |

## Implemented in this pass

- Dedicated, typed, route-local event engine.
- Nominal annual rate and APY/effective rate semantics.
- Daily, monthly, quarterly, semiannual, and annual nominal compounding.
- Weekly, biweekly, semimonthly, monthly, quarterly, semiannual, and annual contributions.
- Beginning/end contribution timing with explicit horizon boundaries.
- Fractional terms and final partial-year rows.
- Annual contribution increase and anniversary top-up.
- Annual percentage-of-assets fee, fees charged, and ending-value fee drag.
- Inflation-adjusted value and exact real annual return.
- Optional target in future money or as an inflation-adjusted target.
- One future deposit and one future withdrawal with depletion handling.
- Lower/base/higher return sensitivity, 3×3 rate/contribution grid, duration sensitivity, and milestones.
- True annual stacked capital/growth chart with an optional inflation-adjusted comparison plus annual and detailed reconciling schedules.
- USD, INR, EUR, GBP, CAD, AUD, and JPY display with browser, US, Indian, and German grouping; currency selection does not convert value.
- Versioned v2 share links, legacy v1 link restoration, per-route browser draft, raw CSV, signed-in save boundary, and saved-run reload.
- Visible validation, live result/status messages, radio semantics, captions, scoped headers, keyboard-scroll tables, forced-colors treatment, reduced motion, and 28px help targets.

## Feature organization

### Quick Start

- Starting principal, recurring contribution, fractional elapsed term, annual rate, contribution frequency, and nominal compounding frequency.
- A visible contribution equation reconciles amount × deposit count to deposits after the start; the return line distinguishes the annual nominal rate from its effective annual result.
- Ending value, starting capital, deposits after the start, total invested capital, net growth, growth share, and a plain-language interpretation.
- A stacked capital-versus-growth path with an inflation-adjusted comparison only when inflation is non-zero, plus immediate share, export, and save actions.

### Advanced Options

- Nominal rate versus APY, contribution timing, annual contribution increase, anniversary top-up, annual percentage-of-assets fee, inflation, optional target, one future deposit and withdrawal, and currency/locale display.
- The section is collapsed by default and opens only when the user asks for more assumptions.

### Expert Analysis

- Conservative/base/optimistic constant-rate comparisons, the rate-by-contribution grid, duration sensitivity, milestones, target checkpoints, annual and event schedules, CSV audit data, formula conventions, worked example, limitations, and sources.
- Every Expert Analysis disclosure is collapsed by default. The detailed event table renders in bounded increments while CSV always includes the complete schedule.

### Deferred

- Only the reliability-, jurisdiction-, product-, or clarity-dependent items listed below are deferred. Implementation effort is not a reason for deferral.

## Deferred with reasons

- Taxes and after-tax return: jurisdiction, account type, cost basis, realization timing, withholding, deductions, and current law all matter.
- Live APYs, market returns, CPI, and FX: require maintained data feeds, provenance, timestamps, and failure behavior.
- Monte Carlo and probability bands: require documented capital-market assumptions, distributions, volatility, correlation, reproducibility, and stronger risk disclosures.
- Variable yearly returns and sequence risk: belong in portfolio and retirement analysis rather than this deterministic accumulation route.
- Exact bank-ledger daily balance and calendar day count: product terms, leap years, holidays, collection timing, and crediting rules differ.
- Tiered, promotional, bonus, fixed, transaction, sales-load, and performance fees: product-specific.
- Negative investment balances: debt behavior belongs in lending calculators.
- Multiple arbitrary cash-flow rows: one deposit and one withdrawal cover the common planning need without turning the beginner flow into a ledger.
- Required contribution or required time solving: owned by `/calculators/savings-goal`, the next calculator in the excellence pass.

## August 8 verification corrections

- Derived fee, inflation, target, milestone, and schedule values now pass a complete finite-number guard before a valid result can be returned.
- A zero-principal, zero-contribution projection no longer reports a false “growth matches contributions” milestone.
- Share links and browser drafts preserve the selected scenario; unknown v2 formula versions are rejected instead of being silently interpreted.
- Browser drafts preserve only finite, valid assumptions and now work consistently for signed-in and signed-out users.
- Duration sensitivity, growth share, a numeric worked example, checkpoint-qualified target timing, standard currency display precision, and cumulative net-capital schedule columns are explicit.
- The chart no longer gives true zero values a minimum visible bar, uses stacked capital/growth plus a distinct real-value bar, and has a keyboard-scrollable labeled region plus tabular alternative.

## August 9 usability correction

- Contribution frequency and nominal compounding frequency now sit in Quick Start beside the amounts and rate they qualify instead of being hidden in Advanced Options.
- A recurring amount of `$10,000` over 10 years now visibly reconciles as `$10,000 × 120 = $1,200,000` for monthly deposits and `$10,000 × 10 = $100,000` for annual deposits, before growth; the starting amount is explicitly separate.
- “Future contributions” is now “Deposits after start,” and the result repeats the deposit equation so the total is auditable at the point of use.
- The ambiguous “Today’s buying power” result is removed. An “Inflation-adjusted ending value” appears only after a non-zero inflation assumption is entered, and the chart and schedules follow the same rule.
- Input and result panels stack at `1180px` and below, preventing the dense two-column workspace from compressing controls before the mobile layout takes over.

## Verification boundary

The route-local suite covers legacy compatibility, lump-sum and annuity goldens, every frequency, timing boundaries, APY invariance, nominal compounding differences, fractional terms, step-ups, top-ups, fees, inflation, targets, future events, valid negative returns, invalid/non-finite/overflowed values, row reconciliation, and finite-output invariants.

The shared regression suite continues to lock:

- Compound legacy default: `113669.41993630132`.
- 401(k): `275633.443391`.
- HYSA: `30519.03374`.
- All public calculator defaults and stable routes.
- `src/lib/fire.ts` behavior.
