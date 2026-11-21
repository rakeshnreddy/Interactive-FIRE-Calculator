import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthState } from './auth';
import { LandingPage } from './LandingPage';
import { HeroFireExample } from './HeroFireExample';

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

const configuredSignedOutAuth: AuthState = {
  provider: 'clerk',
  status: 'signed-out',
  isConfigured: true,
  isSignedIn: false,
  getToken: async () => null,
  user: null
};

function extractLucideSvgs(html: string): string[] {
  return html.match(/<svg\b[^>]*class="[^"]*lucide[^"]*"[^>]*>/g) ?? [];
}

function stripAccessibilityAndPrint(css: string): string {
  const withoutA11y = css.replace(/@layer\s+accessibility\s*\{[\s\S]*$/m, '');
  return withoutA11y.replace(/@media\s+print\s*\{[\s\S]*$/m, '');
}

describe('B79 / C40 — Unslop Stage C: Homepage, application shell & footer', () => {
  const homeCss = readFileSync(resolve(rootDir, 'src/home.css'), 'utf8');
  const shellCss = readFileSync(resolve(rootDir, 'src/shell.css'), 'utf8');
  const vividCss = readFileSync(resolve(rootDir, 'src/vivid-theme.css'), 'utf8');

  it('enforces 4px spacing, quiet surfaces, and zero gradients/blur across src/home.css and src/shell.css (R1, R2)', () => {
    for (const [label, css] of [
      ['src/home.css', homeCss],
      ['src/shell.css', shellCss]
    ] as const) {
      expect(css, `${label} non-repeating gradient`).not.toMatch(/(?<!repeating-)(?:linear|radial)-gradient\(/i);
      expect(css, `${label} backdrop-filter blur`).not.toMatch(/^\s*(?:-webkit-)?backdrop-filter:(?!\s*none\b)/m);
      expect(css, `${label} @supports backdrop-filter`).not.toMatch(/@supports\s*\([^)]*backdrop-filter/i);
      expect(css, `${label} uppercase transform`).not.toMatch(/text-transform:\s*uppercase/i);
      expect(css, `${label} italic emphasis`).not.toMatch(/font-style:\s*italic/i);

      const coreCss = stripAccessibilityAndPrint(css);
      expect(coreCss, `${label} !important outside accessibility/print`).not.toContain('!important');

      const spacingDecls = coreCss.match(/(?:padding|margin|gap|column-gap|row-gap)[^;]*;/g) ?? [];
      for (const decl of spacingDecls) {
        expect(decl, `${label} off-4px spacing: ${decl}`).not.toMatch(
          /\b(3|6|7|10|14|18|22|26|30|34|38|42|46|50|54)px\b/
        );
      }
    }

    expect(homeCss).not.toContain('border-top: 3px');
    expect(homeCss).not.toMatch(/box-shadow:\s*0\s+18px\s+48px/);
    expect(homeCss).toMatch(/\.landing-hero-example\s*\{[^}]*border-radius:\s*12px/s);
    expect(homeCss).toMatch(/\.landing-hero-example\s*\{[^}]*box-shadow:\s*var\(--shadow-rest\)/s);

    expect(shellCss).not.toMatch(/\.topbar\s*\{[^}]*box-shadow:\s*0\s+1px\s+0/s);
    expect(shellCss).toMatch(/\.topbar\s*\{[^}]*background:\s*var\(--color-nav-solid\)/s);
    expect(shellCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(shellCss).toContain('@media (forced-colors: active)');

    // Neutral shadows in src/vivid-theme.css (no tinted blue wash; dark rest shadow is none)
    expect(vividCss).not.toMatch(/--shadow-overlay:\s*[^;]*rgba\(28,\s*54,\s*92/);
    expect(vividCss).not.toMatch(/--shadow-rest:\s*[^;]*rgba\(28,\s*54,\s*92/);
    expect(vividCss).toMatch(/\.app\[data-mode="dark"\][\s\S]*--shadow-rest:\s*none;/);
  });

  it('caps font weights to 400/500/600, aligns nested radii <= 12px, quiets footer headings, and unifies easing (R4, R5)', () => {
    for (const [label, css] of [
      ['src/home.css', homeCss],
      ['src/shell.css', shellCss]
    ] as const) {
      expect(css, `${label} off-scale font weight`).not.toMatch(
        /font-weight:\s*(5[1-9]\d|6[1-9]\d|[7-9]\d\d)/
      );
      expect(css, `${label} radius > 12px`).not.toMatch(/border-radius:[^;]*\b(14|16|18|20|24|999)px\b/);
      expect(css, `${label} ad-hoc ease curve`).not.toMatch(/transition:[^;]*\bease\b/);
      expect(css, `${label} tight display tracking > -0.03em`).not.toMatch(/letter-spacing:\s*-0\.03[1-9]em/);
    }

    expect(shellCss).toMatch(/\.desktop-nav-dropdown\s*\{[^}]*padding:\s*4px;[^}]*border-radius:\s*12px;/s);
    expect(shellCss).toMatch(/\.mobile-nav\s*\{[^}]*padding:\s*4px;[^}]*border-radius:\s*12px;/s);
    expect(shellCss).toMatch(/\.site-footer-brand\s+strong\s*\{[^}]*font-weight:\s*(?:inherit|600)/s);
    expect(shellCss).toMatch(/\.site-footer-group\s*>\s*strong\s*\{[^}]*color:\s*var\(--color-footer-muted\)/s);
    expect(homeCss).toMatch(/\.landing-finder-field\s*\{[^}]*padding:\s*4px;[^}]*border-radius:\s*12px;/s);
    expect(homeCss).toMatch(/\.home-page\s+:is\(h1,\s*h2,\s*h3,\s*strong,\s*summary\)\s*\{[^}]*font-weight:\s*600;/s);
    expect(homeCss).not.toContain('88px');
    expect(homeCss).toContain('cubic-bezier(0.22, 1, 0.36, 1)');
    expect(shellCss).toContain('cubic-bezier(0.22, 1, 0.36, 1)');
  });

  it('renders clean Stage C copy, single hero primary CTA, quiet Search submit, standardized Lucide icons, and flat HeroFireExample SVG (R2, R3, R4, R5)', () => {
    const landingHtml = renderToStaticMarkup(
      <LandingPage auth={configuredSignedOutAuth} onNavigate={() => {}} />
    );
    const unconfiguredHtml = renderToStaticMarkup(
      <LandingPage auth={unconfiguredAuth} onNavigate={() => {}} />
    );

    // No trailing periods on single-line landing headlines
    expect(landingHtml).toContain('<h1 id="landing-title">Clear answers to your money questions</h1>');
    expect(landingHtml).toContain('<h2 id="capabilities-title">Start with a question, leave with a clearer plan</h2>');
    expect(landingHtml).toContain('<h2 id="trust-title">Honest math, in your currency</h2>');
    expect(unconfiguredHtml).toContain('<h2 id="privacy-title">Start without an account</h2>');

    // Hero has exactly one primary button and a quiet secondary Search button inside the finder
    const container = document.createElement('div');
    container.innerHTML = landingHtml;
    const heroPrimaryButtons = container.querySelectorAll('.landing-hero .primary-button');
    expect(heroPrimaryButtons).toHaveLength(1);
    expect(heroPrimaryButtons[0]?.textContent).toContain('See when you could retire');

    const finderSubmit = container.querySelector('.landing-finder button[type="submit"]');
    expect(finderSubmit?.className).toContain('secondary-button');
    expect(finderSubmit?.textContent?.trim()).toBe('Search');

    // All Lucide icons across LandingPage and HeroFireExample use stroke-width="1.5" and 16 or 18px
    const landingIcons = extractLucideSvgs(landingHtml);
    expect(landingIcons.length).toBeGreaterThanOrEqual(8);
    for (const svg of landingIcons) {
      expect(svg, `Expected stroke-width="1.5" on ${svg}`).toContain('stroke-width="1.5"');
      expect(svg, `Expected size 16 or 18 on ${svg}`).toMatch(/width="(16|18)"/);
      expect(svg, `Expected size 16 or 18 on ${svg}`).toMatch(/height="(16|18)"/);
    }

    // HeroFireExample SVG has zero linearGradient/radialGradient, uses strokeWidth=2, and has a mid-rule
    const heroExampleHtml = renderToStaticMarkup(<HeroFireExample />);
    expect(heroExampleHtml).not.toMatch(/<(?:linearGradient|radialGradient)\b/i);
    expect(heroExampleHtml).not.toContain('url(#heroGradient)');
    expect(heroExampleHtml).toContain('stroke-width="2"');
    expect(heroExampleHtml).not.toContain('stroke-width="2.5"');
    expect(heroExampleHtml).toContain('class="hero-svg-area"');
    expect(heroExampleHtml).toContain('class="hero-svg-grid"');
  });
});
