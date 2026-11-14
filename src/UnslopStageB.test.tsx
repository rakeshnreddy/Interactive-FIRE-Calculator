import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { HeroFireExample } from './HeroFireExample';
import { ProjectionChart } from './ProjectionChart';
import { PrivacyControlsPanel } from './settings/PrivacyControlsPanel';
import { ReportsPanel } from './reports/ReportsPanel';
import { buildReportScope } from './reports/reportScope';
import type { FinancialInsight } from './lib/insights';

const rootDir = resolve(__dirname, '..');

function extractSvgElements(html: string): string[] {
  return html.match(/<svg\b[^>]*class="[^"]*lucide[^"]*"[^>]*>/g) ?? [];
}

describe('B76 / C39 — Unslop Stage B: Dedicated calculators, chart chrome, workspace & legacy CSS retirement', () => {
  const appCssPath = resolve(rootDir, 'src/app.css');
  const workspaceCssPath = resolve(rootDir, 'src/workspace.css');
  const stylesCssPath = resolve(rootDir, 'src/styles.css');
  const vividThemeCssPath = resolve(rootDir, 'src/vivid-theme.css');

  it('registers @layer workspace in src/app.css after studios and before shell, with strict 4px spacing and quiet tokens in src/workspace.css', () => {
    const appCss = readFileSync(appCssPath, 'utf8');
    expect(appCss).toMatch(/@layer\s+accessibility,\s*legacy,\s*tokens,\s*home,\s*studios,\s*workspace,\s*shell;/);
    expect(appCss).toContain("@import './workspace.css';");
    expect(existsSync(workspaceCssPath)).toBe(true);

    const workspaceCss = readFileSync(workspaceCssPath, 'utf8');
    expect(workspaceCss).toContain('@layer workspace');
    expect(workspaceCss).not.toMatch(/text-transform:\s*uppercase/i);
    expect(workspaceCss).not.toMatch(/font-weight:\s*(6[1-9]\d|[7-9]\d\d)/);
    expect(workspaceCss).not.toMatch(/border-radius:\s*999px/);
    expect(workspaceCss).not.toMatch(/(?<!repeating-)(?:linear|radial)-gradient\(/i);
    expect(workspaceCss).not.toMatch(/^\s*(?:-webkit-)?backdrop-filter:(?!\s*none\b)/m);

    const spacingLines = workspaceCss.match(/(?:padding|margin|gap)[^;]*;/g) ?? [];
    for (const decl of spacingLines) {
      expect(decl, `Off-4px spacing in declaration: ${decl}`).not.toMatch(/\b(2|6|10|14|18|22)px\b/);
    }

    expect(workspaceCss).toContain('font-variant-numeric: tabular-nums');
    expect(workspaceCss).toContain('.insight-evidence-grid strong');
    expect(workspaceCss).toContain('.feature-icon');
    expect(workspaceCss).toContain('@media (prefers-reduced-motion: reduce)');
    expect(workspaceCss).toMatch(/\.route-shell:not\(\.calculator-library\)[\s\S]*vehicle-title[\s\S]*dated-return-title[\s\S]*>\s*\.route-heading/);
    expect(workspaceCss).toMatch(/\.icon-button\.row-action\s*\{[^}]*padding:\s*0;/s);
    expect(workspaceCss).not.toMatch(/:is\([^)]*\.row-action[^)]*\)\s*\{[^}]*padding:\s*8px 16px/s);
    expect(workspaceCss).toMatch(/\.insight-action-row[\s\S]*border-radius:\s*8px/);
  });

  it('retires all remaining visual slop from src/styles.css and src/vivid-theme.css while preserving repeating-linear-gradient pattern fills', () => {
    const stylesCss = readFileSync(stylesCssPath, 'utf8');
    const vividCss = readFileSync(vividThemeCssPath, 'utf8');

    for (const [label, css] of [
      ['src/styles.css', stylesCss],
      ['src/vivid-theme.css', vividCss]
    ] as const) {
      expect(css, `${label} font-weight > 600`).not.toMatch(
        /font-weight:\s*(6[1-9]\d|[7-9]\d\d)/
      );
      expect(css, `${label} uppercase transform`).not.toMatch(/text-transform:\s*uppercase/i);
      expect(css, `${label} backdrop-filter blur`).not.toMatch(
        /^\s*(?:-webkit-)?backdrop-filter:(?!\s*none\b)/m
      );
      expect(css, `${label} non-repeating gradient`).not.toMatch(
        /(?<!repeating-)(?:linear|radial)-gradient\(/i
      );
      expect(css, `${label} 999px pill radius`).not.toMatch(/border-radius:\s*999px/);
      expect(css, `${label} 20px card radius`).not.toMatch(/border-radius:\s*20px/);
      expect(css, `${label} hover translateY lift`).not.toMatch(/translateY\(-[123]px\)/);
      expect(css, `${label} must retain repeating-linear-gradient pattern redundancy`).toMatch(
        /repeating-linear-gradient\(/
      );
    }

    expect(stylesCss).not.toContain('--mood-gradient');
    expect(stylesCss).not.toContain('.mood-dot');
    expect(stylesCss).not.toMatch(/font-style:\s*italic/i);
    expect(stylesCss).not.toMatch(/#494fdf/i);
    expect(vividCss).not.toMatch(/--hero-scrim:\s*linear-gradient/i);
    expect(vividCss).not.toContain('--glass');
    expect(vividCss).not.toContain('--action-gradient');
  });

  it('quiets Recharts chart chrome in src/ProjectionChart.tsx and strips trailing periods from workspace headings in src/App.tsx', () => {
    const projectionSrc = readFileSync(resolve(rootDir, 'src/ProjectionChart.tsx'), 'utf8');
    expect(projectionSrc).toContain('vertical={false}');
    expect(projectionSrc).toContain('strokeWidth={2}');
    expect(projectionSrc).not.toContain('strokeWidth={3}');

    const appSrc = readFileSync(resolve(rootDir, 'src/App.tsx'), 'utf8');
    expect(appSrc).toContain('<h1 id="plans-title">Build a plan you can revisit</h1>');
    expect(appSrc).not.toContain('Build a plan you can revisit.');
    expect(appSrc).not.toContain('warning.severity.toUpperCase()');
    const smokeSrc = readFileSync(resolve(rootDir, 'scripts/smoke/c39-unslop-stage-b.mjs'), 'utf8');
    expect(smokeSrc).toContain("getByRole('tab', { name: 'Results' })");
    const platformBlock = appSrc.match(/const platformPages\b[\s\S]*?^\s*\};\s*$/m)?.[0] ?? '';
    expect(platformBlock.length).toBeGreaterThan(100);
    for (const match of platformBlock.matchAll(/title:\s*'([^']+)'/g)) {
      expect(match[1], `platformPages title has trailing period: ${match[1]}`).not.toMatch(/\.$/);
    }
  });

  it('standardizes Lucide icons to strokeWidth=1.5 with clean copy across rendered Stage B components', () => {
    const sampleInsight: FinancialInsight = {
      id: 'i1',
      area: 'accounts',
      category: 'observation',
      priority: 'high',
      title: 'Balances need refresh',
      rationale: 'One account balance is over 45 days old.',
      action: 'Update account balance',
      assumptions: ['Balances older than 45 days are marked stale.'],
      uncertainty: 'Unrecorded market changes are excluded.',
      route: '/accounts',
      evidence: [{ label: 'Stale accounts', value: '1' }]
    };

    const fragments = [
      renderToStaticMarkup(<HeroFireExample />),
      renderToStaticMarkup(
        <ProjectionChart
          label="Retirement projection"
          rows={[
            { year: 1, balance: 1_000_000, withdrawal: 40_000 },
            { year: 2, balance: 1_020_000, withdrawal: 41_200 }
          ]}
          startAge={60}
          currency="USD"
        />
      ),
      renderToStaticMarkup(
        <PrivacyControlsPanel
          confirmationPhrase="DELETE FINPATH DATA"
          deleteConfirmation=""
          isDeleting={false}
          isExporting={false}
          status={null}
          onDelete={() => {}}
          onDeleteConfirmationChange={() => {}}
          onExport={() => {}}
        />
      ),
      renderToStaticMarkup(
        <ReportsPanel
          insights={[sampleInsight]}
          onNavigate={() => {}}
          scope={buildReportScope({
            accounts: [],
            goals: [],
            transactions: [],
            planLabel: 'Base retirement plan',
            today: '2026-11-10'
          })}
        />
      )
    ];

    for (const html of fragments) {
      expect(html).not.toContain('!');
      expect(html).not.toMatch(/[\u{1F300}-\u{1FAFF}\u{2728}]/u);
      for (const svgTag of extractSvgElements(html)) {
        expect(svgTag, `Expected stroke-width="1.5" on Lucide icon: ${svgTag}`).toContain(
          'stroke-width="1.5"'
        );
      }
    }
  });
});
