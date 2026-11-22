#!/usr/bin/env node
// Post-build (B38 / B85): write route-specific HTML for every known route so crawlers and link previews
// get the right title, description, canonical, og:image, robots and a truthful heading before JavaScript
// runs, and emit origin-accurate sitemap.xml, robots.txt, llms.txt and 404.html. React replaces #root on mount.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, loadEnv } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
export const DEFAULT_ORIGIN = 'https://interactive-fire-calculator.pages.dev';
export const LEGAL_ROUTES = ['/privacy', '/terms'];
export const WORKSPACE_ROUTES = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'];

const escapeHtml = (value) => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function resolvePrerenderOrigin(candidate) {
  if (!candidate || typeof candidate !== 'string') return DEFAULT_ORIGIN;
  try {
    const parsed = new URL(candidate.trim());
    return parsed.protocol === 'https:' && parsed.hostname && !parsed.username && !parsed.password
      ? parsed.origin
      : DEFAULT_ORIGIN;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function sanitizeHttpsUrl(candidate, fallback) {
  if (!candidate || typeof candidate !== 'string') return fallback;
  try {
    const parsed = new URL(candidate.trim());
    return parsed.protocol === 'https:' && parsed.hostname && !parsed.username && !parsed.password
      ? parsed.href
      : fallback;
  } catch {
    return fallback;
  }
}

export function renderRouteHtml(template, meta, { heading, body }) {
  const safeCanonical = sanitizeHttpsUrl(meta.canonicalUrl, `${DEFAULT_ORIGIN}/`);
  const safeOgImage = sanitizeHttpsUrl(meta.ogImageUrl, `${DEFAULT_ORIGIN}/og-card.png`);
  let html = template
    .replace(/<title>[\s\S]*?<\/title>/, () => `<title>${escapeHtml(meta.title)}</title>`)
    .replace(/<meta\s+name="description"[\s\S]*?\/>/, () => `<meta name="description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, () => `<meta name="robots" content="${escapeHtml(meta.robots)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, () => `<link rel="canonical" href="${escapeHtml(safeCanonical)}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, () => `<meta property="og:title" content="${escapeHtml(meta.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, () => `<meta property="og:description" content="${escapeHtml(meta.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, () => `<meta property="og:url" content="${escapeHtml(safeCanonical)}" />`)
    .replace(/<meta property="og:image" content="[^"]*" \/>/, () => `<meta property="og:image" content="${escapeHtml(safeOgImage)}" />`)
    .replace(/<meta name="twitter:image" content="[^"]*" \/>/, () => `<meta name="twitter:image" content="${escapeHtml(safeOgImage)}" />`);
  if (meta.jsonLd) {
    const serialized = JSON.stringify(meta.jsonLd).replace(/</g, '\\u003c');
    html = html.replace('</head>', () => `  <script type="application/ld+json">${serialized}</script>\n  </head>`);
  }
  const content = heading ? `<main class="prerender-shell"><h1>${escapeHtml(heading)}</h1>${body ? `<p>${escapeHtml(body)}</p>` : ''}</main>` : '';
  return html.replace('<div id="root"></div>', () => `<div id="root">${content}</div>`);
}

export function renderNotFoundHtml(template, origin = DEFAULT_ORIGIN) {
  const site = resolvePrerenderOrigin(origin);
  // Static on purpose: loading the app here would render the homepage under an unknown URL.
  const withoutScripts = template
    .replace(/<script type="module"[\s\S]*?<\/script>/g, '')
    .replace(/<link rel="modulepreload"[^>]*>/g, '');
  return renderRouteHtml(
    withoutScripts,
    {
      title: 'Page not found | FinPath',
      description: 'This page does not exist.',
      robots: 'noindex, nofollow',
      canonicalUrl: `${site}/`,
      ogImageUrl: `${site}/og-card.png`,
      jsonLd: null
    },
    { heading: 'Page not found', body: '' }
  ).replace(
    '</main>',
    '<p>The page you asked for does not exist. <a href="/">Go to the homepage</a> or <a href="/calculators">browse calculators</a>.</p></main>'
  );
}

export function renderSitemapXml(routes, origin = DEFAULT_ORIGIN, lastmod = '2026-11-22') {
  const site = resolvePrerenderOrigin(origin);
  const entries = routes.map((route) => {
    const loc = route === '/' ? `${site}/` : `${site}${route}`;
    const changefreq = route === '/' || route === '/calculators' ? 'weekly' : 'monthly';
    const priority = route === '/' ? '1.0' : route === '/calculators' || route === '/calculators/fire' ? '0.9' : LEGAL_ROUTES.includes(route) ? '0.4' : '0.8';
    return `  <url><loc>${escapeHtml(loc)}</loc><lastmod>${escapeHtml(lastmod)}</lastmod><changefreq>${changefreq}</changefreq><priority>${priority}</priority></url>`;
  });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;
}

export function renderRobotsTxt(origin = DEFAULT_ORIGIN) {
  const site = resolvePrerenderOrigin(origin);
  return [
    'User-agent: *',
    'Allow: /',
    '',
    '# AI assistants are welcome to read public pages; see /llms.txt for a guide.',
    'User-agent: GPTBot',
    'Allow: /',
    '',
    'User-agent: ClaudeBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    'User-agent: Google-Extended',
    'Allow: /',
    '',
    `Sitemap: ${site}/sitemap.xml`,
    ''
  ].join('\n');
}

// llms.txt: a plain-text guide for AI assistants (https://llmstxt.org) listing what each page answers.
export function renderLlmsTxt(calculators, metadataFor, origin = DEFAULT_ORIGIN) {
  const site = resolvePrerenderOrigin(origin);
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
    `- [Privacy policy](${site}/privacy): ${metadataFor('/privacy').description}`,
    `- [Terms of use](${site}/terms): ${metadataFor('/terms').description}`,
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
  const env = loadEnv('production', ROOT, '');
  const origin = resolvePrerenderOrigin(
    process.env.VITE_SITE_ORIGIN ||
      process.env.FINPATH_PRODUCTION_ORIGIN ||
      env.VITE_SITE_ORIGIN ||
      env.FINPATH_PRODUCTION_ORIGIN
  );
  // No dependency discovery: this server only loads two pure modules, and closing it mid-scan logs a spurious error.
  const server = await createServer({ root: ROOT, logLevel: 'error', server: { middlewareMode: true }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
  try {
    const { buildRouteMetadata } = await server.ssrLoadModule('/src/lib/routeMetadata.ts');
    const { seoCalculators } = await server.ssrLoadModule('/src/lib/seoCalculators.ts');
    const template = readFileSync(join(DIST, 'index.html'), 'utf8');
    const publicRoutes = [
      '/',
      '/calculators',
      '/calculators/fire',
      ...seoCalculators.map((c) => `/calculators/${c.slug}`),
      ...LEGAL_ROUTES
    ];
    let written = 0;
    for (const route of [...publicRoutes, ...WORKSPACE_ROUTES]) {
      const meta = buildRouteMetadata(route, origin);
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
    writeFileSync(join(DIST, '404.html'), renderNotFoundHtml(template, origin));
    writeFileSync(join(DIST, 'sitemap.xml'), renderSitemapXml(publicRoutes, origin));
    writeFileSync(join(DIST, 'robots.txt'), renderRobotsTxt(origin));
    writeFileSync(join(DIST, 'llms.txt'), renderLlmsTxt(seoCalculators, (path) => buildRouteMetadata(path, origin), origin));
    console.log(`[prerender_routes] Wrote ${written} route pages (${publicRoutes.length} public, ${WORKSPACE_ROUTES.length} workspace), 404.html, sitemap.xml, robots.txt, and llms.txt for ${origin}.`);
  } finally {
    await server.close();
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
