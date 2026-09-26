import type { RatePeriod } from './fire';

// Accumulation contract (B36, OD-2). Additive: the drawdown engine in fire.ts is unchanged.
//
// Units: everything is in today's money. Growth uses the real return (1 + r) / (1 + i) - 1, so a
// nominal 7% with 2.5% inflation grows balances by ~4.39% a year in today's money.
// Timing: the balance is checked at the start of each age; the year's savings are deposited at the
// end of that year (after growth). Savings grow by `savingsGrowth` a year in real terms.
// Stopping: the first whole age at which the balance meets `targetAtAge(age)` — the portfolio the
// drawdown engine needs to fund retirement from that age to the plan end age. If no age before the
// plan end age qualifies, the result is `not-reached`. This is an estimate, never a promise.

export type AccumulationInput = {
  currentAge: number;
  planEndAge: number;
  currentPortfolio: number;
  annualSavings: number;
  savingsGrowth: number;
  nominalReturn: number;
  inflation: number;
  targetAtAge: (age: number) => number;
};

export type AccumulationYear = {
  age: number;
  portfolio: number;
  target: number;
  contribution: number;
};

export type AccumulationResult = {
  status: 'already-fi' | 'reaches' | 'not-reached';
  retireAge: number | null;
  realReturn: number;
  path: AccumulationYear[];
};

export function realReturn(nominalReturn: number, inflation: number): number {
  return (1 + nominalReturn) / (1 + inflation) - 1;
}

export function fitRatePeriods(periods: RatePeriod[], horizon: number): RatePeriod[] {
  const fitted: RatePeriod[] = [];
  let remaining = horizon;
  for (const period of periods) {
    if (remaining <= 0) break;
    const duration = Math.min(period.duration, remaining);
    fitted.push({ ...period, duration });
    remaining -= duration;
  }
  if (remaining > 0 && fitted.length > 0) {
    const last = fitted[fitted.length - 1];
    fitted[fitted.length - 1] = { ...last, duration: last.duration + remaining };
  }
  return fitted;
}

export function estimateRetirementAge(input: AccumulationInput): AccumulationResult {
  const { currentAge, planEndAge, currentPortfolio, annualSavings, savingsGrowth, nominalReturn, inflation, targetAtAge } = input;
  const finite = [currentAge, planEndAge, currentPortfolio, annualSavings, savingsGrowth, nominalReturn, inflation].every(Number.isFinite);
  if (!finite) throw new RangeError('All accumulation inputs must be finite numbers.');
  if (!Number.isInteger(currentAge) || !Number.isInteger(planEndAge) || planEndAge <= currentAge) {
    throw new RangeError('Plan end age must be a whole age above the current age.');
  }
  if (currentPortfolio < 0 || annualSavings < 0) throw new RangeError('Portfolio and savings cannot be negative.');
  if (inflation <= -1 || nominalReturn <= -1 || savingsGrowth <= -1) throw new RangeError('Rates must be above -100%.');

  const growth = realReturn(nominalReturn, inflation);
  const path: AccumulationYear[] = [];
  let portfolio = currentPortfolio;

  for (let age = currentAge; age < planEndAge; age += 1) {
    const years = age - currentAge;
    const contribution = annualSavings * (1 + savingsGrowth) ** years;
    const target = targetAtAge(age);
    path.push({ age, portfolio, target, contribution });
    if (portfolio >= target) {
      return { status: years === 0 ? 'already-fi' : 'reaches', retireAge: age, realReturn: growth, path };
    }
    portfolio = portfolio * (1 + growth) + contribution;
  }

  return { status: 'not-reached', retireAge: null, realReturn: growth, path };
}

// Projected balance (today's money) at a given age, using the same timing as estimateRetirementAge.
export function projectPortfolioAtAge(input: Omit<AccumulationInput, 'targetAtAge' | 'planEndAge'>, age: number): number {
  const growth = realReturn(input.nominalReturn, input.inflation);
  let portfolio = input.currentPortfolio;
  for (let year = 0; year < age - input.currentAge; year += 1) {
    portfolio = portfolio * (1 + growth) + input.annualSavings * (1 + input.savingsGrowth) ** year;
  }
  return portfolio;
}
