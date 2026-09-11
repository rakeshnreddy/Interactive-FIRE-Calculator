/// <reference types="@cloudflare/workers-types" />

import { archiveGoal, parseGoalUpdatePayload, readGoal, readJsonBody, updateGoal } from '../../_lib/goals';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type GoalEnv = ClerkEnv & DatabaseEnv;
type GoalParams = 'id';

export const onRequestGet: PagesFunction<GoalEnv, GoalParams> = async ({ request, env, params }) => {
  const context = await requireGoalContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const goal = await readGoal(context.database, context.userId, context.goalId);

    if (!goal) {
      return json({ error: 'Goal not found.' }, 404);
    }

    return json({ goal });
  } catch {
    return json({ error: 'Unable to load goal.' }, 500);
  }
};

export const onRequestPut: PagesFunction<GoalEnv, GoalParams> = async ({ request, env, params }) => {
  const context = await requireGoalContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseGoalUpdatePayload(body);

  if (!parsed.ok) {
    return json(
      parsed.code ? { code: parsed.code, error: parsed.error } : { error: parsed.error },
      400
    );
  }

  try {
    const goal = await updateGoal(context.database, context.userId, context.goalId, parsed.value);

    if (!goal) {
      return json({ error: 'Goal not found.' }, 404);
    }

    return json({ goal });
  } catch {
    return json({ error: 'Unable to update goal.' }, 500);
  }
};

export const onRequestDelete: PagesFunction<GoalEnv, GoalParams> = async ({ request, env, params }) => {
  const context = await requireGoalContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const archived = await archiveGoal(context.database, context.userId, context.goalId);

    if (!archived) {
      return json({ error: 'Goal not found.' }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: 'Unable to archive goal.' }, 500);
  }
};

async function requireGoalContext(
  request: Request,
  env: GoalEnv,
  params: EventContext<GoalEnv, GoalParams, Record<string, unknown>>['params']
):
  Promise<
    | { database: D1Database; goalId: string; ok: true; userId: string }
    | { ok: false; response: Response }
  > {
  const goalId = readGoalId(params);

  if (!goalId) {
    return { ok: false, response: json({ error: 'Goal id is required.' }, 400) };
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
    goalId,
    ok: true,
    userId: session.auth.userId
  };
}

function readGoalId(params: EventContext<GoalEnv, GoalParams, Record<string, unknown>>['params']): string | null {
  const id = params.id;
  const goalId = Array.isArray(id) ? id[0] : id;
  const trimmed = goalId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
