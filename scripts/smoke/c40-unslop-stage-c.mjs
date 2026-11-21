// B79 / C40 — Unslop Stage C hosted verification extending the C31 shell smoke scenario.
// Audits homepage, topbar chrome, overlay menus, and footer across viewports and themes.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const SHELL_CHECK_ROUTES = ['/', '/calculators', '/calculators/mortgage'];

function buildAuditScript(selectors) {
  return `(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) return false;
      const cs = getComputedStyle(el);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    };
    const hasOwnText = (el) => [...el.childNodes].some((node) => node.nodeType === 3 && (node.textContent || '').trim().length > 0);
    const roots = ${JSON.stringify(selectors)}.flatMap((sel) => [...document.querySelectorAll(sel)]).filter(visible);
    const typoSet = new Set();
    const allSet = new Set();
    let svgGradientCount = 0;
    for (const root of roots) {
      allSet.add(root);
      const isClerkThirdParty = (el) => Boolean(el.closest('.account-user-button, .cl-rootBox, [data-clerk-component]') || String(el.className || '').split(/\s+/).some((cls) => cls.startsWith('cl-')));
      for (const el of root.querySelectorAll('*')) {
        if (visible(el) && !isClerkThirdParty(el)) allSet.add(el);
      }
      for (const el of root.querySelectorAll('h1, h2, h3, h4, strong, b, th, button, a, label, summary, .eyebrow')) {
        if (visible(el) && !isClerkThirdParty(el)) typoSet.add(el);
      }
      svgGradientCount += root.querySelectorAll('svg linearGradient, svg radialGradient').length;
    }
    let maxWeight = 0;
    let maxWeightSelector = null;
    const offScaleWeights = [];
    for (const el of typoSet) {
      const w = parseFloat(getComputedStyle(el).fontWeight) || 0;
      const desc = el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ':' + w;
      if (w > maxWeight) {
        maxWeight = w;
        maxWeightSelector = desc;
      }
      if (w > 0 && ![400, 500, 600].includes(w)) {
        offScaleWeights.push(desc);
      }
    }
    const uppercaseNodes = [];
    const italicNodes = [];
    const blurNodes = [];
    const gradientNodes = [];
    const largeRadiusNodes = [];
    for (const el of allSet) {
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
        const maxRadius = Math.max(
          parseFloat(cs.borderTopLeftRadius) || 0,
          parseFloat(cs.borderTopRightRadius) || 0,
          parseFloat(cs.borderBottomRightRadius) || 0,
          parseFloat(cs.borderBottomLeftRadius) || 0
        );
        if (maxRadius > 12) {
          largeRadiusNodes.push(el.tagName.toLowerCase() + ':' + maxRadius + 'px');
        }
      }
    }
    const topbar = document.querySelector('.topbar');
    const topbarCs = topbar ? getComputedStyle(topbar) : null;
    return {
      rootCount: roots.length,
      maxWeight,
      maxWeightSelector,
      offScaleWeights: offScaleWeights.slice(0, 5),
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
      topbarBoxShadow: topbarCs ? topbarCs.boxShadow : null,
      topbarBackdrop: topbarCs ? (topbarCs.backdropFilter || topbarCs.webkitBackdropFilter || 'none') : null
    };
  })()`;
}

const HOME_AUDIT_SCRIPT = buildAuditScript(['.app']);
const SHELL_AUDIT_SCRIPT = buildAuditScript(['.topbar', '.desktop-nav-dropdown', '.mobile-nav', '.site-footer']);

export default {
  name: 'c40-unslop-stage-c',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'unslop-homepage', 'unslop-shell-footer'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const check = (condition, message) => {
      if (!condition) throw new helpers.SmokeError(message);
    };
    const assertAudit = (label, audit) => {
      check(audit.rootCount > 0, `${label} matched no visible audit roots`);
      check(audit.maxWeight <= 600, `${label} weight ${audit.maxWeight} (${audit.maxWeightSelector})`);
      check(audit.offScaleWeights.length === 0, `${label} off-scale weights: ${audit.offScaleWeights.join(', ')}`);
      check(audit.uppercaseCount === 0, `${label} uppercase: ${audit.uppercaseSample.join(', ')}`);
      check(audit.italicCount === 0, `${label} italic: ${audit.italicSample.join(', ')}`);
      check(audit.blurCount === 0, `${label} blur: ${audit.blurSample.join(', ')}`);
      check(audit.gradientCount === 0, `${label} gradient: ${audit.gradientSample.join(', ')}`);
      check(audit.svgGradientCount === 0, `${label} svg gradients: ${audit.svgGradientCount}`);
      check(audit.largeRadiusCount === 0, `${label} radius > 12px: ${audit.largeRadiusSample.join(', ')}`);
      check(audit.topbarBoxShadow === 'none', `${label} topbar box-shadow: ${audit.topbarBoxShadow}`);
      check(audit.topbarBackdrop === 'none' || audit.topbarBackdrop === '', `${label} topbar backdrop-filter: ${audit.topbarBackdrop}`);
    };

    const anonymous = await browser.newAnonymousPage();
    const anonErrors = attachConsole(anonymous.page);
    try {
      await stage('unslop-homepage', async () => {
        const startErrCount = anonErrors.length;
        const cases = [];
        for (const width of [1440, 768, 390, 320]) {
          for (const theme of ['light', 'dark']) {
            await anonymous.page.setViewportSize({ width, height: 900 });
            await gotoTheme(anonymous.page, `${config.url}/`, theme);
            await anonymous.page.locator('.landing-finder').waitFor({ state: 'visible' });

            const layout = await measureLayout(anonymous.page);
            const problems = layoutProblems(layout);
            check(!problems.length, `home/${width}/${theme}: ${problems.join('; ')}`);
            check(layout.small.length === 0, `home/${width}/${theme} small targets: ${layout.small.join(', ')}`);

            const h1Text = (await anonymous.page.locator('#landing-title').innerText()).trim();
            check(h1Text === 'Clear answers to your money questions', `Unexpected H1: ${h1Text}`);
            check((await anonymous.page.locator('.landing-hero .primary-button').count()) === 1, `home/${width}/${theme} expected 1 primary hero CTA`);
            const searchLabel = (await anonymous.page.locator('.landing-finder button[type="submit"]').innerText()).trim();
            check(searchLabel === 'Search', `Unexpected finder submit label: ${searchLabel}`);
            check((await anonymous.page.locator('.hero-example-card-primary strong').innerText()).trim() === '$965,931', 'Hero FIRE fixture changed');

            // Expand hero example disclosure via keyboard and verify audit with expanded chart visible
            const summary = anonymous.page.locator('.hero-example-detail > summary');
            await summary.focus();
            await anonymous.page.keyboard.press('Enter');
            check(await anonymous.page.locator('.hero-example-detail').evaluate((node) => node.open), `home/${width}/${theme} keyboard disclosure failed`);
            const audit = await anonymous.page.evaluate(HOME_AUDIT_SCRIPT);
            assertAudit(`home/${width}/${theme}`, audit);

            // Verify finder search navigates and focuses H1
            await anonymous.page.locator('#home-question').fill('PPF');
            await anonymous.page.locator('.landing-finder button[type="submit"]').click();
            await anonymous.page.waitForURL('**/calculators?q=PPF');
            await anonymous.page.locator('a[href="/calculators/ppf"]').first().waitFor({ state: 'visible' });
            await anonymous.page.waitForFunction(() => document.activeElement?.tagName === 'H1');

            cases.push({ width, theme, maxWeight: audit.maxWeight, controls: layout.controls });
          }
        }
        const stageErrors = anonErrors.slice(startErrCount);
        check(!stageErrors.length, `Homepage console/page errors: ${JSON.stringify(stageErrors)}`);
        return { caseCount: cases.length, cases, errors: stageErrors };
      });

      await stage('unslop-shell-footer', async () => {
        const startErrCount = anonErrors.length;
        const cases = [];
        for (const route of SHELL_CHECK_ROUTES) {
          for (const width of [1440, 320]) {
            for (const theme of ['light', 'dark']) {
              await anonymous.page.setViewportSize({ width, height: 900 });
              await gotoTheme(anonymous.page, `${config.url}${route}`, theme);
              await anonymous.page.locator('footer.site-footer').waitFor({ state: 'visible' });
              const layout = await measureLayout(anonymous.page);
              const problems = layoutProblems(layout);
              check(!problems.length, `shell ${route}/${width}/${theme}: ${problems.join('; ')}`);
              check(layout.small.length === 0, `shell ${route}/${width}/${theme} small targets: ${layout.small.join(', ')}`);
              if (width === 320 && route === '/') {
                await anonymous.page.getByRole('button', { name: 'Open navigation', exact: true }).click();
                await anonymous.page.locator('.mobile-nav').waitFor({ state: 'visible' });
              }
              const audit = await anonymous.page.evaluate(SHELL_AUDIT_SCRIPT);
              assertAudit(`shell ${route}/${width}/${theme}`, audit);
              if (width === 320 && route === '/') {
                await anonymous.page.keyboard.press('Escape');
              }
              cases.push({ route, width, theme, maxWeight: audit.maxWeight });
            }
          }
        }
        // Also audit signed-in desktop workspace dropdown menu at 1440 light/dark
        const signedPage = tenants[0].page;
        for (const theme of ['light', 'dark']) {
          await signedPage.setViewportSize({ width: 1440, height: 900 });
          await gotoTheme(signedPage, `${config.url}/dashboard`, theme);
          await signedPage.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'));
          await signedPage.locator('.desktop-nav').getByRole('button', { name: 'Workspace', exact: true }).click();
          await signedPage.locator('.desktop-nav-dropdown').waitFor({ state: 'visible' });
          const audit = await signedPage.evaluate(SHELL_AUDIT_SCRIPT);
          assertAudit(`shell-signed-dropdown/1440/${theme}`, audit);
          await signedPage.keyboard.press('Escape');
          cases.push({ route: '/dashboard#dropdown', width: 1440, theme, maxWeight: audit.maxWeight });
        }
        const stageErrors = anonErrors.slice(startErrCount);
        check(!stageErrors.length, `Shell/footer console/page errors: ${JSON.stringify(stageErrors)}`);
        return { routes: SHELL_CHECK_ROUTES.length, caseCount: cases.length, errors: stageErrors };
      });
    } finally {
      await anonymous.page.context().close().catch(() => {});
    }
  }
};
