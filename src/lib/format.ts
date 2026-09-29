import { formatMoney, formatPercent } from './fire';
import { resolveMoneyLocale } from './money';

export function formatCents(
  value: number,
  currency = 'USD',
  options: Intl.NumberFormatOptions = {}
): string {
  return formatMoney(value / 100, {
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    ...options
  });
}

export function formatSignedCents(value: number, currency = 'USD'): string {
  if (value === 0) {
    return formatCents(0, currency);
  }

  return `${value > 0 ? '+' : '-'}${formatCents(Math.abs(value), currency)}`;
}

export function formatStoredCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat(resolveMoneyLocale(currency), {
    currency,
    maximumFractionDigits: 0,
    style: 'currency'
  }).format(value);
}

export function formatSavedCalculatorMetric(item: {
  currency: string;
  conversionLabel: string;
  result: {
    metrics: Array<{
      label: string;
      value: number;
      valueType: 'currency' | 'number' | 'percent' | 'years';
    }>;
  };
}): string {
  const metric = item.result.metrics[0];

  if (!metric) {
    return item.conversionLabel;
  }

  if (metric.valueType === 'currency') {
    return `${metric.label}: ${formatStoredCurrency(metric.value, item.currency)}`;
  }

  if (metric.valueType === 'percent') {
    return `${metric.label}: ${(metric.value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }

  if (metric.valueType === 'years') {
    return `${metric.label}: ${metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} years`;
  }

  return `${metric.label}: ${metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`;
}

export function formatMonthLabel(value: string): string {
  if (!/^\d{4}-\d{2}$/.test(value)) {
    return 'No month';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC'
  }).format(new Date(`${value}-01T00:00:00.000Z`));
}

export function formatSignedPercent(value: number): string {
  const formatted = formatPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

export function moneyInputToCents(value: string): number | null {
  const normalized = value.replace(/[$,\s]/g, '');

  if (!normalized) {
    return null;
  }

  if (!/^\d+(\.\d{0,2})?$/.test(normalized)) {
    return null;
  }

  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.round(parsed * 100);
}

export function todayInputDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function numericValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
