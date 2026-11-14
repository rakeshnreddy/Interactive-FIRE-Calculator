// B75 / C37 charts, schedules, statutory provenance links & copy honesty scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const SWEEP_ROUTES = [
  '/calculators/income-tax-us',
  '/calculators/xirr',
  '/calculators/retirement',
  '/calculators/extra-mortgage-payment',
  '/calculators/compound-interest'
];

export default {
  name: 'c37-charts-schedules-copy',
  tenants: shell.tenants,
  requiredStages: [...shell.requiredStages, 'charts-schedules-copy-honesty'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();

    await stage('charts-schedules-copy-honesty', async () => {
      const page = anonymous.page;
      const signedPage = tenants[0].page;
      const errors = attachConsole(page);
      const signedErrors = attachConsole(signedPage);
      const cases = [];
      const check = (condition, message) => {
        if (!condition) throw new helpers.SmokeError(message);
      };

      for (const route of SWEEP_ROUTES) {
        const readySelector = route === '/calculators/compound-interest' ? 'main h1:visible' : '.calculator-result-panel';
        for (const width of [1440, 768, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            await page.locator(readySelector).first().waitFor({ state: 'visible' });
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            cases.push({ route, width, theme, problems: layoutProblems(layout) });
          }
        }
      }

      await page.setViewportSize({ width: 1440, height: 900 });

      await gotoTheme(page, `${config.url}/calculators/income-tax-us`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      const usTaxMain = await page.locator('main').innerText();
      check(!usTaxMain.includes('GST Calculator'), `Unexpected GST Calculator link on /calculators/income-tax-us: ${usTaxMain}`);

      await gotoTheme(page, `${config.url}/calculators/salary-india`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      check(
        (await page.locator('a[href="https://www.incometax.gov.in/"]').count()) >= 1,
        'Expected https://www.incometax.gov.in/ source link on /calculators/salary-india'
      );
      const salaryVisualText = await page.locator('.calculator-visual-panel').first().innerText();
      check(
        !salaryVisualText.includes('Estimated monthly take-home'),
        `Unexpected mixed-period metric inside salary-india waterfall chart: ${salaryVisualText}`
      );

      await gotoTheme(page, `${config.url}/calculators/xirr?returnMode=dated`, 'light');
      await page.getByRole('button', { name: 'Use example cash flows' }).waitFor({ state: 'visible' });
      await page.getByRole('button', { name: 'Use example cash flows' }).click();
      await page.waitForFunction(() => (document.querySelector('main')?.textContent ?? '').includes('Net entered cash flows'));
      const xirrMain = await page.locator('main').innerText();
      check(
        xirrMain.includes('Net entered cash flows') && xirrMain.includes('$100.00'),
        `Expected Net entered cash flows ($100.00) on /calculators/xirr?returnMode=dated, got: ${xirrMain}`
      );

      await gotoTheme(page, `${config.url}/calculators/retirement`, 'light');
      await page.locator('.calculator-visual-panel.visual-timeline').first().waitFor({ state: 'visible' });

      await gotoTheme(page, `${config.url}/calculators/rule-of-72`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      const rule72Main = await page.locator('main').innerText();
      check(
        rule72Main.includes('Exact compound years') && rule72Main.includes('Rule of 72 gap'),
        `Expected Exact compound years and Rule of 72 gap on /calculators/rule-of-72, got: ${rule72Main}`
      );
      check(!rule72Main.includes('debt schedule'), 'Unexpected "debt schedule" copy on /calculators/rule-of-72');

      await gotoTheme(page, `${config.url}/calculators/gratuity`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      check(
        (await page.locator('a[href="https://labour.gov.in/"]').count()) >= 1,
        'Expected https://labour.gov.in/ source link on /calculators/gratuity'
      );

      await gotoTheme(page, `${config.url}/calculators/extra-mortgage-payment`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      check(
        (await page.locator('.calculator-options-shell button, .calculator-options-shell summary', { hasText: 'Extra yearly payment' }).count()) >= 1,
        'Expected Extra yearly payment customization toggle on /calculators/extra-mortgage-payment'
      );
      const extraMain = await page.locator('main').innerText();
      check(
        extraMain.includes('extra monthly and yearly principal payments'),
        `Expected updated extra mortgage explanation copy, got: ${extraMain}`
      );

      await gotoTheme(page, `${config.url}/calculators/down-payment`, 'light');
      await page.locator('.calculator-visual-panel.visual-waterfall').first().waitFor({ state: 'visible' });
      const dpVisual = await page.locator('.calculator-visual-panel').first().innerText();
      check(
        dpVisual.includes('Home purchase funding breakdown') && dpVisual.includes('before closing costs') && !dpVisual.includes('estimated closing costs'),
        `Unexpected down-payment chart copy: ${dpVisual}`
      );

      await gotoTheme(page, `${config.url}/calculators/inflation`, 'light');
      await page.locator('.calculator-visual-panel.visual-timeline').first().waitFor({ state: 'visible' });
      const inflationVisual = await page.locator('.calculator-visual-panel').first().innerText();
      check(inflationVisual.includes('Purchasing power path'), `Expected Purchasing power path chart title, got: ${inflationVisual}`);

      await gotoTheme(page, `${config.url}/calculators/roth-vs-traditional-ira`, 'light');
      await page.locator('.calculator-visual-panel.visual-timeline').first().waitFor({ state: 'visible' });
      const rothVisual = await page.locator('.calculator-visual-panel').first().innerText();
      check(
        rothVisual.includes('After-tax retirement comparison') && !rothVisual.includes('Roth contribution after tax today'),
        `Unexpected Roth chart copy: ${rothVisual}`
      );

      await gotoTheme(page, `${config.url}/calculators/hra-exemption`, 'light');
      await page.locator('.calculator-visual-panel.visual-waterfall').first().waitFor({ state: 'visible' });
      const hraVisual = await page.locator('.calculator-visual-panel').first().innerText();
      check(hraVisual.includes('HRA exemption breakdown'), `Expected HRA exemption breakdown chart title, got: ${hraVisual}`);

      await gotoTheme(page, `${config.url}/calculators/gst`, 'light');
      await page.locator('.calculator-visual-panel.visual-waterfall').first().waitFor({ state: 'visible' });
      const gstVisual = await page.locator('.calculator-visual-panel').first().innerText();
      check(gstVisual.includes('GST tax breakdown'), `Expected GST tax breakdown chart title, got: ${gstVisual}`);

      await gotoTheme(page, `${config.url}/calculators/compound-interest`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      await page.locator('.compound-analysis-card summary').first().click();
      const compoundMain = await page.locator('main').innerText();
      check(
        compoundMain.includes('Lower rate') && compoundMain.includes('Higher rate'),
        `Expected Lower rate / Higher rate scenario labels on /calculators/compound-interest, got: ${compoundMain}`
      );

      await gotoTheme(page, `${config.url}/calculators/savings-goal`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      const savingsMain = await page.locator('main').innerText();
      check(
        savingsMain.includes('Current:') && savingsMain.includes('Required:'),
        `Expected Current: and Required: runway captions on /calculators/savings-goal, got: ${savingsMain}`
      );

      await gotoTheme(page, `${config.url}/calculators`, 'light');
      await page.locator('main h1').first().waitFor({ state: 'visible' });
      const hubMain = await page.locator('main').innerText();
      check(
        hubMain.includes('Estimate payoff time, total interest, and how extra monthly or yearly payments clear a debt faster.'),
        'Expected updated /calculators/debt-payoff card description on /calculators hub'
      );

      check(!errors.length, `C37 anonymous console/page errors: ${JSON.stringify(errors)}`);
      check(!signedErrors.length, `C37 signed-in console/page errors: ${JSON.stringify(signedErrors)}`);
      return { cases: cases.length, routes: SWEEP_ROUTES.length, interactiveChecks: 10, errors, signedErrors };
    });
  }
};
