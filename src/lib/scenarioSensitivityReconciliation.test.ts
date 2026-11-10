import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AuthState } from '../auth';
import { CalculatorLibrary } from '../CalculatorLibrary';
import {
  buildCalculatorInputImpacts,
  buildCalculatorSummaryCsv
} from './calculatorEngagement';
import {
  buildCalculatorScenarios,
  buildCalculatorStudioChart
} from './calculatorStudios';
import {
  calculateSeoCalculator,
  seoCalculators
} from './seoCalculators';

function mustGetCalculator(slug: string) {
  const calculator = seoCalculators.find((item) => item.slug === slug);
  if (!calculator) {
    throw new Error(`Missing calculator for slug: ${slug}`);
  }
  return calculator;
}

describe('B69 / C33 — Word-bounded scenario perturbations & bidirectional sensitivity drivers', () => {
  it('R1: never matches "current" as "rent" or misclassifies income/pre-tax/baseline principal as expense/tax, and holds statutory/target parameters fixed', () => {
    // RINC-01: retirement & 401k starting balances ("Current savings", "Current 401(k)") must not invert
    const retirement = mustGetCalculator('retirement');
    const retirementScenarios = buildCalculatorScenarios(retirement, {});
    expect(retirementScenarios[0].values.currentSavings).toBeLessThanOrEqual(retirementScenarios[1].values.currentSavings);
    expect(retirementScenarios[2].values.currentSavings).toBeGreaterThanOrEqual(retirementScenarios[1].values.currentSavings);
    // RINC-10: retirement target annualIncome stays fixed at entered baseline
    expect(retirementScenarios[0].values.annualIncome).toBe(retirementScenarios[1].values.annualIncome);
    expect(retirementScenarios[2].values.annualIncome).toBe(retirementScenarios[1].values.annualIncome);

    const k401 = mustGetCalculator('401k');
    const k401Scenarios = buildCalculatorScenarios(k401, {});
    expect(k401Scenarios[0].values.principal).toBeLessThanOrEqual(k401Scenarios[1].values.principal);
    expect(k401Scenarios[2].values.principal).toBeGreaterThanOrEqual(k401Scenarios[1].values.principal);
    // Clean float rounding (no 112000.00000000001 float noise)
    for (const s of k401Scenarios) {
      for (const val of Object.values(s.values)) {
        expect(String(val)).not.toMatch(/000000[1-9]$/);
      }
    }

    // GGS-03: sip-goal & savings-goal hold target fixed and do not invert current ("Current savings")
    const sipGoal = mustGetCalculator('sip-goal');
    const sipGoalScenarios = buildCalculatorScenarios(sipGoal, {
      target: 10_000_000,
      current: 1_000_000,
      years: 10,
      rate: 12
    });
    expect(sipGoalScenarios[0].values.target).toBe(10_000_000);
    expect(sipGoalScenarios[2].values.target).toBe(10_000_000);
    expect(sipGoalScenarios[0].values.current).toBeLessThanOrEqual(1_000_000);
    expect(sipGoalScenarios[2].values.current).toBeGreaterThanOrEqual(1_000_000);

    // GGS-03: inflation holds Today cost (principal) fixed while varying inflation rate/horizon so Conservative isn't inverted vs Optimistic
    const inflation = mustGetCalculator('inflation');
    const inflationScenarios = buildCalculatorScenarios(inflation, {});
    expect(inflationScenarios[0].values.principal).toBe(10_000);
    expect(inflationScenarios[2].values.principal).toBe(10_000);
    expect(inflationScenarios[0].result.metrics[0].value).toBeLessThan(inflationScenarios[1].result.metrics[0].value);
    expect(inflationScenarios[2].result.metrics[0].value).toBeGreaterThan(inflationScenarios[1].result.metrics[0].value);

    // TAX-02: income-tax-india income ("Annual taxable income before deductions") is not treated as a tax expense
    const indiaTax = mustGetCalculator('income-tax-india');
    const indiaTaxScenarios = buildCalculatorScenarios(indiaTax, {});
    expect(indiaTaxScenarios[0].result.metrics[0].value).toBeLessThan(indiaTaxScenarios[1].result.metrics[0].value);
    expect(indiaTaxScenarios[2].result.metrics[0].value).toBeGreaterThan(indiaTaxScenarios[1].result.metrics[0].value);

    // TAX-02: paycheck holds periods ("Pay periods per year") fixed at 26; hra-exemption holds metroPercent fixed at 50; nps holds annuityPercent fixed at 40
    const paycheck = mustGetCalculator('paycheck');
    const paycheckScenarios = buildCalculatorScenarios(paycheck, {});
    expect(paycheckScenarios[0].values.periods).toBe(26);
    expect(paycheckScenarios[2].values.periods).toBe(26);
    expect(paycheckScenarios[0].values.preTaxDeductions).toBeGreaterThan(paycheckScenarios[1].values.preTaxDeductions);
    expect(paycheckScenarios[2].values.preTaxDeductions).toBeLessThan(paycheckScenarios[1].values.preTaxDeductions);

    const hra = mustGetCalculator('hra-exemption');
    const hraScenarios = buildCalculatorScenarios(hra, {});
    expect(hraScenarios[0].values.metroPercent).toBe(50);
    expect(hraScenarios[2].values.metroPercent).toBe(50);
    expect(hraScenarios[2].result.metrics[0].value).toBeGreaterThanOrEqual(hraScenarios[1].result.metrics[0].value);
    expect(hraScenarios[0].result.metrics[0].value).toBeLessThanOrEqual(hraScenarios[1].result.metrics[0].value);

    const nps = mustGetCalculator('nps');
    const npsScenarios = buildCalculatorScenarios(nps, {});
    expect(npsScenarios[0].values.annuityPercent).toBe(40);
    expect(npsScenarios[2].values.annuityPercent).toBe(40);
  });

  it('R2: ensures directional truthfulness across Loan, Debt, Tax, Retirement, and Insurance scenarios', () => {
    // DEBT-05: debt balances do not shrink in Conservative or grow in Optimistic, and comparative savings routes are not inverted
    for (const slug of ['extra-mortgage-payment', 'mortgage-payoff', 'credit-card-payoff', 'student-loan-payoff']) {
      const calc = mustGetCalculator(slug);
      const scenarios = buildCalculatorScenarios(calc, {});
      expect(scenarios[0].values.balance).toBeGreaterThanOrEqual(scenarios[1].values.balance);
      expect(scenarios[2].values.balance).toBeLessThanOrEqual(scenarios[1].values.balance);
      expect(scenarios[0].result.metrics[0].valueType).toBe(scenarios[1].result.metrics[0].valueType);
      expect(scenarios[2].result.metrics[0].valueType).toBe(scenarios[1].result.metrics[0].valueType);
    }

    for (const slug of [
      'balance-transfer',
      'debt-snowball-avalanche',
      'mortgage-refinance',
      'home-loan-balance-transfer-india',
      'mortgage-points',
      'home-loan-prepayment',
      'home-loan-foreclosure'
    ]) {
      const calc = mustGetCalculator(slug);
      const scenarios = buildCalculatorScenarios(calc, {});
      // On savings/reduction headline routes, Conservative must be <= Base <= Optimistic
      expect(scenarios[0].result.metrics[0].value).toBeLessThanOrEqual(scenarios[1].result.metrics[0].value);
      expect(scenarios[2].result.metrics[0].value).toBeGreaterThanOrEqual(scenarios[1].result.metrics[0].value);
    }

    // LH-04: mortgage-recast, closing-costs & balloon-loan Conservative payment/cost/balloon balance is >= Base >= Optimistic
    for (const slug of ['mortgage-recast', 'closing-costs', 'balloon-loan']) {
      const calc = mustGetCalculator(slug);
      const scenarios = buildCalculatorScenarios(calc, {});
      expect(scenarios[0].result.metrics[0].value).toBeGreaterThanOrEqual(scenarios[1].result.metrics[0].value);
      expect(scenarios[2].result.metrics[0].value).toBeLessThanOrEqual(scenarios[1].result.metrics[0].value);
    }

    // TAX-02: roth-vs-traditional-ira does not invert annual return (rate) and tests retirement vs current tax-rate difference
    const roth = mustGetCalculator('roth-vs-traditional-ira');
    const rothScenarios = buildCalculatorScenarios(roth, {});
    expect(rothScenarios[0].values.rate).toBeLessThanOrEqual(rothScenarios[1].values.rate);
    expect(rothScenarios[2].values.rate).toBeGreaterThanOrEqual(rothScenarios[1].values.rate);
    expect(rothScenarios[0].values.futureTaxRate).not.toBe(rothScenarios[0].values.currentTaxRate);
    expect(rothScenarios[2].values.futureTaxRate).not.toBe(rothScenarios[2].values.currentTaxRate);

    // CBS-03: life-insurance-needs Conservative ("larger coverage needs") > Base > Optimistic ("better coverage progress")
    const insurance = mustGetCalculator('life-insurance-needs');
    const insuranceScenarios = buildCalculatorScenarios(insurance, {});
    expect(insuranceScenarios[0].result.metrics[0].value).toBeGreaterThan(insuranceScenarios[1].result.metrics[0].value);
    expect(insuranceScenarios[2].result.metrics[0].value).toBeLessThan(insuranceScenarios[1].result.metrics[0].value);

    // RINC-10: social-security-break-even & rmd perturb full/divisor and never claim "growth or contribution assumptions"
    const ss = mustGetCalculator('social-security-break-even');
    const ssScenarios = buildCalculatorScenarios(ss, {});
    expect(ssScenarios[0].values.full).not.toBe(ssScenarios[1].values.full);
    expect(ssScenarios[0].description).not.toContain('growth or contribution assumptions');
    expect(ssScenarios[2].description).not.toContain('growth or contribution assumptions');

    const rmd = mustGetCalculator('rmd');
    const rmdScenarios = buildCalculatorScenarios(rmd, {});
    expect(rmdScenarios[0].values.divisor).not.toBe(rmdScenarios[1].values.divisor);
    expect(rmdScenarios[0].description).not.toContain('growth or contribution assumptions');
    expect(rmdScenarios[2].description).not.toContain('growth or contribution assumptions');
  });

  it('R3: uses neutral Case A / Case B labels and chart tones for xirr/investment-return/cagr, fractional steps when years <= 1, and signed gain perturbation on roi', () => {
    // RET-01: xirr uses Case A / Your inputs / Case B and neutral chart tones
    const xirr = mustGetCalculator('xirr');
    const xirrScenarios = buildCalculatorScenarios(xirr, {});
    expect(xirrScenarios.map((s) => s.label)).toEqual(['Case A', 'Your inputs', 'Case B']);
    expect(xirrScenarios[0].description).toContain('sensitivity check');

    for (const slug of ['investment-return', 'cagr', 'xirr']) {
      const calc = mustGetCalculator(slug);
      const chart = buildCalculatorStudioChart(calc, Object.fromEntries(calc.inputs.map((i) => [i.key, i.defaultValue])));
      expect(chart.entries[0]?.tone).toBe('neutral');
      expect(chart.entries[1]?.tone).toBe('accent');
      expect(chart.entries[2]?.tone).toBe('neutral');
    }

    // RET-03: short holding period (years <= 1) never steps down to 0 in scenarios or sensitivity
    for (const slug of ['investment-return', 'cagr', 'xirr']) {
      const calc = mustGetCalculator(slug);
      const baseValues = Object.fromEntries(calc.inputs.map((i) => [i.key, i.defaultValue]));
      const oneYearValues = { ...baseValues, years: 1 };
      const scenarios = buildCalculatorScenarios(calc, oneYearValues);
      expect(scenarios[0].values.years).toBeGreaterThan(0);
      const impacts = buildCalculatorInputImpacts(calc, oneYearValues);
      const yearsImpact = impacts.find((i) => i.inputKey === 'years');
      expect(yearsImpact?.lowerInput).toBeGreaterThan(0);
    }

    // RET-06: negative gain on roi worsens in Conservative and improves in Optimistic
    const roi = mustGetCalculator('roi');
    const lossValues = { gain: -5000, cost: 20000 };
    const roiScenarios = buildCalculatorScenarios(roi, lossValues);
    expect(roiScenarios[0].values.gain).toBeLessThan(-5000);
    expect(roiScenarios[2].values.gain).toBeGreaterThan(-5000);
    expect(roiScenarios[0].result.metrics[0].value).toBeLessThan(roiScenarios[1].result.metrics[0].value);
    expect(roiScenarios[2].result.metrics[0].value).toBeGreaterThan(roiScenarios[1].result.metrics[0].value);

    const roiImpacts = buildCalculatorInputImpacts(roi, lossValues);
    const costImpact = roiImpacts.find((i) => i.inputKey === 'cost');
    expect(costImpact?.summary).not.toBe('A higher cost raises the headline result when other inputs stay fixed.');
  });

  it('R4: lists all changed inputs on scenario cards instead of truncating at 3', () => {
    const auth: AuthState = {
      provider: 'clerk',
      status: 'not-configured',
      isConfigured: false,
      isSignedIn: false,
      missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
      user: null
    };
    const html = renderToStaticMarkup(
      React.createElement(CalculatorLibrary, {
        auth,
        route: '/calculators/nps',
        onNavigate: () => {},
        onSaveResult: async () => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: '1' }),
        savedResults: []
      })
    );
    expect(html).toContain('Changes Monthly contribution, Years, Annual return / rate, Annuity rate.');
  });

  it('R5: computes bidirectional sensitivity at upper caps, integer-year steps on ppf, meaningful zero-default currency steps, proportional <5% rate steps, and secondary-metric fallback', () => {
    // LH-08 & RINC-04: two-sided derivative at upper caps (ppf annual=150000, mortgage-affordability maxDti=28, home-loan-foreclosure prepayment=3500000)
    const ppf = mustGetCalculator('ppf');
    const ppfImpacts = buildCalculatorInputImpacts(ppf, {});
    const ppfAnnual = ppfImpacts.find((i) => i.inputKey === 'annual');
    expect(ppfAnnual?.magnitude).toBeGreaterThan(0);
    expect(ppfAnnual?.direction).toBe('raises');
    expect(ppfAnnual?.summary).not.toContain('does not change');

    // RINC-04: ppf years impact uses whole-year steps (not 13.5 / 16.5)
    const ppfYears = ppfImpacts.find((i) => i.inputKey === 'years');
    expect(Number.isInteger(ppfYears?.lowerInput)).toBe(true);
    expect(Number.isInteger(ppfYears?.higherInput)).toBe(true);

    const affordability = mustGetCalculator('mortgage-affordability');
    const affordabilityImpacts = buildCalculatorInputImpacts(affordability, {});
    const maxDtiImpact = affordabilityImpacts.find((i) => i.inputKey === 'maxDti');
    expect(maxDtiImpact?.magnitude).toBeGreaterThan(0);
    expect(maxDtiImpact?.direction).not.toBe('unchanged');

    const foreclosure = mustGetCalculator('home-loan-foreclosure');
    const foreclosureImpacts = buildCalculatorInputImpacts(foreclosure, {});
    const prepaymentImpact = foreclosureImpacts.find((i) => i.inputKey === 'prepayment');
    expect(prepaymentImpact?.magnitude).toBeGreaterThan(0);
    expect(prepaymentImpact?.direction).not.toBe('unchanged');

    // DEBT-05, GGS-07, TAX-07, RINC-13: zero-default currency inputs use meaningful step sizes (> $1 / ₹1)
    const debtPayoff = mustGetCalculator('extra-mortgage-payment');
    const debtImpacts = buildCalculatorInputImpacts(debtPayoff, {});
    const extraMonthly = debtImpacts.find((i) => i.inputKey === 'extraMonthlyPayment');
    expect(extraMonthly?.higherInput).toBeGreaterThan(1);
    expect(extraMonthly?.magnitude).toBeGreaterThan(0);

    const tds = mustGetCalculator('tds');
    const tdsImpacts = buildCalculatorInputImpacts(tds, {});
    const tdsDeductions = tdsImpacts.find((i) => i.inputKey === 'deductions');
    expect(tdsDeductions?.higherInput).toBeGreaterThan(1);
    expect(tdsDeductions?.magnitude).toBeGreaterThanOrEqual(1);

    const sipGoal = mustGetCalculator('sip-goal');
    const sipGoalImpacts = buildCalculatorInputImpacts(sipGoal, {});
    const sipCurrent = sipGoalImpacts.find((i) => i.inputKey === 'current');
    expect(sipCurrent?.higherInput).toBeGreaterThan(1);
    expect(sipCurrent?.magnitude).toBeGreaterThanOrEqual(1);

    // GGS-07: <5% positive percent inputs use 10% proportional step instead of flat 0.5pp
    const inflation = mustGetCalculator('inflation');
    const inflationImpacts = buildCalculatorInputImpacts(inflation, {});
    const inflationRate = inflationImpacts.find((i) => i.inputKey === 'rate');
    expect(inflationRate?.higherInput).toBeCloseTo(4.4, 6);
    expect(inflationRate?.lowerInput).toBeCloseTo(3.6, 6);

    // Secondary-metric fallback when metrics[0] is invariant
    const roth = mustGetCalculator('roth-vs-traditional-ira');
    const rothImpacts = buildCalculatorInputImpacts(roth, {});
    const futureTax = rothImpacts.find((i) => i.inputKey === 'futureTaxRate');
    expect(futureTax?.magnitude).toBeGreaterThan(0);
    expect(futureTax?.direction).not.toBe('unchanged');

    const mortgage = mustGetCalculator('mortgage');
    const mortgageImpacts = buildCalculatorInputImpacts(mortgage, {});
    const taxesImpact = mortgageImpacts.find((i) => i.inputKey === 'annualTaxes');
    expect(taxesImpact?.magnitude).toBeGreaterThan(0);
    expect(taxesImpact?.direction).not.toBe('unchanged');
    // Primary headline drivers (Loan amount, Interest rate, Term) are marked isPrimaryDriver and outrank monthly optional costs
    const primaryDrivers = mortgageImpacts.filter((i) => i.isPrimaryDriver !== false);
    expect(primaryDrivers.map((i) => i.inputKey)).toEqual(['principal', 'rate', 'years']);
    expect(taxesImpact?.magnitude).toBeLessThan(primaryDrivers[2].magnitude);
    // Secondary-metric fallback prefers same-unit currency metric (e.g. Total interest / Monthly outflow) over months
    const recast = mustGetCalculator('mortgage-recast');
    const recastImpacts = buildCalculatorInputImpacts(recast, {});
    const recastExtraMonthly = recastImpacts.find((i) => i.inputKey === 'extraMonthlyPayment');
    expect(recastExtraMonthly?.targetValueType).toBe('currency');

    const retirement = mustGetCalculator('retirement');
    const retirementImpacts = buildCalculatorInputImpacts(retirement, {});
    const annualIncomeImpact = retirementImpacts.find((i) => i.inputKey === 'annualIncome');
    expect(annualIncomeImpact?.magnitude).toBeGreaterThan(0);
    expect(annualIncomeImpact?.direction).not.toBe('unchanged');
  });

  it('R6: preserves all pinned scenario vectors and mortgage scenario labels', () => {
    const mortgage = mustGetCalculator('mortgage');
    const mortgageScenarios = buildCalculatorScenarios(mortgage, {});
    const mortgageImpacts = buildCalculatorInputImpacts(mortgage, {});
    expect(mortgageScenarios.map((s) => s.label)).toEqual(['Conservative', 'Base', 'Optimistic']);
    const csv = buildCalculatorSummaryCsv(mortgage, mortgageScenarios, 'conservative', mortgageImpacts);
    expect(csv).toContain('Input,Conservative,Loan amount');

    const ppf = mustGetCalculator('ppf');
    const ppfScenarios = buildCalculatorScenarios(ppf, {});
    expect(ppfScenarios.map((s) => s.values)).toEqual([
      { annual: 132000, rate: 6.035, years: 13 },
      { annual: 150000, rate: 7.1, years: 15 },
      { annual: 150000, rate: 8.165, years: 17 }
    ]);

    const cagr = mustGetCalculator('cagr');
    const cagrScenarios = buildCalculatorScenarios(cagr, {});
    expect(cagrScenarios.map((s) => s.values)).toEqual([
      { initial: 10000, final: 16560, years: 4 },
      { initial: 10000, final: 18000, years: 5 },
      { initial: 10000, final: 19440, years: 6 }
    ]);
  });
});
