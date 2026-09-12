# C03 second rework: primary takeover of remaining validation repair

Reviewed 2026-09-12. **CHANGES_REQUESTED. No task closure; C04 locked.** 10/34 accepted (29.4%, task count). Previous [review](C03-second-review.md).

## Identity and scope

Submitted commit b0f2548e0e71c9d637f921b5ce0660a2f04f0b22, PR140. Exact [CI34688669277](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34688669277) independently confirmed success. Website product source remains 3100b70: subsequent src diff only renames a unit test; other changes are validation tooling/evidence. Existing immutable preview https://07fd7bef.interactive-fire-calculator.pages.dev remains the website reviewed previously. No new deployment or live DB write this pass; isolation/provenance evidence from the preceding review is retained, not represented as freshly queried.

## Decisions and reproduced findings

- Preserve R1 financial story, R2 chart semantics and previously passing B19 search/B09 copy. No product redesign requested.
- R3 improved: real local AuthGate fixture added; amortization sampled; CSS zoom accurately renamed; native zoom and reader represented as BLOCKED in raw evidence. Worker original 11 evaluator tests independently pass. However task ledger still claimed ready_for_review while submissions/raw report say blocked; primary corrected status.
- R3 aggregation still accepted replacement duplicates for a required layout, auth interaction, copy route and contrast target; it accepted nonfinite contrast, missing CTA bounds, unreadable print despite pass=true, and duplicate PDF names. Primary reproduced all eight failures before patching. **Primary now fixed these directly** with exact required case identities, finite consistent rectangles, bounded numeric ratios/thresholds, and explicit print readability/clipping checks. Eight negative tests now pass through both evaluator and the real CLI with persisted FAIL/exit1. Original 11 tests still pass. This repairs acceptance logic, not the missing observations below.
- R3 contrast collector samples only one center pixel per element, not worst-case region; opacity is recorded but not composed. It skips missing selectors. Required set validation now catches missing/duplicate targets, but worst-case composited measurements remain incomplete.
- R3 media query is now correctly activated; reduced-transparency pass checks backdrop only, not background opacity. Reduced-motion pass merely reflects query match. Computed behavioral proof remains incomplete.
- **R3 print is an observed failure, not just missing paperwork.** Primary rendered page 1 of submitted light/background-on and dark/background-off PDFs. Both start with almost blank sheets retaining sign-in/theme/menu and skip-link controls. `print-inspection.json` nonetheless claims readable, unclipped, navigation omitted. See [light PDF raster](../evidence/C03-primary-repair/submitted-print-light-bg.png) and [dark PDF raster](../evidence/C03-primary-repair/submitted-print-dark-nobg.png). DOM assertions cannot certify paginated output. Other PDF pages/variants have not been independently accepted. Existing @media print rules only omit selected navigation overlays and do not establish actual pagination quality.
- Native 200% browser zoom and interactive reader checks remain unperformed. Their limitation strings are worker-reported; this pass did not independently prove that no available interactive tool can perform them. Do not describe them as permanently impossible. B32 waiver remains scoped as recorded in current contract.

## Verification of primary changes

Full `./scripts/test_all.sh` under Node22 passed: 13 runner tests, 79 Python +21 subtests, 1510 Vitest/35 files, typecheck and build. [Complete log](../evidence/C03-primary-repair/full-suite.log). [Eight integrity tests](../evidence/C03-primary-repair/integrity-tests.log), [original 11 tests after repair](../evidence/C03-primary-repair/worker-tests-after.log). No dependencies or financial formulas changed. No full browser conformance claim follows from these tests. Persisted worker reports remain historical input, not regenerated or relabeled as primary acceptance.

## Remaining primary-owned work

The clarified retry threshold has been reached. Do not send another equivalent worker rework. Primary owns the next bounded slice: repair print pagination/navigation with a failing real-PDF check first; inspect all four PDF variants and their pages; complete contrast sampling and computed media assertions; use an available interactive browser for native zoom. Record reader smoke as blocked unless actually completed or the owner explicitly changes that task criterion. Preserve product scope and all passing repairs. Publish changed website only to an isolated free preview after relevant/full checks pass. Review on one final candidate before closure.

B18/B19/B09 remain changes_requested due to shared incomplete final-candidate acceptance; no C04 release, main merge, paid service or production deployment. No owner input is required for the remaining code/collector repairs. If interactive reader assistance remains necessary after checking available tools, request only that concrete action. This is a review-and-evaluator-repair milestone, not completion of C03.
