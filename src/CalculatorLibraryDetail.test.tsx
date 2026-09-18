import { describe, expect, it, vi, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CalculatorLibrary } from './CalculatorLibrary';
import { seoCalculators } from './lib/seoCalculators';
import type { AuthState } from './auth';

// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

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
  message: '',
  savedResultId: '1'
});

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

describe('B20: Generic calculator reordering, hierarchy, and accessible disclosures', () => {
  const mortgageCalc = seoCalculators.find((c) => c.slug === 'mortgage')!;

  it('renders exact H1 and concise scope note, and moves methodology below calculator grid', () => {
    const { container } = renderComponent(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators/mortgage"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Exact H1 must be preserved
    const h1 = container.querySelector('h1');
    expect(h1).not.toBeNull();
    expect(h1?.textContent).toBe(mortgageCalc.h1);

    // Scope note must be present in heading before inputs
    const scopeNote = container.querySelector('.calculator-scope-note');
    expect(scopeNote).not.toBeNull();
    expect(scopeNote?.textContent).toBe(mortgageCalc.description);

    // Methodology section must be rendered and labeled
    const methodology = container.querySelector('.calculator-methodology-panel');
    expect(methodology).not.toBeNull();
    expect(methodology?.getAttribute('aria-label')).toContain('Mortgage Payment Calculator');
    expect(methodology?.textContent).toContain('What it answers');
    expect(methodology?.textContent).toContain('Why it matters');

    // DOM order: calculator-detail-grid must appear BEFORE calculator-methodology-panel
    const grid = container.querySelector('.calculator-detail-grid');
    expect(grid).not.toBeNull();
    expect(grid!.compareDocumentPosition(methodology!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('renders visible associated helper text for input fields with aria-describedby', () => {
    const { container } = renderComponent(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators/mortgage"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Locate principal input field
    const principalInput = container.querySelector<HTMLInputElement>('input#input-mortgage-principal, input[name="principal"]');
    expect(principalInput).not.toBeNull();

    const helperId = principalInput?.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();

    const helperElement = container.querySelector(`#${helperId}`);
    expect(helperElement).not.toBeNull();
    const principalInputDef = mortgageCalc.inputs.find((i) => i.key === 'principal');
    expect(helperElement?.textContent).toBe(principalInputDef?.helper);
  });

  it('renders visually dominant primary metric card', () => {
    const { container } = renderComponent(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators/mortgage"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    const primaryMetric = container.querySelector('.calculator-result-metric-primary');
    expect(primaryMetric).not.toBeNull();
    expect(primaryMetric?.classList.contains('calculator-result-metric')).toBe(true);
  });

  it('provides accessible native disclosure buttons for metric descriptions with preserved focus', () => {
    const { container } = renderComponent(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators/mortgage"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Find metric help disclosure buttons
    const helpButtons = container.querySelectorAll<HTMLButtonElement>('.calculator-help-btn');
    expect(helpButtons.length).toBeGreaterThan(0);

    const firstHelpBtn = helpButtons[0];
    expect(firstHelpBtn.getAttribute('aria-expanded')).toBe('false');

    const controlsId = firstHelpBtn.getAttribute('aria-controls');
    expect(controlsId).toBeTruthy();

    // Initially region is not visible / not rendered
    expect(container.querySelector(`#${controlsId}`)).toBeNull();

    // Focus and click to open disclosure
    firstHelpBtn.focus();
    expect(document.activeElement).toBe(firstHelpBtn);
    act(() => {
      firstHelpBtn.click();
    });
    expect(firstHelpBtn.getAttribute('aria-expanded')).toBe('true');

    // Region is now visible with matching ID
    const helpRegion = container.querySelector(`#${controlsId}`);
    expect(helpRegion).not.toBeNull();
    expect(helpRegion?.textContent?.length).toBeGreaterThan(5);

    // Focus is preserved on button (not moved away)
    expect(document.activeElement).toBe(firstHelpBtn);

    // Click again to close disclosure
    act(() => {
      firstHelpBtn.click();
    });
    expect(firstHelpBtn.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector(`#${controlsId}`)).toBeNull();
    expect(document.activeElement).toBe(firstHelpBtn);
  });

  it('preserves scenario selection and reactive input changes', () => {
    const { container } = renderComponent(
      <CalculatorLibrary
        auth={mockAuth}
        route="/calculators/mortgage"
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Check scenario tabs exist
    const scenarioButtons = container.querySelectorAll<HTMLButtonElement>('.calculator-scenario-tab');
    expect(scenarioButtons.length).toBe(3);

    // Select conservative scenario
    act(() => {
      scenarioButtons[0].click();
    });
    expect(scenarioButtons[0].getAttribute('aria-selected')).toBe('true');

    // Select optimistic scenario
    act(() => {
      scenarioButtons[2].click();
    });
    expect(scenarioButtons[2].getAttribute('aria-selected')).toBe('true');
  });
});
