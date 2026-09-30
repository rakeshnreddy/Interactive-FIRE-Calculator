import {buildCalculatorStudioChart,buildCalculatorDetailSchedule} from './calculatorStudios';
import { it,expect,describe } from 'vitest';
import { calculateVehicleCost,vehicleCostResult,buildVehicleCostCsv } from './vehicleLeaseBuy';
import { calculateSeoCalculator,seoCalculators } from './seoCalculators';
const base={homePrice:25000,downPayment:5000,rate:0,loanYears:4,years:2,resale:14000,rent:350,leaseUpfront:0,leaseYears:2,extendLease:0};
describe('independent vehicle economics',()=>{
 it.each([[2,14000,11000,8400,10000,10000,4000,24],[2,0,25000,8400,10000,10000,-10000,24],[4,8000,17000,16800,20000,0,8000,48],[5,6000,19000,21000,20000,0,6000,48]])('reconciles horizon %#',(years,resale,buyCost,leaseCost,paid,remaining,equity,count)=>{
  const v={...base,years,resale,extendLease:years>2?1:0,extensionMonthly:350};const r=calculateVehicleCost(v);expect(r.ok).toBe(true);if(!r.ok)return;
  expect(r.payment).toBeCloseTo(20000/48,8);expect(r.buyCost).toBeCloseTo(buyCost,6);expect(r.leaseCost).toBeCloseTo(leaseCost,6);expect(r.difference).toBeCloseTo(buyCost-leaseCost,6);expect(r.paymentsPaid).toBeCloseTo(paid,6);expect(r.remainingLoan).toBeCloseTo(remaining,6);expect(r.equity).toBeCloseTo(equity,6);expect(r.paymentCount).toBe(count);
 });
 it('matches an independent positive-rate payment and balance formula',()=>{
  const r=calculateVehicleCost({...base,rate:6});expect(r.ok).toBe(true);if(!r.ok)return;const m=0.06/12,p=20000*m/(1-Math.pow(1+m,-48)),b=20000*Math.pow(1+m,24)-p*(Math.pow(1+m,24)-1)/m;expect(r.payment).toBeCloseTo(p,8);expect(r.remainingLoan).toBeCloseTo(b,7);expect(r.buyCost).toBeCloseTo(5000+p*24+b-14000,7);
 });
 it.each([{resale:NaN},{resale:-1},{homePrice:-1},{downPayment:26000},{rate:-1},{years:0},{loanYears:0},{leaseYears:0},{years:101},{years:3},{years:3,extendLease:1},{years:3,extendLease:1,extensionMonthly:-1},{extendLease:2},{rent:Infinity}] as Record<string,number>[])('fails closed on invalid or unquoted renewal %#',patch=>{expect(calculateVehicleCost({...base,...patch})).toMatchObject({ok:false});expect(vehicleCostResult({...base,...patch}).metrics).toEqual([]);});
 it('allows explicit free continuation, upfront costs and appreciation',()=>{const r=calculateVehicleCost({...base,years:3,extendLease:1,extensionMonthly:0,resale:30000,leaseUpfront:800});expect(r.ok).toBe(true);if(r.ok){expect(r.buyCost).toBeCloseTo(-5000,6);expect(r.leaseCost).toBe(9200);}});
 it('stops after payoff, handles cash purchases and very small positive rates',()=>{for(const patch of [{years:5,extendLease:1,extensionMonthly:350},{downPayment:25000},{rate:1e-12}] as Record<string,number>[]){const r=calculateVehicleCost({...base,...patch});expect(r.ok).toBe(true);if(r.ok)expect(Object.values(r).filter(v=>typeof v==='number').every(Number.isFinite)).toBe(true);}});
 it('leaves the housing contract unchanged',()=>{const c=seoCalculators.find(c=>c.slug==='rent-vs-buy')!;const r=calculateSeoCalculator(c,{homePrice:120000,downPayment:0,rate:0,loanYears:1,years:2,ownershipRate:1,rent:1000});expect(r.metrics.find(m=>m.label.startsWith('Net cost of buying'))?.value).toBe(2400);});
});

it('exports reconciled net costs, actual terms and version',()=>{const csv=buildVehicleCostCsv(base,'USD');expect(csv).toContain('vehicle-cost-v1');expect(csv).toContain('"Buy net cost",11000');expect(csv).toContain('"resale",14000');expect(csv).toContain('"Loan payment count",24');});
it('studio chart and exact schedule reconcile to the same net costs',()=>{const c=seoCalculators.find(c=>c.slug==='lease-vs-buy')!;const v={...base,extensionMonthly:0};const r=calculateSeoCalculator(c,v);expect(r.modelVersion).toBe('vehicle-cost-v1');const chart=buildCalculatorStudioChart(c,v,r);expect(chart.entries.map(e=>e.primary)).toEqual([11000,8400]);const table=buildCalculatorDetailSchedule(c,v,r)!;expect(table.rows.find(r=>r.id==='vehicle-net-cost')?.values).toMatchObject({buy:11000,lease:8400});});
