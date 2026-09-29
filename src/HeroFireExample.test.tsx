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
    expect(html).toContain('30-year');

    // Engine-derived required portfolio must be rendered
    const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
    expect(html).toContain(data.formatted.requiredPortfolio);

    // Accessible semantics
    expect(html).toContain('role="region"');
    expect(html).toContain('aria-label="Illustrative FIRE calculation example"');
  });

  it('plots expenseMode curve starting at modeled target and ending at modeled end balance (R1)', () => {
    const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
    const html = renderToStaticMarkup(<HeroFireExample />);

    // R1: Must use expenseMode starting with modeled target ($965,931) and ending near $0
    expect(data.result.expenseMode.balances[0]).toBe(data.result.requiredPortfolio);
    expect(data.formatted.modeledEndBalance).toBe('$0');

    // Chart title and narrative
    expect(html).toContain('Retirement withdrawals from the modeled target');
    expect(html).toContain('Modeled end balance: $0');

    // String-based Sustained / Depleted status branch must be completely deleted
    expect(html).not.toContain('Sustained');
    expect(html).not.toContain('Depleted');

    // Clarification of starting balance and savings gap
    expect(html).toContain(data.formatted.requiredPortfolio);
    expect(html).toContain(data.formatted.portfolioGap);
    expect(html).toContain('Initial annual spending:');
  });

  it('exposes chart semantics and text alternative accessibly without aria-hidden on chart ancestor (R2)', () => {
    const html = renderToStaticMarkup(<HeroFireExample />);

    // Must NOT have aria-hidden="true" on chart ancestor
    expect(html).not.toMatch(/class="hero-example-chart[^"]*"\s+aria-hidden="true"/);
    expect(html).not.toMatch(/aria-hidden="true"[^>]*class="hero-example-chart/);

    // Exposed figure and figcaption semantics
    expect(html).toContain('<figure');
    expect(html).toContain('<figcaption');
    expect(html).toContain('aria-labelledby=');
    expect(html).toContain('aria-describedby=');

    // Concise text alternative must describe scenario, start/end years, USD start/end, and spending/inflation
    expect(html).toContain('Year 0');
    expect(html).toContain('Year 30');
    expect(html).toContain('$965,931');
    expect(html).toContain('$0');
    expect(html).toContain('60,000');
    expect(html).toContain('2.5%');
    expect(html).toContain('7%');

    // SVG must be role="img" with title and desc
    expect(html).toContain('role="img"');
    expect(html).toContain('<title');
    expect(html).toContain('<desc');
  });
});
