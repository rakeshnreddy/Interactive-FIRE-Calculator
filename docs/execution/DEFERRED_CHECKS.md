# Current deferred verification

Owner deferral history is in [ACCESSIBILITY_DEFERRALS.md](ACCESSIBILITY_DEFERRALS.md); this file lists current residuals.

## Reviewer closure and retained follow-ups — 2026-09-29

B31's original actual-reader gate is accepted by Astra under the owner's final-handoff authority to judge the stated limitations. The accepted evidence is actual VoiceOver speech with focus-driven control checks and tested repairs; it is not full native-reader navigation or WCAG conformance. Residuals below remain open and are not represented as passing checks.

- **A11Y-F01 — Native reader navigation and dynamic content (open).** Owner: capable lower-cost verifier; Astra closes. On the then-current exact preview, use real VoiceOver rotor/VO navigation without adding tabindex or programmatically selecting headings/table cells. Verify discovery search count/empty-state announcement (typing echo does not pass), read expanded mortgage help text (button state does not pass), navigate table cells with associated headers, and complete synthetic saved-plan review, report/export and deletion flows with spoken completion/error states. Include both FIRE modes and the 390px navigation. Record actual phrases, action, browser/reader version and cleanup. Fix any material defect with regression tests. Dependencies: permission for native reader key commands and current isolated preview. This is an accepted verification residual, not a confirmed product failure; required before a full screen-reader/WCAG claim.
- **A11Y-F02 — Windows/NVDA compatibility (open).** Owner: verifier with Windows and free NVDA; Astra closes. Smoke the same core discovery → calculator → saved-plan → privacy journey, natural reading order, labels, errors and live updates; retain actual phrases and defects. No paid tooling. This platform was not covered by the macOS pass. Complete before claiming cross-platform screen-reader compatibility.

The native 200% final sweep is accepted from `b31-zoom-2277b80.json`; do not repeat passing cases unless a relevant UI change or a reported defect warrants it. The summary `41/41 matched` remains a collector metric only; it does not close A11Y-F01/F02.
