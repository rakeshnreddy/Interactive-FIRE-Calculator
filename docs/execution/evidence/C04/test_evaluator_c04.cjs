const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERIFY_SCRIPT = path.join(__dirname, 'verify_hosted_c04.cjs');
const TMP_DIR = path.join(__dirname, '.test_tmp');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function buildBasePassingPacket() {
  const cases = [
    {
      id: 'mortgage-390-light',
      calc: 'Mortgage',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(16, 44, 53)',
      firstInputY: 420,
      headlineMonths: 360,
      scheduleRowCount: 360,
      lastRowEndingBalance: '$0',
      lastRowNote: 'Final period',
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b08_pass: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'mortgage-390-dark',
      calc: 'Mortgage',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(234, 246, 247)',
      firstInputY: 420,
      headlineMonths: 360,
      scheduleRowCount: 360,
      lastRowEndingBalance: '$0',
      lastRowNote: 'Final period',
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b08_pass: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'sip-390-light',
      calc: 'SIP',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(16, 44, 53)',
      firstInputY: 410,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'sip-390-dark',
      calc: 'SIP',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(234, 246, 247)',
      firstInputY: 410,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'income-tax-india-390-light',
      calc: 'India Tax',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(16, 44, 53)',
      firstInputY: 430,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      hasInr: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'income-tax-india-390-dark',
      calc: 'India Tax',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(234, 246, 247)',
      firstInputY: 430,
      hasVisualBars: false,
      swatchCount: 2,
      hasTable: true,
      hasInr: true,
      b20_pass: true,
      b21_pass: true,
      pass: true
    },
    {
      id: 'cagr-default-390-light',
      calc: 'CAGR (Default Units)',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(16, 44, 53)',
      firstInputY: 400,
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
      textColor: 'rgb(234, 246, 247)',
      firstInputY: 400,
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
      textColor: 'rgb(16, 44, 53)',
      hasNegativeRow: true,
      hasBaseline: true,
      rowText: 'Base Annualized return: -12.94%',
      b21_pass: true,
      pass: true
    },
    {
      id: 'cagr-negative-390-dark',
      calc: 'CAGR (Negative Fixture)',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(234, 246, 247)',
      hasNegativeRow: true,
      hasBaseline: true,
      rowText: 'Base Annualized return: -12.94%',
      b21_pass: true,
      pass: true
    },
    {
      id: 'disclosure-keyboard-focus',
      calc: 'Mortgage Disclosure Focus',
      keyboardOpened: true,
      keyboardClosed: true,
      focusRetained: true,
      pass: true
    },
    {
      id: 'native-zoom-200',
      calc: 'Mortgage Native Zoom 200%',
      scaleApplied: true,
      noOverflow: true,
      pass: true
    },
    {
      id: 'reduced-motion-transparency',
      calc: 'Media Reduced Motion / Transparency',
      reducedMotionActive: true,
      pass: true
    },
    {
      id: 'contrast-check',
      calc: 'Visual Panel Heading Contrast',
      foreground: 'rgb(16, 44, 53)',
      background: 'rgb(244, 248, 251)',
      minRatio: 6.8,
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
    outputData = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  }

  return {
    exitCode: proc.status,
    stdout: proc.stdout,
    stderr: proc.stderr,
    outputData
  };
}

function runTests() {
  console.log('Running test_evaluator_c04 suites...');
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
  test('PASSING: valid synthetic packet exits 0 with verdict PASS', () => {
    const packet = buildBasePassingPacket();
    const res = runCliFixture('valid_pass', packet);
    assert.strictEqual(res.exitCode, 0, `Expected 0, got ${res.exitCode}: ${res.stderr}`);
    assert(res.outputData !== null, 'Output file must exist');
    assert.strictEqual(res.outputData.verdict, 'PASS');
    assert.strictEqual(res.outputData.success, true);
  });

  // 2. Defect: false pass flag (b08_pass: false)
  test('DEFECT: false pass flag exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases[0].b08_pass = false;
    const res = runCliFixture('false_pass_flag', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for false b08_pass');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('b08_pass')));
  });

  // 3. Defect: missing case ID
  test('DEFECT: missing required case ID exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases = packet.cases.filter((c) => c.id !== 'cagr-default-390-dark');
    const res = runCliFixture('missing_case', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for missing case ID');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Missing required case ID: cagr-default-390-dark')));
  });

  // 4. Defect: duplicate case ID
  test('DEFECT: duplicate case ID exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases.push({ ...packet.cases[0] });
    const res = runCliFixture('duplicate_case', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for duplicate case ID');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Duplicate case ID found: mortgage-390-light')));
  });

  // 5. Defect: wrong observed theme (requested dark, observed light)
  test('DEFECT: requested dark but observed light exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    darkMortgage.observedMode = 'light';
    const res = runCliFixture('wrong_theme', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for theme mismatch');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('requested dark but observed light')));
  });

  // 6. Defect: identical colors in light and dark
  test('DEFECT: identical canvas background for light and dark exits 1', () => {
    const packet = buildBasePassingPacket();
    const darkMortgage = packet.cases.find((c) => c.id === 'mortgage-390-dark');
    darkMortgage.canvasBg = 'rgb(244, 248, 251)'; // same as light!
    const res = runCliFixture('identical_theme_colors', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for identical theme colors');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Identical canvas background')));
  });

  // 7. Defect: incorrect percentage unit (0.1 instead of 12.47%)
  test('DEFECT: unscaled 0.1 in CAGR chart row exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const cagrDefault = packet.cases.find((c) => c.id === 'cagr-default-390-light');
    cagrDefault.baseRowText = 'Base Annualized return: 0.1';
    const res = runCliFixture('incorrect_percentage', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for unscaled 0.1 in CAGR');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('unscaled 0.1') || e.includes('12.47%')));
  });

  // 8. Defect: malformed measurement (headlineMonths: NaN)
  test('DEFECT: malformed measurement exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const mortgage = packet.cases.find((c) => c.id === 'mortgage-390-light');
    mortgage.firstInputY = NaN;
    const res = runCliFixture('malformed_measurement', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for NaN measurement');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('malformed firstInputY')));
  });

  // 9. Defect: console error present
  test('DEFECT: console error exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.consoleErrors = ['[console.error] Uncaught TypeError: Cannot read properties of undefined'];
    const res = runCliFixture('console_error', packet);
    assert.strictEqual(res.exitCode, 1, 'Expected exit code 1 for console error');
    assert(res.outputData !== null);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert.strictEqual(res.outputData.success, false);
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Console errors present')));
  });

  // Clean up
  try {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  } catch (e) {}

  console.log(`All ${passed}/${total} negative evaluator tests passed successfully!`);
}

runTests();
