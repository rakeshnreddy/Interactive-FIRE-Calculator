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

- [ ] **B18 — Planned: Replace generic homepage hero with authentic product composition.**
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

- [ ] **B19 — Planned: Make calculator discovery concise and distinctive.**
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

- [ ] **B20 — Planned: Reorder generic calculators around inputs and the answer.**
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

- [ ] **B21 — Planned: Make shared charts numerically honest and accessible.**
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

- [ ] **B22 — Planned: Unify compound-interest and savings-goal presentation.**
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

- [ ] **B23 — Planned: Unify budget, net-worth and emergency-fund presentation.**
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

- [ ] **B24 — Planned: Refine FIRE calculator into the flagship decision experience.**
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

- [ ] **B25 — Planned: Build isolated operational UI fixtures for visual verification.**
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

- [ ] **B26 — Planned: Polish dashboard and account overview.**
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

- [ ] **B27 — Planned: Polish transactions and import review.**
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

- [ ] **B28 — Planned: Polish goals and monthly plan-review workflow.**
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

- [ ] **B29 — Planned: Polish reports and readable financial evidence.**
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

- [ ] **B30 — Planned: Polish settings and privacy lifecycle controls.**
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

- [ ] **B31 — Planned: Close visual accessibility and performance acceptance matrix.**
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

- [ ] **B33 — Owner-blocked: isolate preview infrastructure before backend publication.**
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

## Milestone reporting

For each item record commit, changed files, red/green tests, local full-suite result, PR/CI URL, immutable preview URL and hosted verification scope. Report remaining risks and the exact next Ready item. Production readiness is never inferred from document completion or preview deployment.

C01 acceptance 2026-09-10: B15/B16/B17 accepted together at `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`; [independent review](execution/reviews/C01.md). Next released task: B32 in C01T.

Landing review amendment 2026-09-10: [image, copy and theme findings](LANDING_PAGE_REVIEW.md) expand B32 with a visibly theme-responsive existing hero and B18 with an engine-backed product example, exact copy baseline, honest account availability and detailed review gates. Follow their amended prompts; C03 remains locked. No task was closed or renumbered.

C01T review 2026-09-10: B32 requires print-layer repair and completed verification evidence; [review](execution/reviews/C01T.md). No new task accepted; C01I remains locked.

C01T re-review of 12b3546: B32 remains changes_requested. Hero print improved; lower continuity print and verification gate still need repair. Matching WebKit installed and sampled by reviewer. Follow latest [review](execution/reviews/C01T.md) and [worker prompt](execution/C01T_REWORK_PROMPT.md). Accepted total unchanged.

C01T third review of dd47fa3: whole-page print verified fixed; bounded native200% layout checks completed. Remaining evaluator missing-telemetry false PASS and manual reader/interaction proof keep B32 open. Follow latest review and bounded rework prompt; no new task accepted.

C01T final acceptance: B32 accepted at `32584da7e47307a35730911e3567f02f9095550b` under the owner’s explicit actual-reader deferral, tracked in B31. This supersedes earlier C01T changes-requested notes. Accepted total 6/34 (17.6% by task count). C01I/B33 is released for its scoped isolation work; remote setup still needs its specified owner authorization. See [final review](execution/reviews/C01T.md).

C01I primary review: B33 requires audit reliability repairs and scoped preview-binding authorization. No acceptance; C02 stays locked. See [review](execution/reviews/C01I.md) and [rework prompt](execution/C01I_REWORK_PROMPT.md).
