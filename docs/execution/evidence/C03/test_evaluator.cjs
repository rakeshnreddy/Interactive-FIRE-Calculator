const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const TEST_OUT_DIR = path.join(__dirname, 'test_output');
if (!fs.existsSync(TEST_OUT_DIR)) {
  fs.mkdirSync(TEST_OUT_DIR, { recursive: true });
}

// Will require c03_evaluator once implemented
let c03Evaluator;
try {
  c03Evaluator = require('./c03_evaluator.cjs');
} catch (e) {
  // Expected to fail before implementation (TDD)
}

function createPassingFixture() {
  const routes = ['/', '/calculators', '/dashboard'];
  const widths = [320, 390, 612, 768, 1440];
  const modes = ['light', 'dark'];

  const matrix = [];
  for (const route of routes) {
    for (const width of widths) {
      for (const mode of modes) {
        matrix.push({
          route,
          width,
          mode,
          heading: 'See when you could retire.',
          h1Count: 1,
          h1: { x: 20, y: 100, width: 300, height: 50, right: 320, bottom: 150 },
          overflow: false,
          ctaCount: route === '/' ? 1 : 0,
          cta: route === '/' ? [{ x: 20, y: 300, width: 220, height: 48, right: 240, bottom: 348 }] : [],
          exampleCount: route === '/' ? 1 : 0,
          example: route === '/' ? [{ x: 20, y: 400, width: 350, height: 300, right: 370, bottom: 700 }] : [],
          metricTexts: ['$965,931', '$60,000/yr', '$0'],
          clipped: [],
          errors: [],
          pass: true
        });
      }
    }
  }

  const interactions = [
    { case: 'mixed-case trim FIRE', count: 'Interactive FIRE Calculator', pass: true },
    { case: 'no match', pass: true },
    { case: 'clear restoration', value: '', pathsCount: 4, pass: true },
    { case: 'keyboard FIRE navigation', url: 'http://127.0.0.1:4173/calculators/fire', pass: true },
    { case: 'auth public escape', url: 'http://127.0.0.1:4173/calculators', pass: true },
    { case: 'auth loading public escape', pass: true },
    { case: 'auth signed-out public escape', pass: true }
  ];

  const contrastPairs = [];
  const elements = [
    { id: 'heading', isLarge: true, ratio: 11.2 },
    { id: 'subtext', isLarge: false, ratio: 5.8 },
    { id: 'eyebrow', isLarge: false, ratio: 6.1 },
    { id: 'cta_primary', isLarge: false, ratio: 5.2 },
    { id: 'cta_secondary', isLarge: false, ratio: 8.5 },
    { id: 'metric_label', isLarge: false, ratio: 4.8 },
    { id: 'metric_value', isLarge: true, ratio: 11.2 },
    { id: 'chart_legend_label', isLarge: false, ratio: 11.2 },
    { id: 'chart_legend_end', isLarge: false, ratio: 4.8 },
    { id: 'chart_context', isLarge: false, ratio: 5.5 },
    { id: 'assumption_text', isLarge: false, ratio: 7.2 }
  ];

  for (const mode of ['light', 'dark']) {
    for (const el of elements) {
      contrastPairs.push({
        id: `contrast_${mode}_${el.id}`,
        element: el.id,
        mode,
        foreground: mode === 'light' ? 'rgb(16, 44, 53)' : 'rgb(234, 246, 247)',
        effectiveBackground: mode === 'light' ? 'rgb(244, 248, 251)' : 'rgb(8, 21, 28)',
        fontSize: el.isLarge ? '32px' : '14px',
        fontWeight: '600',
        opacity: 1,
        location: { x: 50, y: 100 },
        ratio: el.ratio,
        threshold: el.isLarge ? 3.0 : 4.5,
        pass: true
      });
    }
  }

  const mediaFallbacks = {
    reducedMotion: { matches: true, pass: true },
    reducedTransparency: {
      matches: true,
      pass: true,
      light: { topbarBackdrop: 'none', topbarBgOpaque: true, mobileNavBackdrop: 'none', mobileNavBgOpaque: true },
      dark: { topbarBackdrop: 'none', topbarBgOpaque: true, mobileNavBackdrop: 'none', mobileNavBgOpaque: true }
    },
    forcedColors: { matches: true, pass: true }
  };

  const print = {
    pdfs: ['print-light-bg.pdf', 'print-light-nobg.pdf', 'print-dark-bg.pdf', 'print-dark-nobg.pdf'],
    mediaOmitted: true,
    navOmitted: true,
    readableText: true,
    noClipping: true,
    pass: true
  };

  const copy = [
    { route: '/calculators/mortgage', clean: true, hasPhase: false, hasEnvLeak: false, hasInternalDirectives: false },
    { route: '/calculators/compound-interest', clean: true, hasPhase: false, hasEnvLeak: false, hasInternalDirectives: false },
    { route: '/calculators/debt-payoff', clean: true, hasPhase: false, hasEnvLeak: false, hasInternalDirectives: false },
    { route: '/calculators/amortization', clean: true, hasPhase: false, hasEnvLeak: false, hasInternalDirectives: false }
  ];

  const axTree = {
    hasChartFigure: true,
    hasEndBalance: true,
    hasModeledTarget: true,
    hasHorizon: true,
    pass: true
  };

  const nativeZoom = {
    status: 'PASS',
    details: 'Native browser zoom set to 200% via browser UI',
    overflow: false
  };

  const screenReader = {
    status: 'PASS',
    details: 'Screen reader audio smoke verified'
  };

  return {
    telemetryComplete: true,
    recordedConsoleErrors: [],
    recordedPageExceptions: [],
    matrix,
    interactions,
    contrastPairs,
    mediaFallbacks,
    print,
    copy,
    axTree,
    nativeZoom,
    screenReader
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

console.log('--- Starting C03 Evaluator & Negative Test Suite ---');

// 1. Valid complete packet succeeds (exit 0)
runTest('1. Valid complete packet succeeds: exit 0, status PASS', () => {
  const fixture = createPassingFixture();
  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'PASS');
  assert.strictEqual(res.exitCode, 0);
  assert.strictEqual(res.failures.length, 0);
  assert.strictEqual(res.blocked.length, 0);

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_valid.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, {
    encoding: 'utf8',
    stdio: 'pipe'
  });
  const savedReport = JSON.parse(fs.readFileSync(testFile + '.evaluated.json', 'utf8'));
  assert.strictEqual(savedReport.evaluated.overallStatus, 'PASS');
  assert.strictEqual(savedReport.evaluated.exitCode, 0);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 2. Reduced-transparency matches=false fails (exit 1)
runTest('2. Reduced-transparency matches=false fails: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  fixture.mediaFallbacks.reducedTransparency.matches = false;
  fixture.mediaFallbacks.reducedTransparency.pass = false;

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('reducedTransparency') || f.includes('reduced_transparency')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_reduced_transparency.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  const savedReport = JSON.parse(fs.readFileSync(testFile + '.evaluated.json', 'utf8'));
  assert.strictEqual(savedReport.evaluated.overallStatus, 'FAIL');
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 3. Interaction pass=false fails (exit 1)
runTest('3. Interaction pass=false fails: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  fixture.interactions[0].pass = false;

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('interaction')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_interaction_fail.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 4. Missing CTA fails (exit 1)
runTest('4. Missing CTA fails: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  const homeCase = fixture.matrix.find(c => c.route === '/' && c.width === 1440 && c.mode === 'light');
  homeCase.ctaCount = 0;
  homeCase.cta = [];

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('CTA')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_missing_cta.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 5. Missing example fails (exit 1)
runTest('5. Missing example fails: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  const homeCase = fixture.matrix.find(c => c.route === '/' && c.width === 1440 && c.mode === 'light');
  homeCase.exampleCount = 0;
  homeCase.example = [];

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('example')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_missing_example.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 6. A required check omitted fails (exit nonzero)
runTest('6. A required check omitted fails: status BLOCKED or FAIL, exit nonzero', () => {
  const fixture = createPassingFixture();
  delete fixture.print; // omit print

  const res = c03Evaluator.evaluateResults(fixture);
  assert.notStrictEqual(res.overallStatus, 'PASS');
  assert.notStrictEqual(res.exitCode, 0);
  assert.ok(res.blocked.length > 0 || res.failures.length > 0);

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_omitted_check.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.notStrictEqual(exitedCode, 0);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 7. Malformed status/measurement fails (exit nonzero)
runTest('7. Malformed status/measurement fails: status BLOCKED or FAIL, exit nonzero', () => {
  const fixture = createPassingFixture();
  fixture.matrix[0].width = 'invalid_width';
  fixture.matrix[0].overflow = 'maybe';

  const res = c03Evaluator.evaluateResults(fixture);
  assert.notStrictEqual(res.overallStatus, 'PASS');
  assert.notStrictEqual(res.exitCode, 0);

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_malformed.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.notStrictEqual(exitedCode, 0);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 8. Insufficient contrast fails (exit 1)
runTest('8. Insufficient contrast fails: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  const subtextPair = fixture.contrastPairs.find(p => p.id === 'contrast_light_subtext');
  subtextPair.ratio = 2.4; // Well below 4.5:1
  subtextPair.pass = false;

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failures.some(f => f.includes('contrast') || f.includes('subtext')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_low_contrast.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 9. Geometry failure changes both row and overall outcome (exit 1)
runTest('9. Geometry failure changes both row and overall outcome: status FAIL, exit 1', () => {
  const fixture = createPassingFixture();
  // 390px on '/' primary action exceeds 600px budget (bottom at 650)
  const mobileCase = fixture.matrix.find(c => c.route === '/' && c.width === 390 && c.mode === 'light');
  mobileCase.cta[0].bottom = 650;
  mobileCase.cta[0].y = 602;

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.strictEqual(res.checks.responsive_layout_matrix.status, 'FAIL');
  assert.ok(res.failures.some(f => f.includes('390') || f.includes('600')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_geometry_failure.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 1);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// 10. Native zoom unavailable is blocked and exits nonzero (exit 2)
runTest('10. Native zoom unavailable is blocked and exits nonzero: status BLOCKED, exit 2', () => {
  const fixture = createPassingFixture();
  fixture.nativeZoom = {
    status: 'BLOCKED',
    details: 'Automated headless browser environment cannot operate native browser window zoom UI control',
    attemptedMethod: 'Chromium keyboard shortcut Cmd+= and CDP Emulation probe',
    limitation: 'Playwright dispatches keys to web content, not browser frame; CDP lacks Page.setZoomLevel',
    overflow: null
  };

  const res = c03Evaluator.evaluateResults(fixture);
  assert.strictEqual(res.overallStatus, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.strictEqual(res.checks.native_zoom_200.status, 'BLOCKED');
  assert.ok(res.blocked.some(b => b.includes('native_zoom')));

  // CLI execution test
  const testFile = path.join(TEST_OUT_DIR, 'test_zoom_blocked.json');
  fs.writeFileSync(testFile, JSON.stringify(fixture));
  let exitedCode = 0;
  try {
    execSync(`node docs/execution/evidence/C03/verify_c03_evidence.cjs --eval-file "${testFile}"`, { stdio: 'pipe' });
  } catch (err) {
    exitedCode = err.status;
  }
  assert.strictEqual(exitedCode, 2);
  fs.unlinkSync(testFile);
  fs.unlinkSync(testFile + '.evaluated.json');
});

// Additional unit check: Contrast luminance calculation with known black/white and failing gray
runTest('11. Independent contrast luminance calculation: known black/white is 21:1, failing gray pair is < 4.5:1', () => {
  const bwRatio = c03Evaluator.calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
  assert.ok(Math.abs(bwRatio - 21.0) < 0.1, `Expected ~21:1, got ${bwRatio}`);

  const failingGrayRatio = c03Evaluator.calculateContrastRatio('rgb(160, 160, 160)', 'rgb(255, 255, 255)');
  assert.ok(failingGrayRatio < 4.5, `Expected failing gray < 4.5:1, got ${failingGrayRatio}`);
});

if (fs.existsSync(TEST_OUT_DIR)) {
  fs.rmSync(TEST_OUT_DIR, { recursive: true, force: true });
}

console.log(`\n=== ALL ${passedTests}/${totalTests} TESTS PASSED ===`);
