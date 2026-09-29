import { moneyInputToCents } from '../format';
import { authenticatedJsonRequest, isRecord, readApiJson, type SignedInAuth } from './client';
import { optionalTextFromDraft } from './profile';

export type GoalType =
  | 'retirement'
  | 'emergency_fund'
  | 'debt_payoff'
  | 'home'
  | 'education'
  | 'travel'
  | 'custom';

export type GoalStatus = 'active' | 'paused' | 'completed';

export type Goal = {
  createdAt: string;
  currentAmountCents: number;
  daysUntilTarget: number | null;
  goalType: GoalType;
  id: string;
  isOverdue: boolean;
  name: string;
  progressPercent: number;
  remainingAmountCents: number;
  status: GoalStatus;
  targetAmountCents: number | null;
  targetDate: string | null;
  updatedAt: string;
};

export type GoalSummary = {
  activeGoalCount: number;
  completedGoalCount: number;
  fundedPercent: number;
  goalCount: number;
  nextGoal: Goal | null;
  overdueGoalCount: number;
  pausedGoalCount: number;
  totalCurrentCents: number;
  totalTargetCents: number;
};

export type GoalDraft = {
  currentAmount: string;
  goalType: GoalType;
  name: string;
  targetAmount: string;
  targetDate: string;
};

export type GoalUpdateDraft = {
  currentAmount: string;
  status: GoalStatus;
  targetAmount: string;
  targetDate: string;
};

export const goalTypeOptions: Array<{ label: string; value: GoalType }> = [
  { label: 'Retirement', value: 'retirement' },
  { label: 'Emergency fund', value: 'emergency_fund' },
  { label: 'Debt payoff', value: 'debt_payoff' },
  { label: 'Home', value: 'home' },
  { label: 'Education', value: 'education' },
  { label: 'Travel', value: 'travel' },
  { label: 'Custom', value: 'custom' }
];

export const goalStatusOptions: Array<{ label: string; value: GoalStatus }> = [
  { label: 'Active', value: 'active' },
  { label: 'Paused', value: 'paused' },
  { label: 'Completed', value: 'completed' }
];

export function isGoalType(value: unknown): value is GoalType {
  return typeof value === 'string' && goalTypeOptions.some((option) => option.value === value);
}

export function isGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === 'string' && goalStatusOptions.some((option) => option.value === value);
}

export function goalTypeLabel(value: GoalType): string {
  return goalTypeOptions.find((option) => option.value === value)?.label ?? value;
}

export function goalStatusLabel(value: GoalStatus): string {
  return goalStatusOptions.find((option) => option.value === value)?.label ?? value;
}

export function formatGoalPercent(value: number): string {
  return `${Math.round(Math.max(0, value))}%`;
}

export function goalDeadlineLabel(goal: Goal): string {
  if (goal.status === 'completed') {
    return 'Completed';
  }

  if (!goal.targetDate || goal.daysUntilTarget === null) {
    return 'No target date';
  }

  if (goal.isOverdue || goal.daysUntilTarget < 0) {
    const overdueDays = Math.abs(goal.daysUntilTarget);
    return `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`;
  }

  if (goal.daysUntilTarget === 0) {
    return 'Due today';
  }

  return `Due in ${goal.daysUntilTarget} day${goal.daysUntilTarget === 1 ? '' : 's'}`;
}

export function emptyGoalDraft(): GoalDraft {
  return {
    currentAmount: '',
    goalType: 'custom',
    name: '',
    targetAmount: '',
    targetDate: ''
  };
}

export function goalToUpdateDraft(goal: Goal): GoalUpdateDraft {
  return {
    currentAmount: String(goal.currentAmountCents / 100),
    status: goal.status,
    targetAmount: goal.targetAmountCents === null ? '' : String(goal.targetAmountCents / 100),
    targetDate: goal.targetDate ?? ''
  };
}

export function buildGoalUpdateDraftMap(goals: Goal[]): Record<string, GoalUpdateDraft> {
  return goals.reduce<Record<string, GoalUpdateDraft>>((drafts, goal) => {
    drafts[goal.id] = goalToUpdateDraft(goal);
    return drafts;
  }, {});
}

export function toGoal(value: unknown): Goal | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.id !== 'string' ||
    typeof value.name !== 'string' ||
    !isGoalType(value.goalType) ||
    (typeof value.targetAmountCents !== 'number' && value.targetAmountCents !== null) ||
    typeof value.currentAmountCents !== 'number' ||
    (typeof value.targetDate !== 'string' && value.targetDate !== null) ||
    !isGoalStatus(value.status) ||
    typeof value.progressPercent !== 'number' ||
    typeof value.remainingAmountCents !== 'number' ||
    typeof value.isOverdue !== 'boolean' ||
    (typeof value.daysUntilTarget !== 'number' && value.daysUntilTarget !== null) ||
    typeof value.createdAt !== 'string' ||
    typeof value.updatedAt !== 'string'
  ) {
    return null;
  }

  return {
    createdAt: value.createdAt,
    currentAmountCents: value.currentAmountCents,
    daysUntilTarget: value.daysUntilTarget,
    goalType: value.goalType,
    id: value.id,
    isOverdue: value.isOverdue,
    name: value.name,
    progressPercent: value.progressPercent,
    remainingAmountCents: value.remainingAmountCents,
    status: value.status,
    targetAmountCents: value.targetAmountCents,
    targetDate: value.targetDate,
    updatedAt: value.updatedAt
  };
}

export function toGoalSummary(value: unknown): GoalSummary | null {
  if (!isRecord(value)) {
    return null;
  }

  if (
    typeof value.goalCount !== 'number' ||
    typeof value.activeGoalCount !== 'number' ||
    typeof value.pausedGoalCount !== 'number' ||
    typeof value.completedGoalCount !== 'number' ||
    typeof value.overdueGoalCount !== 'number' ||
    typeof value.totalTargetCents !== 'number' ||
    typeof value.totalCurrentCents !== 'number' ||
    typeof value.fundedPercent !== 'number'
  ) {
    return null;
  }

  const nextGoal = value.nextGoal === null ? null : toGoal(value.nextGoal);

  if (value.nextGoal !== null && !nextGoal) {
    return null;
  }

  return {
    activeGoalCount: value.activeGoalCount,
    completedGoalCount: value.completedGoalCount,
    fundedPercent: value.fundedPercent,
    goalCount: value.goalCount,
    nextGoal,
    overdueGoalCount: value.overdueGoalCount,
    pausedGoalCount: value.pausedGoalCount,
    totalCurrentCents: value.totalCurrentCents,
    totalTargetCents: value.totalTargetCents
  };
}

export function summarizeGoalList(goals: Goal[]): GoalSummary {
  const counts = goals.reduce(
    (summary, goal) => ({
      activeGoalCount: summary.activeGoalCount + (goal.status === 'active' ? 1 : 0),
      completedGoalCount: summary.completedGoalCount + (goal.status === 'completed' ? 1 : 0),
      overdueGoalCount: summary.overdueGoalCount + (goal.isOverdue ? 1 : 0),
      pausedGoalCount: summary.pausedGoalCount + (goal.status === 'paused' ? 1 : 0),
      totalCurrentCents: summary.totalCurrentCents + goal.currentAmountCents,
      totalTargetCents: summary.totalTargetCents + (goal.targetAmountCents ?? 0)
    }),
    {
      activeGoalCount: 0,
      completedGoalCount: 0,
      overdueGoalCount: 0,
      pausedGoalCount: 0,
      totalCurrentCents: 0,
      totalTargetCents: 0
    }
  );
  const fundedAmountCents = goals.reduce(
    (total, goal) => total + (goal.targetAmountCents === null ? 0 : Math.min(goal.currentAmountCents, goal.targetAmountCents)),
    0
  );
  const nextGoal = goals
    .filter((goal) => goal.status !== 'completed' && goal.targetDate)
    .sort((left, right) => String(left.targetDate).localeCompare(String(right.targetDate)))[0] ?? null;

  return {
    ...counts,
    fundedPercent: counts.totalTargetCents > 0
      ? (fundedAmountCents / counts.totalTargetCents) * 100
      : 0,
    goalCount: goals.length,
    nextGoal
  };
}

export async function readGoalResponse(response: Response, errorMessage: string): Promise<Goal> {
  return readApiJson(response, errorMessage, (body) => (isRecord(body) ? toGoal(body.goal) : null));
}

export async function loadGoals(auth: SignedInAuth): Promise<{
  goals: Goal[];
  summary: GoalSummary;
}> {
  const response = await authenticatedJsonRequest(auth, '/api/goals');

  if (!response.ok) {
    throw new Error('Unable to load goals.');
  }

  const body = await response.json();
  const goals = isRecord(body) && Array.isArray(body.goals)
    ? body.goals.map(toGoal).filter((goal): goal is Goal => Boolean(goal))
    : [];
  const summary = isRecord(body) ? toGoalSummary(body.summary) : null;

  return {
    goals,
    summary: summary ?? summarizeGoalList(goals)
  };
}

export async function createGoalRecord(
  auth: SignedInAuth,
  draft: GoalDraft
): Promise<Goal> {
  const response = await authenticatedJsonRequest(auth, '/api/goals', {
    body: JSON.stringify({
      currentAmountCents: moneyInputToCents(draft.currentAmount) ?? 0,
      goalType: draft.goalType,
      name: draft.name.trim(),
      targetAmountCents: moneyInputToCents(draft.targetAmount) ?? 0,
      targetDate: optionalTextFromDraft(draft.targetDate)
    }),
    method: 'POST'
  });

  return readGoalResponse(response, 'Unable to create goal.');
}

export async function updateGoalRecord(
  auth: SignedInAuth,
  id: string,
  draft: GoalUpdateDraft
): Promise<Goal> {
  const response = await authenticatedJsonRequest(auth, `/api/goals/${encodeURIComponent(id)}`, {
    body: JSON.stringify({
      currentAmountCents: moneyInputToCents(draft.currentAmount) ?? 0,
      status: draft.status,
      targetAmountCents: moneyInputToCents(draft.targetAmount) ?? 0,
      targetDate: optionalTextFromDraft(draft.targetDate)
    }),
    method: 'PUT'
  });

  return readGoalResponse(response, 'Unable to update goal.');
}

export async function archiveGoalRecord(
  auth: SignedInAuth,
  id: string
): Promise<void> {
  const response = await authenticatedJsonRequest(auth, `/api/goals/${encodeURIComponent(id)}`, {
    method: 'DELETE'
  });

  if (!response.ok) {
    throw new Error('Unable to archive goal.');
  }
}
