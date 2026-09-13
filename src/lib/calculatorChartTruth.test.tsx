import { describe, expect, it, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CalculatorStudioVisual } from '../CalculatorLibrary';
import { seoCalculators } from './seoCalculators';
import type { CalculatorStudioChart } from './calculatorStudios';

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
});
