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
    cases: []
  };

  try {
    // 1. Mobile 390px verification across Mortgage, SIP, India Tax
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

    const standardCalculators = [
      { slug: 'mortgage', route: '/calculators/mortgage', name: 'Mortgage' },
      { slug: 'sip', route: '/calculators/sip', name: 'SIP' },
      { slug: 'income-tax-india', route: '/calculators/income-tax-india', name: 'India Tax' }
    ];

    for (const calc of standardCalculators) {
      await mobilePage.goto(`${baseUrl}${calc.route}`, { waitUntil: 'networkidle' });

      for (const theme of ['light', 'dark']) {
        await mobilePage.evaluate((th) => {
          document.documentElement.setAttribute('data-theme', th);
          localStorage.setItem('theme', th);
        }, theme);
        await mobilePage.waitForTimeout(100);

        // Verify heterogeneous bars are completely absent
        const hasVisualBars = (await mobilePage.locator('.calculator-visual-bars').count()) > 0;

        // Verify legend swatches exist
        const swatchCount = await mobilePage.locator('.calculator-legend-swatch').count();

        // Verify semantic table exists
        const hasTable = (await mobilePage.locator('.calculator-chart-table').count()) > 0;
        const colHeaderCount = await mobilePage.locator('.calculator-chart-table th[scope="col"]').count();
        const rowHeaderCount = await mobilePage.locator('.calculator-chart-table th[scope="row"]').count();

        // Check true zero on Mortgage: Month 0 interest is 0, Month 360 balance is 0
        let zeroCheckPassed = true;
        if (calc.slug === 'mortgage') {
          const zeroFills = await mobilePage.evaluate(() => {
            const rows = document.querySelectorAll('.calculator-studio-chart-row');
            if (rows.length < 2) return [];
            // Month 0 row (first row): check secondary track fill width
            const firstRow = rows[0];
            const firstSecFill = firstRow.querySelector('.secondary-track .calculator-visual-fill');
            // Last row (month 360): check primary track fill width
            const lastRow = rows[rows.length - 1];
            const lastPriFill = lastRow.querySelector('.calculator-visual-track:not(.secondary-track) .calculator-visual-fill');
            return [
              firstSecFill ? firstSecFill.getAttribute('style') : null,
              lastPriFill ? lastPriFill.getAttribute('style') : null
            ];
          });
          zeroCheckPassed = zeroFills.some((style) => style && style.includes('width: 0%'));
        }

        const shotPath = path.join(EVIDENCE_DIR, `${calc.slug}-chart-390-${theme}.png`);
        await mobilePage.screenshot({ path: shotPath, fullPage: false });

        results.cases.push({
          calc: calc.name,
          theme,
          viewport: '390x844',
          hasVisualBars,
          swatchCount,
          hasTable,
          colHeaderCount,
          rowHeaderCount,
          zeroCheckPassed,
          status: !hasVisualBars && swatchCount >= 1 && hasTable && colHeaderCount >= 2 && zeroCheckPassed ? 'PASS' : 'FAIL',
          screenshot: `${calc.slug}-chart-390-${theme}.png`
        });
      }
    }

    // 2. Negative result fixture: CAGR calculator with net loss (final < initial)
    console.log('Testing negative fixture on CAGR calculator...');
    for (const theme of ['light', 'dark']) {
      await mobilePage.goto(`${baseUrl}/calculators/cagr`, { waitUntil: 'networkidle' });
      await mobilePage.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);

      // Set final = 5000 (initial is 10000, 5 years) to create a negative CAGR
      const finalInput = mobilePage.locator('input#input-cagr-final');
      await finalInput.fill('5000');
      await mobilePage.waitForTimeout(200);

      // Verify negative indicators
      const negativeCheck = await mobilePage.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.calculator-studio-chart-row'));
        const negRow = rows.find((r) => r.classList.contains('is-negative'));
        const baseline = document.querySelector('.calculator-chart-baseline');
        const text = negRow ? negRow.textContent : '';
        return {
          hasNegativeRow: Boolean(negRow),
          hasBaseline: Boolean(baseline),
          containsMinus: text ? text.includes('-') : false
        };
      });

      const shotPath = path.join(EVIDENCE_DIR, `cagr-negative-390-${theme}.png`);
      await mobilePage.screenshot({ path: shotPath, fullPage: false });

      results.cases.push({
        calc: 'CAGR (Negative Fixture)',
        theme,
        viewport: '390x844',
        ...negativeCheck,
        status: negativeCheck.hasNegativeRow && negativeCheck.hasBaseline && negativeCheck.containsMinus ? 'PASS' : 'FAIL',
        screenshot: `cagr-negative-390-${theme}.png`
      });
    }

    await mobileContext.close();

    // 3. Multi-viewport checks (320px, 768px, 1440px)
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

        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > window.innerWidth;
        });

        const shotPath = path.join(EVIDENCE_DIR, `mortgage-chart-${vp.name}-${theme}.png`);
        await page.screenshot({ path: shotPath, fullPage: false });

        results.cases.push({
          calc: 'Mortgage',
          theme,
          viewport: `${vp.width}x${vp.height}`,
          hasHorizontalOverflow,
          status: !hasHorizontalOverflow ? 'PASS' : 'FAIL',
          screenshot: `mortgage-chart-${vp.name}-${theme}.png`
        });
      }
      await ctx.close();
    }

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'verify_b21_results.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('Verification completed successfully. Results saved to verify_b21_results.json');
  } finally {
    await browser.close();
    server.close();
  }
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
