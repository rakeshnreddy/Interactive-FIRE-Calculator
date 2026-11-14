// B72 / C34 boundary and cross-field validation scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const ROUTES = [
  '/calculators/loan-comparison',
  '/calculators/fha-vs-conventional',
  '/calculators/rent-vs-buy',
  '/calculators/apr',
  '/calculators/arm-mortgage',
  '/calculators/balloon-loan',
  '/calculators/cagr',
  '/calculators/xirr',
  '/calculators/rule-of-72',
  '/calculators/ppf',
  '/calculators/rmd',
  '/calculators/paycheck',
  '/calculators/retirement'
];

export default {
  name: 'c34-boundary-validation',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'boundary-validation-routes'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    await stage('boundary-validation-routes', async () => {
      const page = anonymous.page;
      const signedPage = tenants[0].page;
      const errors = attachConsole(page);
      const signedErrors = attachConsole(signedPage);
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
            cases.push({ route, width, theme, primaryText, problems: layoutProblems(layout) });
          }
        }
      }

      const assertInvalidBoundary = async ({
        targetPage = page,
        route,
        fills,
        invalidField,
        expectedError
      }) => {
        await targetPage.setViewportSize({ width: 1440, height: 900 });
        await gotoTheme(targetPage, `${config.url}${route}`, 'light');
        await targetPage.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
        for (const [name, value] of fills) {
          await targetPage.locator(`input[name="${name}"]`).fill(value);
        }
        const field = targetPage.locator(`input[name="${invalidField}"]`);
        await targetPage.waitForFunction(
          (name) => document.querySelector(`input[name="${name}"]`)?.getAttribute('aria-invalid') === 'true',
          invalidField
        );
        check((await field.getAttribute('aria-invalid')) === 'true', `${route}: ${invalidField} missing aria-invalid="true"`);
        const stalePanel = targetPage.locator('.calculator-result-panel [data-result-state="stale"]').first();
        await stalePanel.waitFor({ state: 'visible' });
        const errorText = await targetPage.locator('.calculator-field-error').allInnerTexts();
        check(
          errorText.some((line) => line.includes(expectedError)),
          `${route}: expected "${expectedError}", got ${JSON.stringify(errorText)}`
        );
        const actionButton = targetPage.locator('.calculator-conversion-panel button').first();
        check(await actionButton.isDisabled(), `${route}: conversion action button should be disabled while invalid`);
      };

      // 1. Sub-1-year terms remain valid and current on loan-comparison
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoTheme(page, `${config.url}/calculators/loan-comparison`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      await page.locator('input[name="years"]').fill('0.5');
      await page.locator('input[name="compareYears"]').fill('0.5');
      await page.locator('.calculator-result-panel [data-result-state="current"]').first().waitFor({ state: 'visible' });
      check((await page.locator('.calculator-field-error').count()) === 0, '/calculators/loan-comparison: unexpected error for 0.5y term');
      const subYearPrimary = await page.locator('.calculator-result-metric-primary strong').first().innerText();
      check(subYearPrimary.length > 0 && !/NaN|Infinity/i.test(subYearPrimary), `/calculators/loan-comparison invalid 0.5y metric: ${subYearPrimary}`);

      // 2. Financed loan cross-field check (anonymous + signed-in Save result disabled)
      await assertInvalidBoundary({
        route: '/calculators/fha-vs-conventional',
        fills: [['downPayment', '350000']],
        invalidField: 'downPayment',
        expectedError: 'Down payment must be less than the home price.'
      });
      await assertInvalidBoundary({
        targetPage: signedPage,
        route: '/calculators/fha-vs-conventional',
        fills: [['downPayment', '350000']],
        invalidField: 'downPayment',
        expectedError: 'Down payment must be less than the home price.'
      });
      check(
        await signedPage.getByRole('button', { name: 'Save result' }).isDisabled(),
        '/calculators/fha-vs-conventional: signed-in Save result button should be disabled while invalid'
      );

      // 3-8. APR, ARM, Balloon, CAGR, XIRR, Rule of 72
      await assertInvalidBoundary({
        route: '/calculators/apr',
        fills: [['closingCosts', '300000']],
        invalidField: 'closingCosts',
        expectedError: 'Finance charges must be less than the loan amount.'
      });
      await assertInvalidBoundary({
        route: '/calculators/arm-mortgage',
        fills: [['fixedYears', '30']],
        invalidField: 'fixedYears',
        expectedError: 'Fixed period must be shorter than the loan term.'
      });
      await assertInvalidBoundary({
        route: '/calculators/balloon-loan',
        fills: [['balloonYears', '31']],
        invalidField: 'balloonYears',
        expectedError: 'Balloon due year cannot exceed the amortization term.'
      });
      await assertInvalidBoundary({
        route: '/calculators/cagr',
        fills: [['initial', '0']],
        invalidField: 'initial',
        expectedError: 'Enter a number greater than 0.'
      });
      await assertInvalidBoundary({
        route: '/calculators/xirr',
        fills: [
          ['initial', '0'],
          ['monthly', '0']
        ],
        invalidField: 'initial',
        expectedError: 'Enter a starting investment or a monthly contribution greater than 0.'
      });
      await assertInvalidBoundary({
        route: '/calculators/rule-of-72',
        fills: [['rate', '0']],
        invalidField: 'rate',
        expectedError: 'Enter a number greater than 0.'
      });

      // 9. PPF annual minimum and whole-year tenure
      await assertInvalidBoundary({
        route: '/calculators/ppf',
        fills: [['annual', '400']],
        invalidField: 'annual',
        expectedError: 'Use 500 or more.'
      });
      await page.locator('input[name="annual"]').fill('100000');
      await page.locator('input[name="years"]').fill('15.5');
      await page.waitForFunction(
        () => document.querySelector('input[name="years"]')?.getAttribute('aria-invalid') === 'true'
      );
      const ppfErrors = await page.locator('.calculator-field-error').allInnerTexts();
      check(
        ppfErrors.some((line) => line.includes('PPF runs in whole financial years. Enter a whole number, such as 15 or 20.')),
        `/calculators/ppf: expected whole-year error, got ${JSON.stringify(ppfErrors)}`
      );

      // 10-12. RMD divisor, Paycheck periods, Retirement age ordering
      await assertInvalidBoundary({
        route: '/calculators/rmd',
        fills: [['divisor', '0']],
        invalidField: 'divisor',
        expectedError: 'Use 1 or more.'
      });
      await assertInvalidBoundary({
        route: '/calculators/paycheck',
        fills: [['periods', '26.5']],
        invalidField: 'periods',
        expectedError: 'Enter a whole number of pay periods per year, such as 12, 24, 26, or 52.'
      });
      await assertInvalidBoundary({
        route: '/calculators/retirement',
        fills: [
          ['currentAge', '65'],
          ['retirementAge', '60']
        ],
        invalidField: 'retirementAge',
        expectedError: 'Enter a retirement age at or after your current age.'
      });

      check(!errors.length, `Boundary validation route errors: ${JSON.stringify(errors)}`);
      check(!signedErrors.length, `Boundary validation signed errors: ${JSON.stringify(signedErrors)}`);
      return { cases: cases.length, routes: ROUTES.length, interactiveChecks: 12, errors, signedErrors };
    });
  }
};
