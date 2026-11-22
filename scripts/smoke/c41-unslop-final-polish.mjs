// B80 / C41 — Final /unslop sitewide polish, WCAG 2.2 AA contrast & performance verification.
// Extends c31-shell.mjs to audit every page family with exact OKLCH-resolved sRGB contrast,
// unstyled-link detection, full /unslop computed-style checklist, and Web Vitals snapshot.
import shell from './c31-shell.mjs';
import { gotoTheme, measureLayout, layoutProblems, attachConsole } from './_b31_helpers.mjs';

const AUDIT_ROUTES = [
  '/',
  '/calculators',
  '/calculators/mortgage',
  '/calculators/sip',
  '/calculators/retirement',
  '/calculators/income-tax-us',
  '/calculators/debt-payoff',
  '/calculators/cagr',
  '/calculators/life-insurance-needs',
  '/calculators/fire',
  '/calculators/compound-interest',
  '/calculators/savings-goal',
  '/calculators/emergency-fund',
  '/calculators/xirr?returnMode=dated',
  '/calculators/lease-vs-buy',
  '/dashboard'
];

const PERF_ROUTES = ['/', '/calculators', '/calculators/mortgage', '/calculators/fire'];

const SITEWIDE_AUDIT_SCRIPT = `(() => {
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) return false;
    const cs = getComputedStyle(el);
    return cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0;
  };
  const colorCanvas = document.createElement('canvas');
  colorCanvas.width = 1;
  colorCanvas.height = 1;
  const colorCtx = colorCanvas.getContext('2d', { willReadFrequently: true });
  const parseRgba = (str) => {
    if (!str || str === 'transparent' || str === 'rgba(0, 0, 0, 0)') return [0, 0, 0, 0];
    const m = String(str).match(/^rgba?\\(\\s*([\\d.]+)\\s*,\\s*([\\d.]+)\\s*,\\s*([\\d.]+)(?:\\s*,\\s*([\\d.]+))?\\s*\\)$/i);
    if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] === undefined ? 1 : Number(m[4])];
    colorCtx.clearRect(0, 0, 1, 1);
    colorCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    colorCtx.fillStyle = str;
    colorCtx.fillRect(0, 0, 1, 1);
    const d = colorCtx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const blend = (fg, bg) => {
    const a = fg[3];
    return [fg[0] * a + bg[0] * (1 - a), fg[1] * a + bg[1] * (1 - a), fg[2] * a + bg[2] * (1 - a), 1];
  };
  const effectiveBg = (el) => {
    const stack = [];
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const c = parseRgba(getComputedStyle(cur).backgroundColor);
      if (c && c[3] > 0) stack.push(c);
      if (c && c[3] >= 0.999) break;
      cur = cur.parentElement;
    }
    let out = [255, 255, 255, 1];
    for (let i = stack.length - 1; i >= 0; i--) out = blend(stack[i], out);
    return out;
  };
  const relLum = ([r, g, b]) => {
    const f = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const contrastRatio = (c1, c2) => {
    const l1 = relLum(c1);
    const l2 = relLum(c2);
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  };
  const hasOwnText = (el) => [...el.childNodes].some((n) => n.nodeType === 3 && (n.textContent || '').trim().length > 0);
  const isClerk = (el) => Boolean(el.closest('.account-user-button, .cl-rootBox, [data-clerk-component]') || String(el.className || '').split(/\\s+/).some((c) => c.startsWith('cl-')));
  const isVisuallyHidden = (el) => Boolean(el.closest('.visually-hidden, .sr-only'));
  const descOf = (el) => {
    const rawCls = el.getAttribute('class') || '';
    const cls = rawCls.trim() ? '.' + rawCls.trim().split(/\\s+/).slice(0, 2).join('.') : '';
    return el.tagName.toLowerCase() + cls;
  };

  const app = document.querySelector('.app') || document.body;
  const out = {
    offScaleWeights: [],
    uppercase: [],
    italic: [],
    blur: [],
    gradients: [],
    svgGradients: [...app.querySelectorAll('svg linearGradient, svg radialGradient')].filter((el) => !isClerk(el)).length,
    largeRadius: [],
    lowContrast: [],
    unstyledLinks: [],
    headingTrailingPeriods: [],
    badLucideStroke: [],
    minContrastRatio: 21
  };

  const uaLinkColors = new Set([
    'rgb(0, 0, 238)',
    'rgb(85, 26, 139)',
    'rgb(158, 158, 255)',
    'rgb(208, 173, 240)'
  ]);

  for (const el of app.querySelectorAll('*')) {
    if (!visible(el) || isClerk(el) || isVisuallyHidden(el)) continue;
    const cs = getComputedStyle(el);
    const text = (el.textContent || '').trim();

    if (el instanceof SVGElement) {
      if (el.tagName.toLowerCase() === 'svg' && String(el.getAttribute('class') || '').includes('lucide')) {
        if (el.getAttribute('stroke-width') !== '1.5') out.badLucideStroke.push(descOf(el));
      }
      continue;
    }

    if (el.tagName === 'A' && uaLinkColors.has(cs.color)) {
      out.unstyledLinks.push(descOf(el) + ':' + text.slice(0, 28));
    }

    if (hasOwnText(el)) {
      const ownText = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent || '').join('').trim();
      if (ownText) {
        if (cs.textTransform === 'uppercase') out.uppercase.push(descOf(el) + ':' + ownText.slice(0, 24));
        if (cs.fontStyle === 'italic') out.italic.push(descOf(el) + ':' + ownText.slice(0, 24));
        const w = parseFloat(cs.fontWeight) || 400;
        if (![400, 500, 600].includes(w)) out.offScaleWeights.push(descOf(el) + ':' + w);
        const fgRaw = parseRgba(cs.color);
        const bg = effectiveBg(el);
        const fg = fgRaw[3] < 1 ? blend(fgRaw, bg) : fgRaw;
        const ratio = contrastRatio(fg, bg);
        if (ratio < out.minContrastRatio) out.minContrastRatio = Number(ratio.toFixed(2));
        const fontSize = parseFloat(cs.fontSize) || 16;
        const minRatio = fontSize >= 24 ? 3.0 : 4.5;
        if (ratio < minRatio - 0.05) {
          out.lowContrast.push(descOf(el) + ':' + ownText.slice(0, 20) + '=' + ratio.toFixed(2));
        }
      }
    }

    if (/^H[1-4]$/.test(el.tagName) && text.endsWith('.') && !text.endsWith('...')) {
      out.headingTrailingPeriods.push(descOf(el) + ':' + text.slice(0, 40));
    }

    const bf = cs.backdropFilter || cs.webkitBackdropFilter || 'none';
    if (bf !== 'none' && bf !== '') out.blur.push(descOf(el) + ':' + bf);

    const bgImg = cs.backgroundImage || 'none';
    const stripped = bgImg.replace(/repeating-(?:linear|radial)-gradient\\(/gi, 'repeating-pattern(');
    if (stripped !== 'none' && (stripped.includes('linear-gradient(') || stripped.includes('radial-gradient('))) {
      out.gradients.push(descOf(el));
    }

    const isNativeChoice = el.tagName === 'INPUT' && (el.getAttribute('type') === 'radio' || el.getAttribute('type') === 'checkbox');
    if (!isNativeChoice) {
      const maxR = Math.max(
        parseFloat(cs.borderTopLeftRadius) || 0,
        parseFloat(cs.borderTopRightRadius) || 0,
        parseFloat(cs.borderBottomRightRadius) || 0,
        parseFloat(cs.borderBottomLeftRadius) || 0
      );
      if (maxR > 12) out.largeRadius.push(descOf(el) + ':' + maxR + 'px');
    }
  }
  return out;
})()`;

export default {
  name: 'c41-unslop-final-polish',
  tenants: 1,
  requiredStages: [...shell.requiredStages, 'sitewide-contrast-unslop', 'web-vitals-snapshot'],
  async run(context) {
    await shell.run(context);
    const { config, tenants, stage, browser, helpers } = context;
    const check = (condition, message) => {
      if (!condition) throw new helpers.SmokeError(message);
    };
    const assertAudit = (label, a) => {
      check(a.offScaleWeights.length === 0, `${label} off-scale weights: ${a.offScaleWeights.slice(0, 4).join(', ')}`);
      check(a.uppercase.length === 0, `${label} uppercase: ${a.uppercase.slice(0, 4).join(', ')}`);
      check(a.italic.length === 0, `${label} italic: ${a.italic.slice(0, 4).join(', ')}`);
      check(a.blur.length === 0, `${label} blur: ${a.blur.slice(0, 4).join(', ')}`);
      check(a.gradients.length === 0, `${label} gradients: ${a.gradients.slice(0, 4).join(', ')}`);
      check(a.svgGradients === 0, `${label} svg gradients: ${a.svgGradients}`);
      check(a.largeRadius.length === 0, `${label} radius > 12px: ${a.largeRadius.slice(0, 4).join(', ')}`);
      check(a.lowContrast.length === 0, `${label} WCAG contrast < AA: ${a.lowContrast.slice(0, 4).join(', ')}`);
      check(a.unstyledLinks.length === 0, `${label} unstyled UA links: ${a.unstyledLinks.slice(0, 4).join(', ')}`);
      check(a.headingTrailingPeriods.length === 0, `${label} heading trailing period: ${a.headingTrailingPeriods.slice(0, 4).join(', ')}`);
      check(a.badLucideStroke.length === 0, `${label} non-1.5 Lucide stroke: ${a.badLucideStroke.slice(0, 4).join(', ')}`);
    };

    const anonymous = await browser.newAnonymousPage();
    const anonErrors = attachConsole(anonymous.page);
    try {
      await stage('sitewide-contrast-unslop', async () => {
        const startErr = anonErrors.length;
        const cases = [];
        let globalMinContrast = 21;
        for (const route of AUDIT_ROUTES) {
          for (const width of [1440, 320]) {
            for (const theme of ['light', 'dark']) {
              await anonymous.page.setViewportSize({ width, height: 900 });
              await gotoTheme(anonymous.page, `${config.url}${route}`, theme);
              await anonymous.page.locator('footer.site-footer').waitFor({ state: 'visible' });
              if (route === '/calculators/compound-interest' || route === '/calculators/savings-goal') {
                await anonymous.page.evaluate(() => {
                  for (const d of document.querySelectorAll('details.compound-analysis-card')) {
                    d.open = true;
                  }
                });
              }
              const layout = await measureLayout(anonymous.page);
              const problems = layoutProblems(layout);
              check(!problems.length, `${route}/${width}/${theme}: ${problems.join('; ')}`);
              const audit = await anonymous.page.evaluate(SITEWIDE_AUDIT_SCRIPT);
              assertAudit(`${route}/${width}/${theme}`, audit);
              if (audit.minContrastRatio < globalMinContrast) globalMinContrast = audit.minContrastRatio;
              cases.push({ route, width, theme, minContrastRatio: audit.minContrastRatio });
              if ((route === '/calculators/mortgage' || route === '/calculators/sip') && width === 1440) {
                const studioFold = await anonymous.page.evaluate(() => {
                  const inp = document.querySelector('.calculator-input-panel')?.getBoundingClientRect();
                  const res = document.querySelector('.calculator-result-panel')?.getBoundingClientRect();
                  const viewBtn = document.querySelector('.calculator-result-action button')?.getBoundingClientRect();
                  const vis = document.querySelector('.calculator-visual-panel')?.getBoundingClientRect();
                  const chart = document.querySelector('.calculator-studio-chart')?.getBoundingClientRect();
                  const innerInputBorders = [...document.querySelectorAll('.calculator-input-control input')].filter(
                    (el) => parseFloat(getComputedStyle(el).borderTopWidth || '0') > 0
                  ).length;
                  return {
                    sideBySide: Boolean(inp && res && res.left >= inp.right - 4),
                    innerInputBorders,
                    viewResultBottom: viewBtn ? Math.round(viewBtn.bottom) : 9999,
                    visualTop: vis ? Math.round(vis.top) : 9999,
                    chartBottom: chart ? Math.round(chart.bottom) : 9999
                  };
                });
                check(studioFold.sideBySide, `${route}/1440/${theme} expected Option A side-by-side studio workbench: ${JSON.stringify(studioFold)}`);
                check(studioFold.innerInputBorders === 0, `${route}/1440/${theme} expected single-border .calculator-input-control inputs: ${JSON.stringify(studioFold)}`);
                check(
                  studioFold.viewResultBottom <= 900 && studioFold.visualTop < 900 && studioFold.chartBottom <= 900,
                  `${route}/1440/${theme} expected studio action button and visual chart above 900px fold: ${JSON.stringify(studioFold)}`
                );
              }
              if (route === '/calculators/fire') {
                await anonymous.page.locator('button', { hasText: /Use example values/i }).first().click();
                await anonymous.page.locator('button', { hasText: /^Calculate$/i }).first().click();
                await anonymous.page.locator('#results.chart-panel').waitFor({ state: 'visible', timeout: 10000 });
                const calcLayout = await measureLayout(anonymous.page);
                const calcProblems = layoutProblems(calcLayout);
                check(!calcProblems.length, `${route}#calculated/${width}/${theme}: ${calcProblems.join('; ')}`);
                if (width === 1440) {
                  const fold = await anonymous.page.evaluate(() => {
                    const inp = document.querySelector('.fire-workbench-inputs')?.getBoundingClientRect();
                    const out = document.querySelector('.fire-workbench-outputs')?.getBoundingClientRect();
                    const hero = document.querySelector('.fire-workbench-outputs .hero-result')?.getBoundingClientRect();
                    const chart = document.querySelector('#results.chart-panel')?.getBoundingClientRect();
                    return {
                      sideBySide: Boolean(inp && out && out.left >= inp.right - 4),
                      inputsBottom: inp ? Math.round(inp.bottom) : 9999,
                      heroBottom: hero ? Math.round(hero.bottom) : 9999,
                      chartBottom: chart ? Math.round(chart.bottom) : 9999
                    };
                  });
                  check(fold.sideBySide, `/calculators/fire#calculated/1440/${theme} expected side-by-side split workbench: ${JSON.stringify(fold)}`);
                  check(fold.inputsBottom <= 900 && fold.heroBottom <= 900 && fold.chartBottom <= 900, `/calculators/fire#calculated/1440/${theme} expected inputs, hero result & chart above 900px fold: ${JSON.stringify(fold)}`);
                }
                const calcAudit = await anonymous.page.evaluate(SITEWIDE_AUDIT_SCRIPT);
                assertAudit(`${route}#calculated/${width}/${theme}`, calcAudit);
                if (calcAudit.minContrastRatio < globalMinContrast) globalMinContrast = calcAudit.minContrastRatio;
                cases.push({ route: `${route}#calculated`, width, theme, minContrastRatio: calcAudit.minContrastRatio });

                // Expand #fire-optional-refinements, add rows to all 4 repeatable sections, and verify zero row overflow or child overlap
                await anonymous.page.locator('#fire-optional-refinements > summary').click();
                for (const sectionId of ['period-title', 'events-title', 'income-title', 'phase-title']) {
                  await anonymous.page.locator(`section[aria-labelledby="${sectionId}"] button`, { hasText: /^Add$/i }).click();
                }
                const refCheck = await anonymous.page.evaluate(() => {
                  const pageOverflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
                  const rows = Array.from(document.querySelectorAll('#fire-optional-refinements .repeat-row'));
                  let maxRowOverflow = 0;
                  let anyChildOverlap = false;
                  for (const r of rows) {
                    const ov = r.scrollWidth - r.clientWidth;
                    if (ov > maxRowOverflow) maxRowOverflow = ov;
                    const rects = Array.from(r.children).map((c) => c.getBoundingClientRect());
                    for (let i = 0; i < rects.length; i++) {
                      for (let j = i + 1; j < rects.length; j++) {
                        const a = rects[i];
                        const b = rects[j];
                        const xOv = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
                        const yOv = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
                        if (xOv > 1 && yOv > 1) anyChildOverlap = true;
                      }
                    }
                  }
                  return { rowCount: rows.length, pageOverflow, maxRowOverflow, anyChildOverlap };
                });
                check(refCheck.rowCount >= 5 && refCheck.pageOverflow === 0 && refCheck.maxRowOverflow === 0 && !refCheck.anyChildOverlap, `${route}#refinements/${width}/${theme} row overflow or child overlap: ${JSON.stringify(refCheck)}`);
                const refAudit = await anonymous.page.evaluate(SITEWIDE_AUDIT_SCRIPT);
                assertAudit(`${route}#refinements/${width}/${theme}`, refAudit);
                if (refAudit.minContrastRatio < globalMinContrast) globalMinContrast = refAudit.minContrastRatio;
                cases.push({ route: `${route}#refinements`, width, theme, minContrastRatio: refAudit.minContrastRatio });
              }
            }
          }
        }
        // Also verify signed-in /dashboard light/dark at 1440
        const signedPage = tenants[0].page;
        for (const theme of ['light', 'dark']) {
          await signedPage.setViewportSize({ width: 1440, height: 900 });
          await gotoTheme(signedPage, `${config.url}/dashboard`, theme);
          await signedPage.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'));
          const audit = await signedPage.evaluate(SITEWIDE_AUDIT_SCRIPT);
          assertAudit(`signed/dashboard/1440/${theme}`, audit);
          if (audit.minContrastRatio < globalMinContrast) globalMinContrast = audit.minContrastRatio;
          cases.push({ route: '/dashboard (signed-in)', width: 1440, theme, minContrastRatio: audit.minContrastRatio });
        }
        const stageErrors = anonErrors.slice(startErr);
        check(!stageErrors.length, `Sitewide console/page errors: ${JSON.stringify(stageErrors)}`);
        return { routeCount: AUDIT_ROUTES.length, caseCount: cases.length, globalMinContrast, errors: stageErrors };
      });

      await stage('web-vitals-snapshot', async () => {
        const snapshots = [];
        for (const route of PERF_ROUTES) {
          const fresh = await browser.newAnonymousPage();
          const perfPage = fresh.page;
          try {
            await perfPage.setViewportSize({ width: 1440, height: 900 });
            await perfPage.addInitScript(() => {
              window.__cls = 0;
              window.__lcp = 0;
              try {
                new PerformanceObserver((list) => {
                  for (const e of list.getEntries()) {
                    if (!e.hadRecentInput) window.__cls += e.value;
                  }
                }).observe({ type: 'layout-shift', buffered: true });
                new PerformanceObserver((list) => {
                  const entries = list.getEntries();
                  if (entries.length) window.__lcp = entries[entries.length - 1].startTime;
                }).observe({ type: 'largest-contentful-paint', buffered: true });
              } catch {}
            });
            await perfPage.goto(`${config.url}${route}`, { waitUntil: 'networkidle' });
            await perfPage.locator('main h1:visible').first().waitFor({ state: 'visible', timeout: 15000 });
            await perfPage.waitForTimeout(250);
            const metrics = await perfPage.evaluate(() => {
              const nav = performance.getEntriesByType('navigation')[0];
              const resources = performance.getEntriesByType('resource');
              let jsBytes = 0;
              let cssBytes = 0;
              for (const r of resources) {
                if (r.name.endsWith('.js')) jsBytes += r.transferSize || 0;
                if (r.name.endsWith('.css')) cssBytes += r.transferSize || 0;
              }
              return {
                dclMs: nav ? Math.round(nav.domContentLoadedEventEnd) : 0,
                lcpMs: Math.round(window.__lcp || 0),
                cls: Number((window.__cls || 0).toFixed(4)),
                jsTransferKB: Number((jsBytes / 1024).toFixed(1)),
                cssTransferKB: Number((cssBytes / 1024).toFixed(1))
              };
            });
            check(metrics.lcpMs > 0 && metrics.lcpMs <= 3000, `LCP out of bounds on ${route}: ${metrics.lcpMs}ms`);
            check(metrics.cls <= 0.1, `CLS regression on ${route}: ${metrics.cls}`);
            check(metrics.jsTransferKB > 0 && metrics.cssTransferKB > 0, `Cold-load asset transfer missing on ${route}: ${JSON.stringify(metrics)}`);
            snapshots.push({ route, ...metrics });
          } finally {
            await perfPage.context().close().catch(() => {});
          }
        }
        return { snapshots };
      });
    } finally {
      await anonymous.page.context().close().catch(() => {});
    }
  }
};
