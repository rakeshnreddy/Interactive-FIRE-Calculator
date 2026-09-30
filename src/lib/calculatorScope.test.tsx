import { CalculatorLibrary } from '../CalculatorLibrary';
import type { AuthState } from '../auth';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { seoCalculators, calculateSeoCalculator } from './seoCalculators';
import { buildCalculatorScope, calculatorScopeSlugs } from './calculatorScope';
import { CalculatorScopeNotice } from '../components/CalculatorScopeNotice';

const defaults = (slug: string) => Object.fromEntries(seoCalculators.find(c => c.slug === slug)!.inputs.map(i => [i.key, i.defaultValue]));
describe('honest adjacent calculator scope', () => {
  it('covers exactly all B49 matrix assignments', () => {
    const rows = readFileSync('docs/calculator-excellence/CALCULATOR_UX_MATRIX_2026-09-29.md', 'utf8').split(/^### /m).slice(1);
    const assigned = rows.filter(row => row.includes('B49')).map(row => row.match(/— `([^`]+)`/)![1]);
    expect([...calculatorScopeSlugs].sort()).toEqual(assigned.sort());
  });
  it.each(calculatorScopeSlugs)('%s has adjacent, dated scope and official links without transmitting inputs', slug => {
    const calculator = seoCalculators.find(c => c.slug === slug)!;
    const values = defaults(slug); const before = JSON.stringify(values);
    const scope = buildCalculatorScope(calculator, values)!;
    expect(scope.included.length).toBeGreaterThan(10); expect(scope.excluded.length).toBeGreaterThan(10);
    expect(scope.basis.length).toBeGreaterThan(10); expect(scope.checked).toBe('2026-09-30');
    for (const source of scope.sources) {
      const url = new URL(source.url);
      expect(url.protocol).toBe('https:'); expect(url.hostname).toMatch(/(?:\.gov|\.gov\.in|pfrda\.org\.in|rbi\.org\.in)$/);
      expect(url.search).toBe(''); expect(source.label).toBeTruthy();
    }
    const html = renderToStaticMarkup(<CalculatorScopeNotice scope={scope} />);
    expect(html).toContain('Includes:'); expect(html).toContain('Not included:');
    expect(html).toContain('Model basis'); expect(html).toContain('Scope reviewed');
    expect(html).toContain('opens in a new tab'); expect(html).not.toContain('details open');
    expect(JSON.stringify(values)).toBe(before);
  });
  it('states finite promo duration and the actual post-promo rate from the current scenario', () => {
    const calculator = seoCalculators.find(c => c.slug === 'balance-transfer')!;
    const scope = buildCalculatorScope(calculator, {...defaults(calculator.slug), promoMonths: 6, newRate: 0, currentRate: 24})!;
    expect(scope.basis).toContain('6 months'); expect(scope.basis).toContain('0%'); expect(scope.basis).toContain('24%');
    expect(calculator.assumptions.join(' ')).not.toContain('promotional APR lasts until payoff');
  });
  it('distinguishes current statutory tax basis from entered payroll and manual RMD assumptions', () => {
    const scope = (slug: string, extra: Record<string, number> = {}) => buildCalculatorScope(seoCalculators.find(c => c.slug === slug)!, {...defaults(slug), ...extra})!;
    expect(scope('income-tax-us').basis).toContain('2026'); expect(scope('income-tax-us').basis).toContain('16,100');
    expect(scope('income-tax-india').basis).toContain('AY 2026–27'); expect(scope('income-tax-india').excluded.toLowerCase()).toContain('marginal relief');
    expect(scope('paycheck', {effectiveRate: 0}).basis).toContain('0%');
    expect(scope('rmd', {divisor: 20}).basis).toContain('20'); expect(scope('rmd').excluded).toContain('table selection');
    expect(scope('fha-vs-conventional').basis).toContain('fixed model assumptions');
    expect(scope('salary-india').basis).toContain('CTC');
  });
  it('places every assigned scope inside the real result panel before chart details', () => {
    const auth: AuthState = {provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, user: null, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY']};
    for (const slug of calculatorScopeSlugs) {
      const html = renderToStaticMarkup(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({destinationRoute: '/plans', message: 'Saved', savedResultId: 'synthetic'})} savedResults={[]} />);
      expect(html.indexOf('<aside class="calculator-scope"')).toBeGreaterThan(html.indexOf('calculator-result-panel'));
      expect(html).toContain('What this estimate covers');
    }
  });
  it('does not attach an unrelated regulatory block to a generic growth tool', () => {
    expect(buildCalculatorScope(seoCalculators.find(c => c.slug === 'lumpsum-mutual-fund')!, {})).toBeNull();
  });
  it('preserves independently derived simple output goldens', () => {
    const run = (slug: string, values: Record<string, number>) => calculateSeoCalculator(seoCalculators.find(c => c.slug === slug)!, values).metrics[0].value;
    expect(run('rmd', {balance: 400000, divisor: 20})).toBe(20000);
    expect(run('paycheck', {income: 1000, periods: 12, preTaxDeductions: 100, postTaxDeductions: 50, effectiveRate: 10})).toBe(9120);
    expect(run('income-tax-us', {income: 28500, deductions: 0, stateRate: 0})).toBe(27260);
    expect(run('income-tax-india', {income: 1200000, deductions: 0})).toBe(1200000);
    expect(run('pmi', {homePrice: 200000, downPayment: 20000, rate: 0.6})).toBe(90);
  });
});
