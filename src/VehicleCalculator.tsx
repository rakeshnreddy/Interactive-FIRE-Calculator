import { useMemo, useState } from 'react';
import type { AuthState } from './auth';
import { SignUpIntent } from './authRuntime';
import type { CalculatorSaveOutcome, CalculatorSaveRequest, CalculatorSavedResult } from './CalculatorLibrary';
import { CalculatorResultAction } from './components/CalculatorResultAction';
import { useResultReveal } from './lib/resultReveal';
import { resolveMoneyLocale } from './lib/money';
import { calculateVehicleCost, vehicleCostResult, buildVehicleCostCsv, type VehicleCost } from './lib/vehicleLeaseBuy';
import type { SeoCalculator } from './lib/seoCalculators';

type Props = { auth: AuthState; calculator: SeoCalculator; onSaveResult: (r: CalculatorSaveRequest) => Promise<CalculatorSaveOutcome>; savedResults: CalculatorSavedResult[] };
const optional = new Set(['leaseUpfront', 'extendLease', 'extensionMonthly']);
const example = { homePrice:25000, downPayment:5000, rate:0, loanYears:4, years:2, rent:350, leaseYears:2, resale:14000, leaseUpfront:0, extendLease:0 };
const parseAmount = (text:string) => text.trim() && /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(text.trim()) ? Number(text) : NaN;
export function VehicleCalculator({ auth, calculator, onSaveResult, savedResults }:Props) {
  const [raw, setRaw] = useState<Record<string,string>>(() => Object.fromEntries(calculator.inputs.map(i => [i.key, i.key === 'leaseUpfront' || i.key === 'extendLease' ? '0' : ''])));
  const [currency, setCurrency] = useState('USD');
  const [origin, setOrigin] = useState('Your terms');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const values = useMemo(() => Object.fromEntries(calculator.inputs.filter(i => i.key !== 'extensionMonthly' || raw[i.key]?.trim()).map(i => [i.key, parseAmount(raw[i.key] ?? '')])), [calculator, raw]);
  const cost = useMemo(() => calculateVehicleCost(values), [values]);
  const { resultRef, revealResult } = useResultReveal();
  const format = (n:number) => new Intl.NumberFormat(resolveMoneyLocale(currency), { style:'currency', currency, maximumFractionDigits:2 }).format(n);
  const edit = (key:string, value:string) => { setRaw(r => ({ ...r, [key]:value })); setOrigin('Your terms'); setMessage(''); };
  const load = (v:Record<string,number>, label:string) => {
    setRaw(Object.fromEntries(calculator.inputs.map(i => [i.key, v[i.key] === undefined ? (i.key === 'extendLease' || i.key === 'leaseUpfront' ? '0' : '') : String(v[i.key])])));
    setOrigin(label); setMessage('');
  };
  const useExample = () => { load(example, 'Example terms — replace with your own'); revealResult(); };
  const field = (key:string) => {
    const input = calculator.inputs.find(i => i.key === key)!;
    const isOptional = optional.has(key);
    return <label className="vehicle-field" key={key} htmlFor={`vehicle-${key}`}><span>{input.label}{input.suffix ? ` (${input.suffix})` : input.type === 'percent' ? ' (%)' : input.type === 'currency' ? ` (${currency})` : ''}{key === 'leaseUpfront' ? ' · optional' : ''}</span>
      <input id={`vehicle-${key}`} type="text" inputMode="decimal" value={raw[key] ?? ''} required={!isOptional || key === 'extensionMonthly'} aria-invalid={Boolean(raw[key]) && (!Number.isFinite(parseAmount(raw[key])) || parseAmount(raw[key]) < 0)} onChange={e => edit(key,e.target.value)} />
      {key === 'resale' ? <small>Your estimate after selling costs. Enter 0 explicitly if you expect no resale proceeds.</small> : key === 'leaseUpfront' ? <small>0 omits upfront fees. Exclude regular payments already counted in the monthly quote.</small> : key === 'homePrice' ? <small>Use the agreed purchase price, including any taxes and fees you want counted.</small> : null}
    </label>;
  };
  const save = async () => {
    if (!cost.ok || saving) return;
    setSaving(true);
    try { const outcome = await onSaveResult({ calculator, currency, values, result:vehicleCostResult(values) }); setMessage(outcome.message); }
    catch { setMessage('The comparison could not be saved. Your terms are still here; try again.'); }
    finally { setSaving(false); }
  };
  const exportCsv = () => {
    if (!cost.ok) return;
    const url = URL.createObjectURL(new Blob([buildVehicleCostCsv(values,currency)], {type:'text/csv;charset=utf-8;'}));
    const a = document.createElement('a'); a.href=url; a.download='vehicle-lease-buy.csv'; a.click(); URL.revokeObjectURL(url); setMessage('Terms and reconciled costs exported as CSV.');
  };
  const history = savedResults.filter(r => r.calculatorSlug === calculator.slug).slice(0,6);
  return <section className="calculator-library calculator-detail route-shell" aria-labelledby="vehicle-title">
    <div className="route-heading"><p className="eyebrow">Vehicle decision · USD / INR and more</p><h1 id="vehicle-title">Lease or buy: what will it really cost?</h1><p>Compare both options over the same period. Include what you could sell the car for and the loan you would still owe.</p></div>
    <div className="calculator-detail-grid">
      <section className="calculator-input-panel" aria-label="Vehicle comparison inputs">
        <div className="panel-heading"><h2>Your terms</h2><button className="secondary-button" type="button" onClick={useExample}>Use example terms</button></div>
        <p className="calculator-cost-scope">Required terms start empty. Upfront lease fees start at 0; lease continuation is off. Use one currency throughout.</p>
        <label className="dated-currency">Currency<select value={currency} onChange={e => {setCurrency(e.target.value);setMessage('Currency unit changed. Amounts have not been converted.');}}>{[...new Set(['USD','INR','EUR','GBP','CAD','AUD','JPY',currency])].map(c => <option key={c}>{c}</option>)}</select></label>
        <fieldset className="vehicle-group"><legend>1 · Purchase and loan</legend><div className="calculator-input-grid">{['homePrice','downPayment','rate','loanYears'].map(field)}</div></fieldset>
        <fieldset className="vehicle-group"><legend>2 · The lease quote</legend><div className="calculator-input-grid">{['rent','leaseYears','leaseUpfront'].map(field)}</div></fieldset>
        <fieldset className="vehicle-group"><legend>3 · Same comparison date</legend><div className="calculator-input-grid">{['years','resale'].map(field)}</div><p>Years can include whole months: 1.5 years means 18 months. Resale is your assumption, not an automatic valuation.</p></fieldset>
        <div className="vehicle-continuation"><label htmlFor="vehicle-extendLease"><input id="vehicle-extendLease" type="checkbox" checked={raw.extendLease==='1'} onChange={e => edit('extendLease', e.target.checked ? '1' : '0')} /><span>Assume leasing continues beyond the quoted period</span></label><p>Only needed if your comparison runs longer than the offered lease. A future quote is unknown; enter your own continuation cost.</p>{raw.extendLease === '1' ? field('extensionMonthly') : null}</div>
        {!cost.ok ? <p className="calculator-input-error" role="status">{cost.error}</p> : null}
        <CalculatorResultAction disabled={!cost.ok} onReveal={revealResult}/>
      </section>
      <section className="calculator-result-panel" ref={resultRef} tabIndex={-1} aria-label="Vehicle net-cost result">
        <div className="panel-heading"><h2>{cost.ok ? `Comparison at ${cost.months} months` : 'Finish your terms'}</h2></div>
        <p className="calculator-result-state" role="status">{origin}</p>
        {cost.ok ? <>
          <div className="calculator-result-metrics"><article className="calculator-result-metric calculator-result-metric-primary"><span>Buying minus leasing net cost</span><strong>{format(cost.difference)}</strong><small>{cost.difference > 0 ? 'Buying costs more' : cost.difference < 0 ? 'Buying costs less' : 'Same modeled net cost'} over {cost.months} months</small></article><article className="calculator-result-metric"><span>Monthly loan payment</span><strong>{format(cost.payment)}</strong><small>{cost.paymentCount} payments counted; stops at payoff</small></article></div>
          <p className="calculator-result-narrative">Net cost accounts for resale and remaining debt. A lower monthly payment alone does not mean a cheaper choice. Your resale estimate can change the answer.</p>
          <VehicleCostVisual cost={cost} format={format}/>
          <details className="dated-flow-table vehicle-table"><summary>How these costs add up</summary><div className="table-scroll"><table><caption>Exact model components at {cost.months} months ({currency})</caption><thead><tr><th scope="col">Component</th><th scope="col">Buy</th><th scope="col">Lease</th></tr></thead><tbody>
            <tr><th scope="row">Upfront cash</th><td>{format(cost.down)}</td><td>{format(values.leaseUpfront)}</td></tr>
            <tr><th scope="row">Payments paid</th><td>{format(cost.paymentsPaid)}</td><td>{format(cost.leaseCost-values.leaseUpfront)}</td></tr>
            <tr><th scope="row">Remaining loan added</th><td>{format(cost.remainingLoan)}</td><td>—</td></tr>
            <tr><th scope="row">Resale subtracted</th><td>−{format(cost.resale)}</td><td>—</td></tr>
            <tr><th scope="row">Net cost</th><td>{format(cost.buyCost)}</td><td>{format(cost.leaseCost)}</td></tr>
          </tbody></table></div><p>Ownership equity = resale − remaining loan = {format(cost.equity)}. A negative amount means the sale would not clear the loan. Negative net cost means your entered resale exceeds the modeled outlay.</p></details>
        </> : <p>Enter your loan, lease and comparison terms, including resale. No cost comparison is shown until they are complete.</p>}
        <div className="dated-result-actions"><button className="secondary-button" type="button" disabled={!cost.ok} onClick={exportCsv}>Export comparison CSV</button>{auth.status === 'signed-in' ? <button className="primary-button" type="button" disabled={!cost.ok || saving} onClick={() => void save()}>{saving ? 'Saving…' : 'Save comparison'}</button> : <SignUpIntent><button className="primary-button" type="button" disabled={!cost.ok}>Create account to save</button></SignUpIntent>}</div>
        {message ? <p className="calculator-save-message" role="status">{message}</p> : null}
      </section>
    </div>
    <section className="calculator-methodology-panel" aria-label="Vehicle method and limits"><article><p className="eyebrow">What is included</p><p>Buy net cost = down payment + payments paid + remaining loan − resale. Lease cost = upfront costs + payments through the same date. Fixed-rate interest accrues monthly at APR / 12. Regular payments stop when the loan is repaid.</p><a href="https://consumer.ftc.gov/articles/financing-or-leasing-car" target="_blank" rel="noreferrer">FTC: financing or leasing a car</a></article><article><p className="eyebrow">What to check separately</p><p>No automatic taxes, insurance, maintenance, mileage/wear, termination charges or opportunity cost. Include taxes/fees in the agreed prices if applicable and use net resale after selling costs. Continuation is an assumption, not a renewal offer.</p><p>Amounts up to one trillion; APR 0–100%; whole-month durations up to 100 years. Estimates for comparison, not advice. Terms remain on this page until you explicitly save or export; they are not added to analytics or share URLs.</p></article></section>
    <section className="calculator-input-panel dated-history" aria-label="Saved vehicle comparisons"><h2>Revisit a saved comparison</h2>{history.length ? history.map(saved => <article key={saved.id}><p><strong>{saved.result.modelVersion === 'vehicle-cost-v1' ? 'Saved net-cost snapshot' : 'Earlier approximation'}</strong> · {saved.currency} · {new Date(saved.createdAt).toLocaleDateString()}</p><p>{saved.result.narrative}</p><dl>{saved.result.metrics.map((m,i) => <div key={i}><dt>{m.label}</dt><dd>{m.valueType === 'currency' ? new Intl.NumberFormat(resolveMoneyLocale(saved.currency),{style:'currency',currency:saved.currency}).format(m.value) : m.valueType === 'percent' ? `${m.value*100}%` : String(m.value)}</dd></div>)}</dl><button className="secondary-button" type="button" onClick={() => {load(saved.inputValues,'Restored terms');setCurrency(saved.currency);setMessage('Saved inputs loaded. Earlier approximations need explicit resale and lease-period inputs. The original snapshot is unchanged; save explicitly to keep a new comparison.');revealResult();}}>Load saved inputs</button></article>) : <p>No saved vehicle comparisons yet. Save a complete comparison to revisit your assumptions.</p>}</section>
    <p><a href="/calculators/auto-loan">Check an auto loan</a> · <a href="/calculators">Explore all calculators</a></p>
  </section>;
}
function VehicleCostVisual({cost:c,format}:{cost:Extract<VehicleCost,{ok:true}>;format:(n:number)=>string}) {
  const min=Math.min(0,c.buyCost,c.leaseCost),max=Math.max(0,c.buyCost,c.leaseCost),span=max-min||1;
  const covered=Math.min(c.resale,c.remainingLoan),left=Math.max(0,c.equity),shortfall=Math.max(0,-c.equity),scale=Math.max(c.resale,c.remainingLoan,1);
  return <>
    <figure className="vehicle-cost-visual"><figcaption><strong>Net cost over {c.months} months</strong><span>Same currency and horizon. Bars start at zero; negative cost extends left.</span></figcaption><div role="img" aria-label={`Buy net cost ${format(c.buyCost)}; lease cost ${format(c.leaseCost)} at ${c.months} months`}>{[['Buy',c.buyCost],['Lease',c.leaseCost]].map(([name,value]) => <div className="vehicle-cost-row" key={name}><span>{name}: <strong>{format(Number(value))}</strong></span><div className="vehicle-cost-track"><i className="vehicle-zero" style={{left:`${-min/span*100}%`}}/><b className={name === 'Buy' ? 'vehicle-buy-bar' : 'vehicle-lease-bar'} style={{left:`${(Math.min(0,Number(value))-min)/span*100}%`,width:`${Math.abs(Number(value))/span*100}%`}}/></div></div>)}</div></figure>
    <figure className="vehicle-equity-visual"><figcaption><strong>What the sale leaves you</strong><span>Resale {format(c.resale)} − remaining loan {format(c.remainingLoan)} = equity {format(c.equity)}</span></figcaption><div className="vehicle-equity-track" role="img" aria-label={`Loan covered by resale ${format(covered)}; equity left ${format(left)}; shortfall ${format(shortfall)}`}><span className="vehicle-equity-covered" style={{width:`${covered/scale*100}%`}}/><span className="vehicle-equity-left" style={{width:`${left/scale*100}%`}}/><span className="vehicle-equity-shortfall" style={{width:`${shortfall/scale*100}%`}}/></div><p>Loan covered: {format(covered)} · Equity left: {format(left)} · Shortfall: {format(shortfall)}</p></figure>
  </>;
}
