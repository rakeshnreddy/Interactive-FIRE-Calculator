# FinPath execution resume — 2026-09-29

**Current status: merged; production blocked on OA-1.** Historical decisions and release evidence live in the linked review records.

- Stable checkout: `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, release baseline `main`, merge `6f744ab570212042d8bbede3c9adda3f23c0f7e0`. PR #140 merged into the dependency branch, then PR #139 merged into main. Main CI 36535554047 passed.
- B31/C11 and B40/C14 accepted. Ledger: **40/42**; B13/B14 remain open, gated on retention evidence. A11Y-F01/F02 remain explicit follow-ups, with no WCAG conformance claim.
- Verified preview: <https://d0d235df.interactive-fire-calculator.pages.dev>, product `2277b80ce089d0ddf0caf22a21c0c809ae6a31f5`. Full Python-excluded gate: 80 files / 2,471 tests, build/typecheck/isolation; 84 public-route smoke checks passed.
- Production preflight failed **0/6**. Production automatic deployment is disabled; the main deployment record is idle and the canonical site remains on old `3399dbb`. No production migration or Worker deployment occurred.
- **Exact next action:** owner completes the owned-hostname and live-Clerk setup in [runbook sections 1–5](../PRODUCTION_AUTH_RUNBOOK.md). Then Astra reruns preflight and continues the already authorized production release sequence, including a restore bookmark before migrations. OA-3 is authorized, not executed; no repeat authorization needed.
- Complete SHAs, CI/deployment records, owner checklist and remaining risks: [release review](reviews/RELEASE-2026-09-29.md). B13/B14 are not launch tasks. Use lower-cost agents for the scoped calculator/accessibility follow-ups; Astra retains closure authority.

## Repository cleanup — 2026-09-29

Owner-authorized cleanup is on `codex/repository-hygiene`, source commit `7bc501faeb9a3ce80b2ca2c3d1b07579c1d6538e`: obsolete trackers/one-use prompts/static demo retired with exact Git recovery, current docs consolidated, proven unused private code/imports removed. [Cleanup review](reviews/REPOSITORY_HYGIENE-2026-09-29.md) records passing local verification and retained future scope. This cleanup does not release locked tasks or alter production authorization. Use the current branch/PR metadata for publication status; main's product release above remains the deployment baseline.
