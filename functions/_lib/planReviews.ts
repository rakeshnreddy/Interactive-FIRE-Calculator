/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';
export * from '../../src/lib/planReviews';
import {
  addDaysUtc,
  calculatePlanReviewDueStatus,
  formatYmdUtc,
  getTodayUtcMidnight,
  hashPlanReviewPayload,
  parseToUtcMidnight,
  ReviewIdempotencyConflictError,
  ReviewTooEarlyError,
  type DueStatusResult,
  type PlanReviewDecision,
  type PlanReviewPayload,
  type PlanReviewStatus,
  type StoredPlanReview,
  type PlanReviewDueStatus
} from '../../src/lib/planReviews';

type PlanReviewRow = {
  completed_at: string | null;
  created_at: string;
  decision: PlanReviewDecision;
  deferred_until: string | null;
  evidence_date: string;
  id: string;
  idempotency_key: string | null;
  next_review_due: string;
  notes: string | null;
  payload_hash: string | null;
  plan_id: string;
  plan_version_number: number;
  status: PlanReviewStatus;
  updated_at: string;
  user_id: string;
};

function isUniqueConstraintError(error: unknown): boolean {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes('unique constraint') ||
      msg.includes('sqlite_constraint') ||
      msg.includes('d1_error: unique')
    );
  }
  return false;
}

export async function createPlanReview(
  database: D1Database,
  userId: string,
  planId: string,
  payload: PlanReviewPayload,
  nowOverride?: string
): Promise<{ isDuplicate: boolean; review: StoredPlanReview; dueStatus: DueStatusResult } | null> {
  await ensureUserProfile(database, userId);

  // 1. Verify plan exists and belongs to user
  const plan = await database
    .prepare(
      `
        SELECT id, created_at, status
        FROM plans
        WHERE id = ? AND user_id = ? AND status != 'archived' AND archived_at IS NULL
      `
    )
    .bind(planId, userId)
    .first<{ created_at: string; id: string; status: string }>();

  if (!plan) {
    return null;
  }

  // 2. Verify plan version exists
  const version = await database
    .prepare(
      `
        SELECT id, version_number
        FROM plan_versions
        WHERE plan_id = ? AND user_id = ? AND version_number = ?
      `
    )
    .bind(planId, userId, payload.planVersionNumber)
    .first<{ id: string; version_number: number }>();

  if (!version) {
    return null;
  }

  // 3. Verify >= 7-day returning review rule
  const priorReview = await database
    .prepare(
      `
        SELECT id, next_review_due, deferred_until, decision, status, created_at
        FROM plan_reviews
        WHERE plan_id = ? AND user_id = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
    )
    .bind(planId, userId)
    .first<{
      created_at: string;
      decision: string;
      deferred_until: string | null;
      id: string;
      next_review_due: string;
      status: string;
    }>();

  const baselineUtc = parseToUtcMidnight(plan.created_at);
  const nowUtc = nowOverride ? parseToUtcMidnight(nowOverride) : getTodayUtcMidnight();
  const daysSinceBaseline = Math.floor((nowUtc.getTime() - baselineUtc.getTime()) / (24 * 60 * 60 * 1000));

  if (!priorReview && daysSinceBaseline < 7) {
    throw new ReviewTooEarlyError(Math.max(0, daysSinceBaseline));
  }

  // 4. Resolve atomic idempotency key and payload hash
  const idempotencyKey = payload.idempotencyKey?.trim() || `v${payload.planVersionNumber}:${payload.evidenceDate}`;
  const payloadHash = await hashPlanReviewPayload({
    decision: payload.decision,
    deferDays: payload.deferDays,
    notes: payload.notes,
    planVersionNumber: payload.planVersionNumber
  });

  const selectByLogicalKey = async () => {
    return await database
      .prepare(
        `
          SELECT
            id, user_id, plan_id, plan_version_number, evidence_date,
            decision, status, notes, completed_at, deferred_until,
            next_review_due, idempotency_key, payload_hash, created_at, updated_at
          FROM plan_reviews
          WHERE user_id = ? AND plan_id = ? AND idempotency_key = ?
          LIMIT 1
        `
      )
      .bind(userId, planId, idempotencyKey)
      .first<PlanReviewRow>();
  };

  const existing = await selectByLogicalKey();
  if (existing) {
    const stored = toStoredPlanReview(existing);
    if (existing.payload_hash === payloadHash) {
      const dueStatus = calculatePlanReviewDueStatus({
        planCreatedAt: plan.created_at,
        latestReview: stored,
        evidenceDate: payload.evidenceDate,
        referenceDate: nowOverride ? nowOverride.slice(0, 10) : undefined
      });
      return { dueStatus, isDuplicate: true, review: stored };
    }
    throw new ReviewIdempotencyConflictError(stored);
  }

  // 5. Insert new review with trusted server-derived schedule
  const reviewId = crypto.randomUUID();
  const now = nowOverride ? new Date(nowOverride) : new Date();
  const nowIso = now.toISOString();

  let status: PlanReviewStatus;
  let completedAt: string | null = null;
  let deferredUntil: string | null = null;
  let nextReviewDue: string;

  if (payload.decision === 'defer') {
    status = 'deferred';
    const deferDays = payload.deferDays ?? 14;
    deferredUntil = formatYmdUtc(addDaysUtc(nowUtc, deferDays));
    nextReviewDue = deferredUntil;
  } else {
    status = 'completed';
    completedAt = nowIso;
    nextReviewDue = formatYmdUtc(addDaysUtc(nowUtc, 30));
  }

  try {
    await database
      .prepare(
        `
          INSERT INTO plan_reviews (
            id, user_id, plan_id, plan_version_number, evidence_date,
            decision, status, notes, completed_at, deferred_until,
            next_review_due, idempotency_key, payload_hash, created_at, updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .bind(
        reviewId,
        userId,
        planId,
        payload.planVersionNumber,
        payload.evidenceDate,
        payload.decision,
        status,
        payload.notes ?? null,
        completedAt,
        deferredUntil,
        nextReviewDue,
        idempotencyKey,
        payloadHash,
        nowIso,
        nowIso
      )
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      const winner = await selectByLogicalKey();
      if (winner) {
        const stored = toStoredPlanReview(winner);
        if (winner.payload_hash === payloadHash) {
          const dueStatus = calculatePlanReviewDueStatus({
            planCreatedAt: plan.created_at,
            latestReview: stored,
            evidenceDate: payload.evidenceDate
          });
          return { dueStatus, isDuplicate: true, review: stored };
        }
        throw new ReviewIdempotencyConflictError(stored);
      }
    }
    throw error;
  }

  const newReview: StoredPlanReview = {
    completedAt,
    createdAt: nowIso,
    decision: payload.decision,
    deferredUntil,
    evidenceDate: payload.evidenceDate,
    id: reviewId,
    idempotencyKey,
    nextReviewDue,
    notes: payload.notes ?? null,
    payloadHash,
    planId,
    planVersionNumber: payload.planVersionNumber,
    status,
    updatedAt: nowIso
  };

  const dueStatus = calculatePlanReviewDueStatus({
    planCreatedAt: plan.created_at,
    latestReview: newReview,
    evidenceDate: payload.evidenceDate
  });

  return { dueStatus, isDuplicate: false, review: newReview };
}

export async function listPlanReviews(
  database: D1Database,
  userId: string,
  planId: string
): Promise<{ reviews: StoredPlanReview[]; dueStatus: DueStatusResult } | null> {
  await ensureUserProfile(database, userId);

  const plan = await database
    .prepare(
      `
        SELECT id, created_at
        FROM plans
        WHERE id = ? AND user_id = ? AND status != 'archived' AND archived_at IS NULL
      `
    )
    .bind(planId, userId)
    .first<{ created_at: string; id: string }>();

  if (!plan) {
    return null;
  }

  const result = await database
    .prepare(
      `
        SELECT
          id, user_id, plan_id, plan_version_number, evidence_date,
          decision, status, notes, completed_at, deferred_until,
          next_review_due, idempotency_key, payload_hash, created_at, updated_at
        FROM plan_reviews
        WHERE user_id = ? AND plan_id = ?
        ORDER BY created_at DESC
        LIMIT 100
      `
    )
    .bind(userId, planId)
    .all<PlanReviewRow>();

  const reviews = result.results.map(toStoredPlanReview);
  const dueStatus = calculatePlanReviewDueStatus({
    planCreatedAt: plan.created_at,
    latestReview: reviews[0] ?? null
  });

  return { dueStatus, reviews };
}

export type DueReviewItem = {
  daysSinceBaseline: number;
  deferredUntil: string | null;
  evidenceDate: string;
  isEvidenceStale: boolean;
  latestReviewId: string | null;
  latestVersionNumber: number;
  nextReviewDue: string;
  planCreatedAt: string;
  planId: string;
  planName: string;
  status: PlanReviewDueStatus;
};

export async function listDuePlanReviews(
  database: D1Database,
  userId: string,
  referenceDate?: string
): Promise<DueReviewItem[]> {
  await ensureUserProfile(database, userId);

  const plansResult = await database
    .prepare(
      `
        SELECT
          p.id AS plan_id,
          p.name AS plan_name,
          p.created_at AS plan_created_at,
          COALESCE((SELECT MAX(version_number) FROM plan_versions WHERE plan_id = p.id), 1) AS latest_version_number,
          pr.id AS review_id,
          pr.decision AS review_decision,
          pr.status AS review_status,
          pr.evidence_date,
          pr.deferred_until,
          pr.next_review_due,
          pr.completed_at,
          pr.created_at AS review_created_at
        FROM plans p
        LEFT JOIN plan_reviews pr ON pr.id = (
          SELECT id FROM plan_reviews
          WHERE plan_id = p.id AND user_id = p.user_id
          ORDER BY created_at DESC
          LIMIT 1
        )
        WHERE p.user_id = ? AND p.plan_type = 'fire' AND p.status != 'archived' AND p.archived_at IS NULL
        ORDER BY p.updated_at DESC
        LIMIT 100
      `
    )
    .bind(userId)
    .all<{
      completed_at: string | null;
      deferred_until: string | null;
      evidence_date: string | null;
      latest_version_number: number;
      next_review_due: string | null;
      plan_created_at: string;
      plan_id: string;
      plan_name: string;
      review_created_at: string | null;
      review_decision: PlanReviewDecision | null;
      review_id: string | null;
      review_status: PlanReviewStatus | null;
    }>();

  const items: DueReviewItem[] = [];

  for (const row of plansResult.results) {
    const latestReview = row.review_id
      ? {
          completedAt: row.completed_at,
          createdAt: row.review_created_at!,
          decision: row.review_decision!,
          deferredUntil: row.deferred_until,
          evidenceDate: row.evidence_date!,
          id: row.review_id,
          nextReviewDue: row.next_review_due!,
          status: row.review_status!
        }
      : null;

    const dueCalc = calculatePlanReviewDueStatus({
      planCreatedAt: row.plan_created_at,
      latestReview,
      referenceDate
    });

    items.push({
      daysSinceBaseline: dueCalc.daysSinceBaseline,
      deferredUntil: dueCalc.deferredUntil,
      evidenceDate: dueCalc.evidenceDate,
      isEvidenceStale: dueCalc.isEvidenceStale,
      latestReviewId: row.review_id,
      latestVersionNumber: row.latest_version_number,
      nextReviewDue: dueCalc.nextReviewDue,
      planCreatedAt: row.plan_created_at,
      planId: row.plan_id,
      planName: row.plan_name,
      status: dueCalc.status
    });
  }

  return items;
}

function toStoredPlanReview(row: PlanReviewRow): StoredPlanReview {
  return {
    completedAt: row.completed_at,
    createdAt: row.created_at,
    decision: row.decision,
    deferredUntil: row.deferred_until,
    evidenceDate: row.evidence_date,
    id: row.id,
    idempotencyKey: row.idempotency_key ?? null,
    nextReviewDue: row.next_review_due,
    notes: row.notes,
    payloadHash: row.payload_hash ?? null,
    planId: row.plan_id,
    planVersionNumber: row.plan_version_number,
    status: row.status,
    updatedAt: row.updated_at
  };
}
