/// <reference types="@cloudflare/workers-types" />

import { json } from '../_lib/http';
import { requireClerkAuth } from '../_lib/session';
import type { ClerkEnv, SignedInSessionAuth } from '../_lib/session';

type MeIdentity = {
  orgId?: string;
  orgRole?: string;
  sessionId: string;
  userId: string;
};

export const onRequestGet: PagesFunction<ClerkEnv> = async ({ request, env }) => {
  const session = await requireClerkAuth(request, env);

  if (!session.ok) {
    return session.response;
  }

  return json(toMeIdentity(session.auth));
};

function toMeIdentity(auth: SignedInSessionAuth): MeIdentity {
  return {
    ...(auth.orgId ? { orgId: auth.orgId } : {}),
    ...(auth.orgRole ? { orgRole: auth.orgRole } : {}),
    sessionId: auth.sessionId,
    userId: auth.userId
  };
}
