import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AuthState } from './auth';
import {
  SavingsGoalCalculator,
  applySavingsScenario,
  buildSavingsProjectionCsv,
  buildSavingsSensitivity,
  buildSavingsShareUrl,
  currencyFractionDigits,
  formatSavingsCurrency,
  isSavingsGoalDraft,
  restoreSavingsState,
  savingsInputsFromSaved,
  toSavingsNumericSaveValues
} from './SavingsGoalCalculator';
import {
  calculateSavingsGoal,
  defaultSavingsGoalInputs,
  savingsGoalFormulaVersion
} from './lib/savingsGoalCalculator';
import { findSeoCalculator } from './lib/seoCalculators';

const draftStorageKey = 'finpath.calculatorDraft.savings-goal.v2';
const storedValues = new Map<string, string>();

beforeAll(() => {
  Object.defineProperty(window, 'localStorage', {
    configurable: true,
    value: {
      clear: () => storedValues.clear(),
      getItem: (key: string) => storedValues.get(key) ?? null,
      removeItem: (key: string) => storedValues.delete(key),
      setItem: (key: string, value: string) => storedValues.set(key, value)
    }
  });
});

beforeEach(() => {
  window.history.replaceState({}, '', '/calculators/savings-goal');
  window.localStorage.clear();
});

describe('Savings Goal engagement and presentation contract', () => {
  it('round-trips every v2 share input plus currency, locale, and scenario', () => {
    const inputs = {
      ...defaultSavingsGoalInputs,
      annualContributionIncreasePercent: 4,
      annualFeePercent: 0.35,
      annualTopUp: 2_500,
      compoundingFrequency: 365 as const,
      contributionFrequency: 26 as const,
      contributionTiming: 'beginning' as const,
      currentContribution: 750,
      inflationPercent: 2.5,
      rateBasis: 'apy' as const,
      targetAmount: 250_000,
      targetBasis: 'today' as const,
      years: 12.5
    };
    const url = new URL(buildSavingsShareUrl(inputs, 'INR', 'en-IN', 'higher', 'https://finpath.test'));

    expect(url.searchParams.get('formula')).toBe(savingsGoalFormulaVersion);
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    expect(restoreSavingsState()).toMatchObject({
      currency: 'INR',
      inputs,
      locale: 'en-IN',
      scenarioId: 'higher',
      source: 'share'
    });
  });

  it('migrates legacy generic links and rejects unknown formula versions', () => {
    window.history.replaceState({}, '', '/calculators/savings-goal?fp=1&target=80000&current=12000&years=4.5&rate=6');
    expect(restoreSavingsState()).toMatchObject({
      inputs: { annualRatePercent: 6, currentSavings: 12_000, targetAmount: 80_000, years: 4.5 },
      scenarioId: 'base',
      source: 'share'
    });

    window.history.replaceState({}, '', '/calculators/savings-goal?fp=2&formula=unknown-v9&targetAmount=1');
    expect(restoreSavingsState()).toBeNull();
  });

  it('restores only complete finite route-local drafts', () => {
    const draft = {
      currency: 'EUR',
      formulaVersion: savingsGoalFormulaVersion,
      inputs: { ...defaultSavingsGoalInputs, targetAmount: 42_000 },
      locale: 'de-DE',
      updatedAt: '2026-08-09T00:00:00.000Z'
    } as const;
    expect(isSavingsGoalDraft(draft)).toBe(true);
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    expect(restoreSavingsState()).toMatchObject({ inputs: { targetAmount: 42_000 }, scenarioId: 'base', source: 'draft' });

    window.localStorage.setItem(draftStorageKey, JSON.stringify({ ...draft, inputs: { ...draft.inputs, currentSavings: null } }));
    expect(restoreSavingsState()).toBeNull();
  });

  it('round-trips the complete numeric save boundary', () => {
    const inputs = {
      ...defaultSavingsGoalInputs,
      annualContributionIncreasePercent: 3,
      annualFeePercent: 0.4,
      annualTopUp: 1_200,
      compoundingFrequency: 365 as const,
      contributionFrequency: 24 as const,
      contributionTiming: 'beginning' as const,
      currentContribution: 450,
      currentSavings: 20_000,
      inflationPercent: 2.8,
      rateBasis: 'apy' as const,
      targetAmount: 350_000,
      targetBasis: 'today' as const,
      years: 15.5
    };
    const values = toSavingsNumericSaveValues(inputs, calculateSavingsGoal(inputs));

    expect(savingsInputsFromSaved(values)).toEqual(inputs);
    expect(values.requiredContribution).toBeGreaterThan(0);
    expect(values.resolvedTarget).toBeGreaterThan(inputs.targetAmount);
  });

  it('exports a versioned CRLF CSV whose raw final row reconciles', () => {
    const inputs = { ...defaultSavingsGoalInputs, annualFeePercent: 0.4, annualTopUp: 750, years: 10.5 };
    const projection = calculateSavingsGoal(inputs);
    const csv = buildSavingsProjectionCsv(inputs, projection, 'USD', 'en-US');
    const lines = csv.split('\r\n');
    const header = lines.find((line) => line.startsWith('Period,Time'))?.split(',') ?? [];
    const finalRow = lines.at(-1)?.split(',') ?? [];

    expect(csv).toContain(`Metadata,Formula version,${savingsGoalFormulaVersion}`);
    expect(csv).toContain('Metadata,Currency,USD');
    expect(Number(finalRow[header.indexOf('Ending balance')])).toBeCloseTo(projection.requiredPlanEnding, 8);
    expect(Number(finalRow[header.indexOf('Signed difference from deadline target')])).toBeCloseTo(projection.requiredPlanDifference, 8);
  });

  it('keeps trusted negative schedule numbers numeric in the raw CSV', () => {
    const inputs = { ...defaultSavingsGoalInputs, annualRatePercent: -2 };
    const projection = calculateSavingsGoal(inputs);
    const csv = buildSavingsProjectionCsv(inputs, projection, 'USD', 'en-US');

    expect(csv).toMatch(/,-\d/);
    expect(csv).not.toMatch(/,'-\d/);
  });

  it('formats Indian grouping and standard currency minor units safely', () => {
    expect(formatSavingsCurrency(1_234_567, 'INR', 'en-IN')).toContain('12,34,567');
    expect(formatSavingsCurrency(-1_234.5, 'USD', 'en-US', 2)).toContain('-$1,234.50');
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(currencyFractionDigits('USD')).toBe(2);
    expect(formatSavingsCurrency(Number.POSITIVE_INFINITY, 'USD', 'en-US')).toBe('—');
  });

  it('builds isolated deterministic scenarios and monotonic sensitivities', () => {
    expect(applySavingsScenario(defaultSavingsGoalInputs, 'lower').annualRatePercent).toBe(6);
    expect(applySavingsScenario(defaultSavingsGoalInputs, 'higher').annualRatePercent).toBe(10);
    const sensitivity = buildSavingsSensitivity(defaultSavingsGoalInputs);

    expect(sensitivity.values).toHaveLength(3);
    expect(sensitivity.values.every((row) => row.length === 3)).toBe(true);
    expect(sensitivity.rates[0].value!).toBeGreaterThan(sensitivity.rates[1].value!);
    expect(sensitivity.rates[2].value!).toBeLessThan(sensitivity.rates[1].value!);
    expect(sensitivity.values[1][0]!).toBeGreaterThan(sensitivity.values[1][1]!);
    expect(sensitivity.values[1][2]!).toBeLessThan(sensitivity.values[1][1]!);

    expect(buildSavingsSensitivity({ ...defaultSavingsGoalInputs, years: 100 }).deadlines).toHaveLength(2);
    expect(buildSavingsSensitivity({ ...defaultSavingsGoalInputs, years: 0.01 }).deadlines).toHaveLength(2);
  });

  it('renders labeled controls, live results, a truthful chart alternative, and collapsed analysis', () => {
    const calculator = findSeoCalculator('/calculators/savings-goal');
    expect(calculator).toBeDefined();
    const auth: AuthState = {
      provider: 'clerk',
      status: 'not-configured',
      isConfigured: false,
      isSignedIn: false,
      missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
      user: null
    };
    const html = renderToStaticMarkup(
      <SavingsGoalCalculator
        auth={auth}
        calculator={calculator!}
        onNavigate={() => undefined}
        onSaveResult={async () => ({ destinationRoute: '/goals', message: 'Saved', savedResultId: 'saved-1' })}
        savedResults={[]}
      />
    );
    document.body.innerHTML = html;

    const details = [...document.querySelectorAll('details')];
    expect(details.length).toBeGreaterThanOrEqual(5);
    expect(details.every((item) => !item.open)).toBe(true);
    [...document.querySelectorAll('input, select')].forEach((item) => {
      const control = item as HTMLInputElement | HTMLSelectElement;
      expect(control.name).not.toBe('');
      expect(control.closest('label') ?? document.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    });
    expect(document.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(document.querySelector('.savings-runway-chart')?.textContent).toContain('At the deadline');
    expect(document.body.textContent).toContain('Current-plan shortfall');
    expect(document.body.textContent).toContain('Create savings goal');
    expect(document.body.textContent).toContain('Deadline and target sensitivity');
  });
});
