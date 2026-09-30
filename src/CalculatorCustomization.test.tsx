import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CalculatorLibrary } from './CalculatorLibrary';
import type { AuthState } from './auth';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
const auth: AuthState = { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, user: null, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'] };
let root: Root | undefined; let container: HTMLDivElement;
function render(slug: string) {
  window.history.replaceState({}, '', `/calculators/${slug}`);
  container = document.createElement('div'); document.body.appendChild(container); root = createRoot(container);
  act(() => root!.render(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({ destinationRoute: '/plans', message: 'Saved', savedResultId: 'synthetic' })} savedResults={[]} />));
  return container;
}
function edit(key: string, value: string) {
  const input = container.querySelector<HTMLInputElement>(`input[id$="-${key}"]`)!;
  act(() => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); });
}
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; container?.remove(); localStorage.clear(); });
describe('dedicated model customization', () => {
  it.each(['compound-interest', 'savings-goal', 'budget', 'emergency-fund', 'net-worth'])('makes real groups discoverable before the long %s input stack', (slug) => {
    const c = render(slug); const entry = c.querySelector('[aria-label="Customize this estimate"]')!;
    expect(entry).toBeTruthy();
    expect(entry.compareDocumentPosition(c.querySelector('.calculator-input-panel input')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    for (const button of entry.querySelectorAll<HTMLButtonElement>('button')) {
      act(() => button.click());
      const target = c.querySelector<HTMLElement>(`#${button.getAttribute('aria-controls')}`)!;
      expect(target).toBeTruthy();
      if (target instanceof HTMLDetailsElement) { expect(target.open).toBe(true); expect(document.activeElement).toBe(target.querySelector('summary')); }
    }
    const display = c.querySelector('#estimate-display')!;
    expect(display).toBeTruthy();
    expect(display.textContent).not.toMatch(/Annual asset fee|Income-shock comparison|One-time shock buffer/);
  });
  it('shows compound fees and inflation in collapsed summaries and resets them without changing the default answer', () => {
    const c = render('compound-interest'); const initial = c.querySelector('.compound-headline strong')?.textContent;
    edit('annualFeePercent', '0.4'); edit('inflationPercent', '2.5');
    expect(c.querySelector('#compound-costs summary')?.textContent).toMatch(/0.4% fee.*2.5% inflation/);
    expect(c.querySelector('.compound-headline strong')?.textContent).not.toBe(initial);
    act(() => c.querySelector<HTMLButtonElement>('.panel-heading button')!.click());
    expect(c.querySelector('.compound-headline strong')?.textContent).toBe(initial);
    expect(c.querySelector('#compound-costs summary')?.textContent).toMatch(/0% fee/);
  });
  it('distinguishes savings timing, fee contract and purchasing-power basis', () => {
    const c = render('savings-goal'); edit('annualFeePercent', '0.3'); edit('annualTopUp', '1200');
    expect(c.querySelector('#savings-contributions summary')?.textContent).toMatch(/1,200/);
    expect(c.querySelector('#savings-rates summary')?.textContent).toMatch(/0.3% fee/);
    expect(c.querySelector('#savings-purchasing-power summary')?.textContent).toMatch(/future/i);
  });
  it('separates budget stress from reference and display controls', () => {
    const c = render('budget'); edit('incomeShockPercent', '15'); edit('flexibleCutPercent', '8');
    expect(c.querySelector('#budget-stress summary')?.textContent).toMatch(/15% income loss.*8% trim/);
    expect(c.querySelector('#budget-reference')?.textContent).not.toMatch(/Income-shock comparison/);
  });
  it('distinguishes emergency buffer and risk context without overwriting selected coverage', () => {
    const c = render('emergency-fund'); const months = c.querySelector<HTMLInputElement>('#planning-targetMonths')!.value;
    edit('oneTimeBuffer', '1500');
    expect(c.querySelector('#emergency-buffer summary')?.textContent).toMatch(/1,500/);
    expect(c.querySelector('#emergency-risk')?.textContent).not.toMatch(/One-time shock buffer/);
    expect(c.querySelector<HTMLInputElement>('#planning-targetMonths')!.value).toBe(months);
  });
});
