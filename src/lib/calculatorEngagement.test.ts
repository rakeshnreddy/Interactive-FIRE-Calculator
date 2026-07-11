import { describe, expect, it } from 'vitest';

import {
  buildCalculatorInputImpacts,
  buildCalculatorShareUrl,
  buildCalculatorSummaryCsv,
  readCalculatorShareState
} from './calculatorEngagement';
import { buildCalculatorFollowUp } from './calculatorFollowUps';
import { buildCalculatorScenarios } from './calculatorStudios';
import { seoCalculators, type SeoCalculator } from './seoCalculators';

function defaultValues(calculator: SeoCalculator): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

describe('calculator engagement tools', () => {
  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s produces deterministic finite input-impact reads',
    (_slug, calculator) => {
      const impacts = buildCalculatorInputImpacts(calculator, defaultValues(calculator));

      expect(impacts).toHaveLength(calculator.inputs.length);
      impacts.forEach((impact) => {
        expect(calculator.inputs.some((input) => input.key === impact.inputKey)).toBe(true);
        expect(Number.isFinite(impact.baseOutput)).toBe(true);
        expect(Number.isFinite(impact.lowerOutput)).toBe(true);
        expect(Number.isFinite(impact.higherOutput)).toBe(true);
        expect(Number.isFinite(impact.magnitude)).toBe(true);
        expect(impact.magnitude).toBeGreaterThanOrEqual(0);
        expect(impact.summary.length).toBeGreaterThan(35);
      });
      expect(impacts.map((impact) => impact.magnitude)).toEqual(
        [...impacts].map((impact) => impact.magnitude).sort((left, right) => right - left)
      );
    }
  );

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s round-trips shareable inputs without introducing unknown values',
    (_slug, calculator) => {
      const values = defaultValues(calculator);
      const url = buildCalculatorShareUrl(calculator, values, 'optimistic', 'https://finpath.example');
      const state = readCalculatorShareState(calculator, new URL(url).search);

      expect(new URL(url).pathname).toBe(`/calculators/${calculator.slug}`);
      expect(state).toEqual({ scenarioId: 'optimistic', values });
      expect(Object.keys(state!.values)).toEqual(calculator.inputs.map((input) => input.key));
    }
  );

  it('clamps invalid shared values and defaults an unsupported scenario', () => {
    const calculator = seoCalculators.find((item) => item.slug === 'sip')!;
    const state = readCalculatorShareState(calculator, '?fp=1&scenario=extreme&monthly=-100&years=oops&rate=7');

    expect(state?.scenarioId).toBe('base');
    expect(state?.values.monthly).toBe(0);
    expect(state?.values.years).toBe(10);
    expect(state?.values.rate).toBe(7);
  });

  it('exports scenario inputs, results, and outcome drivers', () => {
    const calculator = seoCalculators.find((item) => item.slug === 'mortgage')!;
    const values = defaultValues(calculator);
    const scenarios = buildCalculatorScenarios(calculator, values);
    const csv = buildCalculatorSummaryCsv(
      calculator,
      scenarios,
      'base',
      buildCalculatorInputImpacts(calculator, values)
    );

    expect(csv).toContain('Section,Scenario,Label,Value,Unit');
    expect(csv).toContain('Input,Conservative,Loan amount');
    expect(csv).toContain('Result,Base,Monthly payment');
    expect(csv).toContain('Outcome driver,base');
  });

  it('builds linked and next-step dashboard follow-ups', () => {
    expect(buildCalculatorFollowUp({
      calculatorTitle: 'EMI Calculator',
      createdEntityId: 'account-1',
      createdEntityType: 'account',
      destinationType: 'account'
    })).toMatchObject({ label: 'Account linked', status: 'linked' });

    expect(buildCalculatorFollowUp({
      calculatorTitle: 'Budget Calculator',
      createdEntityId: null,
      createdEntityType: null,
      destinationType: 'transaction'
    })).toMatchObject({ label: 'Track cash flow', status: 'next-step' });
  });
});
