import { formatMoney, formatPercent, type YearResult } from '../lib/fire';

export function YearByYearTable({
  rows,
  label,
  startAge,
  currency = 'USD'
}: {
  rows: YearResult[];
  label: string;
  startAge?: number;
  currency?: string;
}) {
  const money = (value: number) => formatMoney(value, { currency });
  return (
    <div className="table-wrap">
      <table aria-label={`${label} year-by-year projection`}>
        <thead>
          <tr>
            <th scope="col">Year</th>
            {startAge !== undefined ? <th scope="col">Age</th> : null}
            <th scope="col">Start</th>
            <th scope="col">Base</th>
            <th scope="col">Income</th>
            <th scope="col">Extra</th>
            <th scope="col">Net</th>
            <th scope="col">One-off</th>
            <th scope="col">Return</th>
            <th scope="col">Inflation</th>
            <th scope="col">End</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.year}>
              <th scope="row">{row.year}</th>
              {startAge !== undefined ? <td>{startAge + row.year - 1}</td> : null}
              <td>{money(row.startingBalance)}</td>
              <td>{money(row.baseWithdrawal)}</td>
              <td>{money(row.recurringIncome)}</td>
              <td>{money(row.recurringExpense)}</td>
              <td>{money(row.withdrawal)}</td>
              <td>{money(row.oneOffAmount)}</td>
              <td>{formatPercent(row.returnRate)}</td>
              <td>{formatPercent(row.inflationRate)}</td>
              <td>{money(row.endingBalance)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
