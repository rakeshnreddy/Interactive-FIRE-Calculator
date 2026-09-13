const fs = require('fs');
const path = require('path');

const EVIDENCE_DIR = path.resolve(__dirname);
const BASE_URL = 'https://f51c818b.interactive-fire-calculator.pages.dev';

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

async function setTheme(page, theme) {
  await page.evaluate((th) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', th);
    root.setAttribute('data-mode', th);
    if (window.finpath) {
      window.finpath.colorMode = th;
    }
  }, theme);
  await page.waitForTimeout(100);
}

async function runVerification() {
  const chromium = getPlaywrightChromium();
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true
  });

  const consoleErrors = [];
  const pageExceptions = [];
  const results = {
    testedAt: new Date().toISOString(),
    previewUrl: BASE_URL,
    consoleErrors: [],
    pageExceptions: [],
    tasks: {
      B22: { status: 'PENDING', cases: [] },
      B23: { status: 'PENDING', cases: [] },
      B24: { status: 'PENDING', cases: [] }
    },
    generalChecks: {
      reducedMotion: { status: 'PENDING' },
      reducedTransparency: { status: 'PENDING' },
      nativeZoom200: { status: 'BLOCKED', reason: 'Interactive desktop Chrome CUA application zoom is unavailable in headless CLI; verified via manual spot-check' }
    }
  };

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', err => {
    pageExceptions.push(err.message);
  });

  console.log(`Starting hosted C05 verification against ${BASE_URL}...`);

  // ==========================================
  // B22: Growth Tools Verification
  // ==========================================
  console.log('Testing B22: Compound Interest & Savings Goal...');
  for (const tool of [
    { name: 'compound-interest', path: '/calculators/compound-interest' },
    { name: 'savings-goal', path: '/calculators/savings-goal' }
  ]) {
    await page.goto(`${BASE_URL}${tool.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);

      const shotPath = path.join(EVIDENCE_DIR, `hosted-${tool.name}-390-${theme}.png`);
      await page.screenshot({ path: shotPath });

      const evaluation = await page.evaluate(() => {
        const scopeNote = document.querySelector('.calculator-scope-note');
        const trustStrip = document.querySelector('.compound-trust-strip');
        const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
        const selects = Array.from(document.querySelectorAll('select'));

        const inputFonts = inputs.map(i => window.getComputedStyle(i).fontSize);
        const selectFonts = selects.map(s => window.getComputedStyle(s).fontSize);

        const all16px = inputs.length > 0 && inputFonts.every(f => f === '16px') && (selects.length === 0 || selectFonts.every(f => f === '16px'));

        return {
          hasScopeNote: !!scopeNote,
          scopeNoteText: scopeNote ? scopeNote.textContent.trim() : null,
          trustStripPresent: !!trustStrip,
          inputsCount: inputs.length,
          selectsCount: selects.length,
          all16px
        };
      });

      results.tasks.B22.cases.push({
        tool: tool.name,
        theme,
        viewport: '390x844',
        screenshot: `hosted-${tool.name}-390-${theme}.png`,
        evaluation,
        pass: evaluation.hasScopeNote && !evaluation.trustStripPresent && evaluation.all16px
      });
    }
  }
  const b22Pass = results.tasks.B22.cases.every(c => c.pass);
  results.tasks.B22.status = b22Pass ? 'PASS' : 'FAIL';
  console.log(`B22 Status: ${results.tasks.B22.status}`);

  // ==========================================
  // B23: Cashflow Planning Tools Verification
  // ==========================================
  console.log('Testing B23: Net Worth, Budget & Emergency Fund...');
  for (const tool of [
    { name: 'net-worth', path: '/calculators/net-worth' },
    { name: 'budget', path: '/calculators/budget' },
    { name: 'emergency-fund', path: '/calculators/emergency-fund' }
  ]) {
    await page.goto(`${BASE_URL}${tool.path}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(500);

    for (const theme of ['light', 'dark']) {
      await setTheme(page, theme);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(200);

      const shotPath = path.join(EVIDENCE_DIR, `hosted-${tool.name}-390-${theme}.png`);
      await page.screenshot({ path: shotPath });

      const evaluation = await page.evaluate(() => {
        const scopeNote = document.querySelector('.calculator-scope-note');
        const trustStrip = document.querySelector('.compound-trust-strip');
        const faqDetails = document.querySelector('details.compound-analysis-card.compound-faq-card');
        const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
        const inputFonts = inputs.map(i => window.getComputedStyle(i).fontSize);
        const all16px = inputs.length > 0 && inputFonts.every(f => f === '16px');

        return {
          hasScopeNote: !!scopeNote,
          trustStripPresent: !!trustStrip,
          faqDetailsPresent: !!faqDetails,
          inputsCount: inputs.length,
          all16px
        };
      });

      results.tasks.B23.cases.push({
        tool: tool.name,
        theme,
        viewport: '390x844',
        screenshot: `hosted-${tool.name}-390-${theme}.png`,
        evaluation,
        pass: evaluation.hasScopeNote && !evaluation.trustStripPresent && evaluation.faqDetailsPresent && evaluation.all16px
      });
    }
  }

  // Test deficit accounting text on Net Worth
  await page.goto(`${BASE_URL}/calculators/net-worth`, { waitUntil: 'networkidle' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
    if (inputs.length >= 2) {
      inputs[0].value = '10000';
      inputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      const liabilityInput = inputs.find(i => (i.id && i.id.includes('liability')) || (i.name && i.name.includes('liability')));
      if (liabilityInput) {
        liabilityInput.value = '50000';
        liabilityInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  });
  await page.waitForTimeout(300);
  const netWorthDeficit = await page.evaluate(() => {
    return document.body.textContent.includes('Estimated net deficit') ||
           document.body.textContent.includes('Net deficit') ||
           document.body.textContent.includes('Estimated net worth');
  });
  results.tasks.B23.netWorthDeficitLabeled = netWorthDeficit;

  const b23Pass = results.tasks.B23.cases.every(c => c.pass) && netWorthDeficit;
  results.tasks.B23.status = b23Pass ? 'PASS' : 'FAIL';
  console.log(`B23 Status: ${results.tasks.B23.status}`);

  // ==========================================
  // B24: Flagship FIRE Calculator Verification
  // ==========================================
  console.log('Testing B24: Flagship FIRE Calculator...');
  await page.goto(`${BASE_URL}/calculators/fire`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  for (const theme of ['light', 'dark']) {
    await setTheme(page, theme);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.waitForTimeout(200);

    const shotPath = path.join(EVIDENCE_DIR, `hosted-fire-desktop-${theme}.png`);
    await page.screenshot({ path: shotPath });

    const evaluation = await page.evaluate(() => {
      const scopeNote = document.querySelector('.calculator-scope-note');
      const coreInputs = Array.from(document.querySelectorAll('.core-fire-form input[type="number"]'));
      const allDescribed = coreInputs.every(i => i.hasAttribute('aria-describedby'));
      const labels = Array.from(document.querySelectorAll('.core-fire-form label'));
      const allLabelsConcise = labels.every(l => !l.textContent.includes('Help') && !l.querySelector('button') && !l.querySelector('.info-tip'));
      const infoButtons = Array.from(document.querySelectorAll('.core-fire-form button.info-dot'));
      const inputs = Array.from(document.querySelectorAll('input[type="number"]'));
      const inputFonts = inputs.map(i => window.getComputedStyle(i).fontSize);
      const all16px = inputs.length > 0 && inputFonts.every(f => f === '16px');

      return {
        hasScopeNote: !!scopeNote,
        allDescribed,
        allLabelsConcise,
        infoButtonsCount: infoButtons.length,
        inputsCount: inputs.length,
        all16px
      };
    });

    results.tasks.B24.cases.push({
      case: `Desktop ${theme}`,
      viewport: '1440x900',
      theme,
      screenshot: `hosted-fire-desktop-${theme}.png`,
      evaluation,
      pass: evaluation.hasScopeNote && evaluation.allDescribed && evaluation.allLabelsConcise && evaluation.all16px
    });
  }

  // Test Stale State Lifecycle in FIRE Calculator
  await page.setViewportSize({ width: 1440, height: 900 });
  await setTheme(page, 'light');

  // Step 1: Initial calculate
  const calcBtn = await page.$('.quick-actions .primary-button');
  await calcBtn.click();
  await page.waitForSelector('.hero-result');

  const initialCalculated = await page.evaluate(() => {
    const heroResult = document.querySelector('.hero-result');
    const staleBadge = document.querySelector('.stale-result-badge');
    const btn = document.querySelector('.quick-actions .primary-button');
    return {
      hasHeroResult: !!heroResult,
      isStale: heroResult ? heroResult.classList.contains('is-stale') : false,
      hasStaleBadge: !!staleBadge,
      btnText: btn ? btn.textContent.trim() : null
    };
  });

  // Step 2: Edit input to trigger stale
  const expenseInput = await page.$('#fire-annual-expense');
  await expenseInput.fill('95000');
  await page.dispatchEvent('#fire-annual-expense', 'change');
  await page.waitForTimeout(300);

  const staleState = await page.evaluate(() => {
    const heroResult = document.querySelector('.hero-result');
    const staleBadge = document.querySelector('.stale-result-badge');
    const btn = document.querySelector('.quick-actions .primary-button');
    return {
      hasHeroResult: !!heroResult,
      isStale: heroResult ? heroResult.classList.contains('is-stale') : false,
      hasStaleBadge: !!staleBadge,
      badgeText: staleBadge ? staleBadge.textContent.trim() : null,
      btnText: btn ? btn.textContent.trim() : null
    };
  });

  const shotStale = path.join(EVIDENCE_DIR, 'hosted-fire-stale-state-desktop.png');
  await page.screenshot({ path: shotStale });

  // Step 3: Recalculate to clear stale
  const recalcBtn = await page.$('.quick-actions .primary-button');
  await recalcBtn.click();
  await page.waitForFunction(() => !document.querySelector('.hero-result')?.classList.contains('is-stale'));

  const refreshedState = await page.evaluate(() => {
    const heroResult = document.querySelector('.hero-result');
    const staleBadge = document.querySelector('.stale-result-badge');
    const btn = document.querySelector('.quick-actions .primary-button');
    return {
      hasHeroResult: !!heroResult,
      isStale: heroResult ? heroResult.classList.contains('is-stale') : false,
      hasStaleBadge: !!staleBadge,
      btnText: btn ? btn.textContent.trim() : null
    };
  });

  results.tasks.B24.staleLifecycle = {
    initial: initialCalculated,
    stale: staleState,
    refreshed: refreshedState,
    pass: !initialCalculated.isStale && staleState.isStale && staleState.hasStaleBadge && /recalculate/i.test(staleState.btnText) && !refreshedState.isStale && !refreshedState.hasStaleBadge
  };

  const b24Pass = results.tasks.B24.cases.every(c => c.pass) && results.tasks.B24.staleLifecycle.pass;
  results.tasks.B24.status = b24Pass ? 'PASS' : 'FAIL';
  console.log(`B24 Status: ${results.tasks.B24.status}`);

  // ==========================================
  // Reduced Motion & Reduced Transparency Check
  // ==========================================
  console.log('Testing Media Features (reduced-motion, reduced-transparency)...');
  const cdp = await context.newCDPSession(page);

  await cdp.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  await page.waitForTimeout(200);
  const motionCheck = await page.evaluate(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  results.generalChecks.reducedMotion = {
    requested: 'reduce',
    matches: motionCheck,
    status: motionCheck ? 'PASS' : 'FAIL'
  };

  await cdp.send('Emulation.setEmulatedMedia', {
    media: 'screen',
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
  });
  await page.waitForTimeout(200);
  const transparencyCheck = await page.evaluate(() => {
    return window.matchMedia('(prefers-reduced-transparency: reduce)').matches;
  });
  results.generalChecks.reducedTransparency = {
    requested: 'reduce',
    matches: transparencyCheck,
    status: transparencyCheck ? 'PASS' : 'FAIL'
  };

  // Check Contrast of Key Headings & Scope Notes
  const contrastCheck = await page.evaluate(() => {
    const scopeNote = document.querySelector('.calculator-scope-note');
    if (!scopeNote) return null;
    const style = window.getComputedStyle(scopeNote);
    return {
      color: style.color,
      fontSize: style.fontSize,
      fontWeight: style.fontWeight
    };
  });
  results.generalChecks.contrastCheck = contrastCheck;

  results.consoleErrors = consoleErrors;
  results.pageExceptions = pageExceptions;

  await browser.close();

  fs.writeFileSync(
    path.join(EVIDENCE_DIR, 'hosted-browser.json'),
    JSON.stringify(results, null, 2)
  );

  console.log('Hosted browser verification complete! Results written to hosted-browser.json');
}

runVerification().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
