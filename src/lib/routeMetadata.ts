import { calculatorCurrency, findSeoCalculator, seoCalculators } from './seoCalculators';
import { landingFaq } from './landingContent';

export const DEFAULT_SITE_ORIGIN = 'https://interactive-fire-calculator.pages.dev';
export const DEFAULT_FEEDBACK_URL =
  'https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/issues/new?title=FinPath+feedback';
export const OG_IMAGE_PATH = '/og-card.png';
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;
export const OG_IMAGE_ALT =
  'FinPath — Free financial calculators for the US and India with visible assumptions';

export function resolveSiteOrigin(candidate?: string | null): string {
  if (!candidate || typeof candidate !== 'string') return DEFAULT_SITE_ORIGIN;
  const trimmed = candidate.trim();
  if (!trimmed) return DEFAULT_SITE_ORIGIN;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:' || !parsed.hostname || parsed.username || parsed.password) {
      return DEFAULT_SITE_ORIGIN;
    }
    return parsed.origin;
  } catch {
    return DEFAULT_SITE_ORIGIN;
  }
}

export function ogImageUrl(origin?: string | null): string {
  return `${resolveSiteOrigin(origin)}${OG_IMAGE_PATH}`;
}

export function resolveFeedbackUrl(candidate?: string | null): string {
  if (!candidate || typeof candidate !== 'string') return DEFAULT_FEEDBACK_URL;
  const trimmed = candidate.trim();
  if (!trimmed) return DEFAULT_FEEDBACK_URL;
  try {
    const parsed = new URL(trimmed);
    if (parsed.username || parsed.password) return DEFAULT_FEEDBACK_URL;
    if (parsed.protocol === 'https:') {
      return parsed.hostname ? parsed.href : DEFAULT_FEEDBACK_URL;
    }
    if (parsed.protocol === 'mailto:') {
      return parsed.pathname.trim() ? parsed.href : DEFAULT_FEEDBACK_URL;
    }
    return DEFAULT_FEEDBACK_URL;
  } catch {
    return DEFAULT_FEEDBACK_URL;
  }
}

const runtimeEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
const nodeEnv = typeof process !== 'undefined' ? process.env : undefined;

export const siteOrigin = resolveSiteOrigin(
  runtimeEnv?.VITE_SITE_ORIGIN || nodeEnv?.VITE_SITE_ORIGIN || nodeEnv?.FINPATH_PRODUCTION_ORIGIN
);

export const feedbackUrl = resolveFeedbackUrl(
  runtimeEnv?.VITE_FEEDBACK_URL || nodeEnv?.VITE_FEEDBACK_URL
);

export type RouteMetadata = {
  canonicalUrl: string;
  description: string;
  jsonLd: Record<string, unknown> | null;
  ogImageUrl: string;
  robots: 'index, follow' | 'noindex, nofollow';
  title: string;
};

export function buildRouteMetadata(path: string, origin: string = siteOrigin): RouteMetadata {
  const resolvedOrigin = resolveSiteOrigin(origin);
  const canonicalPath = normalizePath(path);
  const calculator = findSeoCalculator(canonicalPath);
  const isCalculatorHub = canonicalPath === '/calculators';
  const isFireCalculator = canonicalPath === '/calculators/fire';
  const isLandingPage = canonicalPath === '/';
  const isPrivacyPage = canonicalPath === '/privacy';
  const isTermsPage = canonicalPath === '/terms';
  const isPublic =
    Boolean(calculator) ||
    isCalculatorHub ||
    isFireCalculator ||
    isLandingPage ||
    isPrivacyPage ||
    isTermsPage;
  const title = calculator
    ? `${calculator.title} | FinPath`
    : isCalculatorHub
      ? 'Financial Calculators | FinPath'
      : isFireCalculator
        ? 'FIRE Calculator | FinPath'
        : isLandingPage
          ? 'FinPath | FIRE Calculator and Financial Planning'
          : isPrivacyPage
            ? 'Privacy Policy | FinPath'
            : isTermsPage
              ? 'Terms of Use | FinPath'
              : `${routeLabel(canonicalPath)} | FinPath`;
  const description = calculator
    ? calculator.description
    : isCalculatorHub
      ? 'Run financial calculators for loans, investing, savings, taxes, retirement, and planning, then save the next step into FinPath.'
      : isFireCalculator
        ? 'Use the public FIRE calculator to estimate retirement readiness, withdrawals, and portfolio scenarios.'
        : isLandingPage
          ? 'Plan financial independence, retirement, savings, goals, accounts, and cash flow in FinPath.'
          : isPrivacyPage
            ? 'How FinPath handles browser drafts, optional Clerk accounts, Cloudflare D1 records, data export, and permanent deletion.'
            : isTermsPage
              ? 'Terms of use, planning-estimate disclaimers, and statutory source limitations for FinPath financial calculators.'
              : 'Private FinPath workspace for signed-in accounts, goals, plans, transactions, and financial reports.';
  const canonicalUrl = `${resolvedOrigin}${canonicalPath}`;
  const resolvedOgImageUrl = ogImageUrl(resolvedOrigin);

  return {
    canonicalUrl,
    description,
    jsonLd: calculator
      ? calculatorJsonLd(calculator, canonicalUrl)
      : isCalculatorHub
        ? calculatorHubJsonLd(canonicalUrl, resolvedOrigin)
        : isFireCalculator
          ? fireCalculatorJsonLd(canonicalUrl)
          : isLandingPage
            ? websiteJsonLd(resolvedOrigin)
            : isPrivacyPage || isTermsPage
              ? webPageJsonLd(title, description, canonicalUrl)
              : null,
    ogImageUrl: resolvedOgImageUrl,
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
  upsertMetaName('twitter:card', 'summary_large_image');
  upsertMetaName('twitter:title', metadata.title);
  upsertMetaName('twitter:description', metadata.description);
  upsertMetaName('twitter:image', metadata.ogImageUrl);
  upsertMetaProperty('og:type', 'website');
  upsertMetaProperty('og:site_name', 'FinPath');
  upsertMetaProperty('og:title', metadata.title);
  upsertMetaProperty('og:description', metadata.description);
  upsertMetaProperty('og:url', metadata.canonicalUrl);
  upsertMetaProperty('og:image', metadata.ogImageUrl);
  upsertMetaProperty('og:image:width', String(OG_IMAGE_WIDTH));
  upsertMetaProperty('og:image:height', String(OG_IMAGE_HEIGHT));
  upsertMetaProperty('og:image:alt', OG_IMAGE_ALT);
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

function calculatorHubJsonLd(url: string, origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    hasPart: seoCalculators.map((calculator) => ({
      '@type': 'WebApplication',
      applicationCategory: 'FinanceApplication',
      name: calculator.title,
      url: `${origin}/calculators/${calculator.slug}`
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
    description:
      'Estimate retirement readiness, withdrawals, and portfolio scenarios with the public FinPath FIRE calculator.',
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

function webPageJsonLd(name: string, description: string, url: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    description,
    inLanguage: 'en',
    name,
    url
  };
}

function websiteJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'FinPath',
        url: origin,
        description:
          'Free financial calculators for the US and India: retirement, mortgages, loans, savings and tax, with every assumption visible.',
        areaServed: ['US', 'IN']
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        name: 'FinPath',
        url: origin,
        inLanguage: 'en',
        publisher: { '@id': `${origin}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: { '@type': 'EntryPoint', urlTemplate: `${origin}/calculators?q={search_term_string}` },
          'query-input': 'required name=search_term_string'
        }
      },
      {
        '@type': 'FAQPage',
        '@id': `${origin}/#faq`,
        mainEntity: landingFaq.map((item) => ({
          '@type': 'Question',
          name: item.question,
          acceptedAnswer: { '@type': 'Answer', text: item.answer }
        }))
      }
    ]
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
