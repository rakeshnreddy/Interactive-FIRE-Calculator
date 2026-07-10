# Calculator Value and Visualization Roadmap

Last updated: July 10, 2026

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
- Loan and mortgage feature benchmarks: Bankrate amortization and refinance calculators, NerdWallet mortgage/affordability/refinance calculators, Calculator.net amortization/refinance calculators, and major lender extra-payment calculators.

## Comprehensive Calculator Standard

Every calculator should eventually meet this standard before being called fully implemented:

- Keep the public route usable without auth and preserve the route's search-intent H1.
- Provide a primary answer, supporting numbers, assumptions, and route-specific examples.
- Show at least one visual representation whenever the calculation has a timeline, split, tradeoff, or sensitivity.
- Offer scenario comparison where a user naturally asks "what if": base, conservative, optimistic, or custom scenario.
- Include an explanation of what changed the result most.
- Connect the result to a signed-in next step through Phase 17 save flows.
- Include tests for formula outputs, invalid inputs, generated visualization data, and signed-out/signed-in CTA behavior.
- Avoid "thin duplicate" pages: routes can share engines, but route copy, defaults, examples, FAQs, and related links must match the user's actual intent.

Visual patterns by calculator type:

| Calculator type | Required visual aids |
| --- | --- |
| Amortizing loans and EMI | Monthly schedule, yearly summary, principal/interest split, remaining balance line, cumulative interest, extra-payment comparison. |
| Mortgage/home decisions | Payment waterfall, amortization/equity timeline, break-even chart, affordability/DTI gauge, closing-cost or PMI impact. |
| Debt payoff | Balance timeline, payoff calendar, interest-saved comparison, snowball vs avalanche side-by-side, minimum-payment warning. |
| Growth and savings | Contributions vs growth area chart, milestone timeline, inflation-adjusted value, scenario comparison, sensitivity grid. |
| Retirement income | Corpus timeline, withdrawal runway, gap/surplus chart, account mix, claiming or distribution break-even. |
| Tax/income | Gross-to-net waterfall, regime/status comparison bars, deduction sensitivity, effective vs marginal rate where applicable. |
| Budget/cashflow | Cashflow waterfall or Sankey, category bars, savings-rate trend, emergency runway. |
| Insurance/protection | Coverage gap waterfall, dependents timeline, existing coverage vs need. |

## High Standard Contract

The detailed per-calculator implementation standard now lives in `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md`.

Current checkpoint:

- `src/lib/calculatorQuality.ts` defines calculation, visual, scenario, validation, interpretation, and conversion expectations for every current public calculator route.
- `src/lib/seoCalculators.test.ts` asserts that every current route has a comprehensive quality contract.
- Calculator detail pages now show why the calculator matters, a baseline visual read of the result metrics, and decision checks.
- Phase 17 adds durable signed-in calculator result saves, signed-out draft preservation, downstream goal/account/plan draft creation where safe, transaction-workflow result storage, Dashboard saved-result cards, and account-data export/delete coverage.
- This raises the comprehensive calculator program to 20% complete. It does not complete the deeper studio work; 80% remains for full chart data, amortization schedules, statutory tax engines, missing routes, scenario drawers, exports, and personalization.

## Shared Decision Studios

Keep all calculator routes, but route them into shared richer experiences with route-specific presets.

| Studio | Routes served | Shared value layer |
| --- | --- | --- |
| Growth and Goal Studio | `compound-interest`, `savings-goal`, `sip`, `step-up-sip`, `sip-goal`, `lumpsum-mutual-fund`, `fd`, `rd`, `ppf`, `epf`, `nps`, `401k`, `cd`, `hysa`, `inflation`, `down-payment` | Time-series projection, contribution vs growth split, goal date, monthly required, inflation-adjusted value, scenario comparison, save as goal/account. |
| Return Analysis Studio | `investment-return`, `cagr`, `xirr`, `roi`, `rule-of-72` | Annualized return, cashflow-aware return, benchmark comparison, payback period, inflation-adjusted return, performance timeline. |
| Loan and Home Studio | `emi`, `home-loan-emi`, `car-loan-emi`, `personal-loan-emi`, `mortgage`, `mortgage-affordability`, `mortgage-refinance`, `amortization`, `extra-mortgage-payment`, `auto-loan`, `personal-loan`, `heloc`, `pmi`, `rent-vs-buy`, `lease-vs-buy`, plus planned routes listed below | Amortization schedule, principal/interest split, affordability, prepayment effect, break-even, total cost of ownership, save liability account and payoff plan. |
| Debt Payoff Studio | `debt-payoff`, `credit-card-payoff`, `debt-snowball-avalanche`, `student-loan-payoff`, `balance-transfer`, `extra-mortgage-payment` | Multiple debt entry, snowball vs avalanche, payoff calendar, interest saved, balance transfer promo duration, minimum-payment warning, save payoff plan. |
| Income and Tax Studio | `income-tax-india`, `salary-india`, `hra-exemption`, `paycheck`, `income-tax-us`, `capital-gains-tax`, `gst`, `tds`, `roth-vs-traditional-ira`, `rmd` | Waterfall from gross to net, regime/status comparison, deduction impact, tax-rate sensitivity, taxable vs tax-free income, save tax plan or monthly cashflow. |
| Retirement Income Studio | `retirement`, `swp`, `social-security-break-even`, `rmd`, `nps`, `401k`, `epf`, `ppf`, `/calculators/fire` | Retirement timeline, corpus need, contribution gap, withdrawal runway, claiming break-even, account mix, save retirement plan. |
| Cashflow and Balance Sheet Studio | `net-worth`, `budget`, `emergency-fund`, `life-insurance-needs` | Balance sheet, monthly cashflow, runway, protection gap, transaction/account imports, saved dashboard cards. |

## Phase Roadmap

### Phase 17: Calculator-to-Account Conversion Layer

Status: complete for preview/development.

- Added a durable calculator result model in D1 and a mapping layer into existing goals/accounts/plans.
- Preserves signed-out calculator inputs/results through sign-up.
- For signed-in users, calculator outputs can be saved as:
  - Goals for wealth, savings, down payment, emergency fund, insurance, investing.
  - Accounts or liabilities for loans, mortgages, EMI, credit, EPF/PPF/NPS/FD/CD/HYSA.
  - Plans for FIRE, retirement, tax, payoff, refinance, rent-vs-buy, SWP.
  - Durable transaction-workflow result records for budget, salary, paycheck, and cashflow, without mutating the ledger.
- Dashboard cards show saved calculator-derived goals/plans/accounts/workflows.
- Tests cover the server save payload validation and route-to-destination mapping; future browser-level signed-out/signed-in CTA tests remain part of Phase 24 hardening.

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
- Make `/calculators/amortization` a true schedule calculator: complete monthly schedule, yearly rollups, custom period view, remaining balance, cumulative interest, export, and charts.
- Upgrade refinance, balance transfer, rent-vs-buy, lease-vs-buy, PMI, and affordability calculators with break-even charts.
- Replace weighted debt-only snowball/avalanche with a true multi-debt table.
- Add missing loan and mortgage routes from the planned calculator backlog below.
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

## Logical Handoff and Deploy Checkpoints

This is the implementation sequence to avoid losing progress. Deploy when app behavior changes; docs-only planning updates do not need a Pages deploy because they are not part of the built SPA artifact.

| Checkpoint | Deploy? | Expected comprehensive-calculator completion | Work left after checkpoint | What should be accomplished |
| --- | --- | ---: | ---: | --- |
| Planning checkpoint | No app deploy | 10% | 90% | Existing routes, base formulas, tests, Phase 20-25 roadmap, missing calculator backlog, and comprehensive standards documented. |
| High-standard foundation checkpoint | Yes | 12% | 88% | Code-level quality contracts, baseline visual read, decision checks, and detailed high-standard implementation plan for every current calculator. |
| Phase 17 deploy | Yes | 20% | 80% | Durable save-result infrastructure, signed-out draft preservation, dashboard saved-result cards, and reusable mapping into goals/accounts/plans/transactions. Complete for preview/development. |
| Phase 20 deploy | Yes | 32% | 68% | Decision studio metadata, scenario state, shared visualization primitives, related calculators, route-specific content scaffolding, and route guard tests. |
| Phase 21 deploy | Yes | 48% | 52% | Growth, goal, and retirement calculators upgraded with timelines, contribution/growth visuals, inflation-adjusted results, corpus gaps, withdrawal runway, and save flows. |
| Phase 22 deploy | Yes | 66% | 34% | Full amortization schedules, loan/debt/home visualizers, missing loan/mortgage routes, multi-debt snowball/avalanche, payoff calendars, break-even charts, and exports. |
| Phase 23 deploy | Yes | 80% | 20% | Income, tax, budget, and protection calculators upgraded with waterfalls, richer assumptions, estimate disclaimers, and cashflow/protection visuals. |
| Phase 24 deploy | Yes | 92% | 8% | Route-specific content, canonicals, structured data, sitemap coverage, internal links, no-auth smoke coverage, and duplicate-content guard tests. |
| Phase 25 deploy | Yes | 100% | 0% | Saved scenario comparison, recent calculator history, dashboard follow-up cards, export/share, and final browser QA across representative calculator families. |

After each app deploy, record:

- Preview URL and branch alias.
- Tests run and pass/fail result.
- Local browser smoke routes.
- Live browser smoke routes.
- Percentage complete and percentage remaining from this table.
- Any launch blockers, especially Clerk production auth.

## Planned New Calculator Routes

These calculators are not currently implemented as public routes. Add them without removing existing routes. Where formulas overlap, route them into the Loan and Home Studio or Debt Payoff Studio with route-specific defaults, copy, examples, FAQs, and internal links.

| Planned calculator | Suggested route | Why it matters | Phase | Studio | Comprehensive visual requirements |
| --- | --- | --- | --- | --- | --- |
| Mortgage Payoff Calculator | `/calculators/mortgage-payoff` | Users search directly for payoff timing and interest saved; current `extra-mortgage-payment` partially covers this but not as a dedicated payoff route. | 22 | Loan and Home / Debt Payoff | Payoff calendar, interest saved, original vs accelerated balance line, monthly/yearly schedule. |
| Biweekly Mortgage Payment Calculator | `/calculators/biweekly-mortgage-payment` | Common mortgage acceleration query; helps users understand why 26 half-payments matter. | 22 | Loan and Home | Standard vs biweekly payoff timeline, interest saved, effective extra payment, amortization comparison. |
| Mortgage Recast Calculator | `/calculators/mortgage-recast` | Distinct from refinance and extra payments; users need lower-payment vs shorter-term comparison. | 22 | Loan and Home | Before/after payment, recast fee break-even, remaining balance line, amortization comparison. |
| Mortgage Points / Rate Buydown Calculator | `/calculators/mortgage-points` | High-intent purchase/refinance decision; compares upfront cost against lower rate. | 22 | Loan and Home | Break-even month, cumulative savings, payment comparison, sensitivity by holding period. |
| 15 vs 30 Year Mortgage Calculator | `/calculators/15-vs-30-year-mortgage` | Common search and useful decision page; avoids manual side-by-side math. | 22 | Loan and Home | Payment comparison, total interest bars, equity timeline, affordability warning. |
| Adjustable Rate Mortgage Calculator | `/calculators/arm-mortgage` | Important for rate reset risk; needs scenario visualization. | 22 | Loan and Home | Payment reset timeline, max payment scenario, balance line, rate sensitivity. |
| Interest-Only Loan Calculator | `/calculators/interest-only-loan` | Useful for HELOCs, mortgages, and bridge loans; payment shock is the core value. | 22 | Loan and Home | Interest-only period vs amortizing period, payment shock chart, total interest. |
| Balloon Loan Calculator | `/calculators/balloon-loan` | Captures loans with a final lump sum that normal amortization does not explain. | 22 | Loan and Home | Balloon amount, balance timeline, refinance/save-for-balloon target. |
| Closing Costs Calculator | `/calculators/closing-costs` | Needed for home affordability and cash-to-close planning. | 22 | Loan and Home | Cash-to-close waterfall, lender/third-party/prepaid split, down payment integration. |
| Escrow Calculator | `/calculators/escrow` | Mortgage payment pages are more useful with tax/insurance escrow. | 22 | Loan and Home | Principal/interest/tax/insurance/PMI waterfall, annual escrow projection. |
| Debt-to-Income Ratio Calculator | `/calculators/debt-to-income-ratio` | Critical affordability metric for mortgage/loan eligibility. | 22 | Loan and Home | Front-end/back-end DTI gauges, approval bands, debt reduction scenario. |
| Loan Comparison Calculator | `/calculators/loan-comparison` | Users often compare terms/rates/fees rather than one loan. | 22 | Loan and Home | Side-by-side payment, total cost, total interest, break-even, recommendation note. |
| APR / True Loan Cost Calculator | `/calculators/apr` | Turns fees and points into true borrowing cost; complements all loan pages. | 22 | Loan and Home | APR vs nominal rate, fee impact waterfall, loan-cost comparison. |
| Home Equity Loan Calculator | `/calculators/home-equity-loan` | Different from HELOC because it is a closed-end amortizing loan. | 22 | Loan and Home | Payment, equity available, LTV gauge, amortization schedule. |
| FHA Loan Calculator | `/calculators/fha-loan` | High-search mortgage route with mortgage insurance assumptions. | 22 | Loan and Home | Upfront/monthly MIP, payment waterfall, cash-to-close, amortization. |
| VA Loan Calculator | `/calculators/va-loan` | High-search veteran mortgage route with funding fee assumptions. | 22 | Loan and Home | Funding fee impact, payment waterfall, cash-to-close, amortization. |
| FHA vs Conventional Calculator | `/calculators/fha-vs-conventional` | Decision route for buyers comparing mortgage paths. | 22 | Loan and Home | Side-by-side cash-to-close, monthly payment, insurance duration, break-even. |
| Home Loan Prepayment Calculator India | `/calculators/home-loan-prepayment-india` | Indian home-loan users often compare partial prepayment vs tenure reduction. | 22 | Loan and Home | Tenure saved, interest saved, revised amortization, lump-sum timing. |
| Loan Foreclosure Calculator India | `/calculators/loan-foreclosure-india` | Helps estimate payoff amount, interest saved, and foreclosure charges. | 22 | Loan and Home / Debt Payoff | Payoff amount, fees, interest saved, remaining schedule comparison. |
| Home Loan Balance Transfer Calculator India | `/calculators/home-loan-balance-transfer-india` | Indian analogue to refinance; high value when rates change. | 22 | Loan and Home | Old vs new EMI, fee break-even, total interest saved, remaining tenure. |
| Flat vs Reducing Interest Rate Calculator | `/calculators/flat-vs-reducing-rate` | Common Indian loan confusion; explains true cost. | 22 | Loan and Home | Effective rate comparison, EMI comparison, total interest bars. |
| Loan Eligibility Calculator India | `/calculators/loan-eligibility-india` | Useful before EMI; maps income, obligations, and tenure to eligible loan. | 22 | Loan and Home | Eligibility gauge, EMI-to-income ratio, max loan sensitivity. |
| Stamp Duty and Registration Calculator India | `/calculators/stamp-duty-registration` | Complements home loan/down payment and cash-to-close planning. | 22 | Loan and Home | Cost breakdown waterfall, state/rate assumptions, cash required. |

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
