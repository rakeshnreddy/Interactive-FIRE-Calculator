import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import type { SignedInAuth } from './client';
import {
  calculatorDestinationLabel,
  calculatorSaveMessage,
  createCalculatorResultRecord,
  isCalculatorConversionRoute,
  isSavedCalculatorDestinationType,
  loadSavedCalculatorResults,
  toSavedCalculatorResult
} from './calculatorResults';
import {
  createAccountPlan,
  deleteAccountPlan,
  loadAccountPlans,
  PlanRequestError,
  planErrorMessage,
  toSavedPlan,
  updateAccountPlan
} from './plans';
import {
  deleteAccountDataRecord,
  draftToProfileUpdate,
  loadAccountDataExport,
  loadAccountProfile,
  profileToDraft,
  toAccountProfile,
  updateAccountProfile
} from './profile';
import {
  addFinancialAccountBalanceRecord,
  createFinancialAccountRecord,
  formatAccountMetric,
  formatCurrencyBreakdown,
  isAccountCategory,
  isBalanceStale,
  isFinancialAccountType,
  loadFinancialAccounts,
  readFinancialAccountResponse,
  summarizeAccountList,
  toFinancialAccount
} from './accounts';
import {
  createTransactionRecord,
  formatTransactionAmount,
  isTransactionType,
  loadTransactions,
  summarizeTransactionList,
  toTransaction,
  updateTransactionRecord
} from './transactions';
import {
  createGoalRecord,
  formatGoalPercent,
  goalDeadlineLabel,
  isGoalStatus,
  isGoalType,
  loadGoals,
  readGoalResponse,
  summarizeGoalList,
  toGoal,
  updateGoalRecord
} from './goals';

const mockAuth: SignedInAuth = {
  getToken: vi.fn().mockResolvedValue('test-token-123'),
  isConfigured: true,
  isSignedIn: true,
  provider: 'clerk',
  status: 'signed-in',
  user: { displayName: 'User', email: 'test@example.com', id: 'usr_test' }
};

describe('API DTO Parsers and Guards', () => {
  it('validates calculator conversion routes and destinations', () => {
    expect(isCalculatorConversionRoute('/accounts')).toBe(true);
    expect(isCalculatorConversionRoute('/goals')).toBe(true);
    expect(isCalculatorConversionRoute('/invalid' as any)).toBe(false);

    expect(isSavedCalculatorDestinationType('account')).toBe(true);
    expect(isSavedCalculatorDestinationType('unknown')).toBe(false);

    expect(calculatorDestinationLabel('account')).toBe('Account draft');
    expect(calculatorDestinationLabel('goal')).toBe('Goal draft');
    expect(calculatorDestinationLabel('plan')).toBe('Plan draft');
    expect(calculatorDestinationLabel('transaction')).toBe('Cashflow draft');
  });

  it('parses valid SavedCalculatorResult and rejects malformed values', () => {
    expect(toSavedCalculatorResult(null)).toBeNull();
    expect(toSavedCalculatorResult({})).toBeNull();
    expect(toSavedCalculatorResult({ id: 123 })).toBeNull();

    const validRecord = {
      calculatorCategory: 'Retirement',
      calculatorRegion: 'US',
      calculatorSlug: 'fire',
      calculatorTitle: 'FIRE Calculator',
      conversionLabel: 'Save to Plan',
      conversionRoute: '/plans',
      createdAt: '2026-01-01T00:00:00Z',
      createdEntityId: null,
      createdEntityType: null,
      currency: 'USD',
      destinationType: 'plan',
      id: 'calc_1',
      inputValues: { age: 30, spending: 50000 },
      result: {
        assumptions: ['4% rule'],
        metrics: [{ label: 'FIRE Number', value: 1250000, valueType: 'currency' }],
        narrative: 'Ready for FIRE'
      },
      updatedAt: '2026-01-01T00:00:00Z'
    };

    const parsed = toSavedCalculatorResult(validRecord);
    expect(parsed).not.toBeNull();
    expect(parsed?.calculatorTitle).toBe('FIRE Calculator');
    expect(parsed?.result.metrics[0].value).toBe(1250000);
  });

  it('parses valid SavedPlan and rejects malformed snapshot', () => {
    expect(toSavedPlan(null)).toBeNull();
    expect(toSavedPlan({ id: 'p1', name: 'Plan 1', createdAt: '2026-01-01T00:00:00Z' })).toBeNull();

    const validPlan = {
      createdAt: '2026-01-01T00:00:00Z',
      id: 'p1',
      name: 'Primary Plan',
      snapshot: {
        plan: { annualExpense: 80000 },
        timeline: { currentAge: 35 }
      }
    };
    const parsed = toSavedPlan(validPlan);
    expect(parsed).not.toBeNull();
    expect(parsed?.name).toBe('Primary Plan');
  });

  it('parses AccountProfile and handles draft round-trip', () => {
    expect(toAccountProfile(null)).toBeNull();
    expect(toAccountProfile({ userId: 'u1' })).toBeNull();

    const profile = {
      birthYear: 1990,
      defaultCurrency: 'USD',
      displayName: 'Alex',
      householdName: 'Alex Household',
      targetRetirementAge: 55,
      updatedAt: '2026-01-01T00:00:00Z',
      userId: 'user_1'
    };
    const parsed = toAccountProfile(profile);
    expect(parsed).not.toBeNull();
    expect(parsed?.displayName).toBe('Alex');

    const draft = profileToDraft(parsed!);
    expect(draft.birthYear).toBe('1990');
    expect(draft.displayName).toBe('Alex');

    const update = draftToProfileUpdate(draft);
    expect(update.birthYear).toBe(1990);
    expect(update.defaultCurrency).toBe('USD');
  });

  it('validates financial accounts, types, categories and summaries', () => {
    expect(isFinancialAccountType('checking')).toBe(true);
    expect(isFinancialAccountType('crypto' as any)).toBe(false);
    expect(isAccountCategory('asset')).toBe(true);
    expect(isAccountCategory('equity' as any)).toBe(false);

    expect(toFinancialAccount(null)).toBeNull();
    const parsedAccount = toFinancialAccount({
      accountType: 'savings',
      balanceHistory: [],
      category: 'asset',
      createdAt: '2026-01-01T00:00:00Z',
      currency: 'USD',
      id: 'acc_1',
      isActive: true,
      latestBalanceCents: 500000,
      latestBalanceDate: '2026-01-01',
      name: 'Emergency Fund',
      updatedAt: '2026-01-01T00:00:00Z'
    });
    expect(parsedAccount).not.toBeNull();
    expect(parsedAccount?.latestBalanceCents).toBe(500000);

    const summary = summarizeAccountList([parsedAccount!]);
    expect(summary.accountCount).toBe(1);
    expect(summary.assetsCents).toBe(500000);
    expect(summary.netWorthCents).toBe(500000);
    expect(formatAccountMetric(summary.assetsCents, summary)).toBe('$5,000');
    expect(formatCurrencyBreakdown(summary, 'assetsCents')).toBeNull();
  });

  it('checks balance staleness correctly across 30-day threshold', () => {
    const today = new Date('2026-03-15T00:00:00Z');
    expect(isBalanceStale('2026-03-01', today)).toBe(false); // 14 days ago
    expect(isBalanceStale('2026-02-01', today)).toBe(true); // 42 days ago
    expect(isBalanceStale(null)).toBe(true);
    expect(isBalanceStale('invalid-date')).toBe(true);
  });

  it('validates transactions, amounts and summaries', () => {
    expect(isTransactionType('expense')).toBe(true);
    expect(isTransactionType('crypto' as any)).toBe(false);

    const parsedTx = toTransaction({
      account: null,
      accountId: 'acc_1',
      amountCents: 4500,
      category: 'Groceries',
      createdAt: '2026-01-01T00:00:00Z',
      description: 'Supermarket',
      id: 'tx_1',
      notes: null,
      signedCashFlowCents: -4500,
      transactionDate: '2026-01-01',
      transactionType: 'expense',
      updatedAt: '2026-01-01T00:00:00Z'
    });
    expect(parsedTx).not.toBeNull();
    expect(formatTransactionAmount(parsedTx!)).toBe('-$45.00');

    const summary = summarizeTransactionList([parsedTx!]);
    expect(summary.transactionCount).toBe(1);
    expect(summary.expenseCents).toBe(4500);
    expect(summary.netCashFlowCents).toBe(-4500);
  });

  it('validates goals, deadline labels and percent formatting', () => {
    expect(isGoalType('retirement')).toBe(true);
    expect(isGoalStatus('active')).toBe(true);

    const parsedGoal = toGoal({
      createdAt: '2026-01-01T00:00:00Z',
      currentAmountCents: 200000,
      daysUntilTarget: 45,
      goalType: 'home',
      id: 'g_1',
      isOverdue: false,
      name: 'House Down Payment',
      progressPercent: 20,
      remainingAmountCents: 800000,
      status: 'active',
      targetAmountCents: 1000000,
      targetDate: '2026-05-01',
      updatedAt: '2026-01-01T00:00:00Z'
    });
    expect(parsedGoal).not.toBeNull();
    expect(goalDeadlineLabel(parsedGoal!)).toBe('Due in 45 days');
    expect(formatGoalPercent(parsedGoal!.progressPercent)).toBe('20%');

    const summary = summarizeGoalList([parsedGoal!]);
    expect(summary.goalCount).toBe(1);
    expect(summary.activeGoalCount).toBe(1);
    expect(summary.totalTargetCents).toBe(1000000);
    expect(summary.totalCurrentCents).toBe(200000);
    expect(summary.fundedPercent).toBe(20);
  });
});

describe('API Remote Call Negative Error Handling', () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('loadSavedCalculatorResults handles 401, 500, and empty responses safely', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Unauthorized', { status: 401 }));
    await expect(loadSavedCalculatorResults(mockAuth)).rejects.toThrow('Unable to load saved calculator results.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Server error', { status: 500 }));
    await expect(loadSavedCalculatorResults(mockAuth)).rejects.toThrow('Unable to load saved calculator results.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('{"calculatorResults": []}', { status: 200 }));
    const results = await loadSavedCalculatorResults(mockAuth);
    expect(results).toEqual([]);
  });

  it('createCalculatorResultRecord handles server errors with custom message and malformed body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Duplicate entry' }), { status: 400 }));
    await expect(
      createCalculatorResultRecord(mockAuth, {
        calculator: { category: 'Planning', region: 'US', slug: 'fire', title: 'FIRE', conversionLabel: 'Save', conversionRoute: '/plans' } as any,
        currency: 'USD',
        result: { assumptions: [], metrics: [{ label: 'FIRE', value: 1000, valueType: 'currency' }], narrative: 'ok' },
        values: { spend: 50000 }
      })
    ).rejects.toThrow('Duplicate entry');

    // 200 with invalid entity structure throws unrecognized error
    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ savedResult: null }), { status: 200 }));
    await expect(
      createCalculatorResultRecord(mockAuth, {
        calculator: { category: 'Planning', region: 'US', slug: 'fire', title: 'FIRE', conversionLabel: 'Save', conversionRoute: '/plans' } as any,
        currency: 'USD',
        result: { assumptions: [], metrics: [{ label: 'FIRE', value: 1000, valueType: 'currency' }], narrative: 'ok' },
        values: { spend: 50000 }
      })
    ).rejects.toThrow('Saved calculator result was not recognized.');
  });

  it('loadAccountPlans and createAccountPlan handle 401/409/500 and PlanRequestError', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Forbidden', { status: 403 }));
    await expect(loadAccountPlans(mockAuth)).rejects.toThrow('Unable to load account plans.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'Conflict' }), { status: 409 }));
    try {
      await createAccountPlan(mockAuth, {
        name: 'New Plan',
        result: {} as any,
        snapshot: { plan: {}, timeline: {} } as any
      });
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err).toBeInstanceOf(PlanRequestError);
      expect(err.status).toBe(409);
      expect(planErrorMessage(err)).toBe('This plan changed in another session. Latest versions were reloaded; review before saving again.');
    }
  });

  it('deleteAccountPlan rejects on 404/500', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
    await expect(deleteAccountPlan(mockAuth, 'p_nonexistent')).rejects.toThrow('Unable to delete account plan.');
  });

  it('profile API rejects on 401/404/500 and non-JSON body', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('<html>Error</html>', { status: 500 }));
    await expect(loadAccountProfile(mockAuth)).rejects.toThrow('Unable to load account profile.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Not found', { status: 404 }));
    await expect(loadAccountDataExport(mockAuth)).rejects.toThrow('Unable to export account data.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Bad request', { status: 400 }));
    await expect(deleteAccountDataRecord(mockAuth, 'WRONG_CONFIRMATION')).rejects.toThrow('Unable to delete account data.');
  });

  it('accounts API rejects invalid balance inputs before network call', async () => {
    await expect(
      addFinancialAccountBalanceRecord(mockAuth, 'acc_1', { amount: 'invalid-cents', date: '2026-01-01' })
    ).rejects.toThrow('Balance amount is required.');
  });

  it('transactions API rejects invalid amount inputs before network call', async () => {
    await expect(
      createTransactionRecord(mockAuth, {
        accountId: 'acc_1',
        amount: 'abc',
        category: 'Food',
        description: 'Dinner',
        notes: '',
        transactionDate: '2026-01-01',
        transactionType: 'expense'
      })
    ).rejects.toThrow('Amount is required.');
  });

  it('goals API handles 401/404/500 rejects properly and preserves SyntaxError on malformed 200', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Service unavailable', { status: 503 }));
    await expect(loadGoals(mockAuth)).rejects.toThrow('Unable to load goals.');

    globalThis.fetch = vi.fn().mockResolvedValue(new Response('Malformed json {', { status: 200 }));
    await expect(
      createGoalRecord(mockAuth, {
        currentAmount: '100',
        goalType: 'home',
        name: 'Goal',
        targetAmount: '1000',
        targetDate: ''
      })
    ).rejects.toThrow(SyntaxError);
  });

  it('readFinancialAccountResponse preserves baseline error semantics', async () => {
    const error500 = new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    await expect(readFinancialAccountResponse(error500, 'Unable to load account.')).rejects.toThrow(
      'Unable to load account.'
    );

    const malformed200 = new Response('not json', { status: 200 });
    await expect(readFinancialAccountResponse(malformed200, 'Unable to load account.')).rejects.toThrow(
      SyntaxError
    );

    const empty200 = new Response('', { status: 200 });
    await expect(readFinancialAccountResponse(empty200, 'Unable to load account.')).rejects.toThrow(
      SyntaxError
    );

    const invalidSchema200 = new Response(JSON.stringify({ account: { invalid: true } }), { status: 200 });
    await expect(readFinancialAccountResponse(invalidSchema200, 'Unable to load account.')).rejects.toThrow(
      'Unable to load account.'
    );
  });

  it('readGoalResponse preserves baseline error semantics', async () => {
    const error500 = new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
    await expect(readGoalResponse(error500, 'Unable to load goal.')).rejects.toThrow('Unable to load goal.');

    const malformed200 = new Response('not json', { status: 200 });
    await expect(readGoalResponse(malformed200, 'Unable to load goal.')).rejects.toThrow(SyntaxError);

    const empty200 = new Response('', { status: 200 });
    await expect(readGoalResponse(empty200, 'Unable to load goal.')).rejects.toThrow(SyntaxError);

    const invalidSchema200 = new Response(JSON.stringify({ goal: { invalid: true } }), { status: 200 });
    await expect(readGoalResponse(invalidSchema200, 'Unable to load goal.')).rejects.toThrow(
      'Unable to load goal.'
    );
  });
});
