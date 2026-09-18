# C06 second pass — bounded corrections, preserve verified work

Work in /Users/Rakesh/Projects/Interactive-FIRE-Calculator, branch codex/finpath-quality-execution. Read latest reviews/C06.md, original C06_REWORK_PROMPT.md and protocol §6–7. This narrows the existing R1–R5 contract; no new product scope. Primary owns closure; C07 remains locked. Preserve current passing CI, atomic batch export, existing-user trigger protection, real component reuse, theme wrapper and guard. No formulas, main merge, paid services or production changes.

## 1. Finish R2: deletion before first database initialization

Promote evidence/C06-review2/missing-identity-probe.ts.txt to a real regression. It must fail on candidate 2d4bbaf because successful deletion of a never-initialized identity leaves no users row, and ensureUserProfile later succeeds.

Change deletion's final tombstone operation from update-only to an atomic insert-or-update using authenticated identity, provider fields and required timestamps. Keep purge and tombstone within the same batch. Preserve existing deleted timestamp if appropriate to documented semantics; do not clear it. Test missing user, initialized user, repeated deletion, concurrent initialization before/after each batch boundary, failure rollback, and unchanged full rows for user B. Test actual deletion handler with synthetic validated-session seam plus delayed create; expect success for deletion and predictable 410/no child rows on late writes. Do not merely seed a tombstone in the test and call that deletion-before-initialization proof.

Rerun existing race, tenancy, recovery and draft-cleanup tests. Expand table-trigger coverage as required by original matrix rather than assuming account-only proof covers all mutations. Keep actual D1-compatible migration execution. Prepare exact 0006 migration deployment/rollback plan: target isolated DB 0dbad68e-7493-452f-8504-98d4c61ee5da, current/applied migration state, trigger inventory, validation queries, code/schema order and safe rollback that retains tombstone protection. No remote migration yet.

## 2. Finish R3: trustworthy browser evidence

Refactor capture_fixtures.cjs into raw collection plus a fail-closed evaluator. No unconditional passes. Missing required observation is BLOCKED; observed violation FAIL; both exit nonzero. Save raw reports on failure and close only owned resources. Use real data-derived assertions, not flags supplied as literals.

Evaluator negative tests MUST demonstrate rejection of: absent screenshots, missing target/console diagnostics, overflow width larger than viewport, body-only keyboard focus, missing/wrong requested theme, deviceScaleFactor-only zoom, absent/nonmatching media query, absent/insufficient contrast, and collector error. Successful screenshot capture is not success of the case. Tests may use synthetic raw fixtures but must test the actual evaluator used by the collector.

For browser cases:
- Compare actual rendered state-specific text/control/value expectations; do not infer rendered state from URL or toolbar button alone.
- Check document and essential element geometry; overflow:hidden can conceal clipping. Fix fixture toolbar to collapse or scroll out of view on narrow screens. Capture the actual forms, results, details and import UI below it with full-page plus targeted/scroll captures. Preserve synthetic label and real product component styles.
- Theme: assert canonical wrapper and observed token/color values in each theme. Fix fixture debug URL contrast/wrapping. Measure applicable real composited text/background contrast; no guessed constant values.
- Native zoom: use desktop browser UI, retain browser AX/chrome showing 200%. deviceScaleFactor, CDP pageScaleFactor, CSS zoom and viewport resizing do not qualify. If native UI unavailable, mark BLOCKED explicitly while completing all other checks; do not relabel screenshot proof.
- Media: independently activate reduced motion AND reduced transparency; verify matchMedia and actual computed animation/transition/material fallback. Unsupported emulation is BLOCKED, not PASS.
- Keyboard: Tab through actual product controls; record names, focus visibility/occlusion; exercise Enter/Space/Escape for available actions/disclosures. A focused toolbar button or body alone is insufficient.
- Install console/page-error listeners for EVERY case. Separate deliberately induced network guard exceptions from unexpected errors using exact recorded actions. Exercise actual import preview/commit and representative fixture save/archive/settings actions, asserting no outbound mutations.

Capture seven domains, representative adverse states, relevant desktop/tablet/320/390 widths and both themes as original contract requires. Provide one explicit criterion-to-observation matrix. Do not claim all state/domain combinations if only a subset was rendered. Preserve superseded raw report as history; label it invalid for acceptance rather than quietly retaining 47/47 claims.

## 3. R5: accurate submission and blocked publication

Update all submitted paths/counts/statuses using files that actually exist. Tie product SHA, collector SHA and capture timestamp together; changes under evidence/*.cjs are executable verification changes, not prose-only changes. Full-suite and exact hosted CI remain mandatory before executable pushes. Do not rerun expensive checks solely for later prose edits.

Before any Functions push, recheck B33 intended/effective isolation including auto-deploy behavior. No remotely applied 0006 without explicit owner authorization. Complete local work and submit precise migration request/plan, keeping publication and affected tasks BLOCKED until authorized and verified. Do not mark ready_for_review while a mandatory publication or browser requirement remains unmet. Primary can review a truthful blocked packet.

End with compact R1–R5 table: preserved passing work, newly verified repairs, exact remaining blocker, candidate/collector/CI SHAs and links, migration target and plan. Stop at C06. Do not close tasks or release C07. The actual screen-reader deferral still applies; it does not defer zoom, keyboard, contrast or visual checks.
