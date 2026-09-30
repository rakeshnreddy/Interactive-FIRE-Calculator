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
describe('versioned payback/catch-up history', () => {
  it.each(['mortgage-refinance','social-security-break-even'])('preserves %s legacy snapshots and requires explicit save', async slug => {
    const saved: CalculatorSavedResult = {
      id: 'synthetic-old', calculatorSlug: slug, calculatorTitle: 'Saved estimate', createdAt: '2026-09-01T00:00:00Z', currency: 'USD',
      inputValues: slug === 'mortgage-refinance' ? {principal:12000,currentRate:0,newRate:0,years:1,closingCosts:1200} : {early:1800,full:1800,delayYears:5},
      result: { narrative: 'Legacy zero payback', metrics: [{ label: slug === 'mortgage-refinance' ? 'Monthly savings' : 'Break-even years after delaying', value: 0, valueType: slug === 'mortgage-refinance' ? 'currency' : 'years' }] }
    };
    const original = JSON.stringify(saved);
    const save = vi.fn(async (_request: CalculatorSaveRequest) => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: 'synthetic-new' }));
    const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-unit-token', user: { id: 'synthetic-unit-user', email: 'synthetic@example.invalid', displayName: 'Synthetic' } };
    window.history.replaceState({}, '', '/calculators/'+slug);
    container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
    await act(async () => root.render(<CalculatorLibrary auth={auth} route={'/calculators/'+slug} onNavigate={() => {}} onSaveResult={save} savedResults={[saved]} />));
    expect(container.querySelector('[data-legacy-model]')).not.toBeNull();
    expect(container.querySelector('[data-model-correction]')).toBeNull();
    const load = Array.from(container.querySelectorAll('button')).find((b) => b.textContent === 'Load saved inputs')!;
    await act(async () => load.click());
    expect(container.querySelector('[data-model-correction]')?.textContent).toContain('saved snapshot');
    expect(container.querySelector('[data-model-interpretation]')?.textContent).toContain(slug === 'mortgage-refinance' ? 'No payment saving' : 'No finite catch-up');
    expect(save).not.toHaveBeenCalled();expect(JSON.stringify(saved)).toBe(original);
    const button = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('Save result'))!;
    await act(async () => button.click());
    expect(save).toHaveBeenCalledTimes(1);
    expect(save.mock.calls[0][0].result.modelVersion).toBe(slug === 'mortgage-refinance' ? 'payback-v2' : 'catch-up-v2');
    expect(JSON.stringify(saved)).toBe(original);
  });
});
