# Checkpoint C01T independent review

Reviewer: primary reviewing session
Date: 2026-09-10
Decision: CHANGES_REQUESTED
Reviewed final checkpoint code commit: `02650c44509340cf698bfeb0a26708164d4dddf6`
Evidence/documentation HEAD: `f147eae40e7dc909574a43159f8115aa57e568ba`
PR: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140
Base: `codex/dependency-security-refresh`; checkpoint range `1c870e2..02650c4`.
Immutable preview: https://6567c09b.interactive-fire-calculator.pages.dev

The worker submitted additional changes during a reviewer usage-limit interruption. This decision covers the updated candidate above, including the path-strip and print refinements, not just the earlier `1b1b476` candidate or `701e84e4` preview.

## Independent checks actually performed

- Read the master review protocol, task prompt, submission, visual/material contracts and actual code changes. Subsequent commits through f147eae change only documentation/evidence/status, not product or deployment configuration.
- Ran `./scripts/test_all.sh` independently at this product tree: exit 0; 13 runner tests, 79 Python tests plus 21 subtests, 1,276 Vitest tests across 27 files, typecheck and production build pass. Existing >500 kB bundle warning remains. [Full log](../evidence/C01T-review/full-suite.log).
- Hosted root HTML, entry JS, imported JSX runtime and entry CSS match the local build byte-for-byte by SHA-256. [Asset hashes and responsive checks](../evidence/C01T-review/matrix-and-assets.json). This demonstrates public asset correspondence, not DB isolation or hosted authenticated lifecycle readiness.
- Six public/gated routes at 320/390/768/1440 in both themes: 48 rendered checks, zero horizontal overflow and zero captured JavaScript page exceptions. These measurements are not an overlap, screen-reader or all-control contrast certification.
- Independently verified all 84 public calculator routes: [smoke log](../evidence/C01T-review/public-smoke.log).
- Reproduced desktop Workspace and mobile menu keyboard Tab/Escape focus restoration. Initial 320-light measurement read focus too early; [three awaited retries](../evidence/C01T-review/focus-recheck.json) passed. Do not report the timing artifact as a product defect.
- Captured and inspected matching [light](../evidence/C01T-review/light.png), [dark](../evidence/C01T-review/dark.png), and [dark print](../evidence/C01T-review/print-dark.png) renders. Emulated print, forced colors, reduced motion and reduced transparency and recorded [computed styles](../evidence/C01T-review/fallback-styles.json). Reduced motion shortens the image transition. Topbar reduced-transparency blur is removed. This does not replace full overlay/fallback acceptance coverage.
- Queried GitHub: linked CI run 34503782181 succeeded at **6936aeaf94fd6d075083988687ff43c16a5a2354**, not the submitted 02650c4 code SHA stated in the packet. Product/config equivalence is verified locally, so this is an evidence-attribution correction rather than proof that the code fails CI. Future submission must name the actual tested commit and establish equivalence explicitly.

| Task | Criteria checked | Decision | Required correction |
|---|---|---|---|
| B32 | Paired hero theme change, code scope, basic responsive routes, public delivery, build/test safety, selected keyboard/fallback behavior | CHANGES_REQUESTED | R1–R5 below; no partial task closure |

## Required corrections

### R1 — Print foreground/background regression (P2, product defect)

`src/vivid-theme.css:720–743` turns hero text black and its parent white, but leaves the absolute `.landing-hero-media` and `.landing-hero-scrim` visible. Dark-mode print therefore has black headings/body/primary-link text over the dark photo and scrim. Header brand/sign-in also remain pale on the now-white header. Reproduce on the immutable preview: set dark theme, emulate print (or print with background graphics), inspect the first page. The attached print screenshot independently demonstrates the failure.

Required: make print layers coherent, normally hiding decorative hero media/scrim and pairing all retained text/controls with solid light surfaces. Hide nonessential navigation in print or give every retained descendant a readable print color. Test both initial themes, including browser/PDF output with background graphics on and off, with readable content and no unnecessary image ink. Do not fix only the parent background or heading again.

### R2 — Composited contrast and material fallback proof (P2, acceptance gap)

`verify_b32.cjs:154` onward computes hero contrast against fixed canvas RGB values and action endpoints. That does not measure the image + scrim + gradient under text, intermediate gradient colors, glass over scrolled content, or hover/focus/pressed states. DOM dumps are useful but do not replace these measurements. `forcedColors` and `print` in the recorded JSON are empty; unsupported-filter coverage and a second browser engine are not supplied.

Required: measure actual composed backgrounds for hero copy and public/overlay actions across both themes, gradient regions and interactive states; sample beneath text or accurately composite all layers with a reproducible method. Record worst-case ratios, not just favorable endpoints. Exercise reduced transparency, unsupported-filter fallback, forced colors and print in both themes. Include Chromium and another available engine; report missing required coverage as blocked, not pass. Financial reading panels remain opaque. Preserve B15 paired contrast repairs.

### R3 — Actual zoom and screen-reader verification (P2, acceptance gap)

`verify_b32.cjs:444–461` sets a 720px viewport and deviceScaleFactor 2. This is a reflow/density sample, not native browser 200% zoom. The submission's screen-reader PASS relies on semantic attributes, with no actual reader session on this candidate. The old C01 reader record does not certify changed B32 rendering.

Required: perform real browser 200% zoom in both themes, including menu, hero, calculator input/error/result and auth gate; capture browser zoom evidence and inspect clipping/focus/overlap. Perform an actual screen-reader smoke with browser/reader version, actions, observed announcements and limitations. Keep useful automated ARIA/reflow checks but label them accurately. No live authentication bypass or user records are needed.

### R4 — Performance comparison is absent (P2, acceptance gap)

`verify_b32.cjs:464–497` records three candidate-only loading samples. There is no baseline run, scrolling measurement or delta. “Identical bundle byte size” compares no identified baseline. This cannot establish no regression from backdrop blur/material changes.

Required: collect three same-setup baseline and three final-candidate loading/scrolling samples, identify both SHAs, browser, cache, viewport and environment; report medians, transferred assets/build sizes and deltas. Explain regressions; do not invent a performance improvement from candidate-only timings. Preserve old evidence as historical if superseded.

### R5 — Evidence harness and attribution must fail honestly (P2, verification reliability)

`verify_b32.cjs` logs successful completion even when a journey's `pass` field is false, a viewport overflows or contrast falls below its threshold. It has no page console/error listeners supporting the broad zero-console-errors claim. `audit_live_dom.cjs` catches detector failure and prints output without failing the process. The latest submission also labels the documentation CI SHA incorrectly and provides no original durable full-suite log (the independent log above now supplies current full-suite proof).

Required: make applicable failed criteria produce a nonzero exit code and list failed checks. Capture browser console/page errors, label intentionally untested checks as blocked, and preserve detector failure status where it represents a required check. Do not treat evidence generation as acceptance. Correct the actual CI SHA/link attribution and ensure all final screenshots/logs/preview refer to the new final candidate or explicitly proven identical product tree. A corrected submission must not claim all criteria PASS until these checks were actually executed.

## Visual judgment

Reviewer scores for sampled screens, not a whole-product certification:

| Dimension | Score /10 | Reason |
|---|---|---|
| Hierarchy | 7 | Primary action is clear; legacy generic hero/content remains B18 scope |
| Typography | 8 | Legible desktop copy and coherent weight; print fails separately |
| Spacing | 8 | Desktop composition and quiet strip are orderly; full 200% proof missing |
| Color | 8 | Light now visibly pale, dark deep teal; coherent paired accents |
| Chart clarity | Not rescored | No chart behavior changes; complete chart truth remains other tasks |
| States | 5 | Dark print is unreadable and material fallback proof incomplete |
| Responsive composition | 7 | Sampled mobile renders and 48 width checks contain; not full overlap certification |

The direction is worth keeping. Do not redo the palette or implement B18 prematurely. Repair print and demonstrate the existing acceptance gates.

## Safety and regression findings

B15 visible sign-in/hero contrast and B17 keyboard behavior were sampled; no confirmed reopening of those accepted tasks. Print is a B32 regression. No formula, backend, auth or migration code changed. No hosted financial writes were performed. B33 remains unaccepted: public asset success does not establish preview DB isolation. Production remains blocked.

Actual zoom, actual screen reader, worst-case composed contrast, second-engine/unsupported-filter coverage and comparative performance remain unverified. Because a product defect is already confirmed, these final-candidate gates should be rerun after the correction; the reviewer does not mark them passed from static evidence.

## Closure actions

Accepted task IDs: none. Existing accepted total remains **5/34 (14.7%, task count only)**.
B32 set to `changes_requested`; backlog remains unchecked. C01T stays released for B32 rework only. C01I/B33 remains locked because B32 has not passed.
Owner input: no new business decision or secret is needed for the code fix. If the worker cannot execute required native zoom/reader/second-engine checks, name the exact unavailable capability for reviewer-assisted testing rather than fabricate a pass.
Next item: R1 print-layer repair, then R2–R5 evidence completion on one final candidate. Use [C01T rework handoff](../C01T_REWORK_PROMPT.md).
No merge or production deployment performed or authorized by this review.
