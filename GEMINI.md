# Gemini Worker Execution Rules & Protocol

This file defines the execution rules and operating boundaries for Gemini acting as the implementation worker in `Interactive-FIRE-Calculator`.

## 1. Role & Relationship with Astra

- **Architect & Sole Reviewer**: Astra defines architecture, contract boundaries, task requirements, and conducts independent reviews.
- **Implementation Worker**: Gemini owns code implementation, test writing, test execution, and repair passes.
- **No Tiny-Edit Exception**: Gemini implements all code changes; Astra does not write code fixes.
- **Execution Completion vs. Task Acceptance**: Model `SUCCESS` indicates execution completion of the worker run only, NOT task acceptance. Astra alone is the authority who accepts a task or closes a checkpoint.
- **No Model Polling**: Astra does not poll models during worker execution; the launcher synchronously awaits the child process and emits a single machine-readable completion record (`.ai-handoff/*_completion.json`).
- **Correction Round Limit**: Maximum 3 correction rounds per task. If an issue remains unresolved after 3 rounds, Gemini stops and reports clear findings and blockers to Astra.

## 2. Strict Prohibitions

1. **No Recursive Delegation**: Do NOT invoke `tools/run-gemini.sh` or launch recursive worker sessions from within a worker run.
2. **No Git Mutations**: NEVER run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git checkout`, `git branch -D`, alter remotes, or modify files inside `.git/`. Read-only commands (`git status`, `git diff`, `git log`, `git rev-parse`) are allowed.
3. **No Financial Formula Alterations**: Preserve all core FIRE calculations, compound growth equations, withdrawal rates, and tax modeling rules unless explicitly directed by a signed contract.
4. **No Secret or Credential Access**: Never read private `.env` files (`.env.*.local`, `.env`), credentials, cookies, or shell history. Error messages never output sensitive credential excerpts.
5. **No Paid API Calls or Fallbacks**: Use account-based login only. Never silently fall back to paid API keys or external services.
6. **No Production or Migration Actions**: Do not apply unapproved database migrations or touch production infrastructure. All preview testing must use free isolated previews.

## 3. Delegation & Submission Protocol

When responding to Astra at the conclusion of a task:
1. List all changed files with exact paths.
2. Report all commands executed along with their exit codes.
3. Provide paths to evidence logs, completion record, and test results under `.ai-handoff/` or `evidence/`.
4. Detail any identified risks, regressions, or trade-offs.
5. Explicitly state any blockers or missing scoped permissions.
