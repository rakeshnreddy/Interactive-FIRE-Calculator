export type WithdrawalTiming = 'start' | 'end';

export type RatePeriod = {
  duration: number;
  r: number;
  i: number;
};

export type OneOffEvent = {
  year: number;
  amount: number;
  label?: string;
};

export type PlanInput = {
  annualExpense: number;
  initialPortfolio: number;
  withdrawalTiming: WithdrawalTiming;
  desiredFinalValue: number;
  ratePeriods: RatePeriod[];
  oneOffEvents: OneOffEvent[];
};

export type YearResult = {
  year: number;
  startingBalance: number;
  withdrawal: number;
  oneOffAmount: number;
  returnRate: number;
  inflationRate: number;
  endingBalance: number;
};

export type SimulationResult = {
  rows: YearResult[];
  years: number[];
  balances: number[];
  withdrawals: number[];
  finalBalance: number;
};

export type FirePlanResult = {
  requiredPortfolio: number;
  maxAnnualExpense: number;
  expenseMode: SimulationResult;
  portfolioMode: SimulationResult;
};

const DEFAULT_TOLERANCE = 0.01;
const MAX_GUESS_LIMIT = 1_000_000_000;
const MAX_SOLVER_ITERATIONS = 200;

export function totalDuration(ratePeriods: RatePeriod[]): number {
  return ratePeriods.reduce((sum, period) => sum + Math.max(0, Math.trunc(period.duration)), 0);
}

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number.`);
  }
}

function normalizePeriods(ratePeriods: RatePeriod[]): RatePeriod[] {
  const periods = ratePeriods
    .map((period) => ({
      duration: Math.trunc(period.duration),
      r: Number(period.r),
      i: Number(period.i)
    }))
    .filter((period) => period.duration > 0);

  if (periods.length === 0) {
    throw new Error('At least one positive-duration rate period is required.');
  }

  periods.forEach((period, index) => {
    if (!Number.isFinite(period.r) || !Number.isFinite(period.i)) {
      throw new Error(`Rate period ${index + 1} has invalid return or inflation.`);
    }
  });

  return periods;
}

function rateForYear(ratePeriods: RatePeriod[], year: number): RatePeriod {
  let elapsed = 0;
  for (const period of ratePeriods) {
    elapsed += period.duration;
    if (year <= elapsed) {
      return period;
    }
  }
  return ratePeriods[ratePeriods.length - 1];
}

function oneOffTotalForYear(oneOffEvents: OneOffEvent[], year: number): number {
  return oneOffEvents
    .filter((event) => Math.trunc(event.year) === year)
    .reduce((sum, event) => sum + Number(event.amount || 0), 0);
}

export function annualSimulation(
  initialPortfolio: number,
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriodsInput: RatePeriod[],
  oneOffEvents: OneOffEvent[] = []
): SimulationResult {
  assertFiniteNonNegative(initialPortfolio, 'Initial portfolio');
  assertFiniteNonNegative(annualExpense, 'Annual expense');

  const ratePeriods = normalizePeriods(ratePeriodsInput);
  const duration = totalDuration(ratePeriods);
  const years = Array.from({ length: duration + 1 }, (_, index) => index);
  const rows: YearResult[] = [];
  const balances = [initialPortfolio];
  const withdrawals: number[] = [];

  let balance = initialPortfolio;
  let withdrawal = annualExpense;

  for (let year = 1; year <= duration; year += 1) {
    const { r, i } = rateForYear(ratePeriods, year);
    const startingBalance = balance;
    const oneOffAmount = oneOffTotalForYear(oneOffEvents, year);

    if (withdrawalTiming === 'start') {
      balance = (balance - withdrawal + oneOffAmount) * (1 + r);
    } else {
      balance = (balance + oneOffAmount) * (1 + r) - withdrawal;
    }

    rows.push({
      year,
      startingBalance,
      withdrawal,
      oneOffAmount,
      returnRate: r,
      inflationRate: i,
      endingBalance: balance
    });

    withdrawals.push(withdrawal);
    balances.push(balance);
    withdrawal *= 1 + i;
  }

  return {
    rows,
    years,
    balances,
    withdrawals,
    finalBalance: balances[balances.length - 1]
  };
}

export function simulateFinalBalance(
  initialPortfolio: number,
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  desiredFinalValue = 0,
  oneOffEvents: OneOffEvent[] = []
): number {
  const simulation = annualSimulation(
    initialPortfolio,
    annualExpense,
    withdrawalTiming,
    ratePeriods,
    oneOffEvents
  );
  return simulation.finalBalance - desiredFinalValue;
}

export function findRequiredPortfolio(
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  desiredFinalValue = 0,
  oneOffEvents: OneOffEvent[] = [],
  tolerance = DEFAULT_TOLERANCE
): number {
  assertFiniteNonNegative(annualExpense, 'Annual expense');
  assertFiniteNonNegative(desiredFinalValue, 'Desired final value');

  normalizePeriods(ratePeriods);

  let low = 0;
  let high = Math.max(annualExpense * totalDuration(ratePeriods) * 2 + desiredFinalValue, 1);

  while (
    simulateFinalBalance(high, annualExpense, withdrawalTiming, ratePeriods, desiredFinalValue, oneOffEvents) < 0
  ) {
    high *= 2;
    if (high > MAX_GUESS_LIMIT) {
      return Number.POSITIVE_INFINITY;
    }
  }

  for (let iteration = 0; iteration < MAX_SOLVER_ITERATIONS && high - low > tolerance; iteration += 1) {
    const mid = (low + high) / 2;
    const balance = simulateFinalBalance(
      mid,
      annualExpense,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents
    );

    if (balance >= 0) {
      high = mid;
    } else {
      low = mid;
    }
  }

  return high;
}

export function findMaxAnnualExpense(
  initialPortfolio: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  desiredFinalValue = 0,
  oneOffEvents: OneOffEvent[] = [],
  tolerance = DEFAULT_TOLERANCE
): number {
  assertFiniteNonNegative(initialPortfolio, 'Initial portfolio');
  assertFiniteNonNegative(desiredFinalValue, 'Desired final value');
  normalizePeriods(ratePeriods);

  if (
    simulateFinalBalance(
      initialPortfolio,
      0,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents
    ) < 0
  ) {
    return 0;
  }

  let low = 0;
  let high = Math.max(initialPortfolio / Math.max(totalDuration(ratePeriods), 1), 1);

  while (
    simulateFinalBalance(
      initialPortfolio,
      high,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents
    ) >= 0
  ) {
    high *= 2;
    if (high > MAX_GUESS_LIMIT) {
      break;
    }
  }

  for (let iteration = 0; iteration < MAX_SOLVER_ITERATIONS && high - low > tolerance; iteration += 1) {
    const mid = (low + high) / 2;
    const balance = simulateFinalBalance(
      initialPortfolio,
      mid,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents
    );

    if (balance >= 0) {
      low = mid;
    } else {
      high = mid;
    }
  }

  return low;
}

export function calculateFirePlan(input: PlanInput): FirePlanResult {
  const ratePeriods = normalizePeriods(input.ratePeriods);
  const requiredPortfolio = findRequiredPortfolio(
    input.annualExpense,
    input.withdrawalTiming,
    ratePeriods,
    input.desiredFinalValue,
    input.oneOffEvents
  );
  const maxAnnualExpense = findMaxAnnualExpense(
    input.initialPortfolio,
    input.withdrawalTiming,
    ratePeriods,
    input.desiredFinalValue,
    input.oneOffEvents
  );

  return {
    requiredPortfolio,
    maxAnnualExpense,
    expenseMode: annualSimulation(
      Number.isFinite(requiredPortfolio) ? requiredPortfolio : 0,
      input.annualExpense,
      input.withdrawalTiming,
      ratePeriods,
      input.oneOffEvents
    ),
    portfolioMode: annualSimulation(
      input.initialPortfolio,
      maxAnnualExpense,
      input.withdrawalTiming,
      ratePeriods,
      input.oneOffEvents
    )
  };
}

export function formatMoney(value: number, options: Intl.NumberFormatOptions = {}): string {
  if (!Number.isFinite(value)) {
    return 'Not feasible';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
    ...options
  }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    maximumFractionDigits: 1
  }).format(value);
}
