import type { SeoCalculator } from './seoCalculators';

export const optionalCalculatorInputKeys = new Set([
  'annualTopUp', 'extraAnnualPayment', 'extraMonthlyPayment',
  'annualTaxes', 'annualInsurance', 'monthlyHoa', 'monthlyMortgageInsurance'
]);
const positiveTermFormulas = new Set([
  'loan', 'amortization', 'apr', 'balloon-loan', 'biweekly-loan', 'arm', 'points',
  'fha-loan', 'va-loan', 'fha-conventional', 'flat-rate-loan', 'interest-only-loan',
  'loan-comparison', 'loan-eligibility', 'loan-prepayment', 'mortgage-recast',
  'refinance', 'rent-buy', 'investment-return', 'xirr'
]);
const financedLoanFormulas = new Set(['fha-loan', 'va-loan', 'fha-conventional']);
export type CalculatorInputOrigin = 'sample' | 'user' | 'restored' | 'shared' | 'saved';

/** Preserve attempted text. Missing historical optional additions mean omission;
 * missing required fields never acquire an example value. */
export function calculatorRawValues(calculator: SeoCalculator, record: Record<string, unknown>): Record<string, string> {
  return Object.fromEntries(calculator.inputs.map(input => {
    const value = record[input.key];
    return [input.key, typeof value === 'string' ? value : typeof value === 'number' ? String(value)
      : value === undefined && optionalCalculatorInputKeys.has(input.key) ? '0' : ''];
  }));
}

export function validateCalculatorInputs(calculator: SeoCalculator, raw: Record<string, string>): {
  values: Record<string, number> | null;
  errors: Record<string, string>;
} {
  const values: Record<string, number> = {};
  const errors: Record<string, string> = {};
  for (const input of calculator.inputs) {
    const text = raw[input.key]?.trim() ?? '';
    const value = Number(text);
    if (!text) errors[input.key] = `Enter ${input.label.toLowerCase()}${optionalCalculatorInputKeys.has(input.key) ? ' (use 0 to omit it)' : ''}.`;
    else if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text) || !Number.isFinite(value)) errors[input.key] = 'Enter a finite number, such as 1000 or 12.5.';
    else if (calculator.formula === 'ppf' && input.key === 'years' && value > 0 && !Number.isInteger(value)) errors[input.key] = 'PPF runs in whole financial years. Enter a whole number, such as 15 or 20.';
    else if (value < (input.min ?? 0)) errors[input.key] = `Use ${input.min ?? 0} or more.`;
    else if (input.max !== undefined && value > input.max) errors[input.key] = `Use ${input.max} or less.`;
    else if (calculator.formula === 'paycheck' && input.key === 'periods' && !Number.isInteger(value)) errors[input.key] = 'Enter a whole number of pay periods per year, such as 12, 24, 26, or 52.';
    else if (((positiveTermFormulas.has(calculator.formula) && ['years', 'compareYears', 'loanYears'].includes(input.key)) || (calculator.formula === 'arm' && input.key === 'fixedYears')) && value <= 0) errors[input.key] = 'Enter a number greater than 0.';
    else if (calculator.formula === 'investment-return' && input.key === 'initial' && value <= 0) errors[input.key] = 'Enter a number greater than 0.';
    else if (calculator.formula === 'rule-72' && input.key === 'rate' && value <= 0) errors[input.key] = 'Enter a number greater than 0.';
    else if (calculator.formula === 'roi' && input.key === 'cost' && value === 0) errors[input.key] = 'Enter a cost greater than zero to calculate ROI.';
    else values[input.key] = value;
  }

  if (Number.isFinite(values.homePrice) && Number.isFinite(values.downPayment) && !errors.homePrice && !errors.downPayment) {
    if (financedLoanFormulas.has(calculator.formula)) {
      if (values.homePrice <= 0) errors.homePrice = 'Enter a number greater than 0.';
      else if (values.downPayment >= values.homePrice) errors.downPayment = 'Down payment must be less than the home price.';
    } else if (values.downPayment > values.homePrice) {
      errors.downPayment = 'Down payment cannot exceed the home price.';
    }
  }
  if (calculator.formula === 'apr' && !errors.principal && !errors.closingCosts) {
    if (values.principal <= 0) errors.principal = 'Enter a number greater than 0.';
    else if (values.closingCosts >= values.principal) errors.closingCosts = 'Finance charges must be less than the loan amount.';
  }
  if (calculator.formula === 'arm' && !errors.years && !errors.fixedYears) {
    const totalMonths = Math.max(1, Math.round(values.years * 12));
    const fixedMonths = Math.round(values.fixedYears * 12);
    if (fixedMonths < 1) errors.fixedYears = 'Fixed period must be at least 1 month.';
    else if (values.fixedYears >= values.years || fixedMonths >= totalMonths) {
      errors.fixedYears = 'Fixed period must be shorter than the loan term.';
    }
  }
  if (calculator.formula === 'balloon-loan' && !errors.years && !errors.balloonYears) {
    const totalMonths = Math.max(1, Math.round(values.years * 12));
    const balloonMonths = Math.round(values.balloonYears * 12);
    if (values.balloonYears > 0 && balloonMonths < 1) {
      errors.balloonYears = 'Use 0 for an immediate balloon, or at least 1 month.';
    } else if (values.balloonYears > values.years || balloonMonths > totalMonths) {
      errors.balloonYears = 'Balloon due year cannot exceed the amortization term.';
    }
  }
  if (calculator.formula === 'xirr' && !errors.initial && !errors.monthly && values.initial <= 0 && values.monthly <= 0) {
    errors.initial = 'Enter a starting investment or a monthly contribution greater than 0.';
  }
  if (calculator.formula === 'retirement' && !errors.currentAge && !errors.retirementAge && values.retirementAge < values.currentAge) {
    errors.retirementAge = 'Enter a retirement age at or after your current age.';
  }

  return { values: Object.keys(errors).length ? null : values, errors };
}
