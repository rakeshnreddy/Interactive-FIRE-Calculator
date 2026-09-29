import { describe, expect, it } from 'vitest';
import { formatMoney } from './fire';
import { formatCents, formatStoredCurrency } from './format';
import { formatCompactMoney, resolveMoneyLocale } from './money';

describe('money formatting', () => {
  it('uses Indian grouping for INR unless a locale is explicitly chosen', () => {
    expect(formatMoney(113669, { currency: 'INR' })).toBe('₹1,13,669');
    expect(formatStoredCurrency(1_000_000, 'INR')).toBe('₹10,00,000');
    expect(formatCents(11_366_900, 'INR')).toBe('₹1,13,669.00');
    expect(resolveMoneyLocale('INR', 'en-US')).toBe('en-US');
    expect(resolveMoneyLocale('INR', 'auto')).toBe('en-IN');
    expect(resolveMoneyLocale('USD', 'auto', 'en-US')).toBe('en-US');
  });

  it('keeps USD output unchanged', () => {
    expect(formatMoney(2_400_000)).toBe('$2,400,000');
    expect(formatMoney(113669, { currency: 'USD' })).toBe('$113,669');
  });

  it('compacts money for headlines and axes', () => {
    expect(formatCompactMoney(2_400_000)).toBe('$2.4M');
    expect(formatCompactMoney(850_000)).toBe('$850K');
    expect(formatCompactMoney(999)).toBe('$999');
    expect(formatCompactMoney(24_00_000, 'INR')).toBe('₹24 L');
    expect(formatCompactMoney(2_40_00_000, 'INR')).toBe('₹2.4 Cr');
    expect(formatCompactMoney(99_999, 'INR')).toBe('₹99,999');
    expect(formatCompactMoney(-1_500_000)).toBe('-$1.5M');
  });
});
