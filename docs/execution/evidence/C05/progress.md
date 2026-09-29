# C05 Progress Digest & Verification Record

- **Checkpoint**: C05 (Dedicated calculator families)
- **Status**: Verification Rework Complete — Tasks B22, B23, B24 Blocked on Native Zoom 200% (Headless CLI limitation); Stop for Primary Review
- **Task Sequence**: B22 → B23 → B24
- **Branch**: `codex/finpath-quality-execution` (PR #140)
- **Base Commit**: `8d9a4c4b6fc52e6900222a76f2df6355694c9d96`
- **Candidate Code Commit**: `1c73bffbb4a5d1f179d67f2934c900a8b44711e5` (`commit_dirty: false`)
- **Immutable Preview URL**: `https://46714a3f.interactive-fire-calculator.pages.dev`
- **Preview Deployment ID**: `46714a3f-4559-40eb-97b9-cdc43d0e8808`
- **Isolated Preview Database**: `0dbad68e-7493-452f-8504-98d4c61ee5da` (binding verified, fail-closed auth preserved)
- **Asset Correspondence**: 100% match between local build and deployed bundle (`docs/execution/evidence/C05/asset-hashes.json`)
- **Public Smoke Tests**: 84/84 public calculator routes verified without authentication (`docs/execution/evidence/C05/hosted-smoke.log`)
- **Full Test Suite**: `./scripts/test_all.sh` executed with exit code 0 (`docs/execution/evidence/C05/full-suite.log`)
  - 13 runner integration tests
  - 79 Python tests + 21 subtests
  - TypeScript typecheck (0 errors)
  - 39 Vitest files (1,551 tests pass)
  - Vite production build (0 errors)
- **CI Run**: [34786143969](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34786143969) (succeeded)

---

## Status Ledger

| Task | Title | Status | Code SHA | Local Tests | Hosted Preview | Blocked Items |
|---|---|---|---|---|---|---|
| **B22** | Unify compound-interest and savings-goal presentation | blocked | `1c73bff` | 92/92 pass | Verified on `46714a3f` | Blocked on native-zoom-200 (headless CLI lacks interactive desktop Chrome CUA application zoom); Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |
| **B23** | Unify budget, net-worth and emergency-fund presentation | blocked | `1c73bff` | 36/36 pass | Verified on `46714a3f` | Blocked on native-zoom-200 (headless CLI lacks interactive desktop Chrome CUA application zoom); Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |
| **B24** | Refine FIRE calculator into flagship decision experience | blocked | `1c73bff` | 27/27 pass | Verified on `46714a3f` | Blocked on native-zoom-200 (headless CLI lacks interactive desktop Chrome CUA application zoom); Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |

---

## Consolidated Repairs (R1–R5)

### R1 — Unique Field IDs and Correct Label Activation (P1)
- **Problem**: Repeated period controls in `Field` (`src/App.tsx`) derived IDs from `field-${fieldSlugify(label)}`, causing ID collisions across multi-period inputs, recurring rows, and scenario fields. On the preview, clicking the second "Years" label focused the first period input.
- **Resolution**:
  - Replaced label-derived fallback in `Field` with React 18 `useId()`:
    ```tsx
    const autoId = useId().replace(/[^a-zA-Z0-9_-]/g, '_');
    const resolvedId = childId || (id ? id : `field-${fieldSlugify(label || 'input')}-${autoId}`);
    ```
  - Preserved explicit `childId` and `id` callers so existing programmatic associations are respected.
  - Linked helper and issue text IDs directly to `${resolvedId}-help` and `${resolvedId}-issue`.
- **Verification**:
  - Added unit regression tests in `src/FireCalculator.test.tsx` verifying:
    - Default multi-period inputs render distinct DOM IDs (`field-years-_...`, `field-annual-return-_...`, `field-inflation-_...`).
    - Clicking the second "Years" label activates and focuses the second period input.
    - Adding and removing periods maintains distinct IDs.
  - Live hosted verification (`fire-r1-unique-ids` in `verify_hosted_c05.cjs`) verified 0 duplicate IDs and confirmed clicking second Years label focuses the second period input.

### R2 — Truthful Help Disclosure State (P2)
- **Problem**: In `src/styles.css`, `.info-tip:hover .info-popover` and `.info-tip:focus-within .info-popover` kept the popover visible (`opacity: 1`) whenever the trigger button or popover had focus, regardless of React's `isOpen` state. Triggering Enter twice set `aria-expanded=false` while the tooltip visually remained open.
- **Resolution**:
  - Removed hover and `:focus-within` CSS visibility overrides from `src/styles.css`.
  - Reconciled disclosure state onto `isOpen` as the single source of truth:
    - Popover visibility controlled via `.info-popover.is-visible` matching `aria-expanded={isOpen}`.
    - Keyboard interactions: Enter/Space toggles `isOpen`, Escape dismisses and explicitly preserves focus on the trigger button.
    - When closed, `.info-popover` computes to `opacity: 0` and `pointer-events: none`, even when the trigger button retains keyboard focus.
- **Verification**:
  - Added interaction tests in `src/FireCalculator.test.tsx` testing keyboard focus, Enter toggle, Escape dismiss, and focus retention on the trigger.
  - Live hosted verification (`fire-r2-infotip-popover` in `verify_hosted_c05.cjs`) verified Enter twice closes the tooltip (`opacity: 0`), Escape dismisses while retaining focus on the info button, and `aria-expanded` strictly mirrors visual visibility.

### R3 — Consistent Stale Calculation Boundary (P2)
- **Problem**: Changing inputs (e.g., withdrawal timing) after calculation produced a split state: projection rows were frozen on `activeResultForDisplay`, but the withdrawal timing pill rendered live uncalculated draft `plan.withdrawalTiming`. Furthermore, scenario comparisons recalculated against live draft inputs rather than the snapshot.
- **Resolution**:
  - Updated `src/App.tsx` line 7945 to derive the timing badge from `activePlanForDisplay.withdrawalTiming`:
    ```tsx
    {activePlanForDisplay.withdrawalTiming === 'start' ? 'Start-year' : 'End-year'}
    ```
  - Updated scenario comparison in `src/App.tsx` line 5846 (`comparisonRows`) to evaluate scenarios against `activePlanForDisplay` and `activeResultForDisplay`, ensuring base results and comparisons derive consistently from the calculation snapshot.
  - Calculation snapshot consistently governs result hero, timing badges, projection rows, and comparisons until the user clicks "Recalculate".
  - Recalculation clears the stale state and recalculates fresh results across all panels.
- **Verification**:
  - Added unit regression tests in `src/FireCalculator.test.tsx` verifying:
    - Changing withdrawal timing after calculation leaves the pill reflecting the snapshotted plan.
    - Recalculation updates the pill and clears the `.stale-result-badge`.
  - Live hosted verification (`fire-r3-stale-timing-pill` and `fire-stale-result-recalculate` in `verify_hosted_c05.cjs`) verified that draft changes do not alter the snapshot pill and that recalculation cleanly synchronizes state.

### R4 — Truthful Collector and Fail-Closed Evaluator (P1)
- **Problem**: Evaluator previously accepted missing critical observations/pairs, comparison checks lacked numeric verification against fixed engine values, keyboard navigation lacked full calculator route coverage and real key journeys, and contrast targets lacked coverage of changed hero and stale badge results.
- **Resolution**:
  - **R4a — Evaluator Schema Validation & Fail-Closed Enforcement**:
    - `evaluateC05Results` strictly verifies schema: `native-zoom-200` requires a non-empty `observations` array with `route`, `theme`, `viewport`, `zoomPercent: 200`, `proofReference`, and no clipping/overflow. Status PASS without observations fails immediately.
    - `contrast-check` requires non-empty `pairs` array covering all 8 targets across light and dark modes, finite actual ratios and thresholds, correct threshold validation (3.0 for large, 4.5 for normal text), valid RGB colors, and dynamically derives minima rather than trusting caller summaries.
    - Negative test suite `test_evaluator_c05.cjs` expanded to 37 regression tests covering every failure mode (missing observations, empty arrays, missing targets/themes, NaN/null ratio, low ratio with high claimed min, wrong thresholds, falsely claimed large text, invalid colors, zoom clipping/overflow, missing proof reference). All 37 pass.
  - **R4b — Numeric Scenario Comparison Verification**:
    - Live hosted verification captures exact numeric scenario values:
      - Initial / Stale plan: Base `$1,301,620`, Guardrail `$1,537,155` (`+$235,535`), Upside `$1,124,161` (`-$177,459`).
      - Modifier edit (`-10%` Guardrail spending reduction): Base remains `$1,301,620`, Guardrail updates to `$1,443,890` (`+$142,270`), delta against same base.
      - Recalculation (Start-year timing): Base `$1,389,105`, Guardrail `$1,518,061` (`+$128,956`), stale badge cleared.
      - Withdrawal mode: Verified base `$47,979`, recalculation `$50,882`.
    - Unit tests in `src/FireCalculator.test.tsx` strengthened with exact numeric scenario comparisons matching fixed engine expectations.
  - **R4c — Comprehensive Keyboard Journeys Across 6 Routes**:
    - Real browser Tab and Shift+Tab journeys implemented across all 6 calculators (`compound-interest`, `savings-goal`, `net-worth`, `budget`, `emergency-fund`, `fire`).
    - Key-triggered disclosure expansion via Enter on `<summary>` / details elements tested.
    - Active element focus and sticky topbar clearance verified across 120 focused controls with 0 occlusions.
  - **R4d — Actual Composed Pixel Contrast Across 8 Targets**:
    - Measured actual rendered targets in both light and dark modes using pixel-composed Sharp screenshot buffers:
      1. `scope-note`: Light 5.48:1, Dark 9.24:1 (>= 4.5)
      2. `form-label`: Light 5.74:1, Dark 8.07:1 (>= 4.5)
      3. `help-popover`: Light 11.78:1, Dark 11.72:1 (>= 4.5)
      4. `hero-result`: Light 14.37:1, Dark 14.65:1 (>= 3.0)
      5. `dedicated-warning` (`.warning-card strong`): Light 14.37:1, Dark 14.65:1 (>= 4.5)
      6. `dedicated-result`: Light 14.37:1, Dark 14.65:1 (>= 3.0)
      7. `hero-result-stale` (with 0.92 opacity composition): Light 11.29:1, Dark 12.56:1 (>= 3.0)
      8. `stale-result-badge` (composed text): Light 11.89:1, Dark 11.13:1 (>= 4.5)
    - Derived normal text minimum: 5.48:1 (threshold 4.5:1).
    - Derived large text minimum: 11.29:1 (threshold 3.0:1).
- **Verification**:
  - Ran `test_evaluator_c05.cjs`: 37/37 negative tests passed.
  - Ran `evidence/C05-second-review/omission-reproductions.cjs`: both failure modes properly fail-closed with clear error messages.
  - Ran `verify_hosted_c05.cjs` against `https://46714a3f.interactive-fire-calculator.pages.dev`:
    - 19 automated cases: PASS
    - 1 mandatory check (`native-zoom-200`): BLOCKED (headless CLI limitation)
    - 0 console errors, 0 page exceptions
    - Overall verdict: BLOCKED (exit code 2) recorded in `hosted-browser.json`.

### R5 — Final Candidate and Immutable Preview Provenance (P1)
- **Problem**: Previous deployment record had `commit_hash: 8d9a4c4`, `commit_dirty: true`, failing to prove candidate correspondence.
- **Resolution**:
  - Built clean candidate commit `1c73bffbb4a5d1f179d67f2934c900a8b44711e5` (`commit_dirty: false`).
  - Published to Cloudflare Pages preview:
    - Preview URL: `https://46714a3f.interactive-fire-calculator.pages.dev`
    - Deployment ID: `46714a3f-4559-40eb-97b9-cdc43d0e8808`
    - Branch: `codex/finpath-quality-execution`
    - Provider Source SHA: `1c73bffbb4a5d1f179d67f2934c900a8b44711e5`
    - Commit Dirty: `false`
    - Isolated D1 Database: `0dbad68e-7493-452f-8504-98d4c61ee5da`
  - Validated local vs remote asset correspondence (`asset-hashes.json`):
    - `index-FXZW_ti4.js`: `2c4e96f2...` (match: true)
    - `index-Bq8yRH0L.css`: `493d5aee...` (match: true)
    - `jsx-runtime-CdvZGgm7.js`: `85fda29e...` (match: true)
  - Smoke verified 84/84 public routes without auth (`hosted-smoke.log`).
- **Verification**:
  - `docs/execution/evidence/C05/deployment.json` captures exact provider metadata.
  - `docs/execution/evidence/C05/asset-hashes.json` confirms binary asset correspondence.

---

## Artifact Index

- **Deployment Record**: `docs/execution/evidence/C05/deployment.json`
- **Asset Correspondence**: `docs/execution/evidence/C05/asset-hashes.json`
- **Hosted Smoke Log**: `docs/execution/evidence/C05/hosted-smoke.log`
- **Full Test Suite Log**: `docs/execution/evidence/C05/full-suite.log`
- **Truthful Hosted Evaluation**: `docs/execution/evidence/C05/hosted-browser.json`
- **Evaluator Script**: `docs/execution/evidence/C05/verify_hosted_c05.cjs`
- **Evaluator Negative Tests**: `docs/execution/evidence/C05/test_evaluator_c05.cjs`
- **Screenshots**:
  - `hosted-compound-interest-390-light.png` / `dark.png`
  - `hosted-savings-goal-390-light.png` / `dark.png`
  - `hosted-net-worth-390-light.png` / `dark.png`
  - `hosted-budget-390-light.png` / `dark.png`
  - `hosted-emergency-fund-390-light.png` / `dark.png`
  - `hosted-fire-desktop-light.png` / `dark.png`
  - `hosted-fire-stale-state-desktop.png`
