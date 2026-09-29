import {writeFileSync} from 'node:fs';
import {chromium} from '/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844}});const checks=[];
try {
 for(const component of ['accounts','transactions']) for(const state of ['empty','loading','failure','stale','long-value']) {
  await page.goto(`http://127.0.0.1:4173/fixtures.html?component=${component}&state=${state}&theme=light`);
  await page.waitForSelector('.fixture-render-surface');
  const observation=await page.locator('.fixture-render-surface').evaluate(el=>({text:el.textContent,overflow:document.documentElement.scrollWidth>innerWidth+1,controls:el.querySelectorAll('input,button,select').length}));
  const expected=state==='failure'?/Synthetic Error: Connection/.test(observation.text):state==='loading'?/loading/i.test(observation.text):state==='empty'?/no accounts|no transactions|add.*account|no rows/i.test(observation.text):observation.controls>0;
  checks.push({component,state,expected_state_visible:expected,no_page_overflow:!observation.overflow,control_count:observation.controls,passed:expected&&!observation.overflow});
 }
}finally{await browser.close();}
const report={candidate:'a95053b19108634656aef491e46b9be9fe3ea57d',scope:'Local B25 state renders; does not prove hosted recovery or mutation',checks,passed:checks.every(c=>c.passed)};
writeFileSync('docs/execution/evidence/C08/primary-local-states.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));if(!report.passed)process.exitCode=1;
