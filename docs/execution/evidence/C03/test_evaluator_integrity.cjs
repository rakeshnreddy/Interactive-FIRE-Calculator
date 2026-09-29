const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'c03-integrity-'));
const {evaluateResults}=require(process.cwd()+'/docs/execution/evidence/C03/c03_evaluator.cjs');
const submitted=require(process.cwd()+'/docs/execution/evidence/C03/verification-report.json');
const cases=[
 ['duplicate layout', p=>p.matrix[1]=p.matrix[0], 'responsive_layout_matrix'],
 ['missing auth fixture replaced by duplicate', p=>p.interactions[p.interactions.length-1]=p.interactions[0], 'browser_interactions'],
 ['missing amortization replaced by duplicate', p=>p.copy[3]=p.copy[0], 'copy_inspection'],
 ['missing contrast target replaced by duplicate', p=>p.contrastPairs[1]=p.contrastPairs[0], 'composed_contrast'],
 ['nonfinite contrast', p=>p.contrastPairs[0].ratio=NaN, 'composed_contrast'],
 ['missing CTA bounds', p=>{let c=p.matrix.find(c=>c.route==='/'&&c.width===390);delete c.cta[0].bottom;}, 'responsive_layout_matrix'],
 ['print unreadable despite pass flag', p=>p.print.readableText=false, 'print_output'],
 ['duplicate print filename', p=>p.print.pdfs[1]=p.print.pdfs[0], 'print_output']
];
let failed=0;
for(const [name,mutate,id] of cases){const p=structuredClone(submitted);mutate(p);try{assert.notEqual(evaluateResults(p).checks[id].status,'PASS');
const fixture=path.join(tmp, 'fixture.json');fs.writeFileSync(fixture, JSON.stringify(p));
const run=spawnSync(process.execPath, [path.join(__dirname, 'verify_c03_evidence.cjs'), '--eval-file', fixture], {encoding:'utf8'});
assert.equal(run.status, 1, run.stderr);
const saved=JSON.parse(fs.readFileSync(fixture+'.evaluated.json'));
assert.equal(saved.evaluated.checks[id].status,'FAIL');
assert.equal(saved.evaluated.exitCode,run.status);
console.log('PASS',name);}catch{console.log('FAIL',name);failed++;}}
fs.rmSync(tmp, {recursive:true, force:true});
process.exitCode=failed?1:0;
