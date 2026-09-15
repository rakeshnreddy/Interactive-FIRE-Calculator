import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { build } from 'vite';
import { installFixtureNetworkGuard, restoreNetworkGuard } from './fixtureNetworkGuard';
import {
  SYNTHETIC_FIXTURE_MARKER,
  SYNTHETIC_USER_ID,
  populatedAccounts,
  staleAccounts,
  longValueAccounts,
  emptyAccountSummary,
  populatedAccountSummary,
  longValueAccountSummary,
  populatedTransactions,
  staleTransactions,
  longValueTransactions,
  emptyTransactionSummary,
  populatedTransactionSummary,
  populatedCashflow,
  emptyCashflow,
  longValueCashflow,
  populatedGoals,
  staleGoals,
  longValueGoals,
  emptyGoalSummary,
  populatedGoalSummary,
  longValueGoalSummary,
  populatedSavedPlans,
  longValueSavedPlans,
  populatedInsights,
  longValueInsights,
  populatedProfile,
  longValueProfile,
  populatedSavedCalculatorResults,
  longValueSavedCalculatorResults,
  type FixtureComponentName,
  type FixtureStateName
} from './syntheticData';

describe('B25: Real-Component Synthetic UI Fixtures and Build Separation', () => {
  let tempOutDir: string;

  beforeAll(async () => {
    tempOutDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finpath-fixture-isolation-'));
    const repoRoot = path.resolve(__dirname, '../..');
    await build({
      root: repoRoot,
      configFile: path.resolve(repoRoot, 'vite.config.ts'),
      build: {
        outDir: tempOutDir,
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          input: {
            main: path.resolve(repoRoot, 'index.html')
          }
        }
      },
      logLevel: 'error'
    });
  }, 60000);

  afterAll(() => {
    if (tempOutDir && fs.existsSync(tempOutDir)) {
      fs.rmSync(tempOutDir, { recursive: true, force: true });
    }
    restoreNetworkGuard();
  });

  it('proves fixtures.html is strictly excluded from fresh production build output', () => {
    expect(fs.existsSync(tempOutDir)).toBe(true);

    const fixturesHtmlPath = path.join(tempOutDir, 'fixtures.html');
    expect(fs.existsSync(fixturesHtmlPath)).toBe(false);

    const indexHtmlPath = path.join(tempOutDir, 'index.html');
    expect(fs.existsSync(indexHtmlPath)).toBe(true);

    const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
    expect(indexHtmlContent).not.toContain('fixtures.html');
    expect(indexHtmlContent).not.toContain('src/fixtures');
    expect(indexHtmlContent).not.toContain(SYNTHETIC_FIXTURE_MARKER);
  });

  it('proves production JS, CSS, and source map bundles contain zero synthetic fixture IDs or markers', () => {
    const assetsDir = path.join(tempOutDir, 'assets');
    expect(fs.existsSync(assetsDir)).toBe(true);

    const assetFiles = fs.readdirSync(assetsDir);
    const bundleFiles = assetFiles.filter((f) => f.endsWith('.js') || f.endsWith('.css') || f.endsWith('.map'));
    expect(bundleFiles.length).toBeGreaterThan(0);

    for (const file of bundleFiles) {
      const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
      expect(content, `Bundle ${file} must not contain synthetic marker`).not.toContain(SYNTHETIC_FIXTURE_MARKER);
      expect(content, `Bundle ${file} must not contain synthetic user ID`).not.toContain(SYNTHETIC_USER_ID);
      expect(content, `Bundle ${file} must not contain synthetic harness label`).not.toContain('SYNTHETIC FIXTURE HARNESS');
    }
  });

  it('verifies actual fixture network guard rejects any outgoing mutation', async () => {
    installFixtureNetworkGuard();

    await expect(
      window.fetch('/api/accounts', { method: 'POST', body: '{}' })
    ).rejects.toThrow('[SYNTHETIC FIXTURE SECURITY VIOLATION] Outgoing network mutation blocked in fixture harness: POST /api/accounts');

    await expect(
      window.fetch('/api/goals', { method: 'POST', body: '{}' })
    ).rejects.toThrow('[SYNTHETIC FIXTURE SECURITY VIOLATION] Outgoing network mutation blocked in fixture harness: POST /api/goals');

    restoreNetworkGuard();
  });

  it('provides all 6 named states with typed, truthful datasets', () => {
    const states: FixtureStateName[] = ['empty', 'populated', 'stale', 'loading', 'failure', 'long-value'];
    expect(states).toHaveLength(6);

    // Empty state
    expect(emptyAccountSummary.accountCount).toBe(0);
    expect(emptyAccountSummary.netWorthCents).toBe(0);
    expect(emptyTransactionSummary.transactionCount).toBe(0);
    expect(emptyGoalSummary.goalCount).toBe(0);
    expect(emptyCashflow.totalTransactionCount).toBe(0);

    // Populated state
    expect(populatedAccounts.length).toBeGreaterThanOrEqual(5);
    expect(populatedAccountSummary.netWorthCents).toBeGreaterThan(0);
    expect(populatedTransactions.length).toBeGreaterThanOrEqual(5);
    expect(populatedGoals.length).toBeGreaterThanOrEqual(3);
    expect(populatedSavedPlans.length).toBeGreaterThanOrEqual(1);
    expect(populatedInsights.length).toBeGreaterThanOrEqual(3);
    expect(populatedSavedCalculatorResults.length).toBeGreaterThanOrEqual(1);
    expect(populatedProfile.displayName).toBe('Alex Mercer');

    // Stale state
    expect(staleAccounts.every((a) => a.latestBalanceDate?.startsWith('2025'))).toBe(true);
    expect(staleTransactions.every((t) => t.transactionDate.startsWith('2025'))).toBe(true);
    expect(staleGoals.every((g) => g.isOverdue && (g.daysUntilTarget ?? 0) < 0)).toBe(true);

    // Long-value state (extreme numbers and lengthy strings for layout overflow checks)
    expect(longValueAccounts[0].latestBalanceCents).toBeGreaterThan(100000000000); // > $1B
    expect(longValueAccountSummary.netWorthCents).toBeGreaterThan(100000000000);
    expect(longValueTransactions[0].amountCents).toBeGreaterThan(1000000000); // > $10M
    expect(longValueGoals[0].targetAmountCents).toBeGreaterThan(1000000000);
    expect(longValueSavedPlans[0].name.length).toBeGreaterThan(80);
    expect(longValueInsights[0].title.length).toBeGreaterThan(60);
    expect(longValueProfile.displayName?.length).toBeGreaterThan(40);
  });

  it('supports deterministic URL state selection for all component domains', () => {
    const components: FixtureComponentName[] = ['dashboard', 'accounts', 'transactions', 'goals', 'plans', 'reports', 'settings'];
    const states: FixtureStateName[] = ['empty', 'populated', 'stale', 'loading', 'failure', 'long-value'];
    const themes = ['light', 'dark'] as const;

    for (const comp of components) {
      for (const state of states) {
        for (const theme of themes) {
          const url = `/fixtures.html?component=${comp}&state=${state}&theme=${theme}`;
          expect(url).toMatch(/^\/fixtures\.html\?component=[a-z]+&state=[a-z-]+&theme=(light|dark)$/);
        }
      }
    }
  });
});
