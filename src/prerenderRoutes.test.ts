// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildRouteMetadata } from './lib/routeMetadata';
import { seoCalculators } from './lib/seoCalculators';
// @ts-expect-error — plain ESM build script without type declarations
import { renderNotFoundHtml, renderRouteHtml, WORKSPACE_ROUTES } from '../scripts/prerender_routes.mjs';

const template = `<!doctype html><html><head>
<meta name="description" content="generic" />
<meta name="robots" content="index, follow" />
<link rel="canonical" href="https://interactive-fire-calculator.pages.dev/" />
<title>FinPath | FIRE Calculator and Financial Planning</title>
<link rel="modulepreload" crossorigin href="/assets/react.js">
</head><body><div id="root"></div><script type="module" crossorigin src="/assets/main.js"></script></body></html>`;

describe('prerendered route HTML (B38)', () => {
  it('writes route-specific title, description, canonical, robots, JSON-LD and heading', () => {
    const meta = buildRouteMetadata('/calculators/mortgage');
    const html = renderRouteHtml(template, meta, { heading: 'Mortgage Payment Calculator', body: meta.description });
    expect(html).toContain('<title>Mortgage Payment Calculator | FinPath</title>');
    expect(html).toContain('<link rel="canonical" href="https://interactive-fire-calculator.pages.dev/calculators/mortgage" />');
    expect(html).toContain('<meta name="robots" content="index, follow" />');
    expect(html).toContain('application/ld+json');
    expect(html).toContain('<h1>Mortgage Payment Calculator</h1>');
    expect(html).not.toContain('content="generic"');
    expect(html).toContain('/assets/main.js');
  });

  it('escapes text and keeps JSON-LD from closing the script tag', () => {
    const html = renderRouteHtml(template, { title: 'A <b> & "c"', description: 'd', robots: 'index, follow', canonicalUrl: 'https://x/', jsonLd: { name: '</script><script>alert(1)</script>' } }, { heading: '<i>', body: '' });
    expect(html).toContain('<title>A &lt;b&gt; &amp; &quot;c&quot;</title>');
    expect(html).not.toContain('</script><script>alert(1)');
    expect(html).toContain('<h1>&lt;i&gt;</h1>');
  });

  it('404 is noindex and static (no app script, so the homepage never renders under an unknown URL)', () => {
    const html = renderNotFoundHtml(template);
    expect(html).toContain('<meta name="robots" content="noindex, nofollow" />');
    expect(html).toContain('<h1>Page not found</h1>');
    expect(html).not.toContain('type="module"');
    expect(html).not.toContain('modulepreload');
  });

  it('public routes are exactly the sitemap; workspace routes are noindex', () => {
    const sitemap = [...readFileSync('public/sitemap.xml', 'utf8').matchAll(/<loc>https:\/\/interactive-fire-calculator\.pages\.dev([^<]*)<\/loc>/g)].map((m) => m[1] || '/');
    const publicRoutes = ['/', '/calculators', '/calculators/fire', ...seoCalculators.map((c) => `/calculators/${c.slug}`)];
    expect(new Set(publicRoutes)).toEqual(new Set(sitemap));
    for (const route of publicRoutes) expect(buildRouteMetadata(route).robots).toBe('index, follow');
    for (const route of WORKSPACE_ROUTES) expect(buildRouteMetadata(route).robots).toBe('noindex, nofollow');
  });

  it('only plan deep links are rewritten; there is no catch-all that would hide 404s', () => {
    const redirects = readFileSync('public/_redirects', 'utf8').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
    expect(redirects).toEqual(['/plans/*  /plans/index.html  200']);
  });

  it('ships security headers with a CSP that forbids inline and eval scripts', () => {
    const headers = readFileSync('public/_headers', 'utf8');
    const csp = headers.match(/Content-Security-Policy: (.*)/)?.[1] ?? '';
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    const scriptSrc = csp.split(';').find((d) => d.trim().startsWith('script-src')) ?? '';
    expect(scriptSrc).not.toMatch(/unsafe-inline|unsafe-eval|\*(?!\.)/);
    for (const header of ['Strict-Transport-Security', 'X-Content-Type-Options: nosniff', 'Referrer-Policy']) expect(headers).toContain(header);
  });
});
