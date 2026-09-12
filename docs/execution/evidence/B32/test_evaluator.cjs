const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { REQUIRED_CHECKS, evaluateResults, finalizeAndPersistReport } = require('./evaluator.cjs');

const TEST_OUT_DIR = path.join(__dirname, 'test_output');
if (!fs.existsSync(TEST_OUT_DIR)) {
  fs.mkdirSync(TEST_OUT_DIR, { recursive: true });
}

function createPassingFixture() {
  const checks = {};
  for (const id of REQUIRED_CHECKS) {
    checks[id] = { status: 'PASS', details: `${id} passed cleanly` };
  }
  return {
    checks,
    telemetryComplete: true,
    recordedConsoleErrors: [],
    recordedPageExceptions: [],
    validationFailures: [],
    performanceComparison: {
      verdict: {
        fcpRegressed: false,
        loadRegressed: false,
        fpsRegressed: false,
        acceptable: true
      }
    }
  };
}

let passedTests = 0;
let totalTests = 0;

function runTest(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`✗ ${name}:`, err.message);
    throw err;
  }
}

// 1. All required checks pass -> exit 0
runTest('All required checks pass: exit 0, status PASS', () => {
  const fixture = createPassingFixture();
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'PASS');
  assert.strictEqual(res.exitCode, 0);
  assert.strictEqual(res.failures.length, 0);
  assert.strictEqual(res.blocked.length, 0);
});

// 2. False journey -> nonzero (1), status FAIL
runTest('One false journey: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.checks.journey_execution = { status: 'FAIL', details: 'Journey /calculators/fire step 2 failed' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('journey_execution')));
});

// 3. Failed fallback -> nonzero (1), status FAIL
runTest('Failed fallback: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.checks.material_fallbacks = { status: 'FAIL', details: 'Forced colors topbar failed' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('material_fallbacks')));
});

// 4. Overflow/clipping -> nonzero (1), status FAIL
runTest('Overflow/clipping finding: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.checks.clipping_inspection = { status: 'FAIL', details: 'Element .primary-button clipped offscreen at 320px' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('clipping_inspection')));
});

// 5. Low contrast -> nonzero (1), status FAIL
runTest('Low contrast: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.checks.composited_contrast = { status: 'FAIL', details: 'Hero H1 contrast 3.2:1 below 4.5:1' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('composited_contrast')));
});

// 6. Console error -> nonzero (1), status FAIL
runTest('Console error: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.recordedConsoleErrors = [{ text: 'TypeError: Cannot read properties of undefined' }];
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.strictEqual(res.checks.console_cleanliness.status, 'FAIL');
  assert.ok(res.failures.some(f => f.includes('console_cleanliness')));
});

// 7. Page exception -> nonzero (1), status FAIL
runTest('Page exception: nonzero and exact failing check', () => {
  const fixture = createPassingFixture();
  fixture.recordedPageExceptions = ['Uncaught Error: React render failure'];
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.strictEqual(res.checks.page_cleanliness.status, 'FAIL');
  assert.ok(res.failures.some(f => f.includes('page_cleanliness')));
});

// 8. Performance regression -> nonzero (1), status FAIL
runTest('Performance regression: nonzero and exact failing check (acceptance derived)', () => {
  const fixture = createPassingFixture();
  fixture.performanceComparison.verdict.fcpRegressed = true;
  const res = evaluateResults(fixture);
  assert.strictEqual(fixture.performanceComparison.verdict.acceptable, false, 'Acceptance must be derived false');
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.strictEqual(res.checks.comparative_performance.status, 'FAIL');
  assert.ok(res.failures.some(f => f.includes('comparative_performance')));
});

// 9. Missing required check -> nonzero (2), status BLOCKED
runTest('Missing required check: nonzero and BLOCKED summary', () => {
  const fixture = createPassingFixture();
  delete fixture.checks.print_legibility; // omit required check
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.strictEqual(res.checks.print_legibility.status, 'BLOCKED');
  assert.ok(res.blocked.some(b => b.includes('Missing required check: print_legibility')));
});

// 10. Blocked reader or native zoom -> nonzero (2), status BLOCKED
runTest('Blocked reader or native zoom: nonzero and BLOCKED summary', () => {
  const fixture = createPassingFixture();
  fixture.checks.screen_reader = { status: 'BLOCKED', details: 'VoiceOver requires reviewer assistance' };
  fixture.checks.native_zoom = { status: 'BLOCKED', details: 'Native 200% browser UI zoom requires reviewer assistance' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.ok(res.deferred.some(b => b.id === 'screen_reader'));
  assert.ok(res.blocked.some(b => b.includes('native_zoom')));
});

// 11. Page exception recorded late -> included in saved JSON as well as final status
runTest('Page exception recorded late: included in saved JSON and final status', () => {
  const fixture = createPassingFixture();
  const testFile = path.join(TEST_OUT_DIR, 'late_exception.json');
  
  // Simulate late-recorded exception before finalizeAndPersistReport
  fixture.recordedPageExceptions.push('Late asynchronous unhandled rejection');
  const res = finalizeAndPersistReport(fixture, testFile);
  
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(fs.existsSync(testFile));
  const savedData = JSON.parse(fs.readFileSync(testFile, 'utf8'));
  assert.strictEqual(savedData.evaluated.overallStatus, 'FAIL');
  assert.strictEqual(savedData.evaluated.exitCode, 1);
  assert.ok(savedData.evaluated.failures.some(f => f.includes('Late asynchronous unhandled rejection')));
  fs.unlinkSync(testFile);
});


// CLI integration tests verifying process exit code
const { execSync } = require('child_process');

runTest('CLI execution with passing fixture exits 0', () => {
  const fixture = createPassingFixture();
  const testFile = path.join(TEST_OUT_DIR, 'cli_pass.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  const output = execSync(`node -e "const { finalizeAndPersistReport } = require('./docs/execution/evidence/B32/evaluator.cjs'); const data = JSON.parse(require('fs').readFileSync('${testFile}')); const ev = finalizeAndPersistReport(data, '${testFile}'); process.exit(ev.exitCode);"`, { stdio: 'pipe' });
  fs.unlinkSync(testFile);
});

runTest('CLI execution with failing fixture exits 1', () => {
  const fixture = createPassingFixture();
  fixture.checks.composited_contrast = { status: 'FAIL', details: 'Low contrast' };
  const testFile = path.join(TEST_OUT_DIR, 'cli_fail.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node -e "const { finalizeAndPersistReport } = require('./docs/execution/evidence/B32/evaluator.cjs'); const data = JSON.parse(require('fs').readFileSync('${testFile}')); const ev = finalizeAndPersistReport(data, '${testFile}'); process.exit(ev.exitCode);"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  fs.unlinkSync(testFile);
  assert.strictEqual(exitedCode, 1, 'Failing check must exit 1');
});

runTest('CLI execution with blocked fixture exits 2', () => {
  const fixture = createPassingFixture();
  fixture.checks.native_zoom = { status: 'BLOCKED', details: 'Reviewer assistance requested' };
  const testFile = path.join(TEST_OUT_DIR, 'cli_blocked.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node -e "const { finalizeAndPersistReport } = require('./docs/execution/evidence/B32/evaluator.cjs'); const data = JSON.parse(require('fs').readFileSync('${testFile}')); const ev = finalizeAndPersistReport(data, '${testFile}'); process.exit(ev.exitCode);"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  fs.unlinkSync(testFile);
  assert.strictEqual(exitedCode, 2, 'Blocked check must exit 2');
});


for (const field of ['recordedConsoleErrors', 'recordedPageExceptions']) {
  for (const value of [undefined, null, {}, '']) {
    runTest(`Missing or malformed ${field} is blocked`, () => {
      const fixture = createPassingFixture();
      fixture[field] = value;
      const res = evaluateResults(fixture);
      assert.strictEqual(res.overallStatus, 'BLOCKED');
      assert.strictEqual(res.exitCode, 2);
    });
  }
}
runTest('Uncompleted telemetry collection cannot pass', () => {
  const fixture = createPassingFixture();
  delete fixture.telemetryComplete;
  assert.strictEqual(evaluateResults(fixture).overallStatus, 'BLOCKED');
});
for (const verdict of [undefined, {}, { fcpRegressed: false }, { fcpRegressed: null, loadRegressed: false, fpsRegressed: false }]) {
  runTest('Incomplete performance evidence blocks acceptance', () => {
    const fixture = createPassingFixture();
    fixture.performanceComparison.verdict = verdict;
    assert.strictEqual(evaluateResults(fixture).overallStatus, 'BLOCKED');
  });
}
runTest('Owner-deferred reader remains visible without blocking C01T', () => {
  const fixture = createPassingFixture();
  fixture.checks.screen_reader = { status: 'BLOCKED' };
  const res = evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'PASS');
  assert.ok(res.deferred.some(x => x.id === 'screen_reader' && x.status === 'DEFERRED'));
});

console.log(`\n=== ALL ${passedTests}/${totalTests} EVALUATOR TESTS PASSED ===`);
