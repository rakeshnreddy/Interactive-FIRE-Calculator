import { describe, it, expect } from 'vitest';
import { calculateSeoCalculator, seoCalculators } from './seoCalculators';
import { buildCalculatorDetailSchedule, buildCalculatorScenarios } from './calculatorStudios';
import { buildCalculatorInputImpacts, buildCalculatorSummaryCsv } from './calculatorEngagement';
const calc = seoCalculators.find(c => c.slug === 'social-security-break-even')!;
const run = (early:number, full:number, delayYears:number) => calculateSeoCalculator(calc, {early,full,delayYears});
describe('Social Security catch-up interpretation', () => {
  it.each([1800,1700])('does not show zero catch-up when later benefit is %s', full => {
    const result = run(1800,full,5);
    expect(result.metrics.find(m => m.label === 'Break-even years after delaying')).toBeUndefined();
    expect(result.narrative).toContain('No finite catch-up');
    expect(result.modelVersion).toBe('catch-up-v2');
    expect(result.metrics.find(m=>m.label === 'Forgone early benefits')?.value).toBe(108000);
    const table = buildCalculatorDetailSchedule(calc,{early:1800,full,delayYears:5})!;
    expect(table.summary).toContain('No finite catch-up');
    expect(table.rows.some(row=>row.note?.includes('catches up'))).toBe(false);
  });
  it('preserves the independently derived 108000/800/12 = 11.25 years', () => {
    expect(run(1800,2600,5).metrics[0].value).toBeCloseTo(11.25,10);
    expect(run(1800,2600,5).metrics[0].valueType).toBe('years');
  });
  it('distinguishes no delay from no early benefit to forgo', () => {
    expect(run(1800,2600,0).metrics[0].value).toBe(0);
    expect(run(1800,2600,0).narrative).toContain('No waiting period entered');
    expect(run(0,2600,5).metrics[0].value).toBe(0);
    expect(run(0,2600,5).narrative).toContain('No early benefits to forgo');
    expect(run(0,0,5).narrative).toContain('No benefit difference');
    expect(run(1800,1700,0).narrative).toContain('No finite catch-up');
  });
  it('exports the semantic state, not an invented numeric catch-up', () => {
    const csv = buildCalculatorSummaryCsv(calc,buildCalculatorScenarios(calc,{early:1800,full:1800,delayYears:5}),'base',[]);
    expect(csv).toContain('No finite catch-up');
    expect(csv).toContain('catch-up-v2');
    expect(csv).not.toContain('Break-even years after delaying,0');
  });
});

it('does not compare money with years across a catch-up state transition',()=>{
  const impacts=buildCalculatorInputImpacts(calc,{early:1800,full:1800,delayYears:5});
  expect(impacts.some(i=>i.inputKey==='full')).toBe(false);
});
