# Calculator High Standard Implementation Plan

Last updated: July 10, 2026

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
- Existing formula tests now also assert that every calculator has calculation, visual, scenario, validation, and conversion expectations.
- This is a Phase 20 foundation slice, not completion of the comprehensive studio work.

Completion estimate:

- Comprehensive calculator program: 12% complete.
- Remaining work: 88%.
- Why not higher: durable save flows, full studio charts, amortization schedules, statutory tax engines, missing loan routes, scenario drawers, exports, and personalization are still pending.

## Universal Definition Of Done

Each calculator is complete only when all items below are true:

1. Public route remains stable and usable without authentication.
2. H1, title, description, canonical, sitemap entry, FAQ, and structured data match visible user-helpful content.
3. Inputs show labels, units, helper text, min/max validation where useful, and monthly/annual timing.
4. Outputs include headline answer, supporting values, assumptions, and plain-language interpretation.
5. Formula engine is deterministic, typed, and tested independently from UI.
6. Timeline, split, tradeoff, or sensitivity calculations produce chart-ready data.
7. Calculator has at least one useful visualization; complex calculators get route-specific charts and tables.
8. Base/conservative/optimistic or relevant comparison scenarios are available.
9. Signed-out users can run the calculator and preserve a draft through sign-up.
10. Signed-in users can save the result to the correct destination: Goals, Accounts, Plans, or Transactions.
11. Tests cover formula output, invalid/empty states, visual data, CTA behavior, public access, and responsive layout.
12. Public copy never exposes internal traffic, ranking, or acquisition strategy.

## Shared Formula Modules To Build

These modules should power multiple calculators instead of duplicating formulas in each route:

| Module | Used by | Required capabilities |
| --- | --- | --- |
| Growth projection engine | compound, SIP, step-up SIP, SIP goal, FD, RD, PPF, EPF, NPS, 401(k), CD, HYSA, down payment, inflation | Future value, contribution timing, invested vs growth split, inflation-adjusted value, goal gap, monthly required, scenario grid. |
| Return analysis engine | investment return, CAGR, XIRR, ROI, Rule of 72 | Annualized return, true dated-cashflow XIRR, total return, payback period, benchmark comparison, inflation-adjusted return. |
| Loan amortization engine | EMI, mortgage, auto loan, personal loan, HELOC, amortization, home loan EMI, planned loan routes | Payment, monthly schedule, yearly rollups, principal/interest split, cumulative interest, remaining balance, prepayment, fees, export data. |
| Home decision engine | mortgage affordability, rent vs buy, PMI, down payment, lease vs buy, closing costs, escrow, FHA/VA planned routes | DTI, cash-to-close, taxes, insurance, PMI/MIP/funding fee, appreciation, maintenance, equity, break-even, net-worth crossover. |
| Debt payoff engine | debt payoff, credit card payoff, student loan payoff, snowball vs avalanche, balance transfer | Multiple debts, minimum payments, strategy ordering, promo APR, transfer fee, payoff calendar, interest saved, unsustainable-payment warnings. |
| Income and tax estimate engine | India tax, US tax, salary, paycheck, HRA, GST, TDS, capital gains, Roth vs Traditional, RMD | Gross-to-net waterfall, taxable base, deductions, bracket/slab logic, effective/marginal rate, assumptions, estimate disclaimers. |
| Retirement income engine | retirement, FIRE, SWP, Social Security break-even, RMD, NPS, EPF, PPF, 401(k), gratuity | Corpus need, contribution gap, withdrawal runway, benefit break-even, annuity split, distribution requirement, vesting, inflation. |
| Cashflow and protection engine | net worth, budget, emergency fund, life insurance needs | Assets/liabilities, surplus, savings rate, reserve target, runway, DIME-style insurance need, protection gap, dashboard follow-up. |

## Visual Standard

Every calculator gets at least one baseline visual read. Comprehensive completion requires the richer visual relevant to the decision:

| Decision type | Required comprehensive visuals |
| --- | --- |
| Growth, SIP, savings, deposits | Contribution vs growth area chart, milestone timeline, inflation-adjusted comparison, sensitivity grid. |
| Goal solving | Target runway, monthly required/catch-up slider, current-vs-needed progress. |
| Loans and EMI | Monthly amortization table, yearly rollup, principal/interest chart, remaining balance line, cumulative interest line. |
| Mortgage and home | Payment waterfall, affordability/DTI gauges, equity timeline, break-even chart, cash-to-close breakdown. |
| Debt payoff | Payoff calendar, balance timeline, snowball vs avalanche comparison, interest-saved bars, minimum-payment warning. |
| Income and tax | Gross-to-net waterfall, regime/status comparison, deduction sensitivity, effective/marginal rate display. |
| Retirement | Corpus timeline, gap/surplus chart, withdrawal runway, account/product split, claiming/distribution break-even. |
| Budget and protection | Cashflow waterfall, category bars, reserve runway, assets/liabilities bars, coverage gap waterfall. |
| Return analysis | Value path, benchmark comparison, cashflow timeline, payback chart, return sensitivity. |

## Current Calculator Contracts

The code-level contract in `src/lib/calculatorQuality.ts` applies to all current routes. The table below captures the specific comprehensive expectation for each route.

### Global Planning, Growth, And Return

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| Compound Interest | Future value, total contributions, growth, inflation-adjusted value, scenario sensitivity. | Contribution vs growth timeline and return/contribution grid. | Shows how time, deposits, and return assumptions create wealth. |
| Savings Goal | Future current savings, remaining target, monthly required, catch-up amount, deadline sensitivity. | Goal progress and target-date timeline. | Turns a target into an actionable monthly savings plan. |
| Net Worth | Asset categories, liability categories, net worth, allocation, trend when saved. | Assets vs liabilities bars, account mix, net worth trend. | Makes a simple subtraction useful by becoming an account setup workflow. |
| Budget | Income, expense categories, surplus, savings rate, recurring bills, category targets. | Cashflow waterfall or Sankey, category bars, surplus trend. | Helps users move from estimate to transaction tracking. |
| Emergency Fund | Core spending, target months, current reserve, gap, risk-based target. | Runway gauge, reserve ladder, current vs target progress. | Sizes a realistic safety buffer and creates a trackable goal. |
| Retirement | Projected savings, estimated corpus need, gap/surplus, contribution gap, inflation. | Retirement timeline, need vs projection, sensitivity heatmap. | Shows whether the current plan supports future income. |
| Debt Payoff | Payoff months, total interest, payoff date, extra payment sensitivity. | Balance decline, payoff calendar, interest-saved bars. | Converts debt math into a payoff plan. |
| Investment Return | CAGR, total return, inflation-adjusted return, benchmark comparison. | Value path, return bridge, benchmark bars. | Explains whether a result was good after time and inflation. |
| CAGR | Start/end value, elapsed years, annualized return, multi-investment compare. | CAGR comparison bars and value path. | Keeps the route but makes it useful beyond the one CAGR formula. |
| XIRR | Dated cashflows, true money-weighted return, convergence validation. | Cashflow timeline and cumulative invested vs value. | Handles irregular investing that simple CAGR cannot. |
| Inflation | Future cost, purchasing-power loss, income-growth comparison, goal adjustment. | Future cost curve and purchasing-power decline. | Shows how goals need to change as prices rise. |
| Rule of 72 | Rule estimate, exact doubling time, rate comparison. | Rate vs doubling-time curve. | Turns mental math into a gateway to richer compounding analysis. |
| ROI | Net gain, all-in cost, annualized ROI, payback period, scenario comparison. | ROI waterfall and payback timeline. | Helps compare projects after time and costs, not just gain divided by cost. |

### India Calculators

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| SIP | Corpus, total invested, gains, inflation-adjusted corpus, goal gap. | Invested vs gains area chart and contribution sensitivity. | Turns monthly investing into a goal plan. |
| Step-up SIP | Yearly step-up schedule, corpus, added value over flat SIP, affordability. | Step-up ladder and flat-vs-step-up comparison. | Shows whether increasing contributions with income meaningfully changes the outcome. |
| SIP Goal | Target corpus, current savings growth, required SIP, catch-up SIP, target inflation. | Goal gap chart and monthly SIP slider. | Solves what to invest monthly instead of only projecting an amount. |
| Lumpsum Mutual Fund | Future value, gains, downside/base/upside scenarios, tax placeholder. | Lumpsum vs SIP line and return sensitivity. | Helps compare one-time investing with recurring investing. |
| SWP | Withdrawal runway, ending balance, escalation, return stress, sequence-risk warning. | Corpus drawdown line and runway gauge. | Shows how long a corpus may support withdrawals. |
| EMI | Payment, total interest, total paid, amortization, prepayment effect. | EMI split, amortization table, prepayment savings. | Moves from monthly payment to lifetime loan cost. |
| Home Loan EMI | EMI, down payment, fees/stamp duty hooks, tax benefit assumptions, prepayment. | Total cost waterfall and amortization/equity line. | Helps evaluate affordability and long-term home-loan cost. |
| Car Loan EMI | EMI, down payment, total ownership cost, insurance, depreciation, resale. | Monthly cost waterfall and loan balance vs vehicle value. | Shows affordability beyond the loan payment. |
| Personal Loan EMI | EMI, origination/fees, consolidation comparison, prepayment savings. | Payment/term curve and interest-saved chart. | Helps compare personal borrowing options and payoff plans. |
| Income Tax India | Old/new regime slabs, deductions, cess, surcharge assumptions, net income. | Regime bars and gross-to-net waterfall. | Lets users compare regimes with visible assumptions. |
| Salary India | CTC components, PF, professional tax, variable pay, estimated tax, monthly take-home. | CTC-to-take-home waterfall and fixed/variable split. | Converts CTC into monthly cashflow expectations. |
| HRA Exemption | HRA received, rent minus 10% salary, metro/non-metro cap, taxable HRA. | Exemption component bars and taxable HRA waterfall. | Explains which part of the HRA formula limits the exemption. |
| FD | Maturity, interest, payout frequency, tax/TDS estimate, laddering. | Interest vs principal and maturity ladder. | Helps decide maturity timing and reinvestment strategy. |
| RD | Deposit schedule, maturity, interest, missed-payment impact, tax/TDS estimate. | Deposit vs interest area and monthly schedule. | Makes recurring deposits easier to plan and track. |
| PPF | Annual contribution, cap progress, maturity, extension blocks, tax-free corpus. | 15-year maturity timeline and contribution cap progress. | Shows long lock-in growth and retirement-role fit. |
| EPF | Employee/employer contribution, salary growth, employer cap, VPF option, corpus. | Employee/employer/growth stacked area. | Makes retirement payroll savings visible and trackable. |
| NPS | Corpus, annuity split, lump sum, allocation, pension estimate, tax assumptions. | Corpus split and annuity-income timeline. | Connects NPS contributions to retirement income. |
| Gratuity | Eligibility, tenure, salary, statutory cap, employer type, scenario payout. | Vesting timeline and payout scenario bars. | Shows when the benefit becomes meaningful. |
| GST | Inclusive/exclusive mode, GST amount, CGST/SGST/IGST split, invoice total. | Tax split cards and invoice waterfall. | Useful for invoices rather than only percentage math. |
| TDS | Section/rate preset, threshold, exempt amount, deducted tax, net payment. | Gross-to-net payment waterfall. | Helps users understand deduction at source and net receipt. |

### US Calculators

| Calculator | Must calculate | Must visualize | User value |
| --- | --- | --- | --- |
| Mortgage Payment | Principal/interest, taxes, insurance, PMI, escrow, amortization. | Payment waterfall, amortization, equity line. | Shows full monthly housing cost, not just principal and interest. |
| Mortgage Affordability | Income, debts, DTI, down payment, taxes, insurance, PMI, reserves. | DTI gauges and max-price sensitivity. | Helps users understand a realistic home price range. |
| Mortgage Refinance | Old/new payment, closing costs, financed costs, break-even, lifetime savings. | Cumulative savings break-even and old/new amortization. | Shows when refinance pays off and when term reset hurts. |
| Amortization Schedule | Full monthly schedule, yearly rollups, custom period, remaining balance, cumulative interest. | Monthly table, yearly summary, principal/interest chart, balance and interest lines. | Delivers the schedule promised by the route title. |
| Extra Mortgage Payment | Extra monthly/one-time payment, payoff date, interest saved, remaining term. | Original vs accelerated balance and payoff calendar. | Shows the time and interest impact of extra payments. |
| Rent vs Buy | Rent inflation, appreciation, maintenance, taxes, insurance, transaction costs, investment return. | Net worth crossover and monthly cost waterfall. | Turns a monthly comparison into a long-term housing decision. |
| Credit Card Payoff | Payoff months, interest, minimum-payment warning, extra payment, transfer comparison. | Balance line, interest bars, payoff calendar. | Makes the cost of revolving debt visible. |
| Debt Snowball vs Avalanche | Multiple debts, strategy order, interest, payoff dates, first win, payment budget. | Strategy timeline and debt-by-debt payoff calendar. | Compares motivation and savings tradeoffs. |
| Auto Loan | Payment, taxes/fees, trade-in, down payment, depreciation, insurance, total cost. | Loan balance vs car value and cost waterfall. | Shows total cost of ownership and negative equity risk. |
| Personal Loan | Payment, origination fee, APR, prepayment, consolidation comparison. | Payment vs term and total-interest curve. | Helps compare loan offers and consolidation choices. |
| Student Loan Payoff | Multiple loans, rate mix, refinance comparison, extra payments, payoff date. | Payoff timeline and interest-saved chart. | Helps create a realistic payoff plan. |
| 401(k) | Contributions, salary percentage, match, limits, Roth/traditional split, salary growth. | Match waterfall and retirement account timeline. | Shows the value of employer match and contribution choices. |
| Roth vs Traditional IRA | Current/future tax rates, contribution limits, after-tax value, side-fund assumptions. | After-tax comparison and tax-rate sensitivity. | Helps choose contribution type with explicit tax assumptions. |
| Paycheck | Pay frequency, gross pay, pre-tax deductions, post-tax deductions, withholding, take-home. | Gross-to-net paycheck waterfall and per-period/annual toggle. | Connects paychecks to monthly cashflow tracking. |
| Income Tax US | Filing status, standard/itemized deduction, federal brackets, credits, state placeholder. | Tax bracket waterfall and effective/marginal rate. | Gives a clearer estimate than a single effective-rate input. |
| Social Security Break-even | Claiming ages, benefit amounts, forgone benefits, COLA/tax notes, break-even age. | Cumulative benefit crossover. | Helps compare claiming timing in retirement planning. |
| Required Minimum Distribution | Age/table divisor, prior-year balance, distribution, tax withholding, remaining balance. | RMD timeline and remaining balance after distributions. | Helps retirees plan required withdrawals and taxes. |
| Down Payment | Home price, percent, closing costs, PMI threshold, time to save. | Progress to target and PMI threshold marker. | Turns down-payment math into a home goal. |
| PMI | LTV, PMI rate, monthly PMI, cancellation threshold, down-payment scenarios. | PMI by down-payment curve and cancellation timeline. | Shows how down payment affects mortgage insurance. |
| HELOC | Draw amount, draw/repayment period, variable rate, equity limit, repayment payment. | Drawdown/repayment timeline and rate sensitivity. | Shows payment shock and home-equity risk. |
| Balance Transfer | Current payoff, promo payoff, fee, promo duration, post-promo APR, payoff warning. | Current vs transfer cost and promo countdown. | Shows whether a transfer saves money before the promo ends. |
| CD | Deposit, APY, compounding, maturity, laddering, early withdrawal penalty. | CD ladder and maturity calendar. | Helps compare fixed savings choices. |
| HYSA | Starting savings, deposits, APY, variable-rate scenario, emergency fund link. | Savings balance line and contribution/growth split. | Helps turn high-yield savings into a tracked goal. |
| Life Insurance Needs | Income replacement, debts, education, dependents, existing coverage, gap. | Coverage gap waterfall and dependents timeline. | Makes insurance need tangible instead of a rule of thumb. |
| Lease vs Buy | Lease cost, financing, residual, fees, mileage, maintenance, resale, taxes. | Cumulative cost crossover and ownership value line. | Helps compare vehicle options over the same horizon. |

## Planned Calculator Routes

The planned Phase 22 calculator routes must meet the same standard before they are marked complete. The detailed route list and visual requirements are in `docs/CALCULATOR_VALUE_ROADMAP.md`, and include:

- Mortgage payoff, biweekly mortgage payment, mortgage recast, mortgage points, 15 vs 30 year mortgage, ARM mortgage, interest-only loan, balloon loan.
- Closing costs, escrow, DTI, loan comparison, APR, home equity loan, FHA loan, VA loan, FHA vs conventional.
- India home-loan prepayment, foreclosure, balance transfer, flat vs reducing rate, loan eligibility, stamp duty and registration.

No new route should ship as a one-number page. Each one needs route-specific copy, input help, calculations, visual data, CTA mapping, tests, and sitemap/schema coverage.

## Implementation Sequence

1. Phase 17: durable calculator save flows and signed-out draft preservation.
2. Phase 20: finish decision-studio metadata, shared scenario state, chart primitives, related links, and content guard tests.
3. Phase 21: growth, savings, goal, retirement, and return visualizers.
4. Phase 22: loan, debt, home, vehicle, amortization, and missing route buildout.
5. Phase 23: income, tax, budget, protection engines and visualizers.
6. Phase 24: route-specific content quality, sitemap/schema verification, no-auth smoke tests.
7. Phase 25: saved scenarios, recent history, dashboard follow-ups, export/share.

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
