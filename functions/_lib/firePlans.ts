/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

type JsonRecord = Record<string, unknown>;

export type FirePlanPayload = {
  expectedVersionNumber?: number;
  goalId?: string | null;
  label: string | null;
  name: string;
  notes: string | null;
  result: JsonRecord;
  snapshot: JsonRecord;
};

export type StoredFirePlan = {
  createdAt: string;
  goalId: string | null;
  id: string;
  label: string | null;
  name: string;
  notes: string | null;
  result: JsonRecord;
  snapshot: JsonRecord;
  updatedAt: string;
  versionCreatedAt: string;
  versionNumber: number;
};

export type StoredFirePlanVersion = {
  createdAt: string;
  label: string | null;
  notes: string | null;
  result: JsonRecord;
  snapshot: JsonRecord;
  versionNumber: number;
};

export type StoredFirePlanVersionSummary = Omit<StoredFirePlanVersion, 'result' | 'snapshot'>;

type FirePlanRow = {
  created_at: string;
  goal_id: string | null;
  id: string;
  input_json: string;
  label: string | null;
  name: string;
  notes: string | null;
  result_json: string;
  updated_at: string;
  version_created_at: string;
  version_number: number;
};

type FirePlanVersionRow = {
  created_at: string;
  input_json: string;
  label: string | null;
  notes: string | null;
  result_json: string;
  version_number: number;
};

export class PlanVersionConflictError extends Error {
  constructor() {
    super('This plan changed after it was loaded. Refresh before saving another version.');
    this.name = 'PlanVersionConflictError';
  }
}

export class InvalidGoalLinkError extends Error {
  constructor() {
    super('The selected retirement goal is unavailable.');
    this.name = 'InvalidGoalLinkError';
  }
}

export async function listFirePlans(database: D1Database, userId: string): Promise<StoredFirePlan[]> {
  await ensureUserProfile(database, userId);

  const result = await database
    .prepare(
      `
        SELECT
          p.id,
          p.name,
          p.goal_id,
          p.created_at,
          p.updated_at,
          pv.version_number,
          pv.label,
          pv.notes,
          pv.created_at AS version_created_at,
          fpi.input_json,
          fpr.result_json
        FROM plans p
        JOIN plan_versions pv
          ON pv.plan_id = p.id
          AND pv.version_number = (
            SELECT MAX(version_number)
            FROM plan_versions latest
            WHERE latest.plan_id = p.id
          )
        JOIN fire_plan_inputs fpi ON fpi.plan_version_id = pv.id
        JOIN fire_plan_results fpr ON fpr.plan_version_id = pv.id
        WHERE p.user_id = ?
          AND p.plan_type = 'fire'
          AND p.status != 'archived'
          AND p.archived_at IS NULL
        ORDER BY p.updated_at DESC
        LIMIT 50
      `
    )
    .bind(userId)
    .all<FirePlanRow>();

  return result.results.map(toStoredFirePlan);
}

export async function readFirePlan(
  database: D1Database,
  userId: string,
  planId: string
): Promise<StoredFirePlan | null> {
  await ensureUserProfile(database, userId);

  const row = await database
    .prepare(
      `
        SELECT
          p.id,
          p.name,
          p.goal_id,
          p.created_at,
          p.updated_at,
          pv.version_number,
          pv.label,
          pv.notes,
          pv.created_at AS version_created_at,
          fpi.input_json,
          fpr.result_json
        FROM plans p
        JOIN plan_versions pv
          ON pv.plan_id = p.id
          AND pv.version_number = (
            SELECT MAX(version_number)
            FROM plan_versions latest
            WHERE latest.plan_id = p.id
          )
        JOIN fire_plan_inputs fpi ON fpi.plan_version_id = pv.id
        JOIN fire_plan_results fpr ON fpr.plan_version_id = pv.id
        WHERE p.user_id = ?
          AND p.id = ?
          AND p.plan_type = 'fire'
          AND p.status != 'archived'
          AND p.archived_at IS NULL
      `
    )
    .bind(userId, planId)
    .first<FirePlanRow>();

  return row ? toStoredFirePlan(row) : null;
}

export async function listFirePlanVersions(
  database: D1Database,
  userId: string,
  planId: string
): Promise<StoredFirePlanVersionSummary[] | null> {
  await ensureUserProfile(database, userId);

  if (!(await planBelongsToUser(database, userId, planId))) {
    return null;
  }

  const result = await database
    .prepare(
      `
        SELECT version_number, label, notes, created_at
        FROM plan_versions
        WHERE plan_id = ? AND user_id = ?
        ORDER BY version_number DESC
        LIMIT 100
      `
    )
    .bind(planId, userId)
    .all<Pick<FirePlanVersionRow, 'created_at' | 'label' | 'notes' | 'version_number'>>();

  return result.results.map((row) => ({
    createdAt: row.created_at,
    label: row.label,
    notes: row.notes,
    versionNumber: row.version_number
  }));
}

export async function readFirePlanVersion(
  database: D1Database,
  userId: string,
  planId: string,
  versionNumber: number
): Promise<StoredFirePlanVersion | null> {
  await ensureUserProfile(database, userId);

  const row = await database
    .prepare(
      `
        SELECT
          pv.version_number,
          pv.label,
          pv.notes,
          pv.created_at,
          fpi.input_json,
          fpr.result_json
        FROM plans p
        JOIN plan_versions pv ON pv.plan_id = p.id
        JOIN fire_plan_inputs fpi ON fpi.plan_version_id = pv.id
        JOIN fire_plan_results fpr ON fpr.plan_version_id = pv.id
        WHERE p.id = ?
          AND p.user_id = ?
          AND p.plan_type = 'fire'
          AND p.status != 'archived'
          AND p.archived_at IS NULL
          AND pv.user_id = ?
          AND pv.version_number = ?
      `
    )
    .bind(planId, userId, userId, versionNumber)
    .first<FirePlanVersionRow>();

  return row ? toStoredFirePlanVersion(row) : null;
}

export async function createFirePlan(
  database: D1Database,
  userId: string,
  payload: FirePlanPayload
): Promise<StoredFirePlan> {
  await ensureUserProfile(database, userId);
  await requireOwnedGoal(database, userId, payload.goalId ?? null);

  const planId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await database.batch([
    database
      .prepare(
        `
          INSERT INTO plans (id, user_id, goal_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'fire', 'active', ?, ?)
        `
      )
      .bind(planId, userId, payload.goalId ?? null, payload.name, now, now),
    database
      .prepare(
        `
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, notes, created_at)
          VALUES (?, ?, ?, 1, ?, ?, ?)
        `
      )
      .bind(versionId, planId, userId, payload.label ?? payload.name, payload.notes, now),
    database
      .prepare(
        `
          INSERT INTO fire_plan_inputs (plan_version_id, user_id, input_json, created_at)
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(versionId, userId, JSON.stringify(payload.snapshot), now),
    database
      .prepare(
        `
          INSERT INTO fire_plan_results (plan_version_id, user_id, result_json, created_at)
          VALUES (?, ?, ?, ?)
        `
      )
      .bind(versionId, userId, JSON.stringify(payload.result), now)
  ]);

  const plan = await readFirePlan(database, userId, planId);

  if (!plan) {
    throw new Error('Failed to create FIRE plan.');
  }

  return plan;
}

export async function updateFirePlan(
  database: D1Database,
  userId: string,
  planId: string,
  payload: FirePlanPayload
): Promise<StoredFirePlan | null> {
  await ensureUserProfile(database, userId);

  const existing = await readFirePlan(database, userId, planId);

  if (!existing) {
    return null;
  }

  if (
    payload.expectedVersionNumber !== undefined &&
    payload.expectedVersionNumber !== existing.versionNumber
  ) {
    throw new PlanVersionConflictError();
  }

  const nextGoalId = payload.goalId === undefined ? existing.goalId : payload.goalId;
  await requireOwnedGoal(database, userId, nextGoalId);

  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const versionNumber = existing.versionNumber + 1;

  try {
    await database.batch([
      database
        .prepare(
          `
            UPDATE plans
            SET name = ?, goal_id = ?, updated_at = ?, status = 'active', archived_at = NULL
            WHERE id = ? AND user_id = ? AND plan_type = 'fire'
          `
        )
        .bind(payload.name, nextGoalId, now, planId, userId),
      database
        .prepare(
          `
            INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `
        )
        .bind(
          versionId,
          planId,
          userId,
          versionNumber,
          payload.label ?? `Version ${versionNumber}`,
          payload.notes,
          now
        ),
      database
        .prepare(
          `
            INSERT INTO fire_plan_inputs (plan_version_id, user_id, input_json, created_at)
            VALUES (?, ?, ?, ?)
          `
        )
        .bind(versionId, userId, JSON.stringify(payload.snapshot), now),
      database
        .prepare(
          `
            INSERT INTO fire_plan_results (plan_version_id, user_id, result_json, created_at)
            VALUES (?, ?, ?, ?)
          `
        )
        .bind(versionId, userId, JSON.stringify(payload.result), now)
    ]);
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed: plan_versions/i.test(error.message)) {
      throw new PlanVersionConflictError();
    }

    throw error;
  }

  return readFirePlan(database, userId, planId);
}

export async function archiveFirePlan(database: D1Database, userId: string, planId: string): Promise<boolean> {
  await ensureUserProfile(database, userId);

  const now = new Date().toISOString();
  const result = await database
    .prepare(
      `
        UPDATE plans
        SET status = 'archived', archived_at = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND plan_type = 'fire'
          AND status != 'archived'
      `
    )
    .bind(now, now, planId, userId)
    .run();

  return result.meta.changes > 0;
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export function parseFirePlanPayload(value: unknown):
  | { ok: true; value: FirePlanPayload }
  | { error: string; ok: false } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const name = parseRequiredText(value.name, 'name', 120);

  if (!name.ok) {
    return name;
  }

  const snapshot = value.snapshot;

  if (!isRecord(snapshot) || !isRecord(snapshot.plan) || !isRecord(snapshot.timeline)) {
    return { error: 'snapshot must include plan and timeline objects.', ok: false };
  }

  const result = value.result;

  if (!isRecord(result)) {
    return { error: 'result must be a JSON object.', ok: false };
  }

  const goalId = parseOptionalId(value.goalId, 'goalId');

  if (!goalId.ok) {
    return goalId;
  }

  const label = parseOptionalText(value.label, 'label', 120);

  if (!label.ok) {
    return label;
  }

  const notes = parseOptionalText(value.notes, 'notes', 1000);

  if (!notes.ok) {
    return notes;
  }

  const expectedVersionNumber = parseOptionalVersionNumber(value.expectedVersionNumber);

  if (!expectedVersionNumber.ok) {
    return expectedVersionNumber;
  }

  return {
    ok: true,
    value: {
      expectedVersionNumber: expectedVersionNumber.value,
      goalId: goalId.value,
      label: label.value,
      name: name.value,
      notes: notes.value,
      result,
      snapshot
    }
  };
}

export function parsePlanVersionNumber(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

async function planBelongsToUser(database: D1Database, userId: string, planId: string): Promise<boolean> {
  const row = await database
    .prepare(
      `
        SELECT id
        FROM plans
        WHERE id = ?
          AND user_id = ?
          AND plan_type = 'fire'
          AND status != 'archived'
          AND archived_at IS NULL
      `
    )
    .bind(planId, userId)
    .first<{ id: string }>();

  return Boolean(row);
}

async function requireOwnedGoal(database: D1Database, userId: string, goalId: string | null): Promise<void> {
  if (goalId === null) {
    return;
  }

  const row = await database
    .prepare(
      `
        SELECT id
        FROM goals
        WHERE id = ?
          AND user_id = ?
          AND status != 'archived'
          AND archived_at IS NULL
      `
    )
    .bind(goalId, userId)
    .first<{ id: string }>();

  if (!row) {
    throw new InvalidGoalLinkError();
  }
}

function parseRequiredText(value: unknown, fieldName: string, maxLength: number):
  | { ok: true; value: string }
  | { error: string; ok: false } {
  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string.`, ok: false };
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return { error: `${fieldName} is required.`, ok: false };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed };
}

function parseOptionalText(value: unknown, fieldName: string, maxLength: number):
  | { ok: true; value: string | null }
  | { error: string; ok: false } {
  if (value === undefined || value === null || value === '') {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string or null.`, ok: false };
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed || null };
}

function parseOptionalId(value: unknown, fieldName: string):
  | { ok: true; value: string | null | undefined }
  | { error: string; ok: false } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (value === null || value === '') {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string' || value.trim().length > 128) {
    return { error: `${fieldName} must be a valid id or null.`, ok: false };
  }

  return { ok: true, value: value.trim() };
}

function parseOptionalVersionNumber(value: unknown):
  | { ok: true; value: number | undefined }
  | { error: string; ok: false } {
  if (value === undefined) {
    return { ok: true, value: undefined };
  }

  if (!Number.isSafeInteger(value) || (value as number) <= 0) {
    return { error: 'expectedVersionNumber must be a positive integer.', ok: false };
  }

  return { ok: true, value: value as number };
}

function toStoredFirePlan(row: FirePlanRow): StoredFirePlan {
  return {
    createdAt: row.created_at,
    goalId: row.goal_id,
    id: row.id,
    label: row.label,
    name: row.name,
    notes: row.notes,
    result: parseJsonRecord(row.result_json),
    snapshot: parseJsonRecord(row.input_json),
    updatedAt: row.updated_at,
    versionCreatedAt: row.version_created_at,
    versionNumber: row.version_number
  };
}

function toStoredFirePlanVersion(row: FirePlanVersionRow): StoredFirePlanVersion {
  return {
    createdAt: row.created_at,
    label: row.label,
    notes: row.notes,
    result: parseJsonRecord(row.result_json),
    snapshot: parseJsonRecord(row.input_json),
    versionNumber: row.version_number
  };
}

function parseJsonRecord(value: string): JsonRecord {
  const parsed = JSON.parse(value);

  if (!isRecord(parsed)) {
    throw new Error('Stored plan JSON was not an object.');
  }

  return parsed;
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
