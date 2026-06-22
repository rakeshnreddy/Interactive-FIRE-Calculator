/// <reference types="@cloudflare/workers-types" />

import {
  createFirePlan,
  InvalidGoalLinkError,
  listFirePlans,
  parseFirePlanPayload,
  readJsonBody
} from '../../_lib/firePlans';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type PlansEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<PlansEnv> = async ({ request, env }) => {
  const context = await requirePlansContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    return json({ plans: await listFirePlans(context.database, context.userId) });
  } catch {
    return json({ error: 'Unable to load plans.' }, 500);
  }
};

export const onRequestPost: PagesFunction<PlansEnv> = async ({ request, env }) => {
  const context = await requirePlansContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseFirePlanPayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json({ plan: await createFirePlan(context.database, context.userId, parsed.value) }, 201);
  } catch (error) {
    if (error instanceof InvalidGoalLinkError) {
      return json({ error: error.message }, 400);
    }

    return json({ error: 'Unable to save plan.' }, 500);
  }
};

async function requirePlansContext(request: Request, env: PlansEnv):
  Promise<
    | {
      database: D1Database;
      ok: true;
      userId: string;
    }
    | {
      ok: false;
      response: Response;
    }
  > {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db;
  }

  return {
    database: db.database,
    ok: true,
    userId: session.auth.userId
  };
}
