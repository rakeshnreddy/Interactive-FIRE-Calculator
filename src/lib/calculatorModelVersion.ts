/** Versioned interpretations share result JSON, not a new database schema. */
export const calculatorModelVersions = ['payback-v2', 'catch-up-v2', 'monthly-periodic-v1', 'dated-xirr-v1', 'vehicle-cost-v1', 'housing-budget-v1', 'savings-goal-monthly-v1', 'retirement-exact-term-v1', 'debt-payoff-v2', 'debt-strategy-v2', 'balance-transfer-v2', 'mortgage-recast-v2', 'pmi-ltv-v1', 'loan-boundary-v1'] as const;
export type CalculatorModelVersion = typeof calculatorModelVersions[number];
export function isCalculatorModelVersion(value: unknown): value is CalculatorModelVersion {
  return typeof value === 'string' && (calculatorModelVersions as readonly string[]).includes(value);
}
export function modelVersionForCalculator(slug: string): CalculatorModelVersion | undefined {
  if (['mortgage-refinance', 'home-loan-balance-transfer-india', 'mortgage-points'].includes(slug)) return 'payback-v2';
  if (slug === 'mortgage-affordability') return 'housing-budget-v1';
  if (slug === 'lease-vs-buy') return 'vehicle-cost-v1';
  if (['sip-goal', 'savings-goal'].includes(slug)) return 'savings-goal-monthly-v1';
  if (slug === 'retirement') return 'retirement-exact-term-v1';
  if (['debt-payoff', 'extra-mortgage-payment', 'mortgage-payoff', 'credit-card-payoff', 'student-loan-payoff'].includes(slug)) return 'debt-payoff-v2';
  if (slug === 'debt-snowball-avalanche') return 'debt-strategy-v2';
  if (slug === 'balance-transfer') return 'balance-transfer-v2';
  if (slug === 'mortgage-recast') return 'mortgage-recast-v2';
  if (['pmi', 'fha-vs-conventional'].includes(slug)) return 'pmi-ltv-v1';
  if (slug === 'balloon-loan') return 'loan-boundary-v1';
  if (slug === 'xirr') return 'monthly-periodic-v1';
  if (slug === 'social-security-break-even') return 'catch-up-v2';
  return undefined;
}

export function modelVersionMatchesCalculator(version: CalculatorModelVersion, slug: string): boolean {
  return version === modelVersionForCalculator(slug) || (slug === 'xirr' && version === 'dated-xirr-v1');
}
