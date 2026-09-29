import type { PlanningSavedPlan as SavedPlan, PlanningSnapshot as AppSnapshot } from '../../PlanningWorkspace';
import type { FirePlanResult } from '../fire';
import { authenticatedJsonRequest, isRecord, type SignedInAuth } from './client';

export type { SavedPlan, AppSnapshot };

export const SAVED_PLANS_KEY = 'firecalc.savedPlans.v1';

export function isAppSnapshot(value: unknown): value is AppSnapshot {
  if (!isRecord(value)) {
    return false;
  }

  return isRecord(value.plan) && isRecord(value.timeline);
}

export function readSavedPlans(): SavedPlan[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_PLANS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function writeSavedPlans(plans: SavedPlan[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SAVED_PLANS_KEY, JSON.stringify(plans.slice(0, 8)));
}

export class PlanRequestError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'PlanRequestError';
    this.status = status;
  }
}

export function planErrorMessage(error: unknown): string {
  if (error instanceof PlanRequestError && error.status === 409) {
    return 'This plan changed in another session. Latest versions were reloaded; review before saving again.';
  }

  return error instanceof Error
    ? error.message
    : 'Plan could not be saved to your account. JSON export is still available.';
}

export function toSavedPlan(value: unknown): SavedPlan | null {
  if (!isRecord(value) || typeof value.id !== 'string' || typeof value.name !== 'string') {
    return null;
  }

  if (typeof value.createdAt !== 'string' || !isAppSnapshot(value.snapshot)) {
    return null;
  }

  return {
    createdAt: value.createdAt,
    goalId: typeof value.goalId === 'string' || value.goalId === null ? value.goalId : undefined,
    id: value.id,
    label: typeof value.label === 'string' || value.label === null ? value.label : undefined,
    name: value.name,
    notes: typeof value.notes === 'string' || value.notes === null ? value.notes : undefined,
    result: isRecord(value.result) ? value.result as FirePlanResult : undefined,
    snapshot: value.snapshot,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : undefined,
    versionCreatedAt: typeof value.versionCreatedAt === 'string' ? value.versionCreatedAt : undefined,
    versionNumber: typeof value.versionNumber === 'number' ? value.versionNumber : undefined
  };
}

export async function readSavedPlanResponse(response: Response, errorMessage: string): Promise<SavedPlan> {
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new PlanRequestError(
      isRecord(body) && typeof body.error === 'string' ? body.error : errorMessage,
      response.status
    );
  }

  const plan = isRecord(body) ? toSavedPlan(body.plan) : null;

  if (!plan) {
    throw new Error(errorMessage);
  }

  return plan;
}

export async function loadAccountPlans(auth: SignedInAuth): Promise<SavedPlan[]> {
  const response = await authenticatedJsonRequest(auth, '/api/plans');

  if (!response.ok) {
    throw new Error('Unable to load account plans.');
  }

  const body = await response.json();

  if (!isRecord(body) || !Array.isArray(body.plans)) {
    return [];
  }

  return body.plans
    .map(toSavedPlan)
    .filter((plan): plan is SavedPlan => Boolean(plan))
    .slice(0, 8);
}

export async function createAccountPlan(
  auth: SignedInAuth,
  payload: {
    goalId?: string | null;
    label?: string | null;
    name: string;
    notes?: string | null;
    result: FirePlanResult;
    snapshot: AppSnapshot;
  }
): Promise<SavedPlan> {
  const response = await authenticatedJsonRequest(auth, '/api/plans', {
    body: JSON.stringify(payload),
    method: 'POST'
  });

  return readSavedPlanResponse(response, 'Unable to save account plan.');
}

export async function updateAccountPlan(
  auth: SignedInAuth,
  id: string,
  payload: {
    expectedVersionNumber?: number;
    goalId?: string | null;
    label?: string | null;
    name: string;
    notes?: string | null;
    result: FirePlanResult;
    snapshot: AppSnapshot;
  }
): Promise<SavedPlan> {
  const response = await authenticatedJsonRequest(auth, `/api/plans/${encodeURIComponent(id)}`, {
    body: JSON.stringify(payload),
    method: 'PUT'
  });

  return readSavedPlanResponse(response, 'Unable to update account plan.');
}

export async function deleteAccountPlan(auth: SignedInAuth, id: string): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/plans/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to delete account plan.');
  }
}
