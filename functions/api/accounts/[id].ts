/// <reference types="@cloudflare/workers-types" />

import {
  archiveAccount,
  parseAccountUpdatePayload,
  readAccount,
  readJsonBody,
  updateAccount
} from '../../_lib/accounts';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type AccountEnv = ClerkEnv & DatabaseEnv;
type AccountParams = 'id';

export const onRequestGet: PagesFunction<AccountEnv, AccountParams> = async ({ request, env, params }) => {
  const context = await requireAccountContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const account = await readAccount(context.database, context.userId, context.accountId);

    if (!account) {
      return json({ error: 'Account not found.' }, 404);
    }

    return json({ account });
  } catch {
    return json({ error: 'Unable to load account.' }, 500);
  }
};

export const onRequestPut: PagesFunction<AccountEnv, AccountParams> = async ({ request, env, params }) => {
  const context = await requireAccountContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseAccountUpdatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const account = await updateAccount(context.database, context.userId, context.accountId, parsed.value);

    if (!account) {
      return json({ error: 'Account not found.' }, 404);
    }

    return json({ account });
  } catch {
    return json({ error: 'Unable to update account.' }, 500);
  }
};

export const onRequestDelete: PagesFunction<AccountEnv, AccountParams> = async ({ request, env, params }) => {
  const context = await requireAccountContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const archived = await archiveAccount(context.database, context.userId, context.accountId);

    if (!archived) {
      return json({ error: 'Account not found.' }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: 'Unable to archive account.' }, 500);
  }
};

export async function requireAccountContext(
  request: Request,
  env: AccountEnv,
  params: EventContext<AccountEnv, AccountParams, Record<string, unknown>>['params']
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

function readAccountId(params: EventContext<AccountEnv, AccountParams, Record<string, unknown>>['params']): string | null {
  const id = params.id;
  const accountId = Array.isArray(id) ? id[0] : id;
  const trimmed = accountId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
