/// <reference types="@cloudflare/workers-types" />

import { apiError, json } from './http';

export type DatabaseEnv = {
  DB?: D1Database;
};

export function requireDatabase(env: DatabaseEnv):
  | {
      database: D1Database;
      ok: true;
    }
  | {
      ok: false;
      response: Response;
    } {
  if (!env.DB) {
    return { ok: false, response: apiError(503, 'DATABASE_NOT_CONFIGURED', 'Account storage is not configured.', { databaseConfigured: false }) };
  }

  return { database: env.DB, ok: true };
}

export class UserDeletedError extends Error {
  constructor(message = 'User account has been deleted and cannot accept new data.') {
    super(message);
    this.name = 'UserDeletedError';
  }
}

// The tombstone triggers (migration 0006) abort with exactly this format. Only that contract is
// recognised; any other text that merely mentions USER_DELETED stays an ordinary error.
const DELETED_USER_TRIGGER = /\bUSER_DELETED: Cannot (?:insert|update) [a-z_]+ for deleted user\b/;

export function isDeletedUserTriggerError(error: unknown): boolean {
  return error instanceof Error && DELETED_USER_TRIGGER.test(error.message);
}

// Converts a database failure into the typed UserDeletedError when it is a tombstone trigger abort.
export function toTypedDatabaseError(error: unknown): unknown {
  return isDeletedUserTriggerError(error) ? new UserDeletedError() : error;
}

export function handleApiError(error: unknown, fallbackMessage: string): Response {
  const typed = toTypedDatabaseError(error);
  if (typed instanceof UserDeletedError) {
    return apiError(410, 'ACCOUNT_DELETED', typed.message);
  }
  return apiError(500, 'INTERNAL_ERROR', fallbackMessage);
}

export async function ensureUserProfile(database: D1Database, userId: string): Promise<void> {
  const existing = await database
    .prepare('SELECT deleted_at FROM users WHERE id = ?')
    .bind(userId)
    .first<{ deleted_at: string | null }>();

  if (existing?.deleted_at) {
    throw new UserDeletedError();
  }

  const now = new Date().toISOString();

  try {
    await database
      .prepare(
        `
          INSERT INTO users (id, provider, provider_user_id, created_at, updated_at)
          VALUES (?, 'clerk', ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            updated_at = excluded.updated_at
          WHERE users.deleted_at IS NULL
        `
      )
      .bind(userId, userId, now, now)
      .run();

    await database
      .prepare(
        `
          INSERT INTO user_profiles (user_id, created_at, updated_at)
          VALUES (?, ?, ?)
          ON CONFLICT(user_id) DO NOTHING
        `
      )
      .bind(userId, now, now)
      .run();
  } catch (error) {
    throw toTypedDatabaseError(error);
  }
}
