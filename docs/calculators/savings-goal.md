# Savings Goal Calculator Research and Formula Contract

Last updated: August 9, 2026

Route: `/calculators/savings-goal`

Formula version: `finpath-savings-goal-v2`

## Product conclusion

A useful savings-goal calculator must answer two separate questions without conflating them:

- What total recurring contribution is required to reach the goal?
- Is the contribution I already plan to make on track, ahead, or behind?

FinPath now gives `/calculators/savings-goal` a route-local inverse-solve engine. The shared legacy `savings-goal` formula remains unchanged because `/calculators/sip-goal` also uses it.

The prior Savings Goal default mixed conventions: current savings grew at an 8% effective annual rate while contributions grew at a nominal 8% rate divided monthly. It recommended `428.60043372567543`, then its monthly schedule ended at `100607.15237271925`. A clamped gap hid the `607.15237271925` surplus.

The corrected v2 default uses one explicit nominal-monthly convention:

- Goal: $100,000.
- Current savings: $10,000.
- Deadline: 10 years.
- Rate: 8% nominal, compounded monthly.
- Contributions: month-end.
- Exact required monthly contribution: `425.28168253155314`.
- Exact final scheduled balance: $100,000 within floating-point tolerance.

## User needs

### Beginner

- Enter a goal, current savings, deadline, expected rate, and optional current contribution.
- See the total contribution required per period, not a vaguely labelled “extra” amount.
- See the current-plan deadline shortfall or surplus and an optional catch-up deposit today.
- Understand that the result is a constant-assumption estimate, not a promise.

### Intermediate

- Choose contribution frequency and beginning/end timing.
- Distinguish nominal rates from APY and avoid double-counting compounding.
- Model annual contribution increases, anniversary top-ups, percentage balance fees, and today’s-money targets.
- Compare isolated rate cases plus deadline and target sensitivity.

### Advanced

- Reconcile the headline to annual and contribution-event schedules.
- Inspect signed gap and surplus, milestone timing, and first modeled current-plan target checkpoint.
- Export raw precision, restore versioned links and drafts, select locale/currency display, and save a USD Goal.

## Formula conventions

Let:

- `A` be the entered goal.
- `P` be current savings.
- `T` be the exact elapsed deadline in years.
- `j` be the nominal annual rate.
- `R` be APY/effective annual rate.
- `m` be nominal compoundings per year.
- `q` be contribution periods per year.
- `f` be the annual percentage balance fee.
- `p` be goal inflation.

Gross annual factor:

```text
nominal: G = (1 + j / m) ^ m
APY:     G = 1 + R
```

Net annual factor after the optional proportional balance fee:

```text
H = G × (1 - f)
```

Deadline target:

```text
future-money goal: A_T = A
today-money goal:  A_T = A × (1 + p) ^ T
```

Current savings at the deadline:

```text
FV_P = P × H ^ T
```

For a fixed aligned contribution with no step-up, the ordinary-annuity factor is:

```text
i = H ^ (1 / q) - 1
U = ((1 + i) ^ N - 1) / i
```

Beginning timing multiplies the aligned factor by `(1 + i)`. The zero-rate limit is `N`.

The production engine uses exact event timestamps so fractional terms, independent frequencies, fees, annual top-ups, and step-ups use the same path. For unit starting contribution:

```text
U = sum((1 + step-up) ^ completedContributionYears × H ^ (T - eventTime))
required starting contribution = max(0, (A_T - fixed-plan ending) / U)
```

The solve remains linear. No root finder is needed.

Timing boundaries:

- End contributions use `k / q`, begin at `k = 1`, and include a contribution exactly at the deadline.
- Beginning contributions begin at time zero and exclude the next contribution exactly at the deadline.
- Anniversary top-ups occur at full elapsed years.
- Fractional deadlines are never rounded to whole schedule years.

Every schedule row reconciles:

```text
closing = opening + deposits + gross return - fees
```

Signed difference remains visible:

```text
surplus or shortfall = closing - deadline target
```

## Current-plan comparison

The entered current contribution is a comparator, not an amount added to the required contribution.

```text
periodic increase = required contribution - current contribution
deadline shortfall = max(0, deadline target - current-plan ending)
catch-up today = deadline shortfall / H ^ T
```

The current-plan target time is the first modeled contribution checkpoint at or above the target. It is reported as elapsed time, because the calculator does not ask for a calendar start date.

## Worked references

- Default nominal-monthly, end timing: `425.28168253155314` per month.
- Same inputs, beginning timing: `422.4652475479005` per month.
- Zero return and fee: $750 per month.
- 5% annual contribution step-up: `349.09196786601234` starting monthly amount.
- 3% inflation with a today’s-money target: target `134391.63793441223`; monthly amount `613.2695659544021`.
- Current contribution $300: deadline value `77080.21289995963`, increase `125.28168253155314`, catch-up today `10325.901803064791`, and first $100,000 checkpoint at month 146.
- 1% balance fee: `462.06095154990214` per month.
- Valid -2% nominal example, $20,000 target, $5,000 current, five years: `270.83341441804373` per month.

## Authoritative sources

Every source below was accessed August 9, 2026.

- [Investor.gov Savings Goal Calculator](https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator) provides the official investor-education baseline.
- [Investor.gov goal guidance](https://www.investor.gov/introduction-investing/investing-basics/save-and-invest/define-your-goals) supports defining both target and time horizon.
- [Microsoft FV](https://support.microsoft.com/en-us/excel/functions/fv-function) documents consistent rate/period units and beginning/end timing.
- [OpenStax annuities](https://openstax.org/books/principles-finance/pages/8-2-annuities) documents ordinary-annuity and annuity-due factors.
- [CFPB Regulation DD definitions](https://www.consumerfinance.gov/rules-policy/regulations/1030/2/) distinguishes interest rate from APY.
- [CFPB Regulation DD Appendix A](https://www.consumerfinance.gov/rules-policy/regulations/1030/a/) defines APY calculation conventions.
- [CFPB My New Money Goal](https://files.consumerfinance.gov/f/documents/cfpb_my_new_money_goal.pdf) supports comparing the required monthly amount with what is available to save.
- [FDIC Goals and Saving](https://www.fdic.gov/consumer-resource-center/chapter-2-goals-and-saving) supports defining what, how much, when, and how.
- [BLS purchasing power](https://www.bls.gov/cpi/factsheets/purchasing-power-constant-dollars.htm) supports the today’s-money target treatment.
- [FINRA calculator disclaimer](https://www.finra.org/investors/tools-and-calculators/tools-and-calculators-disclaimer) describes calculator outputs as hypothetical approximations.
- [ECMA-402](https://402.ecma-international.org/) defines locale-aware number and currency formatting.

## Competitor feature audit

Competitors informed feature discovery only; formula decisions use the authoritative references above.

| Tool | Useful observed behavior | FinPath decision |
| --- | --- | --- |
| [Investor.gov](https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator) | Target, initial amount, years, rate, compounding frequency | Keep those basics in Quick Start or collapsed Advanced Options |
| [ASIC MoneySmart](https://moneysmart.gov.au/saving/savings-goals-calculator) | Solve amount or time; current regular saving; contribution frequency and beginning timing; clear exclusions | Add current-plan comparison, exact timing semantics, and visible limits |
| [MoneyHelper](https://www.moneyhelper.org.uk/en/savings/how-to-save/savings-calculator) | Two-way “how much” and “how long” workflows | Show first modeled current-plan target checkpoint without pretending it is an exact date |
| [Bankrate](https://www.bankrate.com/banking/savings/saving-goals-calculator/) | Contribution equivalents and schedule | Support seven contribution cadences and a full audit schedule |
| [FINRA Savings](https://savingscalculator.nga.finra.org/) | Beginning timing and inflation-linked contributions | Support beginning/end timing, target inflation, and annual step-up |
| [Calculator.net](https://www.calculator.net/savings-calculator.html) | Contribution increases, tax, inflation, monthly table | Keep step-up/inflation/schedule; defer simplistic tax |

## Implemented in this pass

- Dedicated typed inverse-solve engine with a finite-output invariant.
- Consistent nominal/APY handling, exact fractional terms, independent contribution and compounding frequencies, and beginning/end timing.
- Current contribution comparison, periodic increase or margin, deadline shortfall/surplus, catch-up today, and first modeled target checkpoint.
- Annual contribution increase, anniversary top-up, balance fee, and future/today-money target basis.
- Required/current runway chart, milestones, isolated return cases, target/deadline sensitivity, annual summary, bounded detailed table, and raw full schedule CSV.
- Route-specific versioned share links and browser drafts with legacy link restoration.
- USD, INR, EUR, GBP, CAD, AUD, and JPY formatting; browser, US, Indian, and German grouping; no FX implication.
- Signed-in save values now include exact required contribution and resolved target; fractional goal deadlines no longer round to whole years.
- Non-USD Goal conversion is visibly blocked until the Goals data model stores currency. Share and CSV remain available.
- Labels, described help, inline validation, live result/status text, native radio and disclosure semantics, table captions/headers, keyboard-scroll regions, forced-colors patterns, and bounded tables.

## Deferred with reasons

- Goal currencies beyond USD: requires a Goals schema/API/UI migration so amounts are never silently re-labelled.
- Live APY, CPI, and FX: require maintained feeds, provenance, timestamps, and failure behavior.
- Taxes: jurisdiction, account type, realization, withholding, and current law matter.
- Actual-calendar day count, daily-balance crediting, leap-year/product rules, tiered/bonus APYs, minimum balances, and withdrawal restrictions: product-specific.
- Flat and transaction fees, loads, and penalties: cannot be represented truthfully by one percentage field.
- Monte Carlo or confidence probabilities: require documented assumptions, volatility, distribution, reproducibility, and governance.
- Arbitrary one-time cash-flow ledger: the Compound Interest route owns limited future events; signed-in planning should own a reusable ledger.
- Multiple-goal prioritization: belongs in the signed-in planning workspace.

## Route boundaries

- Compound Interest answers “what will this known plan become?” Savings Goal owns inverse contribution and time-to-target analysis.
- SIP Goal retains its India/investment framing and shared legacy formula until its own excellence pass.
- Down Payment and Emergency Fund own target construction, then may reuse this funding engine later.
- Retirement owns retirement-income target construction, taxes, withdrawal rates, and sequence risk.

## Verification boundary

Route-local tests cover formula goldens, zero and negative rates, APY invariance, beginning/end timing, exact fractional terms, step-ups, inflation, fees, current-plan comparison, impossible recurring timing, status classification, signed surplus, row reconciliation, monotonic sensitivities, invalid domains, overflow safety, share/draft/save round-trips, CSV reconciliation, locale/currency formatting, and semantic static markup.

The shared regression suite must continue to lock the legacy generic Savings Goal value `428.600434` and SIP Goal value `54660.927689`. Only `/calculators/savings-goal` receives v2.
