import { formatCents, moneyInputToCents, todayInputDate } from '../format';
import { normalizeTransactionCategoryInput, type TransactionType } from '../transactionAnalytics';
import { isFinancialAccountType, type FinancialAccountType } from './accounts';
import { authenticatedJsonRequest, isRecord, type SignedInAuth } from './client';
import { optionalTextFromDraft } from './profile';

export type { TransactionType };

export type Transaction = {
  account: {
    accountType: FinancialAccountType;
    currency: string;
    id: string;
    name: string;
  } | null;
  accountId: string | null;
  amountCents: number;
  category: string | null;
  createdAt: string;
  description: string;
  id: string;
  notes: string | null;
  signedCashFlowCents: number;
  transactionDate: string;
  transactionType: TransactionType;
  updatedAt: string;
};

export type TransactionSummary = {
  adjustmentCents: number;
  expenseCents: number;
  incomeCents: number;
  latestTransactionDate: string | null;
  netCashFlowCents: number;
  transactionCount: number;
  transferCents: number;
};

export type TransactionDraft = {
  accountId: string;
  amount: string;
  category: string;
  description: string;
  notes: string;
  transactionDate: string;
  transactionType: TransactionType;
};

export const transactionTypeOptions: Array<{ label: string; value: TransactionType }> = [
  { label: 'Income', value: 'income' },
  { label: 'Expense', value: 'expense' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Adjustment', value: 'adjustment' }
];

export function isTransactionType(value: unknown): value is TransactionType {
  return typeof value === 'string' && transactionTypeOptions.some((option) => option.value === value);
}

export function transactionTypeLabel(value: TransactionType): string {
  return transactionTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function transactionAmountClass(transaction: Transaction): string {
  if (transaction.transactionType === 'income') {
    return 'amount-positive';
  }

  if (transaction.transactionType === 'expense') {
    return 'amount-negative';
  }

  return 'amount-neutral';
}

export function formatTransactionAmount(transaction: Transaction): string {
  const currency = transaction.account?.currency ?? 'USD';
  if (transaction.transactionType === 'income') {
    return `+${formatCents(transaction.amountCents, currency)}`;
  }

  if (transaction.transactionType === 'expense') {
    return `-${formatCents(transaction.amountCents, currency)}`;
  }

  return formatCents(transaction.amountCents, currency);
}

export function emptyTransactionSummary(): TransactionSummary {
  return {
    adjustmentCents: 0,
    expenseCents: 0,
    incomeCents: 0,
    latestTransactionDate: null,
    netCashFlowCents: 0,
    transactionCount: 0,
    transferCents: 0
  };
}

export function emptyTransactionDraft(): TransactionDraft {
  return {
    accountId: '',
    amount: '',
    category: '',
    description: '',
    notes: '',
    transactionDate: todayInputDate(),
    transactionType: 'expense'
  };
}

export function transactionToDraft(transaction: Transaction): TransactionDraft {
  return {
    accountId: transaction.accountId ?? '',
    amount: String(transaction.amountCents / 100),
    category: transaction.category ? normalizeTransactionCategoryInput(transaction.category) : '',
    description: transaction.description,
    notes: transaction.notes ?? '',
    transactionDate: transaction.transactionDate,
    transactionType: transaction.transactionType
  };
}

export function buildTransactionDraftMap(transactions: Transaction[]): Record<string, TransactionDraft> {
  return transactions.reduce<Record<string, TransactionDraft>>((drafts, transaction) => {
    drafts[transaction.id] = transactionToDraft(transaction);
    return drafts;
  }, {});
}

export function toTransactionAccount(value: unknown): Transaction['account'] {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    typeof value.currency !== 'string' ||
    !isFinancialAccountType(value.accountType)
  ) {
    return null;
  }

  return {
    accountType: value.accountType,
    currency: value.currency,
    id: value.id,
    name: value.name
  };
}

export function toTransaction(value: unknown): Transaction | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    (typeof value.accountId !== 'string' && value.accountId !== null) ||
    typeof value.amountCents !== 'number' ||
    (typeof value.category !== 'string' && value.category !== null) ||
    typeof value.createdAt !== 'string' ||
    typeof value.description !== 'string' ||
    (typeof value.notes !== 'string' && value.notes !== null) ||
    typeof value.signedCashFlowCents !== 'number' ||
    typeof value.transactionDate !== 'string' ||
    !isTransactionType(value.transactionType) ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  const account = value.account === null ? null : toTransactionAccount(value.account);

  if (value.account !== null && !account) {
    return null;
  }

  return {
    account,
    accountId: value.accountId,
    amountCents: value.amountCents,
    category: value.category,
    createdAt: value.createdAt,
    description: value.description,
    id: value.id,
    notes: value.notes,
    signedCashFlowCents: value.signedCashFlowCents,
    transactionDate: value.transactionDate,
    transactionType: value.transactionType,
    updatedAt: value.updatedAt
  };
}

export function toTransactionSummary(value: unknown): TransactionSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.adjustmentCents !== 'number' ||
    typeof value.expenseCents !== 'number' ||
    typeof value.incomeCents !== 'number' ||
    (typeof value.latestTransactionDate !== 'string' && value.latestTransactionDate !== null) ||
    typeof value.netCashFlowCents !== 'number' ||
    typeof value.transactionCount !== 'number' ||
    typeof value.transferCents !== 'number'
  ) {
    return null;
  }

  return {
    adjustmentCents: value.adjustmentCents,
    expenseCents: value.expenseCents,
    incomeCents: value.incomeCents,
    latestTransactionDate: value.latestTransactionDate,
    netCashFlowCents: value.netCashFlowCents,
    transactionCount: value.transactionCount,
    transferCents: value.transferCents
  };
}

export function summarizeTransactionList(transactions: Transaction[]): TransactionSummary {
  return transactions.reduce<TransactionSummary>(
    (summary, transaction) => {
      const latestTransactionDate =
        summary.latestTransactionDate === null || transaction.transactionDate > summary.latestTransactionDate
          ? transaction.transactionDate
          : summary.latestTransactionDate;

      if (transaction.transactionType === 'income') {
        return {
          ...summary,
          incomeCents: summary.incomeCents + transaction.amountCents,
          latestTransactionDate,
          netCashFlowCents: summary.netCashFlowCents + transaction.amountCents,
          transactionCount: summary.transactionCount + 1
        };
      }

      if (transaction.transactionType === 'expense') {
        return {
          ...summary,
          expenseCents: summary.expenseCents + transaction.amountCents,
          latestTransactionDate,
          netCashFlowCents: summary.netCashFlowCents - transaction.amountCents,
          transactionCount: summary.transactionCount + 1
        };
      }

      if (transaction.transactionType === 'transfer') {
        return {
          ...summary,
          latestTransactionDate,
          transactionCount: summary.transactionCount + 1,
          transferCents: summary.transferCents + transaction.amountCents
        };
      }

      return {
        ...summary,
        adjustmentCents: summary.adjustmentCents + transaction.amountCents,
        latestTransactionDate,
        transactionCount: summary.transactionCount + 1
      };
    },
    emptyTransactionSummary()
  );
}

export async function readTransactionResponse(response: Response, errorMessage: string): Promise<Transaction> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : errorMessage);
  }

  const transaction = isRecord(body) ? toTransaction(body.transaction) : null;

  if (!transaction) {
    throw new Error(errorMessage);
  }

  return transaction;
}

export async function loadTransactions(auth: SignedInAuth): Promise<{
  summary: TransactionSummary;
  transactions: Transaction[];
}> {
  const response = await authenticatedJsonRequest(auth, '/api/transactions');

  if (!response.ok) {
    throw new Error('Unable to load transactions.');
  }

  const body = await response.json();
  const transactions = isRecord(body) && Array.isArray(body.transactions)
    ? body.transactions.map(toTransaction).filter((transaction): transaction is Transaction => Boolean(transaction))
    : [];
  const summary = isRecord(body) ? toTransactionSummary(body.summary) : null;

  return {
    summary: summary ?? summarizeTransactionList(transactions),
    transactions
  };
}

export async function createTransactionRecord(
  auth: SignedInAuth,
  draft: TransactionDraft
): Promise<Transaction> {
  const amountCents = moneyInputToCents(draft.amount);

  if (amountCents === null) {
    throw new Error('Amount is required.');
  }

  const response = await authenticatedJsonRequest(auth, '/api/transactions', {
    body: JSON.stringify({
      accountId: optionalTextFromDraft(draft.accountId),
      amountCents,
      category: optionalTextFromDraft(normalizeTransactionCategoryInput(draft.category)),
      description: draft.description.trim(),
      notes: optionalTextFromDraft(draft.notes),
      transactionDate: draft.transactionDate,
      transactionType: draft.transactionType
    }),
    method: 'POST'
  });

  return readTransactionResponse(response, 'Unable to create transaction.');
}

export async function updateTransactionRecord(
  auth: SignedInAuth,
  id: string,
  draft: TransactionDraft
): Promise<Transaction> {
  const amountCents = moneyInputToCents(draft.amount);

  if (amountCents === null) {
    throw new Error('Amount is required.');
  }

  const response = await authenticatedJsonRequest(auth, `/api/transactions/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      accountId: optionalTextFromDraft(draft.accountId),
      amountCents,
      category: optionalTextFromDraft(normalizeTransactionCategoryInput(draft.category)),
      description: draft.description.trim(),
      notes: optionalTextFromDraft(draft.notes),
      transactionDate: draft.transactionDate,
      transactionType: draft.transactionType
    }),
    method: 'PUT'
  });

  return readTransactionResponse(response, 'Unable to update transaction.');
}

export async function archiveTransactionRecord(
  auth: SignedInAuth,
  id: string
): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/transactions/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to remove transaction.');
  }
}
