# Gemini CLI Delegation Workflow & Protocol

## 1. Executive Architecture & Operating Division

This document defines the CLI delegation protocol between **Astra** (System Architect & Sole Final Reviewer) and **Gemini** (Implementation & Execution Worker) in `Interactive-FIRE-Calculator`.

### Role Division & Ownership

| Responsibility | Astra (Architect / Reviewer) | Gemini (Implementation Worker) |
| :--- | :--- | :--- |
| **System Architecture & Strategy** | **Owner**: Defines architecture, contracts, roadmaps, and requirements. | Adheres strictly to Astra's architectural boundaries. |
| **Delegation Contracts & Prompts** | **Owner**: Authors task prompt files with precise boundaries. | Consumes contract; does not self-redefine task scope. |
| **Implementation & Refactoring** | **Non-coder**: Does not write code fixes under guise of "tiny edits". | **Sole Owner**: Implements all code, tooling, and refactors. |
| **Test Writing & Routine Suites** | Specifies test requirements and quality criteria. | **Sole Owner**: Writes unit/integration tests; runs full suites. |
| **Review & Final Acceptance** | **Sole Authority**: Reviews machine completion record and evidence artifacts. | Submits evidence; never marks a task accepted or closed. |
| **Git Operations & Releases** | **Sole Authority**: Performs all commits, pushes, merges, and deploys. | **Strictly Forbidden**: No git mutations (`commit`, `push`, `rebase`, etc.). |
| **Correction Rounds** | Enforces max 3 correction rounds per task. | Executes up to 3 repair passes; then halts with precise findings. |

### Core Operating Invariants

1. **No Tiny-Edit Exception**: Astra does not bypass the worker to make quick code edits. All implementation belongs to Gemini.
2. **Independent Verification**: Astra never trusts Gemini's self-reports alone. While Astra does not needlessly re-run full test suites without specific risk triggers, Astra independently verifies diffs, contracts, and critical assertions.
3. **Execution Completion vs. Task Acceptance**: Worker exit status `SUCCESS` denotes process execution completion only. No task is closed, checkpoint resolved, or branch merged until Astra explicitly conducts review and issues acceptance.
4. **Correction Iteration Limit**: Gemini is allowed at most **3 correction rounds** per task. If unresolved after 3 rounds, Gemini must halt and produce a structured findings report highlighting blockers and trade-offs.
5. **Branch & Git Invariance**: Current branch `codex/finpath-quality-execution` must remain intact. Gemini must **NEVER** run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git checkout`, alter remotes, or modify `.git`.
6. **Financial Formula Protection**: Core FIRE equations, compound interest models, tax projection logic, and withdrawal formulas must never be modified during workflow tooling.
7. **Infrastructure & Checkpoint Bounds**:
   - Checkpoint C09 remains open; Checkpoint C10 remains locked.
   - Screen reader verification and native browser zoom remain deferred to B31/C11.
   - Database migrations require explicit owner authorization.
   - Free isolated preview policy: use isolated Cloudflare Pages and isolated D1 instances only; never touch production databases or credentials.
8. **Cost & Credential Protection**:
   - Use account-based login via `agy`.
   - Never fall back silently to paid API keys or external purchases.
   - Never read `.env` files, credentials, cookies, or shell history. Error outputs never leak raw stderr/stdout.
9. **No Recursive Delegation**: Gemini must not recursively invoke `tools/run-gemini.sh` or spin up sub-workers during execution.

---

## 2. CLI Delegation Launcher (`tools/run-gemini.sh`)

The delegation launcher wraps the verified installed runtime `~/.local/bin/agy` (v1.2.9) to execute tasks headlessly, deterministically, and safely.

### Invocation Contract

```bash
tools/run-gemini.sh <prompt-file>
```

- **Single Argument**: Exactly one prompt-file argument is required. Missing, empty, or unreadable files are rejected with exit code 1.
- **Pre-execution Path Resolution**: Resolves the prompt file path to an absolute path **before** changing directory to the Git repository root. Invoking from any subdirectory or path containing spaces works reliably.
- **Git Root Execution**: Locates the Git root via `git rev-parse --show-toplevel` and executes all worker commands within the repository root.
- **Binary Resolution Order**:
  1. `${HOME}/.local/bin/agy` (preferred runtime, v1.2.9).
  2. PATH lookup via `command -v agy`.
  3. Fails cleanly with exit code 1 if neither is found.
- **Literal Prompt Integrity**: Reads the prompt file literally using a sentinel pattern (`PROMPT_CONTENT="$(cat -- "$ABS_PROMPT_PATH"; printf 'x')"; PROMPT_CONTENT="${PROMPT_CONTENT%x}"`) to preserve every trailing newline, quote, and metacharacter byte-exact without shell `eval` or command-substitution stripping.
- **Privacy & Permissions**: Sets `umask 077` before creating `.ai-handoff/` (`0700`) and artifact files (`0600`). On failure, prints generic categories and private log paths rather than raw stdout/stderr dumps to prevent credential leakage.

### Model & Effort Configuration

The launcher restricts selectable models to confirmed Gemini 3.8 Flash configurations:
- **Default**: `gemini-3.8-flash-high` with `--effort high`.
- **Medium Override**: `gemini-3.8-flash-medium` with `--effort medium`.
- **Incompatible or Arbitrary Models**: All other models (e.g., `gemini-2.5-pro`, `gpt-4`) and mismatched pairs (e.g., `gemini-3.8-flash-high` with `medium`) are rejected before execution.

### Timeout Configuration

- Bounded execution via `--print-timeout 30m`.
- Overrides via `GEMINI_PRINT_TIMEOUT` must specify ONLY positive integer seconds `s` or minutes `m` up to 1800s/30m; no other units (e.g. `30m`, `15m`, `1800s`, `60s`).
- Subsecond units, composite units, non-integers, zero, negative, unit-less values, and values exceeding 1800s/30m are rejected.

### Synchronous Execution & Machine-Readable Completion

- The launcher synchronously awaits the child worker process.
- **No Astra Model Polling**: Astra does not poll models or spin in reasoning loops during execution. Local process waiting consumes no model reasoning (platform execution overhead may still apply).
- Upon child process completion (even on failures), the launcher emits one machine-readable completion record:
  `.ai-handoff/gemini_<TIMESTAMP>_<PID>_completion.json` containing:
  - `run_id`: Unique execution identifier.
  - `status`: `SUCCESS`, `FAILED`, `BLOCKED`, or `TIMEOUT`.
  - `exit_code`: Numeric process return code.
  - `model` & `effort`: Exact model parameters used.
  - `report_path`, `stdout_path`, `stderr_path`: Paths to private log artifacts.
  - `started_at` & `completed_at`: ISO 8601 UTC timestamps.
  - `summary`: Failure classification or execution summary.

### Soft-Denial & Response Validation

1. **Worker Non-zero Preservation**: Non-zero process exit codes are preserved and returned.
2. **Observed Stderr Denial Detection**: Stderr is scanned for auto-denied tools, missing output, and permission soft-denials:
   `auto-deni(ed|al)|no output produced|soft-deni(ed|al)|permission[[:space:]]+(denied|error|rejected|required)|denied[[:space:]]+permission|requires?[[:space:]]+permission|approval[[:space:]]+required`
   Matches (such as `jetski: no output produced — a tool required the "command" permission that headless mode cannot prompt for, so it was auto-denied`) fail the run with exit code 1 and record `BLOCKED` status even if stdout reports `SUCCESS`.
3. **Python3 JSON Validation**:
   - Standard `python3` parses the output envelope.
   - Enforces a top-level JSON object (rejects arrays and primitives).
   - Enforces exact status `SUCCESS` (rejects non-SUCCESS, missing status, or nested misleading SUCCESS).
   - Enforces non-empty string `response` field (rejects empty/whitespace/missing/non-string responses).

---

## 3. Smoke Verification Protocol (Astra Execution)

Before assigning production feature tasks to the worker, Astra runs live smoke verification to confirm environment connectivity and edit capabilities.

> [!NOTE]
> Smoke tests are executed by Astra. The bootstrap worker does not execute live model calls during setup. The smoke prompt does NOT ask the model to fabricate the runtime JSON envelope; the CLI generates it.

### Smoke 1: Live Model Readiness Smoke

Tests that `agy` can authenticate, communicate with Gemini, and return a clean `SUCCESS` response.

1. Create prompt file `.ai-handoff/smoke_ready_prompt.md`:
   ```markdown
   Reply with exactly READY.
   Do not modify any files or execute commands.
   ```
2. Run launcher:
   ```bash
   tools/run-gemini.sh .ai-handoff/smoke_ready_prompt.md
   ```
3. Verification:
   - Command exits `0`.
   - Output contains `=== Gemini Delegation Execution Completed ===`.
   - `.ai-handoff/*_completion.json` records `"status": "SUCCESS"`.
   - `.ai-handoff/*_stdout.json` contains `"status": "SUCCESS"` and `"response": "READY"`.

### Smoke 2: Confined Workspace Edit Smoke

Tests that Gemini can perform file modifications under `--mode accept-edits`, strictly confined to ignored workspace directories.

1. Create prompt file `.ai-handoff/smoke_edit_prompt.md`:
   ```markdown
   Write the string "GEMINI_EDIT_VERIFIED" into .ai-handoff/smoke_edit_test.txt.
   Do not touch any tracked git files or files outside .ai-handoff/.
   Reply with exactly READY.
   ```
2. Run launcher:
   ```bash
   tools/run-gemini.sh .ai-handoff/smoke_edit_prompt.md
   ```
3. Verification:
   - Command exits `0`.
   - `.ai-handoff/smoke_edit_test.txt` contains `GEMINI_EDIT_VERIFIED`.
   - `git status --porcelain` shows no changes to tracked files.

---

## 4. Worker Submission Protocol

When completing a task delegation round, Gemini provides a structured handoff submission containing:
1. **Changed Files**: Exact relative file paths modified or created.
2. **Commands & Exit Codes**: Every command run during verification along with exact return codes.
3. **Evidence Artifacts**: Paths to completion records, logs, and reports under `.ai-handoff/`.
4. **Identified Risks**: Residual risks, architectural caveats, or performance considerations.
5. **Truthful Blockers**: Missing permissions, upstream API changes, or environment constraints.

Astra alone reviews this submission and decides whether to accept or request rework.

---

## 5. Owner Delegation & Review Preference

- **Gemini Responsibility**: Gemini owns routine browsing/browser checks, routine tests, monitoring, and implementation.
- **Astra Responsibility**: Astra owns system architecture and targeted independent review.
- **Workflow Efficiency**: No routine duplicate browsing or duplicate test suite runs by Astra; no model-based polling loops.
- **Completion Protocol**: Headless delegation relies on local machine-readable completion notification only.

