export type CalculatorRegion = 'Global' | 'India' | 'US';
export type CalculatorCategory = 'Borrowing' | 'Investing' | 'Planning' | 'Tax' | 'Savings';
export type CalculatorFormula =
  | 'amortization'
  | 'balance-transfer'
  | 'budget'
  | 'capital-gains'
  | 'compound'
  | 'debt-payoff'
  | 'down-payment'
  | 'emergency-fund'
  | 'epf'
  | 'fd'
  | 'gratuity'
  | 'gst'
  | 'hra'
  | 'inflation'
  | 'insurance'
  | 'investment-return'
  | 'loan'
  | 'lumpsum'
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
  | 'swp'
  | 'tax-rate'
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
  'balance-transfer': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  budget: { conversionLabel: 'Track monthly cash flow', conversionRoute: '/transactions' },
  'capital-gains': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  compound: { conversionLabel: 'Save as wealth goal', conversionRoute: '/goals' },
  'debt-payoff': { conversionLabel: 'Create payoff plan', conversionRoute: '/plans' },
  'down-payment': { conversionLabel: 'Create home goal', conversionRoute: '/goals' },
  'emergency-fund': { conversionLabel: 'Create emergency fund goal', conversionRoute: '/goals' },
  epf: { conversionLabel: 'Track retirement account', conversionRoute: '/accounts' },
  fd: { conversionLabel: 'Track savings account', conversionRoute: '/accounts' },
  gratuity: { conversionLabel: 'Add retirement plan item', conversionRoute: '/plans' },
  gst: { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  hra: { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  inflation: { conversionLabel: 'Save as future goal', conversionRoute: '/goals' },
  insurance: { conversionLabel: 'Create protection goal', conversionRoute: '/goals' },
  'investment-return': { conversionLabel: 'Save as investment goal', conversionRoute: '/goals' },
  loan: { conversionLabel: 'Track this liability', conversionRoute: '/accounts' },
  lumpsum: { conversionLabel: 'Save as wealth goal', conversionRoute: '/goals' },
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
  swp: { conversionLabel: 'Save withdrawal plan', conversionRoute: '/plans' },
  'tax-rate': { conversionLabel: 'Save tax planning note', conversionRoute: '/plans' },
  xirr: { conversionLabel: 'Save investment goal', conversionRoute: '/goals' }
};

function defineCalculator(
  calculator: Omit<SeoCalculator, 'conversionLabel' | 'conversionRoute' | 'faq'> & {
    faq?: SeoCalculator['faq'];
  }
): SeoCalculator {
  return {
    ...calculator,
    ...conversionByFormula[calculator.formula],
    inputs: calculator.inputs.map((input) => ({
      ...input,
      helper: input.helper ?? defaultInputHelper(input)
    })),
    faq: [...(calculator.faq ?? []), ...commonFaq]
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
    ['income-tax-india', 'Income Tax Calculator Old vs New Regime', 'tax-rate', [money('income', 'Taxable income', 1500000), percent('effectiveRate', 'Estimated effective tax rate', 18), money('deductions', 'Eligible deductions', 150000)]],
    ['salary-india', 'Salary / Take-home Pay Calculator', 'salary', [money('income', 'Annual CTC', 2400000), percent('effectiveRate', 'Estimated tax and deductions', 22)]],
    ['hra-exemption', 'HRA Exemption Calculator', 'hra', [money('salary', 'Basic salary', 1200000), money('hra', 'HRA received', 500000), money('rent', 'Annual rent paid', 600000), percent('metroPercent', 'Salary exemption cap', 50)]],
    ['fd', 'FD Calculator', 'fd', [money('principal', 'Deposit amount', 500000), ...termInputs]],
    ['rd', 'RD Calculator', 'rd', [money('monthly', 'Monthly deposit', 10000), ...termInputs]],
    ['ppf', 'PPF Calculator', 'ppf', [money('annual', 'Annual contribution', 150000), percent('rate', 'Annual return', 7.1), number('years', 'Years', 15, 'yrs')]],
    ['epf', 'EPF Calculator', 'epf', [money('employee', 'Employee monthly contribution', 12000), money('employer', 'Employer monthly contribution', 12000), ...termInputs]],
    ['nps', 'NPS Calculator', 'nps', [money('monthly', 'Monthly contribution', 10000), ...termInputs, percent('annuityPercent', 'Annuity allocation', 40)]],
    ['gratuity', 'Gratuity Calculator', 'gratuity', [money('salary', 'Last drawn basic + DA', 120000), number('years', 'Completed service', 8, 'yrs')]]
  ] satisfies GeneratedCalculator[]).map(([slug, title, formula, inputs]) => defineCalculator({
    category: formula === 'loan' ? 'Borrowing' : formula === 'tax-rate' || formula === 'salary' || formula === 'hra' ? 'Tax' : 'Investing',
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
    ['rent-vs-buy', 'Rent vs Buy Calculator', 'rent-buy', [money('rent', 'Monthly rent', 2500), money('homePrice', 'Home price', 450000), money('downPayment', 'Down payment', 90000), percent('rate', 'Mortgage rate', 6.75), number('years', 'Compare years', 7, 'yrs')]],
    ['credit-card-payoff', 'Credit Card Payoff Calculator', 'debt-payoff', [money('balance', 'Credit card balance', 8000), percent('rate', 'APR', 22), money('payment', 'Monthly payment', 350)]],
    ['debt-snowball-avalanche', 'Debt Snowball vs Avalanche Calculator', 'debt-payoff', [money('balance', 'Total debt balance', 25000), percent('rate', 'Weighted APR', 15), money('payment', 'Monthly payoff budget', 900)]],
    ['auto-loan', 'Auto Loan Calculator', 'loan', [money('principal', 'Auto loan amount', 32000), percent('rate', 'Interest rate', 7), number('years', 'Term', 5, 'yrs')]],
    ['personal-loan', 'Personal Loan Calculator', 'loan', [money('principal', 'Personal loan amount', 15000), percent('rate', 'Interest rate', 11), number('years', 'Term', 4, 'yrs')]],
    ['student-loan-payoff', 'Student Loan Payoff Calculator', 'debt-payoff', [money('balance', 'Student loan balance', 45000), percent('rate', 'Interest rate', 6), money('payment', 'Monthly payment', 600)]],
    ['401k', '401(k) Calculator', 'compound', [money('principal', 'Current 401(k)', 50000), money('monthly', 'Monthly contribution', 900), ...termInputs]],
    ['roth-vs-traditional-ira', 'Roth vs Traditional IRA Calculator', 'tax-rate', [money('income', 'Annual contribution', 7000), percent('effectiveRate', 'Expected tax rate spread', 22), money('deductions', 'Already taxed basis', 0)]],
    ['paycheck', 'Paycheck Calculator', 'paycheck', [money('income', 'Gross pay per period', 5000), percent('effectiveRate', 'Taxes and deductions', 28), number('periods', 'Pay periods per year', 26)]],
    ['income-tax-us', 'Income Tax Estimator', 'tax-rate', [money('income', 'Taxable income', 120000), percent('effectiveRate', 'Estimated effective tax rate', 24), money('deductions', 'Deductions / credits estimate', 15000)]],
    ['social-security-break-even', 'Social Security Break-even Calculator', 'social-security', [money('early', 'Early monthly benefit', 1800), money('full', 'Full monthly benefit', 2600), number('delayYears', 'Years delayed', 5, 'yrs')]],
    ['rmd', 'Required Minimum Distribution Calculator', 'rmd', [money('balance', 'Retirement account balance', 800000), number('divisor', 'IRS life expectancy divisor', 26.5)]]
  ] satisfies GeneratedCalculator[]).map(([slug, title, formula, inputs]) => defineCalculator({
    category: formula === 'loan' || formula === 'debt-payoff' || formula === 'refinance' || formula === 'rent-buy' ? 'Borrowing' : formula === 'tax-rate' || formula === 'paycheck' || formula === 'rmd' ? 'Tax' : 'Planning',
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
    category: formula === 'loan' || formula === 'balance-transfer' || formula === 'rent-buy' ? 'Borrowing' : formula === 'capital-gains' || formula === 'gst' || formula === 'tax-rate' ? 'Tax' : 'Investing',
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
    case 'tax-rate':
    case 'capital-gains':
    case 'paycheck':
    case 'salary': {
      const base = Math.max(0, get('income') || get('gain') || get('principal'));
      const deductions = get('deductions');
      const taxable = calculator.formula === 'paycheck'
        ? Math.max(0, base * get('periods') - deductions)
        : Math.max(0, base - deductions);
      const tax = taxable * (get('effectiveRate') || get('rate')) / 100;
      const net = calculator.formula === 'paycheck'
        ? base * get('periods') - tax
        : base - tax;
      return result(calculator.formula === 'paycheck' ? 'Estimated annual take-home' : 'Estimated net amount', net, 'Estimated using the rate you provide, not statutory tax tables.', [
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
  if (/rate|roi|return|ltv|loan-to-value/i.test(label)) return 'percent';
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
