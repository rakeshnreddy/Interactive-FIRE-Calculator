# FIRE Assumptions Architecture Decision: New-Default-Only Compatibility & Baseline Simplification

## Context & Problem Statement
Prior to contract B35, the FIRE Calculator initialized with opaque, pre-loaded assumptions:
- Hidden rate periods with optimistic return/inflation assumptions.
- Hidden phantom cash flows:
  - +$50,000 equity vesting in Year 5
  - -$120,000 house upgrade in Year 12
  - +$24,000/yr Social Security bridge in Years 15–30
  - -$12,000/yr healthcare spending bridge in Years 1–8
- Collapsible advanced controls were situated physically and logically *after* the primary Calculate trigger and results cards, creating confusion where users saw outputs influenced by factors they had never selected or inspected.

## Architectural Decisions

### 1. New-Default-Only Compatibility (No Formula Migration)
- **Zero-Mutation Legacy Policy**: Existing saved plans, imported JSON files, and active session drafts are NOT migrated, altered, or retroactively overwritten with 0%/0% rates or cleared cash flows.
- **Pragmatic Scope**: When a saved plan or imported JSON contains custom rate periods, events, or recurring cash flows, the system loads and evaluates them with exact fidelity.
- **Engine Integrity**: `src/lib/fire.ts` and all core actuarial/financial simulation formulas remain 100% byte-identical. No mathematical formulas were rewritten or touched.
- **Pristine New Plan Baseline**: Only freshly initialized plans (`initialPlan`, navigating to fresh calculator session, or clicking "New plan") start with the clean baseline:
  - Single 30-year period at 0.0% nominal return (`r = 0`) and 0.0% inflation (`i = 0`).
  - Empty one-off events (`oneOffEvents: []`).
  - Empty recurring cash flows (`recurringCashFlows: []`).
  - Zero estate target (`desiredFinalValue: 0`).
  - Categorical withdrawal timing (`withdrawalTiming: 'end'`).

### 2. Transparent 0%/0% Baseline Simplification (Not a Forecast)
- **Mathematical Linear Clarity**:
  - For $80,000 annual expense across a 30-year horizon:
    $$\text{Required Portfolio} = 30 \times \$80,000 = \$2,400,000$$
  - For $750,000 initial portfolio across a 30-year horizon:
    $$\text{Sustainable Annual Withdrawal} = \frac{\$750,000}{30} = \$25,000$$
  - The public simulation function `calculateFirePlan` safely handles `r = 0` and `i = 0` without division by zero, NaN, or non-convergence.
- **Clear User Notice**: The UI displays a prominent notice whenever 0%/0% baseline rates are active:
  > *"No growth or inflation assumed — 0.0% is a transparent baseline simplification, not an economic forecast. Adjust return and inflation for your expected asset allocation."*

### 3. Physical & Visual Placement Before Calculate
- `<details className="advanced-shell">` is physically ordered in the DOM *before* `.quick-actions` (`<button>Calculate</button>`).
- The collapsed `<summary>` dynamically discloses the active return/inflation rates, withdrawal timing, estate target, and event counts, ensuring no unseen variables alter calculations.
- Empty states for events and recurring cash flows offer explicit "Add" buttons; new rows initialize with amount 0 and require deliberate user entry.

### 4. Separation of Browser Drafts from Numerical Assumptions
- Save, export, import, and draft tools are decoupled into a dedicated `#saved-plans` utility panel.
- Modifying numerical assumptions marks results as stale (`.is-stale` with banner) until recalculated. Closing or reopening `<details>` never resets entered values.
