# Multi-Agent Workflow & Delegation Architecture

This repository uses a two-tier AI workflow:
- **Astra**: System Architect, Contract Owner, and Sole Final Reviewer.
- **Gemini**: Implementation and Execution Worker.

## Operating Architecture

```
+-------------------------------------------------------------+
|                           Astra                             |
|          (Architect, Contract Owner, Final Reviewer)         |
+-------------------------------------------------------------+
            |                                    ^
            | 1. Authors task prompt             | 3. Reviews evidence
            |    (bounded contract)              |    & accepts/rejects
            v                                    |
+------------------------------------+           |
|         tools/run-gemini.sh        |           |
| (Headless, bounded 30m launcher)   |           |
+------------------------------------+           |
            |                                    |
            v                                    |
+------------------------------------+           |
|                      Gemini        |           |
|          (Implementation Worker)   |-----------+
| - Implements changes               | 2. Synchronous wait finishes;
| - Writes unit/routine tests        |    emits completion record,
| - Scoped to git repo               |    report, and evidence artifacts
+------------------------------------+
```

## Role Boundaries

### Astra
- Owns overall system architecture, roadmap, task definitions, and bounded contracts.
- Sole authority for Git mutations: `git commit`, `git push`, `git merge`, releases.
- Conducts independent risk-based reviews; never trusts worker self-reports alone.
- Non-coder rule: does not make code edits or bypass the worker with "tiny edits".
- Controls task acceptance: maximum 3 correction rounds per checkpoint under the 2026-09-26 owner amendment; C09's current Stage 4 pass is final.
- Sole reviewer of execution completion records; model execution completion represents runtime completion only, never task acceptance.

### Gemini
- Implements all requested code, tools, refactors, and test suites.
- Runs routine test suites within its bounded invocation.
- Reports exact changed files, commands run, exit codes, evidence paths, risks, and blockers.
- Strictly forbidden from modifying Git state (`commit`, `push`, `merge`, `rebase`, `reset`, `checkout`, `.git`).
- Forbidden from recursive delegation (never invokes `tools/run-gemini.sh` from within Gemini).
- Preserves financial calculation formulas, test suites, and deployed infrastructure.

## Local Runtime Permissions & Security Boundary

- **Permission Setup**: Installed runtime settings allow exact workspace reads/writes, read-only Git access, and exact approved test commands; there is no global bypass.
- **Security Boundary**: Runtime permissions are not an OS security boundary; shell scripts run with the user's account authority.
- **Enforcement Limitations**: Do not claim prompt rules fully enforce Git or secret restrictions. Prompts define behavioral contracts, while runtime enforcement relies on tool configurations, account authority, and external reviewer gating.
- **Subprocess Execution**: Headless delegation uses no model polling; it synchronously awaits one awaited subprocess result. Maximum 3 corrections per task.

## Tooling & Verification

- **Launcher**: `tools/run-gemini.sh <prompt-file>`
  - Default: `gemini-3.8-flash-high` with `--effort high`.
  - Allowed models: restricted to confirmed `gemini-3.8-flash-high` (`--effort high`) and `gemini-3.8-flash-medium` (`--effort medium`). Arbitrary other models and incompatible pairs are rejected.
  - Flags: `--mode accept-edits --output-format json --print-timeout 30m`.
  - Timeout: supports integer seconds `s` or integer minutes `m` only, positive up to `1800s` / `30m` (default `30m`). Subsecond, composite, non-numeric, zero, negative, or excessive values are rejected.
  - Validation: python3 standard JSON parser verifies top-level object, exact status `SUCCESS`, non-empty string response, absence of non-empty `error`, and treats non-empty `denied_actions` as `BLOCKED`. Constant error categories are used to prevent secret leakage.
  - Soft-denial detection: scans stderr for `auto-denied`, `no output produced`, `soft-denial`, and permission errors.
  - Privacy & Security: sets `umask 077` before file creation; constant error messages mask any credential leaks.
  - Synchronous await & Completion Record: launcher synchronously awaits the child process (no Astra model polling loops) and writes an atomic machine-readable completion record (`.ai-handoff/*_completion.json`) via tempfile + replace. Records `worker_exit_code` and `launcher_exit_code` separately. Represents runtime execution completion only, never task acceptance.
  - Storage: `.ai-handoff/` (ignored by Git, directory `0700`, files `0600`).
- **Tests**: `tools/test-run-gemini.sh`
  - Validates argument handling, path resolution, binary fallback, byte-exact prompt preservation, cwd isolation, model/effort enforcement, integer s/m timeout boundaries, stderr soft-denials and envelope denied_actions, python3 JSON validation, secret leak prevention, atomic completion records, and separate worker/launcher exit codes.

## gstack Skills Preference

- Prefer a matching installed `gstack-*` skill over ad-hoc workflows where applicable.
- Operating workflow roles (Astra as architect/reviewer, Gemini as implementation worker) take precedence over generic skill coding or delegation defaults.
- There is no requirement for a new user session; instructions apply directly within the current active session.

## Owner Delegation & Review Preference

- **Gemini Responsibility**: Gemini owns routine browsing/browser checks, routine tests, monitoring, and implementation.
- **Astra Responsibility**: Astra owns system architecture and targeted independent review.
- **Workflow Efficiency**: No routine duplicate browsing or duplicate test suite runs by Astra; no model-based polling loops.
- **Completion Protocol**: Headless delegation relies on local machine-readable completion notification only.

## Owner amendment — 2026-09-26

- Astra names the **active architect/reviewer role**, not a particular model. Codex or Claude may staff it under the same authority; Gemini remains the implementation worker.
- From C09B onward, use unit/integration tests plus one shared reusable hosted smoke runner. Extend the runner with bounded task steps instead of creating a new harness per checkpoint. Follow PA-1 in `docs/execution/IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md`.
- Cap corrections at three rounds **per checkpoint**. After the cap, Astra records a residual, splits a new task, or asks for an owner deferral; never invent a PASS. PA-2/PA-3 govern the current C09 final round.
- Raw screenshots and logs are not committed from C09B onward: use ignored `docs/execution/evidence/**/raw/`, CI/PR artifacts and a committed hash/size/commit/preview manifest. At most three selected PNGs per task (≤300 KB each) may remain tracked. Existing C09 evidence is historical and retained.
- Astra edits canonical trackers and `docs/execution/RESUME.md`; Gemini must not edit review records or mark tasks done. See PA-4 through PA-9 for owner actions, answer-quality review, intake cleanup and App-module extraction.
