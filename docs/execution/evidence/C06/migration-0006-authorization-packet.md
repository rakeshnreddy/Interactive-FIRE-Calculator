# Migration 0006 — primary-reviewed preview-only authorization packet

Target: `finpath-preview`, UUID `0dbad68e-7493-452f-8504-98d4c61ee5da`, selected explicitly by `--env preview`. No production authorization.

## Verified prerequisite state

Primary ran `npx wrangler d1 migrations list finpath-preview --env preview --remote` on 2026-09-15 UTC. Only `0006_user_tombstone_triggers.sql` is pending. Raw output: `../C06-primary/remote-pending-migrations.log`. Prior packet's unverified 0005 status is superseded. Recheck immediately before apply; stop if any other migration is pending or target binding differs.

## Change and evidence

0006 installs 29 triggers: INSERT/UPDATE protection for all 14 user-owned child tables and users resurrection guard. It adds no tables and deletes no financial rows. Existing and missing-user deletion protections have been tested locally against actual migrations. Candidate 7b5cc31 has passing hosted CI 34930889299. Trigger SQL remains unchanged by primary verification-tool repairs.

## Authorized operation requested, not yet performed

After explicit owner approval for this exact preview target, recheck `wrangler.toml` preview DB UUID and pending migration list. Then use tracked migration application, not untracked direct SQL:

```bash
npx wrangler d1 migrations list finpath-preview --env preview --remote
npx wrangler d1 migrations apply finpath-preview --env preview --remote
```

If anything other than 0006 is pending, stop: this request does not authorize it. Capture command/exit and migration ledger entry. Inspect sqlite_master for all 29 exact trigger names, tables and SQL bodies against the file, not count alone. No financial row export is needed. Confirm effective Pages preview binding before publishing changed backend. Deploy only to an explicit nonproduction preview branch after all relevant tests and migration validation pass.

## Rollout and rollback

Keep this an isolated preview. Do not serve a backend relying on 0006 until its installation is verified. Recheck automatic Git deployment state/binding rather than assuming manual deployment is the only path.

Preserve all 29 guards and tombstones on rollback. Do NOT drop triggers and rely on application preflight checks: that reintroduces the reproduced check/write race. If preview malfunctions, stop preview writes/serving and investigate a compatible forward repair. Code rollback is allowed only when it preserves tombstone semantics and passes local migration compatibility tests; reverting to code that clears deleted_at is unsafe. No production restore, DNS change or destructive rollback is included.

## Remaining gates

Remote mutation has not been authorized or executed. Browser evidence and C06 acceptance remain separate gates; applying this migration alone would not close C06 or release C07. Native reader checks remain deferred under the existing owner amendment.
