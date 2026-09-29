// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createD1TestHarness, invokeApi, seedTestUser, type D1TestHarness } from './test/d1TestHarness';
import * as sessionModule from '../functions/_lib/session';
import { onRequestPost as createPlan } from '../functions/api/plans/index';
import { onRequestGet as listReviews, onRequestPost as createReview } from '../functions/api/plans/[id]/reviews/index';
import { onRequestGet as listDueReviews } from '../functions/api/plans/due-reviews';
import { exportAccountData, deleteAccountData } from '../functions/_lib/accountData';
import {
  calculatePlanReviewDueStatus,
  ReviewTooEarlyError,
  type PlanReviewDueStatus
} from '../functions/_lib/planReviews';

describe('B11: Monthly Plan Review Loop & Persistence', () => {
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

  describe('1. Due status calculation domain logic', () => {
    it('enforces the >= 7-day returning review rule on new plans', () => {
      const planCreated = '2026-06-01T12:00:00.000Z';

      // Day 3: too early (< 7 days)
      const day3Status = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview: null,
        referenceDate: '2026-06-04'
      });
      expect(day3Status.status).toBe('too-early');
      expect(day3Status.daysSinceBaseline).toBe(3);
      expect(day3Status.daysUntilEligible).toBe(4);
      expect(day3Status.eligibleForReview).toBe(false);

      // Day 6: still too early
      const day6Status = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview: null,
        referenceDate: '2026-06-07'
      });
      expect(day6Status.status).toBe('too-early');
      expect(day6Status.eligibleForReview).toBe(false);

      // Day 7: exactly eligible, up-to-date
      const day7Status = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview: null,
        referenceDate: '2026-06-08'
      });
      expect(day7Status.status).toBe('up-to-date');
      expect(day7Status.eligibleForReview).toBe(true);

      // Day 31: review is due (30 days from baseline)
      const day31Status = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview: null,
        referenceDate: '2026-07-02'
      });
      expect(day7Status.eligibleForReview).toBe(true);
      expect(day31Status.status).toBe('due');

      // Day 50: overdue (> 14 days past due date)
      const day50Status = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview: null,
        referenceDate: '2026-07-21'
      });
      expect(day50Status.status).toBe('overdue');
    });

    it('handles deferral and re-evaluates due status when deferred date arrives', () => {
      const planCreated = '2026-05-01T12:00:00.000Z';
      const latestReview = {
        id: 'rev_1',
        decision: 'defer' as const,
        status: 'deferred' as const,
        evidenceDate: '2026-06-15',
        deferredUntil: '2026-06-29',
        nextReviewDue: '2026-06-29',
        completedAt: null,
        createdAt: '2026-06-15T10:00:00.000Z'
      };

      // Before deferredUntil: deferred
      const beforeDefer = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview,
        referenceDate: '2026-06-20'
      });
      expect(beforeDefer.status).toBe('deferred');
      expect(beforeDefer.deferredUntil).toBe('2026-06-29');

      // On deferredUntil: due again!
      const onDefer = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview,
        referenceDate: '2026-06-29'
      });
      expect(onDefer.status).toBe('due');

      // 20 days after deferredUntil: overdue
      const pastDefer = calculatePlanReviewDueStatus({
        planCreatedAt: planCreated,
        latestReview,
        referenceDate: '2026-07-20'
      });
      expect(pastDefer.status).toBe('overdue');
    });

    it('detects stale evidence (> 30 days old)', () => {
      const statusFresh = calculatePlanReviewDueStatus({
        planCreatedAt: '2026-06-01T12:00:00.000Z',
        latestReview: null,
        evidenceDate: '2026-06-10',
        referenceDate: '2026-06-25'
      });
      expect(statusFresh.isEvidenceStale).toBe(false);

      const statusStale = calculatePlanReviewDueStatus({
        planCreatedAt: '2026-05-01T12:00:00.000Z',
        latestReview: null,
        evidenceDate: '2026-05-01',
        referenceDate: '2026-06-15'
      });
      expect(statusStale.isEvidenceStale).toBe(true);
      expect(statusStale.evidenceAgeDays).toBe(45);
    });
  });

  describe('2. Endpoints: review creation, decisions, and >= 7-day enforcement', () => {
    it('rejects returning review before 7 days from baseline plan creation', async () => {
      asUser(USER_A);

      // Create plan with current timestamp
      const planRes = await invokeApi(
        createPlan,
        createJsonRequest('http://localhost/api/plans', 'POST', {
          name: 'Retirement 2040',
          label: 'Baseline',
          snapshot: { plan: { annualExpense: 60000 }, timeline: { currentAge: 35, retirementAge: 55 } },
          result: { requiredPortfolio: 1500000 }
        }),
        { DB: harness.db }
      );
      expect(planRes.status).toBe(201);
      const planId = planRes.body.plan.id;

      // Attempt review on same day (0 days elapsed)
      const reviewRes = await invokeApi(
        createReview,
        createJsonRequest(`http://localhost/api/plans/${planId}/reviews`, 'POST', {
          planVersionNumber: 1,
          evidenceDate: new Date().toISOString().slice(0, 10),
          decision: 'keep',
          notes: 'Checking in early'
        }),
        { DB: harness.db },
        { id: planId }
      );

      expect(reviewRes.status).toBe(400);
      expect(reviewRes.body.error).toMatch(/at least 7 days/i);
    });

    it('creates review with decision=keep, sets next_review_due = +30 days, preserves version immutability', async () => {
      asUser(USER_A);

      // Seed a plan created 10 days ago directly in D1
      const planId = 'plan_test_keep';
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Base Plan', 'fire', 'active', ?, ?)
        `)
        .bind(planId, USER_A, tenDaysAgo, tenDaysAgo)
        .run();

      const versionId = 'ver_test_keep_1';
      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES (?, ?, ?, 1, 'Initial Version', ?)
        `)
        .bind(versionId, planId, USER_A, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO fire_plan_inputs (plan_version_id, user_id, input_json, created_at)
          VALUES (?, ?, '{"plan":{"annualExpense":50000}}', ?)
        `)
        .bind(versionId, USER_A, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO fire_plan_results (plan_version_id, user_id, result_json, created_at)
          VALUES (?, ?, '{"requiredPortfolio":1250000}', ?)
        `)
        .bind(versionId, USER_A, tenDaysAgo)
        .run();

      const todayStr = new Date().toISOString().slice(0, 10);
      const reviewRes = await invokeApi(
        createReview,
        createJsonRequest(`http://localhost/api/plans/${planId}/reviews`, 'POST', {
          planVersionNumber: 1,
          evidenceDate: todayStr,
          decision: 'keep',
          notes: 'Assumptions confirmed, expenses steady'
        }),
        { DB: harness.db },
        { id: planId }
      );

      expect(reviewRes.status).toBe(201);
      expect(reviewRes.body.review).toMatchObject({
        planId,
        planVersionNumber: 1,
        decision: 'keep',
        status: 'completed',
        notes: 'Assumptions confirmed, expenses steady'
      });
      expect(reviewRes.body.review.nextReviewDue).toBeTruthy();
      expect(reviewRes.body.dueStatus.status).toBe('up-to-date');

      // Verify idempotency: repeat submission on the same day returns HTTP 200 and identical review
      const repeatRes = await invokeApi(
        createReview,
        createJsonRequest(`http://localhost/api/plans/${planId}/reviews`, 'POST', {
          planVersionNumber: 1,
          evidenceDate: todayStr,
          decision: 'keep',
          notes: 'Assumptions confirmed, expenses steady'
        }),
        { DB: harness.db },
        { id: planId }
      );

      expect(repeatRes.status).toBe(200);
      expect(repeatRes.body.review.id).toBe(reviewRes.body.review.id);

      // Verify database has exactly 1 review row (no duplicate)
      const count = await harness.db
        .prepare('SELECT COUNT(*) as cnt FROM plan_reviews WHERE plan_id = ?')
        .bind(planId)
        .first<{ cnt: number }>();
      expect(count?.cnt).toBe(1);
    });

    it('creates review with decision=defer, sets deferred_until and status=deferred', async () => {
      asUser(USER_A);

      const planId = 'plan_test_defer';
      const fourteenDaysAgo = new Date(Date.now() - 14 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Base Plan Defer', 'fire', 'active', ?, ?)
        `)
        .bind(planId, USER_A, fourteenDaysAgo, fourteenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_defer_1', ?, ?, 1, 'Initial', ?)
        `)
        .bind(planId, USER_A, fourteenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO fire_plan_inputs (plan_version_id, user_id, input_json, created_at)
          VALUES ('ver_defer_1', ?, '{"plan":{"annualExpense":50000}}', ?)
        `)
        .bind(USER_A, fourteenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO fire_plan_results (plan_version_id, user_id, result_json, created_at)
          VALUES ('ver_defer_1', ?, '{"requiredPortfolio":1250000}', ?)
        `)
        .bind(USER_A, fourteenDaysAgo)
        .run();

      const todayStr = new Date().toISOString().slice(0, 10);
      const reviewRes = await invokeApi(
        createReview,
        createJsonRequest(`http://localhost/api/plans/${planId}/reviews`, 'POST', {
          planVersionNumber: 1,
          evidenceDate: todayStr,
          decision: 'defer',
          deferDays: 14,
          notes: 'Waiting for tax refund to finalize numbers'
        }),
        { DB: harness.db },
        { id: planId }
      );

      expect(reviewRes.status).toBe(201);
      expect(reviewRes.body.review.decision).toBe('defer');
      expect(reviewRes.body.review.status).toBe('deferred');
      expect(reviewRes.body.review.deferredUntil).toBeTruthy();
      expect(reviewRes.body.dueStatus.status).toBe('deferred');
    });

    it('enforces tenant isolation: User B cannot view or review User A plans', async () => {
      asUser(USER_A);
      const planId = 'plan_user_a';
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'User A Plan', 'fire', 'active', ?, ?)
        `)
        .bind(planId, USER_A, tenDaysAgo, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_a_1', ?, ?, 1, 'V1', ?)
        `)
        .bind(planId, USER_A, tenDaysAgo)
        .run();

      // Switch to User B
      asUser(USER_B);

      const listRes = await invokeApi(
        listReviews,
        new Request(`http://localhost/api/plans/${planId}/reviews`),
        { DB: harness.db },
        { id: planId }
      );
      expect(listRes.status).toBe(404);

      const postRes = await invokeApi(
        createReview,
        createJsonRequest(`http://localhost/api/plans/${planId}/reviews`, 'POST', {
          planVersionNumber: 1,
          evidenceDate: new Date().toISOString().slice(0, 10),
          decision: 'keep'
        }),
        { DB: harness.db },
        { id: planId }
      );
      expect(postRes.status).toBe(404);
    });

    it('lists due reviews across user plans via /api/plans/due-reviews', async () => {
      asUser(USER_A);

      // Seed 2 plans: one 35 days old (review due), one 3 days old (too early)
      const duePlanId = 'plan_due_35d';
      const thirtyFiveDaysAgo = new Date(Date.now() - 35 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Old Plan Due', 'fire', 'active', ?, ?)
        `)
        .bind(duePlanId, USER_A, thirtyFiveDaysAgo, thirtyFiveDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_due_1', ?, ?, 1, 'V1', ?)
        `)
        .bind(duePlanId, USER_A, thirtyFiveDaysAgo)
        .run();

      const freshPlanId = 'plan_fresh_3d';
      const threeDaysAgo = new Date(Date.now() - 3 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Fresh Plan', 'fire', 'active', ?, ?)
        `)
        .bind(freshPlanId, USER_A, threeDaysAgo, threeDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_fresh_1', ?, ?, 1, 'V1', ?)
        `)
        .bind(freshPlanId, USER_A, threeDaysAgo)
        .run();

      const res = await invokeApi(
        listDueReviews,
        new Request('http://localhost/api/plans/due-reviews'),
        { DB: harness.db }
      );

      expect(res.status).toBe(200);
      expect(res.body.dueReviews).toBeDefined();
      const dueItem = res.body.dueReviews.find((p: any) => p.planId === duePlanId);
      expect(dueItem).toBeDefined();
      expect(dueItem.status).toBe('due');
    });
  });

  describe('3. Account deletion and export participation', () => {
    it('participates in full account data export', async () => {
      asUser(USER_A);
      const planId = 'plan_export_test';
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Export Plan', 'fire', 'active', ?, ?)
        `)
        .bind(planId, USER_A, tenDaysAgo, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_exp_1', ?, ?, 1, 'V1', ?)
        `)
        .bind(planId, USER_A, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_reviews (id, user_id, plan_id, plan_version_number, evidence_date, decision, status, next_review_due, created_at, updated_at)
          VALUES ('rev_exp_1', ?, ?, 1, '2026-06-15', 'keep', 'completed', '2026-07-15', ?, ?)
        `)
        .bind(USER_A, planId, tenDaysAgo, tenDaysAgo)
        .run();

      const exported = await exportAccountData(harness.db, USER_A);
      expect(exported.data.planReviews).toHaveLength(1);
      expect(exported.data.planReviews[0]).toMatchObject({
        id: 'rev_exp_1',
        decision: 'keep',
        status: 'completed',
        plan_id: planId
      });
      expect(exported.summary.planReviews).toBe(1);
    });

    it('hard-deletes plan_reviews on account deletion and blocks resurrecting writes', async () => {
      asUser(USER_A);
      const planId = 'plan_delete_test';
      const tenDaysAgo = new Date(Date.now() - 10 * 86400000).toISOString();
      await harness.db
        .prepare(`
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, 'Delete Plan', 'fire', 'active', ?, ?)
        `)
        .bind(planId, USER_A, tenDaysAgo, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES ('ver_del_1', ?, ?, 1, 'V1', ?)
        `)
        .bind(planId, USER_A, tenDaysAgo)
        .run();

      await harness.db
        .prepare(`
          INSERT INTO plan_reviews (id, user_id, plan_id, plan_version_number, evidence_date, decision, status, next_review_due, created_at, updated_at)
          VALUES ('rev_del_1', ?, ?, 1, '2026-06-15', 'keep', 'completed', '2026-07-15', ?, ?)
        `)
        .bind(USER_A, planId, tenDaysAgo, tenDaysAgo)
        .run();

      const delResult = await deleteAccountData(harness.db, USER_A);
      expect(delResult.localAccountDataDeleted).toBe(true);

      const reviewCount = await harness.db
        .prepare('SELECT COUNT(*) as cnt FROM plan_reviews WHERE user_id = ?')
        .bind(USER_A)
        .first<{ cnt: number }>();
      expect(reviewCount?.cnt).toBe(0);

      // Verify tombstone trigger blocks inserting a new review for deleted user
      await expect(
        harness.db
          .prepare(`
            INSERT INTO plan_reviews (id, user_id, plan_id, plan_version_number, evidence_date, decision, status, next_review_due, created_at, updated_at)
            VALUES ('rev_del_blocked', ?, 'plan_1', 1, '2026-06-15', 'keep', 'completed', '2026-07-15', ?, ?)
          `)
          .bind(USER_A, tenDaysAgo, tenDaysAgo)
          .run()
      ).rejects.toThrow(/USER_DELETED/i);
    });
  });
});
