# Individual calculator UX review — 2026-09-29

This is the per-route analysis accompanying [the fresh audit](UX_REVIEW_2026-09-29.md). It is **an observation and implementation-scope matrix, not another task-status tracker**. Canonical task status remains in [TASK_STATUS.json](../execution/TASK_STATUS.json).

Coverage: **82 registry entries plus dedicated FIRE = 83 calculator pages**. The library is the 84th calculator smoke route; adding the landing page gives 85 public pages. Five registry routes use dedicated renderers; their old registry input/result metadata is not their live UI contract. All 83 routes were opened at 1440×1000 and 390×844 in light and dark on immutable preview `d0d235df`; all 332 initial layout cases had no page-level horizontal overflow. Source baseline `50d817d` includes cleanup; the observed preview product is `2277b80`. This is not a claim that every financial formula, expanded state, browser engine or accessibility requirement passed. Deep interaction was targeted to FIRE, mortgage, ROI, interest-only, closing costs, HYSA and library navigation; dedicated family source and layouts were also inspected.

Each row retains an existing useful capability, identifies a specific boundary, and proposes a suitable visual/functional improvement. P0 means reproduced financial presentation or rate-basis defect; P1 means high-value comprehension/control or explicit model-scope work; P2 means later depth. Comparator references are dated public page/content inspections, not exhaustive authenticated competitor tests or formula certification. A catalogue reference establishes a comparable job; it does not establish that every suggested feature exists in that competitor. Source authority must match the route's jurisdiction and effective year before statutory changes. The IRS RMD reference is **not** a source for payroll or capital-gains rules; those require their own IRS publications in B49/B50.

- **SEC:** [Investor.gov compound interest](https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator) — checked 2026-09-29.
- **CN:** [Calculator.net mortgage / finance catalogue](https://www.calculator.net/mortgage-calculator.html) — checked 2026-09-29.
- **GW:** [Groww calculator catalogue](https://groww.in/calculators) — checked 2026-09-29.
- **PLAN:** [ProjectionLab public planning/pricing](https://cdn.projectionlab.com/pricing) — checked 2026-09-29.
- **YNAB:** [YNAB public pricing and product boundary](https://www.ynab.com/pricing) — checked 2026-09-29.
- **NET:** [Financial utility reference catalogue](https://www.calculator.net/financial-calculator.html) — checked 2026-09-29.
- **CFPB:** [CFPB home-cost decision guidance](https://www.consumerfinance.gov/owning-a-home/prepare/decide-how-much-you-want-spend/) — checked 2026-09-29.
- **ITD:** [Income Tax Department calculator](https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/income-tax-calculator) — checked 2026-09-29.
- **IRS:** [IRS RMD worksheets (RMD only)](https://www.irs.gov/retirement-plans/plan-participant-employee/required-minimum-distribution-worksheets) — checked 2026-09-29.
- **SSA:** [SSA benefit estimator](https://www.ssa.gov/benefits/retirement/planner/AnypiaApplet.html) — checked 2026-09-29.
- **RMD:** [Investor.gov RMD calculator](https://www.investor.gov/financial-tools-calculators/calculators/required-minimum-distribution-calculator) — checked 2026-09-29.
- **XIRR:** [Microsoft dated XIRR contract](https://support.microsoft.com/en-us/excel/functions/xirr-function) — checked 2026-09-29.
- **APY:** [CFPB annual percentage yield calculation](https://www.consumerfinance.gov/rules-policy/regulations/1030/a/) — checked 2026-09-29.

## Route-by-route findings

### 01. Compound Interest Calculator — `compound-interest`

- **Priority / implementation owner:** P1; [B44](../execution/prompts/B44.md).
- **Current quality / issue:** Strong detailed engine; fourteen settings share a late, closed group.
- **Control and functionality improvement:** Separate timing, costs, purchasing power and future events; show active settings near the answer.
- **Result / visual direction:** Contribution/growth timeline with nominal-versus-real toggle; reuse the existing schedule.
- **Evidence / usage reference:** live route `/calculators/compound-interest`; `src/CompoundInterestCalculator.tsx`; SEC above.

### 02. Savings Goal Calculator — `savings-goal`

- **Priority / implementation owner:** P1; [B44](../execution/prompts/B44.md).
- **Current quality / issue:** Strong solver; contribution frequency, fees and inflation are buried together.
- **Control and functionality improvement:** Put a Customize saving plan link above the fields; keep display separate; offer a calendar deadline as a later contract.
- **Result / visual direction:** Required-versus-current saving pace and target milestone; show the funding gap first.
- **Evidence / usage reference:** live route `/calculators/savings-goal`; `src/SavingsGoalCalculator.tsx`; SEC above.

### 03. Net Worth Calculator — `net-worth`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Useful categorized balance sheet and dated snapshot; a long entry form competes with liquidity insight.
- **Control and functionality improvement:** Keep snapshot date, asset valuation and liability separation visible; make a return-to-update action specific.
- **Result / visual direction:** Assets minus liabilities, liquid share and category bars; history only from genuine saved snapshots.
- **Evidence / usage reference:** live route `/calculators/net-worth`; `src/CashflowPlanningCalculator.tsx`; NET above.

### 04. Budget Calculator — `budget`

- **Priority / implementation owner:** P1; [B44](../execution/prompts/B44.md).
- **Current quality / issue:** Detailed category entry pushes stress comparisons to y=2421 on mobile.
- **Control and functionality improvement:** Move income-loss and flexible-spending controls into a visible named group; separate reference-rate and display settings.
- **Result / visual direction:** Income-to-essential-to-flexible-to-surplus waterfall and a clearly labelled stress gap.
- **Evidence / usage reference:** live route `/calculators/budget`; `src/CashflowPlanningCalculator.tsx`; YNAB above.

### 05. Emergency Fund Calculator — `emergency-fund`

- **Priority / implementation owner:** P1; [B44](../execution/prompts/B44.md).
- **Current quality / issue:** Useful coverage model; shock buffer and income context are at y=1607 on mobile.
- **Control and functionality improvement:** Surface risk context near essential spending; explain why a chosen buffer changes the target.
- **Result / visual direction:** Cash available, coverage months, shortfall and dated funding milestones; avoid a universal recommended months badge.
- **Evidence / usage reference:** live route `/calculators/emergency-fund`; `src/CashflowPlanningCalculator.tsx`; NET above.

### 06. Retirement Calculator — `retirement`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Projection and withdrawal-rate target are bounded; annual contributions are closed and default rates look personal.
- **Control and functionality improvement:** Show sample status and contribution settings; distinguish accumulation from withdrawal-rate target.
- **Result / visual direction:** Projected corpus versus target at the same age, with an explicit gap and editable-rate sensitivity.
- **Evidence / usage reference:** live route `/calculators/retirement`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; PLAN above.

### 07. Debt Payoff Calculator — `debt-payoff`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Useful extra-payment model; default answer and several equal tiles dilute the payoff decision.
- **Control and functionality improvement:** Promote extra monthly/yearly payments with active amounts; make an insufficient payment an explicit outcome.
- **Result / visual direction:** Baseline and accelerated balance paths, payoff months and total interest; keep no-payoff states out of normal charts.
- **Evidence / usage reference:** live route `/calculators/debt-payoff`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 08. Investment Return Calculator — `investment-return`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** CAGR-like return excludes intermediate cash flows, correctly scoped in assumptions.
- **Control and functionality improvement:** Ask whether there were deposits or withdrawals and route to cash-flow return when needed.
- **Result / visual direction:** Annualized versus cumulative return, loss-aware number line and a short cash-flow limitation beside the result.
- **Evidence / usage reference:** live route `/calculators/investment-return`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 09. SIP Calculator — `sip`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Recurring investment works; yearly top-up is closed and an 8% sample can look like a forecast.
- **Control and functionality improvement:** Label sample rate; expose top-up, contribution timing and step-up links without implying guaranteed gains.
- **Result / visual direction:** Contributions versus estimated growth over time; an editable lower-rate comparison, not confidence probabilities.
- **Evidence / usage reference:** live route `/calculators/sip`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 10. Step-up SIP Calculator — `step-up-sip`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Step-up is exposed but its interaction with separate yearly top-up is easy to misunderstand.
- **Control and functionality improvement:** Show starting contribution, year-two contribution and distinct annual top-up in a schedule summary.
- **Result / visual direction:** Actual deposit staircase plus corpus path; reconcile total paid with the schedule.
- **Evidence / usage reference:** live route `/calculators/step-up-sip`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 11. SIP Goal Calculator — `sip-goal`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Generic target solver is less expressive than the dedicated savings-goal route.
- **Control and functionality improvement:** Provide target date, current contribution comparison and a clearly bounded inflation option in its later family contract.
- **Result / visual direction:** Required SIP, current SIP shortfall and contribution/corpus path from the same engine.
- **Evidence / usage reference:** live route `/calculators/sip-goal`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 12. Lumpsum Mutual Fund Calculator — `lumpsum-mutual-fund`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Simple constant-return investment estimate; reinvestment and tax assumptions need prominence.
- **Control and functionality improvement:** Put reinvestment and exclusion of fees/taxes beside the answer; keep optional costs neutral until chosen.
- **Result / visual direction:** Starting principal and gain over time; show nominal and real values only when inflation is explicitly modeled.
- **Evidence / usage reference:** live route `/calculators/lumpsum-mutual-fund`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 13. SWP Calculator — `swp`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Constant withdrawal model omits market sequence risk and inflation-adjusted withdrawals.
- **Control and functionality improvement:** State constant withdrawal and return before the result; spec inflation, timing and horizon controls separately.
- **Result / visual direction:** Remaining corpus and withdrawal timeline; distinguish model cap, depletion and indefinite-runway cases.
- **Evidence / usage reference:** live route `/calculators/swp`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 14. EMI Calculator — `emi`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Fixed-rate loan engine has useful extra payments but long introductory copy precedes entry.
- **Control and functionality improvement:** Use a compact payment form with an obvious Pay extra group; shorten generic helper text.
- **Result / visual direction:** Required EMI, total monthly outflow, principal/interest split and accelerated payoff comparison.
- **Evidence / usage reference:** live route `/calculators/emi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 15. Home Loan EMI Calculator — `home-loan-emi`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** An EMI preset shares fixed-rate math; it does not model every floating-rate Indian home loan.
- **Control and functionality improvement:** State fixed-rate scope and expose prepayment; move unrelated presets below the result.
- **Result / visual direction:** Principal and interest by year plus a prepayment delta; no assumed floating-rate forecast.
- **Evidence / usage reference:** live route `/calculators/home-loan-emi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 16. Car Loan EMI Calculator — `car-loan-emi`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Loan amount preset does not include the purchase-price/down-payment decision.
- **Control and functionality improvement:** Clarify financed amount; draft on-road price, down payment and fees as explicit additions.
- **Result / visual direction:** Payment and total interest first; show optional upfront costs separately from interest.
- **Evidence / usage reference:** live route `/calculators/car-loan-emi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 17. Personal Loan EMI Calculator — `personal-loan-emi`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Fixed EMI is useful; processing fees and quoted-versus-effective cost are outside this preset.
- **Control and functionality improvement:** Add a visible APR comparison link; later add fees with a sourced net-disbursal convention.
- **Result / visual direction:** EMI and interest split; fee-inclusive cost only after its contract exists.
- **Evidence / usage reference:** live route `/calculators/personal-loan-emi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 18. India Income Tax Calculator: Old vs New Regime — `income-tax-india`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Two-regime estimate is useful but broad income input is narrower than a complete tax return.
- **Control and functionality improvement:** Keep effective year, included income types, deductions and exclusions beside the result; do not call the lower result advice.
- **Result / visual direction:** Old/new tax and net-income bars with base tax, rebate/cess components that actually exist.
- **Evidence / usage reference:** live route `/calculators/income-tax-india`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; ITD above.

### 19. India Salary Take-home Calculator — `salary-india`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** CTC estimate uses user-supplied tax/PF percentages rather than a full payroll contract.
- **Control and functionality improvement:** Explain CTC versus gross pay; keep tax and payroll rates visibly editable, with no statutory-accuracy badge.
- **Result / visual direction:** CTC-to-deductions-to-take-home waterfall; label annual and monthly units prominently.
- **Evidence / usage reference:** live route `/calculators/salary-india`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 20. HRA Exemption Calculator — `hra-exemption`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Generic salary exemption cap requires knowledge of eligibility and regime.
- **Control and functionality improvement:** Explain salary basis and selected cap; draft a sourced city/regime choice instead of assuming universal eligibility.
- **Result / visual direction:** HRA received, eligible exemption and taxable HRA bars; show which constraint binds.
- **Evidence / usage reference:** live route `/calculators/hra-exemption`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 21. FD Calculator — `fd`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Annual compounding model is bounded; generic deposit helper incorrectly calls principal recurring.
- **Control and functionality improvement:** Use fixed-deposit-specific copy; specify cumulative versus payout treatment and rate basis before adding frequency.
- **Result / visual direction:** Principal and earned interest at maturity; a schedule only for supported compounding conventions.
- **Evidence / usage reference:** live route `/calculators/fd`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 22. RD Calculator — `rd`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Monthly deposit model and separate annual top-up are useful but not every bank RD contract.
- **Control and functionality improvement:** Explain deposit timing and interest basis; distinguish extra top-up from standard RD installments.
- **Result / visual direction:** Deposits and interest by month, with the maturity amount reconciling exactly.
- **Evidence / usage reference:** live route `/calculators/rd`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 23. PPF Calculator — `ppf`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Editable illustrative rate and annual contribution model are not a live statutory eligibility engine.
- **Control and functionality improvement:** Keep benchmark date and limitations visible; draft contribution-date timing and limits from official sources.
- **Result / visual direction:** Personal contributions versus modeled growth; do not imply quarterly rate changes are forecast.
- **Evidence / usage reference:** live route `/calculators/ppf`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 24. EPF Calculator — `epf`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Employee/employer contributions are separately entered but the model does not allocate all statutory pension components.
- **Control and functionality improvement:** Keep EPS omission near the answer; explicit optional salary-growth/PF-basis contract later.
- **Result / visual direction:** Separate employee/employer/growth components; only show allocation categories actually modeled.
- **Evidence / usage reference:** live route `/calculators/epf`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 25. NPS Calculator — `nps`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Editable annuity allocation and rate are meaningful; defaults are not universal exit rules.
- **Control and functionality improvement:** Separate accumulation from annuity allocation and pension estimate; source sector/exit distinctions before implementing them.
- **Result / visual direction:** Corpus split into lump sum/annuity plus pension estimate; display annuity-rate sensitivity separately.
- **Evidence / usage reference:** live route `/calculators/nps`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 26. Gratuity Calculator — `gratuity`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Salary and service-years estimate needs applicability and eligibility context.
- **Control and functionality improvement:** Show eligible salary basis, modeled cap and service treatment; source any expanded rounding rules.
- **Result / visual direction:** Simple entitlement estimate and salary/years drivers; a chart is optional here.
- **Evidence / usage reference:** live route `/calculators/gratuity`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 27. Home Loan Prepayment Calculator — `home-loan-prepayment`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Chart starts at 6000000 and lasts 180 months although the prepayment result pays off in 153 months.
- **Control and functionality improvement:** Derive the visual from the actual prepayment schedule; preserve immediate prepayment versus extra recurring payments.
- **Result / visual direction:** Before/after balance paths starting from the correct post-payment balance, with reconciled interest saved.
- **Evidence / usage reference:** live route `/calculators/home-loan-prepayment`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 28. Home Loan Foreclosure Calculator — `home-loan-foreclosure`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** The shared amortization preview can ignore the full immediate foreclosure payment.
- **Control and functionality improvement:** Chart must terminate at foreclosure; separately disclose any unmodeled lender charges.
- **Result / visual direction:** Balance before payment, amount paid and zero remaining balance; never a fictional continuing debt path.
- **Evidence / usage reference:** live route `/calculators/home-loan-foreclosure`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 29. Home Loan Balance Transfer Calculator India — `home-loan-balance-transfer-india`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Refinance savings use a common term and financed fees; zero break-even can mislead when savings are nonpositive.
- **Control and functionality improvement:** Clarify remaining/new term and fee treatment; use No break-even in this model where appropriate.
- **Result / visual direction:** Net cumulative savings and crossover date, including fees; no default invented amortization context.
- **Evidence / usage reference:** live route `/calculators/home-loan-balance-transfer-india`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 30. Flat vs Reducing Interest Rate Calculator — `flat-vs-reducing-rate`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Equal nominal rates compare structures but do not establish equivalent effective costs.
- **Control and functionality improvement:** Explain what is held equal; draft equivalent-rate/APR calculation as a separate sourced feature.
- **Result / visual direction:** Payment/total-interest comparison bars, not an unrelated loan-balance path.
- **Evidence / usage reference:** live route `/calculators/flat-vs-reducing-rate`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 31. Loan Eligibility Calculator India — `loan-eligibility-india`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** FOIR-style target is a user-selected approximation rather than an approval decision.
- **Control and functionality improvement:** Call the output a modeled borrowing limit and keep income/debt assumptions visible.
- **Result / visual direction:** Obligation capacity, chosen ratio and implied principal; avoid an eligibility or approval guarantee.
- **Evidence / usage reference:** live route `/calculators/loan-eligibility-india`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 32. Stamp Duty and Registration Calculator — `stamp-duty-registration`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Visual invents a five-year loan at the stamp-duty rate; no loan term was entered.
- **Control and functionality improvement:** Replace the invented loan with entered property-value/rate cost decomposition; state jurisdiction assumptions.
- **Result / visual direction:** Stamp duty plus registration equals total; no time axis or cumulative mortgage interest.
- **Evidence / usage reference:** live route `/calculators/stamp-duty-registration`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 33. Mortgage Payment Calculator — `mortgage`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Housing costs and extra payments share one closed group; primary payment initially excludes housing costs.
- **Control and functionality improvement:** Separate Full housing cost from Pay extra, show omitted-cost status, and lower unrelated preset chips.
- **Result / visual direction:** P&I plus taxes/insurance/HOA component bar; separate required housing outflow from accelerated debt payment.
- **Evidence / usage reference:** live route `/calculators/mortgage`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 34. Mortgage Affordability Calculator — `mortgage-affordability`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** A modeled debt-ratio limit is not approval or a complete household affordability budget.
- **Control and functionality improvement:** Keep front/back debt ratios and excluded housing expenses next to the estimate; source any new policy controls.
- **Result / visual direction:** Income allocation and loan/home-price capacity; show omitted cash-to-close and reserves explicitly.
- **Evidence / usage reference:** live route `/calculators/mortgage-affordability`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CFPB above.

### 35. Mortgage Refinance Calculator — `mortgage-refinance`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Fees are financed and a common term is reused; payment savings alone can hide extended interest cost.
- **Control and functionality improvement:** Make fee financing explicit and draft independent remaining/new terms; show no-break-even cases honestly.
- **Result / visual direction:** Cumulative net savings and total-cost comparison over the chosen holding period.
- **Evidence / usage reference:** live route `/calculators/mortgage-refinance`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 36. Amortization Schedule Calculator — `amortization`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Detailed table exists; five sampled balance bars are less useful than the full payment story.
- **Control and functionality improvement:** Keep yearly/monthly detail and export; show active extra payments above the chart.
- **Result / visual direction:** Balance line plus principal/interest stacked bars from the actual schedule; final balance and totals reconcile.
- **Evidence / usage reference:** live route `/calculators/amortization`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 37. Extra Mortgage Payment Calculator — `extra-mortgage-payment`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Extra payments are the main job but live in the closed optional group.
- **Control and functionality improvement:** Make extra monthly payment a visible primary field on this route; yearly extra can remain disclosed.
- **Result / visual direction:** Interest/time saved beside baseline/accelerated paths; reveal non-amortizing payment states.
- **Evidence / usage reference:** live route `/calculators/extra-mortgage-payment`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 38. Mortgage Payoff Calculator — `mortgage-payoff`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Payoff calculator and extra-payment preset overlap; choices should follow the question.
- **Control and functionality improvement:** Make current payment and optional acceleration obvious; preserve URL while reducing duplicate navigation.
- **Result / visual direction:** Payoff date or duration, interest saved and current-versus-extra path.
- **Evidence / usage reference:** live route `/calculators/mortgage-payoff`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 39. Biweekly Mortgage Payment Calculator — `biweekly-mortgage-payment`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Headline accelerates repayment, while the generic chart still shows the standard 360-month path.
- **Control and functionality improvement:** Reuse the modeled thirteen-payment convention and disclose servicer-posting approximation.
- **Result / visual direction:** Standard versus accelerated paths ending at their actual payoff months.
- **Evidence / usage reference:** live route `/calculators/biweekly-mortgage-payment`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 40. Mortgage Recast Calculator — `mortgage-recast`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Result recasts to 250000; chart still starts at 300000.
- **Control and functionality improvement:** Derive the after-recast visual from the principal after payment and its actual schedule.
- **Result / visual direction:** Upfront principal reduction, new payment and optional acceleration, each separately labeled.
- **Evidence / usage reference:** live route `/calculators/mortgage-recast`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 41. Mortgage Points Calculator — `mortgage-points`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Monthly savings and break-even matter more than a generic loan path; no-benefit cases return zero months.
- **Control and functionality improvement:** Replace zero/no-benefit ambiguity with a semantic no-break-even state under a sourced contract.
- **Result / visual direction:** Upfront points versus cumulative savings and crossover, with holding-period context.
- **Evidence / usage reference:** live route `/calculators/mortgage-points`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 42. 15 vs 30 Year Mortgage Calculator — `15-vs-30-year-mortgage`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Option A/B labels hide the meaningful term choice; a single loan path underrepresents the comparison.
- **Control and functionality improvement:** Name options by term and rate; show payment burden alongside lifetime interest.
- **Result / visual direction:** Two aligned balance paths and payment/interest bars on consistent axes.
- **Evidence / usage reference:** live route `/calculators/15-vs-30-year-mortgage`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 43. ARM Mortgage Calculator — `arm-mortgage`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** First reset is modeled, not index/margin/caps or subsequent resets.
- **Control and functionality improvement:** Expose initial period and assumed reset rate beside payment shock; source future cap controls separately.
- **Result / visual direction:** Payment step at reset and remaining-balance path from the same schedule.
- **Evidence / usage reference:** live route `/calculators/arm-mortgage`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CFPB above.

### 44. Interest Only Mortgage Calculator — `interest-only-mortgage`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Headline retains 300000 principal but the displayed chart amortizes it to zero.
- **Control and functionality improvement:** Keep interest-only principal constant; identify any amortizing alternative as a separate comparison.
- **Result / visual direction:** Interest payments and unchanged principal; never label an amortizing path as the chosen result.
- **Evidence / usage reference:** live route `/calculators/interest-only-mortgage`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 45. Balloon Loan Calculator — `balloon-loan`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Balloon obligation deserves more emphasis than the generic fully amortizing path.
- **Control and functionality improvement:** Show balloon date/amount as a primary risk and derive the chart through that date.
- **Result / visual direction:** Remaining balance up to the balloon, with an explicit unpaid obligation marker.
- **Evidence / usage reference:** live route `/calculators/balloon-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 46. Closing Costs Calculator — `closing-costs`

- **Priority / implementation owner:** P0; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Chart invents a 450000 five-year loan at the 3% closing-cost rate.
- **Control and functionality improvement:** Remove the loan path and show the actual cash-to-close components.
- **Result / visual direction:** Down payment plus closing costs equals cash to close; estimated fees are not interest.
- **Evidence / usage reference:** live route `/calculators/closing-costs`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 47. Escrow Calculator — `escrow`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Tax/insurance reserve calculation receives an irrelevant amortization chart.
- **Control and functionality improvement:** Separate HOA if outside escrow and label reserve versus total housing payment.
- **Result / visual direction:** Property-tax, insurance and HOA components with monthly/annual units; no loan timeline.
- **Evidence / usage reference:** live route `/calculators/escrow`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 48. Debt-to-Income Ratio Calculator — `debt-to-income`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Ratio calculator draws a zero-principal five-year loan; fixed benchmark can look like approval.
- **Control and functionality improvement:** Replace empty loan graphic; disclose chosen benchmark and gross income basis.
- **Result / visual direction:** Debt/income ratio bar with explicit values and text, no eligibility green light.
- **Evidence / usage reference:** live route `/calculators/debt-to-income`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CFPB above.

### 49. Loan Comparison Calculator — `loan-comparison`

- **Priority / implementation owner:** P1; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Independent rates/terms exist; the chosen tradeoff is hidden under generic A/B labels.
- **Control and functionality improvement:** Name each offer, expose fees as a separate future contract, and keep rates/terms equal only if entered.
- **Result / visual direction:** Payment, total interest and principal balance for both offers; no single implied winner.
- **Evidence / usage reference:** live route `/calculators/loan-comparison`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 50. APR Calculator — `apr`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** The fee-inclusive APR estimate deserves separation from note rate and displayed loan-balance context.
- **Control and functionality improvement:** Explain included finance charges and assumptions; do not claim lender disclosure equivalence.
- **Result / visual direction:** Note rate versus estimated APR and net disbursal/fee components, with calculation limitations.
- **Evidence / usage reference:** live route `/calculators/apr`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CFPB above.

### 51. Home Equity Loan Calculator — `home-equity-loan`

- **Priority / implementation owner:** P2; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Fixed-rate installment estimate is useful, not a borrowing-limit or CLTV model.
- **Control and functionality improvement:** State fixed repayment scope; keep collateral/borrowing-limit analysis a separate contract.
- **Result / visual direction:** Payment and interest schedule with visible extra payments; do not imply a lender valuation.
- **Evidence / usage reference:** live route `/calculators/home-equity-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 52. FHA Loan Calculator — `fha-loan`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Editable fee and insurance assumptions are simplified, not a current eligibility/rate-table engine.
- **Control and functionality improvement:** Keep rate inputs and excluded housing costs visible; source duration and fee applicability before expansion.
- **Result / visual direction:** P&I, mortgage-insurance and financed-fee components; reconcile chart principal with financed balance.
- **Evidence / usage reference:** live route `/calculators/fha-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 53. VA Loan Calculator — `va-loan`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Funding-fee assumption varies by borrower context and fee treatment.
- **Control and functionality improvement:** Expose fee assumption and exemption limitation; source first/subsequent-use rules separately.
- **Result / visual direction:** Financed balance and funding fee; chart must begin at financed principal, not raw home price.
- **Evidence / usage reference:** live route `/calculators/va-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 54. FHA vs Conventional Loan Calculator — `fha-vs-conventional`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Flat insurance comparison omits several eligibility and duration rules.
- **Control and functionality improvement:** Keep both option assumptions visible; do not imply qualification or lender matching.
- **Result / visual direction:** Like-for-like monthly components and total costs under the stated horizon.
- **Evidence / usage reference:** live route `/calculators/fha-vs-conventional`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 55. Rent vs Buy Calculator — `rent-vs-buy`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Ownership rate and equity are already modeled; appreciation, selling costs and opportunity cost are still bounded.
- **Control and functionality improvement:** Show included versus excluded ownership costs; add missing friction only through explicit contracts.
- **Result / visual direction:** Cumulative net costs and equity separately; compare over the entered stay, not the loan term.
- **Evidence / usage reference:** live route `/calculators/rent-vs-buy`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 56. Credit Card Payoff Calculator — `credit-card-payoff`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Fixed APR/payment works but minimum-only paths, new spending and daily posting are not modeled.
- **Control and functionality improvement:** Expose extra payments and no-payoff warning; draft varying minimum-payment rules separately.
- **Result / visual direction:** Balance/payoff timeline and total interest, with no fabricated payoff date.
- **Evidence / usage reference:** live route `/calculators/credit-card-payoff`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 57. Debt Snowball vs Avalanche Calculator — `debt-snowball-avalanche`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Three fixed debt slots are a useful start but dense entry hides the strategy comparison.
- **Control and functionality improvement:** Use debt rows with editable names and a later add/remove contract; keep one identical payment budget.
- **Result / visual direction:** Both strategy paths, payoff order and interest delta; never mix different total budgets.
- **Evidence / usage reference:** live route `/calculators/debt-snowball-avalanche`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 58. Auto Loan Calculator — `auto-loan`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Fixed financed amount is narrower than an out-the-door vehicle buying decision.
- **Control and functionality improvement:** Clarify loan amount; draft taxes, trade-in and down payment independently of current engine.
- **Result / visual direction:** Payment/interest and financed-versus-upfront cash; preserve fixed-loan scope.
- **Evidence / usage reference:** live route `/calculators/auto-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 59. Personal Loan Calculator — `personal-loan`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Quoted installment estimate excludes origination fees and net proceeds.
- **Control and functionality improvement:** Link to fee-inclusive APR and make omissions visible; draft fee treatment explicitly.
- **Result / visual direction:** Required payment and total interest; no implicit all-in cost until fees are modeled.
- **Evidence / usage reference:** live route `/calculators/personal-loan`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 60. Student Loan Payoff Calculator — `student-loan-payoff`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Fixed-loan payoff estimate does not cover income-driven repayment or forgiveness.
- **Control and functionality improvement:** Promote extra payments, preserve scope caveat, and use official pathways for excluded programs.
- **Result / visual direction:** Fixed repayment path and acceleration delta; no eligibility or forgiveness promise.
- **Evidence / usage reference:** live route `/calculators/student-loan-payoff`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 61. 401(k) Calculator — `401k`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** A generic savings projection lacks employer-match and contribution-limit modeling.
- **Control and functionality improvement:** State projection scope at the answer; source match/vesting/catch-up controls before building them.
- **Result / visual direction:** Employee contribution, employer match only if implemented, and growth paths.
- **Evidence / usage reference:** live route `/calculators/401k`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; PLAN above.

### 62. Roth vs Traditional IRA Calculator — `roth-vs-traditional-ira`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Equal current out-of-pocket basis is already modeled; eligibility and contribution limits are separate.
- **Control and functionality improvement:** Show matched basis and both tax-rate assumptions near the comparison; no universal Roth recommendation.
- **Result / visual direction:** Current tax cost and after-tax outcomes for both options; sensitivities hold the contribution basis fixed.
- **Evidence / usage reference:** live route `/calculators/roth-vs-traditional-ira`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; PLAN above.

### 63. Paycheck Calculator — `paycheck`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** An entered withholding percentage is not a complete federal/state payroll calculation.
- **Control and functionality improvement:** Label modeled withholding; keep frequency/pre/post-tax deductions clear and do not imply W-4 accuracy.
- **Result / visual direction:** Gross-to-deductions-to-net waterfall with annual/per-paycheck units and a sourced official-tool link.
- **Evidence / usage reference:** live route `/calculators/paycheck`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; IRS above.

### 64. US Federal Income Tax Estimator — `income-tax-us`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Single-filer estimate has a state/local placeholder; no broad filing-status/payroll-tax coverage.
- **Control and functionality improvement:** Put tax year, filing status and excluded credits/payroll taxes beside the result; preserve placeholder labeling.
- **Result / visual direction:** Federal/state-placeholder/net components; never combine monthly and annual values on one axis.
- **Evidence / usage reference:** live route `/calculators/income-tax-us`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; IRS above.

### 65. Social Security Break-even Calculator — `social-security-break-even`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Entered benefit amounts and delay are a simplified cumulative comparison, not a benefit estimator.
- **Control and functionality improvement:** Show benefit source and excluded COLA/tax/survivor effects; use the SSA tool for benefit estimation.
- **Result / visual direction:** Cumulative benefits with clear start/delay ages and intersection; no optimal-claim-age advice.
- **Evidence / usage reference:** live route `/calculators/social-security-break-even`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; SSA above.

### 66. Required Minimum Distribution Calculator — `rmd`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Bare IRS divisor input requires users to already know their table and age treatment.
- **Control and functionality improvement:** Keep manual mode honest; source a later age/account-type selector and prior-year balance date.
- **Result / visual direction:** Distribution and remaining balance, with divisor provenance; avoid a decorative retirement-growth path.
- **Evidence / usage reference:** live route `/calculators/rmd`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; RMD above.

### 67. CAGR Calculator — `cagr`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Useful endpoint return calculation; not valid for a cash-flow investment without adjustments.
- **Control and functionality improvement:** Explain when CAGR is appropriate and offer the cash-flow-return route.
- **Result / visual direction:** Cumulative/annualized growth side by side; accept legitimate loss-ending values where supported.
- **Evidence / usage reference:** live route `/calculators/cagr`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 68. Monthly IRR Calculator (XIRR-style) — `xirr`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Current title correctly says monthly IRR/XIRR-style; dated irregular XIRR is not implemented.
- **Control and functionality improvement:** Preserve honest monthly mode; draft an explicit dated-cash-flow mode with imported/exported dates and ambiguity handling.
- **Result / visual direction:** Cash-flow timeline and rate estimate with solver status; no probability or unique-root claim.
- **Evidence / usage reference:** live route `/calculators/xirr`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; XIRR above.

### 69. Inflation Calculator — `inflation`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Steady-rate future cost is useful; purchasing-power direction is easy to confuse.
- **Control and functionality improvement:** Add a clearly separated future-cost versus present-purchasing-power mode only through a tested contract.
- **Result / visual direction:** Today/future value and loss of purchasing power, with the chosen horizon/rate visible.
- **Evidence / usage reference:** live route `/calculators/inflation`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 70. Rule of 72 Calculator — `rule-of-72`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** One-number approximation is an educational utility, not a precise investment projection.
- **Control and functionality improvement:** Explain approximation and optionally compare exact doubling time; handle zero/negative rates explicitly.
- **Result / visual direction:** Number line or compact exact-versus-approximate comparison; no chart required for a single result.
- **Evidence / usage reference:** live route `/calculators/rule-of-72`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 71. Capital Gains Tax Calculator — `capital-gains-tax`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Entered effective tax rate is a planning multiplication, not a complete jurisdiction/asset tax engine.
- **Control and functionality improvement:** Make user-selected rate and excluded loss/netting/holding-period rules explicit.
- **Result / visual direction:** Gain, estimated tax and net gain waterfall; no statutory-rate claim from a default 15%.
- **Evidence / usage reference:** live route `/calculators/capital-gains-tax`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; IRS above.

### 72. GST Calculator — `gst`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Pre-tax amount plus entered GST rate covers one direction only.
- **Control and functionality improvement:** State exclusive-of-tax mode; draft inclusive/exclusive toggle with a sourced reverse-tax contract.
- **Result / visual direction:** Base, GST and gross amount decomposition; no loan or time-series visual.
- **Evidence / usage reference:** live route `/calculators/gst`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 73. TDS Calculator — `tds`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Rate and exempt amount are a generic estimate, not a section/threshold selection engine.
- **Control and functionality improvement:** Label user-chosen rate and scope; source any section/year presets before introducing them.
- **Result / visual direction:** Taxable base, withheld amount and net payment, with threshold context if actually modeled.
- **Evidence / usage reference:** live route `/calculators/tds`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; ITD above.

### 74. Down Payment Calculator — `down-payment`

- **Priority / implementation owner:** P2; [B47](../execution/prompts/B47.md).
- **Current quality / issue:** Percentage-to-cash utility is useful but not the full purchase cash requirement.
- **Control and functionality improvement:** Keep closing costs and reserves separate and link to savings-goal/cash-to-close.
- **Result / visual direction:** Down payment and financed amount component bar; no fabricated savings timeline.
- **Evidence / usage reference:** live route `/calculators/down-payment`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 75. PMI Calculator — `pmi`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Flat annual rate estimate does not model removal schedules or insurer-specific pricing.
- **Control and functionality improvement:** State quoted-rate basis and omitted cancellation rules; source any new schedule.
- **Result / visual direction:** Monthly PMI plus LTV and mortgage payment components; no generic imagined payoff.
- **Evidence / usage reference:** live route `/calculators/pmi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 76. HELOC Calculator — `heloc`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Current route is a fixed repayment-stage installment model, not a full revolving draw-period HELOC.
- **Control and functionality improvement:** Name repayment-only scope prominently; draft draw phase, variable rate and fees separately.
- **Result / visual direction:** Repayment schedule only under current scope; future draw/repay phases require their own engine.
- **Evidence / usage reference:** live route `/calculators/heloc`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 77. Balance Transfer Calculator — `balance-transfer`

- **Priority / implementation owner:** P1; [B49](../execution/prompts/B49.md).
- **Current quality / issue:** Promo duration and post-promo payoff already exist; registry assumption still says promo lasts until payoff.
- **Control and functionality improvement:** Correct contradictory assumptions; expose post-promo rate treatment instead of silently implying it.
- **Result / visual direction:** Balance at promo end, transfer fee and cumulative cost versus staying; retain the phase boundary.
- **Evidence / usage reference:** live route `/calculators/balance-transfer`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 78. CD Calculator — `cd`

- **Priority / implementation owner:** P2; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** APY uses annual growth correctly; generic helper wrongly calls deposit principal recurring.
- **Control and functionality improvement:** Use CD-specific principal/term copy and show liquidity/penalty exclusions; do not convert APY again.
- **Result / visual direction:** Principal plus interest at maturity; rate-basis label and term are sufficient for the basic model.
- **Evidence / usage reference:** live route `/calculators/cd`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; SEC above.

### 79. HYSA Calculator — `hysa`

- **Priority / implementation owner:** P0; [B48](../execution/prompts/B48.md).
- **Current quality / issue:** APY label feeds nominal rate/12 compounding; default source and hosted output are 30519 instead of 30468.78 under effective APY.
- **Control and functionality improvement:** Correct HYSA-only rate semantics through the written migration decision; preserve other compound routes.
- **Result / visual direction:** Actual deposit/growth path and annual effective yield, with every output/export using the same basis.
- **Evidence / usage reference:** live route `/calculators/hysa`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; APY above.

### 80. Life Insurance Needs Calculator — `life-insurance-needs`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Simple income-replacement gap is an estimate with substantial household context missing.
- **Control and functionality improvement:** Show resources/liabilities/support years and exclusions; source existing cover, inflation and discounting controls before expansion.
- **Result / visual direction:** Resources versus estimated need and gap; never imply a coverage recommendation or premium quote.
- **Evidence / usage reference:** live route `/calculators/life-insurance-needs`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; NET above.

### 81. Lease vs Buy Calculator — `lease-vs-buy`

- **Priority / implementation owner:** P1; [B50](../execution/prompts/B50.md).
- **Current quality / issue:** Same financing/cost structure as rent-buy; vehicle depreciation and resale equity are not fully represented.
- **Control and functionality improvement:** Use vehicle-specific labels and disclose resale treatment; spec down payment, fees and residual values separately.
- **Result / visual direction:** Cumulative cash costs and residual equity on consistent terms, not a home-purchase amortization analogy.
- **Evidence / usage reference:** live route `/calculators/lease-vs-buy`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; CN above.

### 82. ROI Calculator — `roi`

- **Priority / implementation owner:** P1; [B45](../execution/prompts/B45.md).
- **Current quality / issue:** Negative net gain is silently clamped to zero in the UI, producing 0% instead of a loss.
- **Control and functionality improvement:** Allow negative net gain where formula supports it; preserve blank edits and explicit invalid-cost handling.
- **Result / visual direction:** Signed ROI and gain/cost decomposition; show a zero baseline and loss in text, not color alone.
- **Evidence / usage reference:** live route `/calculators/roi`; `src/CalculatorLibrary.tsx + src/lib/seoCalculators.ts`; GW above.

### 83. FIRE Calculator — `fire`

- **Priority / implementation owner:** P1; [B43](../execution/prompts/B43.md).
- **Current quality / issue:** Required rates are already visible and blank; advanced summary repeats unset status and expanded period 1 displays zeroes.
- **Control and functionality improvement:** Keep OD-1; replace duplicated state with clear optional-section summaries and visible customization entry above the form.
- **Result / visual direction:** Target, current gap, accumulation versus drawdown, and active assumption summary; preserve existing age/withdrawal mechanics.
- **Evidence / usage reference:** live route `/calculators/fire`; `src/App.tsx`; PLAN above.
