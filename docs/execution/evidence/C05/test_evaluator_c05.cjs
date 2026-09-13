const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const VERIFY_SCRIPT = path.join(__dirname, 'verify_hosted_c05.cjs');
const TMP_DIR = path.join(__dirname, '.test_tmp');

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

let verifyModule;
try {
  verifyModule = require(VERIFY_SCRIPT);
} catch (err) {
  console.error('Failed to load verify_hosted_c05.cjs:', err);
}

function buildBasePassingPacket(options = {}) {
  const zoomStatus = options.zoomStatus || 'PASS';

  const cases = [
    {
      id: 'compound-interest-390-light',
      tool: 'compound-interest',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      trustStripPresent: false,
      all16px: true,
      scheduleReachable: true,
      screenshot: 'hosted-compound-interest-390-light.png',
      screenshotSha1: 'sha1_ci_light_111',
      pass: true
    },
    {
      id: 'compound-interest-390-dark',
      tool: 'compound-interest',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      trustStripPresent: false,
      all16px: true,
      scheduleReachable: true,
      screenshot: 'hosted-compound-interest-390-dark.png',
      screenshotSha1: 'sha1_ci_dark_222',
      pass: true
    },
    {
      id: 'savings-goal-390-light',
      tool: 'savings-goal',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      trustStripPresent: false,
      all16px: true,
      scheduleReachable: true,
      screenshot: 'hosted-savings-goal-390-light.png',
      screenshotSha1: 'sha1_sg_light_111',
      pass: true
    },
    {
      id: 'savings-goal-390-dark',
      tool: 'savings-goal',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      trustStripPresent: false,
      all16px: true,
      scheduleReachable: true,
      screenshot: 'hosted-savings-goal-390-dark.png',
      screenshotSha1: 'sha1_sg_dark_222',
      pass: true
    },
    {
      id: 'net-worth-390-light',
      tool: 'net-worth',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-net-worth-390-light.png',
      screenshotSha1: 'sha1_nw_light_111',
      pass: true
    },
    {
      id: 'net-worth-390-dark',
      tool: 'net-worth',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-net-worth-390-dark.png',
      screenshotSha1: 'sha1_nw_dark_222',
      pass: true
    },
    {
      id: 'budget-390-light',
      tool: 'budget',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-budget-390-light.png',
      screenshotSha1: 'sha1_b_light_111',
      pass: true
    },
    {
      id: 'budget-390-dark',
      tool: 'budget',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-budget-390-dark.png',
      screenshotSha1: 'sha1_b_dark_222',
      pass: true
    },
    {
      id: 'emergency-fund-390-light',
      tool: 'emergency-fund',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-emergency-fund-390-light.png',
      screenshotSha1: 'sha1_ef_light_111',
      pass: true
    },
    {
      id: 'emergency-fund-390-dark',
      tool: 'emergency-fund',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      trustStripPresent: false,
      faqDetailsPresent: true,
      all16px: true,
      screenshot: 'hosted-emergency-fund-390-dark.png',
      screenshotSha1: 'sha1_ef_dark_222',
      pass: true
    },
    {
      id: 'net-worth-deficit-check',
      acceptedDefault: false,
      deficitObserved: true,
      headlineTitle: 'Estimated net deficit',
      headlineLabel: 'Net deficit (liabilities exceed assets)',
      negativeValueObserved: '-$40,000',
      positiveControlObserved: '$40,000',
      pass: true
    },
    {
      id: 'fire-desktop-light',
      requestedMode: 'light',
      observedMode: 'light',
      canvasBg: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)',
      hasScopeNote: true,
      allDescribed: true,
      allLabelsConcise: true,
      all16px: true,
      screenshot: 'hosted-fire-desktop-light.png',
      screenshotSha1: 'sha1_fire_light_111',
      pass: true
    },
    {
      id: 'fire-desktop-dark',
      requestedMode: 'dark',
      observedMode: 'dark',
      canvasBg: 'rgb(8, 21, 28)',
      textColor: 'rgb(216, 231, 234)',
      hasScopeNote: true,
      allDescribed: true,
      allLabelsConcise: true,
      all16px: true,
      screenshot: 'hosted-fire-desktop-dark.png',
      screenshotSha1: 'sha1_fire_dark_222',
      pass: true
    },
    {
      id: 'fire-r1-unique-ids',
      duplicateIdCount: 0,
      duplicates: [],
      secondYearsLabelFocusesSecondInput: true,
      pass: true
    },
    {
      id: 'fire-r2-infotip-keyboard',
      initialExpanded: false,
      initialVisible: false,
      initialOpacity: 0,
      focusedExpanded: false,
      focusedVisible: false,
      focusedOpacity: 0,
      toggledExpanded: true,
      toggledVisible: true,
      toggledOpacity: 1,
      closedExpanded: false,
      closedVisible: false,
      closedOpacity: 0,
      escapeExpanded: false,
      escapeVisible: false,
      escapeOpacity: 0,
      escapeRetainedFocus: true,
      pass: true
    },
    {
      id: 'fire-r3-stale-lifecycle',
      initialPill: 'End-year',
      staleBadgeVisible: true,
      stalePill: 'End-year',
      compareEvaluatedAgainstSnapshot: true,
      recalculatedPill: 'Start-year',
      staleBadgeCleared: true,
      screenshot: 'hosted-fire-stale-state-desktop.png',
      screenshotSha1: 'sha1_fire_stale_333',
      pass: true
    },
    {
      id: 'disclosure-keyboard-focus',
      noOverlapWithStickyTopbar: true,
      focusedControlsCount: 8,
      pass: true
    },
    {
      id: 'reduced-motion-transparency',
      reducedMotion: {
        matches: true,
        suppressionVerified: true
      },
      reducedTransparency: {
        matches: true,
        opaqueVerified: true
      },
      pass: true
    },
    {
      id: 'contrast-check',
      minNormalRatio: 5.2,
      minLargeRatio: 4.8,
      pass: true
    },
    {
      id: 'native-zoom-200',
      status: zoomStatus,
      reason: zoomStatus === 'BLOCKED' ? 'Interactive desktop Chrome CUA application zoom is unavailable in headless CLI' : undefined,
      pass: zoomStatus === 'PASS'
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
  console.log('Running test_evaluator_c05 comprehensive negative regression suite...');
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
  test('PASSING: valid complete synthetic packet with native-zoom PASS exits 0 with verdict PASS', () => {
    const packet = buildBasePassingPacket({ zoomStatus: 'PASS' });
    const res = runCliFixture('valid_pass', packet);
    assert.strictEqual(res.exitCode, 0, `Expected exit 0, got ${res.exitCode}: ${res.stderr}`);
    assert(res.outputData !== null, 'Output file must exist');
    assert.strictEqual(res.outputData.verdict, 'PASS');
    assert.strictEqual(res.outputData.success, true);
  });

  // 2. Truthful BLOCKED on native-zoom-200
  test('BLOCKED: valid complete synthetic packet with native-zoom BLOCKED exits 2 with verdict BLOCKED', () => {
    const packet = buildBasePassingPacket({ zoomStatus: 'BLOCKED' });
    const res = runCliFixture('valid_blocked', packet);
    assert.strictEqual(res.exitCode, 2, `Expected exit 2, got ${res.exitCode}: ${res.stderr}`);
    assert(res.outputData !== null, 'Output file must exist');
    assert.strictEqual(res.outputData.verdict, 'BLOCKED');
    assert.strictEqual(res.outputData.success, false);
    assert.strictEqual(res.outputData.blockedCases.length, 1);
  });

  // 3. Defect: missing consoleErrors telemetry
  test('DEFECT: missing consoleErrors telemetry exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    delete packet.consoleErrors;
    const res = runCliFixture('missing_console_errors', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('consoleErrors')));
  });

  // 4. Defect: present consoleErrors telemetry
  test('DEFECT: present consoleErrors telemetry exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.consoleErrors = ['Uncaught TypeError: Cannot read properties of undefined'];
    const res = runCliFixture('present_console_errors', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Console errors present')));
  });

  // 5. Defect: missing pageExceptions telemetry
  test('DEFECT: missing pageExceptions telemetry exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    delete packet.pageExceptions;
    const res = runCliFixture('missing_page_exceptions', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('pageExceptions')));
  });

  // 6. Defect: present pageExceptions telemetry
  test('DEFECT: present pageExceptions telemetry exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.pageExceptions = ['React error boundary triggered'];
    const res = runCliFixture('present_page_exceptions', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Page exceptions present')));
  });

  // 7. Defect: missing cases array
  test('DEFECT: missing cases array exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    delete packet.cases;
    const res = runCliFixture('missing_cases', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('packet.cases')));
  });

  // 8. Defect: missing required case
  test('DEFECT: missing required case (fire-r1-unique-ids) exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases = packet.cases.filter((c) => c.id !== 'fire-r1-unique-ids');
    const res = runCliFixture('missing_r1_case', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Missing required case: fire-r1-unique-ids')));
  });

  // 9. Defect: duplicate case id
  test('DEFECT: duplicate case id exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    packet.cases.push({ ...packet.cases[0] });
    const res = runCliFixture('duplicate_case_id', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Duplicate case id')));
  });

  // 10. Defect: theme mismatch (requested != observed)
  test('DEFECT: theme mismatch (requested light, observed dark) exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const lightCase = packet.cases.find((c) => c.id === 'compound-interest-390-light');
    lightCase.observedMode = 'dark';
    const res = runCliFixture('theme_mismatch', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('theme mismatch')));
  });

  // 11. Defect: identical canvas background between light and dark
  test('DEFECT: identical canvas background colors between light and dark exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkCase = packet.cases.find((c) => c.id === 'compound-interest-390-dark');
    darkCase.canvasBg = 'rgb(244, 248, 251)';
    const res = runCliFixture('identical_canvas_bg', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Identical canvasBg')));
  });

  // 12. Defect: identical screenshot SHA1 between light and dark
  test('DEFECT: identical screenshot SHA1 between light and dark exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const darkCase = packet.cases.find((c) => c.id === 'fire-desktop-dark');
    darkCase.screenshotSha1 = 'sha1_fire_light_111';
    const res = runCliFixture('identical_screenshot_sha1', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('Identical screenshot SHA1')));
  });

  // 13. Defect: deficit check accepts default non-deficit ("Estimated net worth")
  test('DEFECT: deficit check accepts default non-deficit exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const deficitCase = packet.cases.find((c) => c.id === 'net-worth-deficit-check');
    deficitCase.acceptedDefault = true;
    const res = runCliFixture('deficit_accepted_default', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('accepted default non-deficit')));
  });

  // 14. Defect: deficit check missing negative sign on value
  test('DEFECT: deficit check with positive value exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const deficitCase = packet.cases.find((c) => c.id === 'net-worth-deficit-check');
    deficitCase.negativeValueObserved = '$40,000';
    const res = runCliFixture('deficit_positive_value', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('negative value missing or invalid')));
  });

  // 15. Defect: R1 duplicate ID count > 0
  test('DEFECT: R1 duplicate ID count > 0 exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r1Case = packet.cases.find((c) => c.id === 'fire-r1-unique-ids');
    r1Case.duplicateIdCount = 9;
    r1Case.duplicates = [['field-years', 2]];
    const res = runCliFixture('r1_duplicates', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('duplicate IDs in DOM')));
  });

  // 16. Defect: R1 second Years label fails to focus second input
  test('DEFECT: R1 second Years label fails to focus second input exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r1Case = packet.cases.find((c) => c.id === 'fire-r1-unique-ids');
    r1Case.secondYearsLabelFocusesSecondInput = false;
    const res = runCliFixture('r1_label_fail', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('second Years label does not focus')));
  });

  // 17. Defect: R2 InfoTip popover visible while closed
  test('DEFECT: R2 InfoTip popover visible while closed exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r2Case = packet.cases.find((c) => c.id === 'fire-r2-infotip-keyboard');
    r2Case.focusedOpacity = 1;
    const res = runCliFixture('r2_visible_closed', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('focused trigger caused popover to be visible')));
  });

  // 18. Defect: R2 InfoTip Escape key lost trigger focus
  test('DEFECT: R2 InfoTip Escape key lost trigger focus exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r2Case = packet.cases.find((c) => c.id === 'fire-r2-infotip-keyboard');
    r2Case.escapeRetainedFocus = false;
    const res = runCliFixture('r2_lost_focus', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('escape key did not preserve focus')));
  });

  // 19. Defect: R3 stale timing pill premature update
  test('DEFECT: R3 stale timing pill premature update exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r3Case = packet.cases.find((c) => c.id === 'fire-r3-stale-lifecycle');
    r3Case.stalePill = 'Start-year';
    const res = runCliFixture('r3_stale_pill_mismatch', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('stale timing pill updated prematurely')));
  });

  // 20. Defect: R3 stale badge not cleared after recalculation
  test('DEFECT: R3 stale badge not cleared after recalculation exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const r3Case = packet.cases.find((c) => c.id === 'fire-r3-stale-lifecycle');
    r3Case.staleBadgeCleared = false;
    const res = runCliFixture('r3_badge_not_cleared', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('stale badge was not cleared')));
  });

  // 21. Defect: sticky topbar overlaps focused control
  test('DEFECT: sticky topbar overlaps focused control exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const kbCase = packet.cases.find((c) => c.id === 'disclosure-keyboard-focus');
    kbCase.noOverlapWithStickyTopbar = false;
    const res = runCliFixture('sticky_overlap', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('hidden behind sticky topbar')));
  });

  // 22. Defect: contrast normal text below threshold
  test('DEFECT: contrast normal text below 4.5 exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const contrastCase = packet.cases.find((c) => c.id === 'contrast-check');
    contrastCase.minNormalRatio = 3.8;
    const res = runCliFixture('contrast_normal_low', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('below threshold 4.5')));
  });

  // 23. Defect: B22 trust strip present
  test('DEFECT: B22 trust strip present exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const ciCase = packet.cases.find((c) => c.id === 'compound-interest-390-light');
    ciCase.trustStripPresent = true;
    const res = runCliFixture('b22_trust_strip', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('trust strip is present')));
  });

  // 24. Defect: B22 input font not 16px
  test('DEFECT: B22 input font not 16px exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const ciCase = packet.cases.find((c) => c.id === 'compound-interest-390-light');
    ciCase.all16px = false;
    const res = runCliFixture('b22_font_size', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('not all 16px font size')));
  });

  // 25. Defect: B23 FAQ details missing
  test('DEFECT: B23 FAQ details missing exits 1 with verdict FAIL', () => {
    const packet = buildBasePassingPacket();
    const nwCase = packet.cases.find((c) => c.id === 'net-worth-390-light');
    nwCase.faqDetailsPresent = false;
    const res = runCliFixture('b23_faq_missing', packet);
    assert.strictEqual(res.exitCode, 1);
    assert.strictEqual(res.outputData.verdict, 'FAIL');
    assert(res.outputData.evaluationErrors.some((e) => e.includes('FAQ details disclosure is missing')));
  });

  console.log(`\nAll ${passed}/${total} test_evaluator_c05 regression tests passed cleanly.`);
}

runTests();
