import {
  annualSimulation,
  formatMoney,
  formatPercent,
  totalDuration,
  type FirePlanResult,
  type PlanInput,
  type PlanWarningCode,
  type RatePeriod,
  type SimulationResult,
  type YearResult
} from './fire';
import { isRecord, pickString } from './api/client';

export type WarningNotice = {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
};

export const ENGINE_WARNING_TITLES: Record<PlanWarningCode, string> = {
  balance_depleted: 'Portfolio depleted',
  negative_balance: 'Negative balance',
  high_return_assumption: 'High return assumption',
  low_return_assumption: 'Low return assumption',
  high_inflation_assumption: 'High inflation assumption',
  low_inflation_assumption: 'Low inflation assumption',
  invalid_one_off_year: 'Invalid event year',
  one_off_year_out_of_range: 'Event outside timeline',
  invalid_one_off_amount: 'Invalid event amount',
  invalid_recurring_cash_flow: 'Invalid recurring cash flow',
  recurring_cash_flow_out_of_range: 'Recurring flow outside timeline',
  empty_rate_periods: 'Missing rate periods',
  invalid_rate_period: 'Invalid rate period',
  invalid_money_value: 'Invalid financial value',
  unsupported_withdrawal_timing: 'Unsupported withdrawal timing',
  required_portfolio_not_feasible: 'Calculation infeasible'
};

export function humanizeWarningTitle(raw: string): string {
  if (raw in ENGINE_WARNING_TITLES) {
    return ENGINE_WARNING_TITLES[raw as PlanWarningCode];
  }
  if (!raw.includes('_')) {
    return raw;
  }
  return raw
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

export function normalizeWarning(value: unknown, index: number): WarningNotice | null {
  if (typeof value === 'string') {
    return {
      title: `Model check ${index + 1}`,
      message: value,
      severity: 'warning'
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const severityText = pickString(value, ['severity', 'level', 'tone', 'kind'])?.toLowerCase() ?? '';
  const severity: WarningNotice['severity'] = severityText.includes('critical') ||
    severityText.includes('error') ||
    severityText.includes('danger')
    ? 'critical'
    : severityText.includes('warning') || severityText.includes('risk') || severityText.includes('caution')
      ? 'warning'
      : 'info';

  const mode = pickString(value, ['mode']);
  const modeContext =
    mode === 'expense'
      ? 'Target spend'
      : mode === 'portfolio'
        ? 'Current portfolio'
        : null;

  const rawTitle =
    pickString(value, ['title', 'label', 'name']) ??
    pickString(value, ['code', 'kind', 'type']) ??
    `Model check ${index + 1}`;

  const baseTitle = humanizeWarningTitle(rawTitle);
  const title = modeContext ? `${baseTitle} (${modeContext})` : baseTitle;

  const message =
    pickString(value, ['message', 'description', 'detail', 'text', 'body', 'summary']) ?? baseTitle;

  return { title, message, severity };
}

export function shouldSuppressHorizonDepletion(
  warning: unknown,
  duration?: number,
  desiredFinalValue?: number
): boolean {
  if (!isRecord(warning)) {
    return false;
  }

  const code = pickString(warning, ['code']);
  if (code !== 'balance_depleted') {
    return false;
  }

  if (desiredFinalValue !== 0 || typeof duration !== 'number') {
    return false;
  }

  const year = typeof warning.year === 'number' ? warning.year : undefined;
  if (year !== duration) {
    return false;
  }

  const endingBalance =
    typeof warning.value === 'number' && Number.isFinite(warning.value)
      ? warning.value
      : undefined;

  // Suppress ONLY when ending balance is close to zero (within $1 solver tolerance)
  // Never suppress substantial negative balances or missing ending balances
  if (endingBalance === undefined || Math.abs(endingBalance) > 1.0) {
    return false;
  }

  return true;
}

export function engineWarnings(
  result: FirePlanResult,
  duration?: number,
  desiredFinalValue?: number
): WarningNotice[] {
  const warningSource = result as FirePlanResult & {
    warning?: unknown;
    warnings?: unknown;
  };
  const rawWarnings = Array.isArray(warningSource.warnings)
    ? warningSource.warnings
    : warningSource.warning === undefined
      ? []
      : [warningSource.warning];

  return rawWarnings
    .filter((warning) => !shouldSuppressHorizonDepletion(warning, duration, desiredFinalValue))
    .map((warning, index) => normalizeWarning(warning, index))
    .filter((warning): warning is WarningNotice => warning !== null);
}

export function firstNegativeYear(rows: YearResult[]): number | null {
  return rows.find((row) => row.endingBalance < 0)?.year ?? null;
}

export function stressTestCurrentPortfolio(plan: PlanInput): SimulationResult {
  const fallbackPortfolio = Number.isFinite(plan.initialPortfolio)
    ? Math.max(0, plan.initialPortfolio)
    : 0;

  try {
    return annualSimulation(
      fallbackPortfolio,
      Number.isFinite(plan.annualExpense) ? Math.max(0, plan.annualExpense) : 0,
      plan.withdrawalTiming,
      plan.ratePeriods,
      plan.oneOffEvents,
      plan.recurringCashFlows
    );
  } catch {
    return {
      rows: [],
      years: [0],
      balances: [fallbackPortfolio],
      withdrawals: [],
      finalBalance: fallbackPortfolio,
      warnings: []
    };
  }
}

export function averageRate(periods: RatePeriod[], key: 'r' | 'i'): number {
  const duration = Math.max(totalDuration(periods), 1);
  return periods.reduce((sum, period) => sum + period[key] * period.duration, 0) / duration;
}

export function planWarnings(
  plan: PlanInput,
  result: FirePlanResult,
  currentRows: YearResult[],
  duration: number
): WarningNotice[] {
  const exportedWarnings = engineWarnings(result, duration, plan.desiredFinalValue);
  const notices: WarningNotice[] = [];
  const depletionYear = firstNegativeYear(currentRows);
  const requiredGap = result.requiredPortfolio - plan.initialPortfolio;
  const withdrawalRate = plan.initialPortfolio > 0 ? plan.annualExpense / plan.initialPortfolio : Infinity;
  const ignoredEvents = plan.oneOffEvents.filter((event) => {
    const year = Math.trunc(event.year);
    return year < 1 || year > duration;
  });

  if (depletionYear !== null) {
    notices.push({
      title: 'Current portfolio drawdown',
      message: `At the entered spending level, the current portfolio crosses below zero in year ${depletionYear}.`,
      severity: 'warning'
    });
  }

  if (Number.isFinite(requiredGap) && requiredGap > 0) {
    notices.push({
      title: 'Funding gap',
      message: `${formatMoney(requiredGap)} separates the current portfolio from the calculated FIRE number.`,
      severity: 'info'
    });
  }

  if (withdrawalRate > 0.06) {
    notices.push({
      title: 'High starting withdrawal',
      message: `The first-year spend is ${formatPercent(withdrawalRate)} of the current portfolio.`,
      severity: 'warning'
    });
  }

  if (ignoredEvents.length > 0) {
    notices.push({
      title: 'Cash flow outside timeline',
      message: `${ignoredEvents.length} one-off event${ignoredEvents.length === 1 ? '' : 's'} fall outside the ${duration}-year model.`,
      severity: 'info'
    });
  }

  const avgInflation = averageRate(plan.ratePeriods, 'i');
  const avgReturn = averageRate(plan.ratePeriods, 'r');
  if (avgInflation > 0 && avgInflation >= avgReturn) {
    notices.push({
      title: 'Inflation pressure',
      message: 'Average inflation is at or above average return across the modeled periods.',
      severity: 'warning'
    });
  }

  const combined = [...exportedWarnings, ...notices];

  // Ensure no duplicate identical notices within same context
  const seen = new Set<string>();
  return combined.filter((notice) => {
    const key = `${notice.severity}|${notice.title}|${notice.message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
