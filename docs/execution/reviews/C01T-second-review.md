# Checkpoint C01T independent re-review

Reviewer: primary reviewing session / sole closure owner
Decision: CHANGES_REQUESTED
Candidate: `12b35463c1b6e387d268d8cc9fb7a6d9fb26a88b`
Evidence: `724b4cdb7afb4190316455d4ab1b209c2943cd26`; submission HEAD `a1b7167`.
PR: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140
Base: `codex/dependency-security-refresh`; rework range `02650c4..12b3546`.
Preview: https://034f5c4f.interactive-fire-calculator.pages.dev
Previous review: [C01T-first-review.md](C01T-first-review.md).

## Decision and evidence

B32 remains open. The hero print fix is real, but full-page print still contains an unreadable lower account action. The verification implementation also still substitutes CSS zoom for native browser zoom and can produce an all-passed message despite failed or blocked required checks. Preserve the palette; no homepage redesign or formula change is requested.

Independently performed:

- Read the updated submission and actual CSS/evidence-script changes. Product/config files are unchanged after the submitted code commit through the submission HEAD.
- Verified GitHub Actions run 34549515888: success at `df2aed7a76157402a3ce13f38134cd1faeb9bcdf`. Its identity now matches the top-level attribution in the submission; it contains the identical candidate product/config tree. Do not retain the lower shorthand “CI on exact code SHA” without this qualification.
- Rendered the current hosted preview in Chromium and tested print, forced-color and reduced-preference states. Allowed transitions to settle before judging print. [Computed fallback styles](../evidence/C01T-rereview/chromium-fallbacks.json).
- Captured the **entire** printed homepage after a one-second settle. Hero media/scrim are hidden and hero/header copy is readable. However, the lower continuity section still has a dark background with a black transparent account button and black eyebrow. [Full screenshot](../evidence/C01T-rereview/print-full-dark.png), [computed colors](../evidence/C01T-rereview/print-styles.json).
- Resolved the missing secondary browser executable by installing matching **WebKit 26.5 / Playwright build 2336** into the user browser cache. No repository dependency changed. The installed older engines did not match the bundled Playwright version; this was fixable tooling, not a permanent product blocker.
- Ran 48 WebKit route/theme/viewport samples: home, library, FIRE, mortgage, savings, auth gate × light/dark × 320/390/768/1440. Zero measured document overflow and no captured page exceptions. Hosted root HTML/entry JS/runtime/CSS match local dist byte-for-byte. [Matrix and SHA-256 evidence](../evidence/C01T-rereview/webkit-matrix-assets.json). This is bounded coverage, not all-engine conformance or hidden-content certification.
- Initial generic Tab probes did not traverse links in WebKit's default mode. Retested using Option-Tab, with render/focus waits: mobile first link `/calculators`, desktop first link `/accounts`, Escape returns focus in both. [Keyboard evidence](../evidence/C01T-rereview/webkit-keyboard.json). Do not misreport the first probe as a confirmed product regression.
- Full suite rerun before publishing this review; see [full-suite log](../evidence/C01T-rereview/full-suite.log). No runtime implementation edits by the reviewer.

## R1–R5 disposition and bounded corrections

| Finding | Decision | What remains |
|---|---|---|
| R1 print | PARTIAL: hero fixed; full page fails | Repair lower continuity section and inspect complete PDFs |
| R2 composed contrast/fallbacks | PARTIAL | Normal hero pixel sampling improved; interactive/overlay and unsupported fallback tests incomplete |
| R3 accessibility | NOT PASSED | CSS zoom remains mislabeled; actual reader evidence absent |
| R4 comparison | BOUNDED EVIDENCE RECEIVED | Three runs per tree now exist; report results as observational and connect verdict to the gate |
| R5 reliability | FAIL | Required outcomes are not all aggregated; blocked checks can still yield all-passed |

### R1: finish the complete print surface

`src/vivid-theme.css` print rules force every button to black on transparent but leave `.landing-continuity-band` at `rgb(16,35,44)`. Its account button becomes black on that dark background, roughly 1.3:1 contrast. The eyebrow is also black on dark. Hero-only evidence misses this section.

Use a coherent print palette for the complete landing page, including continuity section and its descendants. Prefer a solid white continuity section with explicit dark heading/body/eyebrow/action text. Keep screen theme unchanged. Disable decorative transitions in print or wait for them before measurement. Generate full-page PDFs from both starting themes with backgrounds on/off and inspect every page, including buttons and footer. Do not assert everything is 21:1 when retained text/colors differ.

### R2: isolate the actual fallback and exercise interactive surfaces

Pixel sampling is a useful improvement, but current calls cover normal hero actions and a scrolled brand only. Required hover/focus/pressed and disclosure/menu glass samples are still missing. When hiding foreground for sampling, preserve dimensions/background and restore original DOM/styles; assert the sampled geometry did not change.

The unsupported-filter test runs **after forced-colors emulation without clearing it**, injects `backdrop-filter: none !important`, and checks only that blur is none. Its recorded white topbar in both themes is the forced-colors state. It neither proves a normal unsupported-browser opaque base nor tests whether `@supports` enhancement is skipped.

Use fresh contexts for each fallback. Test the unsupported path by preventing only the backdrop-support enhancement from applying in a test-only stylesheet/response transformation; leave authored base styles untouched. Assert opaque backgrounds, visible foreground/focus and usable menus in normal light/dark. Do not inject the desired opaque fix as test evidence. Document the simulation's limits. WebKit is now available; complete representative material/print/menu checks there using the installed matching engine.

### R3: remove the false native-zoom claim

`verify_b32.cjs:643–660` combines a 720×450 viewport, deviceScaleFactor 2 and `document.documentElement.style.zoom = '200%'`. This is still not browser UI zoom. Keep it only as a labeled CSS zoom/reflow experiment if useful; it cannot satisfy R3.

Use the native browser zoom control at 200% and capture that setting. Inspect the six required routes in both themes, menus, errors/results and focus. Because `overflow-x: clip` was newly applied globally, do not rely on document scrollWidth alone: inspect required controls/text bounding boxes and keyboard reachability for off-screen clipping. Do not remove clipping without proving the sticky-header change's purpose and regressions.

The script hard-codes the VoiceOver TCC explanation rather than recording an attempted capability check. Mark actual reader proof “not performed; reviewer assistance requested” unless an actual denial is captured. A CDP accessibility tree is not a reader run. The reviewer will assist with native zoom/reader testing on a stable corrected final candidate; do not claim those checks pass or change OS permissions to manufacture evidence.

### R4: retain the comparison, qualify it accurately

The 3+3 samples now provide a baseline/candidate comparison. Observed deltas are small, but the harness reports roughly 30 FPS and 40 intervals over its fixed 20 ms threshold in each run. “Zero dropped frames delta” does not mean zero dropped frames. These are rAF interval observations from this environment, not GPU frame-loss proof. Keep raw samples and the distinction.

Record baseline/candidate build identities and environment. Derive regression acceptance from the recorded criteria; `acceptable: true` cannot be constant. Do not repeat the whole benchmark if subsequent edits only alter print or reporting and the normal-render product tree is demonstrably unchanged; otherwise rerun the affected comparison against the final candidate.

### R5: build one trustworthy acceptance gate

Current `validationFailures.push` sites only handle sampled contrast, narrow print checks, CSS-zoom overflow and page exceptions. Recorded false journey/fallback/viewport booleans are not comprehensively aggregated. Console errors warn but do not fail. Performance `acceptable` is hard-coded true. Required reader/engine statuses may be blocked while the script prints “ALL B32 VERIFICATION CHECKS PASSED.” JSON is written before page exceptions are appended to failures, so persisted outcomes can disagree with process status.

Extract a small verification outcome evaluator with explicit PASS / FAIL / BLOCKED states. Required fail => nonzero; required blocked => nonzero with blocked summary; only complete passing required checks => zero. Separate optional diagnostics. Evaluate all required check groups, errors and performance, finalize the report, write JSON, then set exit status. Use normal cleanup rather than exiting before browser/server cleanup.

Add meaningful fixture/CLI tests first: passing control, false journey, failed fallback, overflow/clipping finding, low contrast, console error, page exception, performance regression, missing required check and blocked reader. Each injected failure must change both saved report and exit code. These test the verification system, not CSS strings. Preserve failed evidence rather than rewriting it as green.

Also correct status to `blocked` when only manual required proof remains, instead of ready_for_review with “no blockers.” Correct rollback wording: reverting 12b3546 reverts its print/overflow changes, not the earlier complete B32 palette.

## Visual judgment and safety

Palette and screen hierarchy remain consistent with the earlier review: color 8/10, typography 8, spacing 8, hierarchy 7. Print/state quality remains 5 because the lower action is unreadable. WebKit sampled responsive composition is 7; actual zoom/reader remain unverified. No new chart assessment. Scores never substitute for acceptance gates.

No confirmed reopening of B15/B16/B17; the print failure and new clipping verification belong to B32. No formula/auth/backend/migration changes, remote records or hosted writes. Asset matching does not prove DB isolation. B33 remains locked and production stays blocked.

## Closure actions

No task accepted. B32 remains `changes_requested`; C01T is released for rework only. C01I not released. Accepted total **5/34 (14.7%, task count only)**.

Next exact work: repair complete print surfaces and implement/test the outcome evaluator, then complete isolated material tests and submit a stable candidate for reviewer-assisted native accessibility checks. Follow [updated rework prompt](../C01T_REWORK_PROMPT.md). No new business decision/secret is needed. Required live reader/native zoom remain explicit unperformed checks, not a claimed pass.
