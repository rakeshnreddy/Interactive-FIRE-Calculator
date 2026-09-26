import {
  AlertCircle,
  ArrowRight,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
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
import { buildPlanDeepLink } from './lib/navigation';
import { derivePlanHealth, type PlanHealth } from './lib/planHealth';
import {
  calculatePlanReviewDueStatus,
  type DueStatusResult,
  type PlanReviewDecision,
  type PlanReviewPayload,
  type StoredPlanReview
} from './lib/planReviews';
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

export type PlanningAccount = {
  accountType: string;
  category: 'asset' | 'liability';
  currency: string;
  id: string;
  isActive: boolean;
  latestBalanceCents: number;
  latestBalanceDate: string | null;
  name: string;
};

export type PlanningGoal = {
  currentAmountCents: number;
  goalType: string;
  id: string;
  name: string;
  status: string;
  targetAmountCents: number | null;
  targetDate: string | null;
  updatedAt: string;
};

export type PlanningProfile = {
  birthYear: number | null;
  defaultCurrency: string;
  displayName?: string | null;
  householdName?: string | null;
  targetRetirementAge: number | null;
  updatedAt: string;
};

export type PlanningSaveDraft = {
  goalId: string | null;
  label: string;
  name: string;
  notes: string;
};

export type PlanVersionSummary = {
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
  deepLinkError?: string | null;
  goals: PlanningGoal[];
  initialDueStatus?: DueStatusResult | null;
  initialReviews?: StoredPlanReview[];
  isLoading: boolean;
  isSaving: boolean;
  loadedVersionNumber?: number | null;
  message: string;
  onApplySeed: (preview: Extract<PlanSeedPreview, { ok: true }>) => void;
  onArchive: (id: string) => void;
  onClearDeepLinkError?: () => void;
  onDirtyStateChange?: (isDirty: boolean) => void;
  onLoadPlan: (plan: PlanningSavedPlan) => void;
  onLoadVersion: (planId: string, version: PlanVersionDetail) => void;
  onNavigateCalculator: () => void;
  onReviewSaved?: () => void;
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
  deepLinkError,
  goals,
  initialDueStatus,
  initialReviews,
  isLoading,
  isSaving,
  loadedVersionNumber: controlledLoadedVersionNumber,
  message,
  onApplySeed,
  onArchive,
  onClearDeepLinkError,
  onDirtyStateChange,
  onLoadPlan,
  onLoadVersion,
  onNavigateCalculator,
  onReviewSaved,
  onSave,
  onUndoSeed,
  plans,
  profile
}: PlanningWorkspaceProps) {
  const activePlan = plans.find((item) => item.id === activePlanId) ?? null;
  const retirementGoals = goals.filter((goal) => goal.goalType === 'retirement');
  const eligibleAccounts = accounts.filter(
    (account) => account.isActive !== false && account.category === 'asset'
  );

  const latestAccountEvidenceDate = useMemo(() => {
    const dates = accounts
      .filter((a) => a.isActive !== false && a.latestBalanceDate)
      .map((a) => a.latestBalanceDate!)
      .sort()
      .reverse();
    return dates[0] ?? null;
  }, [accounts]);

  const effectiveEvidenceDate = useMemo(() => {
    if (latestAccountEvidenceDate) {
      return latestAccountEvidenceDate.slice(0, 10);
    }
    const versionDate = activePlan?.createdAt ? activePlan.createdAt.slice(0, 10) : '';
    const todayStr = new Date().toISOString().slice(0, 10);
    return versionDate || todayStr;
  }, [latestAccountEvidenceDate, activePlan?.createdAt]);

  const [draft, setDraft] = useState<PlanningSaveDraft>(() => draftFromPlan(activePlan));
  const [portfolioSource, setPortfolioSource] = useState<'accounts' | 'goal' | 'none'>('none');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [seedPreview, setSeedPreview] = useState<PlanSeedPreview | null>(null);
  const [versions, setVersions] = useState<PlanVersionSummary[]>([]);
  const [isLoadingVersions, setIsLoadingVersions] = useState(false);
  const [versionMessage, setVersionMessage] = useState('');
  const [internalLoadedVersionNumber, setInternalLoadedVersionNumber] = useState<number | null>(
    () => controlledLoadedVersionNumber ?? activePlan?.versionNumber ?? null
  );
  const loadedVersionNumber =
    controlledLoadedVersionNumber !== undefined
      ? controlledLoadedVersionNumber
      : internalLoadedVersionNumber;
  const setLoadedVersionNumber = setInternalLoadedVersionNumber;

  const [selectedCompareVersions, setSelectedCompareVersions] = useState<number[]>([]);
  const [versionDetails, setVersionDetails] = useState<Record<number, PlanVersionDetail>>({});
  const currentHealth = useMemo(
    () => derivePlanHealth(currentPlan, currentResult),
    [currentPlan, currentResult]
  );

  const [baselineSnapshot, setBaselineSnapshot] = useState<PlanningSnapshot | null>(
    () => activePlan?.snapshot ?? currentSnapshot
  );

  useEffect(() => {
    setDraft(draftFromPlan(activePlan));
    if (controlledLoadedVersionNumber === undefined) {
      setLoadedVersionNumber(activePlan?.versionNumber ?? null);
    }
    if (activePlan?.snapshot) {
      setBaselineSnapshot(activePlan.snapshot);
    }
  }, [
    activePlanId,
    activePlan?.goalId,
    activePlan?.label,
    activePlan?.name,
    activePlan?.notes,
    activePlan?.versionNumber,
    controlledLoadedVersionNumber
  ]);

  const isDraftDirty = useMemo(() => {
    if (!activePlan) return false;
    return (
      draft.name !== activePlan.name ||
      draft.label !== (activePlan.label ?? '') ||
      draft.notes !== (activePlan.notes ?? '') ||
      draft.goalId !== (activePlan.goalId ?? null)
    );
  }, [activePlan, draft]);

  const isPlanDirty = useMemo(() => {
    if (!baselineSnapshot) return isDraftDirty;
    const assumptionsDirty = (
      JSON.stringify(currentPlan) !== JSON.stringify(baselineSnapshot.plan) ||
      JSON.stringify(currentTimeline) !== JSON.stringify(baselineSnapshot.timeline)
    );
    return assumptionsDirty || isDraftDirty;
  }, [baselineSnapshot, currentPlan, currentTimeline, isDraftDirty]);

  useEffect(() => {
    onDirtyStateChange?.(isPlanDirty);
  }, [isPlanDirty, onDirtyStateChange]);

  const [pendingAction, setPendingAction] = useState<
    | { type: 'load-plan'; plan: PlanningSavedPlan }
    | { type: 'load-version'; versionNumber: number }
    | null
  >(null);

  const [reviews, setReviews] = useState<StoredPlanReview[]>(() => initialReviews ?? []);
  const currentVersionNumber = loadedVersionNumber ?? activePlan?.versionNumber ?? 1;
  const [lastSubmittedReview, setLastSubmittedReview] = useState<StoredPlanReview | null>(null);

  const isRevisionActive = useMemo(() => {
    if (lastSubmittedReview && lastSubmittedReview.decision === 'revise' && lastSubmittedReview.planVersionNumber === currentVersionNumber) {
      return true;
    }
    const matchingReview = reviews.find((r) => r.planVersionNumber === currentVersionNumber);
    return matchingReview?.decision === 'revise';
  }, [lastSubmittedReview, reviews, currentVersionNumber]);

  useEffect(() => {
    setLastSubmittedReview(null);
  }, [activePlanId, activePlan?.versionNumber, loadedVersionNumber]);

  const [dueStatus, setDueStatus] = useState<DueStatusResult | null>(
    () =>
      initialDueStatus ??
      (activePlan
        ? calculatePlanReviewDueStatus({
            planCreatedAt: activePlan.createdAt,
            evidenceDate: effectiveEvidenceDate
          })
        : null)
  );
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [reviewDecision, setReviewDecision] = useState<PlanReviewDecision>('keep');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    if (initialReviews !== undefined) {
      setReviews(initialReviews);
    }
  }, [initialReviews]);

  useEffect(() => {
    if (initialDueStatus !== undefined) {
      setDueStatus(initialDueStatus);
    }
  }, [initialDueStatus]);

  useEffect(() => {
    let cancelled = false;

    if (initialReviews !== undefined) {
      return;
    }

    if (!activePlanId || !activePlan) {
      setReviews([]);
      setDueStatus(null);
      setReviewMessage('');
      return () => {
        cancelled = true;
      };
    }

    setIsLoadingReviews(true);
    loadPlanReviews(auth, activePlanId)
      .then((data) => {
        if (cancelled) return;
        if (data) {
          setReviews(data.reviews);
          setDueStatus(data.dueStatus);
        } else {
          setReviews([]);
          setDueStatus(
            calculatePlanReviewDueStatus({
              planCreatedAt: activePlan.createdAt,
              evidenceDate: effectiveEvidenceDate
            })
          );
        }
      })
      .catch(() => {
        if (cancelled) return;
        setReviews([]);
        setDueStatus(
          calculatePlanReviewDueStatus({
            planCreatedAt: activePlan.createdAt,
            evidenceDate: effectiveEvidenceDate
          })
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoadingReviews(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activePlanId, activePlan?.createdAt, activePlan?.updatedAt, auth.getToken, auth.user.id, effectiveEvidenceDate, initialReviews]);

  const handleReviewSubmit = async () => {
    if (!activePlanId || !activePlan) return;
    const versionNumberToReview = loadedVersionNumber ?? activePlan.versionNumber ?? 1;

    setIsSubmittingReview(true);
    setReviewMessage('Recording review...');

    try {
      const result = await submitPlanReview(auth, activePlanId, {
        decision: reviewDecision,
        deferDays: reviewDecision === 'defer' ? 14 : undefined,
        evidenceDate: effectiveEvidenceDate,
        notes: reviewNotes.trim() || null,
        planVersionNumber: versionNumberToReview
      });

      setDueStatus(result.dueStatus);
      setReviews((current) => [result.review, ...current.filter((r) => r.id !== result.review.id)]);
      setLastSubmittedReview(result.review);
      setReviewMessage(
        reviewDecision === 'keep'
          ? `Assumptions confirmed for Version ${versionNumberToReview}. Next review due ${result.review.nextReviewDue}.`
          : reviewDecision === 'revise'
          ? `Review recorded for Version ${versionNumberToReview}. Save a new version to apply revisions.`
          : `Review deferred until ${result.review.deferredUntil}.`
      );
      setReviewNotes('');
      onReviewSaved?.();
    } catch (error) {
      setReviewMessage(error instanceof Error ? error.message : 'Failed to record review.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

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

  const performLoadHistoricalVersion = async (versionNumber: number) => {
    if (!activePlanId) return;

    setIsLoadingVersions(true);
    try {
      const version =
        versionDetails[versionNumber] ??
        (await loadPlanVersion(auth, activePlanId, versionNumber));
      setVersionDetails((current) => ({ ...current, [versionNumber]: version }));
      setLoadedVersionNumber(versionNumber);
      setBaselineSnapshot(version.snapshot);
      onLoadVersion(activePlanId, version);
      setVersionMessage(`Version ${versionNumber} loaded into the calculator workspace.`);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', buildPlanDeepLink(activePlanId, versionNumber));
      }
    } catch (error) {
      setVersionMessage(error instanceof Error ? error.message : 'Version could not be loaded.');
    } finally {
      setIsLoadingVersions(false);
    }
  };

  const handleLoadVersionClick = (versionNumber: number) => {
    if (isPlanDirty) {
      setPendingAction({ type: 'load-version', versionNumber });
    } else {
      performLoadHistoricalVersion(versionNumber);
    }
  };

  const handleOpenPlanClick = (plan: PlanningSavedPlan) => {
    if (isPlanDirty) {
      setPendingAction({ type: 'load-plan', plan });
    } else {
      setBaselineSnapshot(plan.snapshot);
      onLoadPlan(plan);
      setLoadedVersionNumber(plan.versionNumber ?? 1);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', buildPlanDeepLink(plan.id, plan.versionNumber ?? 1));
      }
    }
  };

  const handleConfirmDiscard = () => {
    if (!pendingAction) return;
    const action = pendingAction;
    setPendingAction(null);
    if (action.type === 'load-plan') {
      setBaselineSnapshot(action.plan.snapshot);
      onLoadPlan(action.plan);
      setLoadedVersionNumber(action.plan.versionNumber ?? 1);
      if (typeof window !== 'undefined') {
        window.history.pushState({}, '', buildPlanDeepLink(action.plan.id, action.plan.versionNumber ?? 1));
      }
    } else if (action.type === 'load-version') {
      performLoadHistoricalVersion(action.versionNumber);
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
      {deepLinkError ? (
        <section className="panel planning-controlled-error" data-testid="planning-error-state" role="alert">
          <div className="panel-heading">
            <div>
              <p className="eyebrow error-text">Unavailable</p>
              <h2>Saved decision unavailable</h2>
              <p>{deepLinkError}</p>
            </div>
          </div>
          <div className="planning-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClearDeepLinkError}
            >
              Return to plan library
            </button>
          </div>
        </section>
      ) : null}

      {loadedVersionNumber ? (
        <aside className="historical-version-banner" role="status" aria-label={`Version ${loadedVersionNumber} assumptions`}>
          <div>
            <strong>Viewing historical Version {loadedVersionNumber}</strong>
            <p>Assumptions and results from this saved FIRE decision are locked. To make changes, edit values and save a new version.</p>
          </div>
          <span className="source-tag">Saved FIRE Decision</span>
        </aside>
      ) : null}

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

      {activePlan ? (
        <section className="panel planning-review-panel" aria-labelledby="planning-review-title">
          <div className="panel-heading planning-heading-row">
            <div>
              <p className="eyebrow">Cadence & Governance</p>
              <h2 id="planning-review-title">Monthly plan review</h2>
            </div>
            {dueStatus ? (
              <span className={`review-badge review-badge-${dueStatus.status}`}>
                {dueStatus.status === 'due'
                  ? 'Review Due'
                  : dueStatus.status === 'overdue'
                  ? 'Review Overdue'
                  : dueStatus.status === 'deferred'
                  ? 'Deferred'
                  : dueStatus.status === 'up-to-date'
                  ? 'Up to Date'
                  : 'Baseline Active'}
              </span>
            ) : null}
          </div>

          {dueStatus ? (
            <div
              className={`review-status-card review-status-${dueStatus.status}`}
              role="status"
              aria-label={`Monthly review status: ${dueStatus.status}`}
            >
              <div className="review-status-header">
                <strong>
                  {dueStatus.status === 'due'
                    ? 'Monthly review due'
                    : dueStatus.status === 'overdue'
                    ? 'Monthly review overdue'
                    : dueStatus.status === 'deferred'
                    ? `Review deferred until ${dueStatus.deferredUntil}`
                    : dueStatus.status === 'up-to-date'
                    ? (isRevisionActive ? 'Revision in progress' : 'Assumptions up to date')
                    : 'Baseline active'}
                </strong>
                <span className="review-status-date">
                  Evidence date: {dueStatus.evidenceDate}
                </span>
              </div>
              <p>
                {dueStatus.status === 'due'
                  ? 'Your monthly check-in is due. Confirm current assumptions or record updates.'
                  : dueStatus.status === 'overdue'
                  ? 'This plan has not been reviewed within the monthly cadence. Review assumptions and dated evidence.'
                  : dueStatus.status === 'deferred'
                  ? `Review is postponed until ${dueStatus.deferredUntil}. You may still confirm or revise earlier.`
                  : dueStatus.status === 'up-to-date'
                  ? (isRevisionActive
                      ? `Revision in progress for Version ${currentVersionNumber}. Adjust financial assumptions in the calculator and save a new version to create Version ${(activePlan?.versionNumber ?? currentVersionNumber) + 1}. Next review due ${dueStatus.nextReviewDue}.`
                      : `Assumptions were confirmed for Version ${currentVersionNumber}. Next review due ${dueStatus.nextReviewDue}.`)
                  : `Plan baseline recorded. First returning review available in ${dueStatus.daysUntilEligible} days.`}
              </p>
              {dueStatus.isEvidenceStale ? (
                <div className="stale-evidence-box" role="alert">
                  <span className="stale-evidence-badge">
                    Stale evidence ({dueStatus.evidenceAgeDays} days old)
                  </span>
                  <small className="stale-evidence-warning">
                    Financial evidence was recorded over 30 days ago. Check your balances or update inputs before confirming.
                  </small>
                </div>
              ) : null}
            </div>
          ) : null}

          {isRevisionActive ? (
            <aside
              className="plan-revision-prompt"
              data-testid="plan-revision-prompt"
              role="region"
              aria-label="Revision next step"
            >
              <div className="plan-revision-prompt-header">
                <AlertCircle size={18} aria-hidden="true" />
                <strong>Next step: Revise financial assumptions in calculator and save Version {(activePlan?.versionNumber ?? currentVersionNumber) + 1}</strong>
              </div>
              <p>
                A revision was recorded for Version {currentVersionNumber}. Open the FIRE calculator to adjust your financial assumptions (such as annual spending, portfolio balances, or retirement age), then return to save Version {(activePlan?.versionNumber ?? currentVersionNumber) + 1}. Historical Version {currentVersionNumber} will remain permanently locked and preserved.
              </p>
              <div className="planning-actions">
                <button
                  type="button"
                  className="secondary-button icon-text-button"
                  onClick={onNavigateCalculator}
                >
                  Open calculator
                  <ArrowRight size={16} />
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => {
                    const savePanel = document.querySelector('.planning-save-panel');
                    if (savePanel) {
                      const prefersReducedMotion =
                        typeof window !== 'undefined' &&
                        window.matchMedia('(prefers-reduced-motion: reduce)').matches;
                      savePanel.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                      (savePanel.querySelector('.planning-notes-field input') as HTMLElement | null)?.focus();
                    }
                  }}
                >
                  Edit version details
                </button>
              </div>
            </aside>
          ) : null}

          {dueStatus?.eligibleForReview ? (
            <div className="review-action-container">
              <div className="review-decision-group" role="radiogroup" aria-label="Review decision choice">
                <label className={`review-choice-card ${reviewDecision === 'keep' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="review-decision"
                    value="keep"
                    checked={reviewDecision === 'keep'}
                    onChange={() => setReviewDecision('keep')}
                    disabled={isSubmittingReview}
                  />
                  <div>
                    <strong>Keep assumptions</strong>
                    <small>Confirm current Version {loadedVersionNumber ?? activePlan.versionNumber ?? 1} assumptions remain accurate without changes.</small>
                  </div>
                </label>
                <label className={`review-choice-card ${reviewDecision === 'revise' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="review-decision"
                    value="revise"
                    checked={reviewDecision === 'revise'}
                    onChange={() => setReviewDecision('revise')}
                    disabled={isSubmittingReview}
                  />
                  <div>
                    <strong>Revise assumptions</strong>
                    <small>Acknowledge updates in spending, savings rate, or timeline to save a new version.</small>
                  </div>
                </label>
                <label className={`review-choice-card ${reviewDecision === 'defer' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="review-decision"
                    value="defer"
                    checked={reviewDecision === 'defer'}
                    onChange={() => setReviewDecision('defer')}
                    disabled={isSubmittingReview}
                  />
                  <div>
                    <strong>Defer review (14 days)</strong>
                    <small>Postpone review while waiting for financial statements or account sync.</small>
                  </div>
                </label>
              </div>

              <label className="field review-notes-field">
                <span>Review notes (optional)</span>
                <input
                  maxLength={1000}
                  placeholder="Notes for this monthly review..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  disabled={isSubmittingReview}
                />
              </label>

              <div className="planning-actions">
                <button
                  type="button"
                  className="primary-button icon-text-button"
                  disabled={isSubmittingReview || isLoadingReviews}
                  onClick={handleReviewSubmit}
                >
                  <CheckCircle2 size={16} />
                  {reviewDecision === 'keep'
                    ? 'Confirm unchanged assumptions'
                    : reviewDecision === 'revise'
                    ? 'Record revision review'
                    : 'Defer review for 14 days'}
                </button>
                {reviewMessage ? (
                  <p className="storage-status" role="status" aria-live="polite">
                    {reviewMessage}
                  </p>
                ) : null}
              </div>
            </div>
          ) : dueStatus ? (
            <p className="empty-inline">
              First returning review requires at least 7 days from baseline plan creation (eligible in {dueStatus.daysUntilEligible} days).
            </p>
          ) : null}

          <div className="review-history-section" aria-label="Review history">
            <h3>Review history</h3>
            {isLoadingReviews ? (
              <p className="empty-inline">Loading reviews...</p>
            ) : reviews.length === 0 ? (
              <p className="empty-inline">No monthly reviews recorded for this plan yet.</p>
            ) : (
              <div className="planning-list">
                {reviews.map((rev) => (
                  <article className="planning-list-row review-history-row" key={rev.id}>
                    <div>
                      <span>Version {rev.planVersionNumber} · {formatDate(rev.completedAt ?? rev.createdAt)}</span>
                      <strong>
                        Decision: {rev.decision === 'keep' ? 'Keep assumptions' : rev.decision === 'revise' ? 'Revised assumptions' : 'Deferred review'}
                      </strong>
                      <small>
                        {rev.decision === 'defer' ? `Deferred until ${rev.deferredUntil}` : `Next review due ${rev.nextReviewDue}`}
                        {rev.notes ? ` · "${rev.notes}"` : ''}
                      </small>
                    </div>
                    <span className={`review-badge review-badge-${rev.decision}`}>
                      {rev.decision.toUpperCase()}
                    </span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : null}

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
                  onClick={() => handleOpenPlanClick(item)}
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
              <button className="secondary-button" disabled={isLoadingVersions} onClick={() => handleLoadVersionClick(version.versionNumber)}>
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

      {pendingAction ? (
        <div className="modal-scrim" role="dialog" aria-modal="true" aria-labelledby="unsaved-changes-title">
          <div className="modal-content planning-unsaved-modal">
            <h3 id="unsaved-changes-title">Unsaved changes</h3>
            <p>You have unsaved changes in your current planning assumptions. Loading another plan or version will discard these changes.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setPendingAction(null)}
              >
                Keep editing
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmDiscard}
              >
                Discard and load
              </button>
            </div>
          </div>
        </div>
      ) : null}
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

async function loadPlanReviews(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  planId: string
): Promise<{ dueStatus: DueStatusResult; reviews: StoredPlanReview[] } | null> {
  const body = await requestJson(auth, `/api/plans/${encodeURIComponent(planId)}/reviews`);
  if (!isRecord(body) || !Array.isArray(body.reviews) || !isRecord(body.dueStatus)) return null;
  return {
    dueStatus: body.dueStatus as unknown as DueStatusResult,
    reviews: body.reviews as unknown as StoredPlanReview[]
  };
}

async function submitPlanReview(
  auth: Extract<AuthState, { status: 'signed-in' }>,
  planId: string,
  payload: PlanReviewPayload
): Promise<{ dueStatus: DueStatusResult; review: StoredPlanReview }> {
  const token = await auth.getToken();
  if (!token) throw new Error('No Clerk session token is available.');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    authorization: `Bearer ${token}`
  };
  if (payload.idempotencyKey) {
    headers['Idempotency-Key'] = payload.idempotencyKey;
  }

  const response = await fetch(`/api/plans/${encodeURIComponent(planId)}/reviews`, {
    body: JSON.stringify(payload),
    headers,
    method: 'POST'
  });

  const body: any = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 409 || body?.code === 'IDEMPOTENCY_CONFLICT') {
      throw new Error('A review for this cycle already exists with different parameters.');
    }
    throw new Error(isRecord(body) && typeof body.error === 'string' ? body.error : 'Failed to record review.');
  }

  return body as { dueStatus: DueStatusResult; review: StoredPlanReview };
}
