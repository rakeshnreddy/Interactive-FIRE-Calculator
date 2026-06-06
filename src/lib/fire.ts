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

export type RecurringCashFlowKind = 'income' | 'expense';

export type RecurringCashFlow = {
  kind: RecurringCashFlowKind;
  startYear: number;
  endYear: number;
  amount: number;
  label?: string;
  inflationAdjusted?: boolean;
};

export type PlanInput = {
  annualExpense: number;
  initialPortfolio: number;
  withdrawalTiming: WithdrawalTiming;
  desiredFinalValue: number;
  ratePeriods: RatePeriod[];
  oneOffEvents: OneOffEvent[];
  recurringCashFlows?: RecurringCashFlow[];
};

export type YearResult = {
  year: number;
  startingBalance: number;
  withdrawal: number;
  baseWithdrawal: number;
  recurringIncome: number;
  recurringExpense: number;
  oneOffAmount: number;
  returnRate: number;
  inflationRate: number;
  endingBalance: number;
};

export type PlanWarningSeverity = 'info' | 'warning' | 'error';

export type PlanWarningCode =
  | 'balance_depleted'
  | 'negative_balance'
  | 'high_return_assumption'
  | 'low_return_assumption'
  | 'high_inflation_assumption'
  | 'low_inflation_assumption'
  | 'invalid_one_off_year'
  | 'one_off_year_out_of_range'
  | 'invalid_one_off_amount'
  | 'invalid_recurring_cash_flow'
  | 'recurring_cash_flow_out_of_range'
  | 'empty_rate_periods'
  | 'invalid_rate_period'
  | 'invalid_money_value'
  | 'unsupported_withdrawal_timing'
  | 'required_portfolio_not_feasible';

export type PlanWarningMode = 'expense' | 'portfolio';

export type PlanWarning = {
  code: PlanWarningCode;
  severity: PlanWarningSeverity;
  message: string;
  path?: string;
  index?: number;
  year?: number;
  value?: number | string;
  mode?: PlanWarningMode;
};

export type SimulationResult = {
  rows: YearResult[];
  years: number[];
  balances: number[];
  withdrawals: number[];
  finalBalance: number;
  warnings: PlanWarning[];
};

export type FirePlanResult = {
  requiredPortfolio: number;
  maxAnnualExpense: number;
  expenseMode: SimulationResult;
  portfolioMode: SimulationResult;
  warnings: PlanWarning[];
};

const DEFAULT_TOLERANCE = 0.01;
const MAX_GUESS_LIMIT = 1_000_000_000;
const MAX_SOLVER_ITERATIONS = 200;
const HIGH_RETURN_THRESHOLD = 0.12;
const LOW_RETURN_THRESHOLD = -0.05;
const HIGH_INFLATION_THRESHOLD = 0.06;
const LOW_INFLATION_THRESHOLD = 0;

type NormalizedPlanInput = {
  annualExpense: number;
  initialPortfolio: number;
  withdrawalTiming: WithdrawalTiming;
  desiredFinalValue: number;
  ratePeriods: RatePeriod[];
  oneOffEvents: OneOffEvent[];
  recurringCashFlows: RecurringCashFlow[];
  warnings: PlanWarning[];
};

export function totalDuration(ratePeriods: RatePeriod[]): number {
  return ratePeriods.reduce((sum, period) => {
    const duration = Number(period.duration);
    return sum + (Number.isFinite(duration) ? Math.max(0, Math.trunc(duration)) : 0);
  }, 0);
}

function assertFiniteNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a finite non-negative number.`);
  }
}

function warningKey(warning: PlanWarning): string {
  return [
    warning.code,
    warning.severity,
    warning.path ?? '',
    warning.index ?? '',
    warning.year ?? '',
    warning.mode ?? '',
    warning.value ?? '',
    warning.message
  ].join('|');
}

function dedupeWarnings(warnings: PlanWarning[]): PlanWarning[] {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = warningKey(warning);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function percentLabel(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function normalizeWithdrawalTiming(value: unknown, warnings: PlanWarning[]): WithdrawalTiming {
  if (value === 'start' || value === 'end') {
    return value;
  }

  warnings.push({
    code: 'unsupported_withdrawal_timing',
    severity: 'error',
    path: 'withdrawalTiming',
    value: String(value),
    message: 'Unsupported withdrawal timing; using end-of-year withdrawals.'
  });

  return 'end';
}

function addRateAssumptionWarnings(
  period: RatePeriod,
  index: number,
  warnings: PlanWarning[]
): void {
  if (period.r > HIGH_RETURN_THRESHOLD) {
    warnings.push({
      code: 'high_return_assumption',
      severity: 'warning',
      path: `ratePeriods.${index}.r`,
      index,
      value: period.r,
      message: `Return assumption of ${percentLabel(period.r)} is high for period ${index + 1}.`
    });
  }

  if (period.r < LOW_RETURN_THRESHOLD) {
    warnings.push({
      code: 'low_return_assumption',
      severity: 'warning',
      path: `ratePeriods.${index}.r`,
      index,
      value: period.r,
      message: `Return assumption of ${percentLabel(period.r)} is low for period ${index + 1}.`
    });
  }

  if (period.i > HIGH_INFLATION_THRESHOLD) {
    warnings.push({
      code: 'high_inflation_assumption',
      severity: 'warning',
      path: `ratePeriods.${index}.i`,
      index,
      value: period.i,
      message: `Inflation assumption of ${percentLabel(period.i)} is high for period ${index + 1}.`
    });
  }

  if (period.i < LOW_INFLATION_THRESHOLD) {
    warnings.push({
      code: 'low_inflation_assumption',
      severity: 'warning',
      path: `ratePeriods.${index}.i`,
      index,
      value: period.i,
      message: `Inflation assumption of ${percentLabel(period.i)} is low for period ${index + 1}.`
    });
  }
}

function normalizePlanMoney(value: unknown, field: string, path: string, warnings: PlanWarning[]): number {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue < 0) {
    warnings.push({
      code: 'invalid_money_value',
      severity: 'error',
      path,
      value: Number.isFinite(numericValue) ? numericValue : String(value),
      message: `${field} must be a finite non-negative number; using 0.`
    });
    return 0;
  }

  return numericValue;
}

function normalizePlanRatePeriods(ratePeriodsInput: unknown, warnings: PlanWarning[]): RatePeriod[] {
  if (!Array.isArray(ratePeriodsInput) || ratePeriodsInput.length === 0) {
    warnings.push({
      code: 'empty_rate_periods',
      severity: 'error',
      path: 'ratePeriods',
      message: 'At least one positive-duration rate period is required.'
    });
    return [];
  }

  const periods: RatePeriod[] = [];

  ratePeriodsInput.forEach((periodInput, index) => {
    const period = periodInput as Partial<RatePeriod> | undefined;
    const durationValue = Number(period?.duration);
    const duration = Number.isFinite(durationValue) ? Math.trunc(durationValue) : Number.NaN;
    const r = Number(period?.r);
    const i = Number(period?.i);
    const hasInvalidField =
      !Number.isFinite(durationValue) ||
      duration <= 0 ||
      !Number.isFinite(r) ||
      !Number.isFinite(i);

    if (hasInvalidField) {
      warnings.push({
        code: 'invalid_rate_period',
        severity: 'error',
        path: `ratePeriods.${index}`,
        index,
        message: `Rate period ${index + 1} must have a positive whole-year duration and finite return and inflation assumptions.`
      });
      return;
    }

    if (duration !== durationValue) {
      warnings.push({
        code: 'invalid_rate_period',
        severity: 'warning',
        path: `ratePeriods.${index}.duration`,
        index,
        value: durationValue,
        message: `Rate period ${index + 1} duration should be a whole number of years; using ${duration}.`
      });
    }

    const normalizedPeriod = { duration, r, i };
    periods.push(normalizedPeriod);
    addRateAssumptionWarnings(normalizedPeriod, index, warnings);
  });

  if (periods.length === 0) {
    warnings.push({
      code: 'empty_rate_periods',
      severity: 'error',
      path: 'ratePeriods',
      message: 'No valid positive-duration rate periods remain after validation.'
    });
  }

  return periods;
}

function normalizeOneOffEvents(
  oneOffEventsInput: unknown,
  duration: number,
  warnings: PlanWarning[]
): OneOffEvent[] {
  if (!Array.isArray(oneOffEventsInput)) {
    return [];
  }

  const events: OneOffEvent[] = [];

  oneOffEventsInput.forEach((eventInput, index) => {
    const event = eventInput as Partial<OneOffEvent> | undefined;
    const yearValue = Number(event?.year);

    if (!Number.isFinite(yearValue)) {
      warnings.push({
        code: 'invalid_one_off_year',
        severity: 'error',
        path: `oneOffEvents.${index}.year`,
        index,
        value: String(event?.year),
        message: `One-off event ${index + 1} has an invalid year and will be ignored.`
      });
      return;
    }

    const year = Math.trunc(yearValue);

    if (year !== yearValue) {
      warnings.push({
        code: 'invalid_one_off_year',
        severity: 'warning',
        path: `oneOffEvents.${index}.year`,
        index,
        value: yearValue,
        message: `One-off event ${index + 1} year should be a whole number; using year ${year}.`
      });
    }

    if (year < 1 || year > duration) {
      warnings.push({
        code: 'one_off_year_out_of_range',
        severity: 'warning',
        path: `oneOffEvents.${index}.year`,
        index,
        year,
        value: yearValue,
        message: `One-off event ${index + 1} is outside the ${duration}-year plan and will be ignored.`
      });
      return;
    }

    const amount = Number(event?.amount);

    if (!Number.isFinite(amount)) {
      warnings.push({
        code: 'invalid_one_off_amount',
        severity: 'error',
        path: `oneOffEvents.${index}.amount`,
        index,
        value: String(event?.amount),
        message: `One-off event ${index + 1} has an invalid amount and will be ignored.`
      });
      return;
    }

    events.push({
      year,
      amount,
      label: event?.label
    });
  });

  return events;
}

function normalizeRecurringCashFlows(
  recurringCashFlowsInput: unknown,
  duration: number,
  warnings: PlanWarning[]
): RecurringCashFlow[] {
  if (!Array.isArray(recurringCashFlowsInput)) {
    return [];
  }

  const cashFlows: RecurringCashFlow[] = [];

  recurringCashFlowsInput.forEach((flowInput, index) => {
    const flow = flowInput as Partial<RecurringCashFlow> | undefined;
    const kind = flow?.kind;
    const startYearValue = Number(flow?.startYear);
    const endYearValue = Number(flow?.endYear);
    const amount = Number(flow?.amount);
    const path = `recurringCashFlows.${index}`;

    if (kind !== 'income' && kind !== 'expense') {
      warnings.push({
        code: 'invalid_recurring_cash_flow',
        severity: 'error',
        path: `${path}.kind`,
        index,
        value: String(kind),
        message: `Recurring cash flow ${index + 1} must be income or expense and will be ignored.`
      });
      return;
    }

    if (
      !Number.isFinite(startYearValue) ||
      !Number.isFinite(endYearValue) ||
      !Number.isFinite(amount) ||
      amount < 0
    ) {
      warnings.push({
        code: 'invalid_recurring_cash_flow',
        severity: 'error',
        path,
        index,
        message: `Recurring ${kind} ${index + 1} needs finite start/end years and a non-negative annual amount.`
      });
      return;
    }

    const startYear = Math.trunc(startYearValue);
    const endYear = Math.trunc(endYearValue);

    if (startYear !== startYearValue || endYear !== endYearValue) {
      warnings.push({
        code: 'invalid_recurring_cash_flow',
        severity: 'warning',
        path,
        index,
        value: `${startYearValue}-${endYearValue}`,
        message: `Recurring ${kind} ${index + 1} years should be whole numbers; using years ${startYear}-${endYear}.`
      });
    }

    if (startYear < 1 || endYear < startYear || startYear > duration) {
      warnings.push({
        code: 'recurring_cash_flow_out_of_range',
        severity: 'warning',
        path,
        index,
        value: `${startYear}-${endYear}`,
        message: `Recurring ${kind} ${index + 1} is outside the ${duration}-year plan and will be ignored.`
      });
      return;
    }

    cashFlows.push({
      kind,
      startYear,
      endYear: Math.min(endYear, duration),
      amount,
      label: flow?.label,
      inflationAdjusted: flow?.inflationAdjusted !== false
    });
  });

  return cashFlows;
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
    .filter((event) => event.year === year)
    .reduce((sum, event) => sum + event.amount, 0);
}

function inflationMultiplierForYear(ratePeriods: RatePeriod[], year: number): number {
  let multiplier = 1;

  for (let currentYear = 1; currentYear < year; currentYear += 1) {
    multiplier *= 1 + rateForYear(ratePeriods, currentYear).i;
  }

  return multiplier;
}

function recurringCashFlowTotalsForYear(
  recurringCashFlows: RecurringCashFlow[],
  ratePeriods: RatePeriod[],
  year: number
): { income: number; expense: number } {
  const multiplier = inflationMultiplierForYear(ratePeriods, year);

  return recurringCashFlows.reduce(
    (totals, flow) => {
      if (year < flow.startYear || year > flow.endYear) {
        return totals;
      }

      const amount = flow.amount * (flow.inflationAdjusted === false ? 1 : multiplier);

      if (flow.kind === 'income') {
        totals.income += amount;
      } else {
        totals.expense += amount;
      }

      return totals;
    },
    { income: 0, expense: 0 }
  );
}

function normalizePlanInput(input: PlanInput): NormalizedPlanInput {
  const warnings: PlanWarning[] = [];
  const ratePeriods = normalizePlanRatePeriods(input.ratePeriods, warnings);
  const duration = totalDuration(ratePeriods);

  return {
    annualExpense: normalizePlanMoney(input.annualExpense, 'Annual expense', 'annualExpense', warnings),
    initialPortfolio: normalizePlanMoney(
      input.initialPortfolio,
      'Initial portfolio',
      'initialPortfolio',
      warnings
    ),
    withdrawalTiming: normalizeWithdrawalTiming(input.withdrawalTiming, warnings),
    desiredFinalValue: normalizePlanMoney(
      input.desiredFinalValue,
      'Desired final value',
      'desiredFinalValue',
      warnings
    ),
    ratePeriods,
    oneOffEvents: normalizeOneOffEvents(input.oneOffEvents, duration, warnings),
    recurringCashFlows: normalizeRecurringCashFlows(input.recurringCashFlows, duration, warnings),
    warnings: dedupeWarnings(warnings)
  };
}

function createEmptySimulation(initialPortfolio: number, warnings: PlanWarning[]): SimulationResult {
  return {
    rows: [],
    years: [0],
    balances: [initialPortfolio],
    withdrawals: [],
    finalBalance: initialPortfolio,
    warnings: dedupeWarnings(warnings)
  };
}

function runAnnualSimulation(
  initialPortfolio: number,
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  oneOffEvents: OneOffEvent[],
  recurringCashFlows: RecurringCashFlow[] = [],
  baseWarnings: PlanWarning[] = [],
  mode?: PlanWarningMode
): SimulationResult {
  const duration = totalDuration(ratePeriods);
  const years = Array.from({ length: duration + 1 }, (_, index) => index);
  const rows: YearResult[] = [];
  const balances = [initialPortfolio];
  const withdrawals: number[] = [];
  const warnings = [...baseWarnings];

  let balance = initialPortfolio;
  let withdrawal = annualExpense;
  let hasDepletionWarning = false;
  let hasNegativeWarning = false;

  for (let year = 1; year <= duration; year += 1) {
    const { r, i } = rateForYear(ratePeriods, year);
    const startingBalance = balance;
    const oneOffAmount = oneOffTotalForYear(oneOffEvents, year);
    const { income: recurringIncome, expense: recurringExpense } = recurringCashFlowTotalsForYear(
      recurringCashFlows,
      ratePeriods,
      year
    );
    const baseWithdrawal = withdrawal;
    const netWithdrawal = baseWithdrawal + recurringExpense - recurringIncome;

    if (withdrawalTiming === 'start') {
      balance = (balance - netWithdrawal + oneOffAmount) * (1 + r);
    } else {
      balance = (balance + oneOffAmount) * (1 + r) - netWithdrawal;
    }

    rows.push({
      year,
      startingBalance,
      withdrawal: netWithdrawal,
      baseWithdrawal,
      recurringIncome,
      recurringExpense,
      oneOffAmount,
      returnRate: r,
      inflationRate: i,
      endingBalance: balance
    });

    if (balance <= 0 && !hasDepletionWarning) {
      warnings.push({
        code: 'balance_depleted',
        severity: 'warning',
        year,
        value: balance,
        mode,
        message: `Portfolio balance is depleted by year ${year}.`
      });
      hasDepletionWarning = true;
    }

    if (balance < 0 && !hasNegativeWarning) {
      warnings.push({
        code: 'negative_balance',
        severity: 'error',
        year,
        value: balance,
        mode,
        message: `Portfolio balance is negative by year ${year}.`
      });
      hasNegativeWarning = true;
    }

    withdrawals.push(netWithdrawal);
    balances.push(balance);
    withdrawal *= 1 + i;
  }

  return {
    rows,
    years,
    balances,
    withdrawals,
    finalBalance: balances[balances.length - 1],
    warnings: dedupeWarnings(warnings)
  };
}

export function validatePlanInput(input: PlanInput): PlanWarning[] {
  return normalizePlanInput(input).warnings;
}

export function annualSimulation(
  initialPortfolio: number,
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriodsInput: RatePeriod[],
  oneOffEvents: OneOffEvent[] = [],
  recurringCashFlows: RecurringCashFlow[] = []
): SimulationResult {
  assertFiniteNonNegative(initialPortfolio, 'Initial portfolio');
  assertFiniteNonNegative(annualExpense, 'Annual expense');

  const warnings: PlanWarning[] = [];
  const normalizedWithdrawalTiming = normalizeWithdrawalTiming(withdrawalTiming, warnings);
  const ratePeriods = normalizePeriods(ratePeriodsInput);
  const duration = totalDuration(ratePeriods);
  const normalizedOneOffEvents = normalizeOneOffEvents(oneOffEvents, duration, warnings);
  const normalizedRecurringCashFlows = normalizeRecurringCashFlows(
    recurringCashFlows,
    duration,
    warnings
  );

  ratePeriods.forEach((period, index) => addRateAssumptionWarnings(period, index, warnings));

  return runAnnualSimulation(
    initialPortfolio,
    annualExpense,
    normalizedWithdrawalTiming,
    ratePeriods,
    normalizedOneOffEvents,
    normalizedRecurringCashFlows,
    warnings
  );
}

export function simulateFinalBalance(
  initialPortfolio: number,
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  desiredFinalValue = 0,
  oneOffEvents: OneOffEvent[] = [],
  recurringCashFlows: RecurringCashFlow[] = []
): number {
  const simulation = annualSimulation(
    initialPortfolio,
    annualExpense,
    withdrawalTiming,
    ratePeriods,
    oneOffEvents,
    recurringCashFlows
  );
  return simulation.finalBalance - desiredFinalValue;
}

export function findRequiredPortfolio(
  annualExpense: number,
  withdrawalTiming: WithdrawalTiming,
  ratePeriods: RatePeriod[],
  desiredFinalValue = 0,
  oneOffEvents: OneOffEvent[] = [],
  recurringCashFlowsOrTolerance: RecurringCashFlow[] | number = [],
  tolerance = DEFAULT_TOLERANCE
): number {
  assertFiniteNonNegative(annualExpense, 'Annual expense');
  assertFiniteNonNegative(desiredFinalValue, 'Desired final value');

  normalizePeriods(ratePeriods);
  const recurringCashFlows = Array.isArray(recurringCashFlowsOrTolerance)
    ? recurringCashFlowsOrTolerance
    : [];
  const solverTolerance =
    typeof recurringCashFlowsOrTolerance === 'number' ? recurringCashFlowsOrTolerance : tolerance;

  let low = 0;
  let high = Math.max(annualExpense * totalDuration(ratePeriods) * 2 + desiredFinalValue, 1);

  while (
    simulateFinalBalance(
      high,
      annualExpense,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents,
      recurringCashFlows
    ) < 0
  ) {
    high *= 2;
    if (high > MAX_GUESS_LIMIT) {
      return Number.POSITIVE_INFINITY;
    }
  }

  for (
    let iteration = 0;
    iteration < MAX_SOLVER_ITERATIONS && high - low > solverTolerance;
    iteration += 1
  ) {
    const mid = (low + high) / 2;
    const balance = simulateFinalBalance(
      mid,
      annualExpense,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents,
      recurringCashFlows
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
  recurringCashFlowsOrTolerance: RecurringCashFlow[] | number = [],
  tolerance = DEFAULT_TOLERANCE
): number {
  assertFiniteNonNegative(initialPortfolio, 'Initial portfolio');
  assertFiniteNonNegative(desiredFinalValue, 'Desired final value');
  normalizePeriods(ratePeriods);
  const recurringCashFlows = Array.isArray(recurringCashFlowsOrTolerance)
    ? recurringCashFlowsOrTolerance
    : [];
  const solverTolerance =
    typeof recurringCashFlowsOrTolerance === 'number' ? recurringCashFlowsOrTolerance : tolerance;

  if (
    simulateFinalBalance(
      initialPortfolio,
      0,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents,
      recurringCashFlows
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
      oneOffEvents,
      recurringCashFlows
    ) >= 0
  ) {
    high *= 2;
    if (high > MAX_GUESS_LIMIT) {
      break;
    }
  }

  for (
    let iteration = 0;
    iteration < MAX_SOLVER_ITERATIONS && high - low > solverTolerance;
    iteration += 1
  ) {
    const mid = (low + high) / 2;
    const balance = simulateFinalBalance(
      initialPortfolio,
      mid,
      withdrawalTiming,
      ratePeriods,
      desiredFinalValue,
      oneOffEvents,
      recurringCashFlows
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
  const normalized = normalizePlanInput(input);
  const { ratePeriods } = normalized;
  const warnings = [...normalized.warnings];

  if (ratePeriods.length === 0) {
    const resultWarnings = dedupeWarnings(warnings);
    return {
      requiredPortfolio: Number.POSITIVE_INFINITY,
      maxAnnualExpense: 0,
      expenseMode: createEmptySimulation(0, resultWarnings),
      portfolioMode: createEmptySimulation(normalized.initialPortfolio, resultWarnings),
      warnings: resultWarnings
    };
  }

  const requiredPortfolio = findRequiredPortfolio(
    normalized.annualExpense,
    normalized.withdrawalTiming,
    ratePeriods,
    normalized.desiredFinalValue,
    normalized.oneOffEvents,
    normalized.recurringCashFlows
  );
  const maxAnnualExpense = findMaxAnnualExpense(
    normalized.initialPortfolio,
    normalized.withdrawalTiming,
    ratePeriods,
    normalized.desiredFinalValue,
    normalized.oneOffEvents,
    normalized.recurringCashFlows
  );
  const startingPortfolioForExpenseMode = Number.isFinite(requiredPortfolio) ? requiredPortfolio : 0;

  if (!Number.isFinite(requiredPortfolio)) {
    warnings.push({
      code: 'required_portfolio_not_feasible',
      severity: 'error',
      path: 'annualExpense',
      value: normalized.annualExpense,
      message: 'A feasible required portfolio was not found within the solver limit.'
    });
  }

  const expenseMode = runAnnualSimulation(
    startingPortfolioForExpenseMode,
    normalized.annualExpense,
    normalized.withdrawalTiming,
    ratePeriods,
    normalized.oneOffEvents,
    normalized.recurringCashFlows,
    warnings,
    'expense'
  );
  const portfolioMode = runAnnualSimulation(
    normalized.initialPortfolio,
    maxAnnualExpense,
    normalized.withdrawalTiming,
    ratePeriods,
    normalized.oneOffEvents,
    normalized.recurringCashFlows,
    warnings,
    'portfolio'
  );

  return {
    requiredPortfolio,
    maxAnnualExpense,
    expenseMode,
    portfolioMode,
    warnings: dedupeWarnings([...warnings, ...expenseMode.warnings, ...portfolioMode.warnings])
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
