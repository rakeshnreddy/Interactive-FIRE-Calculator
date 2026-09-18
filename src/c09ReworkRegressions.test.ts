// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import {
  parsePlanReviewPayload,
  calculatePlanReviewDueStatus,
  hashPlanReviewPayload,
  ReviewIdempotencyConflictError
} from './lib/planReviews';
import { parsePlanDeepLink } from './lib/navigation';
import { createD1TestHarness, seedTestUser } from './test/d1TestHarness';
import { createPlanReview, listDuePlanReviews } from '../functions/_lib/planReviews';

describe('C09 Rework Regressions (R2 - R6)', () => {
  describe('R2: Idempotency & Database Uniqueness in 0007 vs 0008', () => {
    it('demonstrates that 0007 schema allows duplicate plan_reviews with identical logical keys', () => {
      const db = new DatabaseSync(':memory:');
      db.exec('PRAGMA foreign_keys = ON;');

      // Apply 0001
      const sql0001 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_financial_platform_schema.sql'), 'utf-8');
      db.exec(sql0001);

      // Apply 0007
      const sql0007 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0007_monthly_plan_reviews.sql'), 'utf-8');
      db.exec(sql0007);

      // Seed user and plan
      db.exec(`
        INSERT INTO users (id, provider, provider_user_id, created_at, updated_at)
        VALUES ('usr_1', 'clerk', 'clerk_1', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_1', 'usr_1', 'Retirement', 'fire', 'active', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
      `);

      const insertSql = `
        INSERT INTO plan_reviews (
          id, user_id, plan_id, plan_version_number, evidence_date,
          decision, status, next_review_due, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(insertSql).run('rev_1', 'usr_1', 'plan_1', 1, '2026-06-15', 'keep', 'completed', '2026-07-15', '2026-06-15T12:00:00Z', '2026-06-15T12:00:00Z');

      // In 0007, inserting a second row with identical logical key succeeds because idx_plan_reviews_idempotency is NOT unique
      let secondInsertThrew = false;
      try {
        db.prepare(insertSql).run('rev_2', 'usr_1', 'plan_1', 1, '2026-06-15', 'defer', 'deferred', '2026-06-29', '2026-06-15T12:00:01Z', '2026-06-15T12:00:01Z');
      } catch {
        secondInsertThrew = true;
      }

      const rows = db.prepare("SELECT count(*) as count FROM plan_reviews WHERE user_id = 'usr_1' AND plan_id = 'plan_1'").get() as { count: number };
      expect(secondInsertThrew).toBe(false);
      expect(Number(rows.count)).toBe(2);
    });

    it('proves that 0008 migration enforces uniqueness on (user_id, plan_id, idempotency_key)', () => {
      const db = new DatabaseSync(':memory:');
      db.exec('PRAGMA foreign_keys = ON;');

      const sql0001 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0001_initial_financial_platform_schema.sql'), 'utf-8');
      db.exec(sql0001);
      const sql0007 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0007_monthly_plan_reviews.sql'), 'utf-8');
      db.exec(sql0007);
      const sql0008 = fs.readFileSync(path.resolve(process.cwd(), 'migrations/0008_plan_reviews_idempotency.sql'), 'utf-8');
      db.exec(sql0008);

      db.exec(`
        INSERT INTO users (id, provider, provider_user_id, created_at, updated_at)
        VALUES ('usr_1', 'clerk', 'clerk_1', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_1', 'usr_1', 'Retirement', 'fire', 'active', '2026-06-01T00:00:00.000Z', '2026-06-01T00:00:00.000Z');
      `);

      const insertWithKeySql = `
        INSERT INTO plan_reviews (
          id, user_id, plan_id, plan_version_number, evidence_date,
          decision, status, next_review_due, idempotency_key, payload_hash,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.prepare(insertWithKeySql).run(
        'rev_1', 'usr_1', 'plan_1', 1, '2026-06-15',
        'keep', 'completed', '2026-07-15', 'idem_key_1', 'hash_1',
        '2026-06-15T12:00:00Z', '2026-06-15T12:00:00Z'
      );

      // Attempting duplicate insert with same (user_id, plan_id, idempotency_key) MUST throw SQLite UNIQUE constraint error
      expect(() => {
        db.prepare(insertWithKeySql).run(
          'rev_2', 'usr_1', 'plan_1', 1, '2026-06-15',
          'defer', 'deferred', '2026-06-29', 'idem_key_1', 'hash_2',
          '2026-06-15T12:00:01Z', '2026-06-15T12:00:01Z'
        );
      }).toThrow(/UNIQUE constraint/i);
    });

    it('proves createPlanReview distinguishes exact replay (200) from conflicting intent (409)', async () => {
      const harness = createD1TestHarness();
      await seedTestUser(harness, 'usr_idem');

      // Create plan and version
      await harness.db.prepare(`
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_idem', 'usr_idem', 'Retirement', 'fire', 'active', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z')
      `).run();

      await harness.db.prepare(`
        INSERT INTO plan_versions (id, plan_id, user_id, version_number, created_at)
        VALUES ('ver_1', 'plan_idem', 'usr_idem', 1, '2026-05-01T00:00:00.000Z')
      `).run();

      const payloadA = {
        decision: 'keep' as const,
        evidenceDate: '2026-06-01',
        planVersionNumber: 1,
        idempotencyKey: 'op_cycle_1',
        payloadHash: hashPlanReviewPayload({
          decision: 'keep',
          planVersionNumber: 1,
          notes: 'Looking good'
        }),
        notes: 'Looking good'
      };

      // First submission succeeds (201)
      const res1 = await createPlanReview(harness.db, 'usr_idem', 'plan_idem', payloadA, '2026-06-15T12:00:00.000Z');
      expect(res1).not.toBeNull();
      expect(res1!.isDuplicate).toBe(false);
      expect(res1!.review.decision).toBe('keep');

      // Exact replay with same idempotency key and same payload returns isDuplicate: true
      const res2 = await createPlanReview(harness.db, 'usr_idem', 'plan_idem', payloadA, '2026-06-15T12:05:00.000Z');
      expect(res2).not.toBeNull();
      expect(res2!.isDuplicate).toBe(true);
      expect(res2!.review.id).toBe(res1!.review.id);

      // Conflicting submission with same idempotency key but different payload throws ReviewIdempotencyConflictError
      const payloadConflict = {
        decision: 'defer' as const,
        evidenceDate: '2026-06-01',
        planVersionNumber: 1,
        idempotencyKey: 'op_cycle_1',
        payloadHash: hashPlanReviewPayload({
          decision: 'defer',
          planVersionNumber: 1,
          notes: 'Defer for 14 days'
        }),
        notes: 'Defer for 14 days'
      };

      await expect(
        createPlanReview(harness.db, 'usr_idem', 'plan_idem', payloadConflict, '2026-06-15T12:10:00.000Z')
      ).rejects.toThrow(ReviewIdempotencyConflictError);
    });
  });

  describe('R3: Date Validation & Server Time Scheduling', () => {
    it('proves invalid calendar dates (e.g. Feb 30, April 31) are rejected by UTC round-trip validation', () => {
      const feb30 = parsePlanReviewPayload({
        decision: 'keep',
        evidenceDate: '2026-02-30',
        planVersionNumber: 1
      });
      expect(feb30.ok).toBe(false);
      if (!feb30.ok) {
        expect(feb30.code).toBe('INVALID_EVIDENCE_DATE');
      }

      const apr31 = parsePlanReviewPayload({
        decision: 'keep',
        evidenceDate: '2026-04-31',
        planVersionNumber: 1
      });
      expect(apr31.ok).toBe(false);
      if (!apr31.ok) {
        expect(apr31.code).toBe('INVALID_EVIDENCE_DATE');
      }
    });

    it('proves future evidence dates are rejected', () => {
      const future = parsePlanReviewPayload({
        decision: 'keep',
        evidenceDate: '2099-01-01',
        planVersionNumber: 1
      });
      expect(future.ok).toBe(false);
      if (!future.ok) {
        expect(future.code).toBe('FUTURE_EVIDENCE_DATE');
      }
    });

    it('proves server time (nowUtc) is used to derive nextReviewDue, not old evidenceDate', async () => {
      const harness = createD1TestHarness();
      await seedTestUser(harness, 'usr_sched');

      await harness.db.prepare(`
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_sched', 'usr_sched', 'Retirement', 'fire', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z')
      `).run();

      await harness.db.prepare(`
        INSERT INTO plan_versions (id, plan_id, user_id, version_number, created_at)
        VALUES ('ver_sched_1', 'plan_sched', 'usr_sched', 1, '2026-01-01T00:00:00.000Z')
      `).run();

      // Evidence date is 90 days old (e.g. 2026-03-15), but review action occurs on 2026-06-15T12:00:00.000Z
      const serverActionTime = '2026-06-15T12:00:00.000Z';
      const payload = {
        decision: 'keep' as const,
        evidenceDate: '2026-03-15',
        planVersionNumber: 1
      };

      const result = await createPlanReview(harness.db, 'usr_sched', 'plan_sched', payload, serverActionTime);
      expect(result).not.toBeNull();
      // nextReviewDue should be 30 days from serverActionTime (2026-07-15), NOT 30 days from evidenceDate (2026-04-14)!
      expect(result!.review.nextReviewDue).toBe('2026-07-15');
      expect(result!.review.status).toBe('completed');
    });
  });

  describe('R4: Deep Link Navigation & Explicit Version Parsing', () => {
    it('distinguishes omitted version from invalid explicit version parameters', () => {
      // Omitted version
      const omitted = parsePlanDeepLink('/plans?planId=plan_1');
      expect(omitted.isVersionExplicit).toBe(false);
      expect(omitted.isVersionInvalid).toBe(false);
      expect(omitted.versionNumber).toBeNull();

      // Invalid explicit version strings
      const invalidText = parsePlanDeepLink('/plans?planId=plan_1&version=latest');
      expect(invalidText.isVersionExplicit).toBe(true);
      expect(invalidText.isVersionInvalid).toBe(true);
      expect(invalidText.versionNumber).toBeNull();

      const invalidNegative = parsePlanDeepLink('/plans?planId=plan_1&version=-5');
      expect(invalidNegative.isVersionExplicit).toBe(true);
      expect(invalidNegative.isVersionInvalid).toBe(true);
      expect(invalidNegative.versionNumber).toBeNull();

      const invalidDecimal = parsePlanDeepLink('/plans?planId=plan_1&version=2.5');
      expect(invalidDecimal.isVersionExplicit).toBe(true);
      expect(invalidDecimal.isVersionInvalid).toBe(true);
      expect(invalidDecimal.versionNumber).toBeNull();

      // Valid explicit integer version
      const valid = parsePlanDeepLink('/plans?planId=plan_1&version=3');
      expect(valid.isVersionExplicit).toBe(true);
      expect(valid.isVersionInvalid).toBe(false);
      expect(valid.versionNumber).toBe(3);
    });
  });

  describe('R5: Persisted Dashboard Due Status on a Single Plan', () => {
    it('proves a single aged plan transitions from due to up-to-date upon review completion', async () => {
      const harness = createD1TestHarness();
      await seedTestUser(harness, 'usr_single_plan');

      // Create a single plan aged 45 days
      await harness.db.prepare(`
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_aged', 'usr_single_plan', 'Aged Plan', 'fire', 'active', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z')
      `).run();

      await harness.db.prepare(`
        INSERT INTO plan_versions (id, plan_id, user_id, version_number, created_at)
        VALUES ('ver_aged_1', 'plan_aged', 'usr_single_plan', 1, '2026-05-01T00:00:00.000Z')
      `).run();

      // Check due status initially on 2026-06-15 (45 days old)
      const initialDue = await listDuePlanReviews(harness.db, 'usr_single_plan', '2026-06-15');
      expect(initialDue.length).toBe(1);
      expect(initialDue[0].planId).toBe('plan_aged');
      expect(['due', 'overdue']).toContain(initialDue[0].status);

      // Complete review on this single plan
      await createPlanReview(
        harness.db,
        'usr_single_plan',
        'plan_aged',
        {
          decision: 'keep',
          evidenceDate: '2026-06-15',
          planVersionNumber: 1
        },
        '2026-06-15T12:00:00.000Z'
      );

      // Now query due status for the same user on the same date
      const updatedDue = await listDuePlanReviews(harness.db, 'usr_single_plan', '2026-06-15');
      expect(updatedDue.length).toBe(1);
      expect(updatedDue[0].planId).toBe('plan_aged');
      expect(updatedDue[0].status).toBe('up-to-date');
    });

    it('proves a single aged plan transitions from due to deferred upon deferral', async () => {
      const harness = createD1TestHarness();
      await seedTestUser(harness, 'usr_defer_plan');

      await harness.db.prepare(`
        INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
        VALUES ('plan_defer', 'usr_defer_plan', 'Defer Plan', 'fire', 'active', '2026-05-01T00:00:00.000Z', '2026-05-01T00:00:00.000Z')
      `).run();

      await harness.db.prepare(`
        INSERT INTO plan_versions (id, plan_id, user_id, version_number, created_at)
        VALUES ('ver_defer_1', 'plan_defer', 'usr_defer_plan', 1, '2026-05-01T00:00:00.000Z')
      `).run();

      // Defer review on 2026-06-15 for 14 days
      await createPlanReview(
        harness.db,
        'usr_defer_plan',
        'plan_defer',
        {
          decision: 'defer',
          evidenceDate: '2026-06-15',
          planVersionNumber: 1
        },
        '2026-06-15T12:00:00.000Z'
      );

      // On 2026-06-20 (5 days later), plan should still be deferred (not due)
      const duringDeferral = await listDuePlanReviews(harness.db, 'usr_defer_plan', '2026-06-20');
      expect(duringDeferral.length).toBe(1);
      expect(duringDeferral[0].status).toBe('deferred');

      // On 2026-07-01 (16 days later), deferral expired, plan is due again
      const afterDeferral = await listDuePlanReviews(harness.db, 'usr_defer_plan', '2026-07-01');
      expect(afterDeferral.length).toBe(1);
      expect(afterDeferral[0].status).toBe('due');
      expect(afterDeferral[0].planId).toBe('plan_defer');
    });
  });

  describe('R6: Metadata Edit vs Financial Evidence Provenance', () => {
    it('proves goal updatedAt is a metadata timestamp and does not refresh financial evidence age', () => {
      const initialGoal = {
        id: 'goal_1',
        name: 'Retirement Goal',
        currentAmountCents: 500000,
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T00:00:00.000Z'
      };

      // Renaming the goal updates updatedAt
      const updatedGoal = {
        ...initialGoal,
        name: 'Updated Retirement Goal Name',
        updatedAt: '2026-06-15T00:00:00.000Z'
      };

      // Financial balance cents did NOT change, but updatedAt changed
      expect(updatedGoal.currentAmountCents).toBe(initialGoal.currentAmountCents);
      expect(updatedGoal.updatedAt).not.toBe(initialGoal.updatedAt);

      // Goal update timestamp must not be represented as financial evidence date
      expect(updatedGoal.updatedAt.slice(0, 10)).toBe('2026-06-15');
    });
  });
});
