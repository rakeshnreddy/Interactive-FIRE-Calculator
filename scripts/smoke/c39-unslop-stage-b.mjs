// B76 / C39 — Unslop Stage B hosted verification extending the C31 shell smoke scenario.
// Audits dedicated calculator routes and signed-in workspace routes across viewports and themes.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const DEDICATED_CALCULATOR_ROUTES = [
  '/calculators/fire',
  '/calculators/compound-interest',
  '/calculators/savings-goal',
  '/calculators/budget',
  '/calculators/net-worth',
  '/calculators/emergency-fund',
  '/calculators/xirr',
  '/calculators/xirr?returnMode=dated',
  '/calculators/lease-vs-buy'
];

const WORKSPACE_ROUTES = [
  '/dashboard',
  '/accounts',
  '/transactions',
  '/goals',
  '/plans',
  '/reports',
  '/settings'
];

const STAGE_B_AUDIT_SCRIPT = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  };
  const hasOwnText = (el) => [...el.childNodes].some((node) => node.nodeType === 3 && (node.textContent || '').trim().length > 0);
  const root = document.querySelector('main') || document.body;
  const typoNodes = [...root.querySelectorAll('h1, h2, h3, h4, strong, th, button, label, summary, legend, .eyebrow, .pill')].filter(visible);
  let maxWeight = 0;
  let maxWeightSelector = null;
  for (const el of typoNodes) {
    const w = parseFloat(getComputedStyle(el).fontWeight) || 0;
    if (w > maxWeight) {
      maxWeight = w;
      maxWeightSelector = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '');
    }
  }
  const allVisible = [...root.querySelectorAll('*')].filter(visible);
  const uppercaseNodes = [];
  const italicNodes = [];
  const blurNodes = [];
  const gradientNodes = [];
  const largeRadiusNodes = [];
  for (const el of allVisible) {
    const cs = getComputedStyle(el);
    if (cs.textTransform === 'uppercase' && (el.textContent || '').trim().length > 0) {
      uppercaseNodes.push(el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 32));
    }
    if (cs.fontStyle === 'italic' && hasOwnText(el)) {
      italicNodes.push(el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 32));
    }
    const bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    if (bf !== 'none' && bf !== '') {
      blurNodes.push(el.tagName.toLowerCase() + ':' + bf);
    }
    const bgImg = cs.backgroundImage || 'none';
    const strippedBg = bgImg.replace(/repeating-(?:linear|radial)-gradient\\(/gi, 'repeating-pattern(');
    if (strippedBg !== 'none' && (strippedBg.includes('linear-gradient(') || strippedBg.includes('radial-gradient('))) {
      gradientNodes.push(el.tagName.toLowerCase() + ':' + bgImg.slice(0, 48));
    }
    const isNativeChoice = el.tagName === 'INPUT' && (el.getAttribute('type') === 'radio' || el.getAttribute('type') === 'checkbox');
    if (!(el instanceof SVGElement) && !isNativeChoice) {
      const topLeftRadius = parseFloat(cs.borderTopLeftRadius) || 0;
      if (topLeftRadius > 12) {
        largeRadiusNodes.push(el.tagName.toLowerCase() + ':' + cs.borderTopLeftRadius);
      }
    }
  }
  const svgGradientCount = root.querySelectorAll('svg linearGradient, svg radialGradient').length;
  const metricSelectors = [
    '.metric strong',
    '.tracker-metric strong',
    '.calculator-result-card strong',
    '.hero-result strong',
    '.result-facts strong',
    '.result-facts dd',
    '.compound-result-panel strong',
    '.compound-headline strong',
    '.calculator-result-metric strong',
    '.dashboard-summary-grid strong',
    '.insight-summary-strip strong',
    '.insight-evidence-grid dd',
    '.insight-evidence-grid strong',
    '.report-scope-grid dd'
  ].join(', ');
  const nonTabularMetrics = [...root.querySelectorAll(metricSelectors)]
    .filter(visible)
    .filter((el) => !String(getComputedStyle(el).fontVariantNumeric || '').includes('tabular-nums'))
    .map((el) => el.tagName.toLowerCase() + ':' + (el.textContent || '').trim().slice(0, 24));
  const featureIcons = [...root.querySelectorAll('.feature-icon')].filter(visible);
  const badFeatureIcons = [];
  for (const icon of featureIcons) {
    const cs = getComputedStyle(icon);
    const bg = cs.backgroundColor;
    const isTransparent = bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent';
    const hasBorder = (parseFloat(cs.borderTopWidth) || 0) > 0 || (parseFloat(cs.borderLeftWidth) || 0) > 0;
    if (!isTransparent || hasBorder) {
      badFeatureIcons.push({ bg, border: cs.borderTopWidth });
    }
  }
  return {
    maxWeight,
    maxWeightSelector,
    uppercaseCount: uppercaseNodes.length,
    uppercaseSample: uppercaseNodes.slice(0, 3),
    italicCount: italicNodes.length,
    italicSample: italicNodes.slice(0, 3),
    blurCount: blurNodes.length,
    blurSample: blurNodes.slice(0, 3),
    gradientCount: gradientNodes.length,
    gradientSample: gradientNodes.slice(0, 3),
    svgGradientCount,
    largeRadiusCount: largeRadiusNodes.length,
    largeRadiusSample: largeRadiusNodes.slice(0, 3),
    nonTabularCount: nonTabularMetrics.length,
    nonTabularSample: nonTabularMetrics.slice(0, 3),
    badFeatureIcons
  };
})()`;

export default {
  name: 'c39-unslop-stage-b',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'unslop-dedicated-routes', 'unslop-workspace-routes'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const check = (condition, message) => {
      if (!condition) throw new helpers.SmokeError(message);
    };
    const assertAudit = (label, audit) => {
      check(audit.maxWeight <= 600, `${label} weight ${audit.maxWeight} (${audit.maxWeightSelector})`);
      check(audit.uppercaseCount === 0, `${label} uppercase: ${audit.uppercaseSample.join(', ')}`);
      check(audit.italicCount === 0, `${label} italic: ${audit.italicSample.join(', ')}`);
      check(audit.blurCount === 0, `${label} blur: ${audit.blurSample.join(', ')}`);
      check(audit.gradientCount === 0, `${label} gradient: ${audit.gradientSample.join(', ')}`);
      check(audit.svgGradientCount === 0, `${label} svg gradients: ${audit.svgGradientCount}`);
      check(audit.largeRadiusCount === 0, `${label} radius > 12px: ${audit.largeRadiusSample.join(', ')}`);
      check(audit.nonTabularCount === 0, `${label} missing tabular-nums: ${audit.nonTabularSample.join(', ')}`);
      check(audit.badFeatureIcons.length === 0, `${label} boxed feature-icon`);
    };

    const anonymous = await browser.newAnonymousPage();
    try {
      await stage('unslop-dedicated-routes', async () => {
        const errors = attachConsole(anonymous.page);
        const cases = [];
        for (const route of DEDICATED_CALCULATOR_ROUTES) {
          for (const width of [1440, 768, 390, 320]) {
            for (const theme of ['light', 'dark']) {
              await anonymous.page.setViewportSize({ width, height: 900 });
              await gotoTheme(anonymous.page, `${config.url}${route}`, theme);
              await anonymous.page.locator('main h1:visible').first().waitFor({ state: 'visible' });
              if (route === '/calculators/fire') {
                await anonymous.page.getByRole('button', { name: 'Use example values' }).click();
                await anonymous.page.getByRole('button', { name: /^(Calculate|Recalculate)$/ }).click();
                await anonymous.page.getByRole('tab', { name: 'Results' }).click();
                await anonymous.page.locator('.chart-frame svg.recharts-surface').first().waitFor({ state: 'visible', timeout: 15000 });
              }
              const layout = await measureLayout(anonymous.page);
              const problems = layoutProblems(layout);
              check(!problems.length, `${route}/${width}/${theme}: ${problems.join('; ')}`);
              check(layout.small.length === 0, `${route}/${width}/${theme} small targets: ${layout.small.join(', ')}`);
              const audit = await anonymous.page.evaluate(STAGE_B_AUDIT_SCRIPT);
              assertAudit(`${route}/${width}/${theme}`, audit);
              cases.push({ route, width, theme, controls: layout.controls, maxWeight: audit.maxWeight });
            }
          }
        }
        check(!errors.length, `Dedicated routes console/page errors: ${JSON.stringify(errors)}`);
        return { routes: DEDICATED_CALCULATOR_ROUTES.length, caseCount: cases.length, errors };
      });
    } finally {
      await anonymous.page.context().close().catch(() => {});
    }

    await stage('unslop-workspace-routes', async () => {
      const page = tenants[0].page;
      const errors = attachConsole(page);
      const cases = [];
      for (const route of WORKSPACE_ROUTES) {
        for (const width of [1440, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await page.setViewportSize({ width, height: 900 });
            await gotoTheme(page, `${config.url}${route}`, theme);
            await page.waitForFunction(
              () => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'),
              null,
              { timeout: 30000 }
            );
            check((await page.locator('.auth-gate-panel').count()) === 0, `${route}/${width}/${theme} rendered signed-out AuthGate`);
            await page.locator('main h1:visible').first().waitFor({ state: 'visible' });
            const h1Text = (await page.locator('main h1:visible').first().innerText()).trim();
            check(Boolean(h1Text) && !h1Text.endsWith('.'), `${route}/${width}/${theme} H1 trailing period: ${h1Text}`);
            const layout = await measureLayout(page);
            const problems = layoutProblems(layout);
            check(!problems.length, `${route}/${width}/${theme}: ${problems.join('; ')}`);
            check(layout.small.length === 0, `${route}/${width}/${theme} small targets: ${layout.small.join(', ')}`);
            if (route === '/plans') {
              const titleText = (await page.locator('#plans-title').innerText()).trim();
              check(titleText === 'Build a plan you can revisit', `Unexpected #plans-title copy: ${titleText}`);
            }
            const audit = await page.evaluate(STAGE_B_AUDIT_SCRIPT);
            assertAudit(`${route}/${width}/${theme}`, audit);
            cases.push({ route, width, theme, controls: layout.controls, maxWeight: audit.maxWeight });
          }
        }
      }
      check(!errors.length, `Workspace routes console/page errors: ${JSON.stringify(errors)}`);
      return { routes: WORKSPACE_ROUTES.length, caseCount: cases.length, errors };
    });
  }
};
