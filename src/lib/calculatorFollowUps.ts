export type CalculatorFollowUpSource = {
  calculatorTitle: string;
  createdEntityId: string | null;
  createdEntityType: 'account' | 'goal' | 'plan' | 'transaction' | null;
  destinationType: 'account' | 'goal' | 'plan' | 'transaction';
};

export type CalculatorFollowUp = {
  action: string;
  label: string;
  status: 'linked' | 'next-step';
};

export function buildCalculatorFollowUp(source: CalculatorFollowUpSource): CalculatorFollowUp {
  const linked = Boolean(source.createdEntityId && source.createdEntityType);

  switch (source.destinationType) {
    case 'account':
      return linked
        ? { action: 'Record a current balance and review it beside net worth.', label: 'Account linked', status: 'linked' }
        : { action: 'Add the matching asset or liability account to track the estimate.', label: 'Add an account', status: 'next-step' };
    case 'goal':
      return linked
        ? { action: 'Set a target date and update funding as contributions are made.', label: 'Goal linked', status: 'linked' }
        : { action: 'Create a goal so the target, deadline, and funding gap stay visible.', label: 'Create a goal', status: 'next-step' };
    case 'plan':
      return linked
        ? { action: 'Review its assumptions and save a new version when they change.', label: 'Plan linked', status: 'linked' }
        : { action: 'Create a plan to compare this result with future assumptions.', label: 'Create a plan', status: 'next-step' };
    case 'transaction':
      return {
        action: 'Add real income and spending entries to compare the estimate with monthly cash flow.',
        label: 'Track cash flow',
        status: 'next-step'
      };
  }
}
