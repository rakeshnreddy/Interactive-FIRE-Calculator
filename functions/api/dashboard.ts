/// <reference types="@cloudflare/workers-types" />

import { listAccounts, summarizeAccounts } from '../_lib/accounts';
import { listGoals, summarizeGoals } from '../_lib/goals';
import { json } from '../_lib/http';
import { requireDatabase } from '../_lib/persistence';
import { requireClerkAuth } from '../_lib/session';
import type { DatabaseEnv } from '../_lib/persistence';
import type { ClerkEnv } from '../_lib/session';

type DashboardEnv = ClerkEnv & DatabaseEnv;

export const onRequestGet: PagesFunction<DashboardEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  const db = requireDatabase(env);

  if (!db.ok) {
    return db.response;
  }

  try {
    const accounts = await listAccounts(db.database, session.auth.userId);
    const goals = await listGoals(db.database, session.auth.userId);

    return json({
      dashboard: {
        generatedAt: new Date().toISOString(),
        recentAccounts: accounts.slice(0, 5),
        recentGoals: goals.slice(0, 5),
        summary: summarizeAccounts(accounts),
        goalSummary: summarizeGoals(goals)
      }
    });
  } catch {
    return json({ error: 'Unable to load dashboard.' }, 500);
  }
};
