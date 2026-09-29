/// <reference types="@cloudflare/workers-types" />
import { ANALYTICS_CONSENT_VERSION } from '../../../src/lib/analytics';
import { grantConsent, readConsent, revokeConsent } from '../../_lib/analytics';
import { apiError, json, readJsonBody } from '../../_lib/http';
import { handleApiError, requireDatabase, type DatabaseEnv } from '../../_lib/persistence';
import { requireClerkAuth, type ClerkEnv } from '../../_lib/session';

type Env = ClerkEnv & DatabaseEnv;

async function context(request: Request, env: Env) {
  const session = await requireClerkAuth(request, env);
  if (!session.ok) return session;
  const db = requireDatabase(env);
  if (!db.ok) return db;
  return { ok: true as const, database: db.database, userId: session.auth.userId };
}

// Optional product analytics is off until the user turns it on (B12).
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const ctx = await context(request, env);
  if (!ctx.ok) return ctx.response;
  try {
    const consent = await readConsent(ctx.database, ctx.userId);
    return json({ granted: Boolean(consent), consentVersion: consent?.consentVersion ?? null, currentVersion: ANALYTICS_CONSENT_VERSION });
  } catch (error) {
    return handleApiError(error, 'Unable to read analytics preference.');
  }
};

export const onRequestPut: PagesFunction<Env> = async ({ request, env }) => {
  const ctx = await context(request, env);
  if (!ctx.ok) return ctx.response;
  const body = await readJsonBody(request);
  const granted = typeof body === 'object' && body !== null ? (body as { granted?: unknown }).granted : undefined;
  if (typeof granted !== 'boolean') return apiError(400, 'INVALID_CONSENT', 'granted must be true or false.');
  try {
    if (granted) await grantConsent(ctx.database, ctx.userId);
    else await revokeConsent(ctx.database, ctx.userId);
    return json({ granted, consentVersion: granted ? ANALYTICS_CONSENT_VERSION : null });
  } catch (error) {
    return handleApiError(error, 'Unable to update analytics preference.');
  }
};
