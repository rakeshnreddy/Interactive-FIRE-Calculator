// docs/execution/evidence/C06/test_evaluator.cjs
// Test suite proving fail-closed rejection across all 9 required negative conditions.

const assert = require('node:assert');
const { evaluateCase, evaluateSuite, calculateContrastRatio } = require('./evaluator.cjs');

function getBaseValidCase() {
  return {
    id: 'test-case-valid',
    domain: 'dashboard',
    theme: 'light',
    viewport: { width: 1440, height: 900 },
    state: 'populated',
    screenshot: 'dashboard-valid.png',
    screenshotExists: true,
    screenshotSizeBytes: 154200,
    themeInfo: {
      rootDataMode: 'light',
      shellDataMode: 'light',
      bgColor: 'rgb(244, 248, 251)',
      textColor: 'rgb(32, 58, 67)'
    },
    geometry: {
      viewportWidth: 1440,
      viewportHeight: 900,
      documentScrollWidth: 1440,
      documentScrollHeight: 1200,
      hasHorizontalOverflow: false,
      overflowDelta: 0
    },
    keyboardFocus: {
      attempted: true,
      focusedTag: 'BUTTON',
      focusedText: 'Add Account',
      focusedRole: 'button',
      hasVisibleFocusRing: true,
      isBodyFocus: false,
      occluded: false
    },
    contrast: {
      tested: true,
      ratio: 7.8,
      fgColor: 'rgb(32, 58, 67)',
      bgColor: 'rgb(244, 248, 251)',
      minRequired: 4.5
    },
    consoleErrors: [],
    pageErrors: []
  };
}

function runTests() {
  console.log('Running Evaluator Negative Verification Tests...');

  // 0. Baseline valid case must pass
  {
    const res = evaluateCase(getBaseValidCase());
    assert.strictEqual(res.status, 'PASS', 'Base valid case must PASS');
    assert.strictEqual(res.reasons.length, 0);
    console.log('✔ Case 0: Baseline valid case passes');
  }

  // 1. Absent screenshots must FAIL
  {
    const c = getBaseValidCase();
    c.screenshotExists = false;
    c.screenshotSizeBytes = 0;
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Missing screenshot must FAIL');
    assert(res.reasons.some((r) => r.includes('Screenshot is missing')));
    console.log('✔ Case 1: Absent screenshot rejected (FAIL)');
  }

  // 2. Missing target/console diagnostics must FAIL
  {
    const c = getBaseValidCase();
    delete c.themeInfo;
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Missing target diagnostics must FAIL');
    assert(res.reasons.some((r) => r.includes('Missing required target or console diagnostics')));
    console.log('✔ Case 2: Missing diagnostics rejected (FAIL)');
  }

  // 3. Overflow width larger than viewport must FAIL
  {
    const c = getBaseValidCase();
    c.geometry.hasHorizontalOverflow = true;
    c.geometry.documentScrollWidth = 1460;
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Horizontal overflow must FAIL');
    assert(res.reasons.some((r) => r.includes('Horizontal overflow detected')));
    console.log('✔ Case 3: Horizontal overflow rejected (FAIL)');
  }

  // 4. Body-only keyboard focus must FAIL
  {
    const c = getBaseValidCase();
    c.keyboardFocus = {
      attempted: true,
      focusedTag: 'BODY',
      focusedText: '',
      focusedRole: '',
      hasVisibleFocusRing: false,
      isBodyFocus: true,
      occluded: false
    };
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Body-only focus must FAIL');
    assert(res.reasons.some((r) => r.includes('remained on document BODY')));
    console.log('✔ Case 4: Body-only keyboard focus rejected (FAIL)');
  }

  // 5. Missing/wrong requested theme must FAIL
  {
    const c = getBaseValidCase();
    c.theme = 'dark'; // requested dark
    c.themeInfo.rootDataMode = 'light'; // observed light
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Mismatched theme must FAIL');
    assert(res.reasons.some((r) => r.includes('Theme mismatch')));
    console.log('✔ Case 5: Wrong theme rejected (FAIL)');
  }

  // 6. deviceScaleFactor-only zoom must FAIL
  {
    const c = getBaseValidCase();
    c.zoomCheck = {
      type: 'native',
      requestedLevel: 2.0,
      appliedViaAppChrome: false,
      deviceScaleFactorUsed: true
    };
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'deviceScaleFactor used for zoom must FAIL');
    assert(res.reasons.some((r) => r.includes('deviceScaleFactor used to simulate native zoom')));
    console.log('✔ Case 6: deviceScaleFactor zoom rejected (FAIL)');
  }

  // 7. Absent/nonmatching media query must be BLOCKED
  {
    const c = getBaseValidCase();
    c.mediaCheck = {
      type: 'reduced-transparency',
      requested: true,
      matched: false,
      active: false
    };
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'BLOCKED', 'Unmatched media query must be BLOCKED');
    assert(res.reasons.some((r) => r.includes('not matched by browser engine')));
    console.log('✔ Case 7: Unmatched media query rejected (BLOCKED)');
  }

  // 8. Absent/insufficient contrast must FAIL
  {
    const c = getBaseValidCase();
    c.contrast = {
      tested: true,
      ratio: 2.3, // below 4.5
      fgColor: 'rgb(160, 174, 192)',
      bgColor: 'rgb(244, 248, 251)',
      minRequired: 4.5
    };
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Insufficient contrast must FAIL');
    assert(res.reasons.some((r) => r.includes('Insufficient contrast ratio')));
    console.log('✔ Case 8: Insufficient contrast rejected (FAIL)');
  }

  // 9. Collector error must FAIL
  {
    const c = getBaseValidCase();
    c.collectorError = 'Target page crashed during navigation';
    const res = evaluateCase(c);
    assert.strictEqual(res.status, 'FAIL', 'Collector error must FAIL');
    assert(res.reasons.some((r) => r.includes('Collector error')));
    console.log('✔ Case 9: Collector error rejected (FAIL)');
  }

  // 10. Contrast math validation
  {
    const blackOnWhite = calculateContrastRatio('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
    assert(blackOnWhite > 20, 'Black on white must be ~21:1');
    const whiteOnWhite = calculateContrastRatio('rgb(255, 255, 255)', 'rgb(255, 255, 255)');
    assert.strictEqual(Math.round(whiteOnWhite), 1, 'White on white must be 1:1');
    console.log('✔ Case 10: Contrast math verified');
  }

  console.log('\nAll 10 evaluator negative & calculation tests passed cleanly!');
}

runTests();
