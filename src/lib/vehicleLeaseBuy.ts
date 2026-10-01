import type { CalculatorResult } from './seoCalculators';
export type VehicleCost = { ok: false; error: string } | { ok: true; months:number; payment:number; paymentsPaid:number; paymentCount:number; remainingLoan:number; equity:number; resale:number; buyCost:number; leaseCost:number; difference:number; financed:number; down:number };
const amountKeys = ['homePrice','downPayment','rent','resale'];
export function calculateVehicleCost(v:Record<string,number>):VehicleCost {
 const fail=(error:string):VehicleCost=>({ok:false,error});
 for(const key of amountKeys) if(!Number.isFinite(v[key])||v[key]<0||v[key]>1e12)return fail('Enter purchase, down payment, lease payment and resale amounts from 0 to one trillion. Resale must be your explicit estimate.');
 if(v.downPayment>v.homePrice)return fail('Down payment cannot exceed the purchase price.');
 if(!Number.isFinite(v.rate)||v.rate<0||v.rate>100)return fail('Enter a loan APR from 0 to 100%.');
 for(const key of ['loanYears','years','leaseYears'])if(!Number.isFinite(v[key])||v[key]<=0||v[key]>100||Math.abs(v[key]*12-Math.round(v[key]*12))>1e-6)return fail('Enter positive durations in whole months, up to 100 years. For one month use 0.0833333333 years.');
 const upfront=v.leaseUpfront??0,extend=v.extendLease??0;
 if(!Number.isFinite(upfront)||upfront<0||upfront>1e12)return fail('Enter upfront lease costs from 0 to one trillion.');
 if(extend!==0&&extend!==1)return fail('Choose whether to assume lease continuation.');
 const months=Math.round(v.years*12),term=Math.round(v.loanYears*12),quoted=Math.round(v.leaseYears*12),extra=Math.max(0,months-quoted);
 if(extra&&(extend!==1||!Number.isFinite(v.extensionMonthly)||v.extensionMonthly<0||v.extensionMonthly>1e12))return fail('The comparison exceeds the quoted lease period. Explicitly allow continuation and enter its monthly cost, or shorten your comparison.');
 const financed=v.homePrice-v.downPayment,m=v.rate/100/12;
 const payment=financed===0?0:m===0?financed/term:financed*m/(-Math.expm1(-term*Math.log1p(m)));
 let remainingLoan=financed,paymentsPaid=0,paymentCount=0;
 for(let month=1;month<=Math.min(months,term)&&remainingLoan>0;month++){
  const due=remainingLoan*(1+m),paid=month===term?due:Math.min(payment,due);
  paymentsPaid+=paid;remainingLoan=Math.max(0,due-paid);paymentCount++;
 }
 const equity=v.resale-remainingLoan,buyCost=v.downPayment+paymentsPaid-equity;
 const leaseCost=upfront+v.rent*Math.min(months,quoted)+(extra?v.extensionMonthly*extra:0);
 const result={ok:true as const,months,payment,paymentsPaid,paymentCount,remainingLoan,equity,resale:v.resale,buyCost,leaseCost,difference:buyCost-leaseCost,financed,down:v.downPayment};
 if(!Object.values(result).filter(x=>typeof x==='number').every(Number.isFinite))return fail('The entered terms exceed the supported calculation range.');
 return result;
}
export function vehicleCostResult(v:Record<string,number>):CalculatorResult {
 const c=calculateVehicleCost(v);
 const assumptions=['Buy net cost = down payment + loan payments paid + remaining loan − entered resale value. Payments stop at payoff.','Lease upfront excludes regular payments, which are counted monthly; continuation beyond the quoted period uses only your explicit assumption.','No automatic tax, insurance, maintenance, mileage/wear, termination, selling-cost or opportunity-cost estimates. Include agreed taxes/fees in quoted prices and net resale as applicable.'];
 if(!c.ok)return {modelVersion:'vehicle-cost-v1',metrics:[],assumptions,narrative:c.error};
 return {modelVersion:'vehicle-cost-v1',assumptions,narrative:`At ${c.months} months, buying ${c.difference>0?'costs more than leasing':c.difference<0?'costs less than leasing':'has the same modeled net cost as leasing'}. This depends on your resale and lease terms, not a market forecast.`,metrics:[{label:'Buying minus leasing net cost',value:c.difference,valueType:'currency',tone:c.difference>0?'warning':'positive'},{label:'Buy net cost',value:c.buyCost,valueType:'currency'},{label:'Lease total cost',value:c.leaseCost,valueType:'currency'},{label:'Monthly loan payment',value:c.payment,valueType:'currency'},{label:'Equity at comparison date',value:c.equity,valueType:'currency'},{label:'Remaining loan',value:c.remainingLoan,valueType:'currency'}]};
}
export function buildVehicleCostCsv(v:Record<string,number>,currency:string):string {
 const c=calculateVehicleCost(v);if(!c.ok)return '';
 const rows:(string|number)[][]=[['Type','Name','Value','Unit'],['Model','Version','vehicle-cost-v1',''],...Object.entries(v).map(([key,value])=>['Input',key,value,''] as (string|number)[]),...vehicleCostResult(v).metrics.map(m=>['Result',m.label,m.value,currency] as (string|number)[]),['Result','Loan payments paid',c.paymentsPaid,currency],['Result','Loan payment count',c.paymentCount,'months'],['Result','Horizon',c.months,'months']];
 return rows.map(row=>row.map(x=>typeof x==='number'?String(x):'"'+x.replaceAll('"','""')+'"').join(',')).join('\n');
}
