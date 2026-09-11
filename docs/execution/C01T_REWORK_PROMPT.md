# C01T rework round 2 — implementing agent

You implement; the master reviewer alone closes tasks and releases checkpoints.

## Establish context

Work in /Users/Rakesh/Projects/Interactive-FIRE-Calculator on codex/finpath-quality-execution, PR140. Inspect AGENTS.md, working tree and current remote; safely synchronize, preserve other work. Read MASTER_WORKER_PROMPT.md, CHECKPOINTS.md, TASK_STATUS.json, prompts/B32.md and reviews/C01T.md. The new review covers candidate 12b35463c1b6e387d268d8cc9fb7a6d9fb26a88b. Do not redo the palette or already fixed hero print.

## Implement in this order

1. **Whole-page print repair.** Reproduce the lower continuity-band black-on-dark button/eyebrow in the review screenshot. Inspect inverse tokens and print selectors. Make that section white with explicit dark text/controls in print, keeping normal screen styling unchanged. Check the entire PDF in light/dark with print backgrounds on/off. Wait for transitions or disable decorative print transitions. Retain direct before/after evidence.

2. **Test the evidence evaluator before relying on it.** Extract a small pure evaluator from the verification script. Define required check IDs and PASS/FAIL/BLOCKED; missing required checks are blocked, never pass. Aggregate journeys, viewport/clipping, contrast, material fallbacks, browser coverage, native zoom, reader, console/page errors and comparative performance. Do not coerce unknown into success. Keep optional diagnostics separate. Build fixtures and a CLI test verifying actual exit code and persisted JSON for every case below:
   - All required checks pass: exit 0.
   - One false journey, failed fallback, overflow/clipping, low contrast, console error, page exception or performance regression: nonzero and exact failing check.
   - Missing required check or blocked reader/native zoom: nonzero and BLOCKED summary.
   - Page exception recorded late: included in saved JSON as well as final status.
   Use existing test tooling or node:test; no new dependency. Derive performance acceptance rather than hard-code true. Write report only after final aggregation, then clean up browser/server and set process.exitCode. Prove the fixtures fail against old behavior, then pass after repair.

3. **Repair actual material checks.** Use a fresh context per fallback so forced colors/reduced transparency cannot contaminate unsupported-filter evidence. To simulate unsupported filter, exclude the feature-support enhancement in a test-only stylesheet transformation; keep the actual opaque base rules. Do not inject opaque backgrounds to make the test pass. Assert actual background alpha, foreground/focus visibility and menu usability in both themes. Sample normal/hover/focus/pressed actions and open desktop/mobile glass on relevant light/dark/scrolled backgrounds, not just hero defaults. Preserve element geometry while hiding foreground for pixel sampling. Record actual method and limitations.

4. **Use available WebKit.** Matching Playwright WebKit2336 is now installed in /Users/Rakesh/Library/Caches/ms-playwright. Use the bundled Playwright runtime, not a repository dependency upgrade. The reviewer verified 48 route/theme/viewport renders and Option-Tab/Escape menus. Extend that to material/print states. In WebKit default keyboard mode use Option-Tab to traverse links; report the actual setting/method. Do not hard-code missing-binary claims.

5. **Native accessibility handoff.** Remove “real browser zoom” labels from CSS zoom/device emulation evidence. Do not pretend CSS zoom is native zoom. Attempt approved native browser tooling if available; otherwise explicitly request reviewer assistance for the stable final candidate. The master needs real 200% browser UI zoom across the six required routes in both themes and an actual screen-reader smoke. Record unperformed/manual checks as BLOCKED. Do not claim TCC denied access unless you observed an actual denial. Do not change privacy permissions. Account setup, real records or auth bypasses are unnecessary.

6. **Performance and final attribution.** Keep the existing 3+3 raw comparison if normal-render code is unchanged; document equivalence and rAF interval limitations. If normal rendering changes, rerun the affected comparison. Never equate zero dropped-frame delta with zero dropped frames. Correct actual CI SHA attribution and rollback scope.

## Submission and stop

Run relevant tests during work and ./scripts/test_all.sh before pushing. Validate the execution packet and git diff. Use small commits and the existing PR. Deploy only the allowed static preview under B33 restrictions; no financial writes, production deployment, main merge, dependency churn or formulas/auth/backend changes.

Update submissions/B32.md against every latest review finding. Include exact code SHA, actual CI head/link, immutable preview, complete PDFs, measured contrast, evaluator fixture/CLI logs, browser versions, full-suite log and honest manual gaps. Do not overwrite master reviews. If native evidence remains outstanding, set B32 blocked with precise requested assistance and stop; otherwise ready_for_review. Never done. C01I and B18 remain locked.

The master reviewer will verify the final candidate and provide native accessibility assistance where available. No automated all-passed message may override a required blocked check.
