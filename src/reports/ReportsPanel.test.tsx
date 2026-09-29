// @vitest-environment jsdom
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { FinancialInsight } from '../lib/insights';
import { ReportsPanel } from './ReportsPanel';
import { buildReportScope } from './reportScope';

const csv = vi.hoisted(() => ({ downloadCsv: vi.fn() }));
vi.mock('../lib/csv', async (importOriginal) => ({ ...(await importOriginal<typeof import('../lib/csv')>()), downloadCsv: csv.downloadCsv }));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const insight: FinancialInsight = {
  id: 'i1', area: 'accounts', category: 'observation', priority: 'high', title: 'Balances are stale',
  rationale: 'Two balances are old.', action: 'Record new balances', assumptions: ['Balances older than 45 days are stale.'],
  uncertainty: 'Old balances may hide changes.', route: '/accounts',
  evidence: [{ label: 'Stale accounts', value: '2' }]
};

afterEach(() => {
  document.body.innerHTML = '';
  csv.downloadCsv.mockReset();
});

function render(scope = buildReportScope({ accounts: [], goals: [], transactions: [], planLabel: null, today: '2026-09-26' }), isLoading = false) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<ReportsPanel insights={[insight]} onNavigate={() => {}} scope={scope} isLoading={isLoading} />));
  return container;
}

describe('ReportsPanel (B29)', () => {
  it('states scope and data gaps before the guidance', () => {
    const container = render();
    const scope = container.querySelector('[data-testid="report-scope"]')!;
    const guidance = container.querySelector('.insight-list-panel')!;
    expect(scope.compareDocumentPosition(guidance) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(scope.textContent).toContain('Report scope · as of 2026-09-26');
    expect(scope.textContent).toContain('cash-flow insights are unavailable, not zero');
    expect(scope.textContent).toContain('None recorded');
  });

  it('does not present empty-data gaps while saved data is still loading', () => {
    const container = render(undefined, true);
    const scope = container.querySelector('[data-testid="report-scope"]')!;
    expect(scope.getAttribute('aria-busy')).toBe('true');
    expect(scope.textContent).toContain('Loading your saved data');
    expect(scope.textContent).not.toContain('unavailable, not zero');
  });

  it('labels priority in text, not colour alone', () => {
    const container = render();
    expect(container.querySelector('.insight-card')?.textContent).toContain('Accounts / High');
  });

  it('exports a CSV with the same values shown on screen', () => {
    const container = render();
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Download CSV'))!;
    act(() => button.click());
    expect(csv.downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, content] = csv.downloadCsv.mock.calls[0];
    expect(filename).toBe('finpath-report-2026-09-26.csv');
    expect(content).toContain('High,Accounts,Balances are stale,Stale accounts,2,,Record new balances');
  });

  it('print expands assumption details first', () => {
    const container = render();
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Print'))!;
    act(() => button.click());
    expect(print).toHaveBeenCalled();
    expect(Array.from(container.querySelectorAll('details')).every((d) => d.open)).toBe(true);
  });

  it('shows a complete-data message when there are no gaps', () => {
    const container = render({ ...buildReportScope({ accounts: [], goals: [], transactions: [], planLabel: 'p', today: '2026-09-26' }), gaps: [] });
    expect(container.textContent).toContain('No data gaps detected for this report.');
  });
});
