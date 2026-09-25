// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App, { initialPlan, initialTimeline } from './App';
import { calculateFirePlan, formatMoney } from './lib/fire';

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

describe('B35 FIRE Assumptions Transparency & Controls Architecture', () => {
  it('1. Numerical engine correctness: public calculateFirePlan handles transparent 0%/0% baseline safely', () => {
    // 30-year plan, $80k annual expense, 0% return, 0% inflation, desired final value 0
    // Exact mathematical formula: 30 * 80,000 = 2,400,000 required portfolio
    const zeroRatePlan = {
      annualExpense: 80_000,
      initialPortfolio: 750_000,
      withdrawalTiming: 'end' as const,
      desiredFinalValue: 0,
      ratePeriods: [{ duration: 30, r: 0, i: 0 }],
      oneOffEvents: [],
      recurringCashFlows: []
    };

    const result = calculateFirePlan(zeroRatePlan);
    expect(result.requiredPortfolio).toBe(2_400_000);
    // At $750k portfolio, 30 years with 0% return/inflation -> $750k / 30 = $25,000 max annual expense
    expect(result.maxAnnualExpense).toBe(25_000);
    expect(result.warnings.filter((w) => w.severity === 'error')).toEqual([]);
  });

  it('2. Fresh plan starts clean with no phantom flows and 0%/0% rate baseline', () => {
    expect(initialPlan.oneOffEvents).toEqual([]);
    expect(initialPlan.recurringCashFlows ?? []).toEqual([]);
    expect(initialPlan.desiredFinalValue).toBe(0);
    expect(initialPlan.ratePeriods.length).toBe(1);
    expect(initialPlan.ratePeriods[0].r).toBe(0);
    expect(initialPlan.ratePeriods[0].i).toBe(0);
    expect(initialPlan.ratePeriods[0].duration).toBe(30);
  });

  it('3. DOM & visual order: collapsible advanced assumptions physically precedes Calculate button in DOM', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const advancedShell = document.querySelector('details.advanced-shell');
    const quickActions = document.querySelector('.quick-actions');
    const calcButton = quickActions?.querySelector('.primary-button');

    expect(advancedShell).not.toBeNull();
    expect(calcButton).not.toBeNull();

    // Verify DOM order: advancedShell must precede quickActions
    const position = advancedShell!.compareDocumentPosition(quickActions!);
    expect(position & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('4. Collapsed summary discloses actual active return/inflation values, timing, estate, and counts', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const summary = document.querySelector('.advanced-summary');
    expect(summary).not.toBeNull();
    const summaryText = summary?.textContent ?? '';

    // Discloses 0.0% return, 0.0% inflation, End-year timing, $0 estate, and 0 events
    expect(summaryText).toMatch(/0\.0% return/i);
    expect(summaryText).toMatch(/0\.0% inflation/i);
    expect(summaryText).toMatch(/end-year/i);
    expect(summaryText).toMatch(/\$0 estate/i);
  });

  it('5. Discloses visible notice that 0%/0% is a baseline simplification, not a forecast', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const advancedShell = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    expect(advancedShell).not.toBeNull();
    advancedShell.open = true;

    // Must visibly inform user that no growth or inflation is assumed and invite editing
    expect(advancedShell.textContent).toMatch(/no growth or inflation assumed/i);
  });

  it('6. Empty states offer Add buttons and new rows start with zero amounts requiring user entry', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const advancedShell = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    advancedShell.open = true;

    // Find "Add" button for One-off events
    const addEventButton = document.querySelector('#events-title')
      ?.closest('.panel')
      ?.querySelector<HTMLButtonElement>('.secondary-button');
    expect(addEventButton).toBeTruthy();

    await act(async () => {
      addEventButton!.click();
    });

    // Check newly added event has amount 0
    const eventAmountInputs = document.querySelectorAll<HTMLInputElement>('.event-row input[type="number"]');
    // The second number input in an event row is Amount (first is Year)
    expect(eventAmountInputs.length).toBeGreaterThanOrEqual(2);
    const amountInput = eventAmountInputs[1];
    expect(Number(amountInput.value)).toBe(0);

    // Find "Add" button for recurring income streams
    const addIncomeButton = document.querySelector('#income-title')
      ?.closest('.panel')
      ?.querySelector<HTMLButtonElement>('.secondary-button');
    expect(addIncomeButton).toBeTruthy();

    await act(async () => {
      addIncomeButton!.click();
    });

    // Check newly added income stream has amount 0
    const incomeRows = document.querySelectorAll('.recurring-row');
    expect(incomeRows.length).toBeGreaterThanOrEqual(1);
    const incomeAnnualInput = incomeRows[0].querySelector<HTMLInputElement>('input[min="0"]');
    expect(incomeAnnualInput).toBeTruthy();
    expect(Number(incomeAnnualInput!.value)).toBe(0);
  });

  it('7. Stale and recalculate lifecycle: editing advanced assumptions marks results stale and requires recalculate', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    expect(calcButton.textContent).toContain('Calculate');

    // Step 1: Calculate initially
    await act(async () => {
      calcButton.click();
    });

    const heroCard = document.querySelector('.hero-result');
    expect(heroCard).not.toBeNull();
    expect(heroCard?.classList.contains('is-stale')).toBe(false);

    // Initial 30-year 0%/0% baseline requires $2,400,000
    expect(heroCard?.querySelector('strong')?.textContent?.trim()).toBe('$2,400,000');

    // Step 2: Open advanced assumptions and change return rate
    const advancedShell = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    advancedShell.open = true;

    const returnInput = document.querySelector<HTMLInputElement>('.period-list input[step="0.1"]');
    expect(returnInput).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(returnInput, '5.0');
      returnInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Verify stale lifecycle triggered
    expect(heroCard?.classList.contains('is-stale')).toBe(true);
    const staleBadge = document.querySelector('.stale-result-badge');
    expect(staleBadge).not.toBeNull();
    expect(calcButton.textContent).toMatch(/recalculate/i);

    // Closing and reopening details does NOT reset values
    advancedShell.open = false;
    expect(returnInput?.value).toBe('5.0');
    advancedShell.open = true;
    expect(returnInput?.value).toBe('5.0');

    // Step 3: Recalculate updates output with custom return rate
    await act(async () => {
      calcButton.click();
    });

    expect(heroCard?.classList.contains('is-stale')).toBe(false);
    expect(document.querySelector('.stale-result-badge')).toBeNull();
    // With 5% return, portfolio needed is significantly less than $2,400,000
    const newResult = heroCard?.querySelector('strong')?.textContent?.trim();
    expect(newResult).not.toBe('$2,400,000');
  });

  it('8. Saved custom plan preserves exact rates, events, cashflows, and timing without overwriting', async () => {
    // Verify that importing/loading a snapshot with custom rates preserves them exactly
    const customSnapshot = {
      calculatorMode: 'fire-number' as const,
      plan: {
        annualExpense: 90_000,
        initialPortfolio: 1_000_000,
        withdrawalTiming: 'start' as const,
        desiredFinalValue: 50_000,
        ratePeriods: [
          { duration: 15, r: 0.07, i: 0.025 },
          { duration: 15, r: 0.05, i: 0.02 }
        ],
        oneOffEvents: [{ year: 7, amount: 25_000, label: 'Custom Bonus' }],
        recurringCashFlows: [
          { kind: 'income' as const, startYear: 10, endYear: 25, amount: 15_000, label: 'Part-time consulting', inflationAdjusted: true }
        ]
      },
      timeline: {
        currentAge: 35,
        retirementAge: 50,
        planEndAge: 80
      }
    };

    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    // Save and load draft tools are available
    // When a snapshot is imported, rates/events/timing are preserved
    const fileInput = document.querySelector<HTMLInputElement>('input[type="file"]');
    expect(fileInput).not.toBeNull();

    const file = new File([JSON.stringify(customSnapshot)], 'custom-plan.json', { type: 'application/json' });
    Object.defineProperty(fileInput, 'files', {
      value: [file]
    });

    await act(async () => {
      fileInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // 1. Advanced summary shows 2 rate periods, start-year timing, $50,000 estate, and cashflows
    const summary = document.querySelector('.advanced-summary');
    expect(summary?.textContent).toMatch(/start-year/i);
    expect(summary?.textContent).toMatch(/\$50,000 estate/i);
    expect(summary?.textContent).toMatch(/7\.0%/);
    expect(summary?.textContent).toMatch(/1 event/i);
    expect(summary?.textContent).toMatch(/1 income/i);

    // Expand advanced assumptions details to assert underlying DOM form controls
    const advancedShell = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    expect(advancedShell).not.toBeNull();
    advancedShell.open = true;

    // 2. Rate periods form controls (duration, return, inflation for both periods)
    const periodRows = document.querySelectorAll('.period-list .repeat-row');
    expect(periodRows.length).toBe(2);

    const p1Duration = periodRows[0].querySelector<HTMLInputElement>('input[min="1"]');
    const p1Rates = periodRows[0].querySelectorAll<HTMLInputElement>('input[step="0.1"]');
    expect(p1Duration?.value).toBe('15');
    expect(p1Rates[0]?.value).toBe('7.0');
    expect(p1Rates[1]?.value).toBe('2.5');

    const p2Duration = periodRows[1].querySelector<HTMLInputElement>('input[min="1"]');
    const p2Rates = periodRows[1].querySelectorAll<HTMLInputElement>('input[step="0.1"]');
    expect(p2Duration?.value).toBe('15');
    expect(p2Rates[0]?.value).toBe('5.0');
    expect(p2Rates[1]?.value).toBe('2.0');

    // 3. One-off event form controls (label, year, amount)
    const eventRow = document.querySelector('.event-row');
    expect(eventRow).not.toBeNull();
    const eventLabel = eventRow?.querySelector<HTMLInputElement>('input[type="text"]');
    const eventYear = eventRow?.querySelector<HTMLInputElement>('input[type="number"][min="1"]');
    const eventAmount = eventRow?.querySelectorAll<HTMLInputElement>('input[type="number"]')[1];
    expect(eventLabel?.value).toBe('Custom Bonus');
    expect(eventYear?.value).toBe('7');
    expect(eventAmount?.value).toBe('25000');

    // 4. Recurring income form controls (kind, start, end, annual amount, label)
    const incomeSection = document.querySelector('[aria-labelledby="income-title"]');
    expect(incomeSection).not.toBeNull();
    const expenseSection = document.querySelector('[aria-labelledby="phase-title"]');
    expect(expenseSection?.querySelectorAll('.recurring-row').length).toBe(0);

    const incomeRow = incomeSection?.querySelector('.recurring-row');
    expect(incomeRow).not.toBeNull();
    const incomeLabel = incomeRow?.querySelector<HTMLInputElement>('input[type="text"]');
    const incomeNumbers = incomeRow?.querySelectorAll<HTMLInputElement>('input[type="number"]');
    expect(incomeLabel?.value).toBe('Part-time consulting');
    expect(incomeNumbers?.[0]?.value).toBe('10'); // startYear
    expect(incomeNumbers?.[1]?.value).toBe('25'); // endYear
    expect(incomeNumbers?.[2]?.value).toBe('15000'); // annual amount

    // 5. Model options form controls (estate target $50,000, timing 'start')
    const modelSection = document.querySelector('[aria-labelledby="model-options-title"]');
    expect(modelSection).not.toBeNull();
    const estateInput = modelSection?.querySelector<HTMLInputElement>('input[type="number"]');
    expect(estateInput?.value).toBe('50000');

    const timingButtons = modelSection?.querySelectorAll<HTMLButtonElement>('.segmented button') ?? [];
    const startTimingBtn = Array.from(timingButtons).find((btn) => btn.textContent?.trim() === 'Start');
    const endTimingBtn = Array.from(timingButtons).find((btn) => btn.textContent?.trim() === 'End');
    expect(startTimingBtn?.classList.contains('active')).toBe(true);
    expect(endTimingBtn?.classList.contains('active')).toBe(false);

    // 6. Calculated result from imported plan matches calculateFirePlan(customSnapshot.plan) formatted in UI
    const expectedPortfolio = calculateFirePlan(customSnapshot.plan).requiredPortfolio;
    const heroResult = document.querySelector('.hero-result strong');
    expect(heroResult?.textContent?.trim()).toBe(formatMoney(expectedPortfolio));

    // Explicit Calculate/Recalculate execution reproduces identical formatted result
    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcButton.click();
    });
    expect(document.querySelector('.hero-result strong')?.textContent?.trim()).toBe(formatMoney(expectedPortfolio));
  });

  it('9. Plan health checks: fresh baseline displays meaningful financial warnings without raw balance_depleted, duplicates, or 0% inflation pressure, and humanizes engine warnings', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcButton.click();
    });

    const healthSection = document.querySelector('section.health-panel');
    expect(healthSection).not.toBeNull();

    const warningCards = Array.from(healthSection!.querySelectorAll('.warning-card'));
    const cardTitles = warningCards.map((c) => c.querySelector('strong')?.textContent?.trim() ?? '');
    const cardMessages = warningCards.map((c) => c.querySelector('small')?.textContent?.trim() ?? '');

    // 1. Plan health must retain meaningful checks for $80k spend / $750k portfolio baseline
    expect(cardTitles).toContain('Current portfolio drawdown');
    expect(cardTitles).toContain('Funding gap');
    expect(cardTitles).toContain('High starting withdrawal');

    // 2. Must not expose raw machine codes (e.g. balance_depleted) or snake_case anywhere in titles
    expect(cardTitles).not.toContain('balance_depleted');
    cardTitles.forEach((title) => {
      expect(title).not.toMatch(/_/);
    });

    // 3. Must not show duplicate 'Portfolio balance is depleted by year 30'
    const depletionMessages = cardMessages.filter((m) => m.includes('depleted by year 30'));
    expect(depletionMessages.length).toBe(0);

    // 4. Must not show 'Inflation pressure' when return is 0% and inflation is 0%
    expect(cardTitles).not.toContain('Inflation pressure');

    // 5. Test that a real non-horizon engine warning still appears with a plain-language title without snake_case
    const advancedShell = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    expect(advancedShell).not.toBeNull();
    advancedShell.open = true;

    // Set return rate to 16.0% (triggers high_return_assumption engine warning)
    const returnInput = document.querySelector<HTMLInputElement>('.period-list input[step="0.1"]');
    expect(returnInput).toBeTruthy();

    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(returnInput, '16.0');
      returnInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Recalculate with high return rate
    await act(async () => {
      calcButton.click();
    });

    const updatedCards = Array.from(document.querySelectorAll('.health-grid .warning-card'));
    const updatedTitles = updatedCards.map((c) => c.querySelector('strong')?.textContent?.trim() ?? '');
    const updatedMessages = updatedCards.map((c) => c.querySelector('small')?.textContent?.trim() ?? '');

    // Must humanize high_return_assumption to 'High return assumption'
    expect(updatedTitles).toContain('High return assumption');
    expect(updatedTitles).not.toContain('high_return_assumption');
    expect(updatedMessages.some((msg) => msg.includes('Return assumption of 16.0% is high'))).toBe(true);

    // 6. Test that an out-of-range event engine warning maps to human-readable title without snake_case
    const addEventBtn = document.querySelector('#events-title')
      ?.closest('.panel')
      ?.querySelector<HTMLButtonElement>('.secondary-button');
    expect(addEventBtn).toBeTruthy();
    await act(async () => {
      addEventBtn!.click();
    });

    const eventRow = document.querySelector('.event-row');
    expect(eventRow).toBeTruthy();
    const eventYearInput = eventRow?.querySelector<HTMLInputElement>('input[type="number"][min="1"]');
    const eventAmountInput = eventRow?.querySelectorAll<HTMLInputElement>('input[type="number"]')[1];
    await act(async () => {
      const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeSetter.call(eventYearInput, '45'); // outside 30-year plan
      eventYearInput!.dispatchEvent(new Event('change', { bubbles: true }));
      nativeSetter.call(eventAmountInput, '10000');
      eventAmountInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await act(async () => {
      calcButton.click();
    });

    const eventCards = Array.from(document.querySelectorAll('.health-grid .warning-card'));
    const eventTitles = eventCards.map((c) => c.querySelector('strong')?.textContent?.trim() ?? '');
    expect(eventTitles.some((t) => t === 'Event outside timeline' || t === 'Cash flow outside timeline')).toBe(true);
    expect(eventTitles).not.toContain('one_off_year_out_of_range');
  });

  it('10. Starting example values disclosure: visibly identifies example amounts in both modes outside details before Calculate', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    // 1. Visible note exists outside closed advanced details
    const advancedDetails = document.querySelector('details.advanced-shell') as HTMLDetailsElement;
    expect(advancedDetails).not.toBeNull();
    expect(advancedDetails.open).toBe(false);

    const exampleNote = document.querySelector('.example-values-note');
    expect(exampleNote).not.toBeNull();
    // Verify note is NOT inside advanced-shell
    expect(advancedDetails.contains(exampleNote)).toBe(false);

    // 2. In default FIRE number mode, identifies example, $80,000 spending and $750,000 portfolio
    expect(exampleNote?.textContent).toMatch(/example/i);
    expect(exampleNote?.textContent).toContain('$80,000');
    expect(exampleNote?.textContent).toContain('$750,000');
    expect(exampleNote?.textContent).toMatch(/replace/i);

    // 3. Mode switch to Withdrawal mode persists note and identifies $750,000 portfolio and $80,000 spending benchmark
    const modeButtons = document.querySelectorAll<HTMLButtonElement>('.segmented button');
    const withdrawalBtn = Array.from(modeButtons).find((b) => b.textContent?.trim() === 'Withdrawal');
    expect(withdrawalBtn).toBeTruthy();

    await act(async () => {
      withdrawalBtn!.click();
    });

    const withdrawalNote = document.querySelector('.example-values-note');
    expect(withdrawalNote).not.toBeNull();
    expect(withdrawalNote?.textContent).toMatch(/example/i);
    expect(withdrawalNote?.textContent).toMatch(/\$750,000\s+portfolio/i);
    expect(withdrawalNote?.textContent).toMatch(/\$80,000\s+spending benchmark/i);
    expect(withdrawalNote?.textContent).toMatch(/replace/i);

    // 4. Switch back to FIRE number mode
    const fireNumberBtn = Array.from(modeButtons).find((b) => b.textContent?.trim() === 'FIRE number');
    expect(fireNumberBtn).toBeTruthy();

    await act(async () => {
      fireNumberBtn!.click();
    });

    const fireNoteAgain = document.querySelector('.example-values-note');
    expect(fireNoteAgain?.textContent).toContain('$80,000');
    expect(fireNoteAgain?.textContent).toContain('$750,000');

    // 5. Calculate button remains physically after the example note in the DOM
    const calcButton = document.querySelector('.quick-actions .primary-button');
    expect(calcButton).not.toBeNull();
    expect(exampleNote!.compareDocumentPosition(calcButton!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
