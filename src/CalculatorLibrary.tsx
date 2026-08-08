import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  Banknote,
  Calculator,
  ChartNoAxesCombined,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  Columns3,
  Copy,
  Download,
  FolderKanban,
  Gauge,
  History,
  House,
  Landmark,
  ReceiptText,
  Search,
  ShieldCheck,
  Table2,
  Target,
  WalletCards
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { AuthState } from './auth';
import { CompoundInterestCalculator } from './CompoundInterestCalculator';
import { SavingsGoalCalculator } from './SavingsGoalCalculator';
import {
  buildCalculatorInputImpacts,
  buildCalculatorShareUrl,
  buildCalculatorSummaryCsv,
  readCalculatorShareState,
  type CalculatorInputImpact
} from './lib/calculatorEngagement';
import { getCalculatorQualitySpec, type CalculatorQualitySpec } from './lib/calculatorQuality';
import {
  calculatorToolkits,
  featuredToolkitCalculators,
  getCalculatorToolkit,
  type CalculatorToolkit,
  type CalculatorToolkitIcon
} from './lib/calculatorToolkits';
import {
  buildCalculatorScenarios,
  buildCalculatorDetailSchedule,
  buildCalculatorStudioChart,
  buildScenarioValues,
  getCalculatorStudioMetadata,
  type CalculatorDetailSchedule,
  type CalculatorScenario,
  type CalculatorScenarioId,
  type CalculatorStudioChart,
  type CalculatorStudioExample,
  type CalculatorStudioMetadata
} from './lib/calculatorStudios';
import {
  calculateSeoCalculator,
  calculatorCurrency,
  calculatorPath,
  findSeoCalculator,
  seoCalculators,
  type CalculatorMetric,
  type CalculatorResult,
  type SeoCalculator
} from './lib/seoCalculators';

const optionalCalculatorInputKeys = new Set(['annualTopUp', 'extraAnnualPayment', 'extraMonthlyPayment']);

export type CalculatorSaveRequest = {
  calculator: SeoCalculator;
  currency: string;
  result: ReturnType<typeof calculateSeoCalculator>;
  values: Record<string, number>;
};

export type CalculatorSaveOutcome = {
  destinationRoute: SeoCalculator['conversionRoute'];
  message: string;
  savedResultId: string;
};

export type CalculatorSavedResult = {
  calculatorSlug: string;
  calculatorTitle: string;
  createdAt: string;
  currency: string;
  id: string;
  inputValues: Record<string, number>;
  result: {
    metrics: Array<{
      label: string;
      value: number;
      valueType: CalculatorMetric['valueType'];
    }>;
    narrative: string;
  };
};

type CalculatorLibraryProps = {
  auth: AuthState;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  route: string;
  onNavigate: (route: string) => void;
  savedResults: CalculatorSavedResult[];
};

const calculatorDraftStorageKey = 'finpath.calculatorDraft.v1';

export function CalculatorLibrary({ auth, route, onNavigate, onSaveResult, savedResults }: CalculatorLibraryProps) {
  const calculator = route === '/calculators' ? null : findSeoCalculator(route);

  if (calculator) {
    if (calculator.slug === 'compound-interest') {
      return (
        <CompoundInterestCalculator
          auth={auth}
          calculator={calculator}
          onNavigate={onNavigate}
          onSaveResult={onSaveResult}
          savedResults={savedResults}
        />
      );
    }

    if (calculator.slug === 'savings-goal') {
      return (
        <SavingsGoalCalculator
          auth={auth}
          calculator={calculator}
          onNavigate={onNavigate}
          onSaveResult={onSaveResult}
          savedResults={savedResults}
        />
      );
    }

    return (
      <CalculatorDetail
        auth={auth}
        calculator={calculator}
        onNavigate={onNavigate}
        onSaveResult={onSaveResult}
        savedResults={savedResults}
      />
    );
  }

  return <CalculatorHub onNavigate={onNavigate} />;
}

function CalculatorHub({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [query, setQuery] = useState(() => (
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? ''
  ));
  const normalizedQuery = query.trim().toLowerCase();
  const visibleCalculators = useMemo(
    () =>
      seoCalculators.filter((calculator) =>
        !normalizedQuery ||
        [
          calculator.title,
          calculator.description,
          calculator.category,
          ...calculator.keywords
        ].join(' ').toLowerCase().includes(normalizedQuery)
      ),
    [normalizedQuery]
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [query]);

  return (
    <section className="calculator-library route-shell" aria-labelledby="calculators-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Decision toolkits</p>
        <h1 id="calculators-title">Start with the question, not the formula.</h1>
        <p>Choose a planning toolkit or search for an exact calculator. Every estimate includes explanations, scenarios, visual context, and detailed schedules where they add value.</p>
        <div className="calculator-library-stats" aria-label="Calculator library summary">
          <span><strong>{calculatorToolkits.length}</strong> planning toolkits</span>
          <span><strong>{seoCalculators.length}</strong> focused calculators</span>
          <span><strong>0</strong> account required</span>
        </div>
      </div>

      <div className="calculator-search-panel">
        <Search size={18} />
        <input
          aria-label="Find calculators"
          autoComplete="off"
          name="calculator-search"
          type="search"
          placeholder="Search mortgage, SIP, tax, debt payoff, retirement"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button className="calculator-search-clear" type="button" onClick={() => setQuery('')}>
            Clear
          </button>
        ) : null}
      </div>

      {normalizedQuery ? (
        <section className="calculator-search-results" aria-live="polite" aria-label="Calculator search results">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Search results</p>
              <h2>{visibleCalculators.length} {visibleCalculators.length === 1 ? 'match' : 'matches'}</h2>
            </div>
          </div>
          {visibleCalculators.length === 0 ? (
            <div className="calculator-empty-state">
              <CircleHelp size={22} />
              <strong>No calculator matches that phrase.</strong>
              <span>Try a decision such as buying a home, paying off debt, saving for retirement, or estimating tax.</span>
            </div>
          ) : (
            <div className="calculator-card-grid">
              {visibleCalculators.map((calculator) => (
                <CalculatorSearchCard calculator={calculator} key={calculator.slug} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <div className="calculator-toolkit-grid">
          {calculatorToolkits.map((toolkit) => (
            <CalculatorToolkitPanel key={toolkit.id} onNavigate={onNavigate} toolkit={toolkit} />
          ))}
        </div>
      )}
    </section>
  );
}

function CalculatorToolkitPanel({
  onNavigate,
  toolkit
}: {
  onNavigate: (route: string) => void;
  toolkit: CalculatorToolkit;
}) {
  const Icon = toolkitIcon(toolkit.icon);
  const featured = featuredToolkitCalculators(toolkit);
  const remaining = toolkit.calculators.filter((calculator) => !toolkit.featuredSlugs.includes(calculator.slug));

  return (
    <article className={`calculator-toolkit toolkit-${toolkit.id}`}>
      <header>
        <span className="calculator-toolkit-icon"><Icon size={20} /></span>
        <div>
          <span>{toolkit.prompt}</span>
          <h2>{toolkit.title}</h2>
        </div>
        <strong>{toolkit.calculators.length}</strong>
      </header>
      <p>{toolkit.description}</p>
      <nav className="calculator-toolkit-featured" aria-label={`${toolkit.title} starting points`}>
        {featured.map((calculator, index) => (
          <a
            href={calculatorPath(calculator.slug)}
            key={calculator.slug}
            onClick={(event) => navigateInternalLink(event, calculatorPath(calculator.slug), onNavigate)}
          >
            <span>{index === 0 ? 'Start here' : 'Also useful'}</span>
            <strong>{calculator.title}</strong>
            <ArrowRight size={15} />
          </a>
        ))}
      </nav>
      {remaining.length > 0 ? (
        <details className="calculator-toolkit-more">
          <summary>
            View all {toolkit.calculators.length} calculators
            <ChevronDown size={16} />
          </summary>
          <div>
            {remaining.map((calculator) => (
              <a
                href={calculatorPath(calculator.slug)}
                key={calculator.slug}
                onClick={(event) => navigateInternalLink(event, calculatorPath(calculator.slug), onNavigate)}
              >
                {calculator.title}
              </a>
            ))}
          </div>
        </details>
      ) : null}
    </article>
  );
}

function CalculatorSearchCard({
  calculator,
  onNavigate
}: {
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
}) {
  const toolkit = getCalculatorToolkit(calculator);

  return (
    <a
      className="calculator-card"
      href={calculatorPath(calculator.slug)}
      onClick={(event) => navigateInternalLink(event, calculatorPath(calculator.slug), onNavigate)}
    >
      <span className="calculator-card-meta">{toolkit.title}</span>
      <strong>{calculator.title}</strong>
      <small>{calculator.description}</small>
      <em>
        Open calculator
        <ArrowRight size={14} />
      </em>
    </a>
  );
}

function CalculatorDetail({
  auth,
  calculator,
  onNavigate,
  onSaveResult,
  savedResults
}: {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  savedResults: CalculatorSavedResult[];
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSavedRoute, setLastSavedRoute] = useState<SeoCalculator['conversionRoute'] | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<CalculatorScenarioId>('base');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const scenarioValues = useMemo(
    () => buildScenarioValues(calculator, values, selectedScenarioId),
    [calculator, selectedScenarioId, values]
  );
  const result = useMemo(() => calculateSeoCalculator(calculator, scenarioValues), [calculator, scenarioValues]);
  const scenarios = useMemo(() => buildCalculatorScenarios(calculator, values), [calculator, values]);
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[1];
  const studioMetadata = useMemo(() => getCalculatorStudioMetadata(calculator), [calculator]);
  const studioChart = useMemo(
    () => buildCalculatorStudioChart(calculator, scenarioValues, result),
    [calculator, result, scenarioValues]
  );
  const detailSchedule = useMemo(
    () => buildCalculatorDetailSchedule(calculator, scenarioValues, result),
    [calculator, result, scenarioValues]
  );
  const toolkit = useMemo(() => getCalculatorToolkit(calculator), [calculator]);
  const qualitySpec = useMemo(() => getCalculatorQualitySpec(calculator), [calculator]);
  const inputImpacts = useMemo(
    () => buildCalculatorInputImpacts(calculator, scenarioValues),
    [calculator, scenarioValues]
  );
  const calculatorHistory = useMemo(
    () => savedResults.filter((item) => item.calculatorSlug === calculator.slug).slice(0, 6),
    [calculator.slug, savedResults]
  );
  const selectedHistory = calculatorHistory.find((item) => item.id === selectedHistoryId) ?? calculatorHistory[0] ?? null;
  const ConversionIcon = conversionIcon(calculator.conversionRoute);

  useEffect(() => {
    const shared = typeof window === 'undefined' ? null : readCalculatorShareState(calculator, window.location.search);
    const draft = readCalculatorDraft(calculator.slug);

    setValues(shared?.values ?? draft?.values ?? defaultCalculatorValues(calculator));
    setSelectedScenarioId(shared?.scenarioId ?? draft?.scenarioId ?? 'base');
    setSelectedHistoryId(null);
    setLastSavedRoute(null);
    setSaveMessage(
      shared
        ? 'Shared scenario loaded. Review the assumptions before saving it.'
        : draft && auth.status === 'signed-in'
          ? 'Draft restored. Save it to keep it in your account.'
          : ''
    );
  }, [auth.status, calculator]);

  useEffect(() => {
    if (calculatorHistory.length === 0) {
      setSelectedHistoryId(null);
      return;
    }

    if (!calculatorHistory.some((item) => item.id === selectedHistoryId)) {
      setSelectedHistoryId(calculatorHistory[0].id);
    }
  }, [calculatorHistory, selectedHistoryId]);

  useEffect(() => {
    if (auth.status === 'signed-in') {
      return;
    }

    writeCalculatorDraft({
      result,
      scenarioId: selectedScenarioId,
      slug: calculator.slug,
      updatedAt: new Date().toISOString(),
      values
    });
  }, [auth.status, calculator.slug, result, selectedScenarioId, values]);

  const setValue = (key: string, value: string) => {
    const parsed = Number(value);
    setLastSavedRoute(null);
    setSaveMessage('');
    setValues((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0
    }));
  };

  const standardInputs = calculator.inputs.filter((input) => !optionalCalculatorInputKeys.has(input.key));
  const optionalInputs = calculator.inputs.filter((input) => optionalCalculatorInputKeys.has(input.key));
  const renderInput = (input: SeoCalculator['inputs'][number]) => (
    <label className="field" key={input.key}>
      <span className="calculator-field-label">
        <span>{input.label}</span>
        <span
          className="calculator-help-dot"
          title={input.helper}
          aria-label={`${input.label}: ${input.helper}`}
          tabIndex={0}
        >
          <CircleHelp size={14} />
        </span>
      </span>
      <div className="calculator-input-control">
        {input.type === 'currency' ? <small>{calculatorCurrency(calculator)}</small> : null}
        <input
          type="number"
          min={input.min}
          max={input.max}
          step={input.type === 'percent' ? '0.01' : '1'}
          value={values[input.key] ?? 0}
          onChange={(event) => setValue(input.key, event.target.value)}
        />
        {input.type === 'percent' ? <small>%</small> : null}
        {input.suffix ? <small>{input.suffix}</small> : null}
      </div>
      {input.helper ? <small>{input.helper}</small> : null}
    </label>
  );

  const persistSignedOutDraft = () => {
    writeCalculatorDraft({
      result,
      scenarioId: selectedScenarioId,
      slug: calculator.slug,
      updatedAt: new Date().toISOString(),
      values
    });
  };

  const saveResult = async () => {
    if (auth.status !== 'signed-in') {
      persistSignedOutDraft();
      setSaveMessage('Draft saved in this browser. Create an account to keep it in FinPath.');
      return;
    }

    setIsSaving(true);
    setSaveMessage('Saving calculator result...');

    try {
      const outcome = await onSaveResult({
        calculator,
        currency: calculatorCurrency(calculator),
        result,
        values: scenarioValues
      });

      clearCalculatorDraft(calculator.slug);
      setLastSavedRoute(outcome.destinationRoute);
      setSaveMessage(outcome.message);
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Calculator result could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSavedResult = (saved: CalculatorSavedResult) => {
    setValues(normalizeSavedValues(calculator, saved.inputValues));
    setSelectedScenarioId('base');
    setSelectedHistoryId(saved.id);
    setLastSavedRoute(null);
    setSaveMessage(`Loaded the saved ${new Date(saved.createdAt).toLocaleDateString()} inputs. Current edits were replaced.`);
  };

  const copyShareLink = async () => {
    const origin = typeof window === 'undefined' ? 'https://interactive-fire-calculator.pages.dev' : window.location.origin;
    const url = buildCalculatorShareUrl(calculator, values, selectedScenarioId, origin);

    try {
      await copyText(url);
      setSaveMessage('Share link copied. It contains these inputs and the selected scenario, but no account data.');
    } catch {
      setSaveMessage('The share link could not be copied in this browser.');
    }
  };

  const exportScenarioSummary = () => {
    const csv = buildCalculatorSummaryCsv(calculator, scenarios, selectedScenarioId, inputImpacts);
    downloadText(`${calculator.slug}-scenario-summary.csv`, csv, 'text/csv;charset=utf-8;');
    setSaveMessage('Scenario summary exported as CSV.');
  };

  return (
    <section className="calculator-library calculator-detail route-shell" aria-labelledby="calculator-detail-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">{toolkit.title}</p>
        <h1 id="calculator-detail-title">{calculator.h1}</h1>
        <p>{calculator.description}</p>
        <a
          className="calculator-toolkit-backlink"
          href="/calculators"
          onClick={(event) => navigateInternalLink(event, '/calculators', onNavigate)}
        >
          <ArrowRight size={15} />
          Explore the {toolkit.title} toolkit
        </a>
      </div>

      <section className="calculator-context-panel" aria-label={`${calculator.title} overview`}>
        <article>
          <p className="eyebrow">What it answers</p>
          <p>{calculator.explanation}</p>
        </article>
        <article>
          <p className="eyebrow">Why it matters</p>
          <p>{qualitySpec.decisionUsefulness}</p>
        </article>
        <article>
          <p className="eyebrow">How it fits</p>
          <p>{toolkit.description}</p>
        </article>
        <article>
          <p className="eyebrow">How to read it</p>
          <p>{result.narrative} The supporting tiles explain the {selectedScenario.label.toLowerCase()} estimate and show the inputs that matter most.</p>
        </article>
      </section>

      <div className="calculator-detail-grid">
        <section className="calculator-input-panel" aria-label={`${calculator.title} inputs`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Inputs</p>
              <h2>Run the estimate</h2>
            </div>
          </div>
          <div className="calculator-input-grid">
            {standardInputs.map(renderInput)}
          </div>
          {optionalInputs.length > 0 ? (
            <details className="calculator-options-shell">
              <summary>
                <span>
                  <strong>{optionalInputs.some((input) => input.key.startsWith('extra')) ? 'Additional payments' : 'Additional contributions'}</strong>
                  <small>Optional. Defaults to zero.</small>
                </span>
                <ChevronDown size={17} />
              </summary>
              <div className="calculator-input-grid calculator-options-grid">
                {optionalInputs.map(renderInput)}
              </div>
            </details>
          ) : null}
          <CalculatorScenarioPanel
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={setSelectedScenarioId}
            calculator={calculator}
            focus={studioMetadata.scenarioFocus}
          />
        </section>

        <section className="calculator-result-panel" aria-label={`${calculator.title} result`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Result</p>
              <h2>{result.metrics[0]?.label ?? 'Estimate'}</h2>
            </div>
          </div>
          <div className="calculator-result-metrics">
            {result.metrics.map((metric) => (
              <article className={`calculator-result-metric metric-${metric.tone ?? 'neutral'}`} key={metric.label}>
                <span className="calculator-metric-label">
                  <span>{metric.label}</span>
                  <span
                    className="calculator-help-dot"
                    title={metricDescription(metric)}
                    aria-label={`${metric.label}: ${metricDescription(metric)}`}
                    tabIndex={0}
                  >
                    <CircleHelp size={14} />
                  </span>
                </span>
                <strong>{formatMetric(metric, calculator)}</strong>
              </article>
            ))}
          </div>
          <CalculatorStudioVisual calculator={calculator} chart={studioChart} metrics={result.metrics} />
          <CalculatorSchedulePanel calculator={calculator} schedule={detailSchedule} />
          <p className="calculator-result-narrative">{result.narrative}</p>
          <div className="calculator-conversion-panel">
            <span className="feature-icon"><ConversionIcon size={18} /></span>
            <div>
              <strong>{calculator.conversionLabel}</strong>
              <small>Use this estimate as the first step, then track progress inside FinPath.</small>
            </div>
            {auth.status === 'signed-in' ? (
              <button className="primary-button icon-text-button" disabled={isSaving} type="button" onClick={saveResult}>
                {isSaving ? 'Saving' : 'Save result'}
                <ArrowRight size={16} />
              </button>
            ) : auth.status === 'not-configured' ? (
              <button className="primary-button icon-text-button" type="button" onClick={() => {
                persistSignedOutDraft();
                onNavigate(calculator.conversionRoute);
              }}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <SignUpButton mode="modal">
                <button className="primary-button icon-text-button" type="button" onClick={persistSignedOutDraft}>
                  Create account to save
                  <ArrowRight size={16} />
                </button>
              </SignUpButton>
            )}
          </div>
          {saveMessage ? (
            <p className="calculator-save-message" role="status" aria-live="polite">
              <span>{saveMessage}</span>
              {lastSavedRoute ? (
                <button className="inline-link-button" type="button" onClick={() => onNavigate(lastSavedRoute)}>
                  Open saved area
                </button>
              ) : null}
            </p>
          ) : null}
        </section>
      </div>

      <CalculatorEngagementPanel
        auth={auth}
        calculator={calculator}
        currentResult={result}
        history={calculatorHistory}
        impacts={inputImpacts}
        onCopyShareLink={copyShareLink}
        onExportSummary={exportScenarioSummary}
        onLoadHistory={loadSavedResult}
        onSelectHistory={setSelectedHistoryId}
        scenarios={scenarios}
        selectedHistory={selectedHistory}
        selectedScenarioId={selectedScenarioId}
      />

      <section className="calculator-explanation-panel">
        <div>
          <p className="eyebrow">How it works</p>
          <h2>{calculator.title} formula notes</h2>
          <p>{calculator.explanation}</p>
        </div>
        <div className="calculator-assumption-list">
          {[...new Set([
            ...calculator.assumptions,
            ...result.assumptions,
            'This calculator is an estimate for planning and education.'
          ])].map((assumption) => (
            <span key={assumption}>{assumption}</span>
          ))}
        </div>
      </section>

      <CalculatorExamplePanel
        calculator={calculator}
        example={studioMetadata.example}
        onLoadExample={(exampleValues) => {
          setValues(exampleValues);
          setSelectedScenarioId('base');
          setLastSavedRoute(null);
          setSaveMessage('Example loaded. Adjust the inputs or save the result when it fits your plan.');
        }}
      />

      <CalculatorDecisionPanel calculator={calculator} qualitySpec={qualitySpec} />

      <CalculatorRelatedPanel metadata={studioMetadata} onNavigate={onNavigate} toolkit={toolkit} />

      <section className="calculator-faq-panel" id="faq" aria-label={`${calculator.title} FAQ`}>
        <p className="eyebrow">FAQ</p>
        <div className="calculator-faq-grid">
          {calculator.faq.map((item) => (
            <article key={item.question}>
              <strong>{item.question}</strong>
              <p>{item.answer}</p>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function CalculatorSchedulePanel({
  calculator,
  schedule
}: {
  calculator: SeoCalculator;
  schedule: CalculatorDetailSchedule | null;
}) {
  const [periodView, setPeriodView] = useState<'all' | 'final-year' | 'first-five-years' | 'first-year'>('all');

  if (!schedule || schedule.rows.length === 0) {
    return null;
  }

  const hasNotes = schedule.rows.some((row) => row.note);
  const supportsPeriodView = schedule.rows.length > 24 && schedule.columns.some((column) => ['month', 'period'].includes(column.key));
  const visibleRows = supportsPeriodView ? filterScheduleRows(schedule, periodView) : schedule.rows;

  return (
    <details className="calculator-breakdown-shell">
      <summary className="calculator-breakdown-summary">
        <span className="feature-icon"><Table2 size={17} /></span>
        <span>
          <strong>{schedule.title}</strong>
          <small>{schedule.description}</small>
        </span>
        <ChevronDown size={17} />
      </summary>
      <div className="calculator-breakdown-body">
        <div className="calculator-breakdown-toolbar">
          <p>{schedule.summary}</p>
          <div className="calculator-breakdown-actions">
            {supportsPeriodView ? (
              <label className="calculator-period-select">
                <span>Rows</span>
                <select value={periodView} onChange={(event) => setPeriodView(event.target.value as typeof periodView)}>
                  <option value="first-year">First year</option>
                  <option value="first-five-years">First 5 years</option>
                  <option value="final-year">Final year</option>
                  <option value="all">Full schedule</option>
                </select>
              </label>
            ) : null}
            <button
              className="secondary-button icon-text-button calculator-breakdown-download"
              type="button"
              onClick={() => downloadScheduleCsv(calculator, schedule)}
            >
              <Download size={16} />
              CSV
            </button>
          </div>
        </div>
        <div className="calculator-breakdown-table-wrap">
          <table aria-label={`${calculator.title} ${schedule.title}`}>
            <thead>
              <tr>
                {schedule.columns.map((column) => (
                  <th key={column.key} title={column.description}>{column.label}</th>
                ))}
                {hasNotes ? <th className="calculator-note-column">Note</th> : null}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  {schedule.columns.map((column) => (
                    <td key={column.key}>
                      {formatScheduleCell(row.values[column.key], column.valueType, calculator)}
                    </td>
                  ))}
                  {hasNotes ? <td className="calculator-note-column">{row.note ?? ''}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </details>
  );
}

function filterScheduleRows(
  schedule: CalculatorDetailSchedule,
  periodView: 'all' | 'final-year' | 'first-five-years' | 'first-year'
): CalculatorDetailSchedule['rows'] {
  if (periodView === 'all') return schedule.rows;

  const lastYear = Math.max(...schedule.rows.map(scheduleRowYear));

  return schedule.rows.filter((row) => {
    const year = scheduleRowYear(row);

    if (periodView === 'first-year') return year <= 1;
    if (periodView === 'first-five-years') return year <= 5;
    return year === lastYear;
  });
}

function scheduleRowYear(row: CalculatorDetailSchedule['rows'][number]): number {
  const explicitYear = Number(row.values.year);
  if (Number.isFinite(explicitYear) && explicitYear > 0) return explicitYear;

  const period = Number(row.values.month ?? row.values.period);
  return Number.isFinite(period) && period > 0 ? Math.ceil(period / 12) : 1;
}

function downloadScheduleCsv(calculator: SeoCalculator, schedule: CalculatorDetailSchedule) {
  const csv = scheduleToCsv(calculator, schedule);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${calculator.slug}-${schedule.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function scheduleToCsv(calculator: SeoCalculator, schedule: CalculatorDetailSchedule): string {
  const headers = schedule.columns.map((column) => column.label);
  const hasNotes = schedule.rows.some((row) => row.note);
  if (hasNotes) headers.push('Note');

  const rows = schedule.rows.map((row) => {
    const cells = schedule.columns.map((column) => formatScheduleCell(row.values[column.key], column.valueType, calculator));
    if (hasNotes) cells.push(row.note ?? '');
    return cells.map(csvEscape).join(',');
  });

  return [headers.map(csvEscape).join(','), ...rows].join('\n');
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }

  return value;
}

function CalculatorScenarioPanel({
  calculator,
  focus,
  onSelectScenario,
  scenarios,
  selectedScenarioId
}: {
  calculator: SeoCalculator;
  focus: string;
  onSelectScenario: (scenarioId: CalculatorScenarioId) => void;
  scenarios: CalculatorScenario[];
  selectedScenarioId: CalculatorScenarioId;
}) {
  return (
    <section className="calculator-scenario-panel" aria-label={`${calculator.title} scenarios`}>
      <div>
        <p className="eyebrow">Scenario lens</p>
        <small>{focus}</small>
      </div>
      <div className="calculator-scenario-tabs" role="tablist" aria-label="Scenario results">
        {scenarios.map((scenario) => (
          <button
            aria-selected={scenario.id === selectedScenarioId}
            className={scenario.id === selectedScenarioId ? 'is-active' : ''}
            key={scenario.id}
            role="tab"
            type="button"
            onClick={() => onSelectScenario(scenario.id)}
          >
            <span>{scenario.label}</span>
            <small>{formatMetric(scenario.result.metrics[0], calculator)}</small>
          </button>
        ))}
      </div>
      <p>{scenarios.find((scenario) => scenario.id === selectedScenarioId)?.description}</p>
    </section>
  );
}

function CalculatorEngagementPanel({
  auth,
  calculator,
  currentResult,
  history,
  impacts,
  onCopyShareLink,
  onExportSummary,
  onLoadHistory,
  onSelectHistory,
  scenarios,
  selectedHistory,
  selectedScenarioId
}: {
  auth: AuthState;
  calculator: SeoCalculator;
  currentResult: CalculatorResult;
  history: CalculatorSavedResult[];
  impacts: CalculatorInputImpact[];
  onCopyShareLink: () => void;
  onExportSummary: () => void;
  onLoadHistory: (saved: CalculatorSavedResult) => void;
  onSelectHistory: (id: string) => void;
  scenarios: CalculatorScenario[];
  selectedHistory: CalculatorSavedResult | null;
  selectedScenarioId: CalculatorScenarioId;
}) {
  const baseScenario = scenarios.find((scenario) => scenario.id === 'base') ?? scenarios[0];
  const currentMetric = currentResult.metrics[0];
  const savedMetric = selectedHistory?.result.metrics[0];

  return (
    <details className="calculator-engagement-shell">
      <summary className="calculator-engagement-summary">
        <span className="feature-icon"><Columns3 size={17} /></span>
        <span>
          <strong>Compare, revisit, and share</strong>
          <small>Open the decision drawer for scenario deltas, outcome drivers, saved runs, and portable summaries.</small>
        </span>
        <ChevronDown size={17} />
      </summary>

      <div className="calculator-engagement-body">
        <div className="calculator-engagement-toolbar">
          <div>
            <p className="eyebrow">Decision comparison</p>
            <h2>See what changes the answer</h2>
          </div>
          <div className="calculator-engagement-actions">
            <button className="secondary-button icon-text-button" type="button" onClick={onCopyShareLink}>
              <Copy size={15} />
              Copy link
            </button>
            <button className="secondary-button icon-text-button" type="button" onClick={onExportSummary}>
              <Download size={15} />
              Summary CSV
            </button>
          </div>
        </div>

        <section className="calculator-comparison-section" aria-labelledby="calculator-scenario-comparison-title">
          <div className="calculator-engagement-heading">
            <span className="feature-icon"><Columns3 size={16} /></span>
            <div>
              <strong id="calculator-scenario-comparison-title">Scenario comparison</strong>
              <small>Each column changes a bounded set of inputs while preserving the values entered above.</small>
            </div>
          </div>
          <div className="calculator-comparison-grid">
            {scenarios.map((scenario) => (
              <article className={scenario.id === selectedScenarioId ? 'is-selected' : ''} key={scenario.id}>
                <span>{scenario.label}</span>
                <strong>{formatMetric(scenario.result.metrics[0], calculator)}</strong>
                <small>{scenarioDeltaLabel(scenario, baseScenario, calculator)}</small>
                <p>{changedInputsLabel(scenario, baseScenario, calculator)}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="calculator-driver-section" aria-labelledby="calculator-driver-title">
          <div className="calculator-engagement-heading">
            <span className="feature-icon"><Gauge size={16} /></span>
            <div>
              <strong id="calculator-driver-title">What changed the outcome most</strong>
              <small>One input moves at a time inside a 10% test range; this is sensitivity evidence, not a forecast.</small>
            </div>
          </div>
          <div className="calculator-driver-list">
            {impacts.slice(0, 4).map((impact, index) => (
              <article key={impact.inputKey}>
                <span>{index + 1}</span>
                <div>
                  <strong>{impact.inputLabel}</strong>
                  <small>{impact.summary}</small>
                </div>
                <em>{formatImpact(impact, currentMetric, calculator)}</em>
              </article>
            ))}
          </div>
        </section>

        <section className="calculator-history-section" aria-labelledby="calculator-history-title">
          <div className="calculator-engagement-heading">
            <span className="feature-icon"><History size={16} /></span>
            <div>
              <strong id="calculator-history-title">Recent saved runs</strong>
              <small>Select a saved result to compare it with the current output; loading its inputs is a separate action.</small>
            </div>
          </div>

          {auth.status !== 'signed-in' ? (
            <p className="calculator-history-empty">Create an account when you want to keep multiple runs and revisit them here.</p>
          ) : history.length === 0 ? (
            <p className="calculator-history-empty">No saved runs for this calculator yet. Save the current result to start its history.</p>
          ) : (
            <>
              <div className="calculator-history-list" aria-label={`${calculator.title} saved result history`}>
                {history.map((saved) => (
                  <button
                    aria-pressed={selectedHistory?.id === saved.id}
                    className={selectedHistory?.id === saved.id ? 'is-selected' : ''}
                    key={saved.id}
                    type="button"
                    onClick={() => onSelectHistory(saved.id)}
                  >
                    <span>{new Date(saved.createdAt).toLocaleDateString()}</span>
                    <strong>{formatSavedMetric(saved, calculator)}</strong>
                    <small>{new Date(saved.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
                  </button>
                ))}
              </div>

              {selectedHistory && savedMetric ? (
                <div className="calculator-history-compare">
                  <div>
                    <span>Current</span>
                    <strong>{currentMetric ? formatMetric(currentMetric, calculator) : 'No result'}</strong>
                  </div>
                  <div>
                    <span>Saved {new Date(selectedHistory.createdAt).toLocaleDateString()}</span>
                    <strong>{formatSavedMetric(selectedHistory, calculator)}</strong>
                  </div>
                  <p>{savedDeltaLabel(currentMetric, savedMetric, calculator)}</p>
                  <button className="secondary-button" type="button" onClick={() => onLoadHistory(selectedHistory)}>
                    Load saved inputs
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </details>
  );
}

function CalculatorStudioVisual({
  calculator,
  chart,
  metrics
}: {
  calculator: SeoCalculator;
  chart: CalculatorStudioChart;
  metrics: CalculatorMetric[];
}) {
  const visibleMetrics = metrics.slice(0, 4);
  const maxVisualValue = Math.max(1, ...visibleMetrics.map((metric) => visualMetricValue(metric)));
  const maxChartValue = Math.max(
    1,
    ...chart.entries.flatMap((entry) => [Math.abs(entry.primary), Math.abs(entry.secondary ?? 0)])
  );

  return (
    <div className={`calculator-visual-panel visual-${chart.type}`} aria-label={`${calculator.title} visual summary`}>
      <div>
        <p className="eyebrow">Visual read</p>
        <strong>{chart.title}</strong>
        <small>{chart.description}</small>
      </div>
      <div className="calculator-studio-chart" aria-label={chart.summary}>
        {chart.entries.map((entry, entryIndex) => {
          const primaryWidth = Math.max(8, Math.min(100, Math.abs(entry.primary) / maxChartValue * 100));
          const secondaryWidth = entry.secondary === undefined
            ? 0
            : Math.max(8, Math.min(100, Math.abs(entry.secondary) / maxChartValue * 100));

          return (
            <div className="calculator-studio-chart-row" key={`${entry.label}-${entryIndex}`}>
              <div>
                <span>{entry.label}</span>
                <strong>{formatChartValue(entry.primary, calculator)}</strong>
              </div>
              <span className="calculator-visual-track" aria-hidden="true">
                <span
                  className={`calculator-visual-fill metric-${entry.tone ?? 'neutral'}`}
                  style={{ width: `${primaryWidth}%` }}
                />
              </span>
              {entry.secondary !== undefined ? (
                <span className="calculator-visual-track secondary-track" aria-hidden="true">
                  <span className="calculator-visual-fill metric-neutral" style={{ width: `${secondaryWidth}%` }} />
                </span>
              ) : null}
              {entry.note ? <small>{entry.note}</small> : null}
            </div>
          );
        })}
      </div>
      <div className="calculator-chart-legend">
        <span>{chart.legend.primary}</span>
        {chart.legend.secondary ? <span>{chart.legend.secondary}</span> : null}
      </div>
      <div className="calculator-visual-bars">
        {visibleMetrics.map((metric) => {
          const width = Math.max(8, Math.min(100, (visualMetricValue(metric) / maxVisualValue) * 100));

          return (
            <div className="calculator-visual-row" key={metric.label}>
              <div>
                <span>{metric.label}</span>
                <strong>{formatMetric(metric, calculator)}</strong>
              </div>
              <span className="calculator-visual-track" aria-hidden="true">
                <span
                  className={`calculator-visual-fill metric-${metric.tone ?? 'neutral'}`}
                  style={{ width: `${width}%` }}
                />
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalculatorExamplePanel({
  calculator,
  example,
  onLoadExample
}: {
  calculator: SeoCalculator;
  example: CalculatorStudioExample;
  onLoadExample: (values: Record<string, number>) => void;
}) {
  return (
    <section className="calculator-example-panel" aria-label={`${calculator.title} example`}>
      <div>
        <p className="eyebrow">Example scenario</p>
        <h2>{example.title}</h2>
        <p>{example.description}</p>
      </div>
      <div className="calculator-example-actions">
        <small>{example.insight}</small>
        <button className="secondary-button icon-text-button" type="button" onClick={() => onLoadExample(example.values)}>
          <Calculator size={16} />
          Load example
        </button>
      </div>
    </section>
  );
}

function CalculatorDecisionPanel({
  calculator,
  qualitySpec
}: {
  calculator: SeoCalculator;
  qualitySpec: CalculatorQualitySpec;
}) {
  return (
    <section className="calculator-decision-panel" aria-label={`${calculator.title} decision checks`}>
      <div>
        <p className="eyebrow">Decision checks</p>
        <h2>Use the number with context</h2>
        <p>{qualitySpec.conversionExpectation} Before acting on the result, compare the assumptions that can move the answer.</p>
      </div>
      <div className="calculator-decision-list">
        {qualitySpec.interpretationChecks.slice(0, 3).map((check) => (
          <span key={check}>{check}</span>
        ))}
      </div>
    </section>
  );
}

function CalculatorRelatedPanel({
  metadata,
  onNavigate,
  toolkit
}: {
  metadata: CalculatorStudioMetadata;
  onNavigate: (route: string) => void;
  toolkit: CalculatorToolkit;
}) {
  return (
    <section className="calculator-related-panel" aria-label={`${toolkit.title} related calculators`}>
      <div>
        <p className="eyebrow">{toolkit.title}</p>
        <h2>Continue the same decision</h2>
        <p>These tools answer nearby questions, so you can reuse what you learned without treating every calculation as a separate project.</p>
      </div>
      <div className="calculator-related-list">
        {metadata.relatedCalculators.map((related) => (
          <a
            href={related.path}
            key={related.slug}
            onClick={(event) => navigateInternalLink(event, related.path, onNavigate)}
          >
            <span>{related.title}</span>
            <small>{related.reason}</small>
            <ArrowRight size={15} />
          </a>
        ))}
      </div>
    </section>
  );
}

function toolkitIcon(icon: CalculatorToolkitIcon) {
  if (icon === 'banknote') return Banknote;
  if (icon === 'chart') return ChartNoAxesCombined;
  if (icon === 'home') return House;
  if (icon === 'landmark') return Landmark;
  if (icon === 'receipt') return ReceiptText;
  if (icon === 'shield') return ShieldCheck;
  if (icon === 'target') return Target;
  return WalletCards;
}

function navigateInternalLink(
  event: MouseEvent<HTMLAnchorElement>,
  route: string,
  onNavigate: (route: string) => void
) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  onNavigate(route);
}

function scenarioDeltaLabel(
  scenario: CalculatorScenario,
  baseScenario: CalculatorScenario,
  calculator: SeoCalculator
): string {
  if (scenario.id === 'base') return 'Reference result';

  const metric = scenario.result.metrics[0];
  const baseMetric = baseScenario.result.metrics[0];
  if (!metric || !baseMetric) return 'No headline comparison';

  const difference = metric.value - baseMetric.value;
  if (Math.abs(difference) <= 1e-9) return 'Same headline result as base';

  return `${difference > 0 ? '+' : '-'}${formatMetric({ ...metric, value: Math.abs(difference) }, calculator)} vs base`;
}

function changedInputsLabel(
  scenario: CalculatorScenario,
  baseScenario: CalculatorScenario,
  calculator: SeoCalculator
): string {
  const changed = calculator.inputs
    .filter((input) => Math.abs((scenario.values[input.key] ?? 0) - (baseScenario.values[input.key] ?? 0)) > 1e-9)
    .map((input) => input.label)
    .slice(0, 3);

  return changed.length > 0 ? `Changes ${changed.join(', ')}.` : 'Uses the values entered above.';
}

function formatImpact(
  impact: CalculatorInputImpact,
  metric: CalculatorMetric | undefined,
  calculator: SeoCalculator
): string {
  if (!metric) return impact.magnitude.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return `up to ${formatMetric({ ...metric, value: impact.magnitude }, calculator)}`;
}

function formatSavedMetric(saved: CalculatorSavedResult, calculator: SeoCalculator): string {
  const metric = saved.result.metrics[0];
  return metric ? formatMetric(metric, calculator) : 'Saved result';
}

function savedDeltaLabel(
  current: CalculatorMetric | undefined,
  saved: CalculatorSavedResult['result']['metrics'][number],
  calculator: SeoCalculator
): string {
  if (!current || current.valueType !== saved.valueType) return 'The current and saved headline results use different units.';

  const difference = current.value - saved.value;
  if (Math.abs(difference) <= 1e-9) return 'The current headline result matches this saved run.';

  return `Current is ${difference > 0 ? 'higher' : 'lower'} by ${formatMetric({ ...current, value: Math.abs(difference) }, calculator)}.`;
}

function normalizeSavedValues(
  calculator: SeoCalculator,
  values: Record<string, number>
): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => {
    const value = Number.isFinite(values[input.key]) ? values[input.key] : input.defaultValue;
    return [input.key, Math.min(input.max ?? Number.POSITIVE_INFINITY, Math.max(input.min ?? 0, value))];
  }));
}

async function copyText(value: string): Promise<void> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  if (typeof document === 'undefined') throw new Error('Clipboard is unavailable.');

  const input = document.createElement('textarea');
  input.value = value;
  input.setAttribute('readonly', '');
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  const copied = document.execCommand('copy');
  input.remove();

  if (!copied) throw new Error('Clipboard is unavailable.');
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function conversionIcon(route: SeoCalculator['conversionRoute']) {
  if (route === '/accounts') return CircleDollarSign;
  if (route === '/transactions') return ClipboardList;
  if (route === '/plans') return FolderKanban;
  if (route === '/goals') return Target;
  return Calculator;
}

function metricDescription(metric: CalculatorMetric): string {
  if (metric.description) return metric.description;
  if (metric.valueType === 'percent') return 'A percentage output based on the inputs you entered.';
  if (metric.valueType === 'years') return 'A time estimate in years. Fractions represent partial years.';
  if (/month/i.test(metric.label)) return 'A monthly count or monthly amount derived from the estimate.';
  return 'A supporting value used to explain the main estimate.';
}

function visualMetricValue(metric: CalculatorMetric): number {
  if (metric.valueType === 'percent') return Math.abs(metric.value * 100);
  return Math.abs(metric.value);
}

function formatChartValue(value: number, calculator: SeoCalculator): string {
  if (Math.abs(value) >= 1000) {
    return new Intl.NumberFormat(undefined, {
      currency: calculatorCurrency(calculator),
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(value);
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatMetric(metric: CalculatorMetric, calculator: SeoCalculator): string {
  if (metric.valueType === 'currency') {
    return new Intl.NumberFormat(undefined, {
      currency: calculatorCurrency(calculator),
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(metric.value);
  }

  if (metric.valueType === 'percent') {
    return `${(metric.value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }

  if (metric.valueType === 'years') {
    return `${metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 })} years`;
  }

  return metric.value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatScheduleCell(
  value: number | string | undefined,
  valueType: CalculatorDetailSchedule['columns'][number]['valueType'],
  calculator: SeoCalculator
): string {
  if (value === undefined || value === '') {
    return '';
  }

  if (valueType === 'text') {
    return String(value);
  }

  const numericValue = typeof value === 'number' ? value : Number(value);

  if (!Number.isFinite(numericValue)) {
    return String(value);
  }

  if (valueType === 'currency') {
    return new Intl.NumberFormat(undefined, {
      currency: calculatorCurrency(calculator),
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(numericValue);
  }

  if (valueType === 'percent') {
    return `${(numericValue * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }

  if (valueType === 'years') {
    return `${numericValue.toLocaleString(undefined, { maximumFractionDigits: 1 })} years`;
  }

  return numericValue.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

type StoredCalculatorDraft = {
  result: ReturnType<typeof calculateSeoCalculator>;
  scenarioId?: CalculatorScenarioId;
  slug: string;
  updatedAt: string;
  values: Record<string, number>;
};

function defaultCalculatorValues(calculator: SeoCalculator): Record<string, number> {
  return Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]));
}

function readCalculatorDraft(slug: string): StoredCalculatorDraft | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(calculatorDraftStorageKey) ?? 'null');

    if (!isDraftRecord(parsed) || parsed.slug !== slug) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeCalculatorDraft(draft: StoredCalculatorDraft): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(calculatorDraftStorageKey, JSON.stringify(draft));
  } catch {
    // localStorage can be unavailable in private browsing; calculator use still works.
  }
}

function clearCalculatorDraft(slug: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  const draft = readCalculatorDraft(slug);

  if (draft) {
    window.localStorage.removeItem(calculatorDraftStorageKey);
  }
}

function isDraftRecord(value: unknown): value is StoredCalculatorDraft {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.slug === 'string' &&
    typeof record.updatedAt === 'string' &&
    typeof record.values === 'object' &&
    record.values !== null &&
    !Array.isArray(record.values) &&
    typeof record.result === 'object' &&
    record.result !== null &&
    (record.scenarioId === undefined ||
      record.scenarioId === 'base' ||
      record.scenarioId === 'conservative' ||
      record.scenarioId === 'optimistic')
  );
}
