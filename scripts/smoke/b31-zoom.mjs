// B31 hosted scenario: one consolidated native 200% browser-zoom sweep of public and signed-in
// journeys in both themes. Requires the runner's --zoom 200 (a real per-host Chrome zoom level in
// a persistent profile, not device metrics), so it runs with a single tenant.
import { PUBLIC_ROUTES, THEMES, WORKSPACE_ROUTES, attachConsole, measureLayout, writeRaw, gotoTheme, layoutProblems, shot } from './_b31_helpers.mjs';

let fail;

export default {
  name: 'b31-zoom',
  tenants: 1,
  requiredStages: ['native-zoom-verified', 'public-routes-200-zoom', 'signed-in-routes-200-zoom', 'long-values-and-errors-200-zoom'],

  async run({ config, tenants, stage, browser, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [tenant] = tenants;
    const consoleErrors = attachConsole(tenant.page);
    let anon;

    await stage('native-zoom-verified', async () => {
      if (browser.zoom !== 200) fail('run this scenario with --zoom 200');
      anon = await browser.newAnonymousPage();
      anon.errors = attachConsole(anon.page);
      await anon.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'networkidle' });
      const facts = await anon.page.evaluate(() => ({ inner: window.innerWidth, outer: window.outerWidth, dpr: window.devicePixelRatio, signedIn: Boolean(window.Clerk?.user), clerkLoaded: Boolean(window.Clerk) }));
      // At 200% the CSS viewport is half the window and the pixel ratio doubles: real browser zoom.
      if (facts.inner > facts.outer / 2 + 2 || facts.dpr < 2) fail(`page is not at 200% zoom: ${JSON.stringify(facts)}`);
      // The anonymous page must be its own profile: no session and, on a public page, no Clerk at all.
      if (facts.signedIn || facts.clerkLoaded) fail(`anonymous zoomed page is not signed out: ${JSON.stringify(facts)}`);
      return { browser: `Google Chrome ${await browser.version()}`, zoomPercent: 200, cssViewportWidth: facts.inner, windowWidth: facts.outer, devicePixelRatio: facts.dpr, anonymousSignedOut: true };
    });

    await stage('public-routes-200-zoom', async () => {
      const results = [];
      for (const theme of THEMES) {
        for (const route of PUBLIC_ROUTES) {
          await gotoTheme(anon.page, `${config.url}${route}`, theme);
          if (route === '/calculators/fire') {
            await anon.page.locator('button:has-text("Use example values")').click();
            await anon.page.locator('.quick-actions .primary-button').click();
            await anon.page.waitForTimeout(600);
          }
          const report = await measureLayout(anon.page);
          const problems = layoutProblems(report);
          const file = await shot(anon.page, `zoom200-${theme}-${route === '/' ? 'home' : route.slice(1).replace(/\//g, '-')}`, true);
          results.push({ route, theme, cssViewportWidth: report.innerWidth, controls: report.controls, problems, screenshot: file });
        }
      }
      const failed = results.filter((r) => r.problems.length);
      const detailFile = writeRaw('b31-zoom-public-routes', results);
      if (failed.length) fail(`${failed.length}/${results.length} public routes failed at 200% (${detailFile}): ${failed.slice(0, 3).map((r) => `${r.theme} ${r.route}: ${r.problems[0]}`).join(' | ')}`);
      if (anon.errors.length) fail(`console errors on public routes: ${anon.errors.slice(0, 3).join(' | ')}`);
      return { routes: results };
    });

    await stage('signed-in-routes-200-zoom', async () => {
      const results = [];
      for (const theme of THEMES) {
        for (const route of WORKSPACE_ROUTES) {
          await gotoTheme(tenant.page, `${config.url}${route}`, theme);
          await tenant.page.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'), null, { timeout: 30000 });
          await tenant.page.waitForTimeout(800);
          const report = await measureLayout(tenant.page);
          const problems = layoutProblems(report);
          const file = await shot(tenant.page, `zoom200-${theme}-signed-in${route.replace(/\//g, '-')}`, true);
          results.push({ route, theme, cssViewportWidth: report.innerWidth, controls: report.controls, problems, screenshot: file });
        }
      }
      // Essential navigation stays reachable: the menu that is rendered at this width opens and lists Settings.
      const menuButton = tenant.page.locator('.mobile-menu-button:visible, .desktop-nav-menu > button:visible').first();
      await menuButton.click();
      // In the phone-width menu the workspace links sit inside a collapsed "Workspace" group.
      const group = tenant.page.locator('details.mobile-nav-group:visible > summary');
      if (await group.count()) await group.first().click();
      const settingsLink = tenant.page.locator('a[href="/settings"]:visible').first();
      await settingsLink.waitFor({ state: 'visible', timeout: 5000 });
      const settingsBox = await settingsLink.boundingBox();
      await tenant.page.keyboard.press('Escape');
      const failed = results.filter((r) => r.problems.length);
      const detailFile = writeRaw('b31-zoom-signed-in-routes', results);
      if (failed.length) fail(`${failed.length}/${results.length} signed-in routes failed at 200% (${detailFile}): ${failed.slice(0, 3).map((r) => `${r.theme} ${r.route}: ${r.problems[0]}`).join(' | ')}`);
      const violations = await tenant.page.evaluate(() => window.__cspViolations ?? []);
      if (violations.length) fail(`CSP violations: ${violations.join('; ')}`);
      if (consoleErrors.length) fail(`console errors while signed in: ${consoleErrors.slice(0, 3).join(' | ')}`);
      return { routes: results, settingsLinkVisibleFromMenu: Boolean(settingsBox) };
    });

    await stage('long-values-and-errors-200-zoom', async () => {
      await gotoTheme(anon.page, `${config.url}/calculators/fire`, 'light');
      await anon.page.fill('#fire-initial-portfolio', '999999999999');
      await anon.page.fill('#fire-annual-expense', '9999999');
      // Blank required rates: Calculate stays disabled with a written reason (B36), never a silent default.
      const calculate = anon.page.locator('.quick-actions .primary-button');
      const blocker = await anon.page.locator('#fire-calc-blocker').textContent().catch(() => '');
      if ((await calculate.getAttribute('aria-disabled')) !== 'true' || !blocker?.trim()) fail(`blank rates did not block Calculate: aria-disabled=${await calculate.getAttribute('aria-disabled')} blocker="${blocker}"`);
      // An invalid rate is an error associated with its field and visible at 200%.
      await anon.page.fill('#fire-return', '99');
      await anon.page.waitForTimeout(400);
      const alerts = await anon.page.locator('[role="alert"]:visible').count();
      const invalid = await anon.page.evaluate(() => [...document.querySelectorAll('[aria-invalid="true"]')].map((el) => ({ id: el.id, describedBy: el.getAttribute('aria-describedby'), described: Boolean(el.getAttribute('aria-describedby') && document.getElementById(el.getAttribute('aria-describedby').split(' ').find((id) => document.getElementById(id)))) })));
      if (!alerts || !invalid.length || invalid.some((i) => !i.described)) fail(`invalid rate not reported accessibly: alerts=${alerts} invalid=${JSON.stringify(invalid)}`);
      const errorShot = await shot(anon.page, 'zoom200-light-fire-invalid-rate-error');
      await anon.page.locator('button:has-text("Use example values")').click();
      await anon.page.locator('.quick-actions .primary-button').click();
      await anon.page.waitForTimeout(800);
      const longReport = await measureLayout(anon.page);
      const longProblems = layoutProblems(longReport);
      const longShot = await shot(anon.page, 'zoom200-light-fire-long-values', true);
      if (longProblems.length) fail(`long values break layout at 200%: ${longProblems.join('; ')}`);
      // An out-of-range rate is refused with a visible message.
      await gotoTheme(anon.page, `${config.url}/calculators/compound-interest`, 'dark');
      const rate = anon.page.getByLabel(/annual (return|rate|interest)/i).first();
      await rate.fill('500');
      await anon.page.waitForTimeout(500);
      const rateMessage = await anon.page.locator('[role="alert"]:visible, .field-issue:visible').first().textContent().catch(() => '');
      const rateShot = await shot(anon.page, 'zoom200-dark-compound-rate-500');
      if (!/100%/.test(rateMessage || '')) fail(`500% rate not refused: ${rateMessage}`);
      return { calculateBlockedReason: blocker.trim().slice(0, 120), invalidRateAlerts: alerts, invalidFields: invalid.map((i) => i.id), screenshots: [errorShot, longShot, rateShot], rateMessage: rateMessage.slice(0, 120) };
    });
  }
};
