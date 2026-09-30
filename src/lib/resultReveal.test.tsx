import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { revealResultIfNeeded } from './resultReveal';
import { CalculatorLibrary } from '../CalculatorLibrary';
import App from '../App';
import type { AuthState } from '../auth';
// @ts-expect-error React act environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
vi.mock('@clerk/react', () => ({ SignUpButton: ({children}:{children:React.ReactNode}) => <>{children}</>, SignInButton: ({children}:{children:React.ReactNode}) => <>{children}</>, UserButton:()=>null, SignOutButton:({children}:{children:React.ReactNode})=><>{children}</> }));
const auth: AuthState={provider:'clerk',status:'not-configured',isConfigured:false,isSignedIn:false,user:null,missingEnv:['VITE_CLERK_PUBLISHABLE_KEY']};
let root:Root|undefined; let node:HTMLDivElement; let scroll:ReturnType<typeof vi.fn>;let visible=false;
const box=(top:number,bottom:number)=>({top,bottom,left:0,right:300,width:300,height:bottom-top,x:0,y:top,toJSON:()=>({})}) as DOMRect;
beforeEach(()=>{
  visible=false;scroll=vi.fn();vi.stubGlobal('scrollTo',vi.fn());
  Object.defineProperty(HTMLElement.prototype,'scrollIntoView',{configurable:true,value:scroll});
  vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){return this.matches('.topbar')?box(0,64):this.matches('.calculator-result-metric-primary,.compound-headline,.hero-result > strong')?box(visible?100:1600,visible?180:1680):box(0,40);});
  window.matchMedia=vi.fn().mockImplementation(()=>({matches:false,addEventListener:()=>{},removeEventListener:()=>{}}));
});
afterEach(()=>{if(root)act(()=>root!.unmount());root=undefined;node?.remove();localStorage.clear();vi.restoreAllMocks();vi.unstubAllGlobals();});
function render(slug:string){window.history.replaceState({},'',`/calculators/${slug}`);node=document.createElement('div');document.body.appendChild(node);root=createRoot(node);act(()=>root!.render(slug==='fire'?<App auth={auth}/>:<CalculatorLibrary auth={auth} route={`/calculators/${slug}`} onNavigate={()=>{}} onSaveResult={async()=>({destinationRoute:'/plans',message:'Saved',savedResultId:'synthetic'})} savedResults={[]}/>));return node;}
function edit(key:string,value:string){const el=node.querySelector<HTMLInputElement>(key)!;act(()=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));});}
function button(text:string){return [...node.querySelectorAll('button')].find(b=>b.textContent?.trim()===text)!;}
describe('explicit result reveal',()=>{
  it('does nothing for a missing result',()=>{expect(()=>revealResultIfNeeded(null)).not.toThrow();expect(scroll).not.toHaveBeenCalled();});
  it('preserves scroll and focus when the main answer is already visible',()=>{visible=true;const c=render('mortgage');act(()=>button('View result').click());expect(scroll).not.toHaveBeenCalled();expect(document.activeElement).not.toBe(c.querySelector('.calculator-result-panel'));});
  it('uses the FIRE headline visibility rather than the entire long result card',()=>{visible=true;const c=render('fire');edit('#fire-return','0');edit('#fire-inflation','0');act(()=>button('Calculate').click());expect(c.querySelector('.hero-result > strong')?.textContent).toBe('$2,400,000');expect(scroll).not.toHaveBeenCalled();});
  it('does not jump during an input edit, then reveals the committed generic answer on explicit request',()=>{const c=render('mortgage');edit('[name="principal"]','225000');expect(scroll).not.toHaveBeenCalled();act(()=>button('View result').click());expect(scroll).toHaveBeenCalledTimes(1);expect(document.activeElement).toBe(c.querySelector('.calculator-result-panel'));});
  it('blocks result navigation while inputs are invalid',()=>{render('mortgage');edit('[name="principal"]','');expect(button('View result').disabled).toBe(true);act(()=>button('View result').click());expect(scroll).not.toHaveBeenCalled();});
  it('reveals the newly mounted FIRE result only after a valid Calculate',()=>{const c=render('fire');expect(c.querySelector('.hero-result')).toBeNull();edit('#fire-return','0');edit('#fire-inflation','0');expect(scroll).not.toHaveBeenCalled();act(()=>button('Calculate').click());expect(document.activeElement).toBe(c.querySelector('.hero-result'));expect(scroll).toHaveBeenCalledTimes(1);expect(c.querySelector('.hero-result > strong')?.textContent).toBe('$2,400,000');});
  it.each(['compound-interest','savings-goal','budget','emergency-fund','net-worth'])('reveals the actual %s answer from the input-panel result action',slug=>{const c=render(slug);act(()=>button('View result').click());expect(document.activeElement).toBe(c.querySelector('.calculator-result-panel'));expect(scroll).toHaveBeenCalledTimes(1);});
  it.each(['compound-interest','savings-goal'])('reveals the committed %s scenario answer',slug=>{const c=render(slug);const before=c.querySelector('.compound-headline > strong')?.textContent;act(()=>c.querySelector<HTMLInputElement>('input[type=radio]')!.click());expect(c.querySelector('.compound-headline > strong')?.textContent).not.toBe(before);expect(document.activeElement).toBe(c.querySelector('.calculator-result-panel'));expect(scroll).toHaveBeenCalledTimes(1);});
  it('reveals a generic scenario selection but does not jump on page load',()=>{const c=render('mortgage');expect(scroll).not.toHaveBeenCalled();act(()=>c.querySelector<HTMLButtonElement>('[role="tab"]')!.click());expect(scroll).toHaveBeenCalledTimes(1);});
});
