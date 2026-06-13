/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

type JsonRecord = Record<string, unknown>;

export type FirePlanPayload = {
  name: string;
  result: JsonRecord;
  snapshot: JsonRecord;
};

export type StoredFirePlan = {
  createdAt: string;
  id: string;
  name: string;
  result: JsonRecord;
  snapshot: JsonRecord;
  updatedAt: string;
  versionNumber: number;
};

type FirePlanRow = {
  created_at: string;
  id: string;
  input_json: string;
  name: string;
  result_json: string;
  updated_at: string;
  version_number: number;
};

export async function listFirePlans(database: D1Database, userId: string): Promise<StoredFirePlan[]> {
  await ensureUserProfile(database, userId);

  const result = await database
    .prepare(
      `
        SELECT
          p.id,
          p.name,
          p.created_at,
          p.updated_at,
          pv.version_number,
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
          p.created_at,
          p.updated_at,
          pv.version_number,
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
      `
    )
    .bind(userId, planId)
    .first<FirePlanRow>();

  return row ? toStoredFirePlan(row) : null;
}

export async function createFirePlan(
  database: D1Database,
  userId: string,
  payload: FirePlanPayload
): Promise<StoredFirePlan> {
  await ensureUserProfile(database, userId);

  const planId = crypto.randomUUID();
  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();

  await database.batch([
    database
      .prepare(
        `
          INSERT INTO plans (id, user_id, name, plan_type, status, created_at, updated_at)
          VALUES (?, ?, ?, 'fire', 'active', ?, ?)
        `
      )
      .bind(planId, userId, payload.name, now, now),
    database
      .prepare(
        `
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `
      )
      .bind(versionId, planId, userId, payload.name, now),
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

  const versionId = crypto.randomUUID();
  const now = new Date().toISOString();
  const versionNumber = existing.versionNumber + 1;

  await database.batch([
    database
      .prepare(
        `
          UPDATE plans
          SET name = ?, updated_at = ?, status = 'active'
          WHERE id = ? AND user_id = ? AND plan_type = 'fire'
        `
      )
      .bind(payload.name, now, planId, userId),
    database
      .prepare(
        `
          INSERT INTO plan_versions (id, plan_id, user_id, version_number, label, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
        `
      )
      .bind(versionId, planId, userId, versionNumber, payload.name, now),
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
  | {
      ok: true;
      value: FirePlanPayload;
    }
  | {
      error: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const name = parsePlanName(value.name);

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

  return {
    ok: true,
    value: {
      name: name.value,
      result,
      snapshot
    }
  };
}

function parsePlanName(value: unknown):
  | {
      ok: true;
      value: string;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'string') {
    return { error: 'name must be a string.', ok: false };
  }

  const name = value.trim();

  if (name.length === 0) {
    return { error: 'name is required.', ok: false };
  }

  if (name.length > 120) {
    return { error: 'name must be 120 characters or fewer.', ok: false };
  }

  return { ok: true, value: name };
}

function toStoredFirePlan(row: FirePlanRow): StoredFirePlan {
  return {
    createdAt: row.created_at,
    id: row.id,
    name: row.name,
    result: parseJsonRecord(row.result_json),
    snapshot: parseJsonRecord(row.input_json),
    updatedAt: row.updated_at,
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
