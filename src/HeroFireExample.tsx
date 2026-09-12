import React from 'react';
import { Target, TrendingUp, Calendar, Info } from 'lucide-react';
import { HERO_FIRE_FIXTURE, getHeroFireExampleData } from './lib/heroExample';

export function HeroFireExample() {
  const chartTitleId = React.useId();
  const chartDescId = React.useId();
  const svgTitleId = React.useId();
  const svgDescId = React.useId();

  const data = getHeroFireExampleData(HERO_FIRE_FIXTURE);
  const { formatted, result } = data;

  // Derive points for responsive SVG trajectory using expenseMode (R1)
  const balances = result.expenseMode.balances;
  const years = result.expenseMode.years;
  const startYear = years[0] ?? 0;
  const endYear = years[years.length - 1] ?? 30;
  const midYear = years[Math.floor((years.length - 1) / 2)] ?? 15;

  const maxBalance = Math.max(...balances, data.result.requiredPortfolio, 1);
  const minBalance = 0;

  const svgWidth = 460;
  const svgHeight = 160;
  const padding = { top: 20, right: 16, bottom: 28, left: 16 };
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
            Target nest egg to fund {formatted.annualExpense}/yr initial spending
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

      {/* R2: Exposed figure with figcaption and accessible text alternative */}
      <figure
        className="hero-example-chart"
        aria-labelledby={chartTitleId}
        aria-describedby={chartDescId}
      >
        <figcaption className="hero-example-chart-header">
          <span id={chartTitleId} className="chart-legend-label">
            <TrendingUp size={13} aria-hidden="true" />
            Retirement withdrawals from the modeled target
          </span>
          <span className="chart-legend-end">Modeled end balance: {formatted.modeledEndBalance}</span>
        </figcaption>

        <p className="hero-chart-context">
          Starting balance is the modeled target ({formatted.requiredPortfolio}). The separate gap of {formatted.portfolioGap} is between current savings ({formatted.initialPortfolio}) and this target.
        </p>

        <p id={chartDescId} className="visually-hidden">
          Illustrative retirement drawdown over a {formatted.timelineYearsLabel} horizon from Year {startYear} to Year {endYear}. Starting balance is the modeled target of {formatted.requiredPortfolio} and concludes at a modeled end balance of {formatted.modeledEndBalance}, funding initial annual spending of {formatted.annualExpense} with {formatted.inflationRate} inflation and {formatted.returnRate} nominal return.
        </p>

        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="hero-example-svg"
          preserveAspectRatio="none"
          role="img"
          aria-labelledby={`${svgTitleId} ${svgDescId}`}
        >
          <title id={svgTitleId}>Retirement withdrawals trajectory</title>
          <desc id={svgDescId}>
            Modeled trajectory starting at {formatted.requiredPortfolio} in Year {startYear} and drawing down to {formatted.modeledEndBalance} at Year {endYear}.
          </desc>

          <defs>
            <linearGradient id="heroGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-bg)" stopOpacity="0.28" />
              <stop offset="100%" stopColor="var(--color-primary-bg)" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Zero baseline grid */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={svgWidth - padding.right}
            y2={padding.top + graphHeight}
            className="hero-svg-axis"
            aria-hidden="true"
          />

          {/* Shaded area and line */}
          <path d={areaD} fill="url(#heroGradient)" aria-hidden="true" />
          <path d={pathD} fill="none" className="hero-svg-line" strokeWidth="2.5" aria-hidden="true" />

          {/* Key landmark points with dollar amounts */}
          {points[0] && (
            <g aria-hidden="true">
              <circle cx={points[0].x} cy={points[0].y} r="4" className="hero-svg-point" />
              <text x={points[0].x} y={points[0].y - 8} className="hero-svg-amount-label">
                {formatted.requiredPortfolio}
              </text>
            </g>
          )}
          {points[points.length - 1] && (
            <g aria-hidden="true">
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="4"
                className="hero-svg-point"
              />
              <text
                x={points[points.length - 1].x}
                y={points[points.length - 1].y - 8}
                textAnchor="end"
                className="hero-svg-amount-label"
              >
                $0
              </text>
            </g>
          )}

          {/* Dynamically derived axis labels */}
          <text x={padding.left} y={svgHeight - 8} className="hero-svg-label" aria-hidden="true">
            Year {startYear}
          </text>
          <text x={svgWidth / 2} y={svgHeight - 8} textAnchor="middle" className="hero-svg-label" aria-hidden="true">
            Year {midYear}
          </text>
          <text
            x={svgWidth - padding.right}
            y={svgHeight - 8}
            textAnchor="end"
            className="hero-svg-label"
            aria-hidden="true"
          >
            Year {endYear}
          </text>
        </svg>
      </figure>

      <div className="hero-example-assumptions">
        <div className="assumptions-list">
          <span>
            <strong>Initial annual spending:</strong> {formatted.annualExpense}/yr
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
