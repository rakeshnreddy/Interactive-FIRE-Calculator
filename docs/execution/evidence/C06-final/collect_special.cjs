const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const { evaluateSuite, calculateContrastRatio } = require('../C06/evaluator.cjs');
const { evaluateRenderedExpectation } = require('../C06/rendered-expectations.cjs');

const baseUrl = 'http://127.0.0.1:5173/fixtures.html';
const outputDir = path.join(__dirname, 'screenshots');
fs.mkdirSync(outputDir, { recursive: true });

async function observe(page, { id, domain, state, theme }) {
  const raw = await page.evaluate(() => {
    const root = document.querySelector('.fixture-harness-root');
    const shell = document.querySelector('.app.app-shell');
    const target = shell?.querySelector('h1, h2, button, label');
    const targetStyle = target ? getComputedStyle(target) : null;
    const parse = value => {
      const match = value?.match(/^rgba?\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\s*\)$/i);
      return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] === undefined ? 1 : Number(match[4])] : null;
    };
    const layers = [];
    for (let node = target; node; node = node.parentElement) {
      const color = parse(getComputedStyle(node).backgroundColor);
      if (color && color[3] > 0) layers.push(color);
    }
    const canvas = parse(getComputedStyle(document.documentElement).backgroundColor) || [255, 255, 255, 1];
    let composed = canvas.slice(0, 3);
    for (const [r, g, b, alpha] of layers.reverse()) {
      composed = [r, g, b].map((channel, index) => channel * alpha + composed[index] * (1 - alpha));
      if (alpha === 1) composed = [r, g, b];
    }
    const background = `rgb(${composed.map(Math.round).join(', ')})`;
    const sw = Math.max(document.body.scrollWidth, document.documentElement.scrollWidth);
    return {
      rootDataMode: root?.getAttribute('data-mode') || null,
      shellDataMode: shell?.getAttribute('data-mode') || null,
      shellBackground: getComputedStyle(shell).backgroundColor,
      shellColor: getComputedStyle(shell).color,
      text: shell?.innerText || '',
      contrastTarget: target?.textContent?.trim() || null,
      foreground: targetStyle?.color || null,
      background,
      viewportWidth: innerWidth,
      viewportHeight: innerHeight,
      documentScrollWidth: sw,
      documentScrollHeight: Math.max(document.body.scrollHeight, document.documentElement.scrollHeight)
    };
  });
  const screenshot = `${id}.png`;
  const screenshotPath = path.join(outputDir, screenshot);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return {
    id, domain, state, theme, viewport: { width: raw.viewportWidth, height: raw.viewportHeight },
    screenshot, screenshotExists: fs.existsSync(screenshotPath), screenshotSizeBytes: fs.statSync(screenshotPath).size,
    themeInfo: { rootDataMode: raw.rootDataMode, shellDataMode: raw.shellDataMode, bgColor: raw.shellBackground, textColor: raw.shellColor },
    geometry: {
      viewportWidth: raw.viewportWidth, viewportHeight: raw.viewportHeight,
      documentScrollWidth: raw.documentScrollWidth, documentScrollHeight: raw.documentScrollHeight,
      hasHorizontalOverflow: raw.documentScrollWidth > raw.viewportWidth + 2,
      overflowDelta: Math.max(0, raw.documentScrollWidth - raw.viewportWidth)
    },
    contrast: {
      tested: true,
      ratio: calculateContrastRatio(raw.foreground, raw.background),
      fgColor: raw.foreground, bgColor: raw.background, targetText: raw.contrastTarget, minRequired: 4.5
    },
    renderedContent: evaluateRenderedExpectation(domain, state, raw.text)
  };
}

async function runCase(browser, spec, setup, action) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...(setup?.context || {}) });
  const page = await context.newPage();
  const consoleErrors = [];
  const rawConsoleErrors = [];
  const pageErrors = [];
  page.on('console', message => {
    if (message.type() === 'error') {
      rawConsoleErrors.push(message.text());
      if (!message.text().includes('[SYNTHETIC FIXTURE SECURITY VIOLATION]')) consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', error => pageErrors.push(error.message));
  if (setup?.cdp) {
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', setup.cdp);
  }
  await page.goto(`${baseUrl}?component=${spec.domain}&state=${spec.state}&theme=${spec.theme}`);
  await page.waitForSelector('.fixture-harness-root');
  await page.waitForSelector('.app.app-shell');
  await page.waitForTimeout(150);
  const extra = action ? await action(page) : {};
  const result = { ...(await observe(page, spec)), ...extra, consoleErrors, rawConsoleErrors, pageErrors };
  await context.close();
  return result;
}

(async () => {
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  const cases = [];
  cases.push(await runCase(browser,
    { id: 'reduced-motion-dashboard-dark-final', domain: 'dashboard', state: 'populated', theme: 'dark' },
    { context: { reducedMotion: 'reduce' } },
    async page => {
      const measured = await page.evaluate(() => {
        const targets = [...document.querySelectorAll('.app.app-shell button, .app.app-shell a, .app.app-shell [role="button"]')];
        const samples = targets.slice(0, 12).map(target => { const style = getComputedStyle(target); return { selector: target.tagName.toLowerCase() + (target.className ? `.${String(target.className).trim().split(/\s+/).join('.')}` : ''), transitionDuration: style.transitionDuration, animationDuration: style.animationDuration }; });
        // The product's reduced-motion rule uses 0.01ms rather than literal zero so
        // transitionend-dependent browser behavior remains deterministic.
        const seconds = value => value.split(',').every(part => parseFloat(part) <= 0.001);
        return { matched: matchMedia('(prefers-reduced-motion: reduce)').matches, productTargetCount: targets.length, samples, suppressed: targets.length > 0 && samples.every(sample => seconds(sample.transitionDuration) && seconds(sample.animationDuration)) };
      });
      return { mediaCheck: { type: 'reduced-motion', requested: true, matched: measured.matched, active: measured.matched && measured.suppressed, measured } };
    }
  ));
  cases.push(await runCase(browser,
    { id: 'reduced-transparency-dashboard-dark-final', domain: 'dashboard', state: 'populated', theme: 'dark' },
    { cdp: { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] } },
    async page => {
      const measured = await page.evaluate(() => {
        const target = document.querySelector('.app.app-shell .account-panel');
        const style = getComputedStyle(target);
        const alpha = Number(style.backgroundColor.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? 1);
        return { matched: matchMedia('(prefers-reduced-transparency: reduce)').matches, selector: target.className, backdropFilter: style.backdropFilter, webkitBackdropFilter: style.webkitBackdropFilter, backgroundColor: style.backgroundColor, alpha };
      });
      return { mediaCheck: { type: 'reduced-transparency', requested: true, matched: measured.matched, active: measured.matched && measured.backdropFilter === 'none' && (measured.webkitBackdropFilter == null || measured.webkitBackdropFilter === 'none') && measured.alpha === 1, measured } };
    }
  ));
  cases.push(await runCase(browser,
    { id: 'keyboard-accounts-light-final', domain: 'accounts', state: 'populated', theme: 'light' }, null,
    async page => {
      const sequence = [];
      for (let i = 0; i < 30; i++) {
        await page.keyboard.press('Tab');
        const step = await page.evaluate(() => {
          const el = document.activeElement;
          const shell = document.querySelector('.app.app-shell');
          if (!shell?.contains(el)) return null;
          const style = getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          const center = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
          const banner = document.querySelector('.fixture-banner')?.getBoundingClientRect();
          const occluded = !center || !(center === el || el.contains(center)) || (banner && banner.bottom > rect.top && banner.top < rect.bottom);
          return { tag: el.tagName, name: (el.getAttribute('aria-label') || el.textContent || el.value || '').trim(), visibleFocus: style.outlineStyle !== 'none' || style.boxShadow !== 'none', occluded: Boolean(occluded), rect: { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right } };
        });
        if (step) sequence.push(step);
        if (sequence.length === 3) break;
      }
      await page.keyboard.press('Enter');
      await page.keyboard.press('Escape');
      const focused = sequence[0];
      return { keyboardFocus: { attempted: true, focusedTag: focused?.tag || 'BODY', focusedRole: focused?.tag?.toLowerCase() || '', focusedText: focused?.name || '', hasVisibleFocusRing: focused?.visibleFocus === true, isBodyFocus: !focused || focused.tag === 'BODY', occluded: !focused || focused.occluded || focused.rect.top < 0 || focused.rect.bottom > 900, sequence, keysExercised: ['Tab', 'Enter', 'Escape'] } };
    }
  ));
  cases.push(await runCase(browser,
    { id: 'network-settings-light-final', domain: 'settings', state: 'populated', theme: 'light' }, null,
    async page => {
      const outgoing = [];
      page.on('request', req => { if (['POST','PUT','PATCH','DELETE'].includes(req.method())) outgoing.push({ method: req.method(), url: req.url() }); });
      const actions = await page.evaluate(async () => {
        const synthetic = await fetch('/api/imports/transactions/commit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ synthetic: true }) }).then(async r => ({ status: r.status, body: await r.json() }));
        let blocked = false;
        try { await fetch('/api/accounts', { method: 'POST', body: '{}' }); } catch (error) { blocked = String(error.message).includes('blocked'); }
        const button = [...document.querySelectorAll('button')].find(node => node.textContent.includes('Export data'));
        button?.click();
        return { syntheticStatus: synthetic.status, syntheticRecord: Boolean(synthetic.body?.importRecord), blocked, settingsClicked: Boolean(button) };
      });
      return { networkLock: { tested: true, outgoingMutationsCount: outgoing.length, trapVerified: actions.syntheticStatus === 200 && actions.syntheticRecord && actions.blocked && actions.settingsClicked, actions, outgoing } };
    }
  ));
  const hostedPublicChecks = [];
  for (const spec of [
    { id: 'hosted-home-desktop', path: '/', viewport: { width: 1440, height: 900 } },
    { id: 'hosted-sign-in-boundary-mobile', path: '/dashboard', viewport: { width: 390, height: 844 }, expectedText: 'Sign in' }
  ]) {
    const context = await browser.newContext({ viewport: spec.viewport });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', message => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', error => pageErrors.push(error.message));
    const response = await page.goto(`https://5e68409d.interactive-fire-calculator.pages.dev${spec.path}`, { waitUntil: 'networkidle' });
    const screenshot = `${spec.id}.png`;
    const screenshotPath = path.join(outputDir, screenshot);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    const observed = await page.evaluate(() => ({ title: document.title, heading: document.querySelector('h1')?.textContent?.trim() || null, bodyTextLength: document.body.innerText.length, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    const expectedTextMatched = !spec.expectedText || await page.getByText(spec.expectedText, { exact: false }).first().isVisible().catch(() => false);
    hostedPublicChecks.push({ ...spec, status: response?.status() || null, finalUrl: page.url(), screenshot, screenshotExists: fs.existsSync(screenshotPath), screenshotSizeBytes: fs.statSync(screenshotPath).size, observed, expectedTextMatched, consoleErrors, pageErrors, passed: response?.ok() === true && expectedTextMatched && observed.bodyTextLength > 0 && observed.scrollWidth <= observed.viewportWidth + 2 && consoleErrors.length === 0 && pageErrors.length === 0 });
    await context.close();
  }
  await browser.close();
  const evaluation = evaluateSuite(cases);
  const report = { timestamp: new Date().toISOString(), candidate: require('node:child_process').execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), note: 'Raw focused supplement for the four non-native special cases that were missing real rendered/contrast observations in C06-primary. Native Chrome evidence is recorded separately. Contrast backgrounds are recursively alpha-composited from the actual product text ancestor stack. Hosted checks are read-only public-boundary smoke renders.', limitations: ['Headless Chrome media emulation verifies the browser media-query response and actual rendered product CSS; it does not prove an operating-system preference toggle.', 'Contrast uses computed CSS colors and sRGB alpha compositing; it does not sample antialiased glyph pixels.', 'The hosted smoke checks cover public rendering and console/page errors only; they do not authenticate or mutate data.'], rawCases: cases, evaluation, hostedPublicChecks };
  fs.writeFileSync(path.join(__dirname, 'special-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ summary: { pass: evaluation.passCount, fail: evaluation.failCount, blocked: evaluation.blockedCount }, statuses: evaluation.evaluatedCases.map(c => ({ id: c.id, status: c.status, reasons: c.evaluationReasons })) }, null, 2));
  process.exitCode = evaluation.allPassed ? 0 : 1;
})().catch(error => { console.error(error); process.exitCode = 1; });
