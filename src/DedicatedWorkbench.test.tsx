// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import { CalculatorLibrary } from './CalculatorLibrary';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

const mockAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const mockSaveResult = async () => ({
  destinationRoute: '/plans' as const,
  message: 'Saved',
  savedResultId: 'synthetic'
});

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  window.localStorage.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

describe('B84 / C45 — Stage 2: Option A Split Financial Workbench across the 7 dedicated calculators', () => {
  it.each([
    ['/calculators/compound-interest', '.compound-growth-chart'],
    ['/calculators/savings-goal', '.savings-runway-chart'],
    ['/calculators/budget', '.cashflow-figure'],
    ['/calculators/net-worth', '.cashflow-figure'],
    ['/calculators/emergency-fund', '.cashflow-figure']
  ])('renders the split input/result workbench and inline visual chart on %s', (route, chartSelector) => {
    window.history.replaceState({}, '', route);
    act(() => {
      root.render(
        <CalculatorLibrary
          auth={mockAuth}
          route={route}
          onNavigate={() => {}}
          onSaveResult={mockSaveResult}
          savedResults={[]}
        />
      );
    });

    expect(container.querySelector('.calculator-input-panel')).not.toBeNull();
    expect(container.querySelector('.calculator-result-panel')).not.toBeNull();
    expect(container.querySelector(chartSelector)).not.toBeNull();
  });

  it('enforces aligned 36px dedicated controls, quiet hairline panels, flat legends, and compact XIRR mode bar in workspace.css (R1)', () => {
    const workspaceCss = readFileSync(resolve(__dirname, 'workspace.css'), 'utf8');

    // R1: unified 36px height on dedicated selects and inputs
    expect(workspaceCss).toMatch(/\.compound-calculator\s+\.compound-select[\s\S]*?min-height:\s*36px/);
    expect(workspaceCss).toMatch(/\.dated-currency\s+select[\s\S]*?\.vehicle-field\s+input[\s\S]*?min-height:\s*36px/);

    // R1: retires loud legacy 3px top accent stripes on dedicated input & result panels
    expect(workspaceCss).toMatch(/\.compound-workspace\s+\.calculator-input-panel[\s\S]*?border-top:\s*1px solid var\(--color-border\)/);

    // R1: keeps input panel Reset button on one row (nowrap) and flattens fieldset legends inside inset cards
    expect(workspaceCss).toMatch(/\.compound-workspace\s+\.calculator-input-panel\s*>\s*\.panel-heading[\s\S]*?flex-wrap:\s*nowrap/);
    expect(workspaceCss).toMatch(/\.cashflow-input-section\s+legend[\s\S]*?float:\s*left/);

    // R1: compact inline segmented mode switcher on XIRR
    expect(workspaceCss).toMatch(/\.calculator-mode-choice[\s\S]*?padding:\s*8px 16px/);
    expect(workspaceCss).toMatch(/\.calculator-mode-actions[\s\S]*?background:\s*var\(--color-surface-inset\)/);
  });

  it('enforces zero-orphan metric grids, compact Option A heroes, above-the-fold charts, and right-aligned tabular tables (R2, R3)', () => {
    const workspaceCss = readFileSync(resolve(__dirname, 'workspace.css'), 'utf8');

    // R2: Option A inset ledger hero for compound & cashflow calculators
    expect(workspaceCss).toMatch(/\.compound-calculator\s+\.compound-headline[\s\S]*?border-inline-start:\s*3px solid var\(--color-primary-bg\)/);

    // R2: 4-column desktop metric grid for 8-metric Savings Goal (eliminates orphan 3rd-row blank slot)
    expect(workspaceCss).toMatch(/\.savings-goal-calculator\s+\.calculator-result-metrics[\s\S]*?grid-template-columns:\s*repeat\(4,\s*minmax\(0,\s*1fr\)\)/);

    // R2: smart 6-column 3+2 metric grid for 5-metric Cashflow planners (Budget, Net Worth, Emergency Fund)
    expect(workspaceCss).toMatch(/\.cashflow-planning-calculator\s+\.calculator-result-metrics[\s\S]*?grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);
    expect(workspaceCss).toMatch(/\.cashflow-planning-calculator\s+\.calculator-result-metrics\s*>\s*\.calculator-result-metric:nth-child\(n\s*\+\s*4\)[\s\S]*?grid-column:\s*span 3/);

    // R2: full-width single supporting metric strip on Dated XIRR and Lease vs Buy
    expect(workspaceCss).toMatch(/\.calculator-result-metrics:has\(>\s*:nth-child\(2\)\):not\(:has\(>\s*:nth-child\(3\)\)\)[\s\S]*?grid-column:\s*1\s*\/\s*-1/);

    // R2: compact above-the-fold charts across compound, savings runway, dated XIRR, and lease vs buy
    expect(workspaceCss).toMatch(/\.compound-calculator\s+\.compound-chart-plot[\s\S]*?min-height:\s*128px/);
    expect(workspaceCss).toMatch(/\.savings-goal-calculator\s+\.savings-runway-plot[\s\S]*?min-height:\s*112px/);
    expect(workspaceCss).toMatch(/\.dated-flow-visual\s+svg[\s\S]*?max-height:\s*112px/);

    // R3: right-aligned numeric columns in dedicated schedule & comparison tables
    expect(workspaceCss).toMatch(/\.dated-flow-table\s+table\s+:is\(th,\s*td\):nth-child\(2\)[\s\S]*?text-align:\s*right/);
  });
});
