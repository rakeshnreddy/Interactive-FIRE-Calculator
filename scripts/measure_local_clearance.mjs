import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { verifyClearance } from '../docs/execution/evidence/C09/run_c09_proofs.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const localFixtureDir = path.join(rootDir, 'docs', 'execution', 'evidence', 'C09', 'local-fixture');

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PLAYWRIGHT_PATH = '/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

export const ALLOWED_ASSETS = new Set([
  '/src/styles.css',
  '/src/vivid-theme.css'
]);

export const fixtureHtmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Clearance Verification Local Fixture</title>
  <link rel="stylesheet" href="/src/styles.css">
  <link rel="stylesheet" href="/src/vivid-theme.css">
  <style>
    body { margin: 0; padding: 0; }
    .spacer { height: 600px; background: rgba(128,128,128,0.1); border-radius: 12px; margin-bottom: 2rem; padding: 1rem; }
    .bottom-spacer { height: 1000px; }
  </style>
</head>
<body>
  <div class="app" data-mode="light">
    <header class="topbar">
      <a href="/" class="brand">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/></svg>
        <span>FinPath</span>
      </a>
      <nav class="desktop-nav">
        <a href="/" class="topbar-link">Home</a>
        <a href="/plans" class="topbar-link active">Plans</a>
      </nav>
      <div class="topbar-actions">
        <button class="topbar-link">Profile</button>
      </div>
    </header>

    <main id="main-content" style="padding: 24px 16px; max-width: 1200px; margin: 0 auto;">
      <div class="spacer">
        <h3>Planning Overview</h3>
        <p>Preceding content creating realistic page scroll depth...</p>
      </div>

      <section class="panel planning-review-panel" id="monthly-review" aria-labelledby="planning-review-title">
        <div class="panel-heading planning-heading-row">
          <div>
            <p class="eyebrow">Cadence &amp; Governance</p>
            <h2 id="planning-review-title">Monthly plan review</h2>
          </div>
          <span class="review-badge review-badge-up-to-date">Up to Date</span>
        </div>

        <div class="review-status-card review-status-up-to-date" role="status">
          <div class="review-status-header">
            <strong>Assumptions up to date</strong>
            <span class="review-status-date">Evidence date: 2026-09-25</span>
          </div>
          <p>Assumptions were confirmed for Version 2. Next review due 2026-10-25.</p>
        </div>
      </section>

      <div class="bottom-spacer"></div>
    </main>
  </div>
</body>
</html>`;

export function createFixtureServer(port = 0, host = '127.0.0.1') {
  return http.createServer((req, res) => {
    const rawPath = req.url || '/';
    const parsedPath = rawPath.split('?')[0].split('#')[0];

    // Strict path traversal defense: reject any null bytes or .. segments
    if (parsedPath.includes('\0') || parsedPath.includes('..')) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden: Traversal detected');
      return;
    }

    if (parsedPath === '/' || parsedPath === '/test-clearance.html') {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(fixtureHtmlContent);
      return;
    }

    // Only serve strictly allowlisted assets
    if (!ALLOWED_ASSETS.has(parsedPath)) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found: Unlisted asset');
      return;
    }

    const safeFilePath = path.join(rootDir, parsedPath);
    if (!fs.existsSync(safeFilePath) || !fs.statSync(safeFilePath).isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not Found');
      return;
    }

    let contentType = 'text/plain';
    if (safeFilePath.endsWith('.css')) contentType = 'text/css; charset=utf-8';
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(fs.readFileSync(safeFilePath));
  });
}

export async function runLocalFixtureClearance() {
  if (!fs.existsSync(localFixtureDir)) {
    fs.mkdirSync(localFixtureDir, { recursive: true });
  }

  const server = createFixtureServer();

  return new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      console.log(`Local fixture server listening on http://127.0.0.1:${port}`);

      try {
        const { chromium } = await import(PLAYWRIGHT_PATH);
        const browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
        const context = await browser.newContext();
        const page = await context.newPage();

        const results = [];

        const measureLayoutCase = async ({ label, width, height, mode, screenshotFile }) => {
          await page.setViewportSize({ width, height });
          await page.goto(`http://127.0.0.1:${port}/test-clearance.html`, { waitUntil: 'networkidle' });

          await page.evaluate((themeMode) => {
            const app = document.querySelector('.app');
            if (app) app.setAttribute('data-mode', themeMode);
            document.documentElement.setAttribute('data-mode', themeMode);
          }, mode);
          await page.waitForTimeout(100);

          // Perform scroll into view respecting scroll-margin-top
          const panelLocator = page.locator('.planning-review-panel');
          await panelLocator.evaluate((el) => {
            el.scrollIntoView({ block: 'start', behavior: 'auto' });
          });
          await page.waitForTimeout(300);

          const headingLocator = page.locator('#planning-review-title');

          // Take bounding boxes
          const topbarBox = await page.locator('.topbar').boundingBox();
          const headingBox = await headingLocator.boundingBox();
          const badgeBox = await page.locator('.review-badge').boundingBox();
          const panelBox = await panelLocator.boundingBox();

          const topbarBottom = topbarBox ? topbarBox.y + topbarBox.height : 0;
          const headingTop = headingBox ? headingBox.y : 0;
          const badgeTop = badgeBox ? badgeBox.y : 0;
          const headingClearance = headingTop - topbarBottom;
          const badgeClearance = badgeTop - topbarBottom;

          // Check horizontal overflow
          const overflow = await page.evaluate(() => {
            return document.documentElement.scrollWidth > window.innerWidth;
          });

          // Capture screenshot into local-fixture directory
          const screenshotPath = path.join(localFixtureDir, screenshotFile);
          await page.screenshot({ path: screenshotPath });

          const measurement = {
            modeLabel: label,
            viewport: `${width}x${height}`,
            mode,
            topbarBox,
            headingBox,
            badgeBox,
            panelBox,
            topbarBottom,
            headingTop,
            badgeTop,
            headingClearance,
            badgeClearance,
            overflow,
            screenshotFile
          };

          results.push(measurement);
          console.log(`\n--- [Local Fixture Diagnostic] ${label} ---`);
          console.log(`Viewport: ${width}x${height}, Mode: ${mode}`);
          console.log(`Topbar Box: y=${topbarBox?.y.toFixed(1)}, h=${topbarBox?.height.toFixed(1)} -> bottom=${topbarBottom.toFixed(1)}px`);
          console.log(`Heading Box: y=${headingBox?.y.toFixed(1)}, h=${headingBox?.height.toFixed(1)} -> clearance=${headingClearance.toFixed(1)}px`);
          console.log(`Badge Box: y=${badgeBox?.y.toFixed(1)}, h=${badgeBox?.height.toFixed(1)} -> clearance=${badgeClearance.toFixed(1)}px`);
          console.log(`Horizontal overflow: ${overflow ? 'FAIL' : 'NONE'}`);
          console.log(`Screenshot saved to local-fixture: ${screenshotFile}`);
        };

        // 1. Desktop Light (1280px)
        await measureLayoutCase({
          label: 'Desktop 1280px light',
          width: 1280,
          height: 800,
          mode: 'light',
          screenshotFile: 'local_fixture_desktop_light.png'
        });

        // 2. Desktop Dark (1280px)
        await measureLayoutCase({
          label: 'Desktop 1280px dark',
          width: 1280,
          height: 800,
          mode: 'dark',
          screenshotFile: 'local_fixture_desktop_dark.png'
        });

        // 3. Mobile Light (320px)
        await measureLayoutCase({
          label: 'Mobile 320px light',
          width: 320,
          height: 640,
          mode: 'light',
          screenshotFile: 'local_fixture_mobile_light.png'
        });

        // 4. Mobile Dark (320px)
        await measureLayoutCase({
          label: 'Mobile 320px dark',
          width: 320,
          height: 640,
          mode: 'dark',
          screenshotFile: 'local_fixture_mobile_dark.png'
        });

        // Verify clearance across all 4 cases with collector assertion
        const clearanceEval = verifyClearance(results);
        console.log(`\nLocal fixture clearance diagnostic: ${clearanceEval.passed ? 'PASSED' : 'FAILED'}`);
        if (!clearanceEval.passed) {
          console.error(`Clearance diagnostic failure: ${clearanceEval.reason}`);
        }

        await browser.close();
        server.close();
        resolve({ passed: clearanceEval.passed, results });
      } catch (err) {
        console.error('Error running local fixture clearance measurement:', err);
        server.close();
        reject(err);
      }
    });
  });
}

// Direct execution guard
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runLocalFixtureClearance()
    .then(({ passed }) => process.exit(passed ? 0 : 1))
    .catch(() => process.exit(1));
}
