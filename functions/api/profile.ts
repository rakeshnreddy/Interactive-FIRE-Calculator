/// <reference types="@cloudflare/workers-types" />

import { json } from '../_lib/http';
import { ensureUserProfile, requireDatabase } from '../_lib/persistence';
import { requireClerkAuth } from '../_lib/session';
import type { ClerkEnv } from '../_lib/session';

type ProfileEnv = ClerkEnv & {
  DB?: D1Database;
};

type ProfileRow = {
  birth_year: number | null;
  default_currency: string;
  display_name: string | null;
  household_name: string | null;
  target_retirement_age: number | null;
  updated_at: string;
  user_id: string;
};

type ProfilePayload = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName: string | null;
  householdName: string | null;
  targetRetirementAge: number | null;
  updatedAt: string;
  userId: string;
};

type ProfileUpdate = {
  birthYear?: number | null;
  defaultCurrency?: string;
  displayName?: string | null;
  householdName?: string | null;
  targetRetirementAge?: number | null;
};

export const onRequestGet: PagesFunction<ProfileEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  const profile = await ensureProfile(db.database, session.auth.userId);

  return json({ profile: toProfilePayload(profile) });
};

export const onRequestPut: PagesFunction<ProfileEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseProfileUpdate(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  await ensureProfile(db.database, session.auth.userId);
  const updated = await updateProfile(db.database, session.auth.userId, parsed.value);

  return json({ profile: toProfilePayload(updated) });
};

async function ensureProfile(database: D1Database, userId: string): Promise<ProfileRow> {
  await ensureUserProfile(database, userId);

  const profile = await readProfile(database, userId);

  if (!profile) {
    throw new Error('Failed to create user profile.');
  }

  return profile;
}

async function updateProfile(database: D1Database, userId: string, update: ProfileUpdate): Promise<ProfileRow> {
  const existing = await readProfile(database, userId);

  if (!existing) {
    throw new Error('User profile does not exist.');
  }

  const nextProfile = {
    birthYear: update.birthYear === undefined ? existing.birth_year : update.birthYear,
    defaultCurrency: update.defaultCurrency ?? existing.default_currency,
    displayName: update.displayName === undefined ? existing.display_name : update.displayName,
    householdName: update.householdName === undefined ? existing.household_name : update.householdName,
    targetRetirementAge:
      update.targetRetirementAge === undefined ? existing.target_retirement_age : update.targetRetirementAge
  };
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        UPDATE user_profiles
        SET
          display_name = ?,
          household_name = ?,
          default_currency = ?,
          birth_year = ?,
          target_retirement_age = ?,
          updated_at = ?
        WHERE user_id = ?
      `
    )
    .bind(
      nextProfile.displayName,
      nextProfile.householdName,
      nextProfile.defaultCurrency,
      nextProfile.birthYear,
      nextProfile.targetRetirementAge,
      now,
      userId
    )
    .run();

  const profile = await readProfile(database, userId);

  if (!profile) {
    throw new Error('Failed to update user profile.');
  }

  return profile;
}

async function readProfile(database: D1Database, userId: string): Promise<ProfileRow | null> {
  return database
    .prepare(
      `
        SELECT
          user_id,
          display_name,
          household_name,
          default_currency,
          birth_year,
          target_retirement_age,
          updated_at
        FROM user_profiles
        WHERE user_id = ?
      `
    )
    .bind(userId)
    .first<ProfileRow>();
}

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function parseProfileUpdate(value: unknown):
  | {
      ok: true;
      value: ProfileUpdate;
    }
  | {
      error: string;
      ok: false;
    } {
  if (!isRecord(value)) {
    return { error: 'Request body must be a JSON object.', ok: false };
  }

  const update: ProfileUpdate = {};

  if ('displayName' in value) {
    const displayName = parseOptionalText(value.displayName, 80, 'displayName');

    if (!displayName.ok) {
      return displayName;
    }

    update.displayName = displayName.value;
  }

  if ('householdName' in value) {
    const householdName = parseOptionalText(value.householdName, 120, 'householdName');

    if (!householdName.ok) {
      return householdName;
    }

    update.householdName = householdName.value;
  }

  if ('defaultCurrency' in value) {
    const defaultCurrency = parseCurrency(value.defaultCurrency);

    if (!defaultCurrency.ok) {
      return defaultCurrency;
    }

    update.defaultCurrency = defaultCurrency.value;
  }

  if ('birthYear' in value) {
    const birthYear = parseOptionalInteger(value.birthYear, 1900, 2200, 'birthYear');

    if (!birthYear.ok) {
      return birthYear;
    }

    update.birthYear = birthYear.value;
  }

  if ('targetRetirementAge' in value) {
    const targetRetirementAge = parseOptionalInteger(value.targetRetirementAge, 18, 100, 'targetRetirementAge');

    if (!targetRetirementAge.ok) {
      return targetRetirementAge;
    }

    update.targetRetirementAge = targetRetirementAge.value;
  }

  return { ok: true, value: update };
}

function parseOptionalText(
  value: unknown,
  maxLength: number,
  fieldName: string
):
  | {
      ok: true;
      value: string | null;
    }
  | {
      error: string;
      ok: false;
    } {
  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string or null.`, ok: false };
  }

  const trimmed = value.trim();

  if (trimmed.length === 0) {
    return { ok: true, value: null };
  }

  if (trimmed.length > maxLength) {
    return { error: `${fieldName} must be ${maxLength} characters or fewer.`, ok: false };
  }

  return { ok: true, value: trimmed };
}

function parseCurrency(value: unknown):
  | {
      ok: true;
      value: string;
    }
  | {
      error: string;
      ok: false;
    } {
  if (typeof value !== 'string') {
    return { error: 'defaultCurrency must be a three-letter currency code.', ok: false };
  }

  const currency = value.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(currency)) {
    return { error: 'defaultCurrency must be a three-letter currency code.', ok: false };
  }

  return { ok: true, value: currency };
}

function parseOptionalInteger(
  value: unknown,
  min: number,
  max: number,
  fieldName: string
):
  | {
      ok: true;
      value: number | null;
    }
  | {
      error: string;
      ok: false;
    } {
  if (value === null) {
    return { ok: true, value: null };
  }

  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    return { error: `${fieldName} must be an integer from ${min} to ${max}, or null.`, ok: false };
  }

  return { ok: true, value };
}

function toProfilePayload(profile: ProfileRow): ProfilePayload {
  return {
    birthYear: profile.birth_year,
    defaultCurrency: profile.default_currency,
    displayName: profile.display_name,
    householdName: profile.household_name,
    targetRetirementAge: profile.target_retirement_age,
    updatedAt: profile.updated_at,
    userId: profile.user_id
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
