// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1TestHarness, invokeApi, seedTestUser, type D1TestHarness } from './test/d1TestHarness';
import * as sessionModule from '../functions/_lib/session';
import { onRequestPost as createPlan } from '../functions/api/plans/index';
import { onRequestGet as getPlan, onRequestPut as updatePlan } from '../functions/api/plans/[id]';
import { onRequestGet as getPlanVersion } from '../functions/api/plans/[id]/versions/[versionNumber]';
import { buildPlanDeepLink, parsePlanDeepLink } from './lib/navigation';

describe('B10: Exact Saved FIRE Decision Deep Link and Restoration', () => {
  let harness: D1TestHarness;
  const USER_A = 'user_synthetic_A';
  const USER_B = 'user_synthetic_B';

  function asUser(userId: string | null) {
    if (userId === null) {
      vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
        ok: false,
        response: new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        })
      });
    } else {
      vi.spyOn(sessionModule, 'requireClerkAuth').mockResolvedValue({
        ok: true,
        auth: {
          userId,
          sessionId: `sess_${userId}`,
          sessionClaims: { sub: userId }
        } as any
      });
    }
  }

  function createJsonRequest(url: string, method: string, body?: any): Request {
    return new Request(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
  }

  beforeEach(async () => {
    harness = createD1TestHarness();
    await seedTestUser(harness, USER_A, { displayName: 'Alice Planner', defaultCurrency: 'USD' });
    await seedTestUser(harness, USER_B, { displayName: 'Bob Observer', defaultCurrency: 'USD' });
  });

  describe('1. Server-side exact version retrieval and immutability', () => {
    it('creates multiple distinguishable versions and restores exact version assumptions', async () => {
      asUser(USER_A);

      // 1. Create Version 1
      const v1Payload = {
        name: 'Early Retirement Strategy',
        label: 'Base Case 2026',
        notes: 'Initial conservative portfolio and expenses.',
        snapshot: {
          calculatorMode: 'fire-number',
          plan: {
            initialPortfolio: 500000,
            annualExpense: 40000,
            inflationRate: 0.025,
            investmentReturn: 0.07,
            retirementAge: 55,
            lifeExpectancy: 90
          },
          timeline: { currentAge: 35, retirementAge: 55, planEndAge: 90 },
          scenarios: []
        },
        result: {
          fireNumber: 1000000,
          requiredPortfolio: 1000000
        }
      };

      const createRes = await invokeApi(
        createPlan,
        createJsonRequest('http://localhost/api/plans', 'POST', v1Payload),
        { DB: harness.db }
      );
      expect(createRes.status).toBe(201);
      const planId = createRes.body.plan.id;
      expect(createRes.body.plan.versionNumber).toBe(1);

      // 2. Update to create Version 2 with distinct inputs
      const v2Payload = {
        name: 'Early Retirement Strategy',
        label: 'Aggressive Growth 2026',
        notes: 'Higher portfolio contributions and earlier retirement.',
        expectedVersionNumber: 1,
        snapshot: {
          calculatorMode: 'fire-number',
          plan: {
            initialPortfolio: 750000,
            annualExpense: 50000,
            inflationRate: 0.03,
            investmentReturn: 0.08,
            retirementAge: 50,
            lifeExpectancy: 90
          },
          timeline: { currentAge: 35, retirementAge: 50, planEndAge: 90 },
          scenarios: []
        },
        result: {
          fireNumber: 1250000,
          requiredPortfolio: 1250000
        }
      };

      const updateRes = await invokeApi(
        updatePlan,
        createJsonRequest(`http://localhost/api/plans/${planId}`, 'PUT', v2Payload),
        { DB: harness.db },
        { id: planId }
      );
      expect(updateRes.status).toBe(200);
      expect(updateRes.body.plan.versionNumber).toBe(2);

      // 3. Requesting exact Version 1 returns Version 1 assumptions, NOT Version 2
      const getV1Res = await invokeApi(
        getPlanVersion,
        new Request(`http://localhost/api/plans/${planId}/versions/1`),
        { DB: harness.db },
        { id: planId, versionNumber: '1' }
      );
      expect(getV1Res.status).toBe(200);
      expect(getV1Res.body.version.versionNumber).toBe(1);
      expect(getV1Res.body.version.label).toBe('Base Case 2026');
      expect(getV1Res.body.version.notes).toBe('Initial conservative portfolio and expenses.');
      expect(getV1Res.body.version.snapshot.plan.initialPortfolio).toBe(500000);
      expect(getV1Res.body.version.snapshot.plan.annualExpense).toBe(40000);
      expect(getV1Res.body.version.snapshot.plan.retirementAge).toBe(55);

      // 4. Requesting exact Version 2 returns Version 2 assumptions
      const getV2Res = await invokeApi(
        getPlanVersion,
        new Request(`http://localhost/api/plans/${planId}/versions/2`),
        { DB: harness.db },
        { id: planId, versionNumber: '2' }
      );
      expect(getV2Res.status).toBe(200);
      expect(getV2Res.body.version.versionNumber).toBe(2);
      expect(getV2Res.body.version.label).toBe('Aggressive Growth 2026');
      expect(getV2Res.body.version.notes).toBe('Higher portfolio contributions and earlier retirement.');
      expect(getV2Res.body.version.snapshot.plan.initialPortfolio).toBe(750000);
      expect(getV2Res.body.version.snapshot.plan.annualExpense).toBe(50000);
      expect(getV2Res.body.version.snapshot.plan.retirementAge).toBe(50);
    });

    it('rejects foreign user access to plan and historical versions (404 without leakage)', async () => {
      asUser(USER_A);
      const createRes = await invokeApi(
        createPlan,
        createJsonRequest('http://localhost/api/plans', 'POST', {
          name: 'Private Plan A',
          snapshot: {
            plan: { initialPortfolio: 100000 },
            timeline: { currentAge: 30, retirementAge: 50, planEndAge: 90 },
            scenarios: []
          },
          result: {}
        }),
        { DB: harness.db }
      );
      expect(createRes.status).toBe(201);
      const planAId = createRes.body.plan.id;

      // User B attempts to access User A's plan
      asUser(USER_B);
      const foreignPlanRes = await invokeApi(
        getPlan,
        new Request(`http://localhost/api/plans/${planAId}`),
        { DB: harness.db },
        { id: planAId }
      );
      expect(foreignPlanRes.status).toBe(404);
      expect(foreignPlanRes.body.error).toMatch(/not found/i);

      // User B attempts to access User A's version 1
      const foreignVerRes = await invokeApi(
        getPlanVersion,
        new Request(`http://localhost/api/plans/${planAId}/versions/1`),
        { DB: harness.db },
        { id: planAId, versionNumber: '1' }
      );
      expect(foreignVerRes.status).toBe(404);
      expect(foreignVerRes.body.error).toMatch(/not found/i);
    });

    it('returns 404 for non-existent version without falling back to latest', async () => {
      asUser(USER_A);
      const createRes = await invokeApi(
        createPlan,
        createJsonRequest('http://localhost/api/plans', 'POST', {
          name: 'Single Version Plan',
          snapshot: {
            plan: { initialPortfolio: 250000 },
            timeline: { currentAge: 30, retirementAge: 50, planEndAge: 90 },
            scenarios: []
          },
          result: {}
        }),
        { DB: harness.db }
      );
      expect(createRes.status).toBe(201);
      const planId = createRes.body.plan.id;

      // Request version 99 which does not exist
      const missingVerRes = await invokeApi(
        getPlanVersion,
        new Request(`http://localhost/api/plans/${planId}/versions/99`),
        { DB: harness.db },
        { id: planId, versionNumber: '99' }
      );
      expect(missingVerRes.status).toBe(404);
      expect(missingVerRes.body.error).toBe('Plan version not found.');
    });

    it('rejects malformed version numbers with 400', async () => {
      asUser(USER_A);
      const resAlpha = await invokeApi(
        getPlanVersion,
        new Request('http://localhost/api/plans/p1/versions/abc'),
        { DB: harness.db },
        { id: 'p1', versionNumber: 'abc' }
      );
      expect(resAlpha.status).toBe(400);
      expect(resAlpha.body.error).toMatch(/positive integer/i);

      const resZero = await invokeApi(
        getPlanVersion,
        new Request('http://localhost/api/plans/p1/versions/0'),
        { DB: harness.db },
        { id: 'p1', versionNumber: '0' }
      );
      expect(resZero.status).toBe(400);

      const resNeg = await invokeApi(
        getPlanVersion,
        new Request('http://localhost/api/plans/p1/versions/-1'),
        { DB: harness.db },
        { id: 'p1', versionNumber: '-1' }
      );
      expect(resNeg.status).toBe(400);
    });
  });

  describe('2. Deep link URL construction and parsing', () => {
    it('constructs round-trip deep link for exact plan and version', () => {
      const planId = '68268415-1b8f-4260-bb93-b39d1fb6c043';
      const link = buildPlanDeepLink(planId, 2);
      expect(link).toBe('/plans?planId=68268415-1b8f-4260-bb93-b39d1fb6c043&version=2');

      const parsed = parsePlanDeepLink(link);
      expect(parsed.planId).toBe(planId);
      expect(parsed.versionNumber).toBe(2);
    });

    it('does not contain any monetary figures, financial inputs, or tokens in query', () => {
      const planId = 'plan-safe-id';
      const link = buildPlanDeepLink(planId, 1);
      const url = new URL(`http://localhost${link}`);

      expect(url.searchParams.has('portfolio')).toBe(false);
      expect(url.searchParams.has('balance')).toBe(false);
      expect(url.searchParams.has('cents')).toBe(false);
      expect(url.searchParams.has('token')).toBe(false);
      expect(url.searchParams.has('auth')).toBe(false);
    });
  });
});
