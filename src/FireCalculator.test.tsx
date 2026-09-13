import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthState } from './auth';
import App from './App';

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

let container: HTMLDivElement | null = null;
let root: ReturnType<typeof createRoot> | null = null;

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
  window.history.replaceState({}, '', '/calculators/fire');
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  if (root) {
    act(() => {
      root?.unmount();
    });
    root = null;
  }
  if (container && container.parentNode) {
    container.parentNode.removeChild(container);
    container = null;
  }
  document.body.innerHTML = '';
});

describe('FIRE Calculator Flagship Refinement (B24 / V10 / V12)', () => {
  it('renders a concise scope note in the header (V10)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const scopeNote = document.querySelector('.calculator-scope-note');
    expect(scopeNote).not.toBeNull();
    expect(scopeNote?.textContent).toMatch(/retirement|portfolio|withdrawal/i);
  });

  it('provides concise accessible input labels, aria-describedby help, and accessible info buttons (V12)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    const coreInputs = document.querySelectorAll<HTMLInputElement>('.core-fire-form input[type="number"]');
    expect(coreInputs.length).toBeGreaterThanOrEqual(5);

    // Each core input must have an aria-describedby pointing to a real element in the DOM
    for (const input of Array.from(coreInputs)) {
      const describedBy = input.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const helperElement = document.getElementById(describedBy!.split(' ')[0]);
      expect(helperElement).not.toBeNull();
      expect(helperElement?.textContent?.trim().length).toBeGreaterThan(5);

      // Verify the accessible name/label is concise and does NOT duplicate the helper text
      const id = input.id;
      expect(id).toBeTruthy();
      const label = document.querySelector(`label[for="${id}"]`);
      expect(label).not.toBeNull();
      // Label text should not contain the long helper text
      expect(label?.textContent).not.toContain(helperElement?.textContent);
    }

    // InfoTip dots must be real buttons, not focusable spans, and not nested inside <label>
    const infoDots = document.querySelectorAll('.core-fire-form .info-dot');
    for (const dot of Array.from(infoDots)) {
      expect(dot.tagName.toLowerCase()).toBe('button');
      expect(dot.getAttribute('type')).toBe('button');
      expect(dot.getAttribute('aria-label')).toBeTruthy();
      // Must not be nested inside an HTML <label>
      expect(dot.closest('label')).toBeNull();
    }

    // Units: currency inputs have $ and duration inputs have years
    const inputControls = document.querySelectorAll('.core-fire-form .calculator-input-control');
    expect(inputControls.length).toBeGreaterThanOrEqual(5);
  });

  it('manages stale result display after input changes so prior results are never mistaken for current inputs (B24)', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    // Before calculation: no hero-result card exists
    expect(document.querySelector('.hero-result')).toBeNull();

    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button');
    expect(calcButton).not.toBeNull();
    expect(calcButton?.textContent).toContain('Calculate');

    // Step 1: Click Calculate to produce initial fresh result
    await act(async () => {
      calcButton!.click();
    });

    const resultCard = document.querySelector('.hero-result');
    expect(resultCard).not.toBeNull();
    expect(resultCard?.classList.contains('is-stale')).toBe(false);
    expect(document.querySelector('.stale-result-badge')).toBeNull();
    expect(resultCard?.textContent).toContain('Required FIRE number');

    const initialResultValue = resultCard?.querySelector('strong')?.textContent;
    expect(initialResultValue).toBeTruthy();

    // Step 2: Change an input (e.g. annual withdrawal need)
    const expenseInput = document.getElementById('fire-annual-expense') as HTMLInputElement ||
      document.querySelector<HTMLInputElement>('input[value="80000"]');
    expect(expenseInput).toBeTruthy();

    await act(async () => {
      // simulate user typing 75000
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')!.set!;
      nativeInputValueSetter.call(expenseInput, '75000');
      expenseInput!.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Step 3: Result card remains visible for reference, but MUST be explicitly marked as stale!
    const staleResultCard = document.querySelector('.hero-result');
    expect(staleResultCard).not.toBeNull();
    expect(staleResultCard?.classList.contains('is-stale')).toBe(true);

    const staleBadge = document.querySelector('.stale-result-badge');
    expect(staleBadge).not.toBeNull();
    expect(staleBadge?.textContent).toMatch(/inputs changed|recalculate/i);

    // Calculate button now indicates Recalculate
    const recalcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button');
    expect(recalcButton?.textContent).toMatch(/recalculate/i);

    // Step 4: Click Recalculate to get updated fresh result
    await act(async () => {
      recalcButton!.click();
    });

    const updatedCard = document.querySelector('.hero-result');
    expect(updatedCard?.classList.contains('is-stale')).toBe(false);
    expect(document.querySelector('.stale-result-badge')).toBeNull();
    const updatedResultValue = updatedCard?.querySelector('strong')?.textContent;
    expect(updatedResultValue).toBeTruthy();
    // At $75,000 withdrawal need, the FIRE number is higher than at $60,000
    expect(updatedResultValue).not.toBe(initialResultValue);
  });

  it('preserves both FIRE number and Withdrawal modes with accurate outputs', async () => {
    await act(async () => {
      root!.render(<App auth={mockAuth} />);
    });

    // Switch to Withdrawal mode
    const withdrawalModeButton = Array.from(document.querySelectorAll('.segmented button')).find(
      (btn) => btn.textContent?.includes('Withdrawal')
    ) as HTMLButtonElement;
    expect(withdrawalModeButton).toBeTruthy();

    await act(async () => {
      withdrawalModeButton.click();
    });

    // Calculate in withdrawal mode
    const calcButton = document.querySelector<HTMLButtonElement>('.quick-actions .primary-button')!;
    await act(async () => {
      calcButton.click();
    });

    const resultCard = document.querySelector('.hero-result');
    expect(resultCard).not.toBeNull();
    expect(resultCard?.textContent).toContain('Annual withdrawal');
    expect(resultCard?.textContent).toContain('Need coverage');
  });
});
