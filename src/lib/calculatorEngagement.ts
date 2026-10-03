import { calculatorRawValues } from './calculatorInputState';
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
  rawValues: Record<string, string>;
  scenarioId: CalculatorScenarioId;
  values: Record<string, number>;
};

export function buildCalculatorInputImpacts(
  calculator: SeoCalculator,
  values: Record<string, number>
): CalculatorInputImpact[] {
  const normalized = normalizeValues(calculator, values);
  const baseResult = calculateSeoCalculator(calculator, normalized);
  const baseOutput = primaryOutput(baseResult);

  return calculator.inputs
    .map((input) => inputImpact(calculator, normalized, input, baseOutput, baseResult))
    .filter((impact): impact is CalculatorInputImpact => impact !== null)
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
  const record = Object.fromEntries(calculator.inputs.map(input => [input.key, params.get(input.key) ?? undefined]));
  const rawValues = calculatorRawValues(calculator, record);
  const values = Object.fromEntries(calculator.inputs.map(input => [input.key, rawValues[input.key].trim() ? Number(rawValues[input.key]) : Number.NaN]));
  return { scenarioId, values, rawValues };
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
    if (scenario.result.modelVersion) {
      rows.push(['Interpretation', scenario.label, 'Meaning of this result', scenario.result.narrative, 'text']);
      rows.push(['Model', scenario.label, 'Model version', scenario.result.modelVersion, 'text']);
    }
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
  baseOutput: number,
  baseResult: CalculatorResult
): CalculatorInputImpact | null {
  const current = values[input.key] ?? input.defaultValue;
  const change = Math.max(Math.abs(current) * 0.1, Math.abs(input.defaultValue) * 0.1, minimumTestChange(input));
  const lowerInput = clampInput(input, current - change);
  const higherInput = clampInput(input, current + change);
  const lowerResult = calculateSeoCalculator(calculator, { ...values, [input.key]: lowerInput });
  const higherResult = calculateSeoCalculator(calculator, { ...values, [input.key]: higherInput });
  // A state transition can replace years with money. Those values cannot be subtracted.
  if ([lowerResult, higherResult].some(r => r.metrics[0]?.label !== baseResult.metrics[0]?.label || r.metrics[0]?.valueType !== baseResult.metrics[0]?.valueType)) return null;
  const lowerOutput = primaryOutput(lowerResult);
  const higherOutput = primaryOutput(higherResult);
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
      : `A higher ${lowerKeepingAcronyms(input.label)} ${direction} the headline result when other inputs stay fixed.`
  };
}

// Keeps acronyms such as APY or APR readable mid-sentence.
function lowerKeepingAcronyms(label: string): string {
  return label.split(' ').map((word) => (/[A-Z]{2,}/.test(word) ? word : word.toLowerCase())).join(' ');
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
