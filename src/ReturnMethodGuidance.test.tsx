import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary } from './CalculatorLibrary';
import { buildCalculatorScenarios } from './lib/calculatorStudios';
import { seoCalculators } from './lib/seoCalculators';
import type { AuthState } from './auth';

const auth: AuthState = {provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY'],user:null};
function page(slug: string) {
 const container = document.createElement('div');
 container.innerHTML = renderToStaticMarkup(<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={() => {}} onSaveResult={async () => ({destinationRoute:'/plans',message:'',savedResultId:'synthetic'})} savedResults={[]}/>);
 return container;
}
describe('endpoint return suitability', () => {
 it.each(['investment-return', 'cagr'])('explains the cash-flow limitation before inputs on %s and provides a native empty-dated link', slug => {
  const container = page(slug);
  const panel = container.querySelector('.calculator-input-panel')!;
  const notice = panel.querySelector('[aria-label="Choose a return method"]');
  expect(notice).not.toBeNull();
  expect(notice?.textContent).toContain('no deposits or withdrawals in between');
  expect(notice!.compareDocumentPosition(panel.querySelector('input')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  const link = notice?.querySelector('a')!;
  expect(link.getAttribute('href')).toBe('/calculators/xirr?returnMode=dated');
  expect(link.textContent).toContain('Use dated cash flows');
  expect(link.hasAttribute('target')).toBe(false);
  expect([...new URL(link.href).searchParams.keys()]).toEqual(['returnMode']);
 });
 it('does not add irrelevant return guidance to a mortgage', () => {
  expect(page('mortgage').querySelector('[aria-label="Choose a return method"]')).toBeNull();
 });
});


describe('truthful endpoint sensitivities and scope', () => {
 it.each(['investment-return','cagr'])('uses neutral cases without changing legacy IDs, inputs or results on %s', slug => {
  const calculator = seoCalculators.find(c => c.slug === slug)!;
  const scenarios = buildCalculatorScenarios(calculator, {initial:10000,final:18000,years:5});
  expect(scenarios.map(s => s.id)).toEqual(['conservative','base','optimistic']);
  expect(scenarios.map(s => s.label)).toEqual(['Case A','Your inputs','Case B']);
  expect(scenarios.map(s => s.values)).toEqual([{initial:10000,final:16560,years:4},{initial:10000,final:18000,years:5},{initial:10000,final:19440,years:6}]);
  expect(scenarios[0].description).toContain('not a performance forecast');
  expect(scenarios[0].result.metrics[0].value).toBeCloseTo(0.13439703603792662, 12);
  expect(scenarios[1].result.metrics[0].value).toBeCloseTo(0.1247461131420948, 12);
  expect(scenarios[2].result.metrics[0].value).toBeCloseTo(0.11716171337507914, 12);
  const text = page(slug).textContent!;
  expect(text).toContain('No intermediate deposits or withdrawals are included');
  expect(text).toContain('Fees, taxes and inflation are not adjusted automatically');
  expect(text).not.toContain('unless already reflected');
  expect(text).not.toContain('after time, cashflows, costs, and inflation are considered');
 });
 it('keeps ordinary mortgage scenarios intact', () => {
  const calculator = seoCalculators.find(c => c.slug === 'mortgage')!;
  const values = Object.fromEntries(calculator.inputs.map(i => [i.key,i.defaultValue]));
  expect(buildCalculatorScenarios(calculator,values).map(s => s.label)).toEqual(['Conservative','Base','Optimistic']);
 });
});
