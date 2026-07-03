/// <reference types="@cloudflare/workers-types" />

import {
  archiveTransaction,
  parseTransactionUpdatePayload,
  readJsonBody,
  readTransaction,
  updateTransaction
} from '../../_lib/transactions';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type TransactionEnv = ClerkEnv & DatabaseEnv;
type TransactionParams = 'id';

export const onRequestGet: PagesFunction<TransactionEnv, TransactionParams> = async ({ request, env, params }) => {
  const context = await requireTransactionContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const transaction = await readTransaction(context.database, context.userId, context.transactionId);

    if (!transaction) {
      return json({ error: 'Transaction not found.' }, 404);
    }

    return json({ transaction });
  } catch {
    return json({ error: 'Unable to load transaction.' }, 500);
  }
};

export const onRequestPut: PagesFunction<TransactionEnv, TransactionParams> = async ({ request, env, params }) => {
  const context = await requireTransactionContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseTransactionUpdatePayload(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    const transaction = await updateTransaction(context.database, context.userId, context.transactionId, parsed.value);

    if (!transaction) {
      return json({ error: 'Transaction not found or accountId is not active and owned.' }, 404);
    }

    return json({ transaction });
  } catch {
    return json({ error: 'Unable to update transaction.' }, 500);
  }
};

export const onRequestDelete: PagesFunction<TransactionEnv, TransactionParams> = async ({ request, env, params }) => {
  const context = await requireTransactionContext(request, env, params);

  if (!context.ok) {
    return context.response;
  }

  try {
    const archived = await archiveTransaction(context.database, context.userId, context.transactionId);

    if (!archived) {
      return json({ error: 'Transaction not found.' }, 404);
    }

    return json({ ok: true });
  } catch {
    return json({ error: 'Unable to remove transaction.' }, 500);
  }
};

async function requireTransactionContext(
  request: Request,
  env: TransactionEnv,
  params: EventContext<TransactionEnv, TransactionParams, Record<string, unknown>>['params']
):
  Promise<
    | { database: D1Database; ok: true; transactionId: string; userId: string }
    | { ok: false; response: Response }
  > {
  const transactionId = readTransactionId(params);

  if (!transactionId) {
    return { ok: false, response: json({ error: 'Transaction id is required.' }, 400) };
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
    transactionId,
    userId: session.auth.userId
  };
}

function readTransactionId(
  params: EventContext<TransactionEnv, TransactionParams, Record<string, unknown>>['params']
): string | null {
  const id = params.id;
  const transactionId = Array.isArray(id) ? id[0] : id;
  const trimmed = transactionId?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : null;
}
