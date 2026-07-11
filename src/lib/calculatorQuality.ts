import type { CalculatorFormula, SeoCalculator } from './seoCalculators';

export type CalculatorStudio =
  | 'Cashflow and Balance Sheet Studio'
  | 'Debt Payoff Studio'
  | 'Growth and Goal Studio'
  | 'Income and Tax Studio'
  | 'Loan and Home Studio'
  | 'Retirement Income Studio'
  | 'Return Analysis Studio';

export type CalculatorQualitySpec = {
  calculationRequirements: string[];
  conversionExpectation: string;
  decisionUsefulness: string;
  doneWhen: string[];
  inputRequirements: string[];
  interpretationChecks: string[];
  scenarioRequirements: string[];
  slug: string;
  studio: CalculatorStudio;
  title: string;
  validationRequirements: string[];
  visualRequirements: string[];
};

type QualityDefaults = Omit<
  CalculatorQualitySpec,
  'conversionExpectation' | 'inputRequirements' | 'slug' | 'title'
>;

type QualityOverride = Partial<
  Pick<
    CalculatorQualitySpec,
    | 'calculationRequirements'
    | 'decisionUsefulness'
    | 'interpretationChecks'
    | 'scenarioRequirements'
    | 'validationRequirements'
    | 'visualRequirements'
  >
>;

const slugStudios: Record<string, CalculatorStudio> = {
  '401k': 'Retirement Income Studio',
  amortization: 'Loan and Home Studio',
  apr: 'Loan and Home Studio',
  'arm-mortgage': 'Loan and Home Studio',
  'auto-loan': 'Loan and Home Studio',
  'balloon-loan': 'Loan and Home Studio',
  'balance-transfer': 'Debt Payoff Studio',
  'biweekly-mortgage-payment': 'Loan and Home Studio',
  budget: 'Cashflow and Balance Sheet Studio',
  cagr: 'Return Analysis Studio',
  'capital-gains-tax': 'Income and Tax Studio',
  'car-loan-emi': 'Loan and Home Studio',
  cd: 'Growth and Goal Studio',
  'closing-costs': 'Loan and Home Studio',
  'compound-interest': 'Growth and Goal Studio',
  'credit-card-payoff': 'Debt Payoff Studio',
  'debt-payoff': 'Debt Payoff Studio',
  'debt-snowball-avalanche': 'Debt Payoff Studio',
  'debt-to-income': 'Loan and Home Studio',
  'down-payment': 'Growth and Goal Studio',
  emi: 'Loan and Home Studio',
  epf: 'Retirement Income Studio',
  escrow: 'Loan and Home Studio',
  'emergency-fund': 'Cashflow and Balance Sheet Studio',
  fd: 'Growth and Goal Studio',
  'fha-loan': 'Loan and Home Studio',
  'fha-vs-conventional': 'Loan and Home Studio',
  'flat-vs-reducing-rate': 'Loan and Home Studio',
  gratuity: 'Retirement Income Studio',
  gst: 'Income and Tax Studio',
  heloc: 'Loan and Home Studio',
  'home-equity-loan': 'Loan and Home Studio',
  'home-loan-emi': 'Loan and Home Studio',
  'home-loan-balance-transfer-india': 'Loan and Home Studio',
  'home-loan-foreclosure': 'Loan and Home Studio',
  'home-loan-prepayment': 'Loan and Home Studio',
  'hra-exemption': 'Income and Tax Studio',
  hysa: 'Growth and Goal Studio',
  'income-tax-india': 'Income and Tax Studio',
  'income-tax-us': 'Income and Tax Studio',
  inflation: 'Growth and Goal Studio',
  'interest-only-mortgage': 'Loan and Home Studio',
  'investment-return': 'Return Analysis Studio',
  'lease-vs-buy': 'Loan and Home Studio',
  'life-insurance-needs': 'Cashflow and Balance Sheet Studio',
  'loan-comparison': 'Loan and Home Studio',
  'loan-eligibility-india': 'Loan and Home Studio',
  'lumpsum-mutual-fund': 'Growth and Goal Studio',
  mortgage: 'Loan and Home Studio',
  'mortgage-affordability': 'Loan and Home Studio',
  'mortgage-payoff': 'Debt Payoff Studio',
  'mortgage-points': 'Loan and Home Studio',
  'mortgage-recast': 'Loan and Home Studio',
  'mortgage-refinance': 'Loan and Home Studio',
  'net-worth': 'Cashflow and Balance Sheet Studio',
  nps: 'Retirement Income Studio',
  paycheck: 'Income and Tax Studio',
  'personal-loan': 'Loan and Home Studio',
  'personal-loan-emi': 'Loan and Home Studio',
  pmi: 'Loan and Home Studio',
  ppf: 'Retirement Income Studio',
  rd: 'Growth and Goal Studio',
  retirement: 'Retirement Income Studio',
  'rent-vs-buy': 'Loan and Home Studio',
  rmd: 'Retirement Income Studio',
  roi: 'Return Analysis Studio',
  'roth-vs-traditional-ira': 'Income and Tax Studio',
  'rule-of-72': 'Return Analysis Studio',
  'salary-india': 'Income and Tax Studio',
  'savings-goal': 'Growth and Goal Studio',
  sip: 'Growth and Goal Studio',
  'sip-goal': 'Growth and Goal Studio',
  'social-security-break-even': 'Retirement Income Studio',
  'stamp-duty-registration': 'Loan and Home Studio',
  'step-up-sip': 'Growth and Goal Studio',
  'student-loan-payoff': 'Debt Payoff Studio',
  swp: 'Retirement Income Studio',
  tds: 'Income and Tax Studio',
  'va-loan': 'Loan and Home Studio',
  xirr: 'Return Analysis Studio'
};

const studioDefaults: Record<CalculatorStudio, QualityDefaults> = {
  'Cashflow and Balance Sheet Studio': {
    calculationRequirements: [
      'Separate cash inflows, outflows, assets, liabilities, and coverage needs before producing the headline number.',
      'Show progress, gap, or surplus against a sensible target instead of only returning a single arithmetic result.',
      'Connect the estimate to account, transaction, goal, or protection context when the user signs in.'
    ],
    decisionUsefulness: 'Use this calculator to turn a household money snapshot into an action: track cashflow, add accounts, size a reserve, or close a protection gap.',
    doneWhen: [],
    interpretationChecks: [
      'Call out whether the result is a surplus, shortfall, runway, or coverage gap.',
      'Show which input moved the answer most: spending, debt, income, assets, dependents, or existing coverage.',
      'Explain the next tracking workflow that would keep the number current.'
    ],
    scenarioRequirements: [
      'Compare current, lean, and safer scenarios.',
      'Allow users to change spending, income, or coverage assumptions without losing the base case.'
    ],
    studio: 'Cashflow and Balance Sheet Studio',
    validationRequirements: [
      'Handle zero income, zero assets, and negative surplus without hiding warnings.',
      'Prevent divide-by-zero savings-rate and runway states.',
      'Keep currency labels and monthly/annual units explicit.'
    ],
    visualRequirements: [
      'Cashflow waterfall or category bars.',
      'Assets versus liabilities or need versus existing coverage.',
      'Runway, progress, or gap gauge.'
    ]
  },
  'Debt Payoff Studio': {
    calculationRequirements: [
      'Calculate payoff months, total interest, and payoff date from a sustainable payment schedule.',
      'Detect payment amounts that do not cover monthly interest.',
      'Compare extra-payment, transfer, snowball, or avalanche alternatives where relevant.'
    ],
    decisionUsefulness: 'Use this calculator to understand how fast debt can disappear, what interest it costs, and which payoff action deserves attention first.',
    doneWhen: [],
    interpretationChecks: [
      'Call out whether the payment is enough to reduce principal.',
      'Show interest saved when payments, rates, or strategy change.',
      'Explain the calendar impact in months and years.'
    ],
    scenarioRequirements: [
      'Compare minimum, current, and accelerated payment paths.',
      'Support at least one strategy comparison for multi-debt or transfer calculators.'
    ],
    studio: 'Debt Payoff Studio',
    validationRequirements: [
      'Bound unsustainable payoff loops.',
      'Reject negative balances, APRs, and payments.',
      'Keep months, years, APR, and currency units visible.'
    ],
    visualRequirements: [
      'Balance decline timeline.',
      'Interest paid or saved comparison.',
      'Payoff calendar with final payment period.'
    ]
  },
  'Growth and Goal Studio': {
    calculationRequirements: [
      'Project future value from current principal, recurring contribution, term, and return assumptions.',
      'Separate total contributions from estimated growth.',
      'Show target gap, monthly required amount, or future purchasing power where the route implies a goal.'
    ],
    decisionUsefulness: 'Use this calculator to see whether contributions, time, and return assumptions are enough to reach a savings or investing target.',
    doneWhen: [],
    interpretationChecks: [
      'Explain the split between money contributed and money earned.',
      'Call out the effect of time, contribution amount, and return assumptions.',
      'Translate the result into a goal, account, or next contribution decision.'
    ],
    scenarioRequirements: [
      'Compare conservative, base, and optimistic return cases.',
      'Allow contribution and time sensitivity without replacing the original inputs.'
    ],
    studio: 'Growth and Goal Studio',
    validationRequirements: [
      'Handle zero-rate and zero-term inputs.',
      'Make monthly versus annual contribution timing clear.',
      'Use INR or USD consistently for the route.'
    ],
    visualRequirements: [
      'Contribution versus growth timeline.',
      'Milestone or time-to-target view.',
      'Sensitivity grid for contribution, return, or term.'
    ]
  },
  'Income and Tax Studio': {
    calculationRequirements: [
      'Separate gross amount, deductions or exemptions, taxable base, estimated tax, and net amount.',
      'Document estimate assumptions clearly when statutory tax engines are not yet complete.',
      'Show how rate, deduction, filing, or regime choices change the take-home result.'
    ],
    decisionUsefulness: 'Use this calculator to understand the path from gross money to usable money and decide what to track, withhold, or review before filing.',
    doneWhen: [],
    interpretationChecks: [
      'Label estimates as planning outputs, not filing advice.',
      'Show the difference between gross, taxable, tax, and net.',
      'Explain which deduction, exemption, or rate assumption matters most.'
    ],
    scenarioRequirements: [
      'Compare at least two tax, deduction, regime, or pay-frequency scenarios where the route implies a choice.',
      'Keep the base scenario visible while users test changes.'
    ],
    studio: 'Income and Tax Studio',
    validationRequirements: [
      'Clamp taxable amounts at zero.',
      'Keep percentage inputs in percent units and output rates in readable percent units.',
      'State country-specific assumptions and effective-date limits.'
    ],
    visualRequirements: [
      'Gross-to-net waterfall.',
      'Regime, filing, or rate comparison bars.',
      'Deduction or exemption impact view.'
    ]
  },
  'Loan and Home Studio': {
    calculationRequirements: [
      'Calculate payment from principal, rate, and term using standard amortization math.',
      'Show total paid, total interest, remaining balance, and principal versus interest split.',
      'Include fees, taxes, insurance, equity, prepayment, or break-even inputs where the route title implies them.'
    ],
    decisionUsefulness: 'Use this calculator to understand monthly affordability, lifetime cost, and the tradeoff between term, rate, fees, and prepayments.',
    doneWhen: [],
    interpretationChecks: [
      'Explain how much of the cost is interest or fees, not only monthly payment.',
      'Call out affordability or break-even when the route is about choosing between options.',
      'Connect loan results to a liability account or payoff plan.'
    ],
    scenarioRequirements: [
      'Compare base loan terms with at least one alternative rate, term, or prepayment path.',
      'Preserve side-by-side loan and home decision assumptions.'
    ],
    studio: 'Loan and Home Studio',
    validationRequirements: [
      'Handle zero-rate amortization correctly.',
      'Keep APR, term, monthly payment, total cost, and currency units explicit.',
      'Protect against impossible home, loan-to-value, and down-payment states.'
    ],
    visualRequirements: [
      'Monthly and yearly amortization schedule.',
      'Principal versus interest chart and remaining-balance line.',
      'Break-even, affordability, or equity timeline where applicable.'
    ]
  },
  'Retirement Income Studio': {
    calculationRequirements: [
      'Project retirement corpus or income using contribution, return, age, and withdrawal assumptions.',
      'Show gap or surplus against the income target or statutory distribution requirement.',
      'Include product-specific rules such as annuity split, vesting, contribution limits, or claiming timing where relevant.'
    ],
    decisionUsefulness: 'Use this calculator to connect long-term savings with retirement income, runway, required withdrawals, or benefit timing.',
    doneWhen: [],
    interpretationChecks: [
      'Explain whether the plan has a corpus gap, income gap, distribution requirement, or break-even age.',
      'Show the sensitivity to retirement age, contribution, withdrawal rate, or claiming date.',
      'Connect the result to a saved retirement plan or retirement account.'
    ],
    scenarioRequirements: [
      'Compare base, delayed, accelerated, or stressed retirement assumptions.',
      'Keep inflation and withdrawal assumptions visible for long-horizon results.'
    ],
    studio: 'Retirement Income Studio',
    validationRequirements: [
      'Handle current age greater than or equal to retirement age.',
      'Avoid infinite withdrawal-runway loops.',
      'Keep annual, monthly, corpus, and income units distinct.'
    ],
    visualRequirements: [
      'Corpus timeline or withdrawal runway.',
      'Gap/surplus chart.',
      'Benefit, annuity, or distribution split view.'
    ]
  },
  'Return Analysis Studio': {
    calculationRequirements: [
      'Calculate annualized return, cashflow-aware return, payback, or doubling time according to the route.',
      'Separate invested capital, ending value, net gain, and time period.',
      'Compare the result with inflation, benchmark, or alternate scenario context.'
    ],
    decisionUsefulness: 'Use this calculator to judge whether an investment result was strong enough after time, cashflows, costs, and inflation are considered.',
    doneWhen: [],
    interpretationChecks: [
      'Explain the difference between total return, annualized return, and cashflow-aware return.',
      'Call out whether the result is sensitive to timing, costs, or the ending value.',
      'Route users toward a saved investment goal or performance note.'
    ],
    scenarioRequirements: [
      'Compare at least two return, benchmark, or time-period scenarios.',
      'Preserve all-in cost and cashflow assumptions for ROI and XIRR-style routes.'
    ],
    studio: 'Return Analysis Studio',
    validationRequirements: [
      'Handle zero starting value, zero cost, and zero-year inputs.',
      'Keep decimal percent outputs formatted as user-readable percentages.',
      'Make simplified XIRR limitations explicit until dated cashflows exist.'
    ],
    visualRequirements: [
      'Value path or payback timeline.',
      'Benchmark or scenario comparison bars.',
      'Sensitivity curve for rate, time, or cost.'
    ]
  }
};

const formulaOverrides: Partial<Record<CalculatorFormula, QualityOverride>> = {
  amortization: {
    calculationRequirements: [
      'Generate a full month-by-month payment schedule with principal, interest, ending balance, and cumulative interest.',
      'Roll the monthly schedule into yearly totals and allow a user-selected period view.',
      'Support export/share of the schedule once Phase 25 export is active.'
    ],
    interpretationChecks: [
      'Explain why early payments are interest-heavy and later payments reduce principal faster.',
      'Show how the final payment closes the remaining balance.'
    ],
    visualRequirements: [
      'Complete monthly table.',
      'Yearly principal and interest rollup.',
      'Remaining balance and cumulative interest lines.'
    ]
  },
  'balance-transfer': {
    calculationRequirements: [
      'Compare current payoff cost against promo payoff cost, including transfer fee and post-promo APR when added.',
      'Calculate promo payoff months and flag balances that outlast the promotional period.'
    ],
    visualRequirements: [
      'Current versus transfer payoff cost bars.',
      'Promo-period countdown and remaining-balance warning.'
    ]
  },
  compound: {
    calculationRequirements: [
      'Calculate future value with monthly contribution timing and total contribution split.',
      'Add inflation-adjusted future value for comprehensive mode.'
    ]
  },
  'debt-payoff': {
    calculationRequirements: [
      'Create payoff schedule with interest, principal paid, remaining balance, and payoff month.',
      'Compare payment increases against interest saved and time saved.'
    ]
  },
  'debt-strategy': {
    calculationRequirements: [
      'Accept multiple debts with separate balances, APRs, and minimum payments.',
      'Run snowball and avalanche payoff strategies side by side using the same monthly payoff budget.',
      'Calculate payoff months, total interest, and strategy interest difference.'
    ],
    visualRequirements: [
      'Snowball versus avalanche remaining-balance table.',
      'Interest saved by strategy.',
      'Month-by-month payoff calendar.'
    ]
  },
  'investment-return': {
    calculationRequirements: [
      'Calculate CAGR from starting value, ending value, and elapsed years.',
      'Add benchmark and inflation-adjusted return for comprehensive mode.'
    ]
  },
  loan: {
    calculationRequirements: [
      'Generate amortization schedule data even when the route headline only asks for payment.',
      'Calculate payment, total interest, total paid, and remaining-balance progression.'
    ]
  },
  pmi: {
    calculationRequirements: [
      'Calculate loan-to-value, PMI amount, and cancellation threshold once amortization data is available.'
    ],
    visualRequirements: [
      'PMI cost by down-payment curve.',
      'Cancellation timeline at 80% loan-to-value.'
    ]
  },
  refinance: {
    calculationRequirements: [
      'Compare old and new payments, closing costs, break-even month, term reset, and lifetime savings.',
      'Show both cash-paid and financed-closing-cost paths.'
    ],
    visualRequirements: [
      'Cumulative savings break-even chart.',
      'Old versus new amortization comparison.'
    ]
  },
  'rent-buy': {
    calculationRequirements: [
      'Model rent inflation, home appreciation, maintenance, property tax, insurance, selling costs, and invested opportunity cost.',
      'Calculate net worth crossover instead of only comparing monthly payments.'
    ],
    visualRequirements: [
      'Renting versus owning net worth timeline.',
      'Break-even crossover point.',
      'Monthly cost waterfall.'
    ]
  },
  'tax-rate': {
    calculationRequirements: [
      'Separate deductions, taxable base, estimated tax, and net amount.',
      'Replace effective-rate shortcuts with route-specific slab or bracket logic when comprehensive tax phases are implemented.'
    ]
  },
  xirr: {
    calculationRequirements: [
      'Accept dated cashflows and solve the true internal rate of return.',
      'Validate signs, dates, and convergence instead of relying on average monthly contributions.'
    ],
    visualRequirements: [
      'Dated cashflow timeline.',
      'Cumulative invested versus ending value chart.'
    ]
  }
};

const slugOverrides: Record<string, QualityOverride> = {
  'debt-snowball-avalanche': {
    calculationRequirements: [
      'Accept multiple named debts with balance, APR, minimum payment, and optional extra payment.',
      'Run true snowball and avalanche schedules side by side.',
      'Calculate payoff date, total interest, and first-debt-win timing for each strategy.'
    ],
    visualRequirements: [
      'Strategy comparison timeline.',
      'Interest saved by strategy.',
      'Debt-by-debt payoff calendar.'
    ]
  },
  'income-tax-india': {
    calculationRequirements: [
      'Implement old versus new regime slab logic with standard deduction, 80C-style deductions, cess, and surcharge assumptions.',
      'Show taxable income, tax before cess, cess, total tax, and net income for each regime.'
    ],
    visualRequirements: [
      'Old versus new regime comparison bars.',
      'Gross-to-net tax waterfall.'
    ]
  },
  'income-tax-us': {
    calculationRequirements: [
      'Implement filing status, standard deduction, taxable income, federal bracket math, credits, and a state-tax placeholder.',
      'Show marginal and effective tax rates separately.'
    ],
    visualRequirements: [
      'Bracket waterfall.',
      'Federal versus state placeholder split.'
    ]
  },
  'mortgage-affordability': {
    calculationRequirements: [
      'Calculate maximum home price from income, debts, down payment, taxes, insurance, PMI, and front-end/back-end DTI limits.',
      'Show cash reserve and cash-to-close checks.'
    ],
    visualRequirements: [
      'Front-end and back-end DTI gauges.',
      'Maximum price sensitivity by rate and down payment.'
    ]
  },
  'roth-vs-traditional-ira': {
    calculationRequirements: [
      'Compare after-tax retirement value using current tax rate, future tax rate, contribution limits, and taxable-account side fund assumptions.',
      'Show break-even future tax rate.'
    ],
    visualRequirements: [
      'After-tax value comparison.',
      'Future tax-rate sensitivity.'
    ]
  },
  paycheck: {
    calculationRequirements: [
      'Support pay frequency, pre-tax deductions, post-tax deductions, withholding estimate, and annualized take-home.',
      'Keep per-paycheck and annual views side by side.'
    ],
    visualRequirements: [
      'Gross-to-net paycheck waterfall.',
      'Per-period and annual breakdown.'
    ]
  },
  'salary-india': {
    calculationRequirements: [
      'Build a CTC component model with fixed pay, variable pay, employee PF, employer PF, professional tax, and estimated income tax.',
      'Show monthly take-home separate from annual CTC.'
    ],
    visualRequirements: [
      'CTC-to-take-home waterfall.',
      'Fixed versus variable compensation split.'
    ]
  }
};

const universalDoneWhen = [
  'The route is public, stable, self-canonical, and usable without auth.',
  'The input labels, helper text, units, output descriptions, assumptions, and FAQ explain the calculation in user language.',
  'Formula tests cover expected outputs, zero or invalid inputs, and route-specific edge cases.',
  'Visualization data is tested separately from the rendered chart where the calculator has timeline, split, tradeoff, or sensitivity behavior.',
  'Signed-out save CTAs preserve a draft and signed-in save CTAs create the intended goal, account, plan, or transaction workflow.',
  'Mobile and desktop layouts have no horizontal overflow and keep glass panels readable.'
];

export function getCalculatorStudio(calculator: SeoCalculator): CalculatorStudio {
  return slugStudios[calculator.slug] ?? studioForFormula(calculator.formula);
}

export function getCalculatorQualitySpec(calculator: SeoCalculator): CalculatorQualitySpec {
  const studio = getCalculatorStudio(calculator);
  const defaults = studioDefaults[studio];
  const formula = formulaOverrides[calculator.formula] ?? {};
  const slug = slugOverrides[calculator.slug] ?? {};

  return {
    calculationRequirements: mergeRequirements(
      defaults.calculationRequirements,
      formula.calculationRequirements,
      slug.calculationRequirements
    ),
    conversionExpectation: `${calculator.conversionLabel} in ${conversionArea(calculator.conversionRoute)}.`,
    decisionUsefulness: slug.decisionUsefulness ?? defaults.decisionUsefulness,
    doneWhen: universalDoneWhen,
    inputRequirements: calculator.inputs.map((input) =>
      `${input.label}: ${input.helper ?? 'Use the calculator unit shown with this input.'}`
    ),
    interpretationChecks: mergeRequirements(
      defaults.interpretationChecks,
      formula.interpretationChecks,
      slug.interpretationChecks
    ),
    scenarioRequirements: mergeRequirements(
      defaults.scenarioRequirements,
      formula.scenarioRequirements,
      slug.scenarioRequirements
    ),
    slug: calculator.slug,
    studio,
    title: calculator.title,
    validationRequirements: mergeRequirements(
      defaults.validationRequirements,
      formula.validationRequirements,
      slug.validationRequirements
    ),
    visualRequirements: mergeRequirements(
      defaults.visualRequirements,
      formula.visualRequirements,
      slug.visualRequirements
    )
  };
}

function studioForFormula(formula: CalculatorFormula): CalculatorStudio {
  if (
    formula === 'loan' ||
    formula === 'amortization' ||
    formula === 'apr' ||
    formula === 'balloon-loan' ||
    formula === 'biweekly-loan' ||
    formula === 'closing-costs' ||
    formula === 'dti' ||
    formula === 'escrow' ||
    formula === 'fha-conventional' ||
    formula === 'fha-loan' ||
    formula === 'flat-rate-loan' ||
    formula === 'interest-only-loan' ||
    formula === 'loan-comparison' ||
    formula === 'loan-eligibility' ||
    formula === 'loan-prepayment' ||
    formula === 'mortgage-recast' ||
    formula === 'pmi' ||
    formula === 'refinance' ||
    formula === 'rent-buy' ||
    formula === 'stamp-duty' ||
    formula === 'va-loan'
  ) {
    return 'Loan and Home Studio';
  }

  if (formula === 'debt-payoff' || formula === 'debt-strategy' || formula === 'balance-transfer') {
    return 'Debt Payoff Studio';
  }

  if (formula === 'tax-rate' || formula === 'capital-gains' || formula === 'gst' || formula === 'hra' || formula === 'paycheck' || formula === 'salary') {
    return 'Income and Tax Studio';
  }

  if (formula === 'retirement' || formula === 'swp' || formula === 'rmd' || formula === 'social-security' || formula === 'gratuity' || formula === 'nps' || formula === 'epf' || formula === 'ppf') {
    return 'Retirement Income Studio';
  }

  if (formula === 'investment-return' || formula === 'roi' || formula === 'rule-72' || formula === 'xirr') {
    return 'Return Analysis Studio';
  }

  if (formula === 'budget' || formula === 'emergency-fund' || formula === 'insurance' || formula === 'net-worth') {
    return 'Cashflow and Balance Sheet Studio';
  }

  return 'Growth and Goal Studio';
}

function mergeRequirements(...groups: Array<string[] | undefined>): string[] {
  return Array.from(new Set(groups.flatMap((group) => group ?? [])));
}

function conversionArea(route: SeoCalculator['conversionRoute']): string {
  if (route === '/accounts') return 'Accounts';
  if (route === '/goals') return 'Goals';
  if (route === '/plans') return 'Plans';
  return 'Transactions';
}
