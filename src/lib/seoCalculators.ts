import { buildCalculatorPublicContent } from './calculatorContent';

export type CalculatorRegion = 'Global' | 'India' | 'US';
export type CalculatorCategory = 'Borrowing' | 'Investing' | 'Planning' | 'Tax' | 'Savings';
export type CalculatorFormula =
  | 'amortization'
  | 'apr'
  | 'balloon-loan'
  | 'balance-transfer'
  | 'biweekly-loan'
  | 'budget'
  | 'capital-gains'
  | 'closing-costs'
  | 'compound'
  | 'debt-payoff'
  | 'debt-strategy'
  | 'down-payment'
  | 'dti'
  | 'emergency-fund'
  | 'epf'
  | 'escrow'
  | 'fd'
  | 'fha-conventional'
  | 'fha-loan'
  | 'flat-rate-loan'
  | 'gratuity'
  | 'gst'
  | 'hra'
  | 'inflation'
  | 'insurance'
  | 'interest-only-loan'
  | 'investment-return'
  | 'india-tax'
  | 'loan'
  | 'loan-comparison'
  | 'loan-eligibility'
  | 'loan-prepayment'
  | 'lumpsum'
  | 'mortgage-recast'
  | 'net-worth'
  | 'nps'
  | 'paycheck'
  | 'pmi'
  | 'ppf'
  | 'rd'
  | 'refinance'
  | 'rent-buy'
  | 'retirement'
  | 'rmd'
  | 'roi'
  | 'rule-72'
  | 'salary'
  | 'savings-goal'
  | 'sip'
  | 'social-security'
  | 'stamp-duty'
  | 'swp'
  | 'tax-rate'
  | 'roth-traditional'
  | 'us-tax'
  | 'va-loan'
  | 'xirr';

export type CalculatorInput = {
  defaultValue: number;
  helper?: string;
  key: string;
  label: string;
  max?: number;
  min?: number;
  suffix?: string;
  type: 'currency' | 'number' | 'percent';
};

export type CalculatorMetric = {
  description?: string;
  label: string;
  tone?: 'accent' | 'neutral' | 'positive' | 'warning';
  value: number;
  valueType: 'currency' | 'number' | 'percent' | 'years';
};

export type CalculatorResult = {
  assumptions: string[];
  metrics: CalculatorMetric[];
  narrative: string;
};

export type SeoCalculator = {
  assumptions: string[];
  category: CalculatorCategory;
  conversionLabel: string;
  conversionRoute: '/accounts' | '/goals' | '/plans' | '/transactions';
  description: string;
  explanation: string;
  faq: Array<{ answer: string; question: string }>;
  formula: CalculatorFormula;
  h1: string;
  inputs: CalculatorInput[];
  keywords: string[];
  region: CalculatorRegion;
  slug: string;
  title: string;
};

const commonFaq = [
  {
    question: 'Can I use this calculator without an account?',
    answer: 'Yes. FinPath calculators are public. Creating an account is only needed when you want to save, track, or revisit the result.'
  },
  {
    question: 'Is this financial advice?',
    answer: 'No. Calculator results are estimates for planning and education. Review important decisions with a qualified professional.'
  }
];

const money = (key: string, label: string, defaultValue: number, helper?: string): CalculatorInput => ({
  defaultValue,
  helper,
  key,
  label,
  min: 0,
  type: 'currency'
});

const number = (key: string, label: string, defaultValue: number, suffix?: string, helper?: string): CalculatorInput => ({
  defaultValue,
  helper,
  key,
  label,
  min: 0,
  suffix,
  type: 'number'
});

const percent = (key: string, label: string, defaultValue: number, helper?: string): CalculatorInput => ({
  defaultValue,
  helper,
  key,
  label,
  min: 0,
  type: 'percent'
});

const termInputs = [number('years', 'Years', 10, 'yrs'), percent('rate', 'Annual return / rate', 8)] as const;
const loanInputs = [money('principal', 'Loan amount', 300000), percent('rate', 'Interest rate', 6.5), number('years', 'Term', 30, 'yrs')] as const;
const conversionByFormula: Record<CalculatorFormula, Pick<SeoCalculator, 'conversionLabel' | 'conversionRoute'>> = {
  amortization: { conversionLabel: 'Track this loan', conversionRoute: '/accounts' },
  apr: { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  'balloon-loan': { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  'balance-transfer': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  'biweekly-loan': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  budget: { conversionLabel: 'Track monthly cash flow', conversionRoute: '/transactions' },
  'capital-gains': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  'closing-costs': { conversionLabel: 'Create home plan', conversionRoute: '/plans' },
  compound: { conversionLabel: 'Save as wealth goal', conversionRoute: '/goals' },
  'debt-payoff': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  'debt-strategy': { conversionLabel: 'Compare payoff plan', conversionRoute: '/plans' },
  'down-payment': { conversionLabel: 'Create home goal', conversionRoute: '/goals' },
  dti: { conversionLabel: 'Create affordability plan', conversionRoute: '/plans' },
  'emergency-fund': { conversionLabel: 'Create emergency fund goal', conversionRoute: '/goals' },
  epf: { conversionLabel: 'Track retirement account', conversionRoute: '/accounts' },
  escrow: { conversionLabel: 'Create home plan', conversionRoute: '/plans' },
  fd: { conversionLabel: 'Track savings account', conversionRoute: '/accounts' },
  'fha-conventional': { conversionLabel: 'Compare home plan', conversionRoute: '/plans' },
  'fha-loan': { conversionLabel: 'Track this liability', conversionRoute: '/accounts' },
  'flat-rate-loan': { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  gratuity: { conversionLabel: 'Add retirement plan item', conversionRoute: '/plans' },
  gst: { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  hra: { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  inflation: { conversionLabel: 'Save as future goal', conversionRoute: '/goals' },
  insurance: { conversionLabel: 'Create protection goal', conversionRoute: '/goals' },
  'interest-only-loan': { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  'investment-return': { conversionLabel: 'Save as investment goal', conversionRoute: '/goals' },
  'india-tax': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  loan: { conversionLabel: 'Track this liability', conversionRoute: '/accounts' },
  'loan-comparison': { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  'loan-eligibility': { conversionLabel: 'Create affordability plan', conversionRoute: '/plans' },
  'loan-prepayment': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  lumpsum: { conversionLabel: 'Save as wealth goal', conversionRoute: '/goals' },
  'mortgage-recast': { conversionLabel: 'Compare home plan', conversionRoute: '/plans' },
  'net-worth': { conversionLabel: 'Add accounts', conversionRoute: '/accounts' },
  nps: { conversionLabel: 'Track retirement account', conversionRoute: '/accounts' },
  paycheck: { conversionLabel: 'Track monthly cash flow', conversionRoute: '/transactions' },
  pmi: { conversionLabel: 'Create home plan', conversionRoute: '/plans' },
  ppf: { conversionLabel: 'Track retirement account', conversionRoute: '/accounts' },
  rd: { conversionLabel: 'Track savings account', conversionRoute: '/accounts' },
  refinance: { conversionLabel: 'Compare loan plan', conversionRoute: '/plans' },
  'rent-buy': { conversionLabel: 'Create home goal', conversionRoute: '/goals' },
  retirement: { conversionLabel: 'Save retirement plan', conversionRoute: '/plans' },
  rmd: { conversionLabel: 'Save retirement plan', conversionRoute: '/plans' },
  roi: { conversionLabel: 'Save investment goal', conversionRoute: '/goals' },
  'rule-72': { conversionLabel: 'Save investing goal', conversionRoute: '/goals' },
  salary: { conversionLabel: 'Track monthly cash flow', conversionRoute: '/transactions' },
  'savings-goal': { conversionLabel: 'Create savings goal', conversionRoute: '/goals' },
  sip: { conversionLabel: 'Create SIP goal', conversionRoute: '/goals' },
  'social-security': { conversionLabel: 'Save retirement plan', conversionRoute: '/plans' },
  'stamp-duty': { conversionLabel: 'Create home plan', conversionRoute: '/plans' },
  swp: { conversionLabel: 'Save withdrawal plan', conversionRoute: '/plans' },
  'tax-rate': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  'roth-traditional': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  'us-tax': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  'va-loan': { conversionLabel: 'Track this liability', conversionRoute: '/accounts' },
  xirr: { conversionLabel: 'Save investment goal', conversionRoute: '/goals' }
};

const borrowingFormulas = new Set<CalculatorFormula>([
  'amortization',
  'apr',
  'balloon-loan',
  'balance-transfer',
  'biweekly-loan',
  'closing-costs',
  'debt-payoff',
  'debt-strategy',
  'down-payment',
  'dti',
  'escrow',
  'fha-conventional',
  'fha-loan',
  'flat-rate-loan',
  'interest-only-loan',
  'loan',
  'loan-comparison',
  'loan-eligibility',
  'loan-prepayment',
  'mortgage-recast',
  'pmi',
  'refinance',
  'rent-buy',
  'stamp-duty',
  'va-loan'
]);

function defineCalculator(
  calculator: Omit<SeoCalculator, 'assumptions' | 'conversionLabel' | 'conversionRoute' | 'faq'> & {
    assumptions?: string[];
    faq?: SeoCalculator['faq'];
  }
): SeoCalculator {
  const inputs = calculator.inputs.map((input) => ({
    ...input,
    helper: input.helper ?? defaultInputHelper(input)
  }));
  const publicContent = buildCalculatorPublicContent({
    formula: calculator.formula,
    inputs,
    slug: calculator.slug,
    title: calculator.title
  });
  return {
    ...calculator,
    ...conversionByFormula[calculator.formula],
    assumptions: [...publicContent.assumptions, ...(calculator.assumptions ?? [])],
    description: publicContent.description,
    explanation: publicContent.explanation,
    faq: [...publicContent.faq, ...(calculator.faq ?? []), ...commonFaq],
    inputs
  };
}

type GeneratedCalculator = readonly [string, string, CalculatorFormula, readonly CalculatorInput[]];

export const seoCalculators: SeoCalculator[] = [
  defineCalculator({
    category: 'Investing',
    description: 'Project how principal, monthly contributions, and returns may compound over time.',
    explanation: 'Compound interest estimates future value by applying an annual return to the starting balance and recurring monthly additions.',
    formula: 'compound',
    h1: 'Compound Interest Calculator',
    inputs: [money('principal', 'Starting amount', 10000), money('monthly', 'Monthly contribution', 500), ...termInputs],
    keywords: ['compound interest calculator', 'investment growth calculator'],
    region: 'Global',
    slug: 'compound-interest',
    title: 'Compound Interest Calculator'
  }),
  defineCalculator({
    category: 'Planning',
    description: 'Find the monthly savings needed to reach a future goal.',
    explanation: 'This calculator discounts the target by expected growth and solves for the recurring monthly contribution.',
    formula: 'savings-goal',
    h1: 'Savings Goal Calculator',
    inputs: [money('target', 'Target amount', 100000), money('current', 'Current savings', 10000), ...termInputs],
    keywords: ['savings goal calculator', 'monthly savings calculator'],
    region: 'Global',
    slug: 'savings-goal',
    title: 'Savings Goal Calculator'
  }),
  defineCalculator({
    category: 'Planning',
    description: 'Add assets and liabilities to estimate net worth.',
    explanation: 'Net worth is total assets minus total liabilities. Use the account tracker to keep this updated over time.',
    formula: 'net-worth',
    h1: 'Net Worth Calculator',
    inputs: [money('assets', 'Total assets', 250000), money('liabilities', 'Total liabilities', 75000)],
    keywords: ['net worth calculator'],
    region: 'Global',
    slug: 'net-worth',
    title: 'Net Worth Calculator'
  }),
  defineCalculator({
    category: 'Planning',
    description: 'Estimate monthly surplus and savings rate from income and expenses.',
    explanation: 'A budget calculator turns monthly cash flow into a savings rate, which can feed goals and transaction tracking.',
    formula: 'budget',
    h1: 'Budget Calculator',
    inputs: [money('income', 'Monthly income', 7000), money('expenses', 'Monthly expenses', 4500)],
    keywords: ['budget calculator', 'monthly budget calculator'],
    region: 'Global',
    slug: 'budget',
    title: 'Budget Calculator'
  }),
  defineCalculator({
    category: 'Planning',
    description: 'Size a cash reserve using monthly spending and target coverage.',
    explanation: 'Emergency fund estimates multiply core monthly expenses by the number of months you want to cover.',
    formula: 'emergency-fund',
    h1: 'Emergency Fund Calculator',
    inputs: [money('monthlyExpenses', 'Monthly expenses', 4500), number('months', 'Months of coverage', 6, 'months')],
    keywords: ['emergency fund calculator'],
    region: 'Global',
    slug: 'emergency-fund',
    title: 'Emergency Fund Calculator'
  }),
  defineCalculator({
    category: 'Planning',
    description: 'Estimate retirement corpus needs and projected savings at retirement.',
    explanation: 'Retirement estimates compare projected savings with the portfolio needed to support desired annual income.',
    formula: 'retirement',
    h1: 'Retirement Calculator',
    inputs: [
      number('currentAge', 'Current age', 35),
      number('retirementAge', 'Retirement age', 60),
      money('currentSavings', 'Current savings', 100000),
      money('monthly', 'Monthly contribution', 1200),
      percent('rate', 'Annual return', 7),
      money('annualIncome', 'Desired annual income', 80000),
      percent('withdrawalRate', 'Withdrawal rate', 4)
    ],
    keywords: ['retirement calculator'],
    region: 'Global',
    slug: 'retirement',
    title: 'Retirement Calculator'
  }),
  defineCalculator({
    category: 'Borrowing',
    description: 'Estimate payoff time and total interest for a debt balance.',
    explanation: 'Debt payoff projects how long a fixed monthly payment may take at the current APR.',
    formula: 'debt-payoff',
    h1: 'Debt Payoff Calculator',
    inputs: [money('balance', 'Debt balance', 12000), percent('rate', 'APR', 19.99), money('payment', 'Monthly payment', 500)],
    keywords: ['debt payoff calculator', 'credit card payoff calculator'],
    region: 'Global',
    slug: 'debt-payoff',
    title: 'Debt Payoff Calculator'
  }),
  defineCalculator({
    category: 'Investing',
    description: 'Calculate annualized return from starting and ending values.',
    explanation: 'Investment return uses CAGR: the annualized rate that turns the starting value into the ending value over time.',
    formula: 'investment-return',
    h1: 'Investment Return Calculator',
    inputs: [money('initial', 'Initial value', 10000), money('final', 'Final value', 18000), number('years', 'Years', 5, 'yrs')],
    keywords: ['investment return calculator', 'CAGR calculator'],
    region: 'Global',
    slug: 'investment-return',
    title: 'Investment Return Calculator'
  }),
  ...([
    ['sip', 'SIP Calculator', 'sip', [money('monthly', 'Monthly SIP', 10000), ...termInputs]],
    ['step-up-sip', 'Step-up SIP Calculator', 'sip', [money('monthly', 'Starting monthly SIP', 10000), percent('stepUp', 'Annual step-up', 10), ...termInputs]],
    ['sip-goal', 'SIP Goal Calculator', 'savings-goal', [money('target', 'Target corpus', 10000000), money('current', 'Current savings', 0), ...termInputs]],
    ['lumpsum-mutual-fund', 'Lumpsum Mutual Fund Calculator', 'lumpsum', [money('principal', 'Lumpsum investment', 500000), ...termInputs]],
    ['swp', 'SWP Calculator', 'swp', [money('corpus', 'Starting corpus', 10000000), money('withdrawal', 'Monthly withdrawal', 60000), percent('rate', 'Annual return', 7)]],
    ['emi', 'EMI Calculator', 'loan', [money('principal', 'Loan amount', 2000000), percent('rate', 'Interest rate', 9), number('years', 'Tenure', 10, 'yrs')]],
    ['home-loan-emi', 'Home Loan EMI Calculator', 'loan', [money('principal', 'Home loan amount', 6000000), percent('rate', 'Interest rate', 8.5), number('years', 'Tenure', 20, 'yrs')]],
    ['car-loan-emi', 'Car Loan EMI Calculator', 'loan', [money('principal', 'Car loan amount', 1000000), percent('rate', 'Interest rate', 9.5), number('years', 'Tenure', 5, 'yrs')]],
    ['personal-loan-emi', 'Personal Loan EMI Calculator', 'loan', [money('principal', 'Personal loan amount', 500000), percent('rate', 'Interest rate', 13), number('years', 'Tenure', 5, 'yrs')]],
    ['income-tax-india', 'Income Tax Calculator Old vs New Regime', 'india-tax', [money('income', 'Annual taxable income before deductions', 1500000), money('deductions', 'Old-regime deductions and exemptions', 150000)]],
    ['salary-india', 'Salary / Take-home Pay Calculator', 'salary', [money('income', 'Annual CTC', 2400000), percent('effectiveRate', 'Estimated income tax rate', 12), percent('employeePfRate', 'Employee PF / payroll deduction rate', 5), money('professionalTax', 'Annual professional tax / other deductions', 2400)]],
    ['hra-exemption', 'HRA Exemption Calculator', 'hra', [money('salary', 'Basic salary', 1200000), money('hra', 'HRA received', 500000), money('rent', 'Annual rent paid', 600000), percent('metroPercent', 'Salary exemption cap', 50)]],
    ['fd', 'FD Calculator', 'fd', [money('principal', 'Deposit amount', 500000), ...termInputs]],
    ['rd', 'RD Calculator', 'rd', [money('monthly', 'Monthly deposit', 10000), ...termInputs]],
    ['ppf', 'PPF Calculator', 'ppf', [money('annual', 'Annual contribution', 150000), percent('rate', 'Annual return', 7.1), number('years', 'Years', 15, 'yrs')]],
    ['epf', 'EPF Calculator', 'epf', [money('employee', 'Employee monthly contribution', 12000), money('employer', 'Employer monthly contribution', 12000), ...termInputs]],
    ['nps', 'NPS Calculator', 'nps', [money('monthly', 'Monthly contribution', 10000), ...termInputs, percent('annuityPercent', 'Annuity allocation', 40)]],
    ['gratuity', 'Gratuity Calculator', 'gratuity', [money('salary', 'Last drawn basic + DA', 120000), number('years', 'Completed service', 8, 'yrs')]],
    ['home-loan-prepayment', 'Home Loan Prepayment Calculator', 'loan-prepayment', [money('principal', 'Current loan balance', 6000000), percent('rate', 'Interest rate', 8.5), number('years', 'Remaining tenure', 15, 'yrs'), money('prepayment', 'One-time prepayment', 500000)]],
    ['home-loan-foreclosure', 'Home Loan Foreclosure Calculator', 'loan-prepayment', [money('principal', 'Current loan balance', 3500000), percent('rate', 'Interest rate', 8.5), number('years', 'Remaining tenure', 8, 'yrs'), money('prepayment', 'Foreclosure payment', 3500000)]],
    ['home-loan-balance-transfer-india', 'Home Loan Balance Transfer Calculator India', 'refinance', [money('principal', 'Current loan balance', 5000000), percent('currentRate', 'Current rate', 9), percent('newRate', 'New lender rate', 8.25), number('years', 'Remaining tenure', 15, 'yrs'), money('closingCosts', 'Transfer fees', 50000)]],
    ['flat-vs-reducing-rate', 'Flat vs Reducing Interest Rate Calculator', 'flat-rate-loan', [money('principal', 'Loan amount', 500000), percent('rate', 'Quoted flat rate', 10), number('years', 'Tenure', 5, 'yrs')]],
    ['loan-eligibility-india', 'Loan Eligibility Calculator India', 'loan-eligibility', [money('income', 'Monthly income', 150000), money('debts', 'Existing monthly obligations', 30000), percent('rate', 'Interest rate', 8.5), number('years', 'Tenure', 20, 'yrs'), percent('maxDti', 'Max EMI-to-income', 45)]],
    ['stamp-duty-registration', 'Stamp Duty and Registration Calculator', 'stamp-duty', [money('homePrice', 'Property value', 8000000), percent('rate', 'Stamp duty rate', 6), percent('registrationRate', 'Registration rate', 1)]]
  ] satisfies GeneratedCalculator[]).map(([slug, title, formula, inputs]) => defineCalculator({
    category: borrowingFormulas.has(formula) ? 'Borrowing' : formula === 'india-tax' || formula === 'salary' || formula === 'hra' ? 'Tax' : 'Investing',
    description: `${title} for a quick planning estimate you can turn into a goal, account, or plan.`,
    explanation: `${title} uses the inputs you provide to estimate the main outcome and show the supporting amount behind it.`,
    formula: formula as CalculatorFormula,
    h1: title,
    inputs: [...inputs],
    keywords: [title.toLowerCase()],
    region: 'India',
    slug: slug as string,
    title: title as string
  })),
  ...([
    ['mortgage', 'Mortgage Payment Calculator', 'loan', loanInputs],
    ['mortgage-affordability', 'Mortgage Affordability Calculator', 'loan', [money('principal', 'Affordable loan target', 350000), percent('rate', 'Mortgage rate', 6.75), number('years', 'Term', 30, 'yrs')]],
    ['mortgage-refinance', 'Mortgage Refinance Calculator', 'refinance', [money('principal', 'Current balance', 300000), percent('currentRate', 'Current rate', 7.25), percent('newRate', 'New rate', 6.25), number('years', 'New term', 30, 'yrs'), money('closingCosts', 'Closing costs', 6000)]],
    ['amortization', 'Amortization Schedule Calculator', 'amortization', loanInputs],
    ['extra-mortgage-payment', 'Extra Mortgage Payment Calculator', 'debt-payoff', [money('balance', 'Mortgage balance', 300000), percent('rate', 'Interest rate', 6.75), money('payment', 'Monthly payment with extra', 2400)]],
    ['mortgage-payoff', 'Mortgage Payoff Calculator', 'debt-payoff', [money('balance', 'Mortgage balance', 300000), percent('rate', 'Interest rate', 6.75), money('payment', 'Monthly payment', 2400)]],
    ['biweekly-mortgage-payment', 'Biweekly Mortgage Payment Calculator', 'biweekly-loan', loanInputs],
    ['mortgage-recast', 'Mortgage Recast Calculator', 'mortgage-recast', [money('principal', 'Current mortgage balance', 300000), money('prepayment', 'Recast principal payment', 50000), percent('rate', 'Interest rate', 6.5), number('years', 'Remaining term', 25, 'yrs')]],
    ['mortgage-points', 'Mortgage Points Calculator', 'refinance', [money('principal', 'Loan amount', 350000), percent('currentRate', 'No-points rate', 6.88), percent('newRate', 'Discounted rate', 6.5), number('years', 'Term', 30, 'yrs'), money('closingCosts', 'Points cost', 7000)]],
    ['15-vs-30-year-mortgage', '15 vs 30 Year Mortgage Calculator', 'loan-comparison', [money('principal', 'Loan amount', 350000), percent('currentRate', '15-year rate', 6.25), percent('newRate', '30-year rate', 6.75), number('compareYears', 'Short term', 15, 'yrs'), number('years', 'Long term', 30, 'yrs')]],
    ['arm-mortgage', 'ARM Mortgage Calculator', 'loan', [money('principal', 'Loan amount', 350000), percent('rate', 'Initial ARM rate', 5.75), number('years', 'Amortization term', 30, 'yrs')]],
    ['interest-only-mortgage', 'Interest Only Mortgage Calculator', 'interest-only-loan', loanInputs],
    ['balloon-loan', 'Balloon Loan Calculator', 'balloon-loan', [money('principal', 'Loan amount', 250000), percent('rate', 'Interest rate', 6.5), number('years', 'Amortization term', 30, 'yrs'), number('balloonYears', 'Balloon due after', 5, 'yrs')]],
    ['closing-costs', 'Closing Costs Calculator', 'closing-costs', [money('homePrice', 'Home price', 450000), money('downPayment', 'Down payment', 90000), percent('rate', 'Closing cost rate', 3)]],
    ['escrow', 'Escrow Calculator', 'escrow', [money('homePrice', 'Home price', 450000), percent('taxRate', 'Property tax rate', 1.2), money('insurance', 'Annual insurance', 1800), money('hoa', 'Monthly HOA', 0)]],
    ['debt-to-income', 'Debt-to-Income Ratio Calculator', 'dti', [money('income', 'Gross monthly income', 9000), money('debts', 'Monthly debts', 1200), money('payment', 'Proposed housing payment', 2600)]],
    ['loan-comparison', 'Loan Comparison Calculator', 'loan-comparison', [money('principal', 'Loan amount', 300000), percent('currentRate', 'Option A rate', 6.5), percent('newRate', 'Option B rate', 7), number('compareYears', 'Option A term', 15, 'yrs'), number('years', 'Option B term', 30, 'yrs')]],
    ['apr', 'APR Calculator', 'apr', [money('principal', 'Loan amount', 300000), percent('rate', 'Note interest rate', 6.5), number('years', 'Term', 30, 'yrs'), money('closingCosts', 'Finance charges / fees', 6000)]],
    ['home-equity-loan', 'Home Equity Loan Calculator', 'loan', [money('principal', 'Home equity loan amount', 50000), percent('rate', 'Interest rate', 8), number('years', 'Term', 10, 'yrs')]],
    ['fha-loan', 'FHA Loan Calculator', 'fha-loan', [money('homePrice', 'Home price', 350000), money('downPayment', 'Down payment', 12250), percent('rate', 'Interest rate', 6.5), number('years', 'Term', 30, 'yrs'), percent('feeRate', 'Upfront MIP / funding fee', 1.75), percent('pmiRate', 'Annual MIP rate', 0.55)]],
    ['va-loan', 'VA Loan Calculator', 'va-loan', [money('homePrice', 'Home price', 350000), money('downPayment', 'Down payment', 0), percent('rate', 'Interest rate', 6.25), number('years', 'Term', 30, 'yrs'), percent('feeRate', 'Funding fee', 2.15)]],
    ['fha-vs-conventional', 'FHA vs Conventional Loan Calculator', 'fha-conventional', [money('homePrice', 'Home price', 350000), money('downPayment', 'Down payment', 17500), percent('rate', 'Base mortgage rate', 6.5), number('years', 'Term', 30, 'yrs'), percent('pmiRate', 'Conventional PMI rate', 0.5)]],
    ['rent-vs-buy', 'Rent vs Buy Calculator', 'rent-buy', [money('rent', 'Monthly rent', 2500), money('homePrice', 'Home price', 450000), money('downPayment', 'Down payment', 90000), percent('rate', 'Mortgage rate', 6.75), number('years', 'Compare years', 7, 'yrs')]],
    ['credit-card-payoff', 'Credit Card Payoff Calculator', 'debt-payoff', [money('balance', 'Credit card balance', 8000), percent('rate', 'APR', 22), money('payment', 'Monthly payment', 350)]],
    ['debt-snowball-avalanche', 'Debt Snowball vs Avalanche Calculator', 'debt-strategy', [
      money('debt1Balance', 'Credit card balance', 8000),
      percent('debt1Rate', 'Credit card APR', 22),
      money('debt1Minimum', 'Credit card minimum payment', 240),
      money('debt2Balance', 'Auto loan balance', 12000),
      percent('debt2Rate', 'Auto loan APR', 8),
      money('debt2Minimum', 'Auto loan minimum payment', 320),
      money('debt3Balance', 'Student loan balance', 5000),
      percent('debt3Rate', 'Student loan APR', 6),
      money('debt3Minimum', 'Student loan minimum payment', 120),
      money('extraPayment', 'Extra monthly payoff budget', 220)
    ]],
    ['auto-loan', 'Auto Loan Calculator', 'loan', [money('principal', 'Auto loan amount', 32000), percent('rate', 'Interest rate', 7), number('years', 'Term', 5, 'yrs')]],
    ['personal-loan', 'Personal Loan Calculator', 'loan', [money('principal', 'Personal loan amount', 15000), percent('rate', 'Interest rate', 11), number('years', 'Term', 4, 'yrs')]],
    ['student-loan-payoff', 'Student Loan Payoff Calculator', 'debt-payoff', [money('balance', 'Student loan balance', 45000), percent('rate', 'Interest rate', 6), money('payment', 'Monthly payment', 600)]],
    ['401k', '401(k) Calculator', 'compound', [money('principal', 'Current 401(k)', 50000), money('monthly', 'Monthly contribution', 900), ...termInputs]],
    ['roth-vs-traditional-ira', 'Roth vs Traditional IRA Calculator', 'roth-traditional', [money('income', 'Annual IRA contribution', 7000), percent('currentTaxRate', 'Current marginal tax rate', 22), percent('futureTaxRate', 'Retirement tax rate', 22), percent('rate', 'Annual return', 7), number('years', 'Years to retirement', 25, 'yrs')]],
    ['paycheck', 'Paycheck Calculator', 'paycheck', [money('income', 'Gross pay per period', 5000), percent('effectiveRate', 'Estimated withholding rate', 22), number('periods', 'Pay periods per year', 26), money('preTaxDeductions', 'Pre-tax deductions per period', 250), money('postTaxDeductions', 'Post-tax deductions per period', 75)]],
    ['income-tax-us', 'Income Tax Estimator', 'us-tax', [money('income', 'Annual gross income', 120000), money('deductions', 'Extra deductions beyond standard deduction', 0), percent('stateRate', 'State/local placeholder rate', 4)]],
    ['social-security-break-even', 'Social Security Break-even Calculator', 'social-security', [money('early', 'Early monthly benefit', 1800), money('full', 'Full monthly benefit', 2600), number('delayYears', 'Years delayed', 5, 'yrs')]],
    ['rmd', 'Required Minimum Distribution Calculator', 'rmd', [money('balance', 'Retirement account balance', 800000), number('divisor', 'IRS life expectancy divisor', 26.5)]]
  ] satisfies GeneratedCalculator[]).map(([slug, title, formula, inputs]) => defineCalculator({
    category: borrowingFormulas.has(formula) ? 'Borrowing' : formula === 'us-tax' || formula === 'roth-traditional' || formula === 'paycheck' || formula === 'rmd' ? 'Tax' : 'Planning',
    description: `${title} for a quick planning estimate you can turn into a goal, account, or plan.`,
    explanation: `${title} uses the inputs you provide to estimate the main outcome and show the supporting amount behind it.`,
    formula: formula as CalculatorFormula,
    h1: title,
    inputs: [...inputs],
    keywords: [title.toLowerCase()],
    region: 'US',
    slug: slug as string,
    title: title as string
  })),
  ...([
    ['cagr', 'CAGR Calculator', 'investment-return', [money('initial', 'Initial value', 10000), money('final', 'Final value', 18000), number('years', 'Years', 5, 'yrs')]],
    ['xirr', 'XIRR Calculator', 'xirr', [money('initial', 'Initial outflow', 10000), money('monthly', 'Average monthly contribution', 500), money('final', 'Ending value', 50000), number('years', 'Years', 5, 'yrs')]],
    ['inflation', 'Inflation Calculator', 'inflation', [money('principal', 'Today cost', 10000), percent('rate', 'Inflation rate', 4), number('years', 'Years', 10, 'yrs')]],
    ['rule-of-72', 'Rule of 72 Calculator', 'rule-72', [percent('rate', 'Annual return', 8)]],
    ['capital-gains-tax', 'Capital Gains Tax Calculator', 'capital-gains', [money('gain', 'Capital gain', 50000), percent('effectiveRate', 'Estimated tax rate', 15)]],
    ['gst', 'GST Calculator', 'gst', [money('principal', 'Pre-tax amount', 10000), percent('rate', 'GST rate', 18)]],
    ['tds', 'TDS Calculator', 'tax-rate', [money('income', 'Payment amount', 100000), percent('effectiveRate', 'TDS rate', 10), money('deductions', 'Exempt amount', 0)]],
    ['down-payment', 'Down Payment Calculator', 'down-payment', [money('homePrice', 'Home price', 450000), percent('downPercent', 'Down payment percent', 20)]],
    ['pmi', 'PMI Calculator', 'pmi', [money('homePrice', 'Home price', 450000), money('downPayment', 'Down payment', 45000), percent('rate', 'Annual PMI rate', 0.6)]],
    ['heloc', 'HELOC Calculator', 'loan', [money('principal', 'HELOC balance', 50000), percent('rate', 'Interest rate', 8.5), number('years', 'Repayment years', 10, 'yrs')]],
    ['balance-transfer', 'Balance Transfer Calculator', 'balance-transfer', [money('balance', 'Balance transferred', 8000), percent('currentRate', 'Current APR', 22), percent('newRate', 'Promo APR', 3), percent('feeRate', 'Transfer fee', 3), money('payment', 'Monthly payment', 400)]],
    ['cd', 'CD Calculator', 'fd', [money('principal', 'Deposit amount', 10000), percent('rate', 'APY', 4.5), number('years', 'Term', 2, 'yrs')]],
    ['hysa', 'HYSA Calculator', 'compound', [money('principal', 'Starting savings', 10000), money('monthly', 'Monthly deposit', 500), percent('rate', 'APY', 4.25), number('years', 'Years', 3, 'yrs')]],
    ['life-insurance-needs', 'Life Insurance Needs Calculator', 'insurance', [money('income', 'Annual income to replace', 100000), number('years', 'Years of support', 10, 'yrs'), money('debts', 'Debts and final expenses', 150000), money('savings', 'Existing savings/coverage', 100000)]],
    ['lease-vs-buy', 'Lease vs Buy Calculator', 'rent-buy', [money('rent', 'Monthly lease payment', 450), money('homePrice', 'Vehicle purchase price', 35000), money('downPayment', 'Down payment', 5000), percent('rate', 'Loan rate', 7), number('years', 'Compare years', 4, 'yrs')]],
    ['roi', 'ROI Calculator', 'roi', [money('gain', 'Net gain', 5000), money('cost', 'Cost', 20000)]]
  ] satisfies GeneratedCalculator[]).map(([slug, title, formula, inputs]) => defineCalculator({
    category: borrowingFormulas.has(formula) ? 'Borrowing' : formula === 'capital-gains' || formula === 'gst' || formula === 'tax-rate' ? 'Tax' : 'Investing',
    description: `${title} for a quick estimate you can compare, save, or revisit later.`,
    explanation: `${title} uses the inputs you provide to estimate the main outcome and show the supporting amount behind it.`,
    formula: formula as CalculatorFormula,
    h1: title,
    inputs: [...inputs],
    keywords: [title.toLowerCase()],
    region: 'Global',
    slug: slug as string,
    title: title as string
  }))
];

export function calculatorPath(slug: string): `/calculators/${string}` {
  return `/calculators/${slug}`;
}

export function findSeoCalculator(path: string): SeoCalculator | null {
  const slug = path.replace(/^\/calculators\//, '');
  return seoCalculators.find((calculator) => calculator.slug === slug) ?? null;
}

export function calculatorCurrency(calculator: SeoCalculator): 'INR' | 'USD' {
  return calculator.region === 'India' || ['gst', 'tds'].includes(calculator.slug) ? 'INR' : 'USD';
}

export function calculateSeoCalculator(calculator: SeoCalculator, values: Record<string, number>): CalculatorResult {
  const get = (key: string) => Number.isFinite(values[key]) ? values[key] : 0;
  const rate = get('rate') / 100;
  const years = Math.max(0, get('years'));
  const monthlyRate = rate / 12;
  const months = Math.max(1, Math.round(years * 12));
  const fvFactor = monthlyRate === 0 ? months : ((1 + monthlyRate) ** months - 1) / monthlyRate;

  switch (calculator.formula) {
    case 'compound': {
      const futureValue = get('principal') * (1 + monthlyRate) ** months + get('monthly') * fvFactor;
      return result('Projected value', futureValue, 'Projected value after contributions and compounding.', [
        'Contributions are assumed monthly.',
        'Returns are annualized and compounded monthly.'
      ], [
        metric('Total contributions', get('principal') + get('monthly') * months, 'currency'),
        metric('Estimated growth', futureValue - get('principal') - get('monthly') * months, 'currency', 'positive')
      ]);
    }
    case 'sip': {
      const stepUp = get('stepUp') / 100;
      let futureValue = 0;
      let monthly = get('monthly');
      let contribution = 0;
      for (let month = 1; month <= months; month += 1) {
        if (stepUp > 0 && month > 1 && (month - 1) % 12 === 0) monthly *= 1 + stepUp;
        futureValue = futureValue * (1 + monthlyRate) + monthly;
        contribution += monthly;
      }
      return result('Projected corpus', futureValue, 'Estimated future value of recurring SIP contributions.', [
        'SIP contributions are monthly.',
        stepUp > 0 ? 'Monthly SIP increases once each year.' : 'No annual SIP step-up is applied.'
      ], [
        metric('Total invested', contribution, 'currency'),
        metric('Estimated gains', futureValue - contribution, 'currency', 'positive')
      ]);
    }
    case 'savings-goal': {
      const futureCurrent = get('current') * (1 + rate) ** years;
      const shortfall = Math.max(0, get('target') - futureCurrent);
      const monthlyNeeded = monthlyRate === 0 ? shortfall / months : shortfall / fvFactor;
      return result('Monthly savings needed', monthlyNeeded, 'Estimated monthly contribution required to reach the target.', [
        'Existing savings are compounded at the assumed annual rate.',
        'Monthly savings are added at month end.'
      ], [
        metric('Future current savings', futureCurrent, 'currency'),
        metric('Remaining target', shortfall, 'currency')
      ]);
    }
    case 'net-worth':
      return result('Estimated net worth', get('assets') - get('liabilities'), 'Assets minus liabilities.', [], [
        metric('Assets', get('assets'), 'currency', 'positive'),
        metric('Liabilities', get('liabilities'), 'currency', 'warning')
      ]);
    case 'budget': {
      const surplus = get('income') - get('expenses');
      return result('Monthly surplus', surplus, 'Monthly income minus monthly expenses.', [], [
        metric('Annual savings pace', surplus * 12, 'currency', surplus >= 0 ? 'positive' : 'warning'),
        metric('Savings rate', get('income') > 0 ? surplus / get('income') : 0, 'percent')
      ]);
    }
    case 'emergency-fund':
      return result('Emergency fund target', get('monthlyExpenses') * get('months'), 'Monthly expenses multiplied by target coverage months.', [], [
        metric('Monthly expenses', get('monthlyExpenses'), 'currency'),
        metric('Months covered', get('months'), 'number')
      ]);
    case 'retirement': {
      const savingYears = Math.max(0, get('retirementAge') - get('currentAge'));
      const savingMonths = Math.max(1, savingYears * 12);
      const savingRate = get('rate') / 100 / 12;
      const projected = get('currentSavings') * (1 + get('rate') / 100) ** savingYears
        + get('monthly') * (savingRate === 0 ? savingMonths : ((1 + savingRate) ** savingMonths - 1) / savingRate);
      const needed = get('withdrawalRate') > 0 ? get('annualIncome') / (get('withdrawalRate') / 100) : 0;
      return result('Projected retirement savings', projected, 'Projected savings compared with the portfolio implied by desired annual income.', [
        'Withdrawal need uses the provided withdrawal rate.',
        'Contributions are assumed monthly.'
      ], [
        metric('Estimated need', needed, 'currency'),
        metric('Gap / surplus', projected - needed, 'currency', projected >= needed ? 'positive' : 'warning')
      ]);
    }
    case 'debt-payoff': {
      const payoff = payoffDebt(get('balance'), get('rate') / 100, get('payment'));
      return result('Payoff time', payoff.months / 12, 'Estimated years to pay off the balance.', [
        'Payment is assumed fixed every month.',
        'No new charges are added.'
      ], [
        metric('Months to payoff', payoff.months, 'number'),
        metric('Total interest', payoff.interest, 'currency', 'warning')
      ]);
    }
    case 'debt-strategy': {
      const debts = debtStrategyInputs(get);
      const snowball = simulateDebtStrategy(debts, get('extraPayment'), 'snowball');
      const avalanche = simulateDebtStrategy(debts, get('extraPayment'), 'avalanche');
      return result('Avalanche interest savings', snowball.interest - avalanche.interest, 'Interest difference between avalanche and snowball payoff ordering.', [
        'Each debt receives its minimum payment first.',
        'Extra payoff dollars and freed-up minimum payments are redirected based on the selected strategy.'
      ], [
        metric('Snowball payoff months', snowball.months, 'number'),
        metric('Avalanche payoff months', avalanche.months, 'number'),
        metric('Avalanche total interest', avalanche.interest, 'currency', 'warning')
      ]);
    }
    case 'loan':
    case 'amortization': {
      const payment = loanPayment(get('principal'), get('rate') / 100, years);
      return result('Monthly payment', payment, 'Estimated fixed monthly payment.', [
        'Taxes, insurance, fees, and variable-rate changes are excluded.',
        'Payment assumes standard monthly amortization.'
      ], [
        metric('Total paid', payment * months, 'currency'),
        metric('Total interest', payment * months - get('principal'), 'currency', 'warning')
      ]);
    }
    case 'apr': {
      const payment = loanPayment(get('principal'), get('rate') / 100, years);
      const apr = approximateApr(get('principal'), get('closingCosts'), payment, years);
      return result('Estimated APR', apr, 'Approximate annual percentage rate after including finance charges.', [
        'APR is estimated by solving for the rate implied by net loan proceeds and the stated payment.',
        'Confirm lender disclosures for exact APR calculations.'
      ], [
        metric('Monthly payment', payment, 'currency'),
        metric('Finance charges / fees', get('closingCosts'), 'currency', 'warning')
      ]);
    }
    case 'balloon-loan': {
      const balloonMonth = Math.max(0, Math.round(Math.min(get('balloonYears') || years, years) * 12));
      const payment = loanPayment(get('principal'), get('rate') / 100, years);
      const balloonBalance = remainingLoanBalance(get('principal'), get('rate') / 100, years, balloonMonth);
      return result('Balloon balance', balloonBalance, 'Estimated remaining principal due when the balloon payment is reached.', [
        'Monthly payments are based on the longer amortization term.',
        'The balloon amount is the unpaid balance at the balloon date.'
      ], [
        metric('Monthly payment before balloon', payment, 'currency'),
        metric('Balloon due after months', balloonMonth, 'number')
      ]);
    }
    case 'biweekly-loan': {
      const monthlyPayment = loanPayment(get('principal'), get('rate') / 100, years);
      const biweeklyPayment = monthlyPayment / 2;
      return result('Biweekly payment', biweeklyPayment, 'Estimated half-payment made every two weeks.', [
        'Twenty-six biweekly payments equal thirteen standard monthly payments per year.',
        'The exact payoff acceleration depends on servicer posting rules.'
      ], [
        metric('Standard monthly payment', monthlyPayment, 'currency'),
        metric('Extra principal pace per year', monthlyPayment, 'currency', 'positive')
      ]);
    }
    case 'closing-costs': {
      const closingCosts = get('homePrice') * get('rate') / 100;
      const cashToClose = get('downPayment') + closingCosts;
      return result('Estimated cash to close', cashToClose, 'Down payment plus estimated closing costs.', [
        'Closing costs are estimated from the percentage you provide.',
        'Prepaids, credits, and lender-specific fees can change the final amount.'
      ], [
        metric('Estimated closing costs', closingCosts, 'currency', 'warning'),
        metric('Loan amount before costs', Math.max(0, get('homePrice') - get('downPayment')), 'currency')
      ]);
    }
    case 'dti': {
      const income = get('income');
      const totalDebt = get('debts') + get('payment');
      const dti = income > 0 ? totalDebt / income : 0;
      return result('Debt-to-income ratio', dti, 'Monthly debt obligations divided by gross monthly income.', [
        'This is a planning ratio, not an approval decision.',
        'Lenders may calculate income, debts, and housing costs differently.'
      ], [
        metric('Monthly debt included', totalDebt, 'currency', 'warning'),
        metric('Remaining room at 43% DTI', income * 0.43 - totalDebt, 'currency', income * 0.43 >= totalDebt ? 'positive' : 'warning')
      ]);
    }
    case 'escrow': {
      const annualTax = get('homePrice') * get('taxRate') / 100;
      const monthlyEscrow = annualTax / 12 + get('insurance') / 12 + get('hoa');
      return result('Monthly escrow estimate', monthlyEscrow, 'Monthly property tax, insurance, and HOA reserve estimate.', [
        'Escrow can change as taxes and insurance premiums are reassessed.',
        'HOA dues are included as a monthly housing cost when provided.'
      ], [
        metric('Annual property tax', annualTax, 'currency', 'warning'),
        metric('Monthly insurance reserve', get('insurance') / 12, 'currency')
      ]);
    }
    case 'fha-loan': {
      const baseLoan = Math.max(0, get('homePrice') - get('downPayment'));
      const upfrontMip = baseLoan * get('feeRate') / 100;
      const financedLoan = baseLoan + upfrontMip;
      const principalAndInterest = loanPayment(financedLoan, get('rate') / 100, years);
      const monthlyMip = baseLoan * get('pmiRate') / 100 / 12;
      return result('Estimated FHA monthly payment', principalAndInterest + monthlyMip, 'Principal, interest, and estimated monthly mortgage insurance.', [
        'Upfront MIP is assumed financed into the loan amount.',
        'Taxes, homeowners insurance, and HOA dues are excluded.'
      ], [
        metric('Principal and interest', principalAndInterest, 'currency'),
        metric('Monthly mortgage insurance', monthlyMip, 'currency', 'warning')
      ]);
    }
    case 'fha-conventional': {
      const baseLoan = Math.max(0, get('homePrice') - get('downPayment'));
      const fhaFinanced = baseLoan * 1.0175;
      const fhaMonthly = loanPayment(fhaFinanced, get('rate') / 100, years) + baseLoan * 0.0055 / 12;
      const conventionalMonthly = loanPayment(baseLoan, get('rate') / 100, years) + baseLoan * get('pmiRate') / 100 / 12;
      return result('FHA monthly payment', fhaMonthly, 'Compares an FHA-style payment with a simplified conventional loan estimate.', [
        'FHA uses a 1.75% upfront mortgage insurance estimate and 0.55% annual MIP estimate.',
        'Conventional PMI uses the annual PMI rate you provide.'
      ], [
        metric('Conventional monthly payment', conventionalMonthly, 'currency'),
        metric('FHA minus conventional', fhaMonthly - conventionalMonthly, 'currency', fhaMonthly <= conventionalMonthly ? 'positive' : 'warning')
      ]);
    }
    case 'va-loan': {
      const baseLoan = Math.max(0, get('homePrice') - get('downPayment'));
      const fundingFee = baseLoan * get('feeRate') / 100;
      const payment = loanPayment(baseLoan + fundingFee, get('rate') / 100, years);
      return result('Estimated VA monthly payment', payment, 'Principal and interest after adding the estimated VA funding fee.', [
        'Funding fee is assumed financed into the loan amount.',
        'Taxes, insurance, and exemption eligibility are excluded.'
      ], [
        metric('Funding fee', fundingFee, 'currency', 'warning'),
        metric('Financed loan amount', baseLoan + fundingFee, 'currency')
      ]);
    }
    case 'flat-rate-loan': {
      const flatInterest = get('principal') * get('rate') / 100 * years;
      const flatEmi = (get('principal') + flatInterest) / months;
      const reducingEmi = loanPayment(get('principal'), get('rate') / 100, years);
      const reducingInterest = reducingEmi * months - get('principal');
      return result('Flat-rate EMI', flatEmi, 'Monthly payment when interest is calculated on the original principal for the full tenure.', [
        'Flat-rate loans can look cheaper because the quoted rate is not directly comparable to reducing-balance APR.',
        'The comparison uses the same principal, tenure, and nominal rate.'
      ], [
        metric('Reducing-balance EMI', reducingEmi, 'currency'),
        metric('Extra interest versus reducing balance', flatInterest - reducingInterest, 'currency', 'warning')
      ]);
    }
    case 'interest-only-loan': {
      const interestOnlyPayment = get('principal') * get('rate') / 100 / 12;
      const amortizingPayment = loanPayment(get('principal'), get('rate') / 100, years);
      return result('Interest-only payment', interestOnlyPayment, 'Estimated monthly interest without principal reduction.', [
        'The principal balance does not fall during the interest-only period.',
        'Payment can rise when amortization begins or the balance comes due.'
      ], [
        metric('Comparable amortizing payment', amortizingPayment, 'currency'),
        metric('Principal still owed', get('principal'), 'currency', 'warning')
      ]);
    }
    case 'loan-comparison': {
      const optionAYears = Math.max(1, get('compareYears'));
      const optionBYears = Math.max(1, years);
      const optionAPayment = loanPayment(get('principal'), get('currentRate') / 100, optionAYears);
      const optionBPayment = loanPayment(get('principal'), get('newRate') / 100, optionBYears);
      const optionAInterest = optionAPayment * optionAYears * 12 - get('principal');
      const optionBInterest = optionBPayment * optionBYears * 12 - get('principal');
      return result('Option B monthly payment', optionBPayment, 'Side-by-side payment and lifetime-interest comparison for two loan options.', [
        'Option A uses the first rate and term.',
        'Option B uses the second rate and term.'
      ], [
        metric('Option A monthly payment', optionAPayment, 'currency'),
        metric('Monthly difference', optionBPayment - optionAPayment, 'currency', optionBPayment <= optionAPayment ? 'positive' : 'warning'),
        metric('Option B extra lifetime interest', optionBInterest - optionAInterest, 'currency', optionBInterest <= optionAInterest ? 'positive' : 'warning')
      ]);
    }
    case 'loan-eligibility': {
      const maxPayment = Math.max(0, get('income') * get('maxDti') / 100 - get('debts'));
      const eligibleLoan = presentValueFromPayment(maxPayment, get('rate') / 100, years);
      return result('Eligible loan amount', eligibleLoan, 'Estimated loan principal supported by the monthly EMI capacity.', [
        'Eligibility is estimated from income, existing obligations, target EMI share, rate, and tenure.',
        'Actual approvals can include credit score, employer, property, and lender policy checks.'
      ], [
        metric('Maximum EMI capacity', maxPayment, 'currency'),
        metric('EMI-to-income target', get('maxDti') / 100, 'percent')
      ]);
    }
    case 'loan-prepayment': {
      const principal = get('principal');
      const payment = loanPayment(principal, get('rate') / 100, years);
      const originalInterest = payment * months - principal;
      const remainingAfterPrepay = Math.max(0, principal - get('prepayment'));
      const accelerated = payoffDebt(remainingAfterPrepay, get('rate') / 100, payment);
      return result('Estimated interest saved', Math.max(0, originalInterest - accelerated.interest), 'Interest avoided after applying the prepayment now.', [
        'Prepayment is modeled as an immediate principal reduction.',
        'The original EMI is kept the same to estimate faster payoff.'
      ], [
        metric('New payoff months', accelerated.months, 'number'),
        metric('Remaining balance after prepayment', remainingAfterPrepay, 'currency')
      ]);
    }
    case 'mortgage-recast': {
      const oldPayment = loanPayment(get('principal'), get('rate') / 100, years);
      const newBalance = Math.max(0, get('principal') - get('prepayment'));
      const newPayment = loanPayment(newBalance, get('rate') / 100, years);
      return result('Monthly payment after recast', newPayment, 'Estimated payment after applying a principal recast and keeping the remaining term.', [
        'The recast lowers the balance used to calculate the payment.',
        'Fees, servicer rules, and escrow changes are excluded.'
      ], [
        metric('Monthly payment reduction', oldPayment - newPayment, 'currency', 'positive'),
        metric('Recast balance', newBalance, 'currency')
      ]);
    }
    case 'investment-return': {
      const annualized = years > 0 && get('initial') > 0 ? (get('final') / get('initial')) ** (1 / years) - 1 : 0;
      return result('Annualized return', annualized, 'Estimated annualized return from the supplied values.', [], [
        metric('Starting value', get('initial'), 'currency'),
        metric('Ending value', get('final'), 'currency')
      ]);
    }
    case 'xirr': {
      const contributions = get('initial') + get('monthly') * months;
      const annualized = years > 0 && contributions > 0 ? (get('final') / contributions) ** (1 / years) - 1 : 0;
      return result('Approximate annualized return', annualized, 'Approximate annualized return after including average recurring contributions.', [
        'This is a simplified money-weighted estimate, not a dated cash-flow XIRR schedule.',
        'Use exact transaction dates for formal performance reporting.'
      ], [
        metric('Starting plus contributions', contributions, 'currency'),
        metric('Ending value', get('final'), 'currency')
      ]);
    }
    case 'lumpsum':
    case 'fd': {
      const futureValue = get('principal') * (1 + rate) ** years;
      return result('Maturity value', futureValue, 'Estimated maturity value after compounding.', [], [
        metric('Estimated interest', futureValue - get('principal'), 'currency', 'positive')
      ]);
    }
    case 'rd': {
      const futureValue = get('monthly') * fvFactor;
      return result('Maturity value', futureValue, 'Estimated recurring deposit maturity value.', [], [
        metric('Total deposits', get('monthly') * months, 'currency'),
        metric('Estimated interest', futureValue - get('monthly') * months, 'currency', 'positive')
      ]);
    }
    case 'swp': {
      const runway = withdrawalRunway(get('corpus'), get('rate') / 100, get('withdrawal'));
      return result('Estimated withdrawal runway', runway.months / 12, 'Estimated years the corpus may support the monthly withdrawal.', [
        'This is a simplified drawdown estimate.',
        'Market sequence risk is not modeled.'
      ], [
        metric('Months covered', runway.months, 'number'),
        metric('Ending balance estimate', runway.endingBalance, 'currency')
      ]);
    }
    case 'gst':
      return result('Total including GST', get('principal') * (1 + get('rate') / 100), 'Adds GST to the pre-tax amount using the rate you provide.', [
        'GST calculators are planning estimates, not filing advice.',
        'Confirm the applicable slab or place-of-supply rules before filing.'
      ], [
        metric('Estimated GST', get('principal') * get('rate') / 100, 'currency', 'warning'),
        metric('Pre-tax amount', get('principal'), 'currency')
      ]);
    case 'india-tax': {
      const oldRegime = indiaOldRegimeTax(get('income'), get('deductions'));
      const newRegime = indiaNewRegimeTax(get('income'));
      const bestRegime = newRegime.totalTax <= oldRegime.totalTax ? newRegime : oldRegime;
      return result('Estimated lower-regime net income', Math.max(0, get('income') - bestRegime.totalTax), 'Compares simplified old and new regime income-tax estimates and uses the lower tax outcome.', [
        'Uses a simplified India individual under-60 estimate for assessment year 2026-27.',
        'Old regime applies the deductions/exemptions input; new regime ignores that input.',
        'Cess is modeled at 4% and surcharge, special rates, rebates edge cases, and employer-specific salary components are excluded.'
      ], [
        metric('Old regime tax estimate', oldRegime.totalTax, 'currency', 'warning'),
        metric('New regime tax estimate', newRegime.totalTax, 'currency', 'warning'),
        metric('Estimated tax saved', Math.abs(oldRegime.totalTax - newRegime.totalTax), 'currency', 'positive')
      ]);
    }
    case 'us-tax': {
      const estimate = usSingleFederalTaxEstimate(get('income'), get('deductions'), get('stateRate') / 100);
      return result('Estimated after-tax income', estimate.netIncome ?? Math.max(0, get('income') - estimate.totalTax), 'Simplified US federal single-filer estimate with a state/local placeholder rate.', [
        'Uses 2026 IRS single-filer federal brackets and the 2026 standard deduction.',
        'State and local tax are modeled with the placeholder rate you provide.',
        'Credits, payroll tax, AMT, itemization rules, filing statuses, and state-specific rules are excluded.'
      ], [
        metric('Estimated federal tax', estimate.federalTax ?? estimate.baseTax, 'currency', 'warning'),
        metric('State/local placeholder tax', estimate.stateTax ?? 0, 'currency', 'warning'),
        metric('Taxable income after deductions', estimate.taxableIncome, 'currency')
      ]);
    }
    case 'paycheck': {
      const annualGross = get('income') * get('periods');
      const preTax = get('preTaxDeductions') * get('periods');
      const postTax = get('postTaxDeductions') * get('periods');
      const taxable = Math.max(0, annualGross - preTax);
      const withholding = taxable * get('effectiveRate') / 100;
      const annualTakeHome = Math.max(0, annualGross - preTax - withholding - postTax);
      return result('Estimated annual take-home', annualTakeHome, 'Annualized paycheck estimate after pre-tax deductions, estimated withholding, and post-tax deductions.', [
        'Withholding is modeled from the percentage you provide, not from Form W-4 tables.',
        'Pre-tax deductions reduce taxable wages; post-tax deductions reduce take-home only.'
      ], [
        metric('Estimated take-home per paycheck', get('periods') > 0 ? annualTakeHome / get('periods') : 0, 'currency'),
        metric('Estimated withholding', withholding, 'currency', 'warning'),
        metric('Taxable wages', taxable, 'currency')
      ]);
    }
    case 'salary': {
      const payrollDeductions = get('income') * get('employeePfRate') / 100 + get('professionalTax');
      const taxable = Math.max(0, get('income') - payrollDeductions);
      const incomeTax = taxable * get('effectiveRate') / 100;
      const annualTakeHome = Math.max(0, get('income') - payrollDeductions - incomeTax);
      return result('Estimated annual take-home', annualTakeHome, 'CTC-to-take-home estimate after payroll deductions and an estimated income-tax rate.', [
        'This is a salary planning estimate, not payroll or filing advice.',
        'Employee PF/payroll deductions and professional tax are modeled from the inputs you provide.'
      ], [
        metric('Estimated monthly take-home', annualTakeHome / 12, 'currency'),
        metric('Payroll deductions', payrollDeductions, 'currency', 'warning'),
        metric('Estimated income tax', incomeTax, 'currency', 'warning')
      ]);
    }
    case 'roth-traditional': {
      const futureValue = get('income') * (1 + get('rate') / 100) ** years;
      const traditionalAfterTax = futureValue * (1 - get('futureTaxRate') / 100);
      const currentTaxSavings = get('income') * get('currentTaxRate') / 100;
      return result('Roth after-tax value', futureValue, 'Compares a Roth contribution with the after-tax value of the same traditional IRA contribution.', [
        'Contribution limits, eligibility, required distributions, and state tax are excluded.',
        'Traditional value is reduced by the retirement tax rate you provide.',
        'Current traditional tax savings are shown separately instead of assumed reinvested.'
      ], [
        metric('Traditional after-tax value', traditionalAfterTax, 'currency'),
        metric('Roth minus traditional', futureValue - traditionalAfterTax, 'currency', futureValue >= traditionalAfterTax ? 'positive' : 'warning'),
        metric('Current traditional tax savings', currentTaxSavings, 'currency')
      ]);
    }
    case 'tax-rate':
    case 'capital-gains': {
      const base = Math.max(0, get('income') || get('gain') || get('principal'));
      const deductions = get('deductions');
      const taxable = Math.max(0, base - deductions);
      const tax = taxable * (get('effectiveRate') || get('rate')) / 100;
      const net = base - tax;
      return result('Estimated net amount', net, 'Estimated using the rate you provide, not statutory tax tables.', [
        'Tax calculators are planning estimates, not filing advice.',
        'Use your effective rate or confirm details with a tax professional.'
      ], [
        metric('Estimated tax', tax, 'currency', 'warning'),
        metric('Taxable base', taxable, 'currency')
      ]);
    }
    case 'rmd': {
      const distribution = get('divisor') > 0 ? get('balance') / get('divisor') : 0;
      return result('Estimated RMD', distribution, 'Retirement account balance divided by the life expectancy divisor.', [
        'This is a simplified Required Minimum Distribution estimate.',
        'Confirm the correct IRS table, balance date, and age rules before acting.'
      ], [
        metric('Remaining balance after RMD', Math.max(0, get('balance') - distribution), 'currency'),
        metric('Divisor used', get('divisor'), 'number')
      ]);
    }
    case 'hra': {
      const salary = get('salary');
      const exemption = Math.max(0, Math.min(get('hra'), Math.max(0, get('rent') - salary * 0.1), salary * (get('metroPercent') / 100)));
      return result('Estimated HRA exemption', exemption, 'Minimum of HRA received, rent above 10% salary, and city salary cap.', [
        'Uses the common HRA planning formula.',
        'Confirm eligibility and documentation before filing taxes.'
      ], [
        metric('Taxable HRA estimate', Math.max(0, get('hra') - exemption), 'currency')
      ]);
    }
    case 'ppf': {
      const futureValue = rate === 0
        ? get('annual') * years
        : get('annual') * (((1 + rate) ** years - 1) / rate) * (1 + rate);
      return result('Estimated PPF maturity', futureValue, 'Annual contribution compounded at the assumed rate.', [], [
        metric('Total contributions', get('annual') * years, 'currency'),
        metric('Estimated interest', futureValue - get('annual') * years, 'currency', 'positive')
      ]);
    }
    case 'epf': {
      const monthly = get('employee') + get('employer');
      const futureValue = monthly * fvFactor;
      return result('Estimated EPF corpus', futureValue, 'Employee plus employer monthly contributions compounded over time.', [], [
        metric('Total contributions', monthly * months, 'currency'),
        metric('Estimated growth', futureValue - monthly * months, 'currency', 'positive')
      ]);
    }
    case 'nps': {
      const corpus = get('monthly') * fvFactor;
      return result('Estimated NPS corpus', corpus, 'Monthly contribution compounded at the assumed annual rate.', [], [
        metric('Lump sum portion', corpus * (1 - get('annuityPercent') / 100), 'currency'),
        metric('Annuity portion', corpus * get('annuityPercent') / 100, 'currency')
      ]);
    }
    case 'gratuity': {
      const gratuity = get('salary') * 15 / 26 * get('years');
      return result('Estimated gratuity', gratuity, 'Estimated from last drawn basic plus DA and completed service years.', [
        'This is a simplified gratuity estimate.',
        'Eligibility and caps can vary.'
      ]);
    }
    case 'refinance': {
      const oldPayment = loanPayment(get('principal'), get('currentRate') / 100, years);
      const newPayment = loanPayment(get('principal') + get('closingCosts'), get('newRate') / 100, years);
      const savings = oldPayment - newPayment;
      return result('Monthly savings', savings, 'Estimated monthly payment difference after refinancing.', [], [
        metric('Break-even months', savings > 0 ? get('closingCosts') / savings : 0, 'number'),
        metric('New payment', newPayment, 'currency')
      ]);
    }
    case 'rent-buy': {
      const buyMonthly = loanPayment(Math.max(0, get('homePrice') - get('downPayment')), get('rate') / 100, Math.max(1, get('years')));
      return result('Estimated buy monthly cost', buyMonthly, 'Simplified monthly purchase financing cost compared with rent.', [
        'Taxes, maintenance, insurance, transaction costs, and appreciation are not fully modeled.',
        'Use this as a first comparison only.'
      ], [
        metric('Current rent', get('rent'), 'currency'),
        metric('Monthly difference', buyMonthly - get('rent'), 'currency', buyMonthly > get('rent') ? 'warning' : 'positive')
      ]);
    }
    case 'down-payment': {
      const amount = get('homePrice') * get('downPercent') / 100;
      return result('Down payment target', amount, 'Home price multiplied by down payment percentage.', [], [
        metric('Loan amount before costs', get('homePrice') - amount, 'currency')
      ]);
    }
    case 'pmi': {
      const loan = Math.max(0, get('homePrice') - get('downPayment'));
      return result('Estimated monthly PMI', loan * get('rate') / 100 / 12, 'Estimated PMI using an annual PMI rate.', [], [
        metric('Loan-to-value', get('homePrice') > 0 ? loan / get('homePrice') : 0, 'percent'),
        metric('Estimated loan amount', loan, 'currency')
      ]);
    }
    case 'balance-transfer': {
      const fee = get('balance') * get('feeRate') / 100;
      const currentPayoff = payoffDebt(get('balance'), get('currentRate') / 100, get('payment'));
      const promoPayoff = payoffDebt(get('balance') + fee, get('newRate') / 100, get('payment'));
      const currentCost = currentPayoff.interest;
      const promoCost = fee + promoPayoff.interest;
      return result('Estimated payoff cost savings', currentCost - promoCost, 'Compares payoff interest at the current APR with promo interest plus the transfer fee.', [
        'Assumes the same monthly payment in both scenarios.',
        'Promo APR is assumed to last through payoff for this first-pass comparison.'
      ], [
        metric('Transfer fee', fee, 'currency', 'warning'),
        metric('Promo payoff months', promoPayoff.months, 'number')
      ]);
    }
    case 'inflation': {
      const futureCost = get('principal') * (1 + rate) ** years;
      return result('Future cost', futureCost, 'Inflates today cost by the assumed annual inflation rate.', [], [
        metric('Increase', futureCost - get('principal'), 'currency', 'warning')
      ]);
    }
    case 'rule-72':
      return result('Years to double', get('rate') > 0 ? 72 / get('rate') : 0, 'Rule of 72 estimate for doubling time.', [], []);
    case 'social-security': {
      const monthlyIncrease = get('full') - get('early');
      const forgoneBenefits = get('early') * get('delayYears') * 12;
      const breakEvenMonths = monthlyIncrease > 0 ? forgoneBenefits / monthlyIncrease : 0;
      return result('Break-even years after delaying', breakEvenMonths / 12, 'Estimated time after delayed claiming for the higher monthly benefit to catch up.', [
        'This simplified break-even estimate ignores COLA, taxes, survivor benefits, and investment returns.',
        'Use it as a first-pass retirement planning comparison.'
      ], [
        metric('Forgone early benefits', forgoneBenefits, 'currency'),
        metric('Monthly benefit increase', monthlyIncrease, 'currency', monthlyIncrease > 0 ? 'positive' : 'warning')
      ]);
    }
    case 'insurance': {
      const need = Math.max(0, get('income') * get('years') + get('debts') - get('savings'));
      return result('Coverage need', need, 'Income replacement plus debts minus existing coverage or savings.', [], []);
    }
    case 'roi': {
      const roi = get('cost') > 0 ? get('gain') / get('cost') : 0;
      return result('ROI', roi, 'Net gain divided by cost.', [], [
        metric('Net gain', get('gain'), 'currency'),
        metric('Cost', get('cost'), 'currency')
      ]);
    }
    case 'stamp-duty': {
      const stampDuty = get('homePrice') * get('rate') / 100;
      const registration = get('homePrice') * get('registrationRate') / 100;
      return result('Stamp duty and registration cost', stampDuty + registration, 'Estimated property purchase taxes and registration charges.', [
        'Rates vary by state, city, buyer profile, and property type.',
        'Use this as a cash-planning estimate before checking the official local schedule.'
      ], [
        metric('Stamp duty', stampDuty, 'currency', 'warning'),
        metric('Registration charges', registration, 'currency', 'warning')
      ]);
    }
  }
}

function metric(
  label: string,
  value: number,
  valueType: CalculatorMetric['valueType'],
  tone: CalculatorMetric['tone'] = 'neutral',
  description?: string
): CalculatorMetric {
  return { description, label, tone, value, valueType };
}

function result(
  label: string,
  value: number,
  narrative: string,
  assumptions: string[],
  supporting: CalculatorMetric[] = []
): CalculatorResult {
  return {
    assumptions,
    metrics: [metric(label, value, inferValueType(label), 'accent', narrative), ...supporting],
    narrative
  };
}

function defaultInputHelper(input: CalculatorInput): string {
  const lower = input.label.toLowerCase();

  if (input.type === 'currency') {
    if (/monthly|payment|rent|withdrawal|contribution|deposit|sip/i.test(input.label)) {
      return `Enter the ${lower} as a recurring amount in the calculator currency.`;
    }

    return `Enter the ${lower} in the calculator currency.`;
  }

  if (input.type === 'percent') {
    return `Enter the ${lower} as an annual percentage unless the label says otherwise.`;
  }

  if (/year|tenure|term|support|delayed/i.test(input.label)) {
    return `Enter the ${lower} in years.`;
  }

  if (/period/i.test(input.label)) {
    return `Enter the number of ${lower}; for example, 26 for biweekly pay.`;
  }

  return `Enter the ${lower} used for this estimate.`;
}

function inferValueType(label: string): CalculatorMetric['valueType'] {
  if (/flat-rate emi/i.test(label)) return 'currency';
  if (/\b(apr|rate|ratio|roi|return|ltv)\b|loan-to-value/i.test(label)) return 'percent';
  if (/payoff time|withdrawal runway|years to|years after|^years$/i.test(label)) return 'years';
  if (/month/i.test(label) && !/monthly/i.test(label)) return 'number';
  return 'currency';
}

function loanPayment(principal: number, annualRate: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 12;
  return monthlyRate === 0
    ? principal / months
    : principal * monthlyRate / (1 - (1 + monthlyRate) ** -months);
}

type ProgressiveBracket = {
  rate: number;
  upTo: number;
};

type TaxEstimate = {
  baseTax: number;
  cess?: number;
  federalTax?: number;
  netIncome?: number;
  stateTax?: number;
  taxableIncome: number;
  totalTax: number;
};

const indiaOldRegimeBrackets: ProgressiveBracket[] = [
  { rate: 0, upTo: 250_000 },
  { rate: 0.05, upTo: 500_000 },
  { rate: 0.2, upTo: 1_000_000 },
  { rate: 0.3, upTo: Number.POSITIVE_INFINITY }
];

const indiaNewRegimeBrackets: ProgressiveBracket[] = [
  { rate: 0, upTo: 400_000 },
  { rate: 0.05, upTo: 800_000 },
  { rate: 0.1, upTo: 1_200_000 },
  { rate: 0.15, upTo: 1_600_000 },
  { rate: 0.2, upTo: 2_000_000 },
  { rate: 0.25, upTo: 2_400_000 },
  { rate: 0.3, upTo: Number.POSITIVE_INFINITY }
];

const usSingle2026Brackets: ProgressiveBracket[] = [
  { rate: 0.1, upTo: 12_400 },
  { rate: 0.12, upTo: 50_400 },
  { rate: 0.22, upTo: 105_700 },
  { rate: 0.24, upTo: 201_775 },
  { rate: 0.32, upTo: 256_225 },
  { rate: 0.35, upTo: 640_600 },
  { rate: 0.37, upTo: Number.POSITIVE_INFINITY }
];

const usSingle2026StandardDeduction = 16_100;

function indiaOldRegimeTax(income: number, deductions: number): TaxEstimate {
  const taxableIncome = Math.max(0, income - Math.max(0, deductions));
  const baseTaxBeforeRebate = progressiveTax(taxableIncome, indiaOldRegimeBrackets);
  const baseTax = taxableIncome <= 500_000 ? Math.max(0, baseTaxBeforeRebate - 12_500) : baseTaxBeforeRebate;
  const cess = baseTax * 0.04;

  return {
    baseTax,
    cess,
    taxableIncome,
    totalTax: baseTax + cess
  };
}

function indiaNewRegimeTax(income: number): TaxEstimate {
  const taxableIncome = Math.max(0, income);
  const baseTaxBeforeRebate = progressiveTax(taxableIncome, indiaNewRegimeBrackets);
  const baseTax = taxableIncome <= 1_200_000 ? 0 : baseTaxBeforeRebate;
  const cess = baseTax * 0.04;

  return {
    baseTax,
    cess,
    taxableIncome,
    totalTax: baseTax + cess
  };
}

function usSingleFederalTaxEstimate(income: number, extraDeductions: number, stateRate: number): TaxEstimate {
  const grossIncome = Math.max(0, income);
  const taxableIncome = Math.max(0, grossIncome - usSingle2026StandardDeduction - Math.max(0, extraDeductions));
  const federalTax = progressiveTax(taxableIncome, usSingle2026Brackets);
  const stateTax = grossIncome * Math.max(0, stateRate);
  const totalTax = federalTax + stateTax;

  return {
    baseTax: federalTax,
    federalTax,
    netIncome: Math.max(0, grossIncome - totalTax),
    stateTax,
    taxableIncome,
    totalTax
  };
}

function progressiveTax(taxableIncome: number, brackets: ProgressiveBracket[]): number {
  let lowerBound = 0;
  let tax = 0;

  for (const bracket of brackets) {
    const amountInBracket = Math.max(0, Math.min(taxableIncome, bracket.upTo) - lowerBound);
    tax += amountInBracket * bracket.rate;
    lowerBound = bracket.upTo;

    if (taxableIncome <= bracket.upTo) break;
  }

  return tax;
}

function presentValueFromPayment(payment: number, annualRate: number, years: number): number {
  const months = Math.max(1, Math.round(years * 12));
  const monthlyRate = annualRate / 12;

  return monthlyRate === 0
    ? payment * months
    : payment * (1 - (1 + monthlyRate) ** -months) / monthlyRate;
}

function remainingLoanBalance(principal: number, annualRate: number, years: number, elapsedMonths: number): number {
  const payment = loanPayment(principal, annualRate, years);
  const monthlyRate = annualRate / 12;
  let balance = Math.max(0, principal);

  for (let month = 1; month <= elapsedMonths && balance > 0; month += 1) {
    balance = Math.max(0, balance + balance * monthlyRate - payment);
  }

  return balance;
}

function approximateApr(principal: number, fees: number, payment: number, years: number): number {
  if (principal <= 0 || payment <= 0 || years <= 0) return 0;

  const netProceeds = Math.max(1, principal - Math.max(0, fees));
  let low = 0;
  let high = 1;

  for (let iteration = 0; iteration < 60; iteration += 1) {
    const midpoint = (low + high) / 2;
    const midpointPayment = loanPayment(netProceeds, midpoint, years);

    if (midpointPayment > payment) {
      high = midpoint;
    } else {
      low = midpoint;
    }
  }

  return (low + high) / 2;
}

function payoffDebt(balance: number, annualRate: number, payment: number): { interest: number; months: number } {
  if (payment <= 0 || balance <= 0) return { interest: 0, months: 0 };
  let currentBalance = balance;
  let interest = 0;
  let months = 0;
  const monthlyRate = annualRate / 12;

  while (currentBalance > 0 && months < 1200) {
    const monthlyInterest = currentBalance * monthlyRate;
    interest += monthlyInterest;
    currentBalance = currentBalance + monthlyInterest - payment;
    months += 1;

    if (monthlyRate >= 0 && currentBalance > 0 && payment <= monthlyInterest) {
      return { interest, months: 1200 };
    }
  }

  return { interest: Math.max(0, interest), months };
}

type DebtStrategyName = 'avalanche' | 'snowball';
type DebtStrategyInput = {
  balance: number;
  minimum: number;
  name: string;
  rate: number;
};

function debtStrategyInputs(get: (key: string) => number): DebtStrategyInput[] {
  return [
    { balance: get('debt1Balance'), minimum: get('debt1Minimum'), name: 'Credit card', rate: get('debt1Rate') / 100 },
    { balance: get('debt2Balance'), minimum: get('debt2Minimum'), name: 'Auto loan', rate: get('debt2Rate') / 100 },
    { balance: get('debt3Balance'), minimum: get('debt3Minimum'), name: 'Student loan', rate: get('debt3Rate') / 100 }
  ].filter((debt) => debt.balance > 0);
}

function simulateDebtStrategy(
  debts: DebtStrategyInput[],
  extraPayment: number,
  strategy: DebtStrategyName
): { interest: number; months: number } {
  const activeDebts = debts.map((debt) => ({ ...debt, balance: Math.max(0, debt.balance), minimum: Math.max(0, debt.minimum) }));
  const monthlyBudget = activeDebts.reduce((sum, debt) => sum + debt.minimum, 0) + Math.max(0, extraPayment);
  let interest = 0;
  let months = 0;

  if (activeDebts.length === 0 || monthlyBudget <= 0) return { interest: 0, months: 0 };

  while (activeDebts.some((debt) => debt.balance > 0) && months < 1200) {
    months += 1;

    activeDebts.forEach((debt) => {
      if (debt.balance <= 0) return;
      const monthlyInterest = debt.balance * debt.rate / 12;
      debt.balance += monthlyInterest;
      interest += monthlyInterest;
    });

    let remainingBudget = monthlyBudget;
    activeDebts.forEach((debt) => {
      if (debt.balance <= 0) return;
      const payment = Math.min(debt.minimum, debt.balance, remainingBudget);
      debt.balance -= payment;
      remainingBudget -= payment;
    });

    while (remainingBudget > 0.005 && activeDebts.some((debt) => debt.balance > 0)) {
      const target = selectDebtTarget(activeDebts, strategy);
      if (!target) break;

      const payment = Math.min(target.balance, remainingBudget);
      target.balance -= payment;
      remainingBudget -= payment;
    }

    const monthlyInterestAfterPayment = activeDebts.reduce((sum, debt) => sum + debt.balance * debt.rate / 12, 0);
    if (activeDebts.some((debt) => debt.balance > 0) && monthlyBudget <= monthlyInterestAfterPayment) {
      return { interest, months: 1200 };
    }
  }

  return { interest, months };
}

function selectDebtTarget(
  debts: Array<DebtStrategyInput & { balance: number }>,
  strategy: DebtStrategyName
): (DebtStrategyInput & { balance: number }) | null {
  const activeDebts = debts.filter((debt) => debt.balance > 0);
  if (activeDebts.length === 0) return null;

  return activeDebts.sort((a, b) => (
    strategy === 'avalanche'
      ? b.rate - a.rate || a.balance - b.balance
      : a.balance - b.balance || b.rate - a.rate
  ))[0];
}

function withdrawalRunway(corpus: number, annualRate: number, withdrawal: number): { endingBalance: number; months: number } {
  if (withdrawal <= 0 || corpus <= 0) return { endingBalance: Math.max(0, corpus), months: 0 };

  let currentBalance = corpus;
  let months = 0;
  const monthlyRate = annualRate / 12;

  while (currentBalance > 0 && months < 1200) {
    currentBalance = currentBalance * (1 + monthlyRate) - withdrawal;
    months += 1;

    if (currentBalance > 0 && monthlyRate >= 0 && currentBalance * monthlyRate >= withdrawal) {
      return { endingBalance: currentBalance, months: 1200 };
    }
  }

  return { endingBalance: Math.max(0, currentBalance), months };
}
