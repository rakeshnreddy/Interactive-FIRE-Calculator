# Calculator Value and Visualization Roadmap

Last updated: July 7, 2026

## Goal

The public calculator library should keep every stable calculator route for discovery, but the product experience should feel like decision support rather than a collection of basic formulas. The user should leave with one or more of these outcomes:

- A clear answer they could not get from a four-function calculator alone.
- A visual understanding of tradeoffs, timelines, and sensitivity.
- A saved next step inside FinPath: goal, account, liability, plan, cashflow workflow, or tax note.
- A reason to compare adjacent calculators instead of bouncing after one result.

## Search Preservation Principles

Search value should be preserved without exposing search strategy to users.

- Keep existing public routes and exact H1s for all calculators.
- Do not collapse multiple URLs into one public URL. Combine code and UI internally while each route remains a complete, useful page.
- Give each route unique intro copy, examples, assumptions, FAQs, related calculators, and route-specific defaults.
- Keep self-canonical URLs, sitemap entries, and internal links consistent for every route.
- Use shared JSON-LD infrastructure, but ensure structured data reflects visible page content.
- Follow people-first content guidance: the page exists to help the user make a decision, not to show that it was built for ranking.

Reference guidance:

- Google Search Central: creating helpful, reliable, people-first content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Central: canonical URLs and duplicate or similar pages: https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls
- Google Search Central: structured data overview and JSON-LD guidance: https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data

## Shared Decision Studios

Keep all calculator routes, but route them into shared richer experiences with route-specific presets.

| Studio | Routes served | Shared value layer |
| --- | --- | --- |
| Growth and Goal Studio | `compound-interest`, `savings-goal`, `sip`, `step-up-sip`, `sip-goal`, `lumpsum-mutual-fund`, `fd`, `rd`, `ppf`, `epf`, `nps`, `401k`, `cd`, `hysa`, `inflation`, `down-payment` | Time-series projection, contribution vs growth split, goal date, monthly required, inflation-adjusted value, scenario comparison, save as goal/account. |
| Return Analysis Studio | `investment-return`, `cagr`, `xirr`, `roi`, `rule-of-72` | Annualized return, cashflow-aware return, benchmark comparison, payback period, inflation-adjusted return, performance timeline. |
| Loan and Home Studio | `emi`, `home-loan-emi`, `car-loan-emi`, `personal-loan-emi`, `mortgage`, `mortgage-affordability`, `mortgage-refinance`, `amortization`, `extra-mortgage-payment`, `auto-loan`, `personal-loan`, `heloc`, `pmi`, `rent-vs-buy`, `lease-vs-buy` | Amortization schedule, principal/interest split, affordability, prepayment effect, break-even, total cost of ownership, save liability account and payoff plan. |
| Debt Payoff Studio | `debt-payoff`, `credit-card-payoff`, `debt-snowball-avalanche`, `student-loan-payoff`, `balance-transfer`, `extra-mortgage-payment` | Multiple debt entry, snowball vs avalanche, payoff calendar, interest saved, balance transfer promo duration, minimum-payment warning, save payoff plan. |
| Income and Tax Studio | `income-tax-india`, `salary-india`, `hra-exemption`, `paycheck`, `income-tax-us`, `capital-gains-tax`, `gst`, `tds`, `roth-vs-traditional-ira`, `rmd` | Waterfall from gross to net, regime/status comparison, deduction impact, tax-rate sensitivity, taxable vs tax-free income, save tax plan or monthly cashflow. |
| Retirement Income Studio | `retirement`, `swp`, `social-security-break-even`, `rmd`, `nps`, `401k`, `epf`, `ppf`, `/calculators/fire` | Retirement timeline, corpus need, contribution gap, withdrawal runway, claiming break-even, account mix, save retirement plan. |
| Cashflow and Balance Sheet Studio | `net-worth`, `budget`, `emergency-fund`, `life-insurance-needs` | Balance sheet, monthly cashflow, runway, protection gap, transaction/account imports, saved dashboard cards. |

## Phase Roadmap

### Phase 17: Calculator-to-Account Conversion Layer

This remains the immediate remaining product phase.

- Add a durable calculator result model in D1 or a thin mapping layer into existing goals/accounts/plans.
- Preserve signed-out calculator inputs/results through sign-up.
- For signed-in users, save calculator outputs as:
  - Goals for wealth, savings, down payment, emergency fund, insurance, investing.
  - Accounts or liabilities for loans, mortgages, EMI, credit, EPF/PPF/NPS/FD/CD/HYSA.
  - Plans for FIRE, retirement, tax, payoff, refinance, rent-vs-buy, SWP.
  - Transaction workflows for budget, salary, paycheck, cashflow.
- Add dashboard cards for saved calculator-derived goals/plans/accounts.
- Add tests for signed-out draft preservation and signed-in save flows.

### Phase 20: Decision Studio Foundation

- Introduce shared calculator family metadata while keeping every public route.
- Add scenario state: base, conservative, optimistic.
- Add reusable chart components for time-series, waterfall, amortization, and comparison views.
- Add route-specific example scenarios and assumptions.
- Add related-calculator crosslinks based on studio family.
- Add route-level content guard tests so internal strategy language never appears in public copy.

### Phase 21: Growth, Goal, and Retirement Visualizers

- Upgrade growth calculators with contribution vs growth charts, inflation-adjusted value, milestone dates, and scenario comparison.
- Upgrade goal calculators with monthly required, catch-up amount, target-date slider, and feasibility label.
- Upgrade retirement/SWP/NPS/401(k)/EPF/PPF routes with corpus timeline, contribution gap, withdrawal runway, and account-mix visualization.
- Add save-to-goal and save-to-plan flows from Phase 17 to these calculators first.

### Phase 22: Loan, Debt, Home, and Vehicle Visualizers

- Upgrade all loan/EMI/mortgage routes with amortization schedule, principal vs interest chart, payoff calendar, and prepayment sensitivity.
- Upgrade refinance, balance transfer, rent-vs-buy, lease-vs-buy, PMI, and affordability calculators with break-even charts.
- Replace weighted debt-only snowball/avalanche with a true multi-debt table.
- Add save liability and payoff-plan flows for borrowing calculators.

### Phase 23: Income, Tax, Budget, and Protection Deepening

- Upgrade budget, paycheck, salary, and tax calculators with waterfall views and monthly cashflow mapping.
- Add India tax old/new regime slab logic and assumptions.
- Add US tax/paycheck filing status, pay frequency, deductions, and state placeholder architecture.
- Add HRA, GST, TDS, capital gains, Roth/traditional, and RMD calculators as estimate tools with clear assumptions and saved tax-plan notes.
- Upgrade life insurance and emergency fund calculators with protection gap, runway, and priority recommendations.

### Phase 24: Search Preservation and Content Quality Hardening

- Keep all existing public calculator routes live.
- Add route-specific examples, assumptions, FAQs, and internal links.
- Ensure canonical, title, description, sitemap, and structured data are stable for every route.
- Add content tests for duplicate-looking route copy.
- Add no-auth smoke tests for all public calculators.
- Use Search Console data later to tune internal links and examples without changing stable URLs.

### Phase 25: Engagement and Personalization Loop

- Add side-by-side comparison drawers so users can save multiple scenarios.
- Add "what changed the outcome most" explanations.
- Add recent calculator history for signed-in users.
- Add dashboard follow-up cards: "your EMI plan needs a liability account", "your SIP goal is behind by X", "your emergency fund target changed after spending updates".
- Add export/share for schedules and scenario summaries.

## Per-Calculator Value Audit

| Calculator | Current usefulness | Risk of feeling basic | Upgrade for real value | Combine through | Visualization ideas |
| --- | --- | --- | --- | --- | --- |
| Compound Interest | Shows future value from starting amount, monthly contribution, term, and return. | Medium: formula is common, but monthly compounding is not always intuitive. | Add scenario comparison, contribution vs growth split, inflation-adjusted value, and milestone dates. | Growth and Goal Studio | Stacked area for contributions vs growth, sensitivity grid by return and monthly contribution. |
| Savings Goal | Computes monthly savings needed for a target. | Medium: simple if user knows annuity math, but useful for planning. | Add deadline slider, catch-up options, confidence label, target inflation, and save-as-goal flow. | Growth and Goal Studio | Goal runway bar, calendar milestone, monthly contribution scenarios. |
| Net Worth | Assets minus liabilities. | High: basic subtraction. | Turn into a balance-sheet builder with account categories, asset allocation, liability mix, trend, and save/add accounts. | Cashflow and Balance Sheet Studio | Assets/liabilities stacked bars, net worth trend, account mix donut. |
| Budget | Income minus expenses and savings rate. | High: basic subtraction. | Add category allocation, recommended targets, transaction import handoff, recurring bills, and savings rate trend. | Cashflow and Balance Sheet Studio | Sankey cashflow, category bars, monthly surplus trend. |
| Emergency Fund | Expenses times months of coverage. | High: simple multiplication. | Add risk profile, income stability, dependents, insurance, liquidity tiers, and progress tracking. | Cashflow and Balance Sheet Studio | Runway gauge, reserve ladder, target vs current progress. |
| Retirement | Compares projected savings against estimated need. | Medium: useful but still one path. | Add phases, inflation, account mix, contribution gap, FIRE link, and scenario comparison. | Retirement Income Studio | Retirement timeline, corpus need vs projected savings, sensitivity heatmap. |
| Debt Payoff | Estimates payoff time and interest. | Medium: useful, but one debt only. | Add extra payment suggestions, multiple debts, payoff date, and save payoff plan. | Debt Payoff Studio | Payoff balance line, interest saved bars, payoff calendar. |
| Investment Return | Annualizes starting and ending values. | High: CAGR formula only. | Add cashflow-aware option, benchmark comparison, inflation-adjusted return, and performance notes. | Return Analysis Studio | Return bridge, benchmark comparison line. |
| SIP | Projects monthly investing corpus. | Medium: valuable for India users, but common. | Add step-up option inline, target mapping, shortfall, inflation-adjusted corpus, and goal save. | Growth and Goal Studio | Corpus line, invested vs gains area, contribution sensitivity. |
| Step-up SIP | Projects SIP with annual increase. | Low-medium: harder than basic SIP. | Add salary-growth tie-in, maximum affordable step-up, yearly contribution schedule, and target date. | Growth and Goal Studio | Step-up ladder, corpus comparison vs flat SIP. |
| SIP Goal | Solves monthly SIP needed for a target. | Medium: similar to savings goal. | Add target inflation, current investment growth, catch-up SIP, and goal save. | Growth and Goal Studio | Goal gap chart, monthly SIP slider, achievement timeline. |
| Lumpsum Mutual Fund | Projects one-time investment growth. | Medium: simple FV formula. | Compare lumpsum vs SIP/STP, inflation-adjusted value, tax assumptions, and downside scenario. | Growth and Goal Studio | Lumpsum vs SIP line, returns sensitivity table. |
| SWP | Estimates withdrawal runway. | Low-medium: drawdown math is less obvious. | Add withdrawal escalation, return stress, sequence risk warning, and retirement income plan save. | Retirement Income Studio | Corpus drawdown line, runway gauge, withdrawal stress chart. |
| EMI | Calculates loan payment. | Medium: common, but amortization is valuable. | Add amortization schedule, total interest, prepayment options, affordability, and liability save. | Loan and Home Studio | Principal/interest split, amortization table, prepayment savings. |
| Home Loan EMI | Calculates Indian home loan payment. | Medium: common. | Add down payment, stamp duty/fees, tax benefit assumptions, prepayment, and affordability. | Loan and Home Studio | Loan amortization, total cost waterfall, prepayment comparison. |
| Car Loan EMI | Calculates Indian car loan payment. | Medium: common. | Add total ownership cost, down payment, resale/depreciation, insurance, and affordability. | Loan and Home Studio | Monthly cost waterfall, loan balance vs car value. |
| Personal Loan EMI | Calculates personal loan payment. | Medium: common. | Add debt consolidation comparison, prepayment, affordability ratio, and payoff plan. | Loan and Home Studio | Interest saved chart, payoff timeline. |
| Income Tax India | Uses an effective rate estimate. | High: current version is too generic for the title. | Add old vs new regime slabs, deduction inputs, cess/surcharge assumptions, and saved tax plan. | Income and Tax Studio | Regime comparison bars, gross-to-net waterfall. |
| Salary India | Estimates take-home from CTC and effective deduction rate. | High: too simplified. | Add CTC component builder, PF, professional tax, bonus, variable pay, and monthly cashflow save. | Income and Tax Studio | CTC-to-take-home waterfall, monthly net trend. |
| HRA Exemption | Applies common HRA formula. | Medium: useful but formulaic. | Add metro toggle, monthly rent, regime impact, rent receipts checklist, and tax note save. | Income and Tax Studio | Exemption components bar, taxable HRA waterfall. |
| FD | Projects fixed deposit maturity. | Medium: simple compounding. | Add payout frequency, tax/TDS estimate, laddering, reinvestment, and account save. | Growth and Goal Studio | Maturity ladder, interest vs principal, tax impact. |
| RD | Projects recurring deposit maturity. | Medium: similar to SIP. | Add deposit schedule, missed payment impact, tax/TDS estimate, and goal/account save. | Growth and Goal Studio | Deposit vs interest area, monthly schedule. |
| PPF | Projects annual PPF contributions. | Low-medium: product rules matter. | Add contribution timing, 15-year lock-in, extension blocks, tax-free status, and retirement account save. | Retirement Income Studio | PPF maturity timeline, contribution cap progress. |
| EPF | Projects employee and employer contributions. | Low-medium: employer rules add value. | Add salary growth, statutory rates, employer cap, VPF option, and retirement account save. | Retirement Income Studio | Employee/employer/growth stacked area. |
| NPS | Projects NPS corpus and annuity split. | Low-medium: product details matter. | Add equity/debt allocation, annuity rate estimate, tax limits, retirement pension estimate. | Retirement Income Studio | Corpus split, annuity vs lump sum, retirement income timeline. |
| Gratuity | Estimates gratuity from salary and tenure. | Medium: formula is specific. | Add eligibility, statutory cap, employer type, tenure scenarios, and retirement plan item. | Retirement Income Studio | Vesting timeline, payout scenario bars. |
| Mortgage Payment | Calculates US mortgage payment. | Medium: common. | Add taxes, insurance, PMI, escrow, down payment, and amortization. | Loan and Home Studio | Payment breakdown, amortization, home equity line. |
| Mortgage Affordability | Currently behaves like a loan target. | High: should be more than payment math. | Add income, debts, down payment, DTI, property tax, insurance, and cash reserve checks. | Loan and Home Studio | Affordability gauge, max price sensitivity. |
| Mortgage Refinance | Compares old and new monthly payment. | Medium: useful but incomplete. | Add break-even, total lifetime savings, closing-cost finance option, and term reset warning. | Loan and Home Studio | Break-even chart, cumulative savings line. |
| Amortization Schedule | Calculates payment only today. | High: title promises schedule. | Add full month-by-month schedule, export, principal/interest split, and balance timeline. | Loan and Home Studio | Amortization table, stacked principal/interest chart. |
| Extra Mortgage Payment | Estimates payoff with extra payment. | Medium: valuable when visualized. | Add one-time vs monthly extra, payoff date saved, and interest saved. | Loan and Home Studio and Debt Payoff Studio | Payoff acceleration chart, interest saved bars. |
| Rent vs Buy | Simplified monthly comparison. | High: needs richer assumptions. | Add appreciation, rent inflation, maintenance, taxes, insurance, transaction costs, investment return, and break-even. | Loan and Home Studio | Net worth over time, break-even crossover. |
| Credit Card Payoff | Estimates payoff and interest. | Medium: useful but common. | Add minimum-payment warning, extra-payment options, balance transfer comparison, and payoff plan. | Debt Payoff Studio | Balance decline line, interest paid bars. |
| Debt Snowball vs Avalanche | Uses one weighted APR today. | High: true feature needs multiple debts. | Add multi-debt table, strategy comparison, motivation metrics, and calendar. | Debt Payoff Studio | Strategy comparison timeline, interest saved by strategy. |
| Auto Loan | Calculates payment. | Medium: common. | Add taxes/fees, down payment, trade-in, depreciation, insurance, and total cost. | Loan and Home Studio | Loan balance vs car value, cost waterfall. |
| Personal Loan | Calculates payment. | Medium: common. | Add origination fee, prepayment, consolidation comparison, and debt ratio. | Loan and Home Studio | Monthly payment vs term, total interest curve. |
| Student Loan Payoff | Estimates payoff with payment. | Medium: valuable but needs context. | Add multiple loans, refinance comparison, federal/private assumptions, and payoff plan. | Debt Payoff Studio | Payoff timeline, interest saved by extra payment. |
| 401(k) | Projects retirement account growth. | Medium: common but high intent. | Add salary percentage, employer match, contribution limits, Roth/traditional split, salary growth. | Growth and Retirement Studios | Match waterfall, retirement account growth timeline. |
| Roth vs Traditional IRA | Currently uses effective tax spread. | High: too simplified. | Add current/future tax rates, contribution limits, taxable investing comparison, RMD note. | Income and Tax Studio and Retirement Income Studio | After-tax value comparison, tax-rate sensitivity. |
| Paycheck | Estimates annual take-home by effective rate. | High: users expect paycheck detail. | Add pay frequency, pre-tax deductions, filing status, state placeholder, and monthly cashflow save. | Income and Tax Studio | Gross-to-net waterfall, per-period breakdown. |
| Income Tax US | Uses an effective rate estimate. | High: generic. | Add filing status, bracket logic, standard/itemized deduction, credits, and state placeholder. | Income and Tax Studio | Bracket waterfall, effective vs marginal rate. |
| Social Security Break-even | Compares early vs full benefit. | Low-medium: break-even is useful. | Add claiming ages, COLA, spouse/survivor note, and retirement plan save. | Retirement Income Studio | Cumulative benefit crossover. |
| Required Minimum Distribution | Divides balance by divisor. | Medium: simple but rule-specific. | Add age/table selector, multi-account total, tax withholding estimate, and withdrawal plan. | Income and Tax Studio and Retirement Income Studio | RMD timeline, remaining balance after distributions. |
| CAGR | Annualizes start/end values. | High: duplicate of investment return. | Keep route, but add multi-investment compare, inflation-adjusted CAGR, and benchmark. | Return Analysis Studio | CAGR comparison bars, value path line. |
| XIRR | Currently approximate without dated cashflows. | High until actual cashflows exist. | Add dated cashflow table/import, irregular investments, validation, and saved return record. | Return Analysis Studio | Cashflow timeline, cumulative invested vs value. |
| Inflation | Projects future cost. | Medium: common but useful. | Add purchasing-power view, goal adjustment, income growth comparison, and save as future goal. | Growth and Goal Studio | Future cost curve, purchasing power decline. |
| Rule of 72 | Estimates years to double. | High: mental math. | Keep educational route, add compare rates, exact doubling calculation, and path to compound calculator. | Return Analysis Studio | Rate vs doubling-time curve. |
| Capital Gains Tax | Applies tax rate to gain. | High: too simplified. | Add basis, holding period, losses, exemption assumptions, and tax-plan note. | Income and Tax Studio | Gain-to-net waterfall, rate sensitivity. |
| GST | Adds GST to pre-tax amount. | High: simple percentage. | Add inclusive/exclusive mode, CGST/SGST/IGST split, invoice-style output, and tax note. | Income and Tax Studio | Tax split cards, invoice waterfall. |
| TDS | Applies rate to payment amount. | High: simple percentage. | Add section/rate presets, thresholds, PAN/non-PAN note, and net payment view. | Income and Tax Studio | Gross-to-net payment waterfall. |
| Down Payment | Calculates percent of home price. | High: simple multiplication. | Add savings timeline, closing costs, PMI threshold, and home goal save. | Growth and Goal Studio and Loan and Home Studio | Down payment progress, time-to-target chart. |
| PMI | Estimates monthly PMI. | Medium: useful when tied to LTV. | Add LTV, cancellation point, down-payment scenarios, and mortgage integration. | Loan and Home Studio | PMI vs down payment curve, cancellation timeline. |
| HELOC | Calculates repayment payment. | Medium: common loan math. | Add draw period, repayment period, variable rate scenarios, and home equity limit. | Loan and Home Studio | Drawdown/repayment timeline, rate sensitivity. |
| Balance Transfer | Compares payoff cost with promo APR and fee. | Low-medium: value improves with promo duration. | Add promo duration, post-promo APR, minimum payment, approval limit, and strategy warning. | Debt Payoff Studio | Break-even/payoff timeline, cost comparison bars. |
| CD | Projects deposit maturity. | Medium: simple compounding. | Add compounding frequency, laddering, early withdrawal penalty, and account save. | Growth and Goal Studio | CD ladder, maturity calendar. |
| HYSA | Projects savings growth with deposits. | Medium: useful with goals. | Add variable rate scenario, monthly deposit plan, emergency fund link, and goal save. | Growth and Goal Studio | Savings balance line, contribution/growth split. |
| Life Insurance Needs | Estimates coverage gap. | Medium: less basic than percentage calculators. | Add DIME method, dependents, education costs, existing policies, and protection goal. | Cashflow and Balance Sheet Studio | Coverage gap waterfall, dependents timeline. |
| Lease vs Buy | Simplified lease vs financing comparison. | High: needs vehicle-specific assumptions. | Add residual value, mileage, fees, taxes, maintenance, resale, and break-even. | Loan and Home Studio | Cumulative cost crossover, ownership value line. |
| ROI | Net gain divided by cost. | High: basic division. | Add time period, all-in cost, payback period, annualized ROI, and scenario comparison. | Return Analysis Studio | ROI waterfall, payback timeline. |

## Implementation Notes

- The first implementation slice should not rewrite every calculator at once. Start with shared metadata and one studio family.
- Phase 17 save flows should be designed once and reused by all studios.
- The Growth and Goal Studio plus Loan and Debt Studio should be first because they have the strongest conversion fit to goals, accounts, plans, and dashboard cards.
- Tax calculators should stay clearly labeled as estimates until statutory engines are robust and tested.
- `src/lib/fire.ts` should remain unchanged unless FIRE behavior is explicitly in scope.
