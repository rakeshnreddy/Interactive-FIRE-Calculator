const { performance } = require('node:perf_hooks');
const { chromium } = require(
  '/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'
);

const targets = {
  baseline: {
    sha: 'ae10ea516e1df38cf2fce5f0c704e1c855c9db01',
    url: 'http://127.0.0.1:4181'
  },
  candidate: {
    sha: 'ccebac7d5bcaf645721e2e67ea490a7f447e1db9',
    url: 'http://127.0.0.1:4177'
  }
};

const median = (values) => {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
};

const rounded = (value) => Math.round(value * 100) / 100;

async function sample(browser, name, run) {
  const target = targets[name];
  const context = await browser.newContext({
    serviceWorkers: 'block',
    viewport: { width: 1440, height: 900 }
  });
  await context.addInitScript(() => {
    window.__finpathLab = { cls: 0, lcp: 0 };
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__finpathLab.lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!entry.hadRecentInput) window.__finpathLab.cls += entry.value;
      }
    }).observe({ type: 'layout-shift', buffered: true });
  });

  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
  await cdp.send('Network.clearBrowserCache');

  await page.goto(target.url, { waitUntil: 'networkidle' });
  await page.locator('h1').waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(750);

  const navigation = await page.evaluate(() => {
    const timing = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const resources = performance.getEntriesByType('resource');
    return {
      cls: window.__finpathLab.cls,
      domContentLoadedMs: timing.domContentLoadedEventEnd,
      encodedBodyBytes: resources.reduce((sum, entry) => sum + entry.encodedBodySize, 0),
      fcpMs: fcp?.startTime ?? null,
      lcpMs: window.__finpathLab.lcp,
      loadMs: timing.loadEventEnd,
      responseStartMs: timing.responseStart
    };
  });

  const interactionStarted = performance.now();
  await page.locator('.desktop-nav a[href="/calculators"]').click();
  await page.waitForURL('**/calculators');
  await page.locator('main h1').waitFor();
  const routeInteractionMs = performance.now() - interactionStarted;

  await context.close();
  return {
    target: name,
    run,
    ...Object.fromEntries(Object.entries(navigation).map(([key, value]) => [key, rounded(value)])),
    routeInteractionMs: rounded(routeInteractionMs)
  };
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const samples = [];
  for (let run = 1; run <= 3; run += 1) {
    samples.push(await sample(browser, 'baseline', run));
    samples.push(await sample(browser, 'candidate', run));
  }

  const metricNames = [
    'responseStartMs',
    'domContentLoadedMs',
    'loadMs',
    'fcpMs',
    'lcpMs',
    'cls',
    'routeInteractionMs',
    'encodedBodyBytes'
  ];
  const medians = {};
  for (const name of Object.keys(targets)) {
    medians[name] = Object.fromEntries(
      metricNames.map((metric) => [
        metric,
        rounded(median(samples.filter((sample) => sample.target === name).map((sample) => sample[metric])))
      ])
    );
  }

  const deltasPercent = Object.fromEntries(
    metricNames.map((metric) => [
      metric,
      medians.baseline[metric] === 0
        ? medians.candidate[metric] === 0
          ? 0
          : null
        : rounded(((medians.candidate[metric] - medians.baseline[metric]) / medians.baseline[metric]) * 100)
    ])
  );

  const result = {
    browser: browser.version(),
    cachePolicy: 'new context per sample; CDP cache disabled and cleared; service workers blocked',
    device: 'same local host and installed Chrome process; 1440x900 viewport; no CPU or network throttling',
    interaction: 'click desktop Calculators link; wait for /calculators URL and H1 to render',
    route: '/',
    targets,
    samples,
    medians,
    deltasPercent
  };
  await browser.close();
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
