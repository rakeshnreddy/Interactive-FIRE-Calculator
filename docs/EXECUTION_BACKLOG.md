# Ordered execution backlog

2026-09-07. Start with the first unchecked **Ready** item. **Owner-blocked** items stay visible but do not prevent unrelated Ready work. Do not re-plan the product before executing an item. Each item is a bounded PR; split if its acceptance criteria cannot fit the estimate. [Audit](CURRENT_STATE_AUDIT.md), [security roadmap](TECHNICAL_AND_SECURITY_ROADMAP.md), [measurement](MEASUREMENT_AND_EXPERIMENT_PLAN.md) define contracts. No merge/production deployment is authorized.

## P0: safety and executable proof

- [x] **B01 — Complete: full verification must not silently skip runtimes.**
  - User problem/evidence: incorrect calculations could ship under a misleading green check; runner has skip branches; PR has only a Pages check.
  - Outcome/scope: require Python/Node/npm before running; regression-test runner failure/success paths; locked npm install; automatic least-privilege PR full-suite workflow.
  - Non-goals/files: no UI/formula/auth/data changes or merge-policy edits. `scripts/test_all.sh`, new `scripts/test_all.test.mjs`, `.github/workflows/verify.yml`, README test instructions.
  - Acceptance: missing runtimes exit nonzero before work; compile, Python test, typecheck, Vitest and build failures stop chain; success executes all; real suite and hosted CI pass.
  - Analytics: CI full-suite success and skipped-stage count zero; no user events.
  - Tests/privacy/dependencies: isolated temporary subprocess fixtures then real full suite; official action SHA pins, contents read-only, no secrets or deployment step. Requires existing runtimes only.
  - Completion evidence: implementation `1664043`; 13 runner regression tests, 79 Python tests plus 21 subtests, 1,269 Vitest tests, typecheck and build passed. [Hosted full suite](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34194698348) passed; [preview](https://75358a37.interactive-fire-calculator.pages.dev) passed all 84 public HTTP route checks. Next: B02.
  - Migration/rollback/effort: no migration; revert delivery commit. Human 0.5–1 day; agent 1–2 hours plus CI.

- [ ] **B02 — Ready: reject incompatible currency conversion into goals.**
  - Problem/evidence: generic save API can drop INR/EUR into currency-less goal amounts (`goalPayloadFromCalculator`); dedicated UI guards are insufficient.
  - Outcome/scope: server rejects unsupported goal conversion before any write with a user-safe message; public calculations/share/export continue in original currency. Keep current USD contract until separate schema migration.
  - Non-goals/files: no FX conversion, no silent currency relabel, no record rewrite. `functions/_lib/calculatorResults.ts`, endpoint contract, `src/calculatorResults.test.ts`, affected save error rendering only if needed.
  - Acceptance: non-USD `/goals` save yields typed 400 and zero inserts; USD retains exact output; supported snapshots/account routes retain currency; user can export without switching currency.
  - Analytics/tests: rejected-conversion count by safe error code, no amounts; regression and endpoint tests including manually forged request, USD success and no-write spy, public-route smoke.
  - Privacy/dependencies: auth before parse; no production records. B01 verification supports rollout, no owner secret needed for local proof.
  - Migration/rollback/effort: no schema; rollback only to a safe disabled-conversion mode, not unsafe reinterpretation. Human 1 day; agent 2–4 hours.

- [ ] **B03 — Ready: prevent mixed-currency account totals.**
  - Problem/evidence: `summarizeAccounts` adds balances regardless of `account.currency`.
  - Outcome/scope: group summary totals by currency and require explicit matching currency for plan imports. Display a clear unavailable combined total for mixed sets; never invent an exchange rate.
  - Non-goals/files: no FX feed or conversion; accounts helpers, dashboard response/types, App summary, `planWorkspace`, tests.
  - Acceptance: USD 100 + INR 100 never displays USD 200; liabilities reconcile per currency; single-currency behavior unchanged; plan import rejects mismatched units.
  - Analytics/tests: currency-mismatch error enum only; mixed/empty/negative/archived cases, real local D1 and desktop/mobile/keyboard rendering.
  - Privacy/dependencies: old rows keep original currency; inspect historical data only with scoped owner authorization. B02; no automatic production migration.
  - Rollback/effort: feature-gate combined summary off; no data rewrite. Human 2–3 days; agent 4–8 hours.

- [ ] **B04 — Ready: atomic, retry-safe calculator save.**
  - Problem/evidence: destination creation precedes separate result insert; retries can create duplicate goals/accounts.
  - Outcome/scope: user-scoped idempotency key and transaction/batch for destination + result, identical retry returns original entity; payload mismatch with same key conflicts.
  - Non-goals/files: no automatic linkage of old results; `calculatorResults`, API, client save call, new additive migration, real D1 integration tests.
  - Acceptance: injected failure leaves no orphan; simultaneous identical saves create one result/entity; foreign-user key cannot read another result; conflicting payload 409; transaction destination creates no fake ledger entry.
  - Analytics/tests: committed-save/retry/conflict enums, no payload; concurrency/fault tests on local D1, existing regressions and hosted synthetic test when auth is available.
  - Privacy/dependencies: hash only canonical validated payload; same-user scope. B02–B03, review migration before remote application.
  - Rollback/effort: additive schema retained; disable new save entry point on issue, do not drop tables. Human 2 days; agent 4–8 hours.

- [ ] **B05 — Ready: executable tenancy/auth boundary harness.**
  - Problem/evidence: many fake SQL tests; hosted signed-in journey unverified.
  - Outcome/scope: local D1 schema + synthetic two-user fixtures, injected verified-session seam only in tests; prove CRUD, relationships, imports, versions, export and delete isolation; separate current-SDK auth tests.
  - Non-goals/files: no test auth bypass deployed. API tests, session tests, local integration config, migrations as fixtures.
  - Acceptance: cross-user IDs denied without writes; expired/wrong-origin tokens rejected; malformed and oversized payloads rejected before resource-heavy work; exports contain one tenant only; deletion leaves second tenant untouched.
  - Analytics/tests: test report and error counters only; successful/failure/concurrent requests. No real records/secrets in fixtures or logs.
  - Dependencies/rollback/effort: B04; local only, remove harness configuration if faulty. Human 3–5 days; agent 8–16 hours. Split auth and D1 harness into sequential PRs if needed.

- [ ] **B06 — Owner-blocked: working hosted auth and lifecycle.**
  - Problem/evidence: both previews missing browser key; 0/6 production preflight; Cloudflare preview DB currently matches configured production database.
  - Outcome/scope: first configure and verify an approved isolated preview database using effective deployment metadata, then approved preview Clerk config; disposable hosted user sign-up/in/out, refresh, save/reload, profile, import/export/delete; separate owned production setup and eventual release approval.
  - Non-goals/files: no DNS/production changes without owner authorization; runbook and hosted test evidence only, secure provider settings.
  - Acceptance: preview DB differs from production before all write tests; end-to-end identity/save/export/delete and second-user isolation pass; public routes still work; production preflight remains fail-closed until all genuine prerequisites complete.
  - Analytics/tests: journey pass/fail and durations, no tokens; desktop/mobile actual sessions and expiry.
  - Privacy/dependencies: owner supplies exact origin and secure settings, disposable identity; B02–B05. Never use an existing personal identity to test deletion.
  - Rollback/effort: revert preview config safely; preserve production guard. Human 1–3 days plus DNS/provider waits; agent 4–8 hours after setup.

- [ ] **B07 — Ready for local design/test: deletion and recovery contract.**
  - Problem/evidence: D1 delete excludes Clerk/device drafts/backups; profile can be recreated; export lacks consistent snapshot.
  - Outcome/scope: document true erasure boundary, clear local drafts explicitly, add deletion-in-progress guard and recovery replay design; isolated synthetic restore drill.
  - Non-goals/files: no real production restore/delete. accountData, persistence, Settings, storage helpers, recovery runbook and additive deletion-state migration if reviewed.
  - Acceptance: delayed write/offline replay cannot resurrect deleted user data; export consistency policy tested; provider/Clerk boundary stated accurately; restore exercise re-applies tombstones before serving.
  - Analytics/tests: deletion completion duration without retained financial data; race, failure, export-large-data and shared-device tests.
  - Privacy/dependencies: B05; owner legal retention choice and approved isolated environment before hosted exercise.
  - Rollback/effort: keep deletion paused with honest error if unsafe; never remove tombstones to restore behavior. Human 2–4 days; agent 6–12 hours.

## P1: prove one repeated job

- [ ] **B08 — Ready: mortgage payoff reconciliation regression.**
  - Problem/evidence: mobile $200,000 / 6.5% / 30y mortgage shows 361 payoff months vs 360 schedule rows.
  - Outcome/scope: reproduce engine/visual rounding divergence, reference fixed-payment formula, choose explicit final residual tolerance and document migration decision before changing shared math.
  - Non-goals/files: no `fire.ts` edits or broad formula rewrite; loan helper in `seoCalculators`, studio data, golden tests, `docs/calculators/` contract.
  - Acceptance: 300k and 200k cases reconcile headline/rows/final balance; zero-rate/prepayment/near-zero residual cases pass; no shortened real payoff from excessive tolerance.
  - Analytics/tests/privacy: correction count, no amounts logged; regression first plus shared goldens and hosted mobile schedule. B01 only.
  - Rollback/effort: revert formula commit while clearly labeling discrepancy; no saved-data rewrite. Human 1 day; agent 2–4 hours.

- [ ] **B09 — Ready: remove internal instructions from calculator copy.**
  - Problem/evidence: “Phase 22” and “Connect loan results…” visible in mortgage; auth gate exposes setup internals.
  - Outcome/scope: user-facing explanation of assumptions, save availability and limits; guard against internal phase/instruction text.
  - Non-goals/files: no new claims or ranking copy; calculatorStudios/Quality, auth gate copy, content tests.
  - Acceptance: sampled and registry copy has no phase/SEO/internal directives; missing-auth page offers working public route with honest unavailable account action; desktop/mobile/keyboard/zoom checks.
  - Analytics/tests/privacy: comprehension task, not conversion pressure; copy guard tests and public render. B01; no analytics added by this copy change.
  - Rollback/effort: revert copy only. Human 0.5 day; agent 1–3 hours.

- [ ] **B10 — Ready after B02–B06: restore the exact saved FIRE decision.**
  - Problem/evidence: dashboard follow-ups navigate only to list routes; users must find their saved work.
  - Outcome/scope: stable decision/plan deep link with explicit version loading and missing/archived states; first pilot FIRE only.
  - Non-goals/files: no new calculator routes/auto-imports; App navigation, PlanningWorkspace, safe route parser, tests.
  - Acceptance: click saved item -> correct user-owned plan/version; unrelated current edits require choice; foreign/missing ID cannot load; refresh/back works.
  - Analytics/tests/privacy: consented saved-decision-open only after B12; route parsing, ownership, unsaved-change tests and actual hosted journey; no finance in query string.
  - Rollback/effort: return to list fallback; no data migration. Human 1–2 days; agent 3–6 hours.

- [ ] **B11 — Ready after B10: complete one monthly plan review.**
  - Problem/evidence: no persistent review/next-review model; buildCalculatorFollowUp provides static guidance only.
  - Outcome/scope: additive review record linking plan version, source dates and keep/revise/defer; explicit next date; in-app due list; dated inputs and comparison.
  - Non-goals/files: no email, bank automation, implied recommendations or automatic plan mutation; review migration/API, PlanningWorkspace, dashboard, planHealth.
  - Acceptance: activation records baselineAt; first returning review is at least 7 days later; one review closes only after explicit decision; stale evidence disclosed; unchanged inputs can be confirmed; retries safe; keyboard/mobile/zoom/reduced-motion pass; source/version remains immutable.
  - Analytics/tests/privacy: `review_completed` consented contract after B12; time-zone/duplicate/foreign-user/archived/empty/error cases, D1 transaction proof and hosted synthetic flow.
  - Dependencies/rollback/effort: B04–B07, B10; additive schema with feature flag off on error. Human 3–5 days; agent 8–16 hours.

- [ ] **B12 — Owner-policy dependent: consented minimal measurement.**
  - Problem/evidence: no activation/retention baseline.
  - Outcome/scope: implement allowlisted event contract, consent/revocation, 90-day raw TTL and aggregate report as specified in measurement plan.
  - Non-goals/files: no replay/vendor SDK/raw URL/financial fields; first-party endpoint, consent UI, bounded event migration and deletion hook.
  - Acceptance: rejecting consent does not block functionality; unknown properties rejected; dedup, rate/body bounds, opt-out and delete purge pass; matured cohort denominators tested, including a day-104 return after day-90 raw cleanup via the minimal day-120 cohort table.
  - Analytics/tests/privacy: event-schema tests, opt-out network audit, synthetic cohort fixture; owner privacy policy and B07 required.
  - Rollback/effort: collection off; purge permitted records according to policy. Human 2–3 days; agent 6–10 hours.

## P2 and P3: gates, not promises

- [ ] **B13 — Retention/owner-blocked: first paid offer.**
  - Problem/evidence: no proven payment value; price models are hypotheses.
  - Outcome/scope: after retention gate, one Plus tier and explicit price trial; billing entitlements, refunds/cancel, downgrade-read access. Begin with clearly labeled no-charge intent study.
  - Non-goals/files: no ads/affiliates/coaching promises; future billing API/webhook/entitlements, settings and tests.
  - Acceptance: owner provider/tax/terms ready; verified signatures, idempotent webhook, cancellation and export access pass; no charge without clear assent.
  - Analytics/tests/privacy: qualified paid conversion, refunds, retained paid reviews; webhook replay/failure/downgrade tests; no card data stored. B06–B12 and >=6/20 M1 returns in repeated cohort.
  - Rollback/effort: disable checkout, honor existing service/refunds; keep entitlement audit. Human 1–2 weeks; agent 2–4 days after owner setup.

- [ ] **B14 — Gate-only: mobile capability study.**
  - Problem/evidence: mobile layout works in samples; no evidence native capability is needed.
  - Outcome/scope: observe 15 retained mobile users, identify 5 web-specific obstacles, compare responsive/PWA prototype before second client.
  - Non-goals/files: no stores/offline financial cache/bank connection now; companion decision doc, prototype only after gate.
  - Acceptance: companion document's stable-contract/retention/security thresholds met and owner budget authorized; prototype improves task completion, not just installs.
  - Analytics/tests/privacy: review completion and notification opt-outs; device/session/revocation/offline-deletion threat tests if built. B11–B12 and matured M3 cohort.
  - Rollback/effort: remove opt-in prototype, preserve web; discovery 1 week human, agent 1–2 days excluding observation.

## Milestone reporting

For each item record commit, changed files, red/green tests, local full-suite result, PR/CI URL, immutable preview URL and hosted verification scope. Report remaining risks and the exact next Ready item. Production readiness is never inferred from document completion or preview deployment.
