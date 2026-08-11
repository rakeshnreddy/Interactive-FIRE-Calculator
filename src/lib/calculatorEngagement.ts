import {
  calculateSeoCalculator,
  calculatorPath,
  type CalculatorInput,
  type CalculatorResult,
  type SeoCalculator
} from './seoCalculators';
import {
  calculatorScenarioIds,
  type CalculatorScenario,
  type CalculatorScenarioId
} from './calculatorStudios';

export type CalculatorInputImpact = {
  baseOutput: number;
  direction: 'lowers' | 'raises' | 'unchanged';
  higherInput: number;
  higherOutput: number;
  inputKey: string;
  inputLabel: string;
  lowerInput: number;
  lowerOutput: number;
  magnitude: number;
  relativeMagnitude: number;
  summary: string;
};

export type CalculatorShareState = {
  scenarioId: CalculatorScenarioId;
  values: Record<string, number>;
};

export function buildCalculatorInputImpacts(
  calculator: SeoCalculator,
  values: Record<string, number>
): CalculatorInputImpact[] {
  const normalized = normalizeValues(calculator, values);
  const baseOutput = primaryOutput(calculateSeoCalculator(calculator, normalized));

  return calculator.inputs
    .map((input) => inputImpact(calculator, normalized, input, baseOutput))
    .sort((left, right) => right.magnitude - left.magnitude || left.inputLabel.localeCompare(right.inputLabel));
}

export function buildCalculatorShareUrl(
  calculator: SeoCalculator,
  values: Record<string, number>,
  scenarioId: CalculatorScenarioId,
  origin: string
): string {
  const url = new URL(calculatorPath(calculator.slug), origin);
  const normalized = normalizeValues(calculator, values);
  url.searchParams.set('fp', '1');
  url.searchParams.set('scenario', scenarioId);

  calculator.inputs.forEach((input) => {
    url.searchParams.set(input.key, formatShareNumber(normalized[input.key]));
  });

  return url.toString();
}

export function readCalculatorShareState(
  calculator: SeoCalculator,
  search: string
): CalculatorShareState | null {
  const params = new URLSearchParams(search);

  if (params.get('fp') !== '1') return null;

  const scenario = params.get('scenario');
  const scenarioId = calculatorScenarioIds.includes(scenario as CalculatorScenarioId)
    ? scenario as CalculatorScenarioId
    : 'base';
  const values = Object.fromEntries(calculator.inputs.map((input) => {
    const raw = params.get(input.key);
    const parsed = raw === null ? input.defaultValue : Number(raw);
    return [input.key, clampInput(input, Number.isFinite(parsed) ? parsed : input.defaultValue)];
  }));

  return { scenarioId, values };
}

export function buildCalculatorSummaryCsv(
  calculator: SeoCalculator,
  scenarios: CalculatorScenario[],
  selectedScenarioId: CalculatorScenarioId,
  impacts: CalculatorInputImpact[]
): string {
  const rows: string[][] = [['Section', 'Scenario', 'Label', 'Value', 'Unit']];

  scenarios.forEach((scenario) => {
    calculator.inputs.forEach((input) => {
      rows.push(['Input', scenario.label, input.label, String(scenario.values[input.key] ?? 0), inputUnit(input)]);
    });
    scenario.result.metrics.forEach((metric) => {
      rows.push(['Result', scenario.label, metric.label, String(metric.value), metric.valueType]);
    });
  });

  impacts.slice(0, 5).forEach((impact) => {
    rows.push([
      'Outcome driver',
      selectedScenarioId,
      impact.inputLabel,
      String(impact.magnitude),
      'headline result change'
    ]);
  });

  return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
}

function inputImpact(
  calculator: SeoCalculator,
  values: Record<string, number>,
  input: CalculatorInput,
  baseOutput: number
): CalculatorInputImpact {
  const current = values[input.key] ?? input.defaultValue;
  const change = Math.max(Math.abs(current) * 0.1, Math.abs(input.defaultValue) * 0.1, minimumTestChange(input));
  const lowerInput = clampInput(input, current - change);
  const higherInput = clampInput(input, current + change);
  const lowerOutput = outputWithInput(calculator, values, input.key, lowerInput);
  const higherOutput = outputWithInput(calculator, values, input.key, higherInput);
  const magnitude = Math.max(Math.abs(lowerOutput - baseOutput), Math.abs(higherOutput - baseOutput));
  const direction = directionFrom(baseOutput, higherOutput);

  return {
    baseOutput,
    direction,
    higherInput,
    higherOutput,
    inputKey: input.key,
    inputLabel: input.label,
    lowerInput,
    lowerOutput,
    magnitude,
    relativeMagnitude: Math.abs(baseOutput) > 1e-9 ? magnitude / Math.abs(baseOutput) : magnitude,
    summary: direction === 'unchanged'
      ? `${input.label} does not change the headline result inside this test range.`
      : `A higher ${input.label.toLowerCase()} ${direction} the headline result when other inputs stay fixed.`
  };
}

function outputWithInput(
  calculator: SeoCalculator,
  values: Record<string, number>,
  key: string,
  value: number
): number {
  return primaryOutput(calculateSeoCalculator(calculator, { ...values, [key]: value }));
}

function primaryOutput(result: CalculatorResult): number {
  const value = result.metrics[0]?.value ?? 0;
  return Number.isFinite(value) ? value : 0;
}

function directionFrom(base: number, higher: number): CalculatorInputImpact['direction'] {
  const difference = higher - base;
  if (Math.abs(difference) <= 1e-9) return 'unchanged';
  return difference > 0 ? 'raises' : 'lowers';
}

function normalizeValues(calculator: SeoCalculator, values: Record<string, number>): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => {
    const value = values[input.key];
    return [input.key, clampInput(input, Number.isFinite(value) ? value : input.defaultValue)];
  }));
}

function clampInput(input: CalculatorInput, value: number): number {
  return Math.min(input.max ?? Number.POSITIVE_INFINITY, Math.max(input.min ?? 0, value));
}

function minimumTestChange(input: CalculatorInput): number {
  if (input.type === 'percent') return 0.5;
  return 1;
}

function inputUnit(input: CalculatorInput): string {
  if (input.type === 'currency') return 'currency';
  if (input.type === 'percent') return 'percent';
  return input.suffix ?? 'number';
}

function formatShareNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(6)));
}

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}
