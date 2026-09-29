const {test}=require('node:test');const assert=require('node:assert/strict');
const {evaluateRenderedExpectation:check}=require('../C06/rendered-expectations.cjs');
test('loading requires actual content',()=>assert.equal(check('dashboard','loading','').matchedStateExpectation,false));
test('unknown combination cannot pass',()=>assert.equal(check('unknown','unknown','').matchedStateExpectation,false));
test('populated name alone cannot prove stale',()=>assert.equal(check('goals','stale','Emergency Buffer').matchedStateExpectation,false));
test('observed loading content accepted',()=>assert.equal(check('dashboard','loading','Loading account data').matchedStateExpectation,true));
