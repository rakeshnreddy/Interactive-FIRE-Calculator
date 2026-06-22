/// <reference types="@cloudflare/workers-types" />

import { listFirePlanVersions } from '../../../_lib/firePlans';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type PlanVersionsEnv = ClerkEnv & DatabaseEnv;
type PlanVersionsParams = 'id';

export const onRequestGet: PagesFunction<PlanVersionsEnv, PlanVersionsParams> = async ({ request, env, params }) => {
  const planId = readParam(params.id);

  if (!planId) {
    return json({ error: 'Plan id is required.' }, 400);
  }

  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    const versions = await listFirePlanVersions(db.database, session.auth.userId, planId);

    if (versions === null) {
      return json({ error: 'Plan not found.' }, 404);
    }

    return json({ versions });
  } catch {
    return json({ error: 'Unable to load plan versions.' }, 500);
  }
};

function readParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();

  return trimmed || null;
}
