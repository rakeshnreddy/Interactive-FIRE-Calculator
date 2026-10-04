import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary, scheduleToCsv } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios, buildCalculatorStudioChart } from './lib/calculatorStudios';
import { buildCalculatorInputImpacts } from './lib/calculatorEngagement';
import { getCalculatorQualitySpec } from './lib/calculatorQuality';
import { buildCalculatorScope } from './lib/calculatorScope';

vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null };
const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) => Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue]));
function page(slug: string) {
  const node = document.createElement('div');
  node.innerHTML = renderToStaticMarkup(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/accounts', message: '', savedResultId: 'synthetic' })} savedResults={[]} />);
  return node;
}

// Baseline (main 04be90d) result objects and scenario vectors. Presentation work must not change them.
const baseline = {
  fd: {
    result: { assumptions: [], metrics: [{ description: 'Estimated maturity value after compounding.', label: 'Maturity value', tone: 'accent', value: 1079462.498636394, valueType: 'currency' }, { label: 'Estimated interest', tone: 'positive', value: 579462.498636394, valueType: 'currency' }], narrative: 'Estimated maturity value after compounding.' },
    scenarios: [['conservative', { principal: 440000, years: 9, rate: 6.8 }], ['base', { principal: 500000, years: 10, rate: 8 }], ['optimistic', { principal: 560000, years: 11, rate: 9.2 }]]
  },
  cd: {
    result: { assumptions: [], metrics: [{ description: 'Estimated maturity value after compounding.', label: 'Maturity value', tone: 'accent', value: 10920.249999999998, valueType: 'currency' }, { label: 'Estimated interest', tone: 'positive', value: 920.2499999999982, valueType: 'currency' }], narrative: 'Estimated maturity value after compounding.' },
    scenarios: [['conservative', { principal: 8800, rate: 3.825, years: 1 }], ['base', { principal: 10000, rate: 4.5, years: 2 }], ['optimistic', { principal: 11200.000000000002, rate: 5.175, years: 3 }]]
  }
} as const;

describe('B60 deposit-specific FD/CD presentation', () => {
  it.each([
    ['fd', /compounded once a year/i],
    ['cd', /APY already includes compounding/]
  ])('%s states the rate basis and exclusions before the fields', (slug, basis) => {
    const panel = page(slug).querySelector('.calculator-input-panel')!;
    const note = panel.querySelector('[data-deposit-basis]');
    expect(note).not.toBeNull();
    expect(note!.compareDocumentPosition(panel.querySelector('.calculator-input-grid')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const text = note!.textContent ?? '';
    expect(text).toMatch(basis);
    expect(text).toMatch(/one deposit/i);
    expect(text).toMatch(/tax/i);
    expect(text).toMatch(/fees/i);
    expect(text).toMatch(/penalt/i);
  });

  it.each(['fd', 'cd'])('%s uses deposit language with no recurring or generic investment copy', (slug) => {
    const text = page(slug).textContent ?? '';
    for (const banned of [/recurring amount/i, /label says otherwise/i, /years in years/i, /\bapy\b/, /contribution/i, /monthly budget/i, /annual return \/ rate/i, /sample (fd|cd) calculator/]) {
      expect(text, String(banned)).not.toMatch(banned);
    }
    const helpers = find(slug).inputs.map((input) => input.helper ?? '');
    expect(helpers[0]).toMatch(/one-time/i);
    expect(find(slug).inputs.find((input) => input.key === 'years')!.helper).toMatch(/1\.5/);
  });

  it('labels the FD rate with its yearly compounding basis', () => {
    const rate = find('fd').inputs.find((input) => input.key === 'rate')!;
    expect(rate.label).toBe('Annual interest rate');
    expect(rate.helper).toMatch(/compounds it once a year/i);
    expect(find('cd').inputs.find((input) => input.key === 'rate')!.helper).toMatch(/annual percentage yield/i);
  });

  it.each([
    ['cd', '$10,000', '$920', '$10,920'],
    ['fd', '₹5,00,000', '₹5,79,462', '₹10,79,462']
  ])('%s reconciles deposit plus interest with maturity beside the result', (slug, deposit, interest, maturity) => {
    const line = page(slug).querySelector('.calculator-result-panel [data-deposit-reconciliation]');
    expect(line).not.toBeNull();
    const text = line!.textContent ?? '';
    expect(text).toContain(`${deposit} deposit`);
    expect(text).toContain(`${interest} interest`);
    expect(text).toContain(maturity);
    const r = calculateSeoCalculator(find(slug), defaults(slug));
    expect(defaults(slug).principal + r.metrics[1].value).toBeCloseTo(r.metrics[0].value, 9);
  });

  it.each(['fd', 'cd'] as const)('%s keeps result objects and scenario vectors byte-equivalent with neutral labels', (slug) => {
    expect(calculateSeoCalculator(find(slug), defaults(slug))).toEqual(baseline[slug].result);
    const scenarios = buildCalculatorScenarios(find(slug), defaults(slug));
    expect(scenarios.map((s) => [s.id, s.values])).toEqual(baseline[slug].scenarios);
    expect(scenarios.map((s) => s.label)).toEqual(['Lower what-if', 'Your deposit', 'Higher what-if']);
    for (const scenario of scenarios) {
      expect(scenario.description).not.toMatch(/contribution|optimistic|conservative/i);
      expect(scenario.result.metrics[0].value).toBeCloseTo(scenario.values.principal * (1 + scenario.values.rate / 100) ** scenario.values.years, 8);
    }
    expect(scenarios[0].description).toMatch(/not .*(offered rate|forecast)/i);
  });

  it('ends a fractional CD term at the exact maturity, matching the headline', () => {
    const values = { principal: 10000, rate: 4.5, years: 1.5 };
    const result = calculateSeoCalculator(find('cd'), values);
    const schedule = buildCalculatorDetailSchedule(find('cd'), values, result)!;
    const last = schedule.rows.at(-1)!;
    // Independent oracle: 10000 × 1.045 × √1.045, derived with Python Decimal (40 digits).
    expect(last.values.year).toBe(1.5);
    expect(Number(last.values.balance)).toBeCloseTo(10682.5377368863, 6);
    expect(Number(last.values.balance)).toBeCloseTo(result.metrics[0].value, 9);
    expect(Number(last.values.totalInterest)).toBeCloseTo(result.metrics[1].value, 9);
    expect(last.note).toMatch(/part year/i);
    expect(schedule.columns.find((c) => c.key === 'balance')!.label).toBe('Balance');
    const csv = scheduleToCsv(find('cd'), schedule).trim().split('\n');
    expect(csv).toHaveLength(schedule.rows.length + 1);
    expect(csv.at(-1)).toMatch(/^"?1\.5"?,/);
  });

  it.each([
    ['cd', 10920.25, 2],
    ['fd', 1079462.4986363933, 10]
  ] as const)('%s integer-term schedules keep their goldens', (slug, golden, rows) => {
    const schedule = buildCalculatorDetailSchedule(find(slug), defaults(slug))!;
    expect(schedule.rows).toHaveLength(rows);
    expect(Number(schedule.rows.at(-1)!.values.balance)).toBeCloseTo(golden, 6);
    expect(schedule.rows.some((row) => row.note)).toBe(false);
  });

  it('omits the schedule for a zero term while the maturity equals the deposit and the chart stays available', () => {
    const values = { principal: 10000, rate: 4.5, years: 0 };
    const result = calculateSeoCalculator(find('cd'), values);
    expect(result.metrics[0].value).toBe(10000);
    expect(buildCalculatorDetailSchedule(find('cd'), values, result)).toBeNull();
    expect(buildCalculatorStudioChart(find('cd'), values, result).entries).toHaveLength(3);
  });

  it.each(['fd', 'cd'])('%s reading guide does not lowercase the neutral scenario label into the sentence', (slug) => {
    expect(page(slug).textContent).not.toMatch(/the your deposit estimate/i);
  });

  // B62 deliberately moved lump sum to an exact-term schedule with growth labels; its scenarios stay unchanged.
  it('gives lumpsum its own scenario labels while its schedule ends at the exact term', () => {
    const lumpsum = find('lumpsum-mutual-fund');
    const schedule = buildCalculatorDetailSchedule(lumpsum, { principal: 10000, rate: 4.5, years: 1.5 })!;
    expect(schedule.rows.at(-1)!.values.year).toBe(1.5);
    expect(schedule.columns.find((c) => c.key === 'balance')!.label).toBe('Value');
    // B67 gives lump sum neutral market what-if labels.
    expect(buildCalculatorScenarios(lumpsum, defaults('lumpsum-mutual-fund')).map((s) => s.label)).toEqual(['Lower what-if', 'Your plan', 'Higher what-if']);
  });

  it('keeps the scenario chart consistent with the relabelled scenarios', () => {
    const chart = buildCalculatorStudioChart(find('cd'), defaults('cd'));
    expect(chart.entries.map((e) => e.label)).toEqual(['Lower what-if', 'Your deposit', 'Higher what-if']);
    expect(chart.entries[1].primary).toBeCloseTo(10920.25, 6);
  });

  it('preserves acronyms in sensitivity sentences', () => {
    const impacts = buildCalculatorInputImpacts(find('cd'), defaults('cd'));
    expect(impacts.find((impact) => impact.inputKey === 'rate')!.summary).toContain('A higher APY');
    expect(impacts.find((impact) => impact.inputKey === 'principal')!.summary).toContain('A higher deposit amount');
  });

  it.each(['fd', 'cd'])('%s decision guidance is about a single deposit, not contributions', (slug) => {
    const spec = getCalculatorQualitySpec(find(slug));
    expect(spec.decisionUsefulness).toMatch(/deposit/i);
    expect(spec.decisionUsefulness).not.toMatch(/contribution/i);
    const shown = spec.interpretationChecks.slice(0, 3).join(' ');
    expect(shown).not.toMatch(/contribution|monthly budget/i);
    expect(shown).toMatch(/penalt/i);
  });

  it.each([
    ['fd', 'rbi.org.in', /compounds more often/i],
    ['cd', 'consumerfinance.gov', /not converted again/i]
  ])('%s scope names exclusions, basis and dated sources', (slug, host, basis) => {
    const scope = buildCalculatorScope(find(slug), defaults(slug))!;
    expect(scope).not.toBeNull();
    expect(scope.excluded).toMatch(/tax/i);
    expect(scope.excluded).toMatch(/penalt/i);
    expect(scope.basis).toMatch(basis);
    expect(scope.checked).toBe('2026-10-03');
    expect(scope.sources.some((s) => s.url.includes(host))).toBe(true);
  });
});
