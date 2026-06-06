import {
  BarChart3,
  Calculator,
  ChevronRight,
  LineChart as LineChartIcon,
  Menu,
  Moon,
  PiggyBank,
  SlidersHorizontal,
  Sun,
  X
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import {
  calculateFirePlan,
  formatMoney,
  formatPercent,
  totalDuration,
  type FirePlanResult,
  type PlanInput,
  type RatePeriod,
  type WithdrawalTiming,
  type YearResult
} from './lib/fire';

type Mood = 'aurora' | 'lagoon' | 'ember';
type Mode = 'light' | 'dark';
type View = 'planner' | 'results' | 'compare' | 'assumptions';

const moodLabels: Record<Mood, string> = {
  aurora: 'Aurora',
  lagoon: 'Lagoon',
  ember: 'Ember'
};

const views: Array<{ id: View; label: string; icon: typeof Calculator }> = [
  { id: 'planner', label: 'Planner', icon: Calculator },
  { id: 'results', label: 'Results', icon: LineChartIcon },
  { id: 'compare', label: 'Compare', icon: BarChart3 },
  { id: 'assumptions', label: 'Assumptions', icon: SlidersHorizontal }
];

const initialPlan: PlanInput = {
  annualExpense: 80_000,
  initialPortfolio: 750_000,
  withdrawalTiming: 'end',
  desiredFinalValue: 0,
  ratePeriods: [
    { duration: 10, r: 0.075, i: 0.03 },
    { duration: 20, r: 0.06, i: 0.03 }
  ],
  oneOffEvents: [
    { year: 5, amount: 50_000, label: 'Equity vest' },
    { year: 12, amount: -120_000, label: 'Home upgrade' }
  ]
};

function numericValue(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function updateRatePeriod(
  periods: RatePeriod[],
  index: number,
  key: keyof RatePeriod,
  value: number
): RatePeriod[] {
  return periods.map((period, periodIndex) =>
    periodIndex === index ? { ...period, [key]: value } : period
  );
}

function Metric({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'success';
}) {
  return (
    <div className={`metric metric-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function MoneyTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>Year {label}</strong>
      {payload.map((entry: any) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatMoney(Number(entry.value))}
        </span>
      ))}
    </div>
  );
}

function App() {
  const [plan, setPlan] = useState<PlanInput>(initialPlan);
  const [mood, setMood] = useState<Mood>('aurora');
  const [mode, setMode] = useState<Mode>('light');
  const [view, setView] = useState<View>('planner');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const result = useMemo<FirePlanResult>(() => calculateFirePlan(plan), [plan]);
  const duration = totalDuration(plan.ratePeriods);
  const chartRows = result.expenseMode.rows.map((row: YearResult) => ({
    year: row.year,
    balance: Math.max(row.endingBalance, 0),
    withdrawal: row.withdrawal,
    oneOff: row.oneOffAmount
  }));

  const comparisonRows = useMemo(() => {
    const variants = [
      { label: 'Base', returnDelta: 0, inflationDelta: 0 },
      { label: 'Guardrail', returnDelta: -0.015, inflationDelta: 0.005 },
      { label: 'Upside', returnDelta: 0.015, inflationDelta: -0.005 }
    ];

    return variants.map((variant) => {
      const adjustedPlan = {
        ...plan,
        ratePeriods: plan.ratePeriods.map((period) => ({
          ...period,
          r: Math.max(-0.5, period.r + variant.returnDelta),
          i: Math.max(-0.5, period.i + variant.inflationDelta)
        }))
      };
      const adjustedResult = calculateFirePlan(adjustedPlan);
      return {
        label: variant.label,
        requiredPortfolio: adjustedResult.requiredPortfolio,
        maxAnnualExpense: adjustedResult.maxAnnualExpense,
        finalBalance: adjustedResult.expenseMode.finalBalance
      };
    });
  }, [plan]);

  const setMoney = (key: keyof Pick<PlanInput, 'annualExpense' | 'initialPortfolio' | 'desiredFinalValue'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPlan((current) => ({ ...current, [key]: numericValue(event.target.value) }));
    };

  const setTiming = (timing: WithdrawalTiming) => {
    setPlan((current) => ({ ...current, withdrawalTiming: timing }));
  };

  const addPeriod = () => {
    setPlan((current) => ({
      ...current,
      ratePeriods: [...current.ratePeriods, { duration: 10, r: 0.06, i: 0.03 }]
    }));
  };

  const removePeriod = (index: number) => {
    setPlan((current) => ({
      ...current,
      ratePeriods:
        current.ratePeriods.length === 1
          ? current.ratePeriods
          : current.ratePeriods.filter((_, periodIndex) => periodIndex !== index)
    }));
  };

  const addEvent = () => {
    setPlan((current) => ({
      ...current,
      oneOffEvents: [...current.oneOffEvents, { year: 1, amount: 0, label: 'New event' }]
    }));
  };

  const removeEvent = (index: number) => {
    setPlan((current) => ({
      ...current,
      oneOffEvents: current.oneOffEvents.filter((_, eventIndex) => eventIndex !== index)
    }));
  };

  const navigate = (nextView: View) => {
    setView(nextView);
    setIsMenuOpen(false);
  };

  return (
    <div className="app" data-mood={mood} data-mode={mode}>
      <header className="topbar">
        <a href="#planner" className="brand" onClick={() => navigate('planner')}>
          <PiggyBank size={26} />
          <span>FIRECalc</span>
        </a>

        <nav className="desktop-nav" aria-label="Primary">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                className={view === item.id ? 'nav-button active' : 'nav-button'}
                onClick={() => navigate(item.id)}
              >
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="topbar-actions">
          <div className="mood-switcher" aria-label="Mood">
            {(Object.keys(moodLabels) as Mood[]).map((moodName) => (
              <button
                key={moodName}
                className={mood === moodName ? 'mood-dot active' : 'mood-dot'}
                data-mood-name={moodName}
                title={moodLabels[moodName]}
                aria-label={moodLabels[moodName]}
                onClick={() => setMood(moodName)}
              />
            ))}
          </div>
          <button
            className="icon-button"
            aria-label="Toggle light and dark mode"
            onClick={() => setMode((current) => (current === 'light' ? 'dark' : 'light'))}
          >
            {mode === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>
          <button
            className="icon-button mobile-menu-button"
            aria-label="Open navigation"
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </header>

      {isMenuOpen && (
        <nav className="mobile-nav" aria-label="Mobile primary">
          {views.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} className="nav-button" onClick={() => navigate(item.id)}>
                <Icon size={17} />
                {item.label}
              </button>
            );
          })}
        </nav>
      )}

      <main className="workspace">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <button onClick={() => navigate('planner')}>FIRECalc</button>
          <ChevronRight size={15} />
          <button onClick={() => navigate(view)}>{views.find((item) => item.id === view)?.label}</button>
        </nav>

        <section className="summary-band" aria-labelledby="summary-title">
          <div>
            <p className="eyebrow">Financial Independence Planner</p>
            <h1 id="summary-title">Build a retirement plan that survives real assumptions.</h1>
          </div>
          <div className="summary-metrics">
            <Metric label="FIRE Number" value={formatMoney(result.requiredPortfolio)} tone="accent" />
            <Metric label="Portfolio Income" value={formatMoney(result.maxAnnualExpense)} tone="success" />
            <Metric label="Plan Length" value={`${duration} years`} />
          </div>
        </section>

        {view === 'planner' && (
          <div className="planner-grid" id="planner">
            <section className="panel input-panel" aria-labelledby="planner-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Inputs</p>
                  <h2 id="planner-title">Plan settings</h2>
                </div>
              </div>

              <div className="form-grid">
                <Field label="Annual spending">
                  <input
                    type="number"
                    min="0"
                    value={plan.annualExpense}
                    onChange={setMoney('annualExpense')}
                  />
                </Field>
                <Field label="Current portfolio">
                  <input
                    type="number"
                    min="0"
                    value={plan.initialPortfolio}
                    onChange={setMoney('initialPortfolio')}
                  />
                </Field>
                <Field label="Final value target">
                  <input
                    type="number"
                    min="0"
                    value={plan.desiredFinalValue}
                    onChange={setMoney('desiredFinalValue')}
                  />
                </Field>
                <div className="field">
                  <span>Withdrawal timing</span>
                  <div className="segmented">
                    <button
                      className={plan.withdrawalTiming === 'end' ? 'active' : ''}
                      onClick={() => setTiming('end')}
                    >
                      End
                    </button>
                    <button
                      className={plan.withdrawalTiming === 'start' ? 'active' : ''}
                      onClick={() => setTiming('start')}
                    >
                      Start
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section className="panel" aria-labelledby="period-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Rates</p>
                  <h2 id="period-title">Market periods</h2>
                </div>
                <button className="secondary-button" onClick={addPeriod}>
                  Add
                </button>
              </div>

              <div className="period-list">
                {plan.ratePeriods.map((period, index) => (
                  <div className="repeat-row" key={`${index}-${period.duration}`}>
                    <span className="row-number">{index + 1}</span>
                    <Field label="Years">
                      <input
                        type="number"
                        min="1"
                        value={period.duration}
                        onChange={(event) =>
                          setPlan((current) => ({
                            ...current,
                            ratePeriods: updateRatePeriod(
                              current.ratePeriods,
                              index,
                              'duration',
                              numericValue(event.target.value, 1)
                            )
                          }))
                        }
                      />
                    </Field>
                    <Field label="Return">
                      <input
                        type="number"
                        step="0.1"
                        value={(period.r * 100).toFixed(1)}
                        onChange={(event) =>
                          setPlan((current) => ({
                            ...current,
                            ratePeriods: updateRatePeriod(
                              current.ratePeriods,
                              index,
                              'r',
                              numericValue(event.target.value) / 100
                            )
                          }))
                        }
                      />
                    </Field>
                    <Field label="Inflation">
                      <input
                        type="number"
                        step="0.1"
                        value={(period.i * 100).toFixed(1)}
                        onChange={(event) =>
                          setPlan((current) => ({
                            ...current,
                            ratePeriods: updateRatePeriod(
                              current.ratePeriods,
                              index,
                              'i',
                              numericValue(event.target.value) / 100
                            )
                          }))
                        }
                      />
                    </Field>
                    <button
                      className="icon-button row-action"
                      aria-label="Remove period"
                      onClick={() => removePeriod(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="panel" aria-labelledby="events-title">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Cash flows</p>
                  <h2 id="events-title">One-off events</h2>
                </div>
                <button className="secondary-button" onClick={addEvent}>
                  Add
                </button>
              </div>

              <div className="event-list">
                {plan.oneOffEvents.map((event, index) => (
                  <div className="repeat-row event-row" key={`${index}-${event.label}`}>
                    <Field label="Label">
                      <input
                        type="text"
                        value={event.label ?? ''}
                        onChange={(changeEvent) =>
                          setPlan((current) => ({
                            ...current,
                            oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                              itemIndex === index ? { ...item, label: changeEvent.target.value } : item
                            )
                          }))
                        }
                      />
                    </Field>
                    <Field label="Year">
                      <input
                        type="number"
                        min="1"
                        value={event.year}
                        onChange={(changeEvent) =>
                          setPlan((current) => ({
                            ...current,
                            oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, year: Math.trunc(numericValue(changeEvent.target.value, 1)) }
                                : item
                            )
                          }))
                        }
                      />
                    </Field>
                    <Field label="Amount">
                      <input
                        type="number"
                        value={event.amount}
                        onChange={(changeEvent) =>
                          setPlan((current) => ({
                            ...current,
                            oneOffEvents: current.oneOffEvents.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, amount: numericValue(changeEvent.target.value) }
                                : item
                            )
                          }))
                        }
                      />
                    </Field>
                    <button
                      className="icon-button row-action"
                      aria-label="Remove event"
                      onClick={() => removeEvent(index)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {view === 'results' && (
          <section className="panel chart-panel" id="results" aria-labelledby="results-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Projection</p>
                <h2 id="results-title">Balance and withdrawals</h2>
              </div>
              <span className="pill">{plan.withdrawalTiming === 'start' ? 'Start-year' : 'End-year'}</span>
            </div>
            <div className="chart-frame">
              <ResponsiveContainer width="100%" height={360}>
                <LineChart data={chartRows} margin={{ top: 10, right: 22, left: 8, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} width={72} />
                  <Tooltip content={<MoneyTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Balance"
                    stroke="var(--chart-primary)"
                    strokeWidth={3}
                    dot={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="withdrawal"
                    name="Withdrawal"
                    stroke="var(--chart-secondary)"
                    strokeWidth={3}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {view === 'compare' && (
          <section className="panel" id="compare" aria-labelledby="compare-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Scenarios</p>
                <h2 id="compare-title">Base, guardrail, upside</h2>
              </div>
            </div>
            <div className="comparison-grid">
              {comparisonRows.map((row) => (
                <article className="scenario-card" key={row.label}>
                  <span>{row.label}</span>
                  <strong>{formatMoney(row.requiredPortfolio)}</strong>
                  <small>Income: {formatMoney(row.maxAnnualExpense)}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        {view === 'assumptions' && (
          <section className="panel" id="assumptions" aria-labelledby="assumptions-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Model</p>
                <h2 id="assumptions-title">Calculation contract</h2>
              </div>
            </div>
            <div className="assumption-grid">
              <Metric label="First withdrawal" value={formatMoney(plan.annualExpense)} />
              <Metric label="Periods" value={`${plan.ratePeriods.length}`} />
              <Metric
                label="Average return"
                value={formatPercent(
                  plan.ratePeriods.reduce((sum, period) => sum + period.r * period.duration, 0) /
                    Math.max(duration, 1)
                )}
              />
              <Metric
                label="Average inflation"
                value={formatPercent(
                  plan.ratePeriods.reduce((sum, period) => sum + period.i * period.duration, 0) /
                    Math.max(duration, 1)
                )}
              />
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
