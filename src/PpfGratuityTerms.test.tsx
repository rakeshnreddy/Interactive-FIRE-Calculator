import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalculatorLibrary, scheduleToCsv } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios } from './lib/calculatorStudios';
import { calculatorRawValues, validateCalculatorInputs } from './lib/calculatorInputState';
import { buildCalculatorScope } from './lib/calculatorScope';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null };
const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) => Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue])) as Record<string, number>;
const validate = (slug: string, extra: Record<string, string>) => validateCalculatorInputs(find(slug), { ...calculatorRawValues(find(slug), defaults(slug)), ...extra });

let root: Root | undefined;
let container: HTMLDivElement | undefined;
function live(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/plans', message: '', savedResultId: 'synthetic' })} savedResults={[]} />));
  return container;
}
function edit(key: string, value: string) {
  const input = container!.querySelector<HTMLInputElement>(`input[id$="-${key}"]`)!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
  return input;
}
afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('B64 PPF whole financial years and deposit limit', () => {
  it('rejects a part-year term with a whole-year message and accepts whole years', () => {
    const fractional = validate('ppf', { years: '15.5' });
    expect(fractional.values).toBeNull();
    expect(fractional.errors.years).toBe('PPF runs in whole financial years. Enter a whole number, such as 15 or 20.');
    expect(validate('ppf', { years: '20' }).values).not.toBeNull();
    // Other routes keep accepting part-year terms.
    expect(validate('fd', { years: '1.5' }).values).not.toBeNull();
  });

  it('rejects a yearly deposit above the ₹1,50,000 scheme limit', () => {
    expect(validate('ppf', { annual: '150000' }).values).not.toBeNull();
    expect(validate('ppf', { annual: '150001' }).errors.annual).toBe('Use 150000 or less.');
  });

  it('shows the message on the page and keeps the typed text', () => {
    const node = live('ppf');
    const input = edit('years', '15.5');
    expect(input.value).toBe('15.5');
    expect(node.textContent).toContain('PPF runs in whole financial years.');
  });

  it('explains the limits and timing in the helpers and scope with the 2019 scheme', () => {
    const inputs = find('ppf').inputs;
    expect(inputs.map((i) => [i.key, i.defaultValue])).toEqual([['annual', 150000], ['rate', 7.1], ['years', 15]]);
    expect(inputs.find((i) => i.key === 'annual')).toMatchObject({ max: 150000 });
    expect(inputs.find((i) => i.key === 'annual')!.helper).toMatch(/₹500 to ₹1,50,000 per financial year/);
    expect(inputs.find((i) => i.key === 'annual')!.helper).toMatch(/by 5 April/);
    expect(inputs.find((i) => i.key === 'years')!.helper).toMatch(/whole financial years/i);
    expect(inputs.find((i) => i.key === 'years')!.helper).toMatch(/15 years.*5-year blocks/);
    const scope = buildCalculatorScope(find('ppf'), defaults('ppf'))!;
    expect(scope.basis).toMatch(/by 5 April/);
    expect(scope.basis).toMatch(/credited once a year/);
    expect(scope.checked).toBe('2026-10-04');
    expect(scope.sources.map((s) => s.url)).toContain('https://www.indiapost.gov.in/documents/offerings/schemesandservices/posb/PublicProvidentFundScheme2019English.pdf');
  });

  it('keeps valid results and caps only the over-limit what-if deposit', () => {
    // Decimal oracle: 150000 × ((1.071^15 − 1)/0.071) × 1.071.
    expect(calculateSeoCalculator(find('ppf'), defaults('ppf')).metrics[0].value).toBeCloseTo(4068209.2202879056, 6);
    const scenarios = buildCalculatorScenarios(find('ppf'), defaults('ppf'));
    expect(scenarios.map((s) => [s.id, s.values])).toEqual([
      ['conservative', { annual: 132000, rate: 6.035, years: 13 }],
      ['base', { annual: 150000, rate: 7.1, years: 15 }],
      ['optimistic', { annual: 150000, rate: 8.165, years: 17 }]
    ]);
    expect(scenarios[0].result.metrics[0].value).toBeCloseTo(2648809.6927779075, 6);
    expect(scenarios[2].result.metrics[0].value).toBeCloseTo(5558540.3199944254, 6);
  });
});

describe('B65 gratuity table ends at the entered service', () => {
  it('ends at 8.5 entered years with the headline benefit and a model note', () => {
    const values = { ...defaults('gratuity'), years: 8.5 };
    const result = calculateSeoCalculator(find('gratuity'), values);
    const schedule = buildCalculatorDetailSchedule(find('gratuity'), values, result)!;
    const last = schedule.rows.at(-1)!;
    expect(last.values.year).toBe(8.5);
    // Decimal oracle: 120000 × 15/26 × 8.5.
    expect(Number(last.values.benefit)).toBeCloseTo(588461.5384615385, 6);
    expect(Number(last.values.benefit)).toBeCloseTo(result.metrics[0].value, 9);
    expect(last.note).toMatch(/used exactly as entered/);
    expect(last.note).toMatch(/not applied/);
    expect(scheduleToCsv(find('gratuity'), schedule).trim().split('\n').at(-1)).toMatch(/^"?8\.5"?,/);
  });

  it('keeps whole-year rows and notes unchanged', () => {
    const rows = buildCalculatorDetailSchedule(find('gratuity'), defaults('gratuity'))!.rows;
    expect(rows).toHaveLength(8);
    expect(rows.map((r) => r.note)).toEqual(['Often below common vesting threshold', 'Often below common vesting threshold', 'Often below common vesting threshold', 'Often below common vesting threshold', undefined, undefined, undefined, undefined]);
    expect(Number(rows.at(-1)!.values.benefit)).toBeCloseTo(553846.1538461539, 6);
    expect(buildCalculatorDetailSchedule(find('gratuity'), { ...defaults('gratuity'), years: 0 })).toBeNull();
  });
});
