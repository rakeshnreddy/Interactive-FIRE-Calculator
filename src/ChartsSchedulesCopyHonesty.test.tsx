import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import { CalculatorLibrary } from './CalculatorLibrary';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';
import { SavingsGoalCalculator } from './SavingsGoalCalculator';
import { XirrCalculator } from './XirrCalculator';
import { buildCalculatorPublicContent } from './lib/calculatorContent';
import { buildCalculatorInputImpacts } from './lib/calculatorEngagement';
import { getCalculatorQualitySpec } from './lib/calculatorQuality';
import { buildCalculatorScope } from './lib/calculatorScope';
import {
  buildCalculatorDetailSchedule,
  buildCalculatorScenarios,
  buildCalculatorStudioChart,
  getCalculatorStudioMetadata
} from './lib/calculatorStudios';
import {
  calculateCompoundInterest,
  defaultCompoundInterestInputs
} from './lib/compoundInterestCalculator';
import { datedReturnLimits } from './lib/datedReturns';
import { calculateSeoCalculator, findSeoCalculator } from './lib/seoCalculators';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const publicOnlyAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const noopSave = async () => ({
  destinationRoute: '/plans' as const,
  message: 'Saved',
  savedResultId: 'synthetic'
});

function defaultValuesFor(slug: string): Record<string, number> {
  const calculator = findSeoCalculator(slug)!;
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

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

describe('B75 / C37 charts, schedules, provenance links & copy honesty', () => {
  it('TAX-05: reconciles US tax standard deduction cap, extra deductions row, and total effective base', () => {
    const usTax = findSeoCalculator('income-tax-us')!;

    const lowIncomeSchedule = buildCalculatorDetailSchedule(usTax, {
      income: 10_000,
      deductions: 0,
      stateRate: 0
    })!;
    expect(lowIncomeSchedule.rows.find((row) => row.id === 'standard-deduction')!.values.taxedAmount).toBe(10_000);

    const scheduleWithExtra = buildCalculatorDetailSchedule(usTax, {
      income: 120_000,
      deductions: 10_000,
      stateRate: 4
    })!;
    const extraRow = scheduleWithExtra.rows.find((row) => row.id === 'extra-deductions');
    expect(extraRow).toBeDefined();
    expect(extraRow!.values.taxedAmount).toBe(10_000);

    const totalRow = scheduleWithExtra.rows.find((row) => row.id === 'total-tax')!;
    expect(totalRow.values.taxedAmount).toBe(120_000);
    expect(Number(totalRow.values.tax) / Number(totalRow.values.taxedAmount)).toBeCloseTo(Number(totalRow.values.rate), 10);
  });

  it('TAX-06: fixes India tax rebate grammar and accurately scopes quality contract requirements', () => {
    const indiaTax = findSeoCalculator('income-tax-india')!;
    const result = calculateSeoCalculator(indiaTax, { income: 1_800_000, deductions: 150_000 });
    const assumptions = result.assumptions.join(' ');
    expect(assumptions).toContain('rebate edge cases');
    expect(assumptions).not.toContain('rebates edge cases');

    const spec = getCalculatorQualitySpec(indiaTax);
    const reqs = spec.calculationRequirements.join(' ');
    expect(reqs).toContain('4% cess');
    expect(reqs).toMatch(/exclud(?:ed|ing)[^.]*surcharge/i);
    expect(reqs).not.toContain('standard deduction');
  });

  it('TAX-08 & CBS-06: keeps waterfall units aligned, gives custom metadata/cost breakdowns, and reconciles fractional emergency fund months', () => {
    const salaryIndia = findSeoCalculator('salary-india')!;
    const salaryChart = buildCalculatorStudioChart(salaryIndia, defaultValuesFor('salary-india'));
    expect(salaryChart.entries.map((entry) => entry.label)).not.toContain('Estimated monthly take-home');

    const paycheck = findSeoCalculator('paycheck')!;
    const paycheckChart = buildCalculatorStudioChart(paycheck, defaultValuesFor('paycheck'));
    expect(paycheckChart.entries.map((entry) => entry.label)).not.toContain('Estimated take-home per paycheck');

    const emergencyFund = findSeoCalculator('emergency-fund')!;
    const efChart = buildCalculatorStudioChart(emergencyFund, defaultValuesFor('emergency-fund'));
    const expenseEntries = efChart.entries.filter((entry) => entry.label === 'Monthly expenses');
    expect(expenseEntries).toHaveLength(1);

    const efSchedule = buildCalculatorDetailSchedule(emergencyFund, { monthlyExpenses: 3_500, months: 6.5 })!;
    expect(efSchedule.rows.at(-1)!.values.targetToDate).toBe(22_750);
    expect(efSchedule.rows.at(-1)!.values.remainingTarget).toBe(0);
    expect(buildCalculatorDetailSchedule(emergencyFund, { monthlyExpenses: 4_500, months: 0 })).toBeNull();
    const efSmallSchedule = buildCalculatorDetailSchedule(emergencyFund, { monthlyExpenses: 4_500, months: 0.1 })!;
    expect(efSmallSchedule.rows.at(-1)!.values.targetToDate).toBe(450);
    expect(efSmallSchedule.rows.at(-1)!.values.remainingTarget).toBe(0);

    for (const slug of ['roth-vs-traditional-ira', 'hra-exemption', 'gst', 'budget', 'inflation', 'down-payment']) {
      const calc = findSeoCalculator(slug)!;
      const meta = getCalculatorStudioMetadata(calc);
      expect(meta.chartTitle).not.toBe('Gross-to-net preview');
      expect(meta.chartTitle).not.toBe('Growth path preview');
      expect(meta.chartTitle).not.toBe('Loan path preview');
      const renderedChart = buildCalculatorStudioChart(calc, defaultValuesFor(slug));
      expect(renderedChart.title, slug).toBe(meta.chartTitle);
      expect(renderedChart.description, slug).toBe(meta.chartDescription);
    }

    const downPaymentChart = buildCalculatorStudioChart(findSeoCalculator('down-payment')!, defaultValuesFor('down-payment'));
    expect(downPaymentChart.type).toBe('waterfall');
    expect(downPaymentChart.entries.map((entry) => entry.label)).toEqual([
      'Home price',
      'Down payment target',
      'Loan amount before costs'
    ]);
    expect(downPaymentChart.description).toContain('before closing costs');
    expect(downPaymentChart.description).not.toContain('estimated closing costs');

    const inflationChart = buildCalculatorStudioChart(findSeoCalculator('inflation')!, defaultValuesFor('inflation'));
    expect(inflationChart.type).toBe('timeline');
    expect(inflationChart.entries.length).toBeGreaterThanOrEqual(2);

    const rothChart = buildCalculatorStudioChart(findSeoCalculator('roth-vs-traditional-ira')!, defaultValuesFor('roth-vs-traditional-ira'));
    expect(rothChart.type).toBe('timeline');
    expect(rothChart.entries.map((entry) => entry.label)).not.toContain('Roth contribution after tax today');

    const tdsChart = buildCalculatorStudioChart(findSeoCalculator('tds')!, defaultValuesFor('tds'));
    expect(tdsChart.summary).toContain('TDS');
    expect(tdsChart.summary).not.toContain(' tds ');

    const hraChart = buildCalculatorStudioChart(findSeoCalculator('hra-exemption')!, defaultValuesFor('hra-exemption'));
    expect(hraChart.type).toBe('waterfall');
    expect(hraChart.entries.map((entry) => entry.label)).toEqual([
      'HRA received',
      'Estimated HRA exemption',
      'Taxable HRA estimate'
    ]);

    const gstChart = buildCalculatorStudioChart(findSeoCalculator('gst')!, defaultValuesFor('gst'));
    expect(gstChart.type).toBe('waterfall');
    expect(gstChart.entries.map((entry) => entry.label)).toEqual([
      'Pre-tax amount',
      'Estimated GST',
      'Total including GST'
    ]);

    const budgetChart = buildCalculatorStudioChart(findSeoCalculator('budget')!, defaultValuesFor('budget'));
    expect(budgetChart.type).toBe('waterfall');
    expect(budgetChart.entries.map((entry) => entry.label)).toEqual([
      'Monthly income',
      'Monthly expenses',
      'Monthly surplus'
    ]);
  });

  it('TAX-09 & RINC-16: uses live statutory tax URL, drops capital-gains deductions row, keeps regional related routes, adds HRA helpers, and preserves acronyms', () => {
    const salaryIndia = findSeoCalculator('salary-india')!;
    const salaryScope = buildCalculatorScope(salaryIndia, defaultValuesFor('salary-india'))!;
    expect(salaryScope.sources[0].url).toBe('https://www.incometax.gov.in/');

    const capGains = findSeoCalculator('capital-gains-tax')!;
    const capSchedule = buildCalculatorDetailSchedule(capGains, defaultValuesFor('capital-gains-tax'))!;
    expect(capSchedule.rows.map((row) => row.id)).not.toContain('deductions');

    const capRelated = getCalculatorStudioMetadata(capGains).relatedCalculators.map((r) => r.slug);
    expect(capRelated).not.toContain('gst');

    const usTaxRelated = getCalculatorStudioMetadata(findSeoCalculator('income-tax-us')!).relatedCalculators.map((r) => r.slug);
    expect(usTaxRelated).not.toContain('gst');

    const hra = findSeoCalculator('hra-exemption')!;
    expect(hra.inputs.find((i) => i.key === 'salary')!.helper).toBe('Annual basic salary (plus DA where applicable) in ₹.');
    expect(hra.inputs.find((i) => i.key === 'hra')!.helper).toBe('Annual house rent allowance received from your employer in ₹.');

    const tdsPayment = findSeoCalculator('tds')!.inputs.find((i) => i.key === 'income')!;
    expect(tdsPayment.helper).not.toMatch(/\bhra\b|\birs\b|\btds\b|\bemi\b/);

    const gstPrincipalMeta = getCalculatorStudioMetadata(findSeoCalculator('gst')!);
    expect(gstPrincipalMeta.example.description).toContain('GST');
    expect(gstPrincipalMeta.example.description).not.toContain(' gst ');

    const rule72Meta = getCalculatorStudioMetadata(findSeoCalculator('rule-of-72')!);
    expect(rule72Meta.example.description).not.toContain('second input');
  });

  it('RET-04: reconciles xirr-approximation schedule on severe losses and fractional years', () => {
    const xirr = findSeoCalculator('xirr')!;
    const severeLoss = { initial: 10_000, monthly: 500, final: 525, years: 5 };
    const severeLossSchedule = buildCalculatorDetailSchedule(xirr, severeLoss);
    expect(severeLossSchedule).not.toBeNull();
    expect(Number(severeLossSchedule!.rows.at(-1)!.values.endingValue)).toBeCloseTo(525, 2);

    const nearTotalLoss = { initial: 10_000, monthly: 500, final: 502, years: 5 };
    const nearTotalLossSchedule = buildCalculatorDetailSchedule(xirr, nearTotalLoss);
    expect(nearTotalLossSchedule).not.toBeNull();
    expect(Number(nearTotalLossSchedule!.rows.at(-1)!.values.endingValue)).toBeCloseTo(502, 2);

    const fractional = { initial: 10_000, monthly: 500, final: 56_000, years: 5.5 };
    const fractionalSchedule = buildCalculatorDetailSchedule(xirr, fractional)!;
    expect(fractionalSchedule.rows.at(-1)!.values.year).toBe(5.5);
    expect(fractionalSchedule.rows.at(-1)!.note).toMatch(/6 months/);
  });

  it('RET-05: fixes doubling schedule multiples and surfaces exact logarithmic doubling benchmark', () => {
    const rule72 = findSeoCalculator('rule-of-72')!;
    const schedule = buildCalculatorDetailSchedule(rule72, { rate: 9 })!;
    expect(schedule.rows.map((row) => row.values.valueMultiple)).toEqual([1, 1.19, 1.41, 1.68, 2]);

    const res24 = calculateSeoCalculator(rule72, { rate: 24 });
    const exactMetric = res24.metrics.find((m) => m.label === 'Exact compound years');
    const gapMetric = res24.metrics.find((m) => m.label === 'Rule of 72 gap');
    expect(exactMetric).toBeDefined();
    expect(exactMetric!.value).toBeCloseTo(Math.log(2) / Math.log(1.24), 4);
    expect(gapMetric).toBeDefined();
    expect(gapMetric!.value).toBeCloseTo(3 - Math.log(2) / Math.log(1.24), 4);
  });

  it('RET-07: fixes Rule of 72 / ROI copy, singular grammar, and holding-period driver phrasing', () => {
    const rule72 = findSeoCalculator('rule-of-72')!;
    const ruleContent = buildCalculatorPublicContent(rule72);
    expect(ruleContent.explanation).not.toContain('debt schedule');
    expect(ruleContent.assumptions.join(' ')).toContain('is held at the value');

    const roi = findSeoCalculator('roi')!;
    const roiScenarios = buildCalculatorScenarios(roi, defaultValuesFor('roi'));
    expect(roiScenarios.find((s) => s.id === 'conservative')!.description).toContain('cost');

    const ruleScenarios = buildCalculatorScenarios(rule72, { rate: 9 });
    expect(ruleScenarios.find((s) => s.id === 'conservative')!.description).toMatch(/return/i);

    const invReturn = findSeoCalculator('investment-return')!;
    const impacts = buildCalculatorInputImpacts(invReturn, defaultValuesFor('investment-return'));
    const yearsImpact = impacts.find((i) => i.inputKey === 'years')!;
    expect(yearsImpact.summary).toContain('A longer holding period (years)');
    expect(yearsImpact.summary).not.toContain('A higher years');
  });

  it('RET-08: renders Net entered cash flows metric and not-configured fallback in XirrCalculator, and matches datedReturnLimits.residual', async () => {
    expect(datedReturnLimits.residual).toBe(1e-12);

    window.history.replaceState({}, '', '/calculators/xirr?returnMode=dated');
    const xirr = findSeoCalculator('xirr')!;
    await act(async () => {
      root!.render(
        <XirrCalculator
          auth={publicOnlyAuth}
          calculator={xirr}
          onSaveResult={noopSave}
          savedResults={[]}
          renderPeriodic={() => <p>Periodic</p>}
        />
      );
    });

    const exampleBtn = [...container!.querySelectorAll('button')].find((b) => b.textContent === 'Use example cash flows')!;
    await act(async () => {
      exampleBtn.click();
    });

    expect(container!.textContent).toContain('Net entered cash flows');
    expect(container!.textContent).toContain('$100.00');

    const fallbackBtn = [...container!.querySelectorAll('button')].find((b) => b.textContent?.includes('Account saving unavailable'));
    expect(fallbackBtn).toBeDefined();
    await act(async () => {
      fallbackBtn!.click();
    });
    expect(container!.textContent).toContain('unavailable in this preview');
  });

  it('RINC-05, RINC-06, RINC-09, RINC-11, RINC-14: discloses RMD/EPF/gratuity/retirement basis, updates Labour URL, and builds timeline charts', () => {
    const rmd = findSeoCalculator('rmd')!;
    const rmdRes = calculateSeoCalculator(rmd, defaultValuesFor('rmd'));
    expect(rmdRes.assumptions.join(' ')).toMatch(/0%.*divisor.*1\.0/i);
    const rmdSchedule = buildCalculatorDetailSchedule(rmd, defaultValuesFor('rmd'))!;
    expect(rmdSchedule.description).toMatch(/0%|return/i);

    const epf = findSeoCalculator('epf')!;
    const epfScope = buildCalculatorScope(epf, defaultValuesFor('epf'))!;
    expect(epfScope.basis).toContain('annual rate ÷ 12');
    expect(epf.inputs.find((i) => i.key === 'rate')!.helper).toContain('annual rate ÷ 12');
    const epfRes = calculateSeoCalculator(epf, defaultValuesFor('epf'));
    expect(epfRes.assumptions.join(' ')).toContain('annual rate ÷ 12');

    const gratuity = findSeoCalculator('gratuity')!;
    const gratScope = buildCalculatorScope(gratuity, defaultValuesFor('gratuity'))!;
    expect(gratScope.sources[0].url).toBe('https://labour.gov.in/');
    const gratShort = calculateSeoCalculator(gratuity, { salary: 100_000, years: 3 });
    expect(gratShort.assumptions.join(' ')).toContain('5 years');

    const retirement = findSeoCalculator('retirement')!;
    expect(retirement.inputs.find((i) => i.key === 'withdrawalRate')!.helper).toMatch(/withdrawal percentage/i);
    expect(calculateSeoCalculator(retirement, defaultValuesFor('retirement')).assumptions.join(' ')).toMatch(/retirement-year dollars/i);

    const ppf = findSeoCalculator('ppf')!;
    expect(ppf.inputs.find((i) => i.key === 'rate')!.helper).toContain('Annual PPF interest rate');

    for (const slug of ['retirement', 'swp', 'ppf', 'epf', 'nps', 'gratuity', 'social-security-break-even', 'rmd', 'rent-vs-buy']) {
      const calc = findSeoCalculator(slug)!;
      const chart = buildCalculatorStudioChart(calc, defaultValuesFor(slug));
      expect(chart.type, slug).toBe('timeline');
      expect(chart.entries.length, slug).toBeGreaterThanOrEqual(2);
    }

    const retiredChart = buildCalculatorStudioChart(retirement, { ...defaultValuesFor('retirement'), currentAge: 65, retirementAge: 60 });
    expect(retiredChart.type).toBe('timeline');
    expect(retiredChart.entries.at(-1)!.label).toBe('Now');
  });

  it('DEBT-04, DEBT-06, DEBT-07: clarifies extra mortgage payment labels/copy, promo period metric, and debt-payoff library card', () => {
    const extraMortgage = findSeoCalculator('extra-mortgage-payment')!;
    expect(buildCalculatorPublicContent(extraMortgage).explanation).toContain('extra monthly and yearly principal payments');

    const extraHtml = renderToStaticMarkup(
      <CalculatorLibrary
        auth={publicOnlyAuth}
        route="/calculators/extra-mortgage-payment"
        onNavigate={() => {}}
        onSaveResult={noopSave}
        savedResults={[]}
      />
    );
    expect(extraHtml).toContain('Extra yearly payment');

    const bt = findSeoCalculator('balance-transfer')!;
    const btMetrics = calculateSeoCalculator(bt, defaultValuesFor('balance-transfer')).metrics.map((m) => m.label);
    expect(btMetrics).toContain('Months in promo period');
    expect(btMetrics).not.toContain('Promo payoff months');

    const hubHtml = renderToStaticMarkup(
      <CalculatorLibrary
        auth={publicOnlyAuth}
        route="/calculators"
        onNavigate={() => {}}
        onSaveResult={noopSave}
        savedResults={[]}
      />
    );
    expect(hubHtml).toContain('Estimate payoff time, total interest, and how extra monthly or yearly payments clear a debt faster.');
    expect(hubHtml).not.toContain('Compare avalanche and snowball strategies to eliminate high-interest debt faster.');
  });

  it('GGS-04, GGS-05, GGS-06, GGS-08, GGS-09, GGS-10: aligns growth milestones, SIP Goal copy/inputs, inflation/down-payment contracts, HYSA fractional schedule/APY copy, Compound scenario labels, and Savings Runway captions', () => {
    const withContrib = calculateCompoundInterest({ ...defaultCompoundInterestInputs, principal: 10_000, recurringContribution: 500, years: 10 });
    expect(withContrib.milestones.map((m) => m.label)).toContain('Balance reaches 2x starting amount');
    const noContrib = calculateCompoundInterest({ ...defaultCompoundInterestInputs, principal: 10_000, recurringContribution: 0, annualTopUp: 0, futureDepositAmount: 0, annualRatePercent: 8, years: 12 });
    expect(noContrib.milestones.map((m) => m.label)).toContain('Starting balance doubled');

    const sipGoal = findSeoCalculator('sip-goal')!;
    expect(sipGoal.inputs.find((i) => i.key === 'rate')!.helper).toContain('rate ÷ 12');
    expect(buildCalculatorPublicContent(sipGoal).assumptions[0]).toContain('compound monthly');

    expect(getCalculatorQualitySpec(findSeoCalculator('inflation')!).visualRequirements.join(' ')).toContain('purchasing power');
    expect(getCalculatorQualitySpec(findSeoCalculator('down-payment')!).visualRequirements.join(' ')).toContain('loan');

    const hysa = findSeoCalculator('hysa')!;
    expect(hysa.inputs.find((i) => i.key === 'rate')!.helper).toContain('APY');
    const hysaHalfYearSchedule = buildCalculatorDetailSchedule(hysa, { ...defaultValuesFor('hysa'), years: 1.5 })!;
    expect(hysaHalfYearSchedule.rows.at(-1)!.values.year).toBe(1.5);
    expect(hysaHalfYearSchedule.rows.at(-1)!.note).toContain('6 months');
    const hysaScenarios = buildCalculatorScenarios(hysa, defaultValuesFor('hysa'));
    expect(hysaScenarios.map((s) => s.label)).toEqual(['Lower APY', 'Base', 'Higher APY']);

    const compoundHtml = renderToStaticMarkup(
      <CompoundInterestCalculator
        auth={publicOnlyAuth}
        calculator={findSeoCalculator('compound-interest')!}
        onNavigate={() => {}}
        onSaveResult={noopSave}
        savedResults={[]}
      />
    );
    expect(compoundHtml).toContain('Lower rate');
    expect(compoundHtml).toContain('Higher rate');
    expect(compoundHtml).toContain('Lower and higher rate cases move only the annual rate by 2 percentage points.');

    const savingsHtml = renderToStaticMarkup(
      <SavingsGoalCalculator
        auth={publicOnlyAuth}
        calculator={findSeoCalculator('savings-goal')!}
        onNavigate={() => {}}
        onSaveResult={noopSave}
        savedResults={[]}
      />
    );
    expect(savingsHtml).toContain('Current:');
    expect(savingsHtml).toContain('Required:');
  });

  it('LH-09, LH-10, LH-11: discloses FHA MIP schedule exclusion, removes EMI from US loans, deduplicates affordability copy, and adds India home-loan statutory context', () => {
    const fha = findSeoCalculator('fha-loan')!;
    const fhaSchedule = buildCalculatorDetailSchedule(fha, defaultValuesFor('fha-loan'))!;
    expect(fhaSchedule.description).toMatch(/excludes recurring monthly MIP/i);

    const mortgageContent = buildCalculatorPublicContent(findSeoCalculator('mortgage')!);
    expect(mortgageContent.explanation).not.toContain('EMI');

    const affordContent = buildCalculatorPublicContent(findSeoCalculator('mortgage-affordability')!);
    const matches = affordContent.explanation.match(/housing and total-debt planning limits/g) ?? [];
    expect(matches.length).toBeLessThanOrEqual(1);

    for (const [slug, expectedRegex] of [
      ['home-loan-prepayment', /RBI.*prepayment penalty/i],
      ['home-loan-foreclosure', /RBI.*foreclosure/i],
      ['home-loan-balance-transfer-india', /MODT.*18% GST/i],
      ['stamp-duty-registration', /Circle Rate|Ready Reckoner/i]
    ] as const) {
      const calc = findSeoCalculator(slug)!;
      const res = calculateSeoCalculator(calc, defaultValuesFor(slug));
      expect(res.assumptions.join(' '), slug).toMatch(expectedRegex);
    }
  });
});
