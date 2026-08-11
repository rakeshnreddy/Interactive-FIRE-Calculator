/// <reference types="@cloudflare/workers-types" />

import {
  deleteAccountData,
  parseAccountDataDeletionRequest
} from '../../_lib/accountData';
import { json } from '../../_lib/http';
import { requireDatabase } from '../../_lib/persistence';
import { requireClerkAuth } from '../../_lib/session';
import type { DatabaseEnv } from '../../_lib/persistence';
import type { ClerkEnv } from '../../_lib/session';

type AccountDataEnv = ClerkEnv & DatabaseEnv;

export const onRequestDelete: PagesFunction<AccountDataEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  const body = await readJsonBody(request);
  const parsed = parseAccountDataDeletionRequest(body);

  if (!parsed.ok) {
    return json({ error: parsed.error }, 400);
  }

  try {
    return json({
      deletion: await deleteAccountData(db.database, session.auth.userId),
      identity: {
        provider: 'clerk',
        deleted: false,
        detail: 'This removes FinPath D1 financial data only. Delete the Clerk account from the identity provider profile flow.'
      }
    });
  } catch {
    return json({ error: 'Unable to delete account data.' }, 500);
  }
};

async function readJsonBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
