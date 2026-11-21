// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App from './App';

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

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    }))
  });
  window.localStorage.clear();
  window.history.replaceState({}, '', '/calculators/fire');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  document.body.innerHTML = '';
});

describe('B81 / C42 — FIRE Calculator Option A Split Financial Workbench', () => {
  it('renders the 2-column Split Financial Workbench structure with 3-across age triad fields and pre-calculate output stage (R1, R2)', async () => {
    await act(async () => {
      root.render(<App auth={mockAuth} />);
    });

    const workbench = container.querySelector('.fire-workbench-grid');
    expect(workbench).not.toBeNull();

    const inputsCol = workbench?.querySelector('.fire-workbench-inputs');
    const outputsCol = workbench?.querySelector('.fire-workbench-outputs');
    expect(inputsCol).not.toBeNull();
    expect(outputsCol).not.toBeNull();

    // 3 age fields carry .fire-age-field for the 3-across Age Triad
    const ageFields = inputsCol?.querySelectorAll('.fire-age-field');
    expect(ageFields?.length).toBe(3);

    // Before calculation: preview stage is visible in right column while .hero-result and #results are absent
    expect(outputsCol?.querySelector('.fire-workbench-preview')).not.toBeNull();
    expect(container.querySelector('.hero-result')).toBeNull();
    expect(container.querySelector('#results')).toBeNull();
  });

  it('mounts both the headline answer and the interactive projection chart (#results) by default immediately after Calculate without clicking tabs (R3)', async () => {
    await act(async () => {
      root.render(<App auth={mockAuth} />);
    });

    const useExampleBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Use example values'
    );
    expect(useExampleBtn).toBeTruthy();
    await act(async () => {
      useExampleBtn!.click();
    });

    const calcBtn = container.querySelector<HTMLButtonElement>('.quick-actions .primary-button');
    expect(calcBtn).toBeTruthy();
    await act(async () => {
      calcBtn!.click();
    });

    const outputsCol = container.querySelector('.fire-workbench-outputs');
    expect(outputsCol).not.toBeNull();

    const heroResult = outputsCol?.querySelector('.hero-result');
    const chartPanel = outputsCol?.querySelector('#results.chart-panel');
    const healthPanel = outputsCol?.querySelector('section.health-panel');

    // Both heroResult AND chartPanel are rendered by default inside the right workbench column
    expect(heroResult).not.toBeNull();
    expect(chartPanel).not.toBeNull();
    expect(healthPanel).not.toBeNull();

    // Results tab is selected by default after Calculate
    const resultsTab = Array.from(
      outputsCol!.querySelectorAll<HTMLButtonElement>('.result-tabs-panel button[role="tab"]')
    ).find((b) => b.textContent?.includes('Results'));
    expect(resultsTab?.getAttribute('aria-selected')).toBe('true');

    // Interactive chart panel precedes Plan health in the right output stage so chart is above the fold
    expect(chartPanel!.compareDocumentPosition(healthPanel!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('enforces compact 24px info-dot target override over .app.app button and defines desktop split-workbench grid in CSS (R1, R2)', () => {
    const vividCss = readFileSync(resolve(__dirname, 'vivid-theme.css'), 'utf8');
    const workspaceCss = readFileSync(resolve(__dirname, 'workspace.css'), 'utf8');

    expect(vividCss).toMatch(/\.app\.app\s+\.info-dot[\s\S]*?min-block-size:\s*24px/);
    expect(workspaceCss).toContain('.fire-workbench-grid');
    expect(workspaceCss).toContain('.fire-workbench-inputs');
    expect(workspaceCss).toContain('.fire-workbench-outputs');
    expect(workspaceCss).toContain('.fire-age-field');
  });

  it('B82 / C43: defines 1-column planner-grid inside .fire-workbench-inputs, structured 6-column repeat cards, right-aligned cash-flow table, and auto-fit health-grid (R1, R2, R3)', () => {
    const workspaceCss = readFileSync(resolve(__dirname, 'workspace.css'), 'utf8');

    // R1: 1-column planner-grid inside .fire-workbench-inputs + 6-column structured event & recurring rows
    expect(workspaceCss).toMatch(/\.fire-workbench-inputs\s+\.advanced-shell\s+\.planner-grid[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(workspaceCss).toMatch(/\.fire-workbench-inputs\s+\.period-list\s+\.repeat-row[\s\S]*?grid-template-columns:\s*32px\s+repeat\(3,\s*minmax\(0,\s*1fr\)\)\s+32px/);
    expect(workspaceCss).toMatch(/\.fire-workbench-inputs\s+:is\(\.event-row,\s*\.recurring-row\)[\s\S]*?grid-template-columns:\s*repeat\(6,\s*minmax\(0,\s*1fr\)\)/);

    // R2: right-aligned tabular ledger columns in #results table without 1040px min-width overflow
    expect(workspaceCss).toMatch(/\.fire-workbench-outputs\s+#results\s+table[\s\S]*?min-width:\s*640px/);
    expect(workspaceCss).toMatch(/\.fire-workbench-outputs\s+#results\s+:is\(th,\s*td\):nth-child\(n\+3\)[\s\S]*?text-align:\s*right/);

    // R3: auto-fit health-grid without orphan 4th column
    expect(workspaceCss).toMatch(/\.fire-workbench-outputs\s+\.health-grid[\s\S]*?grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(200px,\s*1fr\)\)/);
  });

  it('B82 / C43: clicking the Inputs tab in .result-tabs-panel opens #fire-optional-refinements so advanced refinements are visible (R3)', async () => {
    await act(async () => {
      root.render(<App auth={mockAuth} />);
    });

    const useExampleBtn = Array.from(container.querySelectorAll<HTMLButtonElement>('button')).find(
      (b) => b.textContent?.trim() === 'Use example values'
    )!;
    await act(async () => {
      useExampleBtn.click();
    });

    const calcBtn = container.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcBtn.click();
    });

    const disclosure = container.querySelector<HTMLDetailsElement>('#fire-optional-refinements')!;
    expect(disclosure.open).toBe(false);

    const inputsTab = Array.from(
      container.querySelectorAll<HTMLButtonElement>('.result-tabs-panel button[role="tab"]')
    ).find((b) => b.textContent?.includes('Inputs'))!;
    await act(async () => {
      inputsTab.click();
    });

    expect(disclosure.open).toBe(true);
  });
});
