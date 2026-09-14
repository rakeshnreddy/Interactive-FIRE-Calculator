# C05 first rework review — CHANGES_REQUESTED

Primary reviewer, 2026-09-13. Candidate `1c73bffbb4a5d1f179d67f2934c900a8b44711e5`; submitted HEAD `dec869ad51a5d390254c8764078561d70fe17d8a`. PR140, base codex/dependency-security-refresh. Preview https://46714a3f.interactive-fire-calculator.pages.dev.

## Preserve repaired product behavior

R1 unique instance IDs and R2 coherent tooltip CSS/state are repaired. Primary live probe observed no duplicate IDs and closed help opacity0/aria-expanded=false after transitions. R3 source now uses the calculation snapshot for timing metadata and the base comparison plan/result. Primary reran all7 FireCalculator component tests, passing. [Probe](../evidence/C05-second-review/critical-probe.json), [tests](../evidence/C05-second-review/targeted.log). Preserve these changes; no new product redesign requested.

Fresh GitHub query confirms submitted HEAD CI [34786143969](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34786143969) succeeded. Candidate-to-HEAD diff is evidence/status/submission material, not website code. Submission CI34784371718 is stale and must be replaced with the verified current run and tree relation. Provider evidence now identifies candidate1c73bff/dirty=false and records matching local/remote assets, improving R5 provenance. Retain those records; do not redeploy unchanged website solely for documentation fixes.

## Remaining original-scope verification defects

**R4a (P1, confidence10): evaluator accepts missing critical observations.** `verify_hosted_c05.cjs:365–376` accepts native zoom PASS with only pass:true; no observed200, route/theme coverage or durable evidence is required. Primary changed the submitted blocked zoom case to statusPASS/pass:true with no new evidence: evaluator returned successtrue. Removing all contrast pairs also returned successtrue, because lines354–362 validate only summary minima. [Executable reproductions](../evidence/C05-second-review/omission-reproductions.cjs). Add required observation schemas and cross-check summary values against complete per-target records; malformed/missing observations must FAIL, not PASS.

**R4b (P1, confidence10): comparison verification does not verify values.** At812, `compareEvaluatedAgainstSnapshot = compCardCount > 0`. The R3 component test also asserts only a comparison element exists. A card exists under both old broken and repaired implementations. Capture numeric comparison values before draft changes, after changes before Calculate, after scenario edits and after Recalculate. Assert the intended snapshot behavior against fixed engine expectations; cover both modes and matching CSV rows/metadata. Product source appears repaired, but this claimed test is not proof.

**R4c (P2, confidence10): keyboard route coverage is incomplete.** At847 the check calls focus() on each core input inside page.evaluate. It does not establish actual Tab order, Shift+Tab, or dedicated calculator disclosure reachability. Retain the real InfoTip keyboard tests; add the missing task-required keyboard journeys with actual browser key events and observed focus/actions. Do not label programmatic focus enumeration as keyboard navigation.

**R4d (P2, confidence10): contrast targets do not cover the changed FIRE answer/stale state.** At936 the primary targets are `.metric-accent span/strong`; the changed result is `.hero-result`, with a new opacity/stale badge treatment. Measure the actual answer and stale badge, help, and representative changed dedicated-calculator labels/warnings in both themes. Require actual per-target composed measurements, not copied summary minima. Keep passing observed media/theme work; no need to discard it.

**Native zoom remains an explicit mandatory BLOCKED case.** Submitted hosted-browser.json correctly retains BLOCKED/successfalse with no assisted native proof. Tasks cannot simultaneously be ready_for_review. A lower-cost session with native Chrome/CUA can perform it; record the missing capability early and retain blocked if unavailable. Actual-reader smoke remains deferred to B31 and is not implicated.

## Decision and next step

B22/B23/B24 remain open, changes_requested; 16/34 accepted (47.1%). C06 locked. Do not repeat product work or full suites on unchanged code to address documentary corrections. Follow C05_VERIFICATION_REPAIR_PROMPT.md for a bounded verification-only pass, retaining R1–R3 repairs and clean preview provenance. If the same clarified bounded defects recur after that retry, protocol section6 requires primary ownership/a tested patch rather than another equivalent instruction loop.

No main merge, production deployment, paid service or financial-data writes. Final visual acceptance remains pending the missing observations; do not infer a passing score from screenshots alone. Lower-cost audit subagent hit its usage limit; primary completed the narrow checks above, not a replacement full visual audit.
