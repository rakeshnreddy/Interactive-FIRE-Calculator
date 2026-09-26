/// <reference types="@cloudflare/workers-types" />
import { ingestClientEvents } from '../../_lib/analytics';
import { apiError, json, readJsonBody } from '../../_lib/http';
import { handleApiError, requireDatabase, type DatabaseEnv } from '../../_lib/persistence';
import { requireClerkAuth, type ClerkEnv } from '../../_lib/session';

type Env = ClerkEnv & DatabaseEnv & { CF_PAGES_COMMIT_SHA?: string };

// Accepts allowlisted, consented events only (B12). Body size is capped by the API middleware.
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);
  if (!session.ok) return session.response;
  const db = requireDatabase(env);
  if (!db.ok) return db.response;
  try {
    const result = await ingestClientEvents(db.database, session.auth.userId, await readJsonBody(request), (env.CF_PAGES_COMMIT_SHA ?? 'local').slice(0, 12));
    if (result.status !== 202) return apiError(result.status, result.code, result.error);
    return json({ accepted: result.accepted, duplicates: result.duplicates }, 202);
  } catch (error) {
    return handleApiError(error, 'Unable to record analytics.');
  }
};
