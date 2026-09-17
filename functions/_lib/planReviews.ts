/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';
export * from '../../src/lib/planReviews';
import {
  calculatePlanReviewDueStatus,
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
  next_review_due: string;
  notes: string | null;
  plan_id: string;
  plan_version_number: number;
  status: PlanReviewStatus;
  updated_at: string;
  user_id: string;
};

export async function createPlanReview(
  database: D1Database,
  userId: string,
  planId: string,
  payload: PlanReviewPayload
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
        SELECT id
        FROM plan_reviews
        WHERE plan_id = ? AND user_id = ?
        LIMIT 1
      `
    )
    .bind(planId, userId)
    .first<{ id: string }>();

  const baselineUtc = parseToUtcMidnight(plan.created_at);
  const evidenceUtc = parseToUtcMidnight(payload.evidenceDate);
  const nowUtc = getTodayUtcMidnight();
  const daysSinceBaseline = Math.floor((nowUtc.getTime() - baselineUtc.getTime()) / (24 * 60 * 60 * 1000));

  if (!priorReview && daysSinceBaseline < 7) {
    throw new ReviewTooEarlyError(Math.max(0, daysSinceBaseline));
  }

  // 4. Check idempotency: identical submission for this (plan, version, evidence_date)
  const existing = await database
    .prepare(
      `
        SELECT
          id, user_id, plan_id, plan_version_number, evidence_date,
          decision, status, notes, completed_at, deferred_until,
          next_review_due, created_at, updated_at
        FROM plan_reviews
        WHERE user_id = ? AND plan_id = ? AND plan_version_number = ? AND evidence_date = ?
        LIMIT 1
      `
    )
    .bind(userId, planId, payload.planVersionNumber, payload.evidenceDate)
    .first<PlanReviewRow>();

  if (existing) {
    const stored = toStoredPlanReview(existing);
    const dueStatus = calculatePlanReviewDueStatus({
      planCreatedAt: plan.created_at,
      latestReview: stored,
      evidenceDate: payload.evidenceDate
    });
    return { dueStatus, isDuplicate: true, review: stored };
  }

  // 5. Insert new review
  const reviewId = crypto.randomUUID();
  const now = new Date().toISOString();

  let status: PlanReviewStatus;
  let completedAt: string | null = null;
  let deferredUntil: string | null = null;
  let nextReviewDue: string;

  if (payload.decision === 'defer') {
    status = 'deferred';
    const deferDays = payload.deferDays ?? 14;
    deferredUntil = formatYmdUtc(addDaysUtc(evidenceUtc, deferDays));
    nextReviewDue = deferredUntil;
  } else {
    status = 'completed';
    completedAt = now;
    nextReviewDue = formatYmdUtc(addDaysUtc(evidenceUtc, 30));
  }

  await database
    .prepare(
      `
        INSERT INTO plan_reviews (
          id, user_id, plan_id, plan_version_number, evidence_date,
          decision, status, notes, completed_at, deferred_until,
          next_review_due, created_at, updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      now,
      now
    )
    .run();

  const newReview: StoredPlanReview = {
    completedAt,
    createdAt: now,
    decision: payload.decision,
    deferredUntil,
    evidenceDate: payload.evidenceDate,
    id: reviewId,
    nextReviewDue,
    notes: payload.notes ?? null,
    planId,
    planVersionNumber: payload.planVersionNumber,
    status,
    updatedAt: now
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
          next_review_due, created_at, updated_at
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
    nextReviewDue: row.next_review_due,
    notes: row.notes,
    planId: row.plan_id,
    planVersionNumber: row.plan_version_number,
    status: row.status,
    updatedAt: row.updated_at
  };
}

function parseToUtcMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function getTodayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function formatYmdUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
