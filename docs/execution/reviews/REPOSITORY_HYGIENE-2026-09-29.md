# Repository hygiene review — 2026-09-29

Reviewer/implementer: Astra, explicitly authorized by the owner for this cleanup. Baseline `5e4b703958bf98374dea61235e314f8ba21af283` on main. Cleanup branch `codex/repository-hygiene`. Decision: **APPROVED cleanup scope** at code `7bc501faeb9a3ce80b2ca2c3d1b07579c1d6538e`; no task state or production release changed.

## Scope and recovery

- Removed 69 committed obsolete files (538,086 bytes): duplicate financial-platform trackers/handoffs, retired rebuild/ideas notes, completed checkpoint start/rework prompts plus redirect/archive copies, empty docs placeholder, and five Flask static demo assets. Every file's bytes were checked against baseline Git objects before deletion. [Retirement manifest](../evidence/repository-hygiene-2026-09-29/retired-files.json) records exact path, SHA-256, size and recovery command. History was not rewritten; no claim of shrinking a full-history clone.
- Historical Markdown citations now target pinned original files. README and the new [documentation index](../../README.md) lead to the one current resume and ledger. CHECKPOINTS retains its exact table and current rules; obsolete progress announcements are available in pinned history. RESUME is a current handoff rather than another chronological tracker.
- Worker entry prompts now follow current PA-10 authority and no longer direct agents to already completed B33 repairs. Future ideas unique to PLANNED_ENHANCEMENTS were carried into the existing technical roadmap as unscheduled hypotheses, not new commitments.
- Removed 21 private unused declarations: 15 pre-batch export query helpers, an unused plan draft writer, a dead calculator-directory component plus its catalog, two unused lazy wrappers, and an unused visual-value helper. Removed 77 compiler-reported unused import bindings/clauses in six source files. All remain recoverable in Git; no exported API or route was removed. The active export batch, atomic save path and calculator-library routing are retained.
- PA-9 extraction exception: App changes delete unreachable declarations and unused imports only. There is no live feature implementation to extract, and a broader refactor would increase cleanup risk.

## Deliberately retained

All 42 canonical task prompts, the ledger/backlog, approval reviews, submissions, evidence and provenance tools, active scripts, original migrations, privacy/recovery/auth runbooks, formula implementations/goldens, fixtures and behavioral tests remain. Calculator research/gap plans and A11Y-F01/F02 are needed for future work. Credentials, ignored local outputs, user files and the separate Documents/ChatGPT checkout were not touched. Evidence is not disposable simply because a checkpoint closed.

## Validation

- Before edits, TypeScript unused-local analysis identified the dead declarations/imports; reference searches and source review confirmed the active replacements. Export/read helpers are private, uncalled declarations; routes use CalculatorLibrary.
- Focused export/deletion, saved-result, route-parity, FIRE and calculator suites: 8 files / 78 tests passed.
- Full suite: 80 files / 2,471 Vitest tests, runner tests, TypeScript, build and fixture isolation passed. Raw logs remain ignored; the [verification summary](../evidence/repository-hygiene-2026-09-29/verification.json) records their digest and size.
- Packet validator passes with the same 42 tasks / 40 accepted. All 69 retired files resolve from Git objects with matching sizes/hashes; no local copies are needed for recovery. Historical/link-only changes in 24 Markdown documents preserve all non-link text.
- AST comparison proves every surviving non-import top-level declaration in all six source files is text-identical to baseline; only the named private declarations are removed. The only source edits besides those removals are unused imports. All migrations, formula engine files and TASK_STATUS.json are byte-unchanged; backlog changes are historical link destinations only.
- No runtime/build source references any retired path. Final source diff: 516 net lines removed. Pre-landing review found no remaining scope or behavior issue. Broad unused-export pruning and generated-evidence removal were deliberately avoided.
- Cloudflare read-back confirmed automatic production deployment remains disabled and preview DB isolation is intact before publication. No new hosted behavioral claim was needed for deletion-only unreachable code; existing behavior tests and exact surviving-declaration comparison establish this bounded change.
- No formula change, hosted financial write, production deployment or database mutation is authorized by this cleanup. Final publication will be a reviewable PR.
