import type { CalculatorFormula, CalculatorInput } from './seoCalculators';

type CalculatorContentBlueprint = {
  assumption: string;
  decision: string;
  method: string;
  purpose: string;
};

export type CalculatorPublicContent = {
  assumptions: string[];
  description: string;
  explanation: string;
  faq: Array<{ answer: string; question: string }>;
};

const blueprints: Record<CalculatorFormula, CalculatorContentBlueprint> = {
  amortization: blueprint('see every scheduled payment and the balance decline', 'splits each fixed payment between principal and interest across the full term', 'the rate and scheduled payment pattern do not change during the term', 'compare total interest, principal progress, and the payoff timeline'),
  apr: blueprint('compare a loan rate after finance charges are included', 'converts the amount financed, payment stream, and upfront charges into an annualized borrowing cost', 'all entered finance charges are paid at origination and the payment schedule is completed as entered', 'compare offers on cost rather than note rate alone'),
  'balloon-loan': blueprint('estimate payments before a large balance becomes due', 'amortizes the loan over the stated term but stops the schedule at the balloon date', 'the note rate remains fixed and the remaining balance is due at the balloon date', 'judge whether the low initial payment justifies the later refinance or payoff risk'),
  'balance-transfer': blueprint('compare keeping a balance with moving it to a promotional offer', 'simulates both payoff paths using the same payment and includes the transfer fee', 'the promotional APR lasts until payoff and no new purchases are added', 'check whether interest savings exceed the fee and whether payoff fits the offer window'),
  'biweekly-loan': blueprint('see how half-payments every two weeks can affect payoff', 'models 26 half-payments per year, equal to 13 standard monthly payments', 'the servicer credits payments promptly and permits the biweekly schedule without extra fees', 'compare the extra annual principal pace with a normal monthly schedule'),
  budget: blueprint('turn monthly income and spending into a usable cashflow snapshot', 'subtracts expenses from income and annualizes the resulting surplus or shortfall', 'the entered month is representative and irregular costs are already included', 'set a realistic savings pace or identify the spending gap to address'),
  'capital-gains': blueprint('estimate the tax and net proceeds from an investment gain', 'applies the entered planning tax rate to the taxable gain', 'the rate supplied already reflects the relevant holding period and jurisdiction', 'reserve cash for tax and compare after-tax outcomes'),
  'closing-costs': blueprint('estimate the cash needed to complete a home purchase', 'adds the down payment to closing costs estimated from the purchase price', 'the entered cost rate captures lender, title, prepaid, and local transaction charges well enough for planning', 'set a cash-to-close goal with room for quote changes'),
  compound: blueprint('project how a starting balance and recurring deposits may grow', 'compounds the opening amount and adds recurring contributions over the selected term', 'the return is a steady annualized estimate and contributions arrive on schedule', 'separate money contributed from estimated growth and test the effect of time'),
  'debt-payoff': blueprint('estimate when a balance reaches zero and what interest it costs', 'applies monthly interest, then reduces the balance by the fixed payment until payoff', 'the APR and payment stay fixed and no new charges are added', 'choose a payment that meaningfully reduces both payoff time and interest'),
  'debt-strategy': blueprint('compare snowball and avalanche payoff ordering across debts', 'pays every minimum first and redirects extra cash as each balance is cleared', 'minimum payments, APRs, balances, and the extra payoff budget remain fixed', 'weigh motivation from smaller wins against potential interest savings'),
  'down-payment': blueprint('translate a purchase price and target percentage into upfront cash', 'multiplies the purchase price by the selected down-payment percentage', 'closing costs and reserves are separate from the down payment', 'set a home goal and understand the loan amount left to finance'),
  dti: blueprint('measure monthly debt obligations against gross income', 'divides existing debts plus the proposed payment by gross monthly income', 'the income and obligations match the definitions a prospective lender is likely to use', 'see how a new payment changes affordability before applying'),
  'emergency-fund': blueprint('size a cash reserve in months of essential spending', 'multiplies monthly expenses by the desired number of coverage months', 'the expense figure reflects essential costs during an income interruption', 'turn an abstract reserve target into a month-by-month funding goal'),
  epf: blueprint('project employee and employer provident-fund contributions', 'compounds both monthly contribution streams over the selected horizon', 'contribution amounts and the assumed annual crediting rate remain constant', 'compare total deposits with estimated growth toward retirement'),
  escrow: blueprint('estimate recurring housing costs collected with a mortgage payment', 'converts property tax and insurance to monthly amounts and adds recurring housing dues', 'taxes, premiums, and dues remain near the entered amounts for the planning period', 'budget beyond principal and interest for a fuller monthly housing cost'),
  fd: blueprint('estimate deposit maturity value and interest earned', 'compounds the opening deposit at the entered annual rate for the selected term', 'the deposit stays invested through maturity and the rate does not change', 'compare maturity proceeds across rates and terms'),
  'fha-conventional': blueprint('compare simplified FHA and conventional mortgage payments', 'applies FHA-style mortgage insurance and conventional PMI assumptions to the same purchase', 'the supplied rates, down payment, and insurance estimates are available to the same borrower', 'see which structure better fits monthly cashflow and upfront equity'),
  'fha-loan': blueprint('estimate an FHA-style payment including mortgage insurance', 'finances the upfront insurance estimate and adds annual mortgage insurance to principal and interest', 'the entered insurance rates and eligibility assumptions remain applicable', 'understand how mortgage insurance changes payment and financed balance'),
  'flat-rate-loan': blueprint('compare a quoted flat rate with reducing-balance borrowing', 'calculates flat interest on original principal and contrasts it with standard amortization', 'both options use the same principal, nominal rate, and tenure for illustration', 'avoid comparing flat and reducing rates as though they were equivalent'),
  gratuity: blueprint('estimate gratuity from eligible salary and completed service', 'applies the common 15-over-26 formula to last drawn basic plus DA and service years', 'the employment is eligible and the entered service years meet applicable counting rules', 'include the benefit as an estimate in longer-term planning'),
  gst: blueprint('split a pre-tax amount into GST and total invoice value', 'applies the entered GST percentage to the taxable amount', 'the selected GST rate and tax treatment apply to the transaction', 'check the tax component and cash total before recording the payment'),
  hra: blueprint('estimate the lowest eligible HRA exemption component', 'compares HRA received, rent above 10% of salary, and the entered city salary cap', 'salary, rent, location status, and HRA eligibility are entered consistently for the same period', 'understand the estimated exempt and taxable portions before filing'),
  inflation: blueprint('translate today\'s cost into a future purchasing-power target', 'compounds the current cost by the assumed annual inflation rate', 'inflation follows a steady average even though actual prices move unevenly', 'raise future goals enough to preserve intended purchasing power'),
  insurance: blueprint('estimate an income-replacement and liability protection gap', 'adds years of income support and debts, then subtracts existing savings or coverage', 'the support period and existing resources reflect the household\'s actual needs', 'turn the remaining gap into a coverage review or protection goal'),
  'interest-only-loan': blueprint('compare an interest-only payment with normal amortization', 'calculates monthly interest without principal reduction and shows a comparable amortizing payment', 'the balance does not decline during the interest-only period and the rate stays fixed', 'see the payment tradeoff and the balance still owed later'),
  'investment-return': blueprint('convert starting and ending values into an annualized return', 'solves for the compound annual rate connecting the two values over time', 'there are no intermediate deposits or withdrawals unless already reflected in the values', 'compare performance across investments with different holding periods'),
  'india-tax': blueprint('compare simplified old- and new-regime income-tax estimates', 'applies each regime\'s modeled slabs, rebate treatment, deductions, and cess to the same income', 'the taxpayer is an individual under 60 with no surcharge or special-rate income', 'see which modeled regime produces the lower planning estimate'),
  loan: blueprint('estimate a fixed payment and lifetime borrowing cost', 'amortizes principal with the entered interest rate and term', 'the loan has fixed monthly payments and excludes unentered taxes, insurance, and fees', 'compare payment affordability with total interest instead of viewing EMI alone'),
  'loan-comparison': blueprint('compare two loan terms and rates side by side', 'amortizes both options and contrasts monthly payment with lifetime interest', 'both offers finance the same principal and their entered rates remain fixed', 'choose between near-term cashflow relief and long-term interest cost'),
  'loan-eligibility': blueprint('estimate the loan amount supported by an income-based payment cap', 'converts allowable monthly payment capacity into principal at the entered rate and term', 'the chosen debt-to-income cap approximates lender policy and income is stable', 'set a borrowing ceiling before shopping or applying'),
  'loan-prepayment': blueprint('measure the time and interest effect of paying principal early', 'reduces principal immediately and keeps the original payment to simulate faster payoff', 'the lender applies the full prepayment to principal without a penalty', 'compare the cash used today with interest avoided and months removed'),
  lumpsum: blueprint('project the future value of a one-time investment', 'compounds the opening amount at the entered annual return for the selected term', 'returns are reinvested and the investment remains untouched', 'compare time and return assumptions before setting a wealth goal'),
  'mortgage-recast': blueprint('estimate a lower mortgage payment after a principal recast', 'subtracts the lump-sum principal payment and re-amortizes the balance over the remaining term', 'the lender permits recasting and the rate and remaining term stay unchanged', 'compare payment relief with keeping the original payoff pace'),
  'net-worth': blueprint('combine assets and liabilities into a household balance-sheet total', 'subtracts all entered liabilities from all entered assets', 'balances are measured on the same date and ownership is counted consistently', 'identify which accounts should be tracked to keep the number current'),
  nps: blueprint('project an NPS corpus and its annuity and lump-sum split', 'compounds recurring contributions and applies the selected annuity allocation at the end', 'contributions and returns follow the entered assumptions and rules may change before retirement', 'connect contributions to the retirement income mix you may need'),
  paycheck: blueprint('estimate take-home pay per period and across a year', 'annualizes gross pay, subtracts pre-tax deductions, estimates withholding, and removes post-tax deductions', 'the supplied withholding rate approximates payroll withholding for each period', 'map gross compensation into spendable monthly cashflow'),
  pmi: blueprint('estimate private mortgage insurance and the equity path toward removal', 'applies an annual PMI rate to the financed amount and tracks loan-to-value assumptions', 'the quoted PMI rate remains applicable until lender removal rules are met', 'see how down payment and principal reduction affect insurance cost'),
  ppf: blueprint('project PPF contributions, interest, and maturity value', 'compounds annual contributions at the entered rate across the selected term', 'contributions are made at the modeled annual timing and the crediting rate is an assumption', 'compare deposits with estimated interest toward a long-term goal'),
  rd: blueprint('project recurring-deposit maturity value', 'compounds equal monthly deposits over the selected term', 'each deposit is made on schedule and the annual rate remains unchanged', 'see how contribution pace and term shape maturity proceeds'),
  refinance: blueprint('estimate payment savings and the time needed to recover switching costs', 'compares current and replacement loan payments and divides upfront costs by monthly savings', 'the new rate and costs are available and the loan is kept beyond break-even', 'judge whether lower payments justify fees and a reset term'),
  'rent-buy': blueprint('compare a recurring use payment with financing ownership', 'contrasts the entered rent or lease payment with a simplified purchase-loan payment', 'unmodeled ownership costs and resale value are reviewed separately', 'identify which assumptions deserve a fuller ownership comparison'),
  retirement: blueprint('compare projected retirement savings with an income-based corpus need', 'grows current savings and monthly contributions, then estimates required assets from the withdrawal rate', 'returns, contributions, retirement age, and desired income follow the entered long-run assumptions', 'see the retirement gap and which lever can close it'),
  rmd: blueprint('estimate a required distribution from a retirement balance', 'divides the qualifying balance by the entered life-expectancy divisor', 'the balance date, age, account type, and divisor are correct for the owner', 'reserve the expected distribution in retirement cashflow planning'),
  roi: blueprint('measure net gain relative to the cost committed', 'divides net gain by cost to produce a simple return percentage', 'the gain is net of the costs needed for a fair comparison', 'compare opportunities on proportional return as well as dollars gained'),
  'roth-traditional': blueprint('compare after-tax Roth and traditional IRA outcomes', 'grows the same contribution and applies current and future marginal tax-rate assumptions', 'eligibility, contribution limits, state taxes, and side-account reinvestment are reviewed separately', 'test whether today\'s or retirement tax rate drives the stronger after-tax result'),
  'rule-72': blueprint('estimate how long a steady return may take to double money', 'divides 72 by the entered annual rate', 'the rate is positive, steady, and compounded closely enough for this shortcut', 'use the result as a mental check before running a detailed growth projection'),
  salary: blueprint('translate annual CTC into estimated monthly and annual take-home', 'subtracts payroll contributions, professional tax, and estimated income tax from CTC', 'the entered rates approximate the employee\'s actual salary structure and payroll treatment', 'set a cashflow plan from spendable pay rather than headline CTC'),
  'savings-goal': blueprint('solve for the recurring contribution needed to reach a target', 'grows current savings and spreads the remaining target across monthly contributions', 'the target date, return, current balance, and contribution timing remain as entered', 'turn the target into a monthly funding commitment'),
  sip: blueprint('project a recurring mutual-fund contribution path', 'compounds monthly SIP deposits and applies an annual step-up when provided', 'contributions arrive each month and the return is a long-run planning assumption', 'compare total invested with estimated gains and test a sustainable step-up'),
  'social-security': blueprint('estimate when delayed Social Security benefits catch up', 'compares benefits forgone while waiting with the later monthly increase', 'COLA, taxes, survivor benefits, longevity, and investment returns are excluded', 'place the break-even age alongside health, longevity, and household needs'),
  'stamp-duty': blueprint('estimate property stamp duty and registration cash needs', 'applies the entered local rates to the property value and adds the charges', 'the selected rates match the property, buyer, and jurisdiction', 'include transaction taxes in the home cash-to-close plan'),
  swp: blueprint('estimate how long a corpus may support recurring withdrawals', 'applies monthly growth and withdrawals until the balance is exhausted or the model horizon ends', 'the withdrawal and return are steady and sequence-of-returns risk is not modeled', 'stress-test income needs against corpus runway'),
  'tax-rate': blueprint('estimate withholding or tax from an entered effective rate', 'subtracts exemptions from the payment base and applies the selected percentage', 'the chosen rate and exempt amount match the transaction for planning purposes', 'estimate the gross-to-net cash impact before filing or reconciliation'),
  'us-tax': blueprint('estimate US federal single-filer tax and an optional state placeholder', 'applies the modeled standard deduction and progressive federal brackets before adding the entered state rate', 'the filer is single and credits, payroll tax, AMT, itemization, and state-specific rules are excluded', 'understand bracketed federal tax separately from the state planning allowance'),
  'va-loan': blueprint('estimate a VA-style payment with the funding fee included', 'adds the entered funding fee to the financed amount and amortizes principal and interest', 'the borrower and property qualify and the entered funding-fee treatment is correct', 'see how the fee changes financed balance and monthly payment'),
  xirr: blueprint('approximate an annualized return when recurring cashflows are present', 'compares ending value with the opening outflow and average monthly contributions', 'cashflows are evenly timed; exact dated XIRR requires transaction-level dates', 'use the approximation as a screen before calculating a true dated return')
};

export function buildCalculatorPublicContent(options: {
  formula: CalculatorFormula;
  inputs: CalculatorInput[];
  slug: string;
  title: string;
}): CalculatorPublicContent {
  const { formula, inputs, slug, title } = options;
  const content = blueprints[formula];
  const inputNames = humanList(inputs.slice(0, 4).map((input) => input.label.toLowerCase()));
  const changingInputs = humanList(inputs.slice(0, 3).map((input) => input.label));
  const description = `${title} helps you ${content.purpose} using ${inputNames}.`;
  const explanation = `${title} ${content.method}. ${routeAngles[slug] ?? ''} Use the result to ${content.decision}.`
    .replace(/\s+/g, ' ');

  return {
    assumptions: [
      capitalize(content.assumption) + '.',
      `${changingInputs} are held at the values you enter unless you select another scenario.`
    ],
    description,
    explanation,
    faq: [
      {
        answer: explanation,
        question: `What does the ${title} calculate?`
      },
      {
        answer: `Start with ${inputNames}. Use values from recent statements, offers, or your current plan so the comparison reflects the decision in front of you.`,
        question: `Which inputs should I use in the ${title}?`
      },
      {
        answer: `Treat the result as a planning range. Change ${changingInputs}, compare the scenarios, and then ${content.decision}.`,
        question: `How should I use the ${title} result?`
      }
    ]
  };
}

const routeAngles: Record<string, string> = {
  '15-vs-30-year-mortgage': 'It isolates the payment and lifetime-interest tradeoff between the two common fixed terms.',
  '401k': 'It frames the projection around an existing workplace retirement balance and ongoing payroll contributions.',
  'arm-mortgage': 'It shows the payment at the introductory ARM rate; later resets and caps need a separate stress test.',
  'auto-loan': 'It focuses the payment and interest read on vehicle financing over a relatively short term.',
  'car-loan-emi': 'It keeps the estimate centered on an India car-loan amount and tenure.',
  cagr: 'It is intended for a clean point-to-point CAGR with no intermediate cashflows.',
  cd: 'It frames compounding around a fixed-term US certificate of deposit and its APY.',
  'compound-interest': 'It provides a general-purpose growth projection for a starting balance plus recurring deposits.',
  'credit-card-payoff': 'It treats the balance as revolving card debt and highlights whether the payment overcomes a high APR.',
  emi: 'It provides a general India EMI estimate before loan-specific fees or protections are added.',
  'extra-mortgage-payment': 'The entered payment is treated as the regular payment plus the extra principal commitment.',
  fd: 'It frames maturity around an India fixed deposit and the chosen deposit term.',
  heloc: 'It treats the balance as a repayment-phase home-equity line rather than modeling a separate draw period.',
  'home-equity-loan': 'It treats home equity borrowing as a fixed installment loan with a defined repayment term.',
  'home-loan-emi': 'It frames the EMI around a long-tenure India housing loan.',
  hysa: 'It keeps liquidity and recurring savings visible while applying a high-yield savings APY.',
  'investment-return': 'It is a general performance comparison between a beginning value and an ending value.',
  'lease-vs-buy': 'It uses a vehicle lease payment and purchase loan as the two cashflow anchors.',
  'lumpsum-mutual-fund': 'It frames the one-time investment as a market-linked mutual-fund projection rather than a guaranteed deposit.',
  mortgage: 'It focuses on the standard principal-and-interest payment for a fixed-rate home loan.',
  'mortgage-affordability': 'It starts from a proposed affordable loan target; income-based DTI checks remain a separate step.',
  'mortgage-payoff': 'The entered payment represents the current payoff pace used to estimate the finish date.',
  'personal-loan': 'It frames the installment estimate around unsecured US personal borrowing.',
  'personal-loan-emi': 'It frames the EMI around an India unsecured personal-loan balance and tenure.',
  rd: 'It shows how equal monthly deposits build toward an India recurring-deposit maturity value.',
  'rent-vs-buy': 'It uses housing rent and home financing as the starting comparison before adding ownership costs and equity.',
  sip: 'It models a level monthly SIP so contribution discipline and market-growth assumptions stay separate.',
  'step-up-sip': 'It isolates the effect of increasing the monthly SIP once per year.',
  'student-loan-payoff': 'It frames the payoff schedule around education debt and its current required payment.',
  swp: 'It focuses on recurring withdrawals from an invested corpus rather than a fixed annuity promise.'
};

function blueprint(
  purpose: string,
  method: string,
  assumption: string,
  decision: string
): CalculatorContentBlueprint {
  return { assumption, decision, method, purpose };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function humanList(values: string[]): string {
  if (values.length <= 1) return values[0] ?? 'the values you enter';
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(', ')}, and ${values.at(-1)}`;
}
