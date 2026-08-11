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

export function ProjectionChart({ label, rows }: { label: string; rows: ProjectionChartRow[] }) {
  return (
    <div className="chart-frame" role="img" aria-label={`${label} chart showing ending balance and withdrawal by year`}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={rows} margin={{ top: 10, right: 22, left: 8, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="year" />
          <YAxis tickFormatter={(value) => `$${Math.round(Number(value) / 1000)}k`} width={72} />
          <Tooltip content={<MoneyTooltip />} />
          <Legend />
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
  payload
}: {
  active?: boolean;
  label?: number | string;
  payload?: TooltipPayload[];
}) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="chart-tooltip">
      <strong>Year {label}</strong>
      {payload.map((entry) => (
        <span key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatMoney(Number(entry.value))}
        </span>
      ))}
    </div>
  );
}
