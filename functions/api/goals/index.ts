/// <reference types="@cloudflare/workers-types" />

import {
  createGoal,
  listGoals,
  parseGoalCreatePayload,
  readJsonBody,
  summarizeGoals
} from '../../_lib/goals';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type GoalsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<GoalsEnv> = async ({ request, env }) => {
  const context = await requireGoalsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    const goals = await listGoals(context.database, context.userId);

    return json({ goals, summary: summarizeGoals(goals) });
  } catch {
    return json({ error: 'Unable to load goals.' }, 500);
  }
};

export const onRequestPost: PagesFunction<GoalsEnv> = async ({ request, env }) => {
  const context = await requireGoalsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseGoalCreatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json({ goal: await createGoal(context.database, context.userId, parsed.value) }, 201);
  } catch {
    return json({ error: 'Unable to create goal.' }, 500);
  }
};

async function requireGoalsContext(request: Request, env: GoalsEnv):
  Promise<
    | { database: D1Database; ok: true; userId: string }
    | { ok: false; response: Response }
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
