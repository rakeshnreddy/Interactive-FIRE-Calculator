import { it, expect } from 'vitest';
import { hashCalculatorPayload, goalPayloadFromCalculator, parseCalculatorSavePayload } from '../../../../functions/_lib/calculatorResults';
it('demonstrates identical hashes despite order-dependent goal output', async () => {
 const raw={calculatorCategory:'Planning',calculatorRegion:'Global',calculatorSlug:'retirement',calculatorTitle:'Retirement',conversionLabel:'Create goal',conversionRoute:'/goals',currency:'USD',inputValues:{years:3},result:{assumptions:[],narrative:'Example',metrics:[{label:'A',value:100,valueType:'currency'},{label:'B',value:200,valueType:'currency'}]}};
 const a=parseCalculatorSavePayload(raw); const b=parseCalculatorSavePayload({...raw,result:{...raw.result,metrics:[...raw.result.metrics].reverse()}});
 if(!a.ok||!b.ok)throw Error('invalid fixture');
 expect(await hashCalculatorPayload(a.value)).toBe(await hashCalculatorPayload(b.value));
 expect(goalPayloadFromCalculator(a.value)?.targetAmountCents).toBe(10000);
 expect(goalPayloadFromCalculator(b.value)?.targetAmountCents).toBe(20000);
});
