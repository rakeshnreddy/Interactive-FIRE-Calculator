# C01I / B33 bounded rework prompt

You are the implementation agent. Work in /Users/Rakesh/Projects/Interactive-FIRE-Calculator on codex/finpath-quality-execution. Inspect git status/HEAD and preserve other work. Read MASTER_WORKER_PROMPT.md, CHECKPOINTS.md, TASK_STATUS.json, prompts/B33.md and reviews/C01I.md under docs/execution. The primary reviewer alone closes tasks.

Scope: repair B33 audit reliability and collect truthful isolation evidence. No product/UI/formula/auth/backend changes. No new checkpoint work. Current preview binding is not isolated; all backend publication remains blocked except B33's explicitly authorized configuration-only bootstrap.

## Step 1 — tests before implementation

Extract an importable pure evaluator without network calls at import. Add fixture and subprocess tests covering: fully evidenced correct target PASS; identical DB IDs FAIL; different but unapproved target FAIL; missing project/deployment binding BLOCKED; deployment binding differs from project target FAIL; endpoint failure FAIL despite correct project binding; HTML200 health not PASS; malformed/missing migration evidence BLOCKED; pending migration not PASS; missing/unknown build policy BLOCKED; all/none/custom include/exclude policies and wildcard handling; API/network failure nonzero; missing or crashed preflight not presented as a passed check. Preserve known FAIL when authorization is absent; expose owner blockers separately. Tests must assert persisted outcome and CLI exit code, not only console output. Red tests must fail for intended reasons.

## Step 2 — truthful collectors

Replace hard-coded d1_migrations PASS with read-only schema/migration collection or explicit BLOCKED. Record source, target ID, command/query and timestamp; compare migration filenames to migrations/. Enumerate only schema and d1_migrations metadata, never financial rows. Explain total/user/system table count. Do not query production records or alter schema.

Evaluate actual Pages source settings: deployment enabled flags, preview policy, include/exclude patterns, branch. For unsupported semantics return BLOCKED and name the missing verification. Reconcile Git-event records with actual stage outcomes; idle records do not prove deployed Functions. Verify current project defaults AND the exact intended deployment's effective binding. Never infer isolation from local preview_database_id.

Probe each immutable URL separately. Static 03cba125 uses_functions=false and serves HTML for /api/*: classify API checks unavailable there. API-bearing 757f65cd cannot prove isolated publication. Health must have JSON type and the schema in functions/api/health.ts (locate actual file); private probes must return expected signed-out statuses. Do not print real response bodies or credentials.

Treat production auth readiness as a separate diagnostic. A correctly executed 0/6 production guard is not a C01I success requirement; future valid production configuration must not become an error. Capture subprocess exit and recognized checks; a launch error is unavailable evidence.

## Step 3 — checkpoint before remote changes

LATEST OWNER AMENDMENT: read FREE_TIER_EXECUTION.md first. The owner authorized the bounded free preview setup and the primary reviewer has already changed the project preview DB binding. Do not ask again for that completed change or blindly repeat the PATCH. Re-read live metadata, repair the audit, and verify the unchanged-backend bootstrap under the recorded scope. Older missing-authorization instructions below are historical and apply only if proposing actions outside that exact scope. All services must remain free; no upgrade or paid trial.

Complete the local verifier repairs first. Report exact owner scope if not already explicitly granted: change only the existing project's preview DB binding to existing finpath-preview UUID 0dbad68e-7493-452f-8504-98d4c61ee5da; configuration-only bootstrap with unchanged identified backend and read-only verification. No production settings, DNS, database creation, migrations or financial writes. Do not infer approval from the request to review or deploy static pages. If unauthorized, submit corrected tooling and BLOCKED isolation evidence; do not wait to fix local defects.

After explicit scoped approval, read current Cloudflare API documentation and installed Wrangler behavior. Preserve unrelated settings; save redacted before/after evidence. Check wrangler.toml's production DB configuration cannot override the intended preview target during bootstrap. Verify intended isolation before publication and effective deployed DB afterward. If unsafe, stop and request an isolated target. Never roll back by reconnecting previews to production; defer/disable publication only with appropriate authorization.

## Step 4 — final verification and submission

Run fixture/CLI tests and ./scripts/test_all.sh before push. Correct CI full SHA (observed e8a53ace4ad23546b84c19fb93d3faa4aa96290c), distinguish website revision from audit-tooling HEAD, and capture fresh CI for final code. Use only redacted, executable evidence. Update submissions/B33.md and task state ready_for_review only if every required criterion is met; otherwise blocked with separate missing owner action and remaining evidence. Do not claim prior static preview establishes API readiness.

Stop at C01I. Do not set done, check backlog, edit primary reviews, release C02, merge main or deploy production. Handoff includes exact code SHA, PR, appropriate immutable preview, tests, effective binding proof, remaining limitations and explicit review request.
