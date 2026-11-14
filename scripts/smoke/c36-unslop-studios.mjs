// B74 / C36 unslop calculator library and shared studio template scenario extending the shared hosted runner.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const ROUTES = [
  '/calculators',
  '/calculators/mortgage',
  '/calculators/sip',
  '/calculators/retirement',
  '/calculators/income-tax-india',
  '/calculators/debt-payoff',
  '/calculators/roi',
  '/calculators/ppf'
];

const SEARCH_ROUTES = ['/calculators?q=FIRE', '/calculators?q=zzzznotfound'];

async function openDisclosures(page, selectors) {
  for (const selector of selectors) {
    const items = await page.locator(`${selector}:not([open])`).all();
    for (const details of items) {
      if (await details.isVisible()) {
        await details.locator(':scope > summary').click();
      }
    }
  }
}

export default {
  name: 'c36-unslop-studios',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'unslop-studios-routes'],
  async run(context) {
    await shell.run(context);
    const { config, stage, browser, helpers } = context;
    const anonymous = await browser.newAnonymousPage();
    await stage('unslop-studios-routes', async () => {
      const page = anonymous.page;
      const errors = attachConsole(page);
      const cases = [];
      const check = (condition, message) => {
        if (!condition) throw new helpers.SmokeError(message);
      };

      const checkStyleInvariants = async (currentRoute) => page.evaluate((route) => {
        const appEl = document.querySelector('.app');
        const beforeBg = appEl ? getComputedStyle(appEl, '::before').backgroundImage : 'none';
        const weightViolations = [];
        for (const el of document.querySelectorAll('.calculator-library *')) {
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) continue;
          const weight = Number(getComputedStyle(el).fontWeight) || 400;
          if (weight > 600) {
            weightViolations.push(`${el.tagName.toLowerCase()}.${String(el.className || '').split(' ')[0]}=${weight}`);
          }
        }
        const iconBoxes = [...document.querySelectorAll('.calculator-library .feature-icon, .calculator-library .calculator-toolkit-icon')]
          .filter((el) => el.getBoundingClientRect().width > 0)
          .map((el) => {
            const cs = getComputedStyle(el);
            return { bg: cs.backgroundColor, border: cs.borderTopWidth };
          });

        if (route === '/calculators') {
          const toolkit = document.querySelector('.calculator-toolkit');
          const tag = document.querySelector('.calculator-featured-tag');
          const regionBtn = document.querySelector('.calculator-region-filter button');
          return {
            beforeBg,
            weightViolations: weightViolations.slice(0, 8),
            iconBoxes,
            backdropFilter: toolkit ? getComputedStyle(toolkit).backdropFilter : 'none',
            tagTransform: tag ? getComputedStyle(tag).textTransform : 'none',
            regionRadius: regionBtn ? getComputedStyle(regionBtn).borderTopLeftRadius : '6px'
          };
        }

        if (route.startsWith('/calculators?')) {
          const cardFire = document.querySelector('.calculator-card-fire');
          const cardAny = document.querySelector('.calculator-card');
          const emptyState = document.querySelector('.calculator-empty-state');
          const emptyIcon = emptyState?.querySelector('svg');
          return {
            beforeBg,
            weightViolations: weightViolations.slice(0, 8),
            iconBoxes,
            cardBackdrop: cardAny ? getComputedStyle(cardAny).backdropFilter : 'none',
            fireBorderTop: cardFire ? getComputedStyle(cardFire).borderTopWidth : '1px',
            emptyIconMatchesMuted: emptyState && emptyIcon
              ? getComputedStyle(emptyIcon).color === getComputedStyle(emptyState).color
              : true
          };
        }

        const inputPanel = document.querySelector('.calculator-input-panel');
        const resultPanel = document.querySelector('.calculator-result-panel');
        const primaryMetric = document.querySelector('.calculator-result-metric-primary strong');
        const primaryBtn = document.querySelector('.calculator-library .primary-button');
        const primaryBtnStyle = primaryBtn ? getComputedStyle(primaryBtn) : null;
        return {
          beforeBg,
          weightViolations: weightViolations.slice(0, 8),
          iconBoxes,
          inputBackdrop: inputPanel ? getComputedStyle(inputPanel).backdropFilter : 'none',
          resultBackdrop: resultPanel ? getComputedStyle(resultPanel).backdropFilter : 'none',
          inputBorderTop: inputPanel ? getComputedStyle(inputPanel).borderTopWidth : '1px',
          resultBorderTop: resultPanel ? getComputedStyle(resultPanel).borderTopWidth : '1px',
          tabular: primaryMetric ? getComputedStyle(primaryMetric).fontVariantNumeric : '',
          primaryBtnBgImg: primaryBtnStyle ? primaryBtnStyle.backgroundImage : 'none',
          primaryBtnRadius: primaryBtnStyle ? primaryBtnStyle.borderTopLeftRadius : '6px'
        };
      }, currentRoute);

      for (const route of ROUTES) {
        for (const width of [1440, 768, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            if (route === '/calculators') {
              await page.locator('.calculator-toolkit').first().waitFor({ state: 'visible' });
              await openDisclosures(page, ['details.calculator-toolkit-more']);
            } else {
              await page.locator('.calculator-result-panel').first().waitFor({ state: 'visible' });
              await openDisclosures(page, [
                'details.calculator-options-shell',
                'details.calculator-breakdown-shell',
                'details.calculator-engagement-shell',
                'details.calculator-chart-table-details'
              ]);
            }
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            check(layout.small.length === 0, `${route}/${width}/${theme} small interactive targets (<24px): ${layout.small.join(', ')}`);
            const styleChecks = await checkStyleInvariants(route);
            check(styleChecks.beforeBg === 'none', `Decorative atmosphere blob active on ${route}/${width}/${theme}: ${styleChecks.beforeBg}`);
            check(styleChecks.weightViolations.length === 0, `Font weight > 600 on ${route}/${width}/${theme}: ${styleChecks.weightViolations.join(', ')}`);
            check(
              styleChecks.iconBoxes.every((b) => b.bg === 'rgba(0, 0, 0, 0)' && b.border === '0px'),
              `Tinted/bordered icon badge box found on ${route}/${width}/${theme}: ${JSON.stringify(styleChecks.iconBoxes)}`
            );
            if (route === '/calculators') {
              check(styleChecks.backdropFilter === 'none', `Glass blur active on /calculators toolkit (${width}/${theme}): ${styleChecks.backdropFilter}`);
              check(styleChecks.tagTransform === 'none', `Uppercase featured tag on /calculators (${width}/${theme}): ${styleChecks.tagTransform}`);
              check(styleChecks.regionRadius !== '999px', `Pill radius still active on region filter (${width}/${theme}): ${styleChecks.regionRadius}`);
            } else {
              check(styleChecks.inputBackdrop === 'none' && styleChecks.resultBackdrop === 'none', `Glass blur active on ${route} (${width}/${theme})`);
              check(styleChecks.inputBorderTop === '1px' && styleChecks.resultBorderTop === '1px', `3px top border stripe active on ${route} (${width}/${theme}): ${JSON.stringify(styleChecks)}`);
              check(styleChecks.tabular.includes('tabular-nums'), `Missing tabular-nums on ${route} (${width}/${theme}): ${styleChecks.tabular}`);
              check(styleChecks.primaryBtnBgImg === 'none' && styleChecks.primaryBtnRadius !== '999px', `Primary button gradient/pill slop on ${route} (${width}/${theme})`);
            }
            cases.push({ route, width, theme, styleChecks, problems: layoutProblems(layout), smallCount: layout.small.length });
          }
        }
      }

      for (const route of SEARCH_ROUTES) {
        for (const width of [1440, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            if (route.includes('zzzznotfound')) {
              await page.locator('.calculator-empty-state').waitFor({ state: 'visible' });
            } else {
              await page.locator('.calculator-card-fire').waitFor({ state: 'visible' });
            }
            const layout = await measureLayout(page);
            check(!layoutProblems(layout).length, `${route}/${width}/${theme}: ${layoutProblems(layout).join('; ')}`);
            check(layout.small.length === 0, `${route}/${width}/${theme} small targets: ${layout.small.join(', ')}`);
            const styleChecks = await checkStyleInvariants(route);
            check(styleChecks.weightViolations.length === 0, `Font weight > 600 on ${route}/${width}/${theme}: ${styleChecks.weightViolations.join(', ')}`);
            check(styleChecks.cardBackdrop === 'none' && styleChecks.fireBorderTop === '1px', `Search card glass/border slop on ${route}/${width}/${theme}`);
            check(styleChecks.emptyIconMatchesMuted, `Empty state icon not muted on ${route}/${width}/${theme}`);
            cases.push({ route, width, theme, styleChecks, problems: layoutProblems(layout), smallCount: layout.small.length });
          }
        }
      }

      check(!errors.length, `Unslop studios route errors: ${JSON.stringify(errors)}`);
      return { cases: cases.length, routes: ROUTES.length + SEARCH_ROUTES.length, errors };
    });
  }
};
