# Owner-deferred verification

## C01T: actual screen-reader / VoiceOver check

Status: DEFERRED, not passed.
Authority: owner explicitly instructed “ignore screenreader and voiceover for now … we can come back to it later” during C01T review.
Scope: this removes the actual-reader smoke as a C01T closure blocker only. Keyboard, focus, native zoom, contrast, semantics, error states and the production-auth guard remain required.
Follow-up owner/task: primary reviewer, B31 final accessibility/visual quality gate. Complete a real reader/browser smoke covering public navigation, forms/errors and relevant workflows; record versions, actions, announcements, defects and retests. Keep this item open until independently verified. No full screen-reader or WCAG conformance claim is permitted meanwhile.
The B32 evaluator records this check as DEFERRED and links this decision rather than reporting it PASS. Other checkpoints' reader requirements are unchanged unless explicitly amended by the owner.

## 2026-09-28: actual VoiceOver pass executed for B31 (awaiting reviewer closure)

VoiceOver (macOS 26.6.2) with Chrome 154 on preview `d0d235df` (code `2277b80`): 41/41 steps matched across the homepage, discovery/search, both result tables, FIRE inputs/errors/result, mortgage help/schedule/scenario tabs, synthetic signed-in dashboard/plans/reports/transactions/settings, menus and the 390px layout. Two defects found and fixed (FIRE result not announced; disabled Calculate unreachable). Limitations: focus-driven navigation instead of VO key chords, search empty-state announcement not verified, NVDA not tested. Evidence: `evidence/B31/b31-reader-2277b80.json`; details in `submissions/B31.md`. This note does not close the deferral; the primary reviewer does.

## Reviewer closure and retained follow-ups — 2026-09-29

B31's original actual-reader gate is accepted by Astra under the owner's final-handoff authority to judge the stated limitations. The accepted evidence is actual VoiceOver speech with focus-driven control checks and tested repairs; it is not full native-reader navigation or WCAG conformance. Residuals below remain open and are not represented as passing checks.

- **A11Y-F01 — Native reader navigation and dynamic content (open).** Owner: capable lower-cost verifier; Astra closes. On the then-current exact preview, use real VoiceOver rotor/VO navigation without adding tabindex or programmatically selecting headings/table cells. Verify discovery search count/empty-state announcement (typing echo does not pass), read expanded mortgage help text (button state does not pass), navigate table cells with associated headers, and complete synthetic saved-plan review, report/export and deletion flows with spoken completion/error states. Include both FIRE modes and the 390px navigation. Record actual phrases, action, browser/reader version and cleanup. Fix any material defect with regression tests. Dependencies: permission for native reader key commands and current isolated preview. This is an accepted verification residual, not a confirmed product failure; required before a full screen-reader/WCAG claim.
- **A11Y-F02 — Windows/NVDA compatibility (open).** Owner: verifier with Windows and free NVDA; Astra closes. Smoke the same core discovery → calculator → saved-plan → privacy journey, natural reading order, labels, errors and live updates; retain actual phrases and defects. No paid tooling. This platform was not covered by the macOS pass. Complete before claiming cross-platform screen-reader compatibility.

The native 200% final sweep is accepted from `b31-zoom-2277b80.json`; do not repeat passing cases unless a relevant UI change or a reported defect warrants it. The summary `41/41 matched` remains a collector metric only; it does not close A11Y-F01/F02.
