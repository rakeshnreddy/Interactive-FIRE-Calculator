import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn, execSync } from 'node:child_process';

const BASELINE_PORT = 4174;
const CANDIDATE_PORT = 4173;
const CDP_PORT = 9222;

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

function createStaticServer(distDir, port) {
  const server = http.createServer((req, res) => {
    const parsedUrl = new URL(req.url, `http://127.0.0.1:${port}`);
    let filePath = path.join(distDir, parsedUrl.pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    // SPA fallback
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      filePath = path.join(distDir, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end(String(err));
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.ws = null;
    this.id = 1;
    this.callbacks = new Map();
    this.events = [];
    this.consoleLogs = [];
    this.pageErrors = [];
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.wsUrl);
      this.ws.onopen = () => resolve();
      this.ws.onerror = (err) => reject(err);
      this.ws.onmessage = (msg) => {
        const data = JSON.parse(msg.data);
        if (data.id && this.callbacks.has(data.id)) {
          const { resolve, reject } = this.callbacks.get(data.id);
          this.callbacks.delete(data.id);
          if (data.error) reject(new Error(data.error.message));
          else resolve(data.result);
        } else if (data.method) {
          if (data.method === 'Runtime.consoleAPICalled') {
            this.consoleLogs.push(data.params);
          } else if (data.method === 'Runtime.exceptionThrown') {
            this.pageErrors.push(data.params.exceptionDetails);
          }
          this.events.push(data);
        }
      };
    });
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = this.id++;
      this.callbacks.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true
    });
    if (res.exceptionDetails) {
      throw new Error(res.exceptionDetails.text || 'Eval error');
    }
    return res.result?.value;
  }

  close() {
    if (this.ws) {
      this.ws.close();
    }
  }
}

async function getNewTab(cdpPort) {
  const res = await fetch(`http://127.0.0.1:${cdpPort}/json/new`, { method: 'PUT' });
  return res.json();
}

async function closeTab(cdpPort, targetId) {
  await fetch(`http://127.0.0.1:${cdpPort}/json/close/${targetId}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function testPage(client, url, viewport) {
  client.consoleLogs = [];
  client.pageErrors = [];

  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.scale || 1,
    mobile: viewport.mobile || false
  });

  await client.send('Page.navigate', { url });
  await sleep(600); // Allow React SPA render and layout

  // Check horizontal overflow
  const overflowCheck = await client.eval(`(() => {
    const docEl = document.documentElement;
    const body = document.body;
    const scrollWidth = Math.max(docEl.scrollWidth, body.scrollWidth);
    const clientWidth = window.innerWidth;
    return {
      hasHorizontalOverflow: scrollWidth > clientWidth + 1,
      scrollWidth,
      clientWidth
    };
  })()`);

  // Check interactive elements count & title
  const pageDetails = await client.eval(`(() => {
    return {
      title: document.title,
      h1: document.querySelector('h1')?.textContent?.trim() || null,
      headings: Array.from(document.querySelectorAll('h1, h2, h3')).map(h => h.textContent.trim()),
      buttonCount: document.querySelectorAll('button').length,
      inputCount: document.querySelectorAll('input').length,
      brandText: document.querySelector('.brand')?.textContent?.trim() || null
    };
  })()`);

  // Keyboard navigation check (Tab key)
  await client.send('Input.dispatchKeyEvent', {
    type: 'rawKeyDown',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9
  });
  await client.send('Input.dispatchKeyEvent', {
    type: 'keyUp',
    key: 'Tab',
    code: 'Tab',
    windowsVirtualKeyCode: 9
  });
  await sleep(100);

  const focusDetails = await client.eval(`(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    return {
      tagName: active.tagName.toLowerCase(),
      id: active.id || null,
      className: active.className || null,
      text: (active.textContent || '').trim().slice(0, 50),
      href: active.getAttribute('href') || null
    };
  })()`);

  // Errors summary
  const errorLogs = client.consoleLogs
    .filter((log) => log.type === 'error')
    .map((log) => log.args.map((a) => a.value || a.description).join(' '));

  return {
    viewport: `${viewport.width}x${viewport.height}`,
    overflow: overflowCheck,
    page: pageDetails,
    keyboardFocus: focusDetails,
    consoleErrors: errorLogs,
    pageErrors: client.pageErrors.map((e) => e.text)
  };
}

async function main() {
  console.log('=== Starting B39 Local Browser Verification ===');

  const baselineDist = path.resolve('/tmp/baseline-42780b4/dist');
  const candidateDist = path.resolve(process.cwd(), 'dist');

  if (!fs.existsSync(baselineDist)) {
    console.log(`Baseline dist missing at ${baselineDist}. Preparing baseline from git object 42780b4...`);
    fs.mkdirSync('/tmp/baseline-42780b4', { recursive: true });
    execSync('git archive 42780b4 | tar -x -C /tmp/baseline-42780b4', { stdio: 'inherit' });
    if (!fs.existsSync('/tmp/baseline-42780b4/node_modules')) {
      fs.symlinkSync(path.resolve(process.cwd(), 'node_modules'), '/tmp/baseline-42780b4/node_modules', 'dir');
    }
    console.log(`Building baseline dist...`);
    execSync('npm run build', { cwd: '/tmp/baseline-42780b4', stdio: 'inherit', env: process.env });
  }
  if (!fs.existsSync(candidateDist)) {
    console.log(`Candidate dist missing at ${candidateDist}. Building candidate dist...`);
    execSync('npm run build', { cwd: process.cwd(), stdio: 'inherit', env: process.env });
  }

  // 1. Start HTTP servers
  const baselineServer = await createStaticServer(baselineDist, BASELINE_PORT);
  const candidateServer = await createStaticServer(candidateDist, CANDIDATE_PORT);
  console.log(`Static servers ready: baseline :${BASELINE_PORT}, candidate :${CANDIDATE_PORT}`);

  // 2. Launch Google Chrome headless
  const chromeProfile = path.resolve('/tmp/chrome-b39-profile');
  fs.mkdirSync(chromeProfile, { recursive: true });

  const chromeProc = spawn(
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    [
      '--headless=new',
      `--remote-debugging-port=${CDP_PORT}`,
      `--user-data-dir=${chromeProfile}`,
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check'
    ],
    { stdio: 'ignore' }
  );

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${CDP_PORT}/json/version`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch {}
    await sleep(200);
  }
  if (!ready) {
    throw new Error(`Timed out waiting for Chrome CDP on port ${CDP_PORT}`);
  }

  const report = {
    metadata: {
      generatedAt: new Date().toISOString(),
      baselineCommit: '42780b4c5a46004e3d008bd1b6dafee6ba5bc501',
      candidateWorkingTree: 'B39 extracted refactor (codex/finpath-quality-execution)',
      browser: 'Google Chrome Headless (CDP)',
      reproducibleCommand: 'node scripts/run_local_browser_checks.mjs',
      ports: { baseline: BASELINE_PORT, candidate: CANDIDATE_PORT, cdp: CDP_PORT }
    },
    routes: {},
    errorUiState: {}
  };

  try {
    const routes = [
      { path: '/', name: 'Landing' },
      { path: '/calculators/fire', name: 'FIRE Calculator' },
      { path: '/calculators/mortgage', name: 'Mortgage Calculator' },
      { path: '/dashboard', name: 'Signed-out Dashboard' }
    ];

    const viewports = [
      { name: 'desktop', width: 1440, height: 900, scale: 1, mobile: false },
      { name: 'mobile', width: 375, height: 812, scale: 2, mobile: true }
    ];

    for (const route of routes) {
      report.routes[route.path] = {};

      for (const vp of viewports) {
        console.log(`Testing route ${route.path} at ${vp.name} (${vp.width}x${vp.height})...`);

        // Baseline test
        const bTab = await getNewTab(CDP_PORT);
        const bClient = new CdpClient(bTab.webSocketDebuggerUrl);
        await bClient.connect();
        const baselineResult = await testPage(bClient, `http://127.0.0.1:${BASELINE_PORT}${route.path}`, vp);
        bClient.close();
        await closeTab(CDP_PORT, bTab.id);

        // Candidate test
        const cTab = await getNewTab(CDP_PORT);
        const cClient = new CdpClient(cTab.webSocketDebuggerUrl);
        await cClient.connect();
        const candidateResult = await testPage(cClient, `http://127.0.0.1:${CANDIDATE_PORT}${route.path}`, vp);
        cClient.close();
        await closeTab(CDP_PORT, cTab.id);

        // Check equivalence
        const match = {
          viewport: `${vp.width}x${vp.height}`,
          horizontalOverflowMatches: baselineResult.overflow.hasHorizontalOverflow === candidateResult.overflow.hasHorizontalOverflow,
          candidateHasHorizontalOverflow: candidateResult.overflow.hasHorizontalOverflow,
          headingsMatch: JSON.stringify(baselineResult.page.headings) === JSON.stringify(candidateResult.page.headings),
          brandMatches: baselineResult.page.brandText === candidateResult.page.brandText,
          keyboardFocusMatches: JSON.stringify(baselineResult.keyboardFocus) === JSON.stringify(candidateResult.keyboardFocus),
          consoleErrorsMatch: JSON.stringify(baselineResult.consoleErrors) === JSON.stringify(candidateResult.consoleErrors),
          candidateConsoleErrors: candidateResult.consoleErrors,
          visibleDifferences: []
        };

        if (baselineResult.page.h1 !== candidateResult.page.h1) {
          match.visibleDifferences.push(`h1 mismatch: baseline "${baselineResult.page.h1}" vs candidate "${candidateResult.page.h1}"`);
        }
        if (baselineResult.page.buttonCount !== candidateResult.page.buttonCount) {
          match.visibleDifferences.push(`button count mismatch: baseline ${baselineResult.page.buttonCount} vs candidate ${candidateResult.page.buttonCount}`);
        }

        report.routes[route.path][vp.name] = {
          baseline: baselineResult,
          candidate: candidateResult,
          comparison: match
        };
      }
    }

    // 3. Test representative API / error UI state (AuthGate fallback on protected platform route)
    console.log('Testing representative error/gate UI state (/dashboard signed-out)...');
    const errRoute = '/dashboard';
    const errTab = await getNewTab(CDP_PORT);
    const errClient = new CdpClient(errTab.webSocketDebuggerUrl);
    await errClient.connect();
    await errClient.send('Page.enable');
    await errClient.send('Runtime.enable');
    await errClient.send('Page.navigate', { url: `http://127.0.0.1:${CANDIDATE_PORT}${errRoute}` });
    await sleep(600);

    const errorUiInspection = await errClient.eval(`(() => {
      const heading = document.querySelector('h1')?.textContent?.trim() || null;
      const allText = document.body.innerText;
      const expectedSnippet = 'Account features are currently unavailable.';
      const hasErrorSnippet = allText.includes(expectedSnippet);
      const actionBtn = Array.from(document.querySelectorAll('button, a')).find(
        (b) =>
          b.textContent.includes('Explore public calculators') ||
          b.textContent.includes('Browse calculators')
      );
      return {
        h1: heading,
        hasExpectedErrorSnippet: hasErrorSnippet,
        snippetFound: expectedSnippet,
        hasCalculatorExploreAction: Boolean(actionBtn),
        actionButtonText: actionBtn ? actionBtn.textContent.trim() : null,
        activeRoute: window.location.pathname
      };
    })()`);
    errClient.close();
    await closeTab(CDP_PORT, errTab.id);

    report.errorUiState = {
      testedRoute: errRoute,
      inspection: errorUiInspection,
      verdict:
        errorUiInspection.hasExpectedErrorSnippet && errorUiInspection.hasCalculatorExploreAction
          ? 'PASS'
          : 'UNEXPECTED_MESSAGE'
    };

    // Save report
    const evidencePath = path.resolve(process.cwd(), 'docs/execution/evidence/B39/local_browser_report.json');
    fs.writeFileSync(evidencePath, JSON.stringify(report, null, 2) + '\n', 'utf8');
    console.log(`Saved local browser report to ${evidencePath}`);

  } finally {
    // Cleanup
    chromeProc.kill('SIGTERM');
    await sleep(500);
    try {
      chromeProc.kill('SIGKILL');
    } catch {}
    baselineServer.close();
    candidateServer.close();
    try {
      fs.rmSync(chromeProfile, { recursive: true, force: true, maxRetries: 3, retryDelay: 300 });
    } catch {
      // Ignore directory cleanup lock
    }
    console.log('Cleaned up servers and Chrome process.');
  }
}

main().catch((err) => {
  console.error('Browser check failed:', err);
  process.exit(1);
});
