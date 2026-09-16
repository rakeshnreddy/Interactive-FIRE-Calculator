# C07 / B06 validation matrix

Candidate implementation commit: `383790b35249ddf36086bcb1d2253de5a5a93b20`

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| C07-01 | Verify preview D1 before hosted writes | PASS, read-only | Cloudflare project API returned preview DB `0dbad68e-7493-452f-8504-98d4c61ee5da`; no hosted writes performed. |
| C07-02 | Verify Clerk tenant ownership and matching client/server credentials | BLOCKED | Clerk dashboard is signed out and owner confirmed they never created a Clerk account. Cloudflare exposes secret names but not values. A 401 does not establish a credential match. |
| C07-03 | Reproducible secure client-key build | PASS | `preview-build-tests.log`: 5 focused tests plus full runner contract; `preview-build.log`: authenticated preview build path, 0 fixture leaks, 0 secret-shaped server values. |
| C07-04 | Prevent server secrets entering Vite client env | PASS | Negative tests reject explicit `VITE_CLERK_SECRET_KEY` and `VITE_PROVIDER_SECRET` loaded from `.env.production.local`. |
| C07-05 | Browser signup/signin/refresh/signout with users A/B | BLOCKED | No owned Clerk development tenant exists yet; no synthetic identities were created. |
| C07-06 | Save/reload/profile/import/export and cross-user read/write isolation | BLOCKED | Depends on C07-02 and C07-05. No financial writes were attempted. |
| C07-07 | Delete A data, prove late-write 410, delete both provider users, cleanup B | BLOCKED | Depends on owned disposable identities and authenticated hosted lifecycle. No cleanup is due because no identities/data were created. |
| C07-08 | Full local regression suite | PASS | `test-all.log`: Python 79 tests + 21 subtests; Vitest 47 files / 1608 tests; typecheck and production build pass; 0 fixture leaks. |
| C07-09 | Production guard remains fail-closed | PASS, unchanged | Existing production preflight is unchanged; no production/DNS/provider configuration was modified. |
| C07-10 | Preview deploy, public smoke, normal responsive/theme/keyboard/error/console checks | BLOCKED | Deployment intentionally withheld because the only discoverable prior tenant is ownership-unverified. Native 200% zoom and reader checks remain owner-deferred. |
