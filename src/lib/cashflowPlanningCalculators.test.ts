import { describe, expect, it } from 'vitest';
import {
  buildBudgetCsv,
  buildEmergencyFundCsv,
  buildNetWorthCsv,
  calculateBudget,
  calculateEmergencyFund,
  calculateNetWorth,
  defaultBudgetInputs,
  defaultEmergencyFundInputs,
  defaultNetWorthInputs,
  emergencyRiskReferenceMonths
} from './cashflowPlanningCalculators';

describe('net worth planning engine', () => {
  it('preserves the legacy route default while exposing the complete balance sheet', () => {
    const projection = calculateNetWorth(defaultNetWorthInputs);
    expect(projection.validation.isValid).toBe(true);
    expect(projection.totalAssets).toBe(250_000);
    expect(projection.totalLiabilities).toBe(75_000);
    expect(projection.netWorth).toBe(175_000);
    expect(projection.assetRows).toHaveLength(6);
    expect(projection.liabilityRows).toHaveLength(5);
  });

  it('calculates liquidity and debt ratios without treating illiquid property as cash', () => {
    const projection = calculateNetWorth(defaultNetWorthInputs);
    expect(projection.liquidAssets).toBe(60_000);
    expect(projection.liquidPosition).toBe(53_000);
    expect(projection.debtToAssetRatio).toBeCloseTo(0.3, 12);
  });

  it('keeps a valid negative net worth instead of clamping it', () => {
    const projection = calculateNetWorth({
      ...defaultNetWorthInputs,
      cashAndBank: 0,
      taxableInvestments: 0,
      retirementAccounts: 0,
      realEstate: 0,
      vehiclesAndValuables: 0,
      otherAssets: 10_000
    });
    expect(projection.netWorth).toBe(-65_000);
    expect(projection.validation.warnings).toContain('Reported liabilities exceed reported assets. A negative snapshot can still be valid.');
  });

  it('keeps cash fixed in valuation sensitivity and adjusts the remaining assets', () => {
    const projection = calculateNetWorth(defaultNetWorthInputs);
    expect(projection.marketSensitiveAssets).toBe(225_000);
    expect(projection.valuationScenarios.map((scenario) => scenario.netWorth)).toEqual([
      152_500,
      175_000,
      197_500
    ]);
  });

  it('returns an unavailable debt ratio when assets are zero', () => {
    const projection = calculateNetWorth({
      ...defaultNetWorthInputs,
      cashAndBank: 0,
      taxableInvestments: 0,
      retirementAccounts: 0,
      realEstate: 0,
      vehiclesAndValuables: 0,
      otherAssets: 0
    });
    expect(projection.debtToAssetRatio).toBeNull();
    expect(projection.validation.isValid).toBe(true);
  });

  it('rejects negative, non-finite, and overflowing balances', () => {
    expect(calculateNetWorth({ ...defaultNetWorthInputs, cashAndBank: -1 }).validation.errors.cashAndBank).toBeDefined();
    expect(calculateNetWorth({ ...defaultNetWorthInputs, cashAndBank: Number.NaN }).validation.errors.cashAndBank).toBeDefined();
    expect(calculateNetWorth({ ...defaultNetWorthInputs, cashAndBank: 1e16 }).validation.errors.cashAndBank).toBeDefined();
  });

  it('exports a reconciled CRLF balance sheet', () => {
    const csv = buildNetWorthCsv(calculateNetWorth(defaultNetWorthInputs));
    expect(csv).toContain('Asset,Cash and bank accounts,25000.0000000000\r\n');
    expect(csv).toContain('Summary,Net worth,175000.000000000\r\n');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});

describe('budget planning engine', () => {
  it('preserves the legacy monthly surplus and reconciles every category', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    expect(projection.validation.isValid).toBe(true);
    expect(projection.totalIncome).toBe(7_000);
    expect(projection.totalSpending).toBe(4_500);
    expect(projection.monthlySurplus).toBe(2_500);
    expect(projection.annualSurplus).toBe(30_000);
    expect(projection.categoryRows.reduce((total, row) => total + row.value, 0)).toBe(4_500);
  });

  it('separates spending surplus, planned savings, and still-unassigned cash', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    expect(projection.unassignedAfterPlan).toBe(1_000);
    expect(projection.savingsCapacityRate).toBeCloseTo(2_500 / 7_000, 12);
    expect(projection.plannedSavingsRate).toBeCloseTo(1_500 / 7_000, 12);
  });

  it('uses the 50/30/20 values as references rather than changing the result', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    expect(projection.referenceNeeds).toBe(3_500);
    expect(projection.referenceWants).toBe(2_100);
    expect(projection.referenceSavings).toBe(1_400);
    expect(projection.savingsTargetGap).toBe(1_100);
    expect(projection.monthlySurplus).toBe(2_500);
  });

  it('shows both income-shock and flexible-spending scenarios', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    const incomeShock = projection.scenarios.find((scenario) => scenario.id === 'income-shock');
    const trim = projection.scenarios.find((scenario) => scenario.id === 'flexible-trim');
    expect(incomeShock?.monthlySurplus).toBe(1_100);
    expect(trim?.monthlySurplus).toBe(2_610);
  });

  it('allows a real deficit and reports it clearly', () => {
    const projection = calculateBudget({ ...defaultBudgetInputs, takeHomePay: 3_000 });
    expect(projection.monthlySurplus).toBe(-1_500);
    expect(projection.savingsCapacityRate).toBeCloseTo(-0.5, 12);
    expect(projection.validation.warnings).toContain('Monthly spending exceeds monthly income in this plan.');
  });

  it('builds a twelve-month constant-plan pace that reconciles to the annual result', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    expect(projection.pace).toHaveLength(12);
    expect(projection.pace[11]).toEqual({
      cumulativePlannedSavings: 18_000,
      cumulativeSurplus: 30_000,
      cumulativeUnassigned: 12_000,
      month: 12
    });
  });

  it('rejects invalid money and scenario percentages', () => {
    expect(calculateBudget({ ...defaultBudgetInputs, groceries: -1 }).validation.errors.groceries).toBeDefined();
    expect(calculateBudget({ ...defaultBudgetInputs, flexibleCutPercent: 101 }).validation.errors.flexibleCutPercent).toBeDefined();
    expect(calculateBudget({ ...defaultBudgetInputs, incomeShockPercent: Number.NaN }).validation.errors.incomeShockPercent).toBeDefined();
  });

  it('exports monthly and annual values with CRLF rows', () => {
    const projection = calculateBudget(defaultBudgetInputs);
    const csv = buildBudgetCsv(defaultBudgetInputs, projection);
    expect(csv).toContain('Income,Take-home pay,7000.00000000000,84000.0000000000\r\n');
    expect(csv).toContain('Summary,Cash surplus before planned savings,2500.00000000000,30000.0000000000\r\n');
  });
});

describe('emergency fund planning engine', () => {
  it('preserves the legacy six-month target and reconciles reserve tiers', () => {
    const projection = calculateEmergencyFund(defaultEmergencyFundInputs);
    expect(projection.validation.isValid).toBe(true);
    expect(projection.selectedTarget).toBe(27_000);
    expect(projection.currentReserve).toBe(27_000);
    expect(projection.immediateReserve).toBe(15_000);
    expect(projection.nearTermReserve).toBe(12_000);
    expect(projection.marketExposedReserve).toBe(0);
    expect(projection.gap).toBe(0);
    expect(projection.progress).toBe(1);
  });

  it('calculates current runway separately from the selected target', () => {
    const projection = calculateEmergencyFund({ ...defaultEmergencyFundInputs, bankSavings: 3_000, shortTermDeposits: 3_000 });
    expect(projection.currentReserve).toBe(9_000);
    expect(projection.monthsOfRunway).toBe(2);
    expect(projection.gap).toBe(18_000);
  });

  it('builds an exact monthly funding schedule without applying hidden growth', () => {
    const projection = calculateEmergencyFund({
      ...defaultEmergencyFundInputs,
      bankSavings: 0,
      cashOnHand: 2_000,
      shortTermDeposits: 0,
      monthlyContribution: 2_500
    });
    expect(projection.monthsToGoal).toBe(10);
    expect(projection.schedule).toHaveLength(11);
    expect(projection.schedule[10]).toEqual({ contribution: 2_500, endingReserve: 27_000, gap: 0, month: 10 });
  });

  it('does not invent a funding date when the contribution is zero', () => {
    const projection = calculateEmergencyFund({
      ...defaultEmergencyFundInputs,
      bankSavings: 0,
      cashOnHand: 0,
      shortTermDeposits: 0,
      monthlyContribution: 0
    });
    expect(projection.monthsToGoal).toBeNull();
    expect(projection.schedule).toHaveLength(1);
    expect(projection.validation.warnings).toContain('No funding date is available until a monthly contribution is entered.');
  });

  it('raises the planning reference for income uncertainty, one earner, and dependents', () => {
    expect(emergencyRiskReferenceMonths(defaultEmergencyFundInputs)).toBe(4);
    expect(emergencyRiskReferenceMonths({
      ...defaultEmergencyFundInputs,
      dependents: 3,
      incomeStability: 'uncertain'
    })).toBe(9.5);
  });

  it('compares three-month, six-month, and risk-reference targets', () => {
    const projection = calculateEmergencyFund(defaultEmergencyFundInputs);
    expect(projection.scenarios.map((scenario) => scenario.target)).toEqual([13_500, 27_000, 18_000]);
  });

  it('includes a one-time shock buffer in every target', () => {
    const projection = calculateEmergencyFund({ ...defaultEmergencyFundInputs, oneTimeBuffer: 2_000 });
    expect(projection.selectedTarget).toBe(29_000);
    expect(projection.riskReferenceTarget).toBe(20_000);
    expect(projection.scenarios[0].target).toBe(15_500);
  });

  it('rejects invalid coverage, dependents, enums, and balances', () => {
    expect(calculateEmergencyFund({ ...defaultEmergencyFundInputs, targetMonths: 0 }).validation.errors.targetMonths).toBeDefined();
    expect(calculateEmergencyFund({ ...defaultEmergencyFundInputs, dependents: 1.5 }).validation.errors.dependents).toBeDefined();
    expect(calculateEmergencyFund({ ...defaultEmergencyFundInputs, cashOnHand: -1 }).validation.errors.cashOnHand).toBeDefined();
    expect(calculateEmergencyFund({ ...defaultEmergencyFundInputs, incomeStability: 'unknown' as never }).validation.errors.incomeStability).toBeDefined();
  });

  it('exports the full modeled funding schedule', () => {
    const projection = calculateEmergencyFund({ ...defaultEmergencyFundInputs, shortTermDeposits: 0 });
    const csv = buildEmergencyFundCsv(projection);
    expect(csv).toContain('Month,Contribution,Ending reserve,Remaining gap\r\n');
    expect(csv).toContain('24,500.000000000000,27000.0000000000,0.00000000000000\r\n');
  });
});
