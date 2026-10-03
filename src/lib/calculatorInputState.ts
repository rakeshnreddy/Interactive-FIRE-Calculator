import type { SeoCalculator } from './seoCalculators';

export const optionalCalculatorInputKeys = new Set([
  'annualTopUp', 'extraAnnualPayment', 'extraMonthlyPayment',
  'annualTaxes', 'annualInsurance', 'monthlyHoa', 'monthlyMortgageInsurance'
]);
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
    else if (value < (input.min ?? 0)) errors[input.key] = `Use ${input.min ?? 0} or more.`;
    else if (input.max !== undefined && value > input.max) errors[input.key] = `Use ${input.max} or less.`;
    else if ((['refinance', 'points'].includes(calculator.formula) || calculator.slug === 'mortgage-affordability') && input.key === 'years' && value <= 0) errors[input.key] = 'Enter a loan term greater than zero.';
    else if (calculator.formula === 'roi' && input.key === 'cost' && value === 0) errors[input.key] = 'Enter a cost greater than zero to calculate ROI.';
    else values[input.key] = value;
  }
  return { values: Object.keys(errors).length ? null : values, errors };
}
