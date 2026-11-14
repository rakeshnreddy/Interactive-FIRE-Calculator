import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App from './App';
import type { CalculatorSavedResult, CalculatorSaveRequest } from './CalculatorLibrary';
import { CashflowPlanningCalculator, toNetWorthResult } from './CashflowPlanningCalculator';
import {
  calculateEmergencyFund,
  calculateNetWorth,
  defaultEmergencyFundInputs,
  defaultNetWorthInputs,
  emergencyFundFormulaVersion,
  netWorthFormulaVersion
} from './lib/cashflowPlanningCalculators';
import {
  buildCalculatorDetailSchedule,
  buildCalculatorStudioChart,
  getCalculatorStudioMetadata
} from './lib/calculatorStudios';
import { calculateFirePlan, type PlanInput } from './lib/fire';
import { calculateSeoCalculator, findSeoCalculator } from './lib/seoCalculators';
import { planWarnings } from './lib/warnings';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const signedInAuth: AuthState = {
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

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

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
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
  Element.prototype.scrollIntoView = vi.fn();
  window.history.replaceState({}, '', '/');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
  }
  window.history.replaceState({}, '', '/');
  window.localStorage.clear();
  document.body.innerHTML = '';
});

async function setInputValue(selector: string, value: string) {
  const input = document.querySelector<HTMLInputElement>(selector);
  if (!input) throw new Error(`Missing input ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function setSelectValue(selector: string, value: string) {
  const select = document.querySelector(selector) as HTMLSelectElement | null;
  if (!select) throw new Error(`Missing select ${selector}`);
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value')!.set!;
  await act(async () => {
    setter.call(select, value);
    select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

describe('B73 / C35 dedicated planners & saved-record integrity', () => {
  it('CBS-01: puts Estimated net worth at metrics[0] on Net Worth save and HistoryPanel', async () => {
    const projection = calculateNetWorth(defaultNetWorthInputs);
    const result = toNetWorthResult(projection);
    expect(result.metrics.map((m) => m.label)).toEqual([
      'Estimated net worth',
      'Total assets',
      'Total liabilities',
      'Liquid assets',
      'Liquid position'
    ]);
    expect(result.metrics[0]).toMatchObject({
      label: 'Estimated net worth',
      value: 175_000,
      valueType: 'currency'
    });

    const calculator = findSeoCalculator('/calculators/net-worth')!;
    const saveSpy = vi.fn(async (_request: CalculatorSaveRequest) => ({
      destinationRoute: '/accounts' as const,
      message: 'Saved',
      savedResultId: 'nw-1'
    }));
    const savedSnapshot: CalculatorSavedResult = {
      id: 'nw-saved-1',
      calculatorSlug: 'net-worth',
      calculatorTitle: 'Net Worth Calculator',
      currency: 'USD',
      createdAt: '2026-10-18T12:00:00Z',
      inputValues: { ...defaultNetWorthInputs, assets: 250_000, liabilities: 75_000 },
      result
    };

    await act(async () => {
      root!.render(
        <CashflowPlanningCalculator
          auth={signedInAuth}
          calculator={calculator}
          onNavigate={() => undefined}
          onSaveResult={saveSpy}
          savedResults={[savedSnapshot]}
        />
      );
    });

    const saveBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Save snapshot & add accounts')
    )!;
    await act(async () => {
      saveBtn.click();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(saveSpy.mock.calls[0][0].result.metrics[0]).toMatchObject({
      label: 'Estimated net worth',
      value: 175_000,
      valueType: 'currency'
    });

    const historyText = document.querySelector('.compound-history-list')?.textContent ?? '';
    expect(historyText).toContain('Estimated net worth');
    expect(historyText).toContain('$175,000');
  });

  it('CBS-02: persists and restores incomeStability across saved Emergency Fund snapshots while defaulting legacy snapshots to stable', async () => {
    const calculator = findSeoCalculator('/calculators/emergency-fund')!;
    const saveSpy = vi.fn(async (_request: CalculatorSaveRequest) => ({
      destinationRoute: '/goals' as const,
      message: 'Saved',
      savedResultId: 'ef-1'
    }));

    const { incomeStability: _, ...legacyNumericDefaults } = defaultEmergencyFundInputs;
    const legacySnapshot: CalculatorSavedResult = {
      id: 'ef-legacy',
      calculatorSlug: 'emergency-fund',
      calculatorTitle: 'Emergency Fund Calculator',
      currency: 'USD',
      createdAt: '2026-09-01T12:00:00Z',
      inputValues: { ...legacyNumericDefaults, dependents: 0, householdEarners: 1 },
      result: {
        metrics: [{ label: 'Emergency fund target', value: 27_000, valueType: 'currency' }],
        narrative: 'Legacy reserve snapshot'
      }
    };

    await act(async () => {
      root!.render(
        <CashflowPlanningCalculator
          auth={signedInAuth}
          calculator={calculator}
          onNavigate={() => undefined}
          onSaveResult={saveSpy}
          savedResults={[legacySnapshot]}
        />
      );
    });

    await setSelectValue('#planning-incomeStability', 'uncertain');
    await setSelectValue('#planning-householdEarners', '1');
    await setInputValue('#planning-dependents', '3');

    const saveBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Create emergency-fund goal')
    )!;
    await act(async () => {
      saveBtn.click();
    });

    expect(saveSpy).toHaveBeenCalledTimes(1);
    const savedValues = saveSpy.mock.calls[0][0].values;
    expect(savedValues.incomeStabilityCode).toBe(2);

    const savedWithUncertain: CalculatorSavedResult = {
      id: 'ef-uncertain',
      calculatorSlug: 'emergency-fund',
      calculatorTitle: 'Emergency Fund Calculator',
      currency: 'USD',
      createdAt: '2026-10-18T12:00:00Z',
      inputValues: savedValues,
      result: saveSpy.mock.calls[0][0].result
    };

    await act(async () => {
      root!.render(
        <CashflowPlanningCalculator
          auth={signedInAuth}
          calculator={calculator}
          onNavigate={() => undefined}
          onSaveResult={saveSpy}
          savedResults={[savedWithUncertain, legacySnapshot]}
        />
      );
    });

    // Reset current UI state to variable first to verify reload restores uncertain -> legacy -> stable.
    await setSelectValue('#planning-incomeStability', 'variable');
    const historyButtons = [...document.querySelectorAll('.compound-history-list button')] as HTMLButtonElement[];
    await act(async () => {
      historyButtons[0].click();
    });
    expect((document.querySelector('#planning-incomeStability') as HTMLSelectElement | null)?.value).toBe('uncertain');
    expect(calculateEmergencyFund({ ...defaultEmergencyFundInputs, incomeStability: 'uncertain', householdEarners: 1, dependents: 3 }).riskReferenceMonths).toBe(9.5);
    expect(document.body.textContent).toContain('9.5');

    // Loading a legacy snapshot without incomeStabilityCode cleanly resets incomeStability to 'stable'.
    await act(async () => {
      historyButtons[1].click();
    });
    expect((document.querySelector('#planning-incomeStability') as HTMLSelectElement | null)?.value).toBe('stable');
  });

  it('CBS-04 & CBS-05: equips life-insurance-needs with Planning category, assumptions, overfunded narrative, supporting metrics, and 4-bar waterfall chart', () => {
    const calculator = findSeoCalculator('/calculators/life-insurance-needs')!;
    expect(calculator.category).toBe('Planning');

    const metadata = getCalculatorStudioMetadata(calculator);
    expect(metadata.relatedCalculators.some((item) => item.slug === 'cagr')).toBe(false);

    const defaults = { income: 100_000, years: 10, debts: 150_000, savings: 100_000 };
    const result = calculateSeoCalculator(calculator, defaults);
    expect(result.metrics.map((m) => [m.label, m.value])).toEqual([
      ['Coverage need', 1_050_000],
      ['Income replacement need', 1_000_000],
      ['Debts and final expenses', 150_000],
      ['Existing savings / coverage', 100_000]
    ]);
    expect(result.assumptions.length).toBeGreaterThanOrEqual(2);
    expect(result.assumptions.join(' ').toLowerCase()).toMatch(/undiscounted|nominal/);

    const chart = buildCalculatorStudioChart(calculator, defaults, result);
    const schedule = buildCalculatorDetailSchedule(calculator, defaults, result)!;
    expect(chart.type).toBe('waterfall');
    expect(chart.entries.map((entry) => entry.primary)).toEqual([1_000_000, 150_000, -100_000, 1_050_000]);
    expect(chart.entries.map((entry) => entry.primary)).toEqual(
      schedule.rows.map((row) => Number(row.values.amount))
    );

    const overfunded = calculateSeoCalculator(calculator, { ...defaults, savings: 1_200_000 });
    expect(overfunded.metrics[0].value).toBe(0);
    expect(overfunded.narrative.toLowerCase()).toMatch(/exceed|already cover|fully cover/);
  });

  it('CBS-07: formats HistoryPanel values and dates, exposes PlanningSelectField aria-invalid errors, and forwards resolvedLocale to percent formatters', () => {
    const budgetCalc = findSeoCalculator('/calculators/budget')!;
    const floatHistory: CalculatorSavedResult = {
      id: 'budget-float-1',
      calculatorSlug: 'budget',
      calculatorTitle: 'Budget Calculator',
      currency: 'USD',
      createdAt: '2026-10-18T12:00:00Z',
      inputValues: {},
      result: {
        metrics: [
          { label: 'Monthly surplus', value: 2496.6700000000005, valueType: 'currency' }
        ],
        narrative: 'Surplus'
      }
    };
    window.history.replaceState({}, '', `/calculators/budget?v=finpath-budget-v2&locale=de-DE`);
    const budgetHtml = renderToStaticMarkup(
      <CashflowPlanningCalculator
        auth={signedInAuth}
        calculator={budgetCalc}
        onNavigate={() => undefined}
        onSaveResult={async () => ({ destinationRoute: '/transactions', message: 'Saved', savedResultId: 'b-1' })}
        savedResults={[floatHistory]}
      />
    );
    expect(budgetHtml).not.toContain('2496.6700000000005');
    expect(budgetHtml).toMatch(/2\.496,67/);
    expect(budgetHtml).toContain('18.10.2026');

    const efCalc = findSeoCalculator('/calculators/emergency-fund')!;
    window.history.replaceState(
      {},
      '',
      `/calculators/emergency-fund?v=${emergencyFundFormulaVersion}&cashOnHand=3000&bankSavings=12000&shortTermDeposits=10000&monthlyEssentials=4500&targetMonths=6&incomeStability=invalid&householdEarners=9&locale=de-DE`
    );
    const efHtml = renderToStaticMarkup(
      <CashflowPlanningCalculator
        auth={signedInAuth}
        calculator={efCalc}
        onNavigate={() => undefined}
        onSaveResult={async () => ({ destinationRoute: '/goals', message: 'Saved', savedResultId: 'ef-1' })}
        savedResults={[]}
      />
    );
    document.body.innerHTML = efHtml;
    const stabilitySelect = document.querySelector('#planning-incomeStability')!;
    const earnersSelect = document.querySelector('#planning-householdEarners')!;
    expect(stabilitySelect.getAttribute('aria-invalid')).toBe('true');
    expect(stabilitySelect.getAttribute('aria-describedby')).toContain('planning-incomeStability-error');
    expect(earnersSelect.getAttribute('aria-invalid')).toBe('true');
    expect(document.querySelector('#planning-incomeStability-error')?.textContent).toContain('Choose an income pattern.');

    window.history.replaceState(
      {},
      '',
      `/calculators/emergency-fund?v=${emergencyFundFormulaVersion}&cashOnHand=3000&bankSavings=12000&shortTermDeposits=10000&monthlyEssentials=4500&targetMonths=6&locale=de-DE`
    );
    const validEfHtml = renderToStaticMarkup(
      <CashflowPlanningCalculator
        auth={signedInAuth}
        calculator={efCalc}
        onNavigate={() => undefined}
        onSaveResult={async () => ({ destinationRoute: '/goals', message: 'Saved', savedResultId: 'ef-1' })}
        savedResults={[]}
      />
    );
    // 25,000 / 27,000 = 92.6% funded -> de-DE comma separator
    expect(validEfHtml).toMatch(/92,6/);

    const nwCalc = findSeoCalculator('/calculators/net-worth')!;
    window.history.replaceState(
      {},
      '',
      `/calculators/net-worth?v=${netWorthFormulaVersion}&locale=de-DE`
    );
    const nwHtml = renderToStaticMarkup(
      <CashflowPlanningCalculator
        auth={signedInAuth}
        calculator={nwCalc}
        onNavigate={() => undefined}
        onSaveResult={async () => ({ destinationRoute: '/accounts', message: 'Saved', savedResultId: 'nw-1' })}
        savedResults={[]}
      />
    );
    // creditCards $4,000 / $75,000 liabilities = 5.3% -> de-DE comma separator
    expect(nwHtml).toMatch(/5,3/);
    expect(nwHtml).not.toContain('5.3%');
  });

  it('RINC-07: handles blank optional Need benchmark in Withdrawal mode without critical errors or NaN and renders portfolioMode.rows in Results', async () => {
    window.history.replaceState({}, '', '/calculators/fire');
    await act(async () => {
      root!.render(<App auth={publicOnlyAuth} />);
    });

    const withdrawalModeBtn = [...document.querySelectorAll('.segmented button')].find((b) =>
      b.textContent?.trim() === 'Withdrawal'
    ) as HTMLButtonElement;
    await act(async () => {
      withdrawalModeBtn.click();
    });

    await setInputValue('#fire-annual-expense', '');
    await setInputValue('#fire-return', '7');
    await setInputValue('#fire-inflation', '2.5');

    const calcBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Calculate'
    )!;
    await act(async () => {
      calcBtn.click();
    });

    expect(document.querySelector('#fire-annual-expense')?.getAttribute('aria-invalid')).not.toBe('true');
    expect(document.body.textContent).not.toContain('Annual expense must be a finite non-negative number');
    expect(document.body.textContent).not.toContain('Not feasible');
    expect(document.body.textContent).toContain('No benchmark set');
    expect(document.querySelector('.warning-critical')).toBeNull();

    const resultsTab = [...document.querySelectorAll('[role="tab"]')].find((b) =>
      b.textContent?.includes('Results')
    ) as HTMLButtonElement;
    await act(async () => {
      resultsTab.click();
    });

    const tableToggle = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Table'
    ) as HTMLButtonElement;
    await act(async () => {
      tableToggle.click();
    });

    const table = document.querySelector('#results table');
    expect(table?.getAttribute('aria-label')).toContain('Annual withdrawal projection');
    expect(table?.textContent).toContain('$750,000');
    expect(table?.textContent).toContain('$46,587');

    const currentBasisBtn = [...document.querySelectorAll('#results .segmented button')].find((b) =>
      b.textContent?.trim() === 'Current'
    ) as HTMLButtonElement;
    await act(async () => {
      currentBasisBtn.click();
    });
    expect(document.querySelector('#results table')?.getAttribute('aria-label')).toContain(
      'Current portfolio stress test'
    );
  });

  it('RINC-12: formats FIRE planWarnings Funding gap notice using active currency (INR ₹)', async () => {
    const plan: PlanInput = {
      annualExpense: 80_000,
      initialPortfolio: 750_000,
      withdrawalTiming: 'end',
      desiredFinalValue: 0,
      ratePeriods: [{ duration: 30, r: 0.07, i: 0.025 }],
      oneOffEvents: [],
      recurringCashFlows: []
    };
    const result = calculateFirePlan(plan);
    const notices = planWarnings(plan, result, result.expenseMode.rows, 30, 'INR');
    const gapNotice = notices.find((item) => item.title === 'Funding gap');
    expect(gapNotice?.message).toContain('₹5,37,909');
    expect(gapNotice?.message).not.toContain('$');

    window.history.replaceState({}, '', '/calculators/fire');
    await act(async () => {
      root!.render(<App auth={publicOnlyAuth} />);
    });

    const inrBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Indian rupee (₹)')
    )!;
    await act(async () => {
      inrBtn.click();
    });

    await setInputValue('#fire-return', '7');
    await setInputValue('#fire-inflation', '2.5');
    const calcBtn = [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.trim() === 'Calculate'
    )!;
    await act(async () => {
      calcBtn.click();
    });

    const healthPanelText = document.querySelector('.health-panel')?.textContent ?? '';
    expect(healthPanelText).toContain('₹5,37,909');
    expect(healthPanelText).not.toContain('$537,909');
  });
});
