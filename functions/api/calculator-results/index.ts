/// <reference types="@cloudflare/workers-types" />

import {
  createSavedCalculatorResult,
  listSavedCalculatorResults,
  parseCalculatorSavePayload,
  readJsonBody
} from '../../_lib/calculatorResults';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type CalculatorResultsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<CalculatorResultsEnv> = async ({ request, env }) => {
  const context = await requireCalculatorResultsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    return json({ calculatorResults: await listSavedCalculatorResults(context.database, context.userId) });
  } catch {
    return json({ error: 'Unable to load saved calculator results.' }, 500);
  }
};

export const onRequestPost: PagesFunction<CalculatorResultsEnv> = async ({ request, env }) => {
  const context = await requireCalculatorResultsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseCalculatorSavePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const saved = await createSavedCalculatorResult(context.database, context.userId, parsed.value);
    return json(saved, 201);
  } catch {
    return json({ error: 'Unable to save calculator result.' }, 500);
  }
};

async function requireCalculatorResultsContext(request: Request, env: CalculatorResultsEnv):
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
