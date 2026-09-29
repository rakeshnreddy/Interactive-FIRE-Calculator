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
  idempotencyKey?: string | null;
  nextReviewDue: string;
  notes: string | null;
  payloadHash?: string | null;
  planId: string;
  planVersionNumber: number;
  status: PlanReviewStatus;
  updatedAt: string;
};

export type PlanReviewPayload = {
  decision: PlanReviewDecision;
  deferDays?: number;
  evidenceDate: string;
  idempotencyKey?: string | null;
  notes?: string | null;
  planVersionNumber: number;
};

export class ReviewTooEarlyError extends Error {
  constructor(daysSinceBaseline: number) {
    super(`First returning review requires at least 7 days from plan baseline (${daysSinceBaseline} days elapsed).`);
    this.name = 'ReviewTooEarlyError';
  }
}

export class ReviewIdempotencyConflictError extends Error {
  public existingReview: StoredPlanReview;
  constructor(existingReview: StoredPlanReview) {
    super('A review for this cycle already exists with different parameters.');
    this.name = 'ReviewIdempotencyConflictError';
    this.existingReview = existingReview;
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

export async function loadDuePlanReviews(
  auth: { getToken: () => Promise<string | null>; status: string },
  referenceDate?: string
): Promise<{ dueReviews: DueReviewItem[] } | null> {
  const token = await auth.getToken();
  if (!token) return null;
  const url = referenceDate
    ? `/api/plans/due-reviews?referenceDate=${encodeURIComponent(referenceDate)}`
    : '/api/plans/due-reviews';
  const res = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  if (!res.ok) return null;
  return res.json();
}

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

export function isValidIsoDate(dateStr: string): boolean {
  if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    return false;
  }
  const [year, month, day] = dateStr.trim().split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  return (
    d.getUTCFullYear() === year &&
    d.getUTCMonth() === month - 1 &&
    d.getUTCDate() === day
  );
}

export function parsePlanReviewPayload(
  body: unknown,
  options?: { idempotencyHeader?: string | null }
):
  | { ok: true; value: PlanReviewPayload }
  | { code?: string; error: string; ok: false } {
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

  if (typeof raw.evidenceDate !== 'string' || !isValidIsoDate(raw.evidenceDate)) {
    return { code: 'INVALID_EVIDENCE_DATE', error: 'evidenceDate must be a valid calendar date in YYYY-MM-DD format.', ok: false };
  }

  const evidenceDateTrimmed = raw.evidenceDate.trim();
  const evidenceUtc = parseToUtcMidnight(evidenceDateTrimmed);
  const todayUtc = getTodayUtcMidnight();

  if (evidenceUtc.getTime() > todayUtc.getTime()) {
    return { code: 'FUTURE_EVIDENCE_DATE', error: 'evidenceDate cannot be in the future.', ok: false };
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

  let normalizedBodyKey: string | null | undefined = undefined;
  if (raw.idempotencyKey !== undefined) {
    if (raw.idempotencyKey === null || raw.idempotencyKey === '') {
      normalizedBodyKey = null;
    } else if (typeof raw.idempotencyKey !== 'string') {
      return { error: 'idempotencyKey must be a string.', ok: false };
    } else {
      const trimmed = raw.idempotencyKey.trim();
      if (trimmed.length > 120) {
        return { error: 'idempotencyKey must be 120 characters or fewer.', ok: false };
      }
      normalizedBodyKey = trimmed;
    }
  }

  let normalizedHeaderKey: string | null | undefined = undefined;
  if (options?.idempotencyHeader !== undefined && options.idempotencyHeader !== null) {
    if (typeof options.idempotencyHeader !== 'string') {
      return { error: 'Idempotency-Key header must be a string.', ok: false };
    }
    const trimmed = options.idempotencyHeader.trim();
    if (!trimmed) {
      normalizedHeaderKey = null;
    } else if (trimmed.length > 120) {
      return { error: 'Idempotency-Key header must be 120 characters or fewer.', ok: false };
    } else {
      normalizedHeaderKey = trimmed;
    }
  }

  let idempotencyKey: string | null | undefined = undefined;
  if (normalizedBodyKey && normalizedHeaderKey) {
    if (normalizedBodyKey !== normalizedHeaderKey) {
      return {
        code: 'IDEMPOTENCY_KEY_MISMATCH',
        error: 'Idempotency-Key header and request body idempotencyKey do not match.',
        ok: false
      };
    }
    idempotencyKey = normalizedBodyKey;
  } else if (normalizedBodyKey) {
    idempotencyKey = normalizedBodyKey;
  } else if (normalizedHeaderKey) {
    idempotencyKey = normalizedHeaderKey;
  } else if (normalizedBodyKey === null || normalizedHeaderKey === null) {
    idempotencyKey = null;
  }

  return {
    ok: true,
    value: {
      decision: decision as PlanReviewDecision,
      deferDays,
      evidenceDate: evidenceDateTrimmed,
      idempotencyKey,
      notes,
      planVersionNumber: raw.planVersionNumber
    }
  };
}

export async function hashPlanReviewPayload(input: {
  decision: string;
  deferDays?: number | null;
  notes?: string | null;
  planVersionNumber: number;
}): Promise<string> {
  const canonical = {
    decision: input.decision,
    deferDays: input.deferDays ?? (input.decision === 'defer' ? 14 : null),
    notes: input.notes?.trim() || null,
    planVersionNumber: input.planVersionNumber
  };
  const jsonString = JSON.stringify(canonical);
  const data = new TextEncoder().encode(jsonString);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export function parseToUtcMidnight(dateStr: string): Date {
  const [year, month, day] = dateStr.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function getTodayUtcMidnight(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function addDaysUtc(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

export function formatYmdUtc(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
