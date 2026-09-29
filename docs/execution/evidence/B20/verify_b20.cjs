const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const DIST_DIR = path.resolve(__dirname, '../../../../dist');
const EVIDENCE_DIR = path.resolve(__dirname);

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2'
};

function createStaticServer() {
  return http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, 'http://localhost');
    let filePath = path.join(DIST_DIR, parsedUrl.pathname);

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
        return;
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    });
  });
}

async function runVerification() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  console.log(`Server listening on ${baseUrl}`);

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const consoleErrors = [];
  const pageExceptions = [];

  const results = {
    testedAt: new Date().toISOString(),
    consoleErrors,
    pageExceptions,
    mobileInputPositions: {},
    cases: []
  };

  try {
    const testCalculators = [
      { slug: 'mortgage', route: '/calculators/mortgage', name: 'Mortgage' },
      { slug: 'sip', route: '/calculators/sip', name: 'SIP' },
      { slug: 'income-tax-india', route: '/calculators/income-tax-india', name: 'India Tax' }
    ];

    // 1. Measure mobile input positions at 390x844
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 1
    });
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
    });
    mobilePage.on('pageerror', (err) => {
      pageExceptions.push(`[pageerror] ${err.message}`);
    });

    for (const calc of testCalculators) {
      await mobilePage.goto(`${baseUrl}${calc.route}`, { waitUntil: 'networkidle' });

      for (const theme of ['light', 'dark']) {
        await mobilePage.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          localStorage.setItem('theme', th);
        }, theme);
        await mobilePage.waitForTimeout(100);

        // First editable input position
        const firstInput = mobilePage.locator('.calculator-input-panel input:not([disabled])').first();
        await firstInput.waitFor({ state: 'visible' });
        const inputY = await firstInput.evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return rect.top + window.scrollY;
        });

        // H1 and scope note
        const h1Text = await mobilePage.locator('#calculator-detail-title').innerText();
        const scopeNote = await mobilePage.locator('.calculator-scope-note').first().innerText();

        // Primary metric card
        const hasPrimaryMetric = (await mobilePage.locator('.calculator-result-metric-primary').count()) > 0;
        const primaryMetricLabel = await mobilePage.locator('.calculator-result-metric-primary .calculator-metric-label span').first().innerText();
        const primaryMetricValue = await mobilePage.locator('.calculator-result-metric-primary strong').innerText();

        // Helper text association
        const helperId = await firstInput.getAttribute('aria-describedby');
        const helperText = helperId ? await mobilePage.locator(`#${helperId}`).innerText() : null;

        // Methodology panel position: must follow grid
        const methodologyFollowsGrid = await mobilePage.evaluate(() => {
          const grid = document.querySelector('.calculator-detail-grid');
          const meth = document.querySelector('.calculator-methodology-panel');
          if (!grid || !meth) return false;
          return Boolean(grid.compareDocumentPosition(meth) & Node.DOCUMENT_POSITION_FOLLOWING);
        });

        const testKey = `${calc.slug}_${theme}_390`;
        results.mobileInputPositions[testKey] = {
          calculator: calc.name,
          theme,
          firstInputY: inputY,
          underThreshold: inputY <= 650,
          h1Text,
          scopeNote,
          hasPrimaryMetric,
          primaryMetricLabel,
          primaryMetricValue,
          helperText,
          methodologyFollowsGrid
        };

        const shotPath = path.join(EVIDENCE_DIR, `${calc.slug}-390-${theme}.png`);
        await mobilePage.screenshot({ path: shotPath, fullPage: false });

        results.cases.push({
          calc: calc.name,
          theme,
          viewport: '390x844',
          inputY,
          status: inputY <= 650 && methodologyFollowsGrid && hasPrimaryMetric ? 'PASS' : 'FAIL',
          screenshot: `${calc.slug}-390-${theme}.png`
        });
      }
    }

    // 2. Interactive disclosures & scenario reactivity on Mortgage
    console.log('Testing disclosures and keyboard on Mortgage at 390px...');
    await mobilePage.goto(`${baseUrl}/calculators/mortgage`, { waitUntil: 'networkidle' });
    const firstHelpBtn = mobilePage.locator('.calculator-result-metric .calculator-help-btn').first();
    const initialExpanded = await firstHelpBtn.getAttribute('aria-expanded');
    const controlsId = await firstHelpBtn.getAttribute('aria-controls');

    // Click disclosure
    await firstHelpBtn.click();
    await mobilePage.waitForTimeout(100);
    const openedExpanded = await firstHelpBtn.getAttribute('aria-expanded');
    const helpRegionVisible = await mobilePage.locator(`#${controlsId}`).isVisible();
    const helpRegionText = await mobilePage.locator(`#${controlsId}`).innerText();
    const isFocusPreserved = await mobilePage.evaluate(() => {
      const btn = document.querySelector('.calculator-help-btn');
      return document.activeElement === btn;
    });

    // Close disclosure
    await firstHelpBtn.click();
    await mobilePage.waitForTimeout(100);
    const closedExpanded = await firstHelpBtn.getAttribute('aria-expanded');
    const helpRegionHidden = !(await mobilePage.locator(`#${controlsId}`).isVisible());

    // Scenario switching
    const scenarioTab = mobilePage.locator('.calculator-scenario-tab').first();
    await scenarioTab.click();
    await mobilePage.waitForTimeout(150);
    const isScenarioSelected = (await scenarioTab.getAttribute('aria-selected')) === 'true';

    results.disclosureAndScenario = {
      initialExpanded,
      openedExpanded,
      closedExpanded,
      helpRegionVisible,
      helpRegionHidden,
      helpRegionText,
      isFocusPreserved,
      isScenarioSelected
    };

    await mobileContext.close();

    // 3. Multi-viewport testing (320px, 768px, 1440px)
    const viewports = [
      { width: 320, height: 600, name: '320' },
      { width: 768, height: 1024, name: '768' },
      { width: 1440, height: 900, name: '1440' }
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });
      const page = await ctx.newPage();
      page.on('console', (msg) => {
        if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
      });

      for (const theme of (vp.width === 768 ? ['light'] : ['light', 'dark'])) {
        await page.goto(`${baseUrl}/calculators/mortgage`, { waitUntil: 'networkidle' });
        await page.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          localStorage.setItem('theme', th);
        }, theme);
        await page.waitForTimeout(100);

        // Check horizontal overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        const shotPath = path.join(EVIDENCE_DIR, `mortgage-${vp.name}-${theme}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        results.cases.push({
          calc: 'Mortgage',
          theme,
          viewport: `${vp.width}x${vp.height}`,
          hasHorizontalOverflow,
          status: !hasHorizontalOverflow ? 'PASS' : 'FAIL',
          screenshot: `mortgage-${vp.name}-${theme}.png`
        });
      }
      await ctx.close();
    }

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'verify_b20_results.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('Verification completed successfully. Results saved to verify_b20_results.json');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
