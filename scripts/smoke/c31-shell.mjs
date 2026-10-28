// B70 bounded shell scenario for the shared hosted runner. Uses only synthetic identity.
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';
export default {
  name: 'c31-shell',
  tenants: 1,
  requiredStages: ['signed-in-shell', 'anonymous-account-gates'],
  async run({ config, tenants, stage, browser, helpers }) {
    const signed = tenants[0].page;
    const anonymous = await browser.newAnonymousPage();
    const signedErrors = attachConsole(signed);
    const anonymousErrors = attachConsole(anonymous.page);
    const check = (condition, message) => { if (!condition) throw new helpers.SmokeError(message); };
    await stage('signed-in-shell', async () => {
      const cases = [];
      for (const width of [1440, 1041, 768, 390, 320]) for (const theme of ['light', 'dark']) {
        await signed.setViewportSize({ width, height: 900 });
        await gotoTheme(signed, `${config.url}/dashboard`, theme);
        await signed.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'));
        const layout = await measureLayout(signed);
        check(!layoutProblems(layout).length, `${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
        check(await signed.locator('footer').count() === 1, 'Shared footer missing');
        if (width >= 1041) {
          const workspace = signed.locator('.desktop-nav').getByRole('button', { name: 'Workspace', exact: true });
          await workspace.click();
          await signed.locator('.desktop-nav-dropdown').waitFor();
          const routes = await signed.locator('.desktop-nav-dropdown a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
          check(['/accounts', '/plans', '/reports', '/settings'].every(route => routes.includes(route)), 'Workspace destination lost');
          await signed.keyboard.press('Escape');
          check(await workspace.evaluate(node => node === document.activeElement), 'Desktop Escape lost trigger focus');
        } else {
          const menu = signed.getByRole('button', { name: 'Open navigation', exact: true });
          await menu.click();
          await signed.locator('.mobile-nav summary').click();
          await signed.locator('.mobile-nav a[href="/plans"]').waitFor({ state: 'visible' });
          await signed.keyboard.press('Escape');
          check(await menu.evaluate(node => node === document.activeElement), 'Mobile Escape lost trigger focus');
        }
        const geometry = await signed.locator('.topbar').evaluate(node => ({ height: node.getBoundingClientRect().height, width: node.scrollWidth, viewport: innerWidth }));
        check(geometry.width <= width + 1, `Header overflow ${JSON.stringify(geometry)}`);
        cases.push({ width, theme, geometry, problems: layoutProblems(layout) });
      }
      check(!signedErrors.length, `Signed-in errors: ${JSON.stringify(signedErrors)}`);
      return { cases, errors: signedErrors };
    });
    await stage('anonymous-account-gates', async () => {
      const cases = [];
      for (const width of [1440, 320]) for (const theme of ['light', 'dark']) {
        await anonymous.page.setViewportSize({ width, height: 900 });
        for (const route of ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings']) {
          await gotoTheme(anonymous.page, `${config.url}${route}`, theme);
          await anonymous.page.locator('.auth-gate-panel').waitFor({ state: 'visible' });
          const layout = await measureLayout(anonymous.page);
          check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
          check(await anonymous.page.locator('footer').count() === 1, `Gate footer missing: ${route}`);
          cases.push({ route, width, theme, problems: layoutProblems(layout) });
        }
      }
      check(!anonymousErrors.length, `Anonymous errors: ${JSON.stringify(anonymousErrors)}`);
      return { cases, errors: anonymousErrors };
    });
  }
};
