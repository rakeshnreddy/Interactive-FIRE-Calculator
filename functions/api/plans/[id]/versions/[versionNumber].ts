/// <reference types="@cloudflare/workers-types" />

import { parsePlanVersionNumber, readFirePlanVersion } from '../../../../_lib/firePlans';
import { json } from '../../../../_lib/http';
import { requireDatabase } from '../../../../_lib/persistence';
import { requireClerkAuth } from '../../../../_lib/session';
import type { DatabaseEnv } from '../../../../_lib/persistence';
import type { ClerkEnv } from '../../../../_lib/session';

type PlanVersionEnv = ClerkEnv & DatabaseEnv;
type PlanVersionParams = 'id' | 'versionNumber';

export const onRequestGet: PagesFunction<PlanVersionEnv, PlanVersionParams> = async ({ request, env, params }) => {
  const planId = readParam(params.id);
  const versionNumber = parsePlanVersionNumber(readParam(params.versionNumber) ?? undefined);

  if (!planId) {
    return json({ error: 'Plan id is required.' }, 400);
  }

  if (versionNumber === null) {
    return json({ error: 'Version number must be a positive integer.' }, 400);
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
    const version = await readFirePlanVersion(db.database, session.auth.userId, planId, versionNumber);

    if (!version) {
      return json({ error: 'Plan version not found.' }, 404);
    }

    return json({ version });
  } catch {
    return json({ error: 'Unable to load plan version.' }, 500);
  }
};

function readParam(value: string | string[] | undefined): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();

  return trimmed || null;
}
