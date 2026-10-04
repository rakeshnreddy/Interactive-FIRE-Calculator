import { termMonths, type SeoCalculator } from './seoCalculators';

export type CalculatorScope = {
  included: string;
  excluded: string;
  basis: string;
  checked: string;
  sources: { label: string; url: string }[];
};
type ScopeDefinition = Omit<CalculatorScope, 'basis' | 'checked'> & { basis: (v: Record<string, number>) => string; checked?: string };
const percent = (v: Record<string, number>, key: string) => `${new Intl.NumberFormat('en-US', {maximumFractionDigits: 4}).format(v[key])}%`;
const source = (label: string, url: string) => ({label, url});
const indiaTax = source('Income Tax Department: AY 2026–27', 'https://www.incometax.gov.in/iec/foportal/help/individual/return-applicable-1');
const salary = source('Income Tax Department: salary and HRA', 'https://www.incometaxindia.gov.in/en/income-from-salary');
const loanCosts = source('CFPB: loan costs', 'https://www.consumerfinance.gov/owning-a-home/explore/learn-about-loan-costs/');
const fha = source('HUD: mortgage insurance premiums', 'https://www.hud.gov/hud-partners/housing-mip');
const pmi = source('CFPB: PMI cancellation', 'https://www.consumerfinance.gov/ask-cfpb/when-can-i-remove-private-mortgage-insurance-pmi-from-my-loan-en-202/');
const definitions: Record<string, ScopeDefinition> = {
  'income-tax-india': {
    included: 'Old/new regime slabs, modeled rebates and 4% cess for ordinary income.',
    excluded: 'Marginal relief, surcharge, special-rate income and automatic salary deductions.',
    basis: () => 'AY 2026–27; resident individual under 60. Income is the supplied taxable base. Only old-regime deductions use the separate deduction input; no salary standard deduction is added automatically.',
    sources: [indiaTax]
  },
  'salary-india': {
    included: 'Entered payroll deductions and withholding, with annual/monthly take-home.',
    excluded: 'A complete payslip, employer benefits and statutory payroll/tax eligibility.',
    basis: v => `PF/payroll rate ${percent(v, 'employeePfRate')} is applied to the entered annual CTC, not a separately calculated basic salary. Withholding ${percent(v, 'effectiveRate')} applies after payroll deductions; professional tax is the entered annual amount.`,
    sources: [salary]
  },
  'hra-exemption': {
    included: 'The lowest of entered HRA, rent above 10% of salary and the chosen salary cap.',
    excluded: 'Regime eligibility, city selection, salary-component and document validation.',
    basis: v => `Entered annual salary and rent; salary cap ${percent(v, 'metroPercent')}. Use the qualifying salary basis from the official guidance; this tool does not determine whether an exemption is available.`,
    sources: [salary, indiaTax]
  },
  ppf: {
    included: 'Equal annual deposits and growth at a constant entered rate.',
    excluded: 'Monthly deposit-date rules, changing notified rates, contribution limits and withdrawals.',
    basis: v => `${percent(v, 'rate')} is a planning assumption, not a live notified rate. The model deposits at each year’s beginning and compounds annually.`,
    sources: [source('National Savings Institute: PPF scheme', 'https://www.nsiindia.gov.in/writereaddata/SchemeRules/PublicProvidentFundSchemeRule.pdf')]
  },
  epf: {
    included: 'Entered employee/employer amounts accumulated as monthly savings.',
    excluded: 'EPS pension allocation, wage eligibility, statutory contribution limits and changing declared rates.',
    basis: () => 'Both entered amounts are credited to this modeled savings balance. Enter the employer amount actually credited to EPF, after any EPS allocation; this is not an EPFO passbook forecast.',
    sources: [source('EPFO: employer contribution guidance', 'https://www.epfindia.gov.in/site_docs/PDFs/MiscPDFs/Employer_Information_Booklet.pdf')]
  },
  nps: {
    included: 'Contribution growth, your chosen corpus split and a simple annuity-income estimate.',
    excluded: 'Sector/exit eligibility, mandatory allocation, provider terms and taxes.',
    basis: v => `Annuity allocation ${percent(v, 'annuityPercent')}; annual annuity income assumption ${percent(v, 'annuityRate')}. These are your inputs, not universal NPS exit rules or an annuity quote.`,
    sources: [source('PFRDA: All Citizen model and exit rules', 'https://pfrda.org.in/en/schemes/national-pension-system/nps-for-all-citizen-models')]
  },
  gratuity: {
    included: 'Entered monthly salary × 15/26 × service years, with a modeled ₹20,00,000 cap.',
    excluded: 'Employment eligibility, current wage-definition checks, service rounding and tax exemption.',
    basis: () => 'Legacy basic-plus-DA planning formula. Service years are used exactly as entered. The model cap is not a determination of current entitlement or tax-free treatment under the Labour Codes.',
    sources: [source('Ministry of Labour: Labour Codes FAQs', 'https://www.labour.gov.in/static/uploads/2026/03/a4ccf4c6d97c4f1f36a6d83f8c64213d.pdf')]
  },
  'loan-eligibility-india': {
    included: 'An income-based payment capacity converted into modeled loan principal.',
    excluded: 'Approval, credit checks, lender policy, property checks and fees.',
    basis: v => `Chosen payment share ${percent(v, 'maxDti')} of income, less other monthly debt payments; fixed entered rate and term. This is a borrowing-limit estimate.`,
    sources: [source('RBI: floating-rate EMI loan disclosures', 'https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQRFIR10012025.pdf')]
  },
  'mortgage-affordability': {
    included: 'Loan/home-price budget after entered taxes, homeowners / supplementary insurance, mortgage insurance and HOA are reserved within the monthly housing limit.',
    excluded: 'Unentered costs, maintenance, utilities, closing cash, reserves and a complete household budget.',
    basis: v => `Chosen housing share ${percent(v, 'maxDti')} of gross income, limited further by 36% of income minus other monthly debts. The fixed 36% total-debt limit is a planning assumption, not a lender requirement. Annual tax and homeowners / supplementary insurance are divided by 12; HOA and mortgage insurance are monthly. Zero excludes a cost; fixed entered loan rate and term.`,
    sources: [source('CFPB: budget for total housing costs', 'https://www.consumerfinance.gov/owning-a-home/prepare/figure-out-how-much-you-want-to-spend/')],
    checked: '2026-10-03'
  },
  apr: {
    included: 'A fee-inclusive rate estimate from net proceeds and fixed monthly payments.',
    excluded: 'Charge classification, irregular dates, variable rates and exact lender disclosure rules.',
    basis: v => `Entered note rate ${percent(v, 'rate')}; finance charges reduce net proceeds. The solver annualizes a monthly rate; compare the lender’s official APR disclosure.`,
    sources: [source('CFPB: interest rate versus APR', 'https://www.consumerfinance.gov/ask-cfpb/what-is-the-difference-between-a-loan-interest-rate-and-the-apr-en-733/')]
  },
  'fha-loan': {
    included: 'Principal/interest on a loan with financed upfront MIP, plus flat monthly MIP.',
    excluded: 'Qualification, MIP duration changes, taxes, homeowners insurance and HOA.',
    basis: v => `Entered upfront fee ${percent(v, 'feeRate')}; annual MIP ${percent(v, 'pmiRate')} is applied to the base loan. Both are planning assumptions requiring confirmation for the actual loan.`,
    sources: [fha]
  },
  'va-loan': {
    included: 'Principal/interest with the entered funding fee financed into the loan.',
    excluded: 'Eligibility/exemptions, use history, taxes, insurance and other closing costs.',
    basis: v => `Funding-fee assumption ${percent(v, 'feeRate')}. Your fee may differ or be waived; this tool does not select the applicable VA fee.`,
    sources: [source('VA: funding fees and closing costs', 'https://www.va.gov/housing-assistance/home-loans/funding-fee-and-closing-costs/')]
  },
  'fha-vs-conventional': {
    included: 'A same-rate monthly payment comparison with simplified insurance costs.',
    excluded: 'Qualification, different lender offers, insurance duration and other housing costs.',
    basis: v => `FHA upfront 1.75% and annual MIP 0.55% are fixed model assumptions, not an applicable-rate determination. Conventional PMI ${percent(v, 'pmiRate')} is your entry. Both options use the same loan rate and term.`,
    sources: [fha, pmi]
  },
  '401k': {
    included: 'Growth of current savings and entered recurring contributions.',
    excluded: 'Employer match, vesting, contribution/catch-up limits, eligibility and taxes.',
    basis: () => 'A constant-rate savings projection; entered contributions are not checked against annual plan limits. Employer money is not added automatically.',
    sources: [source('IRS: retirement contributions', 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-contributions')]
  },
  'roth-vs-traditional-ira': {
    included: 'After-tax outcomes using the same current out-of-pocket basis.',
    excluded: 'Contribution limits, eligibility, deduction phase-outs, state tax and withdrawal qualification.',
    basis: v => `Current marginal tax ${percent(v, 'currentTaxRate')}; retirement tax ${percent(v, 'futureTaxRate')}. The Roth contribution is the pre-tax amount less current tax; qualified Roth withdrawals are assumed tax-free.`,
    sources: [source('IRS: IRA contribution and deduction limits', 'https://www.irs.gov/retirement-plans/plan-participant-employee/retirement-topics-ira-contribution-limits')]
  },
  paycheck: {
    included: 'Gross pay less entered pre-tax deductions, withholding and post-tax deductions.',
    excluded: 'Form W-4 tables, separate federal/state payroll tax and employer-specific benefits.',
    basis: v => `Entered withholding ${percent(v, 'effectiveRate')}; ${v.periods} pay periods per year. Deductions are per paycheck. Use the IRS estimator to check federal withholding.`,
    sources: [source('IRS: Tax Withholding Estimator', 'https://www.irs.gov/individuals/tax-withholding-estimator')]
  },
  'income-tax-us': {
    included: 'Single-filer federal bracket estimate and your state/local allowance.',
    excluded: 'Credits, payroll tax, AMT, itemization validation and other filing statuses.',
    basis: v => `Tax year 2026; modeled standard deduction $16,100, plus your extra deductions. State/local ${percent(v, 'stateRate')} is a flat placeholder on gross income, not a state tax return.`,
    sources: [source('IRS: 2026 inflation-adjusted tax items', 'https://www.irs.gov/newsroom/irs-releases-tax-inflation-adjustments-for-tax-year-2026-including-amendments-from-the-one-big-beautiful-bill')]
  },
  'social-security-break-even': {
    included: 'Forgone benefits while waiting, compared with the entered monthly increase.',
    excluded: 'Benefit estimation, COLA, taxes, survivor benefits, longevity and investment returns.',
    basis: v => `Delay ${v.delayYears} years; both monthly benefits are your entries. A later benefit that is not higher has no finite catch-up. A zero waiting period or no early benefits is labelled separately; neither estimates eligibility.`,
    sources: [source('SSA: retirement benefits and estimates', 'https://www.ssa.gov/retirement')]
  },
  rmd: {
    included: 'Account balance divided by your entered life-expectancy divisor.',
    excluded: 'Automatic age/account table selection, inherited-account rules and due-date determination.',
    basis: v => `Manual divisor ${v.divisor}. Use the relevant prior December 31 balance and applicable IRS table; this tool does not choose the divisor or determine whether you owe an RMD.`,
    sources: [source('IRS: RMD calculation and table guidance', 'https://www.irs.gov/retirement-plans/retirement-plan-and-ira-required-minimum-distributions-faqs')]
  },
  'capital-gains-tax': {
    included: 'Entered gain multiplied by your effective tax rate.',
    excluded: 'Holding periods, loss netting, brackets, NIIT and jurisdiction-specific treatment.',
    basis: v => `Entered effective rate ${percent(v, 'effectiveRate')}; no statutory capital-gains rate is selected automatically.`,
    sources: [source('IRS: capital gains and losses', 'https://www.irs.gov/taxtopics/tc409')]
  },
  tds: {
    included: 'Payment less the entered exempt amount, multiplied by your chosen withholding rate.',
    excluded: 'Section/year selection, statutory thresholds, residency, PAN conditions and filing rules.',
    basis: v => `Entered effective withholding ${percent(v, 'effectiveRate')}; the deduction input is a modeled exempt amount, not an automatically selected legal threshold.`,
    sources: [source('Income Tax Department: TDS', 'https://www.incometax.gov.in/iec/foportal/help/all-topics/e-filing-services/tax-payments')]
  },
  pmi: {
    included: 'Flat monthly PMI cost and the loan-to-value of your entered purchase.',
    excluded: 'Insurer pricing, lender approval and cancellation/termination schedules.',
    basis: v => `Annual PMI assumption ${percent(v, 'rate')} applied to purchase price less down payment. Confirm your quote and cancellation conditions with the servicer.`,
    sources: [pmi]
  },
  heloc: {
    included: 'Repayment-stage principal and interest under a fixed entered rate.',
    excluded: 'Draw periods, revolving borrowing, future rate resets, balloon terms and fees.',
    basis: v => `Repayment only: ${percent(v, 'rate')} held constant across the entered term. This is an installment approximation, not a full HELOC contract.`,
    sources: [source('CFPB: HELOC draw and repayment periods', 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-home-equity-line-of-credit-heloc-en-107/')]
  },
  fd: {
    included: 'One deposit at the start, interest compounded once a year and paid with the deposit at maturity.',
    excluded: 'Tax and TDS on interest, fees, premature-withdrawal penalties, payout (non-cumulative) options and rate changes.',
    basis: v => `${percent(v, 'rate')} a year, applied once a year for ${new Intl.NumberFormat('en-US', {maximumFractionDigits: 4}).format(v.years)} years. If your bank compounds more often than yearly, its maturity amount for the same quoted rate will be higher; a part year continues the annual rate and banks may calculate it differently.`,
    sources: [source('RBI: FAQs on interest rate on deposits', 'https://www.rbi.org.in/commonman/Upload/English/FAQs/PDFs/FAQIRD01042025.pdf')],
    checked: '2026-10-03'
  },
  rd: {
    included: 'Equal monthly deposits added at the end of each month, any extra yearly deposit, and interest compounded monthly and paid at maturity.',
    excluded: 'Tax and TDS on interest, fees, penalties for missed instalments or premature withdrawal, and rate changes.',
    basis: v => {
      const months = termMonths(v.years);
      return `${percent(v, 'rate')} a year ÷ 12, compounded monthly over ${months} monthly deposits; each deposit earns from the month after it is made. A bank that compounds quarterly or counts instalments from their due dates will quote a slightly different maturity.`;
    },
    sources: [],
    checked: '2026-10-03'
  },
  cd: {
    included: 'One deposit at the start held to maturity, growing by the entered APY each year.',
    excluded: 'Taxes on interest, fees, early-withdrawal penalties, rate changes and deposit-insurance limits.',
    basis: v => `APY ${percent(v, 'rate')} already includes the bank's compounding, so it is applied once a year and not converted again. The term is ${new Intl.NumberFormat('en-US', {maximumFractionDigits: 4}).format(v.years)} years; a part year continues the same yearly growth.`,
    sources: [source('CFPB: what a CD is and early-withdrawal penalties', 'https://www.consumerfinance.gov/ask-cfpb/what-is-a-certificate-of-deposit-cd-en-917/'), source('CFPB: Regulation DD APY calculation', 'https://www.consumerfinance.gov/rules-policy/regulations/1030/a/')],
    checked: '2026-10-03'
  },
  'balance-transfer': {
    included: 'Transfer fee, promo-period interest and the remaining post-promo payoff.',
    excluded: 'New spending, penalty APRs and an independently entered post-promo offer rate.',
    basis: v => `Promo ${percent(v, 'newRate')} for ${Math.round(v.promoMonths)} months, then current APR ${percent(v, 'currentRate')}; same payment in both paths. The fee is added to the transferred balance.`,
    sources: [source('CFPB: introductory-rate disclosures', 'https://www.consumerfinance.gov/rules-policy/regulations/1026/60/')]
  }
};
export const calculatorScopeSlugs = Object.keys(definitions);
export function buildCalculatorScope(calculator: SeoCalculator, values: Record<string, number>): CalculatorScope | null {
  const definition = definitions[calculator.slug];
  return definition ? {...definition, basis: definition.basis(values), checked: definition.checked ?? '2026-09-30'} : null;
}
