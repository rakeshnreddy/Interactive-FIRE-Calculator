import { describe, expect, it, vi } from 'vitest';
import type { CalculatorSaveRequest } from './CalculatorLibrary';
import {
  areCalculatorSaveRequestsEqual,
  CalculatorSaveCoordinator,
  cloneCalculatorSaveRequest
} from './lib/calculatorSaveManager';
import { findSeoCalculator } from './lib/seoCalculators';

type MockAuth = {
  user: { id: string };
};

type MockResponse = {
  savedResult: { id: string };
  saveStatus?: string;
};

function createMockRequest(overrides?: Partial<CalculatorSaveRequest>): CalculatorSaveRequest {
  const calculator = findSeoCalculator('savings-goal')!;
  return {
    calculator,
    currency: 'USD',
    result: {
      assumptions: ['Monthly savings compounded.'],
      metrics: [
        {
          description: 'Required monthly savings',
          label: 'Monthly savings needed',
          value: 250,
          valueType: 'currency'
        }
      ],
      narrative: 'Save $250 each month to reach your target.'
    },
    values: {
      current: 1000,
      target: 10000,
      years: 3
    },
    ...overrides
  };
}

describe('CalculatorSaveCoordinator (R1 Client Idempotency Ownership)', () => {
  it('preserves same idempotency key and snapshot on retry after uncertain failure/lost response', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const auth: MockAuth = { user: { id: 'user_1' } };
    const request = createMockRequest();

    const networkCalls: Array<{ auth: MockAuth; idempotencyKey: string; request: CalculatorSaveRequest }> = [];
    let callCount = 0;

    const mockExecutor = vi.fn(async (calledAuth: MockAuth, req: CalculatorSaveRequest, key: string) => {
      callCount++;
      networkCalls.push({ auth: calledAuth, idempotencyKey: key, request: req });
      if (callCount === 1) {
        // First call: server receives/commits or fails, but response is lost
        throw new Error('Network error: connection reset');
      }
      return {
        savedResult: { id: 'saved_calc_1' },
        saveStatus: 'retry'
      };
    });

    // First attempt fails due to network error
    await expect(coordinator.executeSave(auth, request, mockExecutor)).rejects.toThrow(
      'Network error: connection reset'
    );

    const pendingAfterFailure = coordinator.getPendingOperation();
    expect(pendingAfterFailure).not.toBeNull();
    expect(pendingAfterFailure?.inFlight).toBe(false);
    const initialKey = pendingAfterFailure?.idempotencyKey;
    expect(typeof initialKey).toBe('string');
    expect(initialKey?.length).toBeGreaterThan(10);

    // User retries with the same request
    const retryResult = await coordinator.executeSave(auth, request, mockExecutor);
    expect(retryResult.savedResult.id).toBe('saved_calc_1');

    // Verification of observable request behavior:
    expect(networkCalls).toHaveLength(2);
    // Both calls must use the EXACT same idempotency key
    expect(networkCalls[0].idempotencyKey).toBe(initialKey);
    expect(networkCalls[1].idempotencyKey).toBe(initialKey);
    // Both calls must send an identical request snapshot
    expect(areCalculatorSaveRequestsEqual(networkCalls[0].request, networkCalls[1].request)).toBe(true);

    // Confirmed completion clears pending state
    expect(coordinator.getPendingOperation()).toBeNull();
  });

  it('generates a new idempotency key when user modifies the request before retrying', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const auth: MockAuth = { user: { id: 'user_1' } };
    const request1 = createMockRequest();

    const networkCalls: Array<{ idempotencyKey: string; request: CalculatorSaveRequest }> = [];
    let callCount = 0;

    const mockExecutor = vi.fn(async (_auth: MockAuth, req: CalculatorSaveRequest, key: string) => {
      callCount++;
      networkCalls.push({ idempotencyKey: key, request: req });
      if (callCount === 1) {
        throw new Error('Timeout');
      }
      return { savedResult: { id: 'saved_calc_2' } };
    });

    // First attempt fails
    await expect(coordinator.executeSave(auth, request1, mockExecutor)).rejects.toThrow('Timeout');
    const firstKey = networkCalls[0].idempotencyKey;

    // User changes target amount from 10000 to 25000
    const request2 = createMockRequest({
      values: { ...request1.values, target: 25000 }
    });

    // Second attempt with modified request
    const result = await coordinator.executeSave(auth, request2, mockExecutor);
    expect(result.savedResult.id).toBe('saved_calc_2');

    expect(networkCalls).toHaveLength(2);
    const secondKey = networkCalls[1].idempotencyKey;
    // Old key must NOT be reused when payload changed
    expect(secondKey).not.toBe(firstKey);
    expect(networkCalls[1].request.values.target).toBe(25000);
  });

  it('allows intentional new saves with a fresh idempotency key after a successful save', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const auth: MockAuth = { user: { id: 'user_1' } };
    const request = createMockRequest();

    const networkCalls: Array<{ idempotencyKey: string }> = [];
    const mockExecutor = vi.fn(async (_auth: MockAuth, _req: CalculatorSaveRequest, key: string) => {
      networkCalls.push({ idempotencyKey: key });
      return { savedResult: { id: `res_${networkCalls.length}` } };
    });

    // First save succeeds
    const firstOutcome = await coordinator.executeSave(auth, request, mockExecutor);
    expect(firstOutcome.savedResult.id).toBe('res_1');
    expect(coordinator.getPendingOperation()).toBeNull();

    // User deliberately clicks save again with the exact same request
    const secondOutcome = await coordinator.executeSave(auth, request, mockExecutor);
    expect(secondOutcome.savedResult.id).toBe('res_2');

    expect(networkCalls).toHaveLength(2);
    // Distinct keys generated for intentional consecutive saves
    expect(networkCalls[0].idempotencyKey).not.toBe(networkCalls[1].idempotencyKey);
  });

  it('deduplicates parallel clicks for the same save operation without extra network calls', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const auth: MockAuth = { user: { id: 'user_1' } };
    const request = createMockRequest();

    let resolveInFlight: ((val: MockResponse) => void) | null = null;
    const networkCalls: string[] = [];

    const mockExecutor = vi.fn(async (_auth: MockAuth, _req: CalculatorSaveRequest, key: string) => {
      networkCalls.push(key);
      return new Promise<MockResponse>((resolve) => {
        resolveInFlight = resolve;
      });
    });

    // Start first save
    const promise1 = coordinator.executeSave(auth, request, mockExecutor);
    expect(coordinator.getPendingOperation()?.inFlight).toBe(true);

    // Parallel click while first is in flight
    const promise2 = coordinator.executeSave(auth, request, mockExecutor);

    // Network executor should only be called ONCE
    expect(networkCalls).toHaveLength(1);

    // Resolving the operation resolves both promises
    resolveInFlight!({ savedResult: { id: 'saved_parallel' } });

    const [res1, res2] = await Promise.all([promise1, promise2]);
    expect(res1.savedResult.id).toBe('saved_parallel');
    expect(res2.savedResult.id).toBe('saved_parallel');
    expect(res1).toBe(res2);
    expect(coordinator.getPendingOperation()).toBeNull();
  });

  it('prevents conflicting parallel save when a different request is initiated in flight', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const auth: MockAuth = { user: { id: 'user_1' } };
    const request1 = createMockRequest();
    const request2 = createMockRequest({ values: { current: 500, target: 5000, years: 1 } });

    let resolveInFlight: ((val: MockResponse) => void) | null = null;
    const mockExecutor = vi.fn(async () => {
      return new Promise<MockResponse>((resolve) => {
        resolveInFlight = resolve;
      });
    });

    const promise1 = coordinator.executeSave(auth, request1, mockExecutor);

    // Parallel click with conflicting request throws
    await expect(coordinator.executeSave(auth, request2, mockExecutor)).rejects.toThrow(
      'Another save operation is currently in progress.'
    );

    resolveInFlight!({ savedResult: { id: 'saved_first' } });
    await promise1;
  });

  it('clears pending state and prevents sharing keys across account transitions', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const userAAuth: MockAuth = { user: { id: 'user_A' } };
    const userBAuth: MockAuth = { user: { id: 'user_B' } };
    const request = createMockRequest();

    const networkCalls: Array<{ idempotencyKey: string; userId: string }> = [];

    const mockExecutor = vi.fn(async (auth: MockAuth, _req: CalculatorSaveRequest, key: string) => {
      networkCalls.push({ idempotencyKey: key, userId: auth.user.id });
      if (auth.user.id === 'user_A') {
        throw new Error('User A connection dropped');
      }
      return { savedResult: { id: 'saved_B' } };
    });

    // User A attempt fails
    await expect(coordinator.executeSave(userAAuth, request, mockExecutor)).rejects.toThrow(
      'User A connection dropped'
    );
    expect(coordinator.getPendingOperation()?.userId).toBe('user_A');
    const userAKey = networkCalls[0].idempotencyKey;

    // Account transition to User B
    const userBResult = await coordinator.executeSave(userBAuth, request, mockExecutor);
    expect(userBResult.savedResult.id).toBe('saved_B');

    expect(networkCalls).toHaveLength(2);
    expect(networkCalls[1].userId).toBe('user_B');
    // User B must NOT inherit User A's pending key
    expect(networkCalls[1].idempotencyKey).not.toBe(userAKey);
  });

  it('clears pending operation when user signs out', async () => {
    const coordinator = new CalculatorSaveCoordinator<MockAuth, MockResponse>((auth) => auth.user.id);
    const userAuth: MockAuth = { user: { id: 'user_signed_in' } };
    const request = createMockRequest();

    const mockExecutor = vi.fn(async () => {
      throw new Error('Failed save');
    });

    await expect(coordinator.executeSave(userAuth, request, mockExecutor)).rejects.toThrow('Failed save');
    expect(coordinator.getPendingOperation()).not.toBeNull();

    // User signs out
    coordinator.handleAccountTransition(null);
    expect(coordinator.getPendingOperation()).toBeNull();
  });

  it('asserts observable request wire behavior with createCalculatorResultRecord', async () => {
    const { createCalculatorResultRecord } = await import('./App');
    const realAuth = {
      getToken: async () => 'test_mock_token',
      isConfigured: true as const,
      isSignedIn: true as const,
      provider: 'clerk' as const,
      status: 'signed-in' as const,
      user: { displayName: 'Tester', id: 'user_wire_test' }
    };

    const coordinator = new CalculatorSaveCoordinator<typeof realAuth, any>(
      (auth) => auth.user.id
    );

    const wireCalls: Array<{ body: any; headers: Record<string, string>; url: string }> = [];
    let fetchCount = 0;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async (url: any, init: any) => {
      fetchCount++;
      const headers: Record<string, string> = {};
      new Headers(init?.headers).forEach((value, key) => {
        headers[key] = value;
      });
      const body = init?.body ? JSON.parse(init.body) : null;
      wireCalls.push({ body, headers, url: String(url) });

      if (fetchCount === 1) {
        throw new Error('Network timeout: packet lost after server commit');
      }

      return new Response(
        JSON.stringify({
          saveStatus: 'retry',
          savedResult: {
            calculatorCategory: 'Planning',
            calculatorRegion: 'Global',
            calculatorSlug: 'savings-goal',
            calculatorTitle: 'Savings Goal Calculator',
            conversionLabel: 'Create savings goal',
            conversionRoute: '/goals',
            createdAt: '2026-09-11T00:00:00Z',
            createdEntityId: null,
            createdEntityType: null,
            currency: 'USD',
            destinationType: 'goal',
            id: 'saved_calc_wire',
            inputValues: { current: 1000, target: 10000, years: 3 },
            result: {
              assumptions: [],
              metrics: [{ label: 'Monthly savings needed', value: 250, valueType: 'currency' }],
              narrative: 'Narrative'
            },
            updatedAt: '2026-09-11T00:00:00Z'
          }
        }),
        { headers: { 'content-type': 'application/json' }, status: 200 }
      );
    });

    try {
      const request1 = createMockRequest();

      // First execution fails at network layer
      await expect(
        coordinator.executeSave(realAuth, request1, (auth, req, key) =>
          createCalculatorResultRecord(auth, req, key)
        )
      ).rejects.toThrow('Network timeout');

      expect(wireCalls).toHaveLength(1);
      const firstWireKey = wireCalls[0].headers['idempotency-key'];
      expect(firstWireKey).toBeDefined();
      expect(wireCalls[0].body.idempotencyKey).toBe(firstWireKey);

      // Retry execution with the same request
      const outcome = await coordinator.executeSave(realAuth, request1, (auth, req, key) =>
        createCalculatorResultRecord(auth, req, key)
      );

      expect(outcome.savedResult.id).toBe('saved_calc_wire');
      expect(outcome.saveStatus).toBe('retry');

      expect(wireCalls).toHaveLength(2);
      // Observable verification: header and body idempotencyKey match between attempts
      expect(wireCalls[1].headers['idempotency-key']).toBe(firstWireKey);
      expect(wireCalls[1].body.idempotencyKey).toBe(firstWireKey);
      expect(wireCalls[1].body.inputValues).toEqual(wireCalls[0].body.inputValues);

      // Now create a modified request and save
      const request2 = createMockRequest({ values: { current: 2000, target: 10000, years: 3 } });
      await coordinator.executeSave(realAuth, request2, (auth, req, key) =>
        createCalculatorResultRecord(auth, req, key)
      );

      expect(wireCalls).toHaveLength(3);
      const thirdWireKey = wireCalls[2].headers['idempotency-key'];
      expect(thirdWireKey).toBeDefined();
      expect(thirdWireKey).not.toBe(firstWireKey);
      expect(wireCalls[2].body.idempotencyKey).toBe(thirdWireKey);
      expect(wireCalls[2].body.inputValues.current).toBe(2000);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
