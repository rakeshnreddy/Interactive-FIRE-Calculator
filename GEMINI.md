# Gemini Worker Execution Rules & Protocol

This file defines the execution rules and operating boundaries for Gemini acting as the implementation worker in `Interactive-FIRE-Calculator`.

## 1. Role & Relationship with Astra

- **Architect & Sole Reviewer**: Astra defines architecture, contract boundaries, task requirements, and conducts independent reviews.
- **Implementation Worker**: Gemini owns code implementation, test writing, test execution, and repair passes.
- **No Tiny-Edit Exception**: Gemini implements all code changes; Astra does not write code fixes.
- **Execution Completion vs. Task Acceptance**: Model `SUCCESS` indicates execution completion of the worker run only, NOT task acceptance. Astra alone is the authority who accepts a task or closes a checkpoint.
- **No Model Polling**: Astra does not poll models during worker execution; the launcher synchronously awaits the child process and emits a single machine-readable completion record (`.ai-handoff/*_completion.json`).
- **Correction Round Limit**: Maximum 3 correction rounds per checkpoint under the 2026-09-26 owner amendment. The current C09 Stage 4 pass is final; report any remaining finding to Astra without starting another C09 repair round.

## 2. Strict Prohibitions

1. **No Recursive Delegation**: Do NOT invoke `tools/run-gemini.sh` or launch recursive worker sessions from within a worker run.
2. **No Git Publication or History Mutation**: NEVER run `git commit`, `git push`, `git merge`, `git rebase`, `git reset`, `git checkout`, `git branch -D`, alter remotes, or modify files inside `.git/`. Read-only commands (`git status`, `git diff`, `git log`, `git rev-parse`) are allowed. OA-2 narrowly permits B37 `git rm --cached` on the explicit reviewed bulk-evidence/`.pyc` index list only; preserve files on disk and leave publication to Astra.
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

## Owner amendment — 2026-09-26

- Astra is the active architect/reviewer **role**, whether staffed by Codex or Claude; the authority and quality rules are the same.
- From C09B onward, use the normal unit/integration suite and add minimal steps to the single shared hosted smoke runner. Do not build a new checkpoint-specific proof harness. Follow PA-1 in `docs/execution/IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md`.
- Do not commit screenshots or raw output. Store raw files under ignored `docs/execution/evidence/**/raw/` and provide a manifest with path, SHA-256, size and Git-derived source commit; include a preview URL only when its provenance is verified, otherwise null/unknown. Astra may select at most three review PNGs per task, each ≤300 KB. Keep old C09 evidence intact.
- After the checkpoint correction cap, stop and report the observed residual. Never claim an unobserved hosted step passed. PA-2/PA-3 apply to C09 now; PA-4 onward begin C09B.

## PA-10 — worker-hosted boundary (owner amendment 2026-09-26)

The worker **never produces, simulates or labels live or hosted results**. If a step needs authority the worker lacks—deployment, credentials, hosted account creation, remote D1 writes or provider cleanup—report **`NOT RUN — requires Astra`** and give the exact command and prerequisites. Adapter-based local tests are LOCAL PASS only, never hosted PASS. Any worker-authored hosted PASS is automatic rejection. B37 is hygiene only; the shared runner and C09 revise residual belong to B42 after B39. Astra alone executes the hosted run and records the observed outcome. This rule overrides any older prompt asking Gemini to prove a hosted journey.
