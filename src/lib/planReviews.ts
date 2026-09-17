export type PlanReviewDecision = 'keep' | 'revise' | 'defer';
export type PlanReviewStatus = 'draft' | 'completed' | 'deferred';
export type PlanReviewDueStatus = 'too-early' | 'up-to-date' | 'due' | 'overdue' | 'deferred';

export type StoredPlanReview = {
  completedAt: string | null;
  createdAt: string;
  decision: PlanReviewDecision;
  deferredUntil: string | null;
  evidenceDate: string;
  id: string;
  nextReviewDue: string;
  notes: string | null;
  planId: string;
  planVersionNumber: number;
  status: PlanReviewStatus;
  updatedAt: string;
};

export type PlanReviewPayload = {
  decision: PlanReviewDecision;
  deferDays?: number;
  evidenceDate: string;
  notes?: string | null;
  planVersionNumber: number;
};

export class ReviewTooEarlyError extends Error {
  constructor(daysSinceBaseline: number) {
    super(`First returning review requires at least 7 days from plan baseline (${daysSinceBaseline} days elapsed).`);
    this.name = 'ReviewTooEarlyError';
  }
}

export type DueStatusResult = {
  daysSinceBaseline: number;
  daysUntilEligible: number;
  deferredUntil: string | null;
  eligibleForReview: boolean;
  evidenceAgeDays: number;
  evidenceDate: string;
  isEvidenceStale: boolean;
  nextReviewDue: string;
  status: PlanReviewDueStatus;
};

export function calculatePlanReviewDueStatus(input: {
  evidenceDate?: string;
  latestReview?: {
    completedAt: string | null;
    createdAt: string;
    decision: PlanReviewDecision;
    deferredUntil: string | null;
    evidenceDate: string;
    id: string;
    nextReviewDue: string;
    status: PlanReviewStatus;
  } | null;
  planCreatedAt: string;
  referenceDate?: string;
}): DueStatusResult {
  const ref = input.referenceDate ? parseToUtcMidnight(input.referenceDate) : getTodayUtcMidnight();
  const baseline = parseToUtcMidnight(input.planCreatedAt);

  const daysSinceBaseline = Math.floor((ref.getTime() - baseline.getTime()) / (24 * 60 * 60 * 1000));
  const daysUntilEligible = Math.max(0, 7 - daysSinceBaseline);
  const eligibleForReview = Boolean(input.latestReview) || daysSinceBaseline >= 7;

  // Stale evidence calculation
  const evalEvidenceDate = input.evidenceDate ?? input.latestReview?.evidenceDate ?? input.planCreatedAt.slice(0, 10);
  const evidenceUtc = parseToUtcMidnight(evalEvidenceDate);
  const evidenceAgeDays = Math.max(0, Math.floor((ref.getTime() - evidenceUtc.getTime()) / (24 * 60 * 60 * 1000)));
  const isEvidenceStale = evidenceAgeDays > 30;

  // 1. If never reviewed and < 7 days elapsed from baseline
  if (!input.latestReview && daysSinceBaseline < 7) {
    const nextDue = addDaysUtc(baseline, 30);
    return {
      daysSinceBaseline,
      daysUntilEligible,
      deferredUntil: null,
      eligibleForReview: false,
      evidenceAgeDays,
      evidenceDate: evalEvidenceDate,
      isEvidenceStale,
      nextReviewDue: formatYmdUtc(nextDue),
      status: 'too-early'
    };
  }

  // 2. If latest review was deferred
  if (input.latestReview && input.latestReview.decision === 'defer' && input.latestReview.deferredUntil) {
    const deferUtc = parseToUtcMidnight(input.latestReview.deferredUntil);
    const deferredUntilStr = input.latestReview.deferredUntil;

    if (ref.getTime() < deferUtc.getTime()) {
      return {
        daysSinceBaseline,
        daysUntilEligible: 0,
        deferredUntil: deferredUntilStr,
        eligibleForReview: true,
        evidenceAgeDays,
        evidenceDate: evalEvidenceDate,
        isEvidenceStale,
        nextReviewDue: deferredUntilStr,
        status: 'deferred'
      };
    }

    // When deferred date has arrived
    const msPastDefer = ref.getTime() - deferUtc.getTime();
    const daysPastDefer = Math.floor(msPastDefer / (24 * 60 * 60 * 1000));

    return {
      daysSinceBaseline,
      daysUntilEligible: 0,
      deferredUntil: deferredUntilStr,
      eligibleForReview: true,
      evidenceAgeDays,
      evidenceDate: evalEvidenceDate,
      isEvidenceStale,
      nextReviewDue: deferredUntilStr,
      status: daysPastDefer > 14 ? 'overdue' : 'due'
    };
  }

  // 3. Normal review due calculation (baseline >= 7d or previous completed review)
  let nextDueUtc: Date;
  let nextDueStr: string;

  if (input.latestReview) {
    nextDueUtc = parseToUtcMidnight(input.latestReview.nextReviewDue);
    nextDueStr = input.latestReview.nextReviewDue;
  } else {
    nextDueUtc = addDaysUtc(baseline, 30);
    nextDueStr = formatYmdUtc(nextDueUtc);
  }

  if (ref.getTime() < nextDueUtc.getTime()) {
    return {
      daysSinceBaseline,
      daysUntilEligible: 0,
      deferredUntil: null,
      eligibleForReview: true,
      evidenceAgeDays,
      evidenceDate: evalEvidenceDate,
      isEvidenceStale,
      nextReviewDue: nextDueStr,
      status: 'up-to-date'
    };
  }

  const msPastDue = ref.getTime() - nextDueUtc.getTime();
  const daysPastDue = Math.floor(msPastDue / (24 * 60 * 60 * 1000));

  return {
    daysSinceBaseline,
    daysUntilEligible: 0,
    deferredUntil: null,
    eligibleForReview: true,
    evidenceAgeDays,
    evidenceDate: evalEvidenceDate,
    isEvidenceStale,
    nextReviewDue: nextDueStr,
    status: daysPastDue > 14 ? 'overdue' : 'due'
  };
}

export function parsePlanReviewPayload(body: unknown):
  | { ok: true; value: PlanReviewPayload }
  | { error: string; ok: false } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const raw = body as Record<string, unknown>;

  if (
    typeof raw.planVersionNumber !== 'number' ||
    !Number.isInteger(raw.planVersionNumber) ||
    raw.planVersionNumber < 1
  ) {
    return { error: 'planVersionNumber must be a positive integer.', ok: false };
  }

  if (typeof raw.evidenceDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.evidenceDate.trim())) {
    return { error: 'evidenceDate must be a valid date in YYYY-MM-DD format.', ok: false };
  }

  const decision = typeof raw.decision === 'string' ? raw.decision.trim().toLowerCase() : '';
  if (decision !== 'keep' && decision !== 'revise' && decision !== 'defer') {
    return { error: "decision must be one of 'keep', 'revise', or 'defer'.", ok: false };
  }

  let deferDays: number | undefined;
  if (decision === 'defer') {
    if (raw.deferDays !== undefined) {
      if (typeof raw.deferDays !== 'number' || !Number.isInteger(raw.deferDays) || raw.deferDays < 1 || raw.deferDays > 90) {
        return { error: 'deferDays must be an integer between 1 and 90.', ok: false };
      }
      deferDays = raw.deferDays;
    } else {
      deferDays = 14;
    }
  }

  let notes: string | null = null;
  if (raw.notes !== undefined && raw.notes !== null) {
    if (typeof raw.notes !== 'string') {
      return { error: 'notes must be a string.', ok: false };
    }
    if (raw.notes.trim().length > 1000) {
      return { error: 'notes must be 1000 characters or fewer.', ok: false };
    }
    notes = raw.notes.trim() || null;
  }

  return {
    ok: true,
    value: {
      decision: decision as PlanReviewDecision,
      deferDays,
      evidenceDate: raw.evidenceDate.trim(),
      notes,
      planVersionNumber: raw.planVersionNumber
    }
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
