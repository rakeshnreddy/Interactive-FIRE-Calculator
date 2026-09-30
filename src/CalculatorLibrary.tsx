import { useResultReveal } from './lib/resultReveal';
import { CalculatorResultAction } from './components/CalculatorResultAction';
import { EstimateCustomization } from './components/EstimateCustomization';
import { SignUpIntent } from './authRuntime';
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
import { calculatorRawValues, validateCalculatorInputs, optionalCalculatorInputKeys, type CalculatorInputOrigin } from './lib/calculatorInputState';
import type { MouseEvent } from 'react';
import type { AuthState } from './auth';
import { CashflowPlanningCalculator } from './CashflowPlanningCalculator';
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
  HYSA_APY_ASSUMPTION,
  calculatorCurrency,
  calculatorVariants,
  calculatorPath,
  findSeoCalculator,
  seoCalculators,
  type CalculatorInput,
  type CalculatorMetric,
  type CalculatorResult,
  type SeoCalculator
} from './lib/seoCalculators';
import { resolveMoneyLocale } from './lib/money';


type RegionFilter = 'all' | 'US' | 'India';

const regionFilterOptions: Array<{ id: RegionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'US', label: 'United States' },
  { id: 'India', label: 'India' }
];

function matchesRegion(calculator: SeoCalculator, region: RegionFilter): boolean {
  return region === 'all' || calculator.region === 'Global' || calculator.region === region;
}

function regionLabel(calculator: SeoCalculator): string {
  return calculator.region === 'Global' ? 'US & India' : calculator.region === 'US' ? 'United States' : 'India';
}

function RegionBadge({ calculator }: { calculator: SeoCalculator }) {
  return <span className={`calculator-region-badge region-${calculator.region.toLowerCase()}`}>{regionLabel(calculator)}</span>;
}

// A short name for a variant chip: "Car Loan EMI Calculator" -> "Car loan".
function variantLabel(calculator: SeoCalculator): string {
  const short = calculator.title.replace(/ Calculator.*$/i, '').replace(/ EMI$/i, '').replace(/^Mortgage /i, '').trim();
  return short.length > 1 ? short.charAt(0) + short.slice(1).replace(/\b([A-Z])(?=[a-z])/g, (m) => m.toLowerCase()) : short;
}

function VariantChips({ calculator, onNavigate }: { calculator: SeoCalculator; onNavigate: (route: string) => void }) {
  const siblings = calculatorVariants(calculator).filter((other) => other.slug !== calculator.slug);
  if (siblings.length === 0) return null;
  return (
    <nav className="calculator-variants" aria-label="Same calculation with other presets">
      <span>Same calculation, other presets:</span>
      {siblings.map((sibling) => (
        <a
          key={sibling.slug}
          href={calculatorPath(sibling.slug)}
          onClick={(event) => navigateInternalLink(event, calculatorPath(sibling.slug), onNavigate)}
        >
          {variantLabel(sibling)}
        </a>
      ))}
    </nav>
  );
}

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
    assumptions?: string[];
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

    if (['net-worth', 'budget', 'emergency-fund'].includes(calculator.slug)) {
      return (
        <CashflowPlanningCalculator
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

const libraryStartingPaths = [
  {
    question: 'Planning for retirement?',
    title: 'Interactive FIRE Calculator',
    description: 'Model required nest egg, target retirement age, and sustainable withdrawals.',
    path: '/calculators/fire',
    badge: 'Retirement'
  },
  {
    question: 'Buying a home?',
    title: 'Mortgage Payment Calculator',
    description: 'Estimate monthly principal and interest, amortized interest, and total cost.',
    path: '/calculators/mortgage',
    badge: 'Home & Loans'
  },
  {
    question: 'Growing your savings?',
    title: 'Compound Interest Calculator',
    description: 'Project regular contributions, compound growth schedules, and return scenarios.',
    path: '/calculators/compound-interest',
    badge: 'Savings & Growth'
  },
  {
    question: 'Paying off debt?',
    title: 'Debt Payoff Calculator',
    description: 'Compare avalanche and snowball strategies to eliminate high-interest debt faster.',
    path: '/calculators/debt-payoff',
    badge: 'Debt Payoff'
  }
];

const fireSearchKeywords = [
  'fire',
  'financial independence',
  'retire early',
  'retirement',
  'retirement timeline',
  'nest egg',
  'sustainable withdrawal',
  'swr',
  'safe withdrawal rate',
  '4% rule',
  'pension',
  'portfolio target'
];

function CalculatorHub({ onNavigate }: { onNavigate: (route: string) => void }) {
  const [query, setQuery] = useState(() => (
    typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('q') ?? ''
  ));
  const [region, setRegion] = useState<RegionFilter>(() => {
    const value = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('region');
    return value === 'US' || value === 'India' ? value : 'all';
  });
  const normalizedQuery = query.trim().toLowerCase();

  useEffect(() => {
    const id = typeof window === 'undefined' ? '' : window.location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);

  const fireMatches = useMemo(() => {
    if (!normalizedQuery) return false;
    return [
      'Interactive FIRE Calculator',
      'Model retirement timelines, required nest egg, and sustainable withdrawal rates.',
      'Retirement Planning',
      ...fireSearchKeywords
    ].join(' ').toLowerCase().includes(normalizedQuery);
  }, [normalizedQuery]);

  const visibleCalculators = useMemo(
    () =>
      seoCalculators.filter((calculator) =>
        matchesRegion(calculator, region) && (
          !normalizedQuery ||
          [
            calculator.title,
            calculator.description,
            calculator.category,
            ...calculator.keywords
          ].join(' ').toLowerCase().includes(normalizedQuery)
        )
      ),
    [normalizedQuery, region]
  );

  const totalMatches = visibleCalculators.length + (fireMatches ? 1 : 0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set('q', query.trim());
    else url.searchParams.delete('q');
    if (region !== 'all') url.searchParams.set('region', region);
    else url.searchParams.delete('region');
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
  }, [query, region]);

  return (
    <section className="calculator-library route-shell" aria-labelledby="calculators-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">Decision toolkits</p>
        <h1 id="calculators-title">Start with the question, not the formula.</h1>
        <p>Find a calculator for the decision in front of you. Choose a toolkit or search by name.</p>

      </div>

      <div className="calculator-search-panel">
        <Search size={18} />
        <input
          aria-label="Find calculators"
          autoComplete="off"
          name="calculator-search"
          type="search"
          placeholder="Search mortgage, SIP, tax, debt payoff, retirement, FIRE"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query ? (
          <button className="calculator-search-clear" type="button" onClick={() => setQuery('')}>
            Clear
          </button>
        ) : null}
      </div>

      <div className="calculator-region-filter" role="group" aria-label="Show calculators for">
        <span>Show calculators for</span>
        {regionFilterOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className={region === option.id ? 'active' : ''}
            aria-pressed={region === option.id}
            onClick={() => setRegion(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {normalizedQuery ? (
        <section className="calculator-search-results" aria-live="polite" aria-label="Calculator search results">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Search results</p>
              <h2>{totalMatches} {totalMatches === 1 ? 'match' : 'matches'}</h2>
            </div>
          </div>
          {totalMatches === 0 ? (
            <div className="calculator-empty-state">
              <CircleHelp size={22} />
              <strong>No calculator matches that phrase.</strong>
              <span>Try a decision such as buying a home, paying off debt, saving for retirement, or estimating tax.</span>
            </div>
          ) : (
            <div className="calculator-card-grid">
              {fireMatches && <FireSearchCard onNavigate={onNavigate} />}
              {visibleCalculators.map((calculator) => (
                <CalculatorSearchCard calculator={calculator} key={calculator.slug} onNavigate={onNavigate} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          <section className="calculator-starting-paths" aria-labelledby="starting-paths-title">
            <div className="starting-paths-header">
              <p className="eyebrow">Starting paths</p>
              <h2 id="starting-paths-title">Popular decisions to start with</h2>
              <p>Explore high-impact planning questions before diving into specialized toolkits.</p>
            </div>
            <div className="starting-paths-grid">
              {libraryStartingPaths.map((item) => (
                <a
                  key={item.path}
                  href={item.path}
                  className="starting-path-card"
                  onClick={(event) => navigateInternalLink(event, item.path, onNavigate)}
                >
                  <div className="starting-path-head">
                    <span className="starting-path-badge">{item.badge}</span>
                    <ArrowRight size={16} />
                  </div>
                  <span className="starting-path-question">{item.question}</span>
                  <strong className="starting-path-title">{item.title}</strong>
                  <p className="starting-path-description">{item.description}</p>
                </a>
              ))}
            </div>
          </section>

          <div className="calculator-toolkit-grid">
            {calculatorToolkits.map((toolkit) => (
              <CalculatorToolkitPanel key={toolkit.id} onNavigate={onNavigate} region={region} toolkit={toolkit} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}

function FireSearchCard({ onNavigate }: { onNavigate: (route: string) => void }) {
  return (
    <a
      className="calculator-card calculator-card-fire"
      href="/calculators/fire"
      onClick={(event) => navigateInternalLink(event, '/calculators/fire', onNavigate)}
    >
      <span className="calculator-card-meta">Retirement Planning</span>
      <strong>Interactive FIRE Calculator</strong>
      <small>Model required nest egg, target retirement age, sustainable withdrawal rates, and inflation-adjusted cash flows.</small>
      <em>
        Open calculator
        <ArrowRight size={14} />
      </em>
    </a>
  );
}

function CalculatorToolkitPanel({
  onNavigate,
  region = 'all',
  toolkit
}: {
  onNavigate: (route: string) => void;
  region?: RegionFilter;
  toolkit: CalculatorToolkit;
}) {
  const Icon = toolkitIcon(toolkit.icon);
  const inRegion = toolkit.calculators.filter((calculator) => matchesRegion(calculator, region));
  if (inRegion.length === 0) return null;
  const featured = featuredToolkitCalculators(toolkit).filter((calculator) => matchesRegion(calculator, region));
  const remaining = inRegion.filter((calculator) => !toolkit.featuredSlugs.includes(calculator.slug));
  // Calculators that share a formula and region are one row with preset chips, not separate rows.
  const sameEngine = (a: SeoCalculator, b: SeoCalculator) => a.formula === b.formula && a.region === b.region;
  const remainingGroups: Array<{ lead: SeoCalculator; presets: SeoCalculator[] }> = [];
  for (const calculator of remaining) {
    const featuredLead = featured.find((other) => sameEngine(other, calculator));
    const group = remainingGroups.find((entry) => sameEngine(entry.lead, calculator));
    if (group) group.presets.push(calculator);
    else if (featuredLead) remainingGroups.push({ lead: featuredLead, presets: [calculator] });
    else remainingGroups.push({ lead: calculator, presets: [] });
  }
  const listedCount = inRegion.length;

  return (
    <article className={`calculator-toolkit toolkit-${toolkit.id}`} id={`toolkit-${toolkit.id}`}>
      <header>
        <span className="calculator-toolkit-icon"><Icon size={20} /></span>
        <div>
          <span>{toolkit.prompt}</span>
          <h2>{toolkit.title}</h2>
        </div>
        <span className="calculator-toolkit-count">{listedCount}</span>
      </header>
      <p>{toolkit.description}</p>
      <nav className="calculator-toolkit-featured" aria-label={`${toolkit.title} starting points`}>
        {featured.map((calculator, index) => (
          <a
            href={calculatorPath(calculator.slug)}
            key={calculator.slug}
            onClick={(event) => navigateInternalLink(event, calculatorPath(calculator.slug), onNavigate)}
          >
            {index === 0 ? <span className="calculator-featured-tag">Start here</span> : null}
            <strong>{calculator.title}</strong>
            <ArrowRight size={15} />
          </a>
        ))}
      </nav>
      {remaining.length > 0 ? (
        <details className="calculator-toolkit-more">
          <summary>
            View all {listedCount} calculators
            <ChevronDown size={16} />
          </summary>
          <div>
            {remainingGroups.map((group) => (
              <div className="calculator-toolkit-row" key={group.lead.slug}>
                {featured.includes(group.lead) ? (
                  <span className="calculator-toolkit-row-lead">{group.lead.title} presets</span>
                ) : (
                  <a
                    href={calculatorPath(group.lead.slug)}
                    onClick={(event) => navigateInternalLink(event, calculatorPath(group.lead.slug), onNavigate)}
                  >
                    {group.lead.title}
                    <RegionBadge calculator={group.lead} />
                  </a>
                )}
                {group.presets.length > 0 ? (
                  <span className="calculator-toolkit-presets">
                    {group.presets.map((preset) => (
                      <a
                        key={preset.slug}
                        href={calculatorPath(preset.slug)}
                        onClick={(event) => navigateInternalLink(event, calculatorPath(preset.slug), onNavigate)}
                      >
                        {variantLabel(preset)}
                      </a>
                    ))}
                  </span>
                ) : null}
              </div>
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
      <span className="calculator-card-meta">{toolkit.title} · {regionLabel(calculator)}</span>
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
  const { resultRef, revealResult } = useResultReveal();
  const [values, setValues] = useState<Record<string, number>>(
    Object.fromEntries(calculator.inputs.map((input) => [input.key, input.defaultValue]))
  );
  const [rawValues, setRawValues] = useState(() => calculatorRawValues(calculator, defaultCalculatorValues(calculator)));
  const [inputOrigin, setInputOrigin] = useState<CalculatorInputOrigin>('sample');
  const [hasValidResult, setHasValidResult] = useState(true);
  const validation = useMemo(() => validateCalculatorInputs(calculator, rawValues), [calculator, rawValues]);
  const canUseResult = hasValidResult && validation.values !== null;
  const resultState = !hasValidResult ? 'needs-input' : !canUseResult ? 'stale' : inputOrigin === 'sample' ? 'sample' : 'current';
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [lastSavedRoute, setLastSavedRoute] = useState<SeoCalculator['conversionRoute'] | null>(null);
  const [selectedScenarioId, setSelectedScenarioId] = useState<CalculatorScenarioId>('base');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [historicalHysaValue, setHistoricalHysaValue] = useState<number | null>(null);
  const scenarioValues = useMemo(
    () => buildScenarioValues(calculator, values, selectedScenarioId),
    [calculator, selectedScenarioId, values]
  );
  const result = useMemo<CalculatorResult>(() => hasValidResult ? calculateSeoCalculator(calculator, scenarioValues) : { metrics: [], assumptions: [], narrative: 'Finish your inputs to see an estimate.' }, [calculator, scenarioValues, hasValidResult]);
  const scenarios = useMemo(() => hasValidResult ? buildCalculatorScenarios(calculator, values) : [], [calculator, values, hasValidResult]);
  const selectedScenario = scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? scenarios[1];
  const studioMetadata = useMemo(() => getCalculatorStudioMetadata(calculator), [calculator]);
  const studioChart = useMemo(
    () => buildCalculatorStudioChart(calculator, scenarioValues, result),
    [calculator, result, scenarioValues]
  );
  const detailSchedule = useMemo(
    () => hasValidResult ? buildCalculatorDetailSchedule(calculator, scenarioValues, result) : null,
    [calculator, result, scenarioValues, hasValidResult]
  );
  const toolkit = useMemo(() => getCalculatorToolkit(calculator), [calculator]);
  const qualitySpec = useMemo(() => getCalculatorQualitySpec(calculator), [calculator]);
  const inputImpacts = useMemo(
    () => hasValidResult ? buildCalculatorInputImpacts(calculator, scenarioValues) : [],
    [calculator, scenarioValues, hasValidResult]
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

    const incoming = shared?.rawValues ?? (draft ? calculatorRawValues(calculator, draft.rawValues ?? draft.values) : calculatorRawValues(calculator, defaultCalculatorValues(calculator)));
    const checked = validateCalculatorInputs(calculator, incoming);
    const previous = draft && !shared ? validateCalculatorInputs(calculator, calculatorRawValues(calculator, draft.values)).values : null;
    setRawValues(incoming);
    setValues(checked.values ?? previous ?? defaultCalculatorValues(calculator));
    setHasValidResult(Boolean(checked.values ?? previous));
    setInputOrigin(shared ? 'shared' : draft ? draft.inputOrigin ?? 'restored' : 'sample');
    setSelectedScenarioId(shared?.scenarioId ?? draft?.scenarioId ?? 'base');
    setSelectedHistoryId(null);
    setHistoricalHysaValue(null);
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
      values: hasValidResult ? values : {},
      rawValues, inputOrigin
    });
  }, [auth.status, calculator.slug, result, selectedScenarioId, values, rawValues, inputOrigin, hasValidResult]);

  const [openMetricHelp, setOpenMetricHelp] = useState<Record<string, boolean>>({});

  // Raw text is the user's edit, not a request to replace it with zero or a bound.
  const setValue = (input: CalculatorInput, value: string) => {
    const nextRaw = { ...rawValues, [input.key]: value };
    const checked = validateCalculatorInputs(calculator, nextRaw);
    setRawValues(nextRaw);
    setInputOrigin('user');
    if (checked.values) { setValues(checked.values); setHasValidResult(true); }
    setLastSavedRoute(null);
    setSaveMessage('');
    setHistoricalHysaValue(null);
  };
  const loadInputValues = (incoming: Record<string, unknown>, origin: CalculatorInputOrigin) => {
    const raw = calculatorRawValues(calculator, incoming);
    const checked = validateCalculatorInputs(calculator, raw);
    setRawValues(raw); setInputOrigin(origin); setHasValidResult(Boolean(checked.values));
    if (checked.values) setValues(checked.values);
    setSelectedScenarioId('base'); setLastSavedRoute(null);
  };
  const resetExample = () => {
    loadInputValues(defaultCalculatorValues(calculator), 'sample');
    setHistoricalHysaValue(null); setSaveMessage('Example restored. Optional additions are zero.');
  };

  const mainExtraPayment = ['extra-mortgage-payment', 'mortgage-payoff'].includes(calculator.slug);
  const isOptional = (key: string) => optionalCalculatorInputKeys.has(key) && !(mainExtraPayment && key === 'extraMonthlyPayment');
  const standardInputs = calculator.inputs.filter((input) => !isOptional(input.key));
  const housingKeys = new Set(['annualTaxes', 'annualInsurance', 'monthlyHoa']);
  const optionalGroups = [
    { key: 'payments', label: calculator.inputs.some((input) => input.key.startsWith('extra')) ? 'Pay extra' : 'Additional contributions', inputs: calculator.inputs.filter((input) => isOptional(input.key) && !housingKeys.has(input.key)) },
    { key: 'housing', label: 'Include housing costs', inputs: calculator.inputs.filter((input) => housingKeys.has(input.key)) }
  ].filter((group) => group.inputs.length > 0).map((group) => {
    const active = group.inputs.filter((input) => Number(rawValues[input.key]) !== 0 && rawValues[input.key]?.trim() !== '');
    const amounts = active.map((input) => `${input.label}: ${calculatorCurrency(calculator)} ${Number(rawValues[input.key]).toLocaleString()} / ${input.key === 'monthlyHoa' || input.key === 'extraMonthlyPayment' ? 'month' : 'year'}`).join('; ');
    const summary = group.inputs.some((input) => validation.errors[input.key]) ? 'Check the highlighted options' : active.length ? `${active.length} active · ${amounts}` : 'None added · zero to skip';
    return { ...group, id: `options-${calculator.slug}-${group.key}`, summary };
  });
  const renderInput = (input: SeoCalculator['inputs'][number]) => {
    const inputId = `input-${calculator.slug}-${input.key}`;
    const helperId = input.helper ? `helper-${calculator.slug}-${input.key}` : undefined;
    const errorId = `error-${calculator.slug}-${input.key}`;
    const error = validation.errors[input.key];
    return (
      <label className="field" key={input.key} htmlFor={inputId}>
        <span className="calculator-field-label">
          <span>{input.label}</span>
        </span>
        <div className="calculator-input-control">
          {input.type === 'currency' ? <small>{calculatorCurrency(calculator)}</small> : null}
          <input
            id={inputId}
            name={input.key}
            type="text"
            inputMode={(input.min ?? 0) < 0 ? 'text' : 'decimal'}
            value={rawValues[input.key] ?? ''}
            aria-invalid={Boolean(error)}
            onChange={(event) => setValue(input, event.target.value)}
            aria-describedby={[helperId, error ? errorId : null].filter(Boolean).join(' ') || undefined}
          />
          {input.type === 'percent' ? <small>%</small> : null}
          {input.suffix ? <small>{input.suffix}</small> : null}
        </div>
        {error ? <small className="calculator-field-error" id={errorId}>{error}</small> : null}
        {input.helper ? (
          <small className="calculator-field-helper" id={helperId}>
            {input.helper}
          </small>
        ) : null}
      </label>
    );
  };

  const persistSignedOutDraft = () => {
    if (!canUseResult) return;
    writeCalculatorDraft({
      result,
      scenarioId: selectedScenarioId,
      slug: calculator.slug,
      updatedAt: new Date().toISOString(),
      values, rawValues, inputOrigin
    });
  };

  const saveResult = async () => {
    if (!canUseResult) return;
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
    loadInputValues(saved.inputValues, 'saved');
    setSelectedScenarioId('base');
    setSelectedHistoryId(saved.id);
    setHistoricalHysaValue(calculator.slug === 'hysa' && !saved.result.assumptions?.includes(HYSA_APY_ASSUMPTION)
      ? saved.result.metrics[0]?.value ?? null : null);
    setLastSavedRoute(null);
    setSaveMessage(`Loaded the saved ${new Date(saved.createdAt).toLocaleDateString()} inputs. Current edits were replaced.`);
  };

  const copyShareLink = async () => {
    if (!canUseResult) return;
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
    if (!canUseResult) return;
    const csv = buildCalculatorSummaryCsv(calculator, scenarios, selectedScenarioId, inputImpacts);
    downloadText(`${calculator.slug}-scenario-summary.csv`, csv, 'text/csv;charset=utf-8;');
    setSaveMessage('Scenario summary exported as CSV.');
  };

  return (
    <section className="calculator-library calculator-detail route-shell" aria-labelledby="calculator-detail-title">
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">{toolkit.title} <RegionBadge calculator={calculator} /></p>
        <h1 id="calculator-detail-title">{calculator.h1}</h1>
        <p className="calculator-scope-note">{calculator.description}</p>
        <a
          className="calculator-toolkit-backlink"
          href="/calculators"
          onClick={(event) => navigateInternalLink(event, '/calculators', onNavigate)}
        >
          <ArrowRight size={15} />
          Explore the {toolkit.title} toolkit
        </a>
      </div>

      <div className="calculator-detail-grid">
        <section className="calculator-input-panel" aria-label={`${calculator.title} inputs`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Inputs</p>
              <h2>Run the estimate</h2>
            </div>
            <button className="secondary-button" type="button" onClick={resetExample}>Reset to example</button>
          </div>
          <EstimateCustomization groups={optionalGroups} />
          {optionalGroups.some((group) => group.key === 'housing') ? <p className="calculator-cost-scope">Principal and interest are the base payment. Housing costs are excluded until entered below; extra payments reduce the loan separately.</p> : null}
          <div className="calculator-input-grid">
            {standardInputs.map(renderInput)}
          </div>
          {optionalGroups.map((group) => (
            <details className="calculator-options-shell" id={group.id} key={group.id}>
              <summary><span><strong>{group.label}</strong><small>{group.summary}</small></span><ChevronDown size={17} /></summary>
              <div className="calculator-input-grid calculator-options-grid">{group.inputs.map(renderInput)}</div>
            </details>
          ))}
          <CalculatorResultAction disabled={!canUseResult} onReveal={revealResult} />
          <CalculatorScenarioPanel
            disabled={!canUseResult}
            scenarios={scenarios}
            selectedScenarioId={selectedScenarioId}
            onSelectScenario={(id) => { if (!canUseResult) return; setSelectedScenarioId(id); setHistoricalHysaValue(null); revealResult(); }}
            calculator={calculator}
            focus={studioMetadata.scenarioFocus}
          />
        </section>

        <section ref={resultRef} tabIndex={-1} className="calculator-result-panel" aria-label={`${calculator.title} result`}>
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Result</p>
              <h2>{result.metrics[0]?.label ?? 'Estimate'}</h2>
            </div>
          </div>
          <div className={`calculator-result-state state-${resultState}`} role="status" data-result-state={resultState}>
            <strong>{resultState === 'sample' ? 'Sample estimate' : resultState === 'stale' ? 'Previous result — finish your inputs to update' : resultState === 'needs-input' ? 'Finish your inputs to see an estimate' : 'Your inputs'}</strong>
            {resultState === 'sample' ? <small>These are example numbers. Change them to match your decision.</small> : null}
            {resultState === 'stale' || resultState === 'needs-input' ? <small>Check the highlighted fields. Saving, sharing and exports are paused.</small> : null}
          </div>
          {historicalHysaValue !== null && hasValidResult ? (
            <p className="calculator-result-narrative" role="status" data-hysa-correction>
              Recalculated with corrected APY. Old saved estimate: {formatMetric({ label: 'Saved', value: historicalHysaValue, valueType: 'currency' }, calculator)}.
              {' '}Current corrected estimate: {formatMetric(result.metrics[0], calculator)}.
              {' '}Difference: {formatMetric({ label: 'Difference', value: result.metrics[0].value - historicalHysaValue, valueType: 'currency' }, calculator)}.
              {' '}The saved snapshot is unchanged. Save explicitly to keep a new result.
            </p>
          ) : null}
          <div className="calculator-result-metrics">
            {result.metrics.map((metric, index) => {
              const isPrimary = index === 0;
              const helpId = `metric-help-${calculator.slug}-${index}`;
              const isHelpOpen = Boolean(openMetricHelp[metric.label]);
              return (
                <article
                  className={`calculator-result-metric metric-${metric.tone ?? 'neutral'}${isPrimary ? ' calculator-result-metric-primary' : ''}`}
                  key={metric.label}
                >
                  <span className="calculator-metric-label">
                    <span>{metric.label}</span>
                    <button
                      type="button"
                      className="calculator-help-btn"
                      aria-expanded={isHelpOpen}
                      aria-controls={helpId}
                      aria-label={`About ${metric.label}`}
                      onClick={() =>
                        setOpenMetricHelp((prev) => ({
                          ...prev,
                          [metric.label]: !prev[metric.label]
                        }))
                      }
                    >
                      <CircleHelp size={14} />
                    </button>
                  </span>
                  <strong>{formatMetric(metric, calculator)}</strong>
                  {isHelpOpen ? (
                    <p id={helpId} className="calculator-metric-help-text" role="region">
                      {metricDescription(metric)}
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
          <VariantChips calculator={calculator} onNavigate={onNavigate} />
          {hasValidResult && studioChart.entries.length > 0 ? <CalculatorStudioVisual calculator={calculator} chart={studioChart} metrics={result.metrics} /> : null}
          <CalculatorSchedulePanel calculator={calculator} schedule={detailSchedule} disabled={!canUseResult} />
          <p className="calculator-result-narrative">{result.narrative}</p>
          <div className="calculator-conversion-panel">
            <span className="feature-icon"><ConversionIcon size={18} /></span>
            <div>
              <strong>{calculator.conversionLabel}</strong>
              <small>Use this estimate as the first step, then track progress inside FinPath.</small>
            </div>
            {auth.status === 'signed-in' ? (
              <button className="primary-button icon-text-button" disabled={isSaving || !canUseResult} type="button" onClick={saveResult}>
                {isSaving ? 'Saving' : 'Save result'}
                <ArrowRight size={16} />
              </button>
            ) : auth.status === 'not-configured' ? (
              <button className="primary-button icon-text-button" disabled={!canUseResult} type="button" onClick={() => {
                if (!canUseResult) return;
                persistSignedOutDraft();
                onNavigate(calculator.conversionRoute);
              }}>
                Continue
                <ArrowRight size={16} />
              </button>
            ) : (
              <SignUpIntent mode="modal">
                <button className="primary-button icon-text-button" disabled={!canUseResult} type="button" onClick={persistSignedOutDraft}>
                  Create account to save
                  <ArrowRight size={16} />
                </button>
              </SignUpIntent>
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

      <section className="calculator-methodology-panel" aria-label={`${calculator.title} methodology and context`}>
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
          <p>{result.narrative} The supporting tiles explain the {selectedScenario?.label.toLowerCase() ?? 'previous'} estimate and show the inputs that matter most.</p>
        </article>
      </section>

      <CalculatorEngagementPanel
        disabled={!canUseResult}
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
          setHistoricalHysaValue(null);
          loadInputValues(exampleValues, 'sample');
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
  disabled = false,
  schedule
}: {
  calculator: SeoCalculator;
  schedule: CalculatorDetailSchedule | null;
  disabled?: boolean;
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
              disabled={disabled}
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
  disabled = false,
  calculator,
  focus,
  onSelectScenario,
  scenarios,
  selectedScenarioId
}: {
  disabled?: boolean;
  calculator: SeoCalculator;
  focus: string;
  onSelectScenario: (scenarioId: CalculatorScenarioId) => void;
  scenarios: CalculatorScenario[];
  selectedScenarioId: CalculatorScenarioId;
}) {
  const selected = scenarios.find((scenario) => scenario.id === selectedScenarioId);
  const base = scenarios.find((scenario) => scenario.id === 'base');
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
            className={`calculator-scenario-tab${scenario.id === selectedScenarioId ? ' is-active' : ''}`}
            key={scenario.id}
            role="tab"
            disabled={disabled}
            type="button"
            onClick={() => onSelectScenario(scenario.id)}
          >
            <span>{scenario.label}</span>
            <small>{formatMetric(scenario.result.metrics[0], calculator)}</small>
          </button>
        ))}
      </div>
      <p>{selected?.description}</p>
      {selected && selected.id !== 'base' && (
        <ul className="calculator-scenario-changes" aria-label={`Inputs changed in the ${selected.label} scenario`}>
          {scenarioChanges(calculator, base, selected).map((change) => (
            <li key={change.key}>
              <span>{change.label}</span>
              <span>
                {change.from} → <strong>{change.to}</strong>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// Every input a scenario moves, with before and after values, so the label is never a mystery.
function scenarioChanges(calculator: SeoCalculator, base: CalculatorScenario | undefined, scenario: CalculatorScenario) {
  return calculator.inputs
    .filter((input) => Math.abs((scenario.values[input.key] ?? 0) - (base?.values[input.key] ?? 0)) > 1e-9)
    .map((input) => ({
      from: formatInputValue(input, base?.values[input.key] ?? 0, calculator),
      key: input.key,
      label: input.label,
      to: formatInputValue(input, scenario.values[input.key] ?? 0, calculator)
    }));
}

function formatInputValue(input: CalculatorInput, value: number, calculator: SeoCalculator): string {
  if (input.type === 'currency') return formatMetric({ label: input.label, value, valueType: 'currency' }, calculator);
  if (input.type === 'percent') return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}${input.suffix ? ` ${input.suffix}` : ''}`;
}

function CalculatorEngagementPanel({
  disabled = false,
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
  disabled?: boolean;
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
            <button className="secondary-button icon-text-button" type="button" disabled={disabled} onClick={onCopyShareLink}>
              <Copy size={15} />
              Copy link
            </button>
            <button className="secondary-button icon-text-button" type="button" disabled={disabled} onClick={onExportSummary}>
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
          {disabled ? <p>Previous scenarios — finish your inputs to update.</p> : null}
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
                    <span>{disabled ? 'Previous result' : 'Current'}</span>
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

export function CalculatorStudioVisual({
  calculator,
  chart
}: {
  calculator: SeoCalculator;
  chart: CalculatorStudioChart;
  metrics?: CalculatorMetric[];
}) {
  const allValues = chart.entries.flatMap((entry) => [
    entry.primary,
    ...(entry.secondary !== undefined ? [entry.secondary] : [])
  ]);

  const minVal = Math.min(0, ...allValues);
  const maxVal = Math.max(0, ...allValues);
  const span = maxVal - minVal === 0 ? 1 : maxVal - minVal;
  const hasNegative = minVal < 0;
  const zeroBaselinePct = hasNegative ? (-minVal / span) * 100 : 0;

  const computeBarStyle = (value: number) => {
    if (value === 0) {
      return { width: '0%', left: `${zeroBaselinePct}%` };
    }

    if (value > 0) {
      if (hasNegative) {
        const widthPct = Math.min(100 - zeroBaselinePct, (value / span) * 100);
        return {
          width: `${widthPct}%`,
          left: `${zeroBaselinePct}%`
        };
      }
      const widthPct = Math.min(100, (value / (maxVal || 1)) * 100);
      return {
        width: `${widthPct}%`,
        left: '0%'
      };
    }

    // value < 0
    const widthPct = Math.min(zeroBaselinePct, (Math.abs(value) / span) * 100);
    const leftPct = zeroBaselinePct - widthPct;
    return {
      width: `${widthPct}%`,
      left: `${leftPct}%`
    };
  };

  return (
    <div className={`calculator-visual-panel visual-${chart.type}`} aria-label={`${calculator.title} visual summary`}>
      <div>
        <p className="eyebrow">Visual read</p>
        <strong>{chart.title}</strong>
        <small>{chart.description}</small>
      </div>

      <div className="calculator-studio-chart" aria-label={chart.summary}>
        {chart.entries.map((entry, entryIndex) => {
          const entryValueType = entry.valueType ?? chart.valueType;
          const entryCurrency = entry.currency ?? chart.currency;
          const primaryStyle = computeBarStyle(entry.primary);
          const secondaryStyle = entry.secondary !== undefined ? computeBarStyle(entry.secondary) : null;
          const isNegative = entry.primary < 0 || (entry.secondary !== undefined && entry.secondary < 0);

          return (
            <div
              className={`calculator-studio-chart-row${isNegative ? ' is-negative' : ''}`}
              key={`${entry.label}-${entryIndex}`}
            >
              <div className="calculator-chart-row-header">
                <span className="calculator-chart-row-label">{entry.label}</span>
                <div className="calculator-chart-values-group">
                  <span className="calculator-chart-val primary-val">
                    {chart.legend.secondary ? <span className="sr-only">{chart.legend.primary}: </span> : null}
                    <strong>{formatChartValue(entry.primary, calculator, entryValueType, entryCurrency)}</strong>
                  </span>
                  {entry.secondary !== undefined ? (
                    <span className="calculator-chart-val secondary-val">
                      <span className="sr-only">{chart.legend.secondary}: </span>
                      <strong>{formatChartValue(entry.secondary, calculator, entryValueType, entryCurrency)}</strong>
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="calculator-chart-tracks">
                <div className="calculator-visual-track" aria-hidden="true">
                  {hasNegative ? (
                    <span className="calculator-chart-baseline" style={{ left: `${zeroBaselinePct}%` }} />
                  ) : null}
                  {entry.primary === 0 ? (
                    <span className="calculator-zero-marker" style={{ left: `${zeroBaselinePct}%` }} />
                  ) : null}
                  <span
                    className={`calculator-visual-fill metric-${entry.tone ?? 'neutral'}${entry.primary < 0 ? ' is-negative' : ''}`}
                    style={primaryStyle}
                  />
                </div>
                {entry.secondary !== undefined && secondaryStyle ? (
                  <div className="calculator-visual-track secondary-track" aria-hidden="true">
                    {hasNegative ? (
                      <span className="calculator-chart-baseline" style={{ left: `${zeroBaselinePct}%` }} />
                    ) : null}
                    {entry.secondary === 0 ? (
                      <span className="calculator-zero-marker" style={{ left: `${zeroBaselinePct}%` }} />
                    ) : null}
                    <span
                      className={`calculator-visual-fill metric-neutral${entry.secondary < 0 ? ' is-negative' : ''}`}
                      style={secondaryStyle}
                    />
                  </div>
                ) : null}
              </div>
              {entry.note ? <small>{entry.note}</small> : null}
            </div>
          );
        })}
      </div>

      <div className="calculator-chart-legend" role="list" aria-label="Chart series legend">
        <span className="calculator-legend-item" role="listitem">
          <span className="calculator-legend-swatch swatch-primary" aria-hidden="true" />
          <span>{chart.legend.primary}</span>
        </span>
        {chart.legend.secondary ? (
          <span className="calculator-legend-item" role="listitem">
            <span className="calculator-legend-swatch swatch-secondary" aria-hidden="true" />
            <span>{chart.legend.secondary}</span>
          </span>
        ) : null}
      </div>

      <details className="calculator-chart-table-details">
        <summary>
          <span>View chart data as table</span>
        </summary>
        <div className="calculator-chart-table-wrap">
          <table className="calculator-chart-table">
            <caption className="sr-only">{chart.title} data table</caption>
            <thead>
              <tr>
                <th scope="col">Category</th>
                <th scope="col">{chart.legend.primary}</th>
                {chart.legend.secondary ? <th scope="col">{chart.legend.secondary}</th> : null}
                {chart.entries.some((e) => e.note) ? <th scope="col">Note</th> : null}
              </tr>
            </thead>
            <tbody>
              {chart.entries.map((entry, idx) => {
                const entryValueType = entry.valueType ?? chart.valueType;
                const entryCurrency = entry.currency ?? chart.currency;
                return (
                  <tr key={`tbl-${entry.label}-${idx}`}>
                    <th scope="row">{entry.label}</th>
                    <td>{formatChartValue(entry.primary, calculator, entryValueType, entryCurrency)}</td>
                    {chart.legend.secondary ? (
                      <td>{entry.secondary !== undefined ? formatChartValue(entry.secondary, calculator, entryValueType, entryCurrency) : '—'}</td>
                    ) : null}
                    {chart.entries.some((e) => e.note) ? <td>{entry.note ?? ''}</td> : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
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

export function formatChartValue(
  value: number,
  calculator: SeoCalculator,
  valueType?: CalculatorMetric['valueType'],
  currency?: string
): string {
  const effectiveType = valueType ?? (calculator.slug === 'cagr' ? 'percent' : 'currency');
  const effectiveCurrency = currency ?? calculatorCurrency(calculator);

  if (effectiveType === 'currency') {
    return new Intl.NumberFormat(resolveMoneyLocale(effectiveCurrency), {
      currency: effectiveCurrency,
      maximumFractionDigits: 0,
      style: 'currency'
    }).format(value);
  }

  if (effectiveType === 'percent') {
    return `${(value * 100).toLocaleString(undefined, { maximumFractionDigits: 2 })}%`;
  }

  if (effectiveType === 'years') {
    return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })} years`;
  }

  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function formatMetric(metric: CalculatorMetric, calculator: SeoCalculator): string {
  if (metric.valueType === 'currency') {
    return new Intl.NumberFormat(resolveMoneyLocale(calculatorCurrency(calculator)), {
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
    return new Intl.NumberFormat(resolveMoneyLocale(calculatorCurrency(calculator)), {
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
  rawValues?: Record<string, string>;
  inputOrigin?: CalculatorInputOrigin;
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
    (record.rawValues === undefined || (typeof record.rawValues === 'object' && record.rawValues !== null && !Array.isArray(record.rawValues) && Object.values(record.rawValues).every(v => typeof v === 'string'))) &&
    (record.inputOrigin === undefined || ['sample', 'user', 'restored', 'shared', 'saved'].includes(String(record.inputOrigin))) &&
    (record.scenarioId === undefined ||
      record.scenarioId === 'base' ||
      record.scenarioId === 'conservative' ||
      record.scenarioId === 'optimistic')
  );
}
