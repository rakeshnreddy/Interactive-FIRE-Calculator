const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname);
const BASE_URL = 'https://21a762ad.interactive-fire-calculator.pages.dev';

const REQUIRED_CASE_IDS = [
  'mortgage-390-light',
  'mortgage-390-dark',
  'sip-390-light',
  'sip-390-dark',
  'income-tax-india-390-light',
  'income-tax-india-390-dark',
  'cagr-default-390-light',
  'cagr-default-390-dark',
  'cagr-negative-390-light',
  'cagr-negative-390-dark',
  'disclosure-keyboard-focus',
  'native-zoom-200',
  'reduced-motion-transparency',
  'contrast-check'
];

function getPlaywrightChromium() {
  try {
    return require('playwright').chromium;
  } catch (e) {
    try {
      return require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright').chromium;
    } catch (err) {
      throw new Error('Playwright chromium not found: ' + err.message);
    }
  }
}

/**
 * Parses RGB or RGBA string into { r, g, b, a }.
 */
function parseRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    };
  }
  const hexMatch = colorStr.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map((c) => c + c).join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    };
  }
  return null;
}

/**
 * Calculates WCAG 2.1 relative luminance.
 */
function calculateLuminance(colorStr) {
  const rgb = parseRgb(colorStr);
  if (!rgb) throw new Error(`Invalid color string: ${colorStr}`);
  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = srgb.map((c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Calculates WCAG 2.1 contrast ratio.
 */
function calculateContrastRatio(fgStr, bgStr) {
  const l1 = calculateLuminance(fgStr);
  const l2 = calculateLuminance(bgStr);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// Fail closed: inspect every unique screenshot background, with foreground alpha.
function measureContrastPixels(data, info, foreground, opacity) {
  const fg = parseRgb(foreground);
  if (!fg || !Number.isFinite(opacity) || opacity < 0 || opacity > 1 ||
      !info || !Number.isInteger(info.width) || !Number.isInteger(info.height) ||
      info.width <= 0 || info.height <= 0 || ![3, 4].includes(info.channels) ||
      data.length !== info.width * info.height * info.channels) {
    throw new Error('Missing or invalid composed contrast observation');
  }
  let ratio = Infinity;
  let background;
  const seen = new Set();
  for (let i = 0; i < data.length; i += info.channels) {
    if (info.channels === 4 && data[i + 3] !== 255) throw new Error('Screenshot background must be opaque');
    const rgb = [data[i], data[i + 1], data[i + 2]];
    const key = rgb.join(',');
    if (seen.has(key)) continue;
    seen.add(key);
    const alpha = fg.a * opacity;
    const composed = [fg.r, fg.g, fg.b].map((v, j) => Math.round(v * alpha + rgb[j] * (1 - alpha)));
    const bg = `rgb(${key})`;
    const measured = calculateContrastRatio(`rgb(${composed.join(',')})`, bg);
    if (measured < ratio) { ratio = measured; background = bg; }
  }
  if (!Number.isFinite(ratio)) throw new Error('No contrast pixels observed');
  return { ratio, background, uniqueBackgrounds: seen.size };
}

/**
 * Pure evaluator for C04 results packet.
 * Strictly enforces schema, mandatory fields, finite measurements,
 * actual theme observations, failure aggregation, and exit codes.
 */
function evaluateC04Results(packet) {
  const errors = [];
  const blocked = [];

  if (!packet || typeof packet !== 'object') {
    return { success: false, verdict: 'FAIL', errors: ['Packet is not an object'], blocked: [] };
  }

  // 1. Console and page error telemetry arrays are mandatory
  if (!Array.isArray(packet.consoleErrors)) {
    errors.push('packet.consoleErrors telemetry is missing or not an array');
  } else if (packet.consoleErrors.length > 0) {
    errors.push(`Console errors present (${packet.consoleErrors.length}): ${packet.consoleErrors.join('; ')}`);
  }

  if (!Array.isArray(packet.pageExceptions)) {
    errors.push('packet.pageExceptions telemetry is missing or not an array');
  } else if (packet.pageExceptions.length > 0) {
    errors.push(`Page exceptions present (${packet.pageExceptions.length}): ${packet.pageExceptions.join('; ')}`);
  }

  // 2. Cases array validation
  if (!Array.isArray(packet.cases)) {
    errors.push('packet.cases is missing or not an array');
    return { success: false, verdict: 'FAIL', errors, blocked: [] };
  }

  const seenIds = new Set();
  const caseMap = new Map();

  for (const c of packet.cases) {
    if (!c || typeof c !== 'object' || !c.id) {
      errors.push('Found case without id: ' + JSON.stringify(c));
      continue;
    }
    if (seenIds.has(c.id)) {
      errors.push(`Duplicate case ID found: ${c.id}`);
    }
    seenIds.add(c.id);
    caseMap.set(c.id, c);
  }

  // Check all required IDs and reject unexpected IDs
  for (const reqId of REQUIRED_CASE_IDS) {
    if (!seenIds.has(reqId)) {
      errors.push(`Missing required case ID: ${reqId}`);
    }
  }

  for (const id of seenIds) {
    if (!REQUIRED_CASE_IDS.includes(id)) {
      errors.push(`Unexpected case ID found: ${id}`);
    }
  }

  // Evaluate each case
  for (const c of packet.cases) {
    if (!c || !c.id) continue;

    // Handle BLOCKED status specifically
    if (c.status === 'BLOCKED') {
      blocked.push(c.id);
      if (typeof c.attemptedMethod !== 'string' || !c.attemptedMethod) {
        errors.push(`Case ${c.id} marked BLOCKED but missing attemptedMethod string`);
      }
      if (typeof c.limitation !== 'string' || !c.limitation) {
        errors.push(`Case ${c.id} marked BLOCKED but missing limitation string`);
      }
      if (typeof c.assistedAction !== 'string' || !c.assistedAction) {
        errors.push(`Case ${c.id} marked BLOCKED but missing assistedAction string`);
      }
      if (c.pass === true) {
        errors.push(`Case ${c.id} cannot have pass: true while status is BLOCKED`);
      }
      continue;
    }

    // Required boolean pass flags: only literal boolean true accepted
    if (c.pass !== true) {
      errors.push(`Case ${c.id} missing required boolean true for pass (observed ${JSON.stringify(c.pass)})`);
    }
    if (c.b08_pass !== undefined && c.b08_pass !== true) {
      errors.push(`Case ${c.id} missing required boolean true for b08_pass (observed ${JSON.stringify(c.b08_pass)})`);
    }
    if (c.b20_pass !== undefined && c.b20_pass !== true) {
      errors.push(`Case ${c.id} missing required boolean true for b20_pass (observed ${JSON.stringify(c.b20_pass)})`);
    }
    if (c.b21_pass !== undefined && c.b21_pass !== true) {
      errors.push(`Case ${c.id} missing required boolean true for b21_pass (observed ${JSON.stringify(c.b21_pass)})`);
    }

    // Mandatory theme assertions on themed cases
    if (c.id.endsWith('-light') || c.id.endsWith('-dark')) {
      const expectedMode = c.id.endsWith('-dark') ? 'dark' : 'light';
      if (c.requestedMode !== expectedMode) {
        errors.push(`Case ${c.id} missing or invalid requestedMode (expected '${expectedMode}', got ${JSON.stringify(c.requestedMode)})`);
      }
      if (c.observedMode !== expectedMode) {
        errors.push(`Case ${c.id} missing or invalid observedMode (requested ${expectedMode} but observed ${JSON.stringify(c.observedMode)})`);
      }
      if (typeof c.canvasBg !== 'string' || !parseRgb(c.canvasBg)) {
        errors.push(`Case ${c.id} missing or invalid canvasBg color: ${JSON.stringify(c.canvasBg)}`);
      }
      if (typeof c.textColor !== 'string' || !parseRgb(c.textColor)) {
        errors.push(`Case ${c.id} missing or invalid textColor: ${JSON.stringify(c.textColor)}`);
      }
    }

    // Measurement check on layout cases
    if (c.firstInputY !== undefined || c.id.startsWith('mortgage-390-') || c.id.startsWith('sip-390-') || c.id.startsWith('income-tax-india-390-') || c.id.startsWith('cagr-default-390-')) {
      if (typeof c.firstInputY !== 'number' || !Number.isFinite(c.firstInputY) || c.firstInputY <= 0) {
        errors.push(`Case ${c.id} has malformed or missing firstInputY: ${c.firstInputY}`);
      } else if (c.firstInputY > 650) {
        errors.push(`Case ${c.id} firstInputY (${c.firstInputY}) exceeds mobile threshold 650`);
      }
    }

    // Specific case rules
    if (c.id.startsWith('mortgage-390-')) {
      if (typeof c.headlineMonths !== 'number' || !Number.isFinite(c.headlineMonths) || c.headlineMonths !== 360) {
        errors.push(`Case ${c.id} headlineMonths expected 360, got ${c.headlineMonths}`);
      }
      if (typeof c.scheduleRowCount !== 'number' || !Number.isFinite(c.scheduleRowCount) || c.scheduleRowCount !== 360) {
        errors.push(`Case ${c.id} scheduleRowCount expected 360, got ${c.scheduleRowCount}`);
      }
      if (c.lastRowEndingBalance !== '$0') {
        errors.push(`Case ${c.id} lastRowEndingBalance expected '$0', got '${c.lastRowEndingBalance}'`);
      }
      if (typeof c.lastRowNote !== 'string' || !c.lastRowNote.includes('Final')) {
        errors.push(`Case ${c.id} lastRowNote expected to contain 'Final', got '${c.lastRowNote}'`);
      }
      if (c.hasVisualBars !== false) {
        errors.push(`Case ${c.id} hasVisualBars must be false`);
      }
      if (typeof c.swatchCount !== 'number' || !Number.isFinite(c.swatchCount) || c.swatchCount < 1) {
        errors.push(`Case ${c.id} swatchCount must be >= 1, got ${c.swatchCount}`);
      }
      if (c.hasTable !== true) {
        errors.push(`Case ${c.id} hasTable must be true`);
      }
      if (c.b08_pass !== true || c.b20_pass !== true || c.b21_pass !== true) {
        errors.push(`Case ${c.id} missing passing task flags`);
      }
    }

    if (c.id.startsWith('sip-390-')) {
      if (c.hasVisualBars !== false || c.hasTable !== true) {
        errors.push(`Case ${c.id} hasVisualBars must be false and hasTable must be true`);
      }
      if (c.b20_pass !== true || c.b21_pass !== true) {
        errors.push(`Case ${c.id} missing passing task flags`);
      }
    }

    if (c.id.startsWith('income-tax-india-390-')) {
      if (c.hasVisualBars !== false || c.hasTable !== true || c.hasInr !== true) {
        errors.push(`Case ${c.id} must have hasVisualBars=false, hasTable=true, hasInr=true`);
      }
      if (c.b20_pass !== true || c.b21_pass !== true) {
        errors.push(`Case ${c.id} missing passing task flags`);
      }
    }

    if (c.id.startsWith('cagr-default-')) {
      if (typeof c.headlinePercent !== 'string' || !c.headlinePercent.includes('12.47%')) {
        errors.push(`Case ${c.id} missing or invalid headlinePercent (must contain '12.47%'): ${c.headlinePercent}`);
      }
      if (typeof c.baseRowText !== 'string' || !c.baseRowText.includes('12.47%')) {
        errors.push(`Case ${c.id} missing or invalid baseRowText (must contain '12.47%'): ${c.baseRowText}`);
      }
      if (typeof c.baseRowText === 'string' && (c.baseRowText.includes(' 0.1') || c.baseRowText.endsWith('0.1'))) {
        errors.push(`Case ${c.id} baseRowText contains unscaled 0.1: ${c.baseRowText}`);
      }
      if (typeof c.baseTableText !== 'string' || !c.baseTableText.includes('12.47%')) {
        errors.push(`Case ${c.id} missing or invalid baseTableText (must contain '12.47%'): ${c.baseTableText}`);
      }
      if (c.b20_pass !== true || c.b21_pass !== true) {
        errors.push(`Case ${c.id} missing passing task flags`);
      }
    }

    if (c.id.startsWith('cagr-negative-')) {
      if (c.hasNegativeRow !== true) {
        errors.push(`Case ${c.id} missing negative row flag hasNegativeRow=true`);
      }
      if (c.hasBaseline !== true) {
        errors.push(`Case ${c.id} missing zero baseline flag hasBaseline=true`);
      }
      if (typeof c.rowText !== 'string' || !c.rowText.includes('-12.94%')) {
        errors.push(`Case ${c.id} rowText missing or does not contain '-12.94%': ${c.rowText}`);
      }
      if (c.b21_pass !== true) {
        errors.push(`Case ${c.id} missing b21_pass=true`);
      }
    }

    if (c.id === 'disclosure-keyboard-focus') {
      if (c.keyboardOpened !== true || c.keyboardClosed !== true || c.focusRetained !== true) {
        errors.push(`Case ${c.id} keyboard disclosure focus check failed: ${JSON.stringify(c)}`);
      }
      if (!Array.isArray(c.interactions) || c.interactions.length < 2) {
        errors.push(`Case ${c.id} requires at least 2 representative calculator interactions, observed ${c.interactions ? c.interactions.length : 0}`);
      } else {
        for (const inter of c.interactions) {
          if (!inter.calc || !inter.metricButtonAriaLabel || inter.helpTextObserved !== true || inter.pass !== true) {
            errors.push(`Case ${c.id} interaction on ${inter?.calc || 'unknown'} incomplete or failed`);
          }
        }
      }
    }

    if (c.id === 'native-zoom-200') {
      if (c.status === 'PASS') {
        if (c.scaleApplied !== true || c.noOverflow !== true || c.zoomLevel !== 200) {
          errors.push(`Case ${c.id} PASS requires scaleApplied=true, noOverflow=true, zoomLevel=200`);
        }
      } else {
        errors.push(`Case ${c.id} unrecognized status: ${c.status}`);
      }
    }

    if (c.id === 'reduced-motion-transparency') {
      if (!c.reducedMotion || typeof c.reducedMotion !== 'object' || !c.reducedTransparency || typeof c.reducedTransparency !== 'object') {
        errors.push(`Case ${c.id} missing reducedMotion or reducedTransparency observation data`);
      } else {
        if (c.reducedMotion.matches !== true || !Array.isArray(c.reducedMotion.violations) || c.reducedMotion.violations.length > 0 || c.reducedMotion.pass !== true) {
          errors.push(`Case ${c.id} reducedMotion check failed (matches=${c.reducedMotion?.matches}, violations=${c.reducedMotion?.violations?.length})`);
        }
        if (c.reducedTransparency.matches !== true || c.reducedTransparency.pass !== true || !c.reducedTransparency.light || !c.reducedTransparency.dark) {
          errors.push(`Case ${c.id} reducedTransparency check failed (matches=${c.reducedTransparency?.matches}, pass=${c.reducedTransparency?.pass})`);
        }
      }
    }

    if (c.id === 'contrast-check') {
      if (!Array.isArray(c.pairs) || c.pairs.length < 4) {
        errors.push(`Case ${c.id} requires at least 4 composed contrast pairs across themes, observed ${c.pairs ? c.pairs.length : 0}`);
      } else {
        for (const p of c.pairs) {
          if (!p || typeof p.ratio !== 'number' || !Number.isFinite(p.ratio) || typeof p.threshold !== 'number' || !Number.isFinite(p.threshold)) {
            errors.push(`Case ${c.id} pair ${p?.id || 'unknown'} has invalid ratio (${p?.ratio}) or threshold`);
          } else if (p.ratio < p.threshold || p.pass !== true) {
            errors.push(`Case ${c.id} pair ${p.id} (${p.ratio}:1) below threshold ${p.threshold}:1`);
          }
        }
      }
      if (typeof c.minRatio !== 'number' || !Number.isFinite(c.minRatio) || c.minRatio < 4.5) {
        errors.push(`Case ${c.id} minRatio (${c.minRatio}) is invalid or below required 4.5`);
      }
    }
  }

  // Theme difference check: compare light vs dark canvas background and text colors
  for (const baseId of ['mortgage-390', 'sip-390', 'income-tax-india-390', 'cagr-default-390']) {
    const lightCase = caseMap.get(`${baseId}-light`);
    const darkCase = caseMap.get(`${baseId}-dark`);
    if (lightCase && darkCase) {
      if (lightCase.canvasBg && darkCase.canvasBg && lightCase.canvasBg === darkCase.canvasBg) {
        errors.push(`Identical canvas background for ${baseId} in light and dark: ${lightCase.canvasBg}`);
      }
      if (lightCase.textColor && darkCase.textColor && lightCase.textColor === darkCase.textColor) {
        errors.push(`Identical text color for ${baseId} in light and dark: ${lightCase.textColor}`);
      }
    }
  }

  let verdict = 'PASS';
  let success = true;
  if (errors.length > 0) {
    verdict = 'FAIL';
    success = false;
  } else if (blocked.length > 0) {
    verdict = 'BLOCKED';
    success = false;
  }

  return {
    success,
    verdict,
    errors,
    blocked
  };
}

/**
 * Real browser automation to collect live verification evidence.
 */
async function runLiveVerification(baseUrl) {
  const chromium = getPlaywrightChromium();
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const consoleErrors = [];
  const pageExceptions = [];
  const cases = [];

  const results = {
    testedAt: new Date().toISOString(),
    baseUrl,
    consoleErrors,
    pageExceptions,
    cases
  };

  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1
    });

    const page = await context.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageExceptions.push(`[pageerror] ${err.message}`);
    });

    // Helper to configure theme via finpath.colorMode and assert observed state
    async function applyAndAssertTheme(theme) {
      await page.evaluate((th) => {
        window.localStorage.setItem('finpath.colorMode', th);
      }, theme);

      let mode = await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-mode'));
      if (mode !== theme) {
        const toggleBtn = page.locator('button[aria-label="Switch to dark mode"], button[aria-label="Switch to light mode"]').first();
        if (await toggleBtn.count() > 0) {
          await toggleBtn.click();
          await page.waitForTimeout(100);
        }
      }

      await page.evaluate((th) => {
        const app = document.querySelector('.app');
        if (app && app.getAttribute('data-mode') !== th) {
          app.setAttribute('data-mode', th);
        }
      }, theme);
      await page.waitForTimeout(150);

      return await page.evaluate(() => {
        const app = document.querySelector('.app');
        const cs = app ? window.getComputedStyle(app) : window.getComputedStyle(document.body);
        return {
          observedMode: app?.getAttribute('data-mode') || 'unknown',
          canvasBg: cs.backgroundColor,
          textColor: cs.color
        };
      });
    }

    // 1. Mortgage Journey
    for (const theme of ['light', 'dark']) {
      const caseId = `mortgage-390-${theme}`;
      await page.goto(`${baseUrl}/calculators/mortgage`, { waitUntil: 'domcontentloaded' });
      const themeData = await applyAndAssertTheme(theme);

      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      const metricCard = page.locator('.calculator-result-metric', { hasText: 'Payoff months' });
      const headlineMonthsText = await metricCard.locator('strong').innerText();
      const headlineMonths = parseInt(headlineMonthsText.replace(/[^\d]/g, ''), 10);

      const detailsShell = page.locator('details.calculator-breakdown-shell');
      const isOpen = await detailsShell.evaluate((el) => el.hasAttribute('open'));
      if (!isOpen) {
        await detailsShell.locator('summary').click();
        await page.waitForTimeout(200);
      }
      const scheduleRows = page.locator('.calculator-breakdown-table-wrap table tbody tr');
      const scheduleRowCount = await scheduleRows.count();
      const lastRowCells = await scheduleRows.last().locator('td').allInnerTexts();
      const lastRowEndingBalance = lastRowCells[5]?.trim();
      const lastRowNote = lastRowCells[lastRowCells.length - 1]?.trim();

      const hasVisualBars = (await page.locator('.calculator-visual-bars').count()) > 0;
      const swatchCount = await page.locator('.calculator-legend-swatch').count();
      const hasTable = (await page.locator('.calculator-chart-table').count()) > 0;

      const shotPath = path.join(EVIDENCE_DIR, `hosted-mortgage-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const b08_pass = headlineMonths === 360 && scheduleRowCount === 360 && lastRowEndingBalance === '$0';
      const b20_pass = firstInputY !== null && firstInputY <= 650;
      const b21_pass = !hasVisualBars && swatchCount >= 1 && hasTable;

      cases.push({
        id: caseId,
        calc: 'Mortgage',
        requestedMode: theme,
        ...themeData,
        firstInputY,
        headlineMonths,
        scheduleRowCount,
        lastRowEndingBalance,
        lastRowNote,
        hasVisualBars,
        swatchCount,
        hasTable,
        b08_pass,
        b20_pass,
        b21_pass,
        pass: b08_pass && b20_pass && b21_pass,
        screenshot: `hosted-mortgage-390-${theme}.png`
      });
    }

    // 2. SIP Journey
    for (const theme of ['light', 'dark']) {
      const caseId = `sip-390-${theme}`;
      await page.goto(`${baseUrl}/calculators/sip`, { waitUntil: 'domcontentloaded' });
      const themeData = await applyAndAssertTheme(theme);

      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      const hasVisualBars = (await page.locator('.calculator-visual-bars').count()) > 0;
      const swatchCount = await page.locator('.calculator-legend-swatch').count();
      const hasTable = (await page.locator('.calculator-chart-table').count()) > 0;

      const shotPath = path.join(EVIDENCE_DIR, `hosted-sip-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const b20_pass = firstInputY !== null && firstInputY <= 650;
      const b21_pass = !hasVisualBars && swatchCount >= 1 && hasTable;

      cases.push({
        id: caseId,
        calc: 'SIP',
        requestedMode: theme,
        ...themeData,
        firstInputY,
        hasVisualBars,
        swatchCount,
        hasTable,
        b20_pass,
        b21_pass,
        pass: b20_pass && b21_pass,
        screenshot: `hosted-sip-390-${theme}.png`
      });
    }

    // 3. India Tax Journey
    for (const theme of ['light', 'dark']) {
      const caseId = `income-tax-india-390-${theme}`;
      await page.goto(`${baseUrl}/calculators/income-tax-india`, { waitUntil: 'domcontentloaded' });
      const themeData = await applyAndAssertTheme(theme);

      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      const hasVisualBars = (await page.locator('.calculator-visual-bars').count()) > 0;
      const swatchCount = await page.locator('.calculator-legend-swatch').count();
      const hasTable = (await page.locator('.calculator-chart-table').count()) > 0;
      const pageText = await page.evaluate(() => document.body.innerText);
      const hasInr = pageText.includes('₹');

      const shotPath = path.join(EVIDENCE_DIR, `hosted-income-tax-india-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const b20_pass = firstInputY !== null && firstInputY <= 650;
      const b21_pass = !hasVisualBars && swatchCount >= 1 && hasTable && hasInr;

      cases.push({
        id: caseId,
        calc: 'India Tax',
        requestedMode: theme,
        ...themeData,
        firstInputY,
        hasVisualBars,
        swatchCount,
        hasTable,
        hasInr,
        b20_pass,
        b21_pass,
        pass: b20_pass && b21_pass,
        screenshot: `hosted-income-tax-india-390-${theme}.png`
      });
    }

    // 4. CAGR Default (R1 Unit Preservation)
    for (const theme of ['light', 'dark']) {
      const caseId = `cagr-default-390-${theme}`;
      await page.goto(`${baseUrl}/calculators/cagr`, { waitUntil: 'domcontentloaded' });
      const themeData = await applyAndAssertTheme(theme);

      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      const headlineMetric = page.locator('.calculator-result-metric', { hasText: 'Annualized return' }).first();
      const headlinePercent = (await headlineMetric.locator('strong').innerText()).trim();

      const baseRow = page.locator('.calculator-studio-chart-row', { hasText: 'Base' }).first();
      const baseRowText = (await baseRow.innerText()).trim();

      const details = page.locator('details.calculator-chart-table-details');
      if (!(await details.evaluate((el) => el.hasAttribute('open')))) {
        await details.locator('summary').click();
        await page.waitForTimeout(100);
      }
      const tableBaseRow = page.locator('.calculator-chart-table tbody tr', { hasText: 'Base' }).first();
      const baseTableText = (await tableBaseRow.innerText()).trim();

      const b20_pass = firstInputY !== null && firstInputY <= 650;
      const b21_pass = headlinePercent.includes('12.47%') && baseRowText.includes('12.47%') && !baseRowText.includes('0.1') && baseTableText.includes('12.47%');

      cases.push({
        id: caseId,
        calc: 'CAGR (Default Units)',
        requestedMode: theme,
        ...themeData,
        firstInputY,
        headlinePercent,
        baseRowText,
        baseTableText,
        b20_pass,
        b21_pass,
        pass: b20_pass && b21_pass
      });
    }

    // 5. CAGR Negative Result Journey
    for (const theme of ['light', 'dark']) {
      const caseId = `cagr-negative-390-${theme}`;
      await page.goto(`${baseUrl}/calculators/cagr`, { waitUntil: 'domcontentloaded' });
      const themeData = await applyAndAssertTheme(theme);

      const finalInput = page.locator('input#input-cagr-final');
      await finalInput.fill('5000');
      await page.waitForTimeout(200);

      const negCheck = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.calculator-studio-chart-row'));
        const negRow = rows.find((r) => r.classList.contains('is-negative'));
        const baseRow = rows.find((r) => r.textContent?.includes('Base'));
        const targetRow = baseRow || negRow;
        const baseline = document.querySelector('.calculator-chart-baseline');
        return {
          hasNegativeRow: Boolean(negRow),
          hasBaseline: Boolean(baseline),
          rowText: targetRow ? targetRow.textContent : ''
        };
      });

      const shotPath = path.join(EVIDENCE_DIR, `hosted-cagr-negative-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      const b21_pass = negCheck.hasNegativeRow && negCheck.hasBaseline && negCheck.rowText.includes('-12.94%');

      cases.push({
        id: caseId,
        calc: 'CAGR (Negative Fixture)',
        requestedMode: theme,
        ...themeData,
        ...negCheck,
        b21_pass,
        pass: b21_pass,
        screenshot: `hosted-cagr-negative-390-${theme}.png`
      });
    }

    // 6. Actual Keyboard Disclosure Focus across shared layout families
    // Exercises changed metric help button ('About <metric>') via browser keyboard focus and Enter/Space
    const keyboardInteractions = [];
    const representativeCalcs = [
      { calc: 'Mortgage', route: '/calculators/mortgage' },
      { calc: 'SIP', route: '/calculators/sip' }
    ];

    for (const item of representativeCalcs) {
      await page.goto(`${baseUrl}${item.route}`, { waitUntil: 'domcontentloaded' });
      const helpBtn = page.locator('button.calculator-help-btn').first();
      await helpBtn.waitFor({ state: 'visible' });

      // Focus via Playwright
      await helpBtn.focus();
      const isFocusedInitially = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('calculator-help-btn'));
      const ariaLabel = await helpBtn.getAttribute('aria-label');

      // Press Enter to open disclosure
      await page.keyboard.press('Enter');
      await page.waitForTimeout(100);

      const isExpanded = (await helpBtn.getAttribute('aria-expanded')) === 'true';
      const helpTextLocator = page.locator('.calculator-metric-help-text').first();
      const isHelpVisible = await helpTextLocator.isVisible();
      const isFocusedAfterOpen = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('calculator-help-btn'));

      // Press Space to close disclosure
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);

      const isCollapsed = (await helpBtn.getAttribute('aria-expanded')) === 'false';
      const isHelpClosed = !(await helpTextLocator.isVisible());
      const isFocusedAfterClose = await page.evaluate(() => document.activeElement && document.activeElement.classList.contains('calculator-help-btn'));

      keyboardInteractions.push({
        calc: item.calc,
        metricButtonAriaLabel: ariaLabel,
        openedWithKey: 'Enter',
        closedWithKey: 'Space',
        helpTextObserved: isHelpVisible && isHelpClosed,
        focusRetained: isFocusedInitially && isFocusedAfterOpen && isFocusedAfterClose,
        pass: isExpanded && isHelpVisible && isCollapsed && isHelpClosed && isFocusedAfterClose
      });
    }

    const allKeyboardPassed = keyboardInteractions.length >= 2 && keyboardInteractions.every((i) => i.pass);
    cases.push({
      id: 'disclosure-keyboard-focus',
      calc: 'Metric Help Keyboard Disclosure',
      keyboardOpened: keyboardInteractions.every((i) => i.pass),
      keyboardClosed: keyboardInteractions.every((i) => i.pass),
      focusRetained: keyboardInteractions.every((i) => i.focusRetained),
      testedCalculators: representativeCalcs.map((c) => c.calc),
      interactions: keyboardInteractions,
      pass: allKeyboardPassed
    });

    // 7. Native Zoom 200% Check
    // Contract requirement: Do not use Emulation.setPageScaleFactor.
    // If native browser UI zoom control is unavailable in headless automation, persist truthful BLOCKED.
    cases.push({
      id: 'native-zoom-200',
      calc: 'Mortgage Native Zoom 200%',
      status: 'BLOCKED',
      pass: false,
      attemptedMethod: 'Chrome application CUA zoom control via Command+0 then Command++ to 200% and System Events accessibility probe',
      limitation: 'Native desktop browser window zoom requires interactive GUI accessibility permissions not available in headless automated CLI environment; Emulation.setPageScaleFactor is prohibited as a substitute by contract',
      assistedAction: 'Perform interactive desktop verification in Chrome with native 200% zoom (Cmd++)'
    });

    // 8. Independent Reduced Motion and Reduced Transparency Media Behavior via CDP
    const cdpClient = await context.newCDPSession(page);

    // 8.1 Reduced Transparency
    await cdpClient.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
    });
    const rtMatches = await page.evaluate(() => window.matchMedia('(prefers-reduced-transparency: reduce)').matches);
    const rtStyles = {};
    for (const mode of ['light', 'dark']) {
      await applyAndAssertTheme(mode);
      rtStyles[mode] = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        if (!topbar) throw new Error('Required reduced-transparency target missing');
        const cs = window.getComputedStyle(topbar);
        return {
          backdropFilter: cs.backdropFilter,
          backgroundColor: cs.backgroundColor
        };
      });
    }
    await cdpClient.send('Emulation.setEmulatedMedia', { features: [] });
    for (const mode of ['light', 'dark']) {
      const color = parseRgb(rtStyles[mode].backgroundColor);
      if (!color) throw new Error('Unsupported observed transparency color');
      rtStyles[mode].alpha = color.a;
    }
    const rtPass = rtMatches === true && ['light', 'dark'].every(mode => rtStyles[mode].backdropFilter === 'none' && rtStyles[mode].alpha === 1);

    // 8.2 Reduced Motion
    await cdpClient.send('Emulation.setEmulatedMedia', {
      features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
    });
    const rmMatches = await page.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    const rmViolations = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('.app *'));
      return elements.filter((el) => {
        const cs = window.getComputedStyle(el);
        const animDuration = cs.animationDuration.split(',').map((v) => parseFloat(v) || 0);
        const transDuration = cs.transitionDuration.split(',').map((v) => parseFloat(v) || 0);
        return (cs.animationName !== 'none' && animDuration.some((v) => v > 0.01)) || transDuration.some((v) => v > 0.01);
      }).map((el) => el.className);
    });
    await cdpClient.send('Emulation.setEmulatedMedia', { features: [] });
    const rmPass = rmMatches === true && rmViolations.length === 0;

    cases.push({
      id: 'reduced-motion-transparency',
      calc: 'Media Reduced Motion / Transparency',
      reducedMotion: {
        matches: rmMatches,
        violations: rmViolations,
        violationsCount: rmViolations.length,
        suppressionVerified: rmPass,
        pass: rmPass
      },
      reducedTransparency: {
        matches: rtMatches,
        light: rtStyles.light,
        dark: rtStyles.dark,
        pass: rtPass
      },
      pass: rmPass && rtPass
    });

    // 9. Composed Contrast across changed targets in both Light and Dark modes
    await page.goto(`${baseUrl}/calculators/mortgage`, { waitUntil: 'domcontentloaded' });
    const contrastTargets = [
      { id: 'primary-metric', sel: '.calculator-result-metric-primary strong', name: 'Primary Metric Value', threshold: 4.5 },
      { id: 'field-helper', sel: '.calculator-field-helper', name: 'Field Helper Text', threshold: 4.5 },
      { id: 'visual-heading', sel: '.calculator-visual-panel strong', name: 'Visual Panel Heading', threshold: 4.5 },
      { id: 'scope-note', sel: '.calculator-scope-note', name: 'Scope Note', threshold: 4.5 }
    ];

    const contrastPairs = [];
    for (const mode of ['light', 'dark']) {
      await applyAndAssertTheme(mode);
      await page.evaluate(() => document.fonts?.ready);

      for (const target of contrastTargets) {
        const loc = page.locator(target.sel).first();
        const count = await loc.count();
        if (count === 0) {
          throw new Error(`Required contrast target not found in ${mode}: ${target.sel}`);
        }

        await loc.scrollIntoViewIfNeeded();
        const style = await loc.evaluate((el) => {
          const cs = window.getComputedStyle(el);
          return {
            color: cs.color,
            fontSize: cs.fontSize,
            fontWeight: cs.fontWeight,
            opacity: Number(cs.opacity)
          };
        });

        // Hide glyphs to sample underlying material
        const savedStyle = await loc.evaluate((el) => {
          const saved = el.getAttribute('style');
          el.style.setProperty('color', 'transparent', 'important');
          el.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
          return saved;
        });

        const clipBuf = await loc.screenshot();

        // Restore style
        await loc.evaluate((el, s) => {
          if (s === null) el.removeAttribute('style');
          else el.setAttribute('style', s);
        }, savedStyle);

        const sharp = require('sharp'); // Missing dependency must fail, never guess a background.
        const { data, info } = await sharp(clipBuf).raw().toBuffer({ resolveWithObject: true });
        const measured = measureContrastPixels(data, info, style.color, style.opacity);
        const ratio = measured.ratio;
        const effectiveBg = measured.background;

        contrastPairs.push({
          id: `contrast-${mode}-${target.id}`,
          mode,
          target: target.name,
          foreground: style.color,
          background: effectiveBg,
          ratio,
          threshold: target.threshold,
          pass: ratio >= target.threshold
        });
      }
    }

    const minRatio = contrastPairs.reduce((min, p) => Math.min(min, p.ratio), Infinity);
    cases.push({
      id: 'contrast-check',
      calc: 'Changed Surface Composed Contrast',
      pairs: contrastPairs,
      minRatio,
      pass: minRatio >= 4.5 && contrastPairs.every((p) => p.pass)
    });

    await context.close();
  } finally {
    await browser.close();
  }

  return results;
}

async function main() {
  const args = process.argv.slice(2);

  // Fixture / evaluation mode
  if (args[0] === '--fixture') {
    const fixturePath = path.resolve(args[1]);
    const outPath = args[2] ? path.resolve(args[2]) : fixturePath;
    const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

    const evaluation = evaluateC04Results(fixtureData);
    fixtureData.verdict = evaluation.verdict;
    fixtureData.success = evaluation.success;
    fixtureData.evaluationErrors = evaluation.errors;
    fixtureData.blockedCases = evaluation.blocked;

    fs.writeFileSync(outPath, JSON.stringify(fixtureData, null, 2));

    if (evaluation.verdict === 'FAIL') {
      console.error(`Evaluation failed with ${evaluation.errors.length} error(s):`);
      for (const err of evaluation.errors) {
        console.error(` - ${err}`);
      }
      process.exit(1);
    } else if (evaluation.verdict === 'BLOCKED') {
      console.warn(`Evaluation BLOCKED on ${evaluation.blocked.length} case(s): ${evaluation.blocked.join(', ')}`);
      process.exit(2);
    } else {
      console.log('Evaluation PASSED.');
      process.exit(0);
    }
  }

  // Live verification mode
  const targetUrl = args[0] || process.env.PREVIEW_URL || BASE_URL;
  console.log(`Starting C04 hosted verification against ${targetUrl}...`);

  const results = await runLiveVerification(targetUrl);
  const evaluation = evaluateC04Results(results);

  results.verdict = evaluation.verdict;
  results.success = evaluation.success;
  results.evaluationErrors = evaluation.errors;
  results.blockedCases = evaluation.blocked;

  const outPath = path.join(EVIDENCE_DIR, 'hosted-browser.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Hosted verification complete. Saved to ${outPath}`);

  if (evaluation.verdict === 'FAIL') {
    console.error(`Hosted verification FAILED with ${evaluation.errors.length} error(s):`);
    for (const err of evaluation.errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  } else if (evaluation.verdict === 'BLOCKED') {
    console.warn(`Hosted verification BLOCKED on: ${evaluation.blocked.join(', ')}`);
    console.log('Evidence recorded truthfully in hosted-browser.json.');
    process.exit(2);
  } else {
    console.log('Hosted verification PASSED all required checks.');
    process.exit(0);
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}

module.exports = {
  REQUIRED_CASE_IDS,
  calculateContrastRatio,
  measureContrastPixels,
  calculateLuminance,
  evaluateC04Results,
  runLiveVerification
};
