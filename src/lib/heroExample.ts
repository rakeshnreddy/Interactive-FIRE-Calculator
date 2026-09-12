import {
  calculateFirePlan,
  formatMoney,
  formatPercent,
  type FirePlanResult,
  type PlanInput
} from './fire';

/**
 * Named synthetic FIRE calculation fixture for the homepage hero composition.
 * Strictly synthetic illustrative example using transparent, realistic parameters.
 * Does not write to user storage, database, or telemetry.
 */
export const HERO_FIRE_FIXTURE: PlanInput = {
  annualExpense: 60_000,
  initialPortfolio: 500_000,
  withdrawalTiming: 'end',
  desiredFinalValue: 0,
  ratePeriods: [
    { duration: 30, r: 0.07, i: 0.025 }
  ],
  oneOffEvents: [],
  recurringCashFlows: []
};

export type HeroFireExampleData = {
  fixture: PlanInput;
  result: FirePlanResult;
  formatted: {
    annualExpense: string;
    initialPortfolio: string;
    requiredPortfolio: string;
    portfolioGap: string;
    maxAnnualExpense: string;
    modeledEndBalance: string;
    returnRate: string;
    inflationRate: string;
    horizonYears: number;
    timelineYearsLabel: string;
  };
};

export function getHeroFireExampleData(input: PlanInput = HERO_FIRE_FIXTURE): HeroFireExampleData {
  const result = calculateFirePlan(input);
  const period = input.ratePeriods[0] ?? { duration: 30, r: 0.07, i: 0.025 };
  const gap = Math.max(0, result.requiredPortfolio - input.initialPortfolio);
  const roundedEndBalance = Math.max(0, Math.round(result.expenseMode.finalBalance));

  return {
    fixture: input,
    result,
    formatted: {
      annualExpense: formatMoney(input.annualExpense),
      initialPortfolio: formatMoney(input.initialPortfolio),
      requiredPortfolio: formatMoney(result.requiredPortfolio),
      portfolioGap: formatMoney(gap),
      maxAnnualExpense: formatMoney(result.maxAnnualExpense),
      modeledEndBalance: formatMoney(roundedEndBalance),
      returnRate: formatPercent(period.r),
      inflationRate: formatPercent(period.i),
      horizonYears: period.duration,
      timelineYearsLabel: `${period.duration}-year`
    }
  };
}
