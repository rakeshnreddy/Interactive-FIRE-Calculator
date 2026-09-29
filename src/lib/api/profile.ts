import { authenticatedJsonRequest, isRecord, type SignedInAuth } from './client';

export type AccountProfile = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName: string | null;
  householdName: string | null;
  targetRetirementAge: number | null;
  updatedAt: string;
  userId: string;
};

export type AccountProfileDraft = {
  birthYear: string;
  defaultCurrency: string;
  displayName: string;
  householdName: string;
  targetRetirementAge: string;
};

export type AccountProfileUpdate = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName: string | null;
  householdName: string | null;
  targetRetirementAge: number | null;
};

export const ACCOUNT_DATA_DELETE_CONFIRMATION = 'DELETE MY FINPATH DATA';

export function clearLocalDrafts(): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    const storage = window.localStorage;
    if (!storage) {
      return;
    }
    const keysToRemove: string[] = [];
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key) continue;
      if (key === 'finpath.colorMode') {
        continue;
      }
      if (
        key.startsWith('finpath.') ||
        key.startsWith('firecalc.') ||
        key.startsWith('fire_calc_')
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  } catch {
    // Storage access may be restricted in private browsing.
  }
}

export function optionalTextFromDraft(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

export function optionalIntegerFromDraft(value: string): number | null {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  return Number.isInteger(parsed) ? parsed : null;
}

export function emptyProfileDraft(): AccountProfileDraft {
  return {
    birthYear: '',
    defaultCurrency: 'USD',
    displayName: '',
    householdName: '',
    targetRetirementAge: ''
  };
}

export function profileToDraft(profile: AccountProfile): AccountProfileDraft {
  return {
    birthYear: profile.birthYear === null ? '' : String(profile.birthYear),
    defaultCurrency: profile.defaultCurrency,
    displayName: profile.displayName ?? '',
    householdName: profile.householdName ?? '',
    targetRetirementAge: profile.targetRetirementAge === null ? '' : String(profile.targetRetirementAge)
  };
}

export function draftToProfileUpdate(draft: AccountProfileDraft): AccountProfileUpdate {
  return {
    birthYear: optionalIntegerFromDraft(draft.birthYear),
    defaultCurrency: draft.defaultCurrency.trim().toUpperCase() || 'USD',
    displayName: optionalTextFromDraft(draft.displayName),
    householdName: optionalTextFromDraft(draft.householdName),
    targetRetirementAge: optionalIntegerFromDraft(draft.targetRetirementAge)
  };
}

export function toAccountProfile(value: unknown): AccountProfile | null {
  if (!isRecord(value) || typeof value.userId !== 'string' || typeof value.defaultCurrency !== 'string') {
    return null;
  }

  if (typeof value.updatedAt !== 'string') {
    return null;
  }

  return {
    birthYear: typeof value.birthYear === 'number' ? value.birthYear : null,
    defaultCurrency: value.defaultCurrency,
    displayName: typeof value.displayName === 'string' ? value.displayName : null,
    householdName: typeof value.householdName === 'string' ? value.householdName : null,
    targetRetirementAge: typeof value.targetRetirementAge === 'number' ? value.targetRetirementAge : null,
    updatedAt: value.updatedAt,
    userId: value.userId
  };
}

export async function readProfileResponse(response: Response, errorMessage: string): Promise<AccountProfile> {
  if (!response.ok) {
    throw new Error(errorMessage);
  }

  const body = await response.json();
  const profile = isRecord(body) ? toAccountProfile(body.profile) : null;

  if (!profile) {
    throw new Error(errorMessage);
  }

  return profile;
}

export async function loadAccountProfile(auth: SignedInAuth): Promise<AccountProfile> {
  const response = await authenticatedJsonRequest(auth, '/api/profile');

  return readProfileResponse(response, 'Unable to load account profile.');
}

export async function updateAccountProfile(
  auth: SignedInAuth,
  payload: AccountProfileUpdate
): Promise<AccountProfile> {
  const response = await authenticatedJsonRequest(auth, '/api/profile', {
    body: JSON.stringify(payload),
    method: 'PUT'
  });

  return readProfileResponse(response, 'Unable to save account profile.');
}

export async function loadAccountDataExport(auth: SignedInAuth): Promise<unknown> {
  const response = await authenticatedJsonRequest(auth, '/api/account-data/export');
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Unable to export account data.');
  }

  if (!isRecord(body) || !isRecord(body.export)) {
    throw new Error('Account data export was not recognized.');
  }

  return body.export;
}

export async function deleteAccountDataRecord(
  auth: SignedInAuth,
  confirmation: string
): Promise<unknown> {
  const response = await authenticatedJsonRequest(auth, '/api/account-data', {
    body: JSON.stringify({ confirmation }),
    method: 'DELETE'
  });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Unable to delete account data.');
  }

  return body;
}
