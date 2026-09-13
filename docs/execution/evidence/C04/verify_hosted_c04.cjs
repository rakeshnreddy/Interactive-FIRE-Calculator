const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const EVIDENCE_DIR = path.resolve(__dirname);
const BASE_URL = 'https://f8d01243.interactive-fire-calculator.pages.dev';

async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const consoleErrors = [];
  const pageExceptions = [];
  const results = {
    testedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    consoleErrors,
    pageExceptions,
    cases: []
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

    // 1. Mortgage Journey (B08 + B20 + B21)
    for (const theme of ['light', 'dark']) {
      await page.goto(`${BASE_URL}/calculators/mortgage`, { waitUntil: 'networkidle' });
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);
      await page.waitForTimeout(150);

      // Check B20: first editable input y position
      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      // Check B08: headline months
      const metricCard = page.locator('.calculator-result-metric', { hasText: 'Payoff months' });
      const headlineMonthsText = await metricCard.locator('strong').innerText();
      const headlineMonths = parseInt(headlineMonthsText.replace(/[^\d]/g, ''), 10);

      // Expand schedule and check last row
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

      // Check B21: true zero, no visual bars, swatches, data table
      const hasVisualBars = (await page.locator('.calculator-visual-bars').count()) > 0;
      const swatchCount = await page.locator('.calculator-legend-swatch').count();
      const hasTable = (await page.locator('.calculator-chart-table').count()) > 0;

      const shotPath = path.join(EVIDENCE_DIR, `hosted-mortgage-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      results.cases.push({
        calc: 'Mortgage',
        theme,
        firstInputY,
        headlineMonths,
        scheduleRowCount,
        lastRowEndingBalance,
        lastRowNote,
        hasVisualBars,
        swatchCount,
        hasTable,
        b08_pass: headlineMonths === 360 && scheduleRowCount === 360 && lastRowEndingBalance === '$0',
        b20_pass: firstInputY !== null && firstInputY <= 650,
        b21_pass: !hasVisualBars && swatchCount >= 1 && hasTable,
        screenshot: `hosted-mortgage-390-${theme}.png`
      });
    }

    // 2. SIP Journey (B20 + B21)
    for (const theme of ['light', 'dark']) {
      await page.goto(`${BASE_URL}/calculators/sip`, { waitUntil: 'networkidle' });
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);
      await page.waitForTimeout(150);

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

      results.cases.push({
        calc: 'SIP',
        theme,
        firstInputY,
        hasVisualBars,
        swatchCount,
        hasTable,
        b20_pass: firstInputY !== null && firstInputY <= 650,
        b21_pass: !hasVisualBars && swatchCount >= 1 && hasTable,
        screenshot: `hosted-sip-390-${theme}.png`
      });
    }

    // 3. India Tax Journey (B20 + B21)
    for (const theme of ['light', 'dark']) {
      await page.goto(`${BASE_URL}/calculators/income-tax-india`, { waitUntil: 'networkidle' });
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);
      await page.waitForTimeout(150);

      const firstInput = page.locator('.calculator-input-panel input:not([disabled])').first();
      await firstInput.waitFor({ state: 'visible' });
      const firstInputY = await firstInput.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return rect.top + window.scrollY;
      });

      const hasVisualBars = (await page.locator('.calculator-visual-bars').count()) > 0;
      const swatchCount = await page.locator('.calculator-legend-swatch').count();
      const hasTable = (await page.locator('.calculator-chart-table').count()) > 0;

      const shotPath = path.join(EVIDENCE_DIR, `hosted-income-tax-india-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      results.cases.push({
        calc: 'India Tax',
        theme,
        firstInputY,
        hasVisualBars,
        swatchCount,
        hasTable,
        b20_pass: firstInputY !== null && firstInputY <= 650,
        b21_pass: !hasVisualBars && swatchCount >= 1 && hasTable,
        screenshot: `hosted-income-tax-india-390-${theme}.png`
      });
    }

    // 4. CAGR Negative Result Journey (B21)
    for (const theme of ['light', 'dark']) {
      await page.goto(`${BASE_URL}/calculators/cagr`, { waitUntil: 'networkidle' });
      await page.evaluate((th) => {
        document.documentElement.setAttribute('data-theme', th);
        localStorage.setItem('theme', th);
      }, theme);

      const finalInput = page.locator('input#input-cagr-final');
      await finalInput.fill('5000');
      await page.waitForTimeout(200);

      const negCheck = await page.evaluate(() => {
        const rows = Array.from(document.querySelectorAll('.calculator-studio-chart-row'));
        const negRow = rows.find((r) => r.classList.contains('is-negative'));
        const baseline = document.querySelector('.calculator-chart-baseline');
        return {
          hasNegativeRow: Boolean(negRow),
          hasBaseline: Boolean(baseline),
          rowText: negRow ? negRow.textContent : ''
        };
      });

      const shotPath = path.join(EVIDENCE_DIR, `hosted-cagr-negative-390-${theme}.png`);
      await page.screenshot({ path: shotPath, fullPage: false });

      results.cases.push({
        calc: 'CAGR (Negative Fixture)',
        theme,
        ...negCheck,
        b21_pass: negCheck.hasNegativeRow && negCheck.hasBaseline && negCheck.rowText.includes('-'),
        screenshot: `hosted-cagr-negative-390-${theme}.png`
      });
    }

    await context.close();

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'hosted-browser.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('Hosted verification complete. Saved to hosted-browser.json');
  } finally {
    await browser.close();
  }
}

run().catch((err) => {
  console.error('Hosted verification error:', err);
  process.exit(1);
});
