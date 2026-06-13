/// <reference types="@cloudflare/workers-types" />

import {
  addAccountBalance,
  listAccountBalances,
  parseBalanceCreatePayload,
  readJsonBody
} from '../../../_lib/accounts';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type BalanceEnv = ClerkEnv & DatabaseEnv;
type BalanceParams = 'id';

export const onRequestGet: PagesFunction<BalanceEnv, BalanceParams> = async ({ request, env, params }) => {
  const context = await requireBalanceContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const balances = await listAccountBalances(context.database, context.userId, context.accountId);

    if (!balances) {
      return json({ error: 'Account not found.' }, 404);
    }

    return json({ balances });
  } catch {
    return json({ error: 'Unable to load balances.' }, 500);
  }
};

export const onRequestPost: PagesFunction<BalanceEnv, BalanceParams> = async ({ request, env, params }) => {
  const context = await requireBalanceContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseBalanceCreatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const account = await addAccountBalance(context.database, context.userId, context.accountId, parsed.value);

    if (!account) {
      return json({ error: 'Account not found.' }, 404);
    }

    return json({ account }, 201);
  } catch {
    return json({ error: 'Unable to save balance.' }, 500);
  }
};

async function requireBalanceContext(
  request: Request,
  env: BalanceEnv,
  params: EventContext<BalanceEnv, BalanceParams, Record<string, unknown>>['params']
):
  Promise<
    | {
      accountId: string;
      database: D1Database;
      ok: true;
      userId: string;
    }
    | {
      ok: false;
      response: Response;
    }
  > {
  const accountId = readAccountId(params);

  if (!accountId) {
    return { ok: false, response: json({ error: 'Account id is required.' }, 400) };
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
    accountId,
    database: db.database,
    ok: true,
    userId: session.auth.userId
  };
}

function readAccountId(params: EventContext<BalanceEnv, BalanceParams, Record<string, unknown>>['params']): string | null {
  const id = params.id;
  const accountId = Array.isArray(id) ? id[0] : id;
  const trimmed = accountId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
