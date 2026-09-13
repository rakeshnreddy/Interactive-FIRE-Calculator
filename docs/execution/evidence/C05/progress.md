# C05 Progress Digest & Verification Record

- **Checkpoint**: C05 (Dedicated calculator families)
- **Status**: Rework Complete — Ready for Primary Review (Tasks B22, B23, B24)
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

---

## Status Ledger

| Task | Title | Status | Code SHA | Local Tests | Hosted Preview | Blocked Items |
|---|---|---|---|---|---|---|
| **B22** | Unify compound-interest and savings-goal presentation | ready_for_review | `1c73bff` | 92/92 pass | Verified on `46714a3f` | Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |
| **B23** | Unify budget, net-worth and emergency-fund presentation | ready_for_review | `1c73bff` | 36/36 pass | Verified on `46714a3f` | Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |
| **B24** | Refine FIRE calculator into flagship decision experience | ready_for_review | `1c73bff` | 27/27 pass | Verified on `46714a3f` | Screen-reader deferred to B31 per `ACCESSIBILITY_DEFERRALS.md` |

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
- **Problem**: Previous collector toggled attributes on `document.documentElement` instead of `.app[data-mode]`, accepted default "Estimated net worth" as a deficit pass, lacked real keyboard actions, and reported exit code 0 even when checks failed.
- **Resolution**:
  - Created `docs/execution/evidence/C05/verify_hosted_c05.cjs`:
    - Theme switching uses `finpath.colorMode` and verifies `.app[data-mode]`, contrasting canvas background and text colors, and ensures distinct screenshot SHA-1 hashes.
    - Deficit testing uses real Playwright input fill setting liabilities to $1,000,000, asserting exact title (`Estimated net deficit`), label (`Net deficit (liabilities exceed assets)`), and value (`-$775,000`), explicitly rejecting default non-deficit states.
    - Real keyboard Tab/Shift+Tab, Enter/Space, Escape actions recorded and tested for focus movement and sticky navigation occlusion.
    - CDP media emulation tests prefers-reduced-motion (0 running animations/transitions) and prefers-reduced-transparency (opaque backgrounds with alpha 1).
    - Pixel-level WCAG AA contrast measured via Sharp (`measureContrastPixels`) across rendered text against composed background pixels (light mode 5.48, dark mode 9.24, exceeding the 4.5 threshold).
    - Native zoom 200% truthfully reported as `BLOCKED` with explicit reason (`Interactive desktop Chrome CUA application zoom is unavailable in headless CLI`).
    - Evaluator enforces fail-closed execution: exits 0 on PASS, 1 on FAIL, 2 on BLOCKED.
  - Created comprehensive negative test suite `docs/execution/evidence/C05/test_evaluator_c05.cjs`:
    - 25 defect regression tests covering missing cases, duplicate IDs, theme mismatch, identical screenshot hashes, false-pass default deficit, R1/R2/R3 defects, contrast threshold, and blocked zoom. All 25 passed cleanly.
- **Verification**:
  - Ran `test_evaluator_c05.cjs`: 25/25 negative tests passed.
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
