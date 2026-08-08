import { renderToStaticMarkup } from 'react-dom/server';
import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { AuthState } from './auth';
import {
  CompoundInterestCalculator,
  applyScenario,
  buildProjectionCsv,
  buildSensitivity,
  buildShareUrl,
  currencyFractionDigits,
  formatCurrency,
  inputsFromSaved,
  isCompoundDraft,
  restoreState,
  toNumericSaveValues
} from './CompoundInterestCalculator';
import {
  calculateCompoundInterest,
  compoundInterestFormulaVersion,
  defaultCompoundInterestInputs
} from './lib/compoundInterestCalculator';
import { findSeoCalculator } from './lib/seoCalculators';

const draftStorageKey = 'finpath.calculatorDraft.compound-interest.v2';
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
  window.history.replaceState({}, '', '/calculators/compound-interest');
  window.localStorage.clear();
});

describe('Compound Interest engagement and presentation contract', () => {
  it('round-trips every v2 share input plus the selected scenario', () => {
    const inputs = {
      ...defaultCompoundInterestInputs,
      annualContributionIncreasePercent: 4,
      annualFeePercent: 0.35,
      contributionFrequency: 26 as const,
      contributionTiming: 'beginning' as const,
      futureDepositAmount: 2_500,
      futureDepositYear: 1.25,
      inflationPercent: 2.5,
      rateBasis: 'apy' as const,
      targetAmount: 200_000,
      targetBasis: 'today' as const,
      years: 12.5
    };
    const url = new URL(buildShareUrl(inputs, 'INR', 'en-IN', 'higher', 'https://finpath.test'));

    expect(url.searchParams.get('formula')).toBe(compoundInterestFormulaVersion);
    expect(url.searchParams.get('scenario')).toBe('higher');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    expect(restoreState()).toMatchObject({
      currency: 'INR',
      inputs,
      locale: 'en-IN',
      scenarioId: 'higher',
      source: 'share'
    });
  });

  it('restores legacy v1 links and rejects unknown v2 formula versions', () => {
    window.history.replaceState({}, '', '/calculators/compound-interest?fp=1&principal=20000&monthly=750&years=4.5&rate=6&annualTopUp=900');
    expect(restoreState()).toMatchObject({
      inputs: {
        annualRatePercent: 6,
        annualTopUp: 900,
        principal: 20_000,
        recurringContribution: 750,
        years: 4.5
      },
      scenarioId: 'base',
      source: 'share'
    });

    window.history.replaceState({}, '', '/calculators/compound-interest?fp=2&formula=unknown-v9&principal=1');
    expect(restoreState()).toBeNull();
  });

  it('restores a finite browser draft, migrates a missing scenario to base, and rejects corruption', () => {
    const draft = {
      currency: 'EUR',
      formulaVersion: compoundInterestFormulaVersion,
      inputs: { ...defaultCompoundInterestInputs, principal: 42_000 },
      locale: 'de-DE',
      updatedAt: '2026-08-08T00:00:00.000Z'
    } as const;
    expect(isCompoundDraft(draft)).toBe(true);
    window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    expect(restoreState()).toMatchObject({
      currency: 'EUR',
      inputs: { principal: 42_000 },
      locale: 'de-DE',
      scenarioId: 'base',
      source: 'draft'
    });

    window.localStorage.setItem(draftStorageKey, JSON.stringify({ ...draft, inputs: { ...draft.inputs, principal: null } }));
    expect(restoreState()).toBeNull();
  });

  it('round-trips the complete numeric save boundary', () => {
    const inputs = {
      ...defaultCompoundInterestInputs,
      annualContributionIncreasePercent: 3,
      annualFeePercent: 0.45,
      annualTopUp: 1_200,
      compoundingFrequency: 365 as const,
      contributionFrequency: 24 as const,
      contributionTiming: 'beginning' as const,
      futureDepositAmount: 5_000,
      futureDepositYear: 2.25,
      futureWithdrawalAmount: 1_500,
      futureWithdrawalYear: 7.75,
      inflationPercent: 2.8,
      rateBasis: 'apy' as const,
      targetAmount: 250_000,
      targetBasis: 'today' as const,
      years: 15.5
    };

    expect(inputsFromSaved(toNumericSaveValues(inputs))).toEqual(inputs);
  });

  it('exports a CRLF CSV whose final raw row reconciles with the headline', () => {
    const inputs = {
      ...defaultCompoundInterestInputs,
      annualFeePercent: 0.4,
      annualTopUp: 750,
      futureWithdrawalAmount: 1_000,
      futureWithdrawalYear: 3.5,
      inflationPercent: 2.5,
      years: 10.5
    };
    const projection = calculateCompoundInterest(inputs);
    const csv = buildProjectionCsv(inputs, projection, 'USD', 'en-US');
    const lines = csv.split('\r\n');
    const header = lines.find((line) => line.startsWith('Period,Time'))?.split(',') ?? [];
    const finalRow = lines.at(-1)?.split(',') ?? [];

    expect(csv).toContain(`Metadata,Formula version,${compoundInterestFormulaVersion}`);
    expect(header).toContain('Net contributed capital');
    expect(header).toContain('Growth to date');
    expect(Number(finalRow[header.indexOf('Ending balance')])).toBeCloseTo(projection.endingValue, 8);
    expect(Number(finalRow[header.indexOf('Net contributed capital')]) + Number(finalRow[header.indexOf('Growth to date')])).toBeCloseTo(projection.endingValue, 8);
  });

  it('formats Indian grouping, standard currency minor units, negatives, and non-finite values safely', () => {
    expect(formatCurrency(1_234_567, 'INR', 'en-IN')).toContain('12,34,567');
    expect(formatCurrency(-1_234.5, 'USD', 'en-US', 2)).toContain('-$1,234.50');
    expect(currencyFractionDigits('JPY')).toBe(0);
    expect(currencyFractionDigits('USD')).toBe(2);
    expect(formatCurrency(Number.POSITIVE_INFINITY, 'USD', 'en-US')).toBe('—');
  });

  it('builds deterministic scenarios plus rate, contribution, and duration sensitivities', () => {
    expect(applyScenario(defaultCompoundInterestInputs, 'lower').annualRatePercent).toBe(6);
    expect(applyScenario(defaultCompoundInterestInputs, 'higher').annualRatePercent).toBe(10);

    const sensitivity = buildSensitivity(defaultCompoundInterestInputs);
    expect(sensitivity.values).toHaveLength(3);
    expect(sensitivity.values.every((row) => row.length === 3 && row.every(Number.isFinite))).toBe(true);
    expect(sensitivity.durations.map((item) => item.label)).toEqual(['Shorter', 'Base', 'Longer']);
    expect(sensitivity.durations[0].value).toBeLessThan(sensitivity.durations[1].value);
    expect(sensitivity.durations[2].value).toBeGreaterThan(sensitivity.durations[1].value);
  });

  it('renders labeled controls, explicit result definitions, chart alternatives, and closed disclosures', () => {
    const calculator = findSeoCalculator('/calculators/compound-interest');
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
      <CompoundInterestCalculator
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
      const control = item as unknown as HTMLInputElement | HTMLSelectElement;
      expect(control.name).not.toBe('');
      expect(control.closest('label') ?? document.querySelector(`label[for="${control.id}"]`)).not.toBeNull();
    });
    expect(document.body.textContent).toContain('Growth share');
    expect(document.body.textContent).toContain('Net contributed capital');
    expect(document.body.textContent).toContain('Duration sensitivity');
    expect(document.querySelector('.compound-chart-plot')?.getAttribute('tabindex')).toBe('0');
    expect(document.querySelector('.compound-sensitivity-wrap td.is-base')?.textContent).toContain('Base');
  });
});
