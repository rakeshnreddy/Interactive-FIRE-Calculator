/// <reference types="@cloudflare/workers-types" />

import {
  parseTransactionImportPayload,
  previewTransactionImport
} from '../../../_lib/transactionImports';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type TransactionImportPreviewEnv = ClerkEnv & DatabaseEnv;

export const onRequestPost: PagesFunction<TransactionImportPreviewEnv> = async ({ request, env }) => {
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
    return json({ preview: await previewTransactionImport(db.database, session.auth.userId, parsed.value) });
  } catch {
    return json({ error: 'Unable to preview transaction import.' }, 500);
  }
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
