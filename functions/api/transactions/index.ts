/// <reference types="@cloudflare/workers-types" />

import {
  createTransaction,
  listTransactions,
  parseTransactionCreatePayload,
  readJsonBody,
  summarizeTransactions
} from '../../_lib/transactions';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type TransactionsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<TransactionsEnv> = async ({ request, env }) => {
  const context = await requireTransactionsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    const transactions = await listTransactions(context.database, context.userId);

    return json({ summary: summarizeTransactions(transactions), transactions });
  } catch {
    return json({ error: 'Unable to load transactions.' }, 500);
  }
};

export const onRequestPost: PagesFunction<TransactionsEnv> = async ({ request, env }) => {
  const context = await requireTransactionsContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseTransactionCreatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const transaction = await createTransaction(context.database, context.userId, parsed.value);

    if (!transaction) {
      return json({ error: 'accountId must reference an active owned account.' }, 400);
    }

    return json({ transaction }, 201);
  } catch {
    return json({ error: 'Unable to create transaction.' }, 500);
  }
};

async function requireTransactionsContext(request: Request, env: TransactionsEnv):
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
