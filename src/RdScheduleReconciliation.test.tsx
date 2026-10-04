import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary, scheduleToCsv } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios, buildCalculatorStudioChart } from './lib/calculatorStudios';
import { getCalculatorQualitySpec } from './lib/calculatorQuality';
import { buildCalculatorScope } from './lib/calculatorScope';

vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null };
const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) => Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue]));
function page(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/accounts', message: '', savedResultId: 'synthetic' })} savedResults={[]} />);
  return node;
}
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | undefined;
let container: HTMLDivElement | undefined;
function live(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/accounts', message: '', savedResultId: 'synthetic' })} savedResults={[]} />));
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

// Baseline (main 65feeef) RD result and scenario vectors. B61 is presentation only.
const rdMetrics = (maturity: number, deposits: number) => [
  { description: 'Estimated recurring deposit maturity value.', label: 'Maturity value', tone: 'accent', value: maturity, valueType: 'currency' },
  { label: 'Total deposits', tone: 'neutral', value: deposits, valueType: 'currency' },
  { label: 'Estimated interest', tone: 'positive', value: maturity - deposits, valueType: 'currency' }
];
const rdBaseline = {
  result: { assumptions: [], metrics: rdMetrics(1829460.3518170852, 1200000), narrative: 'Estimated recurring deposit maturity value.' },
  scenarios: [
    ['conservative', { monthly: 8800, annualTopUp: 0, years: 9, rate: 6.8 }, 1305919.5241717577],
    ['base', { monthly: 10000, annualTopUp: 0, years: 10, rate: 8 }, 1829460.3518170852],
    ['optimistic', { monthly: 11200.000000000002, annualTopUp: 0, years: 11, rate: 9.2 }, 2542643.460452687]
  ] as const
};

describe('B61 RD presentation', () => {
  it('states deposit timing, monthly compounding and exclusions before the fields', () => {
    const panel = page('rd').querySelector('.calculator-input-panel')!;
    const note = panel.querySelector('[data-deposit-basis]');
    expect(note).not.toBeNull();
    expect(note!.compareDocumentPosition(panel.querySelector('.calculator-input-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = note!.textContent ?? '';
    expect(text).toMatch(/end of (its|each) month/i);
    expect(text).toMatch(/compounded monthly/i);
    expect(text).toMatch(/÷ 12/);
    for (const excluded of [/tax/i, /fees/i, /missed/i, /premature/i]) expect(text).toMatch(excluded);
    expect(text).toMatch(/bank.*differ/i);
  });

  it('uses RD language with no generic contribution or return copy', () => {
    const text = page('rd').textContent ?? '';
    for (const banned of [/recurring amount/i, /label says otherwise/i, /years in years/i, /contribution/i, /monthly budget/i, /annual return \/ rate/i, /\bConservative\b/, /\bOptimistic\b/, /sample rd calculator/i]) {
      expect(text, String(banned)).not.toMatch(banned);
    }
    expect(text).toMatch(/Extra yearly deposit/);
  });

  it('keeps input keys, order, limits and defaults while relabelling them', () => {
    const inputs = find('rd').inputs;
    expect(inputs.map((i) => [i.key, i.defaultValue, i.min, i.max])).toEqual([['monthly', 10000, 0, undefined], ['annualTopUp', 0, 0, undefined], ['years', 10, 0, 100], ['rate', 8, 0, 100]]);
    expect(inputs.map((i) => i.label)).toEqual(['Monthly deposit', 'Extra yearly deposit', 'Deposit term', 'Annual interest rate']);
    const helper = (key: string) => inputs.find((i) => i.key === key)!.helper ?? '';
    expect(helper('monthly')).toMatch(/end of (each|the) month/i);
    expect(helper('years')).toMatch(/1\.5/);
    expect(helper('years')).toMatch(/whole months/i);
    expect(helper('rate')).toMatch(/monthly/i);
    expect(helper('annualTopUp')).toMatch(/separate from the monthly/i);
    expect(helper('annualTopUp')).toMatch(/0 for a standard RD/i);
  });

  it('reconciles deposits + interest = maturity beside the result', () => {
    const line = page('rd').querySelector('[data-deposit-reconciliation]')?.textContent ?? '';
    expect(line).toMatch(/12,00,000 deposits/);
    expect(line).toMatch(/6,29,460 interest/);
    expect(line).toMatch(/= ₹18,29,460 at maturity after 120 months at 8% a year, compounded monthly/);
    expect(line).not.toMatch(/extra yearly/i);
  });

  it('itemises an extra yearly deposit in the reconciliation line for a part-year term', () => {
    const node = live('rd');
    edit('annualTopUp', '5000');
    edit('years', '1.5');
    const line = node.querySelector('[data-deposit-reconciliation]')?.textContent ?? '';
    // 18 end-of-month deposits plus one extra at month 12: Decimal oracle 195775.2681621231.
    expect(line).toMatch(/1,85,000 deposits \(₹1,80,000 monthly \+ ₹5,000 extra yearly\)/);
    expect(line).toMatch(/10,775 interest/);
    expect(line).toMatch(/= ₹1,95,775 at maturity after 18 months/);
  });

  it('keeps the result and scenario vectors byte-equal to baseline with neutral labels', () => {
    expect(calculateSeoCalculator(find('rd'), defaults('rd'))).toEqual(rdBaseline.result);
    const scenarios = buildCalculatorScenarios(find('rd'), defaults('rd'));
    expect(scenarios.map((s) => [s.id, s.values, s.result.metrics[0].value])).toEqual(rdBaseline.scenarios.map((s) => [...s]));
    expect(scenarios.map((s) => s.label)).toEqual(['Lower what-if', 'Your deposits', 'Higher what-if']);
    expect(scenarios[0].description).toMatch(/smaller monthly deposit, shorter term and lower rate/i);
    expect(scenarios[0].description).toMatch(/not an offered rate or forecast/i);
    expect(buildCalculatorStudioChart(find('rd'), defaults('rd')).entries.map((e) => e.label)).toEqual(['Lower what-if', 'Your deposits', 'Higher what-if']);
    // Independent Decimal oracle for the default: 10000 × ((1 + 0.08/12)^120 − 1) / (0.08/12).
    expect(scenarios[1].result.metrics[0].value).toBeCloseTo(1829460.3518170934, 6);
  });

  it('gives RD-specific guidance, example note and a scope notice without sources it cannot support', () => {
    const spec = getCalculatorQualitySpec(find('rd'));
    expect(spec.interpretationChecks.join(' ')).toMatch(/instalment/i);
    expect(spec.interpretationChecks.join(' ')).not.toMatch(/contribution/i);
    const scope = buildCalculatorScope(find('rd'), defaults('rd'))!;
    expect(scope.excluded).toMatch(/TDS/);
    expect(scope.basis).toMatch(/8% a year ÷ 12/);
    expect(scope.basis).toMatch(/120 monthly deposits/);
    expect(scope.sources).toEqual([]);
    const aside = page('rd').querySelector('.calculator-scope')!;
    expect(aside.textContent).toMatch(/Model basis/);
    expect(aside.textContent).not.toMatch(/official sources|References describe/);
    expect(page('rd').textContent).toMatch(/illustrative, not a current bank offer/i);
  });
});

describe('B62 exact-term schedules', () => {
  const fractional = (slug: string, extra: Record<string, number> = {}) => ({ ...defaults(slug), years: 1.5, ...extra });

  it('ends the lump-sum schedule at the exact term with growth labels', () => {
    const values = fractional('lumpsum-mutual-fund');
    const result = calculateSeoCalculator(find('lumpsum-mutual-fund'), values);
    const schedule = buildCalculatorDetailSchedule(find('lumpsum-mutual-fund'), values, result)!;
    const last = schedule.rows.at(-1)!;
    // Decimal oracle: 500000 × 1.08 × √1.08.
    expect(last.values.year).toBe(1.5);
    expect(Number(last.values.balance)).toBeCloseTo(561184.4616523162, 6);
    expect(Number(last.values.balance)).toBeCloseTo(result.metrics[0].value, 9);
    expect(last.note).toMatch(/part year/i);
    expect(schedule.columns.map((c) => c.label)).toEqual(['Year', 'Growth this period', 'Total growth', 'Value']);
    expect(scheduleToCsv(find('lumpsum-mutual-fund'), schedule).trim().split('\n').at(-1)).toMatch(/^"?1\.5"?,/);
  });

  it.each([
    ['rd', 190571.9050506165],
    ['sip', 190571.9050506165],
    ['nps', 190571.9050506165]
  ] as const)('%s schedule runs exactly the engine months for a part-year term', (slug, oracle) => {
    const values = fractional(slug);
    const result = calculateSeoCalculator(find(slug), values);
    const schedule = buildCalculatorDetailSchedule(find(slug), values, result)!;
    const last = schedule.rows.at(-1)!;
    expect(schedule.rows).toHaveLength(2);
    expect(last.values.year).toBe(1.5);
    expect(Number(last.values.cumulativeDeposits)).toBe(180000);
    expect(Number(last.values.deposits)).toBe(60000);
    expect(Number(last.values.balance)).toBeCloseTo(oracle, 6);
    expect(last.note).toMatch(/6 months/);
  });

  it.each(['rd', 'sip', 'step-up-sip', 'compound-interest', 'nps', 'hysa', 'lumpsum-mutual-fund'])('%s final schedule row equals the headline at 1.5 years', (slug) => {
    const values = fractional(slug);
    const result = calculateSeoCalculator(find(slug), values);
    const schedule = buildCalculatorDetailSchedule(find(slug), values, result)!;
    expect(Number(schedule.rows.at(-1)!.values.balance)).toBeCloseTo(result.metrics[0].value, 6);
  });

  it('includes the extra yearly deposit made at month 12 of an 18-month RD', () => {
    const values = fractional('rd', { annualTopUp: 5000 });
    const schedule = buildCalculatorDetailSchedule(find('rd'), values, calculateSeoCalculator(find('rd'), values))!;
    expect(Number(schedule.rows.at(-1)!.values.balance)).toBeCloseTo(195775.2681621231, 6);
    expect(Number(schedule.rows.at(-1)!.values.cumulativeDeposits)).toBe(185000);
    expect(schedule.columns.map((c) => c.label)).toEqual(['Year', 'Deposits this period', 'Interest this period', 'Total deposited', 'Balance']);
  });

  it('keeps whole-year schedules identical to baseline values', () => {
    const values = { ...defaults('sip'), years: 2, annualTopUp: 5000 };
    const rows = buildCalculatorDetailSchedule(find('sip'), values, calculateSeoCalculator(find('sip'), values))!.rows;
    expect(rows.map((r) => r.values)).toEqual([
      { balance: 129499.26021126611, cumulativeDeposits: 125000, deposits: 125000, growth: 4499.260211266115, year: 1 },
      { balance: 269746.8951520048, cumulativeDeposits: 250000, deposits: 125000, growth: 15247.634940738702, year: 2 }
    ]);
    expect(rows.some((r) => r.note)).toBe(false);
    const lump = buildCalculatorDetailSchedule(find('lumpsum-mutual-fund'), { ...defaults('lumpsum-mutual-fund'), years: 2 })!.rows;
    expect(lump.map((r) => r.values)).toEqual([
      { balance: 540000, interest: 40000, totalInterest: 40000, year: 1 },
      { balance: 583200, interest: 43200, totalInterest: 83200, year: 2 }
    ]);
  });
});
