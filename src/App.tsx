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
  annualSimulation,
  calculateFirePlan,
  formatMoney,
  formatPercent,
  totalDuration,
  type FirePlanResult,
  type PlanInput,
  type RatePeriod,
  type SimulationResult,
  type WithdrawalTiming,
  type YearResult
} from './lib/fire';

type Mood = 'aurora' | 'lagoon' | 'ember';
type Mode = 'light' | 'dark';
type View = 'planner' | 'results' | 'compare' | 'assumptions';
type ResultsMode = 'chart' | 'table';
type ProjectionBasis = 'fire-number' | 'current-portfolio';
type ScenarioField = 'spendingDelta' | 'portfolioDelta' | 'returnDelta' | 'inflationDelta';

type ScenarioConfig = {
  id: 'base' | 'guardrail' | 'upside';
  label: string;
  spendingDelta: number;
  portfolioDelta: number;
  returnDelta: number;
  inflationDelta: number;
};

type WarningNotice = {
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
};

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

const initialScenarios: ScenarioConfig[] = [
  {
    id: 'base',
    label: 'Base',
    spendingDelta: 0,
    portfolioDelta: 0,
    returnDelta: 0,
    inflationDelta: 0
  },
  {
    id: 'guardrail',
    label: 'Guardrail',
    spendingDelta: -0.05,
    portfolioDelta: 0,
    returnDelta: -0.015,
    inflationDelta: 0.005
  },
  {
    id: 'upside',
    label: 'Upside',
    spendingDelta: 0.05,
    portfolioDelta: 0.05,
    returnDelta: 0.015,
    inflationDelta: -0.005
  }
];

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

function updateScenario(
  scenarios: ScenarioConfig[],
  id: ScenarioConfig['id'],
  updates: Partial<ScenarioConfig>
): ScenarioConfig[] {
  return scenarios.map((scenario) =>
    scenario.id === id ? { ...scenario, ...updates } : scenario
  );
}

function clampRate(value: number): number {
  return Math.min(0.5, Math.max(-0.5, value));
}

function applyScenario(plan: PlanInput, scenario: ScenarioConfig): PlanInput {
  return {
    ...plan,
    annualExpense: Math.max(0, plan.annualExpense * Math.max(0, 1 + scenario.spendingDelta)),
    initialPortfolio: Math.max(0, plan.initialPortfolio * Math.max(0, 1 + scenario.portfolioDelta)),
    ratePeriods: plan.ratePeriods.map((period) => ({
      ...period,
      r: clampRate(period.r + scenario.returnDelta),
      i: clampRate(period.i + scenario.inflationDelta)
    }))
  };
}

function averageRate(periods: RatePeriod[], key: 'r' | 'i'): number {
  const duration = Math.max(totalDuration(periods), 1);
  return periods.reduce((sum, period) => sum + period[key] * period.duration, 0) / duration;
}

function formatSignedPercent(value: number): string {
  const formatted = formatPercent(value);
  return value > 0 ? `+${formatted}` : formatted;
}

function escapeCsvCell(value: string | number): string {
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function buildProjectionCsv(label: string, rows: YearResult[]): string {
  const csvRows: Array<Array<string | number>> = [
    [
      'Projection',
      'Year',
      'Starting balance',
      'Withdrawal',
      'One-off cash flow',
      'Return rate',
      'Inflation rate',
      'Ending balance'
    ],
    ...rows.map((row) => [
      label,
      row.year,
      row.startingBalance.toFixed(2),
      row.withdrawal.toFixed(2),
      row.oneOffAmount.toFixed(2),
      (row.returnRate * 100).toFixed(4),
      (row.inflationRate * 100).toFixed(4),
      row.endingBalance.toFixed(2)
    ])
  ];

  return csvRows.map((row) => row.map(escapeCsvCell).join(',')).join('\n');
}

function downloadCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickString(record: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
}

function normalizeWarning(value: unknown, index: number): WarningNotice | null {
  if (typeof value === 'string') {
    return {
      title: `Model warning ${index + 1}`,
      message: value,
      severity: 'warning'
    };
  }

  if (!isRecord(value)) {
    return null;
  }

  const severityText = pickString(value, ['severity', 'level', 'tone', 'kind'])?.toLowerCase() ?? '';
  const severity: WarningNotice['severity'] = severityText.includes('critical') ||
    severityText.includes('error') ||
    severityText.includes('danger')
    ? 'critical'
    : severityText.includes('warning') || severityText.includes('risk') || severityText.includes('caution')
      ? 'warning'
      : 'info';
  const title =
    pickString(value, ['title', 'label', 'name', 'code', 'kind', 'type']) ??
    `Model warning ${index + 1}`;
  const message =
    pickString(value, ['message', 'description', 'detail', 'text', 'body', 'summary']) ?? title;

  return { title, message, severity };
}

function engineWarnings(result: FirePlanResult): WarningNotice[] {
  const warningSource = result as FirePlanResult & {
    warning?: unknown;
    warnings?: unknown;
  };
  const rawWarnings = Array.isArray(warningSource.warnings)
    ? warningSource.warnings
    : warningSource.warning === undefined
      ? []
      : [warningSource.warning];

  return rawWarnings
    .map((warning, index) => normalizeWarning(warning, index))
    .filter((warning): warning is WarningNotice => warning !== null);
}

function firstNegativeYear(rows: YearResult[]): number | null {
  return rows.find((row) => row.endingBalance < 0)?.year ?? null;
}

function stressTestCurrentPortfolio(plan: PlanInput): SimulationResult {
  const fallbackPortfolio = Number.isFinite(plan.initialPortfolio)
    ? Math.max(0, plan.initialPortfolio)
    : 0;

  try {
    return annualSimulation(
      fallbackPortfolio,
      Number.isFinite(plan.annualExpense) ? Math.max(0, plan.annualExpense) : 0,
      plan.withdrawalTiming,
      plan.ratePeriods,
      plan.oneOffEvents
    );
  } catch {
    return {
      rows: [],
      years: [0],
      balances: [fallbackPortfolio],
      withdrawals: [],
      finalBalance: fallbackPortfolio,
      warnings: []
    };
  }
}

function planWarnings(
  plan: PlanInput,
  result: FirePlanResult,
  currentRows: YearResult[],
  duration: number
): WarningNotice[] {
  const exportedWarnings = engineWarnings(result);
  if (exportedWarnings.length > 0) {
    return exportedWarnings;
  }

  const notices: WarningNotice[] = [];
  const depletionYear = firstNegativeYear(currentRows);
  const requiredGap = result.requiredPortfolio - plan.initialPortfolio;
  const withdrawalRate = plan.initialPortfolio > 0 ? plan.annualExpense / plan.initialPortfolio : Infinity;
  const ignoredEvents = plan.oneOffEvents.filter((event) => {
    const year = Math.trunc(event.year);
    return year < 1 || year > duration;
  });

  if (depletionYear !== null) {
    notices.push({
      title: 'Current portfolio drawdown',
      message: `At the entered spending level, the current portfolio crosses below zero in year ${depletionYear}.`,
      severity: 'warning'
    });
  }

  if (Number.isFinite(requiredGap) && requiredGap > 0) {
    notices.push({
      title: 'Funding gap',
      message: `${formatMoney(requiredGap)} separates the current portfolio from the calculated FIRE number.`,
      severity: 'info'
    });
  }

  if (withdrawalRate > 0.06) {
    notices.push({
      title: 'High starting withdrawal',
      message: `The first-year spend is ${formatPercent(withdrawalRate)} of the current portfolio.`,
      severity: 'warning'
    });
  }

  if (ignoredEvents.length > 0) {
    notices.push({
      title: 'Cash flow outside timeline',
      message: `${ignoredEvents.length} one-off event${ignoredEvents.length === 1 ? '' : 's'} fall outside the ${duration}-year model.`,
      severity: 'info'
    });
  }

  if (averageRate(plan.ratePeriods, 'i') >= averageRate(plan.ratePeriods, 'r')) {
    notices.push({
      title: 'Inflation pressure',
      message: 'Average inflation is at or above average return across the modeled periods.',
      severity: 'warning'
    });
  }

  return [...exportedWarnings, ...notices];
}

function Metric({
  label,
  value,
  tone = 'neutral'
}: {
  label: string;
  value: string;
  tone?: 'neutral' | 'accent' | 'success' | 'warning';
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

function YearByYearTable({ rows, label }: { rows: YearResult[]; label: string }) {
  return (
    <div className="table-wrap">
      <table aria-label={`${label} year-by-year projection`}>
        <thead>
          <tr>
            <th scope="col">Year</th>
            <th scope="col">Start</th>
            <th scope="col">Withdrawal</th>
            <th scope="col">One-off</th>
            <th scope="col">Return</th>
            <th scope="col">Inflation</th>
            <th scope="col">End</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              <td>{formatMoney(row.startingBalance)}</td>
              <td>{formatMoney(row.withdrawal)}</td>
              <td>{formatMoney(row.oneOffAmount)}</td>
              <td>{formatPercent(row.returnRate)}</td>
              <td>{formatPercent(row.inflationRate)}</td>
              <td>{formatMoney(row.endingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function App() {
  const [plan, setPlan] = useState<PlanInput>(initialPlan);
  const [mood, setMood] = useState<Mood>('aurora');
  const [mode, setMode] = useState<Mode>('light');
  const [view, setView] = useState<View>('planner');
  const [resultsMode, setResultsMode] = useState<ResultsMode>('chart');
  const [projectionBasis, setProjectionBasis] = useState<ProjectionBasis>('fire-number');
  const [scenarios, setScenarios] = useState<ScenarioConfig[]>(initialScenarios);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const result = useMemo<FirePlanResult>(() => calculateFirePlan(plan), [plan]);
  const duration = totalDuration(plan.ratePeriods);
  const currentSimulation = useMemo(() => stressTestCurrentPortfolio(plan), [plan]);
  const projectionRows =
    projectionBasis === 'fire-number' ? result.expenseMode.rows : currentSimulation.rows;
  const projectionLabel =
    projectionBasis === 'fire-number'
      ? 'FIRE number projection'
      : 'Current portfolio stress test';
  const warningNotices = planWarnings(plan, result, currentSimulation.rows, duration);
  const chartRows = projectionRows.map((row: YearResult) => ({
    year: row.year,
    balance: row.endingBalance,
    withdrawal: row.withdrawal,
    oneOff: row.oneOffAmount
  }));

  const comparisonRows = useMemo(() => {
    return scenarios.map((scenario, index) => {
      const adjustedPlan = applyScenario(plan, scenario);
      const adjustedResult = calculateFirePlan(adjustedPlan);
      const adjustedSimulation = stressTestCurrentPortfolio(adjustedPlan);

      return {
        id: scenario.id,
        label: scenario.label.trim() || `Scenario ${index + 1}`,
        scenario,
        requiredPortfolio: adjustedResult.requiredPortfolio,
        requiredDelta: adjustedResult.requiredPortfolio - result.requiredPortfolio,
        maxAnnualExpense: adjustedResult.maxAnnualExpense,
        actualFinalBalance: adjustedSimulation.finalBalance,
        depletionYear: firstNegativeYear(adjustedSimulation.rows)
      };
    });
  }, [plan, result.requiredPortfolio, scenarios]);

  const setMoney = (key: keyof Pick<PlanInput, 'annualExpense' | 'initialPortfolio' | 'desiredFinalValue'>) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setPlan((current) => ({ ...current, [key]: numericValue(event.target.value) }));
    };

  const setTiming = (timing: WithdrawalTiming) => {
    setPlan((current) => ({ ...current, withdrawalTiming: timing }));
  };

  const setScenarioLabel = (id: ScenarioConfig['id']) => (event: ChangeEvent<HTMLInputElement>) => {
    setScenarios((current) => updateScenario(current, id, { label: event.target.value }));
  };

  const setScenarioPercent =
    (id: ScenarioConfig['id'], key: ScenarioField) => (event: ChangeEvent<HTMLInputElement>) => {
      const value = numericValue(event.target.value) / 100;
      setScenarios((current) =>
        current.map((scenario) =>
          scenario.id === id ? { ...scenario, [key]: value } : scenario
        )
      );
    };

  const exportSelectedProjection = () => {
    downloadCsv(
      `firecalc-${projectionBasis}-projection.csv`,
      buildProjectionCsv(projectionLabel, projectionRows)
    );
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
            <p className="eyebrow">FIRE Decision Workspace</p>
            <h1 id="summary-title">Model your FIRE number, income ceiling, and yearly cash flow.</h1>
            <p>
              Tune spending, staged return assumptions, inflation, and one-off cash flows before
              comparing what changes the outcome.
            </p>
          </div>
          <div className="summary-metrics">
            <Metric label="FIRE Number" value={formatMoney(result.requiredPortfolio)} tone="accent" />
            <Metric label="Portfolio Income" value={formatMoney(result.maxAnnualExpense)} tone="success" />
            <Metric label="Plan Length" value={`${duration} years`} />
            <Metric
              label="Stress Ending"
              value={formatMoney(currentSimulation.finalBalance)}
              tone={currentSimulation.finalBalance >= plan.desiredFinalValue ? 'success' : 'warning'}
            />
          </div>
        </section>

        <section className="panel" aria-labelledby="warnings-title">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Plan checks</p>
              <h2 id="warnings-title">Warnings and model checks</h2>
            </div>
            <span className="pill">{warningNotices.length} checks</span>
          </div>
          <div className="comparison-grid">
            {warningNotices.length > 0 ? (
              warningNotices.map((warning, index) => (
              <article
                className={`scenario-card warning-card warning-${warning.severity}`}
                key={`${warning.title}-${index}`}
              >
                <span>{warning.severity.toUpperCase()}</span>
                <strong>{warning.title}</strong>
                <small>{warning.message}</small>
              </article>
              ))
            ) : (
              <article className="scenario-card warning-card warning-ok">
                <span>OK</span>
                <strong>Model checks passed</strong>
                <small>
                  No validation, depletion, or assumption warnings were detected for this plan.
                </small>
              </article>
            )}
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
                <h2 id="results-title">Year-by-year cash flow</h2>
                <p>
                  Review either the calculated FIRE-number projection or a stress test of the
                  portfolio you have entered today.
                </p>
              </div>
              <div className="topbar-actions">
                <button className="secondary-button" onClick={exportSelectedProjection}>
                  Export CSV
                </button>
                <span className="pill">{plan.withdrawalTiming === 'start' ? 'Start-year' : 'End-year'}</span>
              </div>
            </div>

            <div className="form-grid">
              <div className="field">
                <span>Projection basis</span>
                <div className="segmented">
                  <button
                    className={projectionBasis === 'fire-number' ? 'active' : ''}
                    onClick={() => setProjectionBasis('fire-number')}
                  >
                    FIRE number
                  </button>
                  <button
                    className={projectionBasis === 'current-portfolio' ? 'active' : ''}
                    onClick={() => setProjectionBasis('current-portfolio')}
                  >
                    Current
                  </button>
                </div>
              </div>
              <div className="field">
                <span>View</span>
                <div className="segmented">
                  <button
                    className={resultsMode === 'chart' ? 'active' : ''}
                    onClick={() => setResultsMode('chart')}
                  >
                    Chart
                  </button>
                  <button
                    className={resultsMode === 'table' ? 'active' : ''}
                    onClick={() => setResultsMode('table')}
                  >
                    Table
                  </button>
                </div>
              </div>
            </div>

            {resultsMode === 'chart' ? (
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
                      name={projectionLabel}
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
            ) : (
              <YearByYearTable rows={projectionRows} label={projectionLabel} />
            )}
          </section>
        )}

        {view === 'compare' && (
          <section className="panel" id="compare" aria-labelledby="compare-title">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Scenarios</p>
                <h2 id="compare-title">Three-way assumption comparison</h2>
                <p>
                  Shift spending, portfolio, return, and inflation assumptions while keeping the
                  timeline and one-off events consistent.
                </p>
              </div>
              <span className="pill">3 scenarios</span>
            </div>
            <div className="comparison-grid">
              {comparisonRows.map((row) => (
                <article className="scenario-card" key={row.id}>
                  <Field label="Scenario name">
                    <input type="text" value={row.scenario.label} onChange={setScenarioLabel(row.id)} />
                  </Field>
                  <strong>{formatMoney(row.requiredPortfolio)}</strong>
                  <small>FIRE number for {row.label}</small>
                  <small>
                    Vs planner: {row.requiredDelta > 0 ? '+' : ''}
                    {formatMoney(row.requiredDelta)}
                  </small>
                  <small>Portfolio income: {formatMoney(row.maxAnnualExpense)}</small>
                  <small>Current ending: {formatMoney(row.actualFinalBalance)}</small>
                  <small>
                    {row.depletionYear === null
                      ? 'No current-portfolio depletion in this timeline'
                      : `Current portfolio depletes in year ${row.depletionYear}`}
                  </small>
                  <div className="form-grid">
                    <Field label="Spend shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.spendingDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'spendingDelta')}
                      />
                    </Field>
                    <Field label="Portfolio shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.portfolioDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'portfolioDelta')}
                      />
                    </Field>
                    <Field label="Return shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.returnDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'returnDelta')}
                      />
                    </Field>
                    <Field label="Inflation shift">
                      <input
                        type="number"
                        step="0.1"
                        value={(row.scenario.inflationDelta * 100).toFixed(1)}
                        onChange={setScenarioPercent(row.id, 'inflationDelta')}
                      />
                    </Field>
                  </div>
                  <small>
                    Return {formatSignedPercent(row.scenario.returnDelta)}; inflation{' '}
                    {formatSignedPercent(row.scenario.inflationDelta)}
                  </small>
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
            <div className="comparison-grid">
              <article className="scenario-card">
                <span>Expense mode</span>
                <strong>{formatMoney(result.requiredPortfolio)}</strong>
                <small>
                  Portfolio needed to support the entered annual spending and final value target.
                </small>
              </article>
              <article className="scenario-card">
                <span>Portfolio mode</span>
                <strong>{formatMoney(result.maxAnnualExpense)}</strong>
                <small>
                  Annual spending supported by the entered current portfolio over this timeline.
                </small>
              </article>
              <article className="scenario-card">
                <span>Cash-flow events</span>
                <strong>{plan.oneOffEvents.length}</strong>
                <small>Positive amounts add cash; negative amounts reduce the portfolio.</small>
              </article>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default App;
