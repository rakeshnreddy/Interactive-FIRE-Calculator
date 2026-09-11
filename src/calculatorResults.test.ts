import * as fs from 'node:fs';
import * as path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { describe, expect, it, vi } from 'vitest';

import {
  CALCULATOR_SAVE_STATUS,
  createSavedCalculatorResult,
  destinationTypeForRoute,
  goalPayloadFromCalculator,
  hashCalculatorPayload,
  IDEMPOTENCY_CONFLICT_CODE,
  IdempotencyConflictError,
  INCOMPATIBLE_GOAL_CURRENCY_CODE,
  IncompatibleGoalCurrencyError,
  listSavedCalculatorResults,
  parseCalculatorSavePayload,
  targetDateForYears,
  type CalculatorSavePayload
} from '../functions/_lib/calculatorResults';
import * as sessionModule from '../functions/_lib/session';
import { onRequestPost } from '../functions/api/calculator-results/index';

const validPayload = {
  calculatorCategory: 'Planning',
  calculatorRegion: 'Global',
  calculatorSlug: 'savings-goal',
  calculatorTitle: 'Savings Goal Calculator',
  conversionLabel: 'Create savings goal',
  conversionRoute: '/goals',
  currency: 'USD',
  inputValues: {
    current: 1000,
    rate: 5,
    target: 10000,
    years: 3
  },
  result: {
    assumptions: ['Monthly savings are added at month end.'],
    metrics: [
      {
        description: 'Estimated monthly contribution required to reach the target.',
        label: 'Monthly savings needed',
        value: 236.72,
        valueType: 'currency'
      },
      {
        label: 'Remaining target',
        value: 8842,
        valueType: 'currency'
      }
    ],
    narrative: 'Estimated monthly contribution required to reach the target.'
  }
} as const;

describe('calculator result save payload validation', () => {
  it('accepts a valid public calculator result save payload', () => {
    expect(parseCalculatorSavePayload(validPayload)).toEqual({
      ok: true,
      value: {
        calculatorCategory: 'Planning',
        calculatorRegion: 'Global',
        calculatorSlug: 'savings-goal',
        calculatorTitle: 'Savings Goal Calculator',
        conversionLabel: 'Create savings goal',
        conversionRoute: '/goals',
        currency: 'USD',
        inputValues: validPayload.inputValues,
        result: validPayload.result
      }
    });
  });

  it('rejects unsupported destinations and non-finite inputs', () => {
    expect(parseCalculatorSavePayload({ ...validPayload, conversionRoute: '/admin' })).toEqual({
      error: 'conversionRoute is not supported.',
      ok: false
    });

    expect(
      parseCalculatorSavePayload({
        ...validPayload,
        inputValues: { target: Number.NaN }
      })
    ).toEqual({
      error: 'target must be a finite number.',
      ok: false
    });
  });

  it('maps calculator conversion routes to saved-result destination types', () => {
    expect(destinationTypeForRoute('/goals')).toBe('goal');
    expect(destinationTypeForRoute('/accounts')).toBe('account');
    expect(destinationTypeForRoute('/plans')).toBe('plan');
    expect(destinationTypeForRoute('/transactions')).toBe('transaction');
  });

  it('preserves fractional-year goal deadlines instead of rounding to whole years', () => {
    expect(targetDateForYears(2.5, new Date('2026-08-09T00:00:00.000Z'))).toBe('2029-02-09');
    expect(targetDateForYears(0.25, new Date('2026-08-09T00:00:00.000Z'))).toBe('2026-11-09');
    expect(targetDateForYears(1 / 12, new Date('2027-01-31T18:30:00.000Z'))).toBe('2027-02-28');
    expect(targetDateForYears(1 / 12, new Date('2028-01-31T18:30:00.000Z'))).toBe('2028-02-29');
    expect(targetDateForYears(0, new Date('2026-08-09T00:00:00.000Z'))).toBeNull();
  });

  it('uses the inflation-resolved Savings Goal target at the Goal persistence boundary', () => {
    const parsed = parseCalculatorSavePayload({
      ...validPayload,
      inputValues: {
        ...validPayload.inputValues,
        resolvedTarget: 13_439.16,
        targetBasis: 1
      }
    });

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(goalPayloadFromCalculator(parsed.value)?.targetAmountCents).toBe(1_343_916);
    }
  });

  it('accepts the versioned Compound Interest numeric save boundary', () => {
    const compoundPayload = {
      ...validPayload,
      calculatorCategory: 'Investing',
      calculatorSlug: 'compound-interest',
      calculatorTitle: 'Compound Interest Calculator',
      conversionLabel: 'Save as investment account',
      conversionRoute: '/accounts' as const,
      currency: 'EUR',
      inputValues: {
        annualContributionIncreasePercent: 3,
        annualFeePercent: 0.4,
        annualTopUp: 1000,
        compoundingFrequency: 12,
        contributionFrequency: 12,
        contributionTiming: 0,
        futureDepositAmount: 5000,
        futureDepositYear: 2.25,
        futureWithdrawalAmount: 1500,
        futureWithdrawalYear: 7.5,
        inflationPercent: 2.5,
        monthly: 500,
        principal: 10000,
        rate: 8,
        rateBasis: 0,
        recurringContribution: 500,
        target: 150000,
        targetBasis: 0,
        years: 10.5
      },
      result: {
        assumptions: ['Formula version finpath-compound-v2.'],
        metrics: [
          {
            description: 'Projected ending value.',
            label: 'Projected value',
            tone: 'accent',
            value: 140000,
            valueType: 'currency'
          },
          {
            description: 'Inflation-adjusted value.',
            label: 'Today’s buying power',
            value: 109000,
            valueType: 'currency'
          }
        ],
        narrative: 'Projection under constant assumptions.'
      }
    } as const;

    const parsed = parseCalculatorSavePayload(compoundPayload);

    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.calculatorSlug).toBe('compound-interest');
      expect(parsed.value.conversionRoute).toBe('/accounts');
      expect(parsed.value.currency).toBe('EUR');
      expect(parsed.value.inputValues.target).toBe(150000);
      expect(parsed.value.inputValues.contributionFrequency).toBe(12);
      expect(parsed.value.inputValues.futureDepositYear).toBe(2.25);
      expect(parsed.value.inputValues.futureWithdrawalAmount).toBe(1500);
    }
  });

  it('rejects incompatible currency conversion into goals with typed 400 error', () => {
    for (const currency of ['EUR', 'INR', 'GBP', 'CAD', 'JPY', 'AUD']) {
      const parsed = parseCalculatorSavePayload({
        ...validPayload,
        conversionRoute: '/goals',
        currency
      });

      expect(parsed).toEqual({
        code: INCOMPATIBLE_GOAL_CURRENCY_CODE,
        error: 'Goals currently support USD only. Currency conversion into goals is not supported.',
        ok: false
      });
    }
  });

  it('returns null from goalPayloadFromCalculator for non-USD payloads', () => {
    const nonUsdPayload = {
      ...validPayload,
      currency: 'EUR'
    } as unknown as CalculatorSavePayload;
    expect(goalPayloadFromCalculator(nonUsdPayload)).toBeNull();

    const inrPayload = {
      ...validPayload,
      currency: 'INR'
    } as unknown as CalculatorSavePayload;
    expect(goalPayloadFromCalculator(inrPayload)).toBeNull();
  });

  it('throws IncompatibleGoalCurrencyError and makes zero database writes on non-USD goal save', async () => {
    const spyDb = {
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn()
    } as unknown as D1Database;

    const nonUsdPayload = {
      ...validPayload,
      conversionRoute: '/goals',
      currency: 'EUR'
    } as unknown as CalculatorSavePayload;

    await expect(
      createSavedCalculatorResult(spyDb, 'user_123', nonUsdPayload)
    ).rejects.toThrow(IncompatibleGoalCurrencyError);

    expect(spyDb.prepare).not.toHaveBeenCalled();
    expect(spyDb.batch).not.toHaveBeenCalled();
    expect(spyDb.exec).not.toHaveBeenCalled();
  });

  it('accepts non-USD currency on supported account destination', () => {
    const accountPayload = {
      ...validPayload,
      conversionRoute: '/accounts' as const,
      currency: 'EUR'
    };

    const parsed = parseCalculatorSavePayload(accountPayload);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.currency).toBe('EUR');
      expect(parsed.value.conversionRoute).toBe('/accounts');
    }
  });
});

describe('calculator results API endpoint (onRequestPost)', () => {
  it('enforces auth preflight before body parse', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
    });

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json'
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: {} as D1Database },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(401);
  });

  it('rejects forged non-USD goal save request with typed 400 and zero database writes', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_test_123' } as any,
      ok: true
    });

    const spyDb = {
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn()
    } as unknown as D1Database;

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        conversionRoute: '/goals',
        currency: 'EUR'
      })
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: spyDb },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      code: 'INCOMPATIBLE_GOAL_CURRENCY',
      error: 'Goals currently support USD only. Currency conversion into goals is not supported.'
    });

    expect(spyDb.prepare).not.toHaveBeenCalled();
    expect(spyDb.batch).not.toHaveBeenCalled();
    expect(spyDb.exec).not.toHaveBeenCalled();
  });

  it('rejects malformed or missing currency with status 400', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_test_123' } as any,
      ok: true
    });

    const spyDb = {
      batch: vi.fn(),
      dump: vi.fn(),
      exec: vi.fn(),
      prepare: vi.fn()
    } as unknown as D1Database;

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...validPayload,
        currency: 'invalid'
      })
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: spyDb },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      error: 'currency must be a three-letter code.'
    });

    expect(spyDb.prepare).not.toHaveBeenCalled();
  });
});

describe('B04: atomic, retry-safe calculator save with real SQLite D1 harness', () => {
  function createRealD1(): { database: D1Database; sqlite: DatabaseSync } {
    const sqlite = new DatabaseSync(':memory:');
    const migrations = [
      '0001_initial_financial_platform_schema.sql',
      '0002_balance_import_history.sql',
      '0003_transaction_import_history.sql',
      '0004_saved_calculator_results.sql',
      '0005_saved_calculator_idempotency.sql'
    ];
    for (const m of migrations) {
      const sql = fs.readFileSync(path.resolve(process.cwd(), 'migrations', m), 'utf8');
      sqlite.exec(sql);
    }

    const normalize = (v: unknown): any =>
      typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v;

    function wrapStatement(query: string, boundValues: unknown[] = []): D1PreparedStatement {
      return {
        bind(...values: unknown[]) {
          return wrapStatement(query, values);
        },
        async all<T = unknown>() {
          const stmt = sqlite.prepare(query);
          const rows = stmt.all(...(boundValues.map(normalize) as any[]));
          return {
            results: rows as T[],
            success: true,
            meta: {}
          };
        },
        async first<T = unknown>(colName?: string) {
          const stmt = sqlite.prepare(query);
          const row = stmt.get(...(boundValues.map(normalize) as any[])) as Record<string, unknown> | undefined;
          if (!row) return null;
          if (colName) return (row[colName] ?? null) as T;
          return row as T;
        },
        async run() {
          const stmt = sqlite.prepare(query);
          const info = stmt.run(...(boundValues.map(normalize) as any[]));
          return {
            success: true,
            meta: { changes: info.changes, last_row_id: Number(info.lastInsertRowid) }
          };
        },
        _executeInternal() {
          const stmt = sqlite.prepare(query);
          return stmt.run(...(boundValues.map(normalize) as any[]));
        }
      } as unknown as D1PreparedStatement;
    }

    const database: D1Database = {
      prepare(query: string) {
        return wrapStatement(query);
      },
      async batch(statements: unknown[]) {
        sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
        try {
          const results = [];
          for (const s of statements) {
            const stmt = s as { _executeInternal?: () => unknown; run: () => Promise<unknown> };
            if (stmt._executeInternal) {
              results.push(stmt._executeInternal());
            } else {
              results.push(await stmt.run());
            }
          }
          sqlite.exec('COMMIT');
          return results;
        } catch (err) {
          sqlite.exec('ROLLBACK');
          throw err;
        }
      },
      async exec(query: string) {
        sqlite.exec(query);
        return { count: 0, duration: 0 };
      },
      dump: async () => new ArrayBuffer(0)
    } as unknown as D1Database;

    return { database, sqlite };
  }

  it('applies additive migration 0005 cleanly with partial unique index', () => {
    const { sqlite } = createRealD1();
    const cols = sqlite.prepare('PRAGMA table_info(saved_calculator_results)').all() as Array<{ name: string }>;
    const colNames = cols.map((c) => c.name);
    expect(colNames).toContain('idempotency_key');
    expect(colNames).toContain('payload_hash');

    const idxs = sqlite.prepare('PRAGMA index_list(saved_calculator_results)').all() as Array<{
      name: string;
      unique: number;
    }>;
    const uniqueIdx = idxs.find((i) => i.name === 'idx_saved_calculator_results_user_idempotency');
    expect(uniqueIdx).toBeDefined();
    expect(uniqueIdx?.unique).toBe(1);
  });

  it('computes deterministic SHA-256 payload hash invariant to key order', async () => {
    const payloadA: CalculatorSavePayload = {
      ...validPayload,
      conversionRoute: '/goals',
      currency: 'USD',
      inputValues: { current: 1000, rate: 5, target: 10000, years: 3 }
    };
    const payloadB: CalculatorSavePayload = {
      ...validPayload,
      conversionRoute: '/goals',
      currency: 'USD',
      // Reversed key order in inputValues
      inputValues: { years: 3, target: 10000, rate: 5, current: 1000 }
    };

    const hashA = await hashCalculatorPayload(payloadA);
    const hashB = await hashCalculatorPayload(payloadB);
    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);

    const differentPayload: CalculatorSavePayload = {
      ...payloadA,
      inputValues: { ...payloadA.inputValues, target: 20000 }
    };
    const hashDiff = await hashCalculatorPayload(differentPayload);
    expect(hashDiff).not.toBe(hashA);
  });

  it('rolls back atomic batch transaction completely on injected error leaving zero orphan goals or results (V01)', async () => {
    const { database, sqlite } = createRealD1();

    // Wrap database.batch to simulate mid-batch failure on statement 2
    database.batch = vi.fn().mockImplementation(async (statements: any[]) => {
      sqlite.exec('BEGIN IMMEDIATE TRANSACTION');
      try {
        // Execute the first statement (e.g. goal insert)
        statements[0]._executeInternal();
        // Simulate unexpected database crash / error before committing result statement
        throw new Error('Simulated D1 batch disk write failure');
      } catch (err) {
        sqlite.exec('ROLLBACK');
        throw err;
      }
    });

    await expect(
      createSavedCalculatorResult(database, 'user_atomicity_test', {
        ...validPayload,
        conversionRoute: '/goals',
        currency: 'USD',
        idempotencyKey: 'key_atomicity_fail'
      })
    ).rejects.toThrow('Simulated D1 batch disk write failure');

    // Verify ZERO orphan goal rows were committed
    const goalRow = sqlite
      .prepare('SELECT count(*) as count FROM goals WHERE user_id = ?')
      .get('user_atomicity_test') as { count: number };
    expect(goalRow.count).toBe(0);

    // Verify ZERO saved calculator result rows were committed
    const resultRow = sqlite
      .prepare('SELECT count(*) as count FROM saved_calculator_results WHERE user_id = ?')
      .get('user_atomicity_test') as { count: number };
    expect(resultRow.count).toBe(0);
  });

  it('returns original entity and result with saveStatus: retry on identical retry (V03)', async () => {
    const { database, sqlite } = createRealD1();
    const payload = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: 'idemp_key_identical_retry'
    };

    const firstSave = await createSavedCalculatorResult(database, 'user_retry_test', payload);
    expect(firstSave.saveStatus).toBe('committed-save');
    expect(firstSave.createdEntity?.type).toBe('goal');
    const originalGoalId = firstSave.createdEntity?.id;
    const originalResultId = firstSave.savedResult.id;

    // Retry with identical key and payload
    const secondSave = await createSavedCalculatorResult(database, 'user_retry_test', payload);
    expect(secondSave.saveStatus).toBe('retry');
    expect(secondSave.createdEntity?.id).toBe(originalGoalId);
    expect(secondSave.savedResult.id).toBe(originalResultId);

    // Verify exactly one goal and one saved result row exist in database
    const goalRows = sqlite.prepare('SELECT * FROM goals WHERE user_id = ?').all('user_retry_test') as any[];
    expect(goalRows.length).toBe(1);
    expect(goalRows[0].id).toBe(originalGoalId);

    const resultRows = sqlite
      .prepare('SELECT * FROM saved_calculator_results WHERE user_id = ?')
      .all('user_retry_test') as any[];
    expect(resultRows.length).toBe(1);
    expect(resultRows[0].id).toBe(originalResultId);
    expect(resultRows[0].idempotency_key).toBe('idemp_key_identical_retry');
  });

  it('rejects conflicting payload with same idempotency key with HTTP 409 and IDEMPOTENCY_CONFLICT (V04)', async () => {
    const { database } = createRealD1();
    const payload1 = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: 'idemp_key_conflict_123',
      inputValues: { ...validPayload.inputValues, target: 10000 }
    };
    const payload2 = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: 'idemp_key_conflict_123',
      inputValues: { ...validPayload.inputValues, target: 50000 } // Modified target!
    };

    // First save succeeds
    const firstSave = await createSavedCalculatorResult(database, 'user_conflict_test', payload1);
    expect(firstSave.saveStatus).toBe('committed-save');

    // Second save with same key but different payload directly throws IdempotencyConflictError
    await expect(
      createSavedCalculatorResult(database, 'user_conflict_test', payload2)
    ).rejects.toThrow(IdempotencyConflictError);

    // Also verify via onRequestPost HTTP endpoint returns 409
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_conflict_test' } as any,
      ok: true
    });

    const request = new Request('https://finpath.app/api/calculator-results', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': 'idemp_key_conflict_123'
      },
      body: JSON.stringify(payload2)
    });

    const response = await onRequestPost({
      data: {},
      env: { DB: database },
      functionPath: '/api/calculator-results',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body).toEqual({
      code: IDEMPOTENCY_CONFLICT_CODE,
      error: 'Idempotency key was previously used with a different calculator payload.'
    });
  });

  it('enforces multi-tenant isolation so different users with the same idempotency key create separate independent entities (V05)', async () => {
    const { database, sqlite } = createRealD1();
    const sharedKey = 'shared_tenant_idempotency_key';

    const userAPayload = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: sharedKey
    };

    const userBPayload = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: sharedKey
    };

    const saveA = await createSavedCalculatorResult(database, 'user_tenant_A', userAPayload);
    const saveB = await createSavedCalculatorResult(database, 'user_tenant_B', userBPayload);

    expect(saveA.saveStatus).toBe('committed-save');
    expect(saveB.saveStatus).toBe('committed-save');
    expect(saveA.savedResult.id).not.toBe(saveB.savedResult.id);
    expect(saveA.createdEntity?.id).not.toBe(saveB.createdEntity?.id);

    // User B cannot see User A's results
    const resultsB = await listSavedCalculatorResults(database, 'user_tenant_B');
    expect(resultsB.length).toBe(1);
    expect(resultsB[0].id).toBe(saveB.savedResult.id);
    expect(resultsB[0].id).not.toBe(saveA.savedResult.id);

    // Database has 2 independent rows with the same key under different users
    const allWithKey = sqlite
      .prepare('SELECT user_id, id FROM saved_calculator_results WHERE idempotency_key = ?')
      .all(sharedKey) as any[];
    expect(allWithKey.length).toBe(2);
    expect(allWithKey.map((r) => r.user_id).sort()).toEqual(['user_tenant_A', 'user_tenant_B']);
  });

  it('handles concurrent identical save requests racing for the same key safely without duplicates (V02)', async () => {
    const { database, sqlite } = createRealD1();
    const raceKey = 'race_condition_idempotency_key';
    const racePayload = {
      ...validPayload,
      conversionRoute: '/goals' as const,
      currency: 'USD',
      idempotencyKey: raceKey
    };

    const [save1, save2] = await Promise.all([
      createSavedCalculatorResult(database, 'user_concurrency_test', racePayload),
      createSavedCalculatorResult(database, 'user_concurrency_test', racePayload)
    ]);

    const statuses = [save1.saveStatus, save2.saveStatus].sort();
    expect(statuses).toEqual(['committed-save', 'retry']);
    expect(save1.savedResult.id).toBe(save2.savedResult.id);
    expect(save1.createdEntity?.id).toBe(save2.createdEntity?.id);

    // Database contains exactly 1 saved calculator result
    const countRow = sqlite
      .prepare('SELECT count(*) as count FROM saved_calculator_results WHERE user_id = ?')
      .get('user_concurrency_test') as { count: number };
    expect(countRow.count).toBe(1);

    // Database contains exactly 1 goal
    const goalCountRow = sqlite
      .prepare('SELECT count(*) as count FROM goals WHERE user_id = ?')
      .get('user_concurrency_test') as { count: number };
    expect(goalCountRow.count).toBe(1);
  });

  it('creates no fake ledger entries in transactions table when conversionRoute is /transactions (V06)', async () => {
    const { database, sqlite } = createRealD1();
    const txPayload = {
      ...validPayload,
      conversionLabel: 'Save cashflow projection',
      conversionRoute: '/transactions' as const,
      currency: 'USD'
    };

    const saved = await createSavedCalculatorResult(database, 'user_tx_test', txPayload);
    expect(saved.saveStatus).toBe('committed-save');
    expect(saved.createdEntity).toBeNull();
    expect(saved.savedResult.destinationType).toBe('transaction');
    expect(saved.savedResult.createdEntityType).toBeNull();
    expect(saved.savedResult.createdEntityId).toBeNull();

    // Verify 0 rows were inserted into transactions table
    const txCount = sqlite
      .prepare('SELECT count(*) as count FROM transactions WHERE user_id = ?')
      .get('user_tx_test') as { count: number };
    expect(txCount.count).toBe(0);
  });

  it('supports plans destination draft creation atomically and retries it', async () => {
    const { database, sqlite } = createRealD1();
    const planPayload = {
      ...validPayload,
      calculatorSlug: 'retirement-fire',
      calculatorTitle: 'Retirement FIRE Calculator',
      conversionLabel: 'Save retirement plan',
      conversionRoute: '/plans' as const,
      currency: 'USD',
      idempotencyKey: 'idemp_plan_key'
    };

    const first = await createSavedCalculatorResult(database, 'user_plan_test', planPayload);
    expect(first.saveStatus).toBe('committed-save');
    expect(first.createdEntity?.type).toBe('plan');
    expect(first.createdEntity?.route).toBe('/plans');
    const planId = first.createdEntity?.id;
    expect(planId).toBeDefined();

    // Verify plan exists in plans table
    const planRow = sqlite
      .prepare('SELECT * FROM plans WHERE id = ? AND user_id = ?')
      .get(planId!, 'user_plan_test') as any;
    expect(planRow).toBeDefined();
    expect(planRow.status).toBe('draft');

    // Retry returns original plan entity
    const retry = await createSavedCalculatorResult(database, 'user_plan_test', planPayload);
    expect(retry.saveStatus).toBe('retry');
    expect(retry.createdEntity?.id).toBe(planId);
  });
});
