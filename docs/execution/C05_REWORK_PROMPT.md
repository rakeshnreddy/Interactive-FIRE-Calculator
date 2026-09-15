# C05 consolidated repair — implementing agent

Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` on `codex/finpath-quality-execution`, PR140. Inspect actual HEAD, working tree, applicable AGENTS.md, and `reviews/C05.md` before editing. Preserve unrelated work. Read `C05_START_PROMPT.md`, task prompts B22/B23/B24, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md and ACCESSIBILITY_DEFERRALS.md. C05 alone is released for this repair; C06 is locked. You implement and verify; only primary closes tasks.

## Scope and sequence

Keep the accepted C04 work, B22 compact headers/16px inputs, B23 deficit/reserve labels and existing engines. Repair B24 behavior and C05 evidence. Do not redesign the product, change formulas/src/lib/fire.ts, add services/dependencies, merge main or publish production. Free isolated previews only. Actual screen-reader checks are deferred to B31; keyboard/labels/zoom/contrast are not deferred.

First perform a capability check for actual native Chrome UI zoom and screenshot capture. A lower-cost model with interactive browser/CUA access can perform it; the model's price is not the capability gate. If unavailable, record this early, continue all independent fixes and tests, and submit BLOCKED only for the exact remaining mandatory check. Never use page scale, device scale or narrower viewport as native zoom proof. Do not ask the expensive primary to rerun the entire matrix.

### R1 — unique field IDs and correct label activation

Files: src/App.tsx Field, repeated callers, src/FireCalculator.test.tsx.
1. Write a regression against current code: default repeated period controls have unique IDs, every label.control is its own intended input, help/error ID references resolve uniquely. Test second-row label activation, adding/removing events/recurring rows and scenario fields. Demonstrate the intended failure first.
2. Replace the label-derived fallback with a stable per-instance unique identity (React's existing useId is suitable in this React18 codebase), while preserving explicit child/caller IDs and existing described-by associations. Do not use random values or a render-time global counter. Avoid broader Field redesign.
3. Verify the DOM has no duplicate field/help/error IDs in both modes and expanded advanced/compare states. Clicking each repeated label must target that row's input. Deferring actual-reader smoke does not waive label correctness.

### R2 — truthful help disclosure state

Files: src/App.tsx InfoTip, src/styles.css info-tip rules, focused interaction tests.
1. Reproduce with Current age help: focus, Enter twice, wait for transitions. Current aria-expanded=false conflicts with computed tooltip opacity1 because :focus-within forces visibility.
2. Use one coherent source of truth for visible disclosure and aria-expanded. Enter/Space toggles, Escape dismisses while focus remains on the trigger. After closing, focus alone must not reopen it. If hover behavior remains, reconcile it with the same state; do not leave contradictory CSS triggers.
3. Preserve input aria-describedby and associated help text. Test open/close through actual keyboard events and computed visibility, including Escape, in both themes. An attribute-only assertion is insufficient. Do not require a screen reader for this task.

### R3 — consistent stale result boundary

Files: src/App.tsx snapshot/display derivations, projection metadata, compare/export paths and interaction tests.
1. Calculate, change withdrawal timing, view Results: current code freezes projection rows but reads the new plan.withdrawalTiming for the pill. Comparison also recalculates from live plan while hero remains frozen. Add failing tests exposing the old/new mixture.
2. Retain one coherent last-calculated snapshot for result values, warnings, projection rows and their timing metadata. For Compare, either base it consistently on that snapshot or clearly separate/live-label it; select the smallest consistent behavior and document it. Test editing scenario modifiers and base inputs without confusing them.
3. CSV must describe the same projection shown. Preserve editable input drafts and existing plan JSON/save semantics, explicitly distinguishing input-draft export from calculated-output export where necessary. Do not silently save mismatched result/input pairs. No API or formula change is expected.
4. Cover both FIRE modes, recalculation clearing stale state, mode switch, restored draft, projection basis, comparison and CSV. Assert numeric values/metadata, not just presence of the badge. Retain approved golden engine outputs.

### R4 — evidence must observe real behavior and fail closed

Files: evidence/B22/verify_b22.cjs, B23/verify_b23.cjs, B24/verify_b24.cjs and C05/verify_hosted_c05.cjs (or one shared maintained collector plus thin entry points).
1. Reuse the proven C04 collector/evaluator patterns where applicable instead of inventing another permissive harness. Theme: use finpath.colorMode before navigation or the actual toggle; assert .app[data-mode], computed canvas/text colors and requested/observed match. Never manufacture React state by changing DOM attributes. Light/dark screenshot pairs must show genuinely different themes.
2. Use actual labelled-input fill/keyboard events for deficit fixtures. Fix independent inputs to produce a known negative result; assert exact headline/sign/value from established engine expectations and a positive control. Remove the fallback that accepts 'Estimated net worth' as a deficit pass.
3. Keyboard: record actual Tab/Shift+Tab and Enter/Space/Escape actions for changed input/help/disclosure/Calculate flows. Assert focus and resulting state. Verify no focused control is hidden behind sticky navigation.
4. Media: assert the query matches AND observe animation/transition suppression and opaque no-blur material behavior in both themes. Contrast: use actual composed backgrounds and foreground opacity for changed text/controls, record ratios and relevant thresholds (normal text4.5, large text3, applicable UI boundaries3). Missing target, missing pixel dependency or guessed color must fail/block, never pass.
5. Native zoom: real browser UI200% proof, route/theme/viewport, input/result/expanded-state screenshots and observed no clipping or page-level horizontal scroll. Capture only relevant browser proof; crop unrelated tabs/profile data. If unavailable, BLOCKED with no contradictory 'manual verified' claim.
6. For B22 timing/schedule disclosures, opening and observing their intended content must pass individually; counting arbitrary details elements is insufficient. Cover task-required zero/blank/invalid/long/warning states, edit/reset/share/export, both FIRE modes and draft/compare. Use synthetic fixtures; injected component tests may cover save failure logic but still inspect its rendered message. Do not add hosted auth bypasses or real-account writes. State reasoned N/A for genuinely unaffected criteria.
7. Pure evaluator and CLI must enforce the expected route/theme/case set, required typed observations, nonempty measurements, zero console/page errors and all required statuses. Return0 only on complete PASS,1 on FAIL,2 on genuine mandatory BLOCKED. Persist the same verdict before exit. Write negative tests FIRST for missing cases/fields, wrong theme, default non-deficit, missing timing/schedule, low contrast, media behavior failure, page error and blocked zoom. Invoke the actual CLI, not a toy substitute. Never hardcode success or treat screenshot creation as validation.

### R5 — final candidate and immutable preview

The previous deployment record says commit8d9a4c4/dirty=true; it cannot establish db6b9e3 correspondence. Do not relabel it as clean.
1. After repairs, run focused tests and ./scripts/test_all.sh with strict exit capture. Record logs/counts. Audit dependencies only if changed. Run diff checks. Commit bounded product repairs and tooling with accurate names.
2. Build/publish from the clean final candidate on the authorized preview branch. Preserve verified isolated DB0dbad68e-7493-452f-8504-98d4c61ee5da and fail-closed auth. Record actual provider deployment trigger SHA and dirty flag, plus local/deployed asset correspondence. No main/default production shortcut.
3. Run all84 public-route smoke tests and combined B22/B23/B24 browser criteria on that same immutable preview. Exact hosted CI may run on the candidate or later evidence HEAD only if you demonstrate unchanged product/tooling/config trees and name both full SHAs. Do not link only the generic Actions homepage.
4. Refresh each submission and criterion-to-evidence matrix. Preserve historical evidence as historical; never assert all mandatory checks pass if one remains blocked. List actual command, exit, observed value, route/theme, SHA and durable artifact per row.

## Completion packet

Include: baseline/final full SHAs, exact CI URL and conclusion, PR140, immutable preview/deployment ID and binding/provenance proof, R1–R5 pass/fail/blocked table, targeted tests and evaluator negative tests, full-suite log, UI matrix, open limitations, rollback. Use ready_for_review only when every non-deferred mandatory requirement passes; otherwise blocked with exact reason. Do not mark tasks done, edit reviewer decisions, release C06 or merge. Primary will assess your evidence and reproduce critical claims; it will not automatically repeat the whole routine matrix.
