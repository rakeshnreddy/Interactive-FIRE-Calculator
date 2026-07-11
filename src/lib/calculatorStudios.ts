import {
  calculateSeoCalculator,
  calculatorPath,
  seoCalculators,
  type CalculatorInput,
  type CalculatorMetric,
  type CalculatorResult,
  type SeoCalculator
} from './seoCalculators';
import { getCalculatorStudio, type CalculatorStudio } from './calculatorQuality';

export const calculatorScenarioIds = ['conservative', 'base', 'optimistic'] as const;
export type CalculatorScenarioId = (typeof calculatorScenarioIds)[number];

export type CalculatorStudioChartType = 'amortization' | 'comparison' | 'timeline' | 'waterfall';

export type CalculatorScenario = {
  description: string;
  id: CalculatorScenarioId;
  label: string;
  result: CalculatorResult;
  values: Record<string, number>;
};

export type CalculatorStudioExample = {
  description: string;
  insight: string;
  title: string;
  values: Record<string, number>;
};

export type CalculatorRelatedRoute = {
  path: `/calculators/${string}`;
  reason: string;
  slug: string;
  title: string;
};

export type CalculatorStudioMetadata = {
  chartDescription: string;
  chartTitle: string;
  chartType: CalculatorStudioChartType;
  example: CalculatorStudioExample;
  relatedCalculators: CalculatorRelatedRoute[];
  scenarioFocus: string;
  studio: CalculatorStudio;
  summary: string;
};

export type CalculatorChartDatum = {
  label: string;
  note?: string;
  primary: number;
  secondary?: number;
  tone?: CalculatorMetric['tone'];
};

export type CalculatorStudioChart = {
  description: string;
  entries: CalculatorChartDatum[];
  legend: {
    primary: string;
    secondary?: string;
  };
  summary: string;
  title: string;
  type: CalculatorStudioChartType;
};

export type CalculatorDetailScheduleValueType = CalculatorMetric['valueType'] | 'text';

export type CalculatorDetailScheduleColumn = {
  description?: string;
  key: string;
  label: string;
  valueType: CalculatorDetailScheduleValueType;
};

export type CalculatorDetailScheduleRow = {
  id: string;
  note?: string;
  values: Record<string, number | string>;
};

export type CalculatorDetailSchedule = {
  columns: CalculatorDetailScheduleColumn[];
  description: string;
  rows: CalculatorDetailScheduleRow[];
  summary: string;
  title: string;
};

type StudioDefault = Omit<CalculatorStudioMetadata, 'example' | 'relatedCalculators' | 'studio'>;

const studioDefaults: Record<CalculatorStudio, StudioDefault> = {
  'Cashflow and Balance Sheet Studio': {
    chartDescription: 'Shows the income, spending, asset, liability, or coverage pieces that create the headline result.',
    chartTitle: 'Cashflow and balance read',
    chartType: 'waterfall',
    scenarioFocus: 'Change spending, income, assets, or coverage to see the immediate gap or surplus.',
    summary: 'Connect a one-time household snapshot to accounts, transaction tracking, reserves, or protection goals.'
  },
  'Debt Payoff Studio': {
    chartDescription: 'Shows how payment pace changes the payoff path, interest pressure, and time to zero.',
    chartTitle: 'Payoff path preview',
    chartType: 'timeline',
    scenarioFocus: 'Compare current payments with tighter or accelerated payoff paths.',
    summary: 'Turn a balance and APR into a payoff sequence with enough context to choose the next action.'
  },
  'Growth and Goal Studio': {
    chartDescription: 'Shows the path from current money and future deposits to the projected result.',
    chartTitle: 'Growth path preview',
    chartType: 'timeline',
    scenarioFocus: 'Compare lower, current, and higher contribution or return assumptions without losing the base inputs.',
    summary: 'Make time, contributions, and return assumptions visible before saving the result as a goal or account.'
  },
  'Income and Tax Studio': {
    chartDescription: 'Shows how gross money moves through deductions, estimated tax, and net take-home.',
    chartTitle: 'Gross-to-net preview',
    chartType: 'waterfall',
    scenarioFocus: 'Compare tax, deduction, exemption, or pay-frequency assumptions while keeping the estimate clearly labeled.',
    summary: 'Translate gross amounts into usable cashflow or tax planning notes with visible assumptions.'
  },
  'Loan and Home Studio': {
    chartDescription: 'Shows the debt balance path, interest pressure, and total-cost pieces behind the payment.',
    chartTitle: 'Loan path preview',
    chartType: 'amortization',
    scenarioFocus: 'Compare rate, term, down-payment, or prepayment assumptions before saving a liability or home plan.',
    summary: 'Move beyond the monthly payment into lifetime cost, balance path, and affordability context.'
  },
  'Retirement Income Studio': {
    chartDescription: 'Shows how corpus, contributions, benefits, withdrawals, or required distributions change over time.',
    chartTitle: 'Retirement path preview',
    chartType: 'timeline',
    scenarioFocus: 'Compare stressed, current, and stronger retirement assumptions before saving a plan.',
    summary: 'Connect long-horizon savings or income estimates to retirement readiness, runway, and distribution decisions.'
  },
  'Return Analysis Studio': {
    chartDescription: 'Compares the headline return with invested capital, gain, time, or sensitivity context.',
    chartTitle: 'Return comparison preview',
    chartType: 'comparison',
    scenarioFocus: 'Compare return, cost, ending value, or time assumptions so the output is more than one formula.',
    summary: 'Judge investment performance after time, cashflows, costs, and opportunity context are visible.'
  }
};

const riskierRateStudios = new Set<CalculatorStudio>([
  'Debt Payoff Studio',
  'Income and Tax Studio',
  'Loan and Home Studio'
]);

export function getCalculatorStudioMetadata(
  calculator: SeoCalculator,
  allCalculators: SeoCalculator[] = seoCalculators
): CalculatorStudioMetadata {
  const studio = getCalculatorStudio(calculator);
  const defaults = studioDefaults[studio];

  return {
    ...defaults,
    example: buildCalculatorExample(calculator),
    relatedCalculators: relatedCalculatorsFor(calculator, allCalculators),
    studio
  };
}

export function buildCalculatorScenarios(
  calculator: SeoCalculator,
  values: Record<string, number>
): CalculatorScenario[] {
  return calculatorScenarioIds.map((id) => {
    const scenarioValues = buildScenarioValues(calculator, values, id);

    return {
      description: scenarioDescription(calculator, id),
      id,
      label: scenarioLabel(id),
      result: calculateSeoCalculator(calculator, scenarioValues),
      values: scenarioValues
    };
  });
}

export function buildScenarioValues(
  calculator: SeoCalculator,
  values: Record<string, number>,
  scenarioId: CalculatorScenarioId
): Record<string, number> {
  const normalized = normalizeInputValues(calculator, values);

  if (scenarioId === 'base') {
    return normalized;
  }

  const studio = getCalculatorStudio(calculator);
  const direction = scenarioId === 'optimistic' ? 1 : -1;

  return Object.fromEntries(
    calculator.inputs.map((input) => {
      const current = normalized[input.key] ?? input.defaultValue;
      return [input.key, clampInput(input, adjustInput(input, current, studio, direction))];
    })
  );
}

export function buildCalculatorStudioChart(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult = calculateSeoCalculator(calculator, values)
): CalculatorStudioChart {
  const metadata = getCalculatorStudioMetadata(calculator);

  if (metadata.chartType === 'amortization') {
    return amortizationChart(calculator, values, metadata);
  }

  if (metadata.chartType === 'timeline') {
    return timelineChart(calculator, values, result, metadata);
  }

  if (metadata.chartType === 'waterfall') {
    return waterfallChart(calculator, values, result, metadata);
  }

  return comparisonChart(calculator, values, result, metadata);
}

export function buildCalculatorDetailSchedule(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult = calculateSeoCalculator(calculator, values)
): CalculatorDetailSchedule | null {
  const normalized = normalizeInputValues(calculator, values);

  switch (calculator.formula) {
    case 'amortization':
    case 'fha-loan':
    case 'loan':
    case 'va-loan':
      return loanAmortizationSchedule(calculator, normalized);
    case 'apr':
      return aprBreakdownSchedule(calculator, normalized);
    case 'balloon-loan':
      return balloonLoanSchedule(calculator, normalized);
    case 'balance-transfer':
      return balanceTransferSchedule(calculator, normalized);
    case 'biweekly-loan':
      return biweeklyLoanSchedule(calculator, normalized);
    case 'closing-costs':
      return closingCostSchedule(calculator, normalized);
    case 'compound':
      return recurringGrowthSchedule(normalized, {
        description: 'Annual view of deposits, estimated growth, and projected ending value.',
        principalKey: 'principal',
        recurringKey: 'monthly',
        recurringLabel: 'Annual deposits',
        title: 'Contribution and growth schedule'
      });
    case 'debt-payoff':
      return debtPayoffSchedule(calculator, normalized);
    case 'debt-strategy':
      return debtStrategySchedule(calculator, normalized);
    case 'down-payment':
      return downPaymentSchedule(calculator, normalized);
    case 'dti':
      return dtiBreakdownSchedule(calculator, normalized);
    case 'escrow':
      return escrowBreakdownSchedule(calculator, normalized);
    case 'fha-conventional':
      return fhaConventionalComparisonSchedule(calculator, normalized);
    case 'flat-rate-loan':
      return flatRateComparisonSchedule(calculator, normalized);
    case 'interest-only-loan':
      return interestOnlySchedule(calculator, normalized);
    case 'loan-comparison':
      return loanComparisonSchedule(calculator, normalized);
    case 'loan-eligibility':
      return loanEligibilitySchedule(calculator, normalized);
    case 'loan-prepayment':
      return loanPrepaymentSchedule(calculator, normalized);
    case 'mortgage-recast':
      return mortgageRecastSchedule(calculator, normalized);
    case 'sip':
      return recurringGrowthSchedule(normalized, {
        description: normalized.stepUp > 0
          ? 'Annual view of stepped-up SIP deposits, estimated gains, and projected corpus.'
          : 'Annual view of SIP deposits, estimated gains, and projected corpus.',
        principalKey: null,
        recurringKey: 'monthly',
        recurringLabel: 'Annual SIP',
        stepUpKey: 'stepUp',
        title: normalized.stepUp > 0 ? 'Step-up SIP schedule' : 'SIP contribution schedule'
      });
    case 'savings-goal':
      return savingsGoalSchedule(calculator, normalized, result);
    case 'lumpsum':
    case 'fd':
      return singleDepositGrowthSchedule(calculator, normalized);
    case 'rd':
      return recurringGrowthSchedule(normalized, {
        description: 'Annual view of recurring deposits, estimated interest, and maturity progress.',
        principalKey: null,
        recurringKey: 'monthly',
        recurringLabel: 'Annual deposits',
        title: 'Recurring deposit schedule'
      });
    case 'ppf':
      return ppfSchedule(calculator, normalized);
    case 'pmi':
      return pmiCancellationSchedule(calculator, normalized);
    case 'epf':
      return epfSchedule(calculator, normalized);
    case 'nps':
      return npsSchedule(calculator, normalized);
    case 'swp':
      return swpSchedule(calculator, normalized);
    case 'retirement':
      return retirementSchedule(calculator, normalized, result);
    case 'rmd':
      return rmdSchedule(calculator, normalized);
    case 'social-security':
      return socialSecuritySchedule(calculator, normalized);
    case 'stamp-duty':
      return stampDutySchedule(calculator, normalized);
    case 'gratuity':
      return gratuitySchedule(calculator, normalized);
    case 'refinance':
      return refinanceComparisonSchedule(calculator, normalized);
    case 'rent-buy':
      return rentBuySchedule(calculator, normalized);
    case 'investment-return':
      return investmentReturnSchedule(calculator, normalized);
    case 'xirr':
      return xirrApproximationSchedule(calculator, normalized, result);
    case 'inflation':
      return inflationSchedule(calculator, normalized);
    case 'rule-72':
      return doublingSchedule(calculator, normalized);
    default:
      return null;
  }
}

function normalizeInputValues(calculator: SeoCalculator, values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    calculator.inputs.map((input) => {
      const value = Number.isFinite(values[input.key]) ? values[input.key] : input.defaultValue;
      return [input.key, clampInput(input, value)];
    })
  );
}

function adjustInput(
  input: CalculatorInput,
  value: number,
  studio: CalculatorStudio,
  direction: 1 | -1
): number {
  const key = input.key.toLowerCase();
  const label = input.label.toLowerCase();
  const text = `${key} ${label}`;

  if (input.type === 'percent') {
    if (/effective|tax|tds|gst|pmi|fee|apr|interest|rate/.test(text)) {
      const costDirection = riskierRateStudios.has(studio) ? -direction : direction;
      return value + costDirection * Math.max(0.5, value * 0.15);
    }

    return value + direction * Math.max(0.5, value * 0.12);
  }

  if (input.type === 'currency') {
    if (/expense|rent|withdrawal|debt|liabilit|cost|fee|tax/.test(text)) {
      return value * (1 - direction * 0.1);
    }

    if (/payment|contribution|deposit|sip|saving|income|salary|ctc|employee|employer|annual/.test(text)) {
      return value * (1 + direction * 0.12);
    }

    if (/principal|balance|corpus|asset|home price|loan amount|gain|final/.test(text)) {
      return value * (1 + direction * 0.08);
    }
  }

  if (/year|term|tenure|support|delay|period|months|coverage/.test(text)) {
    const step = /month|coverage/.test(text) ? 1 : Math.max(1, Math.round(value * 0.1));
    return value + direction * step;
  }

  return value;
}

function clampInput(input: CalculatorInput, value: number): number {
  const min = input.min ?? 0;
  const max = input.max ?? Number.MAX_SAFE_INTEGER;
  const clamped = Math.max(min, Math.min(max, value));
  return Number(clamped.toFixed(input.type === 'percent' ? 2 : 2));
}

function scenarioLabel(id: CalculatorScenarioId): string {
  if (id === 'conservative') return 'Conservative';
  if (id === 'optimistic') return 'Optimistic';
  return 'Base';
}

function scenarioDescription(calculator: SeoCalculator, id: CalculatorScenarioId): string {
  const studio = getCalculatorStudio(calculator);

  if (id === 'base') {
    return 'Uses the inputs exactly as shown in the calculator.';
  }

  if (studio === 'Loan and Home Studio' || studio === 'Debt Payoff Studio') {
    return id === 'conservative'
      ? 'Pressure-tests higher borrowing costs or slower payoff progress.'
      : 'Tests lower borrowing costs or faster payoff progress.';
  }

  if (studio === 'Income and Tax Studio') {
    return id === 'conservative'
      ? 'Uses a tougher take-home assumption with higher estimated taxes or lower gross cashflow.'
      : 'Uses a stronger take-home assumption with lower estimated taxes or higher gross cashflow.';
  }

  if (studio === 'Cashflow and Balance Sheet Studio') {
    return id === 'conservative'
      ? 'Uses tighter income, higher spending, or larger coverage needs.'
      : 'Uses stronger income, lower spending, or better coverage progress.';
  }

  return id === 'conservative'
    ? 'Uses lower growth or contribution assumptions to pressure-test the result.'
    : 'Uses stronger growth or contribution assumptions to show upside.';
}

function buildCalculatorExample(calculator: SeoCalculator): CalculatorStudioExample {
  const values = Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
  const firstInput = calculator.inputs[0]?.label.toLowerCase() ?? 'main input';
  const secondInput = calculator.inputs[1]?.label.toLowerCase() ?? 'second input';

  return {
    description: `Load a sample ${calculator.title.toLowerCase()} using ${firstInput} and ${secondInput} so the visual, scenarios, and save path can be read together.`,
    insight: exampleInsight(calculator),
    title: `${calculator.title} example`,
    values
  };
}

function exampleInsight(calculator: SeoCalculator): string {
  const route = calculator.conversionRoute;

  if (route === '/goals') {
    return 'Use the example to see how the result can become a tracked goal with a deadline or funding gap.';
  }

  if (route === '/accounts') {
    return 'Use the example to see how the result can become an account, liability, or balance-tracking draft.';
  }

  if (route === '/transactions') {
    return 'Use the example to connect the estimate to monthly cashflow tracking without creating fake transactions.';
  }

  return 'Use the example to see how the estimate can become a saved plan you can compare later.';
}

function relatedCalculatorsFor(
  calculator: SeoCalculator,
  allCalculators: SeoCalculator[]
): CalculatorRelatedRoute[] {
  const studio = getCalculatorStudio(calculator);
  const scored = allCalculators
    .filter((candidate) => candidate.slug !== calculator.slug)
    .map((candidate) => ({
      candidate,
      score:
        (getCalculatorStudio(candidate) === studio ? 10 : 0) +
        (candidate.region === calculator.region ? 3 : 0) +
        (candidate.category === calculator.category ? 2 : 0) +
        (candidate.formula === calculator.formula ? 1 : 0)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.candidate.title.localeCompare(b.candidate.title))
    .slice(0, 4);

  return scored.map(({ candidate }) => ({
    path: calculatorPath(candidate.slug),
    reason: relationReason(calculator, candidate),
    slug: candidate.slug,
    title: candidate.title
  }));
}

function relationReason(current: SeoCalculator, related: SeoCalculator): string {
  if (getCalculatorStudio(current) === getCalculatorStudio(related)) {
    return `Also part of the ${getCalculatorStudio(related).replace(' Studio', '').toLowerCase()} workflow.`;
  }

  if (current.category === related.category) {
    return `Another ${related.category.toLowerCase()} decision to compare next.`;
  }

  return 'A useful next calculator after this estimate.';
}

function timelineChart(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult,
  metadata: CalculatorStudioMetadata
): CalculatorStudioChart {
  const finalValue = Math.max(0, firstCurrencyMetric(result.metrics) ?? Math.abs(result.metrics[0]?.value ?? 0));
  const startingValue = Math.max(0, firstFinite(values, ['principal', 'current', 'currentSavings', 'balance', 'corpus', 'assets', 'income']) ?? 0);
  const years = Math.max(1, Math.round(firstFinite(values, ['years', 'retirementAge', 'delayYears']) ?? 5));
  const totalContributions = Math.max(0, firstFinite(values, ['monthly', 'annual', 'payment', 'employee']) ?? 0) * (calculator.inputs.some((input) => input.key === 'annual') ? years : years * 12);
  const steps = [0, 0.25, 0.5, 0.75, 1];

  return {
    description: metadata.chartDescription,
    entries: steps.map((step) => {
      const label = step === 0 ? 'Start' : `Year ${Math.max(1, Math.round(years * step))}`;
      const primary = interpolate(startingValue, finalValue, step);
      const secondary = totalContributions > 0 ? totalContributions * step : undefined;

      return {
        label,
        note: step === 1 ? 'Projected endpoint' : undefined,
        primary,
        secondary,
        tone: step === 1 ? result.metrics[0]?.tone : 'neutral'
      };
    }),
    legend: {
      primary: 'Projected value',
      secondary: totalContributions > 0 ? 'Contributions/payments' : undefined
    },
    summary: `This ${metadata.chartType} view turns the ${calculator.title.toLowerCase()} into a rough path, not just a single result.`,
    title: metadata.chartTitle,
    type: metadata.chartType
  };
}

function amortizationChart(
  calculator: SeoCalculator,
  values: Record<string, number>,
  metadata: CalculatorStudioMetadata
): CalculatorStudioChart {
  const principal = Math.max(0, firstFinite(values, ['principal', 'balance', 'homePrice']) ?? 0);
  const years = Math.max(1, firstFinite(values, ['years']) ?? 5);
  const rate = Math.max(0, firstFinite(values, ['rate', 'currentRate', 'newRate']) ?? 0) / 100;
  const months = Math.max(1, Math.round(years * 12));
  const payment = loanPayment(principal, rate, years);
  const selectedMonths = Array.from(new Set([0, Math.round(months * 0.25), Math.round(months * 0.5), Math.round(months * 0.75), months]));
  let balance = principal;
  let cumulativeInterest = 0;
  const monthRows = new Map<number, { balance: number; interest: number }>([[0, { balance, interest: 0 }]]);

  for (let month = 1; month <= months; month += 1) {
    const monthlyInterest = balance * rate / 12;
    cumulativeInterest += monthlyInterest;
    balance = Math.max(0, balance + monthlyInterest - payment);

    if (selectedMonths.includes(month)) {
      monthRows.set(month, { balance, interest: cumulativeInterest });
    }
  }

  return {
    description: metadata.chartDescription,
    entries: selectedMonths.map((month) => {
      const row = monthRows.get(month) ?? { balance: 0, interest: cumulativeInterest };

      return {
        label: month === 0 ? 'Start' : `Month ${month}`,
        note: month === months ? 'Final period' : undefined,
        primary: row.balance,
        secondary: row.interest,
        tone: month === months ? 'positive' : 'neutral'
      };
    }),
    legend: {
      primary: 'Remaining balance',
      secondary: 'Cumulative interest'
    },
    summary: `This preview uses the same payment math as the calculator and gives Phase 22 a schedule-ready primitive to expand.`,
    title: metadata.chartTitle,
    type: 'amortization'
  };
}

function waterfallChart(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult,
  metadata: CalculatorStudioMetadata
): CalculatorStudioChart {
  const metrics = result.metrics.slice(0, 5);
  const entries = metrics.map((metric) => ({
    label: metric.label,
    note: metric.description,
    primary: Math.abs(metric.value),
    tone: metric.tone
  }));

  if (entries.length < 3) {
    const inputEntries = calculator.inputs.slice(0, 3).map((input) => ({
      label: input.label,
      note: input.helper,
      primary: Math.abs(values[input.key] ?? input.defaultValue),
      tone: 'neutral' as const
    }));

    entries.push(...inputEntries);
  }

  return {
    description: metadata.chartDescription,
    entries: entries.slice(0, 5),
    legend: {
      primary: 'Amount'
    },
    summary: `This breakdown keeps the ${calculator.title.toLowerCase()} readable by showing the pieces behind the net result.`,
    title: metadata.chartTitle,
    type: 'waterfall'
  };
}

function comparisonChart(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult,
  metadata: CalculatorStudioMetadata
): CalculatorStudioChart {
  const scenarios = buildCalculatorScenarios(calculator, values);

  return {
    description: metadata.chartDescription,
    entries: scenarios.map((scenario) => ({
      label: scenario.label,
      note: scenario.description,
      primary: Math.abs(scenario.result.metrics[0]?.value ?? 0),
      secondary: scenario.id === 'base' ? Math.abs(result.metrics[0]?.value ?? 0) : undefined,
      tone: scenario.id === 'base' ? 'accent' : scenario.id === 'optimistic' ? 'positive' : 'warning'
    })),
    legend: {
      primary: result.metrics[0]?.label ?? 'Headline result',
      secondary: 'Base reference'
    },
    summary: `This comparison shows how the ${calculator.title.toLowerCase()} changes when the main assumptions move.`,
    title: metadata.chartTitle,
    type: 'comparison'
  };
}

const maxScheduleYears = 100;
const maxMonthlyScheduleMonths = 600;

function loanAmortizationSchedule(calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = loanPrincipalForSchedule(calculator, values);
  const years = Math.max(1, values.years ?? 1);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const payment = loanPayment(principal, rate, years);
  const rows = amortizationRows(principal, rate, years, payment);

  return {
    columns: amortizationColumns(),
    description: 'Expandable month-by-month payment schedule with principal, interest, ending balance, and cumulative interest.',
    rows,
    summary: monthlyScheduleCapSummary(years, `Shows ${rows.length} payment rows with the year noted on each row so monthly and yearly payment patterns are visible together.`),
    title: 'Monthly amortization schedule'
  };
}

function aprBreakdownSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const fees = Math.max(0, values.closingCosts ?? 0);
  const years = Math.max(1, values.years ?? 1);
  const noteRate = Math.max(0, values.rate ?? 0) / 100;
  const payment = loanPayment(principal, noteRate, years);
  const netProceeds = Math.max(0, principal - fees);
  const apr = approximateApr(principal, fees, payment, years);

  return lineItemSchedule({
    description: 'Shows how the note rate, finance charges, and net proceeds feed the APR estimate.',
    rows: [
      { amount: principal, id: 'principal', lineItem: 'Loan amount', note: 'Amount used to calculate the stated note payment.', rate: noteRate },
      { amount: fees, id: 'fees', lineItem: 'Finance charges / fees', note: 'Costs subtracted from proceeds for the APR estimate.', rate: null },
      { amount: netProceeds, id: 'net-proceeds', lineItem: 'Net proceeds estimate', note: 'Loan amount after finance charges.', rate: null },
      { amount: payment, id: 'payment', lineItem: 'Monthly payment', note: 'Payment implied by the note rate.', rate: null },
      { amount: null, id: 'apr', lineItem: 'Estimated APR', note: 'Solved rate using net proceeds and the stated payment.', rate: apr }
    ],
    summary: 'This keeps APR from feeling like a black box: the user can see the charges and payment used to solve the estimated rate.',
    title: 'APR calculation breakdown'
  });
}

function balloonLoanSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const years = Math.max(1, values.years ?? 1);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const payment = loanPayment(principal, rate, years);
  const balloonMonths = Math.max(1, Math.round(Math.min(values.balloonYears ?? years, years) * 12));
  const rows = amortizationRows(principal, rate, balloonMonths / 12, payment, balloonMonths);

  return {
    columns: [
      ...amortizationColumns(),
      moneyColumn('balloonDue', 'Balloon due', 'Remaining balance due at the balloon date.')
    ],
    description: 'Payment schedule until the balloon date, with the remaining payoff amount shown on the final row.',
    rows: rows.map((row, index) => ({
      ...row,
      note: index === rows.length - 1 ? 'Balloon payment due after this period' : row.note,
      values: {
        ...row.values,
        balloonDue: index === rows.length - 1 ? row.values.endingBalance : 0
      }
    })),
    summary: monthlyScheduleCapSummary(balloonMonths / 12, 'Shows the payment path to the balloon date and the balance still due at that point.'),
    title: 'Balloon payment schedule'
  };
}

function balanceTransferSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const payment = Math.max(0, values.payment ?? 0);
  const fee = Math.max(0, values.balance ?? 0) * Math.max(0, values.feeRate ?? 0) / 100;
  const current = createDebtState(Math.max(0, values.balance ?? 0), Math.max(0, values.currentRate ?? 0) / 100);
  const transfer = createDebtState(Math.max(0, values.balance ?? 0) + fee, Math.max(0, values.newRate ?? 0) / 100);
  const rows: CalculatorDetailScheduleRow[] = [];

  if (payment <= 0) return null;

  for (let month = 1; month <= maxMonthlyScheduleMonths && (current.balance > 0 || transfer.balance > 0); month += 1) {
    stepDebtState(current, payment);
    stepDebtState(transfer, payment);

    rows.push({
      id: `transfer-month-${month}`,
      values: {
        costSavings: current.interest - (transfer.interest + fee),
        currentBalance: current.balance,
        currentInterest: current.interest,
        month,
        promoBalance: transfer.balance,
        promoCost: transfer.interest + fee
      }
    });

    if ((current.stalled && transfer.stalled) || (current.balance === 0 && transfer.balance === 0)) break;
  }

  return {
    columns: [
      textColumn('month', 'Month'),
      moneyColumn('currentBalance', 'Current balance'),
      moneyColumn('promoBalance', 'Transfer balance'),
      moneyColumn('currentInterest', 'Current interest'),
      moneyColumn('promoCost', 'Transfer cost'),
      moneyColumn('costSavings', 'Savings to date')
    ],
    description: 'Month-by-month comparison of staying with the current APR versus using the transfer offer.',
    rows,
    summary: `Includes the transfer fee in the transfer cost column so the comparison does not hide upfront cost.`,
    title: 'Balance transfer payoff comparison'
  };
}

function biweeklyLoanSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const years = Math.max(1, values.years ?? 1);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const monthlyPayment = loanPayment(principal, rate, years);
  const biweeklyPayment = monthlyPayment / 2;
  const maxPeriods = Math.min(maxMonthlyScheduleMonths * 2, Math.round(years * 26));
  const periodRate = rate / 26;
  let balance = principal;
  let cumulativeInterest = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let period = 1; period <= maxPeriods && balance > 0; period += 1) {
    const interest = balance * periodRate;
    const actualPayment = Math.min(biweeklyPayment, balance + interest);
    const principalPaid = Math.max(0, actualPayment - interest);
    cumulativeInterest += interest;
    balance = Math.max(0, balance + interest - actualPayment);

    rows.push({
      id: `biweekly-${period}`,
      note: period % 26 === 0 || balance === 0 ? `Year ${Math.ceil(period / 26)} close` : undefined,
      values: {
        cumulativeInterest,
        endingBalance: balance,
        interest,
        payment: actualPayment,
        period,
        principalPaid,
        year: Math.ceil(period / 26)
      }
    });
  }

  return {
    columns: [
      textColumn('period', 'Biweekly #'),
      textColumn('year', 'Year'),
      moneyColumn('payment', 'Payment'),
      moneyColumn('principalPaid', 'Principal'),
      moneyColumn('interest', 'Interest'),
      moneyColumn('endingBalance', 'Ending balance'),
      moneyColumn('cumulativeInterest', 'Cumulative interest')
    ],
    description: 'Biweekly payment schedule using twenty-six half-payments per year.',
    rows,
    summary: `Shows how the extra annual payment created by biweekly timing can reduce the balance faster than a standard monthly schedule.`,
    title: 'Biweekly payoff schedule'
  };
}

function closingCostSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const downPayment = Math.max(0, values.downPayment ?? 0);
  const closingRate = Math.max(0, values.rate ?? 0) / 100;
  const closingCosts = homePrice * closingRate;

  return lineItemSchedule({
    description: 'Cash-to-close breakdown from purchase price, down payment, and estimated closing-cost rate.',
    rows: [
      { amount: homePrice, id: 'price', lineItem: 'Home price', note: 'Purchase price used as the base.', rate: null },
      { amount: downPayment, id: 'down-payment', lineItem: 'Down payment', note: 'Cash going toward equity.', rate: null },
      { amount: closingCosts, id: 'closing-costs', lineItem: 'Estimated closing costs', note: 'Percentage-based estimate for fees and prepaids.', rate: closingRate },
      { amount: downPayment + closingCosts, id: 'cash-to-close', lineItem: 'Estimated cash to close', note: 'Down payment plus estimated closing costs.', rate: null }
    ],
    summary: 'The table separates equity cash from transaction costs so the user can see what is saved versus spent.',
    title: 'Cash-to-close breakdown'
  });
}

function debtPayoffSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const balance = Math.max(0, values.balance ?? 0);
  const payment = Math.max(0, values.payment ?? 0);
  const monthlyRate = Math.max(0, values.rate ?? 0) / 100 / 12;
  let currentBalance = balance;
  let cumulativeInterest = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  if (balance <= 0 || payment <= 0) return null;

  for (let month = 1; month <= maxMonthlyScheduleMonths && currentBalance > 0; month += 1) {
    const interest = currentBalance * monthlyRate;
    const actualPayment = Math.min(payment, currentBalance + interest);
    const principalPaid = Math.max(0, actualPayment - interest);
    cumulativeInterest += interest;
    currentBalance = Math.max(0, currentBalance + interest - actualPayment);

    rows.push({
      id: `debt-month-${month}`,
      note: principalPaid <= 0 ? 'Payment does not reduce principal' : month % 12 === 0 || currentBalance === 0 ? `Year ${Math.ceil(month / 12)} close` : undefined,
      values: {
        cumulativeInterest,
        endingBalance: currentBalance,
        interest,
        month,
        payment: actualPayment,
        principalPaid,
        year: Math.ceil(month / 12)
      }
    });

    if (principalPaid <= 0) break;
  }

  return {
    columns: [
      textColumn('month', 'Month'),
      textColumn('year', 'Year'),
      moneyColumn('payment', 'Payment'),
      moneyColumn('principalPaid', 'Principal'),
      moneyColumn('interest', 'Interest'),
      moneyColumn('endingBalance', 'Ending balance'),
      moneyColumn('cumulativeInterest', 'Cumulative interest')
    ],
    description: 'Payoff schedule showing how each payment is split between interest and principal.',
    rows,
    summary: monthlyScheduleCapSummary(rows.length / 12, 'Shows the payoff path and flags when the payment is not enough to reduce principal.'),
    title: 'Debt payoff schedule'
  };
}

function debtStrategySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const snowball = simulateDebtStrategyRows(values, 'snowball');
  const avalanche = simulateDebtStrategyRows(values, 'avalanche');
  const rowCount = Math.max(snowball.length, avalanche.length);

  if (rowCount === 0) return null;

  return {
    columns: [
      textColumn('month', 'Month'),
      moneyColumn('snowballBalance', 'Snowball balance'),
      moneyColumn('avalancheBalance', 'Avalanche balance'),
      moneyColumn('snowballInterest', 'Snowball interest'),
      moneyColumn('avalancheInterest', 'Avalanche interest'),
      moneyColumn('interestSaved', 'Avalanche interest saved')
    ],
    description: 'Month-by-month payoff comparison using separate balances, APRs, minimum payments, and the same extra payoff budget.',
    rows: Array.from({ length: rowCount }, (_, index) => {
      const snowballRow = snowball[Math.min(index, snowball.length - 1)];
      const avalancheRow = avalanche[Math.min(index, avalanche.length - 1)];

      return {
        id: `debt-strategy-${index + 1}`,
        note: snowballRow?.paidOffName || avalancheRow?.paidOffName || (index + 1 === rowCount ? 'All modeled debts paid off' : undefined),
        values: {
          avalancheBalance: avalancheRow?.balance ?? 0,
          avalancheInterest: avalancheRow?.interest ?? 0,
          interestSaved: (snowballRow?.interest ?? 0) - (avalancheRow?.interest ?? 0),
          month: index + 1,
          snowballBalance: snowballRow?.balance ?? 0,
          snowballInterest: snowballRow?.interest ?? 0
        }
      };
    }),
    summary: 'The table shows whether the faster balance win from snowball costs more interest than the avalanche order.',
    title: 'Snowball versus avalanche payoff table'
  };
}

function dtiBreakdownSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const income = Math.max(0, values.income ?? 0);
  const debts = Math.max(0, values.debts ?? 0);
  const payment = Math.max(0, values.payment ?? 0);
  const totalDebt = debts + payment;
  const dti = income > 0 ? totalDebt / income : 0;
  const targetDebt = income * 0.43;

  return lineItemSchedule({
    description: 'Debt-to-income breakdown showing the proposed housing payment together with existing obligations.',
    rows: [
      { amount: income, id: 'income', lineItem: 'Gross monthly income', note: 'Monthly income used for the ratio.', rate: null },
      { amount: debts, id: 'debts', lineItem: 'Existing monthly debts', note: 'Current recurring obligations.', rate: null },
      { amount: payment, id: 'payment', lineItem: 'Proposed payment', note: 'New housing or loan payment being tested.', rate: null },
      { amount: totalDebt, id: 'total-debt', lineItem: 'Total monthly debt', note: 'Existing debts plus proposed payment.', rate: dti },
      { amount: targetDebt - totalDebt, id: 'room', lineItem: 'Room at 43% DTI', note: 'Illustrative remaining room before a common back-end ratio threshold.', rate: null }
    ],
    summary: 'This turns a ratio into the actual monthly dollars causing it.',
    title: 'Debt-to-income breakdown'
  });
}

function downPaymentSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const downPercent = Math.max(0, values.downPercent ?? 0) / 100;
  const downPayment = homePrice * downPercent;
  const loanAmount = Math.max(0, homePrice - downPayment);

  return lineItemSchedule({
    description: 'Down-payment target split from purchase price into cash needed and estimated loan amount.',
    rows: [
      { amount: homePrice, id: 'home-price', lineItem: 'Home price', note: 'Purchase price used for the target.', rate: null },
      { amount: downPayment, id: 'down-payment', lineItem: 'Down payment target', note: 'Cash target from the selected percentage.', rate: downPercent },
      { amount: loanAmount, id: 'loan-amount', lineItem: 'Loan amount before costs', note: 'Estimated financed amount before closing costs and fees.', rate: null }
    ],
    summary: 'The table separates the cash goal from the amount likely financed, making it easier to save or compare loan plans.',
    title: 'Down-payment breakdown'
  });
}

function escrowBreakdownSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const annualTax = Math.max(0, values.homePrice ?? 0) * Math.max(0, values.taxRate ?? 0) / 100;
  const annualInsurance = Math.max(0, values.insurance ?? 0);
  const annualHoa = Math.max(0, values.hoa ?? 0) * 12;

  return lineItemSchedule({
    description: 'Monthly escrow estimate split into property tax, insurance, and HOA-style housing costs.',
    rows: [
      { amount: annualTax / 12, id: 'tax', lineItem: 'Monthly property tax reserve', note: 'Home value multiplied by annual property tax rate, divided by 12.', rate: Math.max(0, values.taxRate ?? 0) / 100 },
      { amount: annualInsurance / 12, id: 'insurance', lineItem: 'Monthly insurance reserve', note: 'Annual insurance premium divided by 12.', rate: null },
      { amount: annualHoa / 12, id: 'hoa', lineItem: 'Monthly HOA dues', note: 'Included as a recurring housing cost when provided.', rate: null },
      { amount: (annualTax + annualInsurance + annualHoa) / 12, id: 'escrow', lineItem: 'Total monthly escrow estimate', note: 'Estimated non-principal-and-interest housing cost.', rate: null }
    ],
    summary: 'Escrow changes over time, so keeping the components visible helps users update the plan later.',
    title: 'Escrow component breakdown'
  });
}

function fhaConventionalComparisonSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const downPayment = Math.max(0, values.downPayment ?? 0);
  const baseLoan = Math.max(0, homePrice - downPayment);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = Math.max(1, values.years ?? 1);
  const fhaFinanced = baseLoan * 1.0175;
  const fhaPayment = loanPayment(fhaFinanced, rate, years) + baseLoan * 0.0055 / 12;
  const conventionalPayment = loanPayment(baseLoan, rate, years) + baseLoan * Math.max(0, values.pmiRate ?? 0) / 100 / 12;

  return {
    columns: [
      textColumn('option', 'Option'),
      moneyColumn('loanAmount', 'Loan amount'),
      moneyColumn('monthlyPayment', 'Monthly payment'),
      moneyColumn('insurance', 'Monthly insurance'),
      moneyColumn('totalPaid', 'Projected payments')
    ],
    description: 'Side-by-side FHA and conventional payment comparison using the same price, down payment, rate, and term.',
    rows: [
      {
        id: 'fha',
        values: {
          insurance: baseLoan * 0.0055 / 12,
          loanAmount: fhaFinanced,
          monthlyPayment: fhaPayment,
          option: 'FHA estimate',
          totalPaid: fhaPayment * years * 12
        }
      },
      {
        id: 'conventional',
        values: {
          insurance: baseLoan * Math.max(0, values.pmiRate ?? 0) / 100 / 12,
          loanAmount: baseLoan,
          monthlyPayment: conventionalPayment,
          option: 'Conventional estimate',
          totalPaid: conventionalPayment * years * 12
        }
      }
    ],
    summary: 'Shows the payment tradeoff without hiding mortgage insurance in the headline number.',
    title: 'FHA versus conventional comparison'
  };
}

function flatRateComparisonSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const years = scheduleYears(values.years ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const months = Math.max(1, years * 12);
  const flatMonthly = (principal + principal * rate * years) / months;
  const reducingPayment = loanPayment(principal, rate, years);
  const reducingRows = amortizationRows(principal, rate, years, reducingPayment);

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('flatPaid', 'Flat-rate paid'),
      moneyColumn('reducingPaid', 'Reducing-balance paid'),
      moneyColumn('reducingBalance', 'Reducing balance'),
      moneyColumn('extraCostToDate', 'Flat extra cost')
    ],
    description: 'Annual comparison of flat-rate payments versus a reducing-balance loan using the same nominal rate.',
    rows: Array.from({ length: years }, (_, index) => {
      const year = index + 1;
      const yearRows = reducingRows.slice(0, year * 12);
      const last = yearRows.at(-1);
      const reducingPaid = reducingPayment * Math.min(year * 12, reducingRows.length);
      const flatPaid = flatMonthly * Math.min(year * 12, months);

      return {
        id: `flat-year-${year}`,
        values: {
          extraCostToDate: flatPaid - reducingPaid,
          flatPaid,
          reducingBalance: Number(last?.values.endingBalance) || 0,
          reducingPaid,
          year
        }
      };
    }),
    summary: 'Flat-rate quotes can be misleading; this table shows the payment cost beside reducing-balance math.',
    title: 'Flat versus reducing-balance schedule'
  };
}

function interestOnlySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const years = scheduleYears(values.years ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const interestOnlyPayment = principal * rate / 12;
  const amortizingPayment = loanPayment(principal, rate, years);
  let amortizingBalance = principal;
  const monthlyRate = rate / 12;

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('interestOnlyPaid', 'Interest-only paid'),
      moneyColumn('principalStillOwed', 'Principal still owed'),
      moneyColumn('amortizingBalance', 'Amortizing balance'),
      moneyColumn('paymentGap', 'Monthly payment gap')
    ],
    description: 'Annual view of interest-only payments compared with the balance path of a normal amortizing loan.',
    rows: Array.from({ length: years }, (_, index) => {
      for (let month = 1; month <= 12; month += 1) {
        amortizingBalance = Math.max(0, amortizingBalance + amortizingBalance * monthlyRate - amortizingPayment);
      }

      return {
        id: `io-year-${index + 1}`,
        values: {
          amortizingBalance,
          interestOnlyPaid: interestOnlyPayment * 12,
          paymentGap: amortizingPayment - interestOnlyPayment,
          principalStillOwed: principal,
          year: index + 1
        }
      };
    }),
    summary: 'The table makes the tradeoff explicit: lower current payment, but principal remains unless separate payments are made.',
    title: 'Interest-only comparison schedule'
  };
}

function loanComparisonSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const optionAYears = Math.max(1, values.compareYears ?? 1);
  const optionBYears = Math.max(1, values.years ?? 1);
  const optionAPayment = loanPayment(principal, Math.max(0, values.currentRate ?? 0) / 100, optionAYears);
  const optionBPayment = loanPayment(principal, Math.max(0, values.newRate ?? 0) / 100, optionBYears);
  const optionARows = amortizationRows(principal, Math.max(0, values.currentRate ?? 0) / 100, optionAYears, optionAPayment);
  const optionBRows = amortizationRows(principal, Math.max(0, values.newRate ?? 0) / 100, optionBYears, optionBPayment);
  const rowCount = Math.max(optionARows.length, optionBRows.length);

  return {
    columns: [
      textColumn('month', 'Month'),
      moneyColumn('optionABalance', 'Option A balance'),
      moneyColumn('optionBBalance', 'Option B balance'),
      moneyColumn('optionAPaid', 'Option A paid'),
      moneyColumn('optionBPaid', 'Option B paid'),
      moneyColumn('paymentDifference', 'Payment difference')
    ],
    description: 'Month-by-month comparison for the two loan options, keeping payment and balance tradeoffs visible.',
    rows: Array.from({ length: rowCount }, (_, index) => ({
      id: `loan-comparison-${index + 1}`,
      values: {
        month: index + 1,
        optionABalance: Number(optionARows[index]?.values.endingBalance) || 0,
        optionBBalance: Number(optionBRows[index]?.values.endingBalance) || 0,
        optionAPaid: Math.min(index + 1, optionARows.length) * optionAPayment,
        optionBPaid: Math.min(index + 1, optionBRows.length) * optionBPayment,
        paymentDifference: (Math.min(index + 1, optionBRows.length) * optionBPayment) - (Math.min(index + 1, optionARows.length) * optionAPayment)
      }
    })),
    summary: monthlyScheduleCapSummary(Math.max(optionAYears, optionBYears), 'Shows payment load and balance path together so a lower payment is not mistaken for lower lifetime cost.'),
    title: 'Loan option comparison table'
  };
}

function loanEligibilitySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const income = Math.max(0, values.income ?? 0);
  const debts = Math.max(0, values.debts ?? 0);
  const maxDti = Math.max(0, values.maxDti ?? 0) / 100;
  const maxEmi = Math.max(0, income * maxDti - debts);
  const eligibleLoan = presentValueFromPayment(maxEmi, Math.max(0, values.rate ?? 0) / 100, Math.max(1, values.years ?? 1));

  return lineItemSchedule({
    description: 'Eligibility breakdown from monthly income to estimated EMI capacity and supported loan amount.',
    rows: [
      { amount: income, id: 'income', lineItem: 'Monthly income', note: 'Gross monthly income used for this estimate.', rate: null },
      { amount: income * maxDti, id: 'target-obligation', lineItem: 'Target obligation capacity', note: 'Income multiplied by the EMI-to-income target.', rate: maxDti },
      { amount: debts, id: 'debts', lineItem: 'Existing obligations', note: 'Existing monthly EMI or debt obligations.', rate: null },
      { amount: maxEmi, id: 'max-emi', lineItem: 'Maximum new EMI', note: 'Estimated room for the new loan payment.', rate: null },
      { amount: eligibleLoan, id: 'eligible-loan', lineItem: 'Eligible loan estimate', note: 'Loan principal supported by the EMI, rate, and tenure.', rate: null }
    ],
    summary: 'This turns a lender-style ratio into the actual payment capacity behind the eligible amount.',
    title: 'Loan eligibility breakdown'
  });
}

function loanPrepaymentSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const prepayment = Math.min(principal, Math.max(0, values.prepayment ?? 0));
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = Math.max(1, values.years ?? 1);
  const payment = loanPayment(principal, rate, years);
  let originalBalance = principal;
  let prepayBalance = Math.max(0, principal - prepayment);
  let originalInterest = 0;
  let prepayInterest = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= maxMonthlyScheduleMonths && (originalBalance > 0 || prepayBalance > 0); month += 1) {
    const original = stepAmortizingBalance(originalBalance, rate, payment);
    const accelerated = stepAmortizingBalance(prepayBalance, rate, payment);
    originalBalance = original.balance;
    prepayBalance = accelerated.balance;
    originalInterest += original.interest;
    prepayInterest += accelerated.interest;

    rows.push({
      id: `prepayment-${month}`,
      note: prepayBalance === 0 && originalBalance > 0 ? 'Prepayment path is paid off' : month % 12 === 0 ? `Year ${Math.ceil(month / 12)} close` : undefined,
      values: {
        interestSaved: originalInterest - prepayInterest,
        month,
        originalBalance,
        prepayBalance,
        year: Math.ceil(month / 12)
      }
    });
  }

  return {
    columns: [
      textColumn('month', 'Month'),
      textColumn('year', 'Year'),
      moneyColumn('originalBalance', 'Original balance'),
      moneyColumn('prepayBalance', 'After prepayment balance'),
      moneyColumn('interestSaved', 'Interest saved')
    ],
    description: 'Compares the original balance path with the balance after applying the prepayment immediately.',
    rows,
    summary: 'The schedule shows when the prepayment path reaches zero and how interest savings accumulate.',
    title: 'Prepayment payoff comparison'
  };
}

function mortgageRecastSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const recastBalance = Math.max(0, principal - Math.max(0, values.prepayment ?? 0));
  const years = Math.max(1, values.years ?? 1);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const oldPayment = loanPayment(principal, rate, years);
  const newPayment = loanPayment(recastBalance, rate, years);
  const originalRows = amortizationRows(principal, rate, years, oldPayment);
  const recastRows = amortizationRows(recastBalance, rate, years, newPayment);
  const rowCount = Math.max(originalRows.length, recastRows.length);

  return {
    columns: [
      textColumn('month', 'Month'),
      moneyColumn('oldPayment', 'Old payment'),
      moneyColumn('newPayment', 'Recast payment'),
      moneyColumn('oldBalance', 'Old balance path'),
      moneyColumn('newBalance', 'Recast balance path'),
      moneyColumn('paymentSavings', 'Payment savings')
    ],
    description: 'Month-by-month comparison of the current payment path and the recast payment path.',
    rows: Array.from({ length: rowCount }, (_, index) => ({
      id: `recast-${index + 1}`,
      values: {
        month: index + 1,
        newBalance: Number(recastRows[index]?.values.endingBalance) || 0,
        newPayment: index < recastRows.length ? newPayment : 0,
        oldBalance: Number(originalRows[index]?.values.endingBalance) || 0,
        oldPayment: index < originalRows.length ? oldPayment : 0,
        paymentSavings: Math.min(index + 1, recastRows.length) * (oldPayment - newPayment)
      }
    })),
    summary: 'Recasting changes the required payment, not the rate; this table separates payment relief from balance reduction.',
    title: 'Mortgage recast comparison table'
  };
}

function pmiCancellationSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const downPayment = Math.max(0, values.downPayment ?? 0);
  const principal = Math.max(0, homePrice - downPayment);
  const pmiRate = Math.max(0, values.rate ?? 0) / 100;
  const mortgageRate = 0.065;
  const payment = loanPayment(principal, mortgageRate, 30);
  const rows: CalculatorDetailScheduleRow[] = [];
  let balance = principal;
  let cumulativePmi = 0;

  for (let year = 1; year <= 30 && balance > homePrice * 0.8; year += 1) {
    for (let month = 1; month <= 12; month += 1) {
      balance = stepAmortizingBalance(balance, mortgageRate, payment).balance;
    }
    const ltv = homePrice > 0 ? balance / homePrice : 0;
    const annualPmi = balance > homePrice * 0.8 ? principal * pmiRate : 0;
    cumulativePmi += annualPmi;
    rows.push({
      id: `pmi-year-${year}`,
      note: ltv <= 0.8 ? 'Approximate PMI cancellation threshold reached' : undefined,
      values: {
        annualPmi,
        balance,
        cumulativePmi,
        ltv,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('balance', 'Estimated balance'),
      percentColumn('ltv', 'Loan-to-value'),
      moneyColumn('annualPmi', 'Annual PMI'),
      moneyColumn('cumulativePmi', 'Cumulative PMI')
    ],
    description: 'Approximate PMI runway using a standard amortizing mortgage assumption to estimate when 80% LTV may be reached.',
    rows,
    summary: 'PMI depends on lender and property rules, but this table shows the balance path behind the cancellation estimate.',
    title: 'PMI cancellation timeline'
  };
}

function refinanceComparisonSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const closingCosts = Math.max(0, values.closingCosts ?? 0);
  const years = Math.max(1, values.years ?? 1);
  const oldRate = Math.max(0, values.currentRate ?? 0) / 100;
  const newRate = Math.max(0, values.newRate ?? 0) / 100;
  const oldPayment = loanPayment(principal, oldRate, years);
  const newPrincipal = principal + closingCosts;
  const newPayment = loanPayment(newPrincipal, newRate, years);
  const oldRows = amortizationRows(principal, oldRate, years, oldPayment);
  const newRows = amortizationRows(newPrincipal, newRate, years, newPayment);
  const monthlySavings = oldPayment - newPayment;
  const rowCount = Math.max(oldRows.length, newRows.length);

  return {
    columns: [
      textColumn('month', 'Month'),
      moneyColumn('oldBalance', 'Current balance'),
      moneyColumn('newBalance', 'New balance'),
      moneyColumn('monthlySavings', 'Monthly savings'),
      moneyColumn('cumulativeSavings', 'Cumulative savings'),
      moneyColumn('netAfterCosts', 'Net after costs')
    ],
    description: 'Refinance comparison showing balances and the month-by-month path to recovering closing costs.',
    rows: Array.from({ length: rowCount }, (_, index) => {
      const cumulativeSavings = monthlySavings * (index + 1);
      return {
        id: `refi-${index + 1}`,
        note: cumulativeSavings >= closingCosts && cumulativeSavings - monthlySavings < closingCosts ? 'Break-even month' : undefined,
        values: {
          cumulativeSavings,
          month: index + 1,
          monthlySavings,
          netAfterCosts: cumulativeSavings - closingCosts,
          newBalance: Number(newRows[index]?.values.endingBalance) || 0,
          oldBalance: Number(oldRows[index]?.values.endingBalance) || 0
        }
      };
    }),
    summary: 'Closing costs are carried in the net column so payment savings are not mistaken for immediate savings.',
    title: 'Refinance break-even schedule'
  };
}

function rentBuySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const years = scheduleYears(values.years ?? 0);
  const rent = Math.max(0, values.rent ?? 0);
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const downPayment = Math.max(0, values.downPayment ?? 0);
  const principal = Math.max(0, homePrice - downPayment);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const payment = loanPayment(principal, rate, Math.max(1, years));
  const rows = amortizationRows(principal, rate, Math.max(1, years), payment);

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('rentPaid', 'Rent paid'),
      moneyColumn('buyPayments', 'Mortgage paid'),
      moneyColumn('ownerEquity', 'Owner equity'),
      moneyColumn('netDifference', 'Equity minus rent paid')
    ],
    description: 'Annual rent-versus-buy view showing rent paid, mortgage payments, and estimated equity from principal paydown.',
    rows: Array.from({ length: years }, (_, index) => {
      const year = index + 1;
      const last = rows[Math.min(rows.length - 1, year * 12 - 1)];
      const balance = Number(last?.values.endingBalance) || 0;
      const ownerEquity = Math.max(0, homePrice - balance);

      return {
        id: `rent-buy-year-${year}`,
        values: {
          buyPayments: payment * Math.min(year * 12, rows.length),
          netDifference: ownerEquity - rent * 12 * year,
          ownerEquity,
          rentPaid: rent * 12 * year,
          year
        }
      };
    }),
    summary: 'This keeps the comparison grounded in cash paid and equity built; taxes, appreciation, maintenance, and selling costs remain future comprehensive inputs.',
    title: 'Rent versus buy annual table'
  };
}

function stampDutySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const homePrice = Math.max(0, values.homePrice ?? 0);
  const stampRate = Math.max(0, values.rate ?? 0) / 100;
  const registrationRate = Math.max(0, values.registrationRate ?? 0) / 100;
  const stampDuty = homePrice * stampRate;
  const registration = homePrice * registrationRate;

  return lineItemSchedule({
    description: 'Property purchase tax estimate split between stamp duty and registration charges.',
    rows: [
      { amount: homePrice, id: 'property-value', lineItem: 'Property value', note: 'Base value used for the estimate.', rate: null },
      { amount: stampDuty, id: 'stamp-duty', lineItem: 'Stamp duty', note: 'Property value multiplied by the stamp duty rate.', rate: stampRate },
      { amount: registration, id: 'registration', lineItem: 'Registration charges', note: 'Property value multiplied by the registration rate.', rate: registrationRate },
      { amount: stampDuty + registration, id: 'total', lineItem: 'Total estimated charges', note: 'Estimated cash needed for these statutory purchase costs.', rate: null }
    ],
    summary: 'The table separates each rate-driven cost so state-specific assumptions can be reviewed later.',
    title: 'Stamp duty and registration breakdown'
  });
}

function recurringGrowthSchedule(
  values: Record<string, number>,
  options: {
    description: string;
    principalKey: string | null;
    recurringKey: string;
    recurringLabel: string;
    stepUpKey?: string;
    title: string;
  }
): CalculatorDetailSchedule | null {
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = rate / 12;
  const startingBalance = options.principalKey ? Math.max(0, values[options.principalKey] ?? 0) : 0;
  let balance = startingBalance;
  let monthlyAmount = Math.max(0, values[options.recurringKey] ?? 0);
  const stepUp = Math.max(0, values[options.stepUpKey ?? ''] ?? 0) / 100;
  let annualDeposits = 0;
  let annualGrowth = 0;
  let cumulativeDeposits = startingBalance;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    if (stepUp > 0 && month > 1 && (month - 1) % 12 === 0) {
      monthlyAmount *= 1 + stepUp;
    }

    const growth = balance * monthlyRate;
    balance += growth + monthlyAmount;
    annualGrowth += growth;
    annualDeposits += monthlyAmount;
    cumulativeDeposits += monthlyAmount;

    if (month % 12 === 0 || month === months) {
      const year = Math.ceil(month / 12);
      rows.push({
        id: `year-${year}`,
        values: {
          balance,
          cumulativeDeposits,
          deposits: annualDeposits,
          growth: annualGrowth,
          year
        }
      });
      annualDeposits = 0;
      annualGrowth = 0;
    }
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('deposits', options.recurringLabel),
      moneyColumn('growth', 'Estimated growth'),
      moneyColumn('cumulativeDeposits', 'Total deposited'),
      moneyColumn('balance', 'Ending value')
    ],
    description: options.description,
    rows,
    summary: scheduleCapSummary(values.years ?? years, `Shows ${rows.length} annual ${rows.length === 1 ? 'row' : 'rows'} so the result is audit-friendly without crowding the main estimate.`),
    title: options.title
  };
}

function savingsGoalSchedule(
  calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult
): CalculatorDetailSchedule | null {
  const target = Math.max(0, values.target ?? 0);
  const monthlyNeeded = Math.max(0, result.metrics[0]?.value ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = rate / 12;
  let balance = Math.max(0, values.current ?? 0);
  let annualDeposits = 0;
  let annualGrowth = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    const growth = balance * monthlyRate;
    balance += growth + monthlyNeeded;
    annualGrowth += growth;
    annualDeposits += monthlyNeeded;

    if (month % 12 === 0 || month === months) {
      const year = Math.ceil(month / 12);
      rows.push({
        id: `goal-year-${year}`,
        values: {
          balance,
          deposits: annualDeposits,
          gap: Math.max(0, target - balance),
          growth: annualGrowth,
          year
        }
      });
      annualDeposits = 0;
      annualGrowth = 0;
    }
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('deposits', 'Savings added'),
      moneyColumn('growth', 'Estimated growth'),
      moneyColumn('balance', 'Projected savings'),
      moneyColumn('gap', 'Remaining gap')
    ],
    description: 'Annual path from current savings to the target using the calculated monthly savings amount.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, `The table keeps the goal math visible: deposits, growth, projected balance, and remaining target gap.`),
    title: 'Goal funding schedule'
  };
}

function singleDepositGrowthSchedule(calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  const rows: CalculatorDetailScheduleRow[] = [];
  let previousBalance = principal;

  for (let year = 1; year <= years; year += 1) {
    const balance = principal * (1 + rate) ** year;
    rows.push({
      id: `deposit-year-${year}`,
      values: {
        balance,
        interest: balance - previousBalance,
        totalInterest: balance - principal,
        year
      }
    });
    previousBalance = balance;
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('interest', 'Year interest'),
      moneyColumn('totalInterest', 'Total interest'),
      moneyColumn('balance', 'Maturity value')
    ],
    description: 'Annual interest and maturity path for a one-time deposit or lumpsum investment.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, `Shows how the single deposit compounds year by year.`),
    title: calculator.formula === 'fd' ? 'Deposit maturity schedule' : 'Lumpsum growth schedule'
  };
}

function ppfSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const annual = Math.max(0, values.annual ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  let balance = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    balance += annual;
    const interest = balance * rate;
    balance += interest;
    rows.push({
      id: `ppf-year-${year}`,
      values: {
        balance,
        contribution: annual,
        interest,
        totalContributions: annual * year,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('contribution', 'Contribution'),
      moneyColumn('interest', 'Estimated interest'),
      moneyColumn('totalContributions', 'Total contributions'),
      moneyColumn('balance', 'Projected balance')
    ],
    description: 'Year-by-year PPF contribution, interest, and balance path using the assumed annual rate.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, 'Shows the lock-in style annual path instead of only the maturity amount.'),
    title: 'PPF yearly schedule'
  };
}

function epfSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const employee = Math.max(0, values.employee ?? 0);
  const employer = Math.max(0, values.employer ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  const months = Math.max(1, years * 12);
  const monthlyRate = rate / 12;
  let balance = 0;
  let annualEmployee = 0;
  let annualEmployer = 0;
  let annualGrowth = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    const monthlyContribution = employee + employer;
    const growth = balance * monthlyRate;
    balance += growth + monthlyContribution;
    annualEmployee += employee;
    annualEmployer += employer;
    annualGrowth += growth;

    if (month % 12 === 0 || month === months) {
      const year = Math.ceil(month / 12);
      rows.push({
        id: `epf-year-${year}`,
        values: {
          balance,
          employee: annualEmployee,
          employer: annualEmployer,
          growth: annualGrowth,
          year
        }
      });
      annualEmployee = 0;
      annualEmployer = 0;
      annualGrowth = 0;
    }
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('employee', 'Employee'),
      moneyColumn('employer', 'Employer'),
      moneyColumn('growth', 'Estimated growth'),
      moneyColumn('balance', 'Projected corpus')
    ],
    description: 'Annual EPF path split between employee contribution, employer contribution, growth, and projected corpus.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, 'Keeps payroll retirement savings visible by year.'),
    title: 'EPF contribution schedule'
  };
}

function npsSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const base = recurringGrowthSchedule(values, {
    description: 'Annual NPS contribution path with projected corpus and the annuity/lump-sum split.',
    principalKey: null,
    recurringKey: 'monthly',
    recurringLabel: 'Annual contribution',
    title: 'NPS contribution schedule'
  });

  if (!base) return null;

  const annuityPercent = Math.max(0, Math.min(100, values.annuityPercent ?? 0)) / 100;
  return {
    ...base,
    columns: [
      ...base.columns,
      moneyColumn('lumpSum', 'Lump sum'),
      moneyColumn('annuity', 'Annuity')
    ],
    rows: base.rows.map((row) => {
      const balance = Number(row.values.balance) || 0;
      return {
        ...row,
        values: {
          ...row.values,
          annuity: balance * annuityPercent,
          lumpSum: balance * (1 - annuityPercent)
        }
      };
    })
  };
}

function swpSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const withdrawal = Math.max(0, values.withdrawal ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const monthlyRate = rate / 12;
  let balance = Math.max(0, values.corpus ?? 0);
  const rows: CalculatorDetailScheduleRow[] = [];
  let annualWithdrawals = 0;
  let annualGrowth = 0;
  let yearStart = balance;

  if (withdrawal <= 0 || balance <= 0) {
    return null;
  }

  for (let month = 1; month <= maxScheduleYears * 12 && balance > 0; month += 1) {
    const growth = balance * monthlyRate;
    balance = Math.max(0, balance + growth - withdrawal);
    annualGrowth += growth;
    annualWithdrawals += withdrawal;

    if (month % 12 === 0 || balance === 0) {
      const year = Math.ceil(month / 12);
      rows.push({
        id: `swp-year-${year}`,
        note: balance === 0 ? 'Corpus depleted in this period' : undefined,
        values: {
          balance,
          growth: annualGrowth,
          startingBalance: yearStart,
          withdrawals: annualWithdrawals,
          year
        }
      });
      yearStart = balance;
      annualGrowth = 0;
      annualWithdrawals = 0;
    }
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('startingBalance', 'Starting balance'),
      moneyColumn('withdrawals', 'Withdrawals'),
      moneyColumn('growth', 'Estimated growth'),
      moneyColumn('balance', 'Ending balance')
    ],
    description: 'Yearly withdrawal runway showing starting balance, withdrawals, growth, and ending balance.',
    rows,
    summary: rows.length >= maxScheduleYears
      ? `Shows the first ${maxScheduleYears} years because the withdrawal appears long-running under these assumptions.`
      : `Shows the annual drawdown path until the corpus is depleted or the modeled period ends.`,
    title: 'Withdrawal runway schedule'
  };
}

function retirementSchedule(
  _calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult
): CalculatorDetailSchedule | null {
  const currentAge = Math.max(0, values.currentAge ?? 0);
  const rawSavingYears = Math.max(0, (values.retirementAge ?? 0) - currentAge);
  const savingYears = scheduleYears(rawSavingYears);
  const currentSavings = Math.max(0, values.currentSavings ?? 0);
  const monthly = Math.max(0, values.monthly ?? 0);
  const annualRate = Math.max(0, values.rate ?? 0) / 100;
  const monthlyRate = annualRate / 12;
  const needed = result.metrics.find((metric) => metric.label === 'Estimated need')?.value ?? 0;
  let contributionBalance = 0;

  if (rawSavingYears <= 0) {
    return {
      columns: [
        textColumn('year', 'Period'),
        textColumn('age', 'Age'),
        moneyColumn('deposits', 'Contributions'),
        moneyColumn('growth', 'Estimated growth'),
        moneyColumn('balance', 'Projected savings'),
        moneyColumn('gap', 'Gap / surplus')
      ],
      description: 'Retirement age has already been reached, so the schedule shows the current corpus position.',
      rows: [{
        id: 'retirement-now',
        values: {
          age: currentAge,
          balance: currentSavings,
          deposits: 0,
          gap: currentSavings - needed,
          growth: 0,
          year: 'Now'
        }
      }],
      summary: 'Shows the current retirement corpus position because there is no remaining accumulation period.',
      title: 'Retirement savings schedule'
    };
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      textColumn('age', 'Age'),
      moneyColumn('deposits', 'Contributions'),
      moneyColumn('growth', 'Estimated growth'),
      moneyColumn('balance', 'Projected savings'),
      moneyColumn('gap', 'Gap / surplus')
    ],
    description: 'Annual retirement savings path from today to the target retirement age.',
    rows: Array.from({ length: savingYears }, (_, index) => {
      const year = index + 1;
      const monthsElapsed = year * 12;
      const previousCurrentSavingsComponent = currentSavings * (1 + annualRate) ** (year - 1);
      const currentSavingsComponent = currentSavings * (1 + annualRate) ** year;
      const previousContributionBalance = contributionBalance;

      for (let month = (year - 1) * 12 + 1; month <= monthsElapsed; month += 1) {
        contributionBalance = contributionBalance * (1 + monthlyRate) + monthly;
      }

      const balance = currentSavingsComponent + contributionBalance;
      const deposits = monthly * 12;
      const growth =
        (currentSavingsComponent - previousCurrentSavingsComponent) +
        (contributionBalance - previousContributionBalance - deposits);

      return {
        id: `retirement-year-${year}`,
        values: {
          age: currentAge + year,
          balance,
          deposits,
          gap: balance - needed,
          growth,
          year
        }
      };
    }),
    summary: scheduleCapSummary(savingYears, 'Shows how contributions and growth build toward the retirement corpus need.'),
    title: 'Retirement savings schedule'
  };
}

function rmdSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  let balance = Math.max(0, values.balance ?? 0);
  const startingDivisor = Math.max(1, values.divisor ?? 1);
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 1; year <= Math.min(10, maxScheduleYears) && balance > 0; year += 1) {
    const divisor = Math.max(1, startingDivisor - (year - 1));
    const distribution = balance / divisor;
    balance = Math.max(0, balance - distribution);
    rows.push({
      id: `rmd-year-${year}`,
      values: {
        balance,
        distribution,
        divisor,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      numberColumn('divisor', 'Divisor'),
      moneyColumn('distribution', 'Distribution'),
      moneyColumn('balance', 'Balance after distribution')
    ],
    description: 'Illustrative RMD schedule using the provided divisor and reducing it by one each year.',
    rows,
    summary: 'Shows the first 10 estimated distributions so the one-year RMD result has retirement-income context.',
    title: 'RMD distribution schedule'
  };
}

function socialSecuritySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const early = Math.max(0, values.early ?? 0);
  const full = Math.max(0, values.full ?? 0);
  const delayYears = Math.max(0, values.delayYears ?? 0);
  const monthlyIncrease = full - early;
  const breakEvenYears = monthlyIncrease > 0 ? early * delayYears / monthlyIncrease : delayYears;
  const years = Math.min(maxScheduleYears, Math.max(1, Math.ceil(delayYears + breakEvenYears + 5)));
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    const earlyCumulative = early * 12 * year;
    const delayedCumulative = full * 12 * Math.max(0, year - delayYears);
    rows.push({
      id: `benefit-year-${year}`,
      note: delayedCumulative >= earlyCumulative && year > delayYears ? 'Delayed claim catches up' : undefined,
      values: {
        difference: delayedCumulative - earlyCumulative,
        delayedCumulative,
        earlyCumulative,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Year after early age'),
      moneyColumn('earlyCumulative', 'Early claim total'),
      moneyColumn('delayedCumulative', 'Delayed claim total'),
      moneyColumn('difference', 'Delayed minus early')
    ],
    description: 'Cumulative benefit comparison for early claiming versus delaying.',
    rows,
    summary: 'Shows where the larger delayed benefit catches up after the years without payments.',
    title: 'Benefit break-even schedule'
  };
}

function gratuitySchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const salary = Math.max(0, values.salary ?? 0);
  const years = scheduleYears(values.years ?? 0);
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    rows.push({
      id: `gratuity-year-${year}`,
      note: year < 5 ? 'Often below common vesting threshold' : undefined,
      values: {
        benefit: salary * 15 / 26 * year,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Completed service'),
      moneyColumn('benefit', 'Estimated gratuity')
    ],
    description: 'Benefit by completed service year using the simplified gratuity estimate.',
    rows,
    summary: 'Shows how the retirement benefit grows with each completed year of service.',
    title: 'Service-year benefit schedule'
  };
}

function investmentReturnSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const initial = Math.max(0, values.initial ?? 0);
  const final = Math.max(0, values.final ?? 0);
  const years = scheduleYears(values.years ?? 0);
  const annualized = years > 0 && initial > 0 ? (final / initial) ** (1 / years) - 1 : 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 0; year <= years; year += 1) {
    const value = year === years ? final : initial * (1 + annualized) ** year;
    rows.push({
      id: `return-year-${year}`,
      values: {
        annualized,
        gain: value - initial,
        value,
        year: year === 0 ? 'Start' : year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Period'),
      moneyColumn('value', 'Implied value'),
      moneyColumn('gain', 'Gain / loss'),
      percentColumn('annualized', 'Annualized return')
    ],
    description: 'Implied annual value path that reconciles starting value, ending value, and elapsed time.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, 'Turns the annualized return into a year-by-year value path.'),
    title: 'Return path table'
  };
}

function xirrApproximationSchedule(
  _calculator: SeoCalculator,
  values: Record<string, number>,
  result: CalculatorResult
): CalculatorDetailSchedule | null {
  const initial = Math.max(0, values.initial ?? 0);
  const monthly = Math.max(0, values.monthly ?? 0);
  const final = Math.max(0, values.final ?? 0);
  const years = scheduleYears(values.years ?? 0);
  const months = Math.max(1, years * 12);
  const annualized = Number.isFinite(result.metrics[0]?.value) ? result.metrics[0].value : 0;
  const monthlyRate = annualized / 12;
  let cumulativeInvested = initial;
  let impliedValue = initial;
  let annualContribution = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= months; month += 1) {
    impliedValue = impliedValue * (1 + monthlyRate) + monthly;
    annualContribution += monthly;
    cumulativeInvested += monthly;

    if (month % 12 === 0 || month === months) {
      const year = Math.ceil(month / 12);
      const endingValue = year === years ? final : impliedValue;
      rows.push({
        id: `xirr-year-${year}`,
        values: {
          contribution: annualContribution,
          cumulativeInvested,
          endingValue,
          gain: endingValue - cumulativeInvested,
          year
        }
      });
      annualContribution = 0;
    }
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('contribution', 'Contributions'),
      moneyColumn('cumulativeInvested', 'Cumulative invested'),
      moneyColumn('endingValue', 'Ending value'),
      moneyColumn('gain', 'Gain / loss')
    ],
    description: 'Cashflow-style annual table for the simplified XIRR estimate until exact dated cashflows are implemented.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, 'Shows why the current XIRR result is approximate: contribution timing is averaged by year.'),
    title: 'Approximate cashflow table'
  };
}

function inflationSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const principal = Math.max(0, values.principal ?? 0);
  const rate = Math.max(0, values.rate ?? 0) / 100;
  const years = scheduleYears(values.years ?? 0);
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let year = 1; year <= years; year += 1) {
    const futureCost = principal * (1 + rate) ** year;
    rows.push({
      id: `inflation-year-${year}`,
      values: {
        increase: futureCost - principal,
        purchasingPower: principal / ((1 + rate) ** year),
        futureCost,
        year
      }
    });
  }

  return {
    columns: [
      textColumn('year', 'Year'),
      moneyColumn('futureCost', 'Future cost'),
      moneyColumn('increase', 'Increase'),
      moneyColumn('purchasingPower', "Today's buying power")
    ],
    description: 'Annual inflation path showing future cost and the purchasing-power pressure behind it.',
    rows,
    summary: scheduleCapSummary(values.years ?? years, 'Shows how inflation compounds over the planning period.'),
    title: 'Inflation path table'
  };
}

function doublingSchedule(_calculator: SeoCalculator, values: Record<string, number>): CalculatorDetailSchedule | null {
  const rate = Math.max(0, values.rate ?? 0);
  const yearsToDouble = rate > 0 ? 72 / rate : 0;
  const rows: CalculatorDetailScheduleRow[] = [0, 0.25, 0.5, 0.75, 1].map((step) => ({
    id: `double-${step}`,
    values: {
      period: step === 0 ? 'Start' : `${Math.round(step * 100)}% of path`,
      ruleYears: yearsToDouble * step,
      valueMultiple: 1 + step
    }
  }));

  return {
    columns: [
      textColumn('period', 'Period'),
      numberColumn('ruleYears', 'Rule years'),
      numberColumn('valueMultiple', 'Approx. value multiple')
    ],
    description: 'Simple milestone table for the Rule of 72 doubling estimate.',
    rows,
    summary: 'Shows the doubling estimate as milestones rather than only one number.',
    title: 'Doubling milestone table'
  };
}

type LineItemRow = {
  amount: number | null;
  id: string;
  lineItem: string;
  note: string;
  rate: number | null;
};

type DebtState = {
  balance: number;
  interest: number;
  rate: number;
  stalled: boolean;
};
type DebtStrategyMode = 'avalanche' | 'snowball';
type StrategyDebt = {
  balance: number;
  minimum: number;
  name: string;
  rate: number;
};
type StrategyRow = {
  balance: number;
  interest: number;
  month: number;
  paidOffName?: string;
};

function amortizationColumns(): CalculatorDetailScheduleColumn[] {
  return [
    textColumn('period', 'Payment #'),
    textColumn('year', 'Year'),
    moneyColumn('payment', 'Payment'),
    moneyColumn('principalPaid', 'Principal'),
    moneyColumn('interest', 'Interest'),
    moneyColumn('endingBalance', 'Ending balance'),
    moneyColumn('cumulativeInterest', 'Cumulative interest')
  ];
}

function amortizationRows(
  principal: number,
  annualRate: number,
  years: number,
  payment: number,
  forcedMonthCap?: number
): CalculatorDetailScheduleRow[] {
  const months = Math.max(1, Math.min(forcedMonthCap ?? maxMonthlyScheduleMonths, Math.round(years * 12), maxMonthlyScheduleMonths));
  let balance = Math.max(0, principal);
  let cumulativeInterest = 0;
  const rows: CalculatorDetailScheduleRow[] = [];

  for (let month = 1; month <= months && balance > 0; month += 1) {
    const step = stepAmortizingBalance(balance, annualRate, payment);
    balance = step.balance;
    cumulativeInterest += step.interest;

    rows.push({
      id: `amortization-${month}`,
      note: balance === 0 ? 'Final payment' : month % 12 === 0 ? `Year ${Math.ceil(month / 12)} close` : undefined,
      values: {
        cumulativeInterest,
        endingBalance: balance,
        interest: step.interest,
        payment: step.payment,
        period: month,
        principalPaid: step.principalPaid,
        year: Math.ceil(month / 12)
      }
    });

    if (step.principalPaid <= 0) break;
  }

  return rows;
}

function stepAmortizingBalance(
  balance: number,
  annualRate: number,
  payment: number
): { balance: number; interest: number; payment: number; principalPaid: number } {
  if (balance <= 0) {
    return { balance: 0, interest: 0, payment: 0, principalPaid: 0 };
  }

  const interest = balance * annualRate / 12;
  const actualPayment = Math.min(Math.max(0, payment), balance + interest);
  const principalPaid = Math.max(0, actualPayment - interest);

  return {
    balance: Math.max(0, balance + interest - actualPayment),
    interest,
    payment: actualPayment,
    principalPaid
  };
}

function loanPrincipalForSchedule(calculator: SeoCalculator, values: Record<string, number>): number {
  if (calculator.formula === 'fha-loan' || calculator.formula === 'va-loan') {
    const baseLoan = Math.max(0, (values.homePrice ?? 0) - (values.downPayment ?? 0));
    const feeRate = Math.max(0, values.feeRate ?? 0) / 100;
    return baseLoan * (1 + feeRate);
  }

  if (Number.isFinite(values.principal)) return Math.max(0, values.principal);
  if (Number.isFinite(values.balance)) return Math.max(0, values.balance);
  if (Number.isFinite(values.homePrice)) return Math.max(0, (values.homePrice ?? 0) - (values.downPayment ?? 0));

  return 0;
}

function lineItemSchedule(options: {
  description: string;
  rows: LineItemRow[];
  summary: string;
  title: string;
}): CalculatorDetailSchedule {
  return {
    columns: [
      textColumn('lineItem', 'Line item'),
      moneyColumn('amount', 'Amount'),
      percentColumn('rate', 'Rate'),
      textColumn('note', 'Meaning')
    ],
    description: options.description,
    rows: options.rows.map((row) => ({
      id: row.id,
      values: {
        amount: row.amount ?? '',
        lineItem: row.lineItem,
        note: row.note,
        rate: row.rate ?? ''
      }
    })),
    summary: options.summary,
    title: options.title
  };
}

function createDebtState(balance: number, annualRate: number): DebtState {
  return {
    balance: Math.max(0, balance),
    interest: 0,
    rate: Math.max(0, annualRate),
    stalled: false
  };
}

function stepDebtState(state: DebtState, payment: number): void {
  if (state.balance <= 0) {
    state.balance = 0;
    return;
  }

  const interest = state.balance * state.rate / 12;
  const actualPayment = Math.min(Math.max(0, payment), state.balance + interest);
  const principalPaid = Math.max(0, actualPayment - interest);
  state.interest += interest;
  state.balance = Math.max(0, state.balance + interest - actualPayment);
  state.stalled = principalPaid <= 0 && state.balance > 0;
}

function simulateDebtStrategyRows(values: Record<string, number>, strategy: DebtStrategyMode): StrategyRow[] {
  const debts = strategyDebts(values);
  const monthlyBudget = debts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0, values.extraPayment ?? 0);
  const rows: StrategyRow[] = [];
  let cumulativeInterest = 0;

  if (debts.length === 0 || monthlyBudget <= 0) return rows;

  for (let month = 1; month <= maxMonthlyScheduleMonths && debts.some((debt) => debt.balance > 0); month += 1) {
    const paidOffThisMonth: string[] = [];

    debts.forEach((debt) => {
      if (debt.balance <= 0) return;
      const interest = debt.balance * debt.rate / 12;
      debt.balance += interest;
      cumulativeInterest += interest;
    });

    let remainingBudget = monthlyBudget;
    debts.forEach((debt) => {
      if (debt.balance <= 0) return;
      const payment = Math.min(debt.minimum, debt.balance, remainingBudget);
      debt.balance = Math.max(0, debt.balance - payment);
      remainingBudget -= payment;
      if (debt.balance === 0) paidOffThisMonth.push(debt.name);
    });

    while (remainingBudget > 0.005 && debts.some((debt) => debt.balance > 0)) {
      const target = selectStrategyDebt(debts, strategy);
      if (!target) break;
      const payment = Math.min(target.balance, remainingBudget);
      target.balance = Math.max(0, target.balance - payment);
      remainingBudget -= payment;
      if (target.balance === 0) paidOffThisMonth.push(target.name);
    }

    rows.push({
      balance: debts.reduce((sum, debt) => sum + debt.balance, 0),
      interest: cumulativeInterest,
      month,
      paidOffName: paidOffThisMonth.length > 0 ? `${paidOffThisMonth.join(', ')} paid off` : undefined
    });
  }

  return rows;
}

function strategyDebts(values: Record<string, number>): StrategyDebt[] {
  return [
    { balance: values.debt1Balance ?? 0, minimum: values.debt1Minimum ?? 0, name: 'Credit card', rate: (values.debt1Rate ?? 0) / 100 },
    { balance: values.debt2Balance ?? 0, minimum: values.debt2Minimum ?? 0, name: 'Auto loan', rate: (values.debt2Rate ?? 0) / 100 },
    { balance: values.debt3Balance ?? 0, minimum: values.debt3Minimum ?? 0, name: 'Student loan', rate: (values.debt3Rate ?? 0) / 100 }
  ].filter((debt) => debt.balance > 0);
}

function selectStrategyDebt(debts: StrategyDebt[], strategy: DebtStrategyMode): StrategyDebt | null {
  const activeDebts = debts.filter((debt) => debt.balance > 0);
  if (activeDebts.length === 0) return null;

  return activeDebts.sort((a, b) => (
    strategy === 'avalanche'
      ? b.rate - a.rate || a.balance - b.balance
      : a.balance - b.balance || b.rate - a.rate
  ))[0];
}

function presentValueFromPayment(payment: number, annualRate: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 12;

  return monthlyRate === 0
    ? payment * months
    : payment * (1 - (1 + monthlyRate) ** -months) / monthlyRate;
}

function approximateApr(principal: number, fees: number, payment: number, years: number): number {
  if (principal <= 0 || payment <= 0 || years <= 0) return 0;

  const netProceeds = Math.max(1, principal - Math.max(0, fees));
  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 60; iteration += 1) {
    const midpoint = (low + high) / 2;
    const midpointPayment = loanPayment(netProceeds, midpoint, years);

    if (midpointPayment > payment) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return (low + high) / 2;
}

function monthlyScheduleCapSummary(years: number, summary: string): string {
  if (Number.isFinite(years) && years * 12 > maxMonthlyScheduleMonths) {
    return `${summary} Table is capped at the first ${maxMonthlyScheduleMonths} payments to keep the page responsive.`;
  }

  return summary;
}

function scheduleYears(value: number): number {
  return Math.max(1, Math.min(maxScheduleYears, Math.ceil(Number.isFinite(value) ? value : 1)));
}

function scheduleCapSummary(originalYears: number, summary: string): string {
  if (Number.isFinite(originalYears) && originalYears > maxScheduleYears) {
    return `${summary} Table is capped at the first ${maxScheduleYears} years to keep the page responsive.`;
  }

  return summary;
}

function textColumn(key: string, label: string, description?: string): CalculatorDetailScheduleColumn {
  return { description, key, label, valueType: 'text' };
}

function moneyColumn(key: string, label: string, description?: string): CalculatorDetailScheduleColumn {
  return { description, key, label, valueType: 'currency' };
}

function numberColumn(key: string, label: string, description?: string): CalculatorDetailScheduleColumn {
  return { description, key, label, valueType: 'number' };
}

function percentColumn(key: string, label: string, description?: string): CalculatorDetailScheduleColumn {
  return { description, key, label, valueType: 'percent' };
}

function firstFinite(values: Record<string, number>, keys: string[]): number | null {
  for (const key of keys) {
    if (Number.isFinite(values[key])) {
      return values[key];
    }
  }

  return null;
}

function firstCurrencyMetric(metrics: CalculatorMetric[]): number | null {
  const metric = metrics.find((item) => item.valueType === 'currency' && Number.isFinite(item.value));
  return metric?.value ?? null;
}

function interpolate(start: number, end: number, ratio: number): number {
  const eased = ratio * ratio * (3 - 2 * ratio);
  return start + (end - start) * eased;
}

function loanPayment(principal: number, annualRate: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 12;

  return monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
}
