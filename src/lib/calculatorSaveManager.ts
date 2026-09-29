import type { CalculatorSaveRequest } from '../CalculatorLibrary';

export type CalculatorSaveNetworkExecutor<TAuth, TResponse> = (
  auth: TAuth,
  request: CalculatorSaveRequest,
  idempotencyKey: string
) => Promise<TResponse>;

export type PendingSaveOperation = {
  idempotencyKey: string;
  inFlight: boolean;
  requestSnapshot: CalculatorSaveRequest;
  userId: string;
};

export function areCalculatorSaveRequestsEqual(
  a: CalculatorSaveRequest,
  b: CalculatorSaveRequest
): boolean {
  if (
    a.calculator.slug !== b.calculator.slug ||
    a.calculator.conversionRoute !== b.calculator.conversionRoute ||
    a.currency !== b.currency
  ) {
    return false;
  }

  const aKeys = Object.keys(a.values).sort();
  const bKeys = Object.keys(b.values).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    const key = aKeys[i];
    if (key !== bKeys[i] || a.values[key] !== b.values[key]) {
      return false;
    }
  }

  if (a.result.narrative !== b.result.narrative) return false;
  if (a.result.metrics.length !== b.result.metrics.length) return false;
  for (let i = 0; i < a.result.metrics.length; i++) {
    const am = a.result.metrics[i];
    const bm = b.result.metrics[i];
    if (
      am.label !== bm.label ||
      am.value !== bm.value ||
      am.valueType !== bm.valueType ||
      am.tone !== bm.tone ||
      am.description !== bm.description
    ) {
      return false;
    }
  }

  if (a.result.assumptions.length !== b.result.assumptions.length) return false;
  for (let i = 0; i < a.result.assumptions.length; i++) {
    if (a.result.assumptions[i] !== b.result.assumptions[i]) return false;
  }

  return true;
}

export function cloneCalculatorSaveRequest(request: CalculatorSaveRequest): CalculatorSaveRequest {
  return {
    calculator: request.calculator,
    currency: request.currency,
    result: {
      assumptions: [...request.result.assumptions],
      metrics: request.result.metrics.map((m) => ({ ...m })),
      narrative: request.result.narrative
    },
    values: { ...request.values }
  };
}

export class CalculatorSaveCoordinator<TAuth, TResponse> {
  private pending: (PendingSaveOperation & { promise?: Promise<TResponse> }) | null = null;
  private readonly getUserId: (auth: TAuth) => string;

  constructor(getUserId: (auth: TAuth) => string) {
    this.getUserId = getUserId;
  }

  public getPendingOperation(): PendingSaveOperation | null {
    if (!this.pending) return null;
    return {
      idempotencyKey: this.pending.idempotencyKey,
      inFlight: this.pending.inFlight,
      requestSnapshot: this.pending.requestSnapshot,
      userId: this.pending.userId
    };
  }

  public clear(): void {
    this.pending = null;
  }

  public handleAccountTransition(newUserId: string | null): void {
    if (!this.pending) return;
    if (!newUserId || this.pending.userId !== newUserId) {
      this.clear();
    }
  }

  public async executeSave(
    auth: TAuth,
    request: CalculatorSaveRequest,
    networkExecutor: CalculatorSaveNetworkExecutor<TAuth, TResponse>
  ): Promise<TResponse> {
    const userId = this.getUserId(auth);
    this.handleAccountTransition(userId);

    if (this.pending?.inFlight && this.pending.promise) {
      if (areCalculatorSaveRequestsEqual(request, this.pending.requestSnapshot)) {
        return this.pending.promise;
      }
      throw new Error('Another save operation is currently in progress.');
    }

    let idempotencyKey: string;
    let requestSnapshot: CalculatorSaveRequest;

    if (this.pending && areCalculatorSaveRequestsEqual(request, this.pending.requestSnapshot)) {
      idempotencyKey = this.pending.idempotencyKey;
      requestSnapshot = this.pending.requestSnapshot;
    } else {
      idempotencyKey = crypto.randomUUID();
      requestSnapshot = cloneCalculatorSaveRequest(request);
    }

    const operation = {
      idempotencyKey,
      inFlight: true,
      promise: undefined as Promise<TResponse> | undefined,
      requestSnapshot,
      userId
    };
    this.pending = operation;

    const executePromise = (async () => {
      try {
        const response = await networkExecutor(auth, requestSnapshot, idempotencyKey);
        if (this.pending === operation) {
          this.pending = null;
        }
        return response;
      } catch (error) {
        if (this.pending === operation) {
          operation.inFlight = false;
          operation.promise = undefined;
        }
        throw error;
      }
    })();

    operation.promise = executePromise;
    return executePromise;
  }
}
