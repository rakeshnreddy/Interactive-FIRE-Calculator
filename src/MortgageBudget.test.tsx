import { afterEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary, type CalculatorSaveRequest, type CalculatorSavedResult } from './CalculatorLibrary';
import type { AuthState } from './auth';
import { calculateSeoCalculator, seoCalculators } from './lib/seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorStudioChart } from './lib/calculatorStudios';
import { calculatorRawValues, validateCalculatorInputs } from './lib/calculatorInputState';
import { buildCalculatorScope } from './lib/calculatorScope';
import { modelVersionMatchesCalculator } from './lib/calculatorModelVersion';
import { parseCalculatorSavePayload } from '../functions/_lib/calculatorResults';
import { toSavedCalculatorResult } from './lib/api/calculatorResults';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>, SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
const calculator = seoCalculators.find(c => c.slug === 'mortgage-affordability')!;
const defaultCalculatorValues = (c: typeof calculator) => Object.fromEntries(c.inputs.map(i => [i.key, i.defaultValue]));
const inputs = {income:5000,debts:200,downPayment:3000,rate:0,years:1,maxDti:28,annualTaxes:2400,annualInsurance:1200,monthlyHoa:50,monthlyMortgageInsurance:50};
const costKeys = ['annualTaxes','annualInsurance','monthlyHoa','monthlyMortgageInsurance'];
const metric = (r: ReturnType<typeof calculateSeoCalculator>, label: string) => r.metrics.find(m => m.label === label)?.value;
const auth: AuthState = {provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY'],user:null};
let root: Root | undefined; let host: HTMLDivElement | undefined;
afterEach(() => { if(root) act(() => root!.unmount()); root=undefined; host?.remove(); localStorage.clear(); });
function markup() { const node=document.createElement('div');node.innerHTML=renderToStaticMarkup(<CalculatorLibrary auth={auth} route="/calculators/mortgage-affordability" onNavigate={()=>{}} onSaveResult={async()=>({destinationRoute:'/plans',message:'',savedResultId:'synthetic'})} savedResults={[]}/>);return node; }
describe('cost-inclusive housing budget', () => {
 it('offers all four costs as neutral zero options', () => {
  for (const key of costKeys) expect(calculator.inputs.find(i=>i.key===key)?.defaultValue).toBe(0);
 });
 it('reserves costs inside the same cap, not in addition to it', () => {
  const r=calculateSeoCalculator(calculator,inputs);
  expect(r.metrics[0].label).toBe('Estimated loan budget');expect(r.metrics[0].value).toBeCloseTo(12000,8);
  expect(metric(r,'Estimated home price')).toBeCloseTo(15000,8);
  expect(metric(r,'Principal + interest / month')).toBe(1000);
  expect(metric(r,'Monthly housing limit')).toBe(1400);
  expect(metric(r,'Entered housing costs / month')).toBe(400);
  expect(r.modelVersion).toBe('housing-budget-v1');
 });
 it('uses the actual loan budget in the positive-rate annuity', () => {
  expect(calculateSeoCalculator(calculator,{...inputs,rate:12}).metrics[0].value).toBeCloseTo(11255.0774734846302,8);
 });
 it('respects a tighter total-debt limit before housing costs', () => {
  const r=calculateSeoCalculator(calculator,{...inputs,debts:600});
  expect(metric(r,'Monthly housing limit')).toBe(1200);expect(metric(r,'Principal + interest / month')).toBe(800);expect(r.metrics[0].value).toBeCloseTo(9600,8);
 });
 it.each([1400,1401])('does not advertise a financed home price when costs of %s consume the cap', cost => {
  const r=calculateSeoCalculator(calculator,{...inputs,annualTaxes:0,annualInsurance:0,monthlyHoa:cost,monthlyMortgageInsurance:0});
  expect(r.metrics[0].value).toBe(0);expect(metric(r,'Estimated home price')).toBeUndefined();
  expect(r.narrative).toContain('No loan-payment budget remains');
  expect(metric(r,'Monthly budget shortfall')).toBe(cost-1400);
 });
 it('preserves the previous zero-cost default amount and India eligibility', () => {
  expect(calculateSeoCalculator(calculator,defaultCalculatorValues(calculator)).metrics[0].value).toBeCloseTo(376195.985297,5);
  const india=seoCalculators.find(c=>c.slug==='loan-eligibility-india')!;
  const r=calculateSeoCalculator(india,defaultCalculatorValues(india));expect(r.metrics[0].value).toBeCloseTo(4321156.493422,5);expect(r.modelVersion).toBeUndefined();
 });
 it('reconciles every monthly visual and detail component', () => {
  const r=calculateSeoCalculator(calculator,inputs), chart=buildCalculatorStudioChart(calculator,inputs,r), table=buildCalculatorDetailSchedule(calculator,inputs,r)!;
  expect(chart.title).toBe('Your monthly housing budget');
  expect(chart.entries.map(e=>e.primary)).toEqual([1000,200,100,50,50]);
  expect(chart.entries.reduce((sum,e)=>sum+e.primary,0)).toBe(1400);
  const rows=new Map(table.rows.map(row=>[row.id,Number(row.values.amount)]));
  expect(rows.get('max-emi')).toBe(1000);expect(rows.get('housing-limit')).toBe(1400);expect(rows.get('housing-costs')).toBe(400);expect(rows.get('eligible-loan')).toBe(12000);
  expect(rows.get('taxes')).toBe(200);expect(rows.get('home-insurance')).toBe(100);expect(rows.get('hoa')).toBe(50);expect(rows.get('mortgage-insurance')).toBe(50);
 });
 it.each(costKeys)('preserves invalid raw %s edits and blocks the result', key => {
  for (const bad of ['','-1','NaN','1e999']) {
   const raw=calculatorRawValues(calculator,inputs);raw[key]=bad;
   expect(validateCalculatorInputs(calculator,raw).errors[key]).toBeTruthy();expect(raw[key]).toBe(bad);
  }
 });
 it('shows costs and disclosed cap before fields; all controls precede the result action', () => {
  const page=markup(), panel=page.querySelector('.calculator-input-panel')!;
  const scope=panel.querySelector('[data-housing-budget-scope]')!;
  expect(scope).not.toBeNull();expect(scope.textContent).toContain('36%');expect(scope.textContent).toContain('planning limit');
  expect(scope.compareDocumentPosition(panel.querySelector('input')!)&Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  for(const key of costKeys)expect(panel.querySelector(`input[name="${key}"]`)?.closest('details')?.id).toBe('options-mortgage-affordability-housing');
  expect(panel.textContent).not.toContain('extra payments reduce the loan separately');
  expect(page.textContent).not.toContain('Lenders commonly cap');expect(page.textContent).not.toContain('approximates lender policy');expect(page.textContent).not.toContain('DTI checks remain a separate step');
 });
 it('shows correct active month/year units, retains invalid edits, and resets costs to zero', async () => {
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  await act(async()=>root!.render(<CalculatorLibrary auth={auth} route="/calculators/mortgage-affordability" onNavigate={()=>{}} onSaveResult={async()=>({destinationRoute:'/plans',message:'',savedResultId:'synthetic'})} savedResults={[]}/>));
  const edit=(key:string,value:string)=>{ const input=host!.querySelector<HTMLInputElement>(`input[name="${key}"]`)!; act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));});return input; };
  edit('annualTaxes','2400');edit('monthlyMortgageInsurance','50');
  const summary=host.querySelector('#options-mortgage-affordability-housing summary')!;
  expect(summary.textContent).toContain('Annual property tax: USD 2,400 / year');expect(summary.textContent).toContain('Monthly mortgage insurance: USD 50 / month');
  const bad=edit('monthlyMortgageInsurance','-');expect(bad.value).toBe('-');expect(bad.getAttribute('aria-invalid')).toBe('true');
  expect(host.querySelector<HTMLButtonElement>('.calculator-result-action button')?.disabled ?? [...host.querySelectorAll('button')].find(b=>b.textContent?.includes('View result'))?.disabled).toBe(true);
  const reset=[...host.querySelectorAll('button')].find(b=>b.textContent==='Reset to example')!;await act(async()=>reset.click());
  for(const key of costKeys)expect(host.querySelector<HTMLInputElement>(`input[name="${key}"]`)?.value).toBe('0');
  expect(summary.textContent).toContain('None added');
 });
 it('keeps the result scope and sourced review date aligned with the included costs', () => {
  const scope=buildCalculatorScope(calculator,inputs)!;
  expect(scope.included).toContain('entered taxes');expect(scope.excluded).not.toContain('Taxes, insurance, HOA');
  expect(scope.basis).toContain('36%');expect(scope.basis).toContain('divided by 12');expect(scope.basis).toContain('not a lender requirement');
  expect(scope.checked).toBe('2026-10-03');expect(scope.sources[0].url).toBe('https://www.consumerfinance.gov/owning-a-home/prepare/figure-out-how-much-you-want-to-spend/');
 });
 it('round-trips the version and rejects use on a different calculator', () => {
  const result=calculateSeoCalculator(calculator,inputs);
  const payload={calculatorSlug:calculator.slug,calculatorTitle:calculator.title,calculatorCategory:calculator.category,calculatorRegion:calculator.region,conversionLabel:calculator.conversionLabel,conversionRoute:calculator.conversionRoute,currency:'USD',inputValues:inputs,result};
  expect(parseCalculatorSavePayload(payload).ok).toBe(true);
  expect(parseCalculatorSavePayload({...payload,calculatorSlug:'loan-eligibility-india'}).ok).toBe(false);
  expect(toSavedCalculatorResult({...payload,id:'synthetic',destinationType:'plan',createdAt:'2026-01-01',updatedAt:'2026-01-01',createdEntityId:null,createdEntityType:null})?.result.modelVersion).toBe('housing-budget-v1');
  expect(modelVersionMatchesCalculator('housing-budget-v1' as never,'mortgage-affordability')).toBe(true);
 });
 it('restores legacy inputs with zero omitted costs without altering or saving the original', async () => {
  const saved:CalculatorSavedResult={id:'synthetic-old',calculatorSlug:calculator.slug,calculatorTitle:calculator.title,currency:'USD',createdAt:'2026-01-01',inputValues:{income:5000,debts:200,downPayment:3000,rate:0,years:1,maxDti:28},result:{metrics:[{label:'Eligible loan amount',value:16800,valueType:'currency'}],narrative:'Historical result'}};
  const before=JSON.stringify(saved), save=vi.fn(async(_request:CalculatorSaveRequest)=>({destinationRoute:'/plans' as const,message:'Saved',savedResultId:'synthetic-new'}));
  host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);
  await act(async()=>root!.render(<CalculatorLibrary auth={{provider:'clerk',status:'signed-in',isConfigured:true,isSignedIn:true,user:{id:'synthetic',displayName:'Synthetic',email:'synthetic@example.invalid'},getToken:async()=> 'synthetic-unit-token'}} route="/calculators/mortgage-affordability" onNavigate={()=>{}} onSaveResult={save} savedResults={[saved]}/>));
  expect(host.querySelector('[data-legacy-model]')).not.toBeNull();
  const load=[...host.querySelectorAll('button')].find(b=>b.textContent==='Load saved inputs')!;await act(async()=>load.click());
  expect(host.querySelector('[data-model-correction]')).not.toBeNull();
  for(const key of costKeys)expect((host.querySelector(`input[name="${key}"]`) as HTMLInputElement).value).toBe('0');
  expect(save).not.toHaveBeenCalled();expect(JSON.stringify(saved)).toBe(before);
  const button=[...host.querySelectorAll('button')].find(b=>b.textContent?.includes('Save result'))!;await act(async()=>button.click());
  expect(save.mock.calls[0][0].result.modelVersion).toBe('housing-budget-v1');expect(save.mock.calls[0][0].values.monthlyMortgageInsurance).toBe(0);expect(JSON.stringify(saved)).toBe(before);
 });
});
