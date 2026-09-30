import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CalculatorLibrary, type CalculatorSavedResult } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, findSeoCalculator } from './lib/seoCalculators';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
const auth: AuthState = { provider: 'clerk', status: 'signed-in', isConfigured: true, isSignedIn: true, getToken: async () => 'synthetic-unit-token', user: { id: 'synthetic-user', email: 'synthetic@example.invalid', displayName: 'Synthetic' } };
const roots: Root[] = []; const nodes: HTMLDivElement[] = [];
const save = vi.fn(async () => ({ destinationRoute: '/plans' as const, message: 'Saved', savedResultId: 'synthetic-new' }));
function render(slug='mortgage', savedResults: CalculatorSavedResult[] = [], search='', authState: AuthState = auth) {
  const container=document.createElement('div'); document.body.appendChild(container); nodes.push(container);
  const root=createRoot(container); roots.push(root);
  window.history.replaceState({}, '', `/calculators/${slug}${search}`);
  act(()=>root.render(<CalculatorLibrary auth={authState} route={`/calculators/${slug}`} onNavigate={()=>{}} onSaveResult={save} savedResults={savedResults}/>));
  return container;
}
function edit(container: HTMLElement, key: string, value: string) {
  const input=container.querySelector<HTMLInputElement>(`input[name="${key}"]`)!;
  act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});
  return input;
}
function button(container: HTMLElement, text: string) { return [...container.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!; }
function headline(container: HTMLElement) { return container.querySelector('.calculator-result-metric-primary strong')?.textContent; }
function state(container: HTMLElement) { return container.querySelector('[data-result-state]')?.getAttribute('data-result-state'); }
afterEach(()=>{while(roots.length)act(()=>roots.pop()!.unmount());nodes.splice(0).forEach(n=>n.remove());localStorage.clear();save.mockClear();});
describe('natural calculator editing and result provenance',()=>{
  it('clearly labels the registry example before editing and offers deterministic reset',()=>{
    const c=render();expect(state(c)).toBe('sample');expect(c.querySelector('[data-result-state]')?.textContent).toContain('Sample estimate');expect(button(c,'Reset to example')).toBeTruthy();
  });
  it('keeps a cleared field empty, preserves the previous result and disables every current-result action',async()=>{
    const c=render();const previous=headline(c);const input=edit(c,'principal','');
    expect(input.value).toBe('');expect(input.getAttribute('aria-invalid')).toBe('true');expect(headline(c)).toBe(previous);expect(state(c)).toBe('stale');
    expect(c.querySelector('[data-result-state]')?.textContent).toMatch(/Previous result.*finish your inputs/i);
    for(const text of ['Save result','Copy link','Summary CSV','CSV']){expect(button(c,text)?.disabled).toBe(true);}
    await act(async()=>button(c,'Save result').click());expect(save).not.toHaveBeenCalled();
    edit(c,'principal','225000');expect(state(c)).toBe('current');expect(headline(c)).not.toBe(previous);expect(button(c,'Save result').disabled).toBe(false);
  });
  it('preserves trailing decimals and partial signs instead of converting them to zero',()=>{
    const c=render();expect(edit(c,'rate','1.').value).toBe('1.');expect(state(c)).toBe('current');
    const previous=headline(c);expect(edit(c,'rate','-').value).toBe('-');expect(state(c)).toBe('stale');expect(headline(c)).toBe(previous);
    expect(edit(c,'rate','.').value).toBe('.');expect(state(c)).toBe('stale');
  });
  it('preserves an attempted out-of-range rate without silently using a capped answer',()=>{
    const c=render();const previous=headline(c);const input=edit(c,'rate','999');
    expect(input.value).toBe('999');expect(input.getAttribute('aria-invalid')).toBe('true');expect(headline(c)).toBe(previous);
    const id=input.getAttribute('aria-describedby')!;expect(id.split(' ').some(id=>document.getElementById(id)?.textContent?.includes('100'))).toBe(true);
  });
  it('accepts an explicit zero interest rate and exact zero principal',()=>{
    const c=render();edit(c,'rate','0');expect(state(c)).toBe('current');expect(button(c,'Save result').disabled).toBe(false);
    edit(c,'principal','0');expect(headline(c)).toBe('$0');expect(state(c)).toBe('current');
  });
  it('allows ROI losses while leaving nonnegative loan balances constrained',()=>{
    const c=render('roi');expect(c.querySelector('[name="gain"]')?.getAttribute('inputmode')).toBe('text');edit(c,'gain','-1000');edit(c,'cost','20000');expect(headline(c)).toBe('-5%');expect(state(c)).toBe('current');
    const mortgage=render();expect(edit(mortgage,'principal','-1000').getAttribute('aria-invalid')).toBe('true');expect(state(mortgage)).toBe('stale');
  });
  it('reset restores the original example, neutral optional additions and sample provenance',()=>{
    const c=render();const initial=headline(c);edit(c,'extraMonthlyPayment','200');edit(c,'principal','');
    act(()=>button(c,'Reset to example').click());expect(headline(c)).toBe(initial);expect(state(c)).toBe('sample');
    expect(c.querySelector<HTMLInputElement>('[name="extraMonthlyPayment"]')?.value).toBe('0');expect(c.querySelector('[aria-invalid="true"]')).toBeNull();
  });
  it('restores a raw unfinished browser draft with its previous valid values',()=>{
    const calculator=findSeoCalculator('mortgage')!;const values=Object.fromEntries(calculator.inputs.map(i=>[i.key,i.defaultValue]));
    localStorage.setItem('finpath.calculatorDraft.v1',JSON.stringify({slug:'mortgage',scenarioId:'base',values,rawValues:{...Object.fromEntries(Object.entries(values).map(([k,v])=>[k,String(v)])),principal:''},inputOrigin:'user',result:calculateSeoCalculator(calculator,values),updatedAt:'2026-09-30T00:00:00Z'}));
    const c=render();expect(c.querySelector<HTMLInputElement>('[name="principal"]')?.value).toBe('');expect(state(c)).toBe('stale');expect(headline(c)).toBeTruthy();
  });
  it('does not turn malformed legacy draft values into a valid sample answer',()=>{
    localStorage.setItem('finpath.calculatorDraft.v1',JSON.stringify({slug:'mortgage',values:{principal:null,rate:6,years:30},result:{metrics:[]},updatedAt:'2026-09-30T00:00:00Z'}));
    const c=render();expect(state(c)).toBe('needs-input');expect(headline(c)).toBeUndefined();expect(c.querySelector<HTMLInputElement>('[name="principal"]')?.value).toBe('');expect(button(c,'Save result').disabled).toBe(true);
  });
  it('preserves invalid shared inputs and suppresses an unfounded current answer',()=>{
    const c=render('mortgage',[],'?fp=1&principal=300000&rate=999&years=30');
    expect(c.querySelector<HTMLInputElement>('[name="rate"]')?.value).toBe('999');expect(state(c)).toBe('needs-input');expect(headline(c)).toBeUndefined();
  });
  it('freezes scenario selection while edits are unfinished',()=>{
    const c=render();const previous=headline(c);edit(c,'principal','');
    const tabs=[...c.querySelectorAll<HTMLButtonElement>('[role="tab"]')];expect(tabs.every(b=>b.disabled)).toBe(true);
    act(()=>tabs[0].click());expect(headline(c)).toBe(previous);
  });
  it('persists unfinished signed-out edits and the last valid result without substituting zero',()=>{
    const guest:AuthState={provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY'],user:null};
    const c=render('mortgage',[],'',guest);edit(c,'principal','225000');const previous=headline(c);edit(c,'rate','1e');
    const draft=JSON.parse(localStorage.getItem('finpath.calculatorDraft.v1')!);expect(draft.rawValues.rate).toBe('1e');expect(draft.values.principal).toBe(225000);
    act(()=>roots.pop()!.unmount());c.remove();
    const restored=render('mortgage',[],'',guest);expect(restored.querySelector<HTMLInputElement>('[name="rate"]')?.value).toBe('1e');expect(headline(restored)).toBe(previous);expect(state(restored)).toBe('stale');
  });
  it('requires a positive ROI cost rather than displaying a false zero return',()=>{
    const c=render('roi');edit(c,'cost','0');expect(c.querySelector('[name="cost"]')?.getAttribute('aria-invalid')).toBe('true');expect(state(c)).toBe('stale');
  });
  it('keeps explicitly loaded account history immutable while current edits are incomplete',()=>{
    const calculator=findSeoCalculator('mortgage')!;const values=Object.fromEntries(calculator.inputs.map(i=>[i.key,i.defaultValue]));
    const saved:CalculatorSavedResult={id:'synthetic-history',calculatorSlug:'mortgage',calculatorTitle:calculator.title,currency:'USD',createdAt:'2026-09-01T00:00:00Z',inputValues:values,result:calculateSeoCalculator(calculator,values)};const original=JSON.stringify(saved);
    const c=render('mortgage',[saved]);act(()=>button(c,'Load saved inputs').click());expect(state(c)).toBe('current');edit(c,'rate','');expect(state(c)).toBe('stale');expect(JSON.stringify(saved)).toBe(original);expect(save).not.toHaveBeenCalled();
  });
});
