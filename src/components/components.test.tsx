import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Field } from './Field';
import { InfoTip } from './InfoTip';
import { Metric } from './Metric';
import { YearByYearTable } from './YearByYearTable';
import type { YearResult } from '../lib/fire';

describe('Shared Presentational Components', () => {
  describe('Metric', () => {
    it('renders label and value with tone class', () => {
      const html = renderToStaticMarkup(<Metric label="Total Portfolio" value="$1,000,000" tone="accent" />);
      expect(html).toContain('metric metric-accent');
      expect(html).toContain('<span>Total Portfolio</span>');
      expect(html).toContain('<strong>$1,000,000</strong>');
    });

    it('defaults to neutral tone', () => {
      const html = renderToStaticMarkup(<Metric label="Age" value="35" />);
      expect(html).toContain('metric metric-neutral');
    });
  });

  describe('InfoTip', () => {
    it('renders trigger button and tooltip text', () => {
      const html = renderToStaticMarkup(<InfoTip id="tip-1" label="Retirement Age" text="Target retirement age in years" />);
      expect(html).toContain('class="info-tip"');
      expect(html).toContain('aria-label="Help for Retirement Age"');
      expect(html).toContain('aria-expanded="false"');
      expect(html).toContain('role="tooltip"');
      expect(html).toContain('aria-hidden="true"');
      expect(html).toContain('Target retirement age in years');
    });
  });

  describe('Field', () => {
    it('connects label to input and attaches help and issue descriptions', () => {
      const html = renderToStaticMarkup(
        <Field label="Annual Spending" help="Expected first year spending" issue="Must be greater than 0" prefix="$">
          <input type="number" defaultValue={50000} />
        </Field>
      );

      expect(html).toContain('field field-has-issue');
      expect(html).toContain('<label');
      expect(html).toContain('Annual Spending</label>');
      expect(html).toContain('aria-invalid="true"');
      expect(html).toContain('role="alert"');
      expect(html).toContain('Must be greater than 0');
      expect(html).toContain('<small aria-hidden="true">$</small>');
    });
  });

  describe('YearByYearTable', () => {
    it('renders table headers and rows with accessible caption/label', () => {
      const mockRows: YearResult[] = [
        {
          baseWithdrawal: 40000,
          endingBalance: 980000,
          inflationRate: 0.02,
          oneOffAmount: 0,
          recurringExpense: 0,
          recurringIncome: 0,
          returnRate: 0.05,
          startingBalance: 1000000,
          withdrawal: 40000,
          year: 1
        }
      ];

      const html = renderToStaticMarkup(<YearByYearTable label="Base Scenario" rows={mockRows} />);
      expect(html).toContain('table-wrap');
      expect(html).toContain('aria-label="Base Scenario year-by-year projection"');
      expect(html).toContain('<th scope="col">Year</th>');
      expect(html).toContain('<th scope="col">Start</th>');
      expect(html).toContain('<th scope="col">End</th>');
      expect(html).toContain('<th scope="row">1</th>');
      expect(html).toContain('$1,000,000');
      expect(html).toContain('$980,000');
    });
  });
});
