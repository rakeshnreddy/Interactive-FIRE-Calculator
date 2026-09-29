import { describe, expect, it } from 'vitest';
import { calculateSeoCalculator, seoCalculators, type SeoCalculator } from './seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios, buildCalculatorStudioChart } from './calculatorStudios';

// Every registry calculator must produce finite, displayable numbers for its defaults and for the
// edge inputs a real visitor can type: all zeros, zero rate and term, very large amounts, and
// the maximum rate. A NaN, Infinity or thrown error here is a product defect.

const defaults = (calculator: SeoCalculator) => Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));

const variants = (calculator: SeoCalculator): Array<[string, Record<string, number>]> => {
  const base = defaults(calculator);
  const zeros = Object.fromEntries(Object.keys(base).map((key) => [key, 0]));
  const zeroRateAndTerm = { ...base, rate: 0, years: 0, months: 0, term: 0 };
  const huge = Object.fromEntries(calculator.inputs.map((input) => [input.key, input.type === 'percent' ? 50 : input.type === 'currency' ? 1_000_000_000 : Math.min(input.max ?? 100, 100)]));
  const tiny = Object.fromEntries(calculator.inputs.map((input) => [input.key, input.type === 'percent' ? 0.01 : 1]));
  return [
    ['defaults', base],
    ['all zeros', zeros],
    ['zero rate and term', zeroRateAndTerm],
    ['very large', huge],
    ['tiny', tiny]
  ];
};

const badNumbers = (result: ReturnType<typeof calculateSeoCalculator>) =>
  result.metrics.filter((metric) => !Number.isFinite(metric.value)).map((metric) => `${metric.label}=${metric.value}`);

describe('calculator registry audit', () => {
  for (const calculator of seoCalculators) {
    describe(calculator.slug, () => {
      it('has sensible defaults and copy', () => {
        expect(calculator.inputs.length).toBeGreaterThan(0);
        for (const input of calculator.inputs) {
          expect(Number.isFinite(input.defaultValue), `${input.key} default`).toBe(true);
          expect(input.label.trim().length).toBeGreaterThan(0);
        }
        const publicCopy = [calculator.description, calculator.explanation, ...calculator.assumptions, ...calculator.faq.flatMap((item) => [item.question, item.answer])].join(' ');
        expect(publicCopy).not.toMatch(/\bSEO\b|traffic|ranking|phase \d|Model v\d|planning shell|display precision|conversion funnel/i);
        expect(calculator.faq.length).toBeGreaterThan(0);
      });

      for (const [name, values] of variants(calculator)) {
        it(`returns finite metrics for ${name}`, () => {
          const result = calculateSeoCalculator(calculator, values);
          expect(result.metrics.length).toBeGreaterThan(0);
          expect(badNumbers(result), `${name}: ${JSON.stringify(values)}`).toEqual([]);
          expect(result.narrative.trim().length).toBeGreaterThan(0);
        });
      }

      it('builds scenarios, chart and schedule without throwing', () => {
        const values = defaults(calculator);
        const result = calculateSeoCalculator(calculator, values);
        expect(() => buildCalculatorScenarios(calculator, values)).not.toThrow();
        expect(() => buildCalculatorStudioChart(calculator, values, result)).not.toThrow();
        expect(() => buildCalculatorDetailSchedule(calculator, values, result)).not.toThrow();
      });
    });
  }
});
