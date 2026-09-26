import { describe, expect, it, vi } from 'vitest';
import { buildProjectionCsv, downloadCsv, downloadJson, escapeCsvCell } from './csv';
import type { YearResult } from './fire';

describe('csv.ts', () => {
  describe('escapeCsvCell', () => {
    it('returns raw text if no commas, quotes, or newlines', () => {
      expect(escapeCsvCell('hello')).toBe('hello');
      expect(escapeCsvCell(123)).toBe('123');
    });

    it('wraps and escapes quotes for strings with commas, quotes, or newlines', () => {
      expect(escapeCsvCell('hello, world')).toBe('"hello, world"');
      expect(escapeCsvCell('say "hi"')).toBe('"say ""hi"""');
      expect(escapeCsvCell('line 1\nline 2')).toBe('"line 1\nline 2"');
    });
  });

  describe('buildProjectionCsv', () => {
    it('produces exact CSV with headers and formatted year result rows', () => {
      const mockRows: YearResult[] = [
        {
          baseWithdrawal: 40000,
          endingBalance: 1010000,
          inflationRate: 0.025,
          oneOffAmount: 0,
          recurringExpense: 0,
          recurringIncome: 0,
          returnRate: 0.05,
          startingBalance: 1000000,
          withdrawal: 40000,
          year: 1
        },
        {
          baseWithdrawal: 41000,
          endingBalance: 1020000,
          inflationRate: 0.025,
          oneOffAmount: 5000,
          recurringExpense: 1000,
          recurringIncome: 2000,
          returnRate: 0.05,
          startingBalance: 1010000,
          withdrawal: 40000,
          year: 2
        }
      ];

      const csv = buildProjectionCsv('Base Plan', mockRows);
      const lines = csv.split('\n');

      expect(lines[0]).toBe(
        'Projection,Year,Starting balance,Base withdrawal,Recurring income,Recurring expense,Net withdrawal,One-off cash flow,Return rate,Inflation rate,Ending balance'
      );
      expect(lines[1]).toBe('Base Plan,1,1000000.00,40000.00,0.00,0.00,40000.00,0.00,5.0000,2.5000,1010000.00');
      expect(lines[2]).toBe('Base Plan,2,1010000.00,41000.00,2000.00,1000.00,40000.00,5000.00,5.0000,2.5000,1020000.00');
    });
  });

  describe('downloadCsv and downloadJson', () => {
    it('creates a download link and triggers click', () => {
      const createObjectURLMock = vi.fn().mockReturnValue('blob:mock-url');
      const revokeObjectURLMock = vi.fn();
      globalThis.URL.createObjectURL = createObjectURLMock;
      globalThis.URL.revokeObjectURL = revokeObjectURLMock;

      const clickMock = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const removeMock = vi.spyOn(HTMLAnchorElement.prototype, 'remove').mockImplementation(() => undefined as any);

      downloadCsv('test.csv', 'col1,col2\n1,2');
      expect(clickMock).toHaveBeenCalled();
      expect(createObjectURLMock).toHaveBeenCalled();
      expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');

      downloadJson('test.json', { key: 'value' });
      expect(clickMock).toHaveBeenCalledTimes(2);

      clickMock.mockRestore();
      removeMock.mockRestore();
    });
  });
});
