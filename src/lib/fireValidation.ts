// Field-level validation for the FIRE calculator (B36). Results are withheld while any issue exists.
// Blank required values stay blank (never silently 0); a deliberately typed 0 is valid.

export type FireFormValues = {
  mode: 'fire-number' | 'withdrawal-income';
  currentAge: number;
  retirementAge: number;
  planEndAge: number;
  annualExpense: number; // NaN when blank
  initialPortfolio: number; // NaN when blank
  returnPercent: string;
  inflationPercent: string;
  annualSavings: string; // optional
  savingsGrowthPercent: string; // optional
};

export type FireFieldKey = 'currentAge' | 'retirementAge' | 'planEndAge' | 'annualExpense' | 'initialPortfolio' | 'return' | 'inflation' | 'annualSavings' | 'savingsGrowth';
export type FireValidation = { ok: boolean; ratesMissing: boolean; issues: Partial<Record<FireFieldKey, string>> };

const isBlank = (value: string) => value.trim() === '';
const parsePercent = (value: string) => (isBlank(value) ? Number.NaN : Number(value));

export function validateFireForm(values: FireFormValues): FireValidation {
  const issues: FireValidation['issues'] = {};
  const { currentAge, retirementAge, planEndAge } = values;

  for (const [key, age] of [['currentAge', currentAge], ['retirementAge', retirementAge], ['planEndAge', planEndAge]] as const) {
    if (!Number.isInteger(age) || age < 0 || age > 120) issues[key] = 'Enter a whole age from 0 to 120.';
  }
  if (!issues.currentAge && !issues.retirementAge && retirementAge <= currentAge) {
    issues.retirementAge = 'Retirement age must be after your current age.';
  }
  if (!issues.retirementAge && !issues.planEndAge && planEndAge <= retirementAge) {
    issues.planEndAge = 'Plan end age must be after retirement age.';
  }

  const expenseRequired = values.mode === 'fire-number';
  if (!Number.isFinite(values.annualExpense)) {
    if (expenseRequired) issues.annualExpense = 'Enter your annual spending.';
  } else if (values.annualExpense < 0) {
    issues.annualExpense = 'Spending cannot be negative.';
  } else if (expenseRequired && values.annualExpense === 0) {
    issues.annualExpense = 'Enter annual spending above 0 to size a FIRE number.';
  }

  if (!Number.isFinite(values.initialPortfolio)) {
    issues.initialPortfolio = values.mode === 'withdrawal-income' ? 'Enter the portfolio to test.' : 'Enter your current portfolio (0 is fine).';
  } else if (values.initialPortfolio < 0) {
    issues.initialPortfolio = 'Portfolio cannot be negative.';
  }

  const returnValue = parsePercent(values.returnPercent);
  const inflationValue = parsePercent(values.inflationPercent);
  const ratesMissing = isBlank(values.returnPercent) || isBlank(values.inflationPercent);
  if (isBlank(values.returnPercent)) issues.return = 'Enter an expected annual return (0 is allowed).';
  else if (!Number.isFinite(returnValue) || returnValue < -50 || returnValue > 50) issues.return = 'Use a return between -50% and 50% a year.';
  if (isBlank(values.inflationPercent)) issues.inflation = 'Enter expected inflation (0 is allowed).';
  else if (!Number.isFinite(inflationValue) || inflationValue < -10 || inflationValue > 30) issues.inflation = 'Use inflation between -10% and 30% a year.';

  if (!isBlank(values.annualSavings)) {
    const savings = Number(values.annualSavings);
    if (!Number.isFinite(savings) || savings < 0) issues.annualSavings = 'Savings must be 0 or more.';
  }
  if (!isBlank(values.savingsGrowthPercent)) {
    const growth = Number(values.savingsGrowthPercent);
    if (!Number.isFinite(growth) || growth < -20 || growth > 30) issues.savingsGrowth = 'Use savings growth between -20% and 30% a year.';
  }

  return { ok: Object.keys(issues).length === 0, ratesMissing, issues };
}
