import { describe, it, expect } from 'vitest';
import { calculateSeoCalculator, seoCalculators } from './seoCalculators';
import { buildCalculatorDetailSchedule } from './calculatorStudios';
const calculator=seoCalculators.find(c=>c.slug==='xirr')!;
describe('effective yearly return to periodic monthly table',()=>{
 it.each([[1210,1100],[810,900]])('reconciles intermediate years without forcing the final row (%s)',(final,firstYear)=>{
  const values={initial:1000,monthly:0,final,years:2};
  const result=calculateSeoCalculator(calculator,values);
  const schedule=buildCalculatorDetailSchedule(calculator,values,result)!;
  expect(Number(schedule.rows[0].values.endingValue)).toBeCloseTo(firstYear,6);
  expect(Number(schedule.rows[1].values.endingValue)).toBeCloseTo(final,6);
 });
});
it('uses the actual rounded month horizon for a partial final year',()=>{
 const values={initial:1000,monthly:0,final:1100,years:1.5};const schedule=buildCalculatorDetailSchedule(calculator,values)!;
 expect(schedule.rows.at(-1)?.values.year).toBe(1.5);expect(Number(schedule.rows.at(-1)?.values.endingValue)).toBeCloseTo(1100,6);
});
