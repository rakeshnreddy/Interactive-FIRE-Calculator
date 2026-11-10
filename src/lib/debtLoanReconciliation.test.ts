import { describe, expect, it } from 'vitest';
import { calculateSeoCalculator, seoCalculators, type CalculatorResult } from './seoCalculators';
import { buildCalculatorDetailSchedule } from './calculatorStudios';
import { modelVersionForCalculator, isCalculatorModelVersion, modelVersionMatchesCalculator } from './calculatorModelVersion';
const calculator=(slug:string)=>seoCalculators.find(c=>c.slug===slug)!;
const input=(slug:string,patch:Record<string,number>={})=>({...Object.fromEntries(calculator(slug).inputs.map(i=>[i.key,i.defaultValue])),...patch});
const run=(slug:string,patch:Record<string,number>={})=>calculateSeoCalculator(calculator(slug),input(slug,patch));
const table=(slug:string,patch:Record<string,number>={})=>buildCalculatorDetailSchedule(calculator(slug),input(slug,patch))!;
const value=(r:CalculatorResult,label:string)=>r.metrics.find(m=>m.label===label)!.value;

describe('B71 debt payoff horizons',()=>{
 it.each(['debt-payoff','extra-mortgage-payment','mortgage-payoff','credit-card-payoff','student-loan-payoff'])('does not invent a payoff date for %s',slug=>{
  const patch={balance:12000,rate:19.99,payment:150,extraMonthlyPayment:0,extraAnnualPayment:0};
  const r=run(slug,patch),s=table(slug,patch),last=s.rows.at(-1)!;
  expect(r.metrics[0].label).toBe('Balance after 50 years');
  expect(r.metrics[0].valueType).toBe('currency');expect(s.rows).toHaveLength(600);
  expect(r.metrics[0].value).toBeCloseTo(Number(last.values.endingBalance),5);
  expect(value(r,'Interest through 50 years')).toBeCloseTo(Number(last.values.cumulativeInterest),5);
  expect(r.metrics.some(m=>/payoff|saved/i.test(m.label))).toBe(false);
  expect(r.assumptions.join(' ')).toMatch(/not paid off.*50 years/i);
 });
 it('does not report savings against an unpaid baseline and matches the Decimal amortizing oracle',()=>{
  const patch={balance:12000,rate:19.99,payment:150,extraMonthlyPayment:100,extraAnnualPayment:0};
  const r=run('debt-payoff',patch),s=table('debt-payoff',patch);
  expect(value(r,'Months to payoff')).toBe(98);expect(value(r,'Total interest')).toBeCloseTo(12324.468152096,6);
  expect(value(r,'Total paid')).toBeCloseTo(24324.468152096,6);
  expect(r.metrics.some(m=>m.label==='Interest saved'||m.label==='Months saved')).toBe(false);
  expect(s.rows.at(-1)!.values.payment).toBeCloseTo(74.468152096,6);
 });
 it.each([{payment:0,extraMonthlyPayment:500},{payment:0,extraAnnualPayment:6000},{payment:0},{payment:180}])('keeps zero/equal-interest payment schedules truthful: %j',patch=>{
  const v={balance:12000,rate:18,extraMonthlyPayment:0,extraAnnualPayment:0,...patch};
  const r=run('debt-payoff',v),s=table('debt-payoff',v);expect(s.rows.length).toBeGreaterThan(0);
  let balance=v.balance,paid=0;
  for(const row of s.rows){const p=Number(row.values.payment),interest=Number(row.values.interest),end=Number(row.values.endingBalance);expect(balance+interest-p).toBeCloseTo(end,5);balance=end;paid+=p;}
  const last=s.rows.at(-1)!;expect(r.metrics[0].label=== 'Payoff time' ? value(r,'Months to payoff'):600).toBe(last.values.month);
  expect(value(r,balance===0?'Total paid':'Paid through 50 years')).toBeCloseTo(paid,4);
 });
 it('labels slow amortization as capped rather than a completed50-year loan',()=>{
  const v={balance:300000,rate:6.5,payment:1625.5,extraMonthlyPayment:0,extraAnnualPayment:0};const r=run('debt-payoff',v),s=table('debt-payoff',v);
  expect(s.rows).toHaveLength(600);expect(s.summary).toMatch(/not paid off.*600 months/i);
  expect(r.metrics[0].value).toBeCloseTo(Number(s.rows.at(-1)!.values.endingBalance),5);
 });
});

describe('B71 transfer and strategy comparisons',()=>{
 it.each([140,110,0])('compares transfer costs over the same horizon for payment%s',payment=>{
  const v={balance:8000,currentRate:22,newRate:3,promoMonths:18,feeRate:3,payment};const r=run('balance-transfer',v),s=table('balance-transfer',v),last=s.rows.at(-1)!;
  expect(s.rows).toHaveLength(600);expect(r.metrics[0].label).toBe('Cost difference through 50 years');
  expect(r.metrics[0].value).toBeCloseTo(Number(last.values.costSavings),4);
  expect(value(r,'Interest with transfer')+240).toBeCloseTo(Number(last.values.promoCost),4);
  expect(r.metrics.some(m=>m.label==='Total payoff months after transfer')).toBe(payment===140);
 });
 it.each([0,18])('preserves a valid two-phase transfer at promo length%s',promoMonths=>{
  const r=run('balance-transfer',{promoMonths}),s=table('balance-transfer',{promoMonths});
  expect(r.metrics[0].value).toBeCloseTo(Number(s.rows.at(-1)!.values.costSavings),6);
 });
 const stalled={debt1Balance:10000,debt1Rate:24,debt1Minimum:50,debt2Balance:10000,debt2Rate:12,debt2Minimum:50,debt3Balance:5000,debt3Rate:6,debt3Minimum:25};
 it.each([0,201])('reconciles strategy at insufficient/uneven budgets%s',extraPayment=>{
  const v={...stalled,extraPayment},r=run('debt-snowball-avalanche',v),s=table('debt-snowball-avalanche',v),last=s.rows.at(-1)!;
  expect(r.metrics[0].label).toBe('Interest difference through 50 years');
  expect(s.rows).toHaveLength(600);expect(r.metrics[0].value).toBeCloseTo(Number(last.values.interestSaved),4);
  expect(value(r,'Avalanche total interest')).toBeCloseTo(Number(last.values.avalancheInterest),4);
 });
 it('does not repeat a finished strategy milestone and attributes simultaneous events',()=>{
  const s=table('debt-snowball-avalanche',{debt1Balance:8000,debt1Rate:29,debt1Minimum:200,debt2Balance:8500,debt2Rate:5,debt2Minimum:100,debt3Balance:2000,debt3Rate:6,debt3Minimum:50,extraPayment:100});
  const notes=s.rows.map(r=>r.note??'');expect(notes.filter(n=>n.includes('Avalanche: Auto loan paid off'))).toHaveLength(1);
  const simultaneous=table('debt-snowball-avalanche',{debt1Balance:100,debt1Rate:0,debt1Minimum:100,debt2Balance:0,debt3Balance:0,extraPayment:0});
  expect(simultaneous.rows[0].note).toContain('Snowball: Credit card paid off');expect(simultaneous.rows[0].note).toContain('Avalanche: Credit card paid off');
 });
});

describe('B71 loan and PMI reconciliation',()=>{
 it('separates recast lump-sum savings from subsequent extra payments',()=>{
  const r=run('mortgage-recast');expect(value(r,'Recast interest savings')).toBeCloseTo(51281.074202146,6);
  const extra=run('mortgage-recast',{extraMonthlyPayment:200});expect(value(extra,'Additional-payment interest savings')).toBeCloseTo(64927.881087772,6);
  const s=table('mortgage-recast',{extraMonthlyPayment:200});expect(s.rows[0].values.newPayment).toBeCloseTo(1888.017903369,6);
  expect(s.rows[233].values.newPayment).toBeCloseTo(1569.318437957,6);
  expect(s.rows[234].values.newPayment).toBe(0);
  let difference=0;for(const row of s.rows){difference+=Number(row.values.oldPayment)-Number(row.values.newPayment);expect(row.values.paymentSavings).toBeCloseTo(difference,6);}
 });
 it('treats an explicit month0 balloon as immediate principal, without adding a payment',()=>{
  const r=run('balloon-loan',{balloonYears:0}),s=table('balloon-loan',{balloonYears:0});
  expect(r.metrics[0].value).toBe(250000);expect(value(r,'Balloon due after months')).toBe(0);
  expect(s.rows).toHaveLength(1);expect(s.rows[0].values.month).toBe(0);expect(s.rows[0].values.balloonDue).toBe(250000);expect(s.rows[0].values.payment).toBe(0);
 });
 it.each([0,undefined])('preserves the already-fixed rent loan term fallback%s',loanYears=>{
  const c=calculator('rent-vs-buy'),v=input('rent-vs-buy');if(loanYears===undefined)delete v.loanYears;else v.loanYears=loanYears;
  const r=calculateSeoCalculator(c,v),s=buildCalculatorDetailSchedule(c,v)!;expect(r.metrics.at(-1)!.value).toBeCloseTo(Number(s.rows.at(-1)!.values.netDifference),5);
 });
 it.each([.2,.22])('models no initial conventional PMI at down share%s without suppressing FHA MIP',share=>{
  const pmi=run('pmi',{homePrice:450000,downPayment:450000*share});expect(pmi.metrics[0].value).toBe(0);
  const r=run('fha-vs-conventional',{homePrice:350000,downPayment:350000*share});expect(value(r,'Conventional monthly payment')).toBeCloseTo((350000*(1-share)*(.065/12)/(1-(1+.065/12)**-360)),6);
  const s=table('fha-vs-conventional',{homePrice:350000,downPayment:350000*share});const conv=s.rows.find(r=>r.id==='conventional')!;expect(conv.values.insurance).toBe(0);expect(s.rows.find(r=>r.id==='fha')!.values.insurance).toBeGreaterThan(0);
 });
 it('replaces invented cancellation dates with an explicit cost breakdown and US scope',()=>{
  const s=table('pmi');expect(s.title).toBe('PMI cost breakdown');expect(s.description+s.summary).not.toMatch(/6\.5|30.year|cancellation timeline/i);
  expect(s.rows.some(row=>row.values.amount===202.5)).toBe(true);expect(calculator('pmi').region).toBe('US');expect(calculator('heloc').region).toBe('US');
 });
 it.each(['debt-payoff','credit-card-payoff','debt-snowball-avalanche','balance-transfer','mortgage-recast','pmi','fha-vs-conventional','balloon-loan'])('versions the changed interpretation for%s',slug=>{
  const r=run(slug),version=modelVersionForCalculator(slug);expect(version).toBeDefined();expect(r.modelVersion).toBe(version);expect(isCalculatorModelVersion(version)).toBe(true);expect(modelVersionMatchesCalculator(version!,slug)).toBe(true);
 });
});
