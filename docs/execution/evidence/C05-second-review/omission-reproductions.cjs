const fs=require('fs');
const {evaluateC05Results}=require('../C05/verify_hosted_c05.cjs');
const original=JSON.parse(fs.readFileSync(require.resolve('../C05/hosted-browser.json'),'utf8'));
for(const mode of ['zoomWithoutObservations','contrastWithoutPairs']) {
 const packet=structuredClone(original);
 const zoom=packet.cases.find(c=>c.id==='native-zoom-200');
 Object.assign(zoom,{status:'PASS',pass:true});delete zoom.reason;
 if(mode==='contrastWithoutPairs') delete packet.cases.find(c=>c.id==='contrast-check').pairs;
 console.log(JSON.stringify({mode,result:evaluateC05Results(packet)}));
}
