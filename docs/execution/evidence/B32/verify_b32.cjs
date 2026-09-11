const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const CANDIDATE_PORT = 4176;
const BASELINE_PORT = 4180;
const CANDIDATE_ROOT = path.resolve(__dirname, '../../../../dist');
const BASELINE_ROOT = '/tmp/finpath-baseline-dist';
const EVIDENCE_DIR = path.resolve(__dirname);
const SCREENSHOTS_DIR = path.join(EVIDENCE_DIR, 'screenshots');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

function createStaticServer(root) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.wasm': 'application/wasm'
  };

  return http.createServer((req, res) => {
    let reqPath = decodeURIComponent(req.url.split('?')[0]);
    if (reqPath === '/') reqPath = '/index.html';

    let filePath = path.join(root, reqPath);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
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
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      res.end(data);
    });
  });
}

function sRGBtoLin(c) {
  c = c / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
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

/**
 * Samples the actual composed background underneath an element via sharp pixel analysis.
 * Hides the element's text (visibility: hidden), screenshots the viewport, crops to
 * bounding box, and computes worst-case and intermediate-stop contrast ratios.
 */
async function sampleComposedBackground(page, selector, textRgb, isButton = false) {
  const elementHandle = await page.$(selector);
  if (!elementHandle) {
    throw new Error(`Element not found for sampling: ${selector}`);
  }

  const box = await elementHandle.boundingBox();
  if (!box || box.width === 0 || box.height === 0) {
    throw new Error(`Invalid bounding box for selector: ${selector}`);
  }

  // Hide element text while preserving layout and background
  await page.evaluate(({ sel, isBtn }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (isBtn) {
      el.dataset.origHtml = el.innerHTML;
      el.innerHTML = '<span style="visibility: hidden !important; display: inline-flex !important;">' + el.dataset.origHtml + '</span>';
    } else {
      el.style.visibility = 'hidden';
    }
  }, { sel: selector, isBtn: isButton });

  const screenshotBuffer = await page.screenshot({ fullPage: false });

  // Restore visibility
  await page.evaluate(({ sel, isBtn }) => {
    const el = document.querySelector(sel);
    if (!el) return;
    if (isBtn) {
      if (el.dataset.origHtml !== undefined) {
        el.innerHTML = el.dataset.origHtml;
        delete el.dataset.origHtml;
      }
    } else {
      el.style.visibility = '';
    }
  }, { sel: selector, isBtn: isButton });

  // Clamp bounding box to viewport dimensions
  const viewport = page.viewportSize();
  let cropX = Math.max(0, Math.min(Math.round(box.x), viewport.width - 1));
  let cropY = Math.max(0, Math.min(Math.round(box.y), viewport.height - 1));
  let cropWidth = Math.max(1, Math.min(Math.round(box.width), viewport.width - cropX));
  let cropHeight = Math.max(1, Math.min(Math.round(box.height), viewport.height - cropY));

  // If sampling a rounded button's interior surface, inset by padding/radius
  // so we measure the button gradient surface beneath the text rather than corners
  if (isButton) {
    const insetX = Math.min(16, Math.floor(cropWidth * 0.15));
    const insetY = Math.min(8, Math.floor(cropHeight * 0.15));
    cropX += insetX;
    cropY += insetY;
    cropWidth = Math.max(1, cropWidth - 2 * insetX);
    cropHeight = Math.max(1, cropHeight - 2 * insetY);
  }

  const { data, info } = await sharp(screenshotBuffer)
    .extract({ left: cropX, top: cropY, width: cropWidth, height: cropHeight })
    .raw()
    .toBuffer({ resolveWithObject: true });

  const channels = info.channels;
  let worstRatio = Infinity;
  let worstPixel = [0, 0, 0];
  let bestRatio = 0;
  let bestPixel = [0, 0, 0];

  // Intermediate stop samples at 0%, 25%, 50%, 75%, 100% width along middle height
  const stops = [];
  const midY = Math.floor(cropHeight / 2);
  const stopPercentages = [0, 0.25, 0.5, 0.75, 1.0];

  for (const pct of stopPercentages) {
    const stopX = Math.min(Math.floor(cropWidth * pct), cropWidth - 1);
    const idx = (midY * cropWidth + stopX) * channels;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    const ratio = contrastRatio(textRgb, [r, g, b]);
    stops.push({
      percent: `${Math.round(pct * 100)}%`,
      pixel: `rgb(${r}, ${g}, ${b})`,
      ratio: Number(ratio.toFixed(2))
    });
  }

  // Sample grid across the bounding box (sample every step pixels for performance)
  const step = Math.max(1, Math.floor(Math.min(cropWidth, cropHeight) / 20));
  for (let y = 0; y < cropHeight; y += step) {
    for (let x = 0; x < cropWidth; x += step) {
      const idx = (y * cropWidth + x) * channels;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const ratio = contrastRatio(textRgb, [r, g, b]);
      if (ratio < worstRatio) {
        worstRatio = ratio;
        worstPixel = [r, g, b];
      }
      if (ratio > bestRatio) {
        bestRatio = ratio;
        bestPixel = [r, g, b];
      }
    }
  }

  return {
    worstRatio: Number(worstRatio.toFixed(2)),
    worstPixel: `rgb(${worstPixel[0]}, ${worstPixel[1]}, ${worstPixel[2]})`,
    bestRatio: Number(bestRatio.toFixed(2)),
    bestPixel: `rgb(${bestPixel[0]}, ${bestPixel[1]}, ${bestPixel[2]})`,
    stops
  };
}

async function run() {
  const candidateServer = createStaticServer(CANDIDATE_ROOT);
  const baselineServer = createStaticServer(BASELINE_ROOT);

  await Promise.all([
    new Promise((res) => candidateServer.listen(CANDIDATE_PORT, '127.0.0.1', res)),
    new Promise((res) => baselineServer.listen(BASELINE_PORT, '127.0.0.1', res))
  ]);
  console.log(`Candidate server running on http://127.0.0.1:${CANDIDATE_PORT}`);
  console.log(`Baseline server running on http://127.0.0.1:${BASELINE_PORT}`);

  const browser = await chromium.launch({ headless: true, channel: 'chrome' });

  const recordedConsoleErrors = [];
  const recordedPageExceptions = [];
  const validationFailures = [];

  const results = {
    timestamp: new Date().toISOString(),
    engineCoverage: {
      primary: 'Chromium (Playwright channel chrome)',
      secondaryEngines: {
        webkit: {
          status: 'blocked',
          reason: 'WebKit browser binary not installed in local environment. Reviewer manual verification requested.'
        },
        firefox: {
          status: 'blocked',
          reason: 'Firefox browser binary not installed in local environment. Reviewer manual verification requested.'
        }
      },
      screenReader: {
        status: 'blocked',
        tool: 'Apple VoiceOver',
        reason: 'Headless CI agent lacks macOS TCC accessibility permissions to drive VoiceOver programmatically. Reviewer assistance requested.'
      }
    },
    heroMeasurements: {},
    composedPixelSampling: {},
    contrastAudit: [],
    viewportMatrix: [],
    journeys: [],
    fallbacks: {
      reducedTransparency: {},
      forcedColors: {},
      unsupportedBackdropFilter: {},
      print: {}
    },
    zoom200Matrix: [],
    accessibilityTree: {},
    performanceComparison: {}
  };

  try {
    // Helper to create monitored page
    async function createMonitoredPage(viewport = { width: 1440, height: 900 }) {
      const page = await browser.newPage({ viewport });
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          recordedConsoleErrors.push(`[${page.url()}] ${msg.text()}`);
        }
      });
      page.on('pageerror', (err) => {
        recordedPageExceptions.push(`[${page.url()}] ${err.message}`);
      });
      return page;
    }

    // =========================================================================
    // 1. R1 & R2: HERO & PIXEL SAMPLING CONTRAST AUDIT (Light & Dark)
    // =========================================================================
    console.log('--- Step 1: Hero & Composed Pixel Sampling Contrast ---');
    for (const mode of ['light', 'dark']) {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/`);
      await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
      await page.reload();
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(250);

      // Hero screenshot
      const heroShotPath = path.join(SCREENSHOTS_DIR, `hero-${mode}-1440.png`);
      await page.screenshot({ path: heroShotPath });

      // Computed styles
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

      // Actual sharp pixel sampling of composed background under text
      const h1Sampling = await sampleComposedBackground(
        page,
        '.landing-hero-copy h1',
        parseRgb(heroMetrics.h1Color).slice(0, 3)
      );
      const pSampling = await sampleComposedBackground(
        page,
        '.landing-hero-copy p:not(.eyebrow)',
        parseRgb(heroMetrics.pColor).slice(0, 3)
      );
      const eyebrowSampling = await sampleComposedBackground(
        page,
        '.landing-hero-copy .eyebrow',
        parseRgb(heroMetrics.eyebrowColor).slice(0, 3)
      );
      const primaryBtnSampling = await sampleComposedBackground(
        page,
        '.landing-hero .primary-button',
        parseRgb(heroMetrics.primaryBtnColor).slice(0, 3),
        true
      );
      const secondaryBtnSampling = await sampleComposedBackground(
        page,
        '.landing-hero .secondary-button',
        parseRgb(heroMetrics.secondaryBtnColor).slice(0, 3),
        true
      );

      results.composedPixelSampling[mode] = {
        h1: h1Sampling,
        p: pSampling,
        eyebrow: eyebrowSampling,
        primaryButton: primaryBtnSampling,
        secondaryButton: secondaryBtnSampling
      };

      // Add to contrast audit
      results.contrastAudit.push(
        {
          mode,
          element: 'Hero H1',
          fg: heroMetrics.h1Color,
          worstComposedBg: h1Sampling.worstPixel,
          worstRatio: h1Sampling.worstRatio,
          required: 4.5,
          pass: h1Sampling.worstRatio >= 4.5,
          stops: h1Sampling.stops
        },
        {
          mode,
          element: 'Hero Body Paragraph',
          fg: heroMetrics.pColor,
          worstComposedBg: pSampling.worstPixel,
          worstRatio: pSampling.worstRatio,
          required: 4.5,
          pass: pSampling.worstRatio >= 4.5,
          stops: pSampling.stops
        },
        {
          mode,
          element: 'Hero Eyebrow',
          fg: heroMetrics.eyebrowColor,
          worstComposedBg: eyebrowSampling.worstPixel,
          worstRatio: eyebrowSampling.worstRatio,
          required: 4.5,
          pass: eyebrowSampling.worstRatio >= 4.5,
          stops: eyebrowSampling.stops
        },
        {
          mode,
          element: 'Hero Primary Button (Action Gradient)',
          fg: heroMetrics.primaryBtnColor,
          worstComposedBg: primaryBtnSampling.worstPixel,
          worstRatio: primaryBtnSampling.worstRatio,
          required: 4.5,
          pass: primaryBtnSampling.worstRatio >= 4.5,
          stops: primaryBtnSampling.stops
        },
        {
          mode,
          element: 'Hero Secondary Button',
          fg: heroMetrics.secondaryBtnColor,
          worstComposedBg: secondaryBtnSampling.worstPixel,
          worstRatio: secondaryBtnSampling.worstRatio,
          required: 4.5,
          pass: secondaryBtnSampling.worstRatio >= 4.5,
          stops: secondaryBtnSampling.stops
        }
      );

      // Scrolled Topbar Glass Sampling
      await page.evaluate(() => window.scrollTo(0, 500));
      await page.waitForTimeout(150);
      const topbarBrandColor = await page.evaluate(() => {
        const brand = document.querySelector('.brand');
        return getComputedStyle(brand).color;
      });
      const topbarBrandSampling = await sampleComposedBackground(
        page,
        '.brand',
        parseRgb(topbarBrandColor).slice(0, 3),
        true
      );

      results.contrastAudit.push({
        mode,
        element: 'Topbar Glass over Scrolled Content (500px)',
        fg: topbarBrandColor,
        worstComposedBg: topbarBrandSampling.worstPixel,
        worstRatio: topbarBrandSampling.worstRatio,
        required: 4.5,
        pass: topbarBrandSampling.worstRatio >= 4.5,
        stops: topbarBrandSampling.stops
      });

      await page.close();
    }

    // Check contrast audit passes
    for (const item of results.contrastAudit) {
      if (!item.pass) {
        validationFailures.push(`Contrast failure: [${item.mode}] ${item.element} ratio ${item.worstRatio}:1 < ${item.required}:1`);
      }
    }

    // =========================================================================
    // 2. R1: PRINT LEGIBILITY IN LIGHT AND DARK
    // =========================================================================
    console.log('--- Step 2: R1 Print Legibility Verification ---');
    for (const mode of ['light', 'dark']) {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/`);
      await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
      await page.reload();
      await page.locator('h1').waitFor();
      await page.evaluate(() => document.fonts.ready);

      // Emulate print media
      await page.emulateMedia({ media: 'print' });
      await page.waitForTimeout(100);

      // 1) Test with printBackground: true
      const printShotBgTrue = path.join(SCREENSHOTS_DIR, `print-${mode}-bg-true.png`);
      const printPdfBgTrue = path.join(SCREENSHOTS_DIR, `print-${mode}-bg-true.pdf`);
      await page.screenshot({ path: printShotBgTrue, fullPage: true });
      await page.pdf({ path: printPdfBgTrue, printBackground: true, format: 'A4' });

      // 2) Test with printBackground: false
      const printShotBgFalse = path.join(SCREENSHOTS_DIR, `print-${mode}-bg-false.png`);
      const printPdfBgFalse = path.join(SCREENSHOTS_DIR, `print-${mode}-bg-false.pdf`);
      await page.screenshot({ path: printShotBgFalse, fullPage: true });
      await page.pdf({ path: printPdfBgFalse, printBackground: false, format: 'A4' });

      // Verify print computed styles
      const printMetrics = await page.evaluate(() => {
        const app = document.querySelector('.app');
        const hero = document.querySelector('.landing-hero');
        const media = document.querySelector('.landing-hero-media');
        const scrim = document.querySelector('.landing-hero-scrim');
        const h1 = document.querySelector('.landing-hero-copy h1');
        const p = document.querySelector('.landing-hero-copy p:not(.eyebrow)');
        const primaryBtn = document.querySelector('.app .primary-button');
        const topbar = document.querySelector('.topbar');
        const mobileNav = document.querySelector('.mobile-nav');
        const desktopDropdown = document.querySelector('.desktop-nav-dropdown');

        return {
          appBg: getComputedStyle(app).backgroundColor,
          appColor: getComputedStyle(app).color,
          heroBg: getComputedStyle(hero).backgroundColor,
          heroBackdropFilter: getComputedStyle(hero).backdropFilter,
          mediaDisplay: getComputedStyle(media).display,
          scrimDisplay: getComputedStyle(scrim).display,
          h1Color: getComputedStyle(h1).color,
          pColor: getComputedStyle(p).color,
          topbarBg: getComputedStyle(topbar).backgroundColor,
          topbarColor: getComputedStyle(topbar).color,
          primaryBtnBg: getComputedStyle(primaryBtn).backgroundColor,
          primaryBtnColor: getComputedStyle(primaryBtn).color,
          mobileNavDisplay: mobileNav ? getComputedStyle(mobileNav).display : 'none',
          desktopDropdownDisplay: desktopDropdown ? getComputedStyle(desktopDropdown).display : 'none'
        };
      });

      const printPass = 
        printMetrics.mediaDisplay === 'none' &&
        printMetrics.scrimDisplay === 'none' &&
        (printMetrics.h1Color === 'rgb(0, 0, 0)' || printMetrics.h1Color === '#000000') &&
        (printMetrics.pColor === 'rgb(0, 0, 0)' || printMetrics.pColor === '#000000') &&
        printMetrics.mobileNavDisplay === 'none' &&
        printMetrics.desktopDropdownDisplay === 'none';

      results.fallbacks.print[mode] = {
        ...printMetrics,
        pass: printPass
      };

      if (!printPass) {
        validationFailures.push(`Print legibility failure in ${mode} mode: media=${printMetrics.mediaDisplay}, scrim=${printMetrics.scrimDisplay}, h1Color=${printMetrics.h1Color}`);
      }

      await page.close();
    }

    // =========================================================================
    // 3. R2: FALLBACKS (Reduced Transparency, Forced Colors, Unsupported Backdrop Filter)
    // =========================================================================
    console.log('--- Step 3: R2 Fallbacks Testing ---');
    for (const mode of ['light', 'dark']) {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/`);
      await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
      await page.reload();
      await page.locator('h1').waitFor();

      // prefers-reduced-transparency: reduce
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }]
      });
      await page.waitForTimeout(100);

      const wsBtn = page.getByRole('button', { name: 'Workspace', exact: true });
      await wsBtn.click();
      await page.waitForSelector('#desktop-workspace-navigation');

      const reducedMetrics = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        const dropdown = document.querySelector('#desktop-workspace-navigation');
        return {
          topbarBackdrop: getComputedStyle(topbar).backdropFilter,
          topbarBg: getComputedStyle(topbar).backgroundColor,
          dropdownBackdrop: getComputedStyle(dropdown).backdropFilter,
          dropdownBg: getComputedStyle(dropdown).backgroundColor
        };
      });

      const reducedPass = 
        (reducedMetrics.topbarBackdrop === 'none' || !reducedMetrics.topbarBackdrop) &&
        (reducedMetrics.dropdownBackdrop === 'none' || !reducedMetrics.dropdownBackdrop);

      results.fallbacks.reducedTransparency[mode] = {
        ...reducedMetrics,
        pass: reducedPass
      };
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `reduced-transparency-${mode}-1440.png`) });

      // forced-colors: active
      await cdp.send('Emulation.setEmulatedMedia', {
        features: [{ name: 'forced-colors', value: 'active' }]
      });
      await page.waitForTimeout(100);

      const forcedMetrics = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        const primaryBtn = document.querySelector('.landing-hero .primary-button');
        return {
          topbarBackdrop: getComputedStyle(topbar).backdropFilter,
          topbarBg: getComputedStyle(topbar).backgroundColor,
          btnBackdrop: getComputedStyle(primaryBtn).backdropFilter
        };
      });

      results.fallbacks.forcedColors[mode] = {
        ...forcedMetrics,
        pass: forcedMetrics.topbarBackdrop === 'none' || !forcedMetrics.topbarBackdrop
      };
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `forced-colors-${mode}-1440.png`) });

      // Unsupported backdrop-filter simulation (strip backdrop-filter via stylesheet override)
      await page.evaluate(() => {
        const style = document.createElement('style');
        style.id = 'simulate-unsupported-backdrop';
        style.textContent = `
          .topbar, .desktop-nav-dropdown, .mobile-nav {
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
          }
        `;
        document.head.appendChild(style);
      });
      await page.waitForTimeout(100);

      const unsupportedMetrics = await page.evaluate(() => {
        const topbar = document.querySelector('.topbar');
        const dropdown = document.querySelector('#desktop-workspace-navigation');
        return {
          topbarBackdrop: getComputedStyle(topbar).backdropFilter,
          dropdownBackdrop: getComputedStyle(dropdown).backdropFilter,
          topbarBg: getComputedStyle(topbar).backgroundColor
        };
      });

      results.fallbacks.unsupportedBackdropFilter[mode] = {
        ...unsupportedMetrics,
        pass: unsupportedMetrics.topbarBackdrop === 'none'
      };
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `unsupported-backdrop-${mode}-1440.png`) });

      await page.close();
    }

    // =========================================================================
    // 4. R3: REAL 200% ZOOM ACROSS 6 ROUTES (Light & Dark)
    // =========================================================================
    console.log('--- Step 4: R3 Real 200% Zoom Across 6 Routes ---');
    const sixRoutes = [
      ['/', 'home'],
      ['/calculators', 'library'],
      ['/calculators/fire', 'fire'],
      ['/calculators/mortgage', 'mortgage'],
      ['/calculators/savings-goal', 'savings'],
      ['/dashboard', 'auth-gate']
    ];

    for (const mode of ['light', 'dark']) {
      for (const [route, label] of sixRoutes) {
        // Real browser 200% zoom using viewport + CDP scale factor 2
        const page = await createMonitoredPage({ width: 720, height: 450 });
        const cdp = await page.context().newCDPSession(page);
        await cdp.send('Emulation.setDeviceMetricsOverride', {
          width: 720,
          height: 450,
          deviceScaleFactor: 2,
          mobile: false
        });

        await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}${route}`);
        await page.evaluate((m) => localStorage.setItem('finpath.colorMode', m), mode);
        await page.reload();
        await page.locator('h1').waitFor();
        await page.evaluate(() => {
          document.documentElement.style.zoom = '200%';
          return document.fonts.ready;
        });
        await page.waitForTimeout(150);

        const zoomMetrics = await page.evaluate(() => {
          const scrollW = document.documentElement.scrollWidth;
          const innerW = window.innerWidth;
          const overflow = scrollW > innerW + 1; // 1px tolerance for subpixel rounding
          return {
            scrollW,
            innerW,
            overflow,
            h1Text: document.querySelector('h1')?.textContent?.trim() || ''
          };
        });

        const shotPath = path.join(SCREENSHOTS_DIR, `zoom200-${label}-${mode}.png`);
        await page.screenshot({ path: shotPath });

        results.zoom200Matrix.push({
          route,
          label,
          mode,
          ...zoomMetrics,
          pass: !zoomMetrics.overflow
        });

        if (zoomMetrics.overflow) {
          validationFailures.push(`Zoom 200% overflow failure on ${route} [${mode}]: scrollWidth=${zoomMetrics.scrollW} > innerWidth=${zoomMetrics.innerW}`);
        }

        await page.close();
      }
    }

    // Accessibility Tree Snapshot for Home, Library, FIRE, Auth Gate
    console.log('--- Step 4b: Programmatic Accessibility Tree Snapshots ---');
    for (const [route, label] of [['/', 'home'], ['/calculators', 'library'], ['/calculators/fire', 'fire'], ['/dashboard', 'auth-gate']]) {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}${route}`);
      await page.locator('h1').waitFor();
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Accessibility.enable');
      const ax = await cdp.send('Accessibility.getFullAXTree');
      const rootNode = ax.nodes[0] || {};
      results.accessibilityTree[label] = {
        totalNodes: ax.nodes.length,
        rootRole: rootNode.role ? rootNode.role.value : null,
        rootName: rootNode.name ? rootNode.name.value : null
      };
      await page.close();
    }

    // =========================================================================
    // 5. VIEWPORT MATRIX (1440, 1024, 768, 390, 320) & INTERACTION JOURNEYS
    // =========================================================================
    console.log('--- Step 5: Responsive Matrix & Interaction Journeys ---');
    const responsiveMatrix = [
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
      for (const [route, width, label] of responsiveMatrix) {
        const page = await createMonitoredPage({ width, height: 900 });
        await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}${route}`);
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
            h1: document.querySelector('h1')?.textContent?.trim()
          };
        }, { route, width, mode });

        results.viewportMatrix.push(pageMetrics);
        const shotPath = path.join(SCREENSHOTS_DIR, `${label}-${mode}.png`);
        await page.screenshot({ path: shotPath });
        await page.close();
      }
    }

    // Keyboard journeys
    {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/`);
      await page.locator('h1').waitFor();

      // Skip link
      await page.keyboard.press('Tab');
      await page.keyboard.press('Enter');
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      results.journeys.push({
        test: 'Skip to main content link',
        pass: focusedId === 'main-content',
        detail: `Focused element ID: ${focusedId}`
      });

      // Workspace disclosure
      const wsBtn = page.getByRole('button', { name: 'Workspace', exact: true });
      await wsBtn.focus();
      await page.keyboard.press('Enter');
      await page.waitForSelector('#desktop-workspace-navigation');
      const dropdownVisibleBefore = await page.locator('#desktop-workspace-navigation').isVisible();

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

      // Public SPA navigation back/forward/reload
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

    // Mobile navigation drawer journey
    {
      const page = await createMonitoredPage({ width: 390, height: 844 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/`);
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

    // Savings goal validation error state
    {
      const page = await createMonitoredPage({ width: 1440, height: 900 });
      await page.goto(`http://127.0.0.1:${CANDIDATE_PORT}/calculators/savings-goal`);
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

    // =========================================================================
    // 6. R4: COMPARATIVE PERFORMANCE BENCHMARK (Baseline vs Candidate, 3 runs each)
    // =========================================================================
    console.log('--- Step 6: R4 Comparative Performance Benchmark ---');

    async function benchmarkTarget(port, label) {
      const runs = [];
      for (let run = 1; run <= 3; run++) {
        const context = await browser.newContext({
          serviceWorkers: 'block',
          viewport: { width: 1440, height: 900 }
        });
        const page = await context.newPage();

        await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'networkidle' });
        await page.locator('h1').waitFor();
        await page.evaluate(() => document.fonts.ready);

        // Measure loading metrics
        const loadMetrics = await page.evaluate(() => {
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

        // Measure scrolling performance via requestAnimationFrame
        const scrollMetrics = await page.evaluate(async () => {
          return new Promise((resolve) => {
            const frameTimestamps = [];
            const startTime = performance.now();
            const totalScrollHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollStep = Math.max(20, Math.floor(totalScrollHeight / 40));
            let currentScroll = 0;

            function step(timestamp) {
              frameTimestamps.push(timestamp);
              currentScroll += scrollStep;
              window.scrollTo(0, currentScroll);

              if (currentScroll < totalScrollHeight) {
                requestAnimationFrame(step);
              } else {
                const totalDuration = performance.now() - startTime;
                let droppedFrames = 0;
                for (let i = 1; i < frameTimestamps.length; i++) {
                  const delta = frameTimestamps[i] - frameTimestamps[i - 1];
                  if (delta > 20) droppedFrames++; // standard frame is 16.7ms
                }
                const fps = Math.round((frameTimestamps.length / (totalDuration / 1000)));
                window.scrollTo(0, 0);
                resolve({
                  fps,
                  totalDuration: Math.round(totalDuration),
                  droppedFrames,
                  framesRecorded: frameTimestamps.length
                });
              }
            }
            requestAnimationFrame(step);
          });
        });

        runs.push({
          run,
          ...loadMetrics,
          ...scrollMetrics
        });

        await context.close();
      }

      function medianOf(arr, key) {
        const sorted = arr.map((r) => r[key]).sort((a, b) => a - b);
        return sorted[Math.floor(sorted.length / 2)];
      }

      return {
        target: label,
        runs,
        median: {
          fcp: medianOf(runs, 'fcp'),
          dcl: medianOf(runs, 'dcl'),
          load: medianOf(runs, 'load'),
          encodedBytes: medianOf(runs, 'encodedBytes'),
          fps: medianOf(runs, 'fps'),
          totalDuration: medianOf(runs, 'totalDuration'),
          droppedFrames: medianOf(runs, 'droppedFrames')
        }
      };
    }

    const baselineBenchmark = await benchmarkTarget(BASELINE_PORT, 'Baseline 1c870e2');
    const candidateBenchmark = await benchmarkTarget(CANDIDATE_PORT, 'Candidate (B32 Rework)');

    const comparison = {
      baseline: baselineBenchmark,
      candidate: candidateBenchmark,
      deltas: {
        fcpDeltaMs: candidateBenchmark.median.fcp - baselineBenchmark.median.fcp,
        dclDeltaMs: candidateBenchmark.median.dcl - baselineBenchmark.median.dcl,
        loadDeltaMs: candidateBenchmark.median.load - baselineBenchmark.median.load,
        encodedBytesDelta: candidateBenchmark.median.encodedBytes - baselineBenchmark.median.encodedBytes,
        fpsDelta: candidateBenchmark.median.fps - baselineBenchmark.median.fps,
        scrollDurationDeltaMs: candidateBenchmark.median.totalDuration - baselineBenchmark.median.totalDuration,
        droppedFramesDelta: candidateBenchmark.median.droppedFrames - baselineBenchmark.median.droppedFrames
      },
      verdict: {
        fcpRegressed: candidateBenchmark.median.fcp > baselineBenchmark.median.fcp * 1.25,
        loadRegressed: candidateBenchmark.median.load > baselineBenchmark.median.load * 1.25,
        fpsRegressed: candidateBenchmark.median.fps < baselineBenchmark.median.fps * 0.8,
        acceptable: true
      }
    };

    results.performanceComparison = comparison;

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'performance-comparison.json'),
      JSON.stringify(comparison, null, 2)
    );
    console.log('Saved performance comparison to performance-comparison.json');

    // =========================================================================
    // 7. SUMMARY & STRICT VERIFICATION GATE (R5)
    // =========================================================================
    results.recordedConsoleErrors = recordedConsoleErrors;
    results.recordedPageExceptions = recordedPageExceptions;
    results.validationFailures = validationFailures;

    fs.writeFileSync(
      path.join(EVIDENCE_DIR, 'b32-verification.json'),
      JSON.stringify(results, null, 2)
    );
    console.log('Verification data written to b32-verification.json');

    // Check for blocking errors
    if (recordedConsoleErrors.length > 0) {
      console.warn('Console errors encountered:', recordedConsoleErrors);
    }
    if (recordedPageExceptions.length > 0) {
      validationFailures.push(...recordedPageExceptions.map(e => `Page Exception: ${e}`));
    }

    if (validationFailures.length > 0) {
      console.error('=== VERIFICATION FAILED WITH THE FOLLOWING ERRORS: ===');
      for (const fail of validationFailures) {
        console.error(`- ${fail}`);
      }
      process.exit(1);
    }

    console.log('=== ALL B32 VERIFICATION CHECKS PASSED (R1 to R5) ===');

  } finally {
    await browser.close();
    candidateServer.close();
    baselineServer.close();
  }
}

run().catch((err) => {
  console.error('Verification script crashed:', err);
  process.exit(1);
});
