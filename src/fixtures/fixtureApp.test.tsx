// @vitest-environment jsdom
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { FixtureApp } from './FixtureApp';
import { restoreNetworkGuard } from './fixtureNetworkGuard';
import { SYNTHETIC_FIXTURE_MARKER } from './syntheticData';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

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

describe('R3: Real Fixture Behavior and Theme Parity (B25)', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/fixtures.html?component=dashboard&state=populated&theme=light');
  });

  afterEach(() => {
    while (cleanupFns.length > 0) {
      cleanupFns.pop()!();
    }
    restoreNetworkGuard();
  });

  it('renders with canonical .app wrapper and data-mode attributes for light and dark themes', async () => {
    window.history.pushState({}, '', '/fixtures.html?component=dashboard&state=populated&theme=light');

    const { container } = renderComponent(<FixtureApp />);

    const root = container.querySelector('[data-testid="fixture-harness-root"]');
    expect(root).not.toBeNull();
    expect(root?.classList.contains('app')).toBe(true);
    expect(root?.getAttribute('data-mode')).toBe('light');
    expect(root?.getAttribute('data-fixture-marker')).toBe(SYNTHETIC_FIXTURE_MARKER);

    // Component render surface must also carry the .app contract
    const appShell = container.querySelector('.app-shell');
    expect(appShell?.classList.contains('app')).toBe(true);
    expect(appShell?.getAttribute('data-mode')).toBe('light');

    // Toggle theme to dark
    const themeBtn = container.querySelector('.fixture-theme-toggle button') as HTMLButtonElement;
    expect(themeBtn).not.toBeNull();
    act(() => {
      themeBtn.click();
    });

    expect(root?.getAttribute('data-mode')).toBe('dark');
    expect(root?.classList.contains('theme-dark')).toBe(true);
    expect(appShell?.getAttribute('data-mode')).toBe('dark');
    expect(document.documentElement.dataset.mode).toBe('dark');
  });

  it('renders URL-selected components accurately (Accounts, Transactions, Goals, Plans, Reports, Settings)', async () => {
    // 1. Accounts Panel
    window.history.pushState({}, '', '/fixtures.html?component=accounts&state=populated&theme=light');
    const { container: accountsContainer, unmount: unmountAccounts } = renderComponent(<FixtureApp />);
    expect(accountsContainer.textContent).toContain('Primary Household Checking');
    expect(accountsContainer.textContent).toContain('Emergency Reserve Fund');
    unmountAccounts();

    // 2. Transactions Panel
    window.history.pushState({}, '', '/fixtures.html?component=transactions&state=populated&theme=light');
    const { container: txContainer, unmount: unmountTx } = renderComponent(<FixtureApp />);
    expect(txContainer.textContent).toContain('Bi-Weekly Employer Direct Deposit');
    expect(txContainer.textContent).toContain('Residential Mortgage Monthly Escrow');
    unmountTx();

    // 3. Goals Panel
    window.history.pushState({}, '', '/fixtures.html?component=goals&state=populated&theme=light');
    const { container: goalsContainer, unmount: unmountGoals } = renderComponent(<FixtureApp />);
    expect(goalsContainer.textContent).toContain('Coast FIRE Portfolio Baseline');
    unmountGoals();

    // 4. Reports / Insights Panel
    window.history.pushState({}, '', '/fixtures.html?component=reports&state=populated&theme=light');
    const { container: reportsContainer, unmount: unmountReports } = renderComponent(<FixtureApp />);
    expect(reportsContainer.textContent).toContain('Excess Liquid Cash Drag');
    unmountReports();

    // 5. Settings Panel
    window.history.pushState({}, '', '/fixtures.html?component=settings&state=populated&theme=light');
    const { container: settingsContainer, unmount: unmountSettings } = renderComponent(<FixtureApp />);
    expect(settingsContainer.textContent).toContain('Profile defaults');
    expect(settingsContainer.textContent).toContain('Privacy controls');
    unmountSettings();
  });

  it('renders distinct characteristic states (empty, populated, long-value, failure)', async () => {
    // Empty State
    window.history.pushState({}, '', '/fixtures.html?component=accounts&state=empty&theme=light');
    const { container: emptyContainer, unmount: unmountEmpty } = renderComponent(<FixtureApp />);
    expect(emptyContainer.textContent).toContain('No accounts yet');
    unmountEmpty();

    // Failure State
    window.history.pushState({}, '', '/fixtures.html?component=accounts&state=failure&theme=light');
    const { container: failureContainer, unmount: unmountFailure } = renderComponent(<FixtureApp />);
    expect(failureContainer.textContent).toContain('Synthetic Error: Connection to backend storage timed out');
    unmountFailure();

    // Long-Value State
    window.history.pushState({}, '', '/fixtures.html?component=accounts&state=long-value&theme=light');
    const { container: longContainer, unmount: unmountLong } = renderComponent(<FixtureApp />);
    expect(longContainer.textContent).toContain('Sovereign Multigenerational Dynasty Core Diversified Allocation Portfolio');
    unmountLong();
  });

  it('dispatches interactive user actions safely in-memory with zero network mutation', async () => {
    window.history.pushState({}, '', '/fixtures.html?component=settings&state=populated&theme=light');
    const { container } = renderComponent(<FixtureApp />);

    // Trigger synthetic export action
    const exportBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Download my data'));
    expect(exportBtn).toBeDefined();
    act(() => {
      exportBtn!.click();
    });

    // Verify actionLog updated
    const logElement = container.querySelector('[role="status"]');
    expect(logElement?.textContent).toContain('Synthetic action: "ExportAccountData" handled in-memory. Zero network mutation.');

    // Enter deletion confirmation and submit delete form
    const deleteInput = container.querySelector('input[aria-describedby="delete-account-data-help"]') as HTMLInputElement;
    expect(deleteInput).not.toBeNull();
    act(() => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!.call(deleteInput, 'DELETE MY FINPATH DATA');
      deleteInput.dispatchEvent(new Event('input', { bubbles: true }));
      deleteInput.dispatchEvent(new Event('change', { bubbles: true }));
    });

    const form = container.querySelector('form.privacy-delete-form') as HTMLFormElement;
    expect(form).not.toBeNull();
    act(() => {
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(logElement?.textContent).toContain('Synthetic action: "DeleteAccountData" handled in-memory. Zero network mutation.');
  });

  it('enforces network mutation lock on window.fetch inside fixture environment', async () => {
    renderComponent(<FixtureApp />);

    // Any attempt to POST to a backend API from the fixture harness must be rejected immediately
    await expect(
      window.fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Rogue Account' })
      })
    ).rejects.toThrow('[SYNTHETIC FIXTURE SECURITY VIOLATION] Outgoing network mutation blocked in fixture harness');
  });

  it('intercepts synthetic balance and transaction import calls cleanly', async () => {
    renderComponent(<FixtureApp />);

    // History GET returns synthetic data
    const balanceHistoryRes = await window.fetch('/api/imports/account-balances');
    const balanceHistory = (await balanceHistoryRes.json()) as any;
    expect(balanceHistory.imports).toHaveLength(1);
    expect(balanceHistory.imports[0].fileName).toBe('apex_credit_union_balances_20260901.csv');

    // Preview POST returns synthetic preview
    const balancePreviewRes = await window.fetch('/api/imports/account-balances/preview', { method: 'POST' });
    const balancePreview = (await balancePreviewRes.json()) as any;
    expect(balancePreview.preview.rows).toHaveLength(2);

    // Commit POST returns synthetic commit record
    const balanceCommitRes = await window.fetch('/api/imports/account-balances/commit', { method: 'POST' });
    const balanceCommit = (await balanceCommitRes.json()) as any;
    expect(balanceCommit.importRecord.importedRows).toBe(2);

    // Transaction history GET returns synthetic data
    const txHistoryRes = await window.fetch('/api/imports/transactions');
    const txHistory = (await txHistoryRes.json()) as any;
    expect(txHistory.imports).toHaveLength(1);
    expect(txHistory.imports[0].fileName).toBe('chase_checking_transactions_aug2026.csv');
  });
});
