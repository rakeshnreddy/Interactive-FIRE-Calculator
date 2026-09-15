import { describe, expect, it, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CalculatorStudioVisual } from '../CalculatorLibrary';
import { seoCalculators, calculateSeoCalculator } from './seoCalculators';
import { buildCalculatorStudioChart, type CalculatorStudioChart } from './calculatorStudios';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const cleanupFns: (() => void)[] = [];
function renderComponent(ui: React.ReactElement) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(ui);
  });
  const unmount = () => {
    act(() => {
      root.unmount();
    });
    container.remove();
  };
  cleanupFns.push(unmount);
  return { container, unmount };
}

afterEach(() => {
  while (cleanupFns.length > 0) {
    cleanupFns.pop()!();
  }
});

describe('B21: Calculator chart truth, proportionality, and accessibility', () => {
  const mortgageCalc = seoCalculators.find((c) => c.slug === 'mortgage')!;

  it('renders true zero bar length with 0% width instead of fake 8% positive bar', () => {
    const zeroChart: CalculatorStudioChart = {
      description: 'Zero test',
      summary: 'Zero test summary',
      title: 'Zero Series Test',
      type: 'comparison',
      legend: { primary: 'Principal', secondary: 'Interest' },
      entries: [
        { label: 'Active', primary: 100000, tone: 'accent' },
        { label: 'Zero Item', primary: 0, tone: 'neutral' }
      ]
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={zeroChart}
        metrics={[]}
      />
    );

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    expect(rows.length).toBe(2);

    // Second row has primary = 0
    const zeroRow = rows[1];
    const fill = zeroRow.querySelector('.calculator-visual-fill') as HTMLElement;
    expect(fill).not.toBeNull();

    // Width MUST be 0%, NEVER 8%
    expect(fill.style.width).toBe('0%');
  });

  it('renders negative values with is-negative class, visible sign, and baseline', () => {
    const negativeChart: CalculatorStudioChart = {
      description: 'Negative test',
      summary: 'Negative test summary',
      title: 'Negative Series Test',
      type: 'comparison',
      legend: { primary: 'Net cashflow' },
      entries: [
        { label: 'Year 1', primary: 10000 },
        { label: 'Year 2', primary: -5000 }
      ]
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={negativeChart}
        metrics={[]}
      />
    );

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    expect(rows.length).toBe(2);

    const negRow = rows[1];
    // Must mark row or fill as negative
    expect(negRow.classList.contains('is-negative') || negRow.querySelector('.is-negative')).toBeTruthy();

    // Must preserve negative sign in formatted value
    expect(negRow.textContent).toContain('-');

    // Chart must render a zero baseline
    const baseline = container.querySelector('.calculator-chart-baseline');
    expect(baseline).not.toBeNull();
  });

  it('does not render the heterogeneous first-four-metrics bar chart', () => {
    const testChart: CalculatorStudioChart = {
      description: 'Heterogeneous test',
      summary: 'Test summary',
      title: 'Test Chart',
      type: 'comparison',
      legend: { primary: 'Primary' },
      entries: [{ label: 'Item 1', primary: 1000 }]
    };

    const mockMetrics = [
      { label: 'Payment', value: 1896, valueType: 'currency' as const },
      { label: 'Total Interest', value: 382633, valueType: 'currency' as const },
      { label: 'Total Paid', value: 582633, valueType: 'currency' as const },
      { label: 'Payoff Months', value: 360, valueType: 'number' as const }
    ];

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={testChart}
        metrics={mockMetrics}
      />
    );

    // .calculator-visual-bars must be removed
    const visualBars = container.querySelector('.calculator-visual-bars');
    expect(visualBars).toBeNull();
  });

  it('exposes two labeled series with swatches and textual values for both series', () => {
    const dualChart: CalculatorStudioChart = {
      description: 'Dual series test',
      summary: 'Dual summary',
      title: 'Dual Series',
      type: 'amortization',
      legend: { primary: 'Principal Paid', secondary: 'Interest Paid' },
      entries: [
        { label: 'Year 5', primary: 15000, secondary: 12000 }
      ]
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={dualChart}
        metrics={[]}
      />
    );

    // Legend must have swatches for both primary and secondary
    const swatches = container.querySelectorAll('.calculator-legend-swatch');
    expect(swatches.length).toBeGreaterThanOrEqual(2);

    // Both primary and secondary formatted values must be textually visible in row
    const row = container.querySelector('.calculator-studio-chart-row');
    expect(row).not.toBeNull();
    expect(row?.textContent).toContain('$15,000');
    expect(row?.textContent).toContain('$12,000');
  });

  it('provides an accessible semantic table equivalent for chart entries', () => {
    const tableChart: CalculatorStudioChart = {
      description: 'Table test',
      summary: 'Table summary',
      title: 'Table Test',
      type: 'timeline',
      legend: { primary: 'Balance', secondary: 'Contributions' },
      entries: [
        { label: 'Year 1', primary: 10000, secondary: 6000, note: 'Starting' },
        { label: 'Year 2', primary: 22000, secondary: 12000 }
      ]
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={tableChart}
        metrics={[]}
      />
    );

    const table = container.querySelector('table');
    expect(table).not.toBeNull();

    // Table must have column headers and row headers
    const colHeaders = table?.querySelectorAll('th[scope="col"]');
    expect(colHeaders?.length).toBeGreaterThanOrEqual(2);

    const rowHeaders = table?.querySelectorAll('th[scope="row"]');
    expect(rowHeaders?.length).toBe(2);
    expect(rowHeaders?.[0].textContent).toBe('Year 1');
    expect(rowHeaders?.[1].textContent).toBe('Year 2');
  });

  it('renders actual CAGR default inputs with ~12.47% in both chart row and semantic table', () => {
    const cagrCalc = seoCalculators.find((c) => c.slug === 'cagr')!;
    const defaultValues = Object.fromEntries(cagrCalc.inputs.map((i) => [i.key, i.defaultValue]));
    const result = calculateSeoCalculator(cagrCalc, defaultValues);
    const chart = buildCalculatorStudioChart(cagrCalc, defaultValues, result);

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={cagrCalc}
        chart={chart}
        metrics={result.metrics}
      />
    );

    // Headline metric
    expect(result.metrics[0].valueType).toBe('percent');
    expect(result.metrics[0].value).toBeCloseTo(0.124746, 4);

    // Check Base row in visual chart
    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    const baseRow = Array.from(rows).find((r) => r.textContent?.includes('Base'));
    expect(baseRow).toBeDefined();
    expect(baseRow?.textContent).toContain('12.47%');
    expect(baseRow?.textContent).not.toContain('0.1');

    // Check table row
    const table = container.querySelector('table');
    const tableRows = table?.querySelectorAll('tbody tr');
    const baseTableRow = Array.from(tableRows ?? []).find((r) => r.textContent?.includes('Base'));
    expect(baseTableRow?.textContent).toContain('12.47%');
    expect(baseTableRow?.textContent).not.toContain('0.1');
  });

  it('renders negative CAGR with ~-12.94% in both chart row and semantic table', () => {
    const cagrCalc = seoCalculators.find((c) => c.slug === 'cagr')!;
    const values = { initial: 10000, final: 5000, years: 5 };
    const result = calculateSeoCalculator(cagrCalc, values);
    const chart = buildCalculatorStudioChart(cagrCalc, values, result);

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={cagrCalc}
        chart={chart}
        metrics={result.metrics}
      />
    );

    expect(result.metrics[0].value).toBeCloseTo(-0.129449, 4);

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    const baseRow = Array.from(rows).find((r) => r.textContent?.includes('Base'));
    expect(baseRow).toBeDefined();
    expect(baseRow?.textContent).toContain('-12.94%');

    const table = container.querySelector('table');
    const tableRows = table?.querySelectorAll('tbody tr');
    const baseTableRow = Array.from(tableRows ?? []).find((r) => r.textContent?.includes('Base'));
    expect(baseTableRow?.textContent).toContain('-12.94%');
  });

  it('formats currency values below 1000 with currency symbol ($500 and $0)', () => {
    const testChart: CalculatorStudioChart = {
      currency: 'USD',
      description: 'Small currency test',
      entries: [
        { label: 'Sub-thousand', primary: 500, valueType: 'currency' },
        { label: 'Zero balance', primary: 0, valueType: 'currency' }
      ],
      legend: { primary: 'Amount' },
      summary: 'Small currency summary',
      title: 'Small Currency',
      type: 'comparison',
      valueType: 'currency'
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={testChart}
        metrics={[]}
      />
    );

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    expect(rows[0].textContent).toContain('$500');
    expect(rows[1].textContent).toContain('$0');

    const table = container.querySelector('table');
    expect(table?.textContent).toContain('$500');
    expect(table?.textContent).toContain('$0');
  });

  it('does not add currency symbol to numeric or years values above 1000', () => {
    const testChart: CalculatorStudioChart = {
      description: 'Numeric and years test',
      entries: [
        { label: 'Total units', primary: 1250, valueType: 'number' },
        { label: 'Extended period', primary: 1500, valueType: 'years' }
      ],
      legend: { primary: 'Count' },
      summary: 'Non-currency summary',
      title: 'Non-Currency Above 1000',
      type: 'comparison'
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={testChart}
        metrics={[]}
      />
    );

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    expect(rows[0].textContent).toContain('1,250');
    expect(rows[0].textContent).not.toContain('$');

    expect(rows[1].textContent).toContain('1,500 years');
    expect(rows[1].textContent).not.toContain('$');

    const table = container.querySelector('table');
    expect(table?.textContent).not.toContain('$');
  });

  it('formats dual-series chart entries according to their unit types', () => {
    const dualChart: CalculatorStudioChart = {
      currency: 'USD',
      description: 'Dual series unit test',
      entries: [
        { label: 'Small Pair', primary: 400, secondary: 250, valueType: 'currency' }
      ],
      legend: { primary: 'Primary Amount', secondary: 'Secondary Amount' },
      summary: 'Dual series summary',
      title: 'Dual Series Units',
      type: 'comparison',
      valueType: 'currency'
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={dualChart}
        metrics={[]}
      />
    );

    const row = container.querySelector('.calculator-studio-chart-row');
    expect(row?.textContent).toContain('$400');
    expect(row?.textContent).toContain('$250');

    const table = container.querySelector('table');
    expect(table?.textContent).toContain('$400');
    expect(table?.textContent).toContain('$250');
  });

  it('waterfall chart groups only compatible measures and never mixes currency with percent or years on shared track', () => {
    const incomeCalc = seoCalculators.find((c) => c.slug === 'capital-gains-tax')!;
    const values = Object.fromEntries(incomeCalc.inputs.map((i) => [i.key, i.defaultValue]));
    const result = calculateSeoCalculator(incomeCalc, values);
    const chart = buildCalculatorStudioChart(incomeCalc, values, result);

    const entryValueTypes = chart.entries.map((e) => e.valueType ?? chart.valueType);
    const uniqueTypes = new Set(entryValueTypes);
    expect(uniqueTypes.size).toBe(1);
    expect(uniqueTypes.has('currency')).toBe(true);
  });

  it('renders proportional bar widths for unequal positive values (e.g. 25 vs 100)', () => {
    const unequalChart: CalculatorStudioChart = {
      description: 'Proportional width test',
      entries: [
        { label: 'Quarter', primary: 25, valueType: 'number' },
        { label: 'Full', primary: 100, valueType: 'number' }
      ],
      legend: { primary: 'Score' },
      summary: '25 vs 100 test',
      title: 'Unequal Values',
      type: 'comparison'
    };

    const { container } = renderComponent(
      <CalculatorStudioVisual
        calculator={mortgageCalc}
        chart={unequalChart}
        metrics={[]}
      />
    );

    const rows = container.querySelectorAll('.calculator-studio-chart-row');
    const fill25 = rows[0].querySelector('.calculator-visual-fill') as HTMLElement;
    const fill100 = rows[1].querySelector('.calculator-visual-fill') as HTMLElement;

    expect(fill25.style.width).toBe('25%');
    expect(fill100.style.width).toBe('100%');
  });
});

