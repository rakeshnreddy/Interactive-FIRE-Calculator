# B02 validation matrix

Task: B02 (reject incompatible currency conversion into goals)
Checkpoint: C02
Date: 2026-09-11
Writer: FinPath implementation agent
Contract: docs/execution/contracts/B02.md

## Validation results

| ID | Requirement / Test case | Command / Execution layer | Assertions and Expected Outcome | Exit Status | Actual Result |
|---|---|---|---|---|---|
| V01 | `parseCalculatorSavePayload` returns typed error `{ code: 'INCOMPATIBLE_GOAL_CURRENCY', error: ... }` for non-USD goals | `npx vitest run src/calculatorResults.test.ts` (test: `rejects incompatible currency conversion into goals with typed 400 error`) | Checked currencies: EUR, INR, GBP, CAD, JPY, AUD. Expected code: `INCOMPATIBLE_GOAL_CURRENCY`, safe error text without financial amounts. | 0 | PASS |
| V02 | `createSavedCalculatorResult` throws typed `IncompatibleGoalCurrencyError` and makes zero database writes on non-USD goal save | `npx vitest run src/calculatorResults.test.ts` (test: `throws IncompatibleGoalCurrencyError and makes zero database writes on non-USD goal save`) | Rejection occurs before `ensureUserProfile` or any statement preparation. Spy DB asserts `prepare`, `batch`, and `exec` not called (0 calls). | 0 | PASS |
| V03 | `goalPayloadFromCalculator` returns `null` for non-USD payloads | `npx vitest run src/calculatorResults.test.ts` (test: `returns null from goalPayloadFromCalculator for non-USD payloads`) | Tested with EUR and INR payloads. Returned value is `null`, preventing any silent currency drop into goal amounts. | 0 | PASS |
| V04 | `parseGoalCreatePayload` and `parseGoalUpdatePayload` reject explicit non-USD currency with `INCOMPATIBLE_GOAL_CURRENCY` | `npx vitest run src/goals.test.ts` (test: `rejects explicit non-USD currency in create and update payloads`) | `parseGoalCreatePayload` with `currency: 'EUR'` and `parseGoalUpdatePayload` with `currency: 'INR'` return `{ ok: false, code: 'INCOMPATIBLE_GOAL_CURRENCY', error: ... }`. Explicit USD is accepted. | 0 | PASS |
| V05 | Valid USD goal save parses and creates destination goal and saved result | `npx vitest run src/calculatorResults.test.ts` (test: `accepts a valid public calculator result save payload`) | Valid USD goal payload parses with `ok: true`, preserving fields and goal conversion route `/goals`. | 0 | PASS |
| V06 | Non-USD account save (`/accounts`) parses and preserves currency (`EUR`, `INR`) without coercion | `npx vitest run src/calculatorResults.test.ts` (tests: `accepts non-USD currency on supported account destination` and `accepts the versioned Compound Interest numeric save boundary`) | `/accounts` route with `currency: 'EUR'` parses with `ok: true`, keeping currency as EUR without coercion or defaulting. | 0 | PASS |
| V07 | Public calculator export and share preserve currency | `npx vitest run src/lib/calculatorEngagement.test.ts` | Public calculations, share URL parameters, and CSV export retain original currency without switching. | 0 | PASS |
| V08 | Endpoints enforce auth preflight before parse, return typed 400 on forged requests, zero writes | `npx vitest run src/calculatorResults.test.ts src/goals.test.ts` (tests: `calculator results API endpoint (onRequestPost)` & `goals API endpoint (onRequestPost)`) | 1. Auth failure yields 401 before body parse. 2. Forged non-USD goal request yields 400 with `{ code: 'INCOMPATIBLE_GOAL_CURRENCY', error: ... }`. 3. Spy database confirms 0 calls to `prepare`, `batch`, `exec`. | 0 | PASS |
| V09 | Full test suite passes | `./scripts/test_all.sh` (logged to `docs/execution/evidence/B02/full-suite.log`) | All verification stages passed: scripts/test_all.test.mjs (13/13), Python compileall & pytest (79 passed, 21 subtests), npm run typecheck (0 errors), npm test (27 files, 1287 tests), npm run build (successful). | 0 | PASS |

## Summary

- Total requirements evaluated: 9
- Passed: 9
- Failed: 0
- Blocked: 0
- Final Status: PASS
