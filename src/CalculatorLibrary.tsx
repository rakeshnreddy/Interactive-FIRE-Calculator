import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  Calculator,
  CircleHelp,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Search,
  Target
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuthState } from './auth';
import { getCalculatorQualitySpec, type CalculatorQualitySpec } from './lib/calculatorQuality';
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

type CalculatorLibraryProps = {
  auth: AuthState;
  route: string;
  onNavigate: (route: string) => void;
};

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

export function CalculatorLibrary({ auth, route, onNavigate }: CalculatorLibraryProps) {
  const calculator = route === '/calculators' ? null : findSeoCalculator(route);

  if (calculator) {
    return <CalculatorDetail auth={auth} calculator={calculator} onNavigate={onNavigate} />;
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
  onNavigate
}: {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]))
  );
  const result = useMemo(() => calculateSeoCalculator(calculator, values), [calculator, values]);
  const qualitySpec = useMemo(() => getCalculatorQualitySpec(calculator), [calculator]);
  const ConversionIcon = conversionIcon(calculator.conversionRoute);

  const setValue = (key: string, value: string) => {
    const parsed = Number(value);
    setValues((current) => ({
      ...current,
      [key]: Number.isFinite(parsed) ? parsed : 0
    }));
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
          <p className="eyebrow">How to read it</p>
          <p>{result.narrative} The supporting tiles explain the main estimate and show the inputs that matter most.</p>
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
          <CalculatorResultVisual calculator={calculator} metrics={result.metrics} />
          <p className="calculator-result-narrative">{result.narrative}</p>
          <div className="calculator-conversion-panel">
            <span className="feature-icon"><ConversionIcon size={18} /></span>
            <div>
              <strong>{calculator.conversionLabel}</strong>
              <small>Use this estimate as the first step, then track progress inside FinPath.</small>
            </div>
            {auth.status === 'signed-in' ? (
              <button className="primary-button icon-text-button" type="button" onClick={() => onNavigate(calculator.conversionRoute)}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : auth.status === 'not-configured' ? (
              <button className="primary-button icon-text-button" type="button" onClick={() => onNavigate(calculator.conversionRoute)}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <SignUpButton mode="modal">
                <button className="primary-button icon-text-button" type="button">
                  Create account
                  <ArrowRight size={16} />
                </button>
              </SignUpButton>
            )}
          </div>
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

      <CalculatorDecisionPanel calculator={calculator} qualitySpec={qualitySpec} />

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

function CalculatorResultVisual({
  calculator,
  metrics
}: {
  calculator: SeoCalculator;
  metrics: CalculatorMetric[];
}) {
  const visibleMetrics = metrics.slice(0, 4);
  const maxVisualValue = Math.max(1, ...visibleMetrics.map((metric) => visualMetricValue(metric)));

  return (
    <div className="calculator-visual-panel" aria-label={`${calculator.title} visual summary`}>
      <div>
        <p className="eyebrow">Visual read</p>
        <small>The bars compare the headline estimate with the supporting numbers so the biggest driver is easier to spot.</small>
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
