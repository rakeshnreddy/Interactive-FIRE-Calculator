import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { formatMoney } from './lib/fire';
import { formatCompactMoney } from './lib/money';

type ProjectionChartRow = {
  balance: number;
  withdrawal: number;
  year: number;
};

type TooltipPayload = {
  color?: string;
  dataKey?: string;
  name?: string;
  value?: number;
};

export function ProjectionChart({
  label,
  rows,
  startAge,
  currency = 'USD'
}: {
  label: string;
  rows: ProjectionChartRow[];
  startAge?: number;
  currency?: string;
}) {
  // Year 1 of the drawdown is the retirement age, so the axis can show ages the user recognises.
  const data = rows.map((row) => ({ ...row, age: startAge === undefined ? row.year : startAge + row.year - 1 }));
  const axisLabel = startAge === undefined ? 'Year' : 'Age';
  return (
    <div className="chart-frame" role="img" aria-label={`${label} chart showing ending balance and withdrawal by ${axisLabel.toLowerCase()}`}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data} margin={{ top: 10, right: 22, left: 8, bottom: 18 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="age" label={{ value: axisLabel, position: 'insideBottom', offset: -8 }} />
          <YAxis tickFormatter={(value) => formatCompactMoney(Number(value), currency)} width={72} />
          <Tooltip content={<MoneyTooltip axisLabel={axisLabel} currency={currency} />} />
          <Legend verticalAlign="top" height={30} />
          <Line
            type="monotone"
            dataKey="balance"
            name={label}
            stroke="var(--chart-primary)"
            strokeWidth={3}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="withdrawal"
            name="Withdrawal"
            stroke="var(--chart-secondary)"
            strokeWidth={3}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function MoneyTooltip({
  active,
  label,
  payload,
  axisLabel = 'Year',
  currency = 'USD'
}: {
  active?: boolean;
  label?: number | string;
  payload?: TooltipPayload[];
  axisLabel?: string;
  currency?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>{axisLabel} {label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatMoney(Number(entry.value), { currency })}
        </span>
      ))}
    </div>
  );
}
