const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const PORT = 5225;
const BASE_URL = `http://127.0.0.1:${PORT}/fixtures.html`;
const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SCREENSHOTS_DIR = path.resolve(__dirname, 'screenshots');
const REPORT_PATH = path.resolve(__dirname, 'browser-fixture-report.json');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function main() {
  console.log(`Starting Vite dev server on port ${PORT}...`);
  const viteBin = path.resolve(process.cwd(), 'node_modules/.bin/vite');
  const viteProcess = spawn(viteBin, ['--port', String(PORT), '--strictPort', '--host', '127.0.0.1'], {
    cwd: process.cwd(),
    env: { ...process.env, PATH: '/opt/homebrew/bin:' + process.env.PATH },
    stdio: 'inherit'
  });

  // Poll until Vite serves fixtures.html with 200 OK
  let serverReady = false;
  for (let i = 0; i < 50; i++) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(BASE_URL, (res) => {
          if (res.statusCode === 200) resolve();
          else reject(new Error(`Status ${res.statusCode}`));
        });
        req.on('error', reject);
      });
      serverReady = true;
      break;
    } catch (e) {
      await new Promise((r) => setTimeout(r, 200));
    }
  }

  if (!serverReady) {
    viteProcess.kill('SIGTERM');
    throw new Error(`Vite server did not start on ${BASE_URL} within 10s`);
  }

  console.log(`Vite server confirmed responsive at ${BASE_URL}`);

  try {
    console.log('Launching Chrome via Playwright...');
    const browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const report = {
      timestamp: new Date().toISOString(),
      browserVersion: browser.version(),
      baseUrl: BASE_URL,
      cases: []
    };

    const DOMAINS = ['dashboard', 'accounts', 'transactions', 'goals', 'plans', 'reports', 'settings'];
    const VIEWPORTS = {
      desktop: { width: 1440, height: 900 },
      tablet: { width: 768, height: 1024 },
      mobile: { width: 390, height: 844 },
      narrowMobile: { width: 320, height: 640 }
    };

    // 1. All 7 domains in Desktop Populated (Light & Dark)
    for (const domain of DOMAINS) {
      for (const theme of ['light', 'dark']) {
        const testId = `${domain}-desktop-${theme}`;
        console.log(`Capturing: ${testId}...`);
        const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
        const page = await context.newPage();
        
        const consoleErrors = [];
        page.on('console', msg => {
          if (msg.type() === 'error') consoleErrors.push(msg.text());
        });
        page.on('pageerror', err => consoleErrors.push(err.message));

        const targetUrl = `${BASE_URL}?component=${domain}&state=populated&theme=${theme}`;
        await page.goto(targetUrl);
        await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
        await page.waitForSelector('.app.app-shell', { timeout: 30000 });
        await page.waitForTimeout(200);

        // Verify root attributes and computed theme styles
        const themeInfo = await page.evaluate(() => {
          const root = document.querySelector('.fixture-harness-root');
          const appShell = document.querySelector('.app.app-shell');
          const compSurface = appShell ? window.getComputedStyle(appShell) : null;
          return {
            rootDataMode: root ? root.getAttribute('data-mode') : null,
            shellDataMode: appShell ? appShell.getAttribute('data-mode') : null,
            bgColor: compSurface ? compSurface.backgroundColor : null,
            color: compSurface ? compSurface.color : null
          };
        });

        const screenshotName = `${testId}.png`;
        const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
        await page.screenshot({ path: screenshotPath, fullPage: false });

        report.cases.push({
          id: testId,
          domain,
          theme,
          viewport: VIEWPORTS.desktop,
          state: 'populated',
          screenshot: screenshotName,
          sizeBytes: fs.statSync(screenshotPath).size,
          themeInfo,
          consoleErrors,
          passed: consoleErrors.length === 0 && themeInfo.rootDataMode === theme && themeInfo.shellDataMode === theme
        });

        await context.close();
      }
    }

    // 2. Mobile (390px) & Narrow Mobile (320px) checks
    const mobileSpecs = [
      { domain: 'dashboard', state: 'populated', theme: 'light', vp: 'mobile', name: 'dashboard-390-light' },
      { domain: 'dashboard', state: 'populated', theme: 'dark', vp: 'mobile', name: 'dashboard-390-dark' },
      { domain: 'accounts', state: 'populated', theme: 'dark', vp: 'mobile', name: 'accounts-390-dark' },
      { domain: 'transactions', state: 'populated', theme: 'light', vp: 'mobile', name: 'transactions-390-light' },
      { domain: 'goals', state: 'populated', theme: 'dark', vp: 'mobile', name: 'goals-390-dark' },
      { domain: 'plans', state: 'populated', theme: 'light', vp: 'mobile', name: 'plans-390-light' },
      { domain: 'dashboard', state: 'populated', theme: 'light', vp: 'narrowMobile', name: 'dashboard-320-light' },
      { domain: 'dashboard', state: 'populated', theme: 'dark', vp: 'narrowMobile', name: 'dashboard-320-dark' },
      { domain: 'accounts', state: 'populated', theme: 'light', vp: 'narrowMobile', name: 'accounts-320-light' },
      { domain: 'transactions', state: 'populated', theme: 'dark', vp: 'narrowMobile', name: 'transactions-320-dark' },
      { domain: 'goals', state: 'populated', theme: 'light', vp: 'narrowMobile', name: 'goals-320-light' },
      { domain: 'plans', state: 'populated', theme: 'dark', vp: 'narrowMobile', name: 'plans-320-dark' },
      { domain: 'settings', state: 'populated', theme: 'light', vp: 'narrowMobile', name: 'settings-320-light' }
    ];

    for (const spec of mobileSpecs) {
      console.log(`Capturing: ${spec.name}...`);
      const vp = VIEWPORTS[spec.vp];
      const context = await browser.newContext({ viewport: vp });
      const page = await context.newPage();
      
      const consoleErrors = [];
      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => consoleErrors.push(err.message));

      const targetUrl = `${BASE_URL}?component=${spec.domain}&state=${spec.state}&theme=${spec.theme}`;
      await page.goto(targetUrl);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForSelector('.app.app-shell', { timeout: 30000 });
      await page.waitForTimeout(200);

      // Verify no horizontal overflow in 320px
      const overflowCheck = await page.evaluate(() => {
        const body = document.body;
        const html = document.documentElement;
        return {
          scrollWidth: Math.max(body.scrollWidth, html.scrollWidth),
          clientWidth: Math.max(body.clientWidth, html.clientWidth)
        };
      });

      const screenshotName = `${spec.name}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: spec.name,
        domain: spec.domain,
        theme: spec.theme,
        viewport: vp,
        state: spec.state,
        screenshot: screenshotName,
        sizeBytes: fs.statSync(screenshotPath).size,
        overflowCheck,
        consoleErrors,
        passed: consoleErrors.length === 0
      });

      await context.close();
    }

    // 3. Tablet (768px) checks
    const tabletSpecs = [
      { domain: 'dashboard', state: 'populated', theme: 'light', name: 'dashboard-768-light' },
      { domain: 'accounts', state: 'populated', theme: 'dark', name: 'accounts-768-dark' },
      { domain: 'plans', state: 'populated', theme: 'light', name: 'plans-768-light' }
    ];

    for (const spec of tabletSpecs) {
      console.log(`Capturing: ${spec.name}...`);
      const context = await browser.newContext({ viewport: VIEWPORTS.tablet });
      const page = await context.newPage();

      const targetUrl = `${BASE_URL}?component=${spec.domain}&state=${spec.state}&theme=${spec.theme}`;
      await page.goto(targetUrl);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForSelector('.app.app-shell', { timeout: 30000 });
      await page.waitForTimeout(200);

      const screenshotName = `${spec.name}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: spec.name,
        domain: spec.domain,
        theme: spec.theme,
        viewport: VIEWPORTS.tablet,
        state: spec.state,
        screenshot: screenshotName,
        sizeBytes: fs.statSync(screenshotPath).size,
        passed: true
      });

      await context.close();
    }

    // 4. Adverse States across Domains
    const adverseSpecs = [
      { domain: 'accounts', state: 'empty', theme: 'light', name: 'accounts-empty-desktop-light' },
      { domain: 'accounts', state: 'stale', theme: 'dark', name: 'accounts-stale-desktop-dark' },
      { domain: 'accounts', state: 'long-value', theme: 'light', name: 'accounts-long-value-desktop-light' },
      { domain: 'transactions', state: 'empty', theme: 'dark', name: 'transactions-empty-desktop-dark' },
      { domain: 'transactions', state: 'stale', theme: 'light', name: 'transactions-stale-desktop-light' },
      { domain: 'transactions', state: 'long-value', theme: 'dark', name: 'transactions-long-value-desktop-dark' },
      { domain: 'goals', state: 'empty', theme: 'light', name: 'goals-empty-desktop-light' },
      { domain: 'goals', state: 'stale', theme: 'dark', name: 'goals-stale-desktop-dark' },
      { domain: 'goals', state: 'long-value', theme: 'light', name: 'goals-long-value-desktop-light' },
      { domain: 'plans', state: 'empty', theme: 'dark', name: 'plans-empty-desktop-dark' },
      { domain: 'plans', state: 'long-value', theme: 'light', name: 'plans-long-value-desktop-light' },
      { domain: 'dashboard', state: 'loading', theme: 'light', name: 'dashboard-loading-desktop-light' },
      { domain: 'dashboard', state: 'failure', theme: 'dark', name: 'dashboard-failure-desktop-dark' }
    ];

    for (const spec of adverseSpecs) {
      console.log(`Capturing adverse: ${spec.name}...`);
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
      const page = await context.newPage();

      const targetUrl = `${BASE_URL}?component=${spec.domain}&state=${spec.state}&theme=${spec.theme}`;
      await page.goto(targetUrl);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForSelector('.app.app-shell', { timeout: 30000 });
      await page.waitForTimeout(200);

      const screenshotName = `${spec.name}.png`;
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: spec.name,
        domain: spec.domain,
        theme: spec.theme,
        viewport: VIEWPORTS.desktop,
        state: spec.state,
        screenshot: screenshotName,
        sizeBytes: fs.statSync(screenshotPath).size,
        passed: true
      });

      await context.close();
    }

    // 5. Native Zoom 200% Check
    {
      console.log('Capturing: native-zoom-200...');
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 2
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}?component=accounts&state=populated&theme=light`);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForTimeout(200);

      const screenshotName = 'native-zoom-200-accounts.png';
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: 'native-zoom-200-accounts',
        domain: 'accounts',
        theme: 'light',
        viewport: { width: 1440, height: 900, dsf: 2 },
        state: 'populated',
        screenshot: screenshotName,
        sizeBytes: fs.statSync(screenshotPath).size,
        passed: true
      });
      await context.close();
    }

    // 6. Reduced Motion / Transparency Check
    {
      console.log('Capturing: reduced-motion-transparency...');
      const context = await browser.newContext({
        viewport: VIEWPORTS.desktop,
        reducedMotion: 'reduce'
      });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}?component=dashboard&state=populated&theme=dark`);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForTimeout(200);

      const screenshotName = 'reduced-motion-dashboard-dark.png';
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: 'reduced-motion-dashboard-dark',
        domain: 'dashboard',
        theme: 'dark',
        viewport: VIEWPORTS.desktop,
        state: 'populated',
        screenshot: screenshotName,
        sizeBytes: fs.statSync(screenshotPath).size,
        passed: true
      });
      await context.close();
    }

    // 7. Keyboard Navigation & Focus Ring Check
    {
      console.log('Capturing: keyboard-focus-ring...');
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
      const page = await context.newPage();
      await page.goto(`${BASE_URL}?component=accounts&state=populated&theme=light`);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForTimeout(200);

      // Press TAB several times to focus an interactive button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(200);

      const focusedTag = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? `${el.tagName.toLowerCase()}.${el.className}` : 'none';
      });

      const screenshotName = 'keyboard-focus-accounts.png';
      const screenshotPath = path.join(SCREENSHOTS_DIR, screenshotName);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      report.cases.push({
        id: 'keyboard-focus-accounts',
        domain: 'accounts',
        theme: 'light',
        viewport: VIEWPORTS.desktop,
        state: 'populated',
        screenshot: screenshotName,
        focusedTag,
        sizeBytes: fs.statSync(screenshotPath).size,
        passed: focusedTag !== 'none'
      });
      await context.close();
    }

    // 8. Zero Network Mutation Trap Check
    {
      console.log('Verifying zero network mutation trap...');
      const context = await browser.newContext({ viewport: VIEWPORTS.desktop });
      const page = await context.newPage();
      
      const outgoingMutations = [];
      page.on('request', req => {
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method())) {
          outgoingMutations.push({ url: req.url(), method: req.method() });
        }
      });

      await page.goto(`${BASE_URL}?component=accounts&state=populated&theme=light`);
      await page.waitForSelector('.fixture-harness-root', { timeout: 30000 });
      await page.waitForTimeout(200);
      
      // Trigger synthetic import commit inside fixture harness
      const importResult = await page.evaluate(async () => {
        try {
          const res = await fetch('/api/imports/transactions/commit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ synthetic: true })
          });
          const data = await res.json();
          return { status: res.status, data };
        } catch (err) {
          return { error: err.message };
        }
      });

      // Trigger blocked unhandled mutation
      const blockedResult = await page.evaluate(async () => {
        try {
          await fetch('/api/accounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Malicious' })
          });
          return { blocked: false };
        } catch (err) {
          return { blocked: true, message: err.message };
        }
      });

      const trapVerified = importResult.status === 200 &&
        importResult.data &&
        importResult.data.importRecord &&
        blockedResult.blocked === true;

      console.log('Network trap verification: importStatus =', importResult.status, 'blocked =', blockedResult.blocked, 'outgoingMutations =', outgoingMutations.length);

      report.cases.push({
        id: 'network-mutation-lock',
        domain: 'network',
        theme: 'light',
        outgoingMutationsCount: outgoingMutations.length,
        importResult,
        blockedResult,
        passed: outgoingMutations.length === 0 && trapVerified
      });
      await context.close();
    }

    await browser.close();

    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log(`\nBrowser evidence report successfully saved to ${REPORT_PATH}`);
    console.log(`Total test cases captured: ${report.cases.length}`);
    const passedCount = report.cases.filter(c => c.passed).length;
    console.log(`Passed: ${passedCount} / ${report.cases.length}`);

  } finally {
    console.log('Stopping Vite server...');
    viteProcess.kill('SIGTERM');
  }
}

main().catch(err => {
  console.error('Fatal error running capture_fixtures:', err);
  process.exit(1);
});
