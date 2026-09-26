import { describe, expect, it } from 'vitest';
import {
  formatCents,
  formatMonthLabel,
  formatSavedCalculatorMetric,
  formatSignedCents,
  formatSignedPercent,
  formatStoredCurrency,
  moneyInputToCents,
  numericValue
} from './format';

describe('format.ts', () => {
  describe('formatCents and formatSignedCents', () => {
    it('formats US dollar amounts with 2 decimal places and separators', () => {
      expect(formatCents(0)).toBe('$0.00');
      expect(formatCents(1234)).toBe('$12.34');
      expect(formatCents(100000000)).toBe('$1,000,000.00');
      expect(formatCents(-5000)).toBe('-$50.00');
    });

    it('formats Indian Rupee (INR) amounts correctly', () => {
      const inrZero = formatCents(0, 'INR');
      expect(inrZero).toContain('0.00');

      const inrAmount = formatCents(10000000, 'INR');
      expect(inrAmount).toContain('1,00,000.00');
      expect(inrAmount).toContain('₹');
    });

    it('formats signed cents with explicit + or -', () => {
      expect(formatSignedCents(0)).toBe('$0.00');
      expect(formatSignedCents(1500)).toBe('+$15.00');
      expect(formatSignedCents(-1500)).toBe('-$15.00');
    });
  });

  describe('formatStoredCurrency', () => {
    it('formats currency without cents', () => {
      expect(formatStoredCurrency(1250000, 'USD')).toBe('$1,250,000');
      expect(formatStoredCurrency(0, 'USD')).toBe('$0');
    });
  });

  describe('formatSavedCalculatorMetric', () => {
    it('formats currency, percent, and years metrics', () => {
      expect(
        formatSavedCalculatorMetric({
          conversionLabel: 'Save',
          currency: 'USD',
          result: {
            metrics: [{ label: 'FIRE Number', value: 1500000, valueType: 'currency' }]
          }
        })
      ).toBe('FIRE Number: $1,500,000');

      expect(
        formatSavedCalculatorMetric({
          conversionLabel: 'Save',
          currency: 'USD',
          result: {
            metrics: [{ label: 'Withdrawal Rate', value: 0.04, valueType: 'percent' }]
          }
        })
      ).toBe('Withdrawal Rate: 4%');

      expect(
        formatSavedCalculatorMetric({
          conversionLabel: 'Save',
          currency: 'USD',
          result: {
            metrics: [{ label: 'Time Horizon', value: 25, valueType: 'years' }]
          }
        })
      ).toBe('Time Horizon: 25 years');
    });

    it('falls back to conversionLabel when metrics array is empty', () => {
      expect(
        formatSavedCalculatorMetric({
          conversionLabel: 'Default conversion',
          currency: 'USD',
          result: { metrics: [] }
        })
      ).toBe('Default conversion');
    });
  });

  describe('formatMonthLabel', () => {
    it('formats YYYY-MM into short month and year', () => {
      expect(formatMonthLabel('2026-03')).toBe('Mar 2026');
      expect(formatMonthLabel('2025-12')).toBe('Dec 2025');
    });

    it('returns fallback for invalid formats', () => {
      expect(formatMonthLabel('invalid')).toBe('No month');
      expect(formatMonthLabel('')).toBe('No month');
    });
  });

  describe('formatSignedPercent', () => {
    it('formats percentages with explicit + sign for positive values', () => {
      expect(formatSignedPercent(0.075)).toBe('+7.5%');
      expect(formatSignedPercent(0)).toBe('0%');
      expect(formatSignedPercent(-0.02)).toBe('-2%');
    });
  });

  describe('moneyInputToCents', () => {
    it('converts valid dollar strings to cents', () => {
      expect(moneyInputToCents('$100')).toBe(10000);
      expect(moneyInputToCents('$1,234.56')).toBe(123456);
      expect(moneyInputToCents('50.5')).toBe(5050);
      expect(moneyInputToCents('0')).toBe(0);
    });

    it('returns null for empty or invalid strings', () => {
      expect(moneyInputToCents('')).toBeNull();
      expect(moneyInputToCents('abc')).toBeNull();
      expect(moneyInputToCents('12.345')).toBeNull(); // more than 2 decimals
    });
  });

  describe('numericValue', () => {
    it('parses valid numeric strings and falls back gracefully', () => {
      expect(numericValue('42')).toBe(42);
      expect(numericValue('-10.5')).toBe(-10.5);
      expect(numericValue('not-a-number', 99)).toBe(99);
    });
  });
});
