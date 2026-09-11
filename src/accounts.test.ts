import { describe, expect, it, vi } from 'vitest';

import * as accountsModule from '../functions/_lib/accounts';
import {
  summarizeAccounts,
  type FinancialAccount
} from '../functions/_lib/accounts';
import * as calcModule from '../functions/_lib/calculatorResults';
import * as goalsModule from '../functions/_lib/goals';
import * as persistenceModule from '../functions/_lib/persistence';
import * as sessionModule from '../functions/_lib/session';
import { onRequestGet as onAccountsGet } from '../functions/api/accounts/index';
import { onRequestGet as onDashboardGet } from '../functions/api/dashboard';

function createAccount(overrides: Partial<FinancialAccount> = {}): FinancialAccount {
  return {
    accountType: 'investment',
    balanceHistory: [],
    category: 'asset',
    createdAt: '2026-06-01T00:00:00.000Z',
    currency: 'USD',
    id: 'account_1',
    institutionName: 'Bank',
    isActive: true,
    latestBalanceCents: 10_000,
    latestBalanceDate: '2026-06-01',
    name: 'Account 1',
    updatedAt: '2026-06-01T00:00:00.000Z',
    ...overrides
  };
}

describe('summarizeAccounts (B03 currency isolation)', () => {
  it('prevents false combined totals for mixed currencies (USD 100 + INR 100 never displays USD 200)', () => {
    const usdAccount = createAccount({
      currency: 'USD',
      id: 'usd_1',
      latestBalanceCents: 10_000,
      name: 'USD Checking'
    });
    const inrAccount = createAccount({
      currency: 'INR',
      id: 'inr_1',
      latestBalanceCents: 10_000,
      name: 'INR Savings'
    });

    const summary = summarizeAccounts([usdAccount, inrAccount]);

    expect(summary.hasMixedCurrencies).toBe(true);
    expect(summary.assetsCents).toBeNull();
    expect(summary.liabilitiesCents).toBeNull();
    expect(summary.netWorthCents).toBeNull();
    expect(summary.primaryCurrency).toBeNull();
    expect(summary.accountCount).toBe(2);
    expect(summary.currencies).toEqual(['INR', 'USD']);

    expect(summary.byCurrency.USD).toEqual({
      accountCount: 1,
      assetsCents: 10_000,
      currency: 'USD',
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 10_000
    });

    expect(summary.byCurrency.INR).toEqual({
      accountCount: 1,
      assetsCents: 10_000,
      currency: 'INR',
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 10_000
    });
  });

  it('preserves exact numeric totals for single-currency accounts', () => {
    const account1 = createAccount({
      currency: 'USD',
      id: 'usd_1',
      latestBalanceCents: 25_000
    });
    const account2 = createAccount({
      currency: 'USD',
      id: 'usd_2',
      latestBalanceCents: 15_000
    });
    const liability = createAccount({
      category: 'liability',
      currency: 'USD',
      id: 'usd_loan',
      latestBalanceCents: 10_000
    });

    const summary = summarizeAccounts([account1, account2, liability]);

    expect(summary.hasMixedCurrencies).toBe(false);
    expect(summary.primaryCurrency).toBe('USD');
    expect(summary.accountCount).toBe(3);
    expect(summary.liabilityAccountCount).toBe(1);
    expect(summary.assetsCents).toBe(40_000);
    expect(summary.liabilitiesCents).toBe(10_000);
    expect(summary.netWorthCents).toBe(30_000);
    expect(summary.currencies).toEqual(['USD']);
    expect(summary.byCurrency.USD?.netWorthCents).toBe(30_000);
  });

  it('reconciles liabilities per currency without cross-currency pollution', () => {
    const usdAsset = createAccount({
      category: 'asset',
      currency: 'USD',
      id: 'usd_asset',
      latestBalanceCents: 50_000
    });
    const usdDebt = createAccount({
      category: 'liability',
      currency: 'USD',
      id: 'usd_debt',
      latestBalanceCents: 20_000
    });
    const inrAsset = createAccount({
      category: 'asset',
      currency: 'INR',
      id: 'inr_asset',
      latestBalanceCents: 100_000
    });
    const inrDebt = createAccount({
      category: 'liability',
      currency: 'INR',
      id: 'inr_debt',
      latestBalanceCents: 40_000
    });

    const summary = summarizeAccounts([usdAsset, usdDebt, inrAsset, inrDebt]);

    expect(summary.hasMixedCurrencies).toBe(true);
    expect(summary.assetsCents).toBeNull();
    expect(summary.liabilitiesCents).toBeNull();
    expect(summary.netWorthCents).toBeNull();

    expect(summary.byCurrency.USD).toEqual({
      accountCount: 2,
      assetsCents: 50_000,
      currency: 'USD',
      liabilityAccountCount: 1,
      liabilitiesCents: 20_000,
      netWorthCents: 30_000
    });

    expect(summary.byCurrency.INR).toEqual({
      accountCount: 2,
      assetsCents: 100_000,
      currency: 'INR',
      liabilityAccountCount: 1,
      liabilitiesCents: 40_000,
      netWorthCents: 60_000
    });
  });

  it('excludes archived and inactive accounts from summary calculations', () => {
    const active = createAccount({
      currency: 'USD',
      id: 'active',
      isActive: true,
      latestBalanceCents: 10_000
    });
    const inactive = createAccount({
      currency: 'USD',
      id: 'inactive',
      isActive: false,
      latestBalanceCents: 20_000
    });
    const archived = createAccount({
      archivedAt: '2026-06-10T00:00:00.000Z',
      currency: 'INR',
      id: 'archived',
      isActive: true,
      latestBalanceCents: 99_000
    });

    const summary = summarizeAccounts([active, inactive, archived]);

    expect(summary.hasMixedCurrencies).toBe(false);
    expect(summary.primaryCurrency).toBe('USD');
    expect(summary.accountCount).toBe(1);
    expect(summary.assetsCents).toBe(10_000);
    expect(summary.currencies).toEqual(['USD']);
    expect(summary.byCurrency.INR).toBeUndefined();
  });

  it('handles negative balances correctly per currency', () => {
    const overdrawn = createAccount({
      category: 'asset',
      currency: 'USD',
      id: 'overdrawn',
      latestBalanceCents: -5_000
    });
    const regular = createAccount({
      category: 'asset',
      currency: 'USD',
      id: 'regular',
      latestBalanceCents: 20_000
    });

    const summary = summarizeAccounts([overdrawn, regular]);

    expect(summary.assetsCents).toBe(15_000);
    expect(summary.netWorthCents).toBe(15_000);
    expect(summary.byCurrency.USD?.assetsCents).toBe(15_000);
  });

  it('returns clean zero totals for empty account lists', () => {
    const summary = summarizeAccounts([]);

    expect(summary).toEqual({
      accountCount: 0,
      assetsCents: 0,
      byCurrency: {},
      currencies: [],
      hasMixedCurrencies: false,
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 0,
      primaryCurrency: null
    });
  });
});

describe('accounts and dashboard API endpoints (onRequestGet)', () => {
  it('/api/accounts returns per-currency summary with null combined totals for mixed currencies', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_123' } as any,
      ok: true
    });
    vi.spyOn(persistenceModule, 'requireDatabase').mockReturnValue({
      database: {} as D1Database,
      ok: true
    });

    const usdAccount = createAccount({ currency: 'USD', id: 'usd_1', latestBalanceCents: 10_000 });
    const inrAccount = createAccount({ currency: 'INR', id: 'inr_1', latestBalanceCents: 20_000 });
    vi.spyOn(accountsModule, 'listAccounts').mockResolvedValue([usdAccount, inrAccount]);

    const request = new Request('https://finpath.app/api/accounts', { method: 'GET' });
    const response = await onAccountsGet({
      data: {},
      env: { DB: {} as D1Database },
      functionPath: '/api/accounts',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.summary.hasMixedCurrencies).toBe(true);
    expect(body.summary.assetsCents).toBeNull();
    expect(body.summary.netWorthCents).toBeNull();
    expect(body.summary.byCurrency.USD.assetsCents).toBe(10_000);
    expect(body.summary.byCurrency.INR.assetsCents).toBe(20_000);
  });

  it('/api/dashboard returns per-currency summary with isolated totals', async () => {
    vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
      auth: { userId: 'user_123' } as any,
      ok: true
    });
    vi.spyOn(persistenceModule, 'requireDatabase').mockReturnValue({
      database: {} as D1Database,
      ok: true
    });

    const usdAccount = createAccount({ currency: 'USD', id: 'usd_1', latestBalanceCents: 10_000 });
    const inrAccount = createAccount({ currency: 'INR', id: 'inr_1', latestBalanceCents: 20_000 });
    vi.spyOn(accountsModule, 'listAccounts').mockResolvedValue([usdAccount, inrAccount]);
    vi.spyOn(goalsModule, 'listGoals').mockResolvedValue([]);
    vi.spyOn(calcModule, 'listSavedCalculatorResults').mockResolvedValue([]);

    const request = new Request('https://finpath.app/api/dashboard', { method: 'GET' });
    const response = await onDashboardGet({
      data: {},
      env: { DB: {} as D1Database },
      functionPath: '/api/dashboard',
      next: () => Promise.resolve(new Response()),
      params: {},
      request,
      waitUntil: () => {}
    } as any);

    expect(response.status).toBe(200);
    const body = (await response.json()) as any;
    expect(body.dashboard.summary.hasMixedCurrencies).toBe(true);
    expect(body.dashboard.summary.assetsCents).toBeNull();
    expect(body.dashboard.summary.byCurrency.USD.assetsCents).toBe(10_000);
    expect(body.dashboard.summary.byCurrency.INR.assetsCents).toBe(20_000);
  });
});
