import { formatMoney } from '../fire';
import { moneyInputToCents, todayInputDate } from '../format';
import { authenticatedJsonRequest, isRecord, readApiJson, type SignedInAuth } from './client';
import { optionalTextFromDraft } from './profile';

export type FinancialAccountType =
  | 'cash'
  | 'checking'
  | 'savings'
  | 'investment'
  | 'retirement'
  | 'credit'
  | 'loan'
  | 'mortgage'
  | 'real_estate'
  | 'other_asset'
  | 'other_liability';

export type AccountCategory = 'asset' | 'liability';

export type AccountBalance = {
  balanceCents: number;
  balanceDate: string;
  createdAt: string;
  id: string;
};

export type FinancialAccount = {
  accountType: FinancialAccountType;
  archivedAt?: string | null;
  balanceHistory: AccountBalance[];
  category: AccountCategory;
  createdAt: string;
  currency: string;
  id: string;
  institutionName: string | null;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
  updatedAt: string;
};

export type CurrencyAccountSummary = {
  accountCount: number;
  assetsCents: number;
  currency: string;
  liabilityAccountCount: number;
  liabilitiesCents: number;
  netWorthCents: number;
};

export type AccountSummary = {
  accountCount: number;
  assetsCents: number | null;
  byCurrency: Record<string, CurrencyAccountSummary>;
  currencies: string[];
  hasMixedCurrencies: boolean;
  liabilityAccountCount: number;
  liabilitiesCents: number | null;
  netWorthCents: number | null;
  primaryCurrency: string | null;
};

export type AccountDraft = {
  accountType: FinancialAccountType;
  balanceAmount: string;
  balanceDate: string;
  currency: string;
  institutionName: string;
  name: string;
};

export type BalanceDraft = {
  amount: string;
  date: string;
};

export const accountTypeOptions: Array<{ category: AccountCategory; label: string; value: FinancialAccountType }> = [
  { category: 'asset', label: 'Cash', value: 'cash' },
  { category: 'asset', label: 'Checking', value: 'checking' },
  { category: 'asset', label: 'Savings', value: 'savings' },
  { category: 'asset', label: 'Investment', value: 'investment' },
  { category: 'asset', label: 'Retirement', value: 'retirement' },
  { category: 'asset', label: 'Real estate', value: 'real_estate' },
  { category: 'asset', label: 'Other asset', value: 'other_asset' },
  { category: 'liability', label: 'Credit card', value: 'credit' },
  { category: 'liability', label: 'Loan', value: 'loan' },
  { category: 'liability', label: 'Mortgage', value: 'mortgage' },
  { category: 'liability', label: 'Other liability', value: 'other_liability' }
];

export function isFinancialAccountType(value: unknown): value is FinancialAccountType {
  return typeof value === 'string' && accountTypeOptions.some((option) => option.value === value);
}

export function isAccountCategory(value: unknown): value is AccountCategory {
  return value === 'asset' || value === 'liability';
}

export function accountTypeLabel(value: FinancialAccountType): string {
  return accountTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function emptyAccountDraft(): AccountDraft {
  return {
    accountType: 'checking',
    balanceAmount: '',
    balanceDate: todayInputDate(),
    currency: 'USD',
    institutionName: '',
    name: ''
  };
}

export function emptyBalanceDraft(): BalanceDraft {
  return {
    amount: '',
    date: todayInputDate()
  };
}

export function buildBalanceDraftMap(accounts: FinancialAccount[]): Record<string, BalanceDraft> {
  return accounts.reduce<Record<string, BalanceDraft>>((drafts, account) => {
    drafts[account.id] = emptyBalanceDraft();
    return drafts;
  }, {});
}

export function isBalanceStale(
  dateStr: string | null | undefined,
  referenceDate: Date = new Date()
): boolean {
  if (!dateStr || typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return true;
  }
  const parts = dateStr.trim().split('-');
  const balMidnight = Date.UTC(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const refMidnight = Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), referenceDate.getUTCDate());
  const diffDays = Math.floor((refMidnight - balMidnight) / (1000 * 60 * 60 * 24));
  return diffDays > 30;
}

export function formatAccountMetric(
  amountCents: number | null,
  summary: AccountSummary
): string {
  if (summary.hasMixedCurrencies || amountCents === null) {
    return 'Unavailable';
  }
  return formatMoney(amountCents / 100, { currency: summary.primaryCurrency ?? 'USD' });
}

export function formatCurrencyBreakdown(
  summary: AccountSummary,
  field: 'assetsCents' | 'liabilitiesCents' | 'netWorthCents'
): string | null {
  if (!summary.hasMixedCurrencies || summary.currencies.length === 0) {
    return null;
  }
  return summary.currencies
    .map((currency) => {
      const curSummary = summary.byCurrency[currency];
      const amount = curSummary ? curSummary[field] / 100 : 0;
      return `${currency}: ${formatMoney(amount, { currency })}`;
    })
    .join(' · ');
}

export function toAccountBalance(value: unknown): AccountBalance | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.balanceCents !== 'number' ||
    typeof value.balanceDate !== 'string' ||
    typeof value.createdAt !== 'string'
  ) {
    return null;
  }

  return {
    balanceCents: value.balanceCents,
    balanceDate: value.balanceDate,
    createdAt: value.createdAt,
    id: value.id
  };
}

export function toFinancialAccount(value: unknown): FinancialAccount | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  if (
    !isFinancialAccountType(value.accountType) ||
    !isAccountCategory(value.category) ||
    typeof value.currency !== 'string' ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  const balances = Array.isArray(value.balanceHistory)
    ? value.balanceHistory.map(toAccountBalance).filter((balance): balance is AccountBalance => Boolean(balance))
    : [];

  return {
    accountType: value.accountType,
    balanceHistory: balances,
    category: value.category,
    createdAt: value.createdAt,
    currency: value.currency,
    id: value.id,
    institutionName: typeof value.institutionName === 'string' ? value.institutionName : null,
    isActive: value.isActive !== false,
    latestBalanceCents: typeof value.latestBalanceCents === 'number' ? value.latestBalanceCents : 0,
    latestBalanceDate: typeof value.latestBalanceDate === 'string' ? value.latestBalanceDate : null,
    name: value.name,
    updatedAt: value.updatedAt
  };
}

export function toAccountSummary(value: unknown): AccountSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.accountCount !== 'number' ||
    typeof value.liabilityAccountCount !== 'number'
  ) {
    return null;
  }

  const hasMixedCurrencies = Boolean(value.hasMixedCurrencies);
  const primaryCurrency = typeof value.primaryCurrency === 'string' ? value.primaryCurrency : null;
  const currencies = Array.isArray(value.currencies)
    ? value.currencies.filter((c): c is string => typeof c === 'string')
    : [];

  const assetsCents = typeof value.assetsCents === 'number' ? value.assetsCents : null;
  const liabilitiesCents = typeof value.liabilitiesCents === 'number' ? value.liabilitiesCents : null;
  const netWorthCents = typeof value.netWorthCents === 'number' ? value.netWorthCents : null;

  const byCurrency: Record<string, CurrencyAccountSummary> = {};
  if (isRecord(value.byCurrency)) {
    for (const [curr, summary] of Object.entries(value.byCurrency)) {
      if (isRecord(summary) && typeof summary.currency === 'string') {
        byCurrency[curr] = {
          accountCount: typeof summary.accountCount === 'number' ? summary.accountCount : 0,
          assetsCents: typeof summary.assetsCents === 'number' ? summary.assetsCents : 0,
          currency: summary.currency,
          liabilityAccountCount: typeof summary.liabilityAccountCount === 'number' ? summary.liabilityAccountCount : 0,
          liabilitiesCents: typeof summary.liabilitiesCents === 'number' ? summary.liabilitiesCents : 0,
          netWorthCents: typeof summary.netWorthCents === 'number' ? summary.netWorthCents : 0
        };
      }
    }
  }

  return {
    accountCount: value.accountCount,
    assetsCents,
    byCurrency,
    currencies,
    hasMixedCurrencies,
    liabilityAccountCount: value.liabilityAccountCount,
    liabilitiesCents,
    netWorthCents,
    primaryCurrency
  };
}

export function summarizeAccountList(accounts: FinancialAccount[]): AccountSummary {
  const activeAccounts = accounts.filter(
    (account) => account.isActive !== false && !account.archivedAt
  );

  if (activeAccounts.length === 0) {
    return {
      accountCount: 0,
      assetsCents: 0,
      byCurrency: {},
      currencies: [],
      hasMixedCurrencies: false,
      liabilityAccountCount: 0,
      liabilitiesCents: 0,
      netWorthCents: 0,
      primaryCurrency: null
    };
  }

  const byCurrency: Record<string, CurrencyAccountSummary> = {};

  for (const account of activeAccounts) {
    const currency = (account.currency || 'USD').trim().toUpperCase();
    if (!byCurrency[currency]) {
      byCurrency[currency] = {
        accountCount: 0,
        assetsCents: 0,
        currency,
        liabilityAccountCount: 0,
        liabilitiesCents: 0,
        netWorthCents: 0
      };
    }

    const cur = byCurrency[currency];
    cur.accountCount += 1;

    if (account.category === 'liability') {
      cur.liabilityAccountCount += 1;
      cur.liabilitiesCents += account.latestBalanceCents;
    } else {
      cur.assetsCents += account.latestBalanceCents;
    }

    cur.netWorthCents = cur.assetsCents - cur.liabilitiesCents;
  }

  const currencies = Object.keys(byCurrency).sort();
  const totalLiabilityAccounts = Object.values(byCurrency).reduce(
    (sum, cur) => sum + cur.liabilityAccountCount,
    0
  );

  if (currencies.length === 1) {
    const primaryCurrency = currencies[0];
    const single = byCurrency[primaryCurrency];

    return {
      accountCount: activeAccounts.length,
      assetsCents: single.assetsCents,
      byCurrency,
      currencies,
      hasMixedCurrencies: false,
      liabilityAccountCount: totalLiabilityAccounts,
      liabilitiesCents: single.liabilitiesCents,
      netWorthCents: single.netWorthCents,
      primaryCurrency
    };
  }

  return {
    accountCount: activeAccounts.length,
    assetsCents: null,
    byCurrency,
    currencies,
    hasMixedCurrencies: true,
    liabilityAccountCount: totalLiabilityAccounts,
    liabilitiesCents: null,
    netWorthCents: null,
    primaryCurrency: null
  };
}

export async function readFinancialAccountResponse(
  response: Response,
  errorMessage: string
): Promise<FinancialAccount> {
  return readApiJson(response, errorMessage, (body) =>
    isRecord(body) ? toFinancialAccount(body.account) : null
  );
}

export async function loadFinancialAccounts(
  auth: SignedInAuth
): Promise<{
  accounts: FinancialAccount[];
  summary: AccountSummary;
}> {
  const response = await authenticatedJsonRequest(auth, '/api/accounts');

  if (!response.ok) {
    throw new Error('Unable to load financial accounts.');
  }

  const body = await response.json();
  const accounts = isRecord(body) && Array.isArray(body.accounts)
    ? body.accounts.map(toFinancialAccount).filter((account): account is FinancialAccount => Boolean(account))
    : [];
  const summary = isRecord(body) ? toAccountSummary(body.summary) : null;

  return {
    accounts,
    summary: summary ?? summarizeAccountList(accounts)
  };
}

export async function createFinancialAccountRecord(
  auth: SignedInAuth,
  draft: AccountDraft
): Promise<FinancialAccount> {
  const balanceCents = moneyInputToCents(draft.balanceAmount);
  const payload = {
    accountType: draft.accountType,
    balanceCents: balanceCents ?? 0,
    balanceDate: draft.balanceDate,
    currency: draft.currency.trim().toUpperCase() || 'USD',
    institutionName: optionalTextFromDraft(draft.institutionName),
    name: draft.name.trim()
  };
  const response = await authenticatedJsonRequest(auth, '/api/accounts', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  return readFinancialAccountResponse(response, 'Unable to create account.');
}

export async function archiveFinancialAccountRecord(
  auth: SignedInAuth,
  id: string
): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to archive account.');
  }
}

export async function addFinancialAccountBalanceRecord(
  auth: SignedInAuth,
  id: string,
  draft: BalanceDraft
): Promise<FinancialAccount> {
  const balanceCents = moneyInputToCents(draft.amount);

  if (balanceCents === null) {
    throw new Error('Balance amount is required.');
  }

  const response = await authenticatedJsonRequest(auth, `/api/accounts/${encodeURIComponent(id)}/balances`, {
    body: JSON.stringify({
      balanceCents,
      balanceDate: draft.date
    }),
    method: 'POST'
  });

  return readFinancialAccountResponse(response, 'Unable to save balance.');
}
