import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  ChevronDown,
  CircleHelp,
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
  calculateCompoundInterest,
  compoundInterestFormulaVersion,
  defaultCompoundInterestInputs,
  validateCompoundInterestInputs,
  type CompoundInterestInputs,
  type CompoundInterestProjection,
  type CompoundInterestScheduleRow,
  type CompoundingFrequency,
  type ContributionFrequency,
  type ContributionTiming,
  type RateBasis,
  type TargetBasis
} from './lib/compoundInterestCalculator';
import type { CalculatorResult, SeoCalculator } from './lib/seoCalculators';

export type CurrencyCode = 'AUD' | 'CAD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'USD';
export type LocaleCode = 'auto' | 'de-DE' | 'en-IN' | 'en-US';
export type ScenarioId = 'base' | 'higher' | 'lower';
type SchedulePeriod = 'annual' | 'detailed';

export type CompoundDraft = {
  currency: CurrencyCode;
  formulaVersion: typeof compoundInterestFormulaVersion;
  inputs: CompoundInterestInputs;
  locale: LocaleCode;
  scenarioId?: ScenarioId;
  updatedAt: string;
};

type Props = {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  savedResults: CalculatorSavedResult[];
};

const draftStorageKey = 'finpath.calculatorDraft.compound-interest.v2';
const currencyCodes: CurrencyCode[] = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const localeCodes: LocaleCode[] = ['auto', 'en-US', 'en-IN', 'de-DE'];
const rateBasisOptions: Array<{ label: string; value: RateBasis }> = [
  { label: 'Nominal annual rate', value: 'nominal' },
  { label: 'APY / effective annual rate', value: 'apy' }
];
const contributionFrequencyOptions: Array<{ label: string; value: ContributionFrequency }> = [
  { label: 'Weekly', value: 52 },
  { label: 'Every two weeks', value: 26 },
  { label: 'Twice a month', value: 24 },
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Twice a year', value: 2 },
  { label: 'Annually', value: 1 }
];
const compoundingFrequencyOptions: Array<{ label: string; value: CompoundingFrequency }> = [
  { label: 'Daily (365)', value: 365 },
  { label: 'Monthly', value: 12 },
  { label: 'Quarterly', value: 4 },
  { label: 'Twice a year', value: 2 },
  { label: 'Annually', value: 1 }
];

export function CompoundInterestCalculator({
  auth,
  calculator,
  onNavigate,
  onSaveResult,
  savedResults
}: Props) {
  const [inputs, setInputs] = useState<CompoundInterestInputs>(defaultCompoundInterestInputs);
  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const [locale, setLocale] = useState<LocaleCode>('auto');
  const [scenarioId, setScenarioId] = useState<ScenarioId>('base');
  const [schedulePeriod, setSchedulePeriod] = useState<SchedulePeriod>('annual');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const scenarioInputs = useMemo(
    () => applyScenario(inputs, scenarioId),
    [inputs, scenarioId]
  );
  const projection = useMemo(
    () => calculateCompoundInterest(scenarioInputs),
    [scenarioInputs]
  );
  const scenarios = useMemo(
    () => (['lower', 'base', 'higher'] as const).map((id) => ({
      id,
      inputs: applyScenario(inputs, id),
      projection: calculateCompoundInterest(applyScenario(inputs, id))
    })),
    [inputs]
  );
  const sensitivity = useMemo(() => buildSensitivity(inputs), [inputs]);
  const history = useMemo(
    () => savedResults.filter((item) => item.calculatorSlug === calculator.slug).slice(0, 6),
    [calculator.slug, savedResults]
  );
  const schedule = schedulePeriod === 'annual'
    ? projection.annualSchedule
    : projection.detailedSchedule;
  const resolvedLocale = locale === 'auto' ? undefined : locale;
  const growthShare = projection.endingValue === 0 ? 0 : projection.netGrowth / projection.endingValue;

  useEffect(() => {
    const restored = restoreState();
    if (!restored) return;
    setInputs(restored.inputs);
    setCurrency(restored.currency);
    setLocale(restored.locale);
    setScenarioId(restored.scenarioId ?? 'base');
    setMessage(restored.source === 'share'
      ? 'Shared projection loaded. Review every assumption before relying on it.'
      : 'Your last browser draft was restored.');
  }, []);

  useEffect(() => {
    if (!validateDraftInputs(inputs)) return;
    const draft: CompoundDraft = {
      currency,
      formulaVersion: compoundInterestFormulaVersion,
      inputs,
      locale,
      scenarioId,
      updatedAt: new Date().toISOString()
    };
    try {
      window.localStorage.setItem(draftStorageKey, JSON.stringify(draft));
    } catch {
      // A blocked localStorage should never block the public calculator.
    }
  }, [currency, inputs, locale, scenarioId]);

  const setNumber = (key: NumericInputKey, raw: string) => {
    setScenarioId('base');
    setMessage('');
    setInputs((current) => ({ ...current, [key]: raw === '' ? Number.NaN : Number(raw) }));
  };

  const setChoice = <Key extends keyof CompoundInterestInputs>(key: Key, value: CompoundInterestInputs[Key]) => {
    setScenarioId('base');
    setMessage('');
    setInputs((current) => ({ ...current, [key]: value }));
  };

  const reset = () => {
    setInputs(defaultCompoundInterestInputs);
    setCurrency('USD');
    setLocale('auto');
    setScenarioId('base');
    setMessage('Defaults restored.');
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildShareUrl(inputs, currency, locale, scenarioId));
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
      'compound-interest-projection.csv',
      buildProjectionCsv(scenarioInputs, projection, currency, locale),
      'text/csv;charset=utf-8;'
    );
    setMessage('Raw, reconcilable schedule exported as CSV.');
  };

  const saveResult = async () => {
    if (!projection.validation.isValid) {
      setMessage('Fix the input errors before saving this result.');
      return;
    }
    if (auth.status !== 'signed-in') {
      setMessage('Draft saved in this browser. Create an account to keep multiple runs in FinPath.');
      return;
    }

    setIsSaving(true);
    setMessage('Saving calculator result…');
    try {
      const outcome = await onSaveResult({
        calculator,
        currency,
        result: toCalculatorResult(projection, scenarioInputs),
        values: toNumericSaveValues(scenarioInputs)
      });
      window.localStorage.removeItem(draftStorageKey);
      setMessage(outcome.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Calculator result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSaved = (saved: CalculatorSavedResult) => {
    setInputs(inputsFromSaved(saved.inputValues));
    if (currencyCodes.includes(saved.currency as CurrencyCode)) setCurrency(saved.currency as CurrencyCode);
    setScenarioId('base');
    setMessage(`Loaded inputs saved on ${new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}.`);
  };

  const money = (value: number, maximumFractionDigits = 0) => formatCurrency(
    value,
    currency,
    resolvedLocale,
    maximumFractionDigits
  );

  return (
    <section
      className="calculator-library calculator-detail compound-calculator route-shell"
      aria-labelledby="calculator-detail-title"
      data-calculator-slug="compound-interest"
    >
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Growth &amp; goal planning</p>
        <h1 id="calculator-detail-title">Compound Interest Calculator</h1>
        <p>Project recurring growth with timing, fees, inflation, future cash flows, and a fully reconciling schedule.</p>
        <a href="/calculators" onClick={(event) => {
          event.preventDefault();
          onNavigate('/calculators');
        }}>
          <ArrowRight size={15} />
          Explore all calculators
        </a>
      </div>

      <section className="compound-trust-strip" aria-label="Calculator scope">
        <span><ShieldCheck size={17} /><strong>Public by default</strong><small>No account required</small></span>
        <span><TrendingUp size={17} /><strong>Constant-assumption projection</strong><small>Not a prediction or guarantee</small></span>
        <span><Table2 size={17} /><strong>Auditable math</strong><small>Headline and schedule reconcile</small></span>
      </section>

      <div className="calculator-detail-grid compound-workspace">
        <section className="calculator-input-panel" aria-labelledby="compound-input-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Quick start</p>
              <h2 id="compound-input-title">Set the growth plan</h2>
            </div>
            <button className="secondary-button icon-text-button" type="button" onClick={reset}>
              <RotateCcw size={15} /> Reset
            </button>
          </div>

          <div className="calculator-input-grid">
            <NumberField
              currency={currency}
              error={projection.validation.errors.principal}
              helper="The amount already invested at the start of the projection."
              inputKey="principal"
              label="Starting amount"
              min={0}
              onChange={setNumber}
              value={inputs.principal}
            />
            <NumberField
              currency={currency}
              error={projection.validation.errors.recurringContribution}
              helper="Amount added each contribution period. The default period is monthly."
              inputKey="recurringContribution"
              label="Recurring contribution"
              min={0}
              onChange={setNumber}
              value={inputs.recurringContribution}
            />
            <NumberField
              error={projection.validation.errors.years}
              helper="Fractional elapsed years are allowed; scheduled events at or before the exact endpoint are included."
              inputKey="years"
              label="Term"
              min={0.01}
              onChange={setNumber}
              step={0.01}
              suffix="years"
              value={inputs.years}
            />
            <NumberField
              error={projection.validation.errors.annualRatePercent}
              helper={inputs.rateBasis === 'nominal'
                ? 'Nominal annual rate before within-year compounding.'
                : 'APY already includes within-year compounding.'}
              inputKey="annualRatePercent"
              label="Annual return or rate"
              onChange={setNumber}
              step={0.01}
              suffix="%"
              value={inputs.annualRatePercent}
            />
          </div>

          <p className="compound-default-convention">
            Default convention: nominal annual rate, monthly compounding, and end-of-month contributions.
          </p>

          <details className="compound-disclosure calculator-options-shell">
            <summary>
              <span><strong>Advanced options</strong><small>Timing, frequencies, fees, inflation, target, and future events</small></span>
              <ChevronDown size={17} />
            </summary>
            <div className="compound-advanced-body">
              <fieldset>
                <legend>Rate and contribution timing</legend>
                <div className="calculator-input-grid">
                  <SelectField
                    helper="APY/effective rate already includes compounding."
                    inputKey="rateBasis"
                    label="Rate basis"
                    onChange={(value) => setChoice('rateBasis', value as RateBasis)}
                    options={rateBasisOptions}
                    value={inputs.rateBasis}
                  />
                  {inputs.rateBasis === 'nominal' ? (
                    <SelectField
                      helper="How often a nominal annual rate is credited in this equal-period model."
                      inputKey="compoundingFrequency"
                      label="Compounding frequency"
                      onChange={(value) => setChoice('compoundingFrequency', Number(value) as CompoundingFrequency)}
                      options={compoundingFrequencyOptions}
                      value={inputs.compoundingFrequency}
                    />
                  ) : (
                    <div className="compound-inline-note">
                      <strong>Compounding is included in APY</strong>
                      <small>Changing a compounding frequency would double-count it, so that control is hidden.</small>
                    </div>
                  )}
                  <SelectField
                    helper="The contribution amount is applied once per selected period."
                    inputKey="contributionFrequency"
                    label="Contribution frequency"
                    onChange={(value) => setChoice('contributionFrequency', Number(value) as ContributionFrequency)}
                    options={contributionFrequencyOptions}
                    value={inputs.contributionFrequency}
                  />
                  <SelectField
                    helper="Beginning contributions receive one more period of growth than end contributions."
                    inputKey="contributionTiming"
                    label="Contribution timing"
                    onChange={(value) => setChoice('contributionTiming', value as ContributionTiming)}
                    options={[
                      { label: 'Beginning of period', value: 'beginning' },
                      { label: 'End of period', value: 'end' }
                    ]}
                    value={inputs.contributionTiming}
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>Changing contributions and purchasing power</legend>
                <div className="calculator-input-grid">
                  <NumberField
                    currency={currency}
                    error={projection.validation.errors.annualTopUp}
                    helper="Added on each full-year anniversary, after that point’s regular contribution."
                    inputKey="annualTopUp"
                    label="Annual anniversary top-up"
                    min={0}
                    onChange={setNumber}
                    value={inputs.annualTopUp}
                  />
                  <NumberField
                    error={projection.validation.errors.annualContributionIncreasePercent}
                    helper="The recurring amount changes after each completed contribution year."
                    inputKey="annualContributionIncreasePercent"
                    label="Annual contribution increase"
                    onChange={setNumber}
                    step={0.01}
                    suffix="%"
                    value={inputs.annualContributionIncreasePercent}
                  />
                  <NumberField
                    error={projection.validation.errors.annualFeePercent}
                    helper="Annual percentage-of-assets fee applied proportionally after gross return."
                    inputKey="annualFeePercent"
                    label="Annual asset fee"
                    min={0}
                    onChange={setNumber}
                    step={0.01}
                    suffix="%"
                    value={inputs.annualFeePercent}
                  />
                  <NumberField
                    error={projection.validation.errors.inflationPercent}
                    helper="Used only to translate the ending balance into today’s purchasing power."
                    inputKey="inflationPercent"
                    label="Inflation"
                    onChange={setNumber}
                    step={0.01}
                    suffix="%"
                    value={inputs.inflationPercent}
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>Optional target and future cash flows</legend>
                <div className="calculator-input-grid">
                  <NumberField
                    currency={currency}
                    error={projection.validation.errors.targetAmount}
                    helper="Leave at zero to hide target analysis."
                    inputKey="targetAmount"
                    label="Target amount"
                    min={0}
                    onChange={setNumber}
                    value={inputs.targetAmount}
                  />
                  <SelectField
                    helper="Today’s-money targets are increased by inflation before comparison."
                    inputKey="targetBasis"
                    label="Target basis"
                    onChange={(value) => setChoice('targetBasis', value as TargetBasis)}
                    options={[
                      { label: 'Future money', value: 'future' },
                      { label: 'Today’s purchasing power', value: 'today' }
                    ]}
                    value={inputs.targetBasis}
                  />
                  <NumberField
                    currency={currency}
                    error={projection.validation.errors.futureDepositAmount}
                    helper="A single additional deposit at the selected relative year."
                    inputKey="futureDepositAmount"
                    label="One-time future deposit"
                    min={0}
                    onChange={setNumber}
                    value={inputs.futureDepositAmount}
                  />
                  <NumberField
                    error={projection.validation.errors.futureDepositYear}
                    helper="Relative to the start; 2.5 means halfway through year 3."
                    inputKey="futureDepositYear"
                    label="Deposit at year"
                    min={0}
                    onChange={setNumber}
                    step={0.01}
                    value={inputs.futureDepositYear}
                  />
                  <NumberField
                    currency={currency}
                    error={projection.validation.errors.futureWithdrawalAmount}
                    helper="The funded portion is limited to the available balance."
                    inputKey="futureWithdrawalAmount"
                    label="One-time future withdrawal"
                    min={0}
                    onChange={setNumber}
                    value={inputs.futureWithdrawalAmount}
                  />
                  <NumberField
                    error={projection.validation.errors.futureWithdrawalYear}
                    helper="Relative year when the withdrawal occurs."
                    inputKey="futureWithdrawalYear"
                    label="Withdrawal at year"
                    min={0}
                    onChange={setNumber}
                    step={0.01}
                    value={inputs.futureWithdrawalYear}
                  />
                </div>
              </fieldset>

              <fieldset>
                <legend>Display only</legend>
                <div className="calculator-input-grid">
                  <SelectField
                    helper="Currency changes symbols and formatting only. No exchange-rate conversion occurs."
                    inputKey="currency"
                    label="Currency"
                    onChange={(value) => {
                      if (currencyCodes.includes(value as CurrencyCode)) setCurrency(value as CurrencyCode);
                    }}
                    options={currencyCodes.map((value) => ({ label: value, value }))}
                    value={currency}
                  />
                  <SelectField
                    helper="Choose Indian grouping for lakh/crore-style separators or another exact locale format."
                    inputKey="locale"
                    label="Number format"
                    onChange={(value) => {
                      if (localeCodes.includes(value as LocaleCode)) setLocale(value as LocaleCode);
                    }}
                    options={[
                      { label: 'Browser default', value: 'auto' },
                      { label: 'United States (1,000,000)', value: 'en-US' },
                      { label: 'India (10,00,000)', value: 'en-IN' },
                      { label: 'Germany (1.000.000)', value: 'de-DE' }
                    ]}
                    value={locale}
                  />
                </div>
              </fieldset>
            </div>
          </details>

        </section>

        <section className="calculator-result-panel compound-result-panel" aria-labelledby="compound-result-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Projection</p>
              <h2 id="compound-result-title">Ending value</h2>
            </div>
            <div className="compound-model-badges">
              <span className="compound-version">{scenarioLabel(scenarioId)} case</span>
              <span className="compound-version">Model v2</span>
            </div>
          </div>

          {!projection.validation.isValid ? (
            <div className="compound-error-summary" role="alert">
              <strong>Check the highlighted assumptions</strong>
              <ul>
                {Object.values(projection.validation.errors).map((error) => <li key={error}>{error}</li>)}
              </ul>
            </div>
          ) : (
            <>
              <div className="compound-headline" aria-live="polite" aria-atomic="true">
                <strong>{money(projection.endingValue)}</strong>
                <span>after {formatDuration(scenarioInputs.years)}</span>
                <small>{money(projection.endingValue, currencyFractionDigits(currency))} at standard {currency} display precision; calculations retain full precision</small>
              </div>

              <div className="calculator-result-metrics">
                <ResultMetric help="Capital present at the beginning of the projection." label="Starting amount" value={money(scenarioInputs.principal)} />
                <ResultMetric help="Recurring contributions, annual top-ups, and the modeled future deposit after the start." label="Future contributions" value={money(projection.totalDeposits)} />
                <ResultMetric help="Starting amount plus every deposit, before subtracting withdrawals." label="Total invested" value={money(projection.investedCapital)} />
                <ResultMetric help="Ending balance minus net contributed capital. This can be negative." label="Net growth" tone={projection.netGrowth < 0 ? 'warning' : 'positive'} value={money(projection.netGrowth)} />
                <ResultMetric help="Estimated net growth divided by ending value. Withdrawals can make this percentage exceed ordinary ranges." label="Growth share" tone={projection.netGrowth < 0 ? 'warning' : 'positive'} value={formatPercent(growthShare, resolvedLocale)} />
                <ResultMetric help="The annual rate after the selected compounding convention." label="Effective annual rate" value={formatPercent(projection.effectiveAnnualRate, resolvedLocale)} />
                <ResultMetric help="Ending balance divided by the cumulative inflation factor." label="Today’s buying power" value={money(projection.realEndingValue)} />
                {scenarioInputs.annualFeePercent > 0 ? (
                  <>
                    <ResultMetric help="Asset fees deducted over the modeled intervals." label="Fees charged" tone="warning" value={money(projection.feesPaid)} />
                    <ResultMetric help="No-fee ending value minus the after-fee ending value, including foregone growth." label="Ending-value fee drag" tone="warning" value={money(projection.feeDrag)} />
                  </>
                ) : null}
                {projection.targetDifference !== null ? (
                  <ResultMetric
                    help="The ending balance compared with the target in its selected money basis."
                    label={projection.targetDifference >= 0 ? 'Ahead of target' : 'Short of target'}
                    tone={projection.targetDifference >= 0 ? 'positive' : 'warning'}
                    value={money(Math.abs(projection.targetDifference))}
                  />
                ) : null}
              </div>

              <p className="compound-interpretation">
                {projectionInterpretation(projection, scenarioInputs, money, resolvedLocale)}
              </p>

              <CompoundGrowthChart
                currency={currency}
                locale={resolvedLocale}
                rows={projection.annualSchedule}
              />

              {projection.validation.warnings.length > 0 ? (
                <div className="compound-warning-list" aria-label="Projection cautions">
                  {projection.validation.warnings.map((warning) => <p key={warning}>{warning}</p>)}
                </div>
              ) : null}

              <div className="compound-action-row">
                <button className="secondary-button icon-text-button" type="button" onClick={copyShareLink}>
                  <Copy size={15} /> Copy link
                </button>
                <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}>
                  <Download size={15} /> Export CSV
                </button>
              </div>

              <div className="calculator-conversion-panel">
                <span className="feature-icon"><Target size={18} /></span>
                <div>
                  <strong>{calculator.conversionLabel}</strong>
                  <small>Save this run, then revisit actual progress inside FinPath.</small>
                </div>
                {auth.status === 'signed-in' ? (
                  <button className="primary-button" disabled={isSaving} type="button" onClick={saveResult}>
                    {isSaving ? 'Saving…' : 'Save result'}
                  </button>
                ) : auth.status === 'not-configured' ? (
                  <button className="primary-button" type="button" onClick={() => onNavigate(calculator.conversionRoute)}>
                    {calculator.conversionLabel}
                  </button>
                ) : (
                  <SignUpButton mode="modal">
                    <button className="primary-button" type="button" onClick={saveResult}>Create account to save</button>
                  </SignUpButton>
                )}
              </div>
            </>
          )}

          {message ? <p className="calculator-save-message" role="status" aria-live="polite">{message}</p> : null}
        </section>
      </div>

      {projection.validation.isValid ? (
        <section className="compound-analysis-grid" aria-label="Expert analysis">
          <div className="compound-analysis-heading">
            <p className="eyebrow">Expert analysis</p>
            <h2>Audit and stress-test the projection</h2>
            <p>Open only the comparison, schedule, or methodology you need. Every section is collapsed by default.</p>
          </div>

          <details className="compound-analysis-card">
            <summary><span><strong>Scenario comparison</strong><small>Lower, base, and higher constant-rate cases</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <fieldset className="compound-scenario-picker">
                <legend>Choose the case shown in the headline</legend>
                <p>Conservative and optimistic cases move only the annual rate by 2 percentage points. They are deterministic comparisons, not probabilities.</p>
                <div>
                  {scenarios.map((scenario) => (
                    <label key={scenario.id}>
                      <input
                        checked={scenarioId === scenario.id}
                        name="compound-scenario"
                        type="radio"
                        value={scenario.id}
                        onChange={() => setScenarioId(scenario.id)}
                      />
                      <span>{scenarioLabel(scenario.id)}</span>
                      <strong>{scenario.projection.validation.isValid ? money(scenario.projection.endingValue) : 'Invalid'}</strong>
                      <small>{formatPercent(scenario.inputs.annualRatePercent / 100, resolvedLocale)}{scenarioId === scenario.id ? ' · Selected' : ''}</small>
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Schedule and audit trail</strong><small>Every row uses the same engine as the headline</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <div className="compound-schedule-toolbar">
                <label>
                  <span>Schedule detail</span>
                  <select autoComplete="off" name="compound-schedule-detail" value={schedulePeriod} onChange={(event) => setSchedulePeriod(event.target.value as SchedulePeriod)}>
                    <option value="annual">Annual summary</option>
                    <option value="detailed">Cash-flow events</option>
                  </select>
                </label>
                <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}>
                  <Download size={15} /> Raw CSV
                </button>
              </div>
              <ScheduleTable currency={currency} locale={resolvedLocale} rows={schedule} />
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Sensitivity grid</strong><small>Return versus recurring contribution</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              <p>Each cell changes only the row’s rate and column’s contribution. This is deterministic sensitivity—not a probability range.</p>
              <div className="compound-sensitivity-wrap" role="region" aria-label="Return and contribution sensitivity" tabIndex={0}>
                <table>
                  <caption>Ending value sensitivity by annual rate and contribution amount</caption>
                  <thead><tr><th scope="col">Annual rate</th>{sensitivity.contributions.map((value, index) => <th scope="col" key={`contribution-${index}`}>{money(value)}</th>)}</tr></thead>
                  <tbody>
                    {sensitivity.rates.map((rate, rowIndex) => (
                      <tr key={`rate-${rowIndex}`}>
                        <th scope="row">{formatPercent(rate / 100, resolvedLocale)}</th>
                        {sensitivity.values[rowIndex].map((value, columnIndex) => (
                          <td className={rowIndex === 1 && columnIndex === 1 ? 'is-base' : ''} key={`sensitivity-${rowIndex}-${columnIndex}`}>
                            {rowIndex === 1 && columnIndex === 1 ? <small className="compound-base-label">Base</small> : null}
                            {Number.isFinite(value) ? money(value) : 'Invalid'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="compound-duration-sensitivity" aria-label="Duration sensitivity">
                <strong>Duration sensitivity</strong>
                <p>Only the elapsed term changes; every other base assumption stays fixed.</p>
                <div>
                  {sensitivity.durations.map((item) => (
                    <span className={Math.abs(item.years - inputs.years) < 1e-9 ? 'is-base' : ''} key={item.years}>
                      <small>{item.label} · {formatDuration(item.years)}</small>
                      <strong>{Number.isFinite(item.value) ? money(item.value) : 'Invalid'}</strong>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Milestones and target timing</strong><small>When key thresholds are first reached</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body">
              {projection.milestones.length > 0 ? (
                <div className="compound-milestone-list">
                  {projection.milestones.map((milestone) => (
                    <span key={milestone.label}>
                      <strong>{milestone.label}</strong>
                      <small>Year {formatNumber(milestone.time, resolvedLocale, 2)} · {money(milestone.value)}</small>
                    </span>
                  ))}
                </div>
              ) : <p>Add a target or use a longer-growing scenario to reveal milestones.</p>}
              {projection.targetReachedAt !== null ? (
                <p><strong>Target timing:</strong> first modeled checkpoint at or above the target is year {formatNumber(projection.targetReachedAt, resolvedLocale, 2)} under the same constant assumptions.</p>
              ) : null}
            </div>
          </details>

          <details className="compound-analysis-card">
            <summary><span><strong>Methodology, limits, and sources</strong><small>Definitions that can change the answer</small></span><ChevronDown size={17} /></summary>
            <div className="compound-analysis-body compound-methodology">
              <p><strong>Rate basis.</strong> Nominal mode uses (1 + annual rate ÷ compounds per year) raised to elapsed compound periods. APY mode uses (1 + APY) raised to elapsed years; compounding frequency is intentionally not applied twice.</p>
              <p><strong>Cash-flow timing.</strong> End contributions at the horizon are included; beginning contributions at the horizon are excluded. Annual top-ups occur on full-year anniversaries. One-time deposits are applied before same-time withdrawals.</p>
              <p><strong>Fees and inflation.</strong> The percentage-of-assets fee is applied proportionally after gross return over each interval. Inflation changes the real-value report, not the nominal account balance. Full precision is retained until display.</p>
              <p><strong>Reconciliation.</strong> Every row uses closing balance = opening balance + deposits − funded withdrawals + gross return − fees. The final row equals the headline result.</p>
              <p><strong>Worked default.</strong> $10,000 initially plus $500 at each month-end for 10 years at an 8% nominal rate compounded monthly produces $113,669.42: $70,000 invested capital and $43,669.42 estimated growth.</p>
              <p><strong>Limits.</strong> This equal-period model does not reproduce product-specific daily-balance ledgers, taxes, live APYs, FX conversion, tiered or transaction fees, variable market returns, or Monte Carlo probabilities.</p>
              <ul>
                <li><a href="https://www.consumerfinance.gov/rules-policy/regulations/1030/a/" target="_blank" rel="noreferrer">CFPB Regulation DD: APY calculation</a></li>
                <li><a href="https://www.investor.gov/financial-tools-calculators/calculators/compound-interest-calculator" target="_blank" rel="noreferrer">Investor.gov Compound Interest Calculator</a></li>
                <li><a href="https://support.microsoft.com/en-us/excel/functions/fv-function" target="_blank" rel="noreferrer">Microsoft FV timing convention</a></li>
                <li><a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated" target="_blank" rel="noreferrer">Investor.gov: how fees affect a portfolio</a></li>
                <li><a href="https://www.bls.gov/cpi/factsheets/purchasing-power-constant-dollars.htm" target="_blank" rel="noreferrer">BLS: purchasing power and constant dollars</a></li>
              </ul>
              <p className="compound-source-date">Sources accessed August 8, 2026. Formula version: {compoundInterestFormulaVersion}.</p>
            </div>
          </details>
        </section>
      ) : null}

      <section className="compound-history-panel" aria-labelledby="compound-history-title">
        <div>
          <p className="eyebrow">Revisitability</p>
          <h2 id="compound-history-title">Recent saved runs</h2>
          <p>Browser drafts preserve one current projection. Signed-in history keeps multiple runs.</p>
        </div>
        {auth.status !== 'signed-in' ? (
          <p>Create an account when you want to keep and compare more than one projection.</p>
        ) : history.length === 0 ? (
          <p>No Compound Interest runs saved yet.</p>
        ) : (
          <div className="compound-history-list">
            {history.map((saved) => (
              <button key={saved.id} type="button" onClick={() => loadSaved(saved)}>
                <History size={16} />
                <span>{new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}</span>
                <strong>{formatSavedHeadline(saved, currency, resolvedLocale)}</strong>
                <small>Load inputs</small>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="calculator-faq-panel" aria-labelledby="compound-faq-title">
        <div>
          <p className="eyebrow">Questions</p>
          <h2 id="compound-faq-title">How to interpret this projection</h2>
        </div>
        <div className="calculator-faq-grid">
          <article><strong>Is the annual rate nominal or APY?</strong><p>The default is nominal with monthly compounding. Choose APY when the quoted rate already includes compounding.</p></article>
          <article><strong>Why does contribution timing matter?</strong><p>A beginning-of-period contribution receives one more interval of growth than an end-of-period contribution.</p></article>
          <article><strong>Is the lower case a safe forecast?</strong><p>No. All three cases are deterministic examples under constant rates, not confidence levels or probabilities.</p></article>
          <article><strong>Does changing currency convert the money?</strong><p>No. It changes display formatting only; every numeric amount stays unchanged.</p></article>
          <article><strong>Are taxes included?</strong><p>No. Taxes depend on jurisdiction, account type, basis, realization timing, and current law, so they are deferred to dedicated tools.</p></article>
          <article><strong>Can actual results differ?</strong><p>Yes. Returns, rates, fees, inflation, timing, and product rules can change. Past performance does not predict future results.</p></article>
        </div>
      </section>

      <section className="compound-related-panel" aria-label="Related next steps">
        <a href="/calculators/savings-goal" onClick={(event) => { event.preventDefault(); onNavigate('/calculators/savings-goal'); }}>
          <Target size={18} /><span><strong>Need to solve for the required contribution?</strong><small>Use Savings Goal next.</small></span><ArrowRight size={16} />
        </a>
        <a href="/calculators/investment-return" onClick={(event) => { event.preventDefault(); onNavigate('/calculators/investment-return'); }}>
          <Landmark size={18} /><span><strong>Evaluating a completed investment?</strong><small>Use Investment Return.</small></span><ArrowRight size={16} />
        </a>
      </section>
    </section>
  );
}

type NumericInputKey = {
  [Key in keyof CompoundInterestInputs]: CompoundInterestInputs[Key] extends number ? Key : never
}[keyof CompoundInterestInputs];
function NumberField({
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
  currency?: CurrencyCode;
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
  const helpId = `compound-${inputKey}-help`;
  const errorId = `compound-${inputKey}-error`;
  return (
    <label className={`field ${error ? 'has-error' : ''}`} htmlFor={`compound-${inputKey}`}>
      <span className="calculator-field-label"><span>{label}</span><CircleHelp aria-hidden="true" size={16} /></span>
      <div className="calculator-input-control">
        {currency ? <small aria-hidden="true">{currency}</small> : null}
        <input
          autoComplete="off"
          aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={Boolean(error)}
          id={`compound-${inputKey}`}
          inputMode="decimal"
          min={min}
          name={`compound-${inputKey}`}
          step={step}
          type="number"
          value={Number.isFinite(value) ? value : ''}
          onChange={(event) => onChange(inputKey, event.target.value)}
        />
        {suffix ? <small aria-hidden="true">{suffix}</small> : null}
      </div>
      <small id={helpId}>{helper}</small>
      {error ? <small className="field-error" id={errorId}>{error}</small> : null}
    </label>
  );
}

function SelectField({
  helper,
  inputKey,
  label,
  onChange,
  options,
  value
}: {
  helper: string;
  inputKey: string;
  label: string;
  onChange: (value: string | number) => void;
  options: ReadonlyArray<{ label: string; value: string | number }>;
  value: string | number;
}) {
  const helpId = `compound-${inputKey}-help`;
  return (
    <label className="field" htmlFor={`compound-${inputKey}`}>
      <span className="calculator-field-label"><span>{label}</span><CircleHelp aria-hidden="true" size={16} /></span>
      <select
        autoComplete="off"
        aria-describedby={helpId}
        className="compound-select"
        id={`compound-${inputKey}`}
        name={`compound-${inputKey}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}
      </select>
      <small id={helpId}>{helper}</small>
    </label>
  );
}

function ResultMetric({
  help,
  label,
  tone = 'neutral',
  value
}: {
  help: string;
  label: string;
  tone?: 'neutral' | 'positive' | 'warning';
  value: string;
}) {
  const helpId = `compound-metric-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-help`;
  return (
    <article className={`calculator-result-metric metric-${tone}`}>
      <span className="calculator-metric-label">
        <span>{label}</span>
        <span className="calculator-help-dot" aria-describedby={helpId} aria-label={`About ${label}`} tabIndex={0}>
          <CircleHelp aria-hidden="true" size={15} />
        </span>
        <span className="compound-metric-tooltip" id={helpId} role="tooltip">{help}</span>
      </span>
      <strong>{value}</strong>
    </article>
  );
}

function CompoundGrowthChart({
  currency,
  locale,
  rows
}: {
  currency: CurrencyCode;
  locale: string | undefined;
  rows: CompoundInterestScheduleRow[];
}) {
  let cumulativeWithdrawals = 0;
  const chartRows = rows.map((row) => {
    cumulativeWithdrawals += row.withdrawals;
    const netCapital = row.cumulativeContributions - cumulativeWithdrawals;
    return { ...row, growthToDate: row.closingBalance - netCapital, netCapital };
  });
  const visibleRows = sampleRows(chartRows, 8);
  const maximum = Math.max(1, ...visibleRows.map((row) => Math.max(
    row.closingBalance,
    row.netCapital,
    row.realClosingBalance
  )));
  return (
    <figure className="compound-growth-chart">
      <figcaption>
        <strong>Where the balance comes from</strong>
        <small>Net contributed capital and estimated growth stack to the nominal balance. The outlined bar shows the same balance in today’s purchasing power.</small>
      </figcaption>
      <div className="compound-chart-legend">
        <span className="is-capital">Net contributed capital</span>
        <span className="is-growth">Estimated growth</span>
        <span className="is-real">Today’s buying power</span>
      </div>
      <div className="compound-chart-plot" role="region" aria-label="Scrollable contribution, growth, and real-value timeline" tabIndex={0}>
        {visibleRows.map((row) => {
          const closingBalance = Math.max(0, row.closingBalance);
          const netCapital = Math.max(0, row.netCapital);
          const growth = row.growthToDate;
          const capitalSegment = growth >= 0 ? Math.min(netCapital, closingBalance) : closingBalance;
          const changeSegment = growth >= 0
            ? Math.max(0, closingBalance - capitalSegment)
            : Math.abs(growth);
          const stackValue = capitalSegment + changeSegment;
          return (
            <div className="compound-chart-column" key={row.time}>
              <span className="compound-chart-values" aria-hidden="true">
                <span className="compound-chart-stack" style={{ height: visualPercent(stackValue, maximum) }}>
                  <i className="is-capital" style={{ height: segmentPercent(capitalSegment, stackValue) }} />
                  {changeSegment > 0 ? <i className={growth >= 0 ? 'is-growth' : 'is-loss'} style={{ height: segmentPercent(changeSegment, stackValue) }} /> : null}
                </span>
                <i className="is-real" style={{ height: visualPercent(row.realClosingBalance, maximum) }} />
              </span>
              <strong>{row.label.replace(' (partial)', '')}</strong>
              <small>{formatCurrency(row.closingBalance, currency, locale)}</small>
              <span className="visually-hidden">
                {row.label}: nominal ending value {formatCurrency(row.closingBalance, currency, locale, 2)}, net contributed capital {formatCurrency(row.netCapital, currency, locale, 2)}, estimated growth {formatCurrency(row.growthToDate, currency, locale, 2)}, and today’s buying power {formatCurrency(row.realClosingBalance, currency, locale, 2)}.
              </span>
            </div>
          );
        })}
      </div>
    </figure>
  );
}

function ScheduleTable({
  currency,
  locale,
  rows
}: {
  currency: CurrencyCode;
  locale: string | undefined;
  rows: CompoundInterestScheduleRow[];
}) {
  const [visibleCount, setVisibleCount] = useState(250);
  useEffect(() => setVisibleCount(250), [rows]);
  let cumulativeWithdrawals = 0;
  const enrichedRows = rows.map((row) => {
    cumulativeWithdrawals += row.withdrawals;
    const netCapital = row.cumulativeContributions - cumulativeWithdrawals;
    return { ...row, growthToDate: row.closingBalance - netCapital, netCapital };
  });
  const visibleRows = enrichedRows.slice(0, visibleCount);
  return (
    <>
      <div className="calculator-breakdown-table-wrap" role="region" aria-label="Compound interest schedule" tabIndex={0}>
        <table>
          <caption>Compound interest balance reconciliation</caption>
          <thead><tr>
            <th scope="col">Period</th><th scope="col">Opening</th><th scope="col">Deposits</th><th scope="col">Withdrawals</th><th scope="col">Gross return</th><th scope="col">Fees</th><th scope="col">Net capital</th><th scope="col">Growth to date</th><th scope="col">Ending</th><th scope="col">Real ending</th>
          </tr></thead>
          <tbody>
            {visibleRows.map((row, index) => (
              <tr key={`${row.time}-${index}`}>
                <th scope="row">{row.label}</th>
                <td>{formatCurrency(row.openingBalance, currency, locale, 2)}</td>
                <td>{formatCurrency(row.deposits, currency, locale, 2)}</td>
                <td>{formatCurrency(row.withdrawals, currency, locale, 2)}</td>
                <td>{formatCurrency(row.grossReturn, currency, locale, 2)}</td>
                <td>{formatCurrency(row.fees, currency, locale, 2)}</td>
                <td>{formatCurrency(row.netCapital, currency, locale, 2)}</td>
                <td>{formatCurrency(row.growthToDate, currency, locale, 2)}</td>
                <td>{formatCurrency(row.closingBalance, currency, locale, 2)}</td>
                <td>{formatCurrency(row.realClosingBalance, currency, locale, 2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visibleRows.length < enrichedRows.length ? (
        <div className="compound-schedule-pagination">
          <p role="status">Showing {visibleRows.length.toLocaleString()} of {enrichedRows.length.toLocaleString()} rows. CSV export always includes the complete schedule.</p>
          <button className="secondary-button" type="button" onClick={() => setVisibleCount((current) => Math.min(current + 250, enrichedRows.length))}>
            Show next {Math.min(250, enrichedRows.length - visibleRows.length).toLocaleString()} rows
          </button>
        </div>
      ) : null}
    </>
  );
}

export function applyScenario(inputs: CompoundInterestInputs, scenario: ScenarioId): CompoundInterestInputs {
  if (scenario === 'base') return inputs;
  return {
    ...inputs,
    annualRatePercent: inputs.annualRatePercent + (scenario === 'higher' ? 2 : -2)
  };
}

export function buildSensitivity(inputs: CompoundInterestInputs) {
  const rates = [inputs.annualRatePercent - 2, inputs.annualRatePercent, inputs.annualRatePercent + 2];
  const contributions = [
    inputs.recurringContribution * 0.8,
    inputs.recurringContribution,
    inputs.recurringContribution * 1.2
  ];
  const durationSpan = Math.max(1, inputs.years * 0.25);
  const durationCandidates = [
    { label: 'Shorter', years: Math.max(0.01, inputs.years - durationSpan) },
    { label: 'Base', years: inputs.years },
    { label: 'Longer', years: Math.min(100, inputs.years + durationSpan) }
  ].filter((item, index, items) => (
    items.findIndex((candidate) => Math.abs(candidate.years - item.years) < 1e-9) === index
  ));
  return {
    contributions,
    durations: durationCandidates.map((item) => {
      const durationProjection = calculateCompoundInterest({ ...inputs, years: item.years });
      return {
        ...item,
        value: durationProjection.validation.isValid ? durationProjection.endingValue : Number.NaN
      };
    }),
    rates,
    values: rates.map((rate) => contributions.map((recurringContribution) => {
      const projection = calculateCompoundInterest({ ...inputs, annualRatePercent: rate, recurringContribution });
      return projection.validation.isValid ? projection.endingValue : Number.NaN;
    }))
  };
}

function toCalculatorResult(
  projection: CompoundInterestProjection,
  inputs: CompoundInterestInputs
): CalculatorResult {
  return {
    assumptions: [
      `Formula version ${compoundInterestFormulaVersion}.`,
      inputs.rateBasis === 'nominal'
        ? `Nominal annual rate compounded ${frequencyLabel(inputs.compoundingFrequency)}.`
        : 'APY/effective annual rate already includes compounding.',
      `${frequencyLabel(inputs.contributionFrequency)} contributions at the ${inputs.contributionTiming} of each period.`,
      'Projection under constant assumptions; actual returns and rates can vary.'
    ],
    metrics: [
      { description: 'Projected ending value.', label: 'Projected value', tone: 'accent', value: projection.endingValue, valueType: 'currency' },
      { description: 'Capital present at the start.', label: 'Starting amount', value: inputs.principal, valueType: 'currency' },
      { description: 'Deposits made after the start.', label: 'Future contributions', value: projection.totalDeposits, valueType: 'currency' },
      { description: 'Starting amount plus deposits.', label: 'Total invested', value: projection.investedCapital, valueType: 'currency' },
      { description: 'Ending value minus net contributions.', label: 'Estimated net growth', tone: projection.netGrowth >= 0 ? 'positive' : 'warning', value: projection.netGrowth, valueType: 'currency' },
      { description: 'Estimated net growth divided by ending value.', label: 'Growth share', value: projection.endingValue === 0 ? 0 : projection.netGrowth / projection.endingValue, valueType: 'percent' },
      { description: 'Inflation-adjusted ending value.', label: 'Today’s buying power', value: projection.realEndingValue, valueType: 'currency' },
      { description: 'Fees deducted over the projection.', label: 'Fees charged', value: projection.feesPaid, valueType: 'currency' },
      { description: 'Effective annual return before fees.', label: 'Effective annual rate', value: projection.effectiveAnnualRate, valueType: 'percent' }
    ],
    narrative: `Projection under constant assumptions after ${formatDuration(inputs.years)}. This is an estimate, not a promise.`
  };
}

export function toNumericSaveValues(inputs: CompoundInterestInputs): Record<string, number> {
  return {
    annualContributionIncreasePercent: inputs.annualContributionIncreasePercent,
    annualFeePercent: inputs.annualFeePercent,
    annualTopUp: inputs.annualTopUp,
    compoundingFrequency: inputs.compoundingFrequency,
    contributionFrequency: inputs.contributionFrequency,
    contributionTiming: inputs.contributionTiming === 'beginning' ? 1 : 0,
    futureDepositAmount: inputs.futureDepositAmount,
    futureDepositYear: inputs.futureDepositYear,
    futureWithdrawalAmount: inputs.futureWithdrawalAmount,
    futureWithdrawalYear: inputs.futureWithdrawalYear,
    inflationPercent: inputs.inflationPercent,
    monthly: inputs.recurringContribution,
    principal: inputs.principal,
    rate: inputs.annualRatePercent,
    rateBasis: inputs.rateBasis === 'apy' ? 1 : 0,
    recurringContribution: inputs.recurringContribution,
    target: inputs.targetAmount,
    targetBasis: inputs.targetBasis === 'today' ? 1 : 0,
    years: inputs.years
  };
}

export function inputsFromSaved(values: Record<string, number>): CompoundInterestInputs {
  return {
    ...defaultCompoundInterestInputs,
    annualContributionIncreasePercent: finiteOr(values.annualContributionIncreasePercent, 0),
    annualFeePercent: finiteOr(values.annualFeePercent, 0),
    annualRatePercent: finiteOr(values.rate, defaultCompoundInterestInputs.annualRatePercent),
    annualTopUp: finiteOr(values.annualTopUp, 0),
    compoundingFrequency: supportedCompounding(values.compoundingFrequency),
    contributionFrequency: supportedContribution(values.contributionFrequency),
    contributionTiming: values.contributionTiming === 1 ? 'beginning' : 'end',
    futureDepositAmount: finiteOr(values.futureDepositAmount, 0),
    futureDepositYear: finiteOr(values.futureDepositYear, 5),
    futureWithdrawalAmount: finiteOr(values.futureWithdrawalAmount, 0),
    futureWithdrawalYear: finiteOr(values.futureWithdrawalYear, 5),
    inflationPercent: finiteOr(values.inflationPercent, 0),
    principal: finiteOr(values.principal, defaultCompoundInterestInputs.principal),
    rateBasis: values.rateBasis === 1 ? 'apy' : 'nominal',
    recurringContribution: finiteOr(values.recurringContribution, finiteOr(values.monthly, defaultCompoundInterestInputs.recurringContribution)),
    targetAmount: finiteOr(values.target, 0),
    targetBasis: values.targetBasis === 1 ? 'today' : 'future',
    years: finiteOr(values.years, defaultCompoundInterestInputs.years)
  };
}

export function restoreState(): (CompoundDraft & { scenarioId: ScenarioId; source: 'draft' | 'share' }) | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  if (params.get('fp') === '2') {
    if (params.get('formula') !== compoundInterestFormulaVersion) return null;
    const inputs = deserializeInputs(params);
    const currency = currencyCodes.includes(params.get('currency') as CurrencyCode) ? params.get('currency') as CurrencyCode : 'USD';
    const locale = localeCodes.includes(params.get('locale') as LocaleCode) ? params.get('locale') as LocaleCode : 'auto';
    return {
      currency,
      formulaVersion: compoundInterestFormulaVersion,
      inputs,
      locale,
      scenarioId: supportedScenario(params.get('scenario')),
      source: 'share',
      updatedAt: new Date().toISOString()
    };
  }
  if (params.get('fp') === '1') {
    return {
      currency: 'USD',
      formulaVersion: compoundInterestFormulaVersion,
      inputs: {
        ...defaultCompoundInterestInputs,
        annualRatePercent: finiteParam(params, 'rate', defaultCompoundInterestInputs.annualRatePercent),
        annualTopUp: finiteParam(params, 'annualTopUp', 0),
        principal: finiteParam(params, 'principal', defaultCompoundInterestInputs.principal),
        recurringContribution: finiteParam(params, 'monthly', defaultCompoundInterestInputs.recurringContribution),
        years: finiteParam(params, 'years', defaultCompoundInterestInputs.years)
      },
      locale: 'auto',
      scenarioId: 'base',
      source: 'share',
      updatedAt: new Date().toISOString()
    };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey) ?? 'null') as unknown;
    if (!isCompoundDraft(parsed)) return null;
    return { ...parsed, scenarioId: supportedScenario(parsed.scenarioId), source: 'draft' };
  } catch {
    return null;
  }
}

export function buildShareUrl(
  inputs: CompoundInterestInputs,
  currency: CurrencyCode,
  locale: LocaleCode,
  scenarioId: ScenarioId = 'base',
  origin = window.location.origin
): string {
  const url = new URL('/calculators/compound-interest', origin);
  url.searchParams.set('fp', '2');
  url.searchParams.set('formula', compoundInterestFormulaVersion);
  Object.entries(inputs).forEach(([key, value]) => url.searchParams.set(key, String(value)));
  url.searchParams.set('currency', currency);
  url.searchParams.set('locale', locale);
  url.searchParams.set('scenario', scenarioId);
  return url.toString();
}

export function deserializeInputs(params: URLSearchParams): CompoundInterestInputs {
  const defaults = defaultCompoundInterestInputs;
  return {
    annualContributionIncreasePercent: finiteParam(params, 'annualContributionIncreasePercent', defaults.annualContributionIncreasePercent),
    annualFeePercent: finiteParam(params, 'annualFeePercent', defaults.annualFeePercent),
    annualRatePercent: finiteParam(params, 'annualRatePercent', defaults.annualRatePercent),
    annualTopUp: finiteParam(params, 'annualTopUp', defaults.annualTopUp),
    compoundingFrequency: supportedCompounding(finiteParam(params, 'compoundingFrequency', defaults.compoundingFrequency)),
    contributionFrequency: supportedContribution(finiteParam(params, 'contributionFrequency', defaults.contributionFrequency)),
    contributionTiming: params.get('contributionTiming') === 'beginning' ? 'beginning' : 'end',
    futureDepositAmount: finiteParam(params, 'futureDepositAmount', defaults.futureDepositAmount),
    futureDepositYear: finiteParam(params, 'futureDepositYear', defaults.futureDepositYear),
    futureWithdrawalAmount: finiteParam(params, 'futureWithdrawalAmount', defaults.futureWithdrawalAmount),
    futureWithdrawalYear: finiteParam(params, 'futureWithdrawalYear', defaults.futureWithdrawalYear),
    inflationPercent: finiteParam(params, 'inflationPercent', defaults.inflationPercent),
    principal: finiteParam(params, 'principal', defaults.principal),
    rateBasis: params.get('rateBasis') === 'apy' ? 'apy' : 'nominal',
    recurringContribution: finiteParam(params, 'recurringContribution', defaults.recurringContribution),
    targetAmount: finiteParam(params, 'targetAmount', defaults.targetAmount),
    targetBasis: params.get('targetBasis') === 'today' ? 'today' : 'future',
    years: finiteParam(params, 'years', defaults.years)
  };
}

export function isCompoundDraft(value: unknown): value is CompoundDraft {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  if (record.formulaVersion !== compoundInterestFormulaVersion || !record.inputs || typeof record.inputs !== 'object') return false;
  if (!currencyCodes.includes(record.currency as CurrencyCode) || !localeCodes.includes(record.locale as LocaleCode)) return false;
  const restored = record.inputs as Record<string, unknown>;
  const validNumbers = Object.entries(defaultCompoundInterestInputs)
    .filter(([, defaultValue]) => typeof defaultValue === 'number')
    .every(([key]) => typeof restored[key] === 'number' && Number.isFinite(restored[key]));
  return (
    typeof record.updatedAt === 'string' &&
    validNumbers &&
    (record.scenarioId === undefined || ['base', 'lower', 'higher'].includes(String(record.scenarioId))) &&
    ['beginning', 'end'].includes(String(restored.contributionTiming)) &&
    ['nominal', 'apy'].includes(String(restored.rateBasis)) &&
    ['future', 'today'].includes(String(restored.targetBasis)) &&
    [365, 12, 4, 2, 1].includes(Number(restored.compoundingFrequency)) &&
    [52, 26, 24, 12, 4, 2, 1].includes(Number(restored.contributionFrequency))
  );
}

export function buildProjectionCsv(
  inputs: CompoundInterestInputs,
  projection: CompoundInterestProjection,
  currency: CurrencyCode,
  locale: LocaleCode
): string {
  let cumulativeWithdrawals = 0;
  const scheduleRows = projection.detailedSchedule.map((row) => {
    cumulativeWithdrawals += row.withdrawals;
    const netCapital = row.cumulativeContributions - cumulativeWithdrawals;
    return [
      row.label,
      rawNumber(row.time),
      rawNumber(row.openingBalance),
      rawNumber(row.deposits),
      rawNumber(row.withdrawals),
      rawNumber(row.grossReturn),
      rawNumber(row.fees),
      rawNumber(row.netGrowth),
      rawNumber(row.closingBalance),
      rawNumber(row.cumulativeContributions),
      rawNumber(cumulativeWithdrawals),
      rawNumber(netCapital),
      rawNumber(row.closingBalance - netCapital),
      rawNumber(row.realClosingBalance)
    ];
  });
  const rows: Array<Array<string | number>> = [
    ['Metadata', 'Formula version', compoundInterestFormulaVersion],
    ['Metadata', 'Currency', currency],
    ['Metadata', 'Display locale', locale],
    ...Object.entries(inputs).map(([key, value]) => ['Input', key, value]),
    [],
    ['Period', 'Time (years)', 'Opening balance', 'Deposits', 'Withdrawals', 'Gross return', 'Fees', 'Interval net growth', 'Ending balance', 'Cumulative contributions', 'Cumulative withdrawals', 'Net contributed capital', 'Growth to date', 'Real ending balance'],
    ...scheduleRows
  ];
  return rows.map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\r\n');
}

function sampleRows<Row>(rows: Row[], limit: number): Row[] {
  if (rows.length <= limit) return rows;
  const indexes = new Set<number>([0, rows.length - 1]);
  for (let index = 1; index < limit - 1; index += 1) {
    indexes.add(Math.round(index * (rows.length - 1) / (limit - 1)));
  }
  return [...indexes].sort((a, b) => a - b).map((index) => rows[index]);
}

export function formatCurrency(
  value: number,
  currency: CurrencyCode,
  locale: string | undefined,
  maximumFractionDigits = 0
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
    style: 'currency'
  }).format(value);
}

export function currencyFractionDigits(currency: CurrencyCode): number {
  return new Intl.NumberFormat('en', { currency, style: 'currency' }).resolvedOptions().maximumFractionDigits ?? 2;
}

function formatPercent(value: number, locale: string | undefined): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3, style: 'percent' }).format(value);
}

function formatNumber(value: number, locale: string | undefined, digits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

function formatDuration(years: number): string {
  if (Number.isInteger(years)) return `${years} ${years === 1 ? 'year' : 'years'}`;
  return `${Number(years.toFixed(2))} years`;
}

function scenarioLabel(id: ScenarioId): string {
  if (id === 'lower') return 'Conservative';
  if (id === 'higher') return 'Optimistic';
  return 'Base';
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

function supportedCompounding(value: number): CompoundingFrequency {
  return [365, 12, 4, 2, 1].includes(value) ? value as CompoundingFrequency : 12;
}

function supportedContribution(value: number): ContributionFrequency {
  return [52, 26, 24, 12, 4, 2, 1].includes(value) ? value as ContributionFrequency : 12;
}

function supportedScenario(value: unknown): ScenarioId {
  return value === 'lower' || value === 'higher' ? value : 'base';
}

function validateDraftInputs(inputs: CompoundInterestInputs): boolean {
  return validateCompoundInterestInputs(inputs).isValid;
}

function finiteParam(params: URLSearchParams, key: string, fallback: number): number {
  const parsed = Number(params.get(key));
  return params.has(key) && Number.isFinite(parsed) ? parsed : fallback;
}

function finiteOr(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) ? value as number : fallback;
}

function formatSavedHeadline(
  saved: CalculatorSavedResult,
  fallbackCurrency: CurrencyCode,
  locale: string | undefined
): string {
  const value = saved.result.metrics[0]?.value;
  const currency = currencyCodes.includes(saved.currency as CurrencyCode) ? saved.currency as CurrencyCode : fallbackCurrency;
  return Number.isFinite(value) ? formatCurrency(value, currency, locale) : 'Saved result';
}

async function copyText(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand('copy');
  textarea.remove();
  previousFocus?.focus();
  if (!copied) throw new Error('Clipboard unavailable');
}

function downloadText(filename: string, content: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function rawNumber(value: number): string {
  return Number.isFinite(value) ? value.toPrecision(15).replace(/0+$/, '').replace(/\.$/, '') : '';
}

function csvEscape(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

function visualPercent(value: number, maximum: number): string {
  if (value <= 0 || maximum <= 0) return '0%';
  return `${Math.max(2, value / maximum * 100)}%`;
}

function segmentPercent(value: number, total: number): string {
  if (value <= 0 || total <= 0) return '0%';
  return `${value / total * 100}%`;
}

function projectionInterpretation(
  projection: CompoundInterestProjection,
  inputs: CompoundInterestInputs,
  money: (value: number, maximumFractionDigits?: number) => string,
  locale: string | undefined
): string {
  const share = projection.endingValue === 0 ? 0 : projection.netGrowth / projection.endingValue;
  const growthPhrase = projection.netGrowth >= 0
    ? `${money(projection.netGrowth)} of estimated growth makes up ${formatPercent(share, locale)} of the ending value.`
    : `The constant assumptions produce ${money(Math.abs(projection.netGrowth))} of net loss, or ${formatPercent(Math.abs(share), locale)} of the ending value.`;
  const withdrawalPhrase = projection.withdrawals > 0
    ? ` The ending value also reflects ${money(projection.withdrawals)} of funded withdrawals.`
    : '';
  const realPhrase = inputs.inflationPercent === 0
    ? ''
    : ` In today’s purchasing power, the ending value is ${money(projection.realEndingValue)}.`;
  return `${money(inputs.principal)} starts the projection and ${money(projection.totalDeposits)} is added later. ${growthPhrase}${withdrawalPhrase}${realPhrase}`;
}
