import {writeFileSync} from 'node:fs';
import {chromium} from '/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {calculateContrast} from './run_c08_proofs.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const report={candidate:'a95053b19108634656aef491e46b9be9fe3ea57d',scope:'Local guarded fixture only; simulated commit503/retry, no hosted requests',contrasts:[]};
try{
 for(const theme of ['light','dark']){
  await page.goto(`http://127.0.0.1:4173/fixtures.html?component=accounts&state=stale&theme=${theme}`);
  const badge=page.locator('.account-stale-badge').first();await badge.waitFor();
  const colors=await badge.evaluate(el=>{
   const parse=s=>{const m=s.match(/rgba?\(([^)]+)\)/);if(!m)throw Error('Unsupported actual color '+s);const n=m[1].split(',').map(Number);return[n[0],n[1],n[2],n[3]??1];};
   const layers=[];for(let n=el;n;n=n.parentElement){const c=getComputedStyle(n);layers.unshift({background:c.backgroundColor,image:c.backgroundImage});}
   if(layers.some(l=>l.image!=='none'))throw Error('Gradient requires separate pixel contrast measurement');
   let bg=[255,255,255];for(const l of layers){const c=parse(l.background);bg=bg.map((v,i)=>c[i]*c[3]+v*(1-c[3]));}
   return {foreground:getComputedStyle(el).color,background:`rgb(${bg.map(Math.round).join(',')})`,layers};
  });report.contrasts.push({theme,...colors,ratio:calculateContrast(colors.foreground,colors.background)});
 }
 await page.goto('http://127.0.0.1:4173/fixtures.html?component=transactions&state=populated&theme=light');
 await page.evaluate(()=>{const original=window.fetch;window.__commitAttempts=0;window.fetch=async(input,init)=>{const url=String(input);if(url.includes('/api/imports/transactions/commit')&&++window.__commitAttempts===1)return new Response(JSON.stringify({error:'Synthetic commit unavailable'}),{status:503,headers:{'Content-Type':'application/json'}});return original(input,init);};});
 const select=page.getByRole('button',{name:'Select CSV'});await select.scrollIntoViewIfNeeded();
 // Establish focus from body, then reach file-selection action using Tab only.
 await page.locator('body').click({position:{x:2,y:2}});let reached=false;
 for(let i=0;i<65;i++){await page.keyboard.press('Tab');if(await select.evaluate(el=>document.activeElement===el)){reached=true;break;}}
 if(!reached)throw Error('CSV action not keyboard reachable');
 const chooserPromise=page.waitForEvent('filechooser');await page.keyboard.press('Enter');const chooser=await chooserPromise;
 await chooser.setFiles({name:'review.csv',mimeType:'text/csv',buffer:Buffer.from('transaction_date,description,amount,type,category,account,notes\n2026-09-01,Synthetic groceries,12.34,expense,Food,Chase Checking,Synthetic\n')});
 const commit=page.getByRole('button',{name:/Import \d+ transactions?/});await commit.waitFor();
 report.no_auto_commit=await page.evaluate(()=>window.__commitAttempts===0);
 let commitReached=false;for(let i=0;i<30;i++){await page.keyboard.press('Tab');if(await commit.evaluate(el=>document.activeElement===el)){commitReached=true;break;}}
 if(!commitReached)throw Error('Import confirmation not keyboard reachable');
 await page.keyboard.press('Enter');await page.getByText('Synthetic commit unavailable',{exact:true}).waitFor();
 report.failure_retains_confirmation=await commit.isEnabled();report.failure_attempts=await page.evaluate(()=>window.__commitAttempts);
 // Native date inputs expose multiple keyboard stops per DOM element.
 const retryTabBound=4*(await page.locator('button,input,select,textarea,a[href],[tabindex]').count())+2;
 report.retryFocus=[];
 for(let i=0;i<retryTabBound && !(await commit.evaluate(el=>document.activeElement===el));i++){await page.keyboard.press('Tab');report.retryFocus.push(await page.evaluate(()=>({tag:document.activeElement?.tagName,text:document.activeElement?.textContent?.slice(0,70),type:document.activeElement?.getAttribute('type')})));}
 if(!(await commit.evaluate(el=>document.activeElement===el)))throw Error('Retry action not keyboard reachable');
 await page.keyboard.press('Enter');await page.getByText(/transactions imported from .*Account balances were not changed/).waitFor();
 report.retry_tab_steps=report.retryFocus.length;delete report.retryFocus;report.retry_attempts=await page.evaluate(()=>window.__commitAttempts);report.keyboard_file_selection=true;report.keyboard_confirmation=true;
 report.passed=report.contrasts.every(c=>c.ratio>=4.5)&&report.no_auto_commit&&report.failure_retains_confirmation&&report.failure_attempts===1&&report.retry_attempts===2;
}catch(e){report.passed=false;report.error=e.message;report.lastCommitAttempts=await page.evaluate(()=>window.__commitAttempts).catch(()=>null);}finally{await browser.close();}
writeFileSync('docs/execution/evidence/C08/primary-local-import.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
