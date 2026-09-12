import { describe, expect, it } from 'vitest';

import { getCalculatorQualitySpec } from './calculatorQuality';
import {
  buildCalculatorStudioChart,
  getCalculatorStudioMetadata
} from './calculatorStudios';
import {
  calculateSeoCalculator,
  seoCalculators,
  type SeoCalculator
} from './seoCalculators';

const internalRoadmapPattern =
  /Phase \d+|primitive to expand|comprehensive tax phases|once Phase|Connect loan results to a liability account|Route users toward a saved investment goal|Connect the result to a saved retirement plan|Explain the next tracking workflow/i;

const internalStrategyPattern =
  /SEO|search-demand|traffic cluster|long-tail|acquisition keyword/i;

function defaultValues(calculator: SeoCalculator): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

describe('calculator quality and studio copy guards (B09)', () => {
  it.each(seoCalculators.map((c) => [c.slug, c] as const))(
    '%s quality specification contains no internal roadmap or developer directives',
    (_slug, calculator) => {
      const spec = getCalculatorQualitySpec(calculator);

      const allCopy = [
        spec.decisionUsefulness,
        ...spec.calculationRequirements,
        ...spec.interpretationChecks,
        ...spec.scenarioRequirements,
        ...spec.validationRequirements,
        ...spec.doneWhen
      ].join(' ');

      expect(allCopy).not.toMatch(internalRoadmapPattern);
      expect(allCopy).not.toMatch(internalStrategyPattern);
    }
  );

  it.each(seoCalculators.map((c) => [c.slug, c] as const))(
    '%s studio metadata and chart summary contain no internal phase or primitive copy',
    (_slug, calculator) => {
      const metadata = getCalculatorStudioMetadata(calculator);
      const values = defaultValues(calculator);
      const result = calculateSeoCalculator(calculator, values);
      const chart = buildCalculatorStudioChart(calculator, values, result);

      const combinedText = [
        metadata.summary,
        metadata.scenarioFocus,
        metadata.chartTitle,
        metadata.chartDescription,
        chart.summary
      ].join(' ');

      expect(combinedText).not.toMatch(internalRoadmapPattern);
      expect(combinedText).not.toMatch(internalStrategyPattern);
    }
  );

  it('specifically verifies mortgage and amortization have clean user-facing decision checks and chart copy', () => {
    const mortgage = seoCalculators.find((c) => c.slug === 'mortgage')!;
    const amortization = seoCalculators.find((c) => c.slug === 'amortization')!;

    const mortgageSpec = getCalculatorQualitySpec(mortgage);
    const mortgageChecks = mortgageSpec.interpretationChecks.join(' ');
    expect(mortgageChecks).not.toContain('Connect loan results to a liability account');
    expect(mortgageChecks).toContain('Compare loan payoff options against current monthly cash flow and repayment goals.');

    const amortMetadata = getCalculatorStudioMetadata(amortization);
    const amortValues = defaultValues(amortization);
    const amortResult = calculateSeoCalculator(amortization, amortValues);
    const amortChart = buildCalculatorStudioChart(amortization, amortValues, amortResult);

    expect(amortChart.summary).not.toContain('Phase 22');
    expect(amortChart.summary).not.toContain('primitive to expand');
    expect(amortChart.summary).toContain('balance declines and interest accumulates');
  });
});
