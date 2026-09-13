# C05 start prompt — dedicated calculator families
You are the implementing worker for C05. Deliver bounded, reviewable UI work only;
the primary reviewer owns acceptance and task closure. Use the free tier only.
## Release gate (must be true before any code edit)
- C04 must be accepted in `docs/execution/CHECKPOINTS.md`, with B20 and B21 accepted
  and their review record current.
- C05 must then be explicitly released by the primary reviewer. The current ledger
  says C05 is locked; native zoom and the bounded C04 collector repair are verified,
  but the reader requirement/deferral decision remains pending. Treat this prompt
  as preparation only until the authoritative ledger releases C05.
- Cross-checkpoint prerequisites B16, B20, and B21 must be `done` with reviewer
  records. Do not infer acceptance from a checkbox, old SHA, or a green local test.
- Before editing, inspect branch, HEAD, worktree, remotes, applicable AGENTS.md,
  prerequisite submissions/reviews, `CHECKPOINTS.md`, `TASK_STATUS.json`,
  `docs/execution/README.md`, PRODUCT.md, DESIGN.md, the color system, and the
  visual audit/design spec. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`.
- Before implementation, run a capability preflight for interactive native Chrome
  through CUA: prove real browser 200% zoom (browser/UI zoom, not CDP page scale),
  screenshot capture, theme/viewport control, keyboard control, and reduced-motion
  control. If CUA or native Chrome is unavailable, record the exact capability gap
  immediately and continue only with independent checks; never simulate or infer a
  pass from HTTP, DOM, CDP, or a generated image.
## Order and ownership
Execute one task at a time, in this order: B22, then B23, then B24. Do not begin
the next task until the prior task has complete ready-for-review evidence. Recheck
all three tasks on the final combined candidate because later CSS or shared changes
can invalidate earlier screenshots. The worker may submit `ready_for_review` or an
exactly justified `blocked` status, but cannot set `done`, approve itself, edit
reviews, release checkpoints, merge main, close tasks, or deploy production.
Read `docs/execution/IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md` (especially section 7)
and each full task prompt `prompts/B22.md`, `prompts/B23.md`, `prompts/B24.md`.
The task prompts supply detailed acceptance criteria; this start prompt does not replace them.
Use branch `codex/finpath-quality-execution` and PR #140; inspect current state first.

## B22 — compound interest and savings goal
Primary files: `src/CompoundInterestCalculator.tsx`, `src/SavingsGoalCalculator.tsx`,
`src/styles.css`, and their existing component/engine tests.
Unify the two dedicated tools around the shared header, input, primary-result,
evidence, assumption, and disclosure primitives. Fix savings numeric input sizing
including optional controls to a 16px computed font. Keep contribution timing,
currency caveats, exact-versus-rounded contribution explanation, schedules, and
audit details reachable. Preserve specialized engines and outputs; no formula,
FX, analytics, route, or dependency changes.
## B23 — budget, net worth, and emergency fund
Primary files: `src/CashflowPlanningCalculator.tsx`, `src/styles.css`, and
`src/CashflowPlanningCalculator.test.tsx` plus the shared cash-flow engine tests.
Apply the visual contract while preserving each tool's accounting meaning and
units. Keep surplus/deficit, assets/liabilities, reserve coverage, warnings, and
blank-versus-zero distinctions explicit and readable without color alone. Reduce
repetition with native disclosures where suitable; preserve editable categories,
share/export behavior, and outputs. Do not aggregate accounts, relabel currency,
change formulas, or add gamification.
## B24 — flagship FIRE decision experience
Primary files: `src/App.tsx`, `src/styles.css`, `src/lib/fire.test.ts`,
`src/firePlans.test.ts`, and focused component/interaction tests as needed.
Refine the two FIRE modes in `src/App.tsx` so one primary result, gap/context, and
warnings are immediately legible; use concise accessible labels with help text
separate from names. Preserve advanced assumptions, timing, events, drafts, compare,
exports, both modes, and all existing routes/interactions. Define and test stale
results after input changes so old results cannot be mistaken for current inputs.
`src/lib/fire.ts` and all financial formulas are frozen and must remain untouched.
No new forecasting model, recommendations, automatic saved-plan updates, or data
model changes.
## Required implementation and validation
For each task, map every acceptance criterion to a stable contract row. For behavior
changes, write a meaningful failing regression first, verify it fails for the intended
reason, implement the smallest fix, then run focused tests. CSS-only changes require
actual before/after renders and computed-style evidence, not CSS-string tests.
Exercise valid, zero, negative/warning, empty, malformed, boundary, long-value, and
failed-save states where applicable. Verify desktop/tablet/mobile including 320px,
light/dark, keyboard navigation and keyboard-to-result, real 200% zoom, reduced
motion, no overlap, readable digits, error/loading/empty states, and screen-reader
smoke. The implementing worker should perform routine interactive/visual checks;
the primary reviewer should use a targeted independent spot-check. Build an evidence
matrix with actual observations for every affected route at desktop/tablet/mobile,
both themes, keyboard, native 200% zoom, and reduced motion. Use synthetic data only.
HTTP 200 or a generated screenshot alone is not UI proof; inspect actual rendered
content and interactions. Never invent, guess, or retrofit evidence. Record each
unavailable assisted check as `BLOCKED` with its exact dependency and do not claim it
passed. Pair every new verification assertion with a negative case (missing,
malformed, wrong-target, stale, or expected-failure input) so vacuous success is
visible.
Before submission, run focused tests, `./scripts/test_all.sh`, `npm audit` when
dependencies changed, and `git diff --check`; capture command, exit status, counts,
and log paths. Do not hide failures with pipelines. Do not push backend/auth/
migration changes; if any are proposed, B33 isolation and acceptance are required.
## Exact-code evidence packet
Create `docs/execution/evidence/<TASK>/validation-matrix.md` and map every criterion
to assertion, observed result, and durable file. Record baseline and final full SHAs
directly from git, exact CI head/SHA/conclusion, preview deployment ID and immutable
URL, literal trigger SHA and dirty flag, screenshots/DOM dumps, test logs, limits,
files, rollback, and next task. For the final C05 packet, tie B22+B23+B24 evidence
to one exact candidate SHA and one isolated preview. Earlier task SHAs are historical
only. If preview tooling, native zoom, reader, or another assisted check is
unavailable, submit the honest blocker and reproduction; never fabricate a preview,
observation, SHA, or pass. Keep previews isolated and free tier; never use main,
production/default deployment shortcuts, production data, secrets, or real records.
Copy and complete `docs/execution/SUBMISSION_TEMPLATE.md` for each task, then stop
at ready-for-review (or blocked). The primary reviewer independently rechecks the
final combined candidate and alone closes C05. Do not needlessly rerun trusted full
suites on an unchanged exact revision; identify the trusted run and rerun only
affected checks after later changes.

After tests pass, publish only an explicitly named non-production preview branch using the existing isolated free-tier workflow. Verify effective preview DB binding, run all 84 public-route smoke checks and exercise changed journeys on the immutable preview. Do not redeploy unchanged website code merely for a documentation correction.
