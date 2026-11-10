// B71 debt and loan reconciliation scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const ROUTES = [
  '/calculators/debt-payoff',
  '/calculators/balance-transfer',
  '/calculators/debt-snowball-avalanche',
  '/calculators/mortgage-recast',
  '/calculators/balloon-loan',
  '/calculators/pmi',
  '/calculators/fha-vs-conventional',
  '/calculators/rent-vs-buy'
];

export default {
  name: 'c32-debt-loans',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'debt-loan-routes'],
  async run(context) {
    await shell.run(context);
    const { config, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    await stage('debt-loan-routes', async () => {
      const page = anonymous.page;
      const errors = attachConsole(page);
      const cases = [];
      const check = (condition, message) => {
        if (!condition) throw new helpers.SmokeError(message);
      };
      for (const route of ROUTES) {
        for (const width of [1440, 768, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            await page.locator('.calculator-result-panel').waitFor({ state: 'visible' });
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            const primaryText = await page.locator('.calculator-result-metric-primary strong').innerText();
            check(primaryText.length > 0 && !/NaN|Infinity/i.test(primaryText), `Invalid primary metric on ${route}: ${primaryText}`);
            cases.push({ route, width, theme, primaryText, problems: layoutProblems(layout) });
          }
        }
      }
      check(!errors.length, `Debt/loan route errors: ${JSON.stringify(errors)}`);
      return { cases: cases.length, routes: ROUTES.length, errors };
    });
  }
};
