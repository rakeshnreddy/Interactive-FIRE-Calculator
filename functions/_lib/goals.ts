/// <reference types="@cloudflare/workers-types" />

import { ensureUserProfile } from './persistence';

export const goalTypes = [
  'retirement',
  'emergency_fund',
  'debt_payoff',
  'home',
  'education',
  'travel',
  'custom'
] as const;

export const goalStatuses = ['active', 'paused', 'completed'] as const;

type GoalType = (typeof goalTypes)[number];
type GoalStatus = (typeof goalStatuses)[number];

export type Goal = {
  createdAt: string;
  currentAmountCents: number;
  daysUntilTarget: number | null;
  id: string;
  isOverdue: boolean;
  name: string;
  progressPercent: number;
  remainingAmountCents: number;
  status: GoalStatus;
  targetAmountCents: number | null;
  targetDate: string | null;
  goalType: GoalType;
  updatedAt: string;
};

export type GoalSummary = {
  activeGoalCount: number;
  completedGoalCount: number;
  fundedPercent: number;
  goalCount: number;
  nextGoal: Goal | null;
  overdueGoalCount: number;
  pausedGoalCount: number;
  totalCurrentCents: number;
  totalTargetCents: number;
};

export type GoalCreatePayload = {
  currentAmountCents: number;
  goalType: GoalType;
  name: string;
  targetAmountCents: number;
  targetDate: string | null;
};

export type GoalUpdatePayload = {
  currentAmountCents?: number;
  goalType?: GoalType;
  name?: string;
  status?: GoalStatus;
  targetAmountCents?: number;
  targetDate?: string | null;
};

type GoalRow = {
  created_at: string;
  current_amount_cents: number;
  goal_type: GoalType;
  id: string;
  name: string;
  status: GoalStatus;
  target_amount_cents: number | null;
  target_date: string | null;
  updated_at: string;
};

const maxMoneyCents = 99_999_999_999_999;
const millisecondsPerDay = 24 * 60 * 60 * 1000;

export async function listGoals(database: D1Database, userId: string): Promise<Goal[]> {
  await ensureUserProfile(database, userId);

  const result = await database
    .prepare(
      `
        SELECT
          id,
          name,
          goal_type,
          target_amount_cents,
          current_amount_cents,
          target_date,
          status,
          created_at,
          updated_at
        FROM goals
        WHERE user_id = ?
          AND status != 'archived'
          AND archived_at IS NULL
        ORDER BY updated_at DESC, created_at DESC
        LIMIT 100
      `
    )
    .bind(userId)
    .all<GoalRow>();

  const today = todayDate();

  return result.results.map((row) => toGoal(row, today));
}

export async function readGoal(database: D1Database, userId: string, goalId: string): Promise<Goal | null> {
  await ensureUserProfile(database, userId);

  const row = await readGoalRow(database, userId, goalId);

  return row ? toGoal(row, todayDate()) : null;
}

export async function createGoal(
  database: D1Database,
  userId: string,
  payload: GoalCreatePayload
): Promise<Goal> {
  await ensureUserProfile(database, userId);

  const goalId = crypto.randomUUID();
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        INSERT INTO goals (
          id,
          user_id,
          name,
          goal_type,
          target_amount_cents,
          current_amount_cents,
          target_date,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
      `
    )
    .bind(
      goalId,
      userId,
      payload.name,
      payload.goalType,
      payload.targetAmountCents,
      payload.currentAmountCents,
      payload.targetDate,
      now,
      now
    )
    .run();

  const goal = await readGoal(database, userId, goalId);

  if (!goal) {
    throw new Error('Failed to create goal.');
  }

  return goal;
}

export async function updateGoal(
  database: D1Database,
  userId: string,
  goalId: string,
  payload: GoalUpdatePayload
): Promise<Goal | null> {
  await ensureUserProfile(database, userId);

  const existing = await readGoalRow(database, userId, goalId);

  if (!existing) {
    return null;
  }

  const nextGoal = {
    currentAmountCents: payload.currentAmountCents ?? existing.current_amount_cents,
    goalType: payload.goalType ?? existing.goal_type,
    name: payload.name ?? existing.name,
    status: payload.status ?? existing.status,
    targetAmountCents: payload.targetAmountCents ?? existing.target_amount_cents,
    targetDate: payload.targetDate === undefined ? existing.target_date : payload.targetDate
  };
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        UPDATE goals
        SET
          name = ?,
          goal_type = ?,
          target_amount_cents = ?,
          current_amount_cents = ?,
          target_date = ?,
          status = ?,
          updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status != 'archived'
          AND archived_at IS NULL
      `
    )
    .bind(
      nextGoal.name,
      nextGoal.goalType,
      nextGoal.targetAmountCents,
      nextGoal.currentAmountCents,
      nextGoal.targetDate,
      nextGoal.status,
      now,
      goalId,
      userId
    )
    .run();

  return readGoal(database, userId, goalId);
}

export async function archiveGoal(database: D1Database, userId: string, goalId: string): Promise<boolean> {
  await ensureUserProfile(database, userId);

  const now = new Date().toISOString();
  const result = await database
    .prepare(
      `
        UPDATE goals
        SET status = 'archived', archived_at = ?, updated_at = ?
        WHERE id = ?
          AND user_id = ?
          AND status != 'archived'
          AND archived_at IS NULL
      `
    )
    .bind(now, now, goalId, userId)
    .run();

  return result.meta.changes > 0;
}

export function summarizeGoals(goals: Goal[]): GoalSummary {
  let activeGoalCount = 0;
  let completedGoalCount = 0;
  let fundedAmountCents = 0;
  let overdueGoalCount = 0;
  let pausedGoalCount = 0;
  let totalCurrentCents = 0;
  let totalTargetCents = 0;
  let nextGoal: Goal | null = null;

  for (const goal of goals) {
    if (goal.status === 'active') {
      activeGoalCount += 1;
    } else if (goal.status === 'paused') {
      pausedGoalCount += 1;
    } else {
      completedGoalCount += 1;
    }

    if (goal.isOverdue) {
      overdueGoalCount += 1;
    }

    totalCurrentCents += goal.currentAmountCents;

    if (goal.targetAmountCents !== null) {
      totalTargetCents += goal.targetAmountCents;
      fundedAmountCents += Math.min(goal.currentAmountCents, goal.targetAmountCents);
    }

    if (
      goal.status !== 'completed' &&
      goal.targetDate !== null &&
      (nextGoal === null ||
        nextGoal.targetDate === null ||
        goal.targetDate < nextGoal.targetDate ||
        (goal.targetDate === nextGoal.targetDate && goal.createdAt < nextGoal.createdAt))
    ) {
      nextGoal = goal;
    }
  }

  return {
    activeGoalCount,
    completedGoalCount,
    fundedPercent: totalTargetCents === 0 ? 0 : roundPercent((fundedAmountCents / totalTargetCents) * 100),
    goalCount: goals.length,
    nextGoal,
    overdueGoalCount,
    pausedGoalCount,
    totalCurrentCents,
    totalTargetCents
  };
}

export async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export const INCOMPATIBLE_GOAL_CURRENCY_CODE = 'INCOMPATIBLE_GOAL_CURRENCY';
export const INCOMPATIBLE_GOAL_CURRENCY_MESSAGE =
  'Goals currently support USD only. Currency conversion into goals is not supported.';

export type GoalParseError = {
  code?: string;
  error: string;
  ok: false;
};

export function parseGoalCreatePayload(value: unknown):
  | { ok: true; value: GoalCreatePayload }
  | GoalParseError {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  if ('currency' in value && value.currency !== undefined && value.currency !== null) {
    if (typeof value.currency !== 'string' || value.currency.trim().toUpperCase() !== 'USD') {
      return {
        code: INCOMPATIBLE_GOAL_CURRENCY_CODE,
        error: INCOMPATIBLE_GOAL_CURRENCY_MESSAGE,
        ok: false
      };
    }
  }

  const name = parseGoalName(value.name);

  if (!name.ok) {
    return name;
  }

  const goalType = parseGoalType(value.goalType);

  if (!goalType.ok) {
    return goalType;
  }

  const targetAmountCents = parseMoneyCents(value.targetAmountCents, 'targetAmountCents', true);

  if (!targetAmountCents.ok) {
    return targetAmountCents;
  }

  const currentAmountCents = parseMoneyCents(value.currentAmountCents ?? 0, 'currentAmountCents', false);

  if (!currentAmountCents.ok) {
    return currentAmountCents;
  }

  const targetDate = parseTargetDate(value.targetDate, true);

  if (!targetDate.ok) {
    return targetDate;
  }

  return {
    ok: true,
    value: {
      currentAmountCents: currentAmountCents.value,
      goalType: goalType.value,
      name: name.value,
      targetAmountCents: targetAmountCents.value,
      targetDate: targetDate.value
    }
  };
}

export function parseGoalUpdatePayload(value: unknown):
  | { ok: true; value: GoalUpdatePayload }
  | GoalParseError {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  if ('currency' in value && value.currency !== undefined && value.currency !== null) {
    if (typeof value.currency !== 'string' || value.currency.trim().toUpperCase() !== 'USD') {
      return {
        code: INCOMPATIBLE_GOAL_CURRENCY_CODE,
        error: INCOMPATIBLE_GOAL_CURRENCY_MESSAGE,
        ok: false
      };
    }
  }

  const payload: GoalUpdatePayload = {};

  if ('name' in value) {
    const name = parseGoalName(value.name);

    if (!name.ok) {
      return name;
    }

    payload.name = name.value;
  }

  if ('goalType' in value) {
    const goalType = parseGoalType(value.goalType);

    if (!goalType.ok) {
      return goalType;
    }

    payload.goalType = goalType.value;
  }

  if ('targetAmountCents' in value) {
    const targetAmountCents = parseMoneyCents(value.targetAmountCents, 'targetAmountCents', true);

    if (!targetAmountCents.ok) {
      return targetAmountCents;
    }

    payload.targetAmountCents = targetAmountCents.value;
  }

  if ('currentAmountCents' in value) {
    const currentAmountCents = parseMoneyCents(value.currentAmountCents, 'currentAmountCents', false);

    if (!currentAmountCents.ok) {
      return currentAmountCents;
    }

    payload.currentAmountCents = currentAmountCents.value;
  }

  if ('targetDate' in value) {
    const targetDate = parseTargetDate(value.targetDate, false);

    if (!targetDate.ok) {
      return targetDate;
    }

    payload.targetDate = targetDate.value;
  }

  if ('status' in value) {
    const status = parseGoalStatus(value.status);

    if (!status.ok) {
      return status;
    }

    payload.status = status.value;
  }

  if (Object.keys(payload).length === 0) {
    return { error: 'At least one valid goal field is required.', ok: false };
  }

  return { ok: true, value: payload };
}

function readGoalRow(database: D1Database, userId: string, goalId: string): Promise<GoalRow | null> {
  return database
    .prepare(
      `
        SELECT
          id,
          name,
          goal_type,
          target_amount_cents,
          current_amount_cents,
          target_date,
          status,
          created_at,
          updated_at
        FROM goals
        WHERE id = ?
          AND user_id = ?
          AND status != 'archived'
          AND archived_at IS NULL
      `
    )
    .bind(goalId, userId)
    .first<GoalRow>();
}

function toGoal(row: GoalRow, today: string): Goal {
  const progressPercent = calculateProgressPercent(row.current_amount_cents, row.target_amount_cents);

  return {
    createdAt: row.created_at,
    currentAmountCents: row.current_amount_cents,
    daysUntilTarget: calculateDaysUntilTarget(row.target_date, today),
    goalType: row.goal_type,
    id: row.id,
    isOverdue:
      row.status !== 'completed' && row.target_date !== null && row.target_date < today && progressPercent < 100,
    name: row.name,
    progressPercent,
    remainingAmountCents:
      row.target_amount_cents === null ? 0 : Math.max(row.target_amount_cents - row.current_amount_cents, 0),
    status: row.status,
    targetAmountCents: row.target_amount_cents,
    targetDate: row.target_date,
    updatedAt: row.updated_at
  };
}

function calculateProgressPercent(currentAmountCents: number, targetAmountCents: number | null): number {
  if (targetAmountCents === null || targetAmountCents <= 0) {
    return 0;
  }

  return roundPercent((currentAmountCents / targetAmountCents) * 100);
}

function roundPercent(value: number): number {
  return Math.round(Math.min(Math.max(value, 0), 100) * 10) / 10;
}

function calculateDaysUntilTarget(targetDate: string | null, today: string): number | null {
  if (targetDate === null) {
    return null;
  }

  const targetDay = Date.parse(`${targetDate}T00:00:00.000Z`);
  const currentDay = Date.parse(`${today}T00:00:00.000Z`);

  if (Number.isNaN(targetDay)) {
    return null;
  }

  return Math.round((targetDay - currentDay) / millisecondsPerDay);
}

function parseGoalName(value: unknown):
  | { ok: true; value: string }
  | { error: string; ok: false } {
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

function parseGoalType(value: unknown):
  | { ok: true; value: GoalType }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !goalTypes.includes(value as GoalType)) {
    return { error: 'goalType is not supported.', ok: false };
  }

  return { ok: true, value: value as GoalType };
}

function parseGoalStatus(value: unknown):
  | { ok: true; value: GoalStatus }
  | { error: string; ok: false } {
  if (typeof value !== 'string' || !goalStatuses.includes(value as GoalStatus)) {
    return { error: 'status must be active, paused, or completed.', ok: false };
  }

  return { ok: true, value: value as GoalStatus };
}

function parseMoneyCents(
  value: unknown,
  fieldName: string,
  requirePositive: boolean
):
  | { ok: true; value: number }
  | { error: string; ok: false } {
  const minimum = requirePositive ? 1 : 0;

  if (typeof value !== 'number' || !Number.isInteger(value) || value < minimum || value > maxMoneyCents) {
    return {
      error: `${fieldName} must be a ${requirePositive ? 'positive' : 'non-negative'} integer number of cents.`,
      ok: false
    };
  }

  return { ok: true, value };
}

function parseTargetDate(value: unknown, allowUndefined: boolean):
  | { ok: true; value: string | null }
  | { error: string; ok: false } {
  if ((allowUndefined && value === undefined) || value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return { error: 'targetDate must be an ISO date in YYYY-MM-DD format or null.', ok: false };
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return { error: 'targetDate must be a real calendar date.', ok: false };
  }

  return { ok: true, value };
}

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
