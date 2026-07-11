import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';

import { buildRouteMetadata, applyRouteMetadata, siteOrigin } from './routeMetadata';
import { calculatorCurrency, seoCalculators } from './seoCalculators';

describe('calculator route metadata', () => {
  beforeEach(() => {
    document.head.innerHTML = '<meta charset="UTF-8"><meta name="description" content="default">';
    document.title = '';
  });

  it.each(seoCalculators.map((calculator) => [calculator.slug, calculator] as const))(
    '%s is public, self-canonical, and has complete application and FAQ schema',
    (_slug, calculator) => {
      const path = `/calculators/${calculator.slug}`;
      const metadata = buildRouteMetadata(path);
      const graph = metadata.jsonLd?.['@graph'];

      expect(metadata.title).toBe(`${calculator.title} | FinPath`);
      expect(metadata.description).toBe(calculator.description);
      expect(metadata.canonicalUrl).toBe(`${siteOrigin}${path}`);
      expect(metadata.robots).toBe('index, follow');
      expect(Array.isArray(graph)).toBe(true);

      const application = (graph as Array<Record<string, unknown>>)[0];
      const faq = (graph as Array<Record<string, unknown>>)[1];
      expect(application).toMatchObject({
        '@type': 'WebApplication',
        applicationCategory: 'FinanceApplication',
        description: calculator.description,
        isAccessibleForFree: true,
        name: calculator.title,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: calculatorCurrency(calculator)
        },
        url: `${siteOrigin}${path}`
      });
      expect(application.featureList).toEqual(calculator.inputs.map((input) => input.label));
      expect(faq['@type']).toBe('FAQPage');
      expect(faq.mainEntity).toHaveLength(calculator.faq.length);
    }
  );

  it('publishes the complete calculator collection in hub schema', () => {
    const metadata = buildRouteMetadata('/calculators');
    const hasPart = metadata.jsonLd?.hasPart;

    expect(metadata.robots).toBe('index, follow');
    expect(hasPart).toHaveLength(seoCalculators.length);
  });

  it('keeps private workspace routes out of indexing and structured data', () => {
    const metadata = buildRouteMetadata('/dashboard');

    expect(metadata.robots).toBe('noindex, nofollow');
    expect(metadata.jsonLd).toBeNull();
  });

  it('updates browser metadata when calculator routes change', () => {
    const first = seoCalculators[0];
    const second = seoCalculators[1];

    applyRouteMetadata(`/calculators/${first.slug}`);
    applyRouteMetadata(`/calculators/${second.slug}`);

    expect(document.title).toBe(`${second.title} | FinPath`);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="description"]')?.content).toBe(second.description);
    expect(document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content).toBe('index, follow');
    expect(document.head.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.content).toBe(`${siteOrigin}/calculators/${second.slug}`);
    expect(document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href).toBe(`${siteOrigin}/calculators/${second.slug}`);
    expect(document.head.querySelectorAll('#finpath-route-json-ld')).toHaveLength(1);
  });

  it('lists every public calculator route exactly once in the sitemap', () => {
    const sitemap = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
    const listedPaths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]).pathname);
    const expectedPaths = [
      '/',
      '/calculators',
      '/calculators/fire',
      ...seoCalculators.map((calculator) => `/calculators/${calculator.slug}`)
    ];

    expect(new Set(listedPaths).size).toBe(listedPaths.length);
    expect([...listedPaths].sort()).toEqual([...expectedPaths].sort());
  });
});
