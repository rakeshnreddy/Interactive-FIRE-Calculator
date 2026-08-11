# Emergency Fund Calculator Research and Formula Contract

Last updated: August 9, 2026

Route: `/calculators/emergency-fund`

Formula version: `finpath-emergency-fund-v2`

## Product conclusion

An emergency-fund calculator should not present one coverage period as universally correct. FinPath preserves the original `$4,500 × 6 = $27,000` default target while adding reserve liquidity tiers, current runway, progress, a funding gap and schedule, three/six/risk-reference comparisons, a separate one-time shock buffer, and explicit limits.

The generic `emergency-fund` registry formula remains unchanged for shared regression compatibility.

## User needs

### Beginner

- Convert essential monthly spending into a selected reserve target.
- See current reserve, remaining gap, runway, and a funding estimate.
- Understand that even a partially funded reserve has value.

### Intermediate

- Separate immediately available cash from short-term deposits and market-exposed assets.
- Add a one-time repair, deductible, or other likely shock amount.
- Compare common coverage periods without being told that one is guaranteed to fit.

### Advanced

- Audit the month-by-month funding path.
- Understand the risk-reference heuristic and change its inputs.
- Distinguish a liquid reserve from retirement savings, credit access, and investments that may fall or be difficult to sell.

## Formula conventions

```text
selected target = essential monthly spending * selected months + one-time buffer
current reserve = cash on hand + bank savings + short-term deposits + accessible investments
gap = max(0, selected target - current reserve)
excess = max(0, current reserve - selected target)
current runway = current reserve / essential monthly spending
months to goal = ceil(gap / monthly contribution)
```

The funding schedule applies the entered contribution once per month and stops at the selected target. It assumes no APY, investment return, tax, inflation, fees, or withdrawals.

Liquidity layers:

- Immediate: cash on hand and bank savings.
- Short notice: short-term deposits; penalties are not deducted.
- Market exposed: entered accessible investments; no market-value haircut is inferred.

Transparent FinPath risk-reference heuristic:

```text
start at 3 months
+2 months for variable income OR +4 for currently uncertain income
+1 month for a one-earner household
+0.5 month per dependent, capped at +2 months
round to half-month and clamp to 3–12 months
```

This heuristic is a labeled comparison, not an authoritative recommendation, probability, or override of the user-selected period. It is included because official sources consistently say circumstances matter and feature research shows users need to test income stability and household obligations.

All valid money inputs are finite and non-negative. Coverage must be greater than zero and no more than 24 months. Dependents must be a whole number from `0–20`.

## Authoritative sources

Every source below was reviewed August 9, 2026.

- [CFPB: An essential guide to building an emergency fund](https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/) says the amount depends on the individual situation, encourages a specific goal and consistent saving, and emphasizes safe, accessible storage.
- [FDIC: Saving for the Unexpected and Your Future](https://www.fdic.gov/consumer-resource-center/2025-01/saving-unexpected-and-your-future) reports that financial experts generally recommend at least six months of living expenses in an insured product and warns that certificates of deposit can have early-withdrawal penalties.
- [CFPB: Determine your down payment](https://www.consumerfinance.gov/owning-a-home/prepare/determine-your-down-payment/) uses a three-to-six-month expense cushion as a home-buying planning rule of thumb.
- [Vanguard: What is the right emergency savings amount?](https://ownyourfuture.vanguard.com/content/en/learn/financial-planning/whats-the-right-emergency-savings-amount.html) separates likely spending shocks from possible income shocks and discusses dependents and quick access.

## Competitor feature observations

Every page below was reviewed August 9, 2026. Competitors informed feature discovery only.

| Tool | Useful observed behavior | FinPath decision |
| --- | --- | --- |
| [NerdWallet Emergency Fund Calculator](https://www.nerdwallet.com/banking/learn/emergency-fund-calculator) | Expense-based target and three-to-six-month orientation | Let users select the period and show comparisons without enforcing the range |
| [Vanguard emergency-savings guidance](https://ownyourfuture.vanguard.com/content/en/learn/financial-planning/whats-the-right-emergency-savings-amount.html) | Spending-shock versus income-shock framing and access considerations | Add a separate one-time buffer and explicit liquidity tiers |
| [MoneyHelper Budget Planner](https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner) | Category-based expense preparation | Link essential-spending refinement to the Budget route |

## Implemented organization

### Quick Start

- Essential monthly spending, selected coverage, monthly contribution, and four current-reserve layers.
- Target, current reserve, gap, runway, funding time, risk reference, progress bar, and liquidity composition.

### Advanced Options

- One-time shock buffer, income pattern, household earners, dependents, currency display, and locale grouping.

### Expert Analysis

- Three/six/risk-reference targets, liquidity ladder, monthly funding schedule, CSV, method, limitations, sources, and saved history.

## Deferred with reasons

- Live account APYs: require maintained rate feeds and product terms; the emergency schedule intentionally assumes no growth.
- Deposit insurance eligibility: depends on jurisdiction, institution, account ownership, and current rules.
- Automatic market haircut or sale delay: depends on asset type, volatility, tax, settlement, and liquidity.
- Insurance/benefit offsets: policy terms, deductibles, waiting periods, unemployment benefits, severance, and eligibility vary.
- Credit availability as reserve: borrowing is not a guaranteed liquid asset and can create lasting debt.
- Return-bearing optimization: owned by Savings Goal and product-specific savings calculators.
- Non-USD Goal creation: the public calculator/share/CSV support seven currency displays, but the Goal workspace does not yet store currency.

## Verification boundary

Tests cover the preserved target, liquidity reconciliation, runway, gap, exact funding schedule, zero-contribution no-date state, risk heuristic, three/six/risk comparisons, one-time buffer, invalid enums/ranges/extremes, CRLF CSV, versioned sharing/drafts, labels, closed disclosures, progress/table alternatives, and shared registry regression.
