import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalculatorLibrary } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorScenarios, buildCalculatorStudioChart } from './lib/calculatorStudios';
import { getCalculatorQualitySpec } from './lib/calculatorQuality';
import { buildCalculatorScope } from './lib/calculatorScope';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null };
const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) => Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue])) as Record<string, number>;
const render = (slug: string) => <CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/plans', message: '', savedResultId: 'synthetic' })} savedResults={[]} />;
function page(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(render(slug));
  return node;
}
let root: Root | undefined;
let container: HTMLDivElement | undefined;
function live(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(render(slug)));
  return container;
}
function edit(key: string, value: string) {
  const input = container!.querySelector<HTMLInputElement>(`input[id$="-${key}"]`)!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

const slugs = ['lumpsum-mutual-fund', 'sip', 'step-up-sip'] as const;
// Baseline (main e741166) scenario vectors and headline values; B67 is presentation only.
const baseline = {
  'lumpsum-mutual-fund': [['conservative', { principal: 460000, years: 9, rate: 6.8 }, 831570.560501741], ['base', { principal: 500000, years: 10, rate: 8 }, 1079462.498636394], ['optimistic', { principal: 540000, years: 11, rate: 9.2 }, 1421813.9857648432]],
  sip: [['conservative', { monthly: 8800, annualTopUp: 0, years: 9, rate: 6.8 }, 1305919.5241717577], ['base', { monthly: 10000, annualTopUp: 0, years: 10, rate: 8 }, 1829460.3518170852], ['optimistic', { monthly: 11200.000000000002, annualTopUp: 0, years: 11, rate: 9.2 }, 2542643.460452687]],
  'step-up-sip': [['conservative', { monthly: 8800, stepUp: 8.8, annualTopUp: 0, years: 9, rate: 6.8 }, 1803815.9719307218], ['base', { monthly: 10000, stepUp: 10, annualTopUp: 0, years: 10, rate: 8 }, 2739652.891105313], ['optimistic', { monthly: 11200.000000000002, stepUp: 11.2, annualTopUp: 0, years: 11, rate: 9.2 }, 4151264.7022461426]]
} as const;

describe('B67 market-growth presentation', () => {
  it.each([
    ['lumpsum-mutual-fund', /one investment at the start/i, /compounded once a year/i],
    ['sip', /end of each month/i, /÷ 12, compounded monthly/],
    ['step-up-sip', /end of each month/i, /÷ 12, compounded monthly/]
  ] as const)('%s states timing, compounding and exclusions before the fields', (slug, timing, compounding) => {
    const panel = page(slug).querySelector('.calculator-input-panel')!;
    const note = panel.querySelector('[data-growth-basis]');
    expect(note).not.toBeNull();
    expect(note!.compareDocumentPosition(panel.querySelector('.calculator-input-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = note!.textContent ?? '';
    expect(text).toMatch(timing);
    expect(text).toMatch(compounding);
    expect(text).toMatch(/not a forecast or guarantee/i);
    for (const excluded of [/expenses/i, /exit loads/i, /tax/i]) expect(text).toMatch(excluded);
    if (slug !== 'lumpsum-mutual-fund') expect(text).toMatch(/faster than the same annualised \(CAGR\) return/);
    if (slug === 'step-up-sip') expect(text).toMatch(/raised by the step-up once a year/i);
  });

  it.each(slugs)('%s drops generic and misleading copy', (slug) => {
    const text = page(slug).textContent ?? '';
    for (const banned of [/annual return \/ rate/i, /label says otherwise/i, /\bConservative\b/, /\bOptimistic\b/, /contribution or return assumptions/i]) {
      expect(text, String(banned)).not.toMatch(banned);
    }
    if (slug === 'lumpsum-mutual-fund') {
      for (const banned of [/monthly budget/i, /regular contributions/i, /Maturity value/, /Estimated interest/]) expect(text, String(banned)).not.toMatch(banned);
    }
  });

  it('labels inputs by route while keeping keys, order, limits and defaults', () => {
    expect(find('lumpsum-mutual-fund').inputs.map((i) => [i.key, i.label, i.defaultValue])).toEqual([['principal', 'Lumpsum investment', 500000], ['years', 'Years', 10], ['rate', 'Expected annual return', 8]]);
    expect(find('sip').inputs.map((i) => [i.key, i.label, i.defaultValue])).toEqual([['monthly', 'Monthly SIP', 10000], ['annualTopUp', 'Extra yearly investment', 0], ['years', 'Years', 10], ['rate', 'Expected annual return', 8]]);
    expect(find('step-up-sip').inputs.map((i) => [i.key, i.label, i.defaultValue])).toEqual([['monthly', 'Starting monthly SIP', 10000], ['stepUp', 'Annual step-up', 10], ['annualTopUp', 'Extra yearly investment', 0], ['years', 'Years', 10], ['rate', 'Expected annual return', 8]]);
    const helper = (slug: string, key: string) => find(slug).inputs.find((i) => i.key === key)!.helper ?? '';
    expect(helper('lumpsum-mutual-fund', 'principal')).toMatch(/one-time/i);
    expect(helper('lumpsum-mutual-fund', 'rate')).toMatch(/compounded once a year/i);
    expect(helper('sip', 'rate')).toMatch(/monthly \(rate ÷ 12\)/);
    expect(helper('sip', 'monthly')).toMatch(/end of each month/i);
    expect(helper('step-up-sip', 'stepUp')).toMatch(/once a year, from month 13/);
    expect(helper('sip', 'annualTopUp')).toMatch(/separate from the SIP/i);
    expect(page('sip').textContent).toMatch(/Extra yearly investment/);
  });

  it('relabels the lump-sum result for a market investment with identical values', () => {
    const result = calculateSeoCalculator(find('lumpsum-mutual-fund'), defaults('lumpsum-mutual-fund'));
    expect(result.metrics.map((m) => [m.label, m.value])).toEqual([['Projected value', 1079462.498636394], ['Estimated gains', 579462.498636394]]);
    // Decimal oracle: 500000 × 1.08^10.
    expect(result.metrics[0].value).toBeCloseTo(1079462.4986363933, 6);
    expect(result.narrative).toMatch(/not a forecast/i);
    // FD keeps its deposit wording.
    expect(calculateSeoCalculator(find('fd'), defaults('fd')).metrics[0].label).toBe('Maturity value');
  });

  it.each(slugs)('%s keeps scenario vectors and results while using neutral labels', (slug) => {
    const scenarios = buildCalculatorScenarios(find(slug), defaults(slug));
    expect(scenarios.map((s) => [s.id, s.values, s.result.metrics[0].value])).toEqual(baseline[slug].map((s) => [...s]));
    expect(scenarios.map((s) => s.label)).toEqual(['Lower what-if', 'Your plan', 'Higher what-if']);
    expect(scenarios[0].description).toMatch(/not a forecast/i);
    expect(buildCalculatorStudioChart(find(slug), defaults(slug)).entries.map((e) => e.label)).toEqual(['Lower what-if', 'Your plan', 'Higher what-if']);
  });

  it('keeps the SIP results byte-equal and matches Decimal oracles', () => {
    expect(calculateSeoCalculator(find('sip'), defaults('sip')).metrics[0].value).toBeCloseTo(1829460.3518170934, 6);
    const stepUp = calculateSeoCalculator(find('step-up-sip'), defaults('step-up-sip'));
    expect(stepUp.metrics[0].value).toBeCloseTo(2739652.8911053174, 6);
    expect(stepUp.metrics[1].value).toBeCloseTo(1912490.95212, 6);
    expect(stepUp.narrative).toBe('Estimated future value of recurring SIP contributions.');
  });

  it('reconciles invested + estimated gains = projected value beside the result', () => {
    expect(page('lumpsum-mutual-fund').querySelector('[data-growth-reconciliation]')?.textContent).toBe('₹5,00,000 invested + ₹5,79,462 estimated gains = ₹10,79,462 after 10 years at 8% a year, compounded once a year.');
    expect(page('sip').querySelector('[data-growth-reconciliation]')?.textContent).toBe('₹12,00,000 invested + ₹6,29,460 estimated gains = ₹18,29,460 after 120 months at 8% a year, compounded monthly.');
    expect(page('step-up-sip').querySelector('[data-growth-reconciliation]')?.textContent).toBe('₹19,12,491 invested + ₹8,27,162 estimated gains = ₹27,39,653 after 120 months at 8% a year, compounded monthly.');
  });

  it('itemises an extra yearly investment in the SIP line', () => {
    const node = live('sip');
    edit('annualTopUp', '5000');
    edit('years', '1.5');
    // 18 end-of-month instalments of 10,000 plus 5,000 after the 12th: Decimal oracle 195775.2681621231.
    expect(node.querySelector('[data-growth-reconciliation]')?.textContent).toBe('₹1,85,000 invested (₹1,80,000 monthly + ₹5,000 extra yearly) + ₹10,775 estimated gains = ₹1,95,775 after 18 months at 8% a year, compounded monthly.');
  });

  it.each(slugs)('%s guidance fits the route and keeps scope notices off generic growth tools', (slug) => {
    const checks = getCalculatorQualitySpec(find(slug)).interpretationChecks.join(' ');
    expect(checks).toMatch(/market returns vary/i);
    expect(checks).toMatch(/expenses/i);
    if (slug === 'lumpsum-mutual-fund') expect(checks).not.toMatch(/contribution|budget/i);
    else expect(checks).toMatch(/budget/i);
    expect(buildCalculatorScope(find(slug), defaults(slug))).toBeNull();
    expect(page(slug).textContent).toMatch(/illustrative, not a forecast/i);
  });
});
