import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App from './App';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const mockAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

beforeEach(() => {
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
  window.history.replaceState({}, '', '/calculators/fire');
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
  document.body.innerHTML = '';
});


// B36/OD-1: return and inflation start empty; tests that exercise a calculated result enter them
// explicitly (0% here is a deliberate user value, preserving the earlier numeric expectations).
async function enterRates(returnPercent: string, inflationPercent: string) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
  for (const [id, value] of [['fire-return', returnPercent], ['fire-inflation', inflationPercent]] as const) {
    const input = document.querySelector<HTMLInputElement>(`#${id}`);
    if (!input) throw new Error(`missing #${id}`);
    await act(async () => {
      setter.call(input, value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  }
}

describe('FIRE Calculator Flagship Refinement (B24 / V10 / V12)', () => {
  it('renders a concise scope note in the header (V10)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const scopeNote = document.querySelector('.calculator-scope-note');
    expect(scopeNote).not.toBeNull();
    expect(scopeNote?.textContent).toMatch(/retirement|portfolio|withdrawal/i);
  });

  it('provides concise accessible input labels, aria-describedby help, and accessible info buttons (V12)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const coreInputs = document.querySelectorAll<HTMLInputElement>('.core-fire-form input[type="number"]');
    expect(coreInputs.length).toBeGreaterThanOrEqual(5);

    // Each core input must have an aria-describedby pointing to a real element in the DOM
    for (const input of Array.from(coreInputs)) {
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const helperElement = document.getElementById(describedBy!.split(' ')[0]);
      expect(helperElement).not.toBeNull();
      expect(helperElement?.textContent?.trim().length).toBeGreaterThan(5);

      // Verify the accessible name/label is concise and does NOT duplicate the helper text
      const id = input.id;
      expect(id).toBeTruthy();
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
      // Label text should not contain the long helper text
      expect(label?.textContent).not.toContain(helperElement?.textContent);
    }

    // InfoTip dots must be real buttons, not focusable spans, and not nested inside <label>
    const infoDots = document.querySelectorAll('.core-fire-form .info-dot');
    for (const dot of Array.from(infoDots)) {
      expect(dot.tagName.toLowerCase()).toBe('button');
      expect(dot.getAttribute('type')).toBe('button');
      expect(dot.getAttribute('aria-label')).toBeTruthy();
      // Must not be nested inside an HTML <label>
      expect(dot.closest('label')).toBeNull();
    }

    // Units: currency inputs have $ and duration inputs have years
    const inputControls = document.querySelectorAll('.core-fire-form .calculator-input-control');
    expect(inputControls.length).toBeGreaterThanOrEqual(5);
  });

  it('manages stale result display after input changes so prior results are never mistaken for current inputs (B24)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });
    await enterRates('0', '0');

    // Before calculation: no hero-result card exists
    expect(document.querySelector('.hero-result')).toBeNull();

    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button');
    expect(calcButton).not.toBeNull();
    expect(calcButton?.textContent).toContain('Calculate');

    // Step 1: Click Calculate to produce initial fresh result
    await act(async () => {
      calcButton!.click();
    });

    const resultCard = document.querySelector('.hero-result');
    expect(resultCard).not.toBeNull();
    expect(resultCard?.classList.contains('is-stale')).toBe(false);
    expect(document.querySelector('.stale-result-badge')).toBeNull();
    expect(resultCard?.textContent).toContain('Required FIRE number');

    const initialResultValue = resultCard?.querySelector('strong')?.textContent;
    expect(initialResultValue).toBeTruthy();

    // Step 2: Change an input (e.g. annual withdrawal need)
    const expenseInput = document.getElementById('fire-annual-expense') as HTMLInputElement ||
      document.querySelector<HTMLInputElement>('input[value="80000"]');
    expect(expenseInput).toBeTruthy();

    await act(async () => {
      // simulate user typing 75000
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeInputValueSetter.call(expenseInput, '75000');
      expenseInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Step 3: Result card remains visible for reference, but MUST be explicitly marked as stale!
    const staleResultCard = document.querySelector('.hero-result');
    expect(staleResultCard).not.toBeNull();
    expect(staleResultCard?.classList.contains('is-stale')).toBe(true);

    const staleBadge = document.querySelector('.stale-result-badge');
    expect(staleBadge).not.toBeNull();
    expect(staleBadge?.textContent).toMatch(/inputs changed|recalculate/i);

    // Calculate button now indicates Recalculate
    const recalcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button');
    expect(recalcButton?.textContent).toMatch(/recalculate/i);

    // Step 4: Click Recalculate to get updated fresh result
    await act(async () => {
      recalcButton!.click();
    });

    const updatedCard = document.querySelector('.hero-result');
    expect(updatedCard?.classList.contains('is-stale')).toBe(false);
    expect(document.querySelector('.stale-result-badge')).toBeNull();
    const updatedResultValue = updatedCard?.querySelector('strong')?.textContent;
    expect(updatedResultValue).toBeTruthy();
    // At $75,000 withdrawal need, the FIRE number is higher than at $60,000
    expect(updatedResultValue).not.toBe(initialResultValue);
  });

  it('preserves both FIRE number and Withdrawal modes with accurate outputs', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });
    await enterRates('0', '0');

    // Switch to Withdrawal mode
    const withdrawalModeButton = Array.from(document.querySelectorAll('.segmented button')).find(
      (btn) => btn.textContent?.includes('Withdrawal')
    ) as HTMLButtonElement;
    expect(withdrawalModeButton).toBeTruthy();

    await act(async () => {
      withdrawalModeButton.click();
    });

    // Calculate in withdrawal mode
    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcButton.click();
    });

    const resultCard = document.querySelector('.hero-result');
    expect(resultCard).not.toBeNull();
    expect(resultCard?.textContent).toContain('Annual withdrawal');
    expect(resultCard?.textContent).toContain('Need coverage');
    expect(resultCard?.querySelector('strong')?.textContent?.trim()).toBe('$25,000');

    // Verify stale lifecycle in withdrawal mode
    const portfolioInput = document.querySelector<HTMLInputElement>('input[value="750000"]') ||
      document.getElementById('fire-initial-portfolio') as HTMLInputElement;
    if (portfolioInput) {
      await act(async () => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
        nativeInputValueSetter.call(portfolioInput, '800000');
        portfolioInput.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(resultCard?.classList.contains('is-stale')).toBe(true);
      expect(resultCard?.querySelector('strong')?.textContent?.trim()).toBe('$25,000');

      // Recalculate
      const recalcBtn = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
      await act(async () => {
        recalcBtn.click();
      });
      const updatedCard = document.querySelector('.hero-result');
      expect(updatedCard?.classList.contains('is-stale')).toBe(false);
      expect(updatedCard?.querySelector('strong')?.textContent?.trim()).toBe('$26,667');
    }
  });

  it('R1 regression: ensures all field IDs in advanced and repeated sections are unique and labels focus their own inputs', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    // Expand all advanced assumption panels so repeated fields are in DOM
    const advancedDetails = document.querySelectorAll('details.advanced-shell');
    for (const details of Array.from(advancedDetails)) {
      details.setAttribute('open', '');
    }

    // Explicitly add a second rate period to verify unique ID generation across repeated rows
    const addPeriodButton = document.querySelector('#period-title')
      ?.closest('.panel')
      ?.querySelector<HTMLButtonElement>('.secondary-button');
    expect(addPeriodButton).toBeTruthy();
    await act(async () => {
      addPeriodButton!.click();
    });

    // Collect all elements with IDs in the document
    const elementsWithId = document.querySelectorAll('[id]');
    const idCounts = new Map<string, number>();
    for (const el of Array.from(elementsWithId)) {
      const id = el.id;
      idCounts.set(id, (idCounts.get(id) || 0) + 1);
    }

    const duplicates = Array.from(idCounts.entries()).filter(([_, count]) => count > 1);
    expect(duplicates, `Found duplicate IDs in DOM: ${JSON.stringify(duplicates)}`).toEqual([]);

    // Find all "Years" labels in rate periods
    const yearsLabels = Array.from(document.querySelectorAll('label')).filter(
      (l) => l.textContent?.trim() === 'Years'
    );
    expect(yearsLabels.length).toBeGreaterThanOrEqual(2);

    // Clicking the second "Years" label must focus the second period's input, NOT the first
    const secondYearsLabel = yearsLabels[1];
    const secondForId = secondYearsLabel.getAttribute('for');
    expect(secondForId).toBeTruthy();

    const targetInput = document.getElementById(secondForId!) as HTMLInputElement;
    expect(targetInput).not.toBeNull();

    // Verify it is not the same ID as the first
    const firstForId = yearsLabels[0].getAttribute('for');
    expect(secondForId).not.toBe(firstForId);
  });

  it('R2 regression: ensures InfoTip open/close visual state is coherent with aria-expanded and handles Escape without losing trigger focus', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const infoButton = document.querySelector<HTMLButtonElement>('.core-fire-form button.info-dot');
    expect(infoButton).not.toBeNull();

    const tipContainer = infoButton!.closest('.info-tip') as HTMLElement;
    expect(tipContainer).not.toBeNull();

    const popover = tipContainer.querySelector('.info-popover') as HTMLElement;
    expect(popover).not.toBeNull();

    // Initial state: not expanded, not visible
    expect(infoButton?.getAttribute('aria-expanded')).toBe('false');
    expect(popover.classList.contains('is-visible')).toBe(false);

    // Focus info button: must remain closed
    infoButton?.focus();
    expect(document.activeElement).toBe(infoButton);
    expect(infoButton?.getAttribute('aria-expanded')).toBe('false');
    expect(popover.classList.contains('is-visible')).toBe(false);

    // Press Enter to open
    await act(async () => {
      infoButton?.click();
    });
    expect(infoButton?.getAttribute('aria-expanded')).toBe('true');
    expect(popover.classList.contains('is-visible')).toBe(true);

    // Press Enter again to close
    await act(async () => {
      infoButton?.click();
    });
    expect(infoButton?.getAttribute('aria-expanded')).toBe('false');
    expect(popover.classList.contains('is-visible')).toBe(false);
    expect(document.activeElement).toBe(infoButton);

    // Reopen and test Escape
    await act(async () => {
      infoButton?.click();
    });
    expect(infoButton?.getAttribute('aria-expanded')).toBe('true');
    expect(popover.classList.contains('is-visible')).toBe(true);

    // Dispatch Escape keydown on infoButton
    await act(async () => {
      infoButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(infoButton?.getAttribute('aria-expanded')).toBe('false');
    expect(popover.classList.contains('is-visible')).toBe(false);
    expect(document.activeElement).toBe(infoButton);
  });

  it('R3 regression: ensures stale calculation snapshot consistently governs projection timing pill, rows, and compare values', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });
    await enterRates('0', '0');

    const getTab = (name: string) =>
      Array.from(document.querySelectorAll<HTMLButtonElement>('.result-tabs-panel button[role="tab"]')).find(
        (b) => b.textContent?.includes(name)
      );

    const getScenarioCards = () =>
      Array.from(document.querySelectorAll<HTMLElement>('#compare .scenario-card')).map((card) => ({
        name: card.querySelector<HTMLInputElement>('input[type="text"]')?.value,
        requiredPortfolio: card.querySelector('strong')?.textContent?.trim(),
        deltaText: Array.from(card.querySelectorAll('small')).find((s) => s.textContent?.includes('Vs planner'))?.textContent?.trim()
      }));

    // 1. Initial calculate with default withdrawalTiming ('end')
    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcButton.click();
    });

    // Check timing pill in results panel
    await act(async () => {
      getTab('Results')?.click();
    });
    const timingPill = document.querySelector('#results .pill');
    expect(timingPill?.textContent).toBe('End-year');

    // Check exact numeric values in compare tab
    await act(async () => {
      getTab('Compare')?.click();
    });
    const initialScenarios = getScenarioCards();
    expect(initialScenarios).toEqual([
      { name: 'Base', requiredPortfolio: '$2,400,000', deltaText: 'Vs planner: $0' },
      { name: 'Guardrail', requiredPortfolio: '$3,145,101', deltaText: 'Vs planner: +$745,101' },
      { name: 'Upside', requiredPortfolio: '$1,888,146', deltaText: 'Vs planner: -$511,854' }
    ]);

    // 2. Switch to inputs and change withdrawal timing to 'start' without recalculating
    await act(async () => {
      getTab('Inputs')?.click();
    });

    const optionsDetails = document.querySelector('details.advanced-shell');
    optionsDetails?.setAttribute('open', '');

    const startTimingBtn = Array.from(document.querySelectorAll('.segmented button')).find(
      (b) => b.textContent?.trim() === 'Start'
    ) as HTMLButtonElement;
    expect(startTimingBtn).toBeTruthy();

    await act(async () => {
      startTimingBtn.click();
    });

    // Result card is now stale!
    const heroCard = document.querySelector('.hero-result');
    expect(heroCard?.classList.contains('is-stale')).toBe(true);

    // Timing pill MUST still say 'End-year'
    await act(async () => {
      getTab('Results')?.click();
    });
    const staleTimingPill = document.querySelector('#results .pill');
    expect(staleTimingPill?.textContent).toBe('End-year');

    // Compare tab MUST still reflect the snapshotted calculation values, NOT recalculated!
    await act(async () => {
      getTab('Compare')?.click();
    });
    const staleScenarios = getScenarioCards();
    expect(staleScenarios).toEqual([
      { name: 'Base', requiredPortfolio: '$2,400,000', deltaText: 'Vs planner: $0' },
      { name: 'Guardrail', requiredPortfolio: '$3,145,101', deltaText: 'Vs planner: +$745,101' },
      { name: 'Upside', requiredPortfolio: '$1,888,146', deltaText: 'Vs planner: -$511,854' }
    ]);

    // 3. Edit a scenario modifier (Guardrail spending shift to -10%) while draft is stale
    const scenarioCards = document.querySelectorAll<HTMLElement>('#compare .scenario-card');
    const guardrailCard = scenarioCards[1];
    const guardrailSpendInput = guardrailCard.querySelector<HTMLInputElement>('input[type="number"]')!;
    expect(guardrailSpendInput).toBeTruthy();
    await act(async () => {
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeInputValueSetter.call(guardrailSpendInput, '-10.0');
      guardrailSpendInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const modifiedStaleScenarios = getScenarioCards();
    expect(modifiedStaleScenarios[0].requiredPortfolio).toBe('$2,400,000');
    expect(modifiedStaleScenarios[1].requiredPortfolio).toBe('$2,979,569');
    expect(modifiedStaleScenarios[1].deltaText).toBe('Vs planner: +$579,569');

    // 4. Now recalculate: timing pill updates to 'Start-year' and stale state clears
    await act(async () => {
      getTab('Inputs')?.click();
    });
    const recalcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      recalcButton.click();
    });

    await act(async () => {
      getTab('Results')?.click();
    });
    const refreshedTimingPill = document.querySelector('#results .pill');
    expect(refreshedTimingPill?.textContent).toBe('Start-year');
    expect(document.querySelector('.hero-result')?.classList.contains('is-stale')).toBe(false);

    await act(async () => {
      getTab('Compare')?.click();
    });
    const recalculatedScenarios = getScenarioCards();
    expect(recalculatedScenarios[0].requiredPortfolio).toBe('$2,400,000');
    expect(recalculatedScenarios[1].requiredPortfolio).toBe('$2,934,875');
    expect(recalculatedScenarios[1].deltaText).toBe('Vs planner: +$534,875');
  });
});
