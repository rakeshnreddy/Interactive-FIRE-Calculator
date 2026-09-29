const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERIFY_SCRIPT = path.join(__dirname, 'verify_hosted_c04.cjs');
const TMP_DIR = path.join(__dirname, '.test_tmp');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

let verifyModule;
try {
  verifyModule = require(VERIFY_SCRIPT);
} catch (err) {
  // If loading fails, tests will catch it
}

function buildBasePassingPacket() {
  const cases = [
    {
      id: 'mortgage-390-light',
      calc: 'Mortgage',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      firstInputY: 490.5,
      headlineMonths: 360,
      scheduleRowCount: 360,
      lastRowEndingBalance: '$0',
      lastRowNote: 'Final payment',
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b08_pass: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-mortgage-390-light.png'
    },
    {
      id: 'mortgage-390-dark',
      calc: 'Mortgage',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      firstInputY: 490.5,
      headlineMonths: 360,
      scheduleRowCount: 360,
      lastRowEndingBalance: '$0',
      lastRowNote: 'Final payment',
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b08_pass: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-mortgage-390-dark.png'
    },
    {
      id: 'sip-390-light',
      calc: 'SIP',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      firstInputY: 456.0,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-sip-390-light.png'
    },
    {
      id: 'sip-390-dark',
      calc: 'SIP',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      firstInputY: 456.0,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-sip-390-dark.png'
    },
    {
      id: 'income-tax-india-390-light',
      calc: 'India Tax',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      firstInputY: 516.2,
      hasVisualBars: false,
      swatchCount: 1,
      hasTable: true,
      hasInr: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-income-tax-india-390-light.png'
    },
    {
      id: 'income-tax-india-390-dark',
      calc: 'India Tax',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      firstInputY: 516.2,
      hasVisualBars: false,
      swatchCount: 1,
      hasTable: true,
      hasInr: true,
      b20_pass: true,
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-income-tax-india-390-dark.png'
    },
    {
      id: 'cagr-default-390-light',
      calc: 'CAGR (Default Units)',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      firstInputY: 430.4,
      headlinePercent: '12.47%',
      baseRowText: 'Base Annualized return: 12.47%',
      baseTableText: 'Base 12.47%',
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'cagr-default-390-dark',
      calc: 'CAGR (Default Units)',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      firstInputY: 430.4,
      headlinePercent: '12.47%',
      baseRowText: 'Base Annualized return: 12.47%',
      baseTableText: 'Base 12.47%',
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'cagr-negative-390-light',
      calc: 'CAGR (Negative Fixture)',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasNegativeRow: true,
      hasBaseline: true,
      rowText: 'Base Annualized return: -12.94%',
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-cagr-negative-390-light.png'
    },
    {
      id: 'cagr-negative-390-dark',
      calc: 'CAGR (Negative Fixture)',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasNegativeRow: true,
      hasBaseline: true,
      rowText: 'Base Annualized return: -12.94%',
      b21_pass: true,
      pass: true,
      screenshot: 'hosted-cagr-negative-390-dark.png'
    },
    {
      id: 'disclosure-keyboard-focus',
      calc: 'Mortgage Disclosure Focus',
      keyboardOpened: true,
      keyboardClosed: true,
      focusRetained: true,
      testedCalculators: ['Mortgage', 'SIP'],
      interactions: [
        {
          calc: 'Mortgage',
          metricButtonAriaLabel: 'About Payoff months',
          openedWithKey: 'Enter',
          closedWithKey: 'Space',
          helpTextObserved: true,
          pass: true
        },
        {
          calc: 'SIP',
          metricButtonAriaLabel: 'About Total invested',
          openedWithKey: 'Space',
          closedWithKey: 'Enter',
          helpTextObserved: true,
          pass: true
        }
      ],
      pass: true
    },
    {
      id: 'native-zoom-200',
      calc: 'Mortgage Native Zoom 200%',
      status: 'PASS',
      zoomLevel: 200,
      scaleApplied: true,
      noOverflow: true,
      pass: true
    },
    {
      id: 'reduced-motion-transparency',
      calc: 'Media Reduced Motion / Transparency',
      reducedMotion: {
        matches: true,
        violations: [],
        violationsCount: 0,
        suppressionVerified: true,
        pass: true
      },
      reducedTransparency: {
        matches: true,
        light: {
          backdropFilter: 'none',
          backgroundColor: 'rgb(244, 248, 251)',
          alpha: 1
        },
        dark: {
          backdropFilter: 'none',
          backgroundColor: 'rgb(8, 21, 28)',
          alpha: 1
        },
        pass: true
      },
      pass: true
    },
    {
      id: 'contrast-check',
      calc: 'Changed Surface Composed Contrast',
      pairs: [
        {
          id: 'contrast-light-primary-metric',
          mode: 'light',
          target: 'Primary Metric Value',
          foreground: 'rgb(16, 44, 53)',
          background: 'rgb(244, 248, 251)',
          ratio: 14.8,
          threshold: 4.5,
          pass: true
        },
        {
          id: 'contrast-dark-primary-metric',
          mode: 'dark',
          target: 'Primary Metric Value',
          foreground: 'rgb(234, 246, 247)',
          background: 'rgb(8, 21, 28)',
          ratio: 16.5,
          threshold: 4.5,
          pass: true
        },
        {
          id: 'contrast-light-field-helper',
          mode: 'light',
          target: 'Field Helper Text',
          foreground: 'rgb(32, 58, 67)',
          background: 'rgb(244, 248, 251)',
          ratio: 9.8,
          threshold: 4.5,
          pass: true
        },
        {
          id: 'contrast-dark-field-helper',
          mode: 'dark',
          target: 'Field Helper Text',
          foreground: 'rgb(216, 231, 234)',
          background: 'rgb(8, 21, 28)',
          ratio: 12.2,
          threshold: 4.5,
          pass: true
        }
      ],
      minRatio: 9.8,
      pass: true
    }
  ];

  return {
    testedAt: new Date().toISOString(),
    baseUrl: 'https://test-preview.example.com',
    consoleErrors: [],
    pageExceptions: [],
    cases
  };
}

function runCliFixture(testName, fixtureData) {
  const fixturePath = path.join(TMP_DIR, `${testName}_in.json`);
  const outputPath = path.join(TMP_DIR, `${testName}_out.json`);
  fs.writeFileSync(fixturePath, JSON.stringify(fixtureData, null, 2));

  const proc = spawnSync('node', [VERIFY_SCRIPT, '--fixture', fixturePath, outputPath], {
    encoding: 'utf8'
  });

  let outputData = null;
  if (fs.existsSync(outputPath)) {
    try {
      outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
    } catch (e) {}
  }

  return {
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    outputData
  };
}

function runTests() {
  console.log('Running test_evaluator_c04 comprehensive regression suites...');
  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total += 1;
    try {
      fn();
      passed += 1;
      console.log(`  ✓ ${name}`);
    } catch (err) {
      console.error(`  ✗ ${name}:`, err.message);
      throw err;
    }
  }

  // 1. Valid passing synthetic packet
  test('PASSING: valid complete synthetic packet exits 0 with verdict PASS', () => {
    const packet = buildBasePassingPacket();
    const res = runCliFixture('valid_pass', packet);
    assert.strictEqual(res.exitCode, 0, `Expected exit 0, got ${res.exitCode}: ${res.stderr}`);
    assert(res.outputData !== null, 'Output file must exist');
    assert.strictEqual(res.outputData.verdict, 'PASS');
    assert.strictEqual(res.outputData.success, true);
  });

  // 2. Defect: missing CAGR headlinePercent
  test('DEFECT: remove default CAGR headlinePercent exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const cagrCase = packet.cases.find((c) => c.id === 'cagr-default-390-light');
    delete cagrCase.headlinePercent;
    const res = runCliFixture('missing_cagr_headline', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing CAGR headlinePercent');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('headlinepercent')));
  });

  // 3. Defect: remove default CAGR baseRowText
  test('DEFECT: remove default CAGR baseRowText exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const cagrCase = packet.cases.find((c) => c.id === 'cagr-default-390-light');
    delete cagrCase.baseRowText;
    const res = runCliFixture('missing_cagr_baserow', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing CAGR baseRowText');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('baserowtext')));
  });

  // 4. Defect: remove default CAGR baseTableText
  test('DEFECT: remove default CAGR baseTableText exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const cagrCase = packet.cases.find((c) => c.id === 'cagr-default-390-light');
    delete cagrCase.baseTableText;
    const res = runCliFixture('missing_cagr_basetable', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing CAGR baseTableText');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('basetabletext')));
  });

  // 5. Defect: delete consoleErrors telemetry
  test('DEFECT: delete consoleErrors exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    delete packet.consoleErrors;
    const res = runCliFixture('missing_console_errors', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing consoleErrors telemetry');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('consoleerrors')));
  });

  // 6. Defect: delete pageExceptions telemetry
  test('DEFECT: delete pageExceptions exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    delete packet.pageExceptions;
    const res = runCliFixture('missing_page_exceptions', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing pageExceptions telemetry');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('pageexceptions')));
  });

  // 7. Defect: assign contrast minRatio = NaN (direct evaluator test)
  test('DEFECT: contrast minRatio = NaN in direct evaluator test returns FAIL', () => {
    const evaluateFn = verifyModule.evaluateC04Results;
    assert(typeof evaluateFn === 'function', 'evaluateC04Results must be a function');
    const packet = buildBasePassingPacket();
    const contrastCase = packet.cases.find((c) => c.id === 'contrast-check');
    contrastCase.minRatio = NaN;
    const evalRes = evaluateFn(packet);
    assert.strictEqual(evalRes.success, false);
    assert.strictEqual(evalRes.verdict, 'FAIL');
    assert(evalRes.errors.some((e) => e.includes('minRatio')));
  });

  // 8. Defect: assign contrast minRatio = Infinity (direct evaluator test)
  test('DEFECT: contrast minRatio = Infinity in direct evaluator test returns FAIL', () => {
    const evaluateFn = verifyModule.evaluateC04Results;
    const packet = buildBasePassingPacket();
    const contrastCase = packet.cases.find((c) => c.id === 'contrast-check');
    contrastCase.minRatio = Infinity;
    const evalRes = evaluateFn(packet);
    assert.strictEqual(evalRes.success, false);
    assert.strictEqual(evalRes.verdict, 'FAIL');
    assert(evalRes.errors.some((e) => e.includes('minRatio')));
  });

  // 9. Defect: assign contrast minRatio = null (JSON CLI test)
  test('DEFECT: contrast minRatio = null in JSON CLI test exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const contrastCase = packet.cases.find((c) => c.id === 'contrast-check');
    contrastCase.minRatio = null;
    const res = runCliFixture('contrast_minratio_null', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for minRatio: null');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('minRatio')));
  });

  // 10. Defect: remove requestedMode
  test('DEFECT: remove requestedMode exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    delete darkMortgage.requestedMode;
    const res = runCliFixture('missing_requested_mode', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing requestedMode');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('requestedmode')));
  });

  // 11. Defect: remove observedMode
  test('DEFECT: remove observedMode exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    delete darkMortgage.observedMode;
    const res = runCliFixture('missing_observed_mode', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for missing observedMode');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('observedmode')));
  });

  // 12. Defect: replace media row with ID only
  test('DEFECT: replace media row with ID only exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const idx = packet.cases.findIndex((c) => c.id === 'reduced-motion-transparency');
    packet.cases[idx] = { id: 'reduced-motion-transparency' };
    const res = runCliFixture('media_id_only', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit 1 for media row with ID only');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.toLowerCase().includes('media') || e.toLowerCase().includes('reduced')));
  });

  // 13. Defect: simulated zoom collector error results in BLOCKED/FAIL, never pass
  test('DEFECT: simulate zoom collector error results in BLOCKED/FAIL, never pass', () => {
    const packet = buildBasePassingPacket();
    const zoomCase = packet.cases.find((c) => c.id === 'native-zoom-200');
    // Simulate error where collector caught an exception or could not perform native zoom
    zoomCase.status = 'BLOCKED';
    zoomCase.pass = false;
    zoomCase.attemptedMethod = 'Chrome application CUA zoom control';
    zoomCase.limitation = 'Desktop GUI accessibility unavailable in headless automation';
    zoomCase.assistedAction = 'Perform interactive verification in Chrome with native 200% zoom';
    delete zoomCase.scaleApplied;
    delete zoomCase.noOverflow;

    const res = runCliFixture('zoom_blocked', packet);
    // Nonzero exit code (blocked = exit code 2 or 1, never 0)
    assert.notStrictEqual(res.exitCode, 0, 'Blocked zoom must not exit 0');
    assert.notStrictEqual(res.outputData.verdict, 'PASS', 'Blocked zoom must not have verdict PASS');
    assert.strictEqual(res.outputData.success, false);
  });

  // 14. Defect: false pass flag (b08_pass: false)
  test('DEFECT: false pass flag exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases[0].b08_pass = false;
    const res = runCliFixture('false_pass_flag', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for false b08_pass');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('b08_pass')));
  });

  // 15. Defect: missing case ID
  test('DEFECT: missing required case ID exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases = packet.cases.filter((c) => c.id !== 'cagr-default-390-dark');
    const res = runCliFixture('missing_case', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for missing case ID');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Missing required case ID: cagr-default-390-dark')));
  });

  // 16. Defect: duplicate case ID
  test('DEFECT: duplicate case ID exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases.push({ ...packet.cases[0] });
    const res = runCliFixture('duplicate_case', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for duplicate case ID');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Duplicate case ID found: mortgage-390-light')));
  });

  // 17. Defect: requested dark but observed light
  test('DEFECT: requested dark but observed light exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    darkMortgage.observedMode = 'light';
    const res = runCliFixture('wrong_theme', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for theme mismatch');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('requested') && e.includes('observed')));
  });

  // 18. Defect: identical canvas background for light and dark
  test('DEFECT: identical canvas background for light and dark exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    darkMortgage.canvasBg = 'rgb(244, 248, 251)';
    const res = runCliFixture('identical_theme_colors', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for identical theme colors');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Identical canvas background')));
  });

  // 19. Defect: unscaled 0.1 in CAGR chart row
  test('DEFECT: unscaled 0.1 in CAGR chart row exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const cagrDefault = packet.cases.find((c) => c.id === 'cagr-default-390-light');
    cagrDefault.baseRowText = 'Base Annualized return: 0.1';
    const res = runCliFixture('incorrect_percentage', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for unscaled 0.1 in CAGR');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('unscaled 0.1') || e.includes('12.47%')));
  });

  // 20. Defect: console error present in telemetry
  test('DEFECT: console error exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.consoleErrors = ['[console.error] Uncaught TypeError: Cannot read properties of undefined'];
    const res = runCliFixture('console_error', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for console error');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Console errors present')));
  });

  // 21. Defect: page exception present in telemetry
  test('DEFECT: page exception exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.pageExceptions = ['[pageerror] Error: Uncaught DOMException'];
    const res = runCliFixture('page_exception', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for page exception');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Page exceptions present')));
  });

  // 22. Defect: malformed measurement (firstInputY = NaN)
  test('DEFECT: firstInputY = NaN exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const mortgage = packet.cases.find((c) => c.id === 'mortgage-390-light');
    mortgage.firstInputY = null; // null or NaN in JSON
    const res = runCliFixture('firstinputy_null', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for null firstInputY');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('firstInputY')));
  });

  // 23. Defect: firstInputY exceeds mobile threshold 650
  test('DEFECT: firstInputY > 650 exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const mortgage = packet.cases.find((c) => c.id === 'mortgage-390-light');
    mortgage.firstInputY = 750;
    const res = runCliFixture('firstinputy_exceeded', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for firstInputY > 650');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('exceeds mobile threshold 650')));
  });

  // 24. Defect: unexpected case ID
  test('DEFECT: unexpected case ID exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases.push({ id: 'unexpected-extra-case', pass: true });
    const res = runCliFixture('unexpected_case_id', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for unexpected case ID');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Unexpected case ID found')));
  });

  // 25. Defect: zoom claiming PASS without verified measurements
  test('DEFECT: zoom status PASS without zoomLevel=200 exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const zoomCase = packet.cases.find((c) => c.id === 'native-zoom-200');
    delete zoomCase.zoomLevel;
    const res = runCliFixture('zoom_fake_pass', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for fake zoom pass');
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('zoomLevel=200')));
  });

  // Clean up
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log(`\nAll ${passed}/${total} regression evaluator tests passed successfully!`);
}

runTests();
