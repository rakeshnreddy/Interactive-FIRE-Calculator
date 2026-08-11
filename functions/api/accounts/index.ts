/// <reference types="@cloudflare/workers-types" />

import {
  createAccount,
  listAccounts,
  parseAccountCreatePayload,
  readJsonBody,
  summarizeAccounts
} from '../../_lib/accounts';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type AccountsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<AccountsEnv> = async ({ request, env }) => {
  const context = await requireAccountsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    const accounts = await listAccounts(context.database, context.userId);

    return json({ accounts, summary: summarizeAccounts(accounts) });
  } catch {
    return json({ error: 'Unable to load accounts.' }, 500);
  }
};

export const onRequestPost: PagesFunction<AccountsEnv> = async ({ request, env }) => {
  const context = await requireAccountsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseAccountCreatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json({ account: await createAccount(context.database, context.userId, parsed.value) }, 201);
  } catch {
    return json({ error: 'Unable to create account.' }, 500);
  }
};

async function requireAccountsContext(request: Request, env: AccountsEnv):
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
