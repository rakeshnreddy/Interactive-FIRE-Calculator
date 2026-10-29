// B78 homepage journeys extend the shared runner; only its synthetic tenant is used.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';
export default {
  name: 'c38-home',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'anonymous-home', 'signed-in-home'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    for (const [name, page, signedIn] of [['anonymous-home', anonymous.page, false], ['signed-in-home', tenants[0].page, true]]) {
      await stage(name, async () => {
        const errors = attachConsole(page), cases = [];
        const check = (condition, message) => { if (!condition) throw new helpers.SmokeError(message); };
        for (const width of [1440, 768, 390, 320]) for (const theme of ['light', 'dark']) {
          await page.setViewportSize({ width, height: 900 });
          await gotoTheme(page, `${config.url}/`, theme);
          await page.locator('.landing-finder').waitFor();
          const accountAction = signedIn ? page.locator('.privacy-band a[href="/dashboard"]') : page.locator('.privacy-band button');
          await accountAction.waitFor({ state: 'visible' });
          check((await accountAction.innerText()).includes(signedIn ? 'Open dashboard' : 'Create account'), 'Wrong account availability');
          const layout = await measureLayout(page);
          check(!layoutProblems(layout).length, `${name}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
          check(await page.locator('.hero-example-card-primary strong').innerText() === '$965,931', 'Engine-backed fixture changed');
          const summary = page.locator('.hero-example-detail > summary');
          await summary.focus(); await page.keyboard.press('Enter');
          check(await page.locator('.hero-example-detail').evaluate(node => node.open), 'Example keyboard disclosure failed');
          await page.locator('#home-question').fill('PPF'); await page.locator('#home-question').press('Enter');
          await page.waitForURL('**/calculators?q=PPF');
          await page.locator('a[href="/calculators/ppf"]').first().waitFor({ state: 'visible' });
          check(await page.locator('input[type="search"]').inputValue() === 'PPF', 'Question not applied by library');
          await page.waitForFunction(() => document.activeElement?.tagName === 'H1');
          cases.push({ width, theme, signedIn, layout, accountAction: true, disclosure: true, search: true, routeFocus: true });
        }
        check(!errors.length, `Homepage errors: ${JSON.stringify(errors)}`);
        return { cases, errors };
      });
    }
  }
};
