import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CalculatorLibrary, type CalculatorSaveRequest, type CalculatorSavedResult } from './CalculatorLibrary';
import type { AuthState } from './auth';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
let root: Root; let container: HTMLDivElement;
afterEach(() => { if (root) act(() => root.unmount()); container?.remove(); localStorage.clear(); });
describe('HYSA historical result correction', () => {
  it('discloses corrected APY on explicit load, keeps history immutable and saves only on explicit action', async () => {
    const saved: CalculatorSavedResult = {
      id: 'synthetic-hysa-old', calculatorSlug: 'hysa', calculatorTitle: 'HYSA Calculator', createdAt: '2026-09-01T00:00:00Z', currency: 'USD',
      inputValues: { principal: 10000, monthly: 500, annualTopUp: 0, rate: 4.25, years: 3 },
      result: { narrative: 'Historical projection', metrics: [{ label: 'Projected value', value: 30519.033740012204, valueType: 'currency' }] }
    };
    const original = JSON.stringify(saved);
    const save = vi.fn(async (_request: CalculatorSaveRequest) => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: 'synthetic-new' }));
    const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-unit-token', user: { id: 'synthetic-unit-user', email: 'synthetic@example.invalid', displayName: 'Synthetic' } };
    localStorage.clear(); window.history.replaceState({}, '', '/calculators/hysa');
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(<CalculatorLibrary auth={auth} route="/calculators/hysa" onNavigate={() => {}} onSaveResult={save} savedResults={[saved]} />));
    expect(container.querySelector('[data-hysa-correction]')).toBeNull();
    const load = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Load saved inputs')!;
    await act(async () => load.click());
    const notice = container.querySelector('[data-hysa-correction]')!;
    expect(notice).not.toBeNull();
    expect(notice.textContent).toMatch(/corrected APY/i);
    expect(notice.textContent).toContain('30,519');
    expect(notice.textContent).toContain('30,469');
    expect(notice.textContent).toContain('50');
    expect(save).not.toHaveBeenCalled();
    expect(JSON.stringify(saved)).toBe(original);
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save result'))!;
    await act(async () => button.click());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].result.metrics[0].value).toBeCloseTo(30468.781876553145, 6);
    expect(JSON.stringify(saved)).toBe(original);
  });
});
