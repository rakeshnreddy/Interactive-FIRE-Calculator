export const netWorthFormulaVersion = 'finpath-net-worth-v2' as const;
export const budgetFormulaVersion = 'finpath-budget-v2' as const;
export const emergencyFundFormulaVersion = 'finpath-emergency-fund-v2' as const;

const maximumMoney = 1_000_000_000_000_000;
const epsilon = 1e-9;

export type PlanningValidation<Key extends string> = {
  errors: Partial<Record<Key, string>>;
  isValid: boolean;
  warnings: string[];
};

export type BreakdownRow = {
  key: string;
  label: string;
  value: number;
};

export type NetWorthInputs = {
  cashAndBank: number;
  taxableInvestments: number;
  retirementAccounts: number;
  realEstate: number;
  vehiclesAndValuables: number;
  otherAssets: number;
  mortgage: number;
  studentAndPersonalLoans: number;
  vehicleLoans: number;
  creditCards: number;
  otherLiabilities: number;
};

export type NetWorthInputKey = keyof NetWorthInputs;

export type NetWorthValuationScenario = {
  adjustmentPercent: number;
  id: 'lower' | 'reported' | 'higher';
  label: string;
  netWorth: number;
  totalAssets: number;
};

export type NetWorthProjection = {
  assetRows: BreakdownRow[];
  debtToAssetRatio: number | null;
  liabilityRows: BreakdownRow[];
  liquidAssets: number;
  liquidPosition: number;
  marketSensitiveAssets: number;
  netWorth: number;
  totalAssets: number;
  totalLiabilities: number;
  validation: PlanningValidation<NetWorthInputKey>;
  valuationScenarios: NetWorthValuationScenario[];
};

export const defaultNetWorthInputs: NetWorthInputs = {
  cashAndBank: 25_000,
  taxableInvestments: 35_000,
  retirementAccounts: 60_000,
  realEstate: 110_000,
  vehiclesAndValuables: 15_000,
  otherAssets: 5_000,
  mortgage: 50_000,
  studentAndPersonalLoans: 10_000,
  vehicleLoans: 8_000,
  creditCards: 4_000,
  otherLiabilities: 3_000
};

export function calculateNetWorth(inputs: NetWorthInputs): NetWorthProjection {
  const validation = validateMoneyRecord(inputs);
  if (!validation.isValid) return emptyNetWorthProjection(validation);

  const assetRows: BreakdownRow[] = [
    { key: 'cashAndBank', label: 'Cash and bank accounts', value: inputs.cashAndBank },
    { key: 'taxableInvestments', label: 'Taxable investments', value: inputs.taxableInvestments },
    { key: 'retirementAccounts', label: 'Retirement accounts', value: inputs.retirementAccounts },
    { key: 'realEstate', label: 'Real estate', value: inputs.realEstate },
    { key: 'vehiclesAndValuables', label: 'Vehicles and valuables', value: inputs.vehiclesAndValuables },
    { key: 'otherAssets', label: 'Other assets', value: inputs.otherAssets }
  ];
  const liabilityRows: BreakdownRow[] = [
    { key: 'mortgage', label: 'Mortgage', value: inputs.mortgage },
    { key: 'studentAndPersonalLoans', label: 'Student and personal loans', value: inputs.studentAndPersonalLoans },
    { key: 'vehicleLoans', label: 'Vehicle loans', value: inputs.vehicleLoans },
    { key: 'creditCards', label: 'Credit cards', value: inputs.creditCards },
    { key: 'otherLiabilities', label: 'Other liabilities', value: inputs.otherLiabilities }
  ];
  const totalAssets = sumRows(assetRows);
  const totalLiabilities = sumRows(liabilityRows);
  const netWorth = totalAssets - totalLiabilities;
  const liquidAssets = inputs.cashAndBank + inputs.taxableInvestments;
  const shortTermLiabilities = inputs.creditCards + inputs.otherLiabilities;
  const marketSensitiveAssets = totalAssets - inputs.cashAndBank;
  const valuationScenarios: NetWorthValuationScenario[] = [
    buildNetWorthScenario('lower', 'Asset values −10%', -10, inputs.cashAndBank, marketSensitiveAssets, totalLiabilities),
    buildNetWorthScenario('reported', 'Reported values', 0, inputs.cashAndBank, marketSensitiveAssets, totalLiabilities),
    buildNetWorthScenario('higher', 'Asset values +10%', 10, inputs.cashAndBank, marketSensitiveAssets, totalLiabilities)
  ];

  return {
    assetRows,
    debtToAssetRatio: totalAssets > epsilon ? totalLiabilities / totalAssets : null,
    liabilityRows,
    liquidAssets,
    liquidPosition: liquidAssets - shortTermLiabilities,
    marketSensitiveAssets,
    netWorth,
    totalAssets,
    totalLiabilities,
    validation: {
      ...validation,
      warnings: [
        ...(totalAssets === 0 && totalLiabilities > 0 ? ['Debt-to-asset ratio is unavailable because reported assets are zero.'] : []),
        ...(netWorth < 0 ? ['Reported liabilities exceed reported assets. A negative snapshot can still be valid.'] : [])
      ]
    },
    valuationScenarios
  };
}

function buildNetWorthScenario(
  id: NetWorthValuationScenario['id'],
  label: string,
  adjustmentPercent: number,
  cash: number,
  marketSensitiveAssets: number,
  liabilities: number
): NetWorthValuationScenario {
  const totalAssets = cash + marketSensitiveAssets * (1 + adjustmentPercent / 100);
  return { adjustmentPercent, id, label, netWorth: totalAssets - liabilities, totalAssets };
}

function emptyNetWorthProjection(validation: PlanningValidation<NetWorthInputKey>): NetWorthProjection {
  return {
    assetRows: [],
    debtToAssetRatio: null,
    liabilityRows: [],
    liquidAssets: 0,
    liquidPosition: 0,
    marketSensitiveAssets: 0,
    netWorth: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    validation,
    valuationScenarios: []
  };
}

export type BudgetInputs = {
  takeHomePay: number;
  otherIncome: number;
  housing: number;
  utilities: number;
  groceries: number;
  transportation: number;
  insuranceAndHealth: number;
  debtMinimums: number;
  familyAndCare: number;
  lifestyle: number;
  subscriptions: number;
  otherSpending: number;
  plannedSavings: number;
  targetSavingsRatePercent: number;
  incomeShockPercent: number;
  flexibleCutPercent: number;
};

export type BudgetInputKey = keyof BudgetInputs;

export type BudgetScenario = {
  id: 'current' | 'income-shock' | 'flexible-trim';
  label: string;
  monthlyIncome: number;
  monthlySpending: number;
  monthlySurplus: number;
};

export type BudgetPaceRow = {
  cumulativePlannedSavings: number;
  cumulativeSurplus: number;
  cumulativeUnassigned: number;
  month: number;
};

export type BudgetProjection = {
  annualSpending: number;
  annualSurplus: number;
  categoryRows: BreakdownRow[];
  monthlyNeeds: number;
  monthlySurplus: number;
  monthlyWants: number;
  pace: BudgetPaceRow[];
  plannedSavingsRate: number | null;
  referenceNeeds: number;
  referenceSavings: number;
  referenceWants: number;
  savingsCapacityRate: number | null;
  savingsTargetGap: number;
  scenarios: BudgetScenario[];
  totalIncome: number;
  totalSpending: number;
  unassignedAfterPlan: number;
  validation: PlanningValidation<BudgetInputKey>;
};

export const defaultBudgetInputs: BudgetInputs = {
  takeHomePay: 7_000,
  otherIncome: 0,
  housing: 1_800,
  utilities: 300,
  groceries: 650,
  transportation: 400,
  insuranceAndHealth: 300,
  debtMinimums: 300,
  familyAndCare: 200,
  lifestyle: 400,
  subscriptions: 100,
  otherSpending: 50,
  plannedSavings: 1_500,
  targetSavingsRatePercent: 20,
  incomeShockPercent: 20,
  flexibleCutPercent: 20
};

export function calculateBudget(inputs: BudgetInputs): BudgetProjection {
  const validation = validateBudgetInputs(inputs);
  if (!validation.isValid) return emptyBudgetProjection(validation);

  const needsRows: BreakdownRow[] = [
    { key: 'housing', label: 'Housing', value: inputs.housing },
    { key: 'utilities', label: 'Utilities', value: inputs.utilities },
    { key: 'groceries', label: 'Groceries', value: inputs.groceries },
    { key: 'transportation', label: 'Transportation', value: inputs.transportation },
    { key: 'insuranceAndHealth', label: 'Insurance and health', value: inputs.insuranceAndHealth },
    { key: 'debtMinimums', label: 'Minimum debt payments', value: inputs.debtMinimums },
    { key: 'familyAndCare', label: 'Family and care', value: inputs.familyAndCare }
  ];
  const wantsRows: BreakdownRow[] = [
    { key: 'lifestyle', label: 'Lifestyle and recreation', value: inputs.lifestyle },
    { key: 'subscriptions', label: 'Subscriptions', value: inputs.subscriptions },
    { key: 'otherSpending', label: 'Other spending', value: inputs.otherSpending }
  ];
  const categoryRows = [...needsRows, ...wantsRows];
  const totalIncome = inputs.takeHomePay + inputs.otherIncome;
  const monthlyNeeds = sumRows(needsRows);
  const monthlyWants = sumRows(wantsRows);
  const totalSpending = monthlyNeeds + monthlyWants;
  const monthlySurplus = totalIncome - totalSpending;
  const unassignedAfterPlan = monthlySurplus - inputs.plannedSavings;
  const referenceSavings = totalIncome * inputs.targetSavingsRatePercent / 100;
  const pace: BudgetPaceRow[] = Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    return {
      cumulativePlannedSavings: inputs.plannedSavings * month,
      cumulativeSurplus: monthlySurplus * month,
      cumulativeUnassigned: unassignedAfterPlan * month,
      month
    };
  });
  const scenarios: BudgetScenario[] = [
    { id: 'current', label: 'Current plan', monthlyIncome: totalIncome, monthlySpending: totalSpending, monthlySurplus },
    {
      id: 'income-shock',
      label: `Income −${formatPlainPercent(inputs.incomeShockPercent)}`,
      monthlyIncome: totalIncome * (1 - inputs.incomeShockPercent / 100),
      monthlySpending: totalSpending,
      monthlySurplus: totalIncome * (1 - inputs.incomeShockPercent / 100) - totalSpending
    },
    {
      id: 'flexible-trim',
      label: `Flexible spending −${formatPlainPercent(inputs.flexibleCutPercent)}`,
      monthlyIncome: totalIncome,
      monthlySpending: totalSpending - monthlyWants * inputs.flexibleCutPercent / 100,
      monthlySurplus: monthlySurplus + monthlyWants * inputs.flexibleCutPercent / 100
    }
  ];

  return {
    annualSpending: totalSpending * 12,
    annualSurplus: monthlySurplus * 12,
    categoryRows,
    monthlyNeeds,
    monthlySurplus,
    monthlyWants,
    pace,
    plannedSavingsRate: totalIncome > epsilon ? inputs.plannedSavings / totalIncome : null,
    referenceNeeds: totalIncome * 0.5,
    referenceSavings,
    referenceWants: totalIncome * 0.3,
    savingsCapacityRate: totalIncome > epsilon ? monthlySurplus / totalIncome : null,
    savingsTargetGap: monthlySurplus - referenceSavings,
    scenarios,
    totalIncome,
    totalSpending,
    unassignedAfterPlan,
    validation: {
      ...validation,
      warnings: [
        ...(totalIncome === 0 ? ['Savings-rate percentages are unavailable because monthly income is zero.'] : []),
        ...(monthlySurplus < 0 ? ['Monthly spending exceeds monthly income in this plan.'] : []),
        ...(unassignedAfterPlan < 0 ? ['Planned savings exceed the cash left after entered spending.'] : [])
      ]
    }
  };
}

function validateBudgetInputs(inputs: BudgetInputs): PlanningValidation<BudgetInputKey> {
  const validation = validateMoneyRecord(inputs, new Set<BudgetInputKey>([
    'targetSavingsRatePercent',
    'incomeShockPercent',
    'flexibleCutPercent'
  ]));
  const errors = { ...validation.errors };
  for (const key of ['targetSavingsRatePercent', 'incomeShockPercent', 'flexibleCutPercent'] as const) {
    const value = inputs[key];
    if (!Number.isFinite(value)) errors[key] = 'Enter a finite percentage.';
    else if (value < 0 || value > 100) errors[key] = 'Enter a percentage from 0 to 100.';
  }
  return { errors, isValid: Object.keys(errors).length === 0, warnings: [] };
}

function emptyBudgetProjection(validation: PlanningValidation<BudgetInputKey>): BudgetProjection {
  return {
    annualSpending: 0,
    annualSurplus: 0,
    categoryRows: [],
    monthlyNeeds: 0,
    monthlySurplus: 0,
    monthlyWants: 0,
    pace: [],
    plannedSavingsRate: null,
    referenceNeeds: 0,
    referenceSavings: 0,
    referenceWants: 0,
    savingsCapacityRate: null,
    savingsTargetGap: 0,
    scenarios: [],
    totalIncome: 0,
    totalSpending: 0,
    unassignedAfterPlan: 0,
    validation
  };
}

export type IncomeStability = 'stable' | 'uncertain' | 'variable';

export type EmergencyFundInputs = {
  monthlyEssentials: number;
  cashOnHand: number;
  bankSavings: number;
  shortTermDeposits: number;
  accessibleInvestments: number;
  targetMonths: number;
  oneTimeBuffer: number;
  monthlyContribution: number;
  incomeStability: IncomeStability;
  householdEarners: 1 | 2;
  dependents: number;
};

export type EmergencyFundInputKey = keyof EmergencyFundInputs;

export type EmergencyFundScenario = {
  gap: number;
  id: 'three-months' | 'six-months' | 'risk-reference';
  label: string;
  months: number;
  target: number;
};

export type EmergencyFundScheduleRow = {
  contribution: number;
  endingReserve: number;
  gap: number;
  month: number;
};

export type EmergencyFundProjection = {
  currentReserve: number;
  excess: number;
  gap: number;
  immediateReserve: number;
  marketExposedReserve: number;
  monthsOfRunway: number | null;
  monthsToGoal: number | null;
  nearTermReserve: number;
  progress: number;
  riskReferenceMonths: number;
  riskReferenceTarget: number;
  scenarios: EmergencyFundScenario[];
  schedule: EmergencyFundScheduleRow[];
  selectedTarget: number;
  validation: PlanningValidation<EmergencyFundInputKey>;
};

export const defaultEmergencyFundInputs: EmergencyFundInputs = {
  monthlyEssentials: 4_500,
  cashOnHand: 3_000,
  bankSavings: 12_000,
  shortTermDeposits: 12_000,
  accessibleInvestments: 0,
  targetMonths: 6,
  oneTimeBuffer: 0,
  monthlyContribution: 500,
  incomeStability: 'stable',
  householdEarners: 1,
  dependents: 0
};

export function calculateEmergencyFund(inputs: EmergencyFundInputs): EmergencyFundProjection {
  const validation = validateEmergencyFundInputs(inputs);
  if (!validation.isValid) return emptyEmergencyFundProjection(validation);

  const immediateReserve = inputs.cashOnHand + inputs.bankSavings;
  const nearTermReserve = inputs.shortTermDeposits;
  const marketExposedReserve = inputs.accessibleInvestments;
  const currentReserve = immediateReserve + nearTermReserve + marketExposedReserve;
  const selectedTarget = inputs.monthlyEssentials * inputs.targetMonths + inputs.oneTimeBuffer;
  const gap = Math.max(0, selectedTarget - currentReserve);
  const excess = Math.max(0, currentReserve - selectedTarget);
  const riskReferenceMonths = emergencyRiskReferenceMonths(inputs);
  const riskReferenceTarget = inputs.monthlyEssentials * riskReferenceMonths + inputs.oneTimeBuffer;
  const rawMonthsToGoal = gap <= epsilon
    ? 0
    : inputs.monthlyContribution > epsilon
      ? Math.ceil(gap / inputs.monthlyContribution)
      : null;
  const monthsToGoal = rawMonthsToGoal;
  const scheduleLength = monthsToGoal === null ? 0 : Math.min(monthsToGoal, 1_200);
  const schedule: EmergencyFundScheduleRow[] = [{
    contribution: 0,
    endingReserve: currentReserve,
    gap,
    month: 0
  }];
  for (let month = 1; month <= scheduleLength; month += 1) {
    const prior = schedule[schedule.length - 1].endingReserve;
    const contribution = Math.min(inputs.monthlyContribution, Math.max(0, selectedTarget - prior));
    const endingReserve = prior + contribution;
    schedule.push({ contribution, endingReserve, gap: Math.max(0, selectedTarget - endingReserve), month });
  }
  const scenarios = [
    buildEmergencyScenario('three-months', '3 months', 3, inputs, currentReserve),
    buildEmergencyScenario('six-months', '6 months', 6, inputs, currentReserve),
    buildEmergencyScenario('risk-reference', 'Risk-based reference', riskReferenceMonths, inputs, currentReserve)
  ];

  return {
    currentReserve,
    excess,
    gap,
    immediateReserve,
    marketExposedReserve,
    monthsOfRunway: inputs.monthlyEssentials > epsilon ? currentReserve / inputs.monthlyEssentials : null,
    monthsToGoal,
    nearTermReserve,
    progress: selectedTarget > epsilon ? Math.min(1, currentReserve / selectedTarget) : 1,
    riskReferenceMonths,
    riskReferenceTarget,
    scenarios,
    schedule,
    selectedTarget,
    validation: {
      ...validation,
      warnings: [
        ...(inputs.monthlyEssentials === 0 ? ['Runway is unavailable because essential monthly spending is zero.'] : []),
        ...(gap > 0 && inputs.monthlyContribution === 0 ? ['No funding date is available until a monthly contribution is entered.'] : []),
        ...(rawMonthsToGoal !== null && rawMonthsToGoal > 1_200 ? ['The funding estimate exceeds 100 years; the detailed schedule stops at 1,200 months.'] : []),
        ...(marketExposedReserve > 0 ? ['Market-exposed assets can lose value or take time to sell; the calculator uses the entered balance without a haircut.'] : [])
      ]
    }
  };
}

export function emergencyRiskReferenceMonths(inputs: EmergencyFundInputs): number {
  let months = 3;
  if (inputs.incomeStability === 'variable') months += 2;
  if (inputs.incomeStability === 'uncertain') months += 4;
  if (inputs.householdEarners === 1) months += 1;
  months += Math.min(2, inputs.dependents * 0.5);
  return Math.min(12, Math.max(3, Math.round(months * 2) / 2));
}

function buildEmergencyScenario(
  id: EmergencyFundScenario['id'],
  label: string,
  months: number,
  inputs: EmergencyFundInputs,
  currentReserve: number
): EmergencyFundScenario {
  const target = inputs.monthlyEssentials * months + inputs.oneTimeBuffer;
  return { gap: Math.max(0, target - currentReserve), id, label, months, target };
}

function validateEmergencyFundInputs(inputs: EmergencyFundInputs): PlanningValidation<EmergencyFundInputKey> {
  const numericEntries = Object.entries(inputs).filter(([, value]) => typeof value === 'number') as Array<[EmergencyFundInputKey, number]>;
  const errors: PlanningValidation<EmergencyFundInputKey>['errors'] = {};
  for (const [key, value] of numericEntries) {
    if (!Number.isFinite(value)) errors[key] = 'Enter a finite number.';
    else if (value < 0) errors[key] = 'Enter zero or a positive number.';
    else if (value > maximumMoney) errors[key] = 'Enter a smaller value.';
  }
  if (Number.isFinite(inputs.targetMonths) && (inputs.targetMonths <= 0 || inputs.targetMonths > 24)) {
    errors.targetMonths = 'Enter more than 0 and no more than 24 months.';
  }
  if (Number.isFinite(inputs.dependents) && (!Number.isInteger(inputs.dependents) || inputs.dependents > 20)) {
    errors.dependents = 'Enter a whole number from 0 to 20.';
  }
  if (![1, 2].includes(inputs.householdEarners)) errors.householdEarners = 'Choose one or two-plus income earners.';
  if (!['stable', 'variable', 'uncertain'].includes(inputs.incomeStability)) errors.incomeStability = 'Choose an income pattern.';
  return { errors, isValid: Object.keys(errors).length === 0, warnings: [] };
}

function emptyEmergencyFundProjection(validation: PlanningValidation<EmergencyFundInputKey>): EmergencyFundProjection {
  return {
    currentReserve: 0,
    excess: 0,
    gap: 0,
    immediateReserve: 0,
    marketExposedReserve: 0,
    monthsOfRunway: null,
    monthsToGoal: null,
    nearTermReserve: 0,
    progress: 0,
    riskReferenceMonths: 0,
    riskReferenceTarget: 0,
    scenarios: [],
    schedule: [],
    selectedTarget: 0,
    validation
  };
}

function validateMoneyRecord<Key extends string>(
  inputs: Record<Key, number>,
  ignoredKeys = new Set<Key>()
): PlanningValidation<Key> {
  const errors: Partial<Record<Key, string>> = {};
  for (const [rawKey, value] of Object.entries<number>(inputs)) {
    const key = rawKey as Key;
    if (ignoredKeys.has(key)) continue;
    if (!Number.isFinite(value)) errors[key] = 'Enter a finite amount.';
    else if (value < 0) errors[key] = 'Enter zero or a positive amount.';
    else if (value > maximumMoney) errors[key] = 'Enter a smaller amount.';
  }
  return { errors, isValid: Object.keys(errors).length === 0, warnings: [] };
}

function sumRows(rows: BreakdownRow[]): number {
  return rows.reduce((total, row) => total + row.value, 0);
}

function formatPlainPercent(value: number): string {
  return `${Number(value.toFixed(2))}%`;
}

function csvCell(value: string | number): string {
  const stringValue = String(value);
  return /[",\r\n]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
}

function csv(rows: Array<Array<string | number>>): string {
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
}

export function buildNetWorthCsv(projection: NetWorthProjection): string {
  return csv([
    ['Section', 'Category', 'Value'],
    ...projection.assetRows.map((row) => ['Asset', row.label, precise(row.value)]),
    ...projection.liabilityRows.map((row) => ['Liability', row.label, precise(row.value)]),
    ['Summary', 'Total assets', precise(projection.totalAssets)],
    ['Summary', 'Total liabilities', precise(projection.totalLiabilities)],
    ['Summary', 'Net worth', precise(projection.netWorth)],
    ['Summary', 'Liquid assets', precise(projection.liquidAssets)],
    ['Summary', 'Liquid position', precise(projection.liquidPosition)]
  ]);
}

export function buildBudgetCsv(inputs: BudgetInputs, projection: BudgetProjection): string {
  return csv([
    ['Section', 'Category', 'Monthly value', 'Annual value'],
    ['Income', 'Take-home pay', precise(inputs.takeHomePay), precise(inputs.takeHomePay * 12)],
    ['Income', 'Other income', precise(inputs.otherIncome), precise(inputs.otherIncome * 12)],
    ...projection.categoryRows.map((row) => ['Spending', row.label, precise(row.value), precise(row.value * 12)]),
    ['Savings', 'Planned savings', precise(inputs.plannedSavings), precise(inputs.plannedSavings * 12)],
    ['Summary', 'Cash surplus before planned savings', precise(projection.monthlySurplus), precise(projection.annualSurplus)],
    ['Summary', 'Unassigned after planned savings', precise(projection.unassignedAfterPlan), precise(projection.unassignedAfterPlan * 12)]
  ]);
}

export function buildEmergencyFundCsv(projection: EmergencyFundProjection): string {
  return csv([
    ['Month', 'Contribution', 'Ending reserve', 'Remaining gap'],
    ...projection.schedule.map((row) => [row.month, precise(row.contribution), precise(row.endingReserve), precise(row.gap)])
  ]);
}

function precise(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(15) : '';
}
