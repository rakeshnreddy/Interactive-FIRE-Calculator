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
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const consoleErrors = [];
  const pageExceptions = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => {
    pageExceptions.push(err.message);
  });

  const results = {
    testedAt: new Date().toISOString(),
    viewport: { width: 390, height: 844 },
    consoleErrors,
    pageExceptions,
    cases: []
  };

  try {
    for (const theme of ['light', 'dark']) {
      await page.goto(`${baseUrl}/calculators/mortgage`, { waitUntil: 'networkidle' });

      // Set theme attribute
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);

      for (const principalAmount of [200000, 300000]) {
        console.log(`Testing theme: ${theme}, principal: $${principalAmount}`);

        // Set principal value by targeting input inside field labeled "Loan amount"
        const principalField = page.locator('label.field', { hasText: 'Loan amount' }).locator('input');
        await principalField.fill(String(principalAmount));
        await page.waitForTimeout(200);

        // Read headline Payoff months metric
        const metricCard = page.locator('.calculator-result-metric', { hasText: 'Payoff months' });
        const headlineMonthsText = await metricCard.locator('strong').innerText();
        const headlineMonths = parseInt(headlineMonthsText.replace(/[^\d]/g, ''), 10);

        // Open details.calculator-breakdown-shell
        const detailsShell = page.locator('details.calculator-breakdown-shell');
        const isOpen = await detailsShell.evaluate((el) => el.hasAttribute('open'));
        if (!isOpen) {
          await detailsShell.locator('summary').click();
          await page.waitForTimeout(200);
        }

        // Count rows in the schedule table
        const rows = page.locator('.calculator-breakdown-table-wrap table tbody tr');
        const rowCount = await rows.count();

        // Read last row
        const lastRow = rows.last();
        const cells = await lastRow.locator('td').allInnerTexts();
        const lastRowPeriod = cells[0]?.trim();
        const lastRowBalance = cells[cells.length - 2]?.trim();
        const lastRowNote = (await lastRow.locator('.schedule-note, small').allInnerTexts()).join(' ').trim()
          || (cells.some(c => c.includes('Final payment')) ? 'Final payment' : '');

        const screenshotPath = path.join(EVIDENCE_DIR, `mortgage-390-${theme}-${principalAmount / 1000}k.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        const caseResult = {
          theme,
          principal: principalAmount,
          rate: 6.5,
          years: 30,
          headlineMonths,
          scheduleRowCount: rowCount,
          lastRowPeriod,
          lastRowBalance,
          lastRowNote,
          reconciled: headlineMonths === 360 && rowCount === 360,
          screenshot: path.basename(screenshotPath)
        };

        console.log(`  Headline months: ${headlineMonths}, Schedule rows: ${rowCount}, Last row note: "${lastRowNote}", Reconciled: ${caseResult.reconciled}`);
        results.cases.push(caseResult);
      }
    }

    results.allPassed = results.cases.every(c => c.reconciled) && consoleErrors.length === 0 && pageExceptions.length === 0;
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'browser-verification.json'), JSON.stringify(results, null, 2));
    console.log(`\nVerification complete. All passed: ${results.allPassed}`);
  } finally {
    await browser.close();
    server.close();
  }

  process.exit(results.allPassed ? 0 : 1);
}

runVerification().catch((err) => {
  console.error('Verification failed with error:', err);
  process.exit(1);
});
