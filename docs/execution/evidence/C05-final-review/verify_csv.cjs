const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});const records=[];
 try {for(const mode of ['FIRE number','Withdrawal']){
 const page=await browser.newPage();await page.goto('https://46714a3f.interactive-fire-calculator.pages.dev/calculators/fire');await page.locator('.core-fire-form').waitFor();
 await page.locator('.core-fire-form').getByRole('button',{name:mode,exact:true}).click();
 await page.locator('.quick-actions .primary-button').click();
 const resultsTab=()=>page.locator('.result-tabs-panel').getByRole('tab',{name:'Results',exact:true});
 const inputsTab=()=>page.locator('.result-tabs-panel').getByRole('tab',{name:'Inputs',exact:true});
 async function readCsv(){await resultsTab().click();const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'Export CSV',exact:true}).click()]);const stream=await download.createReadStream();let chunks=[];for await(const chunk of stream)chunks.push(chunk);return Buffer.concat(chunks).toString('utf8');}
 const baseline=await readCsv();assert.equal(await page.locator('#results .pill').innerText(),'End-year');
 await inputsTab().click();const details=page.locator('details.advanced-shell');if(!await details.evaluate(e=>e.open))await details.locator(':scope > summary').click();await page.locator('.segmented').getByRole('button',{name:'Start',exact:true}).click();
 const stale=await readCsv();assert.equal(stale,baseline);assert.equal(await page.locator('#results .pill').innerText(),'End-year');assert.equal(await page.locator('.stale-result-badge').count(),1);
 await inputsTab().click();await page.locator('.quick-actions .primary-button').click();const recalculated=await readCsv();assert.notEqual(recalculated,baseline);assert.equal(await page.locator('#results .pill').innerText(),'Start-year');assert.equal(await page.locator('.stale-result-badge').count(),0);
 for(const csv of [baseline,recalculated]){const rows=csv.trim().split('\n');assert.equal(rows[0].split(',').length,11);assert.ok(rows.length>2);for(const row of rows.slice(1)){const values=row.split(',');assert.equal(values.length,11);for(const value of values.slice(1))assert.ok(Number.isFinite(Number(value)));}}
 const slug=mode==='Withdrawal'?'withdrawal':'fire-number';fs.writeFileSync(path.join(__dirname,`${slug}-baseline.csv`),baseline);fs.writeFileSync(path.join(__dirname,`${slug}-recalculated.csv`),recalculated);
 records.push({mode,staleCsvIdentical:true,recalculatedCsvChanged:true,timingLabelsMatch:true,rows:baseline.split('\n').length-1});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(__dirname,'csv-results.json'),JSON.stringify(records,null,2)+'\n');console.log('PASS both FIRE modes: CSV snapshot identity, changed recalculation, numeric rows and timing labels');
})().catch(e=>{console.error(e);process.exit(1)});
