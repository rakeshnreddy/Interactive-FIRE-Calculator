export const savingsGoalFormulaVersion = 'finpath-savings-goal-v2';

export const savingsContributionFrequencies = [52, 26, 24, 12, 4, 2, 1] as const;
export const savingsCompoundingFrequencies = [365, 12, 4, 2, 1] as const;

export type SavingsContributionFrequency = typeof savingsContributionFrequencies[number];
export type SavingsCompoundingFrequency = typeof savingsCompoundingFrequencies[number];
export type SavingsContributionTiming = 'beginning' | 'end';
export type SavingsRateBasis = 'nominal' | 'apy';
export type SavingsTargetBasis = 'future' | 'today';

export type SavingsGoalInputs = {
  annualContributionIncreasePercent: number;
  annualFeePercent: number;
  annualRatePercent: number;
  annualTopUp: number;
  compoundingFrequency: SavingsCompoundingFrequency;
  contributionFrequency: SavingsContributionFrequency;
  contributionTiming: SavingsContributionTiming;
  currentContribution: number;
  currentSavings: number;
  inflationPercent: number;
  rateBasis: SavingsRateBasis;
  targetAmount: number;
  targetBasis: SavingsTargetBasis;
  years: number;
};

export type SavingsGoalValidation = {
  errors: Partial<Record<keyof SavingsGoalInputs | 'result', string>>;
  isValid: boolean;
  warnings: string[];
};

export type SavingsGoalScheduleRow = {
  closingBalance: number;
  cumulativeContributions: number;
  deposits: number;
  fees: number;
  gapToDeadlineTarget: number;
  grossReturn: number;
  label: string;
  openingBalance: number;
  targetAtTime: number;
  time: number;
};

export type SavingsGoalMilestone = {
  label: string;
  time: number | null;
  value: number;
};

export type SavingsGoalStatus = 'funded-by-growth' | 'funded-now' | 'funding-gap' | 'on-track';

export type SavingsGoalProjection = {
  annualSchedule: SavingsGoalScheduleRow[];
  catchUpNow: number;
  contributionFactor: number;
  currentPlanAnnualSchedule: SavingsGoalScheduleRow[];
  currentPlanDifference: number;
  currentPlanEnding: number;
  currentPlanReachAt: number | null;
  currentSavingsAtDeadline: number;
  detailedSchedule: SavingsGoalScheduleRow[];
  effectiveAnnualRate: number;
  feesPaid: number;
  fundedToday: boolean;
  grossReturn: number;
  milestones: SavingsGoalMilestone[];
  netAnnualRate: number;
  netGrowth: number;
  periodicDifference: number;
  requiredContribution: number | null;
  requiredPlanDifference: number;
  requiredPlanEnding: number;
  resolvedTarget: number;
  status: SavingsGoalStatus;
  totalFutureContributions: number;
  totalPlanCapital: number;
  validation: SavingsGoalValidation;
};

type SimulationResult = {
  annualSchedule: SavingsGoalScheduleRow[];
  detailedSchedule: SavingsGoalScheduleRow[];
  endingBalance: number;
  fees: number;
  grossReturn: number;
  totalDeposits: number;
};

type SimulationEvent = {
  recurringIndex: number | null;
  time: number;
  topUp: boolean;
};

const epsilon = 1e-10;
const maximumAmount = 999_999_999_999.99;
const maximumRatePercent = 10_000;
const maximumSearchYears = 100;

export const defaultSavingsGoalInputs: SavingsGoalInputs = {
  annualContributionIncreasePercent: 0,
  annualFeePercent: 0,
  annualRatePercent: 8,
  annualTopUp: 0,
  compoundingFrequency: 12,
  contributionFrequency: 12,
  contributionTiming: 'end',
  currentContribution: 0,
  currentSavings: 10_000,
  inflationPercent: 0,
  rateBasis: 'nominal',
  targetAmount: 100_000,
  targetBasis: 'future',
  years: 10
};

export function validateSavingsGoalInputs(inputs: SavingsGoalInputs): SavingsGoalValidation {
  const errors: SavingsGoalValidation['errors'] = {};
  const warnings: string[] = [];
  const numericKeys: Array<[keyof SavingsGoalInputs, string]> = [
    ['targetAmount', 'Goal amount'],
    ['currentSavings', 'Current savings'],
    ['years', 'Deadline'],
    ['annualRatePercent', 'Annual rate'],
    ['currentContribution', 'Current contribution'],
    ['annualContributionIncreasePercent', 'Annual contribution increase'],
    ['annualTopUp', 'Annual top-up'],
    ['annualFeePercent', 'Annual fee'],
    ['inflationPercent', 'Inflation']
  ];

  numericKeys.forEach(([key, label]) => {
    if (typeof inputs[key] === 'number' && !Number.isFinite(inputs[key])) {
      errors[key] = `${label} must be a finite number.`;
    }
  });

  const validateAmount = (
    key: 'annualTopUp' | 'currentContribution' | 'currentSavings',
    label: string
  ) => {
    if (!errors[key] && (inputs[key] < 0 || inputs[key] > maximumAmount)) {
      errors[key] = `${label} must be between 0 and ${maximumAmount.toLocaleString('en-US')}.`;
    }
  };
  validateAmount('currentSavings', 'Current savings');
  validateAmount('currentContribution', 'Current contribution');
  validateAmount('annualTopUp', 'Annual top-up');

  if (!errors.targetAmount && (inputs.targetAmount <= 0 || inputs.targetAmount > maximumAmount)) {
    errors.targetAmount = `Goal amount must be greater than 0 and no more than ${maximumAmount.toLocaleString('en-US')}.`;
  }
  if (!errors.years && (inputs.years <= 0 || inputs.years > maximumSearchYears)) {
    errors.years = 'Deadline must be greater than 0 and no more than 100 years.';
  }
  if (!errors.annualFeePercent && (inputs.annualFeePercent < 0 || inputs.annualFeePercent >= 100)) {
    errors.annualFeePercent = 'Annual fee must be at least 0% and less than 100%.';
  }
  if (!errors.annualContributionIncreasePercent && (
    inputs.annualContributionIncreasePercent <= -100 ||
    inputs.annualContributionIncreasePercent > 1_000
  )) {
    errors.annualContributionIncreasePercent = 'Annual contribution increase must be greater than -100% and no more than 1,000%.';
  }
  if (!errors.inflationPercent && (inputs.inflationPercent <= -100 || inputs.inflationPercent > 1_000)) {
    errors.inflationPercent = 'Inflation must be greater than -100% and no more than 1,000%.';
  }
  if (!savingsContributionFrequencies.includes(inputs.contributionFrequency)) {
    errors.contributionFrequency = 'Choose a supported contribution frequency.';
  }
  if (!savingsCompoundingFrequencies.includes(inputs.compoundingFrequency)) {
    errors.compoundingFrequency = 'Choose a supported compounding frequency.';
  }
  if (!['beginning', 'end'].includes(inputs.contributionTiming)) {
    errors.contributionTiming = 'Choose beginning or end of each contribution period.';
  }
  if (!['nominal', 'apy'].includes(inputs.rateBasis)) {
    errors.rateBasis = 'Choose nominal annual rate or APY/effective annual rate.';
  }
  if (!['future', 'today'].includes(inputs.targetBasis)) {
    errors.targetBasis = 'Choose future money or today’s purchasing power.';
  }

  if (!errors.annualRatePercent) {
    const decimalRate = inputs.annualRatePercent / 100;
    const inDomain = inputs.rateBasis === 'apy'
      ? 1 + decimalRate > 0
      : 1 + decimalRate / inputs.compoundingFrequency > 0;
    if (!inDomain || inputs.annualRatePercent > maximumRatePercent) {
      errors.annualRatePercent = inputs.rateBasis === 'apy'
        ? 'APY/effective rate must be greater than -100% and no more than 10,000%.'
        : 'The annual rate is outside the valid domain for the selected compounding frequency.';
    }
  }

  if (inputs.annualRatePercent < 0) warnings.push('A negative rate can reduce today’s savings and increase the required contribution.');
  if (inputs.annualRatePercent > 15) warnings.push('Rates above 15% are unusually high for long-range planning.');
  if (inputs.annualFeePercent > 2) warnings.push('Fees above 2% can materially increase the amount you need to save.');
  if (inputs.years > 50) warnings.push('Very long projections are especially sensitive to small assumption changes.');
  if (inputs.targetBasis === 'today' && inputs.inflationPercent === 0) {
    warnings.push('A today’s-money target with 0% inflation is numerically the same as a future-money target.');
  }

  return { errors, isValid: Object.keys(errors).length === 0, warnings };
}

export function calculateSavingsGoal(inputs: SavingsGoalInputs): SavingsGoalProjection {
  const validation = validateSavingsGoalInputs(inputs);
  if (!validation.isValid) return emptyProjection(validation);

  const grossAnnualFactor = annualGrowthFactor(inputs);
  const feeAnnualFactor = 1 - inputs.annualFeePercent / 100;
  const netAnnualFactor = grossAnnualFactor * feeAnnualFactor;
  const resolvedTarget = targetAt(inputs, inputs.years);
  if (![grossAnnualFactor, feeAnnualFactor, netAnnualFactor, resolvedTarget].every(Number.isFinite) || netAnnualFactor <= 0) {
    return unsafeProjection(validation);
  }
  if (resolvedTarget > maximumAmount) {
    return emptyProjection({
      errors: { result: `The inflation-adjusted deadline target must not exceed ${maximumAmount.toLocaleString('en-US')}.` },
      isValid: false,
      warnings: validation.warnings
    });
  }

  const base = simulatePlan(inputs, 0);
  const unit = simulatePlan(
    { ...inputs, annualTopUp: 0, currentSavings: 0 },
    1
  );
  const currentPlan = simulatePlan(inputs, inputs.currentContribution);
  if (!base || !unit || !currentPlan) return unsafeProjection(validation);

  const contributionFactor = unit.endingBalance;
  let requiredContribution: number | null = 0;
  if (base.endingBalance + epsilon < resolvedTarget) {
    requiredContribution = contributionFactor > epsilon
      ? (resolvedTarget - base.endingBalance) / contributionFactor
      : null;
  }
  if (requiredContribution !== null && (!Number.isFinite(requiredContribution) || requiredContribution < 0)) {
    return unsafeProjection(validation);
  }

  const requiredPlan = simulatePlan(inputs, requiredContribution ?? 0);
  if (!requiredPlan) return unsafeProjection(validation);
  const currentSavingsAtDeadline = inputs.currentSavings * (netAnnualFactor ** inputs.years);
  const currentPlanDifference = currentPlan.endingBalance - resolvedTarget;
  const requiredPlanDifference = requiredPlan.endingBalance - resolvedTarget;
  const deadlineShortfall = Math.max(0, -currentPlanDifference);
  const catchUpNow = deadlineShortfall / (netAnnualFactor ** inputs.years);
  const fundedToday = inputs.currentSavings >= inputs.targetAmount;
  const periodicDifference = requiredContribution === null
    ? 0
    : requiredContribution - inputs.currentContribution;
  const status: SavingsGoalStatus = requiredContribution === 0
    ? fundedToday ? 'funded-now' : 'funded-by-growth'
    : currentPlanDifference >= -epsilon ? 'on-track' : 'funding-gap';
  const currentPlanReachAt = findCurrentPlanReach(inputs);
  const totalPlanCapital = inputs.currentSavings + requiredPlan.totalDeposits;
  const netGrowth = requiredPlan.endingBalance - totalPlanCapital;
  const warnings = [...validation.warnings];

  if (requiredContribution === null) {
    warnings.push('No recurring contribution falls before this deadline. Choose beginning timing, a more frequent contribution, a one-time catch-up, or a later deadline.');
  }
  if (fundedToday && requiredContribution !== null && requiredContribution > 0) {
    warnings.push('The goal is funded today but not at the selected deadline under the rate, fee, and inflation assumptions.');
  }
  if (currentPlanReachAt === null && currentPlanDifference < 0) {
    warnings.push('The current plan does not reach the moving target at a modeled contribution checkpoint within 100 years.');
  }

  const projection: SavingsGoalProjection = {
    annualSchedule: requiredPlan.annualSchedule,
    catchUpNow,
    contributionFactor,
    currentPlanAnnualSchedule: currentPlan.annualSchedule,
    currentPlanDifference,
    currentPlanEnding: currentPlan.endingBalance,
    currentPlanReachAt,
    currentSavingsAtDeadline,
    detailedSchedule: requiredPlan.detailedSchedule,
    effectiveAnnualRate: grossAnnualFactor - 1,
    feesPaid: requiredPlan.fees,
    fundedToday,
    grossReturn: requiredPlan.grossReturn,
    milestones: buildMilestones(requiredPlan.detailedSchedule, resolvedTarget),
    netAnnualRate: netAnnualFactor - 1,
    netGrowth,
    periodicDifference,
    requiredContribution,
    requiredPlanDifference,
    requiredPlanEnding: requiredPlan.endingBalance,
    resolvedTarget,
    status,
    totalFutureContributions: requiredPlan.totalDeposits,
    totalPlanCapital,
    validation: { ...validation, warnings }
  };

  return isFiniteProjection(projection) ? projection : unsafeProjection(validation);
}

function simulatePlan(inputs: SavingsGoalInputs, startingContribution: number): SimulationResult | null {
  const events = buildEvents(inputs);
  const grossAnnualFactor = annualGrowthFactor(inputs);
  const feeAnnualFactor = 1 - inputs.annualFeePercent / 100;
  const detailedSchedule: SavingsGoalScheduleRow[] = [];
  let balance = inputs.currentSavings;
  let cumulativeContributions = 0;
  let fees = 0;
  let grossReturn = 0;
  let previousTime = 0;

  for (const event of events) {
    const openingBalance = balance;
    const elapsed = event.time - previousTime;
    const grossFactor = grossAnnualFactor ** elapsed;
    const afterGrossGrowth = balance * grossFactor;
    const periodReturn = afterGrossGrowth - balance;
    const feeFactor = feeAnnualFactor ** elapsed;
    const periodFee = afterGrossGrowth * (1 - feeFactor);
    balance = afterGrossGrowth - periodFee;

    let deposits = 0;
    if (event.recurringIndex !== null) {
      const completedContributionYears = Math.floor(event.recurringIndex / inputs.contributionFrequency);
      deposits += startingContribution * (
        (1 + inputs.annualContributionIncreasePercent / 100) ** completedContributionYears
      );
    }
    if (event.topUp) deposits += inputs.annualTopUp;
    balance += deposits;
    cumulativeContributions += deposits;
    fees += periodFee;
    grossReturn += periodReturn;

    const row: SavingsGoalScheduleRow = {
      closingBalance: balance,
      cumulativeContributions,
      deposits,
      fees: periodFee,
      gapToDeadlineTarget: targetAt(inputs, inputs.years) - balance,
      grossReturn: periodReturn,
      label: eventLabel(event.time, inputs.years),
      openingBalance,
      targetAtTime: targetAt(inputs, event.time),
      time: event.time
    };
    if (!scheduleRowIsFinite(row)) return null;
    detailedSchedule.push(row);
    previousTime = event.time;
  }

  if (![balance, cumulativeContributions, fees, grossReturn].every(Number.isFinite)) return null;
  return {
    annualSchedule: aggregateAnnualSchedule(detailedSchedule, inputs),
    detailedSchedule,
    endingBalance: balance,
    fees,
    grossReturn,
    totalDeposits: cumulativeContributions
  };
}

function buildEvents(inputs: SavingsGoalInputs): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  const addEvent = (time: number, recurringIndex: number | null, topUp: boolean) => {
    const normalizedTime = Math.abs(time - inputs.years) <= epsilon ? inputs.years : time;
    const existing = events.find((event) => Math.abs(event.time - normalizedTime) <= epsilon);
    if (existing) {
      if (recurringIndex !== null) existing.recurringIndex = recurringIndex;
      existing.topUp ||= topUp;
      return;
    }
    events.push({ recurringIndex, time: normalizedTime, topUp });
  };

  if (inputs.contributionTiming === 'beginning') {
    const count = Math.ceil(inputs.years * inputs.contributionFrequency - epsilon);
    for (let index = 0; index < count; index += 1) {
      const time = index / inputs.contributionFrequency;
      if (time < inputs.years - epsilon) addEvent(time, index, false);
    }
  } else {
    const count = Math.floor(inputs.years * inputs.contributionFrequency + epsilon);
    for (let index = 0; index < count; index += 1) {
      const time = (index + 1) / inputs.contributionFrequency;
      if (time <= inputs.years + epsilon) addEvent(time, index, false);
    }
  }

  const anniversaryCount = Math.floor(inputs.years + epsilon);
  for (let year = 1; year <= anniversaryCount; year += 1) {
    if (year <= inputs.years + epsilon) addEvent(year, null, true);
  }
  addEvent(inputs.years, null, false);
  events.sort((left, right) => left.time - right.time);
  return events;
}

function aggregateAnnualSchedule(
  rows: SavingsGoalScheduleRow[],
  inputs: SavingsGoalInputs
): SavingsGoalScheduleRow[] {
  const groups = new Map<number, SavingsGoalScheduleRow[]>();
  rows.forEach((row) => {
    const bucket = Math.max(1, Math.ceil(row.time - epsilon));
    groups.set(bucket, [...(groups.get(bucket) ?? []), row]);
  });

  return [...groups.entries()].map(([year, group]) => {
    const first = group[0];
    const last = group[group.length - 1];
    return {
      closingBalance: last.closingBalance,
      cumulativeContributions: last.cumulativeContributions,
      deposits: group.reduce((sum, row) => sum + row.deposits, 0),
      fees: group.reduce((sum, row) => sum + row.fees, 0),
      gapToDeadlineTarget: targetAt(inputs, inputs.years) - last.closingBalance,
      grossReturn: group.reduce((sum, row) => sum + row.grossReturn, 0),
      label: last.time < year - epsilon ? `Through ${formatTime(last.time)}` : `Year ${year}`,
      openingBalance: first.openingBalance,
      targetAtTime: targetAt(inputs, last.time),
      time: last.time
    };
  });
}

function findCurrentPlanReach(inputs: SavingsGoalInputs): number | null {
  if (inputs.currentSavings >= targetAt(inputs, 0)) return 0;
  const horizonInputs = { ...inputs, years: maximumSearchYears };
  const plan = simulatePlan(horizonInputs, inputs.currentContribution);
  if (!plan) return null;
  const reached = plan.detailedSchedule.find((row) => row.closingBalance + epsilon >= targetAt(inputs, row.time));
  return reached?.time ?? null;
}

function buildMilestones(
  rows: SavingsGoalScheduleRow[],
  target: number
): SavingsGoalMilestone[] {
  return [0.25, 0.5, 0.75, 1].map((share) => ({
    label: `${share * 100}% funded`,
    time: rows.find((row) => row.closingBalance + epsilon >= target * share)?.time ?? null,
    value: target * share
  }));
}

function annualGrowthFactor(inputs: SavingsGoalInputs): number {
  const rate = inputs.annualRatePercent / 100;
  return inputs.rateBasis === 'apy'
    ? 1 + rate
    : (1 + rate / inputs.compoundingFrequency) ** inputs.compoundingFrequency;
}

function targetAt(inputs: SavingsGoalInputs, time: number): number {
  return inputs.targetBasis === 'today'
    ? inputs.targetAmount * ((1 + inputs.inflationPercent / 100) ** time)
    : inputs.targetAmount;
}

function scheduleRowIsFinite(row: SavingsGoalScheduleRow): boolean {
  return Object.entries(row).every(([, value]) => typeof value !== 'number' || Number.isFinite(value));
}

function isFiniteProjection(projection: SavingsGoalProjection): boolean {
  const scalars = [
    projection.catchUpNow,
    projection.contributionFactor,
    projection.currentPlanDifference,
    projection.currentPlanEnding,
    projection.currentSavingsAtDeadline,
    projection.effectiveAnnualRate,
    projection.feesPaid,
    projection.grossReturn,
    projection.netAnnualRate,
    projection.netGrowth,
    projection.periodicDifference,
    projection.requiredPlanDifference,
    projection.requiredPlanEnding,
    projection.resolvedTarget,
    projection.totalFutureContributions,
    projection.totalPlanCapital
  ];
  if (projection.requiredContribution !== null) scalars.push(projection.requiredContribution);
  if (projection.currentPlanReachAt !== null) scalars.push(projection.currentPlanReachAt);
  return scalars.every(Number.isFinite) &&
    projection.annualSchedule.every(scheduleRowIsFinite) &&
    projection.detailedSchedule.every(scheduleRowIsFinite) &&
    projection.milestones.every((milestone) => milestone.time === null || Number.isFinite(milestone.time));
}

function emptyProjection(validation: SavingsGoalValidation): SavingsGoalProjection {
  return {
    annualSchedule: [],
    catchUpNow: 0,
    contributionFactor: 0,
    currentPlanAnnualSchedule: [],
    currentPlanDifference: 0,
    currentPlanEnding: 0,
    currentPlanReachAt: null,
    currentSavingsAtDeadline: 0,
    detailedSchedule: [],
    effectiveAnnualRate: 0,
    feesPaid: 0,
    fundedToday: false,
    grossReturn: 0,
    milestones: [],
    netAnnualRate: 0,
    netGrowth: 0,
    periodicDifference: 0,
    requiredContribution: 0,
    requiredPlanDifference: 0,
    requiredPlanEnding: 0,
    resolvedTarget: 0,
    status: 'funding-gap',
    totalFutureContributions: 0,
    totalPlanCapital: 0,
    validation
  };
}

function unsafeProjection(validation: SavingsGoalValidation): SavingsGoalProjection {
  return emptyProjection({
    errors: { ...validation.errors, result: 'These assumptions exceed the calculator’s safe numeric range. Reduce the amount, rate, contribution increase, or term.' },
    isValid: false,
    warnings: validation.warnings
  });
}

function eventLabel(time: number, horizon: number): string {
  if (time === 0) return 'Start';
  if (Math.abs(time - horizon) <= epsilon && !Number.isInteger(time)) return `Deadline (${formatTime(time)})`;
  const months = Math.round(time * 12);
  if (Math.abs(time * 12 - months) <= epsilon) return `Month ${months}`;
  return formatTime(time);
}

function formatTime(years: number): string {
  const wholeYears = Math.floor(years + epsilon);
  const months = Math.round((years - wholeYears) * 12);
  if (wholeYears === 0) return `${months} month${months === 1 ? '' : 's'}`;
  if (months === 0) return `${wholeYears} year${wholeYears === 1 ? '' : 's'}`;
  return `${wholeYears}y ${months}m`;
}
