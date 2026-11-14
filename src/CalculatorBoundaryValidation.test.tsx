import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalculatorLibrary } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculatorRawValues, validateCalculatorInputs } from './lib/calculatorInputState';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios } from './lib/calculatorStudios';
import { calculateSeoCalculator, seoCalculators, type CalculatorResult } from './lib/seoCalculators';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const auth: AuthState = {
  isConfigured: true,
  isSignedIn: true,
  getToken: async () => 'synthetic-unit-token',
  provider: 'clerk',
  status: 'signed-in',
  user: { displayName: 'Synthetic', email: 'synthetic@example.invalid', id: 'synthetic-unit-user' }
};

const find = (slug: string) => seoCalculators.find((c) => c.slug === slug)!;
const defaults = (slug: string) =>
  Object.fromEntries(find(slug).inputs.map((i) => [i.key, i.defaultValue])) as Record<string, number>;
const validate = (slug: string, extra: Record<string, string>) =>
  validateCalculatorInputs(find(slug), { ...calculatorRawValues(find(slug), defaults(slug)), ...extra });
const metricValue = (result: CalculatorResult, label: string) =>
  result.metrics.find((m) => m.label === label)!.value;

let root: Root | undefined;
let container: HTMLDivElement | undefined;

function renderCalculator(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() =>
    root!.render(
      <CalculatorLibrary
        auth={auth}
        onNavigate={() => {}}
        onSaveResult={async () => ({ destinationRoute: '/plans', message: 'Saved', savedResultId: 'synthetic' })}
        route={`/calculators/${slug}`}
        savedResults={[]}
      />
    )
  );
  return container;
}

function editField(name: string, value: string) {
  const input = container!.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;
  act(() => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  return input;
}

function buttonByText(text: string) {
  return [...container!.querySelectorAll('button')].find((b) => b.textContent?.trim() === text);
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  container?.remove();
  localStorage.clear();
  window.history.replaceState({}, '', '/');
});

describe('B72 LH-02: sub-1-year loan terms and positive term validation', () => {
  it('reconciles loan-comparison headlines and schedules for sub-1-year terms', () => {
    const c = find('loan-comparison');
    const values: Record<string, number> = { ...defaults('loan-comparison'), compareYears: 0.5, years: 0.75 };
    const result = calculateSeoCalculator(c, values);
    const schedule = buildCalculatorDetailSchedule(c, values, result)!;

    expect(schedule.rows).toHaveLength(9);
    expect(schedule.rows[5].values.optionABalance).toBe(0);
    expect(schedule.rows[8].values.optionBBalance).toBe(0);

    const optionAPayment = metricValue(result, 'Option A monthly payment');
    const optionBPayment = metricValue(result, 'Option B monthly payment');
    expect(Number(schedule.rows[5].values.optionAPaid)).toBeCloseTo(optionAPayment * 6, 6);
    expect(Number(schedule.rows[8].values.optionBPaid)).toBeCloseTo(optionBPayment * 9, 6);

    const optionAInterest = optionAPayment * 6 - values.principal;
    const optionBInterest = optionBPayment * 9 - values.principal;
    expect(metricValue(result, 'Option B extra lifetime interest')).toBeCloseTo(optionBInterest - optionAInterest, 6);
  });

  it('reconciles rent-vs-buy headlines, labels, and schedules for sub-1-year stays and loans', () => {
    const c = find('rent-vs-buy');
    const values: Record<string, number> = { ...defaults('rent-vs-buy'), loanYears: 0.5, years: 0.5 };
    const result = calculateSeoCalculator(c, values);
    const schedule = buildCalculatorDetailSchedule(c, values, result)!;

    expect(schedule.rows).toHaveLength(1);
    expect(schedule.rows[0].values.year).toBe(0.5);
    expect(result.metrics.some((m) => m.label === 'Net cost of buying over 0.5 years')).toBe(true);
    expect(result.metrics.some((m) => m.label === 'Cost of renting over 0.5 years')).toBe(true);
    expect(metricValue(result, 'Cost of renting over 0.5 years')).toBeCloseTo(values.rent * 6, 6);
    expect(metricValue(result, 'Buying minus renting over the stay')).toBeCloseTo(
      Number(schedule.rows[0].values.netDifference),
      6
    );
  });

  it('reconciles fha-vs-conventional, apr, balloon-loan, arm-mortgage, points, refinance, recast, prepayment, and amortizing loans at 0.5 years', () => {
    const fhaConv = find('fha-vs-conventional');
    const fhaValues = { ...defaults('fha-vs-conventional'), years: 0.5 };
    const fhaResult = calculateSeoCalculator(fhaConv, fhaValues);
    const fhaSchedule = buildCalculatorDetailSchedule(fhaConv, fhaValues, fhaResult)!;
    const fhaRow = fhaSchedule.rows.find((r) => r.id === 'fha')!;
    const convRow = fhaSchedule.rows.find((r) => r.id === 'conventional')!;
    expect(Number(fhaRow.values.totalPaid)).toBeCloseTo(fhaResult.metrics[0].value * 6, 6);
    expect(Number(convRow.values.totalPaid)).toBeCloseTo(
      metricValue(fhaResult, 'Conventional monthly payment') * 6,
      6
    );

    const mortgage = find('mortgage');
    const mValues = { ...defaults('mortgage'), years: 0.5 };
    const mResult = calculateSeoCalculator(mortgage, mValues);
    const mSchedule = buildCalculatorDetailSchedule(mortgage, mValues, mResult)!;
    expect(mSchedule.rows).toHaveLength(6);
    expect(mSchedule.rows.at(-1)!.values.endingBalance).toBe(0);
    expect(metricValue(mResult, 'Total interest')).toBeCloseTo(
      Number(mSchedule.rows.at(-1)!.values.cumulativeInterest),
      6
    );

    const biweekly = find('biweekly-mortgage-payment');
    const bwValues = { ...defaults('biweekly-mortgage-payment'), years: 0.5 };
    const bwResult = calculateSeoCalculator(biweekly, bwValues);
    const bwSchedule = buildCalculatorDetailSchedule(biweekly, bwValues, bwResult)!;
    expect(bwSchedule.rows).toHaveLength(6);
    expect(bwSchedule.rows.at(-1)!.values.endingBalance).toBe(0);

    const apr = find('apr');
    const aprValues = { ...defaults('apr'), years: 0.5 };
    const aprResult = calculateSeoCalculator(apr, aprValues);
    const aprSchedule = buildCalculatorDetailSchedule(apr, aprValues, aprResult)!;
    expect(Number(aprSchedule.rows.find((r) => r.id === 'payment')!.values.amount)).toBeCloseTo(
      metricValue(aprResult, 'Monthly payment'),
      6
    );
    expect(Number(aprSchedule.rows.find((r) => r.id === 'apr')!.values.rate)).toBeCloseTo(
      aprResult.metrics[0].value,
      6
    );

    const balloon = find('balloon-loan');
    const balValues = { ...defaults('balloon-loan'), balloonYears: 0.25, years: 0.5 };
    const balResult = calculateSeoCalculator(balloon, balValues);
    const balSchedule = buildCalculatorDetailSchedule(balloon, balValues, balResult)!;
    expect(metricValue(balResult, 'Balloon due after months')).toBe(3);
    expect(balSchedule.rows).toHaveLength(3);
    expect(balResult.metrics[0].value).toBeCloseTo(Number(balSchedule.rows.at(-1)!.values.balloonDue), 6);

    const arm = find('arm-mortgage');
    const armValues = { ...defaults('arm-mortgage'), fixedYears: 0.25, years: 0.5 };
    const armResult = calculateSeoCalculator(arm, armValues);
    const armSchedule = buildCalculatorDetailSchedule(arm, armValues, armResult)!;
    expect(metricValue(armResult, 'Months at the fixed rate')).toBe(3);
    expect(armSchedule.rows).toHaveLength(1);
    expect(armSchedule.rows[0].values.endingBalance).toBe(0);

    const points = find('mortgage-points');
    const ptsValues = { ...defaults('mortgage-points'), years: 0.5 };
    const ptsResult = calculateSeoCalculator(points, ptsValues);
    const ptsSchedule = buildCalculatorDetailSchedule(points, ptsValues, ptsResult)!;
    expect(ptsSchedule.rows).toHaveLength(6);
    expect(metricValue(ptsResult, 'Lifetime saving after paying for points')).toBeCloseTo(
      Number(ptsSchedule.rows.at(-1)!.values.netAfterCost),
      6
    );

    const refi = find('mortgage-refinance');
    const refiValues = { ...defaults('mortgage-refinance'), years: 0.5 };
    const refiResult = calculateSeoCalculator(refi, refiValues);
    const refiSchedule = buildCalculatorDetailSchedule(refi, refiValues, refiResult)!;
    expect(refiSchedule.rows).toHaveLength(6);
    expect(Number(refiSchedule.rows.at(-1)!.values.newBalance)).toBe(0);

    const recast = find('mortgage-recast');
    const recastValues = { ...defaults('mortgage-recast'), prepayment: 50000, years: 0.5 };
    const recastResult = calculateSeoCalculator(recast, recastValues);
    const recastSchedule = buildCalculatorDetailSchedule(recast, recastValues, recastResult)!;
    expect(recastSchedule.rows).toHaveLength(6);
    expect(Number(recastSchedule.rows.at(-1)!.values.newBalance)).toBe(0);
    expect(Number(recastSchedule.rows.at(-1)!.values.oldBalance)).toBe(0);

    const prepay = find('home-loan-prepayment');
    const preValues = { ...defaults('home-loan-prepayment'), prepayment: 500000, years: 0.5 };
    const preResult = calculateSeoCalculator(prepay, preValues);
    const preSchedule = buildCalculatorDetailSchedule(prepay, preValues, preResult)!;
    expect(preSchedule.rows).toHaveLength(6);
    expect(preSchedule.rows.at(-1)!.values.originalBalance).toBe(0);
    expect(preSchedule.rows.at(-1)!.values.prepayBalance).toBe(0);
  });

  it.each([
    ['mortgage', 'years'],
    ['emi', 'years'],
    ['amortization', 'years'],
    ['apr', 'years'],
    ['balloon-loan', 'years'],
    ['biweekly-mortgage-payment', 'years'],
    ['arm-mortgage', 'years'],
    ['arm-mortgage', 'fixedYears'],
    ['mortgage-points', 'years'],
    ['fha-loan', 'years'],
    ['va-loan', 'years'],
    ['fha-vs-conventional', 'years'],
    ['flat-vs-reducing-rate', 'years'],
    ['interest-only-mortgage', 'years'],
    ['loan-comparison', 'compareYears'],
    ['loan-comparison', 'years'],
    ['15-vs-30-year-mortgage', 'compareYears'],
    ['15-vs-30-year-mortgage', 'years'],
    ['loan-eligibility-india', 'years'],
    ['mortgage-affordability', 'years'],
    ['home-loan-prepayment', 'years'],
    ['mortgage-recast', 'years'],
    ['mortgage-refinance', 'years'],
    ['rent-vs-buy', 'years'],
    ['rent-vs-buy', 'loanYears'],
    ['investment-return', 'years'],
    ['cagr', 'years'],
    ['xirr', 'years']
  ])('rejects 0 for %s.%s', (slug, key) => {
    const res = validate(slug, { [key]: '0' });
    expect(res.values).toBeNull();
    expect(res.errors[key]).toBeTruthy();
  });
});

describe('B72 LH-07: cross-field validation across loan and home calculators', () => {
  it.each(['closing-costs', 'rent-vs-buy', 'pmi'])('rejects downPayment > homePrice on %s while allowing 100%% down', (slug) => {
    const baseHomePrice = Number(defaults(slug).homePrice);
    const rejected = validate(slug, { downPayment: String(baseHomePrice + 1), homePrice: String(baseHomePrice) });
    expect(rejected.values).toBeNull();
    expect(rejected.errors.downPayment).toBe('Down payment cannot exceed the home price.');

    const allCash = validate(slug, { downPayment: String(baseHomePrice), homePrice: String(baseHomePrice) });
    expect(allCash.values).not.toBeNull();
  });

  it.each(['fha-loan', 'va-loan', 'fha-vs-conventional'])('rejects downPayment >= homePrice and zero homePrice on financed loan %s', (slug) => {
    const eq = validate(slug, { downPayment: '350000', homePrice: '350000' });
    expect(eq.values).toBeNull();
    expect(eq.errors.downPayment).toBe('Down payment must be less than the home price.');

    const gt = validate(slug, { downPayment: '400000', homePrice: '350000' });
    expect(gt.values).toBeNull();
    expect(gt.errors.downPayment).toBe('Down payment must be less than the home price.');

    const zeroPrice = validate(slug, { downPayment: '0', homePrice: '0' });
    expect(zeroPrice.values).toBeNull();
    expect(zeroPrice.errors.homePrice).toBe('Enter a number greater than 0.');
  });

  it('rejects APR finance charges >= principal and zero principal', () => {
    const eq = validate('apr', { closingCosts: '300000', principal: '300000' });
    expect(eq.values).toBeNull();
    expect(eq.errors.closingCosts).toBe('Finance charges must be less than the loan amount.');

    const gt = validate('apr', { closingCosts: '350000', principal: '300000' });
    expect(gt.values).toBeNull();
    expect(gt.errors.closingCosts).toBe('Finance charges must be less than the loan amount.');

    const zeroPrincipal = validate('apr', { closingCosts: '0', principal: '0' });
    expect(zeroPrincipal.values).toBeNull();
    expect(zeroPrincipal.errors.principal).toBe('Enter a number greater than 0.');

    const ok = validate('apr', { closingCosts: '5999', principal: '6000' });
    expect(ok.values).not.toBeNull();
  });

  it('rejects ARM fixedYears >= years and zero fixedYears while permitting valid sub-1-year ARM', () => {
    const eq = validate('arm-mortgage', { fixedYears: '30', years: '30' });
    expect(eq.values).toBeNull();
    expect(eq.errors.fixedYears).toBe('Fixed period must be shorter than the loan term.');

    const gt = validate('arm-mortgage', { fixedYears: '35', years: '30' });
    expect(gt.values).toBeNull();
    expect(gt.errors.fixedYears).toBe('Fixed period must be shorter than the loan term.');

    const ok = validate('arm-mortgage', { fixedYears: '0.25', years: '0.5' });
    expect(ok.values).not.toBeNull();
  });

  it('rejects balloonYears > years while preserving explicit month-0 immediate balloon', () => {
    const gt = validate('balloon-loan', { balloonYears: '31', years: '30' });
    expect(gt.values).toBeNull();
    expect(gt.errors.balloonYears).toBe('Balloon due year cannot exceed the amortization term.');

    const monthZero = validate('balloon-loan', { balloonYears: '0', years: '30' });
    expect(monthZero.values).not.toBeNull();
  });
});

describe('B72 RET-02, RINC-04, RINC-05, TAX-03, RINC-15 boundaries', () => {
  it('RET-02: blocks zero initial capital on investment-return/cagr, zero cash outflows on xirr, and zero rate on rule-of-72', () => {
    for (const slug of ['investment-return', 'cagr']) {
      const zeroInitial = validate(slug, { initial: '0' });
      expect(zeroInitial.values).toBeNull();
      expect(zeroInitial.errors.initial).toBe('Enter a number greater than 0.');
      expect(buildCalculatorDetailSchedule(find(slug), { ...defaults(slug), initial: 0 })).toBeNull();
      expect(buildCalculatorDetailSchedule(find(slug), { ...defaults(slug), years: 0 })).toBeNull();
    }

    const bothZero = validate('xirr', { initial: '0', monthly: '0' });
    expect(bothZero.values).toBeNull();
    expect(bothZero.errors.initial).toBe('Enter a starting investment or a monthly contribution greater than 0.');
    expect(validate('xirr', { initial: '0', monthly: '500' }).values).not.toBeNull();
    expect(validate('xirr', { initial: '1000', monthly: '0' }).values).not.toBeNull();
    expect(
      buildCalculatorDetailSchedule(
        find('xirr'),
        { ...defaults('xirr'), initial: 0, monthly: 0 },
        calculateSeoCalculator(find('xirr'), { ...defaults('xirr'), initial: 0, monthly: 0 })
      )
    ).toBeNull();
    expect(
      buildCalculatorDetailSchedule(
        find('xirr'),
        { ...defaults('xirr'), years: 0 },
        calculateSeoCalculator(find('xirr'), { ...defaults('xirr'), years: 0 })
      )
    ).toBeNull();

    const zeroRate = validate('rule-of-72', { rate: '0' });
    expect(zeroRate.values).toBeNull();
    expect(zeroRate.errors.rate).toBe('Enter a number greater than 0.');
    expect(buildCalculatorDetailSchedule(find('rule-of-72'), { rate: 0 })).toBeNull();
  });

  it('RINC-04: enforces PPF 500 scheme minimum and whole financial year >= 1', () => {
    const ppf = find('ppf');
    const annualInput = ppf.inputs.find((i) => i.key === 'annual')!;
    const yearsInput = ppf.inputs.find((i) => i.key === 'years')!;
    expect(annualInput).toMatchObject({ max: 150000, min: 500 });
    expect(yearsInput).toMatchObject({ min: 1, step: 1 });

    expect(validate('ppf', { annual: '499' }).errors.annual).toBe('Use 500 or more.');
    expect(validate('ppf', { annual: '500' }).values).not.toBeNull();
    expect(validate('ppf', { years: '0' }).errors.years).toBe('Use 1 or more.');
    expect(validate('ppf', { years: '0.5' }).errors.years).toBe(
      'PPF runs in whole financial years. Enter a whole number, such as 15 or 20.'
    );
    expect(validate('ppf', { years: '15.5' }).errors.years).toBe(
      'PPF runs in whole financial years. Enter a whole number, such as 15 or 20.'
    );
  });

  it('RINC-05: enforces RMD divisor >= 1 in input validation and engine/schedule alignment', () => {
    const rmd = find('rmd');
    const divisorInput = rmd.inputs.find((i) => i.key === 'divisor')!;
    expect(divisorInput).toMatchObject({ max: 100, min: 1, step: 0.1 });

    expect(validate('rmd', { divisor: '0' }).errors.divisor).toBe('Use 1 or more.');
    expect(validate('rmd', { divisor: '0.5' }).errors.divisor).toBe('Use 1 or more.');

    const directResult = calculateSeoCalculator(rmd, { balance: 800000, divisor: 0.25 });
    const directSchedule = buildCalculatorDetailSchedule(rmd, { balance: 800000, divisor: 0.25 }, directResult)!;
    expect(directResult.metrics[0].value).toBe(800000);
    expect(metricValue(directResult, 'Divisor used')).toBe(1);
    expect(Number(directSchedule.rows[0].values.distribution)).toBe(800000);
  });

  it('TAX-03: enforces integer paycheck periods 1..365 and reconciles engine and schedule', () => {
    const paycheck = find('paycheck');
    const periodsInput = paycheck.inputs.find((i) => i.key === 'periods')!;
    expect(periodsInput).toMatchObject({ max: 365, min: 1, step: 1 });

    expect(validate('paycheck', { periods: '0' }).errors.periods).toBe('Use 1 or more.');
    expect(validate('paycheck', { periods: '366' }).errors.periods).toBe('Use 365 or less.');
    expect(validate('paycheck', { periods: '26.5' }).errors.periods).toBe(
      'Enter a whole number of pay periods per year, such as 12, 24, 26, or 52.'
    );

    const directValues = { ...defaults('paycheck'), periods: 26.4 };
    const directResult = calculateSeoCalculator(paycheck, directValues);
    const directSchedule = buildCalculatorDetailSchedule(paycheck, directValues, directResult)!;
    const takeHomeRow = directSchedule.rows.find((r) => r.id === 'take-home')!;
    expect(directResult.metrics[0].value).toBeCloseTo(Number(takeHomeRow.values.annual), 6);
    expect(metricValue(directResult, 'Estimated take-home per paycheck')).toBeCloseTo(
      Number(takeHomeRow.values.perPaycheck),
      6
    );
  });

  it('RINC-15: enforces retirement ages 0..120 and retirementAge >= currentAge while keeping B68 equality and 60.125 history valid', () => {
    const retirement = find('retirement');
    expect(retirement.inputs.find((i) => i.key === 'currentAge')).toMatchObject({ max: 120, min: 0, step: 1 });
    expect(retirement.inputs.find((i) => i.key === 'retirementAge')).toMatchObject({ max: 120, min: 0, step: 1 });

    const reversed = validate('retirement', { currentAge: '65', retirementAge: '60' });
    expect(reversed.values).toBeNull();
    expect(reversed.errors.retirementAge).toBe('Enter a retirement age at or after your current age.');

    expect(validate('retirement', { retirementAge: '121' }).errors.retirementAge).toBe('Use 120 or less.');
    expect(validate('retirement', { currentAge: '60', retirementAge: '60' }).values).not.toBeNull();
    expect(validate('retirement', { currentAge: '60', retirementAge: '60.125' }).values).not.toBeNull();
  });

  it.each([
    ['fha-vs-conventional', 'downPayment', '350000', 'Down payment must be less than the home price.'],
    ['apr', 'closingCosts', '300000', 'Finance charges must be less than the loan amount.'],
    ['cagr', 'initial', '0', 'Enter a number greater than 0.'],
    ['retirement', 'retirementAge', '25', 'Enter a retirement age at or after your current age.']
  ] as const)('displays validation state and blocks save in CalculatorLibrary on %s (%s=%s)', (slug, key, value, expectedError) => {
    const host = renderCalculator(slug);
    const input = editField(key, value);
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(host.querySelector('[data-result-state]')?.getAttribute('data-result-state')).toBe('stale');
    expect(host.textContent).toContain(expectedError);
    expect(buttonByText('Save result')?.disabled).toBe(true);
  });

  it('rejects month-rounded ARM and balloon boundaries and keeps generated scenarios valid', () => {
    expect(validate('arm-mortgage', { fixedYears: '29.96', years: '30' }).errors.fixedYears).toBe(
      'Fixed period must be shorter than the loan term.'
    );
    expect(validate('arm-mortgage', { fixedYears: '0.49', years: '0.5' }).errors.fixedYears).toBe(
      'Fixed period must be shorter than the loan term.'
    );
    expect(validate('arm-mortgage', { fixedYears: '0.04', years: '0.5' }).errors.fixedYears).toBe(
      'Fixed period must be at least 1 month.'
    );
    expect(validate('balloon-loan', { balloonYears: '0.04', years: '0.08' }).errors.balloonYears).toBe(
      'Use 0 for an immediate balloon, or at least 1 month.'
    );

    const scenarioCases: Array<[string, Record<string, number>]> = [
      ['arm-mortgage', { years: 0.5, fixedYears: 0.25 }],
      ['balloon-loan', { years: 5, balloonYears: 5 }],
      ['balloon-loan', { years: 0.5, balloonYears: 0.5 }],
      ['apr', { principal: 6000, closingCosts: 5999 }],
      ['apr', { principal: 0.02, closingCosts: 0.019 }],
      ['fha-loan', { homePrice: 350000, downPayment: 340000 }],
      ['fha-loan', { homePrice: 0.015, downPayment: 0.0148 }],
      ['rent-vs-buy', { homePrice: 450000, downPayment: 450000 }],
      ['rule-of-72', { rate: 0.5 }],
      ['rule-of-72', { rate: 0.05 }]
    ];
    for (const [slug, overrides] of scenarioCases) {
      const calc = find(slug);
      const scenarios = buildCalculatorScenarios(calc, { ...defaults(slug), ...overrides });
      for (const scenario of scenarios) {
        const raw = Object.fromEntries(Object.entries(scenario.values).map(([k, v]) => [k, String(v)]));
        expect(validateCalculatorInputs(calc, raw).errors).toEqual({});
      }
      if (slug === 'rule-of-72') {
        expect(scenarios.find((s) => s.id === 'conservative')!.values.rate).toBeLessThan(overrides.rate);
      }
    }
  });

  it('guards sub-1-month xirr/flat/apr/arm edge cases cleanly', () => {
    const xirr = find('xirr');
    const xirrValues = { ...defaults('xirr'), years: 0.04 };
    const xirrResult = calculateSeoCalculator(xirr, xirrValues);
    expect(buildCalculatorDetailSchedule(xirr, xirrValues, xirrResult)).toBeNull();

    const apr = find('apr');
    const aprResult = calculateSeoCalculator(apr, { principal: 1, rate: 6.5, years: 30, closingCosts: 0.99 });
    expect(aprResult.metrics[0].value).toBeGreaterThan(0.065);

    const arm = find('arm-mortgage');
    const armValues = { ...defaults('arm-mortgage'), years: 0.5, fixedYears: 0.25 };
    const armSchedule = buildCalculatorDetailSchedule(arm, armValues, calculateSeoCalculator(arm, armValues))!;
    expect(armSchedule.rows.at(-1)?.values.year).toBe(0.5);
    expect(armSchedule.rows.at(-1)?.note).toBe('First adjustment');
  });
});
