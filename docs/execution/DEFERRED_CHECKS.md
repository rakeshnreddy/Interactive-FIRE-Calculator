# Owner-deferred verification

## C01T: actual screen-reader / VoiceOver check

Status: DEFERRED, not passed.
Authority: owner explicitly instructed “ignore screenreader and voiceover for now … we can come back to it later” during C01T review.
Scope: this removes the actual-reader smoke as a C01T closure blocker only. Keyboard, focus, native zoom, contrast, semantics, error states and the production-auth guard remain required.
Follow-up owner/task: primary reviewer, B31 final accessibility/visual quality gate. Complete a real reader/browser smoke covering public navigation, forms/errors and relevant workflows; record versions, actions, announcements, defects and retests. Keep this item open until independently verified. No full screen-reader or WCAG conformance claim is permitted meanwhile.
The B32 evaluator records this check as DEFERRED and links this decision rather than reporting it PASS. Other checkpoints' reader requirements are unchanged unless explicitly amended by the owner.

## 2026-09-28: actual VoiceOver pass executed for B31 (awaiting reviewer closure)

VoiceOver (macOS 26.6.2) with Chrome 154 on preview `d0d235df` (code `2277b80`): 41/41 steps matched across the homepage, discovery/search, both result tables, FIRE inputs/errors/result, mortgage help/schedule/scenario tabs, synthetic signed-in dashboard/plans/reports/transactions/settings, menus and the 390px layout. Two defects found and fixed (FIRE result not announced; disabled Calculate unreachable). Limitations: focus-driven navigation instead of VO key chords, search empty-state announcement not verified, NVDA not tested. Evidence: `evidence/B31/b31-reader-2277b80.json`; details in `submissions/B31.md`. This note does not close the deferral; the primary reviewer does.
