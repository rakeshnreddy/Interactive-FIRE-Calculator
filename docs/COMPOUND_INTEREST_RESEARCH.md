# Compound Interest Calculator Research and Formula Contract

Last updated: July 27, 2026

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

Every source below was accessed July 27, 2026.

- [CFPB Regulation DD definitions](https://www.consumerfinance.gov/rules-policy/regulations/1030/2/) distinguishes an annual interest rate that does not include compounding.
- [CFPB Regulation DD Appendix A](https://www.consumerfinance.gov/rules-policy/regulations/1030/2011-12-30/a/) defines APY calculation conventions.
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
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) governs labels, errors, status messages, keyboard access, and non-color communication.
- [RFC 4180](https://www.rfc-editor.org/info/rfc4180/) provides the CSV interoperability reference.

## Competitor feature audit

Every competitor page below was reviewed July 27, 2026. Competitors informed feature discovery only; formula decisions use the authoritative sources above.

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
- Optional target in future money or today’s purchasing power.
- One future deposit and one future withdrawal with depletion handling.
- Lower/base/higher return sensitivity, 3×3 rate/contribution grid, and milestones.
- True annual balance chart plus annual and detailed reconciling schedules.
- USD, INR, EUR, GBP, CAD, AUD, and JPY display with browser, US, Indian, and German grouping; currency selection does not convert value.
- Versioned v2 share links, legacy v1 link restoration, per-route browser draft, raw CSV, signed-in save boundary, and saved-run reload.
- Visible validation, live result/status messages, radio semantics, captions, scoped headers, keyboard-scroll tables, forced-colors treatment, reduced motion, and 28px help targets.

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

## Verification boundary

The route-local suite covers legacy compatibility, lump-sum and annuity goldens, every frequency, timing boundaries, APY invariance, nominal compounding differences, fractional terms, step-ups, top-ups, fees, inflation, targets, future events, valid negative returns, invalid/non-finite/overflowed values, row reconciliation, and finite-output invariants.

The shared regression suite continues to lock:

- Compound legacy default: `113669.41993630132`.
- 401(k): `275633.443391`.
- HYSA: `30519.03374`.
- All public calculator defaults and stable routes.
- `src/lib/fire.ts` behavior.
