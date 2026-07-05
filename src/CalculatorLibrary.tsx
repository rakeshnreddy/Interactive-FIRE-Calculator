import { SignUpButton } from '@clerk/react';
import {
  ArrowRight,
  Calculator,
  CircleDollarSign,
  ClipboardList,
  FolderKanban,
  Search,
  Target
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { AuthState } from './auth';
import {
  calculateSeoCalculator,
  calculatorPath,
  findSeoCalculator,
  seoCalculators,
  type CalculatorMetric,
  type CalculatorRegion,
  type SeoCalculator
} from './lib/seoCalculators';

type CalculatorLibraryProps = {
  auth: AuthState;
  route: string;
  onNavigate: (route: string) => void;
};

const regionOrder: CalculatorRegion[] = ['Global', 'India', 'US'];

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
          calculator.region,
          calculator.category,
          ...calculator.keywords
        ].join(' ').toLowerCase().includes(normalizedQuery)
      ),
    [normalizedQuery]
  );

  return (
    <section className="calculator-library route-shell" aria-labelledby="calculators-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Calculator library</p>
        <h1 id="calculators-title">Financial calculators for US and India planning.</h1>
        <p>Search public calculators, run a quick estimate, then save the next step into goals, accounts, plans, or transaction tracking.</p>
      </div>

      <div className="calculator-search-panel">
        <Search size={18} />
        <input
          aria-label="Search calculators"
          type="search"
          placeholder="Search SIP, EMI, mortgage, debt payoff, retirement..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <div className="calculator-region-tabs" aria-label="Calculator regions">
        {regionOrder.map((region) => (
          <a key={region} href={`#${region.toLowerCase()}-calculators`}>{region}</a>
        ))}
      </div>

      {regionOrder.map((region) => {
        const calculators = visibleCalculators.filter((calculator) => calculator.region === region);

        return (
          <section className="calculator-region-section" id={`${region.toLowerCase()}-calculators`} key={region}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{region}</p>
                <h2>{region === 'Global' ? 'Universal finance calculators' : `${region} search-demand calculators`}</h2>
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
        <p className="eyebrow">{calculator.region} · {calculator.category}</p>
        <h1 id="calculator-detail-title">{calculator.h1}</h1>
        <p>{calculator.description}</p>
      </div>

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
                <span>{input.label}</span>
                <div className="calculator-input-control">
                  {input.type === 'currency' ? <small>{calculator.region === 'India' ? 'INR' : 'USD'}</small> : null}
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
                <span>{metric.label}</span>
                <strong>{formatMetric(metric, calculator.region)}</strong>
              </article>
            ))}
          </div>
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

function conversionIcon(route: SeoCalculator['conversionRoute']) {
  if (route === '/accounts') return CircleDollarSign;
  if (route === '/transactions') return ClipboardList;
  if (route === '/plans') return FolderKanban;
  if (route === '/goals') return Target;
  return Calculator;
}

function formatMetric(metric: CalculatorMetric, region: CalculatorRegion): string {
  if (metric.valueType === 'currency') {
    return new Intl.NumberFormat(undefined, {
      currency: region === 'India' ? 'INR' : 'USD',
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
