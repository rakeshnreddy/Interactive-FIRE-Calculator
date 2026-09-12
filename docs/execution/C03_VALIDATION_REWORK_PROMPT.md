# C03: finish validation without redesigning the repaired product

You are the implementation worker. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` on `codex/finpath-quality-execution`, PR140. Primary review alone accepts tasks. Read `MASTER_REVIEW_PROMPT.md`, `IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md`, `reviews/C03.md`, the B18/B19/B09 contracts and original prompts, and their validation matrices. Paths here are relative to `docs/execution` unless stated otherwise.

## Boundary and preserved work

This is the second bounded rework following the clarified C03 contract. Repair R3a–e, not the product thesis. R1's expenseMode story and R2's exposed figure/description passed implementation inspection. Preserve them, the new headline, theme tokens, public links, calculator search/no-match/Clear, auth escape, and C02 persistence/currency fixes. Do not redesign the hero or modify shared formulas. The optional SVG endpoint future-proofing in the review is not a closure blocker.

Inspect branch, HEAD and working tree first. Do not discard another writer's edits. Baseline reviewed website code is `3100b70ad5e7646133d3181abfb1bcfd2d44d92e`; evidence HEAD was `308286d9a0d20d433b9b418a09804e138be6e355`. Primary review commits may follow. Use current git output for identifiers. Preview: https://07fd7bef.interactive-fire-calculator.pages.dev . Do not redeploy an identical product for a tooling-only repair. Free tools only; no main merge, production, DNS, purchases, financial-account connections, schema changes or financial writes.

## Deliverable 1: make verification fail honestly (R3c/R3d)

Primary file: `evidence/C03/verify_c03_evidence.cjs`. Extract a small reusable evaluator if useful; use existing test tooling, no new service/dependency. Write failing tests before changing behavior. Exercise the actual evaluator and CLI path, not an unrelated test-only CLI.

Define a fixed required check set from the contracts, with unique IDs and explicit `pass`, `fail`, or `blocked` outcomes. Each result needs actual observations, assertion and evidence path. Missing, duplicate, malformed or unevaluated required results cannot pass. A measured violation is fail; an unavailable prerequisite is blocked. Both prevent the CLI from returning success. Persist JSON before exit; derive logs, overall result and exit code from one evaluator. Remove unconditional “verified” messages. Unexpected browser console errors and page exceptions must appear in the result and fail applicable browser checks; any documented benign exception needs an exact reason, not blanket suppression.

Required negative tests: valid complete packet succeeds; reduced-transparency matches=false fails; interaction pass=false fails; missing CTA fails; missing example fails; a required check omitted fails; malformed status/measurement fails; insufficient contrast fails; geometry failure changes both row and overall outcome; native zoom unavailable is blocked and exits nonzero. Assert persisted result and exit status, not only a helper return value. A negative fixture test passes when the real verifier rejects it.

For geometry, assert target count and visibility before measurement. Apply the original contract's exact CTA/answer visibility conditions using bounding rectangle bottom as well as top; do not invent new thresholds. Compare complete rectangles and viewport/scroll dimensions. No empty-list `every()` success or JSON pass computed before later assertions. For interactions, assert the actual expected DOM/navigation outcome and aggregate it.

## Deliverable 2: collect the missing real observations

### R3a — actual 200% browser zoom

`document.documentElement.style.zoom='200%'` is CSS zoom, not browser zoom. Rename existing artifacts accordingly; keep them only as supplementary evidence. Use a headed browser's actual zoom control to set 200%, capture the observed browser zoom state, viewport configuration, URL, theme, screenshot and overflow/overlap observations for the contract's representative routes/themes. Reset zoom afterward. Do not use deviceScaleFactor or CSS transforms as substitutes. If the environment cannot operate native browser zoom, record BLOCKED with the attempted method and exact limitation; complete every other check. Never manufacture a native-zoom filename or pass from CSS zoom.

### R3b — actual contrast pairs and enforced thresholds

Current contrast JSON records transparent element backgrounds without resolving what is behind them and provides no ratios. Its subtext selector selects the eyebrow. Target the actual hero body paragraph and each required text/control in both themes, using stable selectors verified against visible text. Record foreground, effective background, font size/weight, opacity, location, ratio, applicable threshold and result.

Resolve solid ancestor backgrounds and alpha composition; for glass/gradients sample the actual rendered underlying background across the text region and worst relevant gradient positions. Avoid sampling glyph pixels as the background. Document the reproducible method and save the source screenshot/coordinates. Convert sRGB channels to linear luminance and compute `(Llighter + .05)/(Ldarker + .05)`. Apply 4.5:1 for normal text and 3:1 only for qualifying large text; apply applicable control/focus criteria from the existing contract. Unknown background is not a pass. Assert each threshold and feed it to the evaluator. Test known black/white and a failing gray pair independently. Do not claim passing contrast just from CSS color strings or a visual impression.

### R3c — real media query and material fallback

The existing `page.emulateMedia({reducedTransparency:'reduce'})` did not activate the query. In Chromium use a supported CDP session, e.g. `Emulation.setEmulatedMedia` with `features: [{name:'prefers-reduced-transparency', value:'reduce'}]`. Verify `matchMedia('(prefers-reduced-transparency: reduce)').matches === true` before collecting fallback styles. Then inspect required surfaces for the expected opaque background and disabled backdrop effect in both themes. Record expected and actual styles. A true query alone is insufficient. Restore media state after the case. Keep reduced-motion and forced-colors checks, with actual query matches and their required behavior asserted. A false match must fail or truthfully block if unsupported; it can never print verified.

### R3d — actual print output

Generate four PDFs from the real page: light/dark theme × `printBackground: true/false`, using actual `page.pdf` options. Inspect rendered pages for readable text, backgrounds, omitted decorative media/navigation and no clipping, according to the existing print contract. Save PDFs and representative rendered images plus recorded observations. Print-media screenshots alone do not establish both background options. Feed failures to the common evaluator. Use existing local tools; do not purchase a PDF service.

### R3e — real auth states, copy sampling and truthful logs

Keep the useful callback unit tests but describe them as unit coverage. Provide a local-only browser fixture rendering the real AuthGate component in the required loading and signed-out states. Exercise the real buttons with keyboard and pointer and assert their intended callback/navigation outcomes. Do not publish a test route, bypass production auth or invent authenticated records. Reuse existing local test infrastructure where possible. Capture state and observed result. Include the explicitly requested amortization route in copy inspection, alongside the other original representative routes. Report actual visible copy, not only a source-code search.

The B18 full-suite log currently ends at Vitest RUN. Point submissions/matrices to the complete `evidence/C03/full-suite.log` and exact-code CI, or replace the incomplete artifact with accurately attributed complete output. Never append invented completion lines. Primary evidence under `evidence/C03-second-review` confirms 1510 Vitest tests, 79 Python tests +21 subtests, 13 runner tests, typecheck/build and audit 0 for the reviewed code. Its four homepage screenshots are bounded observations, not full R3 evidence.

## Reader check and honest status

B18's actual interactive screen-reader smoke remains mandatory under the current task contract; the recorded environment limitation is honest. Do not label the CDP accessibility tree as a completed reader session. The prior B32 waiver is scoped to B32 in current governance. If unavailable, retain a specific BLOCKED row while finishing all independent repairs above. No need to pause all work to ask the owner again. Report the smallest remaining assisted action. Do not set ready_for_review or announce all gates pass while mandatory checks are blocked; submit a blocked packet for primary review.

## Candidate freeze and submission

1. Maintain a row-by-row matrix for R3a–e and every original acceptance criterion. Preserve historical artifacts but clearly label superseded claims and point to current evidence. Do not rewrite primary reviews.
2. Run targeted verifier/evaluator tests including all negative cases, then the real collector. Inspect JSON, logs and exit status for agreement. A known blocked reader check means an expected nonzero overall result, not permission to skip other checks.
3. Because executable validation tooling changes, run `./scripts/test_all.sh` before pushing; record complete output and exit code. Run audit if dependencies change (none expected). Once frozen, a later evidence-only commit needs tree-equivalence proof rather than another full suite.
4. Record current implementation/tooling SHA separately from unchanged website SHA, exact CI identity/conclusion and evidence commit. Preserve literal provider dirty flag: the current preview reports dirty=true; primary JS/CSS hashes match a fresh reviewed build. Do not silently change this to clean. If website code changes, all affected checks need the new immutable preview after tests pass and existing isolated-binding safeguards.
5. Run `python3 docs/execution/validate_packet.py` and `git diff --check`; confirm required evidence is tracked despite log ignore rules. Push small commits to the existing execution branch. Do not merge, deploy production, mark done or release C04.
6. Handoff: each R3 row fixed/failed/blocked with direct evidence; negative test results; actual collector exit code; precise remaining assisted checks; code/tooling/evidence SHAs; CI; PR140 and immutable preview. No “100% passing” claim if any mandatory row is unavailable.

Primary review owns closure. If this second clarified rework still leaves the same bounded defect, the primary will implement or supply a tested repair rather than sending another equivalent prompt. Successful product repairs remain preserved throughout.
