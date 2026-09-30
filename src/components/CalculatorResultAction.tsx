import { ArrowDown } from 'lucide-react';

export function CalculatorResultAction({ disabled, onReveal }: { disabled: boolean; onReveal: () => void }) {
  return <div className="calculator-result-action"><button type="button" className="primary-button icon-text-button" disabled={disabled} onClick={onReveal}>View result<ArrowDown size={16} aria-hidden="true" /></button><small>Results update as you edit.</small></div>;
}
