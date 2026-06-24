/// <reference types="@cloudflare/workers-types" />

import { exportAccountData } from '../../_lib/accountData';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type AccountDataEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<AccountDataEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    return json({ export: await exportAccountData(db.database, session.auth.userId) });
  } catch {
    return json({ error: 'Unable to export account data.' }, 500);
  }
};
