const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 4178;
const ROOT = path.resolve(__dirname, '../../../../dist');
const DUMP_DIR = path.resolve(__dirname, 'dom-dumps');
if (!fs.existsSync(DUMP_DIR)) {
  fs.mkdirSync(DUMP_DIR, { recursive: true });
}

function createServer() {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm'
  };

  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(ROOT, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(ROOT, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
  });
}

const domDumpCode = fs.readFileSync('/Users/Rakesh/gstack/lib/dom-dump.js', 'utf8');

async function main() {
  let server = null;
  let baseUrl = process.env.AUDIT_URL;

  if (!baseUrl) {
    server = createServer();
    await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
    baseUrl = `http://127.0.0.1:${PORT}`;
    console.log(`Local audit server running at ${baseUrl}`);
  } else {
    console.log(`Auditing remote target: ${baseUrl}`);
  }
  const browser = await chromium.launch({
    headless: true,
    channel: 'chrome'
  });

  const routes = [
    { path: '/', name: 'home' },
    { path: '/calculators', name: 'calculators' },
    { path: '/calculators/fire', name: 'fire' },
    { path: '/calculators/mortgage', name: 'mortgage' },
    { path: '/calculators/savings-goal', name: 'savings' },
    { path: '/dashboard', name: 'auth-gate' }
  ];

  const dumpedFiles = [];

  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      colorScheme: mode
    });
    await context.addInitScript((m) => {
      localStorage.setItem('finpath.colorMode', m);
    }, mode);
    const page = await context.newPage();

    for (const r of routes) {
      await page.goto(`${baseUrl}${r.path}`, { waitUntil: 'networkidle' });
      await page.evaluate((m) => {
        document.documentElement.setAttribute('data-theme', m);
        if (m === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }, mode);
      await page.waitForTimeout(300);

      // Execute domDump
      const dumpHtml = await page.evaluate(eval(domDumpCode));
      const dumpPath = path.join(DUMP_DIR, `${r.name}-${mode}.html`);
      fs.writeFileSync(dumpPath, dumpHtml);
      dumpedFiles.push(dumpPath);
      console.log(`Dumped: ${dumpPath}`);
    }
    await context.close();
  }

  await browser.close();
  if (server) {
    server.close();
  }

  console.log('\nRunning gstack-design-detect on dumped DOMs...');
  try {
    const scanCmd = `PATH="/Users/Rakesh/.bun/bin:/opt/homebrew/opt/node/bin:$PATH" bun run /Users/Rakesh/gstack/bin/gstack-design-detect.ts scan ${dumpedFiles.join(' ')}`;
    const output = execSync(scanCmd, { encoding: 'utf8', stdio: 'pipe' });
    console.log(output);
  } catch (err) {
    console.log('Design detector output with findings:');
    if (err.stdout) console.log(err.stdout.toString());
    if (err.stderr) console.error(err.stderr.toString());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
