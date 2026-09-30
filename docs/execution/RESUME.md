# FinPath execution resume — 2026-09-30

**Current: C16 accepted; C17 released; Astra continues directly without Gemini. Production remains blocked on OA-1.** Canonical state: [TASK_STATUS.json](TASK_STATUS.json), [CHECKPOINTS.md](CHECKPOINTS.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/calculator-truth-c15`, source `8c2d31306219032e8089519154db60f986b4f27d` (C17 candidate; current accepted preview still C16); [PR #142](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/142) stacked on PR #141 / `codex/repository-hygiene`. Documents/ChatGPT is stale. Preserve working edits and distinguish source from documentation HEAD.
- Verified preview https://d6cfc887.interactive-fire-calculator.pages.dev; stable alias https://codex-calculator-truth-c15.interactive-fire-calculator.pages.dev. Exact clean candidate and isolated preview D1 checked; [CI](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36694824592) successful. No production/data migration.
- C15 chart truth/HYSA and C16 raw editing/customization accepted. [C16 review](reviews/C16.md): 85 files / 2,535 tests; build/typecheck/isolation; 84 public routes; final 42 hosted keyboard/layout/theme cases. [C15 review](reviews/C15.md) retains its own distinct evidence.
- **Current C17 source locally implemented (B46/B52/B49); full suite passes; publication and hosted review pending. Next closure includes B50 contracts. B46**, [prompt](prompts/B46.md): intentional homepage/library hierarchy, simpler engine-backed illustration, truthful light/dark design. Then owner-added B52 calculator spacing/result navigation, B49 scope/provenance and B50 bounded feature contracts. C18 requires real participants and remains locked. Owner chose direct work; no Gemini invocation.
- **45/52 accepted (86.5%, task count only)**; original 40/42. Paid/mobile still gated. No real retention/payment claim from synthetic tests. A11Y-F01/F02 open; one consolidated native zoom check for new layouts after C17, not repeated per task. No full WCAG claim.

## Prior release and cleanup

Accepted release baseline on `main`: merge `6f744ab570212042d8bbede3c9adda3f23c0f7e0`; PR #140 merged into the dependency branch, then PR #139 merged into main. Main CI 36535554047 passed. Product `2277b80` / preview `d0d235df` is historical evidence for that earlier release, superseded for C15 review by the preview above. [Release review](reviews/RELEASE-2026-09-29.md).

Owner-authorized cleanup is on `codex/repository-hygiene`, source `7bc501faeb9a3ce80b2ca2c3d1b07579c1d6538e`: obsolete trackers/one-use prompts/static demo retired with Git recovery; proven private dead code removed. [Cleanup review](reviews/REPOSITORY_HYGIENE-2026-09-29.md). PR #141 remains open. Its old dependency audit failure is resolved in the child C15 candidate; do not silently mark the parent CI green or merge it without accounting for the repair. Neither PR has been landed by this checkpoint.

## Fresh UX plan and remaining owner gates

[Fresh audit](../calculator-excellence/UX_REVIEW_2026-09-29.md), [83-route matrix](../calculator-excellence/CALCULATOR_UX_MATRIX_2026-09-29.md), [launch budget](../PUBLIC_LAUNCH_BUDGET.md). These provide evidence/scope, not parallel status trackers. New tasks do not invalidate every earlier checkpoint or certify all previously unreviewed formulas.

Production preflight remains **0/6** at the last verified release. Automatic production deployment is disabled; the canonical deployment stays on old `3399dbb`. **OA-1:** owner completes the owned HTTPS hostname and production Clerk setup through [runbook sections 1–5](../PRODUCTION_AUTH_RUNBOOK.md), with no keys in chat/Git. Astra then reruns preflight and proceeds with the already authorized production sequence and restore bookmark before migrations. **OA-3** is authorized, not executed; do not request duplicate authorization. **OA-5** is only needed for genuine B51 observation/recruitment, not earlier code implementation. Use free previews until the production gates are satisfied; no purchase, DNS change or account aggregation is authorized.
