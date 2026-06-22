/// <reference types="@cloudflare/workers-types" />

import { listBalanceImports } from '../../../_lib/balanceImports';
import { json } from '../../../_lib/http';
import { requireDatabase } from '../../../_lib/persistence';
import { requireClerkAuth } from '../../../_lib/session';
import type { DatabaseEnv } from '../../../_lib/persistence';
import type { ClerkEnv } from '../../../_lib/session';

type BalanceImportsEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<BalanceImportsEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    return json({ imports: await listBalanceImports(db.database, session.auth.userId) });
  } catch {
    return json({ error: 'Unable to load balance import history.' }, 500);
  }
};
