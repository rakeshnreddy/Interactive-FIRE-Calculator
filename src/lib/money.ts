// Shared money display rules. An explicitly chosen number format always wins; otherwise INR uses
// Indian digit grouping (1,13,669) and everything else keeps the caller's default.
export function resolveMoneyLocale(currency: string | undefined, locale?: string | null, fallback?: string): string | undefined {
  if (locale && locale !== 'auto') return locale;
  if (currency === 'INR') return 'en-IN';
  return fallback;
}

const trimDecimal = (value: number) => (Math.round(value * 10) / 10).toString();

// Compact labels for headlines and chart axes: $850K, $2.4M, ₹24 L, ₹2.4 Cr.
export function formatCompactMoney(value: number, currency = 'USD'): string {
  if (!Number.isFinite(value)) return 'Not feasible';
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  if (currency === 'INR') {
    if (abs >= 1e7) return `${sign}₹${trimDecimal(abs / 1e7)} Cr`;
    if (abs >= 1e5) return `${sign}₹${trimDecimal(abs / 1e5)} L`;
    return `${sign}${new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(abs)}`;
  }
  const symbol = new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).formatToParts(0).find((p) => p.type === 'currency')?.value ?? `${currency} `;
  if (abs >= 1e9) return `${sign}${symbol}${trimDecimal(abs / 1e9)}B`;
  if (abs >= 1e6) return `${sign}${symbol}${trimDecimal(abs / 1e6)}M`;
  if (abs >= 1e3) return `${sign}${symbol}${Math.round(abs / 1e3)}K`;
  return `${sign}${symbol}${Math.round(abs)}`;
}
