# Net Worth Calculator Research and Formula Contract

Last updated: August 9, 2026

Route: `/calculators/net-worth`

Formula version: `finpath-net-worth-v2`

## Product conclusion

Net worth is mathematically simple but operationally useful only when the calculator becomes a dated personal balance sheet. FinPath keeps the stable public route and the original `$250,000` assets, `$75,000` liabilities, and `$175,000` net-worth default, while replacing the route-only two-total form with asset and liability categories, liquidity reads, valuation sensitivity, a reconciled table, versioned sharing, CSV export, browser drafts, and saved snapshots.

The generic `net-worth` registry formula remains unchanged for shared regression compatibility.

## User needs

### Beginner

- Understand that net worth is assets minus liabilities.
- Enter familiar categories without deciding account types or signing in first.
- See total assets, liabilities, and the resulting net position immediately.

### Intermediate

- Separate liquid assets from property, retirement balances, and other less-accessible holdings.
- See the effect of broad valuation changes without mistaking sensitivity for a forecast.
- Export or share an input-only snapshot and continue into account tracking.

### Advanced

- Audit every category and its share of the relevant balance-sheet side.
- Apply one ownership, currency, valuation, and snapshot-date boundary consistently.
- Understand that specialized legal, tax, benefit, lending, and accredited-investor definitions may exclude or reclassify items.

## Formula conventions

```text
total assets = sum(asset categories)
total liabilities = sum(liability categories)
net worth = total assets - total liabilities
debt-to-asset ratio = total liabilities / total assets
```

The debt-to-asset ratio is unavailable, rather than reported as zero, when total assets are zero.

FinPath-specific liquidity convention:

```text
liquid assets = cash and bank accounts + taxable investments
liquid position = liquid assets - credit cards - other short-term liabilities
```

This is a disclosed planning convention, not a universal accounting definition. Retirement accounts, real estate, vehicles, and valuables are not classified as liquid here.

Valuation sensitivity keeps cash fixed, changes every other asset category together by `-10%`, `0%`, or `+10%`, and leaves liabilities unchanged. It is not a probability or forecast.

All valid numeric inputs must be finite, non-negative, and no greater than `1e15`. Negative net worth remains a valid result and is never clamped.

## Authoritative sources

Every source below was reviewed August 9, 2026.

- [CFPB Your Money, Your Goals toolkit](https://files.consumerfinance.gov/f/201504_cfpb_ymyg_toolkit-workers.pdf) defines a personal balance sheet as owned assets and owed liabilities and describes their difference as net worth.
- [FINRA Financial Foundations: Know Your Net Worth](https://www.finra.org/investors/personal-finance/know-your-net-worth) lists savings, investments, personal property, real estate, mortgages, credit cards, and personal or auto loans, and recommends repeated snapshots for progress tracking.
- [Investor.gov accredited-investor bulletin](https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated-3) confirms the basic assets-minus-liabilities formula while demonstrating why specialized statutory definitions can apply exclusions.

## Competitor feature observations

Every page below was reviewed August 9, 2026. Competitors informed feature discovery only.

| Tool | Useful observed behavior | FinPath decision |
| --- | --- | --- |
| [FINRA](https://www.finra.org/investors/personal-finance/know-your-net-worth) | Plain category examples and repeated-snapshot framing | Use category entry and saved-history language without age or income benchmarking |
| [Forbes Advisor](https://www.forbes.com/advisor/investing/financial-advisor/net-worth-calculator/) | Current resale-value framing and asset liquidity explanation | Ask for current defensible values and expose a separate liquidity read |
| [NerdWallet](https://www.nerdwallet.com/investing/calculators/net-worth-calculator) | Familiar asset/liability groups and basic education | Keep the beginner formula visible while adding an auditable balance-sheet table |

## Implemented organization

### Quick Start

- Six asset categories and five liability categories.
- Estimated net worth, total assets, total liabilities, liquid assets, liquid position, and debt-to-asset ratio.
- A same-scale assets/liabilities/net-worth visual and plain-language interpretation.

### Advanced Options

- Currency symbol and locale grouping display only; no exchange-rate conversion.

### Expert Analysis

- Category reconciliation table with section shares.
- Non-cash asset-value sensitivity.
- Method, limitations, sources, CSV export, saved history, and route-specific FAQs.

## Deferred with reasons

- Automatic account aggregation: requires authenticated provider connections, consent, security review, reconciliation, and failure handling.
- Appraisals and live market values: property, private business, vehicle, collectible, and investment valuations require maintained data sources and provenance.
- Tax-adjusted or liquidation net worth: jurisdiction, cost basis, selling costs, tax treatment, and timing differ.
- Pension present value and future benefits: plan terms, discount rates, survivor options, vesting, and jurisdiction matter.
- Peer benchmarking: age/income/location cohorts can create false precision and require maintained representative data.
- Multi-currency conversion: requires timestamped FX data. Display currency never converts entered amounts.
- True net-worth trend: the public route shows saved-run history, while longitudinal account balances belong in the signed-in Accounts and Dashboard workspaces.

## Verification boundary

Tests cover the preserved default, category reconciliation, liquidity convention, debt ratio, negative net worth, zero-asset behavior, sensitivity, non-finite/negative/extreme inputs, CRLF CSV, versioned share/draft behavior, labels, closed disclosures, chart alternative, and shared registry regression.
