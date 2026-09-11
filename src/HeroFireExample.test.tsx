import React from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { calculateFirePlan } from './lib/fire';
import { HERO_FIRE_FIXTURE, getHeroFireExampleData } from './lib/heroExample';
import { HeroFireExample } from './HeroFireExample';

describe('HeroFireExample', () => {
  it('computes values that match calculateFirePlan directly', () => {
    const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
    const directResult = calculateFirePlan(HERO_FIRE_FIXTURE);

    expect(data.result.requiredPortfolio).toBe(directResult.requiredPortfolio);
    expect(data.result.maxAnnualExpense).toBe(directResult.maxAnnualExpense);
    expect(Number.isFinite(data.result.requiredPortfolio)).toBe(true);
    expect(data.result.requiredPortfolio).toBeGreaterThan(0);
    expect(data.formatted.requiredPortfolio).toMatch(/^\$[0-9,]+$/);
    expect(data.formatted.annualExpense).toBe('$60,000');
    expect(data.formatted.initialPortfolio).toBe('$500,000');
    expect(data.formatted.returnRate).toBe('7%');
    expect(data.formatted.inflationRate).toBe('2.5%');
  });

  it('renders required illustrative labels, notes, units, and assumptions', () => {
    const html = renderToStaticMarkup(<HeroFireExample />);

    // Contract labels
    expect(html).toContain('Illustrative example · USD');
    expect(html).toContain('An estimate based on the assumptions shown, not a guaranteed outcome.');

    // Inputs & outputs
    expect(html).toContain('$60,000');
    expect(html).toContain('$500,000');
    expect(html).toContain('7%');
    expect(html).toContain('2.5%');
    expect(html).toContain('30 years');

    // Engine-derived required portfolio must be rendered
    const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
    expect(html).toContain(data.formatted.requiredPortfolio);

    // Accessible semantics
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Illustrative FIRE calculation example"');
  });

  it('renders accessible SVG trajectory with labeled axes and points', () => {
    const html = renderToStaticMarkup(<HeroFireExample />);

    expect(html).toContain('<svg');
    expect(html).toContain('aria-label=');
    expect(html).toContain('Year 0');
    expect(html).toContain('Year 30');
    // Ensure no broken NaN in SVG attributes
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('undefined');
  });
});
