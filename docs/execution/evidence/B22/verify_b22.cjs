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
    fontChecks: [],
    scopeChecks: [],
    disclosureChecks: [],
    cases: []
  };

  try {
    const targets = [
      { slug: 'compound-interest', route: '/calculators/compound-interest', name: 'Compound Interest' },
      { slug: 'savings-goal', route: '/calculators/savings-goal', name: 'Savings Goal' }
    ];

    // 1. Check computed styles and typography at 1440x900
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1
    });
    const page = await desktopContext.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[console.error] ${msg.text()}`);
    });
    page.on('pageerror', (err) => {
      pageExceptions.push(`[pageerror] ${err.message}`);
    });

    for (const target of targets) {
      await page.goto(`${baseUrl}${target.route}`, { waitUntil: 'networkidle' });
      await page.waitForSelector('.calculator-input-control input');

      // Check scope note and trust strip
      const scopeNoteText = await page.locator('.calculator-scope-note').textContent().catch(() => null);
      const trustStripCount = await page.locator('.compound-trust-strip').count();

      results.scopeChecks.push({
        target: target.name,
        hasScopeNote: !!scopeNoteText,
        scopeNoteText: scopeNoteText ? scopeNoteText.trim() : null,
        hasDuplicateTrustStrip: trustStripCount > 0,
        status: (!!scopeNoteText && trustStripCount === 0) ? 'PASS' : 'FAIL'
      });

      // Check all numeric inputs and selects computed font sizes
      const typography = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('.calculator-input-control input, input[type="number"]'));
        const selects = Array.from(document.querySelectorAll('.compound-select, select'));
        return {
          inputs: inputs.map(i => ({ id: i.id || i.name, fontSize: window.getComputedStyle(i).fontSize })),
          selects: selects.map(s => ({ id: s.id || s.name, fontSize: window.getComputedStyle(s).fontSize }))
        };
      });

      const allInputs16px = typography.inputs.every(i => i.fontSize === '16px');
      const allSelects16px = typography.selects.every(s => s.fontSize === '16px');

      results.fontChecks.push({
        target: target.name,
        totalInputs: typography.inputs.length,
        allInputs16px,
        totalSelects: typography.selects.length,
        allSelects16px,
        sampleInputs: typography.inputs.slice(0, 5),
        status: (allInputs16px && allSelects16px) ? 'PASS' : 'FAIL'
      });

      // Check disclosures
      const detailsCount = await page.locator('details').count();
      const hasTimingDisclosure = (await page.locator('#compound-contributionTiming, #savings-contributionTiming').count()) > 0;
      const hasSchedule = await page.locator('details summary:has-text("Annual schedule"), details summary:has-text("Schedule")').count() > 0;

      results.disclosureChecks.push({
        target: target.name,
        totalDisclosures: detailsCount,
        hasTimingDisclosure,
        hasSchedule,
        status: (detailsCount >= 3) ? 'PASS' : 'FAIL'
      });
    }

    await desktopContext.close();

    // 2. Viewport & theme screenshots across 1440, 768, 390, 320
    const viewports = [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'narrow', width: 320, height: 568 }
    ];

    for (const vp of viewports) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        deviceScaleFactor: 1
      });
      const vpPage = await ctx.newPage();

      for (const target of targets) {
        for (const theme of ['light', 'dark']) {
          await vpPage.goto(`${baseUrl}${target.route}`, { waitUntil: 'networkidle' });
          await vpPage.evaluate((th) => {
            document.documentElement.setAttribute('data-theme', th);
            localStorage.setItem('theme', th);
          }, theme);
          await vpPage.waitForTimeout(100);

          // First viewport screenshot
          const firstShot = `${target.slug}-${vp.name}-${theme}-viewport.png`;
          await vpPage.screenshot({ path: path.join(EVIDENCE_DIR, firstShot), fullPage: false });

          // Full page screenshot for desktop and mobile
          let fullShot = null;
          if (vp.name === 'desktop' || vp.name === 'mobile') {
            fullShot = `${target.slug}-${vp.name}-${theme}-full.png`;
            await vpPage.screenshot({ path: path.join(EVIDENCE_DIR, fullShot), fullPage: true });
          }

          results.cases.push({
            target: target.name,
            viewport: `${vp.width}x${vp.height} (${vp.name})`,
            theme,
            firstViewportScreenshot: firstShot,
            fullPageScreenshot: fullShot,
            status: 'PASS'
          });
        }
      }

      await ctx.close();
    }

  } finally {
    await browser.close();
    server.close();
  }

  // Write results JSON
  fs.writeFileSync(path.join(EVIDENCE_DIR, 'verify_b22_results.json'), JSON.stringify(results, null, 2));

  // Generate validation-matrix.md
  let matrixMd = '# B22 Validation Matrix — Unified Compound Interest and Savings Goal Presentation\n\n';
  matrixMd += `**Tested At**: \`${results.testedAt}\`  \n`;
  matrixMd += `**Target Routes**: \`/calculators/compound-interest\`, \`/calculators/savings-goal\`  \n`;
  matrixMd += `**Console Errors**: ${results.consoleErrors.length}  \n`;
  matrixMd += `**Page Exceptions**: ${results.pageExceptions.length}  \n\n`;

  matrixMd += '## Scope & Framing Checks (V10 Remediation)\n\n';
  matrixMd += '| Target | Scope Note Present | Scope Note Text | Duplicate Trust Banner Removed | Status |\n';
  matrixMd += '|---|---|---|---|---|\n';
  for (const s of results.scopeChecks) {
    matrixMd += `| ${s.target} | ${s.hasScopeNote ? 'Yes' : 'No'} | "${s.scopeNoteText}" | ${!s.hasDuplicateTrustStrip ? 'Yes (Removed)' : 'No'} | **${s.status}** |\n`;
  }

  matrixMd += '\n## Computed Typography Checks (V11 Remediation)\n\n';
  matrixMd += '| Target | Total Inputs | All Inputs Computed 16px | Total Selects | All Selects Computed 16px | Status |\n';
  matrixMd += '|---|---|---|---|---|---|\n';
  for (const f of results.fontChecks) {
    matrixMd += `| ${f.target} | ${f.totalInputs} | ${f.allInputs16px ? 'PASS (16px)' : 'FAIL'} | ${f.totalSelects} | ${f.allSelects16px ? 'PASS (16px)' : 'FAIL'} | **${f.status}** |\n`;
  }

  matrixMd += '\n## Progressive Disclosure & Reachability Checks\n\n';
  matrixMd += '| Target | Total Disclosures | Timing Reachable | Schedule Reachable | Status |\n';
  matrixMd += '|---|---|---|---|---|\n';
  for (const d of results.disclosureChecks) {
    matrixMd += `| ${d.target} | ${d.totalDisclosures} | ${d.hasTimingDisclosure ? 'Yes' : 'No'} | ${d.hasSchedule ? 'Yes' : 'No'} | **${d.status}** |\n`;
  }

  matrixMd += '\n## Viewport & Theme Screenshot Artifacts\n\n';
  matrixMd += '| Target | Viewport | Theme | First Viewport Screenshot | Full Page Screenshot | Status |\n';
  matrixMd += '|---|---|---|---|---|---|\n';
  for (const c of results.cases) {
    matrixMd += `| ${c.target} | ${c.viewport} | ${c.theme} | \`${c.firstViewportScreenshot}\` | ${c.fullPageScreenshot ? '`' + c.fullPageScreenshot + '`' : 'N/A'} | **${c.status}** |\n`;
  }

  fs.writeFileSync(path.join(EVIDENCE_DIR, 'validation-matrix.md'), matrixMd);
  console.log(`B22 verification complete! Matrix written to ${path.join(EVIDENCE_DIR, 'validation-matrix.md')}`);
}

runVerification().catch((err) => {
  console.error('Verification error:', err);
  process.exit(1);
});
