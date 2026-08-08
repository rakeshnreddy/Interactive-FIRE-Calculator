# Calculator High Standard Implementation Plan

Last updated: August 8, 2026

## Purpose

Every public calculator must feel useful enough that a user would rather use FinPath than a basic calculator. The standard is not "show a formula." The standard is:

- Explain what decision the calculator helps with.
- Explain every input with the right unit and timing.
- Return a clear headline answer plus supporting values.
- Show at least one visual read today and richer visualizations as each studio is completed.
- Let users compare assumptions instead of typing one static case.
- Turn the result into an authenticated FinPath workflow when the user wants to save it.
- Test formula math, edge cases, visual data, signed-out behavior, signed-in saves, and mobile layout.

This document works with:

- `src/lib/calculatorQuality.ts`: code-level quality contract for every current public calculator route.
- `docs/CALCULATOR_VALUE_ROADMAP.md`: phase roadmap, search-preservation rules, planned calculator routes, and deploy checkpoints.
- `docs/FINANCIAL_PLATFORM_TRACKER.md`: implementation status and verification notes.

## Current Checkpoint

Status after this checkpoint:

- Every current public calculator has a quality contract in code.
- Calculator pages show a "Why it matters" explanation, a baseline visual read of the result metrics, and decision checks.
- Signed-in users can save calculator outputs through a durable D1 result record, with downstream goal/account/plan draft creation where safe.
- Signed-out users can preserve a calculator draft/result before account creation.
- Shared decision-studio metadata, scenario state, chart-ready primitives, route-specific examples, and related-calculator navigation are in place for every current public route.
- Existing formula tests now also assert that every calculator has calculation, visual, scenario, validation, and conversion expectations.
- This completes the Phase 20 foundation, not the family-specific comprehensive studio work.

Completion estimate:

- Comprehensive calculator program: 32% complete.
- Remaining work: 68%.
- Why not higher: family-specific full studio charts, amortization schedules, statutory tax engines, missing loan routes, exports, and personalization are still pending.

## Phase 26 Excellence-Pass Clarifications

The shared foundation above remains historical context. Phase 26 now reviews one stable calculator route at a time against a stricter completion gate. Compound Interest is calculator 1 of 82; Savings Goal is next.

The Compound Interest pass clarifies the reusable standard for later growth calculators:

- Quick Start contains only essential assumptions and an interpretable headline result.
- Advanced Options and every Expert Analysis disclosure are collapsed by default.
- Sensitivity covers every material axis claimed by the route; Compound Interest includes return, contribution, and duration.
- Charts must expose a relationship that headline metrics cannot, use a tabular or textual equivalent, distinguish series without color alone, and never draw a positive-height mark for a true zero value.
- A valid projection must contain finite values in every returned scalar, milestone, and schedule field—not only the headline.
- Share links, drafts, saved inputs, and CSVs are versioned and tested as restorable audit boundaries.
- Long detailed schedules may render in bounded increments, but the complete reconciled data remains exportable.

## Universal Definition Of Done

Each calculator is complete only when all items below are true:

1. Public route remains stable and usable without authentication.
2. H1, title, description, canonical, sitemap entry, FAQ, and structured data match visible user-helpful content.
3. Inputs show labels, units, helper text, min/max validation where useful, and monthly/annual timing.
4. Outputs include headline answer, supporting values, assumptions, and plain-language interpretation.
5. Formula engine is deterministic, typed, and tested independently from UI.
6. Timeline, split, tradeoff, or sensitivity calculations produce chart-ready data.
7. Calculator has at least one useful visualization; complex calculators get route-specific charts, tables, and period-by-period schedules.
8. Base/conservative/optimistic or relevant comparison scenarios are available.
9. Signed-out users can run the calculator and preserve a draft through sign-up.
10. Signed-in users can save the result to the correct destination: Goals, Accounts, Plans, or Transactions.
11. Tests cover formula output, invalid/empty states, visual data, schedule/table data, CTA behavior, public access, and responsive layout.
12. Public copy never exposes internal traffic, ranking, or acquisition strategy.

## Shared Formula Modules To Build

These modules should power multiple calculators instead of duplicating formulas in each route:

| Module | Used by | Required capabilities |
| --- | --- | --- |
| Growth projection engine | compound, SIP, step-up SIP, SIP goal, FD, RD, PPF, EPF, NPS, 401(k), CD, HYSA, down payment, inflation | Future value, contribution timing, invested vs growth split, inflation-adjusted value, goal gap, monthly required, scenario grid, contribution/deposit schedule, milestone table. |
| Return analysis engine | investment return, CAGR, XIRR, ROI, Rule of 72 | Annualized return, true dated-cashflow XIRR, total return, payback period, benchmark comparison, inflation-adjusted return, dated cashflow table where cashflows are irregular. |
| Loan amortization engine | EMI, mortgage, auto loan, personal loan, HELOC, amortization, home loan EMI, planned loan routes | Payment, complete monthly payment schedule, yearly rollups, selected custom period view, principal/interest split, cumulative interest, remaining balance, prepayment, fees, export data. |
| Home decision engine | mortgage affordability, rent vs buy, PMI, down payment, lease vs buy, closing costs, escrow, FHA/VA planned routes | DTI, cash-to-close, taxes, insurance, PMI/MIP/funding fee, appreciation, maintenance, equity, break-even, net-worth crossover. |
| Debt payoff engine | debt payoff, credit card payoff, student loan payoff, snowball vs avalanche, balance transfer | Multiple debts, minimum payments, strategy ordering, promo APR, transfer fee, payoff calendar, month-by-month payoff table, interest saved, unsustainable-payment warnings. |
| Income and tax estimate engine | India tax, US tax, salary, paycheck, HRA, GST, TDS, capital gains, Roth vs Traditional, RMD | Gross-to-net waterfall, taxable base, deductions, bracket/slab logic, effective/marginal rate, tax slab/bracket table, paycheck period table, assumptions, estimate disclaimers. |
| Retirement income engine | retirement, FIRE, SWP, Social Security break-even, RMD, NPS, EPF, PPF, 401(k), gratuity | Corpus need, contribution gap, withdrawal runway, benefit break-even, annuity split, distribution requirement, vesting, inflation, contribution/withdrawal/distribution schedule. |
| Cashflow and protection engine | net worth, budget, emergency fund, life insurance needs | Assets/liabilities, surplus, savings rate, reserve target, runway, DIME-style insurance need, protection gap, category/period breakdown table, dashboard follow-up. |

## Visual Standard

Every calculator gets at least one baseline visual read. Comprehensive completion requires the richer visual relevant to the decision:

| Decision type | Required comprehensive visuals |
| --- | --- |
| Growth, SIP, savings, deposits | Contribution vs growth area chart, milestone timeline, inflation-adjusted comparison, sensitivity grid, contribution/deposit schedule. |
| Goal solving | Target runway, monthly required/catch-up slider, current-vs-needed progress, goal milestone table. |
| Loans and EMI | Complete monthly amortization table, yearly rollup, custom period view, principal/interest chart, remaining balance line, cumulative interest line, export-ready schedule data. |
| Mortgage and home | Payment waterfall, affordability/DTI gauges, equity timeline, break-even chart, cash-to-close breakdown, amortization/equity schedule where a loan is involved. |
| Debt payoff | Payoff calendar, month-by-month balance table, balance timeline, snowball vs avalanche comparison, interest-saved bars, minimum-payment warning. |
| Income and tax | Gross-to-net waterfall, regime/status comparison, deduction sensitivity, effective/marginal rate display, tax slab/bracket or paycheck-period table. |
| Retirement | Corpus timeline, gap/surplus chart, withdrawal runway, account/product split, claiming/distribution break-even, contribution/withdrawal/RMD schedule. |
| Budget and protection | Cashflow waterfall, category bars, reserve runway, assets/liabilities bars, coverage gap waterfall. |
| Return analysis | Value path, benchmark comparison, cashflow timeline/table, payback chart, return sensitivity. |

## Schedule And Table Standard

Calculators that imply repeated periods must ship a table or schedule in addition to charts:

- Detailed tables should be collapsed by default, clearly labeled, keyboard accessible, and scroll-safe on mobile so the main result panel stays clean until the user asks for the deeper breakdown.
- Amortization, mortgage, EMI, auto loan, personal loan, HELOC, refinance, loan comparison, extra-payment, and home-loan calculators: full monthly payment schedule with payment number/date, payment, principal, interest, fees/insurance/taxes when modeled, ending balance, cumulative interest, yearly rollups, custom period filters, and export-ready CSV data.
- Credit card, student loan, debt payoff, snowball/avalanche, balance transfer, foreclosure, and prepayment calculators: month-by-month payoff table with balance, interest, principal, extra payment, promo-period status, payoff date, and strategy-specific debt order.
- SIP, step-up SIP, RD, FD/CD ladders, HYSA, compound-interest, down-payment, 401(k), PPF, EPF, NPS, and savings-goal calculators: contribution/deposit schedule with period contribution, employer or step-up amount where relevant, interest/growth, ending balance, milestone dates, and yearly summaries.
- SWP, retirement, FIRE, RMD, Social Security break-even, NPS annuity, and retirement-income calculators: withdrawal/distribution schedule with starting balance, withdrawal, growth, required distribution or benefit amount, taxes/withholding when modeled, ending balance, and runway markers.
- Paycheck, salary, income-tax, GST, TDS, HRA, capital-gains, and Roth/traditional calculators: period or bracket tables showing gross, deductions/exemptions, taxable base, rate/slab, tax, and net amount.
- Budget, emergency fund, net worth, and insurance calculators: category or period breakdown tables where the user needs to audit the inputs, not only see a chart.

## Current Calculator Contracts

The code-level contract in `src/lib/calculatorQuality.ts` applies to all current routes. The table below captures the specific comprehensive expectation for each route.

### Global Planning, Growth, And Return

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| Compound Interest | Future value, total contributions, growth, inflation-adjusted value, scenario sensitivity, contribution schedule. | Contribution vs growth timeline, annual balance table, and return/contribution grid. | Shows how time, deposits, and return assumptions create wealth. |
| Savings Goal | Future current savings, remaining target, monthly required, catch-up amount, deadline sensitivity, savings schedule. | Goal progress, target-date timeline, and deposit schedule. | Turns a target into an actionable monthly savings plan. |
| Net Worth | Asset categories, liability categories, net worth, allocation, trend when saved. | Assets vs liabilities bars, account mix, net worth trend. | Makes a simple subtraction useful by becoming an account setup workflow. |
| Budget | Income, expense categories, surplus, savings rate, recurring bills, category targets. | Cashflow waterfall or Sankey, category bars, surplus trend. | Helps users move from estimate to transaction tracking. |
| Emergency Fund | Core spending, target months, current reserve, gap, risk-based target. | Runway gauge, reserve ladder, current vs target progress. | Sizes a realistic safety buffer and creates a trackable goal. |
| Retirement | Projected savings, estimated corpus need, gap/surplus, contribution gap, inflation, contribution/withdrawal schedule. | Retirement timeline, need vs projection, yearly schedule, sensitivity heatmap. | Shows whether the current plan supports future income. |
| Debt Payoff | Payoff months, total interest, payoff date, extra payment sensitivity, month-by-month payoff table. | Balance decline, payoff calendar/table, interest-saved bars. | Converts debt math into a payoff plan. |
| Investment Return | CAGR, total return, inflation-adjusted return, benchmark comparison, cashflow table when contributions vary. | Value path, cashflow table, return bridge, benchmark bars. | Explains whether a result was good after time and inflation. |
| CAGR | Start/end value, elapsed years, annualized return, multi-investment compare. | CAGR comparison bars and value path. | Keeps the route but makes it useful beyond the one CAGR formula. |
| XIRR | Dated cashflows, true money-weighted return, convergence validation. | Cashflow table/timeline and cumulative invested vs value. | Handles irregular investing that simple CAGR cannot. |
| Inflation | Future cost, purchasing-power loss, income-growth comparison, goal adjustment. | Future cost curve and purchasing-power decline. | Shows how goals need to change as prices rise. |
| Rule of 72 | Rule estimate, exact doubling time, rate comparison. | Rate vs doubling-time curve. | Turns mental math into a gateway to richer compounding analysis. |
| ROI | Net gain, all-in cost, annualized ROI, payback period, scenario comparison. | ROI waterfall and payback timeline. | Helps compare projects after time and costs, not just gain divided by cost. |

### India Calculators

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| SIP | Corpus, total invested, gains, inflation-adjusted corpus, goal gap, contribution schedule. | Invested vs gains area chart, contribution table, and contribution sensitivity. | Turns monthly investing into a goal plan. |
| Step-up SIP | Monthly/yearly step-up schedule, corpus, added value over flat SIP, affordability. | Step-up ladder, contribution table, and flat-vs-step-up comparison. | Shows whether increasing contributions with income meaningfully changes the outcome. |
| SIP Goal | Target corpus, current savings growth, required SIP, catch-up SIP, target inflation, target contribution schedule. | Goal gap chart, monthly SIP slider, and deposit schedule. | Solves what to invest monthly instead of only projecting an amount. |
| Lumpsum Mutual Fund | Future value, gains, downside/base/upside scenarios, tax placeholder. | Lumpsum vs SIP line and return sensitivity. | Helps compare one-time investing with recurring investing. |
| SWP | Withdrawal runway, ending balance, escalation, return stress, sequence-risk warning, period withdrawal schedule. | Corpus drawdown line, runway gauge, withdrawal table. | Shows how long a corpus may support withdrawals. |
| EMI | Payment, total interest, total paid, complete monthly amortization, yearly rollups, prepayment effect. | EMI split, amortization table, yearly summary, prepayment savings. | Moves from monthly payment to lifetime loan cost. |
| Home Loan EMI | EMI, down payment, fees/stamp duty hooks, tax benefit assumptions, prepayment, full loan schedule. | Total cost waterfall, amortization/equity line, yearly rollup. | Helps evaluate affordability and long-term home-loan cost. |
| Car Loan EMI | EMI, down payment, total ownership cost, insurance, depreciation, resale, loan schedule. | Monthly cost waterfall, loan balance vs vehicle value, yearly loan table. | Shows affordability beyond the loan payment. |
| Personal Loan EMI | EMI, origination/fees, consolidation comparison, prepayment savings, payoff schedule. | Payment/term curve, payoff table, interest-saved chart. | Helps compare personal borrowing options and payoff plans. |
| Income Tax India | Old/new regime slabs, deductions, cess, surcharge assumptions, net income, slab-by-slab tax table. | Regime bars, slab table, and gross-to-net waterfall. | Lets users compare regimes with visible assumptions. |
| Salary India | CTC components, PF, professional tax, variable pay, estimated tax, monthly take-home, monthly/annual pay table. | CTC-to-take-home waterfall, pay-period table, and fixed/variable split. | Converts CTC into monthly cashflow expectations. |
| HRA Exemption | HRA received, rent minus 10% salary, metro/non-metro cap, taxable HRA, formula component table. | Exemption component bars, formula table, and taxable HRA waterfall. | Explains which part of the HRA formula limits the exemption. |
| FD | Maturity, interest, payout frequency, tax/TDS estimate, laddering, payout schedule. | Interest vs principal, maturity ladder, payout table. | Helps decide maturity timing and reinvestment strategy. |
| RD | Deposit schedule, maturity, interest, missed-payment impact, tax/TDS estimate. | Deposit vs interest area, monthly schedule, yearly summary. | Makes recurring deposits easier to plan and track. |
| PPF | Annual contribution, cap progress, maturity, extension blocks, tax-free corpus, 15-year schedule. | 15-year maturity timeline, contribution cap progress, yearly balance table. | Shows long lock-in growth and retirement-role fit. |
| EPF | Employee/employer contribution, salary growth, employer cap, VPF option, corpus, annual contribution schedule. | Employee/employer/growth stacked area and yearly schedule. | Makes retirement payroll savings visible and trackable. |
| NPS | Corpus, annuity split, lump sum, allocation, pension estimate, tax assumptions, annual contribution schedule. | Corpus split, annuity-income timeline, contribution table. | Connects NPS contributions to retirement income. |
| Gratuity | Eligibility, tenure, salary, statutory cap, employer type, scenario payout. | Vesting timeline and payout scenario bars. | Shows when the benefit becomes meaningful. |
| GST | Inclusive/exclusive mode, GST amount, CGST/SGST/IGST split, invoice total, invoice line table. | Tax split cards, invoice table, and invoice waterfall. | Useful for invoices rather than only percentage math. |
| TDS | Section/rate preset, threshold, exempt amount, deducted tax, net payment, section/rate table. | Section table and gross-to-net payment waterfall. | Helps users understand deduction at source and net receipt. |

### US Calculators

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| Mortgage Payment | Principal/interest, taxes, insurance, PMI, escrow, complete amortization schedule. | Payment waterfall, amortization table, equity line. | Shows full monthly housing cost, not just principal and interest. |
| Mortgage Affordability | Income, debts, DTI, down payment, taxes, insurance, PMI, reserves. | DTI gauges and max-price sensitivity. | Helps users understand a realistic home price range. |
| Mortgage Refinance | Old/new payment, closing costs, financed costs, break-even, lifetime savings, old/new amortization schedules. | Cumulative savings break-even and old/new amortization tables. | Shows when refinance pays off and when term reset hurts. |
| Amortization Schedule | Full payment-by-payment monthly schedule, yearly rollups, custom period view, remaining balance, cumulative interest, export-ready CSV data. | Monthly table, yearly summary, principal/interest chart, balance and interest lines. | Delivers the complete schedule promised by the route title. |
| Extra Mortgage Payment | Extra monthly/one-time payment, payoff date, interest saved, remaining term, accelerated payoff schedule. | Original vs accelerated balance, payoff table, payoff calendar. | Shows the time and interest impact of extra payments. |
| Rent vs Buy | Rent inflation, appreciation, maintenance, taxes, insurance, transaction costs, investment return, annual ownership/renting table. | Net worth crossover, annual comparison table, and monthly cost waterfall. | Turns a monthly comparison into a long-term housing decision. |
| Credit Card Payoff | Payoff months, interest, minimum-payment warning, extra payment, transfer comparison, payoff table. | Balance line, interest bars, payoff calendar/table. | Makes the cost of revolving debt visible. |
| Debt Snowball vs Avalanche | Multiple debts, strategy order, interest, payoff dates, first win, payment budget, month-by-month strategy schedules. | Strategy timeline and debt-by-debt payoff calendar/table. | Compares motivation and savings tradeoffs. |
| Auto Loan | Payment, taxes/fees, trade-in, down payment, depreciation, insurance, total cost, loan schedule. | Loan balance vs car value, amortization table, cost waterfall. | Shows total cost of ownership and negative equity risk. |
| Personal Loan | Payment, origination fee, APR, prepayment, consolidation comparison, payoff schedule. | Payment vs term, amortization table, total-interest curve. | Helps compare loan offers and consolidation choices. |
| Student Loan Payoff | Multiple loans, rate mix, refinance comparison, extra payments, payoff date, loan-by-loan schedule. | Payoff timeline, payoff table, interest-saved chart. | Helps create a realistic payoff plan. |
| 401(k) | Contributions, salary percentage, match, limits, Roth/traditional split, salary growth, annual contribution/match schedule. | Match waterfall, contribution table, and retirement account timeline. | Shows the value of employer match and contribution choices. |
| Roth vs Traditional IRA | Current/future tax rates, contribution limits, after-tax value, side-fund assumptions, tax comparison table. | After-tax comparison, tax table, and tax-rate sensitivity. | Helps choose contribution type with explicit tax assumptions. |
| Paycheck | Pay frequency, gross pay, pre-tax deductions, post-tax deductions, withholding, take-home, pay-period table. | Gross-to-net paycheck waterfall and per-period/annual table. | Connects paychecks to monthly cashflow tracking. |
| Income Tax US | Filing status, standard/itemized deduction, federal brackets, credits, state placeholder, bracket-by-bracket table. | Tax bracket waterfall, bracket table, and effective/marginal rate. | Gives a clearer estimate than a single effective-rate input. |
| Social Security Break-even | Claiming ages, benefit amounts, forgone benefits, COLA/tax notes, break-even age, yearly cumulative benefit table. | Cumulative benefit crossover and annual benefit table. | Helps compare claiming timing in retirement planning. |
| Required Minimum Distribution | Age/table divisor, prior-year balance, distribution, tax withholding, remaining balance, annual RMD schedule. | RMD timeline, distribution table, and remaining balance after distributions. | Helps retirees plan required withdrawals and taxes. |
| Down Payment | Home price, percent, closing costs, PMI threshold, time to save, savings schedule. | Progress to target, deposit schedule, and PMI threshold marker. | Turns down-payment math into a home goal. |
| PMI | LTV, PMI rate, monthly PMI, cancellation threshold, down-payment scenarios, cancellation schedule. | PMI by down-payment curve and cancellation timeline/table. | Shows how down payment affects mortgage insurance. |
| HELOC | Draw amount, draw/repayment period, variable rate, equity limit, repayment payment, draw/repayment schedule. | Drawdown/repayment timeline/table and rate sensitivity. | Shows payment shock and home-equity risk. |
| Balance Transfer | Current payoff, promo payoff, fee, promo duration, post-promo APR, payoff warning, transfer payoff table. | Current vs transfer cost, payoff table, and promo countdown. | Shows whether a transfer saves money before the promo ends. |
| CD | Deposit, APY, compounding, maturity, laddering, early withdrawal penalty, maturity/payout schedule. | CD ladder and maturity calendar/table. | Helps compare fixed savings choices. |
| HYSA | Starting savings, deposits, APY, variable-rate scenario, emergency fund link, deposit/growth schedule. | Savings balance line, deposit table, and contribution/growth split. | Helps turn high-yield savings into a tracked goal. |
| Life Insurance Needs | Income replacement, debts, education, dependents, existing coverage, gap, need component table. | Coverage gap waterfall, need table, and dependents timeline. | Makes insurance need tangible instead of a rule of thumb. |
| Lease vs Buy | Lease cost, financing, residual, fees, mileage, maintenance, resale, taxes, annual cost table. | Cumulative cost crossover, annual cost table, and ownership value line. | Helps compare vehicle options over the same horizon. |

## Planned Calculator Routes

The planned Phase 22 calculator routes must meet the same standard before they are marked complete. The detailed route list and visual requirements are in `docs/CALCULATOR_VALUE_ROADMAP.md`, and include:

- Mortgage payoff, biweekly mortgage payment, mortgage recast, mortgage points, 15 vs 30 year mortgage, ARM mortgage, interest-only loan, balloon loan.
- Closing costs, escrow, DTI, loan comparison, APR, home equity loan, FHA loan, VA loan, FHA vs conventional.
- India home-loan prepayment, foreclosure, balance transfer, flat vs reducing rate, loan eligibility, stamp duty and registration.

No new route should ship as a one-number page. Each one needs route-specific copy, input help, calculations, visual data, CTA mapping, tests, and sitemap/schema coverage.

## Implementation Sequence

1. Phase 21: growth, savings, goal, retirement, and return visualizers.
2. Phase 22: loan, debt, home, vehicle, amortization, and missing route buildout.
3. Phase 23: income, tax, budget, protection engines and visualizers.
4. Phase 24: route-specific content quality, sitemap/schema verification, no-auth smoke tests.
5. Phase 25: saved scenarios, recent history, dashboard follow-ups, export/share.

## Test Standard

Every calculator must eventually have:

- Unit tests for formulas and edge cases.
- Tests for generated timeline/table/chart data.
- Tests for invalid and zero inputs.
- Public route access tests without auth.
- Signed-out save CTA tests.
- Signed-in save workflow tests.
- Mobile and desktop smoke checks for no overflow.
- Content guard tests that reject user-facing internal strategy language.

The current checkpoint adds quality-contract tests for every calculator; the richer visual-data and save-flow tests are added in Phases 17 and 20-25.
