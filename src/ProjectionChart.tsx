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
        <LineChart data={data} margin={{ top: 10, right: 20, left: 8, bottom: 18 }}>
          <CartesianGrid strokeDasharray="none" vertical={false} stroke="var(--color-border)" strokeWidth={1} />
          <XAxis
            dataKey="age"
            tickLine={false}
            axisLine={{ stroke: 'var(--color-border)' }}
            tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
            label={{ value: axisLabel, position: 'insideBottom', offset: -8, fontSize: 12, fill: 'var(--color-muted)' }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 12, fill: 'var(--color-muted)' }}
            tickFormatter={(value) => formatCompactMoney(Number(value), currency)}
            width={72}
          />
          <Tooltip cursor={{ stroke: 'var(--color-border)', strokeWidth: 1 }} content={<MoneyTooltip axisLabel={axisLabel} currency={currency} />} />
          <Legend verticalAlign="top" height={30} iconType="plainline" />
          <Line
            type="monotone"
            dataKey="balance"
            name={label}
            stroke="var(--chart-primary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 1.5 }}
          />
          <Line
            type="monotone"
            dataKey="withdrawal"
            name="Withdrawal"
            stroke="var(--chart-secondary)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 1.5 }}
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
