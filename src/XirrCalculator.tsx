import { useMemo, useState, type ReactNode } from 'react';
import type { AuthState } from './auth';
import { SignUpIntent } from './authRuntime';
import type { CalculatorSaveOutcome, CalculatorSaveRequest, CalculatorSavedResult } from './CalculatorLibrary';
import { CalculatorResultAction } from './components/CalculatorResultAction';
import { useResultReveal } from './lib/resultReveal';
import { buildDatedReturnCsv, calculateDatedReturn, isoDay, type DatedCashFlow, type DatedReturnInputModel } from './lib/datedReturns';
import type { CalculatorResult, SeoCalculator } from './lib/seoCalculators';
import { resolveMoneyLocale } from './lib/money';
export type XirrProps = {auth:AuthState; calculator:SeoCalculator; onSaveResult:(r:CalculatorSaveRequest)=>Promise<CalculatorSaveOutcome>; savedResults:CalculatorSavedResult[]; renderPeriodic:()=>ReactNode};
type RawFlow = { date:string; amount:string };
const blankRows=():RawFlow[]=>[{date:'',amount:''},{date:'',amount:''}];
const currencyCodes=['USD','INR','EUR','GBP','CAD','AUD','JPY'];
export function XirrCalculator(props:XirrProps) {
  const [mode,setMode]=useState<'monthly'|'dated'>('monthly');
  const [rows,setRows]=useState<RawFlow[]>(blankRows);
  const [currency,setCurrency]=useState('USD');
  return <>
    <section className="calculator-mode-choice route-shell" aria-label="Return calculation type">
      <div><strong>Choose how your money moved</strong><p>Equal monthly contributions use a monthly IRR. For irregular payments, enter the actual dates below.</p></div>
      <div className="calculator-mode-actions">
        <button className={mode==='monthly'?'primary-button':'secondary-button'} type="button" aria-pressed={mode==='monthly'} onClick={()=>setMode('monthly')}>Monthly contributions</button>
        <button className={mode==='dated'?'primary-button':'secondary-button'} type="button" aria-pressed={mode==='dated'} onClick={()=>setMode('dated')}>Dated cash flows</button>
      </div>
    </section>
    <div className="return-mode-panel" hidden={mode!=='monthly'}>{props.renderPeriodic()}</div>
    <div className="return-mode-panel" hidden={mode!=='dated'}><DatedReturnCalculator {...props} rows={rows} setRows={setRows} currency={currency} setCurrency={setCurrency}/></div>
  </>;
}
function DatedReturnCalculator({auth,calculator,onSaveResult,savedResults,rows,setRows,currency,setCurrency}:XirrProps & {rows:RawFlow[];setRows:(r:RawFlow[])=>void;currency:string;setCurrency:(c:string)=>void}) {
  const {resultRef,revealResult}=useResultReveal();
  const [message,setMessage]=useState('');const [saving,setSaving]=useState(false);const [origin,setOrigin]=useState<'user'|'example'|'saved'>('user');
  const flows=useMemo<DatedCashFlow[]>(()=>rows.map(r=>({date:r.date,amount:r.amount.trim()&&/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(r.amount.trim())?Number(r.amount):NaN})),[rows]);
  const calculated=useMemo(()=>calculateDatedReturn(flows),[flows]);
  const inputModel:DatedReturnInputModel={kind:'dated-cash-flows',version:'dated-xirr-v1',cashFlows:flows};
  const format=(value:number)=>new Intl.NumberFormat(resolveMoneyLocale(currency),{style:'currency',currency,maximumFractionDigits:2}).format(value);
  const history=savedResults.filter(r=>r.calculatorSlug==='xirr'&&r.inputModel?.version==='dated-xirr-v1').slice(0,6);
  const edit=(index:number,key:keyof RawFlow,value:string)=>{setRows(rows.map((r,i)=>i===index?{...r,[key]:value}:r));setOrigin('user');setMessage('');};
  const example=()=>{setRows([{date:'2025-01-01',amount:'-1000'},{date:'2026-01-01',amount:'1100'}]);setOrigin('example');setMessage('Example cash flows loaded. Replace them with your own dates and amounts.');revealResult();};
  const save=async()=>{
    if(!calculated.ok||saving)return;
    const result:CalculatorResult={modelVersion:'dated-xirr-v1',narrative:'Annualized return matching these actual dated cash flows, using actual calendar days divided by 365. This compares entered cash flows; it is not a forecast.',assumptions:['Negative amounts are investments; positive amounts are proceeds or the ending value. Same-day amounts are aggregated.','Only investments followed by proceeds are supported; fees and taxes must be entered as cash flows.'],metrics:[{label:'Annualized dated return',value:calculated.rate,valueType:'percent'},{label:'Actual day span',value:calculated.days,valueType:'number'},{label:'Net entered cash flows',value:calculated.cashFlows.reduce((sum,r)=>sum+r.amount,0),valueType:'currency'}]};
    setSaving(true);try{const outcome=await onSaveResult({calculator:{...calculator,title:'Dated Cash-flow Return Calculator',conversionRoute:'/plans',conversionLabel:'Save return comparison'},currency,values:{cashFlowCount:rows.length},inputModel,result});setMessage(outcome.message);}catch{setMessage('The dated result could not be saved. Your inputs are still here; try again.');}finally{setSaving(false);}
  };
  const exportCsv=()=>{
    if(!calculated.ok)return;const blob=new Blob([buildDatedReturnCsv(inputModel,currency)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='dated-cash-flow-return.csv';a.click();URL.revokeObjectURL(url);setMessage('Actual cash-flow dates and amounts exported as CSV.');
  };
  const load=(saved:CalculatorSavedResult)=>{if(!saved.inputModel)return;setRows(saved.inputModel.cashFlows.map(r=>({date:r.date,amount:String(r.amount)})));setCurrency(saved.currency);setOrigin('saved');setMessage('Saved dates and amounts loaded. The saved snapshot is unchanged; save explicitly to keep a new result.');revealResult();};
  return <section className="calculator-library calculator-detail route-shell" aria-labelledby="dated-return-title">
    <div className="route-heading"><p className="eyebrow">Investment returns</p><h1 id="dated-return-title">What return did your money earn?</h1><p>Enter each investment and payment on its actual date. Include the ending value as a positive cash flow on its valuation date.</p></div>
    <div className="calculator-detail-grid">
      <section className="calculator-input-panel" aria-label="Dated return inputs">
        <div className="panel-heading"><h2>Your cash flows</h2><button type="button" className="secondary-button" onClick={example}>Use example cash flows</button></div>
        <p className="calculator-cost-scope">Investments are negative; money received is positive. Dates and amounts start empty. This version supports investments followed by proceeds.</p>
        <label className="dated-currency">Currency<select value={currency} onChange={e=>{setCurrency(e.target.value);setOrigin('user');setMessage('Currency unit changed. Amounts have not been converted.');}}>{[...new Set([...currencyCodes,currency])].map(c=><option key={c}>{c}</option>)}</select></label>
        <div className="dated-flow-list">
          {rows.map((row,index)=><fieldset className="dated-flow-row" key={index}><legend>Cash flow {index+1}</legend>
            <label htmlFor={`flow-date-${index}`}>Date<input id={`flow-date-${index}`} type="date" min="1900-01-01" max="2100-12-31" value={row.date} required aria-invalid={Boolean(row.date)&&isoDay(row.date)===null} onChange={e=>edit(index,'date',e.target.value)}/></label>
            <label htmlFor={`flow-amount-${index}`}>Amount ({currency})<input id={`flow-amount-${index}`} type="text" inputMode="decimal" value={row.amount} required placeholder="e.g. -1000 or 1100" aria-invalid={Boolean(row.amount)&&!Number.isFinite(flows[index].amount)} onChange={e=>edit(index,'amount',e.target.value)}/></label>
            {rows.length>2?<button type="button" className="secondary-button" aria-label={`Remove cash flow ${index+1}`} onClick={()=>{setRows(rows.filter((_,i)=>i!==index));setOrigin('user');setMessage('');}}>Remove</button>:null}
          </fieldset>)}
        </div>
        <button type="button" className="secondary-button" disabled={rows.length>=50} onClick={()=>{setRows([...rows,{date:'',amount:''}]);setOrigin('user');setMessage('');}}>Add cash flow</button>
        {!calculated.ok?<p className="calculator-input-error" role="status">{calculated.error}</p>:null}
        <CalculatorResultAction disabled={!calculated.ok} onReveal={revealResult}/>
      </section>
      <section ref={resultRef} tabIndex={-1} className="calculator-result-panel" aria-label="Dated cash-flow return result">
        <div className="panel-heading"><h2>{calculated.ok?'Your dated return':'Finish your cash flows'}</h2></div>
        <p className="calculator-result-state" role="status">{origin==='example'?'Example cash flows — replace with your own.':origin==='saved'?'Restored dates and amounts':'Your inputs'}</p>
        {calculated.ok?<>
          <div className="calculator-result-metrics"><article className="calculator-result-metric calculator-result-metric-primary"><span>Annualized dated return</span><strong>{(calculated.rate*100).toFixed(2)}%</strong><small>{calculated.rate<0?'Negative return over the entered period':'Annualized rate for the entered period'} · {calculated.days} actual days</small></article></div>
          <p className="calculator-result-narrative">Actual calendar days / 365. Same-day amounts are combined. This is a return on the cash flows you entered, not a prediction of future growth.</p>
          <CashFlowTimeline flows={calculated.cashFlows} format={format}/>
          <details className="dated-flow-table"><summary>Exact cash-flow data and solver check</summary><div className="table-scroll"><table><caption>Sorted cash flows; same-day amounts combined</caption><thead><tr><th scope="col">Date</th><th scope="col">Amount ({currency})</th><th scope="col">Direction</th></tr></thead><tbody>{calculated.cashFlows.map(r=><tr key={r.date}><th scope="row">{r.date}</th><td>{r.amount.toLocaleString(resolveMoneyLocale(currency),{maximumSignificantDigits:17})}</td><td>{r.amount<0?'Invested':'Received'}</td></tr>)}</tbody></table></div><p>Relative discounted-flow residual: {calculated.residual.toExponential(2)}. Search range −99.99% to 100,000%; at most 200 steps. A failed or ambiguous calculation shows no rate.</p></details>
        </>:<p>Enter at least two dates with an investment and proceeds. No return is shown until the inputs form a supported calculation.</p>}
        <div className="dated-result-actions"><button className="secondary-button" type="button" disabled={!calculated.ok} onClick={exportCsv}>Export cash-flow CSV</button>
          {auth.status==='signed-in'?<button className="primary-button" type="button" disabled={!calculated.ok||saving} onClick={()=>void save()}>{saving?'Saving…':'Save dated result'}</button>:<SignUpIntent><button type="button" className="primary-button" disabled={!calculated.ok}>Create account to save</button></SignUpIntent>}
        </div>
        {message?<p role="status" className="calculator-save-message">{message}</p>:null}
      </section>
    </div>
    <section className="calculator-methodology-panel" aria-label="Dated return method"><article><p className="eyebrow">Method</p><p>The rate makes the discounted value of all cash flows sum to zero: Σ Cᵢ / (1 + r)^((dateᵢ − first date)/365) = 0. The solver supports one change from investments to proceeds.</p><a href="https://support.microsoft.com/en-us/excel/functions/xirr-function" target="_blank" rel="noreferrer">Microsoft XIRR definition</a></article><article><p className="eyebrow">Limits</p><p>2–50 cash flows, dates from 1900–2100, a span of at most 100 years, and amounts up to one trillion each. Include fees and taxes in your flows. This does not estimate risk, purchasing power or future returns.</p><p>Switching modes preserves your edits. Earlier monthly runs stay monthly; no dates are invented. Dates and amounts are not added to analytics or share URLs.</p></article></section>
    <section className="calculator-input-panel dated-history" aria-label="Saved dated returns"><h2>Revisit a saved comparison</h2>{history.length?history.map(saved=><article key={saved.id}><p>{saved.calculatorTitle} · {new Date(saved.createdAt).toLocaleDateString()} · {saved.currency}</p><button className="secondary-button" type="button" onClick={()=>load(saved)}>Load dated inputs</button></article>):<p>No saved dated runs yet. Monthly runs remain in the monthly-contributions mode.</p>}</section>
  </section>;
}
function CashFlowTimeline({flows,format}:{flows:DatedCashFlow[];format:(n:number)=>string}) {
  const first=isoDay(flows[0].date)!,span=isoDay(flows.at(-1)!.date)!-first;
  const max=Math.max(...flows.map(r=>Math.abs(r.amount)));
  return <figure className="dated-flow-visual"><figcaption><strong>Money in and out, on its actual date</strong><span>Circles: received · diamonds: invested. Exact amounts are in the table.</span></figcaption><svg viewBox="0 0 600 240" role="img" aria-label="Signed cash flows over actual dates, not a wealth forecast"><line x1="24" x2="576" y1="112" y2="112" className="dated-flow-axis"/>{flows.map(row=>{const x=24+(isoDay(row.date)!-first)/span*552,y=112-row.amount/max*88;return <g key={row.date}><title>{row.date}: {row.amount<0?'Invested':'Received'} {format(Math.abs(row.amount))}</title><line x1={x} x2={x} y1="112" y2={y} className="dated-flow-stem"/>{row.amount<0?<path d={`M ${x} ${y-6} l 6 6 l -6 6 l -6 -6 Z`} className="dated-flow-out"/>:<circle cx={x} cy={y} r="6" className="dated-flow-in"/>}</g>;})}</svg><div className="dated-flow-endpoints"><span>{flows[0].date}</span><span>{flows.at(-1)!.date}</span></div></figure>;
}
