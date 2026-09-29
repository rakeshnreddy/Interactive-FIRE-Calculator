# Calculator Value and Visualization Roadmap

> Current-state correction (2026-09-07): see [CURRENT_STATE_AUDIT.md](CURRENT_STATE_AUDIT.md) and [EXECUTION_BACKLOG.md](EXECUTION_BACKLOG.md). Older paths, PRs, previews, counts and percentages below are historical checkpoints. The shared 82-route roadmap and the 5-of-82 excellence pass use different completion criteria. Neither proves hosted authenticated readiness or production launch readiness.

Last updated: July 12, 2026

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
- Show a period-by-period table whenever the result implies repeated payments, deposits, withdrawals, brackets, cashflows, or payoff periods.
- Offer scenario comparison where a user naturally asks "what if": base, conservative, optimistic, or custom scenario.
- Include an explanation of what changed the result most.
- Connect the result to a signed-in next step through Phase 17 save flows.
- Include tests for formula outputs, invalid inputs, generated visualization data, and signed-out/signed-in CTA behavior.
- Avoid "thin duplicate" pages: routes can share engines, but route copy, defaults, examples, FAQs, and related links must match the user's actual intent.

Visual patterns by calculator type:

| Calculator type | Required visual aids |
| --- | --- |
| Amortizing loans and EMI | Full payment-by-payment monthly schedule, yearly summary, custom period view, principal/interest split, remaining balance line, cumulative interest, extra-payment comparison, export-ready table data. |
| Mortgage/home decisions | Payment waterfall, amortization/equity schedule, break-even chart, affordability/DTI gauge, closing-cost or PMI impact. |
| Debt payoff | Month-by-month payoff table, balance timeline, payoff calendar, interest-saved comparison, snowball vs avalanche side-by-side, minimum-payment warning. |
| Growth and savings | Contributions vs growth area chart, deposit/contribution schedule, milestone timeline, inflation-adjusted value, scenario comparison, sensitivity grid. |
| Retirement income | Corpus timeline, withdrawal/RMD/distribution schedule, withdrawal runway, gap/surplus chart, account mix, claiming or distribution break-even. |
| Tax/income | Gross-to-net waterfall, regime/status comparison bars, bracket/slab or pay-period table, deduction sensitivity, effective vs marginal rate where applicable. |
| Budget/cashflow | Cashflow waterfall or Sankey, category bars, savings-rate trend, emergency runway, category/period breakdown table. |
| Insurance/protection | Coverage gap waterfall, dependents timeline, existing coverage vs need. |

## High Standard Contract

The detailed per-calculator implementation standard now lives in `docs/CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md`.

Current checkpoint:

- `src/lib/calculatorQuality.ts` defines calculation, visual, scenario, validation, interpretation, and conversion expectations for every current public calculator route.
- `src/lib/seoCalculators.test.ts` asserts that every current route has a comprehensive quality contract.
- Calculator detail pages now show why the calculator matters, a baseline visual read of the result metrics, and decision checks.
- Phase 17 adds durable signed-in calculator result saves, signed-out draft preservation, downstream goal/account/plan draft creation where safe, transaction-workflow result storage, Dashboard saved-result cards, and account-data export/delete coverage.
- Phase 20 adds reusable decision-studio metadata, conservative/base/optimistic scenario state, chart-ready primitives, route-specific examples, related-calculator navigation, and public-copy guard tests for every current route.
- Phase 21 adds expandable optional growth, goal, retirement, withdrawal, distribution, benefit, inflation, and return tables.
- Phase 22 adds borrowing-route expansion, complete optional amortization/payoff/refinance/prepayment/detail tables, custom period views, CSV schedule export, and true multi-debt snowball vs avalanche comparison.
- Phase 25 completes the comprehensive calculator program at 100%. All planned route, formula, visualization, schedule, content, conversion, comparison, history, follow-up, export/share, and public smoke requirements are complete for preview/development; 0% remains in this roadmap.

## Shared Decision Studios

Keep all calculator routes, but route them into shared richer experiences with route-specific presets.

The public browsing layer now presents these internal capabilities as 8 user-facing toolkits: Financial Checkup, Savings & Goals, Investment Returns, Debt Payoff, Loans & Payments, Home Buying & Mortgage, Income & Tax, and Retirement Planning. The exact route title remains the H1 on every calculator detail page. See `docs/CALCULATOR_LIBRARY_REVIEW.md` and `src/lib/calculatorToolkits.ts`.

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

Status: complete for preview/development.

- Introduce shared calculator family metadata while keeping every public route.
- Add scenario state: base, conservative, optimistic.
- Add reusable chart components for time-series, waterfall, amortization, and comparison views.
- Add route-specific example scenarios and assumptions.
- Add related-calculator crosslinks based on studio family.
- Add route-level content guard tests so internal strategy language never appears in public copy.

### Phase 21: Growth, Goal, and Retirement Visualizers

Status: complete for preview/development.

- Upgrade growth calculators with contribution vs growth charts, inflation-adjusted value, milestone dates, and scenario comparison.
- Add collapsed-by-default annual contribution/deposit, estimated growth, cumulative deposit, and ending-balance tables for compound, SIP, step-up SIP, RD, FD/CD, HYSA, lumpsum, and savings-goal routes.
- Upgrade goal calculators with monthly required, catch-up amount, target-date view, and feasibility context.
- Upgrade retirement/SWP/NPS/401(k)/EPF/PPF/RMD/Social Security/gratuity routes with corpus timeline, contribution gap, withdrawal runway, distribution schedule, benefit break-even, and account/product split context.
- Add collapsed-by-default return path, approximate XIRR cashflow, Rule of 72 milestone, and inflation path tables for return and inflation calculators where a period-by-period breakdown adds value.
- Reuse save-to-goal and save-to-plan flows from Phase 17; no route-specific save behavior was added.

### Phase 22: Loan, Debt, Home, and Vehicle Visualizers

Status: complete for preview/development.

- Upgrade all loan/EMI/mortgage routes with full payment schedules, yearly rollups, custom period views, principal vs interest data, payoff calendars, and prepayment sensitivity.
- Make `/calculators/amortization` a true schedule calculator: complete payment-by-payment monthly table, year labels, custom period view, remaining balance, cumulative interest, and CSV export.
- Keep full schedules collapsed and optional by default so the calculator page stays clean until the user asks for the detailed table.
- Upgrade refinance, balance transfer, rent-vs-buy, lease-vs-buy, PMI, and affordability calculators with break-even charts.
- Replace weighted debt-only snowball/avalanche with a true multi-debt table.
- Add missing loan and mortgage routes from the planned calculator backlog below.
- Add save liability and payoff-plan flows for borrowing calculators.

### Phase 23: Income, Tax, Budget, and Protection Deepening

Status: complete for preview/development.

- Upgrade budget, paycheck, salary, and tax calculators with waterfall views and monthly cashflow mapping.
- Add India tax old/new regime slab logic and assumptions.
- Add US tax/paycheck pay frequency, deductions, standard deduction, bracket logic, and state placeholder architecture.
- Add HRA, GST, TDS, capital gains, Roth/traditional, and RMD calculators as estimate tools with clear assumptions and saved tax-plan notes.
- Upgrade life insurance and emergency fund calculators with protection gap, runway, and priority recommendations.
- Keep statutory calculators clearly labeled as planning estimates, not filing advice.

### Phase 24: Search Preservation and Content Quality Hardening

Status: complete for preview/development.

- Keep all existing public calculator routes live.
- Add route-specific examples, assumptions, FAQs, and internal links.
- Ensure canonical, title, description, sitemap, and structured data are stable for every route.
- Add content tests for duplicate-looking route copy.
- Add no-auth smoke tests for all public calculators.
- Use Search Console data later to tune internal links and examples without changing stable URLs.

### Phase 25: Engagement and Personalization Loop

Status: complete for preview/development.

- Add side-by-side comparison drawers so users can save multiple scenarios.
- Add "what changed the outcome most" explanations.
- Add recent calculator history for signed-in users.
- Add dashboard follow-up cards: "your EMI plan needs a liability account", "your SIP goal is behind by X", "your emergency fund target changed after spending updates".
- Add export/share for schedules, payoff tables, deposit tables, withdrawal tables, tax/bracket breakdowns, and scenario summaries.

## Logical Handoff and Deploy Checkpoints

This is the implementation sequence to avoid losing progress. Deploy when app behavior changes; docs-only planning updates do not need a Pages deploy because they are not part of the built SPA artifact.

| Checkpoint | Deploy? | Expected comprehensive-calculator completion | Work left after checkpoint | What should be accomplished |
| --- | --- | ---: | ---: | --- |
| Planning checkpoint | No app deploy | 10% | 90% | Existing routes, base formulas, tests, Phase 20-25 roadmap, missing calculator backlog, and comprehensive standards documented. |
| High-standard foundation checkpoint | Yes | 12% | 88% | Code-level quality contracts, baseline visual read, decision checks, and detailed high-standard implementation plan for every current calculator. |
| Phase 17 deploy | Yes | 20% | 80% | Durable save-result infrastructure, signed-out draft preservation, dashboard saved-result cards, and reusable mapping into goals/accounts/plans/transactions. Complete for preview/development. |
| Phase 20 deploy | Yes | 32% | 68% | Decision studio metadata, scenario state, shared visualization primitives, related calculators, route-specific content scaffolding, and route guard tests. |
| Phase 21 deploy | Yes | 48% | 52% | Growth, goal, retirement, withdrawal, distribution, benefit, inflation, and return calculators upgraded with collapsed optional schedule/detail tables plus existing save flows. |
| Phase 22 deploy | Yes | 66% | 34% | Full amortization schedules, loan/debt/home visualizers, missing loan/mortgage routes, multi-debt snowball/avalanche, payoff calendars, break-even/detail tables, custom period views, and CSV exports. |
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

## Phase 22 Borrowing Routes

These calculators are now implemented as public routes. Where formulas overlap, they route into the Loan and Home Studio or Debt Payoff Studio with route-specific defaults, copy, examples, FAQs, and internal links.

| Planned calculator | Suggested route | Why it matters | Phase | Studio | Comprehensive visual requirements |
| --- | --- | --- | --- | --- | --- |
| Mortgage Payoff Calculator | `/calculators/mortgage-payoff` | Users search directly for payoff timing and interest saved; current `extra-mortgage-payment` partially covers this but not as a dedicated payoff route. | 22 | Loan and Home / Debt Payoff | Payoff calendar, interest saved, original vs accelerated balance line, monthly/yearly schedule. |
| Biweekly Mortgage Payment Calculator | `/calculators/biweekly-mortgage-payment` | Common mortgage acceleration query; helps users understand why 26 half-payments matter. | 22 | Loan and Home | Standard vs biweekly payoff timeline, interest saved, effective extra payment, amortization comparison. |
| Mortgage Recast Calculator | `/calculators/mortgage-recast` | Distinct from refinance and extra payments; users need lower-payment vs shorter-term comparison. | 22 | Loan and Home | Before/after payment, recast fee break-even, remaining balance line, amortization comparison. |
| Mortgage Points / Rate Buydown Calculator | `/calculators/mortgage-points` | High-intent purchase/refinance decision; compares upfront cost against lower rate. | 22 | Loan and Home | Break-even month, cumulative savings, payment comparison, sensitivity by holding period. |
| 15 vs 30 Year Mortgage Calculator | `/calculators/15-vs-30-year-mortgage` | Common search and useful decision page; avoids manual side-by-side math. | 22 | Loan and Home | Payment comparison, total interest bars, equity timeline, affordability warning. |
| Adjustable Rate Mortgage Calculator | `/calculators/arm-mortgage` | Important for rate reset risk; needs scenario visualization. | 22 | Loan and Home | Payment reset timeline, max payment scenario, balance line, rate sensitivity. |
| Interest-Only Mortgage Calculator | `/calculators/interest-only-mortgage` | Useful for HELOCs, mortgages, and bridge loans; payment shock is the core value. | 22 | Loan and Home | Interest-only period vs amortizing period, payment shock table, total interest. |
| Balloon Loan Calculator | `/calculators/balloon-loan` | Captures loans with a final lump sum that normal amortization does not explain. | 22 | Loan and Home | Balloon amount, balance timeline, refinance/save-for-balloon target. |
| Closing Costs Calculator | `/calculators/closing-costs` | Needed for home affordability and cash-to-close planning. | 22 | Loan and Home | Cash-to-close waterfall, lender/third-party/prepaid split, down payment integration. |
| Escrow Calculator | `/calculators/escrow` | Mortgage payment pages are more useful with tax/insurance escrow. | 22 | Loan and Home | Principal/interest/tax/insurance/PMI waterfall, annual escrow projection. |
| Debt-to-Income Ratio Calculator | `/calculators/debt-to-income` | Critical affordability metric for mortgage/loan eligibility. | 22 | Loan and Home | DTI breakdown table, room-at-threshold estimate, debt reduction scenario. |
| Loan Comparison Calculator | `/calculators/loan-comparison` | Users often compare terms/rates/fees rather than one loan. | 22 | Loan and Home | Side-by-side payment, total cost, total interest, break-even, recommendation note. |
| APR / True Loan Cost Calculator | `/calculators/apr` | Turns fees and points into true borrowing cost; complements all loan pages. | 22 | Loan and Home | APR vs nominal rate, fee impact waterfall, loan-cost comparison. |
| Home Equity Loan Calculator | `/calculators/home-equity-loan` | Different from HELOC because it is a closed-end amortizing loan. | 22 | Loan and Home | Payment, equity available, LTV gauge, amortization schedule. |
| FHA Loan Calculator | `/calculators/fha-loan` | High-search mortgage route with mortgage insurance assumptions. | 22 | Loan and Home | Upfront/monthly MIP, payment waterfall, cash-to-close, amortization. |
| VA Loan Calculator | `/calculators/va-loan` | High-search veteran mortgage route with funding fee assumptions. | 22 | Loan and Home | Funding fee impact, payment waterfall, cash-to-close, amortization. |
| FHA vs Conventional Calculator | `/calculators/fha-vs-conventional` | Decision route for buyers comparing mortgage paths. | 22 | Loan and Home | Side-by-side cash-to-close, monthly payment, insurance duration, break-even. |
| Home Loan Prepayment Calculator India | `/calculators/home-loan-prepayment` | Indian home-loan users often compare partial prepayment vs tenure reduction. | 22 | Loan and Home | Tenure saved, interest saved, revised amortization, lump-sum timing. |
| Loan Foreclosure Calculator India | `/calculators/home-loan-foreclosure` | Helps estimate payoff amount, interest saved, and foreclosure charges. | 22 | Loan and Home / Debt Payoff | Payoff amount, fees, interest saved, remaining schedule comparison. |
| Home Loan Balance Transfer Calculator India | `/calculators/home-loan-balance-transfer-india` | Indian analogue to refinance; high value when rates change. | 22 | Loan and Home | Old vs new EMI, fee break-even, total interest saved, remaining tenure. |
| Flat vs Reducing Interest Rate Calculator | `/calculators/flat-vs-reducing-rate` | Common Indian loan confusion; explains true cost. | 22 | Loan and Home | Effective rate comparison, EMI comparison, total interest bars. |
| Loan Eligibility Calculator India | `/calculators/loan-eligibility-india` | Useful before EMI; maps income, obligations, and tenure to eligible loan. | 22 | Loan and Home | Eligibility gauge, EMI-to-income ratio, max loan sensitivity. |
| Stamp Duty and Registration Calculator India | `/calculators/stamp-duty-registration` | Complements home loan/down payment and cash-to-close planning. | 22 | Loan and Home | Cost breakdown waterfall, state/rate assumptions, cash required. |

## Per-Calculator Value Audit

| Calculator | Current usefulness | Risk of feeling basic | Upgrade for real value | Combine through | Visualization ideas |
| --- | --- | --- | --- | --- | --- |
| Compound Interest | Excellence pass complete July 27, 2026: dedicated dated-cash-flow engine, nominal/APY semantics, independent frequencies/timing, fractional terms, step-ups, top-ups, fees, inflation, future events, targets, locale/currency display, versioned share/draft/save, true balance path, milestones, sensitivity, and reconciling schedules. | Low: advanced assumptions stay collapsed and every output has an audit trail. Taxes, live data/FX, Monte Carlo, variable return sequences, and exact product ledgers remain explicitly deferred. | Completed in Phase 26 calculator 1. Preserve the legacy default and keep 401(k)/HYSA on the shared formula. | Growth and Goal Studio | Implemented balance/capital path, annual and detailed schedules, fee/real-value reads, milestone list, and return/contribution sensitivity grid. |
| Savings Goal | Excellence pass complete August 9, 2026: dedicated inverse-solve engine, explicit nominal/APY semantics, exact fractional deadlines, independent frequency/timing, step-ups, top-ups, fees, target inflation, current-plan/catch-up analysis, milestones, sensitivity, locale/currency display, versioned share/draft/save, true runway, and reconciling schedules. | Low: the beginner path stays focused while advanced assumptions and all expert analysis remain collapsed. Live feeds, taxes, exact product ledgers, Monte Carlo, arbitrary cash flows, and multi-goal optimization remain explicitly deferred. | Completed in Phase 26 calculator 2. Preserve the legacy shared formula for SIP Goal; non-USD Goal creation remains blocked until Goals store currency. | Growth and Goal Studio | Implemented required/current runway, milestone list, annual/event schedules, and target/deadline plus isolated-rate sensitivity. |
| Net Worth | Excellence pass complete August 9, 2026: dated asset/liability categories, exact reconciliation, liquid position, debt-to-asset read, valuation sensitivity, locale/currency display, versioned share/draft/save, CSV, and saved snapshots. | Low: every total is auditable and negative net worth remains valid. Account imports, appraisal, FX conversion, ownership/tax adjustments, and a longitudinal trend remain explicitly deferred. | Completed in Phase 26 calculator 3. The save handoff preserves aggregate assets and liabilities for account setup. | Cashflow and Balance Sheet Studio | Implemented comparable assets/liabilities/net-worth bars, category table, and sensitivity bars. |
| Budget | Excellence pass complete August 9, 2026: take-home income, needs/flexible categories, planned saving, surplus and unassigned cash, savings-capacity rate, editable 50/30/20 reference, stress scenarios, annual pace, locale/currency display, versioned share/draft/save, and CSV. | Low: entered spending stays separate from saving and reference percentages never overwrite the plan. Transaction ingestion, recurring-bill detection, tax conversion, and variable month forecasting remain explicitly deferred. | Completed in Phase 26 calculator 4. The save handoff records a cashflow snapshot for the signed-in workflow. | Cashflow and Balance Sheet Studio | Implemented cashflow/category bars, reference comparison, stress-case bars, category reconciliation, and 12-month pace. |
| Emergency Fund | Excellence pass complete August 9, 2026: essential spending, selected coverage, liquidity tiers, current runway, gap/excess, one-time buffer, no-growth funding schedule, 3/6/risk reference cases, locale/currency display, versioned share/draft/save, and CSV. | Low: the risk result is labeled as a transparent heuristic, market exposure stays visible, and no return is hidden in the schedule. Insurance adequacy, job-loss probability, market haircuts, live yields, taxes, and multi-currency Goal storage remain explicitly deferred. | Completed in Phase 26 calculator 5. USD results can create an Emergency Fund Goal; other display currencies remain calculator-only until Goals store currency. | Cashflow and Balance Sheet Studio | Implemented target progress, liquidity-tier stack, reference-target bars, liquidity table, and monthly funding schedule. |
| Retirement | Compares projected savings against estimated need. | Medium: useful but still one path. | Add phases, inflation, account mix, contribution gap, contribution/withdrawal schedule, FIRE link, and scenario comparison. | Retirement Income Studio | Retirement timeline, yearly schedule, corpus need vs projected savings, sensitivity heatmap. |
| Debt Payoff | Estimates payoff time and interest. | Medium: useful, but one debt only. | Add extra payment suggestions, multiple debts, month-by-month payoff table, payoff date, and save payoff plan. | Debt Payoff Studio | Payoff balance line, interest saved bars, payoff calendar/table. |
| Investment Return | Annualizes starting and ending values. | High: CAGR formula only. | Add cashflow-aware option, dated cashflow table when contributions vary, benchmark comparison, inflation-adjusted return, and performance notes. | Return Analysis Studio | Return bridge, cashflow table, benchmark comparison line. |
| SIP | Projects monthly investing corpus. | Medium: valuable for India users, but common. | Add step-up option inline, target mapping, shortfall, contribution schedule, inflation-adjusted corpus, and goal save. | Growth and Goal Studio | Corpus line, contribution table, invested vs gains area, contribution sensitivity. |
| Step-up SIP | Projects SIP with annual increase. | Low-medium: harder than basic SIP. | Add salary-growth tie-in, maximum affordable step-up, monthly/yearly contribution schedule, and target date. | Growth and Goal Studio | Step-up ladder, contribution table, corpus comparison vs flat SIP. |
| SIP Goal | Solves monthly SIP needed for a target. | Medium: similar to savings goal. | Add target inflation, current investment growth, catch-up SIP, deposit schedule, and goal save. | Growth and Goal Studio | Goal gap chart, deposit table, monthly SIP slider, achievement timeline. |
| Lumpsum Mutual Fund | Projects one-time investment growth. | Medium: simple FV formula. | Compare lumpsum vs SIP/STP, inflation-adjusted value, tax assumptions, and downside scenario. | Growth and Goal Studio | Lumpsum vs SIP line, returns sensitivity table. |
| SWP | Estimates withdrawal runway. | Low-medium: drawdown math is less obvious. | Add withdrawal escalation, withdrawal-by-period table, return stress, sequence risk warning, and retirement income plan save. | Retirement Income Studio | Corpus drawdown line, withdrawal table, runway gauge, withdrawal stress chart. |
| EMI | Calculates loan payment. | Medium: common, but amortization is valuable. | Add complete monthly amortization schedule, yearly rollups, total interest, prepayment options, affordability, and liability save. | Loan and Home Studio | Principal/interest split, amortization table, yearly summary, prepayment savings. |
| Home Loan EMI | Calculates Indian home loan payment. | Medium: common. | Add down payment, stamp duty/fees, tax benefit assumptions, prepayment, affordability, and full amortization table. | Loan and Home Studio | Loan amortization table, total cost waterfall, prepayment comparison. |
| Car Loan EMI | Calculates Indian car loan payment. | Medium: common. | Add total ownership cost, down payment, resale/depreciation, insurance, amortization schedule, yearly loan summary, and affordability. | Loan and Home Studio | Monthly cost waterfall, amortization table, loan balance vs car value. |
| Personal Loan EMI | Calculates personal loan payment. | Medium: common. | Add debt consolidation comparison, prepayment, affordability ratio, monthly payoff schedule, and payoff plan. | Loan and Home Studio | Interest saved chart, payoff table, payoff timeline. |
| Income Tax India | Uses an effective rate estimate. | High: current version is too generic for the title. | Add old vs new regime slabs, slab-by-slab table, deduction inputs, cess/surcharge assumptions, and saved tax plan. | Income and Tax Studio | Regime comparison bars, slab table, gross-to-net waterfall. |
| Salary India | Estimates take-home from CTC and effective deduction rate. | High: too simplified. | Add CTC component builder, PF, professional tax, bonus, variable pay, monthly/annual pay table, and monthly cashflow save. | Income and Tax Studio | CTC-to-take-home waterfall, pay-period table, monthly net trend. |
| HRA Exemption | Applies common HRA formula. | Medium: useful but formulaic. | Add metro toggle, monthly rent, regime impact, formula component table, rent receipts checklist, and tax note save. | Income and Tax Studio | Exemption components bar, formula table, taxable HRA waterfall. |
| FD | Projects fixed deposit maturity. | Medium: simple compounding. | Add payout frequency, tax/TDS estimate, laddering, reinvestment, payout schedule, and account save. | Growth and Goal Studio | Maturity ladder, payout table, interest vs principal, tax impact. |
| RD | Projects recurring deposit maturity. | Medium: similar to SIP. | Add deposit schedule, missed payment impact, tax/TDS estimate, and goal/account save. | Growth and Goal Studio | Deposit vs interest area, monthly schedule, yearly summary. |
| PPF | Projects annual PPF contributions. | Low-medium: product rules matter. | Add contribution timing, 15-year lock-in table, extension blocks, tax-free status, and retirement account save. | Retirement Income Studio | PPF maturity timeline, yearly table, contribution cap progress. |
| EPF | Projects employee and employer contributions. | Low-medium: employer rules add value. | Add salary growth, statutory rates, employer cap, VPF option, annual schedule, and retirement account save. | Retirement Income Studio | Employee/employer/growth stacked area and contribution table. |
| NPS | Projects NPS corpus and annuity split. | Low-medium: product details matter. | Add equity/debt allocation, annuity rate estimate, tax limits, contribution schedule, and retirement pension estimate. | Retirement Income Studio | Corpus split, annuity vs lump sum, retirement income timeline/table. |
| Gratuity | Estimates gratuity from salary and tenure. | Medium: formula is specific. | Add eligibility, statutory cap, employer type, tenure scenarios, and retirement plan item. | Retirement Income Studio | Vesting timeline, payout scenario bars. |
| Mortgage Payment | Calculates US mortgage payment. | Medium: common. | Add taxes, insurance, PMI, escrow, down payment, and complete amortization schedule. | Loan and Home Studio | Payment breakdown, amortization table, home equity line. |
| Mortgage Affordability | Currently behaves like a loan target. | High: should be more than payment math. | Add income, debts, down payment, DTI, property tax, insurance, and cash reserve checks. | Loan and Home Studio | Affordability gauge, max price sensitivity. |
| Mortgage Refinance | Compares old and new monthly payment. | Medium: useful but incomplete. | Add break-even, total lifetime savings, closing-cost finance option, old/new amortization schedules, and term reset warning. | Loan and Home Studio | Break-even chart, old/new schedule table, cumulative savings line. |
| Amortization Schedule | Calculates payment only today. | High: title promises schedule. | Add full payment-by-payment monthly table, yearly rollups, custom period view, export/share, principal/interest split, cumulative interest, and balance timeline. | Loan and Home Studio | Amortization table, yearly summary, stacked principal/interest chart, balance line. |
| Extra Mortgage Payment | Estimates payoff with extra payment. | Medium: valuable when visualized. | Add one-time vs monthly extra, accelerated payoff table, payoff date saved, and interest saved. | Loan and Home Studio and Debt Payoff Studio | Payoff acceleration chart, payoff table, interest saved bars. |
| Rent vs Buy | Simplified monthly comparison. | High: needs richer assumptions. | Add appreciation, rent inflation, maintenance, taxes, insurance, transaction costs, investment return, and break-even. | Loan and Home Studio | Net worth over time, break-even crossover. |
| Credit Card Payoff | Estimates payoff and interest. | Medium: useful but common. | Add minimum-payment warning, extra-payment options, balance transfer comparison, payoff table, and payoff plan. | Debt Payoff Studio | Balance decline line, payoff table, interest paid bars. |
| Debt Snowball vs Avalanche | Uses one weighted APR today. | High: true feature needs multiple debts. | Add multi-debt input table, month-by-month strategy schedules, strategy comparison, motivation metrics, and calendar. | Debt Payoff Studio | Strategy comparison timeline, interest saved by strategy, debt-by-debt payoff table. |
| Auto Loan | Calculates payment. | Medium: common. | Add taxes/fees, down payment, trade-in, depreciation, insurance, amortization schedule, and total cost. | Loan and Home Studio | Loan balance vs car value, amortization table, cost waterfall. |
| Personal Loan | Calculates payment. | Medium: common. | Add origination fee, prepayment, payoff schedule, consolidation comparison, and debt ratio. | Loan and Home Studio | Monthly payment vs term, payoff table, total interest curve. |
| Student Loan Payoff | Estimates payoff with payment. | Medium: valuable but needs context. | Add multiple loans, refinance comparison, federal/private assumptions, loan-by-loan payoff schedule, and payoff plan. | Debt Payoff Studio | Payoff timeline/table, interest saved by extra payment. |
| 401(k) | Projects retirement account growth. | Medium: common but high intent. | Add salary percentage, employer match, contribution limits, Roth/traditional split, salary growth, and annual contribution/match schedule. | Growth and Retirement Studios | Match waterfall, contribution table, retirement account growth timeline. |
| Roth vs Traditional IRA | Currently uses effective tax spread. | High: too simplified. | Add current/future tax rates, contribution limits, taxable investing comparison, tax comparison table, and RMD note. | Income and Tax Studio and Retirement Income Studio | After-tax value comparison, tax table, tax-rate sensitivity. |
| Paycheck | Estimates annual take-home by effective rate. | High: users expect paycheck detail. | Add pay frequency, pre-tax deductions, filing status, state placeholder, and monthly cashflow save. | Income and Tax Studio | Gross-to-net waterfall, per-period breakdown. |
| Income Tax US | Uses an effective rate estimate. | High: generic. | Add filing status, bracket logic, bracket-by-bracket table, standard/itemized deduction, credits, and state placeholder. | Income and Tax Studio | Bracket waterfall, bracket table, effective vs marginal rate. |
| Social Security Break-even | Compares early vs full benefit. | Low-medium: break-even is useful. | Add claiming ages, COLA, yearly cumulative benefit table, spouse/survivor note, and retirement plan save. | Retirement Income Studio | Cumulative benefit crossover and annual benefit table. |
| Required Minimum Distribution | Divides balance by divisor. | Medium: simple but rule-specific. | Add age/table selector, multi-account total, tax withholding estimate, annual RMD schedule, and withdrawal plan. | Income and Tax Studio and Retirement Income Studio | RMD timeline, distribution table, remaining balance after distributions. |
| CAGR | Annualizes start/end values. | High: duplicate of investment return. | Keep route, but add multi-investment compare, inflation-adjusted CAGR, and benchmark. | Return Analysis Studio | CAGR comparison bars, value path line. |
| XIRR | Currently approximate without dated cashflows. | High until actual cashflows exist. | Add dated cashflow table/import, irregular investments, validation, and saved return record. | Return Analysis Studio | Cashflow table/timeline, cumulative invested vs value. |
| Inflation | Projects future cost. | Medium: common but useful. | Add purchasing-power view, goal adjustment, income growth comparison, and save as future goal. | Growth and Goal Studio | Future cost curve, purchasing power decline. |
| Rule of 72 | Estimates years to double. | High: mental math. | Keep educational route, add compare rates, exact doubling calculation, and path to compound calculator. | Return Analysis Studio | Rate vs doubling-time curve. |
| Capital Gains Tax | Applies tax rate to gain. | High: too simplified. | Add basis, holding period, losses, exemption assumptions, and tax-plan note. | Income and Tax Studio | Gain-to-net waterfall, rate sensitivity. |
| GST | Adds GST to pre-tax amount. | High: simple percentage. | Add inclusive/exclusive mode, CGST/SGST/IGST split, invoice-style output, invoice line table, and tax note. | Income and Tax Studio | Tax split cards, invoice table, invoice waterfall. |
| TDS | Applies rate to payment amount. | High: simple percentage. | Add section/rate presets, thresholds, PAN/non-PAN note, section/rate table, and net payment view. | Income and Tax Studio | Section table and gross-to-net payment waterfall. |
| Down Payment | Calculates percent of home price. | High: simple multiplication. | Add savings timeline, monthly deposit schedule, closing costs, PMI threshold, and home goal save. | Growth and Goal Studio and Loan and Home Studio | Down payment progress, deposit table, time-to-target chart. |
| PMI | Estimates monthly PMI. | Medium: useful when tied to LTV. | Add LTV, cancellation point, cancellation schedule, down-payment scenarios, and mortgage integration. | Loan and Home Studio | PMI vs down payment curve, cancellation timeline/table. |
| HELOC | Calculates repayment payment. | Medium: common loan math. | Add draw period, repayment period, variable rate scenarios, home equity limit, and draw/repayment schedule. | Loan and Home Studio | Drawdown/repayment timeline/table, rate sensitivity. |
| Balance Transfer | Compares payoff cost with promo APR and fee. | Low-medium: value improves with promo duration. | Add promo duration, post-promo APR, minimum payment, approval limit, payoff table, and strategy warning. | Debt Payoff Studio | Break-even/payoff timeline/table, cost comparison bars. |
| CD | Projects deposit maturity. | Medium: simple compounding. | Add compounding frequency, laddering, payout/maturity table, early withdrawal penalty, and account save. | Growth and Goal Studio | CD ladder, maturity calendar/table. |
| HYSA | Projects savings growth with deposits. | Medium: useful with goals. | Add variable rate scenario, monthly deposit schedule, emergency fund link, and goal save. | Growth and Goal Studio | Savings balance line, deposit table, contribution/growth split. |
| Life Insurance Needs | Estimates coverage gap. | Medium: less basic than percentage calculators. | Add DIME method, dependents, education costs, existing policies, need component table, and protection goal. | Cashflow and Balance Sheet Studio | Coverage gap waterfall, need table, dependents timeline. |
| Lease vs Buy | Simplified lease vs financing comparison. | High: needs vehicle-specific assumptions. | Add residual value, mileage, fees, taxes, maintenance, resale, annual cost table, and break-even. | Loan and Home Studio | Cumulative cost crossover, annual cost table, ownership value line. |
| ROI | Net gain divided by cost. | High: basic division. | Add time period, all-in cost, payback period, annualized ROI, and scenario comparison. | Return Analysis Studio | ROI waterfall, payback timeline. |

## Implementation Notes

- The first implementation slice should not rewrite every calculator at once. Start with shared metadata and one studio family.
- Phase 17 save flows should be designed once and reused by all studios.
- The Growth and Goal Studio plus Loan and Debt Studio should be first because they have the strongest conversion fit to goals, accounts, plans, and dashboard cards.
- Tax calculators should stay clearly labeled as estimates until statutory engines are robust and tested.
- `src/lib/fire.ts` should remain unchanged unless FIRE behavior is explicitly in scope.
