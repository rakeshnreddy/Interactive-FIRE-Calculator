/// <reference types="@cloudflare/workers-types" />

import { listTransactionImports } from '../../../_lib/transactionImports';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type TransactionImportsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<TransactionImportsEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    return json({ imports: await listTransactionImports(db.database, session.auth.userId) });
  } catch {
    return json({ error: 'Unable to load transaction import history.' }, 500);
  }
};
