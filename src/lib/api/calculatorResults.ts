import type { CalculatorSaveRequest } from '../../CalculatorLibrary';
import { authenticatedJsonRequest, isRecord, type SignedInAuth } from './client';

export type SavedCalculatorDestinationType = 'account' | 'goal' | 'plan' | 'transaction';
export type SavedCalculatorCreatedEntityType = SavedCalculatorDestinationType;

export type SavedCalculatorMetric = {
  description?: string;
  label: string;
  tone?: string;
  value: number;
  valueType: 'currency' | 'number' | 'percent' | 'years';
};

export type SavedCalculatorResultSnapshot = {
  assumptions: string[];
  metrics: SavedCalculatorMetric[];
  narrative: string;
};

export type SavedCalculatorResult = {
  calculatorCategory: string;
  calculatorRegion: string;
  calculatorSlug: string;
  calculatorTitle: string;
  conversionLabel: string;
  conversionRoute: '/accounts' | '/goals' | '/plans' | '/transactions';
  createdAt: string;
  createdEntityId: string | null;
  createdEntityType: SavedCalculatorCreatedEntityType | null;
  currency: string;
  destinationType: SavedCalculatorDestinationType;
  id: string;
  idempotencyKey?: string | null;
  inputValues: Record<string, number>;
  payloadHash?: string | null;
  result: SavedCalculatorResultSnapshot;
  updatedAt: string;
};

export type CalculatorSaveApiResponse = {
  createdEntity: {
    entity: unknown;
    id: string;
    route: '/accounts' | '/goals' | '/plans';
    type: 'account' | 'goal' | 'plan';
  } | null;
  savedResult: SavedCalculatorResult;
  saveStatus?: 'committed-save' | 'retry';
};

export function isSavedCalculatorDestinationType(value: unknown): value is SavedCalculatorDestinationType {
  return value === 'account' || value === 'goal' || value === 'plan' || value === 'transaction';
}

export function isSavedCalculatorCreatedEntityType(value: unknown): value is SavedCalculatorCreatedEntityType {
  return isSavedCalculatorDestinationType(value);
}

export function isCalculatorConversionRoute(value: unknown): value is SavedCalculatorResult['conversionRoute'] {
  return value === '/accounts' || value === '/goals' || value === '/plans' || value === '/transactions';
}

export function isSavedMetricValueType(value: unknown): value is SavedCalculatorMetric['valueType'] {
  return value === 'currency' || value === 'number' || value === 'percent' || value === 'years';
}

export function isNumberRecord(value: unknown): value is Record<string, number> {
  return isRecord(value) && Object.values(value).every((item) => typeof item === 'number');
}

export function calculatorDestinationLabel(value: SavedCalculatorDestinationType): string {
  if (value === 'account') return 'Account draft';
  if (value === 'goal') return 'Goal draft';
  if (value === 'plan') return 'Plan draft';
  return 'Cashflow draft';
}

export function toSavedCalculatorMetric(value: unknown): SavedCalculatorMetric | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.label !== 'string' ||
    typeof value.value !== 'number' ||
    !isSavedMetricValueType(value.valueType)
  ) {
    return null;
  }

  return {
    description: typeof value.description === 'string' ? value.description : undefined,
    label: value.label,
    tone: typeof value.tone === 'string' ? value.tone : undefined,
    value: value.value,
    valueType: value.valueType
  };
}

export function toSavedCalculatorResultSnapshot(value: unknown): SavedCalculatorResultSnapshot | null {
  if (!isRecord(value) || typeof value.narrative !== 'string' || !Array.isArray(value.metrics)) {
    return null;
  }

  const metrics = value.metrics
    .map(toSavedCalculatorMetric)
    .filter((metric): metric is SavedCalculatorMetric => Boolean(metric));

  if (metrics.length === 0) {
    return null;
  }

  return {
    assumptions: Array.isArray(value.assumptions)
      ? value.assumptions.filter((assumption): assumption is string => typeof assumption === 'string')
      : [],
    metrics,
    narrative: value.narrative
  };
}

export function toSavedCalculatorResult(value: unknown): SavedCalculatorResult | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.calculatorSlug !== 'string' ||
    typeof value.calculatorTitle !== 'string' ||
    typeof value.calculatorCategory !== 'string' ||
    typeof value.calculatorRegion !== 'string' ||
    typeof value.currency !== 'string' ||
    !isSavedCalculatorDestinationType(value.destinationType) ||
    !isCalculatorConversionRoute(value.conversionRoute) ||
    typeof value.conversionLabel !== 'string' ||
    (typeof value.createdEntityType !== 'string' && value.createdEntityType !== null) ||
    (typeof value.createdEntityId !== 'string' && value.createdEntityId !== null) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string' ||
    !isNumberRecord(value.inputValues)
  ) {
    return null;
  }

  const result = toSavedCalculatorResultSnapshot(value.result);

  if (!result) {
    return null;
  }

  return {
    calculatorCategory: value.calculatorCategory,
    calculatorRegion: value.calculatorRegion,
    calculatorSlug: value.calculatorSlug,
    calculatorTitle: value.calculatorTitle,
    conversionLabel: value.conversionLabel,
    conversionRoute: value.conversionRoute,
    createdAt: value.createdAt,
    createdEntityId: value.createdEntityId,
    createdEntityType: isSavedCalculatorCreatedEntityType(value.createdEntityType) ? value.createdEntityType : null,
    currency: value.currency,
    destinationType: value.destinationType,
    id: value.id,
    idempotencyKey: typeof value.idempotencyKey === 'string' ? value.idempotencyKey : null,
    inputValues: value.inputValues,
    payloadHash: typeof value.payloadHash === 'string' ? value.payloadHash : null,
    result,
    updatedAt: value.updatedAt
  };
}

export function toCalculatorCreatedEntity(value: unknown): CalculatorSaveApiResponse['createdEntity'] {
  if (!isRecord(value)) {
    return null;
  }

  if (
    (value.type !== 'account' && value.type !== 'goal' && value.type !== 'plan') ||
    (value.route !== '/accounts' && value.route !== '/goals' && value.route !== '/plans') ||
    typeof value.id !== 'string'
  ) {
    return null;
  }

  return {
    entity: value.entity,
    id: value.id,
    route: value.route,
    type: value.type
  };
}

export function calculatorSaveMessage(saved: CalculatorSaveApiResponse): string {
  const area = saved.savedResult.destinationType === 'transaction'
    ? 'cashflow draft'
    : calculatorDestinationLabel(saved.savedResult.destinationType).toLowerCase();

  if (saved.createdEntity) {
    return `${saved.savedResult.calculatorTitle} saved and ${area} created.`;
  }

  return `${saved.savedResult.calculatorTitle} saved as a ${area}.`;
}

export async function loadSavedCalculatorResults(
  auth: SignedInAuth
): Promise<SavedCalculatorResult[]> {
  const response = await authenticatedJsonRequest(auth, '/api/calculator-results');

  if (!response.ok) {
    throw new Error('Unable to load saved calculator results.');
  }

  const body: unknown = await response.json().catch(() => null);

  return isRecord(body) && Array.isArray(body.calculatorResults)
    ? body.calculatorResults
        .map(toSavedCalculatorResult)
        .filter((item): item is SavedCalculatorResult => Boolean(item))
        .slice(0, 12)
    : [];
}

export async function createCalculatorResultRecord(
  auth: SignedInAuth,
  request: CalculatorSaveRequest,
  idempotencyKey?: string
): Promise<CalculatorSaveApiResponse> {
  const resolvedKey = idempotencyKey || crypto.randomUUID();
  const response = await authenticatedJsonRequest(auth, '/api/calculator-results', {
    body: JSON.stringify({
      calculatorCategory: request.calculator.category,
      calculatorRegion: request.calculator.region,
      calculatorSlug: request.calculator.slug,
      calculatorTitle: request.calculator.title,
      conversionLabel: request.calculator.conversionLabel,
      conversionRoute: request.calculator.conversionRoute,
      currency: request.currency,
      idempotencyKey: resolvedKey,
      inputValues: request.values,
      result: request.result
    }),
    headers: {
      'Idempotency-Key': resolvedKey
    },
    method: 'POST'
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Unable to save calculator result.');
  }

  const savedResult = isRecord(body) ? toSavedCalculatorResult(body.savedResult) : null;

  if (!savedResult) {
    throw new Error('Saved calculator result was not recognized.');
  }

  return {
    createdEntity: toCalculatorCreatedEntity(isRecord(body) ? body.createdEntity : null),
    savedResult,
    saveStatus: isRecord(body) && (body.saveStatus === 'retry' || body.saveStatus === 'committed-save') ? body.saveStatus : undefined
  };
}
