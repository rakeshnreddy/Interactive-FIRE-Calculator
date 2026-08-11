/// <reference types="@cloudflare/workers-types" />

import {
  parseBalanceImportPayload,
  previewBalanceImport
} from '../../../_lib/balanceImports';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type BalanceImportPreviewEnv = ClerkEnv & DatabaseEnv;

export const onRequestPost: PagesFunction<BalanceImportPreviewEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  const parsed = parseBalanceImportPayload(await readJsonBody(request));

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json({ preview: await previewBalanceImport(db.database, session.auth.userId, parsed.value) });
  } catch {
    return json({ error: 'Unable to preview balance import.' }, 500);
  }
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
