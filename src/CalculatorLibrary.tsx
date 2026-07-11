import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  Calculator,
  ChevronDown,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Search,
  Table2,
  Target
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { AuthState } from './auth';
import { getCalculatorQualitySpec, type CalculatorQualitySpec } from './lib/calculatorQuality';
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
  type CalculatorCategory,
  type CalculatorMetric,
  type SeoCalculator
} from './lib/seoCalculators';

export type CalculatorSaveRequest = {
  calculator: SeoCalculator;
  currency: 'INR' | 'USD';
  result: ReturnType<typeof calculateSeoCalculator>;
  values: Record<string, number>;
};

export type CalculatorSaveOutcome = {
  destinationRoute: SeoCalculator['conversionRoute'];
  message: string;
  savedResultId: string;
};

type CalculatorLibraryProps = {
  auth: AuthState;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  route: string;
  onNavigate: (route: string) => void;
};

const calculatorDraftStorageKey = 'finpath.calculatorDraft.v1';

const categoryOrder: CalculatorCategory[] = ['Planning', 'Investing', 'Borrowing', 'Tax'];
const categoryCopy: Record<CalculatorCategory, { description: string; title: string }> = {
  Borrowing: {
    description: 'Estimate payments, payoff timelines, refinancing, housing choices, and other liability decisions.',
    title: 'Borrowing and payoff'
  },
  Investing: {
    description: 'Project compounding, recurring investments, returns, and long-term growth estimates.',
    title: 'Investing and growth'
  },
  Planning: {
    description: 'Turn goals, retirement questions, net worth, and protection needs into a first estimate.',
    title: 'Planning decisions'
  },
  Savings: {
    description: 'Plan deposits, reserves, maturity values, and recurring savings targets.',
    title: 'Savings tools'
  },
  Tax: {
    description: 'Use simple rate-based estimates for paycheck, salary, tax, and deduction planning.',
    title: 'Tax and income estimates'
  }
};

export function CalculatorLibrary({ auth, route, onNavigate, onSaveResult }: CalculatorLibraryProps) {
  const calculator = route === '/calculators' ? null : findSeoCalculator(route);

  if (calculator) {
    return <CalculatorDetail auth={auth} calculator={calculator} onNavigate={onNavigate} onSaveResult={onSaveResult} />;
  }

  return <CalculatorHub onNavigate={onNavigate} />;
}

function CalculatorHub({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [query, setQuery] = useState('');
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

  return (
    <section className="calculator-library route-shell" aria-labelledby="calculators-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Planning tools</p>
        <h1 id="calculators-title">Financial calculators for the decisions in front of you.</h1>
        <p>Run a quick estimate, understand the moving parts, then save the next step into goals, accounts, plans, or transaction tracking.</p>
      </div>

      <div className="calculator-search-panel">
        <Search size={18} />
        <input
          aria-label="Find calculators"
          type="search"
          placeholder="Find SIP, EMI, mortgage, debt payoff, retirement..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="calculator-region-tabs" aria-label="Calculator sections">
        {categoryOrder.map((category) => (
          <a key={category} href={`#${category.toLowerCase()}-calculators`}>{categoryCopy[category].title}</a>
        ))}
      </div>

      {categoryOrder.map((category) => {
        const calculators = visibleCalculators.filter((calculator) => calculator.category === category);
        const copy = categoryCopy[category];

        if (!normalizedQuery && calculators.length === 0) return null;

        return (
          <section className="calculator-region-section" id={`${category.toLowerCase()}-calculators`} key={category}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{category}</p>
                <h2>{copy.title}</h2>
                <p>{copy.description}</p>
              </div>
              <span>{calculators.length} calculators</span>
            </div>
            {calculators.length === 0 ? (
              <article className="scenario-card empty-card">
                <span>No calculators match this search</span>
                <small>Try a broader term such as loan, tax, retirement, SIP, or mortgage.</small>
              </article>
            ) : (
              <div className="calculator-card-grid">
                {calculators.map((calculator) => (
                  <button
                    className="calculator-card"
                    key={calculator.slug}
                    type="button"
                    onClick={() => onNavigate(calculatorPath(calculator.slug))}
                  >
                    <span className="calculator-card-meta">{calculator.category}</span>
                    <strong>{calculator.title}</strong>
                    <small>{calculator.description}</small>
                    <em>
                      Open calculator
                      <ArrowRight size={14} />
                    </em>
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
    </section>
  );
}

function CalculatorDetail({
  auth,
  calculator,
  onNavigate,
  onSaveResult
}: {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSavedRoute, setLastSavedRoute] = useState<SeoCalculator['conversionRoute'] | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<CalculatorScenarioId>('base');
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
  const qualitySpec = useMemo(() => getCalculatorQualitySpec(calculator), [calculator]);
  const ConversionIcon = conversionIcon(calculator.conversionRoute);

  useEffect(() => {
    const draft = readCalculatorDraft(calculator.slug);

    setValues(draft?.values ?? defaultCalculatorValues(calculator));
    setSelectedScenarioId(draft?.scenarioId ?? 'base');
    setLastSavedRoute(null);
    setSaveMessage(draft && auth.status === 'signed-in' ? 'Draft restored. Save it to keep it in your account.' : '');
  }, [auth.status, calculator]);

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

  return (
    <section className="calculator-library calculator-detail route-shell" aria-labelledby="calculator-detail-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">{calculator.category} calculator</p>
        <h1 id="calculator-detail-title">{calculator.h1}</h1>
        <p>{calculator.description}</p>
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
          <p className="eyebrow">Decision studio</p>
          <p>{studioMetadata.summary}</p>
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
            {calculator.inputs.map((input) => (
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
            ))}
          </div>
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

      <section className="calculator-explanation-panel">
        <div>
          <p className="eyebrow">How it works</p>
          <h2>{calculator.title} formula notes</h2>
          <p>{calculator.explanation}</p>
        </div>
        <div className="calculator-assumption-list">
          {(result.assumptions.length > 0 ? result.assumptions : ['This calculator is an estimate for planning and education.']).map((assumption) => (
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

      <CalculatorRelatedPanel metadata={studioMetadata} onNavigate={onNavigate} />

      <section className="calculator-faq-panel" aria-label={`${calculator.title} FAQ`}>
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
  if (!schedule || schedule.rows.length === 0) {
    return null;
  }

  const hasNotes = schedule.rows.some((row) => row.note);

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
        <p>{schedule.summary}</p>
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
              {schedule.rows.map((row) => (
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
        {chart.entries.map((entry) => {
          const primaryWidth = Math.max(8, Math.min(100, Math.abs(entry.primary) / maxChartValue * 100));
          const secondaryWidth = entry.secondary === undefined
            ? 0
            : Math.max(8, Math.min(100, Math.abs(entry.secondary) / maxChartValue * 100));

          return (
            <div className="calculator-studio-chart-row" key={entry.label}>
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
  onNavigate
}: {
  metadata: CalculatorStudioMetadata;
  onNavigate: (route: string) => void;
}) {
  return (
    <section className="calculator-related-panel" aria-label={`${metadata.studio} related calculators`}>
      <div>
        <p className="eyebrow">{metadata.studio}</p>
        <h2>Compare the nearby decisions</h2>
        <p>These calculators use the same decision workflow, so moving between them keeps the assumptions in context.</p>
      </div>
      <div className="calculator-related-list">
        {metadata.relatedCalculators.map((related) => (
          <button key={related.slug} type="button" onClick={() => onNavigate(related.path)}>
            <span>{related.title}</span>
            <small>{related.reason}</small>
            <ArrowRight size={15} />
          </button>
        ))}
      </div>
    </section>
  );
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
