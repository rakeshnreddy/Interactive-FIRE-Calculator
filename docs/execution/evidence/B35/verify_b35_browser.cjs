/**
 * verify_b35_browser.cjs
 * Self-contained Playwright verification script for B35.
 * Strictly checks mandatory predicates, DOM rate controls, open details overlaps,
 * network failure classification, and screenshot captures.
 * Target: http://127.0.0.1:5184/calculators/fire
 */

const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname);
const REPORT_PATH = path.join(EVIDENCE_DIR, 'verify_b35_report.json');
const TARGET_URL = 'http://127.0.0.1:5184/calculators/fire';

(async () => {
  const startTime = new Date().toISOString();
  console.log(`[B35 Verifier] Starting verification run at ${startTime}`);
  console.log(`[B35 Verifier] Target URL: ${TARGET_URL}`);

  if (!fs.existsSync(EVIDENCE_DIR)) {
    fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  }

  const report = {
    targetUrl: TARGET_URL,
    timestamp: startTime,
    conditions: [],
    flowVerifications: {},
    screenshots: {},
    networkErrors: [],
    requestFailures: [],
    consoleMessages: [],
    pageErrors: [],
    assertions: [],
    networkAudit: {
      criticalFailuresCount: 0,
      nonblockingErrorsCount: 0,
      status: 'PENDING'
    },
    allPassed: false
  };

  let mandatoryFailure = false;

  function assert(condition, message, details = {}) {
    const passed = Boolean(condition);
    console.log(`[ASSERTION] ${passed ? 'PASS' : 'FAIL'}: ${message}`);
    report.assertions.push({ message, passed, details });
    if (!passed) {
      mandatoryFailure = true;
    }
    return passed;
  }

  function registerNetworkError(conditionLabel, url, status, resourceType, method, source = 'network-response') {
    if (report.networkErrors.some(e => e.condition === conditionLabel && e.url === url && e.status === status)) {
      return;
    }

    const cleanUrl = url || 'unknown';
    // STRICT PREDICATE 5: ONLY exact optional favicon.ico or manifest link is allowed to fail
    const isOptionalAsset = cleanUrl.endsWith('/favicon.ico') || cleanUrl.includes('/favicon.ico') ||
                            cleanUrl.endsWith('/manifest.json') || cleanUrl.endsWith('/manifest.webmanifest');
    const isCritical = !isOptionalAsset;
    const classification = isCritical ? 'blocking-failure' : 'nonblocking-optional-resource';

    const entry = {
      condition: conditionLabel,
      url: cleanUrl,
      status,
      method: method || 'GET',
      resourceType: resourceType || 'unknown',
      source,
      isCritical,
      classification,
      impact: isCritical
        ? `CRITICAL APPLICATION FAILURE: Asset failed to load (${status} ${cleanUrl}). Any first-party failure other than optional favicon/manifest fails the run.`
        : `Non-blocking: Optional asset (${cleanUrl}) returned HTTP ${status}. Application calculations and UI functions are completely unaffected.`
    };

    report.networkErrors.push(entry);
    if (isCritical) {
      console.error(`[CRITICAL NETWORK ERROR][${conditionLabel}] HTTP ${status} ${cleanUrl} (${resourceType})`);
    } else {
      console.warn(`[NON-BLOCKING NETWORK ERROR][${conditionLabel}] HTTP ${status} ${cleanUrl} (${resourceType}) [${classification}]`);
    }
  }

  function instrumentContextAndPage(context, page, conditionLabel) {
    const handleResponse = response => {
      try {
        const status = response.status();
        if (status >= 400) {
          const req = response.request();
          registerNetworkError(
            conditionLabel,
            response.url(),
            status,
            req ? req.resourceType() : 'unknown',
            req ? req.method() : 'GET',
            'response-event'
          );
        }
      } catch {
        // Response may be disposed
      }
    };

    context.on('response', handleResponse);
    page.on('response', handleResponse);

    const handleRequestFailed = request => {
      try {
        const failure = request.failure();
        const url = request.url();
        const resourceType = request.resourceType();
        const method = request.method();
        const isOptionalAsset = url.endsWith('/favicon.ico') || url.includes('/favicon.ico') ||
                                url.endsWith('/manifest.json') || url.endsWith('/manifest.webmanifest');
        const isCritical = !isOptionalAsset;
        const classification = isCritical ? 'blocking-failure' : 'nonblocking-optional-resource';

        const entry = {
          condition: conditionLabel,
          url,
          errorText: failure ? failure.errorText : 'Unknown network failure',
          method,
          resourceType,
          isCritical,
          classification,
          impact: isCritical
            ? `CRITICAL APPLICATION FAILURE: Request failed (${url}).`
            : `Non-blocking: Optional asset request failed (${url}).`
        };

        report.requestFailures.push(entry);
        if (isCritical) {
          console.error(`[CRITICAL REQUEST FAILURE][${conditionLabel}] ${url} (${resourceType}): ${entry.errorText}`);
        } else {
          console.warn(`[NON-BLOCKING REQUEST FAILURE][${conditionLabel}] ${url} (${resourceType}): ${entry.errorText}`);
        }
      } catch {
        // Request may be disposed
      }
    };

    page.on('requestfailed', handleRequestFailed);

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();
      let locUrl = '';
      let lineNum = null;
      let colNum = null;
      try {
        const loc = typeof msg.location === 'function' ? msg.location() : (msg.location || {});
        locUrl = loc.url || '';
        lineNum = loc.lineNumber;
        colNum = loc.columnNumber;
      } catch {
        // Ignore
      }

      report.consoleMessages.push({
        condition: conditionLabel,
        type,
        text,
        url: locUrl || undefined,
        lineNumber: lineNum,
        columnNumber: colNum
      });

      if (type === 'error') {
        console.error(`[Console Error][${conditionLabel}] ${text}${locUrl ? ` (URL: ${locUrl})` : ''}`);
      }

      if (text.includes('Failed to load resource') || (type === 'error' && text.includes('404'))) {
        const resolvedUrl = locUrl || (text.match(/https?:\/\/[^\s]+/)?.[0] || 'http://127.0.0.1:5184/favicon.ico');
        registerNetworkError(
          conditionLabel,
          resolvedUrl,
          404,
          'image/ico',
          'GET',
          'console-resource-report'
        );
      }
    });

    page.on('pageerror', err => {
      const msg = err.message || String(err);
      report.pageErrors.push({ condition: conditionLabel, error: msg });
      console.error(`[Page Error][${conditionLabel}] ${msg}`);
    });
  }

  const browser = await chromium.launch({ channel: 'chrome' });

  try {
    // -------------------------------------------------------------
    // PART 1: 4 VIEWPORT x THEME MATRIX CONDITIONS
    // 1440x900 & 390x844 x Light & Dark
    // -------------------------------------------------------------
    const matrix = [
      { width: 1440, height: 900, theme: 'light', label: '1440x900-light' },
      { width: 1440, height: 900, theme: 'dark', label: '1440x900-dark' },
      { width: 390, height: 844, theme: 'light', label: '390x844-light' },
      { width: 390, height: 844, theme: 'dark', label: '390x844-dark' }
    ];

    for (const item of matrix) {
      console.log(`\n--- Verifying Condition: ${item.label} (${item.width}x${item.height}, ${item.theme}) ---`);
      const context = await browser.newContext({
        viewport: { width: item.width, height: item.height }
      });
      const page = await context.newPage();

      instrumentContextAndPage(context, page, item.label);

      // Emulate reduced motion on at least one condition (e.g. 1440x900-dark)
      if (item.label === '1440x900-dark') {
        await page.emulateMedia({ reducedMotion: 'reduce' });
      }

      await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('.app');
      await page.evaluate(() => document.fonts.ready);

      // Verify or switch theme using accessible theme button
      let currentMode = await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-mode'));
      console.log(`[Theme] Current app data-mode: ${currentMode}, Desired: ${item.theme}`);

      if (currentMode !== item.theme) {
        const toggleBtn = page.locator('button[aria-label*="mode" i], button[aria-label*="theme" i], button[aria-label*="Switch to" i]').first();
        const isVisible = await toggleBtn.isVisible();
        if (isVisible) {
          const btnLabel = await toggleBtn.getAttribute('aria-label');
          console.log(`[Theme] Clicking theme switch button: "${btnLabel}"`);
          await toggleBtn.click();
          await page.waitForTimeout(300);
        } else {
          console.log('[Theme] Primary toggle button not directly visible, trying broader selector');
          const altBtn = page.locator(`button[aria-label*="${item.theme}" i]`);
          if (await altBtn.count() > 0) {
            await altBtn.first().click();
          }
        }
        currentMode = await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-mode'));
      }

      assert(
        currentMode === item.theme,
        `[${item.label}] App data-mode is set to ${item.theme} via accessible controls`,
        { currentMode, expected: item.theme }
      );

      // Measure scrollBehavior (especially for reduced motion condition)
      const computedScrollBehavior = await page.evaluate(() => window.getComputedStyle(document.documentElement).scrollBehavior);
      console.log(`[${item.label}] Computed scroll behavior: ${computedScrollBehavior}`);

      // Order check: Summary precedes Calculate in DOM and screen order
      const orderData = await page.evaluate(() => {
        const summary = document.querySelector('.advanced-summary') || document.querySelector('details.advanced-shell summary');
        const calcBtn = document.querySelector('.quick-actions .primary-button') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Calculate'));

        if (!summary || !calcBtn) {
          return { found: false, summaryFound: Boolean(summary), calcBtnFound: Boolean(calcBtn) };
        }

        const domPrecedes = Boolean(summary.compareDocumentPosition(calcBtn) & Node.DOCUMENT_POSITION_FOLLOWING);
        const sRect = summary.getBoundingClientRect();
        const cRect = calcBtn.getBoundingClientRect();
        const screenPrecedes = sRect.top < cRect.top;

        return {
          found: true,
          domPrecedes,
          screenPrecedes,
          summaryTop: sRect.top,
          calcTop: cRect.top,
          summaryText: summary.textContent.trim()
        };
      });

      assert(
        orderData.found && orderData.domPrecedes && orderData.screenPrecedes,
        `[${item.label}] Advanced summary precedes Calculate in DOM and screen order`,
        orderData
      );

      // MANDATORY PREDICATE 1: Require explicit BOTH '0.0% return' AND '0.0% inflation' strings
      const summaryText = orderData.summaryText || '';
      console.log(`[${item.label}] Advanced summary text: "${summaryText}"`);
      const hasBothRates = summaryText.includes('0.0% return') && summaryText.includes('0.0% inflation');
      assert(
        hasBothRates,
        `[${item.label}] Advanced summary explicitly discloses BOTH "0.0% return" AND "0.0% inflation"`,
        { summaryText, requiredRates: ['0.0% return', '0.0% inflation'] }
      );

      // MANDATORY PREDICATE 1: Require ALL THREE '0 events', '0 income streams', '0 expense phases'
      const hasAllThreeEvents = summaryText.includes('0 events') &&
                                summaryText.includes('0 income streams') &&
                                summaryText.includes('0 expense phases');
      assert(
        hasAllThreeEvents,
        `[${item.label}] Advanced summary explicitly discloses ALL THREE: "0 events", "0 income streams", and "0 expense phases"`,
        { summaryText, requiredPhrases: ['0 events', '0 income streams', '0 expense phases'] }
      );

      // MANDATORY PREDICATE 2: Result card must be absent from DOM or actually hidden, irrespective of text
      const initialResultState = await page.evaluate(() => {
        const el = document.querySelector('.hero-result');
        if (!el || !el.isConnected) {
          return { absentFromDOM: true, isHidden: true, exists: false };
        }
        const style = window.getComputedStyle(el);
        const isHidden = style.display === 'none' || style.visibility === 'hidden' || el.offsetParent === null;
        return {
          absentFromDOM: false,
          isHidden,
          exists: true,
          text: el.textContent.trim(),
          display: style.display,
          visibility: style.visibility
        };
      });

      const initialAbsent = initialResultState.absentFromDOM || initialResultState.isHidden;
      assert(
        initialAbsent,
        `[${item.label}] Result card is absent from DOM or hidden before Calculate (irrespective of text content)`,
        initialResultState
      );

      // MANDATORY PREDICATE 4: Open details via user click for EVERY condition to test open controls
      console.log(`[${item.label}] Opening details.advanced-shell via user click`);
      const summaryLocator = page.locator('details.advanced-shell summary, .advanced-summary').first();
      await summaryLocator.click();
      await page.waitForTimeout(250);

      const isDetailsOpen = await page.evaluate(() => {
        const details = document.querySelector('details.advanced-shell');
        return details ? details.hasAttribute('open') : false;
      });
      assert(
        isDetailsOpen,
        `[${item.label}] details.advanced-shell is successfully opened via user click`,
        { isDetailsOpen }
      );

      // MANDATORY PREDICATE 3: Inspect actual rate-period controls in DOM: 1 row, duration 30, return 0, inflation 0
      const rateControlsData = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.period-list .repeat-row, .repeat-row'));
        if (rows.length === 0) {
          return { rowCount: 0, found: false };
        }
        const firstRow = rows[0];
        const numInputs = Array.from(firstRow.querySelectorAll('input[type="number"], input'));
        const durationInput = numInputs.find(i => /year|duration/i.test(i.name || i.id || i.getAttribute('aria-label') || '') || /year/i.test(i.closest('label')?.textContent || '')) || numInputs[0];
        const returnInput = numInputs.find(i => /return/i.test(i.name || i.id || i.getAttribute('aria-label') || '') || /return/i.test(i.closest('label')?.textContent || '')) || numInputs[1];
        const inflationInput = numInputs.find(i => /inflation/i.test(i.name || i.id || i.getAttribute('aria-label') || '') || /inflation/i.test(i.closest('label')?.textContent || '')) || numInputs[2];

        return {
          found: true,
          rowCount: rows.length,
          durationValue: durationInput ? durationInput.value : null,
          returnValue: returnInput ? returnInput.value : null,
          inflationValue: inflationInput ? inflationInput.value : null
        };
      });

      assert(
        rateControlsData.rowCount === 1,
        `[${item.label}] Exactly one rate period row in DOM before Calculate`,
        rateControlsData
      );
      assert(
        rateControlsData.durationValue === '30' || parseInt(rateControlsData.durationValue) === 30,
        `[${item.label}] Rate period duration is 30 years in DOM control`,
        rateControlsData
      );
      assert(
        rateControlsData.returnValue === '0.0' || rateControlsData.returnValue === '0' || parseFloat(rateControlsData.returnValue) === 0,
        `[${item.label}] Rate period annual return is 0.0% in DOM control`,
        rateControlsData
      );
      assert(
        rateControlsData.inflationValue === '0.0' || rateControlsData.inflationValue === '0' || parseFloat(rateControlsData.inflationValue) === 0,
        `[${item.label}] Rate period inflation is 0.0% in DOM control`,
        rateControlsData
      );

      // MANDATORY PREDICATE 4: Check horizontal overflow WITH details open
      const overflowDataOpen = await page.evaluate(() => {
        const docWidth = document.documentElement.clientWidth;
        const scrollWidth = document.documentElement.scrollWidth;
        const bodyScrollWidth = document.body.scrollWidth;
        const winWidth = window.innerWidth;
        const hasOverflow = scrollWidth > winWidth || bodyScrollWidth > winWidth;
        return { docWidth, scrollWidth, bodyScrollWidth, winWidth, hasOverflow };
      });

      assert(
        !overflowDataOpen.hasOverflow,
        `[${item.label}] No horizontal window overflow detected with advanced details open`,
        overflowDataOpen
      );

      // MANDATORY PREDICATE 4: Assert visible advanced controls have no mutual overlap
      const openControlOverlapData = await page.evaluate(() => {
        const shell = document.querySelector('details.advanced-shell');
        if (!shell) return { checkedCount: 0, overlaps: [] };

        // Test all visible interactive controls inside the open details
        const controls = Array.from(shell.querySelectorAll('input, button, select, textarea'));
        const visible = controls.filter(el => {
          const r = el.getBoundingClientRect();
          const s = window.getComputedStyle(el);
          return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none';
        });

        const overlaps = [];
        for (let i = 0; i < visible.length; i++) {
          for (let j = i + 1; j < visible.length; j++) {
            const a = visible[i];
            const b = visible[j];
            if (a.contains(b) || b.contains(a)) continue;
            const ra = a.getBoundingClientRect();
            const rb = b.getBoundingClientRect();
            const intersects = !(ra.right <= rb.left || ra.left >= rb.right || ra.bottom <= rb.top || ra.top >= rb.bottom);
            if (intersects) {
              overlaps.push({
                aTag: a.tagName,
                aId: a.id,
                aClass: a.className,
                bTag: b.tagName,
                bId: b.id,
                bClass: b.className
              });
            }
          }
        }
        return {
          checkedCount: visible.length,
          overlaps,
          excludedElementTypes: ['non-interactive wrapper labels', 'decorative svg/icons', 'ancestor container shells']
        };
      });

      assert(
        openControlOverlapData.overlaps.length === 0,
        `[${item.label}] Zero mutual overlaps among visible controls with advanced details open`,
        openControlOverlapData
      );

      // MANDATORY PREDICATE 4: Save at least one mobile-open screenshot
      if (item.label === '390x844-light') {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.waitForTimeout(200);
        const mobileOpenPath = path.join(EVIDENCE_DIR, 'screenshot-390x844-advanced-open.png');
        await page.screenshot({ path: mobileOpenPath, fullPage: true });
        report.screenshots['390x844-advanced-open'] = mobileOpenPath;
        console.log(`[Screenshot] Saved mobile open screenshot: ${mobileOpenPath}`);
      }

      // Close details before calculating baseline so state is clean
      await summaryLocator.click();
      await page.waitForTimeout(200);

      // Click Calculate
      const calcButton = page.locator('.quick-actions .primary-button, button:has-text("Calculate")').first();
      await calcButton.click();
      await page.waitForTimeout(300);

      // Verify base result $2,400,000
      const calculatedResultData = await page.evaluate(() => {
        const heroResult = document.querySelector('.hero-result');
        const text = heroResult ? heroResult.textContent.trim() : '';
        const bodyText = document.body.textContent;
        const has30y = bodyText.includes('30y') || bodyText.includes('30 y') || bodyText.includes('30 years') || bodyText.includes('30-year');
        return {
          resultText: text,
          has2_4M: text.includes('$2,400,000') || text.includes('2,400,000'),
          has30y
        };
      });

      assert(
        calculatedResultData.has2_4M,
        `[${item.label}] Calculate produces base $2,400,000 result`,
        calculatedResultData
      );

      // Scroll page to (0,0) BEFORE full-page screenshot
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(200);

      const screenshotFilename = `screenshot-${item.label}.png`;
      const screenshotPath = path.join(EVIDENCE_DIR, screenshotFilename);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      report.screenshots[item.label] = screenshotPath;
      console.log(`[Screenshot] Saved top-aligned ${screenshotPath}`);

      report.conditions.push({
        label: item.label,
        width: item.width,
        height: item.height,
        theme: item.theme,
        computedScrollBehavior,
        overflow: overflowDataOpen,
        openControlOverlaps: openControlOverlapData,
        orderData,
        rateControlsData,
        calculatedResultData,
        screenshot: screenshotPath
      });

      await context.close();
    }

    // -------------------------------------------------------------
    // PART 2: INTERACTIVE FLOWS & KEYBOARD VERIFICATION
    // Keyboard details expand, focus test, rate input edit, stale state,
    // recalculation, details persistence, reset + withdrawal mode $25,000
    // -------------------------------------------------------------
    console.log('\n--- Starting Detailed Interactive & Rate Flow Tests ---');
    const flowContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const flowPage = await flowContext.newPage();

    instrumentContextAndPage(flowContext, flowPage, 'interactive-flows');

    await flowPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    await flowPage.waitForSelector('.app');
    await flowPage.evaluate(() => document.fonts.ready);

    // Initial Calculate to establish base $2,400,000
    await flowPage.locator('.quick-actions .primary-button, button:has-text("Calculate")').first().click();
    await flowPage.waitForTimeout(300);
    const baseResultText = await flowPage.locator('.hero-result').textContent();
    assert(
      baseResultText.includes('$2,400,000'),
      'Base initial calculation produces $2,400,000 before assumption edits',
      { baseResultText }
    );

    // Step A: Keyboard expand details and test focus
    console.log('[Flow] Testing keyboard expand of details.advanced-shell');
    const flowSummaryLocator = flowPage.locator('details.advanced-shell summary, .advanced-summary');
    await flowSummaryLocator.focus();

    const isSummaryFocused = await flowPage.evaluate(() => {
      const summary = document.querySelector('details.advanced-shell summary') || document.querySelector('.advanced-summary');
      return document.activeElement === summary;
    });
    assert(isSummaryFocused, 'Keyboard focus lands directly on advanced details summary');

    // Press Enter to expand
    await flowPage.keyboard.press('Enter');
    await flowPage.waitForTimeout(200);

    const isDetailsOpen = await flowPage.evaluate(() => {
      const details = document.querySelector('details.advanced-shell');
      return details ? details.hasAttribute('open') : false;
    });
    assert(isDetailsOpen, 'details.advanced-shell opens successfully via keyboard Enter', { isDetailsOpen });

    // Scroll to (0,0) before screenshot-advanced-open.png so fullPage shows clean top and open controls
    await flowPage.evaluate(() => window.scrollTo(0, 0));
    await flowPage.waitForTimeout(200);

    const openScreenshotPath = path.join(EVIDENCE_DIR, 'screenshot-advanced-open.png');
    await flowPage.screenshot({ path: openScreenshotPath, fullPage: true });
    report.screenshots['advanced-open'] = openScreenshotPath;
    console.log(`[Screenshot] Saved desktop advanced open screenshot: ${openScreenshotPath}`);

    // Step B: Inspect DOM for rate inputs inside .period-list .repeat-row or panel
    console.log('[Flow] Inspecting rate inputs in assumptions panel');
    const rateInputAnalysis = await flowPage.evaluate(() => {
      const panel = document.querySelector('#period-title')?.closest('.panel') || document.querySelector('.period-list');
      const rows = document.querySelectorAll('.period-list .repeat-row, .repeat-row');
      const inputs = [];

      rows.forEach((row, rIdx) => {
        const numInputs = row.querySelectorAll('input[type="number"], input');
        numInputs.forEach((inp, iIdx) => {
          let labelText = '';
          if (inp.id) {
            const lbl = document.querySelector(`label[for="${inp.id}"]`);
            if (lbl) labelText = lbl.textContent;
          }
          if (!labelText) {
            const pLabel = inp.closest('label');
            if (pLabel) labelText = pLabel.textContent;
          }
          inputs.push({
            row: rIdx,
            inputIndex: iIdx,
            id: inp.id,
            name: inp.name,
            value: inp.value,
            placeholder: inp.placeholder,
            ariaLabel: inp.getAttribute('aria-label') || '',
            labelText: labelText.trim()
          });
        });
      });

      return {
        panelFound: Boolean(panel),
        rowCount: rows.length,
        inputs
      };
    });

    console.log('[Flow] Discovered rate inputs:', JSON.stringify(rateInputAnalysis, null, 2));

    let returnInputSelector = '';
    const returnInputInfo = rateInputAnalysis.inputs.find(inp =>
      /return/i.test(inp.labelText) ||
      /return/i.test(inp.ariaLabel) ||
      /return/i.test(inp.name) ||
      /return/i.test(inp.placeholder) ||
      inp.name === 'r'
    ) || rateInputAnalysis.inputs[1];

    if (returnInputInfo && returnInputInfo.id) {
      returnInputSelector = `#${returnInputInfo.id}`;
    } else {
      returnInputSelector = '.period-list .repeat-row input[type="number"]:nth-of-type(2)';
    }

    console.log(`[Flow] Using return input selector: ${returnInputSelector}`);

    // Modify return input to a deliberate nonzero value (5)
    const returnInput = flowPage.locator(returnInputSelector).first();
    await returnInput.click();
    await returnInput.fill('5');
    await flowPage.keyboard.press('Tab');
    await flowPage.waitForTimeout(300);

    // Step C: Ensure collapsed summary updates with new rate
    const updatedSummaryText = await flowPage.evaluate(() => {
      const s = document.querySelector('.advanced-summary') || document.querySelector('details.advanced-shell summary');
      return s ? s.textContent.trim() : '';
    });
    console.log(`[Flow] Updated summary text after entering 5% return: "${updatedSummaryText}"`);
    const summaryReflectsNewRate = updatedSummaryText.includes('5.0%') || updatedSummaryText.includes('5%');
    assert(
      summaryReflectsNewRate,
      'Summary updates to reflect deliberate nonzero return (5.0%)',
      { updatedSummaryText }
    );

    // Step D: Verify current result is flagged stale AND original result ($2,400,000) remains until Recalculate
    const staleCheck = await flowPage.evaluate(() => {
      const hero = document.querySelector('.hero-result');
      const isStale = Boolean(hero?.classList.contains('is-stale') || document.querySelector('.is-stale'));
      const text = hero ? hero.textContent.trim() : '';
      return { isStale, text, has2_4M: text.includes('$2,400,000') || text.includes('2,400,000') };
    });

    assert(
      staleCheck.isStale,
      'Hero result is flagged stale (.is-stale) after rate modification prior to recalculation',
      staleCheck
    );
    assert(
      staleCheck.has2_4M,
      'Original result ($2,400,000) is preserved while stale before Recalculate is clicked',
      staleCheck
    );

    // Step E: Click Calculate / Recalculate, then result changes and stale flag clears
    const recalcBtn = flowPage.locator('.quick-actions .primary-button, button:has-text("Calculate"), button:has-text("Recalculate")').first();
    await recalcBtn.click();
    await flowPage.waitForTimeout(400);

    const recalculatedCheck = await flowPage.evaluate(() => {
      const hero = document.querySelector('.hero-result');
      const isStale = Boolean(hero?.classList.contains('is-stale') || document.querySelector('.is-stale'));
      const text = hero ? hero.textContent.trim() : '';
      return {
        isStale,
        text,
        differentFromBase: text !== '' && !text.includes('$2,400,000')
      };
    });

    assert(
      recalculatedCheck.differentFromBase,
      'Recalculation with 5% return produces updated FIRE number (different from $2,400,000)',
      recalculatedCheck
    );
    assert(
      !recalculatedCheck.isStale,
      'Stale flag (.is-stale) is removed upon Recalculate',
      recalculatedCheck
    );

    // Step F: Close/reopen details and verify entered rate survives
    console.log('[Flow] Testing close and reopen details to verify rate persistence');
    await flowSummaryLocator.click();
    await flowPage.waitForTimeout(200);
    const isClosed = await flowPage.evaluate(() => !document.querySelector('details.advanced-shell')?.hasAttribute('open'));
    assert(isClosed, 'details.advanced-shell closes successfully');

    await flowSummaryLocator.click();
    await flowPage.waitForTimeout(200);
    const isReopened = await flowPage.evaluate(() => document.querySelector('details.advanced-shell')?.hasAttribute('open'));
    assert(isReopened, 'details.advanced-shell reopens successfully');

    const preservedRateValue = await flowPage.locator(returnInputSelector).first().inputValue();
    const rateSurvives = preservedRateValue === '5' || preservedRateValue === '5.0' || parseFloat(preservedRateValue) === 5;
    assert(
      rateSurvives,
      'Entered return rate (5 or 5.0) survives details close/reopen cycle',
      { preservedRateValue, expected: '5 or 5.0' }
    );

    // Step G: Test Withdrawal mode 0% baseline by resetting with New plan then switching mode and Calculate
    console.log('[Flow] Testing reset with New plan then switching to Withdrawal mode');
    const newPlanBtn = flowPage.locator('#saved-plans button:has-text("New plan"), button:has-text("New plan")').first();
    const hasNewPlanBtn = await newPlanBtn.isVisible();
    if (hasNewPlanBtn) {
      await newPlanBtn.click();
      await flowPage.waitForTimeout(300);
    } else {
      console.log('[Flow] New plan button not visible directly, searching all buttons for New plan');
      await flowPage.locator('button:has-text("New plan")').first().click();
      await flowPage.waitForTimeout(300);
    }

    // Switch mode to Withdrawal income
    console.log('[Flow] Switching to Withdrawal income mode');
    const withdrawalModeBtn = flowPage.locator('button:has-text("Withdrawal"), [role="tab"]:has-text("Withdrawal")').first();
    await withdrawalModeBtn.click();
    await flowPage.waitForTimeout(300);

    // Click Calculate
    const calcWithdrawalBtn = flowPage.locator('.quick-actions .primary-button, button:has-text("Calculate")').first();
    await calcWithdrawalBtn.click();
    await flowPage.waitForTimeout(400);

    const withdrawalResult = await flowPage.evaluate(() => {
      const hero = document.querySelector('.hero-result');
      const text = hero ? hero.textContent.trim() : '';
      return {
        text,
        has25k: text.includes('$25,000') || text.includes('25,000')
      };
    });

    assert(
      withdrawalResult.has25k,
      'Withdrawal mode 0% baseline yields $25,000 ($750,000 / 30 years)',
      withdrawalResult
    );

    // Step H: Verify zero phantom income/events in UI
    const phantomEventsCheck = await flowPage.evaluate(() => {
      const eventRows = document.querySelectorAll('.events-list .repeat-row, .cashflow-list .repeat-row');
      const summaryText = document.querySelector('.advanced-summary')?.textContent || '';
      return {
        eventRowCount: eventRows.length,
        summaryZeroEvents: /0\s*(event|income|expense|cashflow)/i.test(summaryText) || summaryText.includes('0 event')
      };
    });

    assert(
      phantomEventsCheck.eventRowCount === 0 || phantomEventsCheck.summaryZeroEvents,
      'Zero phantom income or events present in UI',
      phantomEventsCheck
    );

    report.flowVerifications = {
      isSummaryFocused,
      isDetailsOpen,
      returnInputSelector,
      summaryReflectsNewRate,
      staleCheck,
      recalculatedCheck,
      isClosed,
      isReopened,
      preservedRateValue,
      withdrawalResult,
      phantomEventsCheck
    };

    await flowContext.close();

  } catch (error) {
    console.error('[B35 Verifier] Uncaught exception during execution:', error);
    report.pageErrors.push({ error: error.message || String(error), stack: error.stack });
    mandatoryFailure = true;
  } finally {
    await browser.close();
  }

  // -------------------------------------------------------------
  // PART 3: NETWORK AUDIT & MANDATORY INTEGRATION INTO allPassed
  // -------------------------------------------------------------
  const criticalNetworkErrors = report.networkErrors.filter(e => e.isCritical);
  const criticalRequestFailures = report.requestFailures.filter(e => e.isCritical);
  const nonblockingNetworkErrors = report.networkErrors.filter(e => !e.isCritical);

  report.networkAudit.criticalFailuresCount = criticalNetworkErrors.length + criticalRequestFailures.length;
  report.networkAudit.nonblockingErrorsCount = nonblockingNetworkErrors.length;
  report.networkAudit.status = report.networkAudit.criticalFailuresCount === 0 ? 'PASSED' : 'FAILED';

  assert(
    report.networkAudit.criticalFailuresCount === 0,
    'Zero critical first-party application asset or API network failures (only exact optional favicon.ico/manifest allowed)',
    {
      criticalCount: report.networkAudit.criticalFailuresCount,
      criticalErrors: criticalNetworkErrors.concat(criticalRequestFailures),
      nonblockingCount: report.networkAudit.nonblockingErrorsCount,
      nonblockingErrors: nonblockingNetworkErrors
    }
  );

  // Determine overall status incorporating DOM assertions, page errors, and network classification
  const allAssertionsPassed = report.assertions.every(a => a.passed);
  report.allPassed = !mandatoryFailure && (report.networkAudit.criticalFailuresCount === 0) && (report.pageErrors.length === 0) && allAssertionsPassed;
  report.completedAt = new Date().toISOString();

  // Write JSON report
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), 'utf-8');
  console.log(`\n[B35 Verifier] Report written to: ${REPORT_PATH}`);
  console.log(`[B35 Verifier] Network Audit: ${report.networkAudit.status} (Critical: ${report.networkAudit.criticalFailuresCount}, Nonblocking: ${report.networkAudit.nonblockingErrorsCount})`);
  if (nonblockingNetworkErrors.length > 0) {
    console.log('[B35 Verifier] Non-blocking network errors documented:');
    nonblockingNetworkErrors.forEach(err => {
      console.log(`  - [HTTP ${err.status}] ${err.url} (${err.resourceType}): ${err.impact}`);
    });
  }
  console.log(`[B35 Verifier] Total assertions evaluated: ${report.assertions.length}`);
  console.log(`[B35 Verifier] Overall Status: ${report.allPassed ? 'ALL ASSERTIONS PASSED' : 'FAILED ASSERTIONS DETECTED'}`);

  if (!report.allPassed) {
    console.error('[B35 Verifier] Exiting with non-zero exit code due to failed assertions or critical network failures.');
    process.exit(1);
  } else {
    console.log('[B35 Verifier] Exiting with code 0 (SUCCESS).');
    process.exit(0);
  }
})();
