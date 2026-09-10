const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const PORT = 4176;
const ROOT = path.resolve(__dirname, '../../../../dist');
const EVIDENCE_DIR = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
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

function sRGBtoLin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function parseRgb(rgbStr) {
  const match = rgbStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (!match) return [0, 0, 0, 1];
  return [
    parseInt(match[1], 10),
    parseInt(match[2], 10),
    parseInt(match[3], 10),
    match[4] !== undefined ? parseFloat(match[4]) : 1
  ];
}

function lumRgb([r, g, b]) {
  return 0.2126 * sRGBtoLin(r) + 0.7152 * sRGBtoLin(g) + 0.0722 * sRGBtoLin(b);
}

function contrastRatio(rgb1, rgb2) {
  const l1 = lumRgb(rgb1);
  const l2 = lumRgb(rgb2);
  const max = Math.max(l1, l2);
  const min = Math.min(l1, l2);
  return (max + 0.05) / (min + 0.05);
}

async function run() {
  const server = createServer();
  await new Promise((resolve) => server.listen(PORT, '127.0.0.1', resolve));
  console.log(`Preview server running at http://127.0.0.1:${PORT}`);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const results = {
    timestamp: new Date().toISOString(),
    heroMeasurements: {},
    contrastAudit: [],
    viewportMatrix: [],
    journeys: [],
    fallbacks: {
      reducedTransparency: {},
      zoom200: {},
      forcedColors: {},
      print: {}
    },
    performance: {}
  };

  try {
    // 1. Matched Hero Verification (Light vs Dark at identical 1440x900 viewport and scroll 0)
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
      await page.reload();
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(200);

      // Hero screenshot
      const heroShotPath = path.join(SCREENSHOTS_DIR, `hero-${mode}-1440.png`);
      await page.screenshot({ path: heroShotPath });

      // Measure computed styles of hero elements
      const heroMetrics = await page.evaluate(() => {
        const hero = document.querySelector('.landing-hero');
        const media = document.querySelector('.landing-hero-media');
        const scrim = document.querySelector('.landing-hero-scrim');
        const h1 = document.querySelector('.landing-hero-copy h1');
        const p = document.querySelector('.landing-hero-copy p:not(.eyebrow)');
        const eyebrow = document.querySelector('.landing-hero-copy .eyebrow');
        const primaryBtn = document.querySelector('.landing-hero .primary-button');
        const secondaryBtn = document.querySelector('.landing-hero .secondary-button');
        const pathsSpan = document.querySelector('.landing-popular-paths > span');
        const pathsLink = document.querySelector('.landing-popular-paths a');

        return {
          heroBg: getComputedStyle(hero).backgroundImage || getComputedStyle(hero).backgroundColor,
          mediaOpacity: getComputedStyle(media).opacity,
          scrimBg: getComputedStyle(scrim).backgroundImage,
          h1Color: getComputedStyle(h1).color,
          h1FontSize: getComputedStyle(h1).fontSize,
          pColor: getComputedStyle(p).color,
          eyebrowColor: getComputedStyle(eyebrow).color,
          primaryBtnBg: getComputedStyle(primaryBtn).backgroundImage || getComputedStyle(primaryBtn).backgroundColor,
          primaryBtnColor: getComputedStyle(primaryBtn).color,
          secondaryBtnBg: getComputedStyle(secondaryBtn).backgroundColor,
          secondaryBtnColor: getComputedStyle(secondaryBtn).color,
          secondaryBtnBorder: getComputedStyle(secondaryBtn).borderColor,
          pathsSpanColor: pathsSpan ? getComputedStyle(pathsSpan).color : null,
          pathsLinkColor: pathsLink ? getComputedStyle(pathsLink).color : null
        };
      });

      results.heroMeasurements[mode] = heroMetrics;
      await page.close();
    }

    const lightBackdrop = [244, 248, 251]; // #f4f8fb
    const darkBackdrop = [8, 21, 28]; // #08151c

    results.contrastAudit = [
      {
        element: 'Light Hero H1',
        fg: results.heroMeasurements.light.h1Color,
        bg: 'rgb(244, 248, 251)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.h1Color), lightBackdrop),
        required: 4.5
      },
      {
        element: 'Light Hero Body Paragraph',
        fg: results.heroMeasurements.light.pColor,
        bg: 'rgb(244, 248, 251)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.pColor), lightBackdrop),
        required: 4.5
      },
      {
        element: 'Light Hero Eyebrow',
        fg: results.heroMeasurements.light.eyebrowColor,
        bg: 'rgb(244, 248, 251)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.eyebrowColor), lightBackdrop),
        required: 4.5
      },
      {
        element: 'Light Hero Primary Button (Teal stop)',
        fg: results.heroMeasurements.light.primaryBtnColor,
        bg: 'rgb(0, 107, 96)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.primaryBtnColor), [0, 107, 96]),
        required: 4.5
      },
      {
        element: 'Light Hero Primary Button (Blue stop)',
        fg: results.heroMeasurements.light.primaryBtnColor,
        bg: 'rgb(36, 85, 166)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.primaryBtnColor), [36, 85, 166]),
        required: 4.5
      },
      {
        element: 'Light Hero Secondary Button',
        fg: results.heroMeasurements.light.secondaryBtnColor,
        bg: 'rgb(251, 253, 255)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.light.secondaryBtnColor), [251, 253, 255]),
        required: 4.5
      },
      {
        element: 'Dark Hero H1',
        fg: results.heroMeasurements.dark.h1Color,
        bg: 'rgb(8, 21, 28)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.h1Color), darkBackdrop),
        required: 4.5
      },
      {
        element: 'Dark Hero Body Paragraph',
        fg: results.heroMeasurements.dark.pColor,
        bg: 'rgb(8, 21, 28)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.pColor), darkBackdrop),
        required: 4.5
      },
      {
        element: 'Dark Hero Eyebrow',
        fg: results.heroMeasurements.dark.eyebrowColor,
        bg: 'rgb(8, 21, 28)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.eyebrowColor), darkBackdrop),
        required: 4.5
      },
      {
        element: 'Dark Hero Primary Button (Mint stop)',
        fg: results.heroMeasurements.dark.primaryBtnColor,
        bg: 'rgb(105, 227, 202)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.primaryBtnColor), [105, 227, 202]),
        required: 4.5
      },
      {
        element: 'Dark Hero Primary Button (Blue stop)',
        fg: results.heroMeasurements.dark.primaryBtnColor,
        bg: 'rgb(138, 186, 255)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.primaryBtnColor), [138, 186, 255]),
        required: 4.5
      },
      {
        element: 'Dark Hero Secondary Button',
        fg: results.heroMeasurements.dark.secondaryBtnColor,
        bg: 'rgb(16, 35, 44)',
        ratio: contrastRatio(parseRgb(results.heroMeasurements.dark.secondaryBtnColor), [16, 35, 44]),
        required: 4.5
      }
    ];

    // 2. Multi-surface and responsive viewport matrix
    const routesToTest = [
      ['/', 1440, 'home-1440'],
      ['/', 1024, 'home-1024'],
      ['/', 768, 'home-768'],
      ['/', 390, 'home-390'],
      ['/', 320, 'home-320'],
      ['/calculators', 1440, 'calculators-1440'],
      ['/calculators/fire', 1440, 'fire-1440'],
      ['/calculators/fire', 390, 'fire-390'],
      ['/calculators/mortgage', 1440, 'mortgage-1440'],
      ['/calculators/savings-goal', 1440, 'savings-1440'],
      ['/dashboard', 1440, 'auth-gate-1440']
    ];

    for (const mode of ['light', 'dark']) {
      for (const [route, width, label] of routesToTest) {
        const page = await browser.newPage({ viewport: { width, height: 900 } });
        await page.goto(`http://127.0.0.1:${PORT}${route}`);
        await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
        await page.reload();
        await page.locator('h1').waitFor();
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(100);

        const pageMetrics = await page.evaluate(({ route, width, mode }) => {
          const overflow = document.documentElement.scrollWidth > window.innerWidth;
          const smallInputs = [...document.querySelectorAll('input:not([type=range]):not([type=checkbox]):not([type=radio]),select,textarea')]
            .filter((e) => e.getBoundingClientRect().width > 0 && parseFloat(getComputedStyle(e).fontSize) < 16)
            .map((e) => ({ tag: e.tagName, font: getComputedStyle(e).fontSize }));

          return {
            route,
            width,
            mode,
            overflow,
            smallInputsCount: smallInputs.length,
            h1: document.querySelector('h1').textContent
          };
        }, { route, width, mode });

        results.viewportMatrix.push(pageMetrics);

        const shotPath = path.join(SCREENSHOTS_DIR, `${label}-${mode}.png`);
        await page.screenshot({ path: shotPath });

        await page.close();
      }
    }

    // 3. Interactive Journeys & Keyboard behavior
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.locator('h1').waitFor();

      // Skip link test
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      results.journeys.push({
        test: 'Skip to main content link',
        pass: focusedId === 'main-content',
        detail: `Focused element ID: ${focusedId}`
      });

      // Workspace disclosure keyboard test
      const wsBtn = page.getByRole('button', { name: 'Workspace', exact: true });
      await wsBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#desktop-workspace-navigation');
      const dropdownVisibleBefore = await page.locator('#desktop-workspace-navigation').isVisible();

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'workspace-open-light-1440.png') });

      await page.keyboard.press('Tab');
      const activeHref = await page.evaluate(() => document.activeElement?.getAttribute('href'));
      await page.keyboard.press('Escape');
      const expandedAfter = await wsBtn.getAttribute('aria-expanded');
      const focusReturned = await wsBtn.evaluate((e) => e === document.activeElement);

      results.journeys.push({
        test: 'Workspace disclosure Enter/Tab/Escape and focus return',
        pass: dropdownVisibleBefore && activeHref === '/accounts' && expandedAfter === 'false' && focusReturned,
        detail: `open=${dropdownVisibleBefore}, firstLink=${activeHref}, expandedAfter=${expandedAfter}, focusReturned=${focusReturned}`
      });

      // SPA Navigation test: Back / Forward / Reload
      await page.locator('.desktop-nav a[href="/calculators"]').click();
      await page.waitForURL('**/calculators');
      await page.locator('h1').waitFor();
      await page.goBack();
      const backPath = await page.evaluate(() => window.location.pathname);
      await page.goForward();
      const forwardPath = await page.evaluate(() => window.location.pathname);
      await page.reload();
      await page.locator('h1').waitFor();

      results.journeys.push({
        test: 'Public SPA navigation back/forward/reload',
        pass: backPath === '/' && forwardPath === '/calculators',
        detail: `back=${backPath}, forward=${forwardPath}`
      });

      await page.close();
    }

    // 4. Mobile Menu Keyboard & Dismissal
    {
      const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.locator('h1').waitFor();

      const menuBtn = page.getByRole('button', { name: 'Open navigation', exact: true });
      await menuBtn.click();
      await page.waitForSelector('#mobile-primary-navigation');

      await page.keyboard.press('Tab');
      const firstMobileLink = await page.evaluate(() => document.activeElement?.getAttribute('href'));

      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      const menuCount = await page.locator('#mobile-primary-navigation').count();
      const menuFocusReturned = await menuBtn.evaluate((e) => e === document.activeElement);

      results.journeys.push({
        test: 'Mobile menu Open/Tab/Escape and focus return',
        pass: firstMobileLink === '/calculators' && menuCount === 0 && menuFocusReturned,
        detail: `firstLink=${firstMobileLink}, menuCountAfterEscape=${menuCount}, focusReturned=${menuFocusReturned}`
      });

      await page.close();
    }

    // 5. Savings Goal Validation Error State
    {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:${PORT}/calculators/savings-goal`);
      await page.locator('h1').waitFor();

      const targetInput = page.locator('input[type="number"], input').first();
      await targetInput.fill('-1');
      await targetInput.blur();
      await page.waitForTimeout(100);

      const hasAriaInvalid = await targetInput.getAttribute('aria-invalid');
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'savings-light-error-1440.png') });

      results.journeys.push({
        test: 'Savings Goal negative input error alert and aria-invalid',
        pass: hasAriaInvalid === 'true',
        detail: `aria-invalid=${hasAriaInvalid}`
      });

      await page.close();
    }

    // 6. Reduced Transparency & Fallbacks via CDP emulation in Light and Dark
    for (const mode of ['light', 'dark']) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
      await page.reload();
      await page.locator('h1').waitFor();

      const cd = await page.context().newCDPSession(page);
      await cd.send('Emulation.setEmulatedMedia', {
        features: [
          { name: 'prefers-reduced-transparency', value: 'reduce' },
          { name: 'prefers-reduced-motion', value: 'reduce' }
        ]
      });
      await page.waitForTimeout(100);

      const wsBtn = page.getByRole('button', { name: 'Workspace', exact: true });
      await wsBtn.click();
      await page.waitForSelector('#desktop-workspace-navigation');

      const dropdownStyles = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        const trigger = document.querySelector('.desktop-nav-menu > button');
        const dropdown = document.querySelector('#desktop-workspace-navigation');
        const link = document.querySelector('#desktop-workspace-navigation a');
        return {
          topbarBg: getComputedStyle(topbar).backgroundColor,
          topbarBackdrop: getComputedStyle(topbar).backdropFilter,
          triggerColor: getComputedStyle(trigger).color,
          triggerBg: getComputedStyle(trigger).backgroundColor,
          dropdownBg: getComputedStyle(dropdown).backgroundColor,
          dropdownBackdrop: getComputedStyle(dropdown).backdropFilter,
          dropdownBorder: getComputedStyle(dropdown).borderColor,
          linkColor: getComputedStyle(link).color
        };
      });

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `reduced-transparency-${mode}-1440.png`) });
      results.fallbacks.reducedTransparency[mode] = dropdownStyles;
      await page.close();
    }

    // 7. Actual 200% Zoom Emulation
    {
      const context = await browser.newContext({
        viewport: { width: 720, height: 450 },
        deviceScaleFactor: 2
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`);
      await page.locator('h1').waitFor();

      const zoomMetrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth,
        h1Size: getComputedStyle(document.querySelector('h1')).fontSize
      }));

      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, 'zoom-200-light-1440.png') });
      results.fallbacks.zoom200 = zoomMetrics;
      await context.close();
    }

    // 8. Performance Benchmark (3 runs)
    const perfRuns = [];
    for (let i = 1; i <= 3; i++) {
      const context = await browser.newContext({
        serviceWorkers: 'block',
        viewport: { width: 1440, height: 900 }
      });
      const page = await context.newPage();
      await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);

      const runMetrics = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0];
        const fcp = performance.getEntriesByName('first-contentful-paint')[0];
        const resources = performance.getEntriesByType('resource');
        return {
          fcp: fcp ? Math.round(fcp.startTime) : null,
          dcl: Math.round(nav.domContentLoadedEventEnd),
          load: Math.round(nav.loadEventEnd),
          encodedBytes: resources.reduce((sum, r) => sum + (r.encodedBodySize || 0), 0)
        };
      });

      perfRuns.push(runMetrics);
      await context.close();
    }
    results.performance.runs = perfRuns;
    results.performance.median = {
      fcp: perfRuns.map(r => r.fcp).sort((a,b) => a-b)[1],
      dcl: perfRuns.map(r => r.dcl).sort((a,b) => a-b)[1],
      load: perfRuns.map(r => r.load).sort((a,b) => a-b)[1],
      encodedBytes: perfRuns.map(r => r.encodedBytes).sort((a,b) => a-b)[1]
    };

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'b32-verification.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('Verification completed successfully! Evidence saved to b32-verification.json');

  } finally {
    await browser.close();
    server.close();
  }
}

run().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
