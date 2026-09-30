export type DatedCashFlow = { date: string; amount: number };
export type DatedReturnInputModel = { kind: 'dated-cash-flows'; version: 'dated-xirr-v1'; cashFlows: DatedCashFlow[] };
export type DatedReturn = { ok: true; rate: number; days: number; residual: number; cashFlows: DatedCashFlow[] } | { ok: false; error: string };
type FlowParse = { ok: true; value: DatedCashFlow[] } | { ok: false; error: string };
export const datedReturnLimits = { rows: 50, amount: 1e12, days: 36525, minRate: -0.9999, maxRate: 1000, iterations: 200, residual: 1e-10 } as const;
export function isoDay(date: unknown): number | null {
  if (typeof date !== 'string' || !/^(?:19|20|21)\d{2}-\d{2}-\d{2}$/.test(date) || date > '2100-12-31') return null;
  const time = Date.parse(date + 'T00:00:00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0,10) === date ? time / 86400000 : null;
}
export function parseDatedCashFlows(rows: unknown): FlowParse {
  if (!Array.isArray(rows) || rows.length < 2 || rows.length > datedReturnLimits.rows) return { ok: false, error: 'Enter 2 to 50 dated cash flows.' };
  const value: DatedCashFlow[] = [];
  for (const [index,row] of rows.entries()) {
    if (!row || typeof row !== 'object' || isoDay(row.date) === null) return { ok: false, error: `Cash flow ${index+1}: enter a real date from 1900 through 2100.` };
    if (typeof row.amount !== 'number' || !Number.isFinite(row.amount) || Math.abs(row.amount) > datedReturnLimits.amount) return { ok: false, error: `Cash flow ${index+1}: enter a finite amount with magnitude at most 1 trillion.` };
    value.push({date:row.date,amount:row.amount});
  }
  const first = Math.min(...value.map(r=>isoDay(r.date)!)), last = Math.max(...value.map(r=>isoDay(r.date)!));
  if (last-first > datedReturnLimits.days) return { ok: false, error: 'Keep the date span within 100 calendar years.' };
  return {ok:true,value};
}
export function parseDatedReturnInputModel(value: unknown): DatedReturnInputModel | null {
  if (!value || typeof value !== 'object' || !('kind' in value) || value.kind !== 'dated-cash-flows' || !('version' in value) || value.version !== 'dated-xirr-v1' || !('cashFlows' in value)) return null;
  const parsed = parseDatedCashFlows(value.cashFlows);
  return parsed.ok ? {kind:'dated-cash-flows',version:'dated-xirr-v1',cashFlows:parsed.value} : null;
}
/** Actual UTC day spacing / 365, no dates inferred from periodic contributions. */
export function calculateDatedReturn(rows: unknown): DatedReturn {
  const parsed = parseDatedCashFlows(rows); if (!parsed.ok) return parsed;
  const days = new Map<string,number>();
  for (const row of parsed.value) days.set(row.date,(days.get(row.date) ?? 0)+row.amount);
  const cashFlows = [...days].sort(([a],[b])=>a.localeCompare(b)).map(([date,amount])=>({date,amount})).filter(row=>row.amount !== 0);
  if (cashFlows.length < 2 || !cashFlows.some(r=>r.amount<0) || !cashFlows.some(r=>r.amount>0)) return {ok:false,error:'Use at least two distinct dates, with both investment (negative) and proceeds (positive) amounts after same-day aggregation.'};
  let proceeds = false;
  for (const row of cashFlows) {
    if (row.amount>0) proceeds = true;
    else if (proceeds) return {ok:false,error:'This version supports investments followed by proceeds. Alternating withdrawals and deposits can have multiple returns; no rate is selected.'};
  }
  const first = isoDay(cashFlows[0].date)!;
  const terms = cashFlows.map(r=>({amount:r.amount,time:(isoDay(r.date)!-first)/365}));
  // All discounted terms share a scale, preventing overflow near -100%.
  const evaluate = (logRate:number) => {
    const exponents = terms.map(t=>Math.log(Math.abs(t.amount))-logRate*t.time);
    const peak = Math.max(...exponents);
    const scaled = terms.map((t,i)=>Math.sign(t.amount)*Math.exp(exponents[i]-peak));
    return scaled.reduce((a,b)=>a+b,0)/scaled.reduce((a,b)=>a+Math.abs(b),0);
  };
  const success = (logRate:number,value:number): DatedReturn => ({ok:true,rate:Math.expm1(logRate),days:isoDay(cashFlows.at(-1)!.date)!-first,residual:Math.abs(value),cashFlows});
  let low = Math.log1p(datedReturnLimits.minRate), high = Math.log1p(datedReturnLimits.maxRate);
  const lowValue=evaluate(low), highValue=evaluate(high);
  if(Math.abs(lowValue)<=1e-12)return success(low,lowValue);
  if(Math.abs(highValue)<=1e-12)return success(high,highValue);
  if (lowValue<0 || highValue>0) return {ok:false,error:'No converged return within the supported rate range (-99.99% to 100,000%). Review the dates and amounts.'};
  for (let iteration=0;iteration<datedReturnLimits.iterations;iteration++) {
    const mid=(low+high)/2, value=evaluate(mid);
    if (Math.abs(value)<=1e-12) return success(mid,value);
    if(value>0)low=mid;else high=mid;
  }
  return {ok:false,error:'The bounded solver did not converge. No return is shown.'};
}

export function buildDatedReturnCsv(model: DatedReturnInputModel, currency: string): string {
  const result=calculateDatedReturn(model.cashFlows);
  const rows: (string|number)[][]=[['Date','Amount','Currency','Note'],...model.cashFlows.map(row=>[row.date,row.amount,currency,'Entered cash flow'])];
  if(result.ok)rows.push(['','','',`Annualized return: ${result.rate*100}%`],['','','',`Actual day span: ${result.days}; relative discounted-flow residual: ${result.residual}`],['','','','Model: dated-xirr-v1; actual day differences / 365']);
  return rows.map(row=>row.map(cell=>typeof cell==='number'?String(cell):'"'+cell.replaceAll('"','""')+'"').join(',')).join('\n');
}
