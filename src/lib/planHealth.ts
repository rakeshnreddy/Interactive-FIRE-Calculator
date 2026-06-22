import type { FirePlanResult, PlanInput } from './fire';

export type PlanHealthSeverity = 'positive' | 'warning' | 'critical';
export type PlanHealthStatus = 'healthy' | 'watch' | 'at-risk';

export type PlanHealthCheck = {
  code: 'portfolio_gap' | 'spending_coverage' | 'ending_balance' | 'engine_warnings';
  evidence: Record<string, number>;
  explanation: string;
  severity: PlanHealthSeverity;
  title: string;
};

export type PlanHealth = {
  checks: PlanHealthCheck[];
  status: PlanHealthStatus;
};

export function derivePlanHealth(plan: PlanInput, result: FirePlanResult): PlanHealth {
  const requiredPortfolio = finiteOrZero(result.requiredPortfolio);
  const portfolioGap = plan.initialPortfolio - requiredPortfolio;
  const fundingRatio = requiredPortfolio > 0 ? plan.initialPortfolio / requiredPortfolio : 1;
  const spendingCoverage = result.maxAnnualExpense - plan.annualExpense;
  const finalBalance = finiteOrZero(result.portfolioMode.finalBalance);
  const errorWarnings = result.warnings.filter((warning) => warning.severity === 'error').length;
  const otherWarnings = result.warnings.length - errorWarnings;

  const checks: PlanHealthCheck[] = [
    {
      code: 'portfolio_gap',
      evidence: { fundingRatio, portfolioGap, requiredPortfolio },
      explanation:
        portfolioGap >= 0
          ? 'The current portfolio meets the modeled target under these assumptions.'
          : 'The current portfolio is below the modeled target under these assumptions.',
      severity: portfolioGap >= 0 ? 'positive' : fundingRatio >= 0.75 ? 'warning' : 'critical',
      title: 'Portfolio target'
    },
    {
      code: 'spending_coverage',
      evidence: { annualExpense: plan.annualExpense, maxAnnualExpense: result.maxAnnualExpense, spendingCoverage },
      explanation:
        spendingCoverage >= 0
          ? 'Modeled portfolio income covers the entered annual spending.'
          : 'Entered annual spending is above the modeled portfolio income.',
      severity: spendingCoverage >= 0 ? 'positive' : Math.abs(spendingCoverage) <= plan.annualExpense * 0.15 ? 'warning' : 'critical',
      title: 'Spending coverage'
    },
    {
      code: 'ending_balance',
      evidence: { desiredFinalValue: plan.desiredFinalValue, finalBalance },
      explanation:
        finalBalance >= plan.desiredFinalValue
          ? 'The current-portfolio simulation finishes at or above the desired final value.'
          : 'The current-portfolio simulation finishes below the desired final value.',
      severity: finalBalance >= plan.desiredFinalValue ? 'positive' : finalBalance >= 0 ? 'warning' : 'critical',
      title: 'Ending balance'
    },
    {
      code: 'engine_warnings',
      evidence: { errorWarnings, otherWarnings, totalWarnings: result.warnings.length },
      explanation:
        result.warnings.length === 0
          ? 'The calculator reported no validation or feasibility warnings.'
          : 'Review the calculator warnings before relying on this version.',
      severity: errorWarnings > 0 ? 'critical' : otherWarnings > 0 ? 'warning' : 'positive',
      title: 'Model checks'
    }
  ];

  return {
    checks,
    status: checks.some((check) => check.severity === 'critical')
      ? 'at-risk'
      : checks.some((check) => check.severity === 'warning')
        ? 'watch'
        : 'healthy'
  };
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
