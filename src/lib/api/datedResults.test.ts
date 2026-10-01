import { describe, it, expect, vi, afterEach } from 'vitest';
import { toSavedCalculatorResult, createCalculatorResultRecord } from './calculatorResults';
import { seoCalculators } from '../seoCalculators';
import type { CalculatorSaveRequest } from '../../CalculatorLibrary';
const inputModel={kind:'dated-cash-flows' as const,version:'dated-xirr-v1' as const,cashFlows:[{date:'2025-01-01',amount:-1000},{date:'2026-01-01',amount:1100}]};
const saved={id:'synthetic',calculatorCategory:'Investing',calculatorRegion:'Global',calculatorSlug:'xirr',calculatorTitle:'Dated return',conversionLabel:'Save comparison',conversionRoute:'/plans',createdAt:'2026-09-30T00:00:00Z',updatedAt:'2026-09-30T00:00:00Z',createdEntityId:null,createdEntityType:null,currency:'USD',destinationType:'plan',inputValues:{cashFlowCount:2},inputModel,result:{assumptions:[],metrics:[{label:'Annualized dated return',value:0.1,valueType:'percent'}],modelVersion:'dated-xirr-v1',narrative:'Entered dates.'}};
afterEach(()=>vi.unstubAllGlobals());
describe('dated return client roundtrip',()=>{
 it('preserves actual dates and refuses missing or corrupt dated envelopes',()=>{
  expect(toSavedCalculatorResult(saved)?.inputModel).toEqual(inputModel);
  expect(toSavedCalculatorResult({...saved,inputModel:undefined})).toBeNull();
  expect(toSavedCalculatorResult({...saved,inputModel:{...inputModel,cashFlows:[{date:'bad',amount:100}]}})).toBeNull();
  expect(toSavedCalculatorResult({...saved,result:{...saved.result,modelVersion:'monthly-periodic-v1'}})).toBeNull();
 });
 it('sends the actual model to the API and preserves it in the response',async()=>{
  const fetch=vi.fn(async(_input: RequestInfo | URL, _init?: RequestInit)=>new Response(JSON.stringify({savedResult:saved,createdEntity:null,saveStatus:'committed-save'}),{status:201,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetch);
  const request:CalculatorSaveRequest={calculator:{...seoCalculators.find(c=>c.slug==='xirr')!,conversionRoute:'/plans'},currency:'USD',values:{cashFlowCount:2},inputModel,result:{...saved.result,modelVersion:'dated-xirr-v1',metrics:[{label:'Annualized dated return',value:0.1,valueType:'percent'}]}};
  const r=await createCalculatorResultRecord({getToken:async()=> 'synthetic-token'} as never,request,'synthetic-key');
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string).inputModel).toEqual(inputModel);expect(r.savedResult.inputModel).toEqual(inputModel);
 });
});
