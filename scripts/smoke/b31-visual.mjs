// B31 hosted scenario: the visual accessibility and performance acceptance matrix at normal zoom.
// Viewport matrix in both themes, keyboard operation and focus visibility, reduced motion and
// reduced transparency, forced colours, contrast measured from effective pairs, state coverage
// and three-run lab performance. Native 200% zoom is the separate b31-zoom scenario.
import { PUBLIC_ROUTES, THEMES, FOCUS_SCRIPT, attachConsole, measureLayout, writeRaw, contrastReport, gotoTheme, layoutProblems, shot } from './_b31_helpers.mjs';

let fail;
const VIEWPORTS = [[1440, 900], [1024, 768], [768, 1024], [390, 844], [320, 800]];
const MATRIX_ROUTES = ['/', '/calculators', '/calculators/fire', '/calculators/mortgage'];
const median = (list) => { const s = [...list].sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : null; };

export default {
  name: 'b31-visual',
  requiredStages: ['viewport-matrix-both-themes', 'keyboard-and-focus', 'reduced-motion-transparency-forced-colors', 'contrast-effective-pairs', 'states-empty-error-long', 'landing-anchor-links', 'lab-performance-three-runs'],

  async run({ config, tenants, stage, browser, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a] = tenants;
    const signedInErrors = attachConsole(a.page);
    const anon = await browser.newAnonymousPage();
    anon.errors = attachConsole(anon.page);

    await stage('viewport-matrix-both-themes', async () => {
      const results = [];
      for (const [width, height] of VIEWPORTS) {
        await anon.page.setViewportSize({ width, height });
        for (const theme of THEMES) {
          for (const route of MATRIX_ROUTES) {
            await gotoTheme(anon.page, `${config.url}${route}`, theme);
            const report = await measureLayout(anon.page);
            const problems = layoutProblems(report);
            const file = await shot(anon.page, `matrix-${width}-${theme}-${route === '/' ? 'home' : route.slice(1).replace(/\//g, '-')}`);
            results.push({ width, theme, route, controls: report.controls, smallTargets: report.small.slice(0, 6), problems, screenshot: file });
          }
        }
      }
      // Signed-in workspace at the two extremes.
      for (const [width, height] of [[1440, 900], [320, 800]]) {
        await a.page.setViewportSize({ width, height });
        for (const route of ['/dashboard', '/settings']) {
          await gotoTheme(a.page, `${config.url}${route}`, width === 320 ? 'dark' : 'light');
          await a.page.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'), null, { timeout: 30000 });
          await a.page.waitForTimeout(800);
          const report = await measureLayout(a.page);
          const problems = layoutProblems(report);
          const file = await shot(a.page, `matrix-${width}-signed-in${route.replace(/\//g, '-')}`);
          results.push({ width, theme: width === 320 ? 'dark' : 'light', route, controls: report.controls, smallTargets: report.small.slice(0, 6), problems, screenshot: file });
        }
      }
      const failed = results.filter((r) => r.problems.length);
      const detailFile = writeRaw('b31-visual-viewport-matrix', results);
      if (failed.length) fail(`${failed.length}/${results.length} layout cases failed (${detailFile}): ${failed.slice(0, 3).map((r) => `${r.width} ${r.theme} ${r.route}: ${r.problems[0]}`).join(' | ')}`);
      return { cases: results.length, detailFile, results };
    });

    await stage('keyboard-and-focus', async () => {
      await anon.page.setViewportSize({ width: 1280, height: 800 });
      await gotoTheme(anon.page, `${config.url}/calculators/fire`, 'light');
      await anon.page.keyboard.press('Tab');
      const first = await anon.page.evaluate(FOCUS_SCRIPT);
      if (!/skip to content/i.test(first.label)) fail(`first Tab stop is ${first.tag} "${first.label}", not the skip link`);
      await anon.page.keyboard.press('Enter');
      const skipped = await anon.page.evaluate(() => ({ hash: location.hash, active: document.activeElement?.id || document.activeElement?.tagName }));
      const stops = [];
      for (let i = 0; i < 40; i += 1) {
        await anon.page.keyboard.press('Tab');
        // Focus scrolling is smooth (scroll-behavior), so let it finish before judging visibility.
        await anon.page.waitForTimeout(250);
        const focus = await anon.page.evaluate(FOCUS_SCRIPT);
        if (focus.tag === 'body') break;
        stops.push(focus);
      }
      const missingIndicator = stops.filter((s) => !s.indicator && !s.hidden).map((s) => `${s.tag}:${s.label}`);
      const unnamed = stops.filter((s) => !s.label && !s.hidden).map((s) => s.tag);
      const offscreen = stops.filter((s) => !s.inViewport && !s.hidden).map((s) => `${s.tag}:${s.label}`);
      if (missingIndicator.length) fail(`focused controls without a visible indicator: ${missingIndicator.slice(0, 6).join(', ')}`);
      if (unnamed.length) fail(`focused controls without a name: ${unnamed.join(', ')}`);
      if (offscreen.length) fail(`focus moved to off-screen controls: ${offscreen.slice(0, 4).join(', ')}`);
      const focusShot = await shot(anon.page, 'keyboard-fire-focus-ring');
      // Workspace menu (signed in): Enter opens, Escape closes and returns focus to the trigger.
      await a.page.setViewportSize({ width: 1280, height: 800 });
      await gotoTheme(a.page, `${config.url}/dashboard`, 'light');
      await a.page.waitForFunction(() => Boolean(window.Clerk?.user), null, { timeout: 30000 });
      const trigger = a.page.locator('.desktop-nav-menu > button');
      await trigger.focus();
      await a.page.keyboard.press('Enter');
      const opened = await trigger.getAttribute('aria-expanded');
      await a.page.keyboard.press('Tab');
      const insideMenu = await a.page.evaluate(() => Boolean(document.activeElement?.closest('#desktop-workspace-navigation')));
      await a.page.keyboard.press('Escape');
      const closed = await trigger.getAttribute('aria-expanded');
      const focusBack = await a.page.evaluate(() => document.activeElement?.textContent?.includes('Workspace'));
      if (opened !== 'true' || !insideMenu || closed !== 'false' || !focusBack) fail(`workspace menu keyboard: opened=${opened} inside=${insideMenu} closed=${closed} focusBack=${focusBack}`);
      // Mobile menu at 390: button toggles aria-expanded and Escape closes it.
      await a.page.setViewportSize({ width: 390, height: 844 });
      await a.page.waitForTimeout(300);
      const mobileButton = a.page.locator('.mobile-menu-button');
      await mobileButton.focus();
      await a.page.keyboard.press('Enter');
      const mobileOpen = await mobileButton.getAttribute('aria-expanded');
      const mobileShot = await shot(a.page, 'keyboard-mobile-menu-open-390');
      await a.page.keyboard.press('Escape');
      const mobileClosed = await mobileButton.getAttribute('aria-expanded');
      if (mobileOpen !== 'true' || mobileClosed !== 'false') fail(`mobile menu keyboard: open=${mobileOpen} closed=${mobileClosed}`);
      return { skipLink: first.label, afterSkip: skipped, tabStops: stops.length, order: stops.slice(0, 12).map((s) => `${s.tag}:${s.label}`), screenshots: [focusShot, mobileShot] };
    });

    await stage('reduced-motion-transparency-forced-colors', async () => {
      await anon.page.setViewportSize({ width: 1280, height: 800 });
      await anon.page.emulateMedia({ reducedMotion: 'reduce' });
      await gotoTheme(anon.page, `${config.url}/calculators/fire`, 'light');
      const motion = await anon.page.evaluate(() => [...document.querySelectorAll('.primary-button, .panel, .app, .topbar, a.nav-button')].slice(0, 12).map((el) => { const cs = getComputedStyle(el); return { el: el.className.split(' ')[0], transition: cs.transitionDuration, animation: cs.animationDuration }; }));
      const moving = motion.filter((m) => m.transition.split(',').some((d) => parseFloat(d) > 0.02) || m.animation.split(',').some((d) => parseFloat(d) > 0.02));
      if (moving.length) fail(`motion not reduced: ${JSON.stringify(moving.slice(0, 3))}`);
      await anon.page.emulateMedia({ reducedMotion: 'no-preference' });
      // Reduced transparency: glass falls back to opaque surfaces without blur.
      const cdp = await anon.page.context().newCDPSession(anon.page);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }] });
      await anon.page.reload({ waitUntil: 'networkidle' });
      const surfaces = await anon.page.evaluate(() => [...document.querySelectorAll('.panel, .topbar, .calculator-toolkit, .summary-band, .quick-calculator')].slice(0, 10).map((el) => { const cs = getComputedStyle(el); const alpha = cs.backgroundColor.match(/rgba?\(([^)]+)\)/)?.[1].split(/[\s,\/]+/)[3]; return { el: el.className.split(' ')[0], backdrop: cs.backdropFilter, alpha: alpha === undefined ? 1 : Number(alpha) }; }));
      const translucent = surfaces.filter((s) => (s.backdrop && s.backdrop !== 'none') || s.alpha < 1);
      const transparencyShot = await shot(anon.page, 'reduced-transparency-light-fire');
      if (translucent.length) fail(`surfaces still translucent under reduced transparency: ${JSON.stringify(translucent.slice(0, 3))}`);
      await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'forced-colors', value: 'active' }] });
      await anon.page.reload({ waitUntil: 'networkidle' });
      const forced = await anon.page.evaluate(() => ({ h1: document.querySelector('h1')?.getBoundingClientRect().height > 0, buttons: document.querySelectorAll('button:not([hidden])').length }));
      const forcedShot = await shot(anon.page, 'forced-colors-fire');
      await cdp.send('Emulation.setEmulatedMedia', { features: [] });
      await cdp.detach();
      if (!forced.h1 || !forced.buttons) fail('page did not render under forced colors');
      return { motionSamples: motion.length, surfaces, screenshots: [transparencyShot, forcedShot] };
    });

    await stage('contrast-effective-pairs', async () => {
      await anon.page.setViewportSize({ width: 1280, height: 800 });
      const pages = [];
      for (const theme of THEMES) {
        for (const route of ['/', '/calculators', '/calculators/fire', '/calculators/mortgage']) {
          await gotoTheme(anon.page, `${config.url}${route}`, theme);
          if (route === '/calculators/fire') {
            await anon.page.locator('button:has-text("Use example values")').click();
            await anon.page.locator('.quick-actions .primary-button').click();
            await anon.page.waitForTimeout(600);
          }
          pages.push({ theme, route, ...(await contrastReport(anon.page.context(), anon.page)) });
        }
        for (const route of ['/dashboard', '/settings']) {
          await a.page.setViewportSize({ width: 1280, height: 800 });
          await gotoTheme(a.page, `${config.url}${route}`, theme);
          await a.page.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'), null, { timeout: 30000 });
          await a.page.waitForTimeout(800);
          pages.push({ theme, route, ...(await contrastReport(a.page.context(), a.page)) });
        }
      }
      const failures = pages.flatMap((p) => p.failures.map((f) => ({ theme: p.theme, route: p.route, ...f })));
      writeRaw('b31-visual-contrast', pages);
      if (failures.length) fail(`contrast below threshold: ${failures.slice(0, 5).map((f) => `${f.theme} ${f.route} ${f.element} "${f.text}" ${f.ratio}:1 (needs ${f.required})`).join(' | ')}`);
      return { pages: pages.map((p) => ({ theme: p.theme, route: p.route, sampled: p.sampled, minimum: p.minimum, lowest: p.lowest.slice(0, 4) })) };
    });

    await stage('states-empty-error-long', async () => {
      await anon.page.setViewportSize({ width: 1280, height: 800 });
      await gotoTheme(anon.page, `${config.url}/calculators?q=zzzzqqq`, 'light');
      const empty = await anon.page.locator('.calculator-empty-state').first().textContent().catch(() => '');
      if (!empty) fail('search with no matches shows no empty state');
      const emptyShot = await shot(anon.page, 'state-search-empty');
      await gotoTheme(anon.page, `${config.url}/calculators/fire`, 'dark');
      // Blank required rates: Calculate is disabled and the reason is written next to it (B36).
      const calculate = anon.page.locator('.quick-actions .primary-button');
      const blocker = await anon.page.locator('#fire-calc-blocker').textContent().catch(() => '');
      if (!(await calculate.isDisabled()) || !blocker?.trim()) fail(`blank rates did not block Calculate with a reason: disabled=${await calculate.isDisabled()} blocker="${blocker}"`);
      // An invalid value is an error associated with its field.
      await anon.page.fill('#fire-return', '99');
      await anon.page.waitForTimeout(400);
      const errors = await anon.page.evaluate(() => [...document.querySelectorAll('[role="alert"]')].filter((el) => el.getClientRects().length).map((el) => el.textContent.trim().slice(0, 80)));
      const association = await anon.page.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"]')].map((el) => ({ id: el.id, described: (el.getAttribute('aria-describedby') || '').split(' ').some((id) => document.getElementById(id)) })));
      if (!errors.length || !association.length || association.some((x) => !x.described)) fail(`required-field errors not associated: ${JSON.stringify({ errors, association })}`);
      const errorShot = await shot(anon.page, 'state-fire-required-errors-dark');
      await anon.page.fill('#fire-initial-portfolio', '999999999999');
      await anon.page.fill('#fire-annual-expense', '9999999');
      await anon.page.locator('button:has-text("Use example values")').click();
      await anon.page.locator('.quick-actions .primary-button').click();
      await anon.page.waitForTimeout(800);
      const longReport = await measureLayout(anon.page);
      const longShot = await shot(anon.page, 'state-fire-long-values-dark', true);
      const longProblems = layoutProblems(longReport);
      if (longProblems.length) fail(`long values: ${longProblems.join('; ')}`);
      // Workspace loading state is the lazy panel fallback; a signed-in first paint shows it.
      const loading = await a.page.evaluate(() => Boolean(document.querySelector('.panel-loading, [aria-busy="true"], .loading-state')) || null);
      return { emptyState: empty.trim().slice(0, 100), calculateBlockedReason: blocker.trim().slice(0, 120), invalidValueErrors: errors, longValueControls: longReport.controls, loadingStateObserved: loading, screenshots: [emptyShot, errorShot, longShot] };
    });

    await stage('landing-anchor-links', async () => {
      // Toolkit cards and footer links point at /calculators#toolkit-<id>; an in-app click must land on
      // the library with that toolkit in view (independent review found it stayed on the homepage).
      await anon.page.setViewportSize({ width: 1280, height: 800 });
      await gotoTheme(anon.page, `${config.url}/`, 'light');
      await anon.page.locator('.landing-toolkit-card').first().click();
      await anon.page.waitForFunction(() => location.pathname === '/calculators' && document.querySelector('h1')?.textContent !== null, null, { timeout: 15000 });
      await anon.page.waitForTimeout(1500);
      const state = await anon.page.evaluate(() => {
        const id = location.hash.slice(1);
        const el = id ? document.getElementById(id) : null;
        const rect = el?.getBoundingClientRect();
        return { pathname: location.pathname, hash: location.hash, targetExists: Boolean(el), inView: Boolean(rect && rect.top >= -4 && rect.top < window.innerHeight), h1: document.querySelector('h1')?.textContent ?? '' };
      });
      if (state.pathname !== '/calculators' || !state.hash.startsWith('#toolkit-') || !state.targetExists || !state.inView) fail(`toolkit link did not land on its toolkit: ${JSON.stringify(state)}`);
      return state;
    });

    await stage('lab-performance-three-runs', async () => {
      const routes = ['/', '/calculators/fire', '/calculators/mortgage'];
      const runs = [];
      for (const route of routes) {
        for (let i = 0; i < 3; i += 1) {
          const fresh = await browser.newAnonymousPage();
          const errs = attachConsole(fresh.page);
          await fresh.page.addInitScript(() => { window.__lcp = null; new PerformanceObserver((list) => { window.__lcp = list.getEntries().at(-1)?.startTime ?? window.__lcp; }).observe({ type: 'largest-contentful-paint', buffered: true }); });
          await fresh.page.goto(`${config.url}${route}`, { waitUntil: 'networkidle' });
          await fresh.page.waitForTimeout(500);
          const metrics = await fresh.page.evaluate(() => {
            const nav = performance.getEntriesByType('navigation')[0];
            const resources = performance.getEntriesByType('resource');
            const sum = (list) => list.reduce((t, r) => t + (r.transferSize || 0), 0);
            return { ttfb: Math.round(nav.responseStart), domContentLoaded: Math.round(nav.domContentLoadedEventEnd), load: Math.round(nav.loadEventEnd), lcp: window.__lcp === null ? null : Math.round(window.__lcp), htmlBytes: nav.transferSize, jsBytes: sum(resources.filter((r) => /\.js(\?|$)/.test(r.name))), cssBytes: sum(resources.filter((r) => /\.css(\?|$)/.test(r.name))), requests: resources.length + 1, clerkLoaded: resources.some((r) => /clerk/.test(r.name)) };
          });
          runs.push({ route, run: i + 1, ...metrics, consoleErrors: errs.length });
          await fresh.page.context().close().catch(() => {});
        }
      }
      const summary = routes.map((route) => { const rs = runs.filter((r) => r.route === route); return { route, medianTtfbMs: median(rs.map((r) => r.ttfb)), medianDomContentLoadedMs: median(rs.map((r) => r.domContentLoaded)), medianLoadMs: median(rs.map((r) => r.load)), medianLcpMs: median(rs.map((r) => r.lcp).filter((v) => v !== null)), jsBytes: median(rs.map((r) => r.jsBytes)), cssBytes: median(rs.map((r) => r.cssBytes)), requests: median(rs.map((r) => r.requests)), clerkLoaded: rs.some((r) => r.clerkLoaded) }; });
      if (runs.some((r) => r.consoleErrors)) fail(`console errors during performance runs: ${runs.filter((r) => r.consoleErrors).map((r) => r.route).join(', ')}`);
      if (summary.some((s) => s.clerkLoaded)) fail('public pages downloaded Clerk');
      if (anon.errors.length || signedInErrors.length) fail(`console errors during the sweep: ${[...anon.errors, ...signedInErrors].slice(0, 4).join(' | ')}`);
      const violations = await a.page.evaluate(() => window.__cspViolations ?? []);
      if (violations.length) fail(`CSP violations while signed in: ${violations.join('; ')}`);
      return { summary, runs, note: 'Lab measurements from one machine over the network; field metrics are unavailable (no analytics collection).' };
    });
  }
};
