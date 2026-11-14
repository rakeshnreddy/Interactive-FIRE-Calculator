import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { CalculatorLibrary } from './CalculatorLibrary';
import type { AuthState } from './auth';

vi.mock('@clerk/react', () => ({
  SignUpButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SignInButton: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  UserButton: () => null,
  SignOutButton: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const mockAuth: AuthState = {
  provider: 'clerk',
  status: 'not-configured',
  isConfigured: false,
  isSignedIn: false,
  missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
  user: null
};

const mockSaveResult = async () => ({
  destinationRoute: '/plans' as const,
  message: '',
  savedResultId: '1'
});

describe('B74 / C36 — Unslop Stage A: Calculator library & shared studio template', () => {
  const rootDir = resolve(__dirname, '..');
  const appCssPath = resolve(rootDir, 'src/app.css');
  const studiosCssPath = resolve(rootDir, 'src/studios.css');
  const stylesCssPath = resolve(rootDir, 'src/styles.css');
  const shellCssPath = resolve(rootDir, 'src/shell.css');
  const vividThemeCssPath = resolve(rootDir, 'src/vivid-theme.css');

  it('registers @layer studios in src/app.css and imports ./studios.css', () => {
    const appCss = readFileSync(appCssPath, 'utf8');
    expect(appCss).toMatch(/@layer\s+accessibility,\s*legacy,\s*tokens,\s*home,\s*studios,\s*shell;/);
    expect(appCss).toContain("@import './studios.css';");
    expect(existsSync(studiosCssPath)).toBe(true);
  });

  it('defines @layer studios with zero uppercase slop, weights <= 600, strict 4px spacing, nested radii, and tabular numerals', () => {
    expect(existsSync(studiosCssPath)).toBe(true);
    const studiosCss = readFileSync(studiosCssPath, 'utf8');

    expect(studiosCss).toContain('@layer studios');
    // Pass 4 & 5: No uppercase tracked labels, no heavy 700-900 weights, no pill 999px overload
    expect(studiosCss).not.toMatch(/text-transform:\s*uppercase/i);
    expect(studiosCss).not.toMatch(/font-weight:\s*(620|650|700|750|780|800|820|850|900)/);
    expect(studiosCss).not.toMatch(/border-radius:\s*999px/);

    // Pass 1: Strict 4px spacing grid across padding, margin, and gap declarations
    const spacingLines = studiosCss.match(/(?:padding|margin|gap)[^;]*;/g) ?? [];
    for (const decl of spacingLines) {
      expect(decl, `Off-4px spacing in declaration: ${decl}`).not.toMatch(/\b(2|6|10|14|18|22)px\b/);
    }

    // Pass 5: Tabular figures on all numeric studio outputs and tables
    expect(studiosCss).toContain('font-variant-numeric: tabular-nums');
    expect(studiosCss).toContain('.calculator-result-metric strong');
    expect(studiosCss).toContain('.calculator-comparison-grid strong');
    expect(studiosCss).toContain('.calculator-driver-list em');
    expect(studiosCss).toContain('.calculator-chart-val strong');
    expect(studiosCss).toContain('.calculator-breakdown-table-wrap td');
    expect(studiosCss).toContain('.calculator-chart-table');

    // Pass 3: Bare muted icons without tinted icon badge containers
    expect(studiosCss).toMatch(/\.calculator-library\s+:is\([^)]*\.feature-icon[^)]*\)/);
  });

  it('retires radial atmosphere blobs, multi-stop action gradients, legacy !important th weights, 620 eyebrow weight, and 3px colored top card borders', () => {
    const vividCss = readFileSync(vividThemeCssPath, 'utf8');
    const stylesCss = readFileSync(stylesCssPath, 'utf8');
    const shellCss = readFileSync(shellCssPath, 'utf8');

    // Pass 2: No radial color blobs or text gradients
    expect(vividCss).toMatch(/--app-atmosphere:\s*none;/);
    expect(vividCss).toMatch(/--text-gradient:\s*none;/);
    expect(vividCss).not.toMatch(/\.calculator-input-panel\s*\{\s*border-top:\s*3px/);
    expect(vividCss).not.toMatch(/\.calculator-result-panel\s*\{\s*border-top:\s*3px/);
    expect(vividCss).not.toMatch(/\.calculator-card-fire\s*\{\s*border-top:\s*3px/);

    // Cascade safety: legacy table header rule must not force 850 !important
    expect(stylesCss).not.toMatch(/font-weight:\s*850\s*!important/);
    expect(shellCss).toMatch(/\.app\s+\.eyebrow[\s\S]*?font-weight:\s*600;/);
  });

  it.each([
    '/calculators',
    '/calculators/mortgage',
    '/calculators/sip',
    '/calculators/retirement',
    '/calculators/income-tax-india'
  ])('renders %s with clean copy (no emojis, exclamation marks, or headline periods) and intact studio landmarks', (route) => {
    const html = renderToStaticMarkup(
      <CalculatorLibrary
        auth={mockAuth}
        route={route}
        onNavigate={() => {}}
        onSaveResult={mockSaveResult}
        savedResults={[]}
      />
    );

    // Pass 3 & 4: No emojis or exclamation marks in UI text
    expect(html).not.toContain('!');
    expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2728}]/u);

    if (route === '/calculators') {
      expect(html).toContain('calculator-library');
      expect(html).toContain('calculator-toolkit-grid');
      expect(html).toContain('>Start with the question, not the formula</h1>');
    } else {
      expect(html).toContain('calculator-detail-grid');
      expect(html).toContain('calculator-input-panel');
      expect(html).toContain('calculator-result-panel');
      expect(html).toContain('calculator-scenario-panel');
      expect(html).toContain('calculator-engagement-shell');
    }
  });
});
