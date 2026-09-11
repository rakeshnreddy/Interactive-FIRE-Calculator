# B04 validation matrix

Task: B04 (atomic, retry-safe calculator save)
Checkpoint: C02
Date: 2026-09-11
Writer: FinPath implementation agent
Contract: docs/execution/contracts/B04.md

## Validation results

| ID | Requirement / Test case | Command / Execution layer | Assertions and Expected Outcome | Exit Status | Actual Result |
|---|---|---|---|---|---|
| V01 | Injected failure in D1 batch rolls back completely leaving zero orphan goals or results | `npx vitest run src/calculatorResults.test.ts` (test: `rolls back atomic batch transaction completely on injected error leaving zero orphan goals or results (V01)`) | Mid-batch failure after statement 1 triggers transaction rollback; `goals` count = 0, `saved_calculator_results` count = 0. Zero orphan records created. | 0 | PASS |
| V02 | Simultaneous / concurrent identical save requests create exactly one entity and one saved result | `npx vitest run src/calculatorResults.test.ts` (test: `handles concurrent identical save requests racing for the same key safely without duplicates (V02)`) | Two concurrent requests racing on same key resolve to `['committed-save', 'retry']`. Database has exactly 1 goal row and 1 saved calculator result row. | 0 | PASS |
| V03 | Identical retry with same idempotency key returns original entity and result with `saveStatus: 'retry'` | `npx vitest run src/calculatorResults.test.ts` (test: `returns original entity and result with saveStatus: retry on identical retry (V03)`) | Second save call with matching key and payload returns HTTP 200 / `saveStatus: 'retry'` with identical entity ID and result ID. Zero duplicate rows created. | 0 | PASS |
| V04 | Conflicting payload with same idempotency key returns HTTP 409 Conflict with `code: 'IDEMPOTENCY_CONFLICT'` | `npx vitest run src/calculatorResults.test.ts` (test: `rejects conflicting payload with same idempotency key with HTTP 409 and IDEMPOTENCY_CONFLICT (V04)`) | Second save with identical key but different input values throws `IdempotencyConflictError` and returns HTTP 409 with `{ code: 'IDEMPOTENCY_CONFLICT' }`. | 0 | PASS |
| V05 | Tenant isolation: same idempotency key across different users creates distinct records without interference | `npx vitest run src/calculatorResults.test.ts` (test: `enforces multi-tenant isolation so different users with the same idempotency key create separate independent entities (V05)`) | User A and User B using key `shared_tenant_idempotency_key` both succeed with `committed-save`. User B's result query returns only User B's result; no cross-tenant collision. | 0 | PASS |
| V06 | Transaction destination creates no fake ledger entries in `transactions` table | `npx vitest run src/calculatorResults.test.ts` (test: `creates no fake ledger entries in transactions table when conversionRoute is /transactions (V06)`) | Saving with `conversionRoute: '/transactions'` creates `destinationType: 'transaction'` with `createdEntityType: null` and `transactions` row count = 0. | 0 | PASS |
| V07 | Additive migration `0005` applies cleanly to existing schema with partial unique index | `npx vitest run src/calculatorResults.test.ts` (test: `applies additive migration 0005 cleanly with partial unique index`) | Columns `idempotency_key` and `payload_hash` added to `saved_calculator_results`. Partial unique index `idx_saved_calculator_results_user_idempotency` verified unique = 1. | 0 | PASS |
| V08 | Deterministic canonical SHA-256 payload hashing invariant to key order | `npx vitest run src/calculatorResults.test.ts` (test: `computes deterministic SHA-256 payload hash invariant to key order`) | Key order reordering in `inputValues` produces identical SHA-256 digest; mutated values produce different digest. | 0 | PASS |
| V09 | Plans destination draft creation and retry execute atomically | `npx vitest run src/calculatorResults.test.ts` (test: `supports plans destination draft creation atomically and retries it`) | Saves `/plans` draft into `plans` table bundled with `saved_calculator_results`. Retry preserves original plan ID. | 0 | PASS |
| V10 | Full verification suite passes | `./scripts/test_all.sh` (logged to `docs/execution/evidence/B04/full-suite.log`) | All verification stages passed: scripts/test_all.test.mjs (13/13), Python compileall & pytest (79 passed, 21 subtests), npm run typecheck (0 errors), npm test (28 files, 1306 tests), npm run build (successful). | 0 | PASS |

## Summary

- Total requirements evaluated: 10
- Passed: 10
- Failed: 0
- Blocked: 0
- Final Status: PASS
