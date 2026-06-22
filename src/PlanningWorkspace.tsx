import {
  ArrowRight,
  Check,
  GitCompare,
  History,
  Link2,
  RotateCcw,
  Save,
  Trash2
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AuthState } from './auth';
import { calculateFirePlan, formatMoney, type FirePlanResult, type PlanInput } from './lib/fire';
import { derivePlanHealth, type PlanHealth } from './lib/planHealth';
import {
  previewPlanSeed,
  type PlanSeedPreview,
  type SeedApplication
} from './lib/planWorkspace';

export type PlanningTimeline = {
  currentAge: number;
  planEndAge: number;
  retirementAge: number;
};

export type PlanningScenario = {
  id: 'base' | 'guardrail' | 'upside';
  inflationDelta: number;
  label: string;
  portfolioDelta: number;
  returnDelta: number;
  spendingDelta: number;
};

export type PlanningSnapshot = {
  calculatorMode: 'fire-number' | 'withdrawal-income';
  engineVersion?: string;
  plan: PlanInput;
  scenarios: PlanningScenario[];
  schemaVersion?: number;
  seedApplications?: SeedApplication[];
  timeline: PlanningTimeline;
};

export type PlanningSavedPlan = {
  createdAt: string;
  goalId?: string | null;
  id: string;
  label?: string | null;
  name: string;
  notes?: string | null;
  result?: FirePlanResult;
  snapshot: PlanningSnapshot;
  updatedAt?: string;
  versionCreatedAt?: string;
  versionNumber?: number;
};

export type PlanningSaveDraft = {
  goalId: string | null;
  label: string;
  name: string;
  notes: string;
};

type PlanningProfile = {
  birthYear: number | null;
  defaultCurrency: string;
  targetRetirementAge: number | null;
  updatedAt: string;
};

type PlanningAccount = {
  accountType: string;
  category: 'asset' | 'liability';
  currency: string;
  id: string;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
};

type PlanningGoal = {
  currentAmountCents: number;
  goalType: string;
  id: string;
  name: string;
  status: string;
  targetAmountCents: number | null;
  targetDate: string | null;
  updatedAt: string;
};

type PlanVersionSummary = {
  createdAt: string;
  label: string | null;
  notes: string | null;
  versionNumber: number;
};

export type PlanVersionDetail = PlanVersionSummary & {
  result: FirePlanResult;
  snapshot: PlanningSnapshot;
};

type PlanningWorkspaceProps = {
  accounts: PlanningAccount[];
  activePlanId: string | null;
  auth: Extract<AuthState, { status: 'signed-in' }>;
  canUndoSeed: boolean;
  currentPlan: PlanInput;
  currentResult: FirePlanResult;
  currentSnapshot: PlanningSnapshot;
  currentTimeline: PlanningTimeline;
  goals: PlanningGoal[];
  isLoading: boolean;
  isSaving: boolean;
  message: string;
  onApplySeed: (preview: Extract<PlanSeedPreview, { ok: true }>) => void;
  onArchive: (id: string) => void;
  onLoadPlan: (plan: PlanningSavedPlan) => void;
  onLoadVersion: (planId: string, version: PlanVersionDetail) => void;
  onNavigateCalculator: () => void;
  onSave: (mode: 'new-plan' | 'new-version', draft: PlanningSaveDraft) => void;
  onUndoSeed: () => void;
  plans: PlanningSavedPlan[];
  profile: PlanningProfile | null;
};

export function PlanningWorkspace({
  accounts,
  activePlanId,
  auth,
  canUndoSeed,
  currentPlan,
  currentResult,
  currentSnapshot,
  currentTimeline,
  goals,
  isLoading,
  isSaving,
  message,
  onApplySeed,
  onArchive,
  onLoadPlan,
  onLoadVersion,
  onNavigateCalculator,
  onSave,
  onUndoSeed,
  plans,
  profile
}: PlanningWorkspaceProps) {
  const activePlan = plans.find((item) => item.id === activePlanId) ?? null;
  const retirementGoals = goals.filter((goal) => goal.goalType === 'retirement');
  const eligibleAccounts = accounts.filter(
    (account) => account.isActive && account.category === 'asset'
  );
  const [draft, setDraft] = useState<PlanningSaveDraft>(() => draftFromPlan(activePlan));
  const [portfolioSource, setPortfolioSource] = useState<'accounts' | 'goal' | 'none'>('none');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [seedPreview, setSeedPreview] = useState<PlanSeedPreview | null>(null);
  const [versions, setVersions] = useState<PlanVersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionMessage, setVersionMessage] = useState('');
  const [loadedVersionNumber, setLoadedVersionNumber] = useState<number | null>(null);
  const [selectedCompareVersions, setSelectedCompareVersions] = useState<number[]>([]);
  const [versionDetails, setVersionDetails] = useState<Record<number, PlanVersionDetail>>({});
  const currentHealth = useMemo(
    () => derivePlanHealth(currentPlan, currentResult),
    [currentPlan, currentResult]
  );

  useEffect(() => {
    setDraft(draftFromPlan(activePlan));
    setLoadedVersionNumber(activePlan?.versionNumber ?? null);
  }, [activePlanId, activePlan?.goalId, activePlan?.label, activePlan?.name, activePlan?.notes, activePlan?.versionNumber]);

  useEffect(() => {
    let cancelled = false;

    if (!activePlanId) {
      setVersions([]);
      setSelectedCompareVersions([]);
      setVersionDetails({});
      setVersionMessage('Save a plan to begin version history.');
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingVersions(true);
    setVersionMessage('Loading version history...');

    loadPlanVersions(auth, activePlanId)
      .then((items) => {
        if (cancelled) return;
        setVersions(items);
        setSelectedCompareVersions(items.slice(0, 2).map((item) => item.versionNumber));
        setVersionDetails({});
        setVersionMessage(items.length === 1 ? 'One immutable version saved.' : `${items.length} immutable versions saved.`);
      })
      .catch((error) => {
        if (cancelled) return;
        setVersions([]);
        setVersionMessage(error instanceof Error ? error.message : 'Version history could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setIsLoadingVersions(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePlanId, activePlan?.versionNumber, auth.getToken, auth.user.id]);

  useEffect(() => {
    let cancelled = false;

    if (!activePlanId || selectedCompareVersions.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    const missing = selectedCompareVersions.filter((versionNumber) => !versionDetails[versionNumber]);

    if (missing.length === 0) {
      return () => {
        cancelled = true;
      };
    }

    Promise.all(missing.map((versionNumber) => loadPlanVersion(auth, activePlanId, versionNumber)))
      .then((items) => {
        if (cancelled) return;
        setVersionDetails((current) => ({
          ...current,
          ...Object.fromEntries(items.map((item) => [item.versionNumber, item]))
        }));
      })
      .catch((error) => {
        if (!cancelled) {
          setVersionMessage(error instanceof Error ? error.message : 'Version comparison could not be loaded.');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activePlanId, auth.getToken, auth.user.id, selectedCompareVersions, versionDetails]);

  const buildSeedPreview = () => {
    const selectedGoal = retirementGoals.find((goal) => goal.id === selectedGoalId) ?? null;
    const preview = previewPlanSeed({
      accounts,
      goal: selectedGoal,
      plan: currentPlan,
      portfolioSource,
      profile,
      selectedAccountIds,
      timeline: currentTimeline
    });

    setSeedPreview(preview);
  };

  const loadHistoricalVersion = async (versionNumber: number) => {
    if (!activePlanId) return;

    setIsLoadingVersions(true);
    try {
      const version = versionDetails[versionNumber] ?? await loadPlanVersion(auth, activePlanId, versionNumber);
      setVersionDetails((current) => ({ ...current, [versionNumber]: version }));
      setLoadedVersionNumber(versionNumber);
      onLoadVersion(activePlanId, version);
      setVersionMessage(`Version ${versionNumber} loaded into the calculator workspace.`);
    } catch (error) {
      setVersionMessage(error instanceof Error ? error.message : 'Version could not be loaded.');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const toggleCompareVersion = (versionNumber: number) => {
    setSelectedCompareVersions((current) => {
      if (current.includes(versionNumber)) {
        return current.filter((item) => item !== versionNumber);
      }

      return [...current.slice(-1), versionNumber];
    });
  };

  const compareItems = selectedCompareVersions
    .map((versionNumber) => versionDetails[versionNumber])
    .filter((item): item is PlanVersionDetail => Boolean(item));

  return (
    <div className="planning-workspace">
      <section className="planning-overview" aria-label="Current plan overview">
        <article>
          <span>Plan health</span>
          <strong className={`health-label health-${currentHealth.status}`}>{healthLabel(currentHealth.status)}</strong>
          <small>{currentHealth.checks.filter((check) => check.severity === 'positive').length} of {currentHealth.checks.length} checks positive</small>
        </article>
        <article>
          <span>Active plan</span>
          <strong>{activePlan?.name ?? 'Unsaved draft'}</strong>
          <small>{loadedVersionNumber ? `Version ${loadedVersionNumber} loaded` : 'No account version selected'}</small>
        </article>
        <article>
          <span>Portfolio</span>
          <strong>{formatMoney(currentPlan.initialPortfolio)}</strong>
          <small>{formatMoney(currentResult.requiredPortfolio)} modeled target</small>
        </article>
        <article>
          <span>Scenarios</span>
          <strong>{currentSnapshot.scenarios.length}</strong>
          <small>Stored with each version</small>
        </article>
      </section>

      <section className="panel planning-save-panel" aria-labelledby="planning-save-title">
        <div className="panel-heading planning-heading-row">
          <div>
            <p className="eyebrow">Version control</p>
            <h2 id="planning-save-title">Plan identity</h2>
          </div>
          <button className="secondary-button icon-text-button" onClick={onNavigateCalculator}>
            Open calculator
            <ArrowRight size={16} />
          </button>
        </div>

        <div className="planning-form-grid">
          <label className="field">
            <span>Plan name</span>
            <input
              maxLength={120}
              value={draft.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Version label</span>
            <input
              maxLength={120}
              placeholder="Base case, June review..."
              value={draft.label}
              onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
            />
          </label>
          <label className="field">
            <span>Retirement goal</span>
            <select
              value={draft.goalId ?? ''}
              onChange={(event) => setDraft((current) => ({ ...current, goalId: event.target.value || null }))}
            >
              <option value="">Not linked</option>
              {retirementGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
            </select>
          </label>
          <label className="field planning-notes-field">
            <span>Version notes</span>
            <input
              maxLength={1000}
              placeholder="What changed in this version?"
              value={draft.notes}
              onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            />
          </label>
        </div>

        <div className="planning-actions">
          <button
            className="primary-button icon-text-button"
            disabled={isSaving || !activePlanId || !draft.name.trim()}
            onClick={() => onSave('new-version', draft)}
          >
            <Save size={16} />
            Save new version
          </button>
          <button
            className="secondary-button icon-text-button"
            disabled={isSaving || !draft.name.trim()}
            onClick={() => onSave('new-plan', draft)}
          >
            <Save size={16} />
            Save as new plan
          </button>
          <p className="storage-status" role="status" aria-live="polite">{message}</p>
        </div>
      </section>

      <section className="panel planning-seed-panel" aria-labelledby="planning-seed-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Explicit import</p>
            <h2 id="planning-seed-title">Seed this draft</h2>
            <p>Profile ages can be applied with one selected portfolio source.</p>
          </div>
        </div>

        <div className="segmented planning-seed-modes" aria-label="Portfolio seed source">
          {(['none', 'accounts', 'goal'] as const).map((source) => (
            <button
              key={source}
              className={portfolioSource === source ? 'active' : ''}
              onClick={() => {
                setPortfolioSource(source);
                setSeedPreview(null);
              }}
            >
              {source === 'none' ? 'Profile only' : source === 'accounts' ? 'Accounts' : 'Retirement goal'}
            </button>
          ))}
        </div>

        {portfolioSource === 'accounts' ? (
          <div className="seed-source-list" aria-label="Accounts available for plan seeding">
            {eligibleAccounts.length === 0 ? <p className="empty-inline">No active asset accounts are available.</p> : eligibleAccounts.map((account) => (
              <label key={account.id} className="seed-source-row">
                <input
                  type="checkbox"
                  checked={selectedAccountIds.includes(account.id)}
                  onChange={() => setSelectedAccountIds((current) => current.includes(account.id) ? current.filter((id) => id !== account.id) : [...current, account.id])}
                />
                <span>
                  <strong>{account.name}</strong>
                  <small>{formatMoney(account.latestBalanceCents / 100)} · {account.currency} · {account.latestBalanceDate ?? 'No dated balance'}</small>
                </span>
              </label>
            ))}
          </div>
        ) : null}

        {portfolioSource === 'goal' ? (
          <label className="field seed-goal-select">
            <span>Retirement goal</span>
            <select value={selectedGoalId} onChange={(event) => setSelectedGoalId(event.target.value)}>
              <option value="">Select a goal</option>
              {retirementGoals.map((goal) => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
            </select>
          </label>
        ) : null}

        <div className="planning-actions">
          <button className="secondary-button icon-text-button" onClick={buildSeedPreview}>
            <Link2 size={16} />
            Preview import
          </button>
          <button className="secondary-button icon-text-button" disabled={!canUndoSeed} onClick={onUndoSeed}>
            <RotateCcw size={16} />
            Undo last import
          </button>
        </div>

        {seedPreview ? (
          <div className={`seed-preview ${seedPreview.ok ? 'seed-preview-ready' : 'seed-preview-error'}`} role="status">
            {seedPreview.ok ? (
              <>
                <div>
                  <strong>{seedPreview.changes.length === 0 ? 'Values already match' : `${seedPreview.changes.length} changes ready`}</strong>
                  {seedPreview.changes.map((change) => (
                    <small key={change.field}>{seedFieldLabel(change.field)}: {formatSeedValue(change.field, change.before)} to {formatSeedValue(change.field, change.after)}</small>
                  ))}
                  {seedPreview.goalBenchmarkCents !== null ? <small>Goal benchmark: {formatMoney(seedPreview.goalBenchmarkCents / 100)}</small> : null}
                </div>
                <button
                  className="primary-button icon-text-button"
                  onClick={() => {
                    onApplySeed(seedPreview);
                    setSeedPreview(null);
                  }}
                >
                  <Check size={16} />
                  Apply import
                </button>
              </>
            ) : (
              <div>
                <strong>Import needs attention</strong>
                {seedPreview.errors.map((error) => <small key={error}>{error}</small>)}
              </div>
            )}
          </div>
        ) : null}
      </section>

      <section className="panel planning-library-panel" aria-labelledby="planning-library-title">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Account plans</p>
            <h2 id="planning-library-title">Plan library</h2>
          </div>
        </div>
        <div className="planning-list">
          {isLoading ? <p className="empty-inline">Loading account plans...</p> : plans.length === 0 ? <p className="empty-inline">No account plans saved yet.</p> : plans.map((item) => (
            <article className={`planning-list-row ${item.id === activePlanId ? 'active' : ''}`} key={item.id}>
              <div>
                <span>{item.id === activePlanId ? 'Active' : `Version ${item.versionNumber ?? 1}`}</span>
                <strong>{item.name}</strong>
                <small>{item.label || 'Unlabeled version'} · Updated {formatDate(item.updatedAt ?? item.createdAt)}</small>
              </div>
              <div className="saved-actions">
                <button
                  className="secondary-button"
                  onClick={() => {
                    onLoadPlan(item);
                    setLoadedVersionNumber(item.versionNumber ?? 1);
                  }}
                >
                  Open
                </button>
                <button className="icon-button row-action" disabled={isSaving} aria-label={`Archive ${item.name}`} onClick={() => onArchive(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel planning-history-panel" aria-labelledby="planning-history-title">
        <div className="panel-heading planning-heading-row">
          <div>
            <p className="eyebrow">Immutable record</p>
            <h2 id="planning-history-title">Version history</h2>
          </div>
          <span className="history-count"><History size={16} /> {versions.length}</span>
        </div>
        <p className="storage-status" role="status" aria-live="polite">{versionMessage}</p>

        <div className="planning-list">
          {versions.map((version) => (
            <article className={`planning-list-row ${loadedVersionNumber === version.versionNumber ? 'active' : ''}`} key={version.versionNumber}>
              <label className="compare-check">
                <input
                  type="checkbox"
                  checked={selectedCompareVersions.includes(version.versionNumber)}
                  onChange={() => toggleCompareVersion(version.versionNumber)}
                  aria-label={`Compare version ${version.versionNumber}`}
                />
              </label>
              <div>
                <span>Version {version.versionNumber}</span>
                <strong>{version.label || `Version ${version.versionNumber}`}</strong>
                <small>{formatDate(version.createdAt)} · {version.notes || 'No notes'}</small>
              </div>
              <button className="secondary-button" disabled={isLoadingVersions} onClick={() => loadHistoricalVersion(version.versionNumber)}>
                Load
              </button>
            </article>
          ))}
        </div>

        {compareItems.length > 0 ? (
          <div className="version-compare" aria-label="Selected version comparison">
            <div className="version-compare-heading"><GitCompare size={17} /><strong>Version comparison</strong></div>
            <div className="version-compare-grid">
              {compareItems.map((version) => {
                const health = healthForVersion(version);
                return (
                  <article key={version.versionNumber}>
                    <span>Version {version.versionNumber}</span>
                    <strong>{version.label || `Version ${version.versionNumber}`}</strong>
                    <dl>
                      <div><dt>Health</dt><dd className={`health-label health-${health.status}`}>{healthLabel(health.status)}</dd></div>
                      <div><dt>Portfolio</dt><dd>{formatMoney(version.snapshot.plan.initialPortfolio)}</dd></div>
                      <div><dt>Annual spend</dt><dd>{formatMoney(version.snapshot.plan.annualExpense)}</dd></div>
                      <div><dt>Scenarios</dt><dd>{version.snapshot.scenarios.length}</dd></div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function draftFromPlan(plan: PlanningSavedPlan | null): PlanningSaveDraft {
  return {
    goalId: plan?.goalId ?? null,
    label: plan?.label ?? 'Planning update',
    name: plan?.name ?? 'Retirement base',
    notes: plan?.notes ?? ''
  };
}

function healthForVersion(version: PlanVersionDetail): PlanHealth {
  return derivePlanHealth(version.snapshot.plan, calculateFirePlan(version.snapshot.plan));
}

function healthLabel(status: PlanHealth['status']): string {
  return status === 'healthy' ? 'Healthy' : status === 'watch' ? 'Watch' : 'At risk';
}

function seedFieldLabel(field: string): string {
  if (field === 'plan.initialPortfolio') return 'Portfolio';
  if (field === 'timeline.currentAge') return 'Current age';
  return 'Retirement age';
}

function formatSeedValue(field: string, value: number): string {
  return field === 'plan.initialPortfolio' ? formatMoney(value) : `${value}`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

async function loadPlanVersions(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  planId: string
): Promise<PlanVersionSummary[]> {
  const body = await requestJson(auth, `/api/plans/${encodeURIComponent(planId)}/versions`);

  if (!isRecord(body) || !Array.isArray(body.versions)) return [];

  return body.versions.map(toVersionSummary).filter((item): item is PlanVersionSummary => Boolean(item));
}

async function loadPlanVersion(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  planId: string,
  versionNumber: number
): Promise<PlanVersionDetail> {
  const body = await requestJson(auth, `/api/plans/${encodeURIComponent(planId)}/versions/${versionNumber}`);
  const value = isRecord(body) ? body.version : null;
  const summary = toVersionSummary(value);

  if (!summary || !isRecord(value) || !isPlanningSnapshot(value.snapshot)) {
    throw new Error('Plan version response is invalid.');
  }

  const result = calculateFirePlan(value.snapshot.plan);
  return { ...summary, result, snapshot: value.snapshot };
}

async function requestJson(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  path: string
): Promise<unknown> {
  const token = await auth.getToken();
  if (!token) throw new Error('No Clerk session token is available.');

  const response = await fetch(path, { headers: { authorization: `Bearer ${token}` } });
  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Plan request failed.');
  }

  return body;
}

function toVersionSummary(value: unknown): PlanVersionSummary | null {
  if (!isRecord(value) || typeof value.versionNumber !== 'number' || typeof value.createdAt !== 'string') return null;

  return {
    createdAt: value.createdAt,
    label: typeof value.label === 'string' ? value.label : null,
    notes: typeof value.notes === 'string' ? value.notes : null,
    versionNumber: value.versionNumber
  };
}

function isPlanningSnapshot(value: unknown): value is PlanningSnapshot {
  return isRecord(value) && isRecord(value.plan) && isRecord(value.timeline) && Array.isArray(value.scenarios);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}
