import { describe, expect, it } from 'vitest';

import { getCalculatorQualitySpec } from './calculatorQuality';
import {
  calculateSeoCalculator,
  calculatorCurrency,
  findSeoCalculator,
  seoCalculators,
  type SeoCalculator
} from './seoCalculators';

const expectedOutputs = [
  ['compound-interest', 'Projected value', 113_669.419936, 'currency', 'USD'],
  ['savings-goal', 'Monthly savings needed', 428.600434, 'currency', 'USD'],
  ['net-worth', 'Estimated net worth', 175_000, 'currency', 'USD'],
  ['budget', 'Monthly surplus', 2_500, 'currency', 'USD'],
  ['emergency-fund', 'Emergency fund target', 27_000, 'currency', 'USD'],
  ['retirement', 'Projected retirement savings', 1_514_829.29564, 'currency', 'USD'],
  ['debt-payoff', 'Payoff time', 2.583333, 'years', 'USD'],
  ['investment-return', 'Annualized return', 0.124746, 'percent', 'USD'],
  ['sip', 'Projected corpus', 1_829_460.351817, 'currency', 'INR'],
  ['step-up-sip', 'Projected corpus', 2_739_652.891105, 'currency', 'INR'],
  ['sip-goal', 'Monthly savings needed', 54_660.927689, 'currency', 'INR'],
  ['lumpsum-mutual-fund', 'Maturity value', 1_079_462.498636, 'currency', 'INR'],
  ['swp', 'Estimated withdrawal runway', 51.416667, 'years', 'INR'],
  ['emi', 'Monthly payment', 25_335.15475, 'currency', 'INR'],
  ['home-loan-emi', 'Monthly payment', 52_069.394002, 'currency', 'INR'],
  ['car-loan-emi', 'Monthly payment', 21_001.86131, 'currency', 'INR'],
  ['personal-loan-emi', 'Monthly payment', 11_376.536522, 'currency', 'INR'],
  ['income-tax-india', 'Estimated lower-regime net income', 1_390_800, 'currency', 'INR'],
  ['salary-india', 'Estimated annual take-home', 2_004_288, 'currency', 'INR'],
  ['hra-exemption', 'Estimated HRA exemption', 480_000, 'currency', 'INR'],
  ['fd', 'Maturity value', 1_079_462.498636, 'currency', 'INR'],
  ['rd', 'Maturity value', 1_829_460.351817, 'currency', 'INR'],
  ['ppf', 'Estimated PPF maturity', 4_068_209.220288, 'currency', 'INR'],
  ['epf', 'Estimated EPF corpus', 4_390_704.844361, 'currency', 'INR'],
  ['nps', 'Estimated NPS corpus', 1_829_460.351817, 'currency', 'INR'],
  ['gratuity', 'Estimated gratuity', 553_846.153846, 'currency', 'INR'],
  ['home-loan-prepayment', 'Estimated interest saved', 1_120_153.669901, 'currency', 'INR'],
  ['home-loan-foreclosure', 'Estimated interest saved', 1_335_755.203987, 'currency', 'INR'],
  ['home-loan-balance-transfer-india', 'Monthly savings', 1_721.24114, 'currency', 'INR'],
  ['flat-vs-reducing-rate', 'Flat-rate EMI', 12_500, 'currency', 'INR'],
  ['loan-eligibility-india', 'Eligible loan amount', 4_321_156.493422, 'currency', 'INR'],
  ['stamp-duty-registration', 'Stamp duty and registration cost', 560_000, 'currency', 'INR'],
  ['mortgage', 'Monthly payment', 1_896.20407, 'currency', 'USD'],
  ['mortgage-affordability', 'Monthly payment', 2_270.093338, 'currency', 'USD'],
  ['mortgage-refinance', 'Monthly savings', 162.434207, 'currency', 'USD'],
  ['amortization', 'Monthly payment', 1_896.20407, 'currency', 'USD'],
  ['extra-mortgage-payment', 'Payoff time', 18.083333, 'years', 'USD'],
  ['mortgage-payoff', 'Payoff time', 18.083333, 'years', 'USD'],
  ['biweekly-mortgage-payment', 'Biweekly payment', 948.102035, 'currency', 'USD'],
  ['mortgage-recast', 'Monthly payment after recast', 1_688.017903, 'currency', 'USD'],
  ['mortgage-points', 'Monthly savings', 43.937447, 'currency', 'USD'],
  ['15-vs-30-year-mortgage', 'Option B monthly payment', 2_270.093338, 'currency', 'USD'],
  ['arm-mortgage', 'Monthly payment', 2_042.504998, 'currency', 'USD'],
  ['interest-only-mortgage', 'Interest-only payment', 1_625, 'currency', 'USD'],
  ['balloon-loan', 'Balloon balance', 234_027.443604, 'currency', 'USD'],
  ['closing-costs', 'Estimated cash to close', 103_500, 'currency', 'USD'],
  ['escrow', 'Monthly escrow estimate', 600, 'currency', 'USD'],
  ['debt-to-income', 'Debt-to-income ratio', 0.422222, 'percent', 'USD'],
  ['loan-comparison', 'Option B monthly payment', 1_995.907486, 'currency', 'USD'],
  ['apr', 'Estimated APR', 0.066953, 'percent', 'USD'],
  ['home-equity-loan', 'Monthly payment', 606.637972, 'currency', 'USD'],
  ['fha-loan', 'Estimated FHA monthly payment', 2_326.971003, 'currency', 'USD'],
  ['va-loan', 'Estimated VA monthly payment', 2_201.342921, 'currency', 'USD'],
  ['fha-vs-conventional', 'FHA monthly payment', 2_290.80047, 'currency', 'USD'],
  ['rent-vs-buy', 'Estimated buy monthly cost', 5_389.474895, 'currency', 'USD'],
  ['credit-card-payoff', 'Payoff time', 2.5, 'years', 'USD'],
  ['debt-snowball-avalanche', 'Avalanche interest savings', 925.930846, 'currency', 'USD'],
  ['auto-loan', 'Monthly payment', 633.638353, 'currency', 'USD'],
  ['personal-loan', 'Monthly payment', 387.682839, 'currency', 'USD'],
  ['student-loan-payoff', 'Payoff time', 7.916667, 'years', 'USD'],
  ['401k', 'Projected value', 275_633.443391, 'currency', 'USD'],
  ['roth-vs-traditional-ira', 'Roth after-tax value', 37_992.028481, 'currency', 'USD'],
  ['paycheck', 'Estimated annual take-home', 94_380, 'currency', 'USD'],
  ['income-tax-us', 'Estimated after-tax income', 97_630, 'currency', 'USD'],
  ['social-security-break-even', 'Break-even years after delaying', 11.25, 'years', 'USD'],
  ['rmd', 'Estimated RMD', 30_188.679245, 'currency', 'USD'],
  ['cagr', 'Annualized return', 0.124746, 'percent', 'USD'],
  ['xirr', 'Approximate annualized return', 0.04564, 'percent', 'USD'],
  ['inflation', 'Future cost', 14_802.442849, 'currency', 'USD'],
  ['rule-of-72', 'Years to double', 9, 'years', 'USD'],
  ['capital-gains-tax', 'Estimated net amount', 42_500, 'currency', 'USD'],
  ['gst', 'Total including GST', 11_800, 'currency', 'INR'],
  ['tds', 'Estimated net amount', 90_000, 'currency', 'INR'],
  ['down-payment', 'Down payment target', 90_000, 'currency', 'USD'],
  ['pmi', 'Estimated monthly PMI', 202.5, 'currency', 'USD'],
  ['heloc', 'Monthly payment', 619.928444, 'currency', 'USD'],
  ['balance-transfer', 'Estimated payoff cost savings', 1_586.755012, 'currency', 'USD'],
  ['cd', 'Maturity value', 10_920.25, 'currency', 'USD'],
  ['hysa', 'Projected value', 30_519.03374, 'currency', 'USD'],
  ['life-insurance-needs', 'Coverage need', 1_050_000, 'currency', 'USD'],
  ['lease-vs-buy', 'Estimated buy monthly cost', 718.38734, 'currency', 'USD'],
  ['roi', 'ROI', 0.25, 'percent', 'USD']
] as const;

function defaultValues(calculator: SeoCalculator) {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

function getCalculator(slug: string) {
  const calculator = findSeoCalculator(`/calculators/${slug}`);
  expect(calculator).not.toBeNull();
  return calculator!;
}

describe('calculator registry', () => {
  it('includes every expected public calculator route', () => {
    expect(seoCalculators.map((calculator) => calculator.slug)).toEqual(expectedOutputs.map(([slug]) => slug));
  });

  it('keeps stable high-intent public routes available', () => {
    expect(findSeoCalculator('/calculators/compound-interest')?.title).toBe('Compound Interest Calculator');
    expect(findSeoCalculator('/calculators/sip')?.title).toBe('SIP Calculator');
    expect(findSeoCalculator('/calculators/mortgage')?.title).toBe('Mortgage Payment Calculator');
    expect(findSeoCalculator('/calculators/rule-of-72')?.title).toBe('Rule of 72 Calculator');
  });

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s has user-facing guidance and no internal strategy copy',
    (_slug, calculator) => {
      const publicCopy = [
        calculator.title,
        calculator.description,
        calculator.explanation,
        calculator.h1,
        ...calculator.inputs.map((input) => `${input.label} ${input.helper ?? ''}`),
        ...calculator.faq.flatMap((item) => [item.question, item.answer])
      ].join(' ');

      expect(calculator.description.length).toBeGreaterThan(30);
      expect(calculator.explanation.length).toBeGreaterThan(40);
      expect(calculator.inputs.every((input) => (input.helper ?? '').length > 20)).toBe(true);
      expect(calculator.faq.length).toBeGreaterThanOrEqual(2);
      expect(publicCopy).not.toMatch(/SEO|search-demand|traffic cluster|long-tail|US-focused|India-focused/i);
    }
  );

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s has a comprehensive implementation quality contract',
    (_slug, calculator) => {
      const spec = getCalculatorQualitySpec(calculator);

      expect(spec.slug).toBe(calculator.slug);
      expect(spec.title).toBe(calculator.title);
      expect(spec.inputRequirements).toHaveLength(calculator.inputs.length);
      expect(spec.calculationRequirements.length).toBeGreaterThanOrEqual(3);
      expect(spec.visualRequirements.length).toBeGreaterThanOrEqual(3);
      expect(spec.interpretationChecks.length).toBeGreaterThanOrEqual(3);
      expect(spec.scenarioRequirements.length).toBeGreaterThanOrEqual(2);
      expect(spec.validationRequirements.length).toBeGreaterThanOrEqual(3);
      expect(spec.doneWhen.length).toBeGreaterThanOrEqual(6);
      expect(spec.conversionExpectation).toContain(calculator.conversionLabel);
    }
  );

  it('requires the amortization route to become a real schedule calculator', () => {
    const calculator = getCalculator('amortization');
    const spec = getCalculatorQualitySpec(calculator);
    const requirements = [
      ...spec.calculationRequirements,
      ...spec.visualRequirements
    ].join(' ');

    expect(requirements).toMatch(/month-by-month/i);
    expect(requirements).toMatch(/yearly/i);
    expect(requirements).toMatch(/cumulative interest/i);
  });
});

describe('calculateSeoCalculator', () => {
  it.each(expectedOutputs)('%s returns %s with the expected unit', (slug, label, value, valueType, currency) => {
    const calculator = getCalculator(slug);
    const result = calculateSeoCalculator(calculator, defaultValues(calculator));
    const main = result.metrics[0];

    expect(main).toMatchObject({ label, valueType });
    expect(main.value).toBeCloseTo(value, 4);
    expect(calculatorCurrency(calculator)).toBe(currency);
    expect(result.narrative.length).toBeGreaterThan(20);
  });

  it('handles zero-rate loan payments without interest', () => {
    const calculator = getCalculator('emi');
    const result = calculateSeoCalculator(calculator, {
      principal: 120_000,
      rate: 0,
      years: 10
    });

    expect(result.metrics[0]).toMatchObject({ label: 'Monthly payment', value: 1_000 });
    expect(result.metrics.find((metric) => metric.label === 'Total interest')?.value).toBe(0);
  });

  it('handles zero-rate PPF contributions without dividing by zero', () => {
    const calculator = getCalculator('ppf');
    const result = calculateSeoCalculator(calculator, {
      annual: 150_000,
      rate: 0,
      years: 15
    });

    expect(result.metrics[0].value).toBe(2_250_000);
    expect(result.metrics.find((metric) => metric.label === 'Estimated interest')?.value).toBe(0);
  });

  it('calculates paycheck estimates from annualized gross pay', () => {
    const calculator = getCalculator('paycheck');
    const result = calculateSeoCalculator(calculator, {
      effectiveRate: 25,
      income: 4_000,
      periods: 26
    });

    expect(result.metrics[0].value).toBe(78_000);
    expect(result.metrics.find((metric) => metric.label === 'Estimated withholding')?.value).toBe(26_000);
  });

  it('compares India old and new regime estimates from slab assumptions', () => {
    const calculator = getCalculator('income-tax-india');
    const result = calculateSeoCalculator(calculator, {
      deductions: 150_000,
      income: 1_500_000
    });

    expect(result.metrics[0]).toMatchObject({ label: 'Estimated lower-regime net income', value: 1_390_800 });
    expect(result.metrics.find((metric) => metric.label === 'Old regime tax estimate')?.value).toBe(226_200);
    expect(result.metrics.find((metric) => metric.label === 'New regime tax estimate')?.value).toBe(109_200);
  });

  it('uses US 2026 single-filer brackets before the state placeholder', () => {
    const calculator = getCalculator('income-tax-us');
    const result = calculateSeoCalculator(calculator, {
      deductions: 0,
      income: 120_000,
      stateRate: 4
    });

    expect(result.metrics[0]).toMatchObject({ label: 'Estimated after-tax income', value: 97_630 });
    expect(result.metrics.find((metric) => metric.label === 'Estimated federal tax')?.value).toBe(17_570);
    expect(result.metrics.find((metric) => metric.label === 'State/local placeholder tax')?.value).toBe(4_800);
  });

  it('uses the payment input when comparing balance transfers', () => {
    const calculator = getCalculator('balance-transfer');
    const slowPayoff = calculateSeoCalculator(calculator, {
      balance: 8_000,
      currentRate: 22,
      feeRate: 3,
      newRate: 3,
      payment: 250
    });
    const fastPayoff = calculateSeoCalculator(calculator, {
      balance: 8_000,
      currentRate: 22,
      feeRate: 3,
      newRate: 3,
      payment: 800
    });

    expect(slowPayoff.metrics[0].value).toBeGreaterThan(fastPayoff.metrics[0].value);
    expect(fastPayoff.metrics.find((metric) => metric.label === 'Promo payoff months')?.value).toBeLessThan(12);
  });

  it('keeps unsustainable debt payoff bounded instead of looping indefinitely', () => {
    const calculator = getCalculator('credit-card-payoff');
    const result = calculateSeoCalculator(calculator, {
      balance: 10_000,
      payment: 50,
      rate: 30
    });

    expect(result.metrics[0]).toMatchObject({ label: 'Payoff time', value: 100, valueType: 'years' });
    expect(result.metrics.find((metric) => metric.label === 'Months to payoff')?.value).toBe(1_200);
  });
});
