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

export async function ensureUserProfile(database: D1Database, userId: string): Promise<void> {
  const now = new Date().toISOString();

  await database
    .prepare(
      `
        INSERT INTO users (id, provider, provider_user_id, created_at, updated_at)
        VALUES (?, 'clerk', ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          updated_at = excluded.updated_at,
          deleted_at = NULL
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
