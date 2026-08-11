export const compoundInterestFormulaVersion = 'finpath-compound-v2';

export const contributionFrequencies = [52, 26, 24, 12, 4, 2, 1] as const;
export const compoundingFrequencies = [365, 12, 4, 2, 1] as const;

export type ContributionFrequency = typeof contributionFrequencies[number];
export type CompoundingFrequency = typeof compoundingFrequencies[number];
export type ContributionTiming = 'beginning' | 'end';
export type RateBasis = 'nominal' | 'apy';
export type TargetBasis = 'future' | 'today';

export type CompoundInterestInputs = {
  annualContributionIncreasePercent: number;
  annualFeePercent: number;
  annualRatePercent: number;
  annualTopUp: number;
  compoundingFrequency: CompoundingFrequency;
  contributionFrequency: ContributionFrequency;
  contributionTiming: ContributionTiming;
  futureDepositAmount: number;
  futureDepositYear: number;
  futureWithdrawalAmount: number;
  futureWithdrawalYear: number;
  inflationPercent: number;
  principal: number;
  rateBasis: RateBasis;
  recurringContribution: number;
  targetAmount: number;
  targetBasis: TargetBasis;
  years: number;
};

export type CompoundInterestValidation = {
  errors: Partial<Record<keyof CompoundInterestInputs | 'result', string>>;
  isValid: boolean;
  warnings: string[];
};

export type CompoundInterestScheduleRow = {
  closingBalance: number;
  cumulativeContributions: number;
  deposits: number;
  fees: number;
  grossReturn: number;
  label: string;
  netGrowth: number;
  openingBalance: number;
  realClosingBalance: number;
  time: number;
  withdrawals: number;
};

export type CompoundInterestMilestone = {
  label: string;
  time: number;
  value: number;
};

export type CompoundInterestProjection = {
  annualSchedule: CompoundInterestScheduleRow[];
  detailedSchedule: CompoundInterestScheduleRow[];
  effectiveAnnualRate: number;
  endingValue: number;
  feeDrag: number;
  feesPaid: number;
  grossReturn: number;
  investedCapital: number;
  milestones: CompoundInterestMilestone[];
  netContributions: number;
  netGrowth: number;
  realAnnualReturn: number;
  realEndingValue: number;
  targetDifference: number | null;
  targetReachedAt: number | null;
  totalDeposits: number;
  unfundedWithdrawals: number;
  validation: CompoundInterestValidation;
  withdrawals: number;
};

type CashEvent = {
  deposit: number;
  note: string[];
  withdrawal: number;
};

type CoreProjection = Omit<
  CompoundInterestProjection,
  'feeDrag' | 'milestones' | 'targetDifference' | 'targetReachedAt' | 'validation'
>;

const epsilon = 1e-9;
const maximumAmount = 1e15;
const maximumTarget = 1e18;

export const defaultCompoundInterestInputs: CompoundInterestInputs = {
  annualContributionIncreasePercent: 0,
  annualFeePercent: 0,
  annualRatePercent: 8,
  annualTopUp: 0,
  compoundingFrequency: 12,
  contributionFrequency: 12,
  contributionTiming: 'end',
  futureDepositAmount: 0,
  futureDepositYear: 5,
  futureWithdrawalAmount: 0,
  futureWithdrawalYear: 5,
  inflationPercent: 0,
  principal: 10_000,
  rateBasis: 'nominal',
  recurringContribution: 500,
  targetAmount: 0,
  targetBasis: 'future',
  years: 10
};

export function validateCompoundInterestInputs(
  inputs: CompoundInterestInputs
): CompoundInterestValidation {
  const errors: CompoundInterestValidation['errors'] = {};
  const warnings: string[] = [];

  const requireFinite = (key: keyof CompoundInterestInputs, label: string) => {
    if (typeof inputs[key] === 'number' && !Number.isFinite(inputs[key])) {
      errors[key] = `${label} must be a finite number.`;
    }
  };

  ([
    ['principal', 'Starting amount'],
    ['recurringContribution', 'Recurring contribution'],
    ['years', 'Term'],
    ['annualRatePercent', 'Annual rate'],
    ['annualTopUp', 'Annual top-up'],
    ['annualContributionIncreasePercent', 'Contribution increase'],
    ['annualFeePercent', 'Annual fee'],
    ['inflationPercent', 'Inflation'],
    ['targetAmount', 'Target'],
    ['futureDepositAmount', 'Future deposit'],
    ['futureDepositYear', 'Future deposit time'],
    ['futureWithdrawalAmount', 'Future withdrawal'],
    ['futureWithdrawalYear', 'Future withdrawal time']
  ] as const).forEach(([key, label]) => requireFinite(key, label));

  const nonNegativeAmount = (
    key: 'principal' | 'recurringContribution' | 'annualTopUp' | 'futureDepositAmount' | 'futureWithdrawalAmount',
    label: string
  ) => {
    if (!errors[key] && (inputs[key] < 0 || inputs[key] > maximumAmount)) {
      errors[key] = `${label} must be between 0 and ${maximumAmount.toLocaleString('en-US')}.`;
    }
  };

  nonNegativeAmount('principal', 'Starting amount');
  nonNegativeAmount('recurringContribution', 'Recurring contribution');
  nonNegativeAmount('annualTopUp', 'Annual top-up');
  nonNegativeAmount('futureDepositAmount', 'Future deposit');
  nonNegativeAmount('futureWithdrawalAmount', 'Future withdrawal');

  if (!errors.years && (inputs.years <= 0 || inputs.years > 100)) {
    errors.years = 'Term must be greater than 0 and no more than 100 years.';
  }
  if (!errors.annualContributionIncreasePercent && (
    inputs.annualContributionIncreasePercent <= -100 ||
    inputs.annualContributionIncreasePercent > 1_000
  )) {
    errors.annualContributionIncreasePercent = 'Contribution increase must be greater than -100% and no more than 1,000%.';
  }
  if (!errors.annualFeePercent && (inputs.annualFeePercent < 0 || inputs.annualFeePercent >= 100)) {
    errors.annualFeePercent = 'Annual fee must be at least 0% and less than 100%.';
  }
  if (!errors.inflationPercent && (inputs.inflationPercent <= -100 || inputs.inflationPercent > 1_000)) {
    errors.inflationPercent = 'Inflation must be greater than -100% and no more than 1,000%.';
  }
  if (!errors.targetAmount && (inputs.targetAmount < 0 || inputs.targetAmount > maximumTarget)) {
    errors.targetAmount = `Target must be between 0 and ${maximumTarget.toLocaleString('en-US')}.`;
  }

  if (!compoundingFrequencies.includes(inputs.compoundingFrequency)) {
    errors.compoundingFrequency = 'Choose a supported compounding frequency.';
  }
  if (!contributionFrequencies.includes(inputs.contributionFrequency)) {
    errors.contributionFrequency = 'Choose a supported contribution frequency.';
  }
  if (!['beginning', 'end'].includes(inputs.contributionTiming)) {
    errors.contributionTiming = 'Choose beginning or end of each contribution period.';
  }
  if (!['nominal', 'apy'].includes(inputs.rateBasis)) {
    errors.rateBasis = 'Choose nominal annual rate or APY/effective rate.';
  }
  if (!['future', 'today'].includes(inputs.targetBasis)) {
    errors.targetBasis = 'Choose future money or today’s purchasing power.';
  }

  if (!errors.annualRatePercent) {
    const rate = inputs.annualRatePercent / 100;
    const validRate = inputs.rateBasis === 'apy'
      ? 1 + rate > 0
      : 1 + rate / inputs.compoundingFrequency > 0;
    if (!validRate || inputs.annualRatePercent > 10_000) {
      errors.annualRatePercent = inputs.rateBasis === 'apy'
        ? 'APY/effective rate must be greater than -100% and no more than 10,000%.'
        : 'The rate is outside the valid domain for the selected compounding frequency.';
    }
  }

  const eventTime = (
    amountKey: 'futureDepositAmount' | 'futureWithdrawalAmount',
    timeKey: 'futureDepositYear' | 'futureWithdrawalYear',
    label: string
  ) => {
    if (!errors[amountKey] && inputs[amountKey] > 0 && !errors[timeKey] && (
      inputs[timeKey] < 0 ||
      inputs[timeKey] > inputs.years
    )) {
      errors[timeKey] = `${label} time must fall between 0 and the selected term.`;
    }
  };
  eventTime('futureDepositAmount', 'futureDepositYear', 'Future deposit');
  eventTime('futureWithdrawalAmount', 'futureWithdrawalYear', 'Future withdrawal');

  if (inputs.annualRatePercent < 0) warnings.push('A negative return can reduce the balance and produce negative growth.');
  if (inputs.annualRatePercent > 15) warnings.push('Returns above 15% are unusually high for long-range planning.');
  if (inputs.annualFeePercent > 2) warnings.push('Fees above 2% can materially reduce long-term results.');
  if (inputs.years > 50) warnings.push('Very long projections are especially sensitive to small assumption changes.');

  return { errors, isValid: Object.keys(errors).length === 0, warnings };
}

export function calculateCompoundInterest(
  inputs: CompoundInterestInputs
): CompoundInterestProjection {
  const validation = validateCompoundInterestInputs(inputs);
  if (!validation.isValid) return emptyProjection(validation);

  const core = simulateCore(inputs);
  if (!isFiniteCoreProjection(core)) return unsafeProjection(validation);

  const noFee = inputs.annualFeePercent > 0
    ? simulateCore({ ...inputs, annualFeePercent: 0 })
    : core;
  if (!isFiniteCoreProjection(noFee)) return unsafeProjection(validation);
  const targetValue = inputs.targetAmount > 0
    ? inputs.targetBasis === 'today'
      ? inputs.targetAmount * ((1 + inputs.inflationPercent / 100) ** inputs.years)
      : inputs.targetAmount
    : null;
  const targetDifference = targetValue === null ? null : core.endingValue - targetValue;
  const targetReachedAt = inputs.targetAmount <= 0
    ? null
    : firstTargetCrossing(inputs, core);
  const milestones = buildMilestones(inputs, core);
  const warnings = [...validation.warnings];
  if (inputs.inflationPercent > 0 && core.realAnnualReturn <= 0) {
    warnings.push('Inflation is at least as high as the net annual growth assumption, so purchasing power may not grow.');
  }
  if (core.unfundedWithdrawals > 0) {
    warnings.push('A future withdrawal exceeds the available balance; the unfunded portion is shown and the balance does not go below zero.');
  }
  if (targetValue !== null && targetReachedAt === null) {
    warnings.push('The target is not reached at any modeled checkpoint within the 100-year search horizon.');
  } else if (targetValue !== null && targetReachedAt !== null && targetReachedAt > inputs.years) {
    warnings.push('The target first appears at a modeled checkpoint after the selected term, assuming the same inputs continue.');
  }

  const projection: CompoundInterestProjection = {
    ...core,
    feeDrag: noFee.endingValue - core.endingValue,
    milestones,
    targetDifference,
    targetReachedAt,
    validation: { ...validation, warnings }
  };

  return isFiniteProjection(projection) ? projection : unsafeProjection(validation);
}

function simulateCore(inputs: CompoundInterestInputs): CoreProjection {
  const events = buildEvents(inputs);
  const times = buildTimes(inputs, events);
  const grossAnnualFactor = annualGrowthFactor(inputs);
  const annualFeeFactor = 1 - inputs.annualFeePercent / 100;
  const annualInflationFactor = 1 + inputs.inflationPercent / 100;
  const detailedSchedule: CompoundInterestScheduleRow[] = [];
  let balance = inputs.principal;
  let cumulativeContributions = inputs.principal;
  let totalDeposits = 0;
  let withdrawals = 0;
  let unfundedWithdrawals = 0;
  let feesPaid = 0;
  let grossReturn = 0;
  let previousTime = 0;

  for (const time of times) {
    const duration = Math.max(0, time - previousTime);
    const openingBalance = balance;
    const intervalGrossFactor = growthFactorForDuration(inputs, grossAnnualFactor, duration);
    const grossEnd = balance * intervalGrossFactor;
    const intervalReturn = grossEnd - balance;
    const fee = grossEnd * (1 - annualFeeFactor ** duration);
    balance = grossEnd - fee;

    const event = events.get(timeKey(time));
    const deposit = event?.deposit ?? 0;
    const requestedWithdrawal = event?.withdrawal ?? 0;
    const fundedWithdrawal = Math.min(balance + deposit, requestedWithdrawal);
    const unfunded = requestedWithdrawal - fundedWithdrawal;
    balance += deposit - fundedWithdrawal;
    totalDeposits += deposit;
    cumulativeContributions += deposit;
    withdrawals += fundedWithdrawal;
    unfundedWithdrawals += unfunded;
    feesPaid += fee;
    grossReturn += intervalReturn;

    detailedSchedule.push({
      closingBalance: balance,
      cumulativeContributions,
      deposits: deposit,
      fees: fee,
      grossReturn: intervalReturn,
      label: event?.note.length ? event.note.join('; ') : duration === 0 ? 'Starting point' : `Year ${formatYear(time)}`,
      netGrowth: intervalReturn - fee,
      openingBalance,
      realClosingBalance: balance / (annualInflationFactor ** time),
      time,
      withdrawals: fundedWithdrawal
    });
    previousTime = time;
  }

  const endingValue = balance;
  const investedCapital = inputs.principal + totalDeposits;
  const netContributions = investedCapital - withdrawals;
  const effectiveAnnualRate = grossAnnualFactor - 1;
  const realAnnualReturn = grossAnnualFactor * annualFeeFactor / annualInflationFactor - 1;

  return {
    annualSchedule: aggregateAnnualSchedule(detailedSchedule),
    detailedSchedule,
    effectiveAnnualRate,
    endingValue,
    feesPaid,
    grossReturn,
    investedCapital,
    netContributions,
    netGrowth: endingValue - netContributions,
    realAnnualReturn,
    realEndingValue: endingValue / (annualInflationFactor ** inputs.years),
    totalDeposits,
    unfundedWithdrawals,
    withdrawals
  };
}

function buildEvents(inputs: CompoundInterestInputs): Map<string, CashEvent> {
  const events = new Map<string, CashEvent>();
  const add = (time: number, deposit: number, withdrawal: number, note: string) => {
    const key = timeKey(time);
    const current = events.get(key) ?? { deposit: 0, note: [], withdrawal: 0 };
    current.deposit += deposit;
    current.withdrawal += withdrawal;
    current.note.push(note);
    events.set(key, current);
  };

  const frequency = inputs.contributionFrequency;
  if (inputs.recurringContribution > 0) {
    if (inputs.contributionTiming === 'beginning') {
      const count = Math.ceil(inputs.years * frequency - epsilon);
      for (let index = 0; index < count; index += 1) {
        const time = index / frequency;
        if (time >= inputs.years - epsilon) break;
        add(time, steppedContribution(inputs, index), 0, 'Beginning contribution');
      }
    } else {
      const count = Math.floor(inputs.years * frequency + epsilon);
      for (let index = 1; index <= count; index += 1) {
        const time = index / frequency;
        if (time > inputs.years + epsilon) break;
        add(time, steppedContribution(inputs, index - 1), 0, 'End contribution');
      }
    }
  }

  if (inputs.annualTopUp > 0) {
    for (let year = 1; year <= Math.floor(inputs.years + epsilon); year += 1) {
      add(year, inputs.annualTopUp, 0, 'Annual anniversary top-up');
    }
  }
  if (inputs.futureDepositAmount > 0) {
    add(inputs.futureDepositYear, inputs.futureDepositAmount, 0, 'One-time deposit');
  }
  if (inputs.futureWithdrawalAmount > 0) {
    add(inputs.futureWithdrawalYear, 0, inputs.futureWithdrawalAmount, 'One-time withdrawal');
  }

  return events;
}

function steppedContribution(inputs: CompoundInterestInputs, zeroBasedIndex: number): number {
  const completedContributionYears = Math.floor(zeroBasedIndex / inputs.contributionFrequency);
  return inputs.recurringContribution * (
    (1 + inputs.annualContributionIncreasePercent / 100) ** completedContributionYears
  );
}

function buildTimes(inputs: CompoundInterestInputs, events: Map<string, CashEvent>): number[] {
  const times = new Set<number>();
  events.forEach((_event, key) => times.add(Number(key)));
  for (let year = 1; year <= Math.floor(inputs.years + epsilon); year += 1) {
    times.add(normalizeTime(year));
  }
  times.add(normalizeTime(inputs.years));
  return [...times].filter((time) => time >= 0 && time <= inputs.years + epsilon).sort((a, b) => a - b);
}

function annualGrowthFactor(inputs: CompoundInterestInputs): number {
  const rate = inputs.annualRatePercent / 100;
  return inputs.rateBasis === 'apy'
    ? 1 + rate
    : (1 + rate / inputs.compoundingFrequency) ** inputs.compoundingFrequency;
}

function growthFactorForDuration(
  inputs: CompoundInterestInputs,
  grossAnnualFactor: number,
  duration: number
): number {
  if (duration === 0) return 1;
  if (inputs.rateBasis === 'apy') return grossAnnualFactor ** duration;
  const base = 1 + inputs.annualRatePercent / 100 / inputs.compoundingFrequency;
  const rawPeriods = duration * inputs.compoundingFrequency;
  const periods = Math.abs(rawPeriods - Math.round(rawPeriods)) < epsilon
    ? Math.round(rawPeriods)
    : rawPeriods;
  return base ** periods;
}

function aggregateAnnualSchedule(
  rows: CompoundInterestScheduleRow[]
): CompoundInterestScheduleRow[] {
  const annual = new Map<number, CompoundInterestScheduleRow>();
  rows.forEach((row) => {
    const year = Math.max(1, Math.ceil(row.time - epsilon));
    const existing = annual.get(year);
    if (!existing) {
      annual.set(year, {
        ...row,
        label: row.time < year - epsilon ? `Year ${year} (partial)` : `Year ${year}`
      });
      return;
    }
    existing.closingBalance = row.closingBalance;
    existing.cumulativeContributions = row.cumulativeContributions;
    existing.deposits += row.deposits;
    existing.fees += row.fees;
    existing.grossReturn += row.grossReturn;
    existing.netGrowth += row.netGrowth;
    existing.realClosingBalance = row.realClosingBalance;
    existing.time = row.time;
    existing.withdrawals += row.withdrawals;
    existing.label = row.time < year - epsilon ? `Year ${year} (partial)` : `Year ${year}`;
  });
  return [...annual.values()];
}

function firstTargetCrossing(
  inputs: CompoundInterestInputs,
  selectedCore: CoreProjection
): number | null {
  const targetAt = (time: number) => inputs.targetBasis === 'today'
    ? inputs.targetAmount * ((1 + inputs.inflationPercent / 100) ** time)
    : inputs.targetAmount;
  if (inputs.principal >= targetAt(0)) return 0;
  const selected = selectedCore.detailedSchedule.find((row) => row.closingBalance >= targetAt(row.time));
  if (selected) return selected.time;
  if (inputs.years >= 100) return null;
  const extended = simulateCore({
    ...inputs,
    futureDepositAmount: inputs.futureDepositYear <= inputs.years ? inputs.futureDepositAmount : 0,
    futureWithdrawalAmount: inputs.futureWithdrawalYear <= inputs.years ? inputs.futureWithdrawalAmount : 0,
    years: 100
  });
  return extended.detailedSchedule.find((row) => row.closingBalance >= targetAt(row.time))?.time ?? null;
}

function buildMilestones(
  inputs: CompoundInterestInputs,
  core: CoreProjection
): CompoundInterestMilestone[] {
  const milestones: CompoundInterestMilestone[] = [];
  if (inputs.targetAmount > 0) {
    [0.25, 0.5, 0.75, 1].forEach((fraction) => {
      const row = core.detailedSchedule.find((item) => {
        const targetAtTime = inputs.targetBasis === 'today'
          ? inputs.targetAmount * ((1 + inputs.inflationPercent / 100) ** item.time)
          : inputs.targetAmount;
        return item.closingBalance >= targetAtTime * fraction;
      });
      if (row) milestones.push({
        label: `${Math.round(fraction * 100)}% of target`,
        time: row.time,
        value: row.closingBalance
      });
    });
  }
  if (inputs.principal > 0) {
    const doubled = core.detailedSchedule.find((row) => row.closingBalance >= inputs.principal * 2);
    if (doubled) milestones.push({ label: 'Starting balance doubled', time: doubled.time, value: doubled.closingBalance });
  }
  let cumulativeWithdrawals = 0;
  const crossover = core.detailedSchedule.find((row) => {
    cumulativeWithdrawals += row.withdrawals;
    const netContributionsAtRow = row.cumulativeContributions - cumulativeWithdrawals;
    return netContributionsAtRow > 0 && row.closingBalance - netContributionsAtRow >= netContributionsAtRow;
  });
  if (crossover) milestones.push({ label: 'Growth matches net contributions', time: crossover.time, value: crossover.closingBalance });
  return milestones.filter((milestone, index, list) => (
    list.findIndex((candidate) => candidate.label === milestone.label) === index
  ));
}

function emptyProjection(validation: CompoundInterestValidation): CompoundInterestProjection {
  return {
    annualSchedule: [],
    detailedSchedule: [],
    effectiveAnnualRate: 0,
    endingValue: 0,
    feeDrag: 0,
    feesPaid: 0,
    grossReturn: 0,
    investedCapital: 0,
    milestones: [],
    netContributions: 0,
    netGrowth: 0,
    realAnnualReturn: 0,
    realEndingValue: 0,
    targetDifference: null,
    targetReachedAt: null,
    totalDeposits: 0,
    unfundedWithdrawals: 0,
    validation,
    withdrawals: 0
  };
}

function unsafeProjection(validation: CompoundInterestValidation): CompoundInterestProjection {
  return emptyProjection({
    ...validation,
    errors: {
      ...validation.errors,
      result: 'These assumptions produce a number too large to calculate safely. Reduce the amount, rate, increase, inflation range, fee, or term.'
    },
    isValid: false
  });
}

function isFiniteCoreProjection(projection: CoreProjection): boolean {
  return [
    projection.effectiveAnnualRate,
    projection.endingValue,
    projection.feesPaid,
    projection.grossReturn,
    projection.investedCapital,
    projection.netContributions,
    projection.netGrowth,
    projection.realAnnualReturn,
    projection.realEndingValue,
    projection.totalDeposits,
    projection.unfundedWithdrawals,
    projection.withdrawals
  ].every(Number.isFinite) && [
    ...projection.annualSchedule,
    ...projection.detailedSchedule
  ].every(isFiniteScheduleRow);
}

function isFiniteProjection(projection: CompoundInterestProjection): boolean {
  return isFiniteCoreProjection(projection) &&
    Number.isFinite(projection.feeDrag) &&
    (projection.targetDifference === null || Number.isFinite(projection.targetDifference)) &&
    (projection.targetReachedAt === null || Number.isFinite(projection.targetReachedAt)) &&
    projection.milestones.every((milestone) => Number.isFinite(milestone.time) && Number.isFinite(milestone.value));
}

function isFiniteScheduleRow(row: CompoundInterestScheduleRow): boolean {
  return [
    row.closingBalance,
    row.cumulativeContributions,
    row.deposits,
    row.fees,
    row.grossReturn,
    row.netGrowth,
    row.openingBalance,
    row.realClosingBalance,
    row.time,
    row.withdrawals
  ].every(Number.isFinite);
}

function normalizeTime(value: number): number {
  return Number(value.toFixed(10));
}

function timeKey(value: number): string {
  return normalizeTime(value).toFixed(10);
}

function formatYear(value: number): string {
  return Number(value.toFixed(4)).toLocaleString('en-US', { maximumFractionDigits: 4 });
}
