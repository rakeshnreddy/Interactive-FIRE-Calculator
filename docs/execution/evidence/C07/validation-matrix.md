# C07 / B06 validation matrix

Implementation commit: `383790b35249ddf36086bcb1d2253de5a5a93b20`
Deployed/evidence commit: `d81f31187892f636ab9d2b6cb492e90e9b7d166d`

| ID | Requirement | Result | Evidence |
|---|---|---|---|
| C07-01 | Verify isolated preview D1 before writes | PASS | Deployment API and independent reviewer readback identified preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`, distinct from production `a5860350-0a50-4ebe-9f5f-1d9916a908e6`. |
| C07-02 | Verify owner-controlled matching Clerk development tenant | PASS | Signed-in Clerk dashboard showed Personal/Hobby, Finpath app `app_3EzmNqZyUgQlO1n2nrftcHWizyV`, development instance `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`; deployed client rendered that instance's real sign-in controls. |
| C07-03 | Reproducible secure client-key build | PASS | `preview-build-tests.log`: focused tests and runner contract; `preview-build.log`: authenticated preview build, 0 fixture leaks, 0 server-secret-shaped values. |
| C07-04 | Prevent server secrets entering Vite client env | PASS | Negative tests reject explicit secret names and values loaded through effective Vite production-mode env files. |
| C07-05 | Browser signup/signin/refresh/signout with users A/B | PASS | Exactly two Clerk documented `+clerk_test` users completed browser email/phone verification with documented test OTP, authenticated app sessions, reload/session refresh, explicit sign-out, and password sign-in. |
| C07-06a | Account/profile/plan save and reload; export | PASS | A saved an account with $12,500 and profile defaults, reloaded both, exported schema v1 JSON, and saved/reloaded plan version 1. B saw zero accounts and saved/reloaded its own plan version 1. |
| C07-06b | CSV import | PASS | Primary browser selection → preview200 → commit201; exact balance/history persisted in D1 and after authenticated reload. [Report](remaining/report.json), [render](remaining/import_result.png). |
| C07-06c | Cross-user reads and writes rejected | PASS | B own GET200/empty; B-to-A GET/PUT404; A complete account unchanged. [Report](remaining/report.json). |
| C07-07 | Delete data, late-write410, provider cleanup | PASS | Valid profile PUT200, DELETE200, still-authenticated PUT410. Independent six-ID provider404, six tombstones,84 zero table counts. [Cleanup](remaining/primary-cleanup-final.json). |
| C07-08 | Full local regression and exact CI | PASS | `test-all.log`: Python 79 tests + 21 subtests; Vitest 47 files / 1608 tests; typecheck/build pass; 0 fixture leaks. Exact-head Actions run `35046701891` succeeded at `d81f31187892f636ab9d2b6cb492e90e9b7d166d`. |
| C07-09 | Production guard remains fail-closed | PASS | Production preflight rejected preview auth input; no production/DNS/main configuration changed. |
| C07-10 | Explicit preview candidate | PASS | Immutable preview `https://3eed38e6.interactive-fire-calculator.pages.dev`, deployment `3eed38e6-e45b-4844-b62b-dd9655f6b57d`, success, exact SHA `d81f31187892f636ab9d2b6cb492e90e9b7d166d`, Functions enabled and preview D1 read back. Native 200% zoom and reader checks remain deferred. |

## Cleanup proof

Final primary read-only verification: all six exact synthetic IDs from the initial walkthrough and two primary runs have provider404, preserved non-null tombstones and zero rows across14 scoped tables each. [Final cleanup](remaining/primary-cleanup-final.json). Current [hosted report](remaining/report.json) supersedes earlier missing-key blocker reports. No personal identities, credentials or production records were touched.17 focused harness tests and full suite passed; actual readers/native200% remain deferred.
