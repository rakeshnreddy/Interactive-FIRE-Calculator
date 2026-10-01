import { validateCalculatorInputs } from './calculatorInputState';
import {describe,it,expect} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import {webcrypto} from 'node:crypto';
import {calculateSeoCalculator,seoCalculators} from './seoCalculators';
import {buildCalculatorDetailSchedule,buildCalculatorScenarios} from './calculatorStudios';
import {buildCalculatorSummaryCsv} from './calculatorEngagement';
import {CalculatorLibrary} from '../CalculatorLibrary';
import {parseCalculatorSavePayload,hashCalculatorPayload} from '../../functions/_lib/calculatorResults';
import {toSavedCalculatorResultSnapshot} from './api/calculatorResults';
const calculator=(slug:string)=>seoCalculators.find(c=>c.slug===slug)!;
const base={principal:12000,currentRate:0,newRate:0,years:1,closingCosts:0};
const run=(slug:string,extra:Record<string,number>={})=>calculateSeoCalculator(calculator(slug),{...base,...extra});
const payload=(result=run('mortgage-refinance'))=>({calculatorSlug:'mortgage-refinance',calculatorTitle:'Mortgage Refinance Calculator',calculatorCategory:'Borrowing',calculatorRegion:'US',conversionRoute:'/plans',conversionLabel:'Compare loan plan',currency:'USD',inputValues:base,result});
describe('truthful payback interpretation',()=>{
  it.each(['mortgage-refinance','home-loan-balance-transfer-india','mortgage-points'])('%s does not present absent recovery as numeric zero',slug=>{
    const result=run(slug,{closingCosts:1200});
    expect(result.metrics.find(m=>m.label==='Break-even months')).toBeUndefined();
    expect(result.narrative).toContain('No payment saving in this model');
    expect(result.modelVersion).toBe('payback-v2');
    expect(result.metrics.every(m=>Number.isFinite(m.value))).toBe(true);
  });
  it('distinguishes equal offers from a free offer with real payment saving',()=>{
    expect(run('mortgage-refinance').narrative).toContain('No payment saving');
    const result=run('mortgage-refinance',{currentRate:12});
    expect(result.metrics[0].value).toBeCloseTo(66.185464140,7);
    expect(result.narrative).toContain('No switching cost entered');
    expect(result.metrics.find(m=>m.label==='Simplified payback months')?.value).toBe(0);
  });
  it('identifies a points payback beyond the loan horizon without claiming recovery',()=>{
    const result=run('mortgage-points',{currentRate:12,closingCosts:1000});
    expect(result.metrics.find(m=>m.label==='Simplified payback months')?.value).toBeCloseTo(15.109057751,7);
    expect(result.metrics.find(m=>m.label==='Lifetime saving after paying for points')?.value).toBeCloseTo(-205.774430319,7);
    expect(result.narrative).toContain('Payback is after the modeled loan horizon');
    expect(buildCalculatorDetailSchedule(calculator('mortgage-points'),{...base,currentRate:12,closingCosts:1000})!.summary).toContain('after');
  });
  it('labels within-horizon savings and financed fee approximation',()=>{
    const result=run('mortgage-refinance',{currentRate:12,closingCosts:100});
    expect(result.narrative).toContain('within the modeled loan horizon');
    expect(result.assumptions.join(' ')).toMatch(/financed.*same.*term/i);
  });
  it('exports interpretation and version while omitting an absent numeric payback',()=>{
    const csv=buildCalculatorSummaryCsv(calculator('mortgage-refinance'),buildCalculatorScenarios(calculator('mortgage-refinance'),base),'base',[]);
    expect(csv).toContain('No payment saving');expect(csv).toContain('payback-v2');
    expect(csv).not.toContain('Break-even months,0');
  });
  it('places the interpretation beside the actual result metrics',()=>{
    const html=renderToStaticMarkup(<CalculatorLibrary auth={{provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,user:null,missingEnv:[]}} route='/calculators/mortgage-refinance' onNavigate={()=>{}} onSaveResult={async()=>({destinationRoute:'/plans',message:'Saved',savedResultId:'unit'})} savedResults={[]}/>);
    expect(html.indexOf('data-model-interpretation')).toBeGreaterThan(html.indexOf('calculator-result-panel'));
    expect(html.indexOf('data-model-interpretation')).toBeLessThan(html.indexOf('calculator-result-metrics'));
  });
  it('round-trips version in both bounded API parsers',()=>{
    const parsed=parseCalculatorSavePayload(payload());expect(parsed.ok).toBe(true);
    if(parsed.ok)expect(parsed.value.result.modelVersion).toBe('payback-v2');
    expect(toSavedCalculatorResultSnapshot(run('mortgage-refinance'))?.modelVersion).toBe('payback-v2');
    expect(parseCalculatorSavePayload(payload({...run('mortgage-refinance'),modelVersion:'unknown' as never})).ok).toBe(false);
  });
  it('includes version in idempotency identity without adding it to legacy results',async()=>{
    Object.defineProperty(globalThis,'crypto',{value:webcrypto,configurable:true});
    const value=payload(); const {modelVersion,...legacyResult}=value.result;
    const old={...value,result:legacyResult};
    expect(await hashCalculatorPayload(value as never)).not.toBe(await hashCalculatorPayload(old as never));
    const parsed=parseCalculatorSavePayload(old);expect(parsed.ok).toBe(true);
    if(parsed.ok)expect(parsed.value.result).not.toHaveProperty('modelVersion');
  });
});

describe('payback input boundaries',()=> {
  const invalidCases: Record<string, string>[] = [{currentRate:'-1'},{closingCosts:'-1'},{years:'0'},{principal:''},{newRate:'Infinity'}];
  it.each(invalidCases)('rejects %j without issuing a usable result', invalid => {
    const values = Object.fromEntries(Object.entries(base).map(([k,v])=>[k,String(v)]));
    expect(validateCalculatorInputs(calculator('mortgage-refinance'),{...values,...invalid}).values).toBeNull();
  });
  it('does not divide by a tiny negative payment saving',()=>{
    const result = run('mortgage-refinance',{closingCosts:0.000000001});
    expect(result.narrative).toContain('No payment saving');
    expect(result.metrics.some(m=>m.label==='Simplified payback months')).toBe(false);
  });
  it('rejects a valid version on the wrong calculator',()=>{
    expect(parseCalculatorSavePayload({...payload(),calculatorSlug:'savings-goal'}).ok).toBe(false);
  });
});
