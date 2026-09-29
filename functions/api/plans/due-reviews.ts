/// <reference types="@cloudflare/workers-types" />

import { listDuePlanReviews } from '../../_lib/planReviews';
import { json } from '../../_lib/http';
import { handleApiError, requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type PlansEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<PlansEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    const url = new URL(request.url);
    const referenceDate = url.searchParams.get('referenceDate') || undefined;
    const dueReviews = await listDuePlanReviews(db.database, session.auth.userId, referenceDate);
    return json({ dueReviews });
  } catch (error) {
    return handleApiError(error, 'Unable to list due reviews.');
  }
};
