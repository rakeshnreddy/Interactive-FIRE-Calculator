/// <reference types="@cloudflare/workers-types" />

import {
  archiveFirePlan,
  parseFirePlanPayload,
  readFirePlan,
  readJsonBody,
  updateFirePlan
} from '../../_lib/firePlans';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type PlanEnv = ClerkEnv & DatabaseEnv;
type PlanParams = 'id';

export const onRequestGet: PagesFunction<PlanEnv, PlanParams> = async ({ request, env, params }) => {
  const context = await requirePlanContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const plan = await readFirePlan(context.database, context.userId, context.planId);

    if (!plan) {
      return json({ error: 'Plan not found.' }, 404);
    }

    return json({ plan });
  } catch {
    return json({ error: 'Unable to load plan.' }, 500);
  }
};

export const onRequestPut: PagesFunction<PlanEnv, PlanParams> = async ({ request, env, params }) => {
  const context = await requirePlanContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseFirePlanPayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const plan = await updateFirePlan(context.database, context.userId, context.planId, parsed.value);

    if (!plan) {
      return json({ error: 'Plan not found.' }, 404);
    }

    return json({ plan });
  } catch {
    return json({ error: 'Unable to update plan.' }, 500);
  }
};

export const onRequestDelete: PagesFunction<PlanEnv, PlanParams> = async ({ request, env, params }) => {
  const context = await requirePlanContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const archived = await archiveFirePlan(context.database, context.userId, context.planId);

    if (!archived) {
      return json({ error: 'Plan not found.' }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: 'Unable to delete plan.' }, 500);
  }
};

async function requirePlanContext(request: Request, env: PlanEnv, params: EventContext<PlanEnv, PlanParams, Record<string, unknown>>['params']):
  Promise<
    | {
      database: D1Database;
      ok: true;
      planId: string;
      userId: string;
    }
    | {
      ok: false;
      response: Response;
    }
  > {
  const planId = readPlanId(params);

  if (!planId) {
    return { ok: false, response: json({ error: 'Plan id is required.' }, 400) };
  }

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
    planId,
    userId: session.auth.userId
  };
}

function readPlanId(params: EventContext<PlanEnv, PlanParams, Record<string, unknown>>['params']): string | null {
  const id = params.id;
  const planId = Array.isArray(id) ? id[0] : id;
  const trimmed = planId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
