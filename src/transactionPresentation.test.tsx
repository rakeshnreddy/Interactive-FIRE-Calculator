import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import {
  formatTransactionAmount,
  type FinancialAccount,
  type Transaction,
  type TransactionDraft,
  type TransactionSummary
} from './App';
import { TransactionsPanel } from './workspace/WorkspacePanels';
import { type TransactionFilters } from './lib/transactionAnalytics';
import { TRANSACTION_CSV_HEADERS } from './lib/transactionCsv';
import { TransactionImportPanel } from './TransactionImportPanel';

function makeAccount(overrides: Partial<FinancialAccount> = {}): FinancialAccount {
  return {
    accountType: 'checking',
    balanceHistory: [],
    category: 'asset',
    createdAt: '2026-06-01T00:00:00.000Z',
    currency: 'USD',
    id: 'acc_checking_1',
    institutionName: 'Chase',
    isActive: true,
    latestBalanceCents: 5000_00,
    latestBalanceDate: '2026-09-01',
    name: 'Primary Checking',
    updatedAt: '2026-09-01T00:00:00.000Z',
    ...overrides
  };
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  const account = overrides.account !== undefined ? overrides.account : makeAccount();
  const transactionType = overrides.transactionType ?? 'expense';
  const amountCents = overrides.amountCents ?? 12345_67;
  const signedCashFlowCents =
    transactionType === 'income' ? amountCents : transactionType === 'expense' ? -amountCents : 0;

  return {
    account: account ? {
      accountType: account.accountType,
      currency: account.currency,
      id: account.id,
      name: account.name
    } : null,
    accountId: account ? account.id : null,
    amountCents,
    category: 'Groceries',
    createdAt: '2026-09-10T12:00:00.000Z',
    description: 'Whole Foods Market',
    id: 'tx_1',
    notes: 'Weekly groceries',
    signedCashFlowCents,
    transactionDate: '2026-09-10',
    transactionType,
    updatedAt: '2026-09-10T12:00:00.000Z',
    ...overrides
  };
}

const defaultSummary: TransactionSummary = {
  adjustmentCents: 0,
  expenseCents: 12345_67,
  incomeCents: 0,
  latestTransactionDate: '2026-09-10',
  netCashFlowCents: -12345_67,
  transactionCount: 1,
  transferCents: 0
};

const emptyFilters: TransactionFilters = {
  accountId: 'all',
  category: 'all',
  dateFrom: '',
  dateTo: '',
  query: '',
  transactionType: 'all'
};

const emptyDraft: TransactionDraft = {
  accountId: '',
  amount: '',
  category: '',
  description: '',
  notes: '',
  transactionDate: '',
  transactionType: 'expense'
};

describe('B27 Transaction Presentation & Import Review', () => {
  describe('1. Signed transaction amount formatting with explicit currency', () => {
    it('formats signed expense with minus sign and exact cents', () => {
      const tx = makeTransaction({
        amountCents: 12345_67,
        transactionType: 'expense'
      });
      expect(formatTransactionAmount(tx)).toBe('-$12,345.67');
    });

    it('formats signed income with plus sign and exact cents', () => {
      const tx = makeTransaction({
        amountCents: 5000_25,
        transactionType: 'income'
      });
      expect(formatTransactionAmount(tx)).toBe('+$5,000.25');
    });

    it('formats transfer/adjustment without sign prefix', () => {
      const txTransfer = makeTransaction({
        amountCents: 1000_00,
        transactionType: 'transfer'
      });
      expect(formatTransactionAmount(txTransfer)).toBe('$1,000.00');

      const txAdjustment = makeTransaction({
        amountCents: 45_50,
        transactionType: 'adjustment'
      });
      expect(formatTransactionAmount(txAdjustment)).toBe('$45.50');
    });

    it('respects linked account currency for formatting', () => {
      const inrAccount = makeAccount({ currency: 'INR', name: 'HDFC Savings' });
      const txInr = makeTransaction({
        account: inrAccount,
        accountId: inrAccount.id,
        amountCents: 12345_67,
        transactionType: 'income'
      });
      expect(formatTransactionAmount(txInr)).toMatch(/₹|INR/);
      expect(formatTransactionAmount(txInr)).toContain('12,345.67');
    });
  });

  describe('2. Transaction ledger layout and alignment', () => {
    it('renders transaction details with date, description, category, and signed amount', () => {
      const account = makeAccount();
      const tx = makeTransaction({ account });
      const html = renderToStaticMarkup(
        <TransactionsPanel
          accounts={[account]}
          allSummary={defaultSummary}
          auth={{
            isConfigured: true,
            isSignedIn: true,
            provider: 'clerk',
            status: 'signed-in',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          categoryOptions={['Groceries', 'Utilities']}
          draft={emptyDraft}
          filters={emptyFilters}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveTransaction={() => {}}
          onClearFilters={() => {}}
          onCreateTransaction={() => {}}
          onDraftChange={() => {}}
          onFilterChange={() => {}}
          onImportComplete={async () => {}}
          onUpdateDraftChange={() => {}}
          onUpdateTransaction={() => {}}
          summary={defaultSummary}
          transactions={[tx]}
          updateDrafts={{}}
        />
      );

      expect(html).toContain('Whole Foods Market');
      expect(html).toContain('2026-09-10');
      expect(html).toContain('Groceries');
      expect(html).toContain('-$12,345.67');
      expect(html).toContain('Primary Checking');
    });

    it('renders long merchant descriptions without crashing or truncation', () => {
      const longName = 'AMZN MKTP US*AB12CD34EF56 SEATTLE WA ULTRA EXTENDED STORE DESCRIPTION FOR VERIFICATION';
      const account = makeAccount();
      const tx = makeTransaction({ account, description: longName });
      const html = renderToStaticMarkup(
        <TransactionsPanel
          accounts={[account]}
          allSummary={defaultSummary}
          auth={{
            isConfigured: true,
            isSignedIn: true,
            provider: 'clerk',
            status: 'signed-in',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          categoryOptions={['Groceries']}
          draft={emptyDraft}
          filters={emptyFilters}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveTransaction={() => {}}
          onClearFilters={() => {}}
          onCreateTransaction={() => {}}
          onDraftChange={() => {}}
          onFilterChange={() => {}}
          onImportComplete={async () => {}}
          onUpdateDraftChange={() => {}}
          onUpdateTransaction={() => {}}
          summary={defaultSummary}
          transactions={[tx]}
          updateDrafts={{}}
        />
      );

      expect(html).toContain(longName);
    });

    it('renders empty ledger state when no transactions exist', () => {
      const emptySummary: TransactionSummary = {
        adjustmentCents: 0,
        expenseCents: 0,
        incomeCents: 0,
        latestTransactionDate: null,
        netCashFlowCents: 0,
        transactionCount: 0,
        transferCents: 0
      };

      const html = renderToStaticMarkup(
        <TransactionsPanel
          accounts={[]}
          allSummary={emptySummary}
          auth={{
            isConfigured: true,
            isSignedIn: true,
            provider: 'clerk',
            status: 'signed-in',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          categoryOptions={[]}
          draft={emptyDraft}
          filters={emptyFilters}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveTransaction={() => {}}
          onClearFilters={() => {}}
          onCreateTransaction={() => {}}
          onDraftChange={() => {}}
          onFilterChange={() => {}}
          onImportComplete={async () => {}}
          onUpdateDraftChange={() => {}}
          onUpdateTransaction={() => {}}
          summary={emptySummary}
          transactions={[]}
          updateDrafts={{}}
        />
      );

      expect(html).toContain('No transactions yet');
    });

    it('renders filter empty state when query or type filter matches zero rows', () => {
      const html = renderToStaticMarkup(
        <TransactionsPanel
          accounts={[]}
          allSummary={defaultSummary}
          auth={{
            isConfigured: true,
            isSignedIn: true,
            provider: 'clerk',
            status: 'signed-in',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          categoryOptions={[]}
          draft={emptyDraft}
          filters={{ ...emptyFilters, query: 'Nonexistent Store' }}
          isLoading={false}
          isSaving={false}
          message=""
          onArchiveTransaction={() => {}}
          onClearFilters={() => {}}
          onCreateTransaction={() => {}}
          onDraftChange={() => {}}
          onFilterChange={() => {}}
          onImportComplete={async () => {}}
          onUpdateDraftChange={() => {}}
          onUpdateTransaction={() => {}}
          summary={{ ...defaultSummary, transactionCount: 0 }}
          transactions={[]}
          updateDrafts={{}}
        />
      );

      expect(html).toContain('No matching transactions');
    });
  });

  describe('3. CSV Import Contract & Review Flow', () => {
    it('defines required transaction CSV headers conforming to specification', () => {
      expect(TRANSACTION_CSV_HEADERS).toEqual([
        'transaction_date',
        'description',
        'amount',
        'type',
        'category',
        'account',
        'notes'
      ]);
    });

    it('renders TransactionImportPanel with Select CSV and Template actions', () => {
      const html = renderToStaticMarkup(
        <TransactionImportPanel
          accounts={[{ id: 'acc_1', name: 'Checking' }]}
          auth={{
            isConfigured: true,
            isSignedIn: true,
            provider: 'clerk',
            status: 'signed-in',
            getToken: async () => 'tok',
            user: { id: 'u1', displayName: 'Test User', email: 'test@example.com' }
          }}
          onImportComplete={async () => {}}
        />
      );

      expect(html).toContain('Select CSV');
      expect(html).toContain('Template');
      expect(html).toContain('Maximum 500 rows · 256 KB');
      expect(html).toContain('transaction_date');
      expect(html).toContain('description');
      expect(html).toContain('amount');
      // Selection does not auto-commit: no confirm/import button is present initially
      expect(html).not.toContain('Import transactions');
    });
  });
});
