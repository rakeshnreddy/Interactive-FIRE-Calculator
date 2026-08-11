import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { AuthState } from './auth';
import {
  buildPlanningShareUrl,
  CashflowPlanningCalculator,
  restorePlanningState
} from './CashflowPlanningCalculator';
import {
  budgetFormulaVersion,
  defaultBudgetInputs,
  defaultEmergencyFundInputs,
  defaultNetWorthInputs,
  emergencyFundFormulaVersion,
  netWorthFormulaVersion
} from './lib/cashflowPlanningCalculators';
import { findSeoCalculator } from './lib/seoCalculators';

const auth: AuthState = {
  provider: 'clerk',
  status: 'signed-in',
  isConfigured: true,
  isSignedIn: true,
  getToken: async () => null,
  user: { displayName: 'Test user', id: 'user-1' }
};

const publicOnlyAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value))
    }
  });
});

afterEach(() => {
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
  document.body.innerHTML = '';
});

describe('cashflow planning route presentation', () => {
  for (const [slug, expected] of [
    ['net-worth', ['Estimated net worth', '$175,000', 'Liquid position', 'Balance-sheet audit']],
    ['budget', ['Monthly surplus', '$2,500', 'Still unassigned', 'Cashflow stress checks']],
    ['emergency-fund', ['Emergency fund target', '$27,000', 'Current runway', 'Coverage comparisons']]
  ] as const) {
    it(`renders the ${slug} route with labeled controls, result definitions, and collapsed analysis`, () => {
      const calculator = findSeoCalculator(`/calculators/${slug}`);
      expect(calculator).toBeDefined();
      const html = renderToStaticMarkup(
        <CashflowPlanningCalculator
          auth={auth}
          calculator={calculator!}
          onNavigate={() => undefined}
          onSaveResult={async () => ({ destinationRoute: calculator!.conversionRoute, message: 'Saved', savedResultId: 'saved-1' })}
          savedResults={[]}
        />
      );
      document.body.innerHTML = html;

      expect(document.querySelector('h1')?.textContent).toBe(calculator!.h1);
      for (const phrase of expected) expect(document.body.textContent).toContain(phrase);
      const details = [...document.querySelectorAll('details')];
      expect(details.length).toBeGreaterThanOrEqual(4);
      expect(details.every((item) => !item.open)).toBe(true);
      [...document.querySelectorAll('input, select')].forEach((item) => {
        const control = item as HTMLInputElement | HTMLSelectElement;
        expect(control.name).not.toBe('');
        expect(control.getAttribute('aria-describedby')).toBeTruthy();
        expect(control.closest('label') ?? document.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
      });
      expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
      expect(document.querySelector('[role="img"], [role="progressbar"]')).not.toBeNull();
      expect(document.querySelectorAll('table caption').length).toBeGreaterThanOrEqual(1);
      expect(document.body.textContent).not.toMatch(/this result (is|will be) guaranteed|we promise/i);
    });
  }

  it('uses direct category inputs rather than the legacy two-total net-worth form', () => {
    const calculator = findSeoCalculator('/calculators/net-worth')!;
    document.body.innerHTML = renderToStaticMarkup(
      <CashflowPlanningCalculator auth={auth} calculator={calculator} onNavigate={() => undefined} onSaveResult={async () => ({ destinationRoute: '/accounts', message: 'Saved', savedResultId: 'saved-1' })} savedResults={[]} />
    );
    expect(document.querySelector('#planning-cashAndBank')).not.toBeNull();
    expect(document.querySelector('#planning-realEstate')).not.toBeNull();
    expect(document.querySelector('#planning-creditCards')).not.toBeNull();
    expect(document.querySelector('#planning-assets')).toBeNull();
  });

  it('keeps budget savings allocation separate from the spending surplus', () => {
    const calculator = findSeoCalculator('/calculators/budget')!;
    document.body.innerHTML = renderToStaticMarkup(
      <CashflowPlanningCalculator auth={auth} calculator={calculator} onNavigate={() => undefined} onSaveResult={async () => ({ destinationRoute: '/transactions', message: 'Saved', savedResultId: 'saved-1' })} savedResults={[]} />
    );
    expect(document.body.textContent).toContain('$7,000 income − $4,500 spending');
    expect(document.body.textContent).toContain('$1,500');
    expect(document.body.textContent).toContain('$1,000');
  });

  it('shows emergency-fund liquidity tiers and does not imply hidden interest', () => {
    const calculator = findSeoCalculator('/calculators/emergency-fund')!;
    document.body.innerHTML = renderToStaticMarkup(
      <CashflowPlanningCalculator auth={auth} calculator={calculator} onNavigate={() => undefined} onSaveResult={async () => ({ destinationRoute: '/goals', message: 'Saved', savedResultId: 'saved-1' })} savedResults={[]} />
    );
    expect(document.body.textContent).toContain('Immediate');
    expect(document.body.textContent).toContain('Short notice');
    expect(document.body.textContent).toContain('Market exposed');
    expect(document.body.textContent).toContain('no assumed growth');
  });

  it('renders public-only save controls without requiring ClerkProvider', () => {
    const calculator = findSeoCalculator('/calculators/net-worth')!;
    const html = renderToStaticMarkup(
      <CashflowPlanningCalculator auth={publicOnlyAuth} calculator={calculator} onNavigate={() => undefined} onSaveResult={async () => ({ destinationRoute: '/accounts', message: 'Saved', savedResultId: 'saved-1' })} savedResults={[]} />
    );
    document.body.innerHTML = html;
    expect(document.body.textContent).toContain('Keep browser draft');
    expect(document.body.textContent).not.toContain('Create account to save');
  });
});

describe('cashflow planning share and draft boundaries', () => {
  it('builds versioned, input-only links for all three routes', () => {
    const cases = [
      ['net-worth', netWorthFormulaVersion, defaultNetWorthInputs],
      ['budget', budgetFormulaVersion, defaultBudgetInputs],
      ['emergency-fund', emergencyFundFormulaVersion, defaultEmergencyFundInputs]
    ] as const;
    for (const [slug, version, inputs] of cases) {
      const share = new URL(buildPlanningShareUrl(slug, version, inputs, 'INR', 'en-IN', 'https://example.com/old?secret=remove'));
      expect(share.pathname).toBe(`/calculators/${slug}`);
      expect(share.searchParams.get('v')).toBe(version);
      expect(share.searchParams.get('currency')).toBe('INR');
      expect(share.searchParams.get('locale')).toBe('en-IN');
      expect(share.searchParams.has('secret')).toBe(false);
    }
  });

  it('restores a current version share and rejects an unknown version', () => {
    window.history.replaceState({}, '', `/calculators/budget?v=${budgetFormulaVersion}&takeHomePay=9000&currency=EUR&locale=de-DE`);
    const restored = restorePlanningState('budget', budgetFormulaVersion, defaultBudgetInputs);
    expect(restored?.source).toBe('share');
    expect(restored?.inputs.takeHomePay).toBe(9_000);
    expect(restored?.currency).toBe('EUR');
    expect(restored?.locale).toBe('de-DE');

    window.history.replaceState({}, '', '/calculators/budget?v=unknown-v99&takeHomePay=1');
    expect(restorePlanningState('budget', budgetFormulaVersion, defaultBudgetInputs)).toBeNull();
  });

  it('restores only matching typed draft fields', () => {
    window.localStorage.setItem('finpath.calculatorDraft.net-worth.v2', JSON.stringify({
      currency: 'GBP',
      formulaVersion: netWorthFormulaVersion,
      inputs: { ...defaultNetWorthInputs, cashAndBank: 40_000, mortgage: 'not-a-number' },
      locale: 'en-US',
      updatedAt: '2026-08-09T00:00:00.000Z'
    }));
    window.history.replaceState({}, '', '/calculators/net-worth');
    const restored = restorePlanningState('net-worth', netWorthFormulaVersion, defaultNetWorthInputs);
    expect(restored?.source).toBe('draft');
    expect(restored?.inputs.cashAndBank).toBe(40_000);
    expect(restored?.inputs.mortgage).toBe(defaultNetWorthInputs.mortgage);
  });
});
