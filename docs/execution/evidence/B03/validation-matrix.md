# B03 validation matrix

Task: B03 (prevent mixed-currency account totals)
Checkpoint: C02
Date: 2026-09-11
Writer: FinPath implementation agent
Contract: docs/execution/contracts/B03.md

## Validation results

| ID | Requirement / Test case | Command / Execution layer | Assertions and Expected Outcome | Exit Status | Actual Result |
|---|---|---|---|---|---|
| V01 | `summarizeAccounts` with USD 100 + INR 100 sets `hasMixedCurrencies: true`, `assetsCents: null`, and separate `byCurrency` entries | `npx vitest run src/accounts.test.ts` (test: `prevents false combined totals for mixed currencies (USD 100 + INR 100 never displays USD 200)`) | `hasMixedCurrencies: true`, `assetsCents: null`, `liabilitiesCents: null`, `netWorthCents: null`, `primaryCurrency: null`, `currencies: ['INR', 'USD']`. Per-currency breakdown: `byCurrency.USD` and `byCurrency.INR` tracked independently. | 0 | PASS |
| V02 | Single-currency account summary preserves exact totals and sets `hasMixedCurrencies: false` | `npx vitest run src/accounts.test.ts` (test: `preserves exact numeric totals for single-currency accounts`) | `hasMixedCurrencies: false`, `primaryCurrency: 'USD'`, `assetsCents: 40_000`, `liabilitiesCents: 10_000`, `netWorthCents: 30_000`, `currencies: ['USD']`. Backward compatible with existing calculations. | 0 | PASS |
| V03 | Liabilities reconcile independently per currency without cross-currency contamination | `npx vitest run src/accounts.test.ts` (test: `reconciles liabilities per currency without cross-currency pollution`) | USD assets $500 and liabilities $200 reconcile to USD net worth $300; INR assets ₹1,000 and liabilities ₹400 reconcile to INR net worth ₹600. Combined net worth is `null`. | 0 | PASS |
| V04 | Archived and inactive accounts are excluded from summary totals | `npx vitest run src/accounts.test.ts` (test: `excludes archived and inactive accounts from summary calculations`) | Active USD $100 counted; inactive USD $200 and archived INR ₹990 excluded. Summary reflects single currency USD with 1 account and $100 assets. | 0 | PASS |
| V05 | Negative balances in accounts are computed correctly per currency | `npx vitest run src/accounts.test.ts` (test: `handles negative balances correctly per currency`) | Overdrawn account -$50 and positive account $200 sum to $150 assets and $150 net worth. | 0 | PASS |
| V06 | Empty account list returns 0 totals and `hasMixedCurrencies: false` | `npx vitest run src/accounts.test.ts` (test: `returns clean zero totals for empty account lists`) | Returns `accountCount: 0`, `assetsCents: 0`, `liabilitiesCents: 0`, `netWorthCents: 0`, `currencies: []`, `hasMixedCurrencies: false`, `primaryCurrency: null`, `byCurrency: {}`. | 0 | PASS |
| V07 | `previewPlanSeed` rejects mismatched account currencies with typed `CURRENCY_MISMATCH` reason enum | `npx vitest run src/lib/planWorkspace.test.ts` (tests: `rejects account sources with mismatched currency using CURRENCY_MISMATCH error enum` and `rejects multiple accounts with mixed currencies in plan import`) | Seed import rejects accounts with EUR or INR when profile is USD. Error detail contains `reason: PLAN_SEED_ERROR_REASONS.CURRENCY_MISMATCH`, `accountName`, `currency`, and `expectedCurrency`. | 0 | PASS |
| V08 | API endpoints (`/api/accounts`, `/api/dashboard`) return per-currency summaries | `npx vitest run src/accounts.test.ts` (tests: `/api/accounts returns per-currency summary with null combined totals for mixed currencies` and `/api/dashboard returns per-currency summary with isolated totals`) | Endpoint responses include `summary.hasMixedCurrencies`, `summary.byCurrency`, and null combined totals on mixed sets. | 0 | PASS |
| V09 | Full verification suite passes | `./scripts/test_all.sh` (logged to `docs/execution/evidence/B03/full-suite.log`) | All verification stages passed: scripts/test_all.test.mjs (13/13), Python compileall & pytest (79 passed, 21 subtests), npm run typecheck (0 errors), npm test (28 files, 1297 tests), npm run build (successful). | 0 | PASS |

## Summary

- Total requirements evaluated: 9
- Passed: 9
- Failed: 0
- Blocked: 0
- Final Status: PASS
