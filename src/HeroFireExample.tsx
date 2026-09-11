import React from 'react';
import { Target, TrendingUp, Calendar, Info } from 'lucide-react';
import { HERO_FIRE_FIXTURE, getHeroFireExampleData } from './lib/heroExample';

export function HeroFireExample() {
  const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
  const { formatted, result } = data;

  // Derive points for responsive SVG trajectory
  const balances = result.portfolioMode.balances;
  const years = result.portfolioMode.years;
  const maxBalance = Math.max(...balances, data.result.requiredPortfolio, 1);
  const minBalance = Math.min(0, ...balances);

  const svgWidth = 460;
  const svgHeight = 160;
  const padding = { top: 16, right: 16, bottom: 28, left: 16 };
  const graphWidth = svgWidth - padding.left - padding.right;
  const graphHeight = svgHeight - padding.top - padding.bottom;

  const points = balances.map((balance, index) => {
    const x = padding.left + (index / (balances.length - 1)) * graphWidth;
    const normalizedY = (balance - minBalance) / (maxBalance - minBalance || 1);
    const y = padding.top + (1 - normalizedY) * graphHeight;
    return { x, y, balance, year: years[index] };
  });

  const pathD = points.reduce((acc, point, index) => {
    return `${acc} ${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1]?.x.toFixed(1)} ${(padding.top + graphHeight).toFixed(1)} L ${points[0]?.x.toFixed(1)} ${(padding.top + graphHeight).toFixed(1)} Z`;

  return (
    <aside
      className="landing-hero-example"
      role="region"
      aria-label="Illustrative FIRE calculation example"
    >
      <div className="hero-example-header">
        <span className="hero-example-badge">
          <Target size={14} aria-hidden="true" />
          Illustrative example · USD
        </span>
        <span className="hero-example-horizon">
          <Calendar size={13} aria-hidden="true" />
          {formatted.timelineYearsLabel} horizon
        </span>
      </div>

      <div className="hero-example-cards">
        <div className="hero-example-card hero-example-card-primary">
          <span className="hero-example-metric-label">Modeled retirement target</span>
          <strong className="hero-example-metric-value">{formatted.requiredPortfolio}</strong>
          <span className="hero-example-metric-sub">
            Target nest egg to sustain {formatted.annualExpense}/yr
          </span>
        </div>

        <div className="hero-example-card">
          <span className="hero-example-metric-label">Current starting point</span>
          <strong className="hero-example-metric-value">{formatted.initialPortfolio}</strong>
          <span className="hero-example-metric-sub">
            Gap to modeled target: {formatted.portfolioGap}
          </span>
        </div>
      </div>

      <div className="hero-example-chart" aria-hidden="true">
        <div className="hero-example-chart-header">
          <span className="chart-legend-label">
            <TrendingUp size={13} />
            Modeled portfolio path
          </span>
          <span className="chart-legend-end">Final balance: {formatted.initialPortfolio > '$0' ? 'Sustained' : 'Depleted'}</span>
        </div>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="hero-example-svg"
          preserveAspectRatio="none"
          aria-label="Projected portfolio trajectory over 30 years"
        >
          <defs>
            <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-bg)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary-bg)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Baseline grid */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            className="hero-svg-axis"
          />

          {/* Shaded area and line */}
          <path d={areaD} fill="url(#heroGradient)" />
          <path d={pathD} fill="none" className="hero-svg-line" strokeWidth="2.5" />

          {/* Key landmark points */}
          {points[0] && (
            <circle cx={points[0].x} cy={points[0].y} r="4" className="hero-svg-point" />
          )}
          {points[points.length - 1] && (
            <circle
              cx={points[points.length - 1].x}
              cy={points[points.length - 1].y}
              r="4"
              className="hero-svg-point"
            />
          )}

          {/* Axis labels */}
          <text x={padding.left} y={svgHeight - 8} className="hero-svg-label">
            Year 0
          </text>
          <text x={svgWidth / 2} y={svgHeight - 8} textAnchor="middle" className="hero-svg-label">
            Year 15
          </text>
          <text
            x={svgWidth - padding.right}
            y={svgHeight - 8}
            textAnchor="end"
            className="hero-svg-label"
          >
            Year 30
          </text>
        </svg>
      </div>

      <div className="hero-example-assumptions">
        <div className="assumptions-list">
          <span>
            <strong>Spending:</strong> {formatted.annualExpense}/yr
          </span>
          <span>
            <strong>Nominal return:</strong> {formatted.returnRate}
          </span>
          <span>
            <strong>Inflation:</strong> {formatted.inflationRate}
          </span>
        </div>
        <p className="hero-example-note">
          <Info size={13} aria-hidden="true" />
          An estimate based on the assumptions shown, not a guaranteed outcome.
        </p>
      </div>
    </aside>
  );
}
