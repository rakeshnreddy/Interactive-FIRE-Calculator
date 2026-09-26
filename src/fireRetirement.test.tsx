// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App from './App';
import { HERO_FIRE_FIXTURE } from './lib/heroExample';
import { SAVED_PLANS_KEY } from './lib/api/plans';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null };
let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);
const calcButton = () => $<HTMLButtonElement>('.quick-actions .primary-button')!;

async function type(selector: string, value: string) {
  const input = $<HTMLInputElement>(selector);
  if (!input) throw new Error(`missing ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

async function click(element: HTMLElement | null) {
  if (!element) throw new Error('missing element');
  await act(async () => {
    element.click();
  });
}

const buttonByText = (text: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((b) => b.textContent?.trim() === text) ?? null;
const issueFor = (id: string) => {
  const input = $<HTMLInputElement>(`#${id}`);
  const describedBy = input?.getAttribute('aria-describedby')?.split(' ') ?? [];
  return describedBy.map((ref) => document.getElementById(ref)?.textContent ?? '').join(' ');
};

async function renderFire() {
  await act(async () => {
    root.render(<App auth={auth} />);
  });
}

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({ matches: false, media: query, onchange: null, addListener: vi.fn(), removeListener: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn() }))
  });
  window.localStorage.clear();
  window.history.replaceState({}, '', '/calculators/fire');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

describe('B36: FIRE answers "when can I retire?"', () => {
  it('fresh load: return and inflation are empty and required, and no result is shown', async () => {
    await renderFire();
    expect($<HTMLInputElement>('#fire-return')!.value).toBe('');
    expect($<HTMLInputElement>('#fire-inflation')!.value).toBe('');
    expect(calcButton().disabled).toBe(true);
    expect($('#fire-calc-blocker')?.textContent).toMatch(/Enter expected return and inflation/);
    expect($('.hero-result')).toBeNull();
    expect(document.body.textContent).not.toMatch(/No growth or inflation assumed/);
    expect($('.advanced-summary')?.textContent).toMatch(/Return and inflation not set yet/);
    expect(issueFor('fire-return')).not.toMatch(/Enter an expected annual return/);
  });

  it('one click applies the homepage example rates, labelled as illustrative', async () => {
    await renderFire();
    await click(buttonByText('Use example values'));
    const heroRates = HERO_FIRE_FIXTURE.ratePeriods[0];
    expect(Number($<HTMLInputElement>('#fire-return')!.value) / 100).toBeCloseTo(heroRates.r, 10);
    expect(Number($<HTMLInputElement>('#fire-inflation')!.value) / 100).toBeCloseTo(heroRates.i, 10);
    expect($('.rate-example-note')?.textContent).toMatch(/illustrative assumptions, not forecasts or historical averages/);
    expect(calcButton().disabled).toBe(false);
  });

  it('shows "Retire at about age X" with the chosen rates next to the answer', async () => {
    await renderFire();
    await click(buttonByText('Use example values'));
    await type('#fire-annual-savings', '40000');
    await click(calcButton());
    const estimate = $('[data-testid="fire-retirement-estimate"]');
    expect(estimate?.textContent).toMatch(/Retire at about age \d+/);
    expect($('[data-testid="fire-estimate-rates"]')?.textContent).toMatch(/7% return and 2\.5% inflation/);
    expect(estimate?.textContent).toMatch(/At your chosen retirement age \(50\)/);
  });

  it('without savings, prompts for them instead of inventing an age', async () => {
    await renderFire();
    await click(buttonByText('Use example values'));
    await click(calcButton());
    expect($('[data-testid="fire-retirement-estimate"]')?.textContent).toMatch(/Add annual savings to estimate when you could retire/);
  });

  it('blank or negative spending and impossible ages withhold the result', async () => {
    await renderFire();
    await click(buttonByText('Use example values'));
    await type('#fire-annual-expense', '');
    expect(calcButton().disabled).toBe(true);
    expect(issueFor('fire-annual-expense')).toMatch(/Enter your annual spending/);
    await type('#fire-annual-expense', '-64000');
    expect(issueFor('fire-annual-expense')).toMatch(/Spending cannot be negative/);
    await type('#fire-annual-expense', '80000');
    await type('#fire-retirement-age', '30');
    expect(calcButton().disabled).toBe(true);
    expect(issueFor('fire-retirement-age')).toMatch(/after your current age/);
    expect($('#fire-calc-blocker')?.textContent).toMatch(/Fix the highlighted fields/);
  });

  it('a deliberately typed 0% is valid', async () => {
    await renderFire();
    await type('#fire-return', '0');
    await type('#fire-inflation', '0');
    expect(calcButton().disabled).toBe(false);
    await click(calcButton());
    expect($('.hero-result strong')?.textContent).toBe('$2,400,000');
  });

  it('INR uses rupee symbol and Indian grouping', async () => {
    await renderFire();
    await click(buttonByText('Indian rupee (₹)'));
    await type('#fire-return', '0');
    await type('#fire-inflation', '0');
    await click(calcButton());
    expect($('.hero-result strong')?.textContent).toBe('₹24,00,000');
  });

  it('a pre-B36 saved plan loads with its stored rates, not empty fields', async () => {
    window.localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify([{
      id: 'legacy-1', name: 'Legacy plan', createdAt: '2026-06-01T00:00:00.000Z',
      snapshot: {
        calculatorMode: 'fire-number',
        plan: { annualExpense: 50000, initialPortfolio: 600000, withdrawalTiming: 'end', desiredFinalValue: 0, ratePeriods: [{ duration: 30, r: 0.06, i: 0.03 }], oneOffEvents: [] },
        scenarios: [],
        timeline: { currentAge: 45, retirementAge: 55, planEndAge: 85 }
      }
    }]));
    await renderFire();
    await click(buttonByText('Load'));
    expect($<HTMLInputElement>('#fire-return')!.value).toBe('6');
    expect($<HTMLInputElement>('#fire-inflation')!.value).toBe('3');
    expect($<HTMLInputElement>('#fire-annual-savings')!.value).toBe('');
    expect(calcButton().disabled).toBe(false);
  });
});
