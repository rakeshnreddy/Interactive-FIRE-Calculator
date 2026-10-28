import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CalculatorLibrary, type CalculatorSaveRequest, type CalculatorSavedResult } from './CalculatorLibrary';
import type { AuthState } from './auth';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
let root: Root; let container: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); localStorage.clear(); });
describe('versioned payback/catch-up history', () => {
  it.each(['mortgage-refinance','social-security-break-even'])('preserves %s legacy snapshots and requires explicit save', async slug => {
    const saved: CalculatorSavedResult = {
      id: 'synthetic-old', calculatorSlug: slug, calculatorTitle: 'Saved estimate', createdAt: '2026-09-01T00:00:00Z', currency: 'USD',
      inputValues: slug === 'mortgage-refinance' ? {principal:12000,currentRate:0,newRate:0,years:1,closingCosts:1200} : {early:1800,full:1800,delayYears:5},
      result: { narrative: 'Legacy zero payback', metrics: [{ label: slug === 'mortgage-refinance' ? 'Monthly savings' : 'Break-even years after delaying', value: 0, valueType: slug === 'mortgage-refinance' ? 'currency' : 'years' }] }
    };
    const original = JSON.stringify(saved);
    const save = vi.fn(async (_request: CalculatorSaveRequest) => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: 'synthetic-new' }));
    const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-unit-token', user: { id: 'synthetic-unit-user', email: 'synthetic@example.invalid', displayName: 'Synthetic' } };
    window.history.replaceState({}, '', '/calculators/'+slug);
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(<CalculatorLibrary auth={auth} route={'/calculators/'+slug} onNavigate={() => {}} onSaveResult={save} savedResults={[saved]} />));
    expect(container.querySelector('[data-legacy-model]')).not.toBeNull();
    expect(container.querySelector('[data-model-correction]')).toBeNull();
    const load = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Load saved inputs')!;
    await act(async () => load.click());
    expect(container.querySelector('[data-model-correction]')?.textContent).toContain('saved snapshot');
    expect(container.querySelector('[data-model-interpretation]')?.textContent).toContain(slug === 'mortgage-refinance' ? 'No payment saving' : 'No finite catch-up');
    expect(save).not.toHaveBeenCalled();expect(JSON.stringify(saved)).toBe(original);
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save result'))!;
    await act(async () => button.click());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].result.modelVersion).toBe(slug === 'mortgage-refinance' ? 'payback-v2' : 'catch-up-v2');
    expect(JSON.stringify(saved)).toBe(original);
  });
});


describe('savings and retirement model history', () => {
  const monthlyGrowth = 1.01 ** 12;
  const annuityFactor = (monthlyGrowth - 1) / 0.01;
  const cases: {
    name: string;
    slug: string;
    modelVersion: string;
    inputValues: Record<string, number>;
    legacyValue: number;
    expectedValue: number;
    headlineLabel: string;
    currency: string;
    inputKey: string;
    sampleValue: string;
  }[] = [
    {
      name: 'SIP Goal with existing savings',
      slug: 'sip-goal',
      modelVersion: 'savings-goal-monthly-v1',
      inputValues: { current: 1200, target: 2400, rate: 12, years: 1 },
      legacyValue: (2400 - 1200 * 1.12) / annuityFactor,
      expectedValue: (2400 - 1200 * monthlyGrowth) / annuityFactor,
      headlineLabel: 'Monthly savings needed',
      currency: 'INR',
      inputKey: 'target',
      sampleValue: '10000000'
    },
    {
      name: 'Retirement with zero saving years',
      slug: 'retirement',
      modelVersion: 'retirement-exact-term-v1',
      inputValues: { currentAge: 60, retirementAge: 60, currentSavings: 12000, monthly: 1000, annualTopUp: 2500, rate: 0, annualIncome: 800, withdrawalRate: 4 },
      legacyValue: 13000,
      expectedValue: 12000,
      headlineLabel: 'Projected retirement savings',
      currency: 'USD',
      inputKey: 'currentAge',
      sampleValue: '35'
    },
    {
      name: 'Retirement with one and a half saving months',
      slug: 'retirement',
      modelVersion: 'retirement-exact-term-v1',
      inputValues: { currentAge: 60, retirementAge: 60.125, currentSavings: 12000, monthly: 1000, annualTopUp: 2500, rate: 0, annualIncome: 800, withdrawalRate: 4 },
      legacyValue: 13000,
      expectedValue: 14000,
      headlineLabel: 'Projected retirement savings',
      currency: 'USD',
      inputKey: 'currentAge',
      sampleValue: '35'
    }
  ];

  it.each(cases)('preserves $name until explicitly reloading and saving current inputs', async correction => {
    const saved: CalculatorSavedResult = {
      id: 'synthetic-legacy',
      calculatorSlug: correction.slug,
      calculatorTitle: correction.name,
      createdAt: '2026-09-01T00:00:00Z',
      currency: correction.currency,
      inputValues: correction.inputValues,
      result: {
        narrative: 'Historical result under the earlier timing convention.',
        metrics: [{ label: correction.headlineLabel, value: correction.legacyValue, valueType: 'currency' }]
      }
    };
    const original = JSON.stringify(saved);
    const save = vi.fn(async (_request: CalculatorSaveRequest) => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: 'synthetic-current' }));
    const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-unit-token', user: { id: 'synthetic-unit-user', email: 'synthetic@example.invalid', displayName: 'Synthetic' } };
    window.history.replaceState({}, '', '/calculators/' + correction.slug);
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    await act(async () => root.render(<CalculatorLibrary auth={auth} route={'/calculators/' + correction.slug} onNavigate={() => {}} onSaveResult={save} savedResults={[saved]} />));

    const input = () => container.querySelector<HTMLInputElement>(`input[name="${correction.inputKey}"]`)!;
    const savedHeadline = () => container.querySelectorAll('.calculator-history-compare strong')[1]?.textContent;
    const formattedLegacy = new Intl.NumberFormat(correction.currency === 'INR' ? 'en-IN' : 'en-US', { style: 'currency', currency: correction.currency, maximumFractionDigits: 0 }).format(correction.legacyValue);
    const initialHeadline = container.querySelector('.calculator-result-metric-primary strong')?.textContent;
    expect(input().value).toBe(correction.sampleValue);
    expect(savedHeadline()).toBe(formattedLegacy);
    expect(container.querySelector('[data-legacy-model]')).not.toBeNull();
    expect(container.querySelector('[data-model-correction]')).toBeNull();
    expect(JSON.stringify(saved)).toBe(original);
    expect(save).not.toHaveBeenCalled();

    const load = [...container.querySelectorAll('button')].find(button => button.textContent === 'Load saved inputs')!;
    await act(async () => load.click());
    expect(input().value).toBe(String(correction.inputValues[correction.inputKey]));
    expect(container.querySelector('[data-model-correction]')?.textContent).toContain('saved snapshot');
    expect(container.querySelector('.calculator-result-metric-primary strong')?.textContent).not.toBe(initialHeadline);
    expect(savedHeadline()).toBe(formattedLegacy);
    expect(JSON.stringify(saved)).toBe(original);
    expect(save).not.toHaveBeenCalled();

    const saveButton = [...container.querySelectorAll('button')].find(button => button.textContent?.trim() === 'Save result')!;
    expect(saveButton.disabled).toBe(false);
    await act(async () => saveButton.click());
    expect(save).toHaveBeenCalledTimes(1);
    const request = save.mock.calls[0][0];
    expect(request.values).toEqual(correction.inputValues);
    expect(request.result.modelVersion).toBe(correction.modelVersion);
    expect(request.result.metrics[0].label).toBe(correction.headlineLabel);
    expect(request.result.metrics[0].value).toBeCloseTo(correction.expectedValue, 8);
    expect(request.result.metrics[0].value).not.toBeCloseTo(correction.legacyValue, 8);
    expect(savedHeadline()).toBe(formattedLegacy);
    expect(JSON.stringify(saved)).toBe(original);
    expect(saved.result).not.toHaveProperty('modelVersion');
  });
});
