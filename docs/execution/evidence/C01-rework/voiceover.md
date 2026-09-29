# C01 R2 VoiceOver smoke

Date: 2026-09-10 (America/Los_Angeles)

Candidate: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

Reader/browser: macOS VoiceOver 10 on macOS 26.6.2 (25G83), Google Chrome 152.0.7977.83. VoiceOver's caption panel was enabled, the first-run dialog was explicitly accepted, and the run used the real VoiceOver process rather than a Playwright accessibility snapshot. The user at the machine confirmed audible output was working, then asked for VoiceOver to be disabled; System Settings was re-read afterward and reported `AX_VOICEOVER_ENABLED=off`.

## Actual reader operation and observed output

1. Loaded the corrected production build in Chrome and moved reader focus through the document. VoiceOver identified the main page target as a level-one heading; the caption panel showed `You are currently on a heading level 1.` [`VoiceOver-window-2205.png`](../../../../output/playwright/C01/B16-rework/VoiceOver-window-2205.png).
2. Reloaded the home route and keyboard-traversed from the top. VoiceOver announced `Skip to content, link`; the exact caption is retained in [`VoiceOver-skip-13.png`](../../../../output/playwright/C01/B16-rework/VoiceOver-skip-13.png).
3. Continued through native links. VoiceOver announced link roles and their accessible text, including `Long-term planning Find the path to freedom, link`, and supplied the native activation instruction `To click this link, press Control-Option-Space.` This proves the active reader was operating Chrome's link semantics rather than merely displaying a DOM/AX dump.
4. Exercised the changed header and validation journeys while VoiceOver remained active. The live Chrome accessibility surface exposed `Calculators` and `FIRE` as links, `Workspace` as a button, the route H1 as a heading, and the savings `Goal amount` as a spinbutton. A human observer at the machine confirmed the audible output during the scoped run.

The caption overlay is a separate system window and did not reliably retain every transient phrase. Only the skip-link and generic role/heading captions are claimed as screenshot evidence; the remaining state checks below are separately reproducible browser semantics, not mislabeled as screenshots of speech.

## Corroborating state checks on the same candidate

- `/calculators`: `Calculators` exposes `aria-current="page"`.
- Workspace: keyboard Enter changes `aria-expanded` from `false` to `true`; the dropdown becomes visible; Escape returns it to `false` and restores focus to the trigger.
- `/accounts`: the Accounts link is the current Workspace destination while the missing-config gate remains fail-closed.
- `/calculators/savings-goal`: invalid `-1` sets `aria-invalid="true"`; `aria-describedby` resolves to both `savings-targetAmount-help` (`The amount you want available at the selected deadline.`) and `savings-targetAmount-error` (`Goal amount must be greater than 0 and no more than 999,999,999,999.99.`); the summary is also exposed as an alert.

This is a bounded screen-reader smoke, not a conformance certification. No signed-in state, real identity, saved plan, or financial record was used.
