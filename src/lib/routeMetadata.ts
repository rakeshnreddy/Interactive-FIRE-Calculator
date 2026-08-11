import { calculatorCurrency, findSeoCalculator, seoCalculators } from './seoCalculators';

export const siteOrigin = 'https://interactive-fire-calculator.pages.dev';

export type RouteMetadata = {
  canonicalUrl: string;
  description: string;
  jsonLd: Record<string, unknown> | null;
  robots: 'index, follow' | 'noindex, nofollow';
  title: string;
};

export function buildRouteMetadata(path: string): RouteMetadata {
  const canonicalPath = normalizePath(path);
  const calculator = findSeoCalculator(canonicalPath);
  const isCalculatorHub = canonicalPath === '/calculators';
  const isFireCalculator = canonicalPath === '/calculators/fire';
  const isLandingPage = canonicalPath === '/';
  const isPublic = Boolean(calculator) || isCalculatorHub || isFireCalculator || isLandingPage;
  const title = calculator
    ? `${calculator.title} | FinPath`
    : isCalculatorHub
      ? 'Financial Calculators | FinPath'
      : isFireCalculator
        ? 'FIRE Calculator | FinPath'
        : isLandingPage
          ? 'FinPath | FIRE Calculator and Financial Planning'
          : `${routeLabel(canonicalPath)} | FinPath`;
  const description = calculator
    ? calculator.description
    : isCalculatorHub
      ? 'Run financial calculators for loans, investing, savings, taxes, retirement, and planning, then save the next step into FinPath.'
      : isFireCalculator
        ? 'Use the public FIRE calculator to estimate retirement readiness, withdrawals, and portfolio scenarios.'
        : isLandingPage
          ? 'Plan financial independence, retirement, savings, goals, accounts, and cash flow in FinPath.'
          : 'Private FinPath workspace for signed-in accounts, goals, plans, transactions, and financial reports.';
  const canonicalUrl = `${siteOrigin}${canonicalPath}`;

  return {
    canonicalUrl,
    description,
    jsonLd: calculator
      ? calculatorJsonLd(calculator, canonicalUrl)
      : isCalculatorHub
        ? calculatorHubJsonLd(canonicalUrl)
        : isFireCalculator
          ? fireCalculatorJsonLd(canonicalUrl)
          : isLandingPage
            ? websiteJsonLd()
            : null,
    robots: isPublic ? 'index, follow' : 'noindex, nofollow',
    title
  };
}

export function applyRouteMetadata(path: string): RouteMetadata {
  const metadata = buildRouteMetadata(path);

  if (typeof document === 'undefined') {
    return metadata;
  }

  document.title = metadata.title;
  upsertMetaName('description', metadata.description);
  upsertMetaName('robots', metadata.robots);
  upsertMetaName('twitter:card', 'summary');
  upsertMetaName('twitter:title', metadata.title);
  upsertMetaName('twitter:description', metadata.description);
  upsertMetaProperty('og:type', 'website');
  upsertMetaProperty('og:site_name', 'FinPath');
  upsertMetaProperty('og:title', metadata.title);
  upsertMetaProperty('og:description', metadata.description);
  upsertMetaProperty('og:url', metadata.canonicalUrl);
  upsertCanonical(metadata.canonicalUrl);
  upsertJsonLd(metadata.jsonLd);

  return metadata;
}

function calculatorJsonLd(
  calculator: NonNullable<ReturnType<typeof findSeoCalculator>>,
  url: string
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebApplication',
        applicationCategory: 'FinanceApplication',
        browserRequirements: 'Requires JavaScript',
        description: calculator.description,
        featureList: calculator.inputs.map((input) => input.label),
        isAccessibleForFree: true,
        name: calculator.title,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: calculatorCurrency(calculator)
        },
        operatingSystem: 'Any',
        url
      },
      {
        '@type': 'FAQPage',
        mainEntity: calculator.faq.map((item) => ({
          '@type': 'Question',
          acceptedAnswer: {
            '@type': 'Answer',
            text: item.answer
          },
          name: item.question
        })),
        url: `${url}#faq`
      }
    ]
  };
}

function calculatorHubJsonLd(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    hasPart: seoCalculators.map((calculator) => ({
      '@type': 'WebApplication',
      applicationCategory: 'FinanceApplication',
      name: calculator.title,
      url: `${siteOrigin}/calculators/${calculator.slug}`
    })),
    name: 'Financial Calculators',
    url
  };
}

function fireCalculatorJsonLd(url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    applicationCategory: 'FinanceApplication',
    description: 'Estimate retirement readiness, withdrawals, and portfolio scenarios with the public FinPath FIRE calculator.',
    isAccessibleForFree: true,
    name: 'FIRE Calculator',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    operatingSystem: 'Any',
    url
  };
}

function websiteJsonLd(): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FinPath',
    url: siteOrigin
  };
}

function normalizePath(path: string): string {
  const clean = path.split(/[?#]/, 1)[0]?.replace(/\/+$/, '') || '/';
  return clean.startsWith('/') ? clean : `/${clean}`;
}

function routeLabel(path: string): string {
  const segment = path.split('/').filter(Boolean).at(-1) ?? 'Workspace';
  return segment
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function upsertMetaName(name: string, content: string) {
  const selector = `meta[name="${name}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const element = existing ?? document.createElement('meta');
  element.name = name;
  element.content = content;

  if (!existing) document.head.appendChild(element);
}

function upsertMetaProperty(property: string, content: string) {
  const selector = `meta[property="${property}"]`;
  const existing = document.head.querySelector<HTMLMetaElement>(selector);
  const element = existing ?? document.createElement('meta');
  element.setAttribute('property', property);
  element.content = content;

  if (!existing) document.head.appendChild(element);
}

function upsertCanonical(href: string) {
  const existing = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const element = existing ?? document.createElement('link');
  element.rel = 'canonical';
  element.href = href;

  if (!existing) document.head.appendChild(element);
}

function upsertJsonLd(jsonLd: Record<string, unknown> | null) {
  const existing = document.head.querySelector<HTMLScriptElement>('#finpath-route-json-ld');

  if (!jsonLd) {
    existing?.remove();
    return;
  }

  const element = existing ?? document.createElement('script');
  element.id = 'finpath-route-json-ld';
  element.type = 'application/ld+json';
  element.textContent = JSON.stringify(jsonLd);

  if (!existing) document.head.appendChild(element);
}
