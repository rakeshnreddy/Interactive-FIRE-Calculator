# FinPath documentation

Start with [execution/RESUME.md](execution/RESUME.md) for current code, release status and the exact next action. There is one execution ledger; historical plans are not competing trackers.

| Need | Maintained source |
|---|---|
| Task status and owner actions | [TASK_STATUS.json](execution/TASK_STATUS.json) |
| Dependency order and release gates | [CHECKPOINTS.md](execution/CHECKPOINTS.md) |
| Task scope and acceptance criteria | [EXECUTION_BACKLOG.md](EXECUTION_BACKLOG.md), task prompts linked from [execution README](execution/README.md) |
| Latest accepted release | [Release review](execution/reviews/RELEASE-2026-09-29.md) |
| Product and visual contracts | [PRODUCT.md](../PRODUCT.md), [DESIGN.md](../DESIGN.md), [visual specification](VISUAL_DESIGN_SPEC.md), [color system](COLOR_AND_GLASS_SYSTEM.md) |
| Production setup and data safety | [Authentication runbook](PRODUCTION_AUTH_RUNBOOK.md), [Pages deployment](CLOUDFLARE_PAGES.md), [deletion/recovery](DATA_DELETION_AND_RECOVERY.md) |
| Calculator work still needed | [Gap matrix](calculator-excellence/GAP_MATRIX.md), [assumption decisions](calculator-excellence/FIRE_ASSUMPTIONS_DECISION.md), [excellence program](execution/CALCULATOR_EXCELLENCE_PROGRAM.md) |
| Accessibility work still needed | [Deferred checks](execution/DEFERRED_CHECKS.md), [owner deferral decisions](execution/ACCESSIBILITY_DEFERRALS.md) |
| Product/revenue hypotheses and future scope | [Positioning](PRODUCT_AND_POSITIONING_STRATEGY.md), [retention](RETENTION_AND_MONETIZATION_PLAN.md), [measurement](MEASUREMENT_AND_EXPERIMENT_PLAN.md), [technical roadmap](TECHNICAL_AND_SECURITY_ROADMAP.md), [mobile decision](COMPANION_APP_DECISION.md) |
| Review authority and worker protocol | [Execution README](execution/README.md), [implementation protocol](execution/IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md) |

Dated audits and calculator/design plans retain useful reasoning and sources. They describe their observation date; use the current ledger and release review for completion claims. Original task prompts, submissions, reviews and evidence remain available for regressions and future acceptance decisions.

## Retired documents and static demo

Superseded financial-platform trackers, rebuild/handoff notes, completed checkpoint start/rework prompts, prompt redirect stubs, and Flask-generated HTML/CSS/JS were removed from the current checkout. They are recoverable from the exact Git objects recorded in the [retirement manifest](execution/evidence/repository-hygiene-2026-09-29/retired-files.json); no history was rewritten. Existing historical Markdown citations point to those pinned versions.

For a retired path, use its manifest `retrieval` command (`git show <commit>:<path>`) to inspect it without restoring obsolete files to the active workspace. See the [cleanup review](execution/reviews/REPOSITORY_HYGIENE-2026-09-29.md) for scope and verification.
