import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { AuthState } from './auth';
import { AuthGate } from './App';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const rootDir = resolve(__dirname, '..');

const CSS_FILES = [
  'src/app.css',
  'src/styles.css',
  'src/vivid-theme.css',
  'src/studios.css',
  'src/workspace.css',
  'src/shell.css',
  'src/home.css'
];

describe('B80 / C41 — Final /unslop sitewide polish, WCAG contrast & legacy alignment', () => {
  it('enforces sitewide CSS invariants across every stylesheet: zero radii > 12px or %, zero off-scale weights, zero non-repeating gradients or blur (R4)', () => {
    for (const relPath of CSS_FILES) {
      const css = readFileSync(resolve(rootDir, relPath), 'utf8');
      for (const m of css.matchAll(/border-radius:\s*([^;]+);/gi)) {
        const val = m[1].trim();
        for (const [, numStr, unit] of val.matchAll(/([\d.]+)(px|%|rem)/g)) {
          const num = parseFloat(numStr);
          if (unit === 'px') expect(num, `${relPath} radius > 12px: ${val}`).toBeLessThanOrEqual(12);
          if (unit === 'rem') expect(num, `${relPath} radius > 0.75rem: ${val}`).toBeLessThanOrEqual(0.75);
          if (unit === '%') expect(val, `${relPath} percent radius disallowed: ${val}`).toBe('0');
        }
      }
      for (const m of css.matchAll(/font-weight:\s*([^;]+);/gi)) {
        const val = m[1].trim();
        expect(['400', '500', '600', 'inherit', 'normal'], `${relPath} off-scale font-weight: ${val}`).toContain(val);
      }
      expect(css, `${relPath} uppercase transform`).not.toMatch(/text-transform:\s*uppercase/i);
      expect(css, `${relPath} italic emphasis`).not.toMatch(/font-style:\s*italic/i);
      expect(css, `${relPath} non-repeating gradient`).not.toMatch(/(?<!repeating-)(?:linear|radial)-gradient\(/i);
      expect(css, `${relPath} backdrop-filter blur`).not.toMatch(/^\s*(?:-webkit-)?backdrop-filter:(?!\s*none\b)/m);
      expect(css, `${relPath} transition: all`).not.toMatch(/transition:\s*all\b/i);
    }
  });

  it('repairs light-mode WCAG AA contrast on info-dot, compound-base-label, and chart legend text while preserving pattern swatches (R1)', () => {
    const stylesCss = readFileSync(resolve(rootDir, 'src/styles.css'), 'utf8');

    // .info-dot and .compound-base-label use high-contrast --color-primary-ink (not raw --accent)
    expect(stylesCss).toMatch(/\.info-dot\s*\{[^}]*color:\s*var\(--color-primary-ink\)/s);
    expect(stylesCss).toMatch(/\.compound-base-label\s*\{[^}]*color:\s*var\(--color-primary-ink\)[^}]*font-size:\s*0\.75rem/s);

    // Legend labels render neutral readable text (--color-body) while ::before carries series color/pattern
    expect(stylesCss).toMatch(
      /\.compound-chart-legend\s+\.is-capital,\s*\.compound-chart-legend\s+\.is-growth,\s*\.compound-chart-legend\s+\.is-real\s*\{\s*color:\s*var\(--color-body\)/s
    );
    expect(stylesCss).toMatch(
      /\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-required,\s*\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-current,\s*\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-target\s*\{\s*color:\s*var\(--color-body\)/s
    );
    expect(stylesCss).not.toMatch(/\.compound-chart-legend\s+\.is-growth\s*\{\s*color:\s*var\(--compound-growth\)/);
    expect(stylesCss).not.toMatch(/\.compound-chart-legend\s+\.is-real\s*\{\s*color:\s*var\(--warm\)/);
    expect(stylesCss).not.toMatch(/\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-current\s*\{\s*color:\s*var\(--savings-current\)/);
    expect(stylesCss).not.toMatch(/\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-target\s*\{\s*color:\s*var\(--savings-target\)/);
    expect(stylesCss).toContain('.compound-chart-legend .is-growth::before');
    expect(stylesCss).toContain('.compound-chart-legend .is-real::before');
    expect(stylesCss).toContain('.savings-runway-chart .compound-chart-legend .is-current::before');
    expect(stylesCss).toContain('.savings-runway-chart .compound-chart-legend .is-target::before');
    expect(stylesCss).toMatch(/\.savings-runway-chart\s+\.compound-chart-legend\s+\.is-current::before\s*\{[^}]*repeating-linear-gradient\(/s);
  });

  it('eliminates unstyled browser-default links and syncs dark-mode body overscroll background (R2)', () => {
    const studiosCss = readFileSync(resolve(rootDir, 'src/studios.css'), 'utf8');
    const workspaceCss = readFileSync(resolve(rootDir, 'src/workspace.css'), 'utf8');
    const stylesCss = readFileSync(resolve(rootDir, 'src/styles.css'), 'utf8');

    expect(studiosCss).toMatch(/\.starting-path-card\s*\{[^}]*color:\s*var\(--color-body\)/s);
    expect(workspaceCss).toMatch(/\.calculator-methodology-panel\s+a[^}]*color:\s*var\(--color-primary-ink\)/s);
    expect(stylesCss).toMatch(/body:has\(\.app\[data-mode="dark"\]\)/);
  });

  it('renders AuthGate H1 titles without trailing periods across all auth states (R3)', () => {
    const states: AuthState[] = [
      { provider: 'clerk', status: 'not-configured', isConfigured: false, isSignedIn: false, missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'], user: null },
      { provider: 'clerk', status: 'loading', isConfigured: true, isSignedIn: false, getToken: async () => null, user: null },
      { provider: 'clerk', status: 'signed-out', isConfigured: true, isSignedIn: false, getToken: async () => null, user: null }
    ];

    for (const auth of states) {
      const html = renderToStaticMarkup(<AuthGate auth={auth} route="/dashboard" onNavigate={() => {}} />);
      const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      expect(h1Match?.[1], `Missing AuthGate H1 for ${auth.status}`).toBeTruthy();
      expect(h1Match?.[1], `Trailing period on AuthGate H1 for ${auth.status}`).not.toMatch(/\.$/);
    }
  });
});
