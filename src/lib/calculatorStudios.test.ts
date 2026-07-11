import { describe, expect, it } from 'vitest';

import {
  buildCalculatorScenarios,
  buildCalculatorDetailSchedule,
  buildCalculatorStudioChart,
  buildScenarioValues,
  getCalculatorStudioMetadata,
  type CalculatorStudioChartType
} from './calculatorStudios';
import { calculateSeoCalculator, seoCalculators, type SeoCalculator } from './seoCalculators';

const internalStrategyPattern = /SEO|search-demand|traffic|ranking|ranked|long-tail|traffic cluster|acquisition/i;
const chartTypes = new Set<CalculatorStudioChartType>(['amortization', 'comparison', 'timeline', 'waterfall']);
const phase21ScheduleSlugs = [
  'compound-interest',
  'savings-goal',
  'retirement',
  'investment-return',
  'sip',
  'step-up-sip',
  'sip-goal',
  'lumpsum-mutual-fund',
  'swp',
  'fd',
  'rd',
  'ppf',
  'epf',
  'nps',
  'gratuity',
  '401k',
  'social-security-break-even',
  'rmd',
  'cagr',
  'xirr',
  'inflation',
  'rule-of-72',
  'cd',
  'hysa'
] as const;

function defaultValues(calculator: SeoCalculator): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

function calculatorBySlug(slug: string): SeoCalculator {
  const calculator = seoCalculators.find((candidate) => candidate.slug === slug);
  expect(calculator).toBeDefined();
  return calculator!;
}

function lastNumericValue(slug: string, key: string): number {
  const calculator = calculatorBySlug(slug);
  const values = defaultValues(calculator);
  const result = calculateSeoCalculator(calculator, values);
  const schedule = buildCalculatorDetailSchedule(calculator, values, result);

  expect(schedule).not.toBeNull();
  const lastRow = schedule!.rows.at(-1);
  expect(lastRow).toBeDefined();
  const value = Number(lastRow!.values[key]);
  expect(Number.isFinite(value)).toBe(true);
  return value;
}

describe('calculator decision studios', () => {
  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s has studio metadata, a route-specific example, and related calculators',
    (_slug, calculator) => {
      const metadata = getCalculatorStudioMetadata(calculator);

      expect(metadata.studio).toMatch(/Studio$/);
      expect(metadata.summary.length).toBeGreaterThan(40);
      expect(metadata.scenarioFocus.length).toBeGreaterThan(40);
      expect(chartTypes.has(metadata.chartType)).toBe(true);

      expect(metadata.example.title).toContain(calculator.title);
      expect(metadata.example.description).toContain(calculator.title.toLowerCase());
      expect(metadata.example.insight.length).toBeGreaterThan(40);
      expect(Object.keys(metadata.example.values)).toEqual(calculator.inputs.map((input) => input.key));

      expect(metadata.relatedCalculators.length).toBeGreaterThan(0);
      metadata.relatedCalculators.forEach((related) => {
        expect(related.slug).not.toBe(calculator.slug);
        expect(related.path).toBe(`/calculators/${related.slug}`);
        expect(seoCalculators.some((candidate) => candidate.slug === related.slug)).toBe(true);
        expect(related.reason.length).toBeGreaterThan(20);
      });

      const publicCopy = [
        metadata.summary,
        metadata.scenarioFocus,
        metadata.chartTitle,
        metadata.chartDescription,
        metadata.example.title,
        metadata.example.description,
        metadata.example.insight,
        ...metadata.relatedCalculators.flatMap((related) => [related.title, related.reason])
      ].join(' ');

      expect(publicCopy).not.toMatch(internalStrategyPattern);
    }
  );

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s builds finite conservative, base, and optimistic scenarios',
    (_slug, calculator) => {
      const values = defaultValues(calculator);
      const scenarios = buildCalculatorScenarios(calculator, values);

      expect(scenarios.map((scenario) => scenario.id)).toEqual(['conservative', 'base', 'optimistic']);
      expect(scenarios[1].values).toEqual(values);
      expect(scenarios.some((scenario) => JSON.stringify(scenario.values) !== JSON.stringify(values))).toBe(true);

      scenarios.forEach((scenario) => {
        expect(scenario.description.length).toBeGreaterThan(30);
        expect(Object.keys(scenario.values)).toEqual(calculator.inputs.map((input) => input.key));
        scenario.result.metrics.forEach((metric) => {
          expect(Number.isFinite(metric.value)).toBe(true);
        });
      });

      expect(defaultValues(calculator)).toEqual(values);
    }
  );

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s builds chart-ready studio data',
    (_slug, calculator) => {
      const values = defaultValues(calculator);
      const chart = buildCalculatorStudioChart(calculator, values, calculateSeoCalculator(calculator, values));

      expect(chartTypes.has(chart.type)).toBe(true);
      expect(chart.title.length).toBeGreaterThan(10);
      expect(chart.description.length).toBeGreaterThan(30);
      expect(chart.summary.length).toBeGreaterThan(40);
      expect(chart.legend.primary.length).toBeGreaterThanOrEqual(3);
      expect(chart.entries.length).toBeGreaterThanOrEqual(3);
      chart.entries.forEach((entry) => {
        expect(entry.label.length).toBeGreaterThan(0);
        expect(Number.isFinite(entry.primary)).toBe(true);
        if (entry.secondary !== undefined) {
          expect(Number.isFinite(entry.secondary)).toBe(true);
        }
      });
    }
  );

  it('marks amortization-style routes with schedule-ready chart primitives', () => {
    const amortization = seoCalculators.find((calculator) => calculator.slug === 'amortization');
    expect(amortization).toBeDefined();

    const chart = buildCalculatorStudioChart(amortization!, defaultValues(amortization!));

    expect(chart.type).toBe('amortization');
    expect(chart.legend.primary).toMatch(/remaining balance/i);
    expect(chart.legend.secondary).toMatch(/cumulative interest/i);
    expect(chart.entries.some((entry) => entry.secondary !== undefined)).toBe(true);
  });

  it('keeps scenario adjustments bounded by input constraints', () => {
    const calculator = seoCalculators.find((item) => item.slug === 'sip');
    expect(calculator).toBeDefined();

    const values = defaultValues(calculator!);
    const conservative = buildScenarioValues(calculator!, values, 'conservative');
    const optimistic = buildScenarioValues(calculator!, values, 'optimistic');

    calculator!.inputs.forEach((input) => {
      expect(conservative[input.key]).toBeGreaterThanOrEqual(input.min ?? 0);
      expect(optimistic[input.key]).toBeGreaterThanOrEqual(input.min ?? 0);
    });
    expect(optimistic.monthly).toBeGreaterThan(conservative.monthly);
  });

  it.each(phase21ScheduleSlugs)('%s builds an optional detailed schedule table', (slug) => {
    const calculator = calculatorBySlug(slug);
    const values = defaultValues(calculator);
    const result = calculateSeoCalculator(calculator, values);
    const schedule = buildCalculatorDetailSchedule(calculator, values, result);

    expect(schedule).not.toBeNull();
    expect(schedule!.title.length).toBeGreaterThan(8);
    expect(schedule!.description.length).toBeGreaterThan(30);
    expect(schedule!.summary.length).toBeGreaterThan(30);
    expect(schedule!.columns.length).toBeGreaterThanOrEqual(2);
    expect(schedule!.rows.length).toBeGreaterThan(0);

    schedule!.rows.forEach((row) => {
      schedule!.columns.forEach((column) => {
        expect(row.values[column.key]).not.toBeUndefined();
      });
    });
  });

  it.each([
    ['compound-interest', 'balance'],
    ['sip', 'balance'],
    ['step-up-sip', 'balance'],
    ['lumpsum-mutual-fund', 'balance'],
    ['fd', 'balance'],
    ['rd', 'balance'],
    ['ppf', 'balance'],
    ['epf', 'balance'],
    ['nps', 'balance'],
    ['401k', 'balance'],
    ['hysa', 'balance'],
    ['retirement', 'balance']
  ])('%s detailed schedule reconciles with the headline projected value', (slug, scheduleKey) => {
    const calculator = calculatorBySlug(slug);
    const result = calculateSeoCalculator(calculator, defaultValues(calculator));
    const finalScheduleValue = lastNumericValue(slug, scheduleKey);

    expect(finalScheduleValue).toBeCloseTo(result.metrics[0].value, 3);
  });

  it('savings goal schedule ends at the target with the calculated monthly savings', () => {
    const finalGap = lastNumericValue('savings-goal', 'gap');

    expect(finalGap).toBeCloseTo(0, 3);
  });

  it('SWP schedule includes annual withdrawals and a runway balance', () => {
    const calculator = calculatorBySlug('swp');
    const schedule = buildCalculatorDetailSchedule(calculator, defaultValues(calculator));

    expect(schedule?.columns.map((column) => column.key)).toContain('withdrawals');
    expect(schedule?.rows[0].values.withdrawals).toBeGreaterThan(0);
    expect(schedule?.rows.at(-1)?.values.balance).toBeDefined();
  });

  it('retirement schedule uses a current-position row when retirement age is already reached', () => {
    const calculator = calculatorBySlug('retirement');
    const schedule = buildCalculatorDetailSchedule(calculator, {
      annualIncome: 80_000,
      currentAge: 60,
      currentSavings: 500_000,
      monthly: 1_200,
      rate: 7,
      retirementAge: 60,
      withdrawalRate: 4
    });

    expect(schedule?.rows).toHaveLength(1);
    expect(schedule?.rows[0].values.year).toBe('Now');
    expect(schedule?.rows[0].values.deposits).toBe(0);
    expect(schedule?.rows[0].values.balance).toBe(500_000);
  });

  it('skips detailed period tables when a calculator has no repeated period to audit yet', () => {
    const calculator = calculatorBySlug('net-worth');

    expect(buildCalculatorDetailSchedule(calculator, defaultValues(calculator))).toBeNull();
  });
});
