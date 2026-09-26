import { describe, expect, it } from 'vitest';
import type { FinancialInsight } from '../lib/insights';
import { buildReportCsv, buildReportScope } from './reportScope';

const account = (id: string, currency: string, latestBalanceDate: string | null) => ({
  id, name: id, currency, category: 'asset' as const, latestBalanceCents: 100_00, latestBalanceDate, balanceHistory: [], isActive: true
});
const goal = { id: 'g', name: 'Retire', goalType: 'retirement', status: 'active' as const, currentAmountCents: 0, targetAmountCents: 1, remainingAmountCents: 1, progressPercent: 0, daysUntilTarget: 100, isOverdue: false, targetDate: '2040-01-01' };
const tx = (transactionDate: string) => ({ id: transactionDate, transactionDate, amountCents: -100, category: 'Food', description: 'x', notes: null, accountId: null, account: null, transactionType: 'expense' }) as never;

describe('buildReportScope', () => {
  it('reports empty data as gaps, not zeros', () => {
    const scope = buildReportScope({ accounts: [], goals: [], transactions: [], planLabel: null, today: '2026-09-26' });
    expect(scope.transactionPeriod).toBeNull();
    expect(scope.gaps.join(' ')).toMatch(/cash-flow insights are unavailable, not zero/);
    expect(scope.gaps.join(' ')).toMatch(/net worth and balance trends are unavailable, not zero/);
    expect(scope.gaps.join(' ')).toMatch(/No FIRE plan is included/);
  });

  it('states period, stale balances and mixed currencies', () => {
    const scope = buildReportScope({
      accounts: [account('a', 'USD', '2026-09-20'), account('b', 'inr', '2026-06-01'), account('c', 'USD', null)],
      goals: [goal],
      transactions: [tx('2026-09-10'), tx('2026-07-01'), tx('2026-08-15')],
      planLabel: 'Base plan · Version 2',
      today: '2026-09-26'
    });
    expect(scope.transactionPeriod).toEqual({ from: '2026-07-01', to: '2026-09-10' });
    expect(scope.staleAccountCount).toBe(2);
    expect(scope.currencies).toEqual(['INR', 'USD']);
    expect(scope.gaps.join(' ')).toMatch(/2 of 3 account balances are older than 45 days/);
    expect(scope.gaps.join(' ')).toMatch(/never added across currencies/);
    expect(scope.gaps.join(' ')).not.toMatch(/Less than a month/);
  });

  it('flags a short transaction window', () => {
    const scope = buildReportScope({ accounts: [account('a', 'USD', '2026-09-20')], goals: [goal], transactions: [tx('2026-09-10'), tx('2026-09-20')], planLabel: 'p', today: '2026-09-26' });
    expect(scope.gaps).toEqual(['Less than a month of transactions: cash-flow patterns may not be representative.']);
  });
});

describe('buildReportCsv', () => {
  it('exports the same strings the report shows, one row per evidence item', () => {
    const insight: FinancialInsight = {
      id: 'i1', area: 'goals', category: 'recommendation', priority: 'high', title: 'Fund "Retire", sooner',
      rationale: 'r', action: 'Raise contributions', assumptions: [], uncertainty: 'u', route: '/goals',
      evidence: [{ label: 'Remaining', value: '$1,000' }, { label: 'Target date', value: '2040-01-01', detail: 'in 14 years' }]
    };
    const scope = buildReportScope({ accounts: [], goals: [], transactions: [], planLabel: null, today: '2026-09-26' });
    const lines = buildReportCsv([insight], scope).split('\n');
    expect(lines[0]).toBe('FinPath report,As of 2026-09-26');
    expect(lines).toContain('High,Goals,"Fund ""Retire"", sooner",Remaining,"$1,000",,Raise contributions');
    expect(lines).toContain('High,Goals,"Fund ""Retire"", sooner",Target date,2040-01-01,in 14 years,Raise contributions');
    expect(lines.filter((l) => l.startsWith('Data gap'))).toHaveLength(scope.gaps.length);
  });
});
