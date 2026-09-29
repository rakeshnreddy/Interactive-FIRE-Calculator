// Requires Playwright, pypdf and a running site; uses only local/free tooling.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {chromium} = require(process.env.FINPATH_PLAYWRIGHT || 'playwright');
const base = process.env.FINPATH_BASE_URL || 'http://127.0.0.1:4174';
const out = path.resolve(process.env.FINPATH_PRINT_OUTPUT || '/tmp/finpath-print');
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 const results=[];
 try {
  for(const theme of ['light','dark']) for(const backgrounds of [true,false]) {
   const page=await browser.newPage();
   try {
    await page.goto(base);await page.locator('h1').waitFor();
    await page.evaluate(theme=>document.querySelector('.app').dataset.mode=theme,theme);
    await page.evaluate(()=>document.fonts.ready);
    const file=path.join(out,`${theme}-${backgrounds?'bg':'nobg'}.pdf`);
    await page.pdf({path:file,format:'A4',printBackground:backgrounds});
    const read=spawnSync(process.env.FINPATH_PDF_PYTHON || 'python3',['-c',
     'import json,sys; from pypdf import PdfReader; print(json.dumps([p.extract_text() for p in PdfReader(sys.argv[1]).pages]))',file],{encoding:'utf8'});
    assert.equal(read.status,0,read.stderr);
    const pages=JSON.parse(read.stdout);
    assert.match(pages[0],/See when you could retire\./,'First printed page must contain the retirement question');
    assert.match(pages.join('\n'),/965,931/,'Printed example must retain modeled target');
    assert.match(pages.join('\n'),/Modeled end balance/,'Printed example must retain the outcome');
    for(const text of pages){assert.ok(text.trim().length>80,'No empty content pages');assert.doesNotMatch(text,/Skip to content|Sign in/,'Do not print screen-only controls');}
    results.push({theme,backgrounds,file,pages:pages.length,firstPageContainsHero:true,screenControlsOmitted:true,pass:true});
   }finally{await page.close();}
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,'result.json'),JSON.stringify(results,null,2));}
 console.log(`PASS: ${results.length} real PDF variants; first-page content, outcome and control omission verified. Visual page inspection remains separate.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
