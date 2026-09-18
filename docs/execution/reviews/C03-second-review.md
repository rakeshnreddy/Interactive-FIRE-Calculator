# Checkpoint C03 rework review

Primary reviewer. Reviewed 2026-09-12 UTC. **CHANGES_REQUESTED**; C04 remains locked. Progress 10/34 accepted (29.4% task count). Prior [first review](C03-first-review.md).

Code 3100b70ad5e7646133d3181abfb1bcfd2d44d92e; documentation 308286d9a0d20d433b9b418a09804e138be6e355. PR140 remains execution branch against codex/dependency-security-refresh. The intervening diff is documentation/evidence/status only. Preview https://07fd7bef.interactive-fire-calculator.pages.dev uses Functions and isolated preview DB 0dbad68e-7493-452f-8504-98d4c61ee5da. Cloudflare reports commit_dirty=true; do not call it a clean deployment. Primary fresh build at the reviewed source matches the delivered JS/CSS references and SHA256 hashes, resolving product-asset provenance. [Metadata](../evidence/C03-second-review/deployment.json), [hash comparison](../evidence/C03-second-review/asset-hashes.json).

## Findings and decisions

**R1 implementation fixed.** Curve now uses expenseMode, begins at the modeled target, names the initial spending and displays numeric final balance. Savings/gap remain separate; the string-based Sustained branch is gone. Primary inspected the changed code and live mobile/desktop screenshots in both themes. No need to redesign the hero again. Minor future-proofing: SVG endpoint text still hardcodes $0, while the caption uses formatted.modeledEndBalance; use the same formatted source when touching that line. Current fixed fixture correctly rounds to $0, so this is not a new observed numerical error.

**R2 semantic implementation fixed.** Meaningful figure/caption and description are exposed; SVG has title/description and stable IDs. The submitted CDP tree includes the scenario and end value. Actual interactive reader smoke is explicitly BLOCKED in V11; this is honest and remains unperformed, not a semantic implementation failure. B32's specific waiver does not change B18's requirement.

**R3 remains failed; this is the first rework under the clarified contract.** The following are direct contradictions in the new verification harness, not new product scope:

| ID | Observation / reproduction | Required correction |
|---|---|---|
| R3a | verify_c03_evidence.cjs labels section 3 native zoom but sets document.documentElement.style.zoom='200%'. Saved filenames/JSON and V09 repeat the native claim. | Use actual browser zoom with observed 200% state; otherwise classify CSS zoom as supplementary and native check blocked. |
| R3b | contrast-analysis.json contains CSS colors with transparent backgrounds, no composed backgrounds, luminance or ratios. Script's subtext selector picks the eyebrow. V10 claims >4.5:1. | Measure actual foreground/background pair, account for opacity/gradient, compute ratios and enforce relevant threshold; target the intended paragraph. |
| R3c | media-fallbacks.json records reducedTransparency matches=false/pass=false; script nevertheless logs “verified” and never adds this failure to failures. `emulateMedia({reducedTransparency:...})` did not activate the query. | Activate via supported CDP media features, verify match and computed material fallback in each theme, propagate false to final result. |
| R3d | Interactions pass:false does not feed failures; missing CTA/example collections pass vacuously; layout JSON pass excludes geometry failures; print screenshots have no PDF printBackground on/off cases or legibility assertion. | Unify required check aggregation, assert nonempty required targets and complete task-specific geometry, test false/missing paths and actual print variants. |
| R3e | B18/full-suite.log ends at Vitest RUN; complete log is under C03/full-suite.log. B09 directly invokes React element callbacks but provides no real loading/signed-out browser fixture. Copy browser sampling omits requested amortization. | Correct log link/provenance; keep callback unit coverage but label it accurately; complete remaining requested browser states/sample. |

The successful build does not cure these verification defects. The harness prints ALL C03 EVIDENCE GATES PASSED even when mandatory media output is false. A status flag in a worker-authored file is not evidence of a passed check.

## Independent evidence actually obtained

- Exact code CI [34668187823](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34668187823) success. CI log confirms 1510 Vitest tests/35 files, Python 79+21 subtests, 13 runner tests, typecheck/build and audit 0 vulnerabilities. No need to rerun unchanged full suite merely for documentation. Relevant [CI log](../evidence/C03-second-review/ci-summary.txt).
- Targeted current Node 22 run: 13 tests/3 files pass (HeroFireExample, landingPage, authGateCopy). [Log](../evidence/C03-second-review/targeted.log). Fresh build passes.
- Actual immutable homepage at 390 and 1440 in both themes: 4 cases, no observed page errors or horizontal overflow; mobile CTA y 332.25px. Target/initial spending/end labels agree with expenseMode. [Matrix](../evidence/C03-second-review/matrix.json), screenshots in same directory. These are bounded observations, not complete R3 coverage.
- Inspected prior passing B19 search and B09 copy behavior for changed scope: current rework does not alter their product implementation (except an innocuous landing sentence removal); preserve the previously passing behavior. No new search/copy defect found. Shared final-candidate verification remains incomplete.

## Visual judgment and closure

The prior composition improvements remain: clear public action, relevant synthetic example, theme-aware opaque financial cards. Scenario clarity improves from 3/10 to 8/10 after R1; meaningful chart now has a textual alternative. Small SVG labels remain secondary to readable DOM start/end values. Full accessibility/material/print verification is not passed. Do not inflate a visual score into conformance.

B18, B19, B09 remain changes_requested for R3, with B18's actual-reader item also blocked. No task closed; no C04 release, main merge, production change or paid service. Use C03_VALIDATION_REWORK_PROMPT.md for the next bounded pass. Do not redo R1/R2 or add product features. After a second unsuccessful rework under the clarified protocol, the primary takes ownership of the remaining bounded repair instead of sending another equivalent instruction cycle. Owner business input is not required for R3a–e; reader assistance is needed only if the implementing environment truly cannot execute it.
