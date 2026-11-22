import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import App from './App';
import type { AuthState } from './auth';
import {
  applyRouteMetadata,
  buildRouteMetadata,
  DEFAULT_FEEDBACK_URL,
  DEFAULT_SITE_ORIGIN,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_PATH,
  OG_IMAGE_WIDTH,
  ogImageUrl,
  resolveFeedbackUrl,
  resolveSiteOrigin
} from './lib/routeMetadata';
// @ts-expect-error — plain ESM build script without type declarations
import { renderLlmsTxt, renderNotFoundHtml, renderRobotsTxt, renderRouteHtml, renderSitemapXml } from '../scripts/prerender_routes.mjs';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const rootDir = resolve(__dirname, '..');

const unconfiguredAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

describe('B85 / C46 — Pre-Launch Polish Pack', () => {
  beforeEach(() => {
    localStorage.clear();
    document.head.innerHTML = '<meta charset="UTF-8"><meta name="description" content="default">';
    document.title = '';
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
    );
  });

  it('resolves valid HTTPS origins cleanly and falls back safely for invalid values (R1)', () => {
    expect(resolveSiteOrigin(undefined)).toBe(DEFAULT_SITE_ORIGIN);
    expect(resolveSiteOrigin('')).toBe(DEFAULT_SITE_ORIGIN);
    expect(resolveSiteOrigin('http://insecure.example.com')).toBe(DEFAULT_SITE_ORIGIN);
    expect(resolveSiteOrigin('javascript:alert(1)')).toBe(DEFAULT_SITE_ORIGIN);
    expect(resolveSiteOrigin('https://finpath.example.com/')).toBe('https://finpath.example.com');
    expect(resolveSiteOrigin('https://app.finpath.example.com/extra?foo=bar#baz')).toBe(
      'https://app.finpath.example.com'
    );

    expect(resolveSiteOrigin('https://user:pass@finpath.example.com')).toBe(DEFAULT_SITE_ORIGIN);
    expect(ogImageUrl(undefined)).toBe(`${DEFAULT_SITE_ORIGIN}${OG_IMAGE_PATH}`);
    expect(ogImageUrl('https://finpath.example.com/')).toBe(`https://finpath.example.com${OG_IMAGE_PATH}`);

    expect(resolveFeedbackUrl(undefined)).toBe(DEFAULT_FEEDBACK_URL);
    expect(resolveFeedbackUrl('javascript:alert(1)')).toBe(DEFAULT_FEEDBACK_URL);
    expect(resolveFeedbackUrl('mailto:')).toBe(DEFAULT_FEEDBACK_URL);
    expect(resolveFeedbackUrl('https://user:pass@example.com/feedback')).toBe(DEFAULT_FEEDBACK_URL);
    expect(resolveFeedbackUrl('HTTPS://app.example.com/feedback')).toBe('https://app.example.com/feedback');
    expect(resolveFeedbackUrl('mailto:support@example.com')).toBe('mailto:support@example.com');

    const customOrigin = 'https://finpath.example.com';
    const meta = buildRouteMetadata('/calculators/mortgage', customOrigin);
    expect(meta.canonicalUrl).toBe('https://finpath.example.com/calculators/mortgage');
    expect(meta.ogImageUrl).toBe(`https://finpath.example.com${OG_IMAGE_PATH}`);

    const sitemapXml = renderSitemapXml(['/', '/calculators', '/privacy', '/terms'], customOrigin, '2026-11-22');
    expect(sitemapXml).toContain('<loc>https://finpath.example.com/</loc>');
    expect(sitemapXml).toContain('<loc>https://finpath.example.com/privacy</loc>');
    expect(sitemapXml).toContain('<loc>https://finpath.example.com/terms</loc>');
    expect(sitemapXml).not.toContain('interactive-fire-calculator.pages.dev');

    const robotsTxt = renderRobotsTxt(customOrigin);
    expect(robotsTxt).toContain('Sitemap: https://finpath.example.com/sitemap.xml');

    const llmsTxt = renderLlmsTxt([], (path: string) => buildRouteMetadata(path, customOrigin), customOrigin);
    expect(llmsTxt).toContain('https://finpath.example.com/calculators/fire');
    expect(llmsTxt).toContain('https://finpath.example.com/privacy');
    expect(llmsTxt).toContain('https://finpath.example.com/terms');
  });

  it('renders public /privacy and /terms pages with clean copy, SEO metadata, and quiet footer links (R2)', () => {
    const privacyMeta = buildRouteMetadata('/privacy');
    const termsMeta = buildRouteMetadata('/terms');
    expect(privacyMeta.robots).toBe('index, follow');
    expect(termsMeta.robots).toBe('index, follow');
    expect(privacyMeta.title).toBe('Privacy Policy | FinPath');
    expect(termsMeta.title).toBe('Terms of Use | FinPath');
    expect(privacyMeta.jsonLd?.['@type']).toBe('WebPage');
    expect(termsMeta.jsonLd?.['@type']).toBe('WebPage');

    window.history.replaceState({}, '', '/privacy');
    const privacyHtml = renderToStaticMarkup(<App auth={unconfiguredAuth} />);
    expect(privacyHtml).toContain('<h1 id="privacy-policy-title">Privacy policy</h1>');
    expect(privacyHtml).toContain('localStorage');
    expect(privacyHtml).toContain('Clerk');
    expect(privacyHtml).toContain('Cloudflare D1');
    expect(privacyHtml).toContain('/settings');
    expect(privacyHtml).not.toContain('auth-gate-panel');

    window.history.replaceState({}, '', '/terms');
    const termsHtml = renderToStaticMarkup(<App auth={unconfiguredAuth} />);
    expect(termsHtml).toContain('<h1 id="terms-title">Terms of use and disclaimers</h1>');
    expect(termsHtml).toContain('not financial, investment, tax, or legal advice');
    expect(termsHtml).toContain('/privacy');
    expect(termsHtml).not.toContain('auth-gate-panel');

    // Footer includes Privacy, Terms, and quiet Send feedback link
    const container = document.createElement('div');
    container.innerHTML = privacyHtml;
    const footer = container.querySelector('footer.site-footer')!;
    expect(footer.querySelector('a[href="/privacy"]')?.textContent).toBe('Privacy');
    expect(footer.querySelector('a[href="/terms"]')?.textContent).toBe('Terms');
    const feedbackLink = [...footer.querySelectorAll('a')].find((a) => /feedback/i.test(a.textContent ?? ''));
    expect(feedbackLink).toBeTruthy();
    expect(feedbackLink?.getAttribute('href')).toMatch(/^https:\/\/github\.com\/rakeshnreddy\/Interactive-FIRE-Calculator\/issues\/new/);
    expect(feedbackLink?.getAttribute('rel')).toContain('noopener');
  });

  it('ships a valid 1200x630 public/og-card.png and wires og:image / twitter:card across index.html, runtime metadata, and prerendering (R3)', () => {
    const ogPngPath = resolve(rootDir, 'public/og-card.png');
    expect(existsSync(ogPngPath)).toBe(true);
    const png = readFileSync(ogPngPath);
    // PNG magic header + IHDR width/height bytes
    expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect(png.readUInt32BE(16)).toBe(OG_IMAGE_WIDTH);
    expect(png.readUInt32BE(20)).toBe(OG_IMAGE_HEIGHT);

    const indexHtml = readFileSync(resolve(rootDir, 'index.html'), 'utf8');
    expect(indexHtml).toContain('property="og:image"');
    expect(indexHtml).toContain('property="og:image:width" content="1200"');
    expect(indexHtml).toContain('property="og:image:height" content="630"');
    expect(indexHtml).toContain('name="twitter:card" content="summary_large_image"');
    expect(indexHtml).toContain('name="twitter:image"');

    applyRouteMetadata('/calculators/fire');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content).toContain(OG_IMAGE_PATH);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:card"]')?.content).toBe(
      'summary_large_image'
    );
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content).toContain(
      OG_IMAGE_PATH
    );

    const customOrigin = 'https://finpath.example.com';
    const prerendered = renderRouteHtml(indexHtml, {
      ...buildRouteMetadata('/privacy', customOrigin),
      description: "Save $'100 & $& safely"
    }, {
      heading: 'Privacy policy',
      body: "Body with $' literal"
    });
    expect(prerendered).toContain('property="og:image" content="https://finpath.example.com/og-card.png"');
    expect(prerendered).toContain('name="twitter:image" content="https://finpath.example.com/og-card.png"');
    expect(prerendered).toContain("Save $'100 &amp; $&amp; safely");
    expect(prerendered).toContain("Body with $' literal");

    const notFound = renderNotFoundHtml(indexHtml, customOrigin);
    expect(notFound).toContain('href="https://finpath.example.com/"');
  });

  it('keeps public/robots.txt sitemap pointer and Gemini Argon review notes updated through B81–B85 (R1, R4)', () => {
    const robots = readFileSync(resolve(rootDir, 'public/robots.txt'), 'utf8');
    expect(robots).toMatch(/^Sitemap:\s+https:\/\/.+\/sitemap\.xml$/m);

    const notes = readFileSync(resolve(rootDir, 'docs/execution/GEMINI_ARGON_REVIEW_NOTES.md'), 'utf8');
    expect(notes).toContain('B81 / C42');
    expect(notes).toContain('B82 / C43');
    expect(notes).toContain('B83 / C44');
    expect(notes).toContain('B84 / C45');
    expect(notes).toContain('B85 / C46');
  });
});
