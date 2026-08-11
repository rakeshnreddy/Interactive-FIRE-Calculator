# Budget Calculator Research and Formula Contract

Last updated: August 9, 2026

Route: `/calculators/budget`

Formula version: `finpath-budget-v2`

## Product conclusion

A budget should separate what came in, what was spent, what is intentionally saved, and what remains unassigned. FinPath preserves the original `$7,000` monthly income, `$4,500` spending, and `$2,500` monthly-surplus default while replacing the route-only two-total form with income, needs, flexible-spending, and savings categories; an annual pace; cashflow stress checks; a reference allocation; tables; sharing; export; drafts; and saved snapshots.

The generic `budget` registry formula remains unchanged for shared regression compatibility.

## User needs

### Beginner

- Enter take-home income and recognizable monthly categories.
- See whether income covers spending.
- Avoid counting savings transfers as both spending and leftover cash.

### Intermediate

- Separate needs and commitments from flexible spending.
- Assign part of the surplus to saving, investing, or extra debt payoff.
- Compare an income reduction with a flexible-spending reduction.

### Advanced

- Reconcile every category monthly and annually.
- Compare the entered plan with a configurable savings-rate reference.
- Understand that monthly amount timing and actual transactions can differ from a constant monthly plan.

## Formula conventions

```text
total income = take-home pay + other income
monthly needs = sum(need and commitment categories)
monthly wants = sum(flexible-spending categories)
total spending = monthly needs + monthly wants
monthly surplus = total income - total spending
unassigned after plan = monthly surplus - planned savings
savings capacity rate = monthly surplus / total income
planned savings rate = planned savings / total income
annual pace = monthly amount * 12
```

Savings capacity can be negative when spending exceeds income. It is unavailable when total income is zero. Planned savings remains an allocation of the spending surplus and does not reduce the headline twice.

The 50/30/20 display is an optional reference. Needs use `50%` of entered take-home income, wants use `30%`, and savings uses a configurable default of `20%`. These values never overwrite the entered plan or claim suitability.

Stress comparisons:

- Income shock reduces entered income by the selected percentage while spending stays fixed.
- Flexible trim reduces lifestyle, subscriptions, and other flexible spending by the selected percentage while needs and income stay fixed.

All valid numeric inputs are finite and non-negative; comparison percentages are limited to `0–100%`. A deficit is valid and is never clamped.

## Authoritative sources

Every source below was reviewed August 9, 2026.

- [Consumer.gov: Making a Budget](https://consumer.gov/your-money/making-budget) instructs users to list bills and other expenses, determine monthly income, subtract expenses from income, and revisit the plan each month.
- [CFPB: Creating a cash flow budget](https://www.consumerfinance.gov/documents/10038/cfpb_creating-cash-flow-budget_tool_2021-08.pdf) emphasizes income, expenses, savings, and the timing of cash within a month.
- [CFPB: My spending rule to live by](https://files.consumerfinance.gov/f/documents/cfpb_worksheet_my-spending-rule-to-live-by.pdf) presents 50/20/30 as common guidance while explicitly encouraging a personal rule that fits the household.
- [CFPB financial planning worksheet](https://www.consumerfinance.gov/documents/7276/cfpb_my-new-money-goal_worksheet.pdf) supports category entry and averaging multiple months for variable expenses.

## Competitor feature observations

Every page below was reviewed August 9, 2026. Competitors informed feature discovery only.

| Tool | Useful observed behavior | FinPath decision |
| --- | --- | --- |
| [MoneyHelper Budget Planner](https://www.moneyhelper.org.uk/en/everyday-money/budgeting/budget-planner) | Multiple income/spending categories, leftover total, and bank-statement preparation | Use explicit categories and link the estimate to FinPath Transactions |
| [ASIC Moneysmart Budget Planner](https://moneysmart.gov.au/budgeting/budget-planner) | Snapshot framing and income-versus-expense result | Keep results as a planning snapshot rather than implying actual transaction tracking |
| [TransUnion 50/30/20 calculator](https://www.transunion.com/tools/budget-calculator) | Net-income category comparison and statement-based inputs | Show the reference as orientation, never an enforced target |
| [NerdWallet Budget Worksheet](https://www.nerdwallet.com/finance/learn/budget-worksheet) | Simple category allocation and 50/30/20 comparison | Preserve category clarity while exposing planned saving and unassigned cash separately |

## Implemented organization

### Quick Start

- Take-home and other income.
- Seven need/commitment categories, three flexible categories, and planned monthly saving.
- Monthly surplus, spending, planned saving, savings capacity, unassigned cash, and annual pace.
- Cashflow waterfall/bar view and interpretation.

### Advanced Options

- Configurable savings reference, income shock, flexible-spending trim, currency display, and locale grouping.

### Expert Analysis

- Category table, scenario comparison, reference reads, constant 12-month allocation pace, CSV, sources, limitations, and saved history.

## Deferred with reasons

- Actual-versus-budget history: requires transaction dates, category rules, reviewed imports, and authenticated storage; FinPath Transactions owns this workflow.
- Intra-month cash timing: requires pay dates, bill due dates, account starting balance, and a weekly ledger.
- Automatic categorization: requires transaction data, explainable mapping, review, and correction workflows.
- Jurisdictional affordability targets: housing, debt, benefits, tax, and subsistence thresholds vary and change.
- Inflation and variable monthly forecasts: require explicit per-category escalation or a historical series; repeating the current plan is labeled honestly.
- Multi-currency conversion: requires timestamped FX data. Currency selection changes display only.

## Verification boundary

Tests cover the preserved default, category reconciliation, spending-versus-saving separation, reference values, income/flexible scenarios, valid deficits, 12-month pace, invalid/extreme inputs, CRLF CSV, versioned sharing/drafts, labels, closed disclosures, visuals, tables, and shared formula regressions.
