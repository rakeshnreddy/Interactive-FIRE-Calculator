import type { AuthState } from '../../auth';

export type SignedInAuth = Extract<AuthState, { status: 'signed-in' }>;

export async function authenticatedJsonRequest(
  auth: SignedInAuth,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await auth.getToken();

  if (!token) {
    throw new Error('No Clerk session token is available.');
  }

  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);

  if (init.body && !headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  return fetch(path, {
    ...init,
    headers
  });
}

export async function readApiJson<T>(
  response: Response,
  errorMessage: string,
  validator: (data: unknown) => T | null
): Promise<T> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body: unknown = await response.json();

  const validated = validator(body);
  if (validated === null || validated === undefined) {
    throw new Error(errorMessage);
  }

  return validated;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}
