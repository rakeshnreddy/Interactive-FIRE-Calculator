# Assumptions Backlog: Prioritized Calculator Family Improvement Tasks

**Date:** September 2026
**Status:** Queued Post-B35 Contract Milestones
**Scope Notice:** Architecture backlog for subsequent contract milestones. None of these tasks modify code or tests within B35. Core financial math formulas are preserved by default; improvements focus on optional richer controls, transparent assumption disclosures, and tailored visual presentations without inventing external constants or statutory cadences.

---

## Task Family 1: Borrowing & Housing Family Slice: Integrated Optional Escrow & Friction Disclosures

- **Problem**: Base loan and mortgage calculators (`mortgage`, `home-loan-emi`, `emi`, `car-loan-emi`, `auto-loan`, `personal-loan`) compute monthly payments using pure Principal & Interest ($P \times r / (1 - (1+r)^{-n})$). Prospective borrowers, particularly first-time homebuyers, often mistake pure P&I for their total monthly housing outlay, which also includes property taxes, homeowner's insurance, and HOA dues.
- **Source Evidence**:
  - `src/lib/seoCalculators.ts:413` (`mortgage`), `seoCalculators.ts:381–384` (`emi`, `home-loan-emi`), and `seoCalculators.ts:638–660` (`case 'loan'`).
  - Assumption text states: `"Taxes, insurance, fees, and variable-rate changes are excluded."`
  - *Distinction from existing companion coverage:* The suite already provides dedicated calculators that model friction costs—`closing-costs` (`seoCalculators.ts:426`), `escrow` (`seoCalculators.ts:427`), `pmi` (`seoCalculators.ts:479`), `apr` (`seoCalculators.ts:430`), `mortgage-refinance` (`seoCalculators.ts:415`), `fha-loan` (`seoCalculators.ts:432`), and `va-loan` (`seoCalculators.ts:433`). The gap is that base P&I calculators do not offer an optional integrated escrow preview or direct companion cross-links.
- **User Outcome**: Users get complete clarity on P&I vs Total Housing Cost without being overwhelmed by mandatory complex fields. The clean P&I calculation remains the default baseline; an optional collapsible section enables users to input their estimated property tax, insurance, or HOA reserves, or to jump directly to dedicated escrow and closing cost tools.
- **Scope**:
  - Add an optional collapsible `<details className="calculator-options-shell">` section to base mortgage tools for "Estimated Escrow & Housing Costs" (Property Tax % and Annual Insurance amount).
  - When enabled, display a secondary metric showing "Total Monthly Housing Outflow (P&I + Escrow)".
  - Display an explicit disclosure badge: `"Principal & Interest only; property taxes, homeowners insurance, and HOA dues excluded by default."`
  - Add contextual cross-links to `/calculators/escrow`, `/calculators/closing-costs`, and `/calculators/pmi`.
- **Non-Goals**:
  - Altering the standard `loanPayment` mathematical formula.
  - Scraping live lender APR feeds or asserting fixed typical closing fee dollar amounts.
  - Making escrow inputs mandatory.
- **Files**: `src/lib/seoCalculators.ts`, `src/CalculatorLibrary.tsx`, `src/lib/calculatorStudios.ts`, `src/lib/calculatorContent.ts`.
- **Acceptance Criteria**:
  1. Default P&I monthly payment output remains identical to existing baseline.
  2. When optional escrow fields are filled, total monthly outflow reflects $P\&I + Escrow$ without altering amortized interest or loan balance calculations.
  3. When escrow fields are empty or zero, result explicitly highlights that taxes and insurance are excluded.
  4. Contextual links to companion tools (`escrow`, `closing-costs`) render clearly.
- **Meaningful Tests**: Unit tests in `src/borrowingCalculators.test.ts` verifying that default P&I amortization matches standard financial tables, and that optional escrow increments cash outflow linearly without corrupting loan principal reduction.
- **Privacy**: Calculation runs entirely in client-side React state, with signed-out drafts stored in local browser storage (`finpath.calculatorDraft.v1`). If a signed-in user explicitly clicks "Save result", calculation inputs and summary metrics are transmitted to the authenticated FinPath backend via `onSaveResult`; no background telemetry or third-party analytics are added.
- **Dependencies**: None.
- **Visual Presentation Fitted to That Formula**: A stacked visual breakdown card showing P&I alongside optional escrow components, coupled with an amortization chart focusing strictly on loan principal reduction.

---

## Task Family 2: Retirement & Wealth Drawdown Family Slice: SWP & Retirement Sequence Risk Transparency

- **Problem**: Systematic Withdrawal Plan (`swp`, `seoCalculators.ts:380`) and `retirement` (`seoCalculators.ts:330`) calculate portfolio longevity using a deterministic constant annual return ($r/12$ monthly yield). In actual financial markets, returns are volatile; early-year negative returns (sequence-of-returns risk / SORR) can permanently deplete a portfolio decades earlier than deterministic straight-line compounding suggests. The current UI presents a single straight-line runway curve without visual distinction between a deterministic projection and variable real-world outcomes.
- **Source Evidence**:
  - `src/lib/seoCalculators.ts:1505–1522` (`withdrawalRunway`):
    ```typescript
    while (currentBalance > 0 && months < 1200) {
      currentBalance = currentBalance * (1 + monthlyRate) - withdrawal;
      months += 1;
      if (currentBalance > 0 && monthlyRate >= 0 && currentBalance * monthlyRate >= withdrawal) {
        return { endingBalance: currentBalance, months: 1200 };
      }
    }
    ```
  - `src/lib/seoCalculators.ts:894–902`: The only stated assumption is `"Market sequence risk is not modeled."`
- **User Outcome**: Users planning retirement withdrawals see their starting annual withdrawal percentage as a descriptive mathematical ratio ($Withdrawal \times 12 / Corpus \times 100\%$) alongside the deterministic runway metric. The interface clearly labels the baseline projection as deterministic and enables users to inspect optional, specifically defined stress sequences to observe sensitivity to timing, without implying safety judgments or making unsupported statistical confidence claims.
- **Scope**:
  - Add a descriptive "Starting Annual Withdrawal Ratio" metric ($Withdrawal \times 12 / Corpus \times 100\%$) alongside the runway metric, presenting it strictly as a factual ratio without normative safety ratings.
  - Visibly label baseline results as a "Deterministic Baseline Projection" ($r/12$ monthly yield).
  - Add an optional stress scenario toggle in `calculatorStudios.ts` showing a specifically defined stress sequence (e.g., deterministic scenario with 0% or negative return in early periods followed by baseline return), clearly labeled by its explicit parameter values.
  - Add an explicit disclosure note: *"Runway reflects a constant-rate deterministic projection; actual longevity depends on return timing and market fluctuations."*
  - Expand explanatory narrative in `calculatorContent.ts` to articulate sequence-of-returns risk and explain why straight-line projections differ from volatile market experiences.
  - *Non-immediate / future hypothesis:* Any future normative withdrawal threshold or safety boundary is strictly deferred; it requires primary-source empirical financial research and architect/owner review prior to user-facing implementation.
- **Non-Goals**:
  - Replacing the deterministic runway calculation as the baseline formula.
  - Presenting deterministic projection lines as statistical confidence intervals or probabilistic distributions.
  - Implementing Monte Carlo simulations or asserting universal "safe" withdrawal rate thresholds without empirical citation and architect review.
  - Using color-only cues or subjective risk badges (e.g. green/red "safe" vs "danger") to imply financial judgment.
  - Providing personalized asset allocation or financial advice.
- **Files**: `src/lib/seoCalculators.ts`, `src/lib/calculatorStudios.ts`, `src/lib/calculatorContent.ts`, `src/CalculatorLibrary.tsx`.
- **Acceptance Criteria**:
  1. Baseline deterministic runway math remains intact for consistency.
  2. Starting annual withdrawal ratio displays as a descriptive percentage metric ($Withdrawal \times 12 / Corpus \times 100\%$).
  3. Baseline output and optional stress scenarios are visibly labeled as deterministic models; no lines are labeled as confidence intervals or statistical probabilities.
  4. Explanatory text clearly notes that straight-line returns do not reflect market volatility or sequence risk.
  5. No universal safety thresholds, subjective risk judgments, or color-only warning states are presented.
- **Meaningful Tests**: Unit tests in `src/retirementCalculators.test.ts` verifying runway math with 0% return ($Corpus / Withdrawal$), high returns ($\ge 1200$ month cap), and accurate starting withdrawal ratio percentage formatting.
- **Privacy**: Calculation runs entirely in client-side React state, with signed-out drafts stored in local browser storage (`finpath.calculatorDraft.v1`). If a signed-in user explicitly clicks "Save result", calculation inputs and summary metrics are transmitted to the authenticated FinPath backend via `onSaveResult`; no background telemetry or third-party analytics are added.
- **Dependencies**: Internal studio charting components.
- **Visual Presentation Fitted to That Formula**: Drawdown balance trajectory chart displaying the deterministic baseline alongside an optional specifically defined stress sequence curve, with both lines clearly identified by their mathematical return parameters. No shaded confidence zones, probabilistic bands, or color-only risk indicators.

---

## Task Family 3: India Statutory Schemes Family Slice: PPF, EPF & Small Savings Assumption Provenance

- **Problem**: Public Provident Fund (`ppf`, `seoCalculators.ts:390`) and Employees' Provident Fund (`epf`, `seoCalculators.ts:391`) hardcode baseline interest rates (`7.1%` and `8.0%` respectively). Without explicit provenance disclosures, users may mistakenly treat these default values as legally guaranteed current rates or financial advice. Conversely, inventing synthetic government update badges or unverified revision cadences creates false confidence.
- **Source Evidence**:
  - `src/lib/seoCalculators.ts:390`: PPF input default rate is literally `7.1%`.
  - `src/lib/seoCalculators.ts:391, 145`: EPF imports generic `termInputs` default rate of `8%`.
  - `src/lib/seoCalculators.ts:1016–1033`: Formulas compute annuity due for PPF and monthly compound growth for EPF without institutional attribution.
- **User Outcome**: Users understand that pre-filled rates are editable illustrative planning baselines, can adjust rates freely to model potential rate changes, and can restore baseline defaults with a single click.
- **Scope**:
  - Update input helper text with clear, factual assumption labeling:
    - PPF: *"Illustrative planning benchmark rate. Fully editable."*
    - EPF: *"Illustrative planning benchmark rate. Fully editable."*
  - Add a "Reset to Benchmark" button next to statutory rate input fields to restore the repository default.
  - In EPF, explicitly disclose that the formula combines employee and employer contributions into a single compound corpus, omitting statutory pension allocations (such as the Employees' Pension Scheme / EPS), as exact pension allocation rules and statutory ceilings are unmodeled in source and require separate official-source verification.
  - Strictly prohibit fabricated quarterly effective badges, unverified statutory numbers, or claims of automated official gazette synchronization.
- **Non-Goals**:
  - Scraping government gazettes or asserting unverified statutory revision cadences.
  - Building dynamic legislative rule engines for statutory pension diversion schemes.
  - Providing legal, tax filing, or personalized investment advisory services.
- **Files**: `src/lib/seoCalculators.ts`, `src/lib/calculatorContent.ts`, `src/CalculatorLibrary.tsx`.
- **Acceptance Criteria**:
  1. Helper text explicitly identifies rates as illustrative planning assumptions.
  2. Rates remain fully editable by the user, with a functional "Reset to Benchmark" button.
  3. EPF assumption disclosures clearly state that pension allocation (such as EPS) is unmodeled in the formula and requires official-source verification.
  4. No fictitious quarterly badges, unverified statutory numbers, or claims of live gazette synchronization appear.
- **Meaningful Tests**: Unit tests in `src/indiaCalculators.test.ts` verifying PPF annuity due formula ($P \times [((1+r)^n - 1)/r] \times (1+r)$), EPF monthly compounding, and reset-to-benchmark functionality.
- **Privacy**: Calculation runs entirely in client-side React state, with signed-out drafts stored in local browser storage (`finpath.calculatorDraft.v1`). If a signed-in user explicitly clicks "Save result", calculation inputs and summary metrics are transmitted to the authenticated FinPath backend via `onSaveResult`; no background telemetry or third-party analytics are added.
- **Dependencies**: None.
- **Visual Presentation Fitted to That Formula**: Milestone accumulation chart showing total personal contributions vs accrued growth over the planning horizon.

---

## Task Family 4: Comparative Decisions Family Slice: Rent vs. Buy & Lease vs. Buy Friction Assumptions

- **Problem**: `rent-vs-buy` (`seoCalculators.ts:435, 1057–1066`) compares monthly rent directly to home purchase financing cost using pure mortgage P&I ($loanPayment(Price - Down, Rate, Years)$). Although the assumptions text mentions that taxes, maintenance, and insurance are not fully modeled, comparing pure P&I directly against rent creates an artificially favorable impression of homeownership. Similarly, `lease-vs-buy` (`seoCalculators.ts:485, 1125–1135`) compares lease payments to loan payments without accounting for residual vehicle equity.
- **Source Evidence**:
  - `src/lib/seoCalculators.ts:1058–1065`: `buyMonthly = loanPayment(HomePrice - DownPayment, Rate, Years)` and outputs `buyMonthly - rent` as the headline difference.
  - Stated assumption: `"Taxes, maintenance, insurance, transaction costs, and appreciation are not fully modeled."`
- **User Outcome**: Prospective homebuyers and vehicle buyers receive an honest, balanced comparison that contrasts monthly cash flows alongside critical unmodeled friction costs, avoiding false financial optimism.
- **Scope**:
  - In `rent-vs-buy`, add an optional collapsible "Ownership Frictions" panel (estimated property tax rate %, annual homeowner's insurance, and annual maintenance reserve %) that updates an estimated "Total Monthly Homeowner Cost".
  - Add prominent cross-links to companion `/calculators/escrow` and `/calculators/closing-costs`.
  - In `lease-vs-buy`, add a visual disclosure card explaining that while monthly loan payments are typically higher, the purchased vehicle retains residual equity at loan payoff, whereas lease payments yield zero asset equity.
- **Non-Goals**:
  - Complex localized property tax and home appreciation rate scraping by zip code.
  - Multi-asset macroeconomic opportunity cost simulation.
  - Depreciation forecasting for specific vehicle makes and models.
- **Files**: `src/lib/seoCalculators.ts`, `src/lib/calculatorStudios.ts`, `src/lib/calculatorContent.ts`, `src/CalculatorLibrary.tsx`.
- **Acceptance Criteria**:
  1. Base P&I vs Rent cash-flow comparison remains accessible and clear.
  2. Enabling optional ownership frictions updates total monthly cost transparently.
  3. Narrative clearly highlights that homeownership entails non-recoverable friction costs (taxes, maintenance, insurance) not present in rent.
  4. Companion cross-links to escrow and closing costs are active.
- **Meaningful Tests**: Unit tests in `src/comparativeCalculators.test.ts` verifying rent vs buy differences with and without friction adjustments.
- **Privacy**: Calculation runs entirely in client-side React state, with signed-out drafts stored in local browser storage (`finpath.calculatorDraft.v1`). If a signed-in user explicitly clicks "Save result", calculation inputs and summary metrics are transmitted to the authenticated FinPath backend via `onSaveResult`; no background telemetry or third-party analytics are added.
- **Dependencies**: Internal studio components.
- **Visual Presentation Fitted to That Formula**: Side-by-side comparison cards (Tenant Cash Flow vs Homeowner Total Outflow) with an explanatory breakdown distinguishing equity-building principal from unrecoverable frictions.

---

## Task Family 5: Execution & Interaction Alignment Slice: Reactive Debouncing & Stale State Indicators

- **Problem**: Unlike the flagship FIRE calculator (`src/App.tsx:8328–8342`), which uses an explicit `Calculate` button and displays a stale badge when inputs change, generic SEO calculators recalculate synchronously via `useMemo` on every keystroke (`CalculatorLibrary.tsx:474`). When users enter multi-digit values (e.g. typing "300000" starting with "3"), intermediate states flash on screen, causing rapid re-renders of charts, 360-month amortization schedules, and transient zero-division warnings.
- **Source Evidence**:
  - `src/CalculatorLibrary.tsx:462–475`: `useState(values)` directly feeds `useMemo(scenarioValues)` and `useMemo(calculateSeoCalculator)` on line 474 synchronously on every input change.
- **User Outcome**: Smooth, professional user interaction without erratic number flashing, layout shifts, or performance stuttering during rapid numeric input, while maintaining instant responsiveness.
- **Scope**:
  - Implement a lightweight, client-side input debounce (150–250ms) for computationally heavy calculations (such as `amortization`, `debt-snowball-avalanche`, and `apr`).
  - Add subtle visual calculation status (smooth transition) so the user knows results are synchronized.
  - Guard against transient invalid intermediate values (e.g. term = 0 or rate = 0) with graceful fallback placeholders rather than NaN or 1200-month cap warnings.
- **Non-Goals**:
  - Forcing an explicit manual button on simple 1-step calculators (like `rule-of-72` or `inflation`).
  - Server-side calculation offloading.
  - Adding external third-party debounce libraries.
- **Files**: `src/CalculatorLibrary.tsx`, `src/lib/seoCalculators.ts`.
- **Acceptance Criteria**:
  1. Rapid numeric typing does not produce visual flashing or render errors.
  2. Computationally heavy amortization tables update cleanly after input settles.
  3. No changes to core formula calculation logic.
- **Meaningful Tests**: Component tests using `@testing-library/user-event` simulating rapid keystroke sequences and confirming stable final renders without intermediate error states.
- **Privacy**: Debouncing and state management operate strictly in client-side React component state. For signed-in users, saved result transmission occurs only upon explicit user save action via `onSaveResult` to the authenticated backend; no analytics or telemetry events are fired during keystroke debouncing.
- **Dependencies**: Existing React primitives (`useState`, `useEffect`, `useMemo`).
- **Visual Presentation Fitted to That Formula**: Clean metric cards with smooth value transitions and subtle non-blocking status badges when calculating large schedules.
