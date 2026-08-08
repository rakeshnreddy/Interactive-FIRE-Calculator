import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Download,
  History,
  Landmark,
  RotateCcw,
  ShieldCheck,
  Table2,
  Target,
  TrendingUp
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AuthState } from './auth';
import type {
  CalculatorSaveOutcome,
  CalculatorSaveRequest,
  CalculatorSavedResult
} from './CalculatorLibrary';
import {
  calculateSavingsGoal,
  defaultSavingsGoalInputs,
  savingsGoalFormulaVersion,
  validateSavingsGoalInputs,
  type SavingsCompoundingFrequency,
  type SavingsContributionFrequency,
  type SavingsContributionTiming,
  type SavingsGoalInputs,
  type SavingsGoalProjection,
  type SavingsGoalScheduleRow,
  type SavingsRateBasis,
  type SavingsTargetBasis
} from './lib/savingsGoalCalculator';
import type { CalculatorResult, SeoCalculator } from './lib/seoCalculators';

export type SavingsCurrencyCode = 'AUD' | 'CAD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'USD';
export type SavingsLocaleCode = 'auto' | 'de-DE' | 'en-IN' | 'en-US';
export type SavingsScenarioId = 'base' | 'higher' | 'lower';
type SchedulePeriod = 'annual' | 'detailed';
type NumericInputKey = {
  [Key in keyof SavingsGoalInputs]: SavingsGoalInputs[Key] extends number ? Key : never
}[keyof SavingsGoalInputs];

export type SavingsGoalDraft = {
  currency: SavingsCurrencyCode;
  formulaVersion: typeof savingsGoalFormulaVersion;
  inputs: SavingsGoalInputs;
  locale: SavingsLocaleCode;
  scenarioId?: SavingsScenarioId;
  updatedAt: string;
};

type Props = {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  savedResults: CalculatorSavedResult[];
};

const draftStorageKey = 'finpath.calculatorDraft.savings-goal.v2';
const currencyCodes: SavingsCurrencyCode[] = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const localeCodes: SavingsLocaleCode[] = ['auto', 'en-US', 'en-IN', 'de-DE'];
const contributionFrequencyOptions: Array<{ label: string; value: SavingsContributionFrequency }> = [
  { label: 'Weekly', value: 52 },
  { label: 'Every two weeks', value: 26 },
  { label: 'Twice a month', value: 24 },
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Twice a year', value: 2 },
  { label: 'Annually', value: 1 }
];
const compoundingFrequencyOptions: Array<{ label: string; value: SavingsCompoundingFrequency }> = [
  { label: 'Daily (365)', value: 365 },
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Twice a year', value: 2 },
  { label: 'Annually', value: 1 }
];

export function SavingsGoalCalculator({
  auth,
  calculator,
  onNavigate,
  onSaveResult,
  savedResults
}: Props) {
  const [inputs, setInputs] = useState<SavingsGoalInputs>(defaultSavingsGoalInputs);
  const [currency, setCurrency] = useState<SavingsCurrencyCode>('USD');
  const [locale, setLocale] = useState<SavingsLocaleCode>('auto');
  const [scenarioId, setScenarioId] = useState<SavingsScenarioId>('base');
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod>('annual');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const scenarioInputs = useMemo(() => applySavingsScenario(inputs, scenarioId), [inputs, scenarioId]);
  const projection = useMemo(() => calculateSavingsGoal(scenarioInputs), [scenarioInputs]);
  const scenarios = useMemo(
    () => (['lower', 'base', 'higher'] as const).map((id) => {
      const scenarioInputs = applySavingsScenario(inputs, id);
      return { id, inputs: scenarioInputs, projection: calculateSavingsGoal(scenarioInputs) };
    }),
    [inputs]
  );
  const sensitivity = useMemo(() => buildSavingsSensitivity(inputs), [inputs]);
  const history = useMemo(
    () => savedResults.filter((item) => item.calculatorSlug === calculator.slug).slice(0, 6),
    [calculator.slug, savedResults]
  );
  const schedule = schedulePeriod === 'annual' ? projection.annualSchedule : projection.detailedSchedule;
  const resolvedLocale = locale === 'auto' ? undefined : locale;
  const minorUnitDigits = currencyFractionDigits(currency);
  const practicalContribution = projection.requiredContribution === null
    ? null
    : roundUpToMinorUnit(projection.requiredContribution, minorUnitDigits);
  const practicalDifference = practicalContribution === null
    ? 0
    : practicalContribution - scenarioInputs.currentContribution;

  useEffect(() => {
    const restored = restoreSavingsState();
    if (restored) {
      setInputs(restored.inputs);
      setCurrency(restored.currency);
      setLocale(restored.locale);
      setScenarioId(restored.scenarioId);
      setMessage(restored.source === 'share'
        ? 'Shared plan loaded. Review every assumption before relying on it.'
        : 'Your last browser draft was restored.');
    }
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    if (!validateSavingsGoalInputs(inputs).isValid) return;
    const draft: SavingsGoalDraft = {
      currency,
      formulaVersion: savingsGoalFormulaVersion,
      inputs,
      locale,
      scenarioId,
      updatedAt: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // The public calculator remains usable when storage is unavailable.
    }
  }, [currency, inputs, isHydrated, locale, scenarioId]);

  const setNumber = (key: NumericInputKey, raw: string) => {
    setScenarioId('base');
    setMessage('');
    setInputs((current) => ({ ...current, [key]: raw === '' ? Number.NaN : Number(raw) }));
  };

  const setChoice = <Key extends keyof SavingsGoalInputs>(key: Key, value: SavingsGoalInputs[Key]) => {
    setScenarioId('base');
    setMessage('');
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setInputs(defaultSavingsGoalInputs);
    setCurrency('USD');
    setLocale('auto');
    setScenarioId('base');
    setMessage('Defaults restored.');
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildSavingsShareUrl(inputs, currency, locale, scenarioId));
      setMessage('Share link copied. It contains assumptions only—never account data.');
    } catch {
      setMessage('The share link could not be copied in this browser.');
    }
  };

  const exportCsv = () => {
    if (!projection.validation.isValid) {
      setMessage('Fix the input errors before exporting a schedule.');
      return;
    }
    downloadText(
      'savings-goal-plan.csv',
      buildSavingsProjectionCsv(scenarioInputs, projection, currency, locale),
      'text/csv;charset=utf-8;'
    );
    setMessage('Raw, reconcilable savings schedule exported as CSV.');
  };

  const saveResult = async () => {
    if (!projection.validation.isValid || projection.requiredContribution === null) {
      setMessage('Fix the plan before creating a goal.');
      return;
    }
    if (currency !== 'USD') {
      setMessage('Share and export work in this currency, but the Goal workspace currently stores USD only. Switch the display currency to USD before creating a Goal.');
      return;
    }
    if (auth.status !== 'signed-in') {
      setMessage('Draft saved in this browser. Create an account to keep multiple savings plans.');
      return;
    }

    setIsSaving(true);
    setMessage('Saving calculator result…');
    try {
      const outcome = await onSaveResult({
        calculator,
        currency,
        result: toSavingsCalculatorResult(projection, scenarioInputs),
        values: toSavingsNumericSaveValues(scenarioInputs, projection)
      });
      window.localStorage.removeItem(draftStorageKey);
      setMessage(outcome.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Savings goal could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSaved = (saved: CalculatorSavedResult) => {
    setInputs(savingsInputsFromSaved(saved.inputValues));
    if (currencyCodes.includes(saved.currency as SavingsCurrencyCode)) {
      setCurrency(saved.currency as SavingsCurrencyCode);
    }
    setScenarioId('base');
    setMessage(`Loaded inputs saved on ${new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}.`);
  };

  const money = (value: number, maximumFractionDigits = 0) => formatSavingsCurrency(
    value,
    currency,
    resolvedLocale,
    maximumFractionDigits
  );

  return (
    <section
      className="calculator-library calculator-detail compound-calculator savings-goal-calculator route-shell"
      aria-labelledby="calculator-detail-title"
      data-calculator-slug="savings-goal"
    >
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Growth &amp; goal planning</p>
        <h1 id="calculator-detail-title">Savings Goal Calculator</h1>
        <p>Turn a target and deadline into a practical saving pace, then test whether your current plan is on track.</p>
        <a href="/calculators" onClick={(event) => {
          event.preventDefault();
          onNavigate('/calculators');
        }}>
          <ArrowRight size={15} /> Explore all calculators
        </a>
      </div>

      <section className="compound-trust-strip" aria-label="Calculator scope">
        <span><ShieldCheck size={17} /><strong>Public by default</strong><small>No account required</small></span>
        <span><TrendingUp size={17} /><strong>Constant-assumption estimate</strong><small>Not a prediction or guarantee</small></span>
        <span><Table2 size={17} /><strong>Auditable math</strong><small>Headline and schedule reconcile</small></span>
      </section>

      <div className="calculator-detail-grid compound-workspace">
        <section className="calculator-input-panel" aria-labelledby="savings-input-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick start</p>
              <h2 id="savings-input-title">Set the goal</h2>
            </div>
            <button className="secondary-button icon-text-button" type="button" onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="calculator-input-grid">
            <SavingsNumberField currency={currency} error={projection.validation.errors.targetAmount} helper="The amount you want available at the selected deadline." inputKey="targetAmount" label="Goal amount" min={0.01} onChange={setNumber} value={inputs.targetAmount} />
            <SavingsNumberField currency={currency} error={projection.validation.errors.currentSavings} helper="Savings already set aside for this goal." inputKey="currentSavings" label="Current savings" min={0} onChange={setNumber} value={inputs.currentSavings} />
            <SavingsNumberField error={projection.validation.errors.years} helper="Exact fractional years are allowed; 2.5 means 2 years and 6 months." inputKey="years" label="Time until deadline" min={0.01} onChange={setNumber} step={0.01} suffix="years" value={inputs.years} />
            <SavingsNumberField error={projection.validation.errors.annualRatePercent} helper={inputs.rateBasis === 'nominal' ? 'Nominal annual rate before within-year compounding.' : 'APY already includes within-year compounding.'} inputKey="annualRatePercent" label="Expected annual rate" onChange={setNumber} step={0.01} suffix="%" value={inputs.annualRatePercent} />
            <SavingsNumberField currency={currency} error={projection.validation.errors.currentContribution} helper={`What you already plan to save ${frequencyLabel(inputs.contributionFrequency)}. Enter 0 to solve without a current-plan comparison.`} inputKey="currentContribution" label="Current contribution" min={0} onChange={setNumber} value={inputs.currentContribution} />
          </div>

          <p className="compound-default-convention">
            Default convention: nominal annual rate, monthly compounding, and end-of-month contributions. The required amount is a new total—not an amount added to your current contribution.
          </p>

          <details className="compound-disclosure calculator-options-shell">
            <summary>
              <span><strong>Advanced options</strong><small>Contribution rhythm, rate basis, inflation, fees, and display</small></span>
              <ChevronDown size={17} />
            </summary>
            <div className="compound-advanced-body">
              <fieldset>
                <legend>Contribution plan</legend>
                <div className="calculator-input-grid">
                  <SavingsSelectField helper="The required amount is quoted once per selected period." inputKey="contributionFrequency" label="Contribution frequency" onChange={(value) => setChoice('contributionFrequency', Number(value) as SavingsContributionFrequency)} options={contributionFrequencyOptions} value={inputs.contributionFrequency} />
                  <SavingsSelectField helper="Beginning contributions receive one more period of growth." inputKey="contributionTiming" label="Contribution timing" onChange={(value) => setChoice('contributionTiming', value as SavingsContributionTiming)} options={[{ label: 'Beginning of period', value: 'beginning' }, { label: 'End of period', value: 'end' }]} value={inputs.contributionTiming} />
                  <SavingsNumberField error={projection.validation.errors.annualContributionIncreasePercent} helper="The recurring amount changes after each completed contribution year." inputKey="annualContributionIncreasePercent" label="Annual contribution increase" onChange={setNumber} step={0.01} suffix="%" value={inputs.annualContributionIncreasePercent} />
                  <SavingsNumberField currency={currency} error={projection.validation.errors.annualTopUp} helper="A fixed extra deposit on each full-year anniversary." inputKey="annualTopUp" label="Annual anniversary top-up" min={0} onChange={setNumber} value={inputs.annualTopUp} />
                </div>
              </fieldset>

              <fieldset>
                <legend>Rate contract and fees</legend>
                <div className="calculator-input-grid">
                  <SavingsSelectField helper="APY/effective rate already includes compounding." inputKey="rateBasis" label="Rate basis" onChange={(value) => setChoice('rateBasis', value as SavingsRateBasis)} options={[{ label: 'Nominal annual rate', value: 'nominal' }, { label: 'APY / effective annual rate', value: 'apy' }]} value={inputs.rateBasis} />
                  {inputs.rateBasis === 'nominal' ? (
                    <SavingsSelectField helper="How often the nominal rate compounds in this equal-period model." inputKey="compoundingFrequency" label="Compounding frequency" onChange={(value) => setChoice('compoundingFrequency', Number(value) as SavingsCompoundingFrequency)} options={compoundingFrequencyOptions} value={inputs.compoundingFrequency} />
                  ) : (
                    <div className="compound-inline-note"><strong>Compounding is included in APY</strong><small>The frequency control is hidden so compounding is not counted twice.</small></div>
                  )}
                  <SavingsNumberField error={projection.validation.errors.annualFeePercent} helper="Optional percentage-of-balance fee. Leave at 0 if the quoted APY or return is already net of fees." inputKey="annualFeePercent" label="Annual balance fee" min={0} onChange={setNumber} step={0.01} suffix="%" value={inputs.annualFeePercent} />
                </div>
              </fieldset>

              <fieldset>
                <legend>Purchasing power</legend>
                <div className="calculator-input-grid">
                  <SavingsSelectField helper="Today’s-money targets rise with inflation before the deadline comparison." inputKey="targetBasis" label="Goal amount basis" onChange={(value) => setChoice('targetBasis', value as SavingsTargetBasis)} options={[{ label: 'Future money at deadline', value: 'future' }, { label: 'Today’s purchasing power', value: 'today' }]} value={inputs.targetBasis} />
                  <SavingsNumberField error={projection.validation.errors.inflationPercent} helper="Used only when the goal is expressed in today’s purchasing power." inputKey="inflationPercent" label="Inflation" onChange={setNumber} step={0.01} suffix="%" value={inputs.inflationPercent} />
                </div>
              </fieldset>

              <fieldset>
                <legend>Display only</legend>
                <div className="calculator-input-grid">
                  <SavingsSelectField helper="Currency changes symbols and minor-unit guidance only. No FX conversion occurs." inputKey="currency" label="Currency" onChange={(value) => currencyCodes.includes(value as SavingsCurrencyCode) && setCurrency(value as SavingsCurrencyCode)} options={currencyCodes.map((value) => ({ label: value, value }))} value={currency} />
                  <SavingsSelectField helper="Choose Indian grouping for lakh/crore separators or another locale format." inputKey="locale" label="Number format" onChange={(value) => localeCodes.includes(value as SavingsLocaleCode) && setLocale(value as SavingsLocaleCode)} options={[{ label: 'Browser default', value: 'auto' }, { label: 'United States (1,000,000)', value: 'en-US' }, { label: 'India (10,00,000)', value: 'en-IN' }, { label: 'Germany (1.000.000)', value: 'de-DE' }]} value={locale} />
                </div>
              </fieldset>
            </div>
          </details>
        </section>

        <section className="calculator-result-panel compound-result-panel" aria-labelledby="savings-result-title">
          <div className="panel-heading">
            <div><p className="eyebrow">Saving pace</p><h2 id="savings-result-title">Required contribution</h2></div>
            <div className="compound-model-badges"><span className="compound-version">{scenarioLabel(scenarioId)} case</span><span className="compound-version">Model v2</span></div>
          </div>

          {!projection.validation.isValid ? (
            <div className="compound-error-summary" role="alert">
              <strong>Check the highlighted assumptions</strong>
              <ul>{Object.values(projection.validation.errors).map((error) => <li key={error}>{error}</li>)}</ul>
            </div>
          ) : projection.requiredContribution === null ? (
            <div className="compound-error-summary" role="alert">
              <strong>No recurring contribution falls before this deadline</strong>
              <p>Use beginning-of-period timing, contribute more often, add a catch-up deposit today, or extend the deadline.</p>
            </div>
          ) : (
            <>
              <div className="compound-headline" aria-live="polite" aria-atomic="true">
                <strong>{money(practicalContribution ?? 0, minorUnitDigits)}</strong>
                <span>{frequencyLabel(inputs.contributionFrequency)} through {formatDuration(scenarioInputs.years)}</span>
                <small>Practical amount rounded up to the smallest {currency} unit. Exact engine solve: {money(projection.requiredContribution, 6)}.</small>
              </div>

              <div className="calculator-result-metrics">
                <SavingsResultMetric help="Goal amount after applying inflation when today’s-money mode is selected." label="Deadline target" value={money(projection.resolvedTarget)} />
                <SavingsResultMetric help="What today’s savings become by the deadline before future deposits." label="Current savings at deadline" value={money(projection.currentSavingsAtDeadline)} />
                <SavingsResultMetric help="Your entered current contribution projected under the same assumptions." label="Current plan at deadline" value={money(projection.currentPlanEnding)} />
                <SavingsResultMetric help="Signed comparison of the current plan with the deadline target." label={projection.currentPlanDifference >= 0 ? 'Current-plan surplus' : 'Current-plan shortfall'} tone={projection.currentPlanDifference >= 0 ? 'positive' : 'warning'} value={money(Math.abs(projection.currentPlanDifference))} />
                <SavingsResultMetric help="Practical rounded-up contribution minus the current contribution. A negative value means your current pace is ahead." label={practicalDifference >= 0 ? 'Increase each period' : 'Margin each period'} tone={practicalDifference <= 0 ? 'positive' : 'warning'} value={money(Math.abs(practicalDifference), minorUnitDigits)} />
                <SavingsResultMetric help="One deposit today that closes the current plan’s deadline shortfall under the same growth assumptions." label="Catch-up deposit today" value={money(projection.catchUpNow)} />
                <SavingsResultMetric help="All modeled future recurring contributions and annual top-ups in the required plan." label="Future contributions" value={money(projection.totalFutureContributions)} />
                <SavingsResultMetric help="Required-plan ending balance minus current savings and future deposits." label="Estimated net growth" tone={projection.netGrowth >= 0 ? 'positive' : 'warning'} value={money(projection.netGrowth)} />
              </div>

              <p className="compound-interpretation">{projectionInterpretation(projection, scenarioInputs, practicalContribution, money)}</p>
              <SavingsRunwayChart currency={currency} currentRows={projection.currentPlanAnnualSchedule} locale={resolvedLocale} requiredRows={projection.annualSchedule} target={projection.resolvedTarget} />

              {projection.validation.warnings.length > 0 ? (
                <div className="compound-warning-list" aria-label="Projection cautions">{projection.validation.warnings.map((warning) => <p key={warning}>{warning}</p>)}</div>
              ) : null}

              <div className="compound-action-row">
                <button className="secondary-button icon-text-button" type="button" onClick={copyShareLink}><Copy size={15} /> Copy link</button>
                <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}><Download size={15} /> Export CSV</button>
              </div>

              <div className="calculator-conversion-panel">
                <span className="feature-icon"><Target size={18} /></span>
                <div><strong>Create this savings goal</strong><small>{currency === 'USD' ? 'Save the selected scenario and revisit actual progress inside FinPath.' : 'Share and export remain available, but Goal creation is limited to USD until Goals store currency explicitly.'}</small></div>
                {auth.status === 'signed-in' ? (
                  <button className="primary-button" disabled={isSaving || currency !== 'USD'} type="button" onClick={saveResult}>{isSaving ? 'Saving…' : currency === 'USD' ? 'Create savings goal' : 'Use USD to create goal'}</button>
                ) : auth.status === 'not-configured' ? (
                  <button className="primary-button" type="button" onClick={() => onNavigate(calculator.conversionRoute)}>Create savings goal</button>
                ) : (
                  <SignUpButton mode="modal"><button className="primary-button" type="button" onClick={saveResult}>Create account to save</button></SignUpButton>
                )}
              </div>
            </>
          )}
          {message ? <p className="calculator-save-message" role="status" aria-live="polite">{message}</p> : null}
        </section>
      </div>

      {projection.validation.isValid && projection.requiredContribution !== null ? (
        <section className="compound-analysis-grid" aria-label="Expert analysis">
          <div className="compound-analysis-heading"><p className="eyebrow">Expert analysis</p><h2>Audit and stress-test the goal</h2><p>Open only the comparison, sensitivity, schedule, or methodology you need. Every section is collapsed by default.</p></div>

          <details className="compound-analysis-card">
            <summary><span><strong>Current pace and milestones</strong><small>Compare what you plan now with what the goal requires</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <div className="savings-plan-comparison">
                <span><small>Current contribution</small><strong>{money(inputs.currentContribution, minorUnitDigits)} {frequencyLabel(inputs.contributionFrequency)}</strong></span>
                <span><small>Required contribution</small><strong>{money(practicalContribution ?? 0, minorUnitDigits)} {frequencyLabel(inputs.contributionFrequency)}</strong></span>
                <span><small>Current pace reaches goal</small><strong>{projection.currentPlanReachAt === null ? 'Not within 100 years' : projection.currentPlanReachAt === 0 ? 'Now' : formatDuration(projection.currentPlanReachAt)}</strong></span>
              </div>
              <div className="compound-milestone-list">
                {projection.milestones.map((milestone) => (
                  <span key={milestone.label}><strong>{milestone.label}</strong><small>{milestone.time === null ? 'Not reached' : `${formatDuration(milestone.time)} · ${money(milestone.value)}`}</small></span>
                ))}
              </div>
              <p>Milestones use the exact required-plan schedule. Current-pace timing is the first modeled contribution checkpoint at or above the goal, not a guarantee or exact calendar date.</p>
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Scenario comparison</strong><small>Lower, base, and higher constant-rate cases</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <fieldset className="compound-scenario-picker">
                <legend>Choose the case shown in the headline</legend>
                <p>Only the annual rate moves by 2 percentage points. These are deterministic comparisons, not probabilities.</p>
                <div>{scenarios.map((scenario) => (
                  <label key={scenario.id}>
                    <input checked={scenarioId === scenario.id} disabled={!scenario.projection.validation.isValid || scenario.projection.requiredContribution === null} name="savings-goal-scenario" type="radio" value={scenario.id} onChange={() => setScenarioId(scenario.id)} />
                    <span>{scenarioLabel(scenario.id)}</span>
                    <strong>{scenario.projection.validation.isValid && scenario.projection.requiredContribution !== null ? money(scenario.projection.requiredContribution, 2) : 'Unavailable'}</strong>
                    <small>{formatPercent(scenario.inputs.annualRatePercent / 100, resolvedLocale)}{scenarioId === scenario.id ? ' · Selected' : ''}</small>
                  </label>
                ))}</div>
              </fieldset>
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Deadline and target sensitivity</strong><small>See which lever changes the saving pace most</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <p>Each cell changes only the row’s goal amount and column’s deadline. The rate cases below change only the annual rate.</p>
              <div className="compound-sensitivity-wrap" role="region" aria-label="Goal amount and deadline sensitivity" tabIndex={0}>
                <table>
                  <caption>Required contribution by goal amount and deadline</caption>
                  <thead><tr><th scope="col">Goal amount</th>{sensitivity.deadlines.map((item) => <th scope="col" key={item.years}>{formatDuration(item.years)}</th>)}</tr></thead>
                  <tbody>{sensitivity.targets.map((target, rowIndex) => (
                    <tr key={target}><th scope="row">{money(target)}</th>{sensitivity.values[rowIndex].map((value, columnIndex) => (
                      <td className={rowIndex === 1 && sensitivity.deadlines[columnIndex].isBase ? 'is-base' : ''} key={`${target}-${columnIndex}`}>{rowIndex === 1 && sensitivity.deadlines[columnIndex].isBase ? <small className="compound-base-label">Base</small> : null}{value === null || !Number.isFinite(value) ? 'Unavailable' : money(value, 2)}</td>
                    ))}</tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="compound-duration-sensitivity" aria-label="Rate sensitivity"><strong>Rate sensitivity</strong><p>Current savings, target, deadline, and every other assumption remain fixed.</p><div>{sensitivity.rates.map((item) => <span className={item.label === 'Base' ? 'is-base' : ''} key={item.rate}><small>{item.label} · {formatPercent(item.rate / 100, resolvedLocale)}</small><strong>{item.value === null || !Number.isFinite(item.value) ? 'Unavailable' : money(item.value, 2)}</strong></span>)}</div></div>
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Schedule and audit trail</strong><small>Every row uses the same engine as the headline</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <div className="compound-schedule-toolbar">
                <label><span>Schedule detail</span><select autoComplete="off" name="savings-schedule-detail" value={schedulePeriod} onChange={(event) => setSchedulePeriod(event.target.value as SchedulePeriod)}><option value="annual">Annual summary</option><option value="detailed">Contribution events</option></select></label>
                <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}><Download size={15} /> Raw CSV</button>
              </div>
              <SavingsScheduleTable currency={currency} locale={resolvedLocale} rows={schedule} target={projection.resolvedTarget} />
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Methodology, limits, and sources</strong><small>Definitions that can materially change the answer</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body compound-methodology">
              <p><strong>Inverse solve.</strong> The engine first projects current savings and fixed annual top-ups, then divides the remaining deadline target by the future-value factor of one recurring contribution. Annual contribution increases remain linear, so no iterative root is needed.</p>
              <p><strong>Rate basis.</strong> Nominal mode uses (1 + annual rate ÷ compounds per year) raised to elapsed compound periods. APY mode uses (1 + APY) raised to elapsed years and does not apply compounding twice.</p>
              <p><strong>Timing.</strong> End contributions at the exact horizon are included and receive no later growth. Beginning contributions at the horizon are excluded. Fractional deadlines are never rounded to whole years.</p>
              <p><strong>Inflation and fees.</strong> A today’s-money goal rises with inflation through the deadline. The optional balance fee is applied proportionally after gross growth. Enter 0 when a quoted return is already net of fees.</p>
              <p><strong>Reconciliation.</strong> Every row uses closing = opening + deposits + gross return − fees. Signed gap is never clamped, so both shortfall and surplus remain visible.</p>
              <p><strong>Worked default.</strong> A {money(100_000)} goal, {money(10_000)} saved, 10 years, and an 8% nominal rate compounded monthly requires {money(425.28168253155314, 6)} at each month-end. The older generic route mixed annual and monthly conventions; v2 corrects only Savings Goal and leaves SIP Goal unchanged.</p>
              <p><strong>Limits.</strong> This equal-period estimate excludes taxes, live APY/CPI/FX feeds, product-specific daily-balance rules, tiered or bonus rates, transaction fees, arbitrary cash-flow ledgers, and probability claims.</p>
              <ul>
                <li><a href="https://www.investor.gov/financial-tools-calculators/calculators/savings-goal-calculator" target="_blank" rel="noreferrer">Investor.gov Savings Goal Calculator</a></li>
                <li><a href="https://support.microsoft.com/en-us/excel/functions/fv-function" target="_blank" rel="noreferrer">Microsoft FV timing and unit conventions</a></li>
                <li><a href="https://openstax.org/books/principles-finance/pages/8-2-annuities" target="_blank" rel="noreferrer">OpenStax annuities and timing</a></li>
                <li><a href="https://www.consumerfinance.gov/rules-policy/regulations/1030/a/" target="_blank" rel="noreferrer">CFPB Regulation DD: APY calculation</a></li>
                <li><a href="https://www.bls.gov/cpi/factsheets/purchasing-power-constant-dollars.htm" target="_blank" rel="noreferrer">BLS purchasing power and constant dollars</a></li>
              </ul>
              <p className="compound-source-date">Sources accessed August 9, 2026. Formula version: {savingsGoalFormulaVersion}.</p>
            </div>
          </details>
        </section>
      ) : null}

      <section className="compound-history-panel" aria-labelledby="savings-history-title">
        <div><p className="eyebrow">Revisitability</p><h2 id="savings-history-title">Recent saved plans</h2><p>Browser drafts preserve one current plan. Signed-in history keeps multiple runs.</p></div>
        {auth.status !== 'signed-in' ? <p>Create an account when you want to keep and compare more than one savings plan.</p> : history.length === 0 ? <p>No Savings Goal runs saved yet.</p> : (
          <div className="compound-history-list">{history.map((saved) => <button key={saved.id} type="button" onClick={() => loadSaved(saved)}><History size={16} /><span>{new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}</span><strong>{formatSavedHeadline(saved, currency, resolvedLocale)}</strong><small>Load inputs</small></button>)}</div>
        )}
      </section>

      <section className="calculator-faq-panel" aria-labelledby="savings-faq-title">
        <div><p className="eyebrow">Questions</p><h2 id="savings-faq-title">How to use this plan</h2></div>
        <div className="calculator-faq-grid">
          <article><strong>Is the result a total or an increase?</strong><p>The headline is the total recurring contribution required. “Increase each period” separately compares it with your current contribution.</p></article>
          <article><strong>Why can the deadline target exceed my goal?</strong><p>In today’s-money mode, the goal rises with inflation so it represents the same estimated purchasing power at the deadline.</p></article>
          <article><strong>Does currency change the math?</strong><p>No exchange conversion occurs. Currency changes formatting and the practical minor-unit rounding guidance only.</p></article>
          <article><strong>What should I do if rates change?</strong><p>Revisit the plan. The estimate assumes a constant rate, fee, inflation level, and contribution pattern.</p></article>
        </div>
      </section>

      <nav className="compound-related-panel" aria-label="Related calculators">
        <a href="/calculators/compound-interest" onClick={(event) => { event.preventDefault(); onNavigate('/calculators/compound-interest'); }}><Landmark size={18} /><span><strong>Compound Interest</strong><small>Project what a known saving plan could become</small></span><ArrowRight size={16} /></a>
        <a href="/calculators/emergency-fund" onClick={(event) => { event.preventDefault(); onNavigate('/calculators/emergency-fund'); }}><Target size={18} /><span><strong>Emergency Fund</strong><small>Build the right liquidity target first</small></span><ArrowRight size={16} /></a>
      </nav>
    </section>
  );
}

function SavingsNumberField({
  currency,
  error,
  helper,
  inputKey,
  label,
  min,
  onChange,
  step = 1,
  suffix,
  value
}: {
  currency?: SavingsCurrencyCode;
  error?: string;
  helper: string;
  inputKey: NumericInputKey;
  label: string;
  min?: number;
  onChange: (key: NumericInputKey, raw: string) => void;
  step?: number;
  suffix?: string;
  value: number;
}) {
  const id = `savings-${inputKey}`;
  const helperId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <label className={`field ${error ? 'has-error' : ''}`} htmlFor={id}>
      <span className="calculator-field-label">{label}</span>
      <span className="calculator-input-control">
        {currency ? <span aria-hidden="true">{currencySymbol(currency)}</span> : null}
        <input aria-describedby={`${helperId}${error ? ` ${errorId}` : ''}`} aria-invalid={Boolean(error)} autoComplete="off" id={id} inputMode="decimal" min={min} name={id} step={step} type="number" value={Number.isFinite(value) ? value : ''} onChange={(event) => onChange(inputKey, event.target.value)} />
        {suffix ? <span>{suffix}</span> : null}
      </span>
      <small id={helperId}>{helper}</small>
      {error ? <small className="field-error" id={errorId}>{error}</small> : null}
    </label>
  );
}

function SavingsSelectField({ helper, inputKey, label, onChange, options, value }: {
  helper: string;
  inputKey: string;
  label: string;
  onChange: (value: string) => void;
  options: Array<{ label: string; value: number | string }>;
  value: number | string;
}) {
  const id = `savings-${inputKey}`;
  const helperId = `${id}-help`;
  return (
    <label className="field" htmlFor={id}>
      <span className="calculator-field-label">{label}</span>
      <select aria-describedby={helperId} autoComplete="off" className="compound-select" id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
      <small id={helperId}>{helper}</small>
    </label>
  );
}

function SavingsResultMetric({ help, label, tone, value }: { help: string; label: string; tone?: 'positive' | 'warning'; value: string }) {
  return <div className={`calculator-result-metric${tone ? ` metric-${tone}` : ''}`}><span className="calculator-metric-label">{label}</span><strong>{value}</strong><small>{help}</small></div>;
}

function SavingsRunwayChart({ currency, currentRows, locale, requiredRows, target }: {
  currency: SavingsCurrencyCode;
  currentRows: SavingsGoalScheduleRow[];
  locale: string | undefined;
  requiredRows: SavingsGoalScheduleRow[];
  target: number;
}) {
  const sampled = sampleRows(requiredRows, 8).map((required) => {
    const current = currentRows.reduce((closest, row) => Math.abs(row.time - required.time) < Math.abs(closest.time - required.time) ? row : closest, currentRows[0] ?? required);
    return { current: current.closingBalance, label: required.label, required: required.closingBalance, time: required.time };
  });
  const maximum = Math.max(target, ...sampled.flatMap((row) => [row.current, row.required]), 1);
  return (
    <figure className="compound-growth-chart savings-runway-chart">
      <figcaption><strong>Funding runway</strong><small>Required plan versus your current contribution plan. Target reference: {formatSavingsCurrency(target, currency, locale)}.</small></figcaption>
      <div className="compound-chart-legend"><span className="is-required">Required plan</span><span className="is-current">Current plan</span><span className="is-target">Deadline target</span></div>
      <div className="savings-runway-plot" aria-hidden="true">{sampled.map((row) => <div className="savings-runway-column" key={`${row.time}-${row.label}`}><div><i className="is-required" style={{ height: `${Math.max(0, row.required / maximum) * 100}%` }} /><i className="is-current" style={{ height: `${Math.max(0, row.current / maximum) * 100}%` }} /><b style={{ bottom: `${Math.max(0, target / maximum) * 100}%` }} /></div><strong>{row.label}</strong><small>{formatSavingsCurrency(row.current, currency, locale)}</small></div>)}</div>
      <p className="savings-chart-text">At the deadline, the exact required plan reaches {formatSavingsCurrency(requiredRows.at(-1)?.closingBalance ?? 0, currency, locale)}, while the current plan reaches {formatSavingsCurrency(currentRows.at(-1)?.closingBalance ?? 0, currency, locale)} against {formatSavingsCurrency(target, currency, locale)}.</p>
    </figure>
  );
}

function SavingsScheduleTable({ currency, locale, rows, target }: { currency: SavingsCurrencyCode; locale: string | undefined; rows: SavingsGoalScheduleRow[]; target: number }) {
  const [visibleCount, setVisibleCount] = useState(50);
  useEffect(() => setVisibleCount(50), [rows]);
  const visibleRows = rows.slice(0, visibleCount);
  return (
    <>
      <div className="calculator-breakdown-table-wrap" role="region" aria-label="Savings goal schedule" tabIndex={0}>
        <table><caption>Savings goal balance reconciliation</caption><thead><tr><th scope="col">Period</th><th scope="col">Opening</th><th scope="col">Deposits</th><th scope="col">Gross return</th><th scope="col">Fees</th><th scope="col">Ending</th><th scope="col">Gap / surplus</th></tr></thead>
          <tbody>{visibleRows.map((row, index) => { const difference = row.closingBalance - target; return <tr key={`${row.time}-${index}`}><th scope="row">{row.label}</th><td>{formatSavingsCurrency(row.openingBalance, currency, locale, 2)}</td><td>{formatSavingsCurrency(row.deposits, currency, locale, 2)}</td><td>{formatSavingsCurrency(row.grossReturn, currency, locale, 2)}</td><td>{formatSavingsCurrency(row.fees, currency, locale, 2)}</td><td>{formatSavingsCurrency(row.closingBalance, currency, locale, 2)}</td><td>{difference >= 0 ? `Surplus ${formatSavingsCurrency(difference, currency, locale, 2)}` : `Gap ${formatSavingsCurrency(-difference, currency, locale, 2)}`}</td></tr>; })}</tbody>
        </table>
      </div>
      {visibleRows.length < rows.length ? <div className="compound-schedule-pagination"><p role="status">Showing {visibleRows.length.toLocaleString()} of {rows.length.toLocaleString()} rows. CSV export includes the complete schedule.</p><button className="secondary-button" type="button" onClick={() => setVisibleCount((current) => Math.min(current + 50, rows.length))}>Show next {Math.min(50, rows.length - visibleRows.length).toLocaleString()} rows</button></div> : null}
    </>
  );
}

export function applySavingsScenario(inputs: SavingsGoalInputs, scenario: SavingsScenarioId): SavingsGoalInputs {
  if (scenario === 'base') return inputs;
  return { ...inputs, annualRatePercent: inputs.annualRatePercent + (scenario === 'higher' ? 2 : -2) };
}

export function buildSavingsSensitivity(inputs: SavingsGoalInputs) {
  const deadlineSpan = Math.max(0.25, inputs.years * 0.25);
  const deadlines = [
    { isBase: false, label: 'Sooner', years: Math.max(0.01, inputs.years - deadlineSpan) },
    { isBase: true, label: 'Base', years: inputs.years },
    { isBase: false, label: 'Later', years: Math.min(100, inputs.years + deadlineSpan) }
  ].filter((item, _index, items) => item.isBase || !items.some((candidate) => candidate.isBase && Math.abs(candidate.years - item.years) < 1e-9));
  const targets = [inputs.targetAmount * 0.8, inputs.targetAmount, inputs.targetAmount * 1.2];
  const rateCases = [
    { label: 'Lower', rate: inputs.annualRatePercent - 2 },
    { label: 'Base', rate: inputs.annualRatePercent },
    { label: 'Higher', rate: inputs.annualRatePercent + 2 }
  ];
  const required = (projection: SavingsGoalProjection) => projection.validation.isValid ? projection.requiredContribution : null;
  return {
    deadlines,
    rates: rateCases.map((item) => ({ ...item, value: required(calculateSavingsGoal({ ...inputs, annualRatePercent: item.rate })) })),
    targets,
    values: targets.map((targetAmount) => deadlines.map(({ years }) => required(calculateSavingsGoal({ ...inputs, targetAmount, years }))))
  };
}

export function toSavingsNumericSaveValues(inputs: SavingsGoalInputs, projection?: SavingsGoalProjection): Record<string, number> {
  return {
    annualContributionIncreasePercent: inputs.annualContributionIncreasePercent,
    annualFeePercent: inputs.annualFeePercent,
    annualTopUp: inputs.annualTopUp,
    compoundingFrequency: inputs.compoundingFrequency,
    contributionFrequency: inputs.contributionFrequency,
    contributionTiming: inputs.contributionTiming === 'beginning' ? 1 : 0,
    current: inputs.currentSavings,
    currentContribution: inputs.currentContribution,
    inflationPercent: inputs.inflationPercent,
    rate: inputs.annualRatePercent,
    rateBasis: inputs.rateBasis === 'apy' ? 1 : 0,
    requiredContribution: projection?.requiredContribution ?? 0,
    resolvedTarget: projection?.resolvedTarget ?? inputs.targetAmount,
    target: inputs.targetAmount,
    targetBasis: inputs.targetBasis === 'today' ? 1 : 0,
    years: inputs.years
  };
}

export function savingsInputsFromSaved(values: Record<string, number>): SavingsGoalInputs {
  return {
    ...defaultSavingsGoalInputs,
    annualContributionIncreasePercent: finiteOr(values.annualContributionIncreasePercent, 0),
    annualFeePercent: finiteOr(values.annualFeePercent, 0),
    annualRatePercent: finiteOr(values.rate, defaultSavingsGoalInputs.annualRatePercent),
    annualTopUp: finiteOr(values.annualTopUp, 0),
    compoundingFrequency: supportedCompounding(values.compoundingFrequency),
    contributionFrequency: supportedContribution(values.contributionFrequency),
    contributionTiming: values.contributionTiming === 1 ? 'beginning' : 'end',
    currentContribution: finiteOr(values.currentContribution, 0),
    currentSavings: finiteOr(values.current, defaultSavingsGoalInputs.currentSavings),
    inflationPercent: finiteOr(values.inflationPercent, 0),
    rateBasis: values.rateBasis === 1 ? 'apy' : 'nominal',
    targetAmount: finiteOr(values.target, defaultSavingsGoalInputs.targetAmount),
    targetBasis: values.targetBasis === 1 ? 'today' : 'future',
    years: finiteOr(values.years, defaultSavingsGoalInputs.years)
  };
}

export function buildSavingsShareUrl(inputs: SavingsGoalInputs, currency: SavingsCurrencyCode, locale: SavingsLocaleCode, scenarioId: SavingsScenarioId = 'base', origin = window.location.origin): string {
  const url = new URL('/calculators/savings-goal', origin);
  url.searchParams.set('fp', '2');
  url.searchParams.set('formula', savingsGoalFormulaVersion);
  Object.entries(inputs).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  url.searchParams.set('currency', currency);
  url.searchParams.set('locale', locale);
  url.searchParams.set('scenario', scenarioId);
  return url.toString();
}

export function restoreSavingsState(): (SavingsGoalDraft & { scenarioId: SavingsScenarioId; source: 'draft' | 'share' }) | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('fp') === '2') {
    if (params.get('formula') !== savingsGoalFormulaVersion) return null;
    return {
      currency: currencyCodes.includes(params.get('currency') as SavingsCurrencyCode) ? params.get('currency') as SavingsCurrencyCode : 'USD',
      formulaVersion: savingsGoalFormulaVersion,
      inputs: deserializeSavingsInputs(params),
      locale: localeCodes.includes(params.get('locale') as SavingsLocaleCode) ? params.get('locale') as SavingsLocaleCode : 'auto',
      scenarioId: supportedScenario(params.get('scenario')),
      source: 'share',
      updatedAt: new Date().toISOString()
    };
  }
  if (params.get('fp') === '1') {
    return {
      currency: 'USD', formulaVersion: savingsGoalFormulaVersion,
      inputs: { ...defaultSavingsGoalInputs, annualRatePercent: finiteParam(params, 'rate', 8), currentSavings: finiteParam(params, 'current', 10_000), targetAmount: finiteParam(params, 'target', 100_000), years: finiteParam(params, 'years', 10) },
      locale: 'auto', scenarioId: 'base', source: 'share', updatedAt: new Date().toISOString()
    };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey) ?? 'null') as unknown;
    if (!isSavingsGoalDraft(parsed)) return null;
    return { ...parsed, scenarioId: supportedScenario(parsed.scenarioId), source: 'draft' };
  } catch {
    return null;
  }
}

export function deserializeSavingsInputs(params: URLSearchParams): SavingsGoalInputs {
  const defaults = defaultSavingsGoalInputs;
  return {
    annualContributionIncreasePercent: finiteParam(params, 'annualContributionIncreasePercent', defaults.annualContributionIncreasePercent),
    annualFeePercent: finiteParam(params, 'annualFeePercent', defaults.annualFeePercent),
    annualRatePercent: finiteParam(params, 'annualRatePercent', defaults.annualRatePercent),
    annualTopUp: finiteParam(params, 'annualTopUp', defaults.annualTopUp),
    compoundingFrequency: supportedCompounding(finiteParam(params, 'compoundingFrequency', defaults.compoundingFrequency)),
    contributionFrequency: supportedContribution(finiteParam(params, 'contributionFrequency', defaults.contributionFrequency)),
    contributionTiming: params.get('contributionTiming') === 'beginning' ? 'beginning' : 'end',
    currentContribution: finiteParam(params, 'currentContribution', defaults.currentContribution),
    currentSavings: finiteParam(params, 'currentSavings', defaults.currentSavings),
    inflationPercent: finiteParam(params, 'inflationPercent', defaults.inflationPercent),
    rateBasis: params.get('rateBasis') === 'apy' ? 'apy' : 'nominal',
    targetAmount: finiteParam(params, 'targetAmount', defaults.targetAmount),
    targetBasis: params.get('targetBasis') === 'today' ? 'today' : 'future',
    years: finiteParam(params, 'years', defaults.years)
  };
}

export function isSavingsGoalDraft(value: unknown): value is SavingsGoalDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.formulaVersion !== savingsGoalFormulaVersion || !record.inputs || typeof record.inputs !== 'object') return false;
  if (!currencyCodes.includes(record.currency as SavingsCurrencyCode) || !localeCodes.includes(record.locale as SavingsLocaleCode)) return false;
  const restored = record.inputs as Record<string, unknown>;
  const numericInputsAreFinite = Object.entries(defaultSavingsGoalInputs).filter(([, defaultValue]) => typeof defaultValue === 'number').every(([key]) => typeof restored[key] === 'number' && Number.isFinite(restored[key]));
  if (!numericInputsAreFinite) return false;
  return typeof record.updatedAt === 'string' && (record.scenarioId === undefined || ['base', 'lower', 'higher'].includes(String(record.scenarioId))) && ['beginning', 'end'].includes(String(restored.contributionTiming)) && ['nominal', 'apy'].includes(String(restored.rateBasis)) && ['future', 'today'].includes(String(restored.targetBasis)) && [365, 12, 4, 2, 1].includes(Number(restored.compoundingFrequency)) && [52, 26, 24, 12, 4, 2, 1].includes(Number(restored.contributionFrequency));
}

export function buildSavingsProjectionCsv(inputs: SavingsGoalInputs, projection: SavingsGoalProjection, currency: SavingsCurrencyCode, locale: SavingsLocaleCode): string {
  const rows: Array<Array<string | number>> = [
    ['Metadata', 'Formula version', savingsGoalFormulaVersion],
    ['Metadata', 'Currency', currency],
    ['Metadata', 'Display locale', locale],
    ['Metadata', 'Exact required contribution', rawNumber(projection.requiredContribution ?? 0)],
    ['Metadata', 'Resolved deadline target', rawNumber(projection.resolvedTarget)],
    ...Object.entries(inputs).map(([key, value]) => ['Input', key, value]),
    [],
    ['Period', 'Time (years)', 'Opening balance', 'Deposits', 'Gross return', 'Fees', 'Ending balance', 'Cumulative contributions', 'Target at time', 'Signed difference from deadline target'],
    ...projection.detailedSchedule.map((row) => [row.label, rawNumber(row.time), rawNumber(row.openingBalance), rawNumber(row.deposits), rawNumber(row.grossReturn), rawNumber(row.fees), rawNumber(row.closingBalance), rawNumber(row.cumulativeContributions), rawNumber(row.targetAtTime), rawNumber(row.closingBalance - projection.resolvedTarget)])
  ];
  return rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\r\n');
}

function toSavingsCalculatorResult(projection: SavingsGoalProjection, inputs: SavingsGoalInputs): CalculatorResult {
  return {
    assumptions: [
      `Formula version ${savingsGoalFormulaVersion}.`,
      inputs.rateBasis === 'nominal' ? `Nominal annual rate compounded ${frequencyLabel(inputs.compoundingFrequency)}.` : 'APY/effective annual rate already includes compounding.',
      `${frequencyLabel(inputs.contributionFrequency)} contributions at the ${inputs.contributionTiming} of each period.`,
      'Deterministic estimate under constant assumptions; not a prediction or guarantee.'
    ],
    metrics: [
      { description: 'Exact recurring contribution required under the selected assumptions.', label: 'Required contribution', tone: 'accent', value: projection.requiredContribution ?? 0, valueType: 'currency' },
      { description: 'Goal amount in its selected money basis at the deadline.', label: 'Deadline target', value: projection.resolvedTarget, valueType: 'currency' },
      { description: 'Current savings projected to the deadline.', label: 'Future current savings', value: projection.currentSavingsAtDeadline, valueType: 'currency' },
      { description: 'Current contribution plan projected to the deadline.', label: 'Current plan ending', value: projection.currentPlanEnding, valueType: 'currency' },
      { description: 'Signed current-plan comparison with the target.', label: 'Current plan difference', tone: projection.currentPlanDifference >= 0 ? 'positive' : 'warning', value: projection.currentPlanDifference, valueType: 'currency' },
      { description: 'One deposit today that closes the current-plan shortfall.', label: 'Catch-up today', value: projection.catchUpNow, valueType: 'currency' }
    ],
    narrative: `Required saving pace for a ${formatDuration(inputs.years)} goal under constant assumptions. This estimate is not a promise.`
  };
}

function projectionInterpretation(projection: SavingsGoalProjection, inputs: SavingsGoalInputs, practicalContribution: number | null, money: (value: number, digits?: number) => string): string {
  if (projection.status === 'funded-now') return `Your current savings already cover the goal today and remain projected above the deadline target. The modeled recurring requirement is ${money(0)}.`;
  if (projection.status === 'funded-by-growth') return `Your current savings and fixed top-ups are projected to fund the deadline target without a recurring contribution. Review the rate assumption regularly.`;
  const practicalDifference = (practicalContribution ?? projection.requiredContribution ?? 0) - inputs.currentContribution;
  if (projection.status === 'on-track') return `Your current ${frequencyLabel(inputs.contributionFrequency)} contribution is projected to meet or exceed the target. The practical margin is ${money(Math.abs(practicalDifference), 2)} per period.`;
  return `At your current pace, the modeled deadline shortfall is ${money(Math.max(0, -projection.currentPlanDifference))}. Increase the total contribution by about ${money(Math.max(0, practicalDifference), 2)} per period, use the catch-up option, or adjust the deadline or target.`;
}

export function formatSavingsCurrency(value: number, currency: SavingsCurrencyCode, locale: string | undefined, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, { currency, maximumFractionDigits, minimumFractionDigits: maximumFractionDigits, style: 'currency' }).format(value);
}

export function currencyFractionDigits(currency: SavingsCurrencyCode): number {
  return new Intl.NumberFormat('en', { currency, style: 'currency' }).resolvedOptions().maximumFractionDigits ?? 2;
}

function roundUpToMinorUnit(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.max(0, Math.ceil(value * factor - 1e-10) / factor);
}

function formatPercent(value: number, locale: string | undefined): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3, style: 'percent' }).format(value);
}

function formatDuration(years: number): string {
  const wholeYears = Math.floor(years + 1e-10);
  const months = Math.round((years - wholeYears) * 12);
  if (wholeYears === 0) return `${months} month${months === 1 ? '' : 's'}`;
  if (months === 0) return `${wholeYears} ${wholeYears === 1 ? 'year' : 'years'}`;
  return `${wholeYears}y ${months}m`;
}

function frequencyLabel(frequency: number): string {
  if (frequency === 365) return 'daily';
  if (frequency === 52) return 'weekly';
  if (frequency === 26) return 'every two weeks';
  if (frequency === 24) return 'twice monthly';
  if (frequency === 12) return 'monthly';
  if (frequency === 4) return 'quarterly';
  if (frequency === 2) return 'twice yearly';
  return 'annually';
}

function scenarioLabel(id: SavingsScenarioId): string {
  if (id === 'lower') return 'Lower rate';
  if (id === 'higher') return 'Higher rate';
  return 'Base';
}

function supportedCompounding(value: number): SavingsCompoundingFrequency {
  return [365, 12, 4, 2, 1].includes(value) ? value as SavingsCompoundingFrequency : 12;
}

function supportedContribution(value: number): SavingsContributionFrequency {
  return [52, 26, 24, 12, 4, 2, 1].includes(value) ? value as SavingsContributionFrequency : 12;
}

function supportedScenario(value: unknown): SavingsScenarioId {
  return value === 'lower' || value === 'higher' ? value : 'base';
}

function finiteParam(params: URLSearchParams, key: string, fallback: number): number {
  const parsed = Number(params.get(key));
  return params.has(key) && Number.isFinite(parsed) ? parsed : fallback;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function sampleRows<Row>(rows: Row[], limit: number): Row[] {
  if (rows.length <= limit) return rows;
  const indexes = new Set<number>([0, rows.length - 1]);
  for (let index = 1; index < limit - 1; index += 1) indexes.add(Math.round(index * (rows.length - 1) / (limit - 1)));
  return [...indexes].sort((left, right) => left - right).map((index) => rows[index]);
}

function currencySymbol(currency: SavingsCurrencyCode): string {
  return new Intl.NumberFormat('en', { currency, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0, style: 'currency' }).formatToParts(0).find((part) => part.type === 'currency')?.value ?? currency;
}

function rawNumber(value: number): string {
  return Number.isFinite(value) ? String(value) : '';
}

function csvEscape(value: string): string {
  const safeValue = /^[=+@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safeValue) ? `"${safeValue.replace(/"/g, '""')}"` : safeValue;
}

function downloadText(filename: string, contents: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(anchor.href);
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  if (!document.execCommand('copy')) {
    textarea.remove();
    activeElement?.focus();
    throw new Error('Copy failed');
  }
  textarea.remove();
  activeElement?.focus();
}

function formatSavedHeadline(saved: CalculatorSavedResult, fallbackCurrency: SavingsCurrencyCode, locale: string | undefined): string {
  const value = saved.result.metrics[0]?.value;
  const currency = currencyCodes.includes(saved.currency as SavingsCurrencyCode) ? saved.currency as SavingsCurrencyCode : fallbackCurrency;
  return Number.isFinite(value) ? formatSavingsCurrency(value, currency, locale, 2) : 'Saved plan';
}
