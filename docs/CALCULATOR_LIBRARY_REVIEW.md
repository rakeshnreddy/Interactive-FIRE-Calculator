# Calculator Library Consolidation Review

Last updated: July 12, 2026

## Review Outcome

FinPath has 82 focused public calculator routes backed by 57 formula types. The number is appropriate for exact questions, but it was not appropriate as the primary browsing model. Showing every route as an equal card made shared mathematics look like duplicate products and forced users to understand the internal taxonomy before they could choose a tool.

The implementation now separates 2 concerns:

- Exact calculator pages keep their stable URL, exact title, route-specific explanation, defaults, scenarios, schedules, FAQs, and save destination.
- The calculator hub presents 8 decision toolkits, with the full route list behind compact progressive disclosure and exact search.

This preserves useful entry points without presenting FinPath as a directory built for rankings. It also avoids collapsing distinct decisions into one ambiguous mega-calculator.

## Toolkit Model

| Toolkit | Route count | User decision | Main shared mathematics |
| --- | ---: | --- | --- |
| Financial Checkup | 4 | Understand current cash flow, net worth, reserves, and protection | Balance sheet, cashflow surplus, coverage multiple, gap analysis |
| Savings & Goals | 11 | Work backward from a target or project recurring savings | Future value, recurring contributions, maturity value, inflation |
| Investment Returns | 5 | Evaluate performance after time and cash flows | CAGR, XIRR approximation, ROI, doubling time |
| Debt Payoff | 5 | Choose a route from balances to zero | Payoff iteration, interest accumulation, strategy ordering, transfer break-even |
| Loans & Payments | 13 | Understand payment, term, rate, fees, and lifetime borrowing cost | Amortization, APR, loan comparison, prepayment |
| Home Buying & Mortgage | 26 | Compare buying cash, monthly ownership cost, and mortgage structures | Mortgage amortization, affordability, refinance, equity, insurance, fees, break-even |
| Income & Tax | 9 | Translate gross amounts into estimated net cash | Slabs/brackets, withholding, exemptions, gross-to-net waterfalls |
| Retirement Planning | 9 | Connect accumulation, income, withdrawals, and benefits | Corpus projection, withdrawal runway, distributions, benefit break-even |

`src/lib/calculatorToolkits.ts` is the source of truth. Its tests require every current calculator to belong to exactly one toolkit and require all featured routes to be valid.

## Similar Formula Review

### Accumulation

Compound interest, SIP, step-up SIP, recurring deposits, 401(k), PPF, EPF, NPS, CD, FD, and HYSA share future-value building blocks. They should share tested engines, timelines, contribution-versus-growth visuals, and schedule components. They should not share one public title because deposit cadence, tax wrapper, employer contribution, annuity allocation, and user terminology change the decision.

### Loans And Mortgages

EMI, mortgage, auto loan, personal loan, home equity, FHA, VA, and amortization routes share payment and balance formulas. The valuable layer is the complete schedule, total cost, fees, insurance, equity, prepayment, and scenario comparison. The hub combines them into 2 toolkits because housing decisions have materially different cash requirements and ownership tradeoffs from general borrowing.

### Payoff And Refinance

Debt payoff, credit card payoff, student loan payoff, mortgage payoff, extra payment, balance transfer, and refinance share payoff or break-even logic. Exact routes remain because the minimum-payment risk, promotional period, closing costs, collateral, and destination workflow differ. Related links keep the comparison close without forcing all inputs into one form.

### Returns

Investment return and CAGR are mathematically close. XIRR adds irregular cash-flow context, ROI removes the time dimension, and Rule of 72 is a quick approximation. They now live together in Investment Returns so users can move from a simple answer to the method that matches their cash flows.

### Income And Tax

Salary, paycheck, income-tax, HRA, GST, TDS, capital-gains, IRA, and RMD calculators all translate gross amounts into a usable net or required amount. They remain separate because the legal assumptions, unit cadence, and explanation are different. All tax outputs remain labeled estimates.

## Route Retention Standard

Keep a route only while it provides distinct decision value through at least 1 of these:

- Different terminology that users genuinely use for a financial product.
- Different required inputs, fees, rules, cadence, or tax wrapper.
- Different output interpretation or next action.
- A route-specific schedule, comparison, example, or assumption set.

Do not add a new route for a synonym alone. Add aliases to keywords and internal search instead. If 2 routes become functionally identical in inputs, output, explanation, and next action, choose a primary route and use a real redirect and canonical migration rather than keeping a thin duplicate.

## UI Review Outcome

The previous interface mixed a dark marketing header, purple accents, a persistent background image, translucent cards, large soft shadows, pill controls, and 20px radii. Individual pieces were usable, but the combined system felt generic and made dense financial workflows look less precise.

The refreshed system uses:

- Neutral green-gray canvases with opaque working surfaces.
- Teal for primary action, blue for comparison data, and warm coral for secondary emphasis.
- An equivalent dark palette with preserved semantic contrast.
- 8px geometry, restrained borders, and minimal shadows.
- Glass only for sticky navigation, search, and primary grouped work surfaces.
- A product-first landing hero with the calculator library as the primary action.
- Persistent system-aware light/dark preference.
- Reduced-motion and reduced-transparency fallbacks.

The visual source of truth is `DESIGN.md`; the strategic and voice source of truth is `PRODUCT.md`.
