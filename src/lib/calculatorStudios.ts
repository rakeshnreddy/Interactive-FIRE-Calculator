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
