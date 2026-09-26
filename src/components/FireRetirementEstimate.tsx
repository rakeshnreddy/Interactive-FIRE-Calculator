import type { AccumulationResult } from '../lib/fireAccumulation';
import { formatCompactMoney } from '../lib/money';

export type FireRetirementEstimateProps = {
  estimate: AccumulationResult | null;
  currency: string;
  chosenRetirementAge: number;
  planEndAge: number;
  projectedAtChosenAge: number | null;
  neededAtChosenAge: number;
  returnRate: number;
  inflationRate: number;
};

const pct = (value: number) => `${(Math.round(value * 1000) / 10).toString()}%`;

// Headline answer for "when could I retire?" plus a text alternative of the savings path.
export function FireRetirementEstimate({
  estimate, currency, chosenRetirementAge, planEndAge, projectedAtChosenAge, neededAtChosenAge, returnRate, inflationRate
}: FireRetirementEstimateProps) {
  const money = (value: number) => formatCompactMoney(value, currency);
  const real = (1 + returnRate) / (1 + inflationRate) - 1;
  const reached = estimate?.path.at(-1);

  let headline: string;
  let explanation: string;
  if (!estimate) {
    headline = 'Add annual savings to estimate when you could retire';
    explanation = 'The FIRE number above is what you need at your chosen retirement age. Enter how much you save each year to see the earliest age this plan could support.';
  } else if (estimate.status === 'already-fi') {
    headline = `Your portfolio already covers this plan at age ${estimate.retireAge}`;
    explanation = `${money(reached?.portfolio ?? 0)} meets the ${money(reached?.target ?? 0)} needed to fund your spending until age ${planEndAge}.`;
  } else if (estimate.status === 'reaches') {
    headline = `Retire at about age ${estimate.retireAge}`;
    explanation = `By then your savings grow to about ${money(reached?.portfolio ?? 0)}, which meets the ${money(reached?.target ?? 0)} needed to fund your spending from age ${estimate.retireAge} until ${planEndAge}.`;
  } else {
    headline = `Not reached before age ${planEndAge}`;
    explanation = 'At these savings and rates the portfolio never catches up with what retirement would need. Try higher savings, lower spending or a later plan end age.';
  }

  const gap = projectedAtChosenAge === null ? null : projectedAtChosenAge - neededAtChosenAge;
  const milestones = estimate ? estimate.path.filter((row, index) => index % 5 === 0 || index === estimate.path.length - 1) : [];

  return (
    <div className="fire-retirement-estimate" data-testid="fire-retirement-estimate">
      <strong className="fire-estimate-headline">{headline}</strong>
      <p>{explanation}</p>
      {gap !== null ? (
        <p className="fire-estimate-chosen">
          At your chosen retirement age ({chosenRetirementAge}): projected {money(projectedAtChosenAge ?? 0)} vs {money(neededAtChosenAge)} needed —{' '}
          <strong>{gap >= 0 ? 'on track' : `short by ${money(-gap)}`}</strong>.
        </p>
      ) : null}
      <p className="fire-estimate-rates" data-testid="fire-estimate-rates">
        Assumes {pct(returnRate)} return and {pct(inflationRate)} inflation a year (about {pct(real)} after inflation). Amounts are in today&apos;s money. This is an estimate, not a promise; small changes in returns move the age.
      </p>
      {milestones.length > 0 ? (
        <details className="fire-estimate-path">
          <summary>Savings path by age</summary>
          <div className="table-wrap">
            <table aria-label="Projected savings compared with the amount needed, by age">
              <thead>
                <tr>
                  <th scope="col">Age</th>
                  <th scope="col">Projected portfolio</th>
                  <th scope="col">Needed to retire</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((row) => (
                  <tr key={row.age}>
                    <th scope="row">{row.age}</th>
                    <td>{money(row.portfolio)}</td>
                    <td>{money(row.target)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}
    </div>
  );
}
