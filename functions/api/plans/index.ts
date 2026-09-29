/// <reference types="@cloudflare/workers-types" />

import {
  createFirePlan,
  InvalidGoalLinkError,
  listFirePlans,
  parseFirePlanPayload,
  readJsonBody
} from '../../_lib/firePlans';
import { json } from '../../_lib/http';
import { handleApiError, requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';
import { recordServerEvent } from '../../_lib/analytics';

type PlansEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<PlansEnv> = async ({ request, env }) => {
  const context = await requirePlansContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    return json({ plans: await listFirePlans(context.database, context.userId) });
  } catch (error) {
    return handleApiError(error, 'Unable to load plans.');
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
    const plan = await createFirePlan(context.database, context.userId, parsed.value);
    await recordServerEvent(context.database, context.userId, 'decision_saved', { family: 'fire' });
    return json({ plan }, 201);
  } catch (error) {
    if (error instanceof InvalidGoalLinkError) {
      return json({ error: error.message }, 400);
    }

    return handleApiError(error, 'Unable to save plan.');
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
