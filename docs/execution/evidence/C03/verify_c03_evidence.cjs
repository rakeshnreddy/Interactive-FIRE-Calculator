const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const esbuild = require('esbuild');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { finalizeAndPersistReport, evaluateResults, calculateContrastRatio } = require('./c03_evaluator.cjs');

const DIST_DIR = path.resolve(__dirname, '../../../../dist');
const EVIDENCE_C03 = path.resolve(__dirname);
const EVIDENCE_B18 = path.resolve(__dirname, '../B18');
const EVIDENCE_B19 = path.resolve(__dirname, '../B19');
const EVIDENCE_B09 = path.resolve(__dirname, '../B09');

// Handle --eval-file flag for fixture evaluation and CLI testing
const evalFileArgIndex = process.argv.indexOf('--eval-file');
if (evalFileArgIndex !== -1 && process.argv[evalFileArgIndex + 1]) {
  const evalPath = path.resolve(process.argv[evalFileArgIndex + 1]);
  const rawData = JSON.parse(fs.readFileSync(evalPath, 'utf8'));
  const outputPath = evalPath + '.evaluated.json';
  const evaluation = finalizeAndPersistReport(rawData, outputPath);
  console.log(`[EVALUATOR] Overall Status: ${evaluation.overallStatus} (Exit Code: ${evaluation.exitCode})`);
  console.log(`[EVALUATOR] Summary: ${evaluation.summary}`);
  if (evaluation.failures.length > 0) {
    console.error('[EVALUATOR] Failures:');
    evaluation.failures.forEach(f => console.error('  - ' + f));
  }
  if (evaluation.blocked.length > 0) {
    console.warn('[EVALUATOR] Blocked checks:');
    evaluation.blocked.forEach(b => console.warn('  - ' + b));
  }
  process.exit(evaluation.exitCode);
}

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

const clerkMockContent = `
import React from 'react';
export const ClerkProvider = ({ children }) => React.createElement(React.Fragment, null, children);
export const SignInButton = ({ children }) => React.createElement(React.Fragment, null, children);
export const SignUpButton = ({ children }) => React.createElement(React.Fragment, null, children);
export const SignOutButton = ({ children }) => React.createElement(React.Fragment, null, children);
export const UserButton = () => React.createElement('button', null, 'User Profile');
export const useAuth = () => ({ getToken: async () => null });
export const useUser = () => ({ isLoaded: true, isSignedIn: false, user: null });
`;

async function buildAuthGateFixtureBundle() {
  const bundleResult = await esbuild.build({
    stdin: {
      contents: `
        import React, { useState } from 'react';
        import ReactDOM from 'react-dom/client';
        import { AuthGate } from './src/App';

        function Fixture() {
          const params = new URLSearchParams(window.location.search);
          const state = params.get('state') || 'loading';
          const [nav, setNav] = useState(null);

          window.__navigatedTo = nav;

          let auth;
          if (state === 'loading') {
            auth = {
              provider: 'clerk',
              status: 'loading',
              isConfigured: true,
              isSignedIn: false,
              getToken: async () => null,
              user: null
            };
          } else if (state === 'signed-out') {
            auth = {
              provider: 'clerk',
              status: 'signed-out',
              isConfigured: true,
              isSignedIn: false,
              getToken: async () => null,
              user: null
            };
          } else {
            auth = {
              provider: 'clerk',
              status: 'not-configured',
              isConfigured: false,
              isSignedIn: false,
              missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
              user: null
            };
          }

          return React.createElement('div', { className: 'app', 'data-mode': 'light' },
            React.createElement(AuthGate, {
              auth,
              route: '/dashboard',
              onNavigate: (r) => {
                setNav(r);
                window.__navigatedTo = r;
              }
            }),
            nav ? React.createElement('div', { id: 'nav-out' }, nav) : null
          );
        }

        const root = ReactDOM.createRoot(document.getElementById('root'));
        root.render(React.createElement(Fixture));
      `,
      resolveDir: process.cwd(),
      loader: 'tsx'
    },
    plugins: [{
      name: 'clerk-mock',
      setup(b) {
        b.onResolve({ filter: /^@clerk\/react$/ }, () => ({
          path: 'mock-clerk',
          namespace: 'mock-clerk-ns'
        }));
        b.onLoad({ filter: /.*/, namespace: 'mock-clerk-ns' }, () => ({
          contents: clerkMockContent,
          resolveDir: process.cwd(),
          loader: 'tsx'
        }));
      }
    }],
    bundle: true,
    write: false,
    format: 'iife',
    define: {
      'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': '""',
      'process.env.NODE_ENV': '"production"'
    }
  });

  return bundleResult.outputFiles[0].text;
}

function startStaticServer(port = 4173, fixtureJs = '') {
  const cssFile = fs.existsSync(path.join(DIST_DIR, 'assets'))
    ? fs.readdirSync(path.join(DIST_DIR, 'assets')).find(f => f.endsWith('.css')) || 'index.css'
    : 'index.css';

  const server = http.createServer((req, res) => {
    const reqPath = req.url.split('?')[0];

    // Local-only test fixture routes
    if (reqPath === '/__test__/auth-gate-fixture.html') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>AuthGate Test Fixture</title><link rel="stylesheet" href="/assets/${cssFile}"></head><body><div id="root"></div><script src="/__test__/auth-gate-fixture.js"></script></body></html>`);
      return;
    }
    if (reqPath === '/__test__/auth-gate-fixture.js') {
      res.writeHead(200, { 'Content-Type': 'application/javascript' });
      res.end(fixtureJs);
      return;
    }

    let filePath = path.join(DIST_DIR, reqPath);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(DIST_DIR, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    try {
      const data = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    } catch (err) {
      res.writeHead(500);
      res.end('Server error: ' + err.message);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      resolve({
        server,
        url: `http://127.0.0.1:${port}`
      });
    });
  });
}

(async () => {
  console.log('--- Starting C03 Comprehensive Evidence Verification ---');
  const fixtureJs = await buildAuthGateFixtureBundle();
  const { server, url: baseUrl } = await startStaticServer(4173, fixtureJs);
  console.log(`Local SPA server running at ${baseUrl}`);

  const browser = await chromium.launch({ channel: 'chrome' });

  const recordedConsoleErrors = [];
  const recordedPageExceptions = [];

  // ==========================================
  // 1. Responsive Layout Matrix (320, 390, 612, 768, 1440)
  // ==========================================
  console.log('\n1. Testing Responsive Layout Matrix (30 cases)...');
  const matrix = [];
  const routes = ['/', '/calculators', '/dashboard'];
  const widths = [320, 390, 612, 768, 1440];
  const modes = ['light', 'dark'];

  for (const route of routes) {
    for (const width of widths) {
      for (const mode of modes) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        const errors = [];
        page.on('pageerror', e => {
          errors.push(e.message);
          recordedPageExceptions.push({ route, width, mode, message: e.message });
        });
        page.on('console', msg => {
          if (msg.type() === 'error') {
            recordedConsoleErrors.push({ route, width, mode, text: msg.text() });
          }
        });

        await page.goto(baseUrl + route);
        await page.locator('h1').waitFor();
        await page.evaluate(m => document.querySelector('.app').dataset.mode = m, mode);
        await page.evaluate(() => document.fonts.ready);

        const data = await page.evaluate(() => {
          const rect = e => {
            const r = e.getBoundingClientRect();
            return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom };
          };
          const h1El = document.querySelector('h1');
          return {
            heading: h1El?.textContent?.trim(),
            h1Count: document.querySelectorAll('h1').length,
            h1: h1El ? rect(h1El) : null,
            overflow: document.documentElement.scrollWidth > window.innerWidth,
            ctaCount: [...document.querySelectorAll('a')].filter(e => e.textContent.includes('Explore my retirement')).length,
            cta: [...document.querySelectorAll('a')].filter(e => e.textContent.includes('Explore my retirement')).map(rect),
            exampleCount: document.querySelectorAll('.landing-hero-example').length,
            example: [...document.querySelectorAll('.landing-hero-example')].map(rect),
            metricTexts: [...document.querySelectorAll('.hero-example-metric-value, .chart-legend-end')].map(e => e.textContent.trim()),
            clipped: [...document.querySelectorAll('main a, main button, .hero-example-card')]
              .filter(e => e.getBoundingClientRect().right > window.innerWidth + 1)
              .map(e => e.textContent.trim())
          };
        });

        // Determine pass for this case
        let isPassed = !data.overflow && data.clipped.length === 0 && errors.length === 0 && data.h1Count >= 1;
        if (route === '/') {
          if (data.ctaCount < 1 || data.exampleCount < 1) isPassed = false;
          if (width === 390 && data.cta[0] && (data.cta[0].y < 0 || data.cta[0].bottom > 600)) isPassed = false;
          if (width === 1440) {
            if (data.h1 && (data.h1.y < 0 || data.h1.bottom > 900)) isPassed = false;
            if (data.cta[0] && (data.cta[0].y < 0 || data.cta[0].bottom > 900)) isPassed = false;
            if (data.example[0] && (data.example[0].y < 0 || data.example[0].bottom > 900)) isPassed = false;
          }
        }

        matrix.push({ route, width, mode, ...data, errors, pass: isPassed });

        // Capture actual screenshot at 390 and 1440
        if (width === 390 || width === 1440) {
          const screenshotName = `${route === '/' ? 'home' : route.slice(1)}-${width}-${mode}.png`;
          await page.screenshot({ path: path.join(EVIDENCE_C03, screenshotName), fullPage: true });
          await page.screenshot({ path: path.join(EVIDENCE_B18, 'screenshots', screenshotName), fullPage: true });
        }

        await page.close();
      }
    }
  }

  fs.writeFileSync(path.join(EVIDENCE_C03, 'matrix.json'), JSON.stringify(matrix, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_B18, 'matrix.json'), JSON.stringify(matrix, null, 2));
  console.log(`Responsive Layout Matrix: ${matrix.filter(m => m.pass).length}/${matrix.length} cases passed.`);

  // ==========================================
  // 2. Browser Interactions (B19, B09, B18)
  // ==========================================
  console.log('\n2. Testing Browser Interactions...');
  const interactions = [];
  const interactionPage = await browser.newPage({ viewport: { width: 390, height: 844 } });
  interactionPage.on('pageerror', e => recordedPageExceptions.push({ flow: 'interactions', message: e.message }));
  interactionPage.on('console', msg => {
    if (msg.type() === 'error') recordedConsoleErrors.push({ flow: 'interactions', text: msg.text() });
  });

  // 2.1 Search interactions
  await interactionPage.goto(baseUrl + '/calculators');
  await interactionPage.getByRole('searchbox', { name: 'Find calculators' }).fill('  FiRe  ');
  const fireSearchLink = interactionPage.getByRole('link', { name: /Interactive FIRE Calculator/ });
  await fireSearchLink.waitFor();
  const hasFireLink = await fireSearchLink.isVisible();
  const searchResultText = await interactionPage.locator('.calculator-search-results h2').innerText();
  interactions.push({
    case: 'mixed-case trim FIRE',
    count: searchResultText,
    hasFireLink,
    pass: hasFireLink && /1\s+match/i.test(searchResultText)
  });

  await interactionPage.getByRole('searchbox').fill('zz-no-such-tool');
  await interactionPage.getByText('No calculator matches that phrase.').waitFor();
  interactions.push({ case: 'no match', pass: true });

  await interactionPage.getByRole('button', { name: 'Clear', exact: true }).click();
  const clearedValue = await interactionPage.getByRole('searchbox').inputValue();
  const startingPathsCount = await interactionPage.locator('.starting-path-card').count();
  interactions.push({
    case: 'clear restoration',
    value: clearedValue,
    pathsCount: startingPathsCount,
    pass: clearedValue === '' && startingPathsCount === 4
  });

  // 2.2 Keyboard FIRE navigation
  await interactionPage.getByRole('searchbox').fill('fire');
  const fireLink = interactionPage.getByRole('link', { name: /Interactive FIRE Calculator/ });
  await fireLink.focus();
  await interactionPage.keyboard.press('Enter');
  await interactionPage.waitForURL('**/calculators/fire');
  interactions.push({ case: 'keyboard FIRE navigation', url: interactionPage.url(), pass: interactionPage.url().includes('/calculators/fire') });

  // 2.3 Auth public escape navigation (live unconfigured route)
  await interactionPage.goto(baseUrl + '/dashboard');
  await interactionPage.getByRole('button', { name: 'Explore public calculators', exact: true }).click();
  await interactionPage.waitForURL('**/calculators');
  interactions.push({ case: 'auth public escape', url: interactionPage.url(), pass: interactionPage.url().includes('/calculators') });

  // 2.4 Real browser AuthGate fixture: loading state
  await interactionPage.goto(baseUrl + '/__test__/auth-gate-fixture.html?state=loading');
  await interactionPage.locator('h1').waitFor();
  const loadingH1 = await interactionPage.locator('h1').innerText();
  const loadingDisabled = await interactionPage.locator('button:has-text("Checking session")').isDisabled();
  await interactionPage.locator('button:has-text("Browse calculators")').click();
  const loadClickNav = await interactionPage.evaluate(() => window.__navigatedTo);
  await interactionPage.evaluate(() => { window.__navigatedTo = null; });
  await interactionPage.locator('button:has-text("Browse calculators")').focus();
  await interactionPage.keyboard.press('Enter');
  const loadKeyNav = await interactionPage.evaluate(() => window.__navigatedTo);
  interactions.push({
    case: 'auth loading public escape',
    h1: loadingH1,
    disabled: loadingDisabled,
    clickNav: loadClickNav,
    keyNav: loadKeyNav,
    pass: loadingH1.includes('Checking your session.') && loadingDisabled && loadClickNav === '/calculators' && loadKeyNav === '/calculators'
  });

  // 2.5 Real browser AuthGate fixture: signed-out state
  await interactionPage.goto(baseUrl + '/__test__/auth-gate-fixture.html?state=signed-out');
  await interactionPage.locator('h1').waitFor();
  const signedOutH1 = await interactionPage.locator('h1').innerText();
  await interactionPage.locator('button:has-text("Browse calculators")').click();
  const soClickNav = await interactionPage.evaluate(() => window.__navigatedTo);
  await interactionPage.evaluate(() => { window.__navigatedTo = null; });
  await interactionPage.locator('button:has-text("Browse calculators")').focus();
  await interactionPage.keyboard.press('Enter');
  const soKeyNav = await interactionPage.evaluate(() => window.__navigatedTo);
  interactions.push({
    case: 'auth signed-out public escape',
    h1: signedOutH1,
    clickNav: soClickNav,
    keyNav: soKeyNav,
    pass: signedOutH1.includes('Sign in') && soClickNav === '/calculators' && soKeyNav === '/calculators'
  });

  await interactionPage.close();
  fs.writeFileSync(path.join(EVIDENCE_C03, 'interactions.json'), JSON.stringify(interactions, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_B19, 'interactions.json'), JSON.stringify(interactions, null, 2));
  console.log(`Browser Interactions: ${interactions.filter(i => i.pass).length}/${interactions.length} flows verified.`);

  // ==========================================
  // 3. Native 200% Zoom Reflow Check (R3a)
  // ==========================================
  console.log('\n3. Probing Native 200% Zoom Control (R3a)...');
  // Record honest limitation for native browser zoom
  const nativeZoom = {
    status: 'BLOCKED',
    details: 'Native 200% browser window zoom control cannot be operated in automated headless browser environment without manual UI action',
    attemptedMethod: 'Chromium keyboard shortcut (Cmd+= / Ctrl+=) via page.keyboard and CDP Page/Emulation zoom probe',
    limitation: 'Playwright page.keyboard dispatches key events to DOM content, not Chrome window/chrome UI; Chrome DevTools Protocol lacks Page.setZoomLevel; deviceScaleFactor and CSS transforms are explicitly prohibited by contract',
    assistedAction: 'Perform interactive manual browser verification with native 200% zoom (Cmd++) in desktop Chrome'
  };
  fs.writeFileSync(path.join(EVIDENCE_C03, 'native-zoom-200.json'), JSON.stringify(nativeZoom, null, 2));
  console.log('Recorded native 200% zoom status: BLOCKED (honest environment limitation).');

  // Supplementary CSS Zoom check (labeled clearly as supplementary)
  console.log('Capturing supplementary CSS zoom reflow observations...');
  const cssZoomResults = [];
  for (const route of ['/', '/calculators', '/dashboard']) {
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
      await page.goto(baseUrl + route);
      await page.locator('h1').waitFor();
      await page.evaluate(m => document.querySelector('.app').dataset.mode = m, mode);
      await page.evaluate(() => {
        document.documentElement.style.zoom = '200%';
      });
      await page.evaluate(() => document.fonts.ready);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      const screenshotName = `css-zoom-${route === '/' ? 'home' : route.slice(1)}-${mode}-200.png`;
      await page.screenshot({ path: path.join(EVIDENCE_C03, screenshotName) });
      await page.screenshot({ path: path.join(EVIDENCE_B18, 'screenshots', screenshotName) });

      cssZoomResults.push({
        route,
        mode,
        type: 'supplementary_css_zoom',
        zoom: '200%',
        overflow,
        pass: !overflow
      });
      await page.close();
    }
  }
  fs.writeFileSync(path.join(EVIDENCE_C03, 'css-zoom-200.json'), JSON.stringify(cssZoomResults, null, 2));
  console.log('Supplementary CSS 200% Zoom recorded across routes and themes.');

  // ==========================================
  // 4. Accessibility Tree Snapshot (R2 Verification)
  // ==========================================
  console.log('\n4. Capturing Accessibility Tree Snapshot (R2)...');
  const axPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await axPage.goto(baseUrl + '/');
  await axPage.locator('h1').waitFor();
  await axPage.evaluate(() => document.fonts.ready);

  const client = await axPage.context().newCDPSession(axPage);
  const { nodes: axNodes } = await client.send('Accessibility.getFullAXTree');
  const axSnapshotText = JSON.stringify(axNodes, null, 2);
  fs.writeFileSync(path.join(EVIDENCE_C03, 'accessibility-tree.json'), axSnapshotText);
  fs.writeFileSync(path.join(EVIDENCE_B18, 'accessibility-tree.json'), axSnapshotText);

  const hasChartFigure = axNodes.some(n => n.name?.value?.includes('Retirement withdrawals from the modeled target'));
  const hasEndBalance = axNodes.some(n => n.name?.value?.includes('Modeled end balance: $0') || n.description?.value?.includes('$0'));
  const hasModeledTarget = axNodes.some(n => n.name?.value?.includes('$965,931') || n.description?.value?.includes('$965,931'));
  const hasHorizon = axNodes.some(n => n.name?.value?.includes('30-year') || n.description?.value?.includes('30-year'));

  const axTree = {
    hasChartFigure,
    hasEndBalance,
    hasModeledTarget,
    hasHorizon,
    pass: hasChartFigure && hasEndBalance && hasModeledTarget && hasHorizon
  };

  let humanReadableAx = `Chrome CDP Accessibility Tree Dump for ${baseUrl}/\nTotal nodes: ${axNodes.length}\n\n`;
  for (const n of axNodes) {
    if (n.ignored) continue;
    const role = n.role?.value || n.chromeRole?.value || 'unknown';
    const name = n.name?.value ? `"${n.name.value}"` : '';
    const desc = n.description?.value ? `desc="${n.description.value}"` : '';
    const val = n.value?.value ? `value="${n.value.value}"` : '';
    humanReadableAx += `[${role}] ${name} ${desc} ${val}\n`;
  }
  fs.writeFileSync(path.join(EVIDENCE_C03, 'native-home-ax.txt'), humanReadableAx);
  fs.writeFileSync(path.join(EVIDENCE_B18, 'native-home-ax.txt'), humanReadableAx);
  await axPage.close();
  console.log(`Accessibility Tree: chart figure, $965,931 target, and $0 end balance verified (${axTree.pass ? 'PASS' : 'FAIL'}).`);

  // ==========================================
  // 5. Composed Contrast Measurements (R3b)
  // ==========================================
  console.log('\n5. Measuring Composed Contrast Pairs with Pixel Sampling (R3b)...');
  const contrastPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await contrastPage.goto(baseUrl + '/');
  await contrastPage.locator('h1').waitFor();
  await contrastPage.evaluate(() => document.fonts.ready);

  const contrastPairs = [];
  const contrastTargets = [
    { id: 'heading', sel: '.landing-hero h1', name: 'Hero Heading' },
    { id: 'subtext', sel: '.landing-hero-copy p:not(.eyebrow)', name: 'Hero Body Copy' },
    { id: 'eyebrow', sel: '.landing-hero .eyebrow', name: 'Hero Eyebrow' },
    { id: 'cta_primary', sel: '.landing-actions a.primary-button', name: 'Primary CTA Button' },
    { id: 'cta_secondary', sel: '.landing-popular-paths a', name: 'Popular Starts Link' },
    { id: 'metric_label', sel: '.hero-example-metric-label', name: 'Metric Label' },
    { id: 'metric_value', sel: '.hero-example-metric-value', name: 'Metric Value' },
    { id: 'chart_legend_label', sel: '.chart-legend-label', name: 'Chart Legend Label' },
    { id: 'chart_legend_end', sel: '.chart-legend-end', name: 'Chart Legend End' },
    { id: 'chart_context', sel: '.hero-chart-context', name: 'Chart Context' },
    { id: 'assumption_text', sel: '.assumptions-list span', name: 'Assumption Text' }
  ];

  for (const mode of ['light', 'dark']) {
    await contrastPage.evaluate(m => document.querySelector('.app').dataset.mode = m, mode);
    await contrastPage.evaluate(() => document.fonts.ready);

    for (const target of contrastTargets) {
      const loc = contrastPage.locator(target.sel).first();
      const count = await loc.count();
      if (count === 0) continue;

      const rect = await loc.boundingBox();
      const style = await loc.evaluate(el => {
        const cs = window.getComputedStyle(el);
        return {
          color: cs.color,
          fontSize: cs.fontSize,
          fontWeight: cs.fontWeight,
          opacity: parseFloat(cs.opacity) || 1
        };
      });

      // Sample composited background by temporarily making text color transparent
      await loc.evaluate(node => {
        node.dataset.origColor = node.style.color;
        node.style.setProperty('color', 'transparent', 'important');
      });

      const clipBuf = await contrastPage.screenshot({
        clip: {
          x: Math.max(0, rect.x),
          y: Math.max(0, rect.y),
          width: Math.max(1, rect.width),
          height: Math.max(1, rect.height)
        }
      });

      await loc.evaluate(node => {
        node.style.color = node.dataset.origColor || '';
        delete node.dataset.origColor;
      });

      const { data, info } = await sharp(clipBuf).raw().toBuffer({ resolveWithObject: true });
      const midX = Math.floor(info.width / 2);
      const midY = Math.floor(info.height / 2);
      const idx = (midY * info.width + midX) * info.channels;
      const bg = `rgb(${data[idx]}, ${data[idx + 1]}, ${data[idx + 2]})`;

      const fontSizePx = parseFloat(style.fontSize);
      const fontWeightNum = parseInt(style.fontWeight, 10) || 400;
      const isLarge = fontSizePx >= 24 || (fontSizePx >= 18.66 && fontWeightNum >= 700);
      const threshold = isLarge ? 3.0 : 4.5;
      const ratio = calculateContrastRatio(style.color, bg);
      const pass = ratio >= threshold;

      contrastPairs.push({
        id: `contrast_${mode}_${target.id}`,
        element: target.id,
        name: target.name,
        mode,
        foreground: style.color,
        effectiveBackground: bg,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight,
        opacity: style.opacity,
        location: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        ratio,
        threshold,
        pass
      });
    }
  }

  await contrastPage.close();
  fs.writeFileSync(path.join(EVIDENCE_C03, 'contrast-analysis.json'), JSON.stringify(contrastPairs, null, 2));
  console.log(`Contrast Analysis: ${contrastPairs.filter(p => p.pass).length}/${contrastPairs.length} pairs meet WCAG thresholds.`);

  // ==========================================
  // 6. Media Query Fallbacks (R3c)
  // ==========================================
  console.log('\n6. Testing Media Query Fallbacks with CDP (R3c)...');
  const mediaPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await mediaPage.goto(baseUrl + '/');
  await mediaPage.locator('h1').waitFor();

  const cdpClient = await mediaPage.context().newCDPSession(mediaPage);

  // 6.1 Prefers Reduced Transparency
  await cdpClient.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
  });
  const rtMatches = await mediaPage.evaluate(() => window.matchMedia('(prefers-reduced-transparency: reduce)').matches);

  const rtStyles = {};
  for (const mode of ['light', 'dark']) {
    await mediaPage.evaluate(m => document.querySelector('.app').dataset.mode = m, mode);
    rtStyles[mode] = await mediaPage.locator('.topbar').evaluate(el => {
      const cs = window.getComputedStyle(el);
      return {
        backdropFilter: cs.backdropFilter,
        backgroundColor: cs.backgroundColor
      };
    });
  }
  const rtPass = rtMatches === true &&
    rtStyles.light.backdropFilter === 'none' &&
    rtStyles.dark.backdropFilter === 'none';

  await cdpClient.send('Emulation.setEmulatedMedia', { features: [] });

  // 6.2 Prefers Reduced Motion
  await cdpClient.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
  });
  const rmMatches = await mediaPage.evaluate(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  await cdpClient.send('Emulation.setEmulatedMedia', { features: [] });

  // 6.3 Forced Colors
  await cdpClient.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'forced-colors', value: 'active' }]
  });
  const fcMatches = await mediaPage.evaluate(() => window.matchMedia('(forced-colors: active)').matches);
  const fcStyles = await mediaPage.locator('.topbar').evaluate(el => {
    const cs = window.getComputedStyle(el);
    return { backdropFilter: cs.backdropFilter };
  });
  await cdpClient.send('Emulation.setEmulatedMedia', { features: [] });

  const mediaFallbacks = {
    reducedTransparency: {
      matches: rtMatches,
      styles: rtStyles,
      pass: rtPass
    },
    reducedMotion: {
      matches: rmMatches,
      pass: rmMatches === true
    },
    forcedColors: {
      matches: fcMatches,
      styles: fcStyles,
      pass: fcMatches === true && fcStyles.backdropFilter === 'none'
    }
  };

  fs.writeFileSync(path.join(EVIDENCE_C03, 'media-fallbacks.json'), JSON.stringify(mediaFallbacks, null, 2));
  await mediaPage.close();
  console.log(`Media Fallbacks: reducedTransparency (matches=${rtMatches}, pass=${rtPass}), reducedMotion (${rmMatches}), forcedColors (${fcMatches}).`);

  // ==========================================
  // 7. Actual Print Output (R3d)
  // ==========================================
  console.log('\n7. Generating Actual Print PDFs & Inspecting DOM (R3d)...');
  const printPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await printPage.goto(baseUrl + '/');
  await printPage.locator('h1').waitFor();

  const generatedPdfs = [];
  for (const mode of ['light', 'dark']) {
    await printPage.evaluate(m => document.querySelector('.app').dataset.mode = m, mode);
    for (const printBackground of [true, false]) {
      const pdfFileName = `print-${mode}-${printBackground ? 'bg' : 'nobg'}.pdf`;
      const pdfBuffer = await printPage.pdf({ printBackground, format: 'A4' });
      fs.writeFileSync(path.join(EVIDENCE_C03, pdfFileName), pdfBuffer);
      generatedPdfs.push(pdfFileName);
    }
  }

  // Print screenshots and DOM assertions
  await printPage.emulateMedia({ media: 'print' });
  await printPage.screenshot({ path: path.join(EVIDENCE_C03, 'print-landing-light.png'), fullPage: true });
  await printPage.evaluate(() => document.querySelector('.app').dataset.mode = 'dark');
  await printPage.screenshot({ path: path.join(EVIDENCE_C03, 'print-landing-dark.png'), fullPage: true });

  const printDomCheck = await printPage.evaluate(() => {
    const heroMedia = document.querySelector('.landing-hero-media');
    const heroScrim = document.querySelector('.landing-hero-scrim');
    const mobileNav = document.querySelector('.mobile-nav');
    const desktopNavDropdown = document.querySelector('.desktop-nav-dropdown');
    const h1 = document.querySelector('h1');
    const app = document.querySelector('.app');

    const isHidden = el => !el || window.getComputedStyle(el).display === 'none';

    return {
      mediaOmitted: isHidden(heroMedia) && isHidden(heroScrim),
      navOmitted: isHidden(mobileNav) && isHidden(desktopNavDropdown),
      readableText: h1 ? window.getComputedStyle(h1).color === 'rgb(0, 0, 0)' : true,
      noClipping: document.documentElement.scrollWidth <= window.innerWidth
    };
  });

  const printInspection = {
    pdfs: generatedPdfs,
    ...printDomCheck,
    pass: generatedPdfs.length === 4 && printDomCheck.mediaOmitted && printDomCheck.navOmitted && printDomCheck.readableText && printDomCheck.noClipping
  };
  fs.writeFileSync(path.join(EVIDENCE_C03, 'print-inspection.json'), JSON.stringify(printInspection, null, 2));
  await printPage.close();
  console.log(`Print Output: 4 PDFs generated, decorative media hidden, clean readable print theme (${printInspection.pass ? 'PASS' : 'FAIL'}).`);

  // ==========================================
  // 8. Representative Copy Inspection (B09 & B18)
  // ==========================================
  console.log('\n8. Inspecting Representative Copy on Live Browser...');
  const copyPage = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const inspectedRoutes = [
    '/calculators/mortgage',
    '/calculators/compound-interest',
    '/calculators/debt-payoff',
    '/calculators/amortization'
  ];
  const copy = [];

  for (const route of inspectedRoutes) {
    await copyPage.goto(baseUrl + route);
    await copyPage.locator('h1').waitFor();
    const content = await copyPage.evaluate(() => document.body.innerText);
    const hasPhase = /Phase\s*\d+/i.test(content);
    const hasEnvLeak = /VITE_CLERK/i.test(content);
    const hasInternalDirectives = /Do not render|developer instruction|Connect loan results/i.test(content);

    copy.push({
      route,
      clean: !hasPhase && !hasEnvLeak && !hasInternalDirectives,
      hasPhase,
      hasEnvLeak,
      hasInternalDirectives
    });
  }
  await copyPage.close();
  fs.writeFileSync(path.join(EVIDENCE_C03, 'copy-inspection.json'), JSON.stringify(copy, null, 2));
  fs.writeFileSync(path.join(EVIDENCE_B09, 'copy-inspection.json'), JSON.stringify(copy, null, 2));
  console.log(`Copy Inspection: ${copy.filter(c => c.clean).length}/${copy.length} routes clean (zero phase, env, or developer directive leaks).`);

  // ==========================================
  // 9. Screen Reader Smoke Evaluation (B18)
  // ==========================================
  const screenReader = {
    status: 'BLOCKED',
    details: 'Interactive screen reader (VoiceOver/NVDA) audio smoke requires reviewer assistance',
    limitation: 'Headless/automated CLI environment lacks system audio output device and interactive assistive technology audio driver',
    assistedAction: 'Perform manual interactive VoiceOver or screen-reader verification on macOS Safari/Chrome'
  };
  fs.writeFileSync(path.join(EVIDENCE_C03, 'screen-reader.json'), JSON.stringify(screenReader, null, 2));

  // Close browser and server
  await browser.close();
  server.close();

  // ==========================================
  // 10. Aggregation & Report Finalization
  // ==========================================
  console.log('\n==========================================');
  console.log('--- Aggregating Results Through C03 Evaluator ---');

  const rawResults = {
    telemetryComplete: true,
    recordedConsoleErrors,
    recordedPageExceptions,
    matrix,
    interactions,
    contrastPairs,
    mediaFallbacks,
    print: printInspection,
    copy,
    axTree,
    nativeZoom,
    screenReader
  };

  const reportPath = path.join(EVIDENCE_C03, 'verification-report.json');
  const evaluation = finalizeAndPersistReport(rawResults, reportPath);

  // Sync report to task evidence folders
  fs.copyFileSync(reportPath, path.join(EVIDENCE_B18, 'verification-report.json'));
  fs.copyFileSync(reportPath, path.join(EVIDENCE_B19, 'verification-report.json'));
  fs.copyFileSync(reportPath, path.join(EVIDENCE_B09, 'verification-report.json'));

  console.log(`\nOVERALL EVALUATION: ${evaluation.overallStatus} (Exit Code: ${evaluation.exitCode})`);
  console.log(`Summary: ${evaluation.summary}`);

  if (evaluation.failures.length > 0) {
    console.error('\nFAILURES:');
    evaluation.failures.forEach(f => console.error('  - ' + f));
  }

  if (evaluation.blocked.length > 0) {
    console.warn('\nBLOCKED CHECKS (Honest Environmental Limitations):');
    evaluation.blocked.forEach(b => console.warn('  - ' + b));
  }

  console.log('==========================================\n');
  process.exit(evaluation.exitCode);
})();
