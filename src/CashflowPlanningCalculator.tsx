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
  TrendingUp,
  WalletCards
} from 'lucide-react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { AuthState } from './auth';
import type {
  CalculatorSaveOutcome,
  CalculatorSaveRequest,
  CalculatorSavedResult
} from './CalculatorLibrary';
import {
  budgetFormulaVersion,
  buildBudgetCsv,
  buildEmergencyFundCsv,
  buildNetWorthCsv,
  calculateBudget,
  calculateEmergencyFund,
  calculateNetWorth,
  defaultBudgetInputs,
  defaultEmergencyFundInputs,
  defaultNetWorthInputs,
  emergencyFundFormulaVersion,
  netWorthFormulaVersion,
  type BreakdownRow,
  type BudgetInputKey,
  type BudgetInputs,
  type BudgetProjection,
  type EmergencyFundInputKey,
  type EmergencyFundInputs,
  type EmergencyFundProjection,
  type IncomeStability,
  type NetWorthInputKey,
  type NetWorthInputs,
  type NetWorthProjection,
  type PlanningValidation
} from './lib/cashflowPlanningCalculators';
import type { CalculatorResult, SeoCalculator } from './lib/seoCalculators';

export type PlanningCurrencyCode = 'AUD' | 'CAD' | 'EUR' | 'GBP' | 'INR' | 'JPY' | 'USD';
export type PlanningLocaleCode = 'auto' | 'de-DE' | 'en-IN' | 'en-US';
export type CashflowSlug = 'budget' | 'emergency-fund' | 'net-worth';

type Props = {
  auth: AuthState;
  calculator: SeoCalculator;
  onNavigate: (route: string) => void;
  onSaveResult: (request: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>;
  savedResults: CalculatorSavedResult[];
};

type RouteDraft<Inputs> = {
  currency: PlanningCurrencyCode;
  formulaVersion: string;
  inputs: Inputs;
  locale: PlanningLocaleCode;
  updatedAt: string;
};

const currencies: PlanningCurrencyCode[] = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];
const locales: PlanningLocaleCode[] = ['auto', 'en-US', 'en-IN', 'de-DE'];
const PlanningCurrencyContext = createContext<PlanningCurrencyCode>('USD');

export function CashflowPlanningCalculator(props: Props) {
  if (props.calculator.slug === 'net-worth') return <NetWorthCalculator {...props} />;
  if (props.calculator.slug === 'budget') return <BudgetCalculator {...props} />;
  return <EmergencyFundCalculator {...props} />;
}

function NetWorthCalculator({ auth, calculator, onNavigate, onSaveResult, savedResults }: Props) {
  const [inputs, setInputs] = useState<NetWorthInputs>(defaultNetWorthInputs);
  const [currency, setCurrency] = useState<PlanningCurrencyCode>('USD');
  const [locale, setLocale] = useState<PlanningLocaleCode>('auto');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const projection = useMemo(() => calculateNetWorth(inputs), [inputs]);
  const resolvedLocale = locale === 'auto' ? undefined : locale;
  const money = useMemo(() => moneyFormatter(currency, resolvedLocale), [currency, resolvedLocale]);
  const history = routeHistory(savedResults, calculator.slug);

  useEffect(() => {
    const restored = restorePlanningState('net-worth', netWorthFormulaVersion, defaultNetWorthInputs);
    if (restored) {
      setInputs(restored.inputs);
      setCurrency(restored.currency);
      setLocale(restored.locale);
      setMessage(restored.source === 'share'
        ? 'Shared balance sheet loaded. Confirm that every balance uses the same snapshot date.'
        : 'Your last browser balance-sheet draft was restored.');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !projection.validation.isValid) return;
    persistDraft('net-worth', {
      currency,
      formulaVersion: netWorthFormulaVersion,
      inputs,
      locale,
      updatedAt: new Date().toISOString()
    });
  }, [currency, hydrated, inputs, locale, projection.validation.isValid]);

  const reset = () => {
    setInputs(defaultNetWorthInputs);
    setCurrency('USD');
    setLocale('auto');
    setMessage('Defaults restored.');
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildPlanningShareUrl('net-worth', netWorthFormulaVersion, inputs, currency, locale));
      setMessage('Share link copied. It contains entered balances only—never linked account data.');
    } catch {
      setMessage('The share link could not be copied in this browser.');
    }
  };

  const exportCsv = () => {
    if (!projection.validation.isValid) return setMessage('Fix the balance-sheet errors before exporting.');
    downloadText('net-worth-balance-sheet.csv', buildNetWorthCsv(projection));
    setMessage('Balance sheet exported as a reconciled CSV.');
  };

  const saveResult = async () => {
    if (!projection.validation.isValid) return setMessage('Fix the balance-sheet errors before saving.');
    if (auth.status !== 'signed-in') return setMessage(auth.status === 'not-configured'
      ? 'Draft saved in this browser. Account features are unavailable on this public-only deployment.'
      : 'Draft saved in this browser. Create an account to keep balance-sheet snapshots in FinPath.');
    setIsSaving(true);
    setMessage('Saving net worth snapshot…');
    try {
      const outcome = await onSaveResult({
        calculator,
        currency,
        result: toNetWorthResult(projection),
        values: { ...inputs, assets: projection.totalAssets, liabilities: projection.totalLiabilities }
      });
      clearDraft('net-worth');
      setMessage(outcome.message);
    } catch {
      setMessage('The net worth snapshot could not be saved. Your browser draft is still available.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSaved = (saved: CalculatorSavedResult) => {
    setInputs(inputsFromSaved(defaultNetWorthInputs, saved.inputValues));
    setDisplayFromSaved(saved, setCurrency);
    setMessage(`Loaded balances saved on ${new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}.`);
  };

  return (
    <PlanningCurrencyContext.Provider value={currency}>
    <FamilyShell
      calculator={calculator}
      description="Build a dated household balance sheet, see what is liquid, and test how asset-value changes affect the snapshot."
      eyebrow="Cashflow & balance sheet"
      faq={[
        ['What value should I use for an asset?', 'Use a reasonable current value as of one snapshot date. For property, vehicles, businesses, or collectibles, document how you estimated the amount.'],
        ['Should I include my home and mortgage?', 'For a household balance sheet, include the home as an asset and the outstanding mortgage as a liability. Specialized legal or accredited-investor definitions can use different exclusions.'],
        ['Why is liquid position different from net worth?', 'Net worth includes every entered asset and liability. This calculator defines liquid position more narrowly as cash plus taxable investments minus credit cards and other short-term liabilities.'],
        ['Does paying debt from savings increase net worth immediately?', 'No. Paying a liability with an existing asset reduces both sides by the same amount before fees, so net worth is initially unchanged even though leverage and cash access change.']
      ]}
      history={<HistoryPanel auth={auth} history={history} onLoad={loadSaved} title="Net worth snapshots" />}
      input={(
        <section className="calculator-input-panel" aria-labelledby="planning-input-title">
          <PanelHeading eyebrow="Balance sheet" title="Enter one dated snapshot" onReset={reset} />
          <PlanningFieldset legend="Assets" note="Use current balances or defensible current values. Optional categories can be zero.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.cashAndBank} fieldKey="cashAndBank" helper="Checking, savings, and cash equivalents available without selling an investment." label="Cash and bank accounts" onChange={(raw) => updateNumber(setInputs, 'cashAndBank', raw)} value={inputs.cashAndBank} />
              <PlanningMoneyField error={projection.validation.errors.taxableInvestments} fieldKey="taxableInvestments" helper="Investments outside retirement accounts, using their current entered value." label="Taxable investments" onChange={(raw) => updateNumber(setInputs, 'taxableInvestments', raw)} value={inputs.taxableInvestments} />
              <PlanningMoneyField error={projection.validation.errors.retirementAccounts} fieldKey="retirementAccounts" helper="Retirement and pension account balances that belong on this household snapshot." label="Retirement accounts" onChange={(raw) => updateNumber(setInputs, 'retirementAccounts', raw)} value={inputs.retirementAccounts} />
              <PlanningMoneyField error={projection.validation.errors.realEstate} fieldKey="realEstate" helper="Estimated current value of owned property; enter the mortgage separately." label="Real estate" onChange={(raw) => updateNumber(setInputs, 'realEstate', raw)} value={inputs.realEstate} />
              <PlanningMoneyField error={projection.validation.errors.vehiclesAndValuables} fieldKey="vehiclesAndValuables" helper="Current resale estimate for vehicles and material valuables you choose to count." label="Vehicles and valuables" onChange={(raw) => updateNumber(setInputs, 'vehiclesAndValuables', raw)} value={inputs.vehiclesAndValuables} />
              <PlanningMoneyField error={projection.validation.errors.otherAssets} fieldKey="otherAssets" helper="Other assets not already counted; avoid double-counting account balances." label="Other assets" onChange={(raw) => updateNumber(setInputs, 'otherAssets', raw)} value={inputs.otherAssets} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <PlanningFieldset legend="Liabilities" note="Enter outstanding balances, not original loan amounts or monthly payments.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.mortgage} fieldKey="mortgage" helper="Outstanding principal on mortgages secured by entered property." label="Mortgage" onChange={(raw) => updateNumber(setInputs, 'mortgage', raw)} value={inputs.mortgage} />
              <PlanningMoneyField error={projection.validation.errors.studentAndPersonalLoans} fieldKey="studentAndPersonalLoans" helper="Outstanding student and unsecured personal-loan balances." label="Student and personal loans" onChange={(raw) => updateNumber(setInputs, 'studentAndPersonalLoans', raw)} value={inputs.studentAndPersonalLoans} />
              <PlanningMoneyField error={projection.validation.errors.vehicleLoans} fieldKey="vehicleLoans" helper="Outstanding vehicle-loan balances; enter vehicle values above." label="Vehicle loans" onChange={(raw) => updateNumber(setInputs, 'vehicleLoans', raw)} value={inputs.vehicleLoans} />
              <PlanningMoneyField error={projection.validation.errors.creditCards} fieldKey="creditCards" helper="Current revolving card balances, not credit limits." label="Credit cards" onChange={(raw) => updateNumber(setInputs, 'creditCards', raw)} value={inputs.creditCards} />
              <PlanningMoneyField error={projection.validation.errors.otherLiabilities} fieldKey="otherLiabilities" helper="Other amounts owed as of the same snapshot date." label="Other liabilities" onChange={(raw) => updateNumber(setInputs, 'otherLiabilities', raw)} value={inputs.otherLiabilities} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <DisplayOptions currency={currency} locale={locale} onCurrency={setCurrency} onLocale={setLocale} />
          <p className="cashflow-convention"><strong>Snapshot rule</strong><span>Every balance should describe the same household, ownership boundary, currency display, and point in time.</span></p>
        </section>
      )}
      result={(
        <section className="calculator-result-panel compound-result-panel" aria-labelledby="planning-result-title">
          <PanelHeading eyebrow="Current position" title="Estimated net worth" badges={['Snapshot', 'Model v2']} />
          {!projection.validation.isValid ? <ValidationSummary validation={projection.validation} /> : (
            <>
              <Headline label="Assets minus liabilities" value={money(projection.netWorth)} detail={`${money(projection.totalAssets)} assets − ${money(projection.totalLiabilities)} liabilities`} tone={projection.netWorth < 0 ? 'warning' : 'positive'} />
              <div className="calculator-result-metrics">
                <ResultMetric help="Sum of every asset category entered above." label="Total assets" value={money(projection.totalAssets)} />
                <ResultMetric help="Sum of every outstanding liability balance entered above." label="Total liabilities" tone="warning" value={money(projection.totalLiabilities)} />
                <ResultMetric help="Cash and bank accounts plus taxable investments. Retirement and property are excluded from this liquidity view." label="Liquid assets" value={money(projection.liquidAssets)} />
                <ResultMetric help="Liquid assets minus credit cards and other short-term liabilities under this calculator’s stated convention." label="Liquid position" tone={projection.liquidPosition < 0 ? 'warning' : 'positive'} value={money(projection.liquidPosition)} />
                <ResultMetric help="Total liabilities divided by total assets. It is unavailable when assets are zero." label="Debt-to-asset ratio" value={projection.debtToAssetRatio === null ? 'Not available' : percent(projection.debtToAssetRatio, resolvedLocale)} />
              </div>
              <BalanceSheetChart money={money} projection={projection} />
              <p className="compound-interpretation">{netWorthInterpretation(projection, money)}</p>
              <Warnings warnings={projection.validation.warnings} />
              <ActionRow auth={auth} isSaving={isSaving} message={message} saveLabel="Save snapshot & add accounts" onCopy={copyShareLink} onExport={exportCsv} onSave={saveResult} />
            </>
          )}
        </section>
      )}
      related={[
        ['/calculators/budget', 'Map the monthly cashflow behind this snapshot', 'Use Budget next.'],
        ['/calculators/emergency-fund', 'Check how much of the liquid position is a reserve', 'Use Emergency Fund.']
      ]}
      onNavigate={onNavigate}
      title="Net Worth Calculator"
    >
      <AnalysisCard summary="Asset and liability categories, exact totals, and valuation sensitivity" title="Balance-sheet audit">
        <BreakdownTable caption="Net worth balance-sheet reconciliation" money={money} assetRows={projection.assetRows} liabilityRows={projection.liabilityRows} projection={projection} />
        <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}><Download size={15} /> Download balance sheet</button>
      </AnalysisCard>
      <AnalysisCard summary="See what a broad change in non-cash asset values would do" title="Valuation sensitivity">
        <ScenarioBars rows={projection.valuationScenarios.map((scenario) => ({ label: scenario.label, value: scenario.netWorth }))} money={money} baseline={projection.netWorth} />
        <p className="cashflow-analysis-note">Cash stays fixed. Every other asset category moves together by ±10%; liabilities do not change. This is sensitivity, not a forecast.</p>
      </AnalysisCard>
      <AnalysisCard summary="Definitions, limitations, and authoritative references" title="Method and sources">
        <div className="compound-methodology">
          <p><strong>Formula.</strong> Net worth = total entered assets − total entered liabilities. No tax, selling cost, debt payoff cost, exchange-rate conversion, or ownership adjustment is inferred.</p>
          <p><strong>Liquidity convention.</strong> Liquid assets are cash/bank balances plus taxable investments. Liquid position subtracts credit cards and other short-term liabilities only.</p>
          <p><strong>Limits.</strong> Business, pension, property, private investment, collectible, and cross-border values can be uncertain. The result is a user-entered snapshot, not an appraisal or statutory net-worth determination.</p>
          <p className="compound-source-date">Sources reviewed August 9, 2026.</p>
          <ul>
            <li><a href="https://files.consumerfinance.gov/f/201504_cfpb_ymyg_toolkit-workers.pdf" target="_blank" rel="noreferrer">CFPB Your Money, Your Goals balance-sheet material</a></li>
            <li><a href="https://www.finra.org/investors/personal-finance/know-your-net-worth" target="_blank" rel="noreferrer">FINRA Financial Foundations: Know Your Net Worth</a></li>
            <li><a href="https://www.investor.gov/introduction-investing/general-resources/news-alerts/alerts-bulletins/investor-bulletins/updated-3" target="_blank" rel="noreferrer">Investor.gov net-worth definition and specialized exclusions</a></li>
          </ul>
        </div>
      </AnalysisCard>
    </FamilyShell>
    </PlanningCurrencyContext.Provider>
  );
}

function BudgetCalculator({ auth, calculator, onNavigate, onSaveResult, savedResults }: Props) {
  const [inputs, setInputs] = useState<BudgetInputs>(defaultBudgetInputs);
  const [currency, setCurrency] = useState<PlanningCurrencyCode>('USD');
  const [locale, setLocale] = useState<PlanningLocaleCode>('auto');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const projection = useMemo(() => calculateBudget(inputs), [inputs]);
  const resolvedLocale = locale === 'auto' ? undefined : locale;
  const money = useMemo(() => moneyFormatter(currency, resolvedLocale), [currency, resolvedLocale]);
  const history = routeHistory(savedResults, calculator.slug);

  useEffect(() => {
    const restored = restorePlanningState('budget', budgetFormulaVersion, defaultBudgetInputs);
    if (restored) {
      setInputs(restored.inputs);
      setCurrency(restored.currency);
      setLocale(restored.locale);
      setMessage(restored.source === 'share' ? 'Shared monthly plan loaded. Review every category.' : 'Your last browser budget draft was restored.');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !projection.validation.isValid) return;
    persistDraft('budget', { currency, formulaVersion: budgetFormulaVersion, inputs, locale, updatedAt: new Date().toISOString() });
  }, [currency, hydrated, inputs, locale, projection.validation.isValid]);

  const reset = () => {
    setInputs(defaultBudgetInputs);
    setCurrency('USD');
    setLocale('auto');
    setMessage('Defaults restored.');
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildPlanningShareUrl('budget', budgetFormulaVersion, inputs, currency, locale));
      setMessage('Share link copied. It contains this monthly plan only—never transaction history.');
    } catch {
      setMessage('The share link could not be copied in this browser.');
    }
  };

  const exportCsv = () => {
    if (!projection.validation.isValid) return setMessage('Fix the budget errors before exporting.');
    downloadText('monthly-budget-plan.csv', buildBudgetCsv(inputs, projection));
    setMessage('Monthly and annual budget values exported as CSV.');
  };

  const saveResult = async () => {
    if (!projection.validation.isValid) return setMessage('Fix the budget errors before saving.');
    if (auth.status !== 'signed-in') return setMessage(auth.status === 'not-configured'
      ? 'Draft saved in this browser. Account features are unavailable on this public-only deployment.'
      : 'Draft saved in this browser. Create an account to keep budget snapshots in FinPath.');
    setIsSaving(true);
    setMessage('Saving budget snapshot…');
    try {
      const outcome = await onSaveResult({ calculator, currency, result: toBudgetResult(projection, inputs), values: { ...inputs, income: projection.totalIncome, expenses: projection.totalSpending } });
      clearDraft('budget');
      setMessage(outcome.message);
    } catch {
      setMessage('The budget snapshot could not be saved. Your browser draft is still available.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSaved = (saved: CalculatorSavedResult) => {
    setInputs(inputsFromSaved(defaultBudgetInputs, saved.inputValues));
    setDisplayFromSaved(saved, setCurrency);
    setMessage(`Loaded the budget saved on ${new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}.`);
  };

  return (
    <PlanningCurrencyContext.Provider value={currency}>
    <FamilyShell
      calculator={calculator}
      description="Turn take-home income into an auditable monthly plan, separate spending from saving, and stress-test the cash left over."
      eyebrow="Cashflow & balance sheet"
      faq={[
        ['Should income be gross or take-home?', 'Use spendable take-home income after tax and payroll deductions. Add irregular income only as a conservative monthly average if it is dependable enough to budget.'],
        ['Is planned saving an expense?', 'It is an allocation of the surplus after entered spending. The calculator keeps spending, planned saving, and still-unassigned cash separate so nothing is counted twice.'],
        ['Is 50/30/20 a rule I must follow?', 'No. It is shown only as an optional reference. Housing costs, dependents, debt, location, income volatility, and priorities can make another allocation more appropriate.'],
        ['Why compare an income shock and a flexible-spending trim?', 'They answer two different questions: whether the current essentials survive lower income, and how much discretionary changes could improve the monthly margin.']
      ]}
      history={<HistoryPanel auth={auth} history={history} onLoad={loadSaved} title="Budget snapshots" />}
      input={(
        <section className="calculator-input-panel" aria-labelledby="planning-input-title">
          <PanelHeading eyebrow="Monthly plan" title="Map income and outgoings" onReset={reset} />
          <PlanningFieldset legend="Income" note="Use monthly take-home amounts after tax and payroll deductions.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.takeHomePay} fieldKey="takeHomePay" helper="Regular household take-home pay available to spend or save each month." label="Take-home pay" onChange={(raw) => updateNumber(setInputs, 'takeHomePay', raw)} value={inputs.takeHomePay} />
              <PlanningMoneyField error={projection.validation.errors.otherIncome} fieldKey="otherIncome" helper="Reliable monthly average of other spendable income." label="Other monthly income" onChange={(raw) => updateNumber(setInputs, 'otherIncome', raw)} value={inputs.otherIncome} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <PlanningFieldset legend="Needs and commitments" note="Amounts are monthly. Use a monthly average for bills paid less often.">
            <PlanningMoneyGrid>
              {budgetMoneyFields(inputs, projection, setInputs).slice(0, 7)}
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <PlanningFieldset legend="Flexible spending" note="These labels are planning buckets; reclassify amounts to match your household.">
            <PlanningMoneyGrid>
              {budgetMoneyFields(inputs, projection, setInputs).slice(7)}
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <PlanningFieldset legend="Savings allocation" note="This assigns part of the surplus; it does not reduce the reported spending surplus.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.plannedSavings} fieldKey="plannedSavings" helper="Amount you intend to transfer to savings, investing, or extra debt payoff each month." label="Planned monthly saving" onChange={(raw) => updateNumber(setInputs, 'plannedSavings', raw)} value={inputs.plannedSavings} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <details className="compound-disclosure calculator-options-shell">
            <summary><span><strong>Advanced comparisons</strong><small>Reference rate, income shock, flexible-spending trim, and display</small></span><ChevronDown size={17} /></summary>
            <div className="compound-advanced-body">
              <PlanningMoneyGrid>
                <PlanningNumberField error={projection.validation.errors.targetSavingsRatePercent} fieldKey="targetSavingsRatePercent" helper="Optional reference only; it never changes your entered plan." label="Savings-rate reference" max={100} onChange={(raw) => updateNumber(setInputs, 'targetSavingsRatePercent', raw)} suffix="%" value={inputs.targetSavingsRatePercent} />
                <PlanningNumberField error={projection.validation.errors.incomeShockPercent} fieldKey="incomeShockPercent" helper="Reduces income in the stress comparison while spending stays unchanged." label="Income-shock comparison" max={100} onChange={(raw) => updateNumber(setInputs, 'incomeShockPercent', raw)} suffix="%" value={inputs.incomeShockPercent} />
                <PlanningNumberField error={projection.validation.errors.flexibleCutPercent} fieldKey="flexibleCutPercent" helper="Reduces only lifestyle, subscriptions, and other flexible spending." label="Flexible-spending trim" max={100} onChange={(raw) => updateNumber(setInputs, 'flexibleCutPercent', raw)} suffix="%" value={inputs.flexibleCutPercent} />
              </PlanningMoneyGrid>
              <DisplayFields currency={currency} locale={locale} onCurrency={setCurrency} onLocale={setLocale} />
            </div>
          </details>
          <p className="cashflow-convention"><strong>Monthly convention</strong><span>The same monthly amounts repeat for the 12-month pace. No inflation, tax estimate, or transaction timing is inferred.</span></p>
        </section>
      )}
      result={(
        <section className="calculator-result-panel compound-result-panel" aria-labelledby="planning-result-title">
          <PanelHeading eyebrow="Cashflow result" title="Monthly surplus" badges={['Before savings allocation', 'Model v2']} />
          {!projection.validation.isValid ? <ValidationSummary validation={projection.validation} /> : (
            <>
              <Headline label="Income minus entered spending" value={money(projection.monthlySurplus)} detail={`${money(projection.totalIncome)} income − ${money(projection.totalSpending)} spending`} tone={projection.monthlySurplus < 0 ? 'warning' : 'positive'} />
              <div className="calculator-result-metrics">
                <ResultMetric help="Monthly needs and commitments plus flexible spending." label="Monthly spending" value={money(projection.totalSpending)} />
                <ResultMetric help="The entered amount intentionally assigned to saving, investing, or extra debt payoff." label="Planned saving" value={money(inputs.plannedSavings)} />
                <ResultMetric help="Surplus before planned saving, divided by take-home and other entered income." label="Savings capacity rate" value={projection.savingsCapacityRate === null ? 'Not available' : percent(projection.savingsCapacityRate, resolvedLocale)} />
                <ResultMetric help="Cash left after entered spending and the planned savings allocation. A negative number means the allocation is not funded by this plan." label="Still unassigned" tone={projection.unassignedAfterPlan < 0 ? 'warning' : 'positive'} value={money(projection.unassignedAfterPlan)} />
                <ResultMetric help="The current monthly surplus repeated for 12 months; it is a constant-plan pace, not actual future activity." label="Annual surplus pace" tone={projection.annualSurplus < 0 ? 'warning' : 'positive'} value={money(projection.annualSurplus)} />
              </div>
              <BudgetWaterfall money={money} projection={projection} />
              <p className="compound-interpretation">{budgetInterpretation(projection, inputs, money, resolvedLocale)}</p>
              <Warnings warnings={projection.validation.warnings} />
              <ActionRow auth={auth} isSaving={isSaving} message={message} saveLabel="Save budget snapshot" onCopy={copyShareLink} onExport={exportCsv} onSave={saveResult} />
            </>
          )}
        </section>
      )}
      related={[
        ['/calculators/emergency-fund', 'Turn essential spending into a reserve target', 'Use Emergency Fund next.'],
        ['/transactions', 'Compare this estimate with recorded transactions', 'Open Transactions.']
      ]}
      onNavigate={onNavigate}
      title="Budget Calculator"
    >
      <AnalysisCard summary="Every entered category, monthly total, and annual pace" title="Category audit">
        <BudgetTable inputs={inputs} money={money} projection={projection} />
        <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}><Download size={15} /> Download budget CSV</button>
      </AnalysisCard>
      <AnalysisCard summary="Current plan, income shock, and flexible-spending comparison" title="Cashflow stress checks">
        <ScenarioBars rows={projection.scenarios.map((scenario) => ({ label: scenario.label, value: scenario.monthlySurplus }))} money={money} baseline={projection.monthlySurplus} />
        <div className="cashflow-reference-grid">
          <ReferenceRead label="Needs reference (50%)" actual={projection.monthlyNeeds} reference={projection.referenceNeeds} money={money} />
          <ReferenceRead label="Wants reference (30%)" actual={projection.monthlyWants} reference={projection.referenceWants} money={money} />
          <ReferenceRead label={`Savings reference (${inputs.targetSavingsRatePercent}%)`} actual={projection.monthlySurplus} reference={projection.referenceSavings} money={money} />
        </div>
        <p className="cashflow-analysis-note">These percentages are orientation points, not limits or personalized recommendations. Your entered plan remains the calculation source.</p>
      </AnalysisCard>
      <AnalysisCard summary="Twelve repeated months under the current constant plan" title="12-month allocation pace">
        <BudgetPaceTable money={money} projection={projection} />
      </AnalysisCard>
      <AnalysisCard summary="Definitions, limitations, and authoritative references" title="Method and sources">
        <div className="compound-methodology">
          <p><strong>Formula.</strong> Monthly surplus = take-home and other income − entered needs − entered flexible spending. Planned saving is then allocated from that surplus.</p>
          <p><strong>Reference.</strong> The 50/30/20 display compares needs, wants, and saving capacity with a common rule of thumb. CFPB material explicitly encourages adapting a personal spending rule.</p>
          <p><strong>Limits.</strong> The calculator does not import transactions, model intra-month bill timing, estimate tax, or decide which category is necessary for your household.</p>
          <p className="compound-source-date">Sources reviewed August 9, 2026.</p>
          <ul>
            <li><a href="https://consumer.gov/your-money/making-budget" target="_blank" rel="noreferrer">Consumer.gov: Making a Budget</a></li>
            <li><a href="https://www.consumerfinance.gov/documents/10038/cfpb_creating-cash-flow-budget_tool_2021-08.pdf" target="_blank" rel="noreferrer">CFPB: Creating a cash flow budget</a></li>
            <li><a href="https://files.consumerfinance.gov/f/documents/cfpb_worksheet_my-spending-rule-to-live-by.pdf" target="_blank" rel="noreferrer">CFPB: My spending rule to live by</a></li>
            <li><a href="https://moneysmart.gov.au/budgeting/budget-planner" target="_blank" rel="noreferrer">ASIC Moneysmart Budget Planner</a></li>
          </ul>
        </div>
      </AnalysisCard>
    </FamilyShell>
    </PlanningCurrencyContext.Provider>
  );
}

function EmergencyFundCalculator({ auth, calculator, onNavigate, onSaveResult, savedResults }: Props) {
  const [inputs, setInputs] = useState<EmergencyFundInputs>(defaultEmergencyFundInputs);
  const [currency, setCurrency] = useState<PlanningCurrencyCode>('USD');
  const [locale, setLocale] = useState<PlanningLocaleCode>('auto');
  const [message, setMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const projection = useMemo(() => calculateEmergencyFund(inputs), [inputs]);
  const resolvedLocale = locale === 'auto' ? undefined : locale;
  const money = useMemo(() => moneyFormatter(currency, resolvedLocale), [currency, resolvedLocale]);
  const history = routeHistory(savedResults, calculator.slug);

  useEffect(() => {
    const restored = restoreEmergencyState();
    if (restored) {
      setInputs(restored.inputs);
      setCurrency(restored.currency);
      setLocale(restored.locale);
      setMessage(restored.source === 'share' ? 'Shared reserve plan loaded. Review the liquidity and coverage assumptions.' : 'Your last browser reserve draft was restored.');
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !projection.validation.isValid) return;
    persistDraft('emergency-fund', { currency, formulaVersion: emergencyFundFormulaVersion, inputs, locale, updatedAt: new Date().toISOString() });
  }, [currency, hydrated, inputs, locale, projection.validation.isValid]);

  const reset = () => {
    setInputs(defaultEmergencyFundInputs);
    setCurrency('USD');
    setLocale('auto');
    setMessage('Defaults restored.');
  };

  const copyShareLink = async () => {
    try {
      await copyText(buildPlanningShareUrl('emergency-fund', emergencyFundFormulaVersion, inputs, currency, locale));
      setMessage('Share link copied. It contains this reserve plan only—never linked account data.');
    } catch {
      setMessage('The share link could not be copied in this browser.');
    }
  };

  const exportCsv = () => {
    if (!projection.validation.isValid) return setMessage('Fix the reserve-plan errors before exporting.');
    downloadText('emergency-fund-schedule.csv', buildEmergencyFundCsv(projection));
    setMessage('Emergency-fund schedule exported as CSV.');
  };

  const saveResult = async () => {
    if (!projection.validation.isValid) return setMessage('Fix the reserve-plan errors before saving.');
    if (currency !== 'USD') return setMessage('Share and export work in this currency, but the Goal workspace currently stores USD only. Switch to USD before creating a Goal.');
    if (auth.status !== 'signed-in') return setMessage(auth.status === 'not-configured'
      ? 'Draft saved in this browser. Account features are unavailable on this public-only deployment.'
      : 'Draft saved in this browser. Create an account to keep emergency-fund plans in FinPath.');
    setIsSaving(true);
    setMessage('Saving emergency-fund plan…');
    try {
      const outcome = await onSaveResult({
        calculator,
        currency,
        result: toEmergencyFundResult(projection, inputs),
        values: { ...numericEmergencyInputs(inputs), currentSavings: projection.currentReserve, target: projection.selectedTarget, years: projection.monthsToGoal === null ? 0 : projection.monthsToGoal / 12 }
      });
      clearDraft('emergency-fund');
      setMessage(outcome.message);
    } catch {
      setMessage('The emergency-fund plan could not be saved. Your browser draft is still available.');
    } finally {
      setIsSaving(false);
    }
  };

  const loadSaved = (saved: CalculatorSavedResult) => {
    const numeric = inputsFromSaved(numericEmergencyInputs(defaultEmergencyFundInputs), saved.inputValues);
    setInputs((current) => ({ ...current, ...numeric }));
    setDisplayFromSaved(saved, setCurrency);
    setMessage(`Loaded the reserve plan saved on ${new Date(saved.createdAt).toLocaleDateString(resolvedLocale)}.`);
  };

  return (
    <PlanningCurrencyContext.Provider value={currency}>
    <FamilyShell
      calculator={calculator}
      description="Size a liquid reserve from essential spending, see current runway, and build a transparent month-by-month funding path."
      eyebrow="Cashflow & balance sheet"
      faq={[
        ['How many months should I choose?', 'There is no universal answer. CFPB says the amount depends on your situation, while other official guidance commonly discusses three to six months or at least six months. Use a period you can explain and revisit.'],
        ['What belongs in essential monthly spending?', 'Include the costs you would still need during an interruption: housing, utilities, basic food, transport, insurance, minimum debt payments, and essential care. Exclude ordinary discretionary spending.'],
        ['Can I count investments?', 'Only count assets you are genuinely willing and able to access. Market-exposed assets can fall or take time to sell; this calculator uses the entered value without a haircut and warns when they are included.'],
        ['Does the funding schedule include interest?', 'No. It is intentionally transparent: current reserve plus entered monthly contributions until the selected target is reached. Use Savings Goal for a return-bearing projection.']
      ]}
      history={<HistoryPanel auth={auth} history={history} onLoad={loadSaved} title="Emergency-fund plans" />}
      input={(
        <section className="calculator-input-panel" aria-labelledby="planning-input-title">
          <PanelHeading eyebrow="Reserve plan" title="Set spending, liquidity, and coverage" onReset={reset} />
          <PlanningFieldset legend="Essential spending and coverage" note="Use the monthly costs that would continue during an income interruption.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.monthlyEssentials} fieldKey="monthlyEssentials" helper="Housing, basic food, utilities, transport, insurance, minimum debt payments, and essential care." label="Essential monthly spending" onChange={(raw) => updateNumber(setInputs, 'monthlyEssentials', raw)} value={inputs.monthlyEssentials} />
              <PlanningNumberField error={projection.validation.errors.targetMonths} fieldKey="targetMonths" helper="Your selected planning period. Compare it with the references in Expert Analysis." label="Target coverage" max={24} min={0.5} onChange={(raw) => updateNumber(setInputs, 'targetMonths', raw)} step={0.5} suffix="months" value={inputs.targetMonths} />
              <PlanningMoneyField error={projection.validation.errors.monthlyContribution} fieldKey="monthlyContribution" helper="Amount added each month; no interest or investment return is assumed." label="Monthly reserve contribution" onChange={(raw) => updateNumber(setInputs, 'monthlyContribution', raw)} value={inputs.monthlyContribution} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <PlanningFieldset legend="Current liquid reserve" note="Keep liquidity tiers separate so the headline does not hide access risk.">
            <PlanningMoneyGrid>
              <PlanningMoneyField error={projection.validation.errors.cashOnHand} fieldKey="cashOnHand" helper="Physical cash or immediately spendable checking balance set aside for emergencies." label="Cash on hand" onChange={(raw) => updateNumber(setInputs, 'cashOnHand', raw)} value={inputs.cashOnHand} />
              <PlanningMoneyField error={projection.validation.errors.bankSavings} fieldKey="bankSavings" helper="Dedicated bank or credit-union savings available without selling an investment." label="Bank savings" onChange={(raw) => updateNumber(setInputs, 'bankSavings', raw)} value={inputs.bankSavings} />
              <PlanningMoneyField error={projection.validation.errors.shortTermDeposits} fieldKey="shortTermDeposits" helper="Short-term deposits you can access; review early-withdrawal penalties separately." label="Short-term deposits" onChange={(raw) => updateNumber(setInputs, 'shortTermDeposits', raw)} value={inputs.shortTermDeposits} />
              <PlanningMoneyField error={projection.validation.errors.accessibleInvestments} fieldKey="accessibleInvestments" helper="Non-retirement investments you would actually use. Market-value and sale-timing risk remain." label="Accessible investments" onChange={(raw) => updateNumber(setInputs, 'accessibleInvestments', raw)} value={inputs.accessibleInvestments} />
            </PlanningMoneyGrid>
          </PlanningFieldset>
          <details className="compound-disclosure calculator-options-shell">
            <summary><span><strong>Advanced risk context</strong><small>One-time shock buffer, income pattern, household support, and display</small></span><ChevronDown size={17} /></summary>
            <div className="compound-advanced-body">
              <PlanningMoneyGrid>
                <PlanningMoneyField error={projection.validation.errors.oneTimeBuffer} fieldKey="oneTimeBuffer" helper="Optional separate amount for a likely deductible, repair, travel, or other one-time shock." label="One-time shock buffer" onChange={(raw) => updateNumber(setInputs, 'oneTimeBuffer', raw)} value={inputs.oneTimeBuffer} />
                <PlanningSelectField fieldKey="incomeStability" helper="Used only in the labeled risk-reference comparison; it does not overwrite your selected months." label="Income pattern" onChange={(value) => setInputs((current) => ({ ...current, incomeStability: value as IncomeStability }))} options={[['Stable', 'stable'], ['Variable', 'variable'], ['Currently uncertain', 'uncertain']]} value={inputs.incomeStability} />
                <PlanningSelectField fieldKey="householdEarners" helper="Two-plus earners can diversify income interruption risk; actual income dependence may differ." label="Household income earners" onChange={(value) => setInputs((current) => ({ ...current, householdEarners: Number(value) as 1 | 2 }))} options={[['One', 1], ['Two or more', 2]]} value={inputs.householdEarners} />
                <PlanningNumberField error={projection.validation.errors.dependents} fieldKey="dependents" helper="People whose essential costs rely materially on this household income." label="Financial dependents" max={20} onChange={(raw) => updateNumber(setInputs, 'dependents', raw)} step={1} value={inputs.dependents} />
              </PlanningMoneyGrid>
              <DisplayFields currency={currency} locale={locale} onCurrency={setCurrency} onLocale={setLocale} />
            </div>
          </details>
          <p className="cashflow-convention"><strong>Funding rule</strong><span>Target = essential monthly spending × selected months + one-time buffer. Current reserve is the sum of the four entered liquidity tiers.</span></p>
        </section>
      )}
      result={(
        <section className="calculator-result-panel compound-result-panel" aria-labelledby="planning-result-title">
          <PanelHeading eyebrow="Reserve target" title="Emergency fund target" badges={[`${inputs.targetMonths} months`, 'Model v2']} />
          {!projection.validation.isValid ? <ValidationSummary validation={projection.validation} /> : (
            <>
              <Headline label="Selected coverage plus one-time buffer" value={money(projection.selectedTarget)} detail={`${money(inputs.monthlyEssentials)} × ${inputs.targetMonths} months${inputs.oneTimeBuffer > 0 ? ` + ${money(inputs.oneTimeBuffer)}` : ''}`} tone={projection.gap > 0 ? 'warning' : 'positive'} />
              <div className="calculator-result-metrics">
                <ResultMetric help="Cash, bank savings, short-term deposits, and entered accessible investments." label="Current liquid reserve" value={money(projection.currentReserve)} />
                <ResultMetric help="Selected target minus current reserve, floored at zero." label="Remaining gap" tone={projection.gap > 0 ? 'warning' : 'positive'} value={money(projection.gap)} />
                <ResultMetric help="Current reserve divided by entered essential monthly spending." label="Current runway" value={projection.monthsOfRunway === null ? 'Not available' : `${number(projection.monthsOfRunway, resolvedLocale, 1)} months`} />
                <ResultMetric help="Straight-line months needed using the entered monthly contribution and no assumed growth." label="Funding time" value={projection.monthsToGoal === null ? 'No funding date' : projection.monthsToGoal === 0 ? 'Target funded' : `${projection.monthsToGoal.toLocaleString(resolvedLocale)} months`} />
                <ResultMetric help="A transparent heuristic using income pattern, number of earners, and dependents. It is a comparison, not advice." label="Risk-based reference" value={`${number(projection.riskReferenceMonths, resolvedLocale, 1)} months · ${money(projection.riskReferenceTarget)}`} />
              </div>
              <EmergencyRunway money={money} projection={projection} />
              <p className="compound-interpretation">{emergencyInterpretation(projection, inputs, money, resolvedLocale)}</p>
              <Warnings warnings={projection.validation.warnings} />
              <ActionRow auth={auth} disabled={currency !== 'USD'} isSaving={isSaving} message={message} saveLabel={currency === 'USD' ? 'Create emergency-fund goal' : 'Use USD to create goal'} onCopy={copyShareLink} onExport={exportCsv} onSave={saveResult} />
            </>
          )}
        </section>
      )}
      related={[
        ['/calculators/budget', 'Refine the essential-spending input', 'Use Budget.'],
        ['/calculators/savings-goal', 'Model a return-bearing funding plan', 'Use Savings Goal.']
      ]}
      onNavigate={onNavigate}
      title="Emergency Fund Calculator"
    >
      <AnalysisCard summary="Compare three months, six months, and the risk-based planning reference" title="Coverage comparisons">
        <ScenarioBars rows={projection.scenarios.map((scenario) => ({ label: `${scenario.label} · ${scenario.months} months`, value: scenario.target }))} money={money} baseline={projection.selectedTarget} />
        <p className="cashflow-analysis-note">The risk-based reference starts at three months, adds two for variable income or four for currently uncertain income, adds one for a one-earner household, and adds half a month per dependent up to two months. It is capped at 12 months and never overrides your choice.</p>
      </AnalysisCard>
      <AnalysisCard summary="Immediate, short-notice, and market-exposed reserve layers" title="Liquidity ladder">
        <LiquidityTable money={money} projection={projection} />
      </AnalysisCard>
      <AnalysisCard summary="Month-by-month deposits with no hidden return assumption" title="Funding schedule">
        <EmergencyScheduleTable money={money} projection={projection} />
        <button className="secondary-button icon-text-button" type="button" onClick={exportCsv}><Download size={15} /> Download funding schedule</button>
      </AnalysisCard>
      <AnalysisCard summary="Definitions, limitations, and authoritative references" title="Method and sources">
        <div className="compound-methodology">
          <p><strong>Target formula.</strong> Essential monthly spending × selected coverage months + the optional one-time shock buffer.</p>
          <p><strong>Funding formula.</strong> Current reserve + fixed monthly contributions. No APY, investment return, tax, or inflation is applied.</p>
          <p><strong>Limits.</strong> Account access, deposit penalties, market losses, job-replacement time, insurance coverage, benefits, credit access, and household support are not guaranteed by the model.</p>
          <p className="compound-source-date">Sources reviewed August 9, 2026.</p>
          <ul>
            <li><a href="https://www.consumerfinance.gov/an-essential-guide-to-building-an-emergency-fund/" target="_blank" rel="noreferrer">CFPB: An essential guide to building an emergency fund</a></li>
            <li><a href="https://www.fdic.gov/consumer-resource-center/2025-01/saving-unexpected-and-your-future" target="_blank" rel="noreferrer">FDIC: Saving for the Unexpected and Your Future</a></li>
            <li><a href="https://www.consumerfinance.gov/owning-a-home/prepare/determine-your-down-payment/" target="_blank" rel="noreferrer">CFPB: Three-to-six-month emergency cushion context</a></li>
            <li><a href="https://ownyourfuture.vanguard.com/content/en/learn/financial-planning/whats-the-right-emergency-savings-amount.html" target="_blank" rel="noreferrer">Vanguard: Spending-shock and income-shock framing</a></li>
          </ul>
        </div>
      </AnalysisCard>
    </FamilyShell>
    </PlanningCurrencyContext.Provider>
  );
}

function FamilyShell({
  calculator,
  children,
  description,
  eyebrow,
  faq,
  history,
  input,
  onNavigate,
  related,
  result,
  title
}: {
  calculator: SeoCalculator;
  children: ReactNode;
  description: string;
  eyebrow: string;
  faq: Array<[string, string]>;
  history: ReactNode;
  input: ReactNode;
  onNavigate: (route: string) => void;
  related: Array<[string, string, string]>;
  result: ReactNode;
  title: string;
}) {
  return (
    <section className="calculator-library calculator-detail compound-calculator cashflow-planning-calculator route-shell" aria-labelledby="calculator-detail-title" data-calculator-slug={calculator.slug}>
      <div className="route-heading calculator-library-heading">
        <p className="eyebrow">{eyebrow}</p>
        <h1 id="calculator-detail-title">{title}</h1>
        <p>{description}</p>
        <a href="/calculators" onClick={(event) => { event.preventDefault(); onNavigate('/calculators'); }}><ArrowRight size={15} /> Explore all calculators</a>
      </div>
      <section className="compound-trust-strip" aria-label="Calculator scope">
        <span><ShieldCheck size={17} /><strong>Public by default</strong><small>No account required</small></span>
        <span><WalletCards size={17} /><strong>Entered data only</strong><small>No account balances imported</small></span>
        <span><Table2 size={17} /><strong>Auditable math</strong><small>Totals and tables reconcile</small></span>
      </section>
      <div className="calculator-detail-grid compound-workspace cashflow-workspace">{input}{result}</div>
      <section className="compound-analysis-section" aria-labelledby="planning-analysis-title">
        <div className="panel-heading"><div><p className="eyebrow">Expert analysis</p><h2 id="planning-analysis-title">Inspect the plan</h2></div><span className="compound-version">Collapsed by default</span></div>
        <div className="compound-analysis-grid">{children}</div>
      </section>
      {history}
      <section className="calculator-faq-section" aria-labelledby="planning-faq-title">
        <div className="section-heading"><p className="eyebrow">Questions answered</p><h2 id="planning-faq-title">How to use this result</h2></div>
        <div className="calculator-faq-grid">{faq.map(([question, answer]) => <article key={question}><strong>{question}</strong><p>{answer}</p></article>)}</div>
      </section>
      <section className="compound-related-panel" aria-label="Related next steps">
        {related.map(([route, heading, detail]) => (
          <a href={route} key={route} onClick={(event) => { event.preventDefault(); onNavigate(route); }}>
            <Target size={18} /><span><strong>{heading}</strong><small>{detail}</small></span><ArrowRight size={16} />
          </a>
        ))}
      </section>
    </section>
  );
}

function PanelHeading({ badges, eyebrow, onReset, title }: { badges?: string[]; eyebrow: string; onReset?: () => void; title: string }) {
  return (
    <div className="panel-heading">
      <div><p className="eyebrow">{eyebrow}</p><h2 id={onReset ? 'planning-input-title' : 'planning-result-title'}>{title}</h2></div>
      {onReset ? <button className="secondary-button icon-text-button" type="button" onClick={onReset}><RotateCcw size={15} /> Reset</button> : (
        <div className="compound-model-badges">{badges?.map((badge) => <span className="compound-version" key={badge}>{badge}</span>)}</div>
      )}
    </div>
  );
}

function PlanningFieldset({ children, legend, note }: { children: ReactNode; legend: string; note: string }) {
  return <fieldset className="cashflow-input-section"><legend><strong>{legend}</strong><small>{note}</small></legend>{children}</fieldset>;
}

function PlanningMoneyGrid({ children }: { children: ReactNode }) {
  return <div className="calculator-input-grid cashflow-input-grid">{children}</div>;
}

function PlanningMoneyField({ error, fieldKey, helper, label, onChange, value }: { error?: string; fieldKey: string; helper: string; label: string; onChange: (raw: string) => void; value: number }) {
  const currency = useContext(PlanningCurrencyContext);
  return <PlanningNumberField error={error} fieldKey={fieldKey} helper={helper} label={label} onChange={onChange} prefix={currency} value={value} />;
}

function PlanningNumberField({ error, fieldKey, helper, label, max, min = 0, onChange, prefix, step = 0.01, suffix, value }: { error?: string; fieldKey: string; helper: string; label: string; max?: number; min?: number; onChange: (raw: string) => void; prefix?: string; step?: number; suffix?: string; value: number }) {
  const id = `planning-${fieldKey}`;
  const helpId = `${id}-help`;
  const errorId = `${id}-error`;
  return (
    <label className={`field ${error ? 'has-error' : ''}`} htmlFor={id}>
      <span className="calculator-field-label"><span>{label}</span><CircleHelp aria-hidden="true" size={16} /></span>
      <div className="calculator-input-control">
        {prefix ? <small aria-hidden="true">{prefix}</small> : null}
        <input aria-describedby={`${helpId}${error ? ` ${errorId}` : ''}`} aria-invalid={Boolean(error)} autoComplete="off" id={id} inputMode="decimal" max={max} min={min} name={id} step={step} type="number" value={Number.isFinite(value) ? value : ''} onChange={(event) => onChange(event.target.value)} />
        {suffix ? <small aria-hidden="true">{suffix}</small> : null}
      </div>
      <small id={helpId}>{helper}</small>
      {error ? <small className="field-error" id={errorId} role="alert">{error}</small> : null}
    </label>
  );
}

function PlanningSelectField({ fieldKey, helper, label, onChange, options, value }: { fieldKey: string; helper: string; label: string; onChange: (value: string) => void; options: Array<[string, string | number]>; value: string | number }) {
  const id = `planning-${fieldKey}`;
  const helpId = `${id}-help`;
  return (
    <label className="field" htmlFor={id}>
      <span className="calculator-field-label"><span>{label}</span><CircleHelp aria-hidden="true" size={16} /></span>
      <select aria-describedby={helpId} className="compound-select" id={id} name={id} value={value} onChange={(event) => onChange(event.target.value)}>{options.map(([name, option]) => <option key={String(option)} value={option}>{name}</option>)}</select>
      <small id={helpId}>{helper}</small>
    </label>
  );
}

function DisplayOptions({ currency, locale, onCurrency, onLocale }: { currency: PlanningCurrencyCode; locale: PlanningLocaleCode; onCurrency: (value: PlanningCurrencyCode) => void; onLocale: (value: PlanningLocaleCode) => void }) {
  return (
    <details className="compound-disclosure calculator-options-shell">
      <summary><span><strong>Display options</strong><small>Currency symbol and grouping style; no FX conversion</small></span><ChevronDown size={17} /></summary>
      <div className="compound-advanced-body"><DisplayFields currency={currency} locale={locale} onCurrency={onCurrency} onLocale={onLocale} /></div>
    </details>
  );
}

function DisplayFields({ currency, locale, onCurrency, onLocale }: { currency: PlanningCurrencyCode; locale: PlanningLocaleCode; onCurrency: (value: PlanningCurrencyCode) => void; onLocale: (value: PlanningLocaleCode) => void }) {
  return (
    <PlanningMoneyGrid>
      <PlanningSelectField fieldKey="currency" helper="Changes formatting only. Enter every amount in one consistent currency." label="Currency display" onChange={(value) => onCurrency(value as PlanningCurrencyCode)} options={currencies.map((value) => [value, value])} value={currency} />
      <PlanningSelectField fieldKey="locale" helper="Controls digit grouping and separators." label="Number grouping" onChange={(value) => onLocale(value as PlanningLocaleCode)} options={locales.map((value) => [localeName(value), value])} value={locale} />
    </PlanningMoneyGrid>
  );
}

function Headline({ detail, label, tone, value }: { detail: string; label: string; tone: 'positive' | 'warning'; value: string }) {
  return <div className={`compound-headline cashflow-headline is-${tone}`} aria-live="polite" aria-atomic="true"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function ResultMetric({ help, label, tone, value }: { help: string; label: string; tone?: 'positive' | 'warning'; value: string }) {
  return (
    <div className={`calculator-result-metric ${tone ? `metric-${tone}` : ''}`}>
      <span className="calculator-metric-label"><span>{label}</span><button className="calculator-help-dot" type="button" aria-label={`Explain ${label}`}><CircleHelp aria-hidden="true" size={14} /></button><span className="compound-metric-tooltip" role="tooltip">{help}</span></span>
      <strong>{value}</strong>
    </div>
  );
}

function ValidationSummary<Key extends string>({ validation }: { validation: PlanningValidation<Key> }) {
  const errors = Object.values(validation.errors) as string[];
  return <div className="compound-error-summary" role="alert"><strong>Review the highlighted inputs.</strong><ul>{errors.map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}</ul></div>;
}

function Warnings({ warnings }: { warnings: string[] }) {
  return warnings.length ? <div className="compound-warning-list" role="status">{warnings.map((warning) => <p key={warning}>{warning}</p>)}</div> : null;
}

function ActionRow({ auth, disabled = false, isSaving, message, onCopy, onExport, onSave, saveLabel }: { auth: AuthState; disabled?: boolean; isSaving: boolean; message: string; onCopy: () => void; onExport: () => void; onSave: () => void; saveLabel: string }) {
  return (
    <>
      <div className="compound-action-row">
        <button className="secondary-button icon-text-button" type="button" onClick={onCopy}><Copy size={15} /> Copy link</button>
        <button className="secondary-button icon-text-button" type="button" onClick={onExport}><Download size={15} /> Export CSV</button>
        {auth.status === 'signed-in' ? <button className="primary-button" disabled={disabled || isSaving} type="button" onClick={onSave}>{isSaving ? 'Saving…' : saveLabel}</button> : auth.status === 'not-configured' ? (
          <button className="primary-button" disabled={disabled} type="button" onClick={onSave}>Keep browser draft</button>
        ) : (
          <SignUpButton mode="modal"><button className="primary-button" type="button" onClick={onSave}>Create account to save</button></SignUpButton>
        )}
      </div>
      <p className="calculator-live-message" aria-live="polite">{message}</p>
    </>
  );
}

function AnalysisCard({ children, summary, title }: { children: ReactNode; summary: string; title: string }) {
  return <details className="compound-analysis-card"><summary><span><strong>{title}</strong><small>{summary}</small></span><ChevronDown size={17} /></summary><div className="compound-analysis-body">{children}</div></details>;
}

function HistoryPanel({ auth, history, onLoad, title }: { auth: AuthState; history: CalculatorSavedResult[]; onLoad: (saved: CalculatorSavedResult) => void; title: string }) {
  return (
    <section className="compound-history-panel" aria-labelledby="planning-history-title">
      <div><p className="eyebrow">Saved history</p><h2 id="planning-history-title">{title}</h2><p>{auth.status === 'signed-in' ? 'Reload a recent snapshot without overwriting the saved record.' : 'Browser drafts work without an account. Sign in to keep multiple dated results.'}</p></div>
      {history.length ? <div className="compound-history-list">{history.map((saved) => <button type="button" key={saved.id} onClick={() => onLoad(saved)}><History size={16} /><strong>{saved.result.metrics[0]?.label ?? saved.calculatorTitle}</strong><small>{saved.result.metrics[0] ? String(saved.result.metrics[0].value) : 'Saved result'}</small><small>{new Date(saved.createdAt).toLocaleDateString()}</small></button>)}</div> : <div className="cashflow-history-empty"><History size={18} /><span>No saved snapshots for this calculator yet.</span></div>}
    </section>
  );
}

function BalanceSheetChart({ money, projection }: { money: (value: number, digits?: number) => string; projection: NetWorthProjection }) {
  const maximum = Math.max(1, projection.totalAssets, projection.totalLiabilities, Math.abs(projection.netWorth));
  return (
    <figure className="cashflow-figure">
      <figcaption><strong>Balance-sheet scale</strong><small>Gross assets, liabilities, and the resulting net position use one comparable scale.</small></figcaption>
      <div className="cashflow-bar-chart" role="img" aria-label={`Total assets ${money(projection.totalAssets)}, total liabilities ${money(projection.totalLiabilities)}, net worth ${money(projection.netWorth)}.`}>
        <HorizontalBar label="Assets" value={projection.totalAssets} maximum={maximum} formatted={money(projection.totalAssets)} tone="asset" />
        <HorizontalBar label="Liabilities" value={projection.totalLiabilities} maximum={maximum} formatted={money(projection.totalLiabilities)} tone="liability" />
        <HorizontalBar label="Net worth" value={Math.abs(projection.netWorth)} maximum={maximum} formatted={money(projection.netWorth)} tone={projection.netWorth < 0 ? 'negative' : 'net'} />
      </div>
    </figure>
  );
}

function BudgetWaterfall({ money, projection }: { money: (value: number, digits?: number) => string; projection: BudgetProjection }) {
  const maximum = Math.max(1, projection.totalIncome, projection.totalSpending, Math.abs(projection.monthlySurplus));
  return (
    <figure className="cashflow-figure">
      <figcaption><strong>Where monthly income goes</strong><small>Needs and flexible spending subtract from income; the remainder is savings capacity before allocations.</small></figcaption>
      <div className="cashflow-bar-chart" role="img" aria-label={`Monthly income ${money(projection.totalIncome)}, needs ${money(projection.monthlyNeeds)}, flexible spending ${money(projection.monthlyWants)}, and surplus ${money(projection.monthlySurplus)}.`}>
        <HorizontalBar label="Income" value={projection.totalIncome} maximum={maximum} formatted={money(projection.totalIncome)} tone="asset" />
        <HorizontalBar label="Needs" value={projection.monthlyNeeds} maximum={maximum} formatted={money(projection.monthlyNeeds)} tone="need" />
        <HorizontalBar label="Flexible" value={projection.monthlyWants} maximum={maximum} formatted={money(projection.monthlyWants)} tone="want" />
        <HorizontalBar label="Surplus" value={Math.abs(projection.monthlySurplus)} maximum={maximum} formatted={money(projection.monthlySurplus)} tone={projection.monthlySurplus < 0 ? 'negative' : 'net'} />
      </div>
    </figure>
  );
}

function EmergencyRunway({ money, projection }: { money: (value: number, digits?: number) => string; projection: EmergencyFundProjection }) {
  const target = Math.max(1, projection.selectedTarget);
  return (
    <figure className="cashflow-figure emergency-runway-figure">
      <figcaption><strong>Reserve progress and access</strong><small>The progress bar uses the selected target. The tier bar shows how the current reserve can be accessed.</small></figcaption>
      <div className="emergency-progress" role="progressbar" aria-label="Emergency fund progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(projection.progress * 100)}><i style={{ width: `${Math.max(0, Math.min(100, projection.progress * 100))}%` }} /></div>
      <div className="emergency-progress-labels"><span>{money(projection.currentReserve)} current</span><strong>{percent(projection.progress, undefined)} funded</strong><span>{money(projection.selectedTarget)} target</span></div>
      <div className="reserve-tier-bar" role="img" aria-label={`Immediate reserve ${money(projection.immediateReserve)}, short-notice reserve ${money(projection.nearTermReserve)}, and market-exposed reserve ${money(projection.marketExposedReserve)}.`}>
        {projection.immediateReserve > 0 ? <i className="is-immediate" style={{ width: `${projection.immediateReserve / Math.max(target, projection.currentReserve, 1) * 100}%` }} /> : null}
        {projection.nearTermReserve > 0 ? <i className="is-near" style={{ width: `${projection.nearTermReserve / Math.max(target, projection.currentReserve, 1) * 100}%` }} /> : null}
        {projection.marketExposedReserve > 0 ? <i className="is-market" style={{ width: `${projection.marketExposedReserve / Math.max(target, projection.currentReserve, 1) * 100}%` }} /> : null}
      </div>
      <div className="compound-chart-legend"><span className="is-capital">Immediate</span><span className="is-growth">Short notice</span><span className="is-real">Market exposed</span></div>
    </figure>
  );
}

function HorizontalBar({ formatted, label, maximum, tone, value }: { formatted: string; label: string; maximum: number; tone: string; value: number }) {
  const width = value <= 0 ? 0 : Math.max(1, value / maximum * 100);
  return <div className="cashflow-bar-row"><span>{label}</span><div><i className={`is-${tone}`} style={{ width: `${width}%` }} /></div><strong>{formatted}</strong></div>;
}

function ScenarioBars({ baseline, money, rows }: { baseline: number; money: (value: number, digits?: number) => string; rows: Array<{ label: string; value: number }> }) {
  const maximum = Math.max(1, ...rows.map((row) => Math.abs(row.value)));
  return <div className="cashflow-scenario-bars">{rows.map((row) => <div className={Math.abs(row.value - baseline) < 1e-8 ? 'is-base' : ''} key={row.label}><span>{row.label}</span><div><i className={row.value < 0 ? 'is-negative' : ''} style={{ width: `${row.value === 0 ? 0 : Math.max(1, Math.abs(row.value) / maximum * 100)}%` }} /></div><strong>{money(row.value)}</strong></div>)}</div>;
}

function BreakdownTable({ assetRows, caption, liabilityRows, money, projection }: { assetRows: BreakdownRow[]; caption: string; liabilityRows: BreakdownRow[]; money: (value: number, digits?: number) => string; projection: NetWorthProjection }) {
  return <div className="compound-table-wrap" role="region" aria-label={caption} tabIndex={0}><table><caption>{caption}</caption><thead><tr><th scope="col">Section</th><th scope="col">Category</th><th scope="col">Value</th><th scope="col">Share of section</th></tr></thead><tbody>{assetRows.map((row) => <tr key={row.key}><th scope="row">Asset</th><td>{row.label}</td><td>{money(row.value, 2)}</td><td>{percent(projection.totalAssets > 0 ? row.value / projection.totalAssets : 0, undefined)}</td></tr>)}{liabilityRows.map((row) => <tr key={row.key}><th scope="row">Liability</th><td>{row.label}</td><td>{money(row.value, 2)}</td><td>{percent(projection.totalLiabilities > 0 ? row.value / projection.totalLiabilities : 0, undefined)}</td></tr>)}</tbody><tfoot><tr><th scope="row" colSpan={2}>Net worth</th><td>{money(projection.netWorth, 2)}</td><td>Assets − liabilities</td></tr></tfoot></table></div>;
}

function BudgetTable({ inputs, money, projection }: { inputs: BudgetInputs; money: (value: number, digits?: number) => string; projection: BudgetProjection }) {
  return <div className="compound-table-wrap" role="region" aria-label="Monthly budget category table" tabIndex={0}><table><caption>Monthly budget category reconciliation</caption><thead><tr><th scope="col">Section</th><th scope="col">Category</th><th scope="col">Monthly</th><th scope="col">Annual pace</th></tr></thead><tbody><tr><th scope="row">Income</th><td>Take-home pay</td><td>{money(inputs.takeHomePay, 2)}</td><td>{money(inputs.takeHomePay * 12, 2)}</td></tr><tr><th scope="row">Income</th><td>Other income</td><td>{money(inputs.otherIncome, 2)}</td><td>{money(inputs.otherIncome * 12, 2)}</td></tr>{projection.categoryRows.map((row) => <tr key={row.key}><th scope="row">Spending</th><td>{row.label}</td><td>{money(row.value, 2)}</td><td>{money(row.value * 12, 2)}</td></tr>)}<tr><th scope="row">Allocation</th><td>Planned savings</td><td>{money(inputs.plannedSavings, 2)}</td><td>{money(inputs.plannedSavings * 12, 2)}</td></tr></tbody><tfoot><tr><th scope="row" colSpan={2}>Surplus before planned savings</th><td>{money(projection.monthlySurplus, 2)}</td><td>{money(projection.annualSurplus, 2)}</td></tr></tfoot></table></div>;
}

function BudgetPaceTable({ money, projection }: { money: (value: number, digits?: number) => string; projection: BudgetProjection }) {
  return <div className="compound-table-wrap" role="region" aria-label="Twelve-month budget pace table" tabIndex={0}><table><caption>Constant monthly budget pace</caption><thead><tr><th scope="col">Month</th><th scope="col">Cumulative surplus</th><th scope="col">Cumulative planned savings</th><th scope="col">Cumulative unassigned</th></tr></thead><tbody>{projection.pace.map((row) => <tr key={row.month}><th scope="row">{row.month}</th><td>{money(row.cumulativeSurplus, 2)}</td><td>{money(row.cumulativePlannedSavings, 2)}</td><td>{money(row.cumulativeUnassigned, 2)}</td></tr>)}</tbody></table></div>;
}

function EmergencyScheduleTable({ money, projection }: { money: (value: number, digits?: number) => string; projection: EmergencyFundProjection }) {
  const visible = projection.schedule.slice(0, 121);
  return <div className="compound-table-wrap" role="region" aria-label="Emergency fund monthly schedule" tabIndex={0}><table><caption>Emergency fund monthly funding schedule</caption><thead><tr><th scope="col">Month</th><th scope="col">Contribution</th><th scope="col">Ending reserve</th><th scope="col">Remaining gap</th></tr></thead><tbody>{visible.map((row) => <tr key={row.month}><th scope="row">{row.month === 0 ? 'Start' : row.month}</th><td>{money(row.contribution, 2)}</td><td>{money(row.endingReserve, 2)}</td><td>{money(row.gap, 2)}</td></tr>)}</tbody></table>{projection.schedule.length > visible.length ? <p className="cashflow-table-note">Showing the first 120 months. CSV contains all {projection.schedule.length - 1} modeled contribution months.</p> : null}</div>;
}

function LiquidityTable({ money, projection }: { money: (value: number, digits?: number) => string; projection: EmergencyFundProjection }) {
  return <div className="compound-table-wrap" role="region" aria-label="Emergency reserve liquidity ladder" tabIndex={0}><table><caption>Reserve liquidity ladder</caption><thead><tr><th scope="col">Access layer</th><th scope="col">Entered value</th><th scope="col">Planning treatment</th></tr></thead><tbody><tr><th scope="row">Immediate</th><td>{money(projection.immediateReserve, 2)}</td><td>Cash on hand and bank savings</td></tr><tr><th scope="row">Short notice</th><td>{money(projection.nearTermReserve, 2)}</td><td>Short-term deposits; penalties are not deducted</td></tr><tr><th scope="row">Market exposed</th><td>{money(projection.marketExposedReserve, 2)}</td><td>Entered current value; no market haircut</td></tr></tbody><tfoot><tr><th scope="row">Current reserve</th><td>{money(projection.currentReserve, 2)}</td><td>All entered layers</td></tr></tfoot></table></div>;
}

function ReferenceRead({ actual, label, money, reference }: { actual: number; label: string; money: (value: number, digits?: number) => string; reference: number }) {
  return <span><small>{label}</small><strong>{money(actual)} actual</strong><em>{money(reference)} reference</em></span>;
}

function budgetMoneyFields(inputs: BudgetInputs, projection: BudgetProjection, setInputs: Dispatch<SetStateAction<BudgetInputs>>): ReactNode[] {
  const fields: Array<[BudgetInputKey, string, string]> = [
    ['housing', 'Housing', 'Rent or mortgage payment and housing charges paid from take-home income.'],
    ['utilities', 'Utilities', 'Electricity, water, gas, phone, internet, and similar recurring services.'],
    ['groceries', 'Groceries', 'Food and household basics, excluding optional dining and entertainment.'],
    ['transportation', 'Transportation', 'Transit, fuel, maintenance, parking, and routine transport costs.'],
    ['insuranceAndHealth', 'Insurance and health', 'Insurance premiums, prescriptions, care, and health costs paid from take-home income.'],
    ['debtMinimums', 'Minimum debt payments', 'Required card and loan payments; extra payoff can be part of planned saving.'],
    ['familyAndCare', 'Family and care', 'Childcare, dependent support, education basics, and essential care.'],
    ['lifestyle', 'Lifestyle and recreation', 'Dining, entertainment, hobbies, and other flexible lifestyle spending.'],
    ['subscriptions', 'Subscriptions', 'Streaming, software, memberships, and other recurring optional services.'],
    ['otherSpending', 'Other spending', 'Spending not captured above; reclassify material recurring amounts when possible.']
  ];
  return fields.map(([key, label, helper]) => <PlanningMoneyField error={projection.validation.errors[key]} fieldKey={key} helper={helper} key={key} label={label} onChange={(raw) => updateNumber(setInputs, key, raw)} value={inputs[key]} />);
}

function toNetWorthResult(projection: NetWorthProjection): CalculatorResult {
  return {
    assumptions: ['All balances use one user-entered snapshot date.', 'Net worth equals assets minus liabilities.', 'Currency selection changes display only.'],
    metrics: [
      { description: 'Sum of entered asset categories.', label: 'Total assets', value: projection.totalAssets, valueType: 'currency' },
      { description: 'Sum of entered liability categories.', label: 'Total liabilities', value: projection.totalLiabilities, valueType: 'currency' },
      { description: 'Total assets minus total liabilities.', label: 'Estimated net worth', tone: projection.netWorth < 0 ? 'warning' : 'positive', value: projection.netWorth, valueType: 'currency' },
      { description: 'Cash and bank balances plus taxable investments.', label: 'Liquid assets', value: projection.liquidAssets, valueType: 'currency' },
      { description: 'Liquid assets minus entered short-term liabilities.', label: 'Liquid position', value: projection.liquidPosition, valueType: 'currency' }
    ],
    narrative: `Entered assets total ${projection.totalAssets}; entered liabilities total ${projection.totalLiabilities}; net worth is ${projection.netWorth}.`
  };
}

function toBudgetResult(projection: BudgetProjection, inputs: BudgetInputs): CalculatorResult {
  return {
    assumptions: ['All amounts are monthly take-home cashflow estimates.', 'The annual pace repeats the current month 12 times.', 'Reference percentages do not change the entered plan.'],
    metrics: [
      { description: 'Monthly income minus entered spending.', label: 'Monthly surplus', tone: projection.monthlySurplus < 0 ? 'warning' : 'positive', value: projection.monthlySurplus, valueType: 'currency' },
      { description: 'Take-home pay plus other income.', label: 'Total monthly income', value: projection.totalIncome, valueType: 'currency' },
      { description: 'Needs plus flexible spending.', label: 'Total monthly spending', value: projection.totalSpending, valueType: 'currency' },
      { description: 'Entered monthly savings allocation.', label: 'Planned saving', value: inputs.plannedSavings, valueType: 'currency' },
      { description: 'Surplus divided by income.', label: 'Savings capacity rate', value: projection.savingsCapacityRate ?? 0, valueType: 'percent' }
    ],
    narrative: `Monthly income of ${projection.totalIncome} minus spending of ${projection.totalSpending} leaves ${projection.monthlySurplus} before planned savings.`
  };
}

function toEmergencyFundResult(projection: EmergencyFundProjection, inputs: EmergencyFundInputs): CalculatorResult {
  return {
    assumptions: ['Target equals essential spending times selected months plus the one-time buffer.', 'Funding schedule assumes no growth.', 'Risk-based months are a transparent planning heuristic.'],
    metrics: [
      { description: 'Selected reserve target.', label: 'Emergency fund target', value: projection.selectedTarget, valueType: 'currency' },
      { description: 'Sum of entered reserve layers.', label: 'Current liquid reserve', value: projection.currentReserve, valueType: 'currency' },
      { description: 'Target minus current reserve, floored at zero.', label: 'Remaining gap', tone: projection.gap > 0 ? 'warning' : 'positive', value: projection.gap, valueType: 'currency' },
      { description: 'Current reserve divided by essential spending.', label: 'Current runway', value: projection.monthsOfRunway ?? 0, valueType: 'number' },
      { description: 'Selected coverage period.', label: 'Selected coverage', value: inputs.targetMonths, valueType: 'number' }
    ],
    narrative: `A ${inputs.targetMonths}-month target is ${projection.selectedTarget}; current reserve is ${projection.currentReserve}; the remaining gap is ${projection.gap}.`
  };
}

function netWorthInterpretation(projection: NetWorthProjection, money: (value: number, digits?: number) => string): string {
  const direction = projection.netWorth < 0 ? 'liabilities exceed assets' : 'assets exceed liabilities';
  return `${money(projection.totalAssets)} of entered assets and ${money(projection.totalLiabilities)} of entered liabilities produce ${money(projection.netWorth)} of net worth; ${direction}. Liquid position under the stated convention is ${money(projection.liquidPosition)}.`;
}

function budgetInterpretation(projection: BudgetProjection, inputs: BudgetInputs, money: (value: number, digits?: number) => string, locale: string | undefined): string {
  const state = projection.monthlySurplus < 0 ? `a ${money(Math.abs(projection.monthlySurplus))} monthly shortfall` : `${money(projection.monthlySurplus)} available before savings allocations`;
  return `${money(projection.totalIncome)} of monthly income and ${money(projection.totalSpending)} of entered spending leave ${state}. The plan assigns ${money(inputs.plannedSavings)} to saving and leaves ${money(projection.unassignedAfterPlan)} unassigned. Savings capacity is ${projection.savingsCapacityRate === null ? 'unavailable' : percent(projection.savingsCapacityRate, locale)} of income.`;
}

function emergencyInterpretation(projection: EmergencyFundProjection, inputs: EmergencyFundInputs, money: (value: number, digits?: number) => string, locale: string | undefined): string {
  if (projection.gap <= 0) return `${money(projection.currentReserve)} currently covers the selected ${number(inputs.targetMonths, locale, 1)}-month target of ${money(projection.selectedTarget)}. Review access, penalties, and market exposure before treating every entered balance as immediately available.`;
  const funding = projection.monthsToGoal === null ? 'No funding date is available at a zero monthly contribution.' : `At ${money(inputs.monthlyContribution)} per month with no assumed growth, the gap closes in about ${projection.monthsToGoal.toLocaleString(locale)} months.`;
  return `${money(projection.currentReserve)} currently covers ${projection.monthsOfRunway === null ? 'an unavailable number of' : number(projection.monthsOfRunway, locale, 1)} months of entered essentials, leaving a ${money(projection.gap)} gap to the selected target. ${funding}`;
}

export function buildPlanningShareUrl<Inputs extends object>(slug: CashflowSlug, formulaVersion: string, inputs: Inputs, currency: PlanningCurrencyCode, locale: PlanningLocaleCode, baseUrl?: string): string {
  const url = new URL(baseUrl ?? (typeof window === 'undefined' ? `https://finpath.example/calculators/${slug}` : window.location.href));
  url.pathname = `/calculators/${slug}`;
  url.search = '';
  url.hash = '';
  url.searchParams.set('v', formulaVersion);
  for (const [key, value] of Object.entries(inputs)) url.searchParams.set(key, String(value));
  url.searchParams.set('currency', currency);
  url.searchParams.set('locale', locale);
  return url.toString();
}

export function restorePlanningState<Inputs extends object>(slug: CashflowSlug, formulaVersion: string, defaults: Inputs): (RouteDraft<Inputs> & { source: 'draft' | 'share' }) | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const requestedVersion = params.get('v');
  if (requestedVersion && requestedVersion !== formulaVersion) return null;
  if (requestedVersion === formulaVersion) {
    const inputs = parseInputs(defaults, params);
    return { currency: supportedCurrency(params.get('currency')), formulaVersion, inputs, locale: supportedLocale(params.get('locale')), source: 'share', updatedAt: new Date().toISOString() };
  }
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftKey(slug)) ?? 'null') as Partial<RouteDraft<Inputs>> | null;
    if (!parsed || parsed.formulaVersion !== formulaVersion || !parsed.inputs) return null;
    return { currency: supportedCurrency(parsed.currency), formulaVersion, inputs: mergeInputs(defaults, parsed.inputs), locale: supportedLocale(parsed.locale), source: 'draft', updatedAt: parsed.updatedAt ?? new Date().toISOString() };
  } catch {
    return null;
  }
}

function restoreEmergencyState(): (RouteDraft<EmergencyFundInputs> & { source: 'draft' | 'share' }) | null {
  return restorePlanningState('emergency-fund', emergencyFundFormulaVersion, defaultEmergencyFundInputs);
}

function parseInputs<Inputs extends object>(defaults: Inputs, params: URLSearchParams): Inputs {
  const next = { ...defaults };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const raw = params.get(key);
    if (raw === null) continue;
    (next as Record<string, unknown>)[key] = typeof defaultValue === 'number' ? Number(raw) : raw;
  }
  return next;
}

function mergeInputs<Inputs extends object>(defaults: Inputs, restored: Partial<Inputs>): Inputs {
  const next = { ...defaults };
  for (const [key, defaultValue] of Object.entries(defaults)) {
    const value = (restored as Record<string, unknown>)[key];
    if (typeof defaultValue === 'number' && typeof value === 'number') (next as Record<string, unknown>)[key] = value;
    if (typeof defaultValue === 'string' && typeof value === 'string') (next as Record<string, unknown>)[key] = value;
  }
  return next;
}

function persistDraft<Inputs>(slug: CashflowSlug, draft: RouteDraft<Inputs>): void {
  try { window.localStorage.setItem(draftKey(slug), JSON.stringify(draft)); } catch { /* Public calculation remains available without storage. */ }
}

function clearDraft(slug: CashflowSlug): void {
  try { window.localStorage.removeItem(draftKey(slug)); } catch { /* No-op. */ }
}

function draftKey(slug: CashflowSlug): string {
  return `finpath.calculatorDraft.${slug}.v2`;
}

function inputsFromSaved<Inputs extends Record<string, number>>(defaults: Inputs, values: Record<string, number>): Inputs {
  const next = { ...defaults };
  for (const key of Object.keys(defaults)) if (Number.isFinite(values[key])) next[key as keyof Inputs] = values[key] as Inputs[keyof Inputs];
  return next;
}

function numericEmergencyInputs(inputs: EmergencyFundInputs): Omit<EmergencyFundInputs, 'incomeStability'> {
  const { incomeStability: _, ...numeric } = inputs;
  return numeric;
}

function setDisplayFromSaved(saved: CalculatorSavedResult, setCurrency: Dispatch<SetStateAction<PlanningCurrencyCode>>): void {
  if (currencies.includes(saved.currency as PlanningCurrencyCode)) setCurrency(saved.currency as PlanningCurrencyCode);
}

function routeHistory(saved: CalculatorSavedResult[], slug: string): CalculatorSavedResult[] {
  return saved.filter((item) => item.calculatorSlug === slug).slice(0, 6);
}

function updateNumber<Inputs, Key extends keyof Inputs>(setInputs: Dispatch<SetStateAction<Inputs>>, key: Key, raw: string): void {
  setInputs((current) => ({ ...current, [key]: raw === '' ? Number.NaN : Number(raw) }));
}

function moneyFormatter(currency: PlanningCurrencyCode, locale: string | undefined): (value: number, digits?: number) => string {
  const formatters = new Map<number, Intl.NumberFormat>();
  return (value, digits = 0) => {
    const precision = currency === 'JPY' ? 0 : digits;
    let formatter = formatters.get(precision);
    if (!formatter) {
      formatter = new Intl.NumberFormat(locale, { currency, maximumFractionDigits: precision, minimumFractionDigits: 0, style: 'currency' });
      formatters.set(precision, formatter);
    }
    return formatter.format(value);
  };
}

function percent(value: number, locale: string | undefined): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1, style: 'percent' }).format(value);
}

function number(value: number, locale: string | undefined, digits = 0): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value);
}

function localeName(locale: PlanningLocaleCode): string {
  if (locale === 'auto') return 'Browser default';
  if (locale === 'en-IN') return 'Indian grouping';
  if (locale === 'de-DE') return 'German grouping';
  return 'US grouping';
}

function supportedCurrency(value: unknown): PlanningCurrencyCode {
  return currencies.includes(value as PlanningCurrencyCode) ? value as PlanningCurrencyCode : 'USD';
}

function supportedLocale(value: unknown): PlanningLocaleCode {
  return locales.includes(value as PlanningLocaleCode) ? value as PlanningLocaleCode : 'auto';
}

async function copyText(value: string): Promise<void> {
  if (!navigator.clipboard) throw new Error('Clipboard unavailable');
  await navigator.clipboard.writeText(value);
}

function downloadText(filename: string, content: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8;' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
