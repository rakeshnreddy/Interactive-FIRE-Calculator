# FinPath execution resume — 2026-09-29

**Current status: accepted release merged; production blocked on OA-1; fresh UX checkpoint C15 released.** Historical decisions and release evidence live in the linked review records.

- Stable checkout: `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, release baseline `main`, merge `6f744ab570212042d8bbede3c9adda3f23c0f7e0`. PR #140 merged into the dependency branch, then PR #139 merged into main. Main CI 36535554047 passed.
- B31/C11 and B40/C14 accepted. Original scope: **40/42**; expanded ledger: **40/51**, including the nine pending fresh-review tasks below. B13/B14 remain open, gated on retention evidence. A11Y-F01/F02 remain explicit follow-ups, with no WCAG conformance claim.
- Verified preview: <https://d0d235df.interactive-fire-calculator.pages.dev>, product `2277b80ce089d0ddf0caf22a21c0c809ae6a31f5`. Full Python-excluded gate: 80 files / 2,471 tests, build/typecheck/isolation; 84 public-route smoke checks passed.
- Production preflight failed **0/6**. Production automatic deployment is disabled; the main deployment record is idle and the canonical site remains on old `3399dbb`. No production migration or Worker deployment occurred.
- **Production next action:** owner completes the owned-hostname and live-Clerk setup in [runbook sections 1–5](../PRODUCTION_AUTH_RUNBOOK.md). Then Astra reruns preflight and continues the already authorized production release sequence, including a restore bookmark before migrations. OA-3 is authorized, not executed; no repeat authorization needed.
- Complete SHAs, CI/deployment records, owner checklist and remaining risks: [release review](reviews/RELEASE-2026-09-29.md). B13/B14 are not launch tasks. Use lower-cost agents for the scoped calculator/accessibility follow-ups; Astra retains closure authority.

## Repository cleanup — 2026-09-29

Owner-authorized cleanup is on `codex/repository-hygiene`, source commit `7bc501faeb9a3ce80b2ca2c3d1b07579c1d6538e`: obsolete trackers/one-use prompts/static demo retired with exact Git recovery, current docs consolidated, proven unused private code/imports removed. [Cleanup review](reviews/REPOSITORY_HYGIENE-2026-09-29.md) records passing local verification and retained future scope. This cleanup does not release locked tasks or alter production authorization. Use the current branch/PR metadata for publication status; main's product release above remains the deployment baseline.

## Fresh UX review and implementation queue — 2026-09-29

Owner requested an individual review of every calculator, additional-control visibility, landing intentionality, both themes and public-launch costs. [Audit](../calculator-excellence/UX_REVIEW_2026-09-29.md), [83-route matrix](../calculator-excellence/CALCULATOR_UX_MATRIX_2026-09-29.md), [launch budget](../PUBLIC_LAUNCH_BUDGET.md).

**Exact next worker task:** [B47 prompt](prompts/B47.md), checkpoint C15 **released**. It fixes reproduced chart/model contradictions; then B48 corrects HYSA APY under its written migration decision. C16–C18 remain locked. Only local implementation is authorized for Gemini; Astra publishes and performs hosted checks. No CLI worker launched by this audit; owner can paste the prompt into their chosen session. Stable Projects checkout only; actual current branch/HEAD must be recorded and existing changes preserved.

B43–B51 added, all pending. Original accepted scope remains 40/42; expanded ledger **40/51 accepted (78.4%, task count only)**. A new task is not an invalidation of every old checkpoint, nor proof old acceptance certified every formula/expanded visual. B13/B14 remain gated; B13 requires genuine B51 evidence. OA-5 owner recruitment/observation is needed only for B51; OA-1 production setup still independently blocks launch.

The audit changed documentation only. The reviewed live product remains immutable preview `d0d235df`, product `2277b80`. Cleanup PR #141 is still separate from production readiness. Do not advertise all newly proposed enhancements as implemented or redeploy identical product code just to publish an analysis document.
