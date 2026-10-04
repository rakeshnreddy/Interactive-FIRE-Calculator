# Ordered execution backlog

2026-09-07. For delegated execution, follow [the checkpoint order](execution/CHECKPOINTS.md), not numeric ID order. Start only within the released checkpoint. Only the primary reviewer may check an item complete. See [task prompts and status](execution/README.md). **Owner-blocked** items stay visible but do not prevent unrelated Ready work. Do not re-plan the product before executing an item. Each item is a bounded PR; split if its acceptance criteria cannot fit the estimate. [Audit](CURRENT_STATE_AUDIT.md), [security roadmap](TECHNICAL_AND_SECURITY_ROADMAP.md), [measurement](MEASUREMENT_AND_EXPERIMENT_PLAN.md) define contracts. No merge/production deployment is authorized.

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

- [x] **B02 — Accepted: reject incompatible currency conversion into goals.**
  - Problem/evidence: generic save API can drop INR/EUR into currency-less goal amounts (`goalPayloadFromCalculator`); dedicated UI guards are insufficient.
  - Outcome/scope: server rejects unsupported goal conversion before any write with a user-safe message; public calculations/share/export continue in original currency. Keep current USD contract until separate schema migration.
  - Non-goals/files: no FX conversion, no silent currency relabel, no record rewrite. `functions/_lib/calculatorResults.ts`, endpoint contract, `src/calculatorResults.test.ts`, affected save error rendering only if needed.
  - Acceptance: non-USD `/goals` save yields typed 400 and zero inserts; USD retains exact output; supported snapshots/account routes retain currency; user can export without switching currency.
  - Analytics/tests: rejected-conversion count by safe error code, no amounts; regression and endpoint tests including manually forged request, USD success and no-write spy, public-route smoke.
  - Privacy/dependencies: auth before parse; no production records. B01 verification supports rollout, no owner secret needed for local proof.
  - Migration/rollback/effort: no schema; rollback only to a safe disabled-conversion mode, not unsafe reinterpretation. Human 1 day; agent 2–4 hours.

- [x] **B03 — Accepted: prevent mixed-currency account totals.**
  - Problem/evidence: `summarizeAccounts` adds balances regardless of `account.currency`.
  - Outcome/scope: group summary totals by currency and require explicit matching currency for plan imports. Display a clear unavailable combined total for mixed sets; never invent an exchange rate.
  - Non-goals/files: no FX feed or conversion; accounts helpers, dashboard response/types, App summary, `planWorkspace`, tests.
  - Acceptance: USD 100 + INR 100 never displays USD 200; liabilities reconcile per currency; single-currency behavior unchanged; plan import rejects mismatched units.
  - Analytics/tests: currency-mismatch error enum only; mixed/empty/negative/archived cases, real local D1 and desktop/mobile/keyboard rendering.
  - Privacy/dependencies: old rows keep original currency; inspect historical data only with scoped owner authorization. B02; no automatic production migration.
  - Rollback/effort: feature-gate combined summary off; no data rewrite. Human 2–3 days; agent 4–8 hours.

- [x] **B04 — Accepted: atomic, retry-safe calculator save.**
  - Problem/evidence: destination creation precedes separate result insert; retries can create duplicate goals/accounts.
  - Outcome/scope: user-scoped idempotency key and transaction/batch for destination + result, identical retry returns original entity; payload mismatch with same key conflicts.
  - Non-goals/files: no automatic linkage of old results; `calculatorResults`, API, client save call, new additive migration, real D1 integration tests.
  - Acceptance: injected failure leaves no orphan; simultaneous identical saves create one result/entity; foreign-user key cannot read another result; conflicting payload 409; transaction destination creates no fake ledger entry.
  - Analytics/tests: committed-save/retry/conflict enums, no payload; concurrency/fault tests on local D1, existing regressions and hosted synthetic test when auth is available.
  - Privacy/dependencies: hash only canonical validated payload; same-user scope. B02–B03, review migration before remote application.
  - Rollback/effort: additive schema retained; disable new save entry point on issue, do not drop tables. Human 2 days; agent 4–8 hours.

- [x] **B05 — Ready: executable tenancy/auth boundary harness.**
  - Problem/evidence: many fake SQL tests; hosted signed-in journey unverified.
  - Outcome/scope: local D1 schema + synthetic two-user fixtures, injected verified-session seam only in tests; prove CRUD, relationships, imports, versions, export and delete isolation; separate current-SDK auth tests.
  - Non-goals/files: no test auth bypass deployed. API tests, session tests, local integration config, migrations as fixtures.
  - Acceptance: cross-user IDs denied without writes; expired/wrong-origin tokens rejected; malformed and oversized payloads rejected before resource-heavy work; exports contain one tenant only; deletion leaves second tenant untouched.
  - Analytics/tests: test report and error counters only; successful/failure/concurrent requests. No real records/secrets in fixtures or logs.
  - Dependencies/rollback/effort: B04; local only, remove harness configuration if faulty. Human 3–5 days; agent 8–16 hours. Split auth and D1 harness into sequential PRs if needed.

- [x] **B06 — Accepted: working hosted preview auth and lifecycle.**
  - Problem/evidence: hosted disposable-user Clerk lifecycle remains unverified. Historical missing-key/shared-DB findings are superseded: C06 preview 5e68409d has verified isolated finpath-preview binding and migration 0006. Recheck current browser/server configuration securely; key presence alone does not prove working sessions. Production remains gated.
  - Outcome/scope: first configure and verify an approved isolated preview database using effective deployment metadata, then approved preview Clerk config; disposable hosted user sign-up/in/out, refresh, save/reload, profile, import/export/delete; separate owned production setup and eventual release approval.
  - Non-goals/files: no DNS/production changes without owner authorization; runbook and hosted test evidence only, secure provider settings.
  - Acceptance: preview DB differs from production before all write tests; end-to-end identity/save/export/delete and second-user isolation pass; public routes still work; production preflight remains fail-closed until all genuine prerequisites complete.
  - Analytics/tests: journey pass/fail and durations, no tokens; desktop/mobile actual sessions and expiry.
  - Privacy/dependencies: owner supplies exact origin and secure settings, disposable identity; B02–B05. Never use an existing personal identity to test deletion.
  - Rollback/effort: revert preview config safely; preserve production guard. Human 1–3 days plus DNS/provider waits; agent 4–8 hours after setup.

- [x] **B07 — Ready for local design/test: deletion and recovery contract.**
  - Problem/evidence: D1 delete excludes Clerk/device drafts/backups; profile can be recreated; export lacks consistent snapshot.
  - Outcome/scope: document true erasure boundary, clear local drafts explicitly, add deletion-in-progress guard and recovery replay design; isolated synthetic restore drill.
  - Non-goals/files: no real production restore/delete. accountData, persistence, Settings, storage helpers, recovery runbook and additive deletion-state migration if reviewed.
  - Acceptance: delayed write/offline replay cannot resurrect deleted user data; export consistency policy tested; provider/Clerk boundary stated accurately; restore exercise re-applies tombstones before serving.
  - Analytics/tests: deletion completion duration without retained financial data; race, failure, export-large-data and shared-device tests.
  - Privacy/dependencies: B05; owner legal retention choice and approved isolated environment before hosted exercise.
  - Rollback/effort: keep deletion paused with honest error if unsafe; never remove tombstones to restore behavior. Human 2–4 days; agent 6–12 hours.

## P1: prove one repeated job

- [x] **B08 — Accepted: mortgage payoff reconciliation regression.**
  - Problem/evidence: mobile $200,000 / 6.5% / 30y mortgage shows 361 payoff months vs 360 schedule rows.
  - Outcome/scope: reproduce engine/visual rounding divergence, reference fixed-payment formula, choose explicit final residual tolerance and document migration decision before changing shared math.
  - Non-goals/files: no `fire.ts` edits or broad formula rewrite; loan helper in `seoCalculators`, studio data, golden tests, `docs/calculators/` contract.
  - Acceptance: 300k and 200k cases reconcile headline/rows/final balance; zero-rate/prepayment/near-zero residual cases pass; no shortened real payoff from excessive tolerance.
  - Analytics/tests/privacy: correction count, no amounts logged; regression first plus shared goldens and hosted mobile schedule. B01 only.
  - Rollback/effort: revert formula commit while clearly labeling discrepancy; no saved-data rewrite. Human 1 day; agent 2–4 hours.

- [x] **B09 — Ready: remove internal instructions from calculator copy.**
  - Problem/evidence: “Phase 22” and “Connect loan results…” visible in mortgage; auth gate exposes setup internals.
  - Outcome/scope: user-facing explanation of assumptions, save availability and limits; guard against internal phase/instruction text.
  - Non-goals/files: no new claims or ranking copy; calculatorStudios/Quality, auth gate copy, content tests.
  - Acceptance: sampled and registry copy has no phase/SEO/internal directives; missing-auth page offers working public route with honest unavailable account action; desktop/mobile/keyboard/zoom checks.
  - Analytics/tests/privacy: comprehension task, not conversion pressure; copy guard tests and public render. B01; no analytics added by this copy change.
  - Rollback/effort: revert copy only. Human 0.5 day; agent 1–3 hours.

- [x] **B10 — Ready after B02–B06: restore the exact saved FIRE decision.**
  - Problem/evidence: dashboard follow-ups navigate only to list routes; users must find their saved work.
  - Outcome/scope: stable decision/plan deep link with explicit version loading and missing/archived states; first pilot FIRE only.
  - Non-goals/files: no new calculator routes/auto-imports; App navigation, PlanningWorkspace, safe route parser, tests.
  - Acceptance: click saved item -> correct user-owned plan/version; unrelated current edits require choice; foreign/missing ID cannot load; refresh/back works.
  - Analytics/tests/privacy: consented saved-decision-open only after B12; route parsing, ownership, unsaved-change tests and actual hosted journey; no finance in query string.
  - Rollback/effort: return to list fallback; no data migration. Human 1–2 days; agent 3–6 hours.

- [x] **B11 — Ready after B10: complete one monthly plan review.**
  - Problem/evidence: no persistent review/next-review model; buildCalculatorFollowUp provides static guidance only.
  - Outcome/scope: additive review record linking plan version, source dates and keep/revise/defer; explicit next date; in-app due list; dated inputs and comparison.
  - Non-goals/files: no email, bank automation, implied recommendations or automatic plan mutation; review migration/API, PlanningWorkspace, dashboard, planHealth.
  - Acceptance: activation records baselineAt; first returning review is at least 7 days later; one review closes only after explicit decision; stale evidence disclosed; unchanged inputs can be confirmed; retries safe; keyboard/mobile/zoom/reduced-motion pass; source/version remains immutable.
  - Analytics/tests/privacy: `review_completed` consented contract after B12; time-zone/duplicate/foreign-user/archived/empty/error cases, D1 transaction proof and hosted synthetic flow.
  - Dependencies/rollback/effort: B04–B07, B10; additive schema with feature flag off on error. Human 3–5 days; agent 8–16 hours.

- [x] **B12 — Owner-policy dependent: consented minimal measurement.**
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

## Visual and UI quality work and safe preview prerequisite (B15–B33)

Based on [the visual audit](VISUAL_AND_UI_AUDIT.md) and [design contract](VISUAL_DESIGN_SPEC.md). Every item below remains unimplemented until independently accepted.

- [x] **B15 — Accepted: Repair light/dark contrast defects.**
  - User problem/evidence: Invisible Sign in and low-contrast continuity heading prevent basic reading. Visual audit V01–V02.
  - Expected outcome/scope: Sign in is visibly labeled in light/dark mode; homepage inverse heading meets large-text contrast; normal button text meets 4.5:1; focus remains visible; no other header or calculator color regresses.
  - Non-goals: No redesign, token-wide migration, auth setup, formula change or hidden controls.
  - Files likely affected: src/vivid-theme.css; src/styles.css; src/App.tsx header and LandingPage; new contrast/browser regression evidence.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B01 (complete). Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 0.5–1 day; agent 2–4 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B15.md](execution/prompts/B15.md).

- [x] **B16 — Accepted: Establish authoritative design tokens and primitives.**
  - User problem/evidence: Conflicting generations of CSS make consistent polish unreliable. Visual audit V03/V11.
  - Expected outcome/scope: One canonical token table matches rendered colors; changed inputs 16px at default settings; buttons have documented hit areas; inverse headings retain contrast; shared style changes pass representative light/dark screenshots.
  - Non-goals: No wholesale 10k-line rewrite, font replacement, framework install, giant App extraction or automatic deletion of unproven unused CSS.
  - Files likely affected: src/styles.css; src/vivid-theme.css; src/main.tsx; DESIGN.md; optional src/components/ui/ for actually reused primitives.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B15. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B16.md](execution/prompts/B16.md).

- [x] **B17 — Accepted: Polish public/account navigation and keyboard behavior.**
  - User problem/evidence: Signed-out visitors see private destinations first and mobile disclosure ignores Escape. Visual audit V05–V06.
  - Expected outcome/scope: Mobile Escape closes and returns focus; no hidden focusable navigation; selected route exposed; public primary path works without auth; native link behavior and back/forward pass.
  - Non-goals: No auth bypass, new routing framework, production setup or unrelated route renaming.
  - Files likely affected: src/App.tsx DesktopNavigation/TopbarAuthActions/mobile navigation; src/styles.css; new navigation tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 3–6 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B17.md](execution/prompts/B17.md).

- [x] **B18 — Planned: Replace generic homepage hero with authentic product composition.**
  - User problem/evidence: Phone/card imagery obscures the actual calculator and suggests unsupported products. Visual audit V04.
  - Expected outcome/scope: At 1440x900 public CTA and real example answer visible; at 390px primary action within 600px at normal text; example visibly synthetic; no unsupported product claims; all existing useful routes retained.
  - Non-goals: No banking/mobile launch claims, invented testimonials, new legal policy, pricing or tracking SDK.
  - Files likely affected: src/App.tsx LandingPage; src/styles.css landing rules; existing public/assets hero reference; optional dedicated LandingPage component.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B17. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B18.md](execution/prompts/B18.md).

- [x] **B19 — Planned: Make calculator discovery concise and distinctive.**
  - User problem/evidence: Repetitive panels and counts distract from choosing the right calculator. Visual audit V13.
  - Expected outcome/scope: All public tools reachable; FIRE discoverable; search state robust; no-match helpful; route link semantics native; consistent light/dark mobile/desktop hierarchy.
  - Non-goals: No new calculators, ranking copy, new search service or changed calculator metadata math.
  - Files likely affected: src/CalculatorLibrary.tsx CalculatorHub/ToolkitPanel/SearchCard; src/lib/calculatorToolkits.ts; src/styles.css; discovery tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B17. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 3–6 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B19.md](execution/prompts/B19.md).

- [x] **B20 — Accepted: Reorder generic calculators around inputs and the answer.**
  - User problem/evidence: India tax first input begins at y=1206 on a 390px phone. Visual audit V07–V08/V12.
  - Expected outcome/scope: Representative first control at or before y=650 at 390px normal text; no essential assumption removed; main answer visually dominant; keyboard order logical; no forced global overflow hiding.
  - Non-goals: No formula rewrite, chart truth implementation (B21), saving API changes or broad replacement of dedicated calculators.
  - Files likely affected: src/CalculatorLibrary.tsx CalculatorDetail/ScenarioPanel/SchedulePanel; src/styles.css; generic component tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B19. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B20.md](execution/prompts/B20.md).

- [x] **B21 — Accepted: Make shared charts numerically honest and accessible.**
  - User problem/evidence: Mixed-unit bars and minimum 8% zero bars imply false comparisons. Visual audit V09.
  - Expected outcome/scope: Zero never appears as a positive bar; sign visible; unrelated units never share scale; both series values accessible; no financial engine diff.
  - Non-goals: No engine math, invented forecast, chart animation dependency or hiding unfavorable outcomes.
  - Files likely affected: src/CalculatorLibrary.tsx CalculatorStudioVisual; src/lib/calculatorStudios.ts types only if necessary; src/styles.css; chart rendering tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B20. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B21.md](execution/prompts/B21.md).

- [x] **B22 — Accepted: Unify compound-interest and savings-goal presentation.**
  - User problem/evidence: Dedicated growth tools have excessive framing and inconsistent savings input text. Visual audit V10–V11.
  - Expected outcome/scope: Both tools use consistent visual primitives; savings input font fixed; preserved numeric goldens; essential result visible and useful details discoverable.
  - Non-goals: No merging the two engines, shared formula changes, FX conversion or replacing specialized tools with generic ones.
  - Files likely affected: src/CompoundInterestCalculator.tsx; src/SavingsGoalCalculator.tsx; src/styles.css; respective component tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B20, B21. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B22.md](execution/prompts/B22.md).

- [x] **B23 — Accepted: Unify budget, net-worth and emergency-fund presentation.**
  - User problem/evidence: Cash-flow tools need consistent hierarchy without losing different accounting meanings. Visual audit V10.
  - Expected outcome/scope: All three tools follow the visual contract; units and accounting meaning remain explicit; outputs unchanged; no input or warning hidden.
  - Non-goals: No account aggregation, formula change, gamification or currency relabeling.
  - Files likely affected: src/CashflowPlanningCalculator.tsx; src/styles.css; src/CashflowPlanningCalculator.test.tsx.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B20, B21. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B23.md](execution/prompts/B23.md).

- [x] **B24 — Accepted: Refine FIRE calculator into the flagship decision experience.**
  - User problem/evidence: FIRE needs the clearest result/assumption hierarchy and concise accessible labels. Visual audit V10/V12.
  - Expected outcome/scope: Both modes and advanced tools preserved; primary result and warnings easy to read; input help not repeated in name; no engine diff; changed interactions regression-tested.
  - Non-goals: No FIRE formula changes, new forecasting model, automatic saved-plan update or financial recommendations.
  - Files likely affected: src/App.tsx FIRE calculator sections; src/styles.css; existing FIRE tests plus new component/interaction tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B16, B20, B21. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B24.md](execution/prompts/B24.md).

- [x] **B25 — Planned: Build isolated operational UI fixtures for visual verification.**
  - User problem/evidence: Hosted auth blocks inspection of populated/error operational states. Visual audit V15.
  - Expected outcome/scope: All target real components render reproducible synthetic states locally; no fixture/auth bypass in production output; no network writes; harness instructions executable.
  - Non-goals: No copied static mock workspace, real records, production auth bypass or database seeding.
  - Files likely affected: new local-only fixture entry/config; src/App.tsx panel exports if required; src/PlanningWorkspace.tsx; synthetic fixture data and harness tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B05, B07, B16. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B25.md](execution/prompts/B25.md).

- [x] **B26 — Planned: Polish dashboard and account overview.**
  - User problem/evidence: Repeated use needs a dated financial picture and clear next decision. Visual audit V15.
  - Expected outcome/scope: No ambiguous totals; evidence dates visible; next action honest; account data edits persist in approved test environment; mobile rows and keyboard pass.
  - Non-goals: No banking connection, fake history, new account schema or combined FX total.
  - Files likely affected: src/App.tsx DashboardPanel/AccountsPanel; src/styles.css; fixture cases and component tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B25, B03, B06. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B26.md](execution/prompts/B26.md).

- [x] **B27 — Planned: Polish transactions and import review.**
  - User problem/evidence: Dense ledger/import interactions must remain clear on phones and during errors. Visual audit V15.
  - Expected outcome/scope: User can inspect what will change before commit; row errors and totals reconcile; filters/mobile/keyboard usable; retry does not duplicate records.
  - Non-goals: No parser replacement, increased limits, balance mutation or real statement upload.
  - Files likely affected: src/App.tsx TransactionsPanel/import UI; src/styles.css; import/component tests and fixtures.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B25, B06, B05. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B27.md](execution/prompts/B27.md).

- [x] **B28 — Planned: Polish goals and monthly plan-review workflow.**
  - User problem/evidence: Goals and saved reviews must show current evidence and a clear decision. Visual audit V15.
  - Expected outcome/scope: Review can be completed without ambiguity; source/version/dates visible; unsaved edits protected; no cosmetic false completion; B11 behavior retained.
  - Non-goals: No new reminder channel, auto-advice, collaboration or additional review schema.
  - Files likely affected: src/App.tsx GoalsPanel; src/PlanningWorkspace.tsx; src/styles.css; review fixtures/tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B10, B11, B25. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 4–8 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B28.md](execution/prompts/B28.md).

- [x] **B29 — Planned: Polish reports and readable financial evidence.**
  - User problem/evidence: Reports need honest scope, readable charts and usable exports. Visual audit V15.
  - Expected outcome/scope: Report scope and gaps clear; exported values agree; no color-only interpretation or misleading missing-data chart.
  - Non-goals: No AI financial advice, invented projections, new paid report product or new PDF service.
  - Files likely affected: src/App.tsx InsightsPanel/reports route; src/PlanningWorkspace.tsx report rendering if used; src/styles.css; report tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B25, B06, B21. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 3–6 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B29.md](execution/prompts/B29.md).

- [x] **B30 — Planned: Polish settings and privacy lifecycle controls.**
  - User problem/evidence: Privacy settings must be as understandable as the calculator. Visual audit V15.
  - Expected outcome/scope: Privacy actions visible, accurate and recoverable on failure; no premature deletion success; actual erasure boundary reflected in copy.
  - Non-goals: No new retention policy, live-user deletion, hidden export paywall or auth-provider lifecycle expansion.
  - Files likely affected: src/App.tsx ProfileSettingsPanel/PrivacyControlsPanel; src/styles.css; lifecycle UI tests.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B07, B25, B06. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 1–2 days; agent 3–6 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B30.md](execution/prompts/B30.md).

- [x] **B31 — Planned: Close visual accessibility and performance acceptance matrix.**
  - Deferred actual-reader work: consolidate B32/C03/C04 and subsequent UI routes under A11Y-DEFERRED in execution/ACCESSIBILITY_DEFERRALS.md. A lower-cost capable agent performs real VoiceOver/NVDA checks after C10; primary verifies closure. This work does not block earlier implementation checkpoints, but remains mandatory for B31 and any WCAG-conformance claim.
  - User problem/evidence: Individual polished screens do not prove a coherent accessible product. Visual audit V16.
  - Expected outcome/scope: All objective visual gates have evidence; no unresolved major issue; subjective rubric justified; full suite/CI/preview verified at submitted code SHA.
  - Non-goals: No production launch, waived missing tests, blanket WCAG certification or new broad refactor.
  - Files likely affected: docs/design validation matrix; targeted UI/styles fixes only; existing tests; build/evidence reports.
  - Acceptance/tests: follow the task-specific prompt and VISUAL_DESIGN_SPEC; preserve engine/API regressions; verify changed UI with actual browser evidence and full suite before push.
  - Analytics: no new collection; measure task completion/readability with synthetic checks, use only B12-approved events if already implemented.
  - Security/privacy: public tools stay public; no real records or bypass; hosted writes require B06 isolation; no secrets in output.
  - Dependencies: B18, B19, B20, B21, B22, B23, B24, B26, B27, B28, B29, B30, B12. Checkpoint release is additionally required.
  - Migration/rollback: no schema in visual work; revert only this task's reviewed commits; preserve safety fixes and additive data migrations. Human 2–3 days; agent 6–12 hours, estimates excluding review/provider waits.
  - Detailed implementer prompt: [prompts/B31.md](execution/prompts/B31.md).

- [x] **B32 — Accepted: implement the light/dark glass and gradient color system.**
  - User problem/evidence: owner explicitly requested glassmorphism and gradients on 2026-09-08; current theme has contrast collisions and uncoordinated late overrides (V01–V03).
  - Expected outcome/scope: implement COLOR_AND_GLASS_SYSTEM.md in actual React surfaces using B16's canonical roles; coherent light/dark palette, bounded glass and gradients, solid/unsupported/print/forced-colors fallbacks.
  - Non-goals: no new homepage layout (B18), formula/auth changes, dependency, new font, animated background or glass behind editable values.
  - Files likely affected: src/styles.css; src/vivid-theme.css or B16 token owner; DESIGN.md; color acceptance evidence. theme-board.html is a reference, not copied product markup.
  - Acceptance: B15 contrast remains fixed; full opacity text; paired action states; actual composited contrast on all gradient regions; keyboard/200%/mobile/dark/light/reduced transparency; no unexplained performance regression; no new console errors.
  - Analytics/tests: no collection; before/after computed style/contrast and screenshots, relevant behavior regressions, full suite and public smoke.
  - Security/privacy: synthetic examples only; no deployed test bypass or remote data writes; auth fail-closed unchanged.
  - Dependencies: B16, B17; C01T release. Subsequent public visual composition consumes this accepted palette.
  - Migration/rollback: no schema; revert material/theme commit while preserving B15/B16 repairs. Human 1–2 days; agent 4–8 hours plus review.
  - Detailed implementer prompt: [B32](execution/prompts/B32.md).

- [x] **B33 — Accepted: isolate preview infrastructure before backend publication.**
  - User problem/evidence: effective preview DB binding matched the production-named DB; publishing changed APIs can expose production-bound functions even without intentional test writes.
  - Expected outcome/scope: verify every automatic/manual preview deployment path, obtain scoped owner approval for the isolated preview DB, configure preview-only binding and confirm deployed effective metadata before any backend-code push/deploy.
  - Non-goals: no production DB/DNS changes, no copying production data, no auth bypass, no disabling unrelated deployments without authorization.
  - Files likely affected: wrangler.toml only if necessary; preview configuration evidence and runbook. Remote Pages preview settings require explicit scoped owner authorization.
  - Acceptance: effective preview DB differs from production; every branch/automatic deployment path to be used is verified or safely excluded with authorization; migration state of isolated DB known; authenticated financial APIs are never newly published against production bindings.
  - Analytics/tests: no telemetry; read-only configuration inspection, redacted deployment metadata and public health/auth boundary checks; synthetic writes only after isolation and task authorization.
  - Security/privacy: request only approved preview DB identity and preview-binding authorization, not credentials in chat. Do not inspect or seed real financial rows.
  - Dependencies: B01; checkpoint C01I release. B02–B05 backend publication and B06 hosted testing require this accepted gate.
  - Migration/rollback: apply only reviewed migrations to the approved isolated target with authorization; rollback means disable/defer unsafe preview publication, never bind preview back to production. Human 0.5–1 day plus owner setup; agent 2–4 hours.
  - Detailed implementer prompt: [B33](execution/prompts/B33.md).

- [x] **B34 — Accepted: repair newly reported development-tool dependency advisories.**
  - Closure: [C00R independent review](execution/reviews/C00R.md), code `b48ac00328f356746bd501921562e727feb7a8e5`, 2026-09-09.
  - User problem/evidence: hosted CI 34300491728 passes tests/build but fails npm audit, reporting two moderate and three high findings across Vitest/mocker and sharp/miniflare/Wrangler. Earlier zero-audit evidence is historical.
  - Expected outcome/scope: choose supported patched development-tool versions with a reproducible lockfile; verify full suite, audit and Wrangler compilation. Distinguish package findings from demonstrated production exploitability.
  - Non-goals: no npm audit fix --force, arbitrary Wrangler downgrade, suppressed audit, production deployment or unrelated runtime upgrade.
  - Files likely affected: package.json; package-lock.json; dependency evidence and current-state audit. Overrides require a compatibility rationale, not just a green audit.
  - Acceptance: current npm audit has no known unresolved findings from these advisories, clean install/full suite/build and deployment compilation pass, hosted CI passes at candidate SHA; no changed runtime formula/auth behavior.
  - Analytics/tests/security: no analytics; npm ls/explain, official advisories, clean npm ci, full suite and no-secret dry compilation. Assess actual exposure; do not serve development tools publicly.
  - Dependencies: B01 accepted; C00R released. No backend/runtime publication before B33; dev-tool-only verification may use local build/CI and defer manual preview until isolation.
  - Migration/rollback: no data migration; record safe previous/patched versions and disable affected development server usage if no safe fix exists. Do not revert to a known vulnerable version merely for green tests. Human 0.5–1 day; agent 2–4 hours.
  - Detailed implementer prompt: [B34](execution/prompts/B34.md).

## Queued after task 34: comprehensive calculator functionality and visual excellence

Owner-added 2026-09-13. This is a new program after the existing 34-task list, not extra scope for the active C05 agent. It remains queued for primary release; detailed child IDs/checkpoints will be registered after the comprehensive inventory is reviewed. Existing task counts and acceptance records are unchanged until that registration.

- User problem/evidence: the current B22–B24 tasks largely refine presentation and preserve existing engines; they do not guarantee every calculator has complete decision-support functionality. The older calculator roadmaps contain broader goals without a fully verified, executable per-route plan.
- Expected outcome: inspect every current calculator, identify and implement justified missing features, improve explanation of entered results, provide optional advanced control, and upgrade each calculator's output presentation without overwhelming the user.
- Scope: current-route inventory, functionality/gap analysis, calculator-specific result and visual specifications, prioritized per-calculator/family implementation prompts, reviewed pilot, implementation batches and final cross-calculator acceptance. Analysis alone does not close this program.
- Visual requirements: derive graphs, breakdowns, timelines, comparisons, tables and other visuals from each calculator's actual mathematical model and user decision. No identical generic chart requirement across unrelated calculators; no invented data or misleading scales. Both themes and mobile presentation must remain clear.
- Non-goals: no new calculator-count target, gratuitous controls/charts, unapproved formula changes, paid integrations or production launch.
- Files likely affected: new docs/calculator-excellence/*; future execution prompts/ledger; affected calculator components, engines and tests in src/; shared visual primitives and styles where justified by the audited gap.
- Acceptance/tests: every inventoried calculator has an evidence-backed gap disposition and completed approved implementation; primary answer, explanation, optional detail, advanced controls and visual/table data reconcile. Relevant numerical, interaction, accessibility, responsive/theme, CI and isolated-preview checks pass. Actual satisfaction is measured with user evidence, not inferred from automated tests.
- Analytics/privacy: use only the approved consent/event contract; synthetic verification data; preserve signed-out utility, safe saves, currency semantics and data lifecycle. No new collection by default.
- Dependencies: finish the existing implementation priorities and obtain primary release; no changes to current worker scope. External-gated monetization/mobile tasks may remain pending only under an explicit reviewer scheduling amendment.
- Migration/rollback/effort: require formula sources, model version and saved-result migration decision for behavioral math changes; reversible family commits and explicit rollback. Estimate effort per audited child slice rather than inventing a single estimate for every calculator.
- Detailed future-agent instructions: [calculator excellence program](execution/CALCULATOR_EXCELLENCE_PROGRAM.md).

## Milestone reporting

For each item record commit, changed files, red/green tests, local full-suite result, PR/CI URL, immutable preview URL and hosted verification scope. Report remaining risks and the exact next Ready item. Production readiness is never inferred from document completion or preview deployment.

C01 acceptance 2026-09-10: B15/B16/B17 accepted together at `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`; [independent review](execution/reviews/C01.md). Next released task: B32 in C01T.

Landing review amendment 2026-09-10: [image, copy and theme findings](LANDING_PAGE_REVIEW.md) expand B32 with a visibly theme-responsive existing hero and B18 with an engine-backed product example, exact copy baseline, honest account availability and detailed review gates. Follow their amended prompts; C03 remains locked. No task was closed or renumbered.

C01T review 2026-09-10: B32 requires print-layer repair and completed verification evidence; [review](execution/reviews/C01T.md). No new task accepted; C01I remains locked.

C01T re-review of 12b3546: B32 remains changes_requested. Hero print improved; lower continuity print and verification gate still need repair. Matching WebKit installed and sampled by reviewer. Follow latest [review](execution/reviews/C01T.md) and [worker prompt](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/blob/5e4b703958bf98374dea61235e314f8ba21af283/docs/execution/C01T_REWORK_PROMPT.md). Accepted total unchanged.

C01T third review of dd47fa3: whole-page print verified fixed; bounded native200% layout checks completed. Remaining evaluator missing-telemetry false PASS and manual reader/interaction proof keep B32 open. Follow latest review and bounded rework prompt; no new task accepted.

C01T final acceptance: B32 accepted at `32584da7e47307a35730911e3567f02f9095550b` under the owner’s explicit actual-reader deferral, tracked in B31. This supersedes earlier C01T changes-requested notes. Accepted total 6/34 (17.6% by task count). C01I/B33 is released for its scoped isolation work; remote setup still needs its specified owner authorization. See [final review](execution/reviews/C01T.md).

C01I primary review: B33 requires audit reliability repairs and scoped preview-binding authorization. No acceptance; C02 stays locked. See [review](execution/reviews/C01I.md) and [rework prompt](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/blob/5e4b703958bf98374dea61235e314f8ba21af283/docs/execution/C01I_REWORK_PROMPT.md).

C01I accepted after primary reviewer completed the remaining audit repair. 7/34 tasks accepted (20.6% task count). C02 released, starting B02. See [final review](execution/reviews/C01I.md).

C02 accepted 2026-09-11: B02/B03/B04, common candidate `ef2cded6441191a26537adf8ddf1a3e1909cf73b`, [review](execution/reviews/C02.md).10/34 accepted(29.4% by task count). C03 released: B18→B19→B09; use [explicit worker prompt](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/blob/5e4b703958bf98374dea61235e314f8ba21af283/docs/execution/C03_START_PROMPT.md).

C03 accepted 2026-09-13 at `285e9eadf2d854951cec75d02afc6cce97d4d6c5`; B18/B19/B09 accepted with owner-authorized actual-reader deferral tracked in B31 and execution/ACCESSIBILITY_DEFERRALS.md. C04 is released. 13/34 accepted (38.2%, task count). See execution/reviews/C03.md.

C04 accepted 2026-09-13: B08/B20/B21 done at 733e76c217058cafc3e5d418f09cb55ced531f4c with owner-deferred actual-reader checks assigned to B31. C05 released. 16/34 accepted (47.1%, task count).

C05 accepted2026-09-14: B22/B23/B24 done at website1c73bffbb4a5d1f179d67f2934c900a8b44711e5; native assisted proof and evaluator/CSV repairs verified.19/34 accepted (55.9%). C06 released, starting B05. The post-task-34 calculator excellence program remains queued.


## Owner amendment — 2026-09-15: consolidate zoom verification at B31/C11

The owner directed: “push it to the end of verification of all tasks … if there is any zoom issue it can be fixed later.” Native browser 200% zoom checks and zoom-specific layout repairs are therefore DEFERRED through C10 to the final B31/C11 verification. Their absence or a known zoom-only issue must not block otherwise passing implementation tasks or checkpoint release. This supersedes earlier per-task native zoom gates, including older prompt/contract language. Do not rerun native zoom at every checkpoint. Preserve existing evidence and record newly noticed zoom defects without spending implementation time on them now. Functional correctness, tenancy, deletion, auth boundaries, normal-size usability, mobile layouts, keyboard, contrast and reduced-motion/transparency checks remain required. Deferred means not passed; no full WCAG-conformance claim.

B31/C11 follow-up ZOOM-FINAL: a lower-cost capable agent performs one consolidated actual-browser 200% sweep of final public and authorized synthetic authenticated journeys, in both themes. Verify reachable essential controls, readable inputs/results, no text overlap or clipped actions, and reflow. Record browser version, actual zoom level, exact candidate, route, screenshot, defect and focused retest. Pixel density, CSS zoom and viewport resizing do not substitute for native browser zoom evidence. Primary reviews the evidence and closes the task. Existing C06 account-import/fixture toolbar repairs and screenshots are retained; repeat only if the final sweep finds a regression.

C06 accepted2026-09-15 at0f3ae8d9cc4d447518e484b8de7a34ee1b54f38a: B05/B07/B25 complete;22/34 accepted64.7%. C07 hosted auth remains gated. Native zoom deferred to final B31/C11.

## Owner-prioritized assumption-control correction — 2026-09-24

- [x] **B35 — FIRE assumptions before Calculate, neutral optional defaults, calculator-wide source audit.**
  - User problem/evidence: App.tsx initialPlan injects example equity, house, Social Security and healthcare flows; advanced details follows Calculate/results.
  - Outcome: fresh plans contain no assumed extra cash flows; all active assumptions are visible before calculating and editable without losing saved values.
  - Scope/files: App.tsx, styles if needed, behavioral tests, calculator-excellence audit/backlog; detailed [contract](execution/prompts/B35.md).
  - Non-goals: formula engine edits, automatic migration of existing plans, mass calculator rewrites, production release.
  - Acceptance/tests: DOM order, optional empty/zero defaults, numeric zero-rate boundary, saved-plan preservation, stale/recalculate, actual summary values, keyboard/mobile/theme evidence and full suite.
  - Analytics: no new data collection; existing consent rules.
  - Security/privacy: local synthetic verification; no credentials/hosted financial writes; isolated preview only after verification.
  - Dependencies: existing FIRE presentation B22/B24; primary closure required. Calculator-wide implementation gets separate child contracts after audit review.

## Owner amendment — 2026-09-26: C09B, C11 and calculator-excellence order

OD-1 partially supersedes B35: FIRE **return and inflation** now start empty and required, with an explicit sourced illustrative-value action; an entered 0% is valid. B35's prohibition on silently injected equity, housing, Social Security and healthcare flows remains. OD-2 permits an additive accumulation function with independent goldens, leaving existing drawdown behavior unchanged. These are new B36 work, not a retroactive claim that B35 implemented them. C09B is released after C09 residual acceptance. Complete B37 → B39 → B42 → B36, then C10 B29 → B30, then C11 B41 → B38 → B12 → B31. B40 is queued after C11. Only Astra checks boxes.

- [x] **B37 — Delivery hygiene and stack retirement (C09B, first).**
  - User problem/evidence: historical Flask/Python remains in the test path; tracked bulk evidence and two `.pyc` files inflate the current index. The previous worker submission also assigned an unrelated C09 preview to old C01 images.
  - Expected outcome/scope: port indispensable finance goldens, retire unused Flask/Firebase files and Python CI steps, implement PA-4 ignore/manifest with Git-derived provenance, untrack reviewed evidence and `.pyc` from the current index, and correct active normative docs.
  - Non-goals: no hosted runner or C09 revise proof (B42), history rewrite, shipped formula/UI change, lost accepted review link or production write.
  - Likely files: legacy app/tests/config, `src/lib/fire.test.ts`, `scripts/test_all.sh`, workflows, `.gitignore`, README and evidence manifest. Existing untracked `scripts/hosted_smoke*` belongs to B42, excluded from B37 candidate.
  - Acceptance: finance goldens detect deliberate perturbation; full suite/CI work without Python and propagate failures; manifest Git-add commit and SHA-256 verified via `git show` or clean clone; normative docs do not point to removed runtime paths; baseline tracked size measured and post-commit clone sizes measured by Astra. Historic preview attribution must be truthful.
  - Analytics/tests/security: no analytics or secrets; no hosted writes. Dependencies: B11/B28 accepted, C09B released, OA-2 done. Rollback: restore retired paths/index from reviewed commit; no history rewrite. Human 1–2 days; agent 2–4 h. [Contract](execution/prompts/B37.md); [focused rework](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/blob/5e4b703958bf98374dea61235e314f8ba21af283/docs/execution/B37_REWORK_PROMPT.md).

- [x] **B39 — Extract pure modules from App.tsx (C09B, second).**
  - User problem/evidence: `App.tsx` measured 8,841 lines and later feature work touches it; utility/parsing and shared primitives obscure review.
  - Expected outcome/scope: extract API/DTO parsing, formatting/CSV/JSON, warnings and shared UI primitives into focused modules; add one typed response parser without behavior change.
  - Non-goals: no stateful panel/route extraction, copy/style/formula/schema change.
  - Likely files: `src/App.tsx`, `src/lib/api/`, `src/lib/format.ts`, `src/lib/csv.ts`, `src/lib/warnings.ts`, `src/components/`, import-path tests.
  - Acceptance: `App.tsx` shrinks ≥2,000 lines; parser negative tests and existing behavior pass; public rendered routes remain visually equivalent; full suite/build/CI/smoke pass.
  - Analytics/tests/security: none added; preserve auth/tenant handling and export values. Dependencies: B37 accepted. Rollback: revert isolated refactor. Human 1 day; agent 2–4 h. [Contract](execution/prompts/B39.md).

- [x] **B42 — Shared hosted smoke runner plus C09 revise residual (C09B, third).**
  - User problem/evidence: C09 Version 2 Revise → Version 3 remains unobserved hosted; the B37 worker stub returned a false preflight success without network or credentials. The worker lacks live deployment/write authority.
  - Expected outcome/scope: reusable runner with injectable Cloudflare, Clerk, browser and D1 adapters; exact-code/isolated preview preflight; two synthetic tenants; real revise/Version 3 and downstream B28 observations; independent scoped cleanup. Gemini implements local tests; Astra alone runs and records hosted results.
  - Non-goals: no worker-authored hosted PASS, production data, real-user accounts, migration, paid service or new calculator behavior.
  - Likely files: `scripts/hosted_smoke.mjs`, adapter modules/tests, shared runner scripts, criterion matrix and `docs/execution/submissions/B42.md`.
  - Acceptance: absent credentials/metadata exit nonzero; exact deployment SHA/ID/preview D1 verified before writes; plan ID/version readiness enforced; 15 cleanup tables derived from migrations with retained users tombstone; all reviewed negative cases fail closed locally; Astra-observed hosted journey and cleanup pass on one exact candidate, or a real defect is registered. Any worker-authored hosted PASS is rejected.
  - Analytics/tests/security: no analytics; synthetic disposable users only; no secret output; full suite/CI and reviewer-run hosted proof. Dependencies: B37 and B39 accepted. Rollback: revert runner only, no data/schema change. Human 0.5–1 day; Gemini 4–8 h plus Astra hosted/review. [Contract](execution/prompts/B42.md).

- [x] **B36 — FIRE answers when can I retire (C09B, fourth).**
  - User problem/evidence: fresh FIRE rates silently initialize at 0%, no accumulation path or retire-age answer, and invalid/blank inputs can yield misleading results; measured live-audit observations require task-specific repro.
  - Expected outcome/scope: OD-1 empty required return/inflation with cited hint and explicit example action; OD-2 additive pure accumulation engine and retire-age estimate; input validation, explanatory result/chart, USD/INR formatting and old-plan compatibility. Apply PA-9 to touched App region.
  - Non-goals: existing drawdown behavior changes, Monte Carlo, tax model, injected cash flows, automatic historical-plan mutation.
  - Likely files: FIRE UI extraction from `src/App.tsx`, new pure engine near `src/lib/fire.ts`, shared currency formatter, tests and possibly an additive model-version migration.
  - Acceptance: ≥5 independent accumulation goldens including deliberate 0%, already-FI, never-FI and savings growth; all existing drawdown goldens unchanged; fresh rates blank/no result; invalid cases fail at field level; old saved plan unchanged; headline/chart/table agree; desktop/375px themes/keyboard/reduced-motion and PA-7 walkthrough pass.
  - Analytics/tests/security: no new tracking; public signed-out use and synthetic saved-plan compatibility; formula references and migration decision required. Dependencies: B35/B39/B42 and released C09B. Rollback: feature revert with safe additive schema. Human 2–4 days; agent 8–14 h plus Astra golden review. [Contract](execution/prompts/B36.md).

- [x] **B41 — Harden shared API boundaries (C11, first).**
  - User problem/evidence: repeated auth/body parsers, absent uniform size limits and message-substring deleted-user detection increase tenant and availability risk.
  - Expected outcome/scope: shared Pages Functions auth/DB/body/error boundary, bounded JSON/CSV import with 413, typed deleted-user 410 and consistent `{code,error}` without changing endpoint semantics.
  - Non-goals: no tenancy model, production auth or data migration change.
  - Likely files: `functions/api/`, `functions/_lib/`, backend tests and shared smoke step.
  - Acceptance: existing tenancy/deletion/idempotency suites pass; oversized/malformed/missing-auth/deleted-user negative tests pass; health remains public, signed-out protected APIs 401; isolated hosted denial/cleanup verified.
  - Analytics/tests/security: no new collection or leaked bodies; fail closed on missing D1. Dependencies: C10 accepted, B30/B37. Rollback: revert middleware/callers together. Human 1–2 days; agent 4–6 h. [Contract](execution/prompts/B41.md).

- [x] **B38 — Public delivery, SEO truth, 404 and headers (C11, second).**
  - User problem/evidence: generic calculator HTML, indexable 200 unknown routes, public Clerk loading and large chunks reduce discoverability, trust and speed.
  - Expected outcome/scope: route-specific static metadata/minimal content, genuine 404/noindex, lazy Clerk and route chunks, tested CSP/security headers.
  - Non-goals: no SSR-framework migration, copy rewrite or production launch.
  - Likely files: route metadata/build scripts, `src/App.tsx`/router, `public/_headers`, Pages Functions routing and tests. PA-9 applies.
  - Acceptance: five sampled calculator HTML responses correct; unknown routes 404/noindex; public page makes no pre-intent Clerk request; main raw chunk <250 KB with no build warning; public and signed-in preview CSP smoke has no violations.
  - Analytics/tests/security: no new collection; exact preview/auth isolation and existing public-route smoke. Dependencies: B36/B41 and C10 accepted. OA-1 blocks production readiness only, not preview acceptance. Rollback: revert delivery/routing as a unit. Human 2–3 days; agent 6–10 h. [Contract](execution/prompts/B38.md).

- [x] **B40 — First calculator-excellence child: library/copy consolidation (queued after C11).**
  - User problem/evidence: duplicate EMI/debt discovery, templated descriptions, missing tax jurisdiction labels, leaked internal wording and signed-out Workspace links.
  - Expected outcome/scope: preserve stable aliases while grouping compatible presets, add region badges/filter, plain-language copy and a copy guard. Capture mortgage PITI/scenario and extreme-rate defects as explicit later per-route program gaps.
  - Non-goals: no mortgage/compound engine rewrite, unsupported tax-law claim or mass calculator completion claim.
  - Likely files: route inventory, CalculatorLibrary/navigation/copy, tests, calculator-excellence gap inventory.
  - Acceptance: old routes work; preset identity/filter/empty/keyboard/mobile/theme tests pass; internal phrases absent; signed-out discovery is public-first; follow-on math gaps remain visible.
  - Analytics/tests/security: no pre-consent tracking, preserve public access. Dependencies: B31/B36 and primary release after C11. Rollback: revert discovery changes, retain URLs. Human 1–2 days; agent estimate after inventory. [Contract](execution/prompts/B40.md).

## Fresh calculator/landing UX increments — 2026-09-29

The [fresh audit](calculator-excellence/UX_REVIEW_2026-09-29.md) and [83-route matrix](calculator-excellence/CALCULATOR_UX_MATRIX_2026-09-29.md) supply evidence and route-level scope. They are not alternate status trackers. Execution order is C15 → C16 → C17 → C18; B47 is first. First fix truth, then editing/control discovery, then landing and bounded depth, then real cohort evidence. B47/B48 and B45/B43/B44 are accepted on their exact C15/C16 candidates; C17 is accepted on `9f3789b`; C18 is released with B51 blocked on real participant evidence. Only Astra can accept items.

- [x] **B47 — Correct calculator visuals that invent or contradict the selected model.**
  - User problem/evidence: UX-01/UX-02: closing-cost and stamp-duty charts invent loans; interest-only/recast/prepayment/biweekly charts contradict outputs.
  - Outcome/scope: Every displayed visual represents the selected model and reconciles with the headline and accessible schedule. Implement only [the detailed contract](execution/prompts/B47.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/lib/calculatorStudios.ts; src/CalculatorLibrary.tsx (visual renderer only); src/lib/calculatorStudios.test.ts; route-specific visual regression tests`.
  - Acceptance: Closing-cost default visual decomposes 90000 + 13500 = 103500 and contains no loan time axis; stamp duty decomposes 480000 + 80000 = 560000 and has no imaginary interest. Interest-only selected-model principal remains 300000 throughout; any amortizing comparator is explicitly separate. Recast starts at 250000. Prepayment uses the actual 153-month outcome, not 180; foreclosure at full repayment ends immediately. Biweekly accelerated payoff matches the modeled 292 months (360−68), with the approximation disclosed. Chart/table/headline totals and units agree within the existing 0.005 residual tolerance; do not enlarge it. For all 77 generic routes, record visual kind, source model/schedule and reconciliation status; unsupported models fail safely. Labels, zero/negative states and accessible table text stay readable in both themes. No financial engine changes.
  - Analytics: No telemetry required; correctness is judged by reconciled model data, not chart engagement.
  - Tests: Unit visual-policy tests for unsupported/missing data, each reproduced contradiction and zero/principal/extra-payment states; existing model goldens remain unchanged; full ./scripts/test_all.sh once after the final local changes.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; accepted baseline; no secrets/raw financial values in evidence.
  - Migration/rollback: No schema/data migration; revert chart-policy and presentation commit together. Preserve result/export math.
  - Effort: 4–8 focused worker hours plus primary publication/review.

- [x] **B48 — Honor APY in HYSA without changing nominal-rate calculators.**
  - User problem/evidence: UX-03: hosted HYSA APY produces 30519; independently derived effective-APY result is 30468.78.
  - Outcome/scope: HYSA input meaning, result, schedule, comparison and export all use effective APY. Implement only [the detailed contract](execution/prompts/B48.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/lib/seoCalculators.ts (HYSA adapter only); src/lib/calculatorStudios.ts; src/CalculatorLibrary.tsx (method/history notice if required); associated tests; docs/calculator-excellence/HYSA_APY_DECISION.md`.
  - Acceptance: The exact goldens in HYSA_APY_DECISION pass; source result, chart end, schedule end, scenario CSV and explicit saved-result calculation match. CD 10920.25 stays unchanged. Other compound/SIP/401k financial goldens do not change. Historical records retain original inputs/metrics; recalculation creates a new snapshot only after user action and discloses the changed method. No user-facing live-bank accrual or guarantee claim. No src/lib/fire.ts change.
  - Analytics: Calculation correction can use the existing allowlisted quality counter; never log APY or amounts. Do not invent a new event without consent/taxonomy review.
  - Tests: Independent recurrence tests, zero-rate/top-up/fractional-horizon and regression comparison across every shared compound alias; persistence immutability tests where behavior changes; full suite.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B47; no secrets/raw financial values in evidence.
  - Migration/rollback: No remote writes/migration; see written correction decision. Roll back only HYSA adapter plus notices together.
  - Effort: 3–6 worker hours plus targeted primary review.

- [x] **B45 — Preserve input edits, losses and explicit sample-result state.**
  - User problem/evidence: UX-04/UX-08: blank mortgage becomes 0; negative ROI becomes 0%; populated examples look personalized.
  - Outcome/scope: Users can edit their numbers naturally and cannot mistake an unfinished/sample result for a valid personal answer. Implement only [the detailed contract](execution/prompts/B45.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/CalculatorLibrary.tsx; src/lib/seoCalculators.ts (input bounds only where mathematically justified); draft/share normalization; CalculatorLibraryDetail tests`.
  - Acceptance: Clearing mortgage principal leaves the field empty and does not render a valid zero-payment answer. ROI net gain −1000 with cost 20000 produces −5%. Zero remains valid for fields whose math supports it. Out-of-range entries show the actual attempted value and an actionable validation state; calculation never uses a hidden differently clamped value. Sample/current/stale states are distinct and accessible. Reset and draft restoration reproduce their documented state; typed invalid data cannot be saved as a current estimate. Existing correct bounds/formula results remain intact.
  - Analytics: Reuse existing result event only when valid; distinguish example use without finance payload. No per-keystroke analytics.
  - Tests: User-event style regressions for empty→typed value, decimal editing, explicit zero, negative ROI, limits, NaN/non-finite restore, stale result, reset and save/export gates; full suite.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B48; no secrets/raw financial values in evidence.
  - Migration/rollback: If draft shape changes, add backward-compatible read; never discard account records. Revert UI/state adapter as one unit.
  - Effort: 4–8 worker hours.

- [x] **B43 — Make FIRE refinements and generic additional controls discoverable.**
  - User problem/evidence: UX-05/06/07: late collapsed controls, misleading duplicated FIRE rate state, housing costs mixed with acceleration.
  - Outcome/scope: Users see what they can customize before scanning long explanations or results. Implement only [the detailed contract](execution/prompts/B43.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/App.tsx (FIRE UI/summary only); src/CalculatorLibrary.tsx; src/vivid-theme.css (scoped controls); relevant UI tests`.
  - Acceptance: Customization affordance is before the first financial input/help stack and points to the correct group. Keyboard Enter/Space opens the real disclosure; focus remains visible; no hover-only nudge. FIRE base rates remain empty/required, examples explicit and zero valid; visible advanced period status agrees with base unset state. Editing/loading multi-period saved plans preserves exact values. Mortgage gives distinct cost and acceleration groups and a clear P&I/total-housing/extra-payment distinction. Active options remain apparent after collapsing and after reload/draft restore; Reset clears only according to the documented scope. Long summaries wrap without overlap at 320/390/1440 in both themes.
  - Analytics: Option discovery is a consented categorical event only if the existing analytics allowlist supports it; no entered amounts/rates/group contents.
  - Tests: OD-1 regressions and existing FIRE goldens unchanged; disclosure/focus/summary/source-of-truth/loaded-plan tests; generic monthly/yearly extras plus housing costs; full suite.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B45; no secrets/raw financial values in evidence.
  - Migration/rollback: No formula, persistence or D1 migration; rollback presentation as one commit. Preserve all stable routes.
  - Effort: 4–8 worker hours.

- [x] **B44 — Expose dedicated calculator customization without a wall of options.**
  - User problem/evidence: UX-05: compound/savings/emergency/budget controls are 1253–2421px down on mobile.
  - Outcome/scope: Dedicated engines retain their depth while useful control groups become understandable at first use. Implement only [the detailed contract](execution/prompts/B44.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/CompoundInterestCalculator.tsx; src/SavingsGoalCalculator.tsx; src/CashflowPlanningCalculator.tsx; scoped CSS and their tests`.
  - Acceptance: Each dedicated route has a first-layer customization entry before its long input stack. Financial settings and locale/display controls are distinct. Group summaries reflect actual rate basis, timing, fees, inflation and enabled events; no misleading zero/unset conflation. Values persist through open/close/reset/load as before. Existing schedule, headline and scenario outputs remain exactly unchanged for identical inputs. Key controls work using keyboard and on touch without hover; no text overlap at 320/390/1440 in both themes.
  - Analytics: No new finance telemetry; reuse existing consent architecture only for safe categorical engagement.
  - Tests: Existing dedicated engine goldens unchanged; grouped disclosure/value-summary/focus/reset and restore tests; budget stress and emergency shock/risk selections; full suite.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B43; no secrets/raw financial values in evidence.
  - Migration/rollback: Presentation only, no data/engine migration; rollback component/CSS grouping together.
  - Effort: 4–8 worker hours.

- [x] **B46 — Guide landing/library choices with intentional light and dark hierarchy.**
  - User problem/evidence: UX-09/10/11: mobile question toolkits begin at y1766; repeated paths and a dense illustration compete for attention.
  - Outcome/scope: Visitors choose a relevant question quickly, see honest value, and understand the optional saved-plan loop. Implement only [the detailed contract](execution/prompts/B46.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/App.tsx (LandingPage and public header); src/lib/landingContent.ts; src/HeroFireExample.tsx; src/CalculatorLibrary.tsx (library discovery); src/vivid-theme.css; DESIGN.md; landing/library tests`.
  - Acceptance: At 390×844 the primary action is visible initially and a question-choice affordance is reachable within one additional viewport from the top; it precedes dense example detail. At 1440×1000 headline/action/illustration have clear first/second-layer hierarchy; no competing signup emphasis. Choosing each path and toolkit opens the correct stable route/anchor; back/search retain documented behavior. Example numbers remain derived from its fixture and full methodology remains available. Theme toggle materially changes surfaces/ink/chart tokens; actual composited contrast satisfies AA targets for changed text/controls. No clipping at 320/390/1440; keyboard, reduced motion/transparency, unsupported backdrop-filter and forced-colors fallbacks work. Native zoom/actual-reader limitations remain honestly recorded, not manufactured as PASS.
  - Analytics: Observe valid calculator starts and saved-review funnel under current consent. No replay/heatmap/finance input collection. Proposed gaze behavior is tested with users in B51.
  - Tests: Navigation/fragment/search/hero-fixture parity and visible-copy tests; changed token contrast measurements and targeted visual evidence; full suite. Reuse shared browser runner; no bespoke harness.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B44; no secrets/raw financial values in evidence.
  - Migration/rollback: No migration; revert presentation/copy/tokens as a bounded set; preserve routes and original example formulas.
  - Effort: 6–12 worker hours plus design review.

- [x] **B49 — Make calculator scope, assumptions and rule provenance explicit.**
  - User problem/evidence: UX-12 and row-level findings: simplified tax/benefit/insurance/HELOC models have broader names; balance-transfer registry text contradicts its promo boundary.
  - Outcome/scope: Users understand exactly what the result includes and what remains outside it. Implement only [the detailed contract](execution/prompts/B49.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `src/lib/calculatorContent.ts; src/lib/calculatorQuality.ts; src/lib/seoCalculators.ts (copy/metadata only); scoped result notices; content tests`.
  - Acceptance: Every assigned route has an honest adjacent scope block derived from its real inputs/model, with appropriate country/year and sources where factual. No claim of approval, eligibility, tax filing accuracy, personalized advice, guarantee or current statutory rate unless proven. Balance-transfer text no longer says promo lasts until payoff when duration is finite. Existing correctly modeled state/local placeholder, rent-buy ownership/equity and monthly-IRR caveats are preserved. Copy is shorter in first layer; details remain available. No financial outputs change for identical inputs.
  - Analytics: No new telemetry or personal data; outbound official links do not embed entered values.
  - Tests: Per-route content assertions against supported input/model metadata, internal-copy guard and shared output goldens; full suite. Record source/date by route.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B52; no secrets/raw financial values in evidence.
  - Migration/rollback: Copy/metadata only; no data migration. Revert any misleading source/date claim immediately.
  - Effort: 4–8 worker hours plus official-source research.

- [x] **B50 — Turn remaining per-calculator feature gaps into bounded formula contracts.**
  - User problem/evidence: The individual matrix identifies useful missing controls and decision-specific outputs; implementing them all as one universal template would introduce risk.
  - Outcome/scope: Every remaining feature has a small, sourced and testable implementation slice; no broad feature bundle or unearned completion claim. Implement only [the detailed contract](execution/prompts/B50.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `docs/calculator-excellence/ feature contracts; docs/execution/prompts/ proposed child prompts; candidate updates for canonical trackers (Astra applies them)`.
  - Acceptance: Each of the 83 matrix rows has an explicit disposition: current slice, queued small feature contract, no additional feature justified, or externally gated. Every B50 implementation proposal is narrow, sourced and independently testable; sources match jurisdiction/effective date. Visuals are selected for the actual job and have accessible data equivalents. No feature list silently declares 83 completed; no formulas/code/data are edited in this planning task. The next three highest-value implementation contracts contain actual independent expected numbers and migration decisions, not instructions to use existing engine output as the oracle.
  - Analytics: Each proposed event specifies consent, safe categories and exclusions; never log financial values or client identities.
  - Tests: Cross-check full matrix coverage, source links and proposed ID uniqueness/dependencies with the existing packet validator; do not run the full product suite for documentation-only work.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B49; no secrets/raw financial values in evidence.
  - Migration/rollback: Document proposed migrations individually; none are executed. Rollback is contract-specific.
  - Effort: 6–10 worker hours of research/contracts; incremental implementations separately estimated.

- [ ] **B51 — Validate discoverability, first value and genuine saved-plan return.**
  - User problem/evidence: New UI hypotheses and paid offers have no demonstrated user success/retention yet.
  - Outcome/scope: Owner can observe real user comprehension and return before funding traffic or a subscription build. Implement only [the detailed contract](execution/prompts/B51.md); all assigned individual matrix rows are part of scope.
  - Non-goals/files: no unrelated formulas, paid services or production writes. `docs/MEASUREMENT_AND_EXPERIMENT_PLAN.md; existing privacy-reviewed analytics only if gaps are established; a compact consented pilot report template`.
  - Acceptance: Protocol, consent and event/denominator definitions are complete; no raw finance data is collected. A real pilot report contains actual anonymized participant/observation counts and dates, not synthetic outcomes. Proposed gates: >=8/10 unprompted relevant customization and sample/limitation comprehension; zero serious chart/model misconception; >=6/20 genuine meaningful plan returns within 45d. If gates miss, report the failure and a specific corrective hypothesis. B13 remains locked until its original evidence requirements plus real B51 return proof pass. Owner recruitment/unobserved windows may block completion honestly; do not mark done merely because instrumentation runs.
  - Analytics: North star and funnel defined in the fresh audit; safe event categories only. No session replay, raw financial inputs, account/plan IDs or unsolicited emails.
  - Tests: Test event payload allowlists and consent only if changed; otherwise reuse existing tests. Analyse real observations with cohort integrity checks. Browser/user study is not a substitute for financial golden tests.
  - Security/privacy/dependencies: public illustrative data only; PA-10 worker authority boundary; B50; no secrets/raw financial values in evidence.
  - Migration/rollback: No schema/production changes by default; any event/schema addition needs its own explicit contract and rollback.
  - Effort: 2–4 hours study setup, owner participant time, >=45 days elapsed for full return window.


- [x] **B52 — Compact calculator spacing and reveal results after explicit actions.**
  - User problem/evidence: Owner 2026-09-30 reports sparse input/result presentation and manual result hunting; actual desktop/mobile measurements are required.
  - Outcome/scope: Clearer density and success-only result navigation; [bounded contract](execution/prompts/B52.md).
  - Non-goals: No smaller touch targets, hidden critical assumptions, formula changes, new density control, route/dependency/D1 changes.
  - Files: Shared reveal hook/helper; calculator UI components, App FIRE action, vivid-theme CSS, regression tests.
  - Acceptance: Visible answer stays put; offscreen explicit answer clears topbar and receives focus; typing does not jump; 320/390/1440 both themes contained with 44px controls and 16px input text.
  - Analytics: Existing consent only; no entered values, new financial telemetry or claimed retention evidence.
  - Tests: Predicate, post-render mount, action/invalid/edit gates, focused UI and full suite; math goldens unchanged.
  - Security/privacy/dependencies: B46; public synthetic examples only; no hosted financial write.
  - Migration/rollback: None; revert scoped UI/helper together. Human estimate 3–5 hours; agent estimate 45–90 minutes plus actual verification, not a completion guarantee.

## Independent calculator functionality — owner continuation 2026-09-30

- [x] **B53 — Truthful refinancing and points payback states.**
  - User problem/evidence: reproduced omissions in the existing F-01 contract; [bounded scope](execution/prompts/B53.md).
  - Outcome/scope: fulfill its independently derived fixtures, intentional result states, visuals/data equivalents and immutable history contract. No market forecasts or eligibility/advice claim.
  - Non-goals: banks/imports/paid services, production, unbounded features, FIRE arithmetic changes.
  - Files: calculator engine/route adapter, studio/schedule metadata, input validators, save parser/hash/export/client adapters and focused tests as needed. Follow current imports; stale paths are not a reason for duplicate modules.
  - Acceptance: all contract fixtures and negative cases; invalid/raw recovery, keyboard and light/dark/mobile layout; actual saved parser roundtrip and old snapshots unchanged; no invented zero result or misleading unit.
  - Analytics: existing consented action categories only; no dates, amounts or identifiers collected.
  - Tests: independent formula goldens, consumer/persistence/legacy/export regressions, focused UI checks and final full suite/CI plus isolated preview changed journey and public smoke.
  - Security/privacy/dependencies: B50; bounded payload/input validation, existing tenancy; no D1 migration/remote backfill.
  - Migration/rollback/effort: written version/read-support decision before publication; revert behavior while retaining new snapshot read support. Human 4–16h; agent 2–8h plus verification, excluding external setup.

- [x] **B56 — Social Security no-catch-up semantics.**
  - User problem/evidence: reproduced omissions in the existing SSA contract; [bounded scope](execution/prompts/B56.md).
  - Outcome/scope: fulfill its independently derived fixtures, intentional result states, visuals/data equivalents and immutable history contract. No market forecasts or eligibility/advice claim.
  - Non-goals: banks/imports/paid services, production, unbounded features, FIRE arithmetic changes.
  - Files: calculator engine/route adapter, studio/schedule metadata, input validators, save parser/hash/export/client adapters and focused tests as needed. Follow current imports; stale paths are not a reason for duplicate modules.
  - Acceptance: all contract fixtures and negative cases; invalid/raw recovery, keyboard and light/dark/mobile layout; actual saved parser roundtrip and old snapshots unchanged; no invented zero result or misleading unit.
  - Analytics: existing consented action categories only; no dates, amounts or identifiers collected.
  - Tests: independent formula goldens, consumer/persistence/legacy/export regressions, focused UI checks and final full suite/CI plus isolated preview changed journey and public smoke.
  - Security/privacy/dependencies: B53; bounded payload/input validation, existing tenancy; no D1 migration/remote backfill.
  - Migration/rollback/effort: written version/read-support decision before publication; revert behavior while retaining new snapshot read support. Human 4–16h; agent 2–8h plus verification, excluding external setup.

- [x] **B54 — Dated cash-flow return with bounded solver and versioned persistence.**
  - User problem/evidence: reproduced omissions in the existing F-02 contract; [bounded scope](execution/prompts/B54.md).
  - Outcome/scope: fulfill its independently derived fixtures, intentional result states, visuals/data equivalents and immutable history contract. No market forecasts or eligibility/advice claim.
  - Non-goals: banks/imports/paid services, production, unbounded features, FIRE arithmetic changes.
  - Files: calculator engine/route adapter, studio/schedule metadata, input validators, save parser/hash/export/client adapters and focused tests as needed. Follow current imports; stale paths are not a reason for duplicate modules.
  - Acceptance: all contract fixtures and negative cases; invalid/raw recovery, keyboard and light/dark/mobile layout; actual saved parser roundtrip and old snapshots unchanged; no invented zero result or misleading unit.
  - Analytics: existing consented action categories only; no dates, amounts or identifiers collected.
  - Tests: independent formula goldens, consumer/persistence/legacy/export regressions, focused UI checks and final full suite/CI plus isolated preview changed journey and public smoke.
  - Security/privacy/dependencies: B56; bounded payload/input validation, existing tenancy; no D1 migration/remote backfill.
  - Migration/rollback/effort: written version/read-support decision before publication; revert behavior while retaining new snapshot read support. Human 4–16h; agent 2–8h plus verification, excluding external setup.

- [x] **B55 — Vehicle lease/buy net cost with explicit resale equity.**
  - User problem/evidence: reproduced omissions in the existing F-03 contract; [bounded scope](execution/prompts/B55.md).
  - Outcome/scope: fulfill its independently derived fixtures, intentional result states, visuals/data equivalents and immutable history contract. No market forecasts or eligibility/advice claim.
  - Non-goals: banks/imports/paid services, production, unbounded features, FIRE arithmetic changes.
  - Files: calculator engine/route adapter, studio/schedule metadata, input validators, save parser/hash/export/client adapters and focused tests as needed. Follow current imports; stale paths are not a reason for duplicate modules.
  - Acceptance: all contract fixtures and negative cases; invalid/raw recovery, keyboard and light/dark/mobile layout; actual saved parser roundtrip and old snapshots unchanged; no invented zero result or misleading unit.
  - Analytics: existing consented action categories only; no dates, amounts or identifiers collected.
  - Tests: independent formula goldens, consumer/persistence/legacy/export regressions, focused UI checks and final full suite/CI plus isolated preview changed journey and public smoke.
  - Security/privacy/dependencies: B54; bounded payload/input validation, existing tenancy; no D1 migration/remote backfill.
  - Migration/rollback/effort: written version/read-support decision before publication; revert behavior while retaining new snapshot read support. Human 4–16h; agent 2–8h plus verification, excluding external setup.

## Return-method follow-up — 2026-10-01

- [x] **B57 — Guide endpoint-return users to actual-date cash-flow returns.**
  - User problem/evidence: the fresh matrix rows 08/67 and B50 route dispositions identify that endpoint growth cannot interpret intermediate cash flows; B54 now supplies a dated model, but no direct before-input suitability path connects it.
  - Outcome/scope: before-input plain-language scope and a direct link from investment-return/CAGR to empty dated mode; explicit mode switching preserves edits and a non-financial mode URL only. [Bounded contract](execution/prompts/B57.md).
  - Non-goals: new engines, cash-flow imports, value transfer in URLs, required questionnaire, new telemetry, account operations, dependencies, production or D1 changes.
  - Files: CalculatorLibrary.tsx, XirrCalculator.tsx, shared ReturnMethodNotice, focused tests and vivid-theme.css; canonical packet.
  - Acceptance: both endpoint routes show the limitation before fields; one native/modified/keyboard-safe link opens dated inputs empty, not an example; unknown mode keeps monthly; switch/reload/Back retain the intended mode; switching preserves both edits; unrelated calculators unaffected. Both themes/320/390/1440 layouts remain contained with 44px action targets.
  - Analytics: use existing consented category-level events only; no new events or values/dates in the link; watch method-appropriate completion when real observation resumes, without claiming retention.
  - Tests: failing entry/default/switch/privacy/route-order regressions first; unchanged engine goldens; full suite, exact CI, actual hosted link/keyboard/mobile/light-dark journey plus public-route smoke.
  - Security/privacy/dependencies: B50/B54; static same-origin link and allowlisted presentation mode only; no remote writes.
  - Migration/rollback/effort: no model/schema migration; revert scoped notice/mode UI together and retain B54 read support. Human 2–4h; agent 45–90m including review, estimates only.

- [x] **B58 — Correct endpoint-return scope copy and sensitivity labels.**
  - User problem/evidence: actual browser showed “conservative” 13.44% > base 12.47% > “optimistic” 11.72%; generic scope also implied cash-flow, cost and inflation treatment. [Exact contract](execution/prompts/B58.md).
  - Outcome/scope: neutral Case A/Your inputs/Case B labels with honest joint-sensitivity description, and precise endpoint exclusions.
  - Non-goals: recalculating formulas/presets, new scenarios, historic snapshot rewrite, forecast/advice or additional controls.
  - Files: calculatorStudios.ts, calculatorQuality.ts, calculatorContent.ts and focused UI/preset tests.
  - Acceptance: both endpoint routes use neutral labels; original IDs/input vectors/results unchanged; copy states no intermediate flows or automatic cost/tax/inflation adjustment; unrelated calculators unchanged; chart/table/export inherit honest labels.
  - Analytics: existing category events only; no financial values or new telemetry. Watch method-appropriate completion only when genuine observation resumes.
  - Tests: before-fix failing label/copy regressions, exact fixture vector/goldens, consumer UI and full suite/CI/preview/public smoke.
  - Security/privacy/dependencies: B57; no financial payload/schema/auth/remote-data changes.
  - Migration/rollback/effort: no interpretation migration because math/IDs stay byte-equivalent; revert presentation only. Human 1–2h; agent 30–60m plus validation, not a promise.

## Housing budget continuation — 2026-10-03

- [x] **B59 — Include entered housing costs in mortgage affordability.**
  - User problem/evidence: B50 row 34 and source loan-eligibility allocate the whole housing cap to P&I; CFPB describes total housing costs. [Exact sourced contract](execution/prompts/B59.md).
  - Outcome/scope: four optional zero cost fields, visible before-input scope, costs subtracted inside existing caps, honest no-room/overage states and monthly breakdown.
  - Non-goals: lender approval, automated taxes/insurance, new DTI caps, cash-to-close/reserves, India math, production.
  - Files: housingBudget, calculator inputs/content/model registry, generic detail/chart/table and focused engine/UI/parser/history tests.
  - Acceptance: independent cap/annuity/zero-room fixtures, correct monthly versus annual units, costs/chart/table/CSV agree, blank/negative errors retain edits, historical snapshots unchanged; light/dark/mobile/keyboard result reveal.
  - Analytics: existing consented safe events only; watch cost-inclusive completion and plan returns when B51 resumes, no claims of observed retention.
  - Tests: regressions first, untouched default/India goldens, full suite/typecheck/build/CI plus isolated hosted journey and public-route smoke.
  - Security/privacy/dependencies: B50/B58; no new telemetry, data writes, dependencies or credentials. Versioned JSON snapshot; no D1 migration.
  - Migration/rollback/effort: preserve `housing-budget-v1` readers on rollback, never backfill saved records. Human 4–8h, agent 1–3h plus validation, estimates only.

## Deposit presentation continuation — 2026-10-03

- [x] **B60 — Deposit-specific FD/CD presentation and visible rate basis.**
  - User problem/evidence: B50 rows 21/78; local baseline shows principal called “recurring”, generic “annual return / rate” and contribution copy, no tax/fee/penalty exclusions, and an 18-month CD table ending at year 2 ($10,920.25) against a $10,682.54 headline. [Exact sourced contract](execution/prompts/B60.md).
  - Outcome/scope: before-input deposit basis and exclusions, deposit-specific labels/helpers, deposit + interest = maturity line, neutral what-if labels, exact-term schedule and deposit decision copy for `fd`/`cd` only.
  - Non-goals: payout mode, compounding frequency, RD, tax/fee/penalty arithmetic, market rates, insurance claims, recommendations, formula or schema changes, production.
  - Files: seoCalculators (labels/helpers), calculatorStudios, calculatorQuality, calculatorContent, calculatorScope, calculatorEngagement, CalculatorLibrary and focused tests.
  - Acceptance: basis/exclusions before fields; no recurring or generic rate copy; reconciliation line; unchanged scenario vectors/results and goldens; fractional final row equals headline with independent oracle; table/CSV agree; lumpsum unchanged; light/dark 320/390/1440 and keyboard result reveal.
  - Analytics: existing consented category events only; no values or new telemetry. Watch FD/CD completion when genuine observation resumes.
  - Tests: failing regressions first, full suite/typecheck/build/CI, isolated hosted journey and public-route smoke.
  - Security/privacy/dependencies: B50/B59; no data writes, dependencies, credentials or auth change.
  - Migration/rollback/effort: results/inputs byte-equivalent, no model version or snapshot retagging; revert presentation together. Human 2–4h, agent 1–2h plus validation, estimates only.

## RD and exact-term schedule continuation — 2026-10-03

- [x] **B61 — RD presentation: deposit timing and interest basis.**
  - User problem/evidence: B50 row 22; baseline RD says "recurring amount in the calculator currency", "years in years", "annual return / rate … unless the label says otherwise", contribution wording and Conservative/Optimistic, and never states end-of-month instalments, monthly compounding or exclusions. [Exact contract](execution/prompts/B61.md).
  - Outcome/scope: before-input basis and exclusions, RD labels/helpers, extra yearly deposit distinguished from instalments, deposits + interest = maturity line, neutral what-ifs, RD guidance and scope notice; `rd` only.
  - Non-goals: start-of-month or quarterly arithmetic, tax/fees/penalties, missed instalments, market rates, recommendations, formula/schema changes, production.
  - Acceptance/tests: failing regressions first; results/scenarios byte-equal; default golden with independent oracle; full suite, CI, hosted 1440/390/320 light/dark and keyboard reveal.
  - Analytics/privacy/dependencies: none new; B50/B60. Migration: byte-equivalent results, no retagging. Human 2–3h, agent 1h plus validation.
- [x] **B62 — Exact-term schedules for lump sum and monthly recurring calculators.**
  - User problem/evidence: at 1.5 years the lump-sum table ends at ₹5,83,200 against a ₹5,61,184.46 headline and RD/SIP at ₹2,59,331.90 against ₹1,90,571.91. [Exact contract](execution/prompts/B62.md).
  - Outcome/scope: exact-term final rows equal to headlines for lump sum, compound, SIP, step-up SIP, RD and NPS; lump-sum growth labels; integer terms unchanged.
  - Non-goals: engines, other schedule builders (residual survey), results, scenarios, schema, production.
  - Acceptance/tests: Decimal oracles, table/CSV equal headline, full suite, CI, hosted CSV check. Human 1–2h, agent 1h.

## Exact-term schedule audit — 2026-10-03

- [x] **B63 — Exact-term schedules for return, inflation, Roth/traditional and EPF tables.**
  - User problem/evidence: at a part-year term CAGR's table shows 10.29% against an 11.28% headline and ends at year 6 for 5.5; inflation, Roth and EPF tables end above their headlines. [Exact contract](execution/prompts/B63.md).
  - Outcome/scope: whole years then the exact term; EPF on engine months; one shared helper (FD/CD and lump sum value-identical).
  - Non-goals: engines, PPF, gratuity, results, scenarios, schema, production.
  - Acceptance/tests: Decimal oracles, last rows equal headlines, whole-year rows unchanged, CSV, full suite, CI, hosted CSV. Human 1–2h, agent 1h.

## PPF and gratuity terms — 2026-10-04

- [x] **B64 — PPF: whole financial years and the yearly deposit limit.**
  - User problem/evidence: 15.5 years models 15.5 yearly deposits and a table ending at year 16; the optimistic what-if deposits ₹1,68,000, above the ₹1,50,000 scheme limit. [Exact sourced contract](execution/prompts/B64.md).
  - Outcome/scope: whole-year validation with a clear message, ₹1,50,000 input maximum (caps the what-if), deposit-timing and source in scope; valid whole-year results unchanged.
  - Non-goals: live rates, minimum/discontinuation, loans/withdrawals, model version, production.
  - Acceptance/tests: failing regressions first, Decimal oracles, full suite, CI, hosted validation message. Human 1–2h, agent 1h.
- [x] **B65 — Gratuity table ends at the entered service.**
  - User problem/evidence: 8.5 years headline ₹5,88,461.54 versus a year-9 row ₹6,23,076.92. [Exact contract](execution/prompts/B65.md).
  - Outcome/scope: exact entered-service final row with a note matching the existing scope; results unchanged; no legal claim.
  - Acceptance/tests: oracle, whole-year rows unchanged, CSV. Human 0.5h, agent 0.5h.

## Generated input helper copy — 2026-10-04

- [x] **B66 — Truthful generated input helpers.**
  - User problem/evidence: 86 inputs on 66 routes read "annual percentage unless the label says otherwise", 48 call amounts "recurring" (including one-time foreclosure/recast payments), 52 say "in years" (15 literally "Enter the years in years."; pay periods told to be in years). [Exact contract](execution/prompts/B66.md).
  - Outcome/scope: share-versus-yearly-rate percent text, monthly/yearly currency only when labelled, unit-suffix time text; generator only.
  - Non-goals: hand-written per-route helpers, labels, results, production.
  - Acceptance/tests: no defective phrasing on any route, named cases correct, explicit helpers unchanged; full suite, CI, hosted spot check. Human 1h, agent 0.5h.

## Market-growth presentation — 2026-10-04

- [x] **B67 — Market-growth presentation for lump sum, SIP and step-up SIP.**
  - User problem/evidence: lump sum calls a fund "Maturity value / Estimated interest" and asks for a monthly-budget check with no contributions; none state timing, monthly-versus-CAGR compounding, fees/tax exclusions or that returns are not forecasts. [Exact contract](execution/prompts/B67.md).
  - Outcome/scope: before-input growth basis, route labels/helpers, lump-sum result relabel, invested + gains = value line, neutral what-ifs, route guidance.
  - Non-goals: annuity-due or fee/tax arithmetic, fund data, compound-interest page, schema, production.
  - Acceptance/tests: failing regressions first, Decimal oracles, byte-equal values, full suite, CI, hosted light/dark 1440/390/320. Human 2–3h, agent 1h.
