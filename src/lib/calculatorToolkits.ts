import { getCalculatorStudio } from './calculatorQuality';
import { seoCalculators, type SeoCalculator } from './seoCalculators';

export type CalculatorToolkitId =
  | 'checkup'
  | 'goals'
  | 'returns'
  | 'debt'
  | 'loans'
  | 'home'
  | 'income-tax'
  | 'retirement';

export type CalculatorToolkitIcon =
  | 'banknote'
  | 'chart'
  | 'home'
  | 'landmark'
  | 'receipt'
  | 'shield'
  | 'target'
  | 'wallet';

export type CalculatorToolkit = {
  calculators: SeoCalculator[];
  description: string;
  featuredSlugs: string[];
  icon: CalculatorToolkitIcon;
  id: CalculatorToolkitId;
  prompt: string;
  title: string;
};

type CalculatorToolkitDefinition = Omit<CalculatorToolkit, 'calculators'>;

const homeCalculatorSlugs = new Set([
  '15-vs-30-year-mortgage',
  'arm-mortgage',
  'biweekly-mortgage-payment',
  'closing-costs',
  'down-payment',
  'escrow',
  'extra-mortgage-payment',
  'fha-loan',
  'fha-vs-conventional',
  'heloc',
  'home-equity-loan',
  'home-loan-balance-transfer-india',
  'home-loan-emi',
  'home-loan-foreclosure',
  'home-loan-prepayment',
  'interest-only-mortgage',
  'mortgage',
  'mortgage-affordability',
  'mortgage-payoff',
  'mortgage-points',
  'mortgage-recast',
  'mortgage-refinance',
  'pmi',
  'rent-vs-buy',
  'stamp-duty-registration',
  'va-loan'
]);

const toolkitDefinitions: CalculatorToolkitDefinition[] = [
  {
    description: 'See how income, spending, reserves, protection, assets, and liabilities fit together.',
    featuredSlugs: ['budget', 'net-worth', 'emergency-fund', 'life-insurance-needs'],
    icon: 'wallet',
    id: 'checkup',
    prompt: 'Understand where you stand today',
    title: 'Financial Checkup'
  },
  {
    description: 'Work backward from a target or project how regular deposits can grow over time.',
    featuredSlugs: ['savings-goal', 'compound-interest', 'sip', 'step-up-sip'],
    icon: 'target',
    id: 'goals',
    prompt: 'Build a savings path',
    title: 'Savings & Goals'
  },
  {
    description: 'Measure performance, compare return methods, and separate gains from time and cash flows.',
    featuredSlugs: ['investment-return', 'cagr', 'xirr', 'roi'],
    icon: 'chart',
    id: 'returns',
    prompt: 'Evaluate an investment result',
    title: 'Investment Returns'
  },
  {
    description: 'Turn balances, rates, and payment budgets into a clear route to zero.',
    featuredSlugs: ['debt-payoff', 'credit-card-payoff', 'debt-snowball-avalanche', 'balance-transfer'],
    icon: 'shield',
    id: 'debt',
    prompt: 'Choose a payoff strategy',
    title: 'Debt Payoff'
  },
  {
    description: 'Compare payments, rates, terms, fees, and payoff schedules across everyday borrowing.',
    featuredSlugs: ['emi', 'amortization', 'loan-comparison', 'apr'],
    icon: 'banknote',
    id: 'loans',
    prompt: 'Understand the full cost of a loan',
    title: 'Loans & Payments'
  },
  {
    description: 'Plan the cash needed to buy, the monthly cost to own, and the tradeoffs across mortgage options.',
    featuredSlugs: ['mortgage', 'mortgage-affordability', 'rent-vs-buy', 'down-payment'],
    icon: 'home',
    id: 'home',
    prompt: 'Make a housing decision',
    title: 'Home Buying & Mortgage'
  },
  {
    description: 'Translate gross amounts into estimated take-home pay, deductions, taxes, and net proceeds.',
    featuredSlugs: ['income-tax-india', 'income-tax-us', 'salary-india', 'paycheck'],
    icon: 'receipt',
    id: 'income-tax',
    prompt: 'Estimate what remains after tax',
    title: 'Income & Tax'
  },
  {
    description: 'Connect contributions, retirement income, withdrawals, benefits, and long-term readiness.',
    featuredSlugs: ['retirement', '401k', 'nps', 'swp'],
    icon: 'landmark',
    id: 'retirement',
    prompt: 'Test a retirement path',
    title: 'Retirement Planning'
  }
];

export const calculatorToolkits: CalculatorToolkit[] = toolkitDefinitions.map((definition) => ({
  ...definition,
  calculators: seoCalculators.filter((calculator) => calculatorToolkitId(calculator) === definition.id)
}));

export function getCalculatorToolkit(calculator: SeoCalculator): CalculatorToolkit {
  const id = calculatorToolkitId(calculator);
  const toolkit = calculatorToolkits.find((candidate) => candidate.id === id);

  if (!toolkit) {
    throw new Error(`Calculator toolkit is missing for ${calculator.slug}.`);
  }

  return toolkit;
}

export function featuredToolkitCalculators(toolkit: CalculatorToolkit): SeoCalculator[] {
  return toolkit.featuredSlugs
    .map((slug) => toolkit.calculators.find((calculator) => calculator.slug === slug))
    .filter((calculator): calculator is SeoCalculator => Boolean(calculator));
}

function calculatorToolkitId(calculator: SeoCalculator): CalculatorToolkitId {
  if (homeCalculatorSlugs.has(calculator.slug)) return 'home';

  switch (getCalculatorStudio(calculator)) {
    case 'Cashflow and Balance Sheet Studio':
      return 'checkup';
    case 'Debt Payoff Studio':
      return 'debt';
    case 'Growth and Goal Studio':
      return 'goals';
    case 'Income and Tax Studio':
      return 'income-tax';
    case 'Loan and Home Studio':
      return 'loans';
    case 'Retirement Income Studio':
      return 'retirement';
    case 'Return Analysis Studio':
      return 'returns';
  }
}
