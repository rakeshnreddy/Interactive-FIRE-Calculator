#!/usr/bin/env node
// Post-build (B38): write route-specific HTML for every known route so crawlers and link previews
// get the right title, description, canonical, robots and a truthful heading before JavaScript
// runs, and write a real 404 page for everything else. React replaces #root on mount.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
export const WORKSPACE_ROUTES = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'];

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function renderRouteHtml(template, meta, { heading, body }) {
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${meta.robots}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`);
  if (meta.jsonLd) {
    html = html.replace('</head>', `  <script type="application/ld+json">${JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c')}</script>\n  </head>`);
  }
  const content = heading ? `<main class="prerender-shell"><h1>${escapeHtml(heading)}</h1>${body ? `<p>${escapeHtml(body)}</p>` : ''}</main>` : '';
  return html.replace('<div id="root"></div>', `<div id="root">${content}</div>`);
}

export function renderNotFoundHtml(template) {
  // Static on purpose: loading the app here would render the homepage under an unknown URL.
  const withoutScripts = template
    .replace(/<script type="module"[\s\S]*?<\/script>/g, '')
    .replace(/<link rel="modulepreload"[^>]*>/g, '');
  return renderRouteHtml(
    withoutScripts,
    { title: 'Page not found | FinPath', description: 'This page does not exist.', robots: 'noindex, nofollow', canonicalUrl: 'https://interactive-fire-calculator.pages.dev/', jsonLd: null },
    { heading: 'Page not found', body: '' }
  ).replace(
    '</main>',
    '<p>The page you asked for does not exist. <a href="/">Go to the homepage</a> or <a href="/calculators">browse calculators</a>.</p></main>'
  );
}

async function main() {
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom' });
  try {
    const { buildRouteMetadata } = await server.ssrLoadModule('/src/lib/routeMetadata.ts');
    const { seoCalculators } = await server.ssrLoadModule('/src/lib/seoCalculators.ts');
    const template = readFileSync(join(DIST, 'index.html'), 'utf8');
    const publicRoutes = ['/', '/calculators', '/calculators/fire', ...seoCalculators.map((c) => `/calculators/${c.slug}`)];
    let written = 0;
    for (const route of [...publicRoutes, ...WORKSPACE_ROUTES]) {
      const meta = buildRouteMetadata(route);
      const isPublic = meta.robots.startsWith('index');
      const heading = isPublic ? meta.title.replace(/\s*\|\s*FinPath$/, '').replace(/^FinPath\s*\|\s*/, '') : '';
      const html = renderRouteHtml(template, meta, { heading, body: isPublic ? meta.description : '' });
      const file = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html');
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
      written += 1;
    }
    writeFileSync(join(DIST, '404.html'), renderNotFoundHtml(template));
    console.log(`[prerender_routes] Wrote ${written} route pages (${publicRoutes.length} public, ${WORKSPACE_ROUTES.length} workspace) and 404.html.`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
