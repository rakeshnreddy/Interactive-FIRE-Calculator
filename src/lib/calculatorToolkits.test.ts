import { describe, expect, it } from 'vitest';
import {
  calculatorToolkits,
  featuredToolkitCalculators,
  getCalculatorToolkit
} from './calculatorToolkits';
import { seoCalculators } from './seoCalculators';

describe('calculator toolkits', () => {
  it('places every public calculator in exactly one user-facing toolkit', () => {
    const assignedSlugs = calculatorToolkits.flatMap((toolkit) => toolkit.calculators.map((calculator) => calculator.slug));

    expect(assignedSlugs).toHaveLength(seoCalculators.length);
    expect(new Set(assignedSlugs).size).toBe(seoCalculators.length);
    expect(new Set(assignedSlugs)).toEqual(new Set(seoCalculators.map((calculator) => calculator.slug)));
  });

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s resolves to a complete toolkit',
    (_slug, calculator) => {
      const toolkit = getCalculatorToolkit(calculator);

      expect(toolkit.calculators).toContain(calculator);
      expect(toolkit.title.length).toBeGreaterThan(4);
      expect(toolkit.description.length).toBeGreaterThan(40);
    }
  );

  it.each(calculatorToolkits.map((toolkit) => [toolkit.id, toolkit] as const))(
    '%s has valid featured routes and a useful family size',
    (_id, toolkit) => {
      const featured = featuredToolkitCalculators(toolkit);

      expect(toolkit.calculators.length).toBeGreaterThanOrEqual(4);
      expect(featured).toHaveLength(toolkit.featuredSlugs.length);
      expect(featured.every((calculator) => toolkit.calculators.includes(calculator))).toBe(true);
    }
  );

  it('keeps exact calculator names on their stable public paths', () => {
    for (const calculator of seoCalculators) {
      expect(calculator.h1).toBe(calculator.title);
      expect(`/calculators/${calculator.slug}`).toMatch(/^\/calculators\/[a-z0-9-]+$/);
    }
  });
});
