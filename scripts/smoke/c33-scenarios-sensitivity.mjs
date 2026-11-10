// B69 word-bounded scenario perturbations and bidirectional sensitivity scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const ROUTES = [
  '/calculators/retirement',
  '/calculators/401k',
  '/calculators/sip-goal',
  '/calculators/inflation',
  '/calculators/income-tax-india',
  '/calculators/roth-vs-traditional-ira',
  '/calculators/xirr',
  '/calculators/roi',
  '/calculators/life-insurance-needs',
  '/calculators/ppf'
];

export default {
  name: 'c33-scenarios-sensitivity',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'scenarios-sensitivity-routes'],
  async run(context) {
    await shell.run(context);
    const { config, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    await stage('scenarios-sensitivity-routes', async () => {
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
            await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            const primaryText = await page.locator('.calculator-result-metric-primary strong').first().innerText();
            check(primaryText.length > 0 && !/NaN|Infinity/i.test(primaryText), `Invalid primary metric on ${route}: ${primaryText}`);
            const bodyText = await page.locator('main').innerText();
            check(!/\.00000\d/.test(bodyText), `Float tail artifact on ${route}: ${bodyText}`);
            check(!/does not change .* up to/i.test(bodyText), `One-sided capped no-effect driver on ${route}`);
            cases.push({ route, width, theme, primaryText, problems: layoutProblems(layout) });
          }
        }
      }
      check(!errors.length, `Scenarios/sensitivity route errors: ${JSON.stringify(errors)}`);
      return { cases: cases.length, routes: ROUTES.length, errors };
    });
  }
};
