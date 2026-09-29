import { describe, expect, it } from 'vitest';
import { validateFireForm, type FireFormValues } from './fireValidation';

const valid: FireFormValues = {
  mode: 'fire-number', currentAge: 40, retirementAge: 50, planEndAge: 90,
  annualExpense: 80_000, initialPortfolio: 750_000, returnPercent: '7', inflationPercent: '2.5',
  annualSavings: '', savingsGrowthPercent: ''
};

describe('validateFireForm', () => {
  it('accepts a complete form and deliberate zero rates', () => {
    expect(validateFireForm(valid)).toEqual({ ok: true, ratesMissing: false, issues: {} });
    expect(validateFireForm({ ...valid, returnPercent: '0', inflationPercent: '0', initialPortfolio: 0, annualSavings: '0' }).ok).toBe(true);
  });

  it('requires both rates on a fresh form instead of assuming 0%', () => {
    const result = validateFireForm({ ...valid, returnPercent: '', inflationPercent: ' ' });
    expect(result.ok).toBe(false);
    expect(result.ratesMissing).toBe(true);
    expect(result.issues.return).toMatch(/0 is allowed/);
    expect(result.issues.inflation).toMatch(/0 is allowed/);
  });

  it('never turns blank or negative spending into a result', () => {
    expect(validateFireForm({ ...valid, annualExpense: Number.NaN }).issues.annualExpense).toBe('Enter your annual spending.');
    expect(validateFireForm({ ...valid, annualExpense: -64_000 }).issues.annualExpense).toBe('Spending cannot be negative.');
    expect(validateFireForm({ ...valid, annualExpense: 0 }).ok).toBe(false);
  });

  it('rejects impossible age ordering and non-whole ages', () => {
    expect(validateFireForm({ ...valid, retirementAge: 30 }).issues.retirementAge).toMatch(/after your current age/);
    expect(validateFireForm({ ...valid, planEndAge: 50 }).issues.planEndAge).toMatch(/after retirement age/);
    expect(validateFireForm({ ...valid, currentAge: 40.5 }).issues.currentAge).toBeDefined();
    expect(validateFireForm({ ...valid, planEndAge: 130 }).issues.planEndAge).toBeDefined();
  });

  it('bounds rates, portfolio and optional savings', () => {
    expect(validateFireForm({ ...valid, returnPercent: '500' }).issues.return).toMatch(/between -50% and 50%/);
    expect(validateFireForm({ ...valid, inflationPercent: 'abc' }).issues.inflation).toBeDefined();
    expect(validateFireForm({ ...valid, initialPortfolio: -1 }).issues.initialPortfolio).toMatch(/negative/);
    expect(validateFireForm({ ...valid, annualSavings: '-5' }).issues.annualSavings).toBeDefined();
    expect(validateFireForm({ ...valid, savingsGrowthPercent: '80' }).issues.savingsGrowth).toBeDefined();
  });

  it('treats spending as optional in withdrawal mode but still rejects negatives', () => {
    const withdrawal = { ...valid, mode: 'withdrawal-income' as const };
    expect(validateFireForm({ ...withdrawal, annualExpense: Number.NaN }).issues.annualExpense).toBeUndefined();
    expect(validateFireForm({ ...withdrawal, annualExpense: -1 }).issues.annualExpense).toBeDefined();
  });
});
