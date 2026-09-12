# Checkpoint C01 independent review

Reviewer: primary reviewing session
Date: 2026-09-09 (America/Los_Angeles; hosted CI completed 2026-09-10 UTC)
Decision: CHANGES_REQUESTED
Reviewed final checkpoint code commit: `ad580088938fc9f2a0e499eb70f0608be0c89aff`
Evidence head: `7521f25a7b78141b74cf0b478fb6cf777e459935`
PR: [140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140), base `codex/dependency-security-refresh`, range `ae10ea516e1df38cf2fce5f0c704e1c855c9db01..7521f25a7b78141b74cf0b478fb6cf777e459935`.
Immutable preview: candidate [44249dce](https://44249dce.interactive-fire-calculator.pages.dev) was automatically queued for evidence head 7521f25 after reviewer pushed it; provider reported queued/idle and the URL returned HTTP 404 during review. NOT verified or accepted. Last previously deployed preview [9537e86b](https://9537e86b.interactive-fire-calculator.pages.dev) belongs to 31bbd2b (B15 only), not combined C01.

## Independent checks actually performed

Read the protocol, all three task prompts/submissions, shared design contracts, actual App/navigation/CSS changes and tests. Verified the local archive's App.tsx, styles.css, vivid-theme.css, navigation.ts and lockfile against `git show ad58008:<path>`; all byte-identical. Post-candidate changes are documentation/status/screenshots only. Worker was idle and checkout clean before review records.

Reran unmodified `./scripts/test_all.sh` in `/tmp/finpath-b17.QGMe23`: exit 0, 13 runner tests, 79 Python tests plus 21 subtests, 27 Vitest files / 1,276 tests, TypeScript and Vite build. [Reviewer log](../evidence/C01-review/full-suite.txt). The current seven navigation tests cover the pure model/click filter; actual disclosure/focus behavior was independently exercised in the browser, not inferred from those tests.

GitHub initially ended at B15. After full verification, reviewer successfully pushed the submitted commits to the existing execution branch. [CI 34436962156](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34436962156) passed at evidence head `7521f25a7b78141b74cf0b478fb6cf777e459935`; product/config files match the common code candidate. This supersedes the submission's denied-push/absent-CI limitation. No main merge.

Independent installed-Chrome matrix at loopback port 4176 covered home at 1440/1024/768/390/320 widths in both themes; FIRE at 390, mortgage at 1440, savings at 390, and missing-config dashboard at 1440 in both themes. No document horizontal overflow or sampled editable controls below 16px. No JS page exceptions. These geometry assertions do not alone prove every layout/overlap case. [Matrix and journey results](../evidence/C01-review/browser-matrix.json), [reproduction script](../evidence/C01-review/browser-matrix.cjs).

Actual browser interactions passed: Desktop Workspace Enter/Tab to Accounts/Escape/focus return; mobile Tab/Escape removes disclosure links and returns focus; mobile FIRE transition closes disclosure and focuses H1; resizing an open mobile disclosure to desktop removes it; public SPA/back/forward/reload; skip link focuses main. Inspected actual [light mobile](../evidence/C01-review/light-320.png) and [dark desktop](../evidence/C01-review/dark-1440.png) renders.

Native zoom gap partly resolved by reviewer: in a dedicated Google Chrome tab at the same local build, used native Command+0 then five Command+plus actions. Native Chrome AX explicitly reported `button Zoom: 200%` and `container Zoom: 200%`. At this actual zoom, inspected the screenshot: header reflowed to mobile navigation; Explore, Calculators, FIRE, Workspace and auth controls were visible without overlap in the displayed menu. Escape removed navigation and focus returned to Open navigation. Restored 100% and closed the review tab. This is a real browser-chrome zoom check, not CSS zoom, CDP pageScaleFactor or resized viewport. It covers the sampled dark header/menu only; retest changed surfaces after the required correction. Native evidence is a reviewer observation from this session, not an implementer screenshot claim.

## Task decisions

| Task | Acceptance checked | Decision | Required correction |
|---|---|---|---|
| B15 | Original Sign in and inverse heading repairs retained; shared header in reduced-transparency mode fails | CHANGES_REQUESTED | Retest B15's no-header-regression promise after R1. Complete applicable shared evidence R2–R4 at final candidate. Do not undo its original contrast repair. |
| B16 | Canonical token ownership/control sizes improve; reduced-transparency fallback introduces white-on-white Workspace | CHANGES_REQUESTED | R1 is a visible, reproducible failure in B16 CSS. Correct the target and verify actual composited contrast/state coverage. Complete R2–R4. |
| B17 | Navigation logic, native anchors and exercised keyboard flows pass locally; shared Workspace label disappears in supported preference | CHANGES_REQUESTED | Retest actual Workspace label/focus/disclosure after R1; complete R2–R4. Pure helper tests do not establish assistive-technology output. |

## Findings and exact rework

### R1 — High: Workspace disappears with reduced transparency (B16; affects B15/B17)

File: `src/vivid-theme.css:453–468`. The reduced-transparency block assigns `--color-surface-strong` to `.desktop-nav-menu`, which is the wrapper around the trigger, rather than only the dropdown surface. In light mode the wrapper computes to white; `.topbar .nav-button` computes to `rgba(255,255,255,0.8)` on a transparent button. Effective foreground and background both become white: 1:1 contrast. The label and icons disappear even though the accessible button still exists.

Reproduction: open home at 1440px, light mode; set actual supported `prefers-reduced-transparency: reduce` with Chromium media emulation; inspect Workspace before/after opening it. The [independent screenshot](../evidence/C01-review/reduced-transparency-light-failure.png) shows the blank white rectangle. [Executable reproduction](../evidence/C01-review/reproduce-transparency.cjs) logs the wrapper/trigger/dropdown styles. It currently uses the installed Chrome channel and bundled Playwright path; adapt only tool paths if necessary.

Required correction: target the actual `.desktop-nav-dropdown` surface for opaque background/blur fallback and keep the trigger wrapper transparent against the dark topbar, or establish another explicit passing foreground/background pair. Do not remove the preference support or hide Workspace. Verify light and dark, disclosure closed/open, hover, focus-visible, active route, normal and reduced-transparency/motion combinations. Capture effective foreground/background contrast >=4.5:1 and visible focus. Recheck mobile menu and B15 Sign in/inverse heading. Use real browser-computed evidence, not a test that only searches for CSS text.

### R2 — Required evidence: real screen-reader smoke (B15/B16/B17)

`docs/execution/evidence/C01/B17-browser.md:31` calls a Playwright semantic snapshot a screen-reader smoke check. It is useful accessibility-tree evidence but does not demonstrate VoiceOver/NVDA output or operation. The same distinction applies to B15/B16 rows. Under VISUAL_DESIGN_SPEC quality gate 4, provide actual assistive-technology smoke for changed navigation labels, expanded/current states, skip link and field/error associations. Record reader/browser versions, actions and observed announcements. Correct the existing claims; do not label AX inspection as an actual reader pass. If actual reader operation is unavailable, mark the evidence blocked precisely rather than weakening the gate.

### R3 — Required evidence: comparable three-run performance check (shared C01 styles/navigation)

Submitted evidence records bundle sizes, not the three-run before/after lab measurements required by VISUAL_DESIGN_SPEC gate 7. Run baseline ae10ea5 and the corrected final candidate under the same browser, viewport, network/cache policy and device. Record all three samples and median for a representative public route and navigation interaction, explain any >10% regression. This is a bounded local comparison, not field Web Vitals certification. Do not add a new analytics or performance dependency to production.

### R4 — Required release evidence: final immutable hosted preview

After correction and full tests, push the existing codex branch, verify passing CI and successful preview at the final candidate (later evidence-only commits must have byte-identical code/config). Verify provider commit metadata, asset relation, all 84 public-route smoke checks, and rendered changed journeys/console on that preview. Do not reuse B15's older preview or treat queued/404 as deployed. Hosted GET checks only until isolation is accepted; never exercise save/import/delete or bypass auth.

Reviewer cleared the prior GitHub push barrier and proved native 200% zoom is available through native Chrome controls. Those are not still blanket environment blockers. The final corrected candidate still needs its own evidence refresh.

## Visual judgment

Scope is C01's foundation and changed controls; homepage replacement/chart redesign remains later work. Navigation hierarchy 8/10 (public-first choices and ordinary links); sampled typography 8/10 (16px controls and readable header); spacing/targets 8/10 in inspected normal renders; responsive composition 8/10 for sampled header/menu including actual zoom; interaction states 5/10 and color 3/10 because the supported reduced-transparency state makes Workspace invisible. Chart clarity N/A to this diff. Do not average away R1 or claim that the whole unreworked homepage meets the later visual rubric.

## Safety and regression findings

B01 and B34 regressions remain passing; no accepted task reopened. R1 affects provisional C01 tasks only. No formulas, Functions, migrations, real identity or financial records changed or used. Provider read-only check confirms production automatic deployments are disabled and both effective preview/production D1 bindings still reference the same database. B33 remains a blocker before backend publication/hosted writes; this review neither changes bindings nor implies production launch readiness.

## Closure actions

Accepted C01 tasks: none. Total accepted remains 2/34 (5.9%, task count only). B15/B16/B17 returned as changes_requested; backlog stays unchecked. C01 remains the only released checkpoint, for rework only. C01T/B32 and all later checkpoints remain locked.

Exact next work: repair R1 in B16's CSS, then refresh B15/B16/B17 together at one final candidate and satisfy R2–R4. This is an explicit same-checkpoint rework-order exception: do not reimplement B15 or discard B17 while fixing B16. Preserve original task commits, use small follow-up commits and stop for another primary review. No new task IDs or scope expansion.

Owner inputs: no new business decision or secret is needed for R1/R3. Actual screen-reader operation must be available to the worker/reviewer or supplied as an observed manual test; an accessibility snapshot cannot substitute. Preview publication may need owner intervention only if the final corrected deployment remains queued/failed or provider authorization is rejected; record the actual error then. No request to alter production credentials or DNS for C01.

Merge/deployment verdict: NOT ready for main or production. Submitted code is now pushed for review, with passing CI, but a known high-severity visual defect and required evidence gaps remain. Prior merge authorization is retained for a later passing release review; no main merge was performed here.
