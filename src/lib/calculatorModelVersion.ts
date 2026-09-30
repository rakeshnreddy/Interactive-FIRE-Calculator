/** Versioned interpretations share result JSON, not a new database schema. */
export const calculatorModelVersions = ['payback-v2', 'catch-up-v2'] as const;
export type CalculatorModelVersion = typeof calculatorModelVersions[number];
export function isCalculatorModelVersion(value: unknown): value is CalculatorModelVersion {
  return typeof value === 'string' && (calculatorModelVersions as readonly string[]).includes(value);
}
export function modelVersionForCalculator(slug: string): CalculatorModelVersion | undefined {
  if (['mortgage-refinance', 'home-loan-balance-transfer-india', 'mortgage-points'].includes(slug)) return 'payback-v2';
  if (slug === 'social-security-break-even') return 'catch-up-v2';
  return undefined;
}
