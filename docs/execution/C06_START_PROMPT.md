# C06 — tenancy, deletion/recovery and operational UI fixtures

Role: lower-cost implementing agent in a separate session. Work in /Users/Rakesh/Projects/Interactive-FIRE-Calculator, branch codex/finpath-quality-execution, PR140. Inspect current HEAD, remotes, working tree and AGENTS.md. Safely synchronize without discarding changes. Start only when CHECKPOINTS.md records C05 accepted and C06 released. Primary alone owns closure. C07 stays locked.

Read prompts/B05.md, B07.md, B25.md, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md, FREE_TIER_EXECUTION.md, ACCESSIBILITY_DEFERRALS.md, reviews/C05.md, current security roadmap, production-auth runbook, migrations, functions and existing tests. Follow imports rather than assuming paths. Implement in order B05 → B07 → B25 with reviewable commits. Earlier tasks within C06 can be provisional dependencies only after their applicable tests and evidence are complete.

## B05: prove tenant/auth boundaries with actual persistence

1. Inventory protected API operations and foreign-key/ownership relationships. Create a route-by-operation matrix with own ID, foreign ID, missing ID, forged relationship, absent identity and malformed payload cases. Do not derive expected routes solely from collector output.
2. Run real current migrations against a disposable local D1-compatible database. Create synthetic users A/B. Invoke actual handlers/repositories through a test-only identity adapter that cannot appear in production output. Do not use SQL mocks as the only persistence proof or add a query/header/env auth bypass to shipped code.
3. For accounts, transactions/imports, goals, calculator results, plans/versions, export and deletion: verify own-user behavior; foreign reads contain no data; foreign writes change zero rows; references cannot cross tenants. Compare before/after database state, not only HTTP status. Include retry/concurrency/partial-failure cases where applicable.
4. Test the real authentication validation path separately with controlled absent/expired/wrong-origin/malformed token fixtures; a supplied fake verified-session seam does not prove JWT validation. Avoid printing tokens/credentials. Keep fail-closed authorized-party behavior.
5. Provide one deterministic, credential-free local command usable in CI. Add meaningful failing regressions before bounded fixes. Preserve B02/B03 currency and B04 atomic idempotency behavior.

## B07: honest deletion/export/recovery behavior

1. Map D1 data, Clerk identity, browser drafts, logs and provider backup boundaries. Explain what deletion actually does and does not erase. Do not invent a legal retention policy or claim provider erasure you cannot verify.
2. Test delayed/retried writes, concurrent deletion, partial failures, consistent export and synthetic recovery replay. Prove user B survives user A's deletion and deleted data cannot reappear through delayed writes or restored backups before serving.
3. Implement the smallest necessary server/client guards and truthful states. Any additive schema needs a written migration/rollback decision for primary review. Local disposable migration tests are allowed; no remote migration, hosted restore/delete or real identity deletion without separately approved scope.
4. Make local draft clearing explicit and scoped correctly on shared devices. Document recovery order and tombstone handling. Do not remove tombstones merely to roll back an error. If legal/provider decisions remain unknown, isolate those blocked policy choices and finish independent local tests/design.

## B25: real-component synthetic UI fixtures

1. Build a separate local-only entry/config that renders the actual dashboard/accounts, transactions/import, goals/plans, reports and settings components with synthetic props/adapters. Do not create copied screenshot-only pages.
2. Supply named empty, populated, stale, loading, failure and long-value fixtures. Label them as synthetic. Disable network mutations; prove fixture actions cannot hit production APIs.
3. Keep fixtures, seed IDs and identity bypasses absent from production output. Inspect the built dependency graph/output and test the separation, not just an environment flag.
4. Document a single startup command and exact state-selection URLs so future workers can reproduce UI checks cheaply. Verify relevant fixtures on mobile/desktop and both themes with keyboard, honest units and readable errors. Actual reader smoke remains deferred to B31; other affected accessibility checks remain required.

## Verification, publication and handoff

- Define stable acceptance rows and expected assertions first; write meaningful red tests for behavior. Include real failure/no-write proofs. Never substitute manufactured observations or always-true flags.
- The worker performs routine verification; primary spot-checks critical boundaries. Do not run native zoom for backend-only changes; justify UI N/A precisely. Capability-check any required fixture/browser tooling early. Use the known Chrome app CUA syntax for native zoom when needed: super+0 then five super+plus; browser AX must show Zoom:200%. Save screenshot bytes with node:fs/promises where available. A headless page-scale setting is not browser zoom.
- Run relevant tests and the full ./scripts/test_all.sh before executable pushes, diff checks and exact-revision CI. Reuse results for later documentation-only changes and identify both revisions.
- B33 must remain accepted; recheck the effective isolated preview binding before backend publication, including automatic Git deployments. Keep production-auth preflight intact. Free services only. No main merge, production deployment, DNS, paid service, real financial account or production-data writes.
- Local fixtures are not proof of hosted Clerk lifecycle. C07/B06 remains a separate owner/evidence gate. Do not work around unavailable hosted setup.
- Submit B05/B07/B25 criterion matrices, commands/exits/logs, schema/no-write evidence, fixture startup instructions, final combined code SHA, exact CI and immutable isolated preview where applicable. Explain local-only versus hosted coverage and any owner-required policy/migration decision.
- Set ready_for_review only for fully evidenced non-deferred requirements; otherwise blocked with the exact missing condition. Do not close tasks, edit reviewer decisions or release C07. Stop at the C06 boundary.

The queued post-task-34 calculator excellence program remains separate future scope; do not start it during C06.
