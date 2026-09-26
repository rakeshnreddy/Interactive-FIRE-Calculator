import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  formatCents,
  isBalanceStale,
  SignedInProfileBand,
  summarizeAccountList,
  type AccountDraft,
  type AccountSummary,
  type FinancialAccount,
  type GoalSummary
} from './App';
import { AccountsPanel, DashboardPanel } from './workspace/WorkspacePanels';
import { buildTransactionCashflowRollup } from './lib/transactionAnalytics';

function makeAccount(overrides: Partial<FinancialAccount> = {}): FinancialAccount {
  return {
    accountType: 'investment',
    balanceHistory: [],
    category: 'asset',
    createdAt: '2026-06-01T00:00:00.000Z',
    currency: 'USD',
    id: `acc_${Math.random().toString(36).slice(2, 8)}`,
    institutionName: 'Vanguard',
    isActive: true,
    latestBalanceCents: 12345_67,
    latestBalanceDate: '2026-09-01',
    name: 'Brokerage',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

const mockCashflow = buildTransactionCashflowRollup([]);

const mockGoalSummary: GoalSummary = {
  activeGoalCount: 1,
  completedGoalCount: 0,
  fundedPercent: 50,
  goalCount: 1,
  nextGoal: null,
  overdueGoalCount: 0,
  pausedGoalCount: 0,
  totalCurrentCents: 10_000_00,
  totalTargetCents: 20_000_00
};

const emptyDraft: AccountDraft = {
  accountType: 'checking',
  balanceAmount: '',
  balanceDate: '',
  currency: 'USD',
  institutionName: '',
  name: ''
};

describe('B26 Account and Dashboard Presentation', () => {
  describe('1. Exact cents formatting (C08 observed defect repair)', () => {
    it('formats exact cents for account balances and transactions instead of rounding to whole dollars', () => {
      // 1234567 cents = $12,345.67
      expect(formatCents(12345_67, 'USD')).toBe('$12,345.67');
      expect(formatCents(50_25, 'USD')).toBe('$50.25');
      expect(formatCents(0, 'USD')).toBe('$0.00');
      expect(formatCents(100_00, 'USD')).toBe('$100.00');
    });

    it('renders exact cents in account card and balance history HTML', () => {
      const account = makeAccount({
        latestBalanceCents: 12345_67,
        balanceHistory: [
          {
            balanceCents: 12345_67,
            balanceDate: '2026-06-15',
            createdAt: '2026-06-15T12:00:00Z',
            id: 'bal_1'
          }
        ]
      });
      const summary = summarizeAccountList([account]);

      const html = renderToStaticMarkup(
        <AccountsPanel
          accounts={[account]}
          auth={{
            status: 'signed-in',
            isSignedIn: true,
            isConfigured: true,
            provider: 'clerk',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          balanceDrafts={{}}
          draft={emptyDraft}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveAccount={() => {}}
          onBalanceDraftChange={() => {}}
          onCreateAccount={() => {}}
          onDraftChange={() => {}}
          onImportComplete={async () => {}}
          onRecordBalance={() => {}}
          summary={summary}
        />
      );

      // Must show exact $12,345.67 in account card and balance history
      expect(html).toContain('$12,345.67');
      expect(html).toMatch(/class="account-balance"[^>]*>[\s\S]*?\$12,345\.67/);
      expect(html).toMatch(/class="balance-history"[^>]*>[\s\S]*?\$12,345\.67/);
      expect(html).not.toMatch(/class="account-balance"[^>]*>[\s\S]*?\$12,346(?!\.)/);
    });
  });

  describe('2. Stale balance detection rule', () => {
    it('identifies balances older than 30 days as stale and recent balances as fresh', () => {
      const referenceDate = new Date('2026-09-16T12:00:00Z');

      // 15 days ago -> fresh
      expect(isBalanceStale('2026-09-01', referenceDate)).toBe(false);
      // Exactly 30 days ago -> fresh
      expect(isBalanceStale('2026-08-17', referenceDate)).toBe(false);
      // 31 days ago -> stale
      expect(isBalanceStale('2026-08-15', referenceDate)).toBe(true);
      // Over a year ago -> stale
      expect(isBalanceStale('2025-06-15', referenceDate)).toBe(true);
      // Null / missing -> stale
      expect(isBalanceStale(null, referenceDate)).toBe(true);
      expect(isBalanceStale('', referenceDate)).toBe(true);
    });

    it('renders as-of context and stale badge for accounts needing update', () => {
      const staleAccount = makeAccount({
        name: 'Old Checking',
        latestBalanceDate: '2025-06-15'
      });
      const summary = summarizeAccountList([staleAccount]);

      const html = renderToStaticMarkup(
        <AccountsPanel
          accounts={[staleAccount]}
          auth={{
            status: 'signed-in',
            isSignedIn: true,
            isConfigured: true,
            provider: 'clerk',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          balanceDrafts={{}}
          draft={emptyDraft}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveAccount={() => {}}
          onBalanceDraftChange={() => {}}
          onCreateAccount={() => {}}
          onDraftChange={() => {}}
          onImportComplete={async () => {}}
          onRecordBalance={() => {}}
          summary={summary}
        />
      );

      // Should indicate update is due or stale
      expect(html).toMatch(/Update due|Needs update/i);
      expect(html).toContain('2025-06-15');
    });
  });

  describe('3. Redundant profile email display repair', () => {
    it('does not render duplicate email lines when displayName equals email', () => {
      const html = renderToStaticMarkup(
        <SignedInProfileBand
          auth={{
            status: 'signed-in',
            isSignedIn: true,
            isConfigured: true,
            provider: 'clerk',
            getToken: async () => 'tok',
            user: {
              id: 'u1',
              displayName: 'finpath_test_a@example.com',
              email: 'finpath_test_a@example.com'
            }
          }}
        />
      );

      // Email text should appear exactly once in the rendered element
      const occurrences = (html.match(/finpath_test_a@example\.com/g) || []).length;
      expect(occurrences).toBe(1);
    });

    it('renders both displayName and email when displayName is distinct', () => {
      const html = renderToStaticMarkup(
        <SignedInProfileBand
          auth={{
            status: 'signed-in',
            isSignedIn: true,
            isConfigured: true,
            provider: 'clerk',
            getToken: async () => 'tok',
            user: {
              id: 'u1',
              displayName: 'Alice Explorer',
              email: 'alice@example.com'
            }
          }}
        />
      );

      expect(html).toContain('Alice Explorer');
      expect(html).toContain('alice@example.com');
    });
  });
});
