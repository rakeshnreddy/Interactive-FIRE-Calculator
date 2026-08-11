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

export type PlanHealthAction = {
  action: string;
  assumptions: string[];
  code:
    | 'close_portfolio_gap'
    | 'test_spending_adjustment'
    | 'review_ending_balance'
    | 'resolve_model_warnings'
    | 'preserve_healthy_version';
  evidence: Record<string, number>;
  priority: 'high' | 'medium' | 'low';
  rationale: string;
  title: string;
  uncertainty: string;
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

export function derivePlanHealthActions(plan: PlanInput, result: FirePlanResult): PlanHealthAction[] {
  const health = derivePlanHealth(plan, result);
  const actions: PlanHealthAction[] = [];
  const checksByCode = Object.fromEntries(health.checks.map((check) => [check.code, check]));
  const portfolioGap = checksByCode.portfolio_gap;
  const spendingCoverage = checksByCode.spending_coverage;
  const endingBalance = checksByCode.ending_balance;
  const engineWarnings = checksByCode.engine_warnings;

  if (portfolioGap && portfolioGap.severity !== 'positive') {
    const gap = Math.abs(portfolioGap.evidence.portfolioGap ?? 0);
    actions.push({
      action:
        'Test one saved version that imports current assets, lowers annual spending, or shifts the retirement timeline before treating the target as actionable.',
      assumptions: [
        'The current portfolio and spending target are the values entered in this plan version.',
        'The modeled portfolio target comes from the saved FIRE assumptions and scenario horizon.'
      ],
      code: 'close_portfolio_gap',
      evidence: portfolioGap.evidence,
      priority: portfolioGap.severity === 'critical' ? 'high' : 'medium',
      rationale:
        gap > 0
          ? 'The current portfolio is below the modeled FIRE target, so the plan needs an explicit bridge before it can be treated as on track.'
          : portfolioGap.explanation,
      title: 'Close the modeled portfolio gap',
      uncertainty:
        'This is a planning-model gap, not a forecast. Market returns, taxes, benefits, and future spending can change the target.'
    });
  }

  if (spendingCoverage && spendingCoverage.severity !== 'positive') {
    actions.push({
      action:
        'Create a lower-spending or phased-spending version and compare it with the current version before changing the base plan.',
      assumptions: [
        'Annual spending is the first-year withdrawal need entered in the plan.',
        'Modeled coverage is based on the same return, inflation, and cash-flow assumptions as this version.'
      ],
      code: 'test_spending_adjustment',
      evidence: spendingCoverage.evidence,
      priority: spendingCoverage.severity === 'critical' ? 'high' : 'medium',
      rationale:
        'The modeled annual withdrawal is below the entered spending need, so spending assumptions drive the plan risk.',
      title: 'Test spending coverage',
      uncertainty:
        'The rule does not know your required versus flexible expenses yet; treat this as a prompt to split the assumptions.'
    });
  }

  if (endingBalance && endingBalance.severity !== 'positive') {
    actions.push({
      action:
        'Save a version with a lower estate target, longer horizon, or explicit late-life expense phase so the ending balance rule is intentional.',
      assumptions: [
        'The desired final value is an explicit guardrail in this plan.',
        'The ending balance is generated by the current-portfolio simulation.'
      ],
      code: 'review_ending_balance',
      evidence: endingBalance.evidence,
      priority: endingBalance.severity === 'critical' ? 'high' : 'medium',
      rationale:
        'The current-portfolio simulation does not finish at the desired final value, which makes the estate or reserve target unresolved.',
      title: 'Review the ending-balance guardrail',
      uncertainty:
        'This check ignores future tax treatment and unknown late-life costs unless you modeled them as cash-flow phases.'
    });
  }

  if (engineWarnings && engineWarnings.severity !== 'positive') {
    actions.push({
      action:
        'Resolve the calculator warnings or add notes explaining why the assumptions are intentional before relying on this version.',
      assumptions: [
        'Calculator warnings are produced by deterministic validation in the FIRE engine.',
        'Warnings may point to aggressive assumptions, invalid fields, or feasibility constraints.'
      ],
      code: 'resolve_model_warnings',
      evidence: engineWarnings.evidence,
      priority: engineWarnings.severity === 'critical' ? 'high' : 'medium',
      rationale:
        'Warnings reduce confidence in the saved plan because they identify assumptions or inputs that need review.',
      title: 'Resolve model warnings',
      uncertainty:
        'Some warnings can be acceptable if deliberately modeled, but the plan should explain that choice.'
    });
  }

  if (actions.length === 0) {
    actions.push({
      action:
        'Save this version with a clear label, then compare it against one conservative version before making real-world decisions.',
      assumptions: [
        'All current deterministic plan-health checks are positive.',
        'The saved version captures the current assumptions and results.'
      ],
      code: 'preserve_healthy_version',
      evidence: {
        positiveChecks: health.checks.filter((check) => check.severity === 'positive').length,
        totalChecks: health.checks.length
      },
      priority: 'low',
      rationale:
        'The plan currently passes the deterministic checks, so the useful next step is preserving context and comparing sensitivity.',
      title: 'Preserve the current version',
      uncertainty:
        'A healthy model is still assumption-bound; it is not a guarantee of future outcomes.'
    });
  }

  return actions.sort((left, right) => priorityRank(left.priority) - priorityRank(right.priority));
}

function priorityRank(priority: PlanHealthAction['priority']): number {
  if (priority === 'high') return 0;
  if (priority === 'medium') return 1;
  return 2;
}

function finiteOrZero(value: number): number {
  return Number.isFinite(value) ? value : 0;
}
