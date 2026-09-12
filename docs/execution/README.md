# FinPath execution and closure protocol

Owner: primary reviewing session (the session that prepared this packet). Implementers may be other models with repository/browser/GitHub/Cloudflare access. Tool capability is not approval authority. This is a review workflow enforced by instructions and human oversight, not cryptographic access control.

## Start here

1. [MASTER_WORKER_PROMPT.md](MASTER_WORKER_PROMPT.md): paste into the implementing session. It chooses the current released checkpoint and processes its tasks sequentially.
2. [CHECKPOINTS.md](CHECKPOINTS.md): order, release gates and accepted revisions. Only the primary reviewer edits release/approval fields.
3. [TASK_STATUS.json](TASK_STATUS.json): machine-readable task IDs, prerequisites, prompt paths and states. Status is not proof; evidence is mandatory.
4. [prompts/](prompts/): one explicit implementation prompt per task, including existing B01–B14 and visual work B15 onward.
5. [SUBMISSION_TEMPLATE.md](SUBMISSION_TEMPLATE.md): implementer evidence per task.
6. [MASTER_REVIEW_PROMPT.md](MASTER_REVIEW_PROMPT.md): paste back into the primary reviewing session at a checkpoint.
7. [REVIEW_TEMPLATE.md](REVIEW_TEMPLATE.md): independent acceptance record, written by the reviewer.

Read [the existing backlog](../EXECUTION_BACKLOG.md), [visual audit](../VISUAL_AND_UI_AUDIT.md), [visual contract](../VISUAL_DESIGN_SPEC.md), and the subsequent [color/glass contract](../COLOR_AND_GLASS_SYSTEM.md). A task brief gives implementation detail; the backlog retains stable IDs. If they disagree, stop the affected work and ask the reviewer to amend the contract. Do not invent a new requirement silently.

## Branch and single-writer rules

The packet was prepared on `codex/dependency-security-refresh`, PR139. Its final planning HEAD must be read from Git, not guessed from this text. The existing working branch already includes dependency, audit and test-runner work; do not recreate those changes.

For the first implementation session: verify a clean tree, fetch the planning branch, compare local/remote and create `codex/finpath-quality-execution` from the verified packet commit. If it already exists, inspect its history and status, then resume it only if it is this same execution effort. Never reset it. Use the stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` when no other writer is active. An isolated worktree is also allowed; report its absolute path and run all commands from that root. Do not assume the Documents/ChatGPT checkout is current.

Create an execution PR targeting the verified planning branch while PR139 remains unmerged. If the planning branch has since merged, use the current appropriate base only after verifying ancestry and obtaining the reviewer's base decision. Keep one cumulative execution PR across checkpoints, with a clear commit range and submission per checkpoint. This avoids needing a merge to proceed. The reviewer approves exact commit ranges; the PR stays unmerged until explicit owner authorization.

One implementer owns a checkpoint at a time. Record session/owner in status before editing. Do not start a second writer against App.tsx/styles.css. If status shows another active owner, ask for handoff; do not overwrite their work. No force-push, history rewrite or automated stash. Reviewer inspects read-only while the worker is active; worker must stop at the review boundary before closure records are written. After reviewer commits, fetch and fast-forward without rewriting. A task handed to another model includes branch, SHA, worktree path and current evidence.

## State machine and authority

`pending → in_progress → ready_for_review → done`

Alternative paths: `in_progress → blocked`, `ready_for_review → changes_requested → in_progress`.

Implementer may set in_progress, ready_for_review or blocked for owned tasks and fill submission/code_sha/owner/blocked_reason. Only primary reviewer sets changes_requested/done, writes review files, checks backlog checkboxes, or releases checkpoints. Done requires accepted evidence. B01 is historical accepted work with its existing evidence, not a newly implemented task.

Within a released checkpoint, a later task may build on an earlier ready_for_review task only when that earlier task has a complete, passing submission. Cross-checkpoint dependencies must already be done. If one task is blocked, independent tasks in the same released checkpoint may continue, with the blocker kept visible. Never jump into another checkpoint without recorded release.

At the checkpoint boundary, stop implementation and report READY_FOR_REVIEW or BLOCKED. Do not continue just because the implementing model thinks its work is excellent. The user requested an independent review gate.

## What closure means

For each acceptance criterion the reviewer checks actual code and executable evidence at the submitted code SHA, reproduces the changed journey, inspects before/after renders, and considers regressions on shared components. CI must belong to that SHA. Preview must be immutable and its code revision verified. Documentation-only evidence commits after that code SHA are permitted only when the reviewer verifies no product/config change occurred between them; record both revisions.

A code screenshot without a working journey cannot close a behavioral task. HTTP route smoke cannot close a rendered UI task. Local synthetic fixtures cannot close hosted auth/persistence/deletion criteria. Unavailable tooling is BLOCKED evidence, not PASS or automatic N/A. The reviewer can run missing checks with their own capabilities, or leave the task open. Subjective scores cannot override a failed objective gate.

All tasks within one checkpoint must pass against one final candidate code SHA and immutable preview. Earlier per-task commits remain historical evidence only. Retest affected provisional tasks after subsequent edits, as well as previously accepted tasks.

If a later task changes an accepted component, its submission must identify affected accepted task IDs and retest their criteria. Approval applies to a commit and scope, not forever. The reviewer reopens materially regressed tasks. Do not regenerate golden images as proof without inspecting the changed appearance. No code coverage percentage substitutes for meaningful tests.

Reviewer writes `reviews/<checkpoint>.md`, records decisions and accepted SHA in CHECKPOINTS, updates statuses and backlog, and commits those records. Only after all required tasks in a checkpoint are accepted may they release the next checkpoint. For owner/evidence-gated checkpoints, release additionally requires the specified setup/user data. Releasing development never authorizes production deployment.

## Evidence and verification

Every task submission includes problem, implementation, files, test-first red/green where applicable, full suite, CI, preview SHA/URL, actual browser matrix, accessibility methods, screenshots, privacy/data impact, rollback and remaining issues. Use durable repository files or attached PR artifacts; do not rely only on `/tmp` logs another session cannot access. Keep real user data/secrets out of screenshots, logs and URLs. Use visibly labeled synthetic data.

The browser matrix is in VISUAL_DESIGN_SPEC. A backend-only task can mark visual rows N/A with an explanation and code diff demonstrating no UI change; auth/data behavior still needs its own proof. Pure research tasks B14 and a gated B13 no-charge study do not require a new deployment if no product code changed, but must preserve all stated observation/owner gates and cannot be called implemented paid/mobile products.

B33 must be accepted before publishing backend/functions/auth/migration code, including pushes that trigger automatic deployments. If isolation is not established, those changes stay local; do not rely on avoiding intentional test writes because other requests can reach deployed functions.

Cloudflare effective preview DB originally matched the production-named binding. Recheck it. Never seed, import, save or delete through hosted APIs until isolation is proved and B06 authorization satisfied. Local component fixtures cannot be exposed as deployed authentication bypasses.

## Progress reporting

Report separately: accepted tasks / total defined tasks; ready-for-review tasks; blocked tasks; documentation completed. Do not count planned prompts, partial code or preview deployments as accepted implementation. Task-count percentage is not effort-weighted. At this packet baseline only B01 is accepted. After adding tasks, the denominator grows; that is new scope, not lost progress.

Run `python3 docs/execution/validate_packet.py` to check IDs, links, dependencies and evidence requirements. This checks structural consistency, not security, aesthetics, or whether the reviewer actually performed the work.

## Task prompt index

The exact order is in CHECKPOINTS.md; ID order is retained here for lookup.

| Task | Prompt | Checkpoint | Initial status |
|---|---|---|---|
| B01 | [full verification must not silently skip runtimes](prompts/B01.md) | C00 | done |
| B02 | [reject incompatible currency conversion into goals](prompts/B02.md) | C02 | done |
| B03 | [prevent mixed-currency account totals](prompts/B03.md) | C02 | done |
| B04 | [atomic, retry-safe calculator save](prompts/B04.md) | C02 | done |
| B05 | [executable tenancy/auth boundary harness](prompts/B05.md) | C06 | pending |
| B06 | [working hosted auth and lifecycle](prompts/B06.md) | C07 | pending |
| B07 | [deletion and recovery contract](prompts/B07.md) | C06 | pending |
| B08 | [mortgage payoff reconciliation regression](prompts/B08.md) | C04 | pending |
| B09 | [remove internal instructions from calculator copy](prompts/B09.md) | C03 | pending |
| B10 | [restore the exact saved FIRE decision](prompts/B10.md) | C09 | pending |
| B11 | [complete one monthly plan review](prompts/B11.md) | C09 | pending |
| B12 | [consented minimal measurement](prompts/B12.md) | C11 | pending |
| B13 | [first paid offer](prompts/B13.md) | C12 | pending |
| B14 | [mobile capability study](prompts/B14.md) | C13 | pending |
| B15 | [Repair light/dark contrast defects](prompts/B15.md) | C01 | pending |
| B16 | [Establish authoritative design tokens and primitives](prompts/B16.md) | C01 | pending |
| B17 | [Polish public/account navigation and keyboard behavior](prompts/B17.md) | C01 | pending |
| B18 | [Replace generic homepage hero with authentic product composition](prompts/B18.md) | C03 | pending |
| B19 | [Make calculator discovery concise and distinctive](prompts/B19.md) | C03 | pending |
| B20 | [Reorder generic calculators around inputs and the answer](prompts/B20.md) | C04 | pending |
| B21 | [Make shared charts numerically honest and accessible](prompts/B21.md) | C04 | pending |
| B22 | [Unify compound-interest and savings-goal presentation](prompts/B22.md) | C05 | pending |
| B23 | [Unify budget, net-worth and emergency-fund presentation](prompts/B23.md) | C05 | pending |
| B24 | [Refine FIRE calculator into the flagship decision experience](prompts/B24.md) | C05 | pending |
| B25 | [Build isolated operational UI fixtures for visual verification](prompts/B25.md) | C06 | pending |
| B26 | [Polish dashboard and account overview](prompts/B26.md) | C08 | pending |
| B27 | [Polish transactions and import review](prompts/B27.md) | C08 | pending |
| B28 | [Polish goals and monthly plan-review workflow](prompts/B28.md) | C09 | pending |
| B29 | [Polish reports and readable financial evidence](prompts/B29.md) | C10 | pending |
| B30 | [Polish settings and privacy lifecycle controls](prompts/B30.md) | C10 | pending |
| B31 | [Close visual accessibility and performance acceptance matrix](prompts/B31.md) | C11 | pending |
| B32 | [Implement light/dark glass and gradient material system](prompts/B32.md) | C01T | pending |
| B33 | [Isolate preview infrastructure before backend publication](prompts/B33.md) | C01I | pending |

B33 bootstrap exception: with explicit owner authorization, publish configuration only using unchanged, identified backend code. Verify intended isolated preview binding before publication and effective deployed binding afterward. This is the narrow setup operation needed to prove isolation, not permission to publish changed APIs or perform financial writes. Those remain blocked until B33 is accepted. If the provider cannot establish the intended binding safely before publication, stop and request a separate isolated target.

Latest release status (2026-09-10): C00R/B34 and C01/B15–B17 are accepted; C01T/B32 is released. Always read CHECKPOINTS.md rather than older narrative examples.

| Task | Prompt | Checkpoint | Initial status |
|---|---|---|---|
| B34 | [Development-tool advisory repair](prompts/B34.md) | C00R | pending |

Latest owner constraint: read [FREE_TIER_EXECUTION.md](FREE_TIER_EXECUTION.md). All services must remain free; the target is a verified functional preview. This also records completed preview-binding setup and the remaining B33 gates.

Worker reliability update: [implementation and validation protocol](IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md) and [contract template](CONTRACT_TEMPLATE.md) apply to subsequent tasks. B33 has a [concrete remaining-repair contract](contracts/B33.md). This method adds no task approvals and removes no existing acceptance criteria.

Current primary release 2026-09-11: C02 accepted; start C03 with [C03_START_PROMPT.md](C03_START_PROMPT.md). The JSON ledger and CHECKPOINTS.md are authoritative.
