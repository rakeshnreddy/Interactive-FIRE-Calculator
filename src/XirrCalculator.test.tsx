import { afterEach, describe, it, expect, vi } from 'vitest';
import { act, useState } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { XirrCalculator } from './XirrCalculator';
import { seoCalculators } from './lib/seoCalculators';
import type { AuthState } from './auth';
import type { CalculatorSavedResult, CalculatorSaveRequest } from './CalculatorLibrary';
// @ts-expect-error React test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root:Root;let container:HTMLDivElement;
afterEach(()=>{if(root)act(()=>root.unmount());container?.remove();});
const auth:AuthState={provider:'clerk',status:'signed-in',isConfigured:true,isSignedIn:true,getToken:async()=> 'synthetic-token',user:{id:'synthetic',email:'synthetic@example.invalid',displayName:'Synthetic'}};
const save=vi.fn(async(_r:CalculatorSaveRequest)=>({destinationRoute:'/plans' as const,message:'Saved',savedResultId:'synthetic'}));
async function render(history:CalculatorSavedResult[]=[]){save.mockClear();container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);await act(async()=>root.render(<XirrCalculator auth={auth} calculator={seoCalculators.find(c=>c.slug==='xirr')!} onSaveResult={save} savedResults={history} renderPeriodic={()=> <p>Periodic mode preserved</p>}/>));}
async function click(name:string){const button=[...container.querySelectorAll('button')].find(b=>b.textContent===name);expect(button,`button ${name}`).toBeDefined();await act(async()=>button!.click());}
describe('explicit monthly versus dated return modes',()=>{
 it('keeps monthly as the old mode and dated inputs empty until the user chooses an example',async()=>{
   await render();expect(container.textContent).toContain('Periodic mode preserved');await click('Dated cash flows');
   expect([...container.querySelectorAll<HTMLInputElement>('input')].every(i=>i.value==='')).toBe(true);
   expect(container.querySelector('.calculator-result-metric-primary')).toBeNull();
   const reveal=[...container.querySelectorAll('button')].find(b=>b.textContent?.includes('View result'))!;expect(reveal.disabled).toBe(true);
   await click('Use example cash flows');expect(container.querySelector('.calculator-result-metric-primary')?.textContent).toContain('10.00%');expect(save).not.toHaveBeenCalled();
 });
 it('saves actual dates only after explicit action, and pauses on an incomplete new row',async()=>{
   await render();await click('Dated cash flows');await click('Use example cash flows');await click('Save dated result');
   expect(save).toHaveBeenCalledTimes(1);expect(save.mock.calls[0][0].inputModel?.cashFlows).toEqual([{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:1100}]);
   expect(save.mock.calls[0][0].result.modelVersion).toBe('dated-xirr-v1');
   await click('Add cash flow');expect(container.querySelector('.calculator-result-metric-primary')).toBeNull();
   expect([...container.querySelectorAll('button')].find(b=>b.textContent==='Save dated result')?.disabled).toBe(true);
   await click('Monthly contributions');await click('Dated cash flows');expect(container.querySelectorAll('input[type=date]')).toHaveLength(3);
   expect(container.querySelector<HTMLInputElement>('input[type=date]')?.value).toBe('2025-01-01');
 });
 it('restores dated history without modifying its snapshot or inferring dates for monthly history',async()=>{
   const saved:CalculatorSavedResult={id:'synthetic-history',calculatorSlug:'xirr',calculatorTitle:'Dated return',createdAt:'2026-09-01T00:00:00Z',currency:'USD',inputValues:{cashFlowCount:2},inputModel:{kind:'dated-cash-flows',version:'dated-xirr-v1',cashFlows:[{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:1100}]},result:{modelVersion:'dated-xirr-v1',narrative:'Saved dated return',metrics:[{label:'Annualized dated return',value:0.1,valueType:'percent'}]}};
   const original=JSON.stringify(saved);await render([saved]);await click('Dated cash flows');await click('Load dated inputs');
   expect(container.querySelector<HTMLInputElement>('input[type=date]')?.value).toBe('2025-01-01');expect(container.textContent).toContain('saved snapshot is unchanged');expect(save).not.toHaveBeenCalled();expect(JSON.stringify(saved)).toBe(original);
 });
});

it('preserves monthly edits when switching away and back', async () => {
 function PeriodicProbe() {
  const [value, setValue] = useState('10000');
  return <input aria-label="Monthly probe" value={value} onChange={e => setValue(e.target.value)} />;
 }
 container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
 await act(async()=>root.render(<XirrCalculator auth={auth} calculator={seoCalculators.find(c=>c.slug==='xirr')!} onSaveResult={save} savedResults={[]} renderPeriodic={()=> <PeriodicProbe/>}/>));
 const input=container.querySelector<HTMLInputElement>('input[aria-label="Monthly probe"]')!;
 await act(async()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,'23000');input.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(input.value).toBe('23000');
 await click('Dated cash flows');await click('Monthly contributions');
 expect(container.querySelector<HTMLInputElement>('input[aria-label="Monthly probe"]')!.value).toBe('23000');
});
