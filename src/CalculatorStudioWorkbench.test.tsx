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

describe('B83 / C44 — Stage 1: Shared Studio Option A Split Financial Workbench (75 routes)', () => {
  it.each([
    '/calculators/mortgage',
    '/calculators/401k',
    '/calculators/sip',
    '/calculators/emi'
  ])('renders .calculator-visual-panel directly beneath .calculator-result-metrics and before .calculator-scope and .calculator-variants on %s (R2)', (route) => {
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

    const resultPanel = container.querySelector('.calculator-result-panel');
    expect(resultPanel).not.toBeNull();

    const primaryMetric = resultPanel!.querySelector('.calculator-result-metric-primary');
    const metricsGrid = resultPanel!.querySelector('.calculator-result-metrics');
    const visualPanel = resultPanel!.querySelector('.calculator-visual-panel');
    const scopeNotice = resultPanel!.querySelector('.calculator-scope');
    const variants = resultPanel!.querySelector('.calculator-variants');

    expect(primaryMetric).not.toBeNull();
    expect(metricsGrid).not.toBeNull();
    expect(visualPanel).not.toBeNull();

    // Visual chart comes AFTER result metrics
    expect(metricsGrid!.compareDocumentPosition(visualPanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();

    // Visual chart precedes scope notice and variant chips so the chart sits above the fold
    if (scopeNotice) {
      expect(visualPanel!.compareDocumentPosition(scopeNotice) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    if (variants) {
      expect(visualPanel!.compareDocumentPosition(variants) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(primaryMetric!.compareDocumentPosition(variants) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
  });

  it('prevents double box-in-a-box .calculator-input-control borders in workspace.css, defines .sr-only in styles.css, and enforces Option A workbench rules in studios.css (R1, R2, R3)', () => {
    const workspaceCss = readFileSync(resolve(__dirname, 'workspace.css'), 'utf8');
    const studiosCss = readFileSync(resolve(__dirname, 'studios.css'), 'utf8');
    const stylesCss = readFileSync(resolve(__dirname, 'styles.css'), 'utf8');

    // R1: workspace.css scopes input border rule to direct-child .field > input so nested .calculator-input-control inputs stay borderless
    expect(workspaceCss).not.toMatch(/:is\(\.field\s+input,/);
    expect(workspaceCss).toMatch(/:is\(\.field\s*>\s*input,/);

    // R1: studios.css defines Option A wide workbench, compact aligned input grid, and single-border input control
    expect(studiosCss).toContain('.workspace:has(.calculator-detail)');
    expect(studiosCss).toMatch(/\.calculator-detail\s+\.calculator-input-grid[\s\S]*?align-items:\s*start/);
    expect(studiosCss).toMatch(/\.calculator-detail\s+\.calculator-input-control\s+input[\s\S]*?border:\s*0/);

    // R2: 6-column smart metric ledger grid for zero orphan slots across 2–6 supporting metrics
    expect(studiosCss).toMatch(/\.calculator-detail\s+\.calculator-result-metrics[\s\S]*?grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);

    // R2: .sr-only is visually hidden so studio chart rows display clean tabular figures without repeating series legends
    expect(stylesCss).toMatch(/\.visually-hidden,\s*\.sr-only\s*\{[^}]*clip-path:\s*inset\(50%\)/s);

    // R3: schedule tables drop legacy 1040px min-width and chart data tables right-align numeric columns
    expect(studiosCss).toMatch(/\.calculator-breakdown-table-wrap\s+table[\s\S]*?min-width:\s*0/);
    expect(studiosCss).toMatch(/\.calculator-chart-table\s+:is\(th,\s*td\):nth-child\(2\)[\s\S]*?text-align:\s*right/);
  });
});
