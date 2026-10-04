import type { CalculatorScope } from '../lib/calculatorScope';

export function CalculatorScopeNotice({scope}: {scope: CalculatorScope | null}) {
  if (!scope) return null;
  return <aside className="calculator-scope" aria-label="What this estimate covers">
    <p><strong>Includes:</strong> {scope.included}</p>
    <p><strong>Not included:</strong> {scope.excluded}</p>
    <details>
      <summary>{scope.sources.length ? <>Model basis &amp; official sources</> : 'Model basis'}</summary>
      <p><strong>Model basis:</strong> {scope.basis}</p>
      <p><strong>Scope reviewed:</strong> {scope.checked}.{scope.sources.length ? ' References describe the wider rules; this estimate covers only the model above.' : ''}</p>
      {scope.sources.length ? <ul>{scope.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer" aria-label={`${source.label} (official source, opens in a new tab)`}>{source.label}<span className="sr-only"> (official source, opens in a new tab)</span></a></li>)}</ul> : null}
    </details>
  </aside>;
}
