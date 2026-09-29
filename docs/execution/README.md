# FinPath execution protocol

Read [RESUME.md](RESUME.md) first. [TASK_STATUS.json](TASK_STATUS.json) is the sole task/owner-action ledger; [CHECKPOINTS.md](CHECKPOINTS.md) defines ordering and gates, and [EXECUTION_BACKLOG.md](../EXECUTION_BACKLOG.md) defines task scope. Do not copy status counts into another tracker.

## Work and review

- Astra owns architecture, contracts, independent review, task closure, Git publication and release. Gemini implements unless the owner explicitly authorizes Astra to implement a bounded task. Follow [AGENTS.md](../../AGENTS.md), [GEMINI.md](../../GEMINI.md) and the [implementation/validation protocol](IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md), including PA-10's hosted-authority boundary.
- Start from the current clean reviewed baseline on a `codex/` branch. Preserve other agents' changes; use explicit staging paths. One implementer owns an overlapping surface at a time. No force-push or history rewrite.
- A worker may mark its task `in_progress`, `blocked`, or `ready_for_review`; only the primary reviewer marks `done`, accepts a checkpoint and releases the next one. Use the [worker prompt](MASTER_WORKER_PROMPT.md), [start prompt](START_NEXT_TASK_PROMPT.md), [contract template](CONTRACT_TEMPLATE.md), and [submission template](SUBMISSION_TEMPLATE.md).
- Review exact code and trustworthy executable evidence using the [master review prompt](MASTER_REVIEW_PROMPT.md) and [review template](REVIEW_TEMPLATE.md). Passing routine tests, screenshots or task status alone do not prove the whole journey. Retest affected behavior; do not repeat unrelated checks without a regression reason.
- Run `./scripts/test_all.sh` before publication and `python3 docs/execution/validate_packet.py` after ledger/document changes. The packet validator checks structure, not actual security, correctness or accessibility. Python is used for this optional documentation tool, not the application verification suite.
- Record missing evidence truthfully and apply the correction-round cap. [Deferred checks](DEFERRED_CHECKS.md) and [owner decisions](ACCESSIBILITY_DEFERRALS.md) control remaining reader/zoom work; do not revive superseded blanket gates or claim WCAG conformance.
- [Free-tier rules](FREE_TIER_EXECUTION.md), [beta protocol](BETA_RELEASE_PROTOCOL.md), isolated preview bindings and the fail-closed [production auth runbook](../PRODUCTION_AUTH_RUNBOOK.md) remain mandatory. Task acceptance does not bypass owner setup, production auth or data-migration gates.

## Evidence and retained history

Keep original task prompts, acceptance contracts, submissions, reviews, formula regression fixtures, and useful hosted runners. Evidence must identify code, immutable preview, method and cleanup; never include credentials or real user records. New bulk captures go under ignored `evidence/**/raw/` and use the provenance manifest protocol. Existing evidence is retained because it supports reviewed claims and outstanding accessibility work.

Completed one-use start/rework prompts and obsolete trackers are available through pinned Git history in the [documentation index](../README.md). Their old branch names, counts and instructions are not current execution authority.

## Task contracts

Status and checkpoint order live in the ledger and CHECKPOINTS; this table is only a prompt index.

| Task | Contract |
|---|---|
| B01 | [full verification must not silently skip runtimes](prompts/B01.md) |
| B02 | [reject incompatible currency conversion into goals](prompts/B02.md) |
| B03 | [prevent mixed-currency account totals](prompts/B03.md) |
| B04 | [atomic, retry-safe calculator save](prompts/B04.md) |
| B05 | [executable tenancy/auth boundary harness](prompts/B05.md) |
| B06 | [working hosted auth and lifecycle](prompts/B06.md) |
| B07 | [deletion and recovery contract](prompts/B07.md) |
| B08 | [mortgage payoff reconciliation regression](prompts/B08.md) |
| B09 | [remove internal instructions from calculator copy](prompts/B09.md) |
| B10 | [restore the exact saved FIRE decision](prompts/B10.md) |
| B11 | [complete one monthly plan review](prompts/B11.md) |
| B12 | [consented minimal measurement](prompts/B12.md) |
| B13 | [first paid offer](prompts/B13.md) |
| B14 | [mobile capability study](prompts/B14.md) |
| B15 | [Repair light/dark contrast defects](prompts/B15.md) |
| B16 | [Establish authoritative design tokens and primitives](prompts/B16.md) |
| B17 | [Polish public/account navigation and keyboard behavior](prompts/B17.md) |
| B18 | [Replace generic homepage hero with authentic product composition](prompts/B18.md) |
| B19 | [Make calculator discovery concise and distinctive](prompts/B19.md) |
| B20 | [Reorder generic calculators around inputs and the answer](prompts/B20.md) |
| B21 | [Make shared charts numerically honest and accessible](prompts/B21.md) |
| B22 | [Unify compound-interest and savings-goal presentation](prompts/B22.md) |
| B23 | [Unify budget, net-worth and emergency-fund presentation](prompts/B23.md) |
| B24 | [Refine FIRE calculator into the flagship decision experience](prompts/B24.md) |
| B25 | [Build isolated operational UI fixtures for visual verification](prompts/B25.md) |
| B26 | [Polish dashboard and account overview](prompts/B26.md) |
| B27 | [Polish transactions and import review](prompts/B27.md) |
| B28 | [Polish goals and monthly plan-review workflow](prompts/B28.md) |
| B29 | [Polish reports and readable financial evidence](prompts/B29.md) |
| B30 | [Polish settings and privacy lifecycle controls](prompts/B30.md) |
| B31 | [Close visual accessibility and performance acceptance matrix](prompts/B31.md) |
| B32 | [Implement light/dark glass and gradient material system](prompts/B32.md) |
| B33 | [Isolate preview infrastructure before backend publication](prompts/B33.md) |
| B34 | [Repair newly reported development-tool advisories](prompts/B34.md) |
| B35 | [Make FIRE assumptions explicit, optional and user-controlled; audit calculator defaults](prompts/B35.md) |
| B36 | [Make FIRE answer when can I retire with explicit rates](prompts/B36.md) |
| B37 | [Retire legacy stack and shrink tracked delivery evidence](prompts/B37.md) |
| B38 | [Improve public delivery, route metadata, 404s and headers](prompts/B38.md) |
| B39 | [Extract pure API, formatting, warning and UI modules from App](prompts/B39.md) |
| B40 | [Consolidate calculator library and user-facing copy](prompts/B40.md) |
| B41 | [Harden shared API parsing, auth and error boundaries](prompts/B41.md) |
| B42 | [Shared hosted smoke runner plus the C09 revise residual](prompts/B42.md) |
