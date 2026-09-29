# C09 Keyboard Collector Repair Note

- **Date**: 2026-09-25
- **Author**: Gemini (Implementation & Test Worker)
- **Reviewer**: Astra (Sole Architect & Final Reviewer)
- **Target Candidate**: `5dda3d2be24246e3470a65e7653a0b6e425cbece`
- **Preview**: `https://51acbf88.interactive-fire-calculator.pages.dev`

## Summary of Root Cause & Repair

1. **Root Cause**:
   - In the initial hosted run preserved at `docs/execution/evidence/C09/history/5dda-keyboard-fail/`, all B10, B11, and B28 assertions passed and database cleanup succeeded with 0 rows across all 15 tables.
   - However, the evaluator failed closed because `keyboard_navigation_accessible` was `false`.
   - The traversal helper in `run_c09_proofs.mjs` was restricted to 15 forward `Tab` presses and 10 reverse `Shift+Tab` presses. Because prior viewport and theme checks interacted with elements in the header actions / `<main>`, sequential tab navigation through the page required ~30 steps to wrap around to the Workspace navigation button (`button[aria-controls="desktop-workspace-navigation"]`). The 15-tab window stopped prematurely at 14 focused controls.

2. **Collector Repair (`run_c09_proofs.mjs`)**:
   - Expanded forward Tab traversal to a bounded budget of up to 120 tabs (`maxTabs = 120`), covering standard document tab traversal.
   - Implemented DOM-path cycle detection (`tagName:nth-of-type` canonical path keys stored in a `visitedKeys` Set). If tab navigation completes a full document cycle or enters a focus trap without finding the target, traversal terminates immediately without latency.
   - Preserved all strict behavioral requirements: visible focus outline/ring verification, deterministic keyboard activation (`Enter` => `aria-expanded="true"` and dropdown visible), and dismissal (`Escape` => `aria-expanded="false"` and dropdown hidden), with no programmatic focus or mouse clicks.

3. **Behavioral Test Suite (`run_c09_proofs.test.mjs`)**:
   - Added Test 20: Verified target Workspace button positioned at step 30 (beyond the old 15-tab window) is focused and activated by keyboard navigation.
   - Added Test 21: Verified unreachable target terminates via cycle detection (<= 10 tabs) and fails closed in the evaluator.
   - All 24 unit/collector tests pass cleanly (`node --test docs/execution/evidence/C09/run_c09_proofs.test.mjs`, exit 0, ~107ms duration).

4. **Scope Boundaries**:
   - Zero changes to product code (`src/`, `functions/`).
   - Zero changes to approvals, ledgers, or historical evidence.
   - Single-run hosted proof re-execution remains gated for Astra.
