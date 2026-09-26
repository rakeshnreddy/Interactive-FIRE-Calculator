const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const DIST_DIR = path.resolve(__dirname, '../../../../dist');
const BASELINE_DIR = path.resolve(__dirname, 'baseline');

if (!fs.existsSync(BASELINE_DIR)) {
  fs.mkdirSync(BASELINE_DIR, { recursive: true });
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

async function measure() {
  const server = createStaticServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();
  const routes = ['/calculators/mortgage', '/calculators/sip', '/calculators/income-tax-india'];
  const baselines = [];

  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle' });
    const slug = route.split('/').pop();

    // Find first visible editable input
    const inputLocator = page.locator('.calculator-input-panel input:visible').first();
    const box = await inputLocator.boundingBox();

    // Document y = box.y + window.scrollY
    const documentY = await page.evaluate(() => {
      const input = document.querySelector('.calculator-input-panel input');
      if (!input) return null;
      const rect = input.getBoundingClientRect();
      return rect.top + window.scrollY;
    });

    const screenshotPath = path.join(BASELINE_DIR, `${slug}-baseline-390.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });

    console.log(`Route: ${route} -> First input document y: ${documentY}px (box.y: ${box?.y}px)`);
    baselines.push({
      route,
      slug,
      firstInputDocumentY: documentY,
      boundingBox: box,
      screenshot: path.basename(screenshotPath)
    });
  }

  fs.writeFileSync(path.join(BASELINE_DIR, 'baseline-measurements.json'), JSON.stringify(baselines, null, 2));
  await browser.close();
  server.close();
}

measure().catch(err => {
  console.error(err);
  process.exit(1);
});
