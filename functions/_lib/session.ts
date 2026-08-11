/// <reference types="@cloudflare/workers-types" />

import { createClerkClient } from '@clerk/backend';
import type { SessionAuthObject } from '@clerk/backend';

import { json } from './http';

export type ClerkEnv = {
  CLERK_AUTHORIZED_PARTIES?: string;
  CLERK_JWT_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  CLERK_SECRET_KEY?: string;
};

type ClerkConfig =
  | {
      configured: true;
      jwtKey?: string;
      publishableKey: string;
      secretKey?: string;
    }
  | {
      configured: false;
    };

export type SignedInSessionAuth = Extract<SessionAuthObject, { isAuthenticated: true }>;

export type AuthResult =
  | {
      auth: SignedInSessionAuth;
      ok: true;
    }
  | {
      ok: false;
      response: Response;
    };

export async function requireClerkAuth(request: Request, env: ClerkEnv): Promise<AuthResult> {
  const config = readClerkConfig(env);

  if (!config.configured) {
    return { ok: false, response: json({ authConfigured: false }, 503) };
  }

  const clerkClient = createClerkClient({
    jwtKey: config.jwtKey,
    publishableKey: config.publishableKey,
    secretKey: config.secretKey
  });

  try {
    const requestState = await clerkClient.authenticateRequest(request, {
      acceptsToken: 'session_token',
      authorizedParties: getAuthorizedParties(request, env)
    });

    if (!requestState.isAuthenticated) {
      return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
    }

    return { auth: requestState.toAuth(), ok: true };
  } catch {
    return { ok: false, response: json({ error: 'Unauthorized' }, 401) };
  }
}

function readClerkConfig(env: ClerkEnv): ClerkConfig {
  const publishableKey = readEnvString(env.CLERK_PUBLISHABLE_KEY);
  const secretKey = readEnvString(env.CLERK_SECRET_KEY);
  const jwtKey = readEnvString(env.CLERK_JWT_KEY);

  if (!publishableKey || (!secretKey && !jwtKey)) {
    return { configured: false };
  }

  return {
    configured: true,
    jwtKey,
    publishableKey,
    secretKey
  };
}

function getAuthorizedParties(request: Request, env: ClerkEnv): string[] {
  const configuredParties = splitCommaSeparatedList(env.CLERK_AUTHORIZED_PARTIES);

  if (configuredParties.length > 0) {
    return configuredParties;
  }

  return [new URL(request.url).origin];
}

function splitCommaSeparatedList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function readEnvString(value: string | undefined): string | undefined {
  const trimmed = value?.trim();

  return trimmed && trimmed.length > 0 ? trimmed : undefined;
}
