const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evaluateCase,evaluateSuite,calculateContrastRatio}=require('../C06/evaluator.cjs');
const valid=()=>({id:'dashboard-desktop-light',domain:'dashboard',theme:'light',state:'populated',screenshot:'sample.png',screenshotExists:true,screenshotSizeBytes:100,themeInfo:{rootDataMode:'light',shellDataMode:'light',bgColor:'rgb(244, 248, 251)',textColor:'rgb(32, 58, 67)'},geometry:{viewportWidth:1440,documentScrollWidth:1440},consoleErrors:[],pageErrors:[],contrast:{tested:true,ratio:8,fgColor:'rgb(32, 58, 67)',bgColor:'rgb(244, 248, 251)',minRequired:4.5,codeRatio:8},renderedContent:{matchedStateExpectation:true,detail:'Observed dashboard amounts'}});
for(const [name,change] of [
 ['missing contrast',c=>delete c.contrast],['NaN contrast',c=>c.contrast.ratio=NaN],
 ['missing rendered state',c=>delete c.renderedContent],['missing geometry widths',c=>c.geometry={}],
 ['missing screenshot size',c=>delete c.screenshotSizeBytes],['low debug contrast',c=>c.contrast.codeRatio=1],
 ['native flag without level or proof',c=>c.zoomCheck={requestedLevel:2,appliedViaAppChrome:true}],
 ['missing keyboard observation',c=>{c.id='keyboard-focus-accounts';}],
 ['missing media observation',c=>{c.id='reduced-transparency-dashboard-dark';}],
 ['missing theme colors',c=>delete c.themeInfo.bgColor]
]) test(name,()=>{const c=valid();change(c);assert.notEqual(evaluateCase(c).status,'PASS');});
test('empty suite rejected',()=>assert.equal(evaluateSuite([]).allPassed,false));
test('duplicate cases rejected',()=>assert.equal(evaluateSuite([valid(),valid()]).allPassed,false));
test('transparent color cannot be treated as opaque black',()=>assert.ok(!Number.isFinite(calculateContrastRatio('rgba(0, 0, 0, 0)','rgb(255, 255, 255)'))));
test('unknown color rejected',()=>assert.ok(!Number.isFinite(calculateContrastRatio('missing','rgb(255, 255, 255)'))));
test('complete ordinary observation still passes',()=>assert.equal(evaluateCase(valid()).status,'PASS'));
