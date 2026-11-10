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
  isPrimaryDriver?: boolean;
  lowerInput: number;
  lowerOutput: number;
  magnitude: number;
  relativeMagnitude: number;
  summary: string;
  targetValueType?: CalculatorResult['metrics'][number]['valueType'];
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

function computeTestChange(
  calculator: SeoCalculator,
  values: Record<string, number>,
  input: CalculatorInput,
  current: number
): number {
  const key = input.key.toLowerCase();

  if (calculator.formula === 'ppf' && key === 'years') {
    return Math.max(1, Math.round(Math.max(Math.abs(current) * 0.1, Math.abs(input.defaultValue) * 0.1, 1)));
  }

  if (/\b(years?|terms?|tenures?)\b/.test(key) && current > 0 && current <= 1) {
    return Math.max(0.25, Number((current * 0.25).toFixed(2)));
  }

  if (input.type === 'percent') {
    if (Math.abs(current) > 1e-9) {
      return Number((Math.abs(current) * 0.1).toFixed(6));
    }
    return Math.max(Math.abs(input.defaultValue) * 0.1, minimumTestChange(input));
  }

  if (input.type === 'currency' && Math.abs(current) <= 1e-9 && Math.abs(input.defaultValue) <= 1e-9) {
    const flowKeys = ['payment', 'monthly', 'debt1minimum', 'rent'];
    const flowInput = calculator.inputs.find(
      (item) => item.type === 'currency' && flowKeys.includes(item.key.toLowerCase()) && (values[item.key] ?? item.defaultValue) > 0
    );
    if (flowInput) {
      const flowVal = values[flowInput.key] ?? flowInput.defaultValue;
      const multiplier = /annual|yearly|topup/i.test(key) ? 1.2 : 0.1;
      return Math.max(50, Math.round(flowVal * multiplier));
    }
    const maxCurrency = Math.max(
      0,
      ...calculator.inputs
        .filter((item) => item.type === 'currency')
        .map((item) => Math.abs(values[item.key] ?? item.defaultValue))
    );
    if (maxCurrency > 0) {
      if (/monthly|hoa|insurance/i.test(key) && !/annual|yearly/i.test(key)) {
        return 50;
      }
      if (/annualtaxes|annualinsurance/i.test(key)) {
        return 600;
      }
      if (/annual|yearly|topup/i.test(key)) {
        return Math.max(100, Math.round(maxCurrency * 0.005));
      }
      return Math.max(100, Math.round(maxCurrency * 0.05));
    }
  }

  return Math.max(Math.abs(current) * 0.1, Math.abs(input.defaultValue) * 0.1, minimumTestChange(input));
}

function inputImpact(
  calculator: SeoCalculator,
  values: Record<string, number>,
  input: CalculatorInput,
  baseOutput: number,
  baseResult: CalculatorResult
): CalculatorInputImpact | null {
  const current = values[input.key] ?? input.defaultValue;
  const change = computeTestChange(calculator, values, input, current);
  const isShortYear = /\b(years?|terms?|tenures?)\b/.test(input.key.toLowerCase()) && current > 0 && current <= 1;
  const lowerInput = isShortYear
    ? Math.max(input.min || 0.25, clampInput(input, Number((current - change).toFixed(6))))
    : clampInput(input, Number((current - change).toFixed(6)));
  const higherInput = clampInput(input, Number((current + change).toFixed(6)));
  const lowerResult = calculateSeoCalculator(calculator, { ...values, [input.key]: lowerInput });
  const higherResult = calculateSeoCalculator(calculator, { ...values, [input.key]: higherInput });
  // A state transition can replace years with money. Those values cannot be subtracted.
  if ([lowerResult, higherResult].some(r => r.metrics[0]?.label !== baseResult.metrics[0]?.label || r.metrics[0]?.valueType !== baseResult.metrics[0]?.valueType)) return null;
  let effectiveBase = baseOutput;
  let lowerOutput = primaryOutput(lowerResult);
  let higherOutput = primaryOutput(higherResult);
  let magnitude = Math.max(Math.abs(lowerOutput - effectiveBase), Math.abs(higherOutput - effectiveBase));
  let direction = directionFrom(effectiveBase, lowerOutput, higherOutput);
  let targetLabel = 'the headline result';
  let isPrimaryDriver = true;
  let targetValueType = baseResult.metrics[0]?.valueType;

  if (magnitude <= 1e-9 && baseResult.metrics.length > 1) {
    const primaryValueType = baseResult.metrics[0]?.valueType;
    const orderedSecondary = [
      ...baseResult.metrics.slice(1).filter((m) => m.valueType === primaryValueType),
      ...baseResult.metrics.slice(1).filter((m) => m.valueType !== primaryValueType)
    ];
    for (const baseMetric of orderedSecondary) {
      const lowerMetric = lowerResult.metrics.find((m) => m.label === baseMetric.label && m.valueType === baseMetric.valueType);
      const higherMetric = higherResult.metrics.find((m) => m.label === baseMetric.label && m.valueType === baseMetric.valueType);
      if (!lowerMetric || !higherMetric) continue;
      const bVal = Number.isFinite(baseMetric.value) ? baseMetric.value : 0;
      const lVal = Number.isFinite(lowerMetric.value) ? lowerMetric.value : 0;
      const hVal = Number.isFinite(higherMetric.value) ? higherMetric.value : 0;
      const m = Math.max(Math.abs(lVal - bVal), Math.abs(hVal - bVal));
      if (m > 1e-9) {
        effectiveBase = bVal;
        lowerOutput = lVal;
        higherOutput = hVal;
        magnitude = m;
        direction = directionFrom(bVal, lVal, hVal);
        targetLabel = lowerKeepingAcronyms(baseMetric.label);
        isPrimaryDriver = false;
        targetValueType = baseMetric.valueType;
        break;
      }
    }
  }

  if (magnitude <= 1e-9) {
    const addedHigherMetric = higherResult.metrics
      .slice(1)
      .find((hm) => !baseResult.metrics.some((bm) => bm.label === hm.label));
    if (addedHigherMetric && Number.isFinite(addedHigherMetric.value)) {
      const bVal = baseOutput;
      const hVal = addedHigherMetric.value;
      const m = Math.abs(hVal - bVal);
      if (m > 1e-9) {
        effectiveBase = bVal;
        lowerOutput = bVal;
        higherOutput = hVal;
        magnitude = m;
        direction = directionFrom(bVal, bVal, hVal);
        targetLabel = lowerKeepingAcronyms(addedHigherMetric.label);
        isPrimaryDriver = false;
        targetValueType = addedHigherMetric.valueType;
      }
    }
  }

  const isRoiLossCost = calculator.formula === 'roi' && (values.gain ?? 0) < 0 && input.key === 'cost';

  return {
    baseOutput: effectiveBase,
    direction,
    higherInput,
    higherOutput,
    inputKey: input.key,
    inputLabel: input.label,
    isPrimaryDriver,
    lowerInput,
    lowerOutput,
    magnitude,
    relativeMagnitude: Math.abs(effectiveBase) > 1e-9 ? magnitude / Math.abs(effectiveBase) : magnitude,
    summary: direction === 'unchanged'
      ? `${input.label} does not change ${targetLabel} inside this test range.`
      : isRoiLossCost
        ? `A higher ${lowerKeepingAcronyms(input.label)} spreads the fixed loss over a larger cost base when other inputs stay fixed.`
        : `A higher ${lowerKeepingAcronyms(input.label)} ${direction} ${targetLabel} when other inputs stay fixed.`,
    targetValueType
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

function directionFrom(base: number, lower: number, higher: number): CalculatorInputImpact['direction'] {
  const higherDiff = higher - base;
  if (Math.abs(higherDiff) > 1e-9) {
    return higherDiff > 0 ? 'raises' : 'lowers';
  }
  const lowerDiff = base - lower;
  if (Math.abs(lowerDiff) > 1e-9) {
    return lowerDiff > 0 ? 'raises' : 'lowers';
  }
  return 'unchanged';
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
