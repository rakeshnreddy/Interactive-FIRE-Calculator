import { describe, expect, it } from 'vitest';
import { calculateSeoCalculator, seoCalculators } from './seoCalculators';
import { buildCalculatorDetailSchedule } from './calculatorStudios';

describe('B08: Mortgage payoff reconciliation and schedule termination', () => {
  const mortgage = seoCalculators.find((c) => c.slug === 'mortgage')!;

  it('reconciles headline payoff months and schedule rows for $200,000 / 6.5% / 30y', () => {
    const values = {
      principal: 200_000,
      rate: 6.5,
      years: 30,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value;
    expect(schedule).not.toBeNull();
    expect(headlineMonths).toBe(360);
    expect(schedule!.rows.length).toBe(360);
    expect(headlineMonths).toBe(schedule!.rows.length);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.period).toBe(360);
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');

    // Principal, interest, and payment reconciliation
    const totalPrincipalPaid = schedule!.rows.reduce((sum, r) => sum + Number(r.values.principalPaid), 0);
    const totalInterestPaid = schedule!.rows.reduce((sum, r) => sum + Number(r.values.interest), 0);
    const totalPayments = schedule!.rows.reduce((sum, r) => sum + Number(r.values.payment), 0);

    expect(Math.abs(totalPrincipalPaid - 200_000)).toBeLessThan(0.01);
    expect(Math.abs(totalPayments - (totalPrincipalPaid + totalInterestPaid))).toBeLessThan(0.01);
  });

  it('reconciles headline payoff months and schedule rows for $300,000 / 6.5% / 30y baseline', () => {
    const values = {
      principal: 300_000,
      rate: 6.5,
      years: 30,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value;
    expect(schedule).not.toBeNull();
    expect(headlineMonths).toBe(360);
    expect(schedule!.rows.length).toBe(360);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');
  });

  it('handles zero interest (0% annual rate) accurately without division by zero or extra months', () => {
    const values = {
      principal: 120_000,
      rate: 0,
      years: 10,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value;
    expect(headlineMonths).toBe(120);
    expect(schedule!.rows.length).toBe(120);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');

    const totalPrincipal = schedule!.rows.reduce((sum, r) => sum + Number(r.values.principalPaid), 0);
    expect(Math.abs(totalPrincipal - 120_000)).toBeLessThan(0.01);
  });

  it('reconciles accelerated payoff with extra monthly principal and final payment smaller than regular payment', () => {
    const values = {
      principal: 200_000,
      rate: 6.5,
      years: 30,
      extraMonthlyPayment: 300,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value as number;
    expect(schedule).not.toBeNull();
    expect(headlineMonths).toBeLessThan(360);
    expect(headlineMonths).toBeGreaterThan(100);
    expect(schedule!.rows.length).toBe(headlineMonths);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.period).toBe(headlineMonths);
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');

    // Final payment should be smaller than or equal to regular monthly outflow
    const regularOutflow = Number(result.metrics.find((m) => m.label === 'Monthly outflow with extra')?.value);
    expect(Number(lastRow.values.payment)).toBeLessThanOrEqual(regularOutflow + 0.01);

    const totalPrincipalPaid = schedule!.rows.reduce((sum, r) => sum + Number(r.values.principalPaid), 0);
    expect(Math.abs(totalPrincipalPaid - 200_000)).toBeLessThan(0.01);
  });

  it('does not hardcode 360 for other loan terms (15-year loan produces 180 months)', () => {
    const values = {
      principal: 250_000,
      rate: 5.75,
      years: 15,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value;
    expect(headlineMonths).toBe(180);
    expect(schedule!.rows.length).toBe(180);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.period).toBe(180);
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');
  });

  it('reconciles extra annual payment and schedules correctly across year boundaries', () => {
    const values = {
      principal: 200_000,
      rate: 6.5,
      years: 30,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 5_000
    };

    const result = calculateSeoCalculator(mortgage, values);
    const schedule = buildCalculatorDetailSchedule(mortgage, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Payoff months')?.value as number;
    expect(headlineMonths).toBeLessThan(360);
    expect(schedule!.rows.length).toBe(headlineMonths);

    const lastRow = schedule!.rows[schedule!.rows.length - 1];
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');
  });

  it('does not forgive material debt and requires another payment period when residual exceeds tolerance', () => {
    const debtCalc = seoCalculators.find((c) => c.slug === 'debt-payoff')!;
    // Balance $1,000 at 0% rate with $300 payment leaves $100 after 3 months.
    // That $100 is material debt (> $0.005) and must require month 4.
    const values = {
      balance: 1_000,
      rate: 0,
      payment: 300,
      extraMonthlyPayment: 0,
      extraAnnualPayment: 0
    };

    const result = calculateSeoCalculator(debtCalc, values);
    const schedule = buildCalculatorDetailSchedule(debtCalc, values);

    const headlineMonths = result.metrics.find((m) => m.label === 'Months to payoff')?.value;
    expect(headlineMonths).toBe(4);
    expect(schedule).not.toBeNull();
    expect(schedule!.rows.length).toBe(4);

    const lastRow = schedule!.rows[3];
    expect(lastRow.values.payment).toBe(100); // final payment smaller than regular $300
    expect(lastRow.values.endingBalance).toBe(0);
    expect(lastRow.note).toBe('Final payment');

    const totalPrincipal = schedule!.rows.reduce((sum, r) => sum + Number(r.values.principalPaid), 0);
    expect(totalPrincipal).toBe(1_000);
  });
});

