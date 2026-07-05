import { describe, expect, it } from 'vitest';

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
  ['income-tax-india', 'Estimated net amount', 1_257_000, 'currency', 'INR'],
  ['salary-india', 'Estimated net amount', 1_872_000, 'currency', 'INR'],
  ['hra-exemption', 'Estimated HRA exemption', 480_000, 'currency', 'INR'],
  ['fd', 'Maturity value', 1_079_462.498636, 'currency', 'INR'],
  ['rd', 'Maturity value', 1_829_460.351817, 'currency', 'INR'],
  ['ppf', 'Estimated PPF maturity', 4_068_209.220288, 'currency', 'INR'],
  ['epf', 'Estimated EPF corpus', 4_390_704.844361, 'currency', 'INR'],
  ['nps', 'Estimated NPS corpus', 1_829_460.351817, 'currency', 'INR'],
  ['gratuity', 'Estimated gratuity', 553_846.153846, 'currency', 'INR'],
  ['mortgage', 'Monthly payment', 1_896.20407, 'currency', 'USD'],
  ['mortgage-affordability', 'Monthly payment', 2_270.093338, 'currency', 'USD'],
  ['mortgage-refinance', 'Monthly savings', 162.434207, 'currency', 'USD'],
  ['amortization', 'Monthly payment', 1_896.20407, 'currency', 'USD'],
  ['extra-mortgage-payment', 'Payoff time', 18.083333, 'years', 'USD'],
  ['rent-vs-buy', 'Estimated buy monthly cost', 5_389.474895, 'currency', 'USD'],
  ['credit-card-payoff', 'Payoff time', 2.5, 'years', 'USD'],
  ['debt-snowball-avalanche', 'Payoff time', 2.916667, 'years', 'USD'],
  ['auto-loan', 'Monthly payment', 633.638353, 'currency', 'USD'],
  ['personal-loan', 'Monthly payment', 387.682839, 'currency', 'USD'],
  ['student-loan-payoff', 'Payoff time', 7.916667, 'years', 'USD'],
  ['401k', 'Projected value', 275_633.443391, 'currency', 'USD'],
  ['roth-vs-traditional-ira', 'Estimated net amount', 5_460, 'currency', 'USD'],
  ['paycheck', 'Estimated annual take-home', 93_600, 'currency', 'USD'],
  ['income-tax-us', 'Estimated net amount', 94_800, 'currency', 'USD'],
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
    expect(result.metrics.find((metric) => metric.label === 'Estimated tax')?.value).toBe(26_000);
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
