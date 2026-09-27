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
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(meta.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}" />`);
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

// llms.txt: a plain-text guide for AI assistants (https://llmstxt.org) listing what each page answers.
export function renderLlmsTxt(calculators, metadataFor) {
  const site = 'https://interactive-fire-calculator.pages.dev';
  const byCategory = {};
  for (const c of calculators) (byCategory[c.category] ??= []).push(c);
  const lines = [
    '# FinPath',
    '',
    '> Free financial calculators for the United States and India: retirement (FIRE), mortgages and EMIs, loans, savings and investing, and income tax. Every result shows its assumptions and explains what moves the answer. No account or payment is needed; estimates are for planning and are not financial advice.',
    '',
    `- [FIRE calculator](${site}/calculators/fire): ${metadataFor('/calculators/fire').description}`,
    `- [All calculators](${site}/calculators): search or browse by decision.`,
    `- [FAQ](${site}/#faq): what FinPath is, countries and currencies, privacy.`,
    ''
  ];
  for (const [category, items] of Object.entries(byCategory)) {
    lines.push(`## ${category}`, '');
    for (const c of items) lines.push(`- [${c.title}](${site}/calculators/${c.slug}) (${c.region}): ${c.description}`);
    lines.push('');
  }
  return lines.join('\n');
}

async function main() {
  // No dependency discovery: this server only loads two pure modules, and closing it mid-scan logs a spurious error.
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
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
      // Flat files (plans.html) are served at the clean path; directory indexes would force a
      // trailing-slash redirect on Cloudflare Pages and change every URL.
      const file = route === '/' ? join(DIST, 'index.html') : join(DIST, `${route}.html`);
      mkdirSync(dirname(file), { recursive: true });
      writeFileSync(file, html);
      written += 1;
    }
    writeFileSync(join(DIST, '404.html'), renderNotFoundHtml(template));
    writeFileSync(join(DIST, 'llms.txt'), renderLlmsTxt(seoCalculators, buildRouteMetadata));
    console.log(`[prerender_routes] Wrote ${written} route pages (${publicRoutes.length} public, ${WORKSPACE_ROUTES.length} workspace) and 404.html.`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
