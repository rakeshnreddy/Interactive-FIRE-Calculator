import { describe, expect, it } from 'vitest';

import { seoCalculators } from './seoCalculators';

const internalStrategyPattern = /SEO|search-demand|traffic|ranking|ranked|long-tail|traffic cluster|acquisition/i;
const placeholderPattern = /quick (planning )?estimate|uses the inputs you provide to estimate/i;

describe('calculator public content', () => {
  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s has route-specific guidance, assumptions, and FAQs',
    (_slug, calculator) => {
      const routeFaq = calculator.faq.filter((item) => item.question.includes(calculator.title));
      const publicCopy = [
        calculator.description,
        calculator.explanation,
        ...calculator.assumptions,
        ...calculator.faq.flatMap((item) => [item.question, item.answer])
      ].join(' ');

      expect(calculator.description).toContain(calculator.title.replace(' Calculator', '').split(' ')[0]);
      expect(calculator.inputs.some((input) => calculator.description.toLowerCase().includes(input.label.toLowerCase()))).toBe(true);
      expect(calculator.assumptions.length).toBeGreaterThanOrEqual(2);
      expect(calculator.assumptions.every((assumption) => assumption.length > 35)).toBe(true);
      expect(calculator.faq.length).toBeGreaterThanOrEqual(5);
      expect(routeFaq.length).toBeGreaterThanOrEqual(3);
      expect(publicCopy).not.toMatch(placeholderPattern);
      expect(publicCopy).not.toMatch(internalStrategyPattern);
    }
  );

  it('keeps page descriptions and explanations distinct across routes', () => {
    const descriptions = seoCalculators.map((calculator) => normalize(calculator.description));
    const explanations = seoCalculators.map((calculator) => normalize(calculator.explanation));

    expect(new Set(descriptions).size).toBe(seoCalculators.length);
    expect(new Set(explanations).size).toBe(seoCalculators.length);
  });

  it('does not allow near-identical route introductions', () => {
    for (let leftIndex = 0; leftIndex < seoCalculators.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < seoCalculators.length; rightIndex += 1) {
        const left = seoCalculators[leftIndex];
        const right = seoCalculators[rightIndex];
        const similarity = jaccard(
          tokenize(`${left.description} ${left.explanation}`),
          tokenize(`${right.description} ${right.explanation}`)
        );

        expect(similarity, `${left.slug} and ${right.slug} look too similar`).toBeLessThan(0.97);
      }
    }
  });
});

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function tokenize(value: string): Set<string> {
  return new Set(normalize(value).split(' ').filter((token) => token.length > 2));
}

function jaccard(left: Set<string>, right: Set<string>): number {
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union > 0 ? intersection / union : 0;
}
