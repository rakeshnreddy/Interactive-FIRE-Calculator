# C02 independent review

Date: 2026-09-11
Reviewer: primary reviewing session, sole closure owner
Decision: CHANGES_REQUESTED; no C02 task accepted.
Reviewed final code: e363d307e781765d3491d4595ea465f8964a5f0b; documentation HEAD2bd7a66. Range7700a97..2bd7a66.
PR: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140; base codex/dependency-security-refresh.
Candidate preview: missing. Referenced b8f9d6ec is the earlier pre-C02 website/backend. At review start remote PR head was7700a97, so its green CI does not verify this local candidate. Review push includes local submissions after independent full-suite verification; that alone does not deploy or approve them.

## Independent verification

Inspected B02/B03/B04 changes together, task contracts and submissions. Ran calculatorResults, accounts, goals and planWorkspace test files: pass. Ran full ./scripts/test_all.sh at final candidate: exit0, 13 runner tests,79 Python tests+21 subtests,1306 Vitest tests/28 files,typecheck/build. [Targeted tests](../evidence/C02-review/targeted-tests.log), [full suite](../evidence/C02-review/full-suite.log).

Read-only live project check before review push: preview DB remains isolated0dbad68e-7493-452f-8504-98d4c61ee5da; custom Git include only codex/cloudflare-pages-theme-plan; execution branch excluded and production automatic deployments disabled. No remote migration or financial write performed.

## Findings and decisions

| ID | Task | Category | Observed vs required | Required correction and validation |
|---|---|---|---|---|
| R1 | B04 | Original retry requirement violated | App.tsx createCalculatorResultRecord generates crypto.randomUUID on every invocation. A committed request whose response is lost is retried by another invocation with a new key, so the server creates another entity. | Own the key at the logical save-operation boundary. Keep the same key and payload for an uncertain retry; distinguish a deliberate new save. Test the real client path with server commit + simulated response loss, then user retry; assert same key and one entity/result. Also test changed payload, new operation and account changes. |
| R2 | B04 | Original conflict requirement violated | hashCalculatorPayload sorts metrics, but goal/account destination helpers use the first currency metric. Reordering [A:$100,B:$200] to [B:$200,A:$100] produces equal hashes but different goal targets10000 vs20000 cents. | Preserve semantically meaningful array order in the canonical hash, or define one consistent canonical destination calculation without changing existing financial semantics. Minimal preferred fix: sort object keys only; preserve metric order. Same key with different destination semantics must409. |
| R3 | B04 | Input validation gap | Endpoint parses/limits body key, then injects trimmed Idempotency-Key header after validation. Header-only oversized keys bypass the120-character limit; conflicting header/body keys are silently resolved. | Normalize header/body once before persistence, validate the chosen key identically and reject disagreement with a typed400. Test malformed/oversized/header-only/body-only/matching/conflicting forms, zero writes on rejection. |
| R4 | B02/B03/B04 | Missing final-candidate evidence | Submissions say pending push and final candidate TBD, cite older preview and claim no blockers. B04 adds migration0005, but no applied-preview migration evidence exists. | Refresh all three submissions to one final executable/config revision, obtain exact CI and deploy only after approved isolated migration setup. Record actual provider revision/tree relationship and common preview; do not call the old preview current. |
| R5 | B03 | Missing rendered UI evidence | App.tsx changes dashboard and account summary rendering and multiline per-currency breakdowns; no matched rendered evidence of these states is supplied. | Use isolated local auth fixtures, not a hosted bypass, to render empty/single/mixed-currency accounts and dashboards in both themes/mobile/desktop, long values and zoom/keyboard where affected. Verify currency labels, no false totals/overlap, account exclusion and seed-rejection behavior. |

R2 was independently reproduced with valid parsed payloads. [Source](../evidence/C02-review/hash-reproduction.test.ts), [passing demonstration log](../evidence/C02-review/hash-reproduction.log). The test passes because it demonstrates the defect: equal hashes and different destination values. Worker regression must invert the unsafe-equality expectation after the fix. The source was executed temporarily under src with its original relative import; replay through the current Vitest include configuration with an adjusted import if needed.

## Passing work to preserve

B02 non-USD goal guards and no-write regression checks pass locally. B03 per-currency totals avoid adding unlike currencies and plan-seed mismatch checks pass locally. B04 uses D1 batch with user-scoped uniqueness and local SQLite transaction tests; preserve those improvements. These are promising implementation results, not final checkpoint acceptance. Local SQLite-backed D1 adapter tests are not hosted D1 execution proof. No unrelated formula or UI redesign requested.

## Closure, scope and rollout

B04 changes_requested for R1–R3 and evidence. B02/B03 blocked on final common evidence; no confirmed B02 defect found in reviewed scope. C02 remains released for rework; C03 remains locked. Total7/34 accepted20.6% task count. Earlier accepted tasks are not reopened. No main merge or production deploy.

Migration0005 requires scoped authorization before remote application: only the existing isolated finpath-preview DB, reviewed additive SQL, no production DB or real records. Free-services instruction does not waive the existing remote-migration approval boundary. Finish local fixes first; then request the exact remaining action if not granted. Do not deploy code requiring0005 against a four-migration preview schema. Safe rollback preserves additive schema and disables unsafe save behavior rather than restoring duplicates.

Next: [C02 implementation/validation rework](../C02_REWORK_PROMPT.md). Review all current criteria after fixes, including prior provisional tasks affected by the final candidate.
