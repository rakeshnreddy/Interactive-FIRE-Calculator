/// <reference types="@cloudflare/workers-types" />

import {
  commitTransactionImport,
  DuplicateTransactionImportError,
  parseTransactionImportPayload
} from '../../../_lib/transactionImports';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type TransactionImportCommitEnv = ClerkEnv & DatabaseEnv;

export const onRequestPost: PagesFunction<TransactionImportCommitEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  const parsed = parseTransactionImportPayload(await readJsonBody(request));

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json(await commitTransactionImport(db.database, session.auth.userId, parsed.value), 201);
  } catch (error) {
    if (error instanceof DuplicateTransactionImportError) {
      return json({ error: error.message }, 409);
    }

    if (error instanceof Error && error.message === 'No reviewed rows are ready to import.') {
      return json({ error: error.message }, 400);
    }

    return json({ error: 'Unable to commit transaction import.' }, 500);
  }
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
