import { describe, expect, it } from 'vitest';

import {
  buildCalculatorScenarios,
  buildCalculatorStudioChart,
  buildScenarioValues,
  getCalculatorStudioMetadata,
  type CalculatorStudioChartType
} from './calculatorStudios';
import { calculateSeoCalculator, seoCalculators, type SeoCalculator } from './seoCalculators';

const internalStrategyPattern = /SEO|search-demand|traffic|ranking|ranked|long-tail|traffic cluster|acquisition/i;
const chartTypes = new Set<CalculatorStudioChartType>(['amortization', 'comparison', 'timeline', 'waterfall']);

function defaultValues(calculator: SeoCalculator): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
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
});
