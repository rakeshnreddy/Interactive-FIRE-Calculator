// B73 / C35 dedicated planner & saved-record integrity scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const ROUTES = [
  '/calculators/net-worth',
  '/calculators/budget',
  '/calculators/emergency-fund',
  '/calculators/life-insurance-needs',
  '/calculators/fire'
];

export default {
  name: 'c35-dedicated-planners',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'dedicated-planners-integrity'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    await stage('dedicated-planners-integrity', async () => {
      const page = anonymous.page;
      const signedPage = tenants[0].page;
      const errors = attachConsole(page);
      const signedErrors = attachConsole(signedPage);
      const cases = [];
      const check = (condition, message) => {
        if (!condition) throw new helpers.SmokeError(message);
      };

      // 1. Responsive light/dark layout sweep across dedicated planners and FIRE.
      for (const route of ROUTES) {
        const panelSelector = route === '/calculators/fire' ? '.results-panel' : '.calculator-result-panel';
        for (const width of [1440, 768, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            await page.locator(panelSelector).first().waitFor({ state: 'visible' });
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            cases.push({ route, width, theme, problems: layoutProblems(layout) });
          }
        }
      }

      // 2. CBS-04 & CBS-05: Life Insurance Needs metrics, category/related links, and overfunded branch.
      await page.setViewportSize({ width: 1440, height: 900 });
      await gotoTheme(page, `${config.url}/calculators/life-insurance-needs`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      const insurancePanelText = await page.locator('.calculator-result-panel').first().innerText();
      check(insurancePanelText.includes('$1,050,000'), `Expected $1,050,000 headline, got: ${insurancePanelText}`);
      for (const label of ['Income replacement need', 'Debts and final expenses', 'Existing savings / coverage']) {
        check(insurancePanelText.includes(label), `Missing supporting metric "${label}" on life-insurance-needs`);
      }
      const mainText = await page.locator('main').innerText();
      check(!mainText.includes('CAGR Calculator'), 'Unexpected CAGR Calculator recommendation on life-insurance-needs');
      await page.locator('input[name="savings"]').fill('1200000');
      await page.waitForFunction(
        () => document.querySelector('.calculator-result-metric-primary strong')?.textContent?.trim() === '$0'
      );
      const overfundedText = await page.locator('.calculator-result-panel').first().innerText();
      check(
        /exceed|already cover|fully cover/i.test(overfundedText),
        `Expected overfunded narrative when savings cover gross need, got: ${overfundedText}`
      );

      // 3. CBS-07: PlanningSelectField invalid state and de-DE locale forwarding on Net Worth breakdown.
      await gotoTheme(
        page,
        `${config.url}/calculators/emergency-fund?v=finpath-emergency-fund-v2&cashOnHand=3000&bankSavings=12000&shortTermDeposits=10000&monthlyEssentials=4500&targetMonths=6&incomeStability=invalid&householdEarners=9&locale=de-DE`,
        'light'
      );
      await page.locator('#planning-incomeStability').waitFor({ state: 'visible' });
      check(
        (await page.locator('#planning-incomeStability').getAttribute('aria-invalid')) === 'true',
        'Expected aria-invalid="true" on #planning-incomeStability'
      );
      check(
        (await page.locator('#planning-householdEarners').getAttribute('aria-invalid')) === 'true',
        'Expected aria-invalid="true" on #planning-householdEarners'
      );
      const selectErrorText = await page.locator('#planning-incomeStability-error').innerText();
      check(
        selectErrorText.includes('Choose an income pattern.'),
        `Expected #planning-incomeStability-error text, got: ${selectErrorText}`
      );

      await gotoTheme(page, `${config.url}/calculators/net-worth?v=finpath-net-worth-v2&locale=de-DE`, 'light');
      await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
      await page.locator('summary', { hasText: 'Balance-sheet audit' }).click();
      await page.locator('table', { hasText: 'Net worth balance-sheet reconciliation' }).waitFor({ state: 'visible' });
      const nwTableText = await page.locator('table', { hasText: 'Net worth balance-sheet reconciliation' }).innerText();
      check(/5,3/.test(nwTableText), `Expected German comma percent formatting (5,3) in breakdown table, got: ${nwTableText}`);

      // 4. CBS-01 & CBS-02: Signed-in Net Worth headline metric -> /accounts and Emergency Fund incomeStability persistence.
      await signedPage.setViewportSize({ width: 1440, height: 900 });
      await gotoTheme(signedPage, `${config.url}/calculators/net-worth`, 'light');
      await signedPage.waitForFunction(() => Boolean(window.Clerk?.user));
      await signedPage.getByRole('button', { name: 'Save snapshot & add accounts' }).click();
      await signedPage.waitForFunction(() =>
        (document.querySelector('.compound-history-list')?.textContent ?? '').includes('Estimated net worth')
      );
      const nwHistoryText = await signedPage.locator('.compound-history-list').innerText();
      check(
        nwHistoryText.includes('Estimated net worth') && nwHistoryText.includes('$175,000'),
        `Expected Estimated net worth $175,000 in Net Worth history, got: ${nwHistoryText}`
      );
      await gotoTheme(signedPage, `${config.url}/accounts`, 'light');
      await signedPage.locator('main').waitFor({ state: 'visible' });
      const accountsText = await signedPage.locator('main').innerText();
      check(/175,000/.test(accountsText), `Expected net worth $175,000 in /accounts, got: ${accountsText}`);

      await gotoTheme(signedPage, `${config.url}/calculators/emergency-fund`, 'light');
      await signedPage.locator('#planning-incomeStability').selectOption('uncertain');
      await signedPage.locator('#planning-householdEarners').selectOption('1');
      await signedPage.locator('#planning-dependents').fill('3');
      await signedPage.getByRole('button', { name: 'Create emergency-fund goal' }).click();
      await signedPage.waitForFunction(() =>
        document.querySelectorAll('.compound-history-list button').length > 0
      );
      await signedPage.locator('#planning-incomeStability').selectOption('stable');
      await signedPage.locator('.compound-history-list button').first().click();
      await signedPage.waitForFunction(
        () => document.querySelector('#planning-incomeStability')?.value === 'uncertain'
      );
      const efPanelText = await signedPage.locator('.calculator-result-panel').first().innerText();
      check(efPanelText.includes('9.5'), `Expected 9.5 months risk-based reference after reload, got: ${efPanelText}`);

      // 5. RINC-07: FIRE Withdrawal mode blank optional Need benchmark + portfolioMode.rows projection.
      await gotoTheme(page, `${config.url}/calculators/fire`, 'light');
      await page.locator('.segmented button', { hasText: /^Withdrawal$/ }).click();
      await page.locator('#fire-annual-expense').fill('');
      await page.locator('#fire-return').fill('7');
      await page.locator('#fire-inflation').fill('2.5');
      await page.getByRole('button', { name: 'Calculate', exact: true }).click();
      await page.waitForFunction(() => (document.querySelector('main')?.textContent ?? '').includes('No benchmark set'));
      check((await page.locator('.warning-critical').count()) === 0, 'Unexpected critical warning when optional Need benchmark is blank');
      await page.getByRole('tab', { name: /Results/i }).click();
      await page.getByRole('button', { name: 'Table', exact: true }).click();
      const withdrawalTable = page.locator('#results table');
      await withdrawalTable.waitFor({ state: 'visible' });
      const withdrawalTableLabel = await withdrawalTable.getAttribute('aria-label');
      check(
        Boolean(withdrawalTableLabel?.includes('Annual withdrawal projection')),
        `Expected "Annual withdrawal projection" table aria-label, got: ${withdrawalTableLabel}`
      );

      // 6. RINC-12: FIRE planWarnings Funding gap formatted in INR.
      await gotoTheme(page, `${config.url}/calculators/fire`, 'light');
      await page.getByRole('button', { name: /Indian rupee/i }).click();
      await page.locator('#fire-return').fill('7');
      await page.locator('#fire-inflation').fill('2.5');
      await page.getByRole('button', { name: 'Calculate', exact: true }).click();
      await page.locator('.health-panel').waitFor({ state: 'visible' });
      const healthText = await page.locator('.health-panel').innerText();
      check(healthText.includes('₹5,37,909'), `Expected ₹5,37,909 in .health-panel, got: ${healthText}`);
      check(!healthText.includes('$537,909'), `Unexpected $537,909 in INR mode: ${healthText}`);

      check(!errors.length, `Dedicated planners anonymous console/page errors: ${JSON.stringify(errors)}`);
      check(!signedErrors.length, `Dedicated planners signed-in console/page errors: ${JSON.stringify(signedErrors)}`);
      return { cases: cases.length, routes: ROUTES.length, interactiveChecks: 6, errors, signedErrors };
    });
  }
};
