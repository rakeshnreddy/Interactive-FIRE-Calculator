/// <reference types="@cloudflare/workers-types" />

import { json } from './http';

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
    return { ok: false, response: json({ databaseConfigured: false }, 503) };
  }

  return { database: env.DB, ok: true };
}

export class UserDeletedError extends Error {
  constructor(message = 'User account has been deleted and cannot accept new data.') {
    super(message);
    this.name = 'UserDeletedError';
  }
}

export function handleApiError(error: unknown, fallbackMessage: string): Response {
  if (error instanceof UserDeletedError) {
    return json({ error: error.message }, 410);
  }
  return json({ error: fallbackMessage }, 500);
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
}
