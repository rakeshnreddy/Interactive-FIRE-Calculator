#!/usr/bin/env node

/**
 * C09 Verification & Evidence Capture Harness
 * Covers B10 (Exact Saved FIRE Decision Navigation),
 * B11 (Monthly Plan Review Persistence & Due Status Loop),
 * and B28 (Goals & Monthly Review Presentation).
 *
 * Target: preview deployment 51acbf88-db0a-47d1-b399-814dad835a9b
 * on finpath-preview D1 database 0dbad68e-7493-452f-8504-98d4c61ee5da.
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createClerkClient } from '@clerk/backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

// Historical proven constants preserved for report provenance checking & test baseline
export const HISTORICAL_CANDIDATE_SHA = '5dda3d2be24246e3470a65e7653a0b6e425cbece';
export const HISTORICAL_DEPLOYMENT_ID = '51acbf88-db0a-47d1-b399-814dad835a9b';
export const HISTORICAL_PREVIEW_URL = 'https://51acbf88.interactive-fire-calculator.pages.dev';

// Default export values for backward-compatibility in existing unit test suites
export const CANDIDATE_SHA = process.env.C09_CANDIDATE_SHA || HISTORICAL_CANDIDATE_SHA;
export const DEPLOYMENT_ID = process.env.C09_DEPLOYMENT_ID || HISTORICAL_DEPLOYMENT_ID;
export const PREVIEW_URL = process.env.C09_PREVIEW_URL || HISTORICAL_PREVIEW_URL;
export const PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
export const ACCOUNT_ID = '4e1b7f6a7440770a01779a67602ec5e9';
export const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const WRANGLER_CONFIG = join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');

export async function loadCalculateFirePlan() {
  try {
    const mod = await import('../../../../src/lib/fire.ts');
    if (typeof mod?.calculateFirePlan === 'function') {
      return mod.calculateFirePlan;
    }
  } catch (err) {
    // If native TS import fails (e.g. Node < 22.6), fall through to transpiler fallback
  }

  const ts = (await import('typescript')).default;
  const fs = await import('node:fs');
  const path = await import('node:path');
  const fireTsPath = path.resolve(REPO_ROOT, 'src/lib/fire.ts');
  const tsCode = fs.readFileSync(fireTsPath, 'utf8');
  const transpiled = ts.transpileModule(tsCode, {
    compilerOptions: { module: ts.ModuleKind.ESNext }
  }).outputText;
  const dataUri = `data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`;
  const mod = await import(dataUri);
  return mod.calculateFirePlan;
}

export async function loadChromium() {
  try {
    const mod = await import('playwright');
    if (mod?.chromium) return mod.chromium;
  } catch {}
  try {
    const mod = await import('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    if (mod?.chromium) return mod.chromium;
  } catch {}
  throw new Error('Playwright chromium is unavailable');
}

export const EVIDENCE_DIR = join(REPO_ROOT, 'docs/execution/evidence/C09');
export const SCREENSHOTS_DIR = join(EVIDENCE_DIR, 'screenshots');
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
export const REPORT_FILE = join(EVIDENCE_DIR, 'report.json');
export const CLEANUP_FILE = join(EVIDENCE_DIR, 'cleanup.json');
export const PRIVATE_MANIFEST_FILE = resolve(REPO_ROOT, '.env.manifest.local');

export const USER_TABLES = [
  'plan_reviews',
  'user_profiles',
  'financial_accounts',
  'account_balances',
  'transactions',
  'goals',
  'plans',
  'plan_versions',
  'fire_plan_inputs',
  'fire_plan_results',
  'assumptions',
  'balance_imports',
  'transaction_imports',
  'saved_calculator_results',
  'audit_log'
];

export function readEnv(envFilePath = resolve(REPO_ROOT, '.env.preview.local')) {
  const env = { ...process.env };
  if (!existsSync(envFilePath)) return env;
  const stats = statSync(envFilePath);
  const mode = stats.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`Insecure permissions on ${envFilePath}: mode is ${mode.toString(8)}, expected 0600`);
  }
  const content = readFileSync(envFilePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

export function getCloudflareToken() {
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token && existsSync(WRANGLER_CONFIG)) {
    const content = readFileSync(WRANGLER_CONFIG, 'utf8');
    const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) token = match[1];
  }
  return token;
}

export async function queryD1(sql, params = []) {
  const token = getCloudflareToken();
  if (!token) throw new Error('Cloudflare API token unavailable');

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${PREVIEW_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result?.[0]?.results || [];
}

export function validateDeploymentInputs(env = process.env) {
  const candidateSha = env.C09_CANDIDATE_SHA?.trim();
  const deploymentId = env.C09_DEPLOYMENT_ID?.trim();
  const previewUrl = env.C09_PREVIEW_URL?.trim()?.replace(/\/+$/, '');

  const errors = [];
  if (!candidateSha) {
    errors.push('Missing required environment variable: C09_CANDIDATE_SHA');
  } else if (!/^[0-9a-f]{40}$/i.test(candidateSha)) {
    errors.push(`Invalid C09_CANDIDATE_SHA format: expected 40-character hex SHA, got "${candidateSha}"`);
  }

  if (!deploymentId) {
    errors.push('Missing required environment variable: C09_DEPLOYMENT_ID');
  } else if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(deploymentId)) {
    errors.push(`Invalid C09_DEPLOYMENT_ID format: expected UUID, got "${deploymentId}"`);
  }

  if (!previewUrl) {
    errors.push('Missing required environment variable: C09_PREVIEW_URL');
  } else if (!/^https:\/\/[a-z0-9-]+\.interactive-fire-calculator\.pages\.dev$/i.test(previewUrl)) {
    errors.push(`Invalid C09_PREVIEW_URL format: expected https://<subdomain>.interactive-fire-calculator.pages.dev, got "${previewUrl}"`);
  }

  if (errors.length > 0) {
    const error = new Error(`Deployment preflight validation failed:\n${errors.join('\n')}`);
    error.errors = errors;
    throw error;
  }

  return {
    candidateSha,
    deploymentId,
    previewUrl,
    previewDbId: PREVIEW_DB_ID,
    accountId: ACCOUNT_ID
  };
}

export async function verifyDeployment(config = null, fetchFn = fetch, token = getCloudflareToken()) {
  const deploymentConfig = config || (process.env.C09_CANDIDATE_SHA ? validateDeploymentInputs() : {
    candidateSha: CANDIDATE_SHA,
    deploymentId: DEPLOYMENT_ID,
    previewUrl: PREVIEW_URL,
    previewDbId: PREVIEW_DB_ID,
    accountId: ACCOUNT_ID
  });
  const { candidateSha, deploymentId, previewUrl, previewDbId, accountId } = deploymentConfig;

  if (!token) throw new Error('Cloudflare API token unavailable');

  const response = await fetchFn(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/pages/projects/interactive-fire-calculator/deployments/${deploymentId}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const payload = await response.json();
  const deployment = payload.result;

  if (!response.ok || !payload.success) {
    throw new Error(`Deployment query failed: ${JSON.stringify(payload.errors || response.statusText)}`);
  }
  if (deployment?.environment !== 'preview') {
    throw new Error(`Deployment environment must be "preview", got "${deployment?.environment}"`);
  }
  if (deployment?.url !== previewUrl) {
    throw new Error(`Deployment URL mismatch: expected "${previewUrl}", got "${deployment?.url}"`);
  }
  if (deployment?.latest_stage?.status !== 'success') {
    throw new Error(`Deployment latest stage status must be "success", got "${deployment?.latest_stage?.status}"`);
  }
  const commitHash = deployment?.deployment_trigger?.metadata?.commit_hash;
  if (commitHash !== candidateSha) {
    throw new Error(`Deployment commit hash mismatch: expected "${candidateSha}", got "${commitHash}"`);
  }
  const dbId = deployment?.d1_databases?.DB?.id;
  if (dbId !== previewDbId) {
    throw new Error(`Deployment D1 database mismatch: expected "${previewDbId}", got "${dbId}"`);
  }

  return {
    verified: true,
    candidateSha,
    deploymentId,
    previewUrl,
    previewDbId
  };
}

export function generateDisposablePassword() {
  const randBytes = crypto.randomBytes(18).toString('base64url');
  return `FinPath!${randBytes}#9`;
}

export function recordManifestUser(userId) {
  let manifest = { users: [], createdAt: new Date().toISOString() };
  if (existsSync(PRIVATE_MANIFEST_FILE)) {
    try {
      manifest = JSON.parse(readFileSync(PRIVATE_MANIFEST_FILE, 'utf8'));
    } catch {}
  }
  if (!manifest.users.includes(userId)) manifest.users.push(userId);
  writeFileSync(PRIVATE_MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
}

export async function setupClerkInterception(context, testingToken, fapi) {
  if (!fapi) return;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fapiRegex = new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`);

  await context.route(fapiRegex, async (route) => {
    try {
      const url = new URL(route.request().url());
      if (testingToken) {
        url.searchParams.set('__clerk_testing_token', testingToken);
      }
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    } catch {
      await route.continue().catch(() => {});
    }
  });
}

// --------------------------------------------------------------------------
// WCAG 2.1 Color Contrast Utilities
// --------------------------------------------------------------------------
export function parseRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return { r: NaN, g: NaN, b: NaN, a: NaN };
  const str = colorStr.trim();
  const rgbMatch = str.match(/^rgba?\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (a !== 1) {
      return { r: NaN, g: NaN, b: NaN, a: NaN };
    }
    const [r, g, b] = [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
    if ([r, g, b].some(c => isNaN(c) || c < 0 || c > 255)) return { r: NaN, g: NaN, b: NaN, a: NaN };
    return { r, g, b, a: 1 };
  }
  if (str.startsWith('#')) {
    const hex = str.replace('#', '');
    if (hex.length === 3 && /^[0-9a-f]{3}$/i.test(hex)) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
  }
  return { r: NaN, g: NaN, b: NaN, a: NaN };
}

export function sRgbLuminance(r, g, b) {
  if (isNaN(r) || isNaN(g) || isNaN(b)) return NaN;
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(textColorStr, bgColorStr) {
  const fg = parseRgb(textColorStr);
  const bg = parseRgb(bgColorStr);
  if (isNaN(fg.r) || isNaN(fg.g) || isNaN(fg.b) || isNaN(bg.r) || isNaN(bg.g) || isNaN(bg.b)) {
    return NaN;
  }
  const lum1 = sRgbLuminance(fg.r, fg.g, fg.b);
  const lum2 = sRgbLuminance(bg.r, bg.g, bg.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export async function switchTheme(page, targetMode) {
  const currentMode = await page.evaluate(() => {
    return document.querySelector('.app')?.getAttribute('data-mode') || 'light';
  });

  if (currentMode !== targetMode) {
    const toggleButton = page.locator('button[aria-label="Switch to dark mode"], button[aria-label="Switch to light mode"]').first();
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
    } else {
      await page.evaluate((mode) => {
        window.localStorage.setItem('finpath.colorMode', mode);
      }, targetMode);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await page.waitForFunction((mode) => {
      const app = document.querySelector('.app');
      return app && app.getAttribute('data-mode') === mode;
    }, targetMode, { timeout: 5000 });
  }

  await page.emulateMedia({ colorScheme: targetMode });
  await page.waitForTimeout(200);

  const themeProps = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const style = window.getComputedStyle(app);
    return {
      canvas: style.getPropertyValue('--color-canvas').trim(),
      heading: style.getPropertyValue('--color-heading').trim(),
      bodyColor: style.getPropertyValue('--color-body').trim(),
      surface: style.getPropertyValue('--color-surface').trim(),
      dataMode: app.getAttribute('data-mode')
    };
  });

  if (targetMode === 'dark') {
    if (themeProps.dataMode !== 'dark') {
      throw new Error(`Failed to activate dark mode: data-mode is "${themeProps.dataMode}"`);
    }
  } else {
    if (themeProps.dataMode !== 'light') {
      throw new Error(`Failed to activate light mode: data-mode is "${themeProps.dataMode}"`);
    }
  }

  return themeProps;
}

// --------------------------------------------------------------------------
// Target Locator Screenshot Verification Helpers
// --------------------------------------------------------------------------
export async function assertTargetLocatorVisible(locator, name = 'Target locator') {
  if (!locator) {
    throw new Error(`${name} is missing or undefined`);
  }
  if (typeof locator.all === 'function') {
    const items = await locator.all().catch(() => []);
    for (const item of items) {
      const visible = typeof item?.isVisible === 'function'
        ? await item.isVisible().catch(() => false)
        : false;
      if (visible) {
        return item;
      }
    }
  } else if (typeof locator.count === 'function' && typeof locator.nth === 'function') {
    const count = await locator.count().catch(() => 0);
    for (let i = 0; i < count; i++) {
      const item = locator.nth(i);
      const visible = typeof item?.isVisible === 'function'
        ? await item.isVisible().catch(() => false)
        : false;
      if (visible) {
        return item;
      }
    }
  }
  const target = typeof locator.first === 'function' ? locator.first() : locator;
  const visible = typeof target?.isVisible === 'function'
    ? await target.isVisible().catch(() => false)
    : false;
  if (!visible) {
    throw new Error(`${name} is not visible on page`);
  }
  return target;
}

// --------------------------------------------------------------------------
// Planning Workspace Readiness and Hydration Verification Helper
// --------------------------------------------------------------------------
export async function waitForPlanningWorkspaceReady(page, {
  expectedPlanId,
  expectedVersion,
  timeout = 15000,
  contextLabel = 'Planning Workspace Version Ready',
  screenshotsDir = null
} = {}) {
  if (!page) {
    throw new Error(`[${contextLabel}] Playwright page object is required`);
  }

  const currentUrl = page.url();
  let parsedUrl = null;
  try {
    parsedUrl = new URL(currentUrl);
  } catch {
    throw new Error(`[${contextLabel}] Malformed current URL: "${currentUrl}"`);
  }

  // Ensure route points to /plans (unless about:blank in isolated tests)
  if (!parsedUrl.pathname.endsWith('/plans') && currentUrl !== 'about:blank') {
    throw new Error(`[${contextLabel}] Expected pathname to end with '/plans', got: "${parsedUrl.pathname}"`);
  }

  // Check expectedPlanId and expectedVersion against search params if not about:blank
  if (currentUrl !== 'about:blank') {
    const urlPlanId = parsedUrl.searchParams.get('planId');
    const urlVersion = parsedUrl.searchParams.get('version');
    if (expectedPlanId && urlPlanId !== expectedPlanId) {
      throw new Error(`[${contextLabel}] Route planId mismatch: expected "${expectedPlanId}", got "${urlPlanId}"`);
    }
    if (expectedVersion !== undefined && urlVersion !== String(expectedVersion)) {
      throw new Error(`[${contextLabel}] Route version mismatch: expected "${expectedVersion}", got "${urlVersion}"`);
    }
  }

  const targetVersionStr = expectedVersion !== undefined ? `Version ${expectedVersion} loaded` : null;

  try {
    await page.waitForFunction(
      ({ targetVersionStr }) => {
        // 1. Terminal / Error states: stop waiting immediately
        const controlledError = document.querySelector('.planning-controlled-error, [data-testid="planning-error-state"]');
        if (controlledError && (controlledError.offsetParent !== null || controlledError.getClientRects().length > 0)) {
          return true;
        }
        const authGate = document.querySelector('.auth-gate-card, .auth-gate');
        if (authGate && (authGate.offsetParent !== null || authGate.getClientRects().length > 0)) {
          return true;
        }

        // 2. Overview version check
        const overview = document.querySelector('.planning-overview');
        const overviewText = overview ? (overview.innerText || overview.textContent || '') : '';
        const isTargetVersionLoaded = targetVersionStr ? overviewText.includes(targetVersionStr) : true;

        // 3. Review panel visibility check
        const panel = document.querySelector('.planning-review-panel');
        const isPanelVisible = panel && (panel.offsetParent !== null || panel.getClientRects().length > 0);

        // 4. If wrong version already settled while not loading
        const isLoading = Boolean(document.querySelector('.planning-loading-panel, [aria-busy="true"]'));
        if (!isLoading && targetVersionStr && overviewText.includes('Version ') && !isTargetVersionLoaded) {
          return true;
        }

        return isTargetVersionLoaded && isPanelVisible;
      },
      { targetVersionStr },
      { timeout }
    );
  } catch {
    // Timeout expired - proceed to extract safe diagnostics and fail explicitly
  }

  const diagnostics = await page.evaluate(() => {
    const getCounts = (selector) => {
      const list = document.querySelectorAll(selector);
      let visible = 0;
      for (const el of list) {
        if (el.offsetParent !== null || el.getClientRects().length > 0) visible++;
      }
      return { count: list.length, visibleCount: visible };
    };

    const overviewEl = document.querySelector('.planning-overview');
    const errorEl = document.querySelector('.planning-controlled-error, [data-testid="planning-error-state"]');

    return {
      clerkLoaded: typeof window !== 'undefined' && Boolean(window.Clerk?.loaded),
      isSignedIn: typeof window !== 'undefined' && Boolean(window.Clerk?.user && window.Clerk?.session),
      userIdPresent: typeof window !== 'undefined' && Boolean(window.Clerk?.user?.id),
      workspace: getCounts('.planning-workspace'),
      reviewPanel: getCounts('.planning-review-panel'),
      loadingPanel: getCounts('.planning-loading-panel, [aria-busy="true"]'),
      controlledError: getCounts('.planning-controlled-error, [data-testid="planning-error-state"]'),
      authGate: getCounts('.auth-gate-card, .auth-gate'),
      overview: getCounts('.planning-overview'),
      overviewText: overviewEl ? (overviewEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 150) : '',
      errorText: errorEl ? (errorEl.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200) : ''
    };
  }).catch(() => null);

  const safeSearchParams = {};
  if (parsedUrl) {
    for (const [k, v] of parsedUrl.searchParams.entries()) {
      safeSearchParams[k] = k === 'planId' ? '[REDACTED_PLAN_ID]' : v;
    }
  }
  const safeRouteShape = {
    pathname: parsedUrl?.pathname || '',
    params: safeSearchParams
  };

  // Check controlled error state
  if (diagnostics?.controlledError?.visibleCount > 0) {
    const sanitizedErr = diagnostics.errorText || 'Controlled error state active';
    throw new Error(`[${contextLabel}] Controlled error displayed instead of Plan ${expectedPlanId || ''} Version ${expectedVersion || ''}: "${sanitizedErr}" (Route: ${JSON.stringify(safeRouteShape)})`);
  }

  // Check auth gate / signed-out
  if (diagnostics?.authGate?.visibleCount > 0 || (diagnostics?.clerkLoaded && !diagnostics?.isSignedIn)) {
    throw new Error(`[${contextLabel}] User authentication lost or auth-gate shown (clerkLoaded: ${diagnostics?.clerkLoaded}, isSignedIn: ${diagnostics?.isSignedIn}, Route: ${JSON.stringify(safeRouteShape)})`);
  }

  // Check wrong version
  if (targetVersionStr && diagnostics?.overviewText && !diagnostics.overviewText.includes(targetVersionStr)) {
    throw new Error(`[${contextLabel}] Wrong version loaded in planning workspace: expected "${targetVersionStr}", but overview shows "${diagnostics.overviewText}" (Route: ${JSON.stringify(safeRouteShape)})`);
  }

  // Check review panel missing or invisible
  if (!diagnostics || diagnostics.reviewPanel.count === 0 || diagnostics.reviewPanel.visibleCount === 0) {
    if (screenshotsDir && typeof page.screenshot === 'function') {
      try {
        await page.screenshot({ path: join(screenshotsDir, 'diagnostic_planning_panel_failure.png') });
      } catch {}
    }
    throw new Error(`[${contextLabel}] .planning-review-panel not visible within ${timeout}ms. Diagnostics: ${JSON.stringify({
      route: safeRouteShape,
      clerk: { loaded: diagnostics?.clerkLoaded, signedIn: diagnostics?.isSignedIn, hasUserId: diagnostics?.userIdPresent },
      nodes: {
        workspace: diagnostics?.workspace,
        reviewPanel: diagnostics?.reviewPanel,
        loadingPanel: diagnostics?.loadingPanel,
        controlledError: diagnostics?.controlledError,
        authGate: diagnostics?.authGate,
        overview: diagnostics?.overview
      },
      overviewText: diagnostics?.overviewText
    })}`);
  }

  // Check ambiguous (duplicate) review panel
  if (diagnostics.reviewPanel.count > 1) {
    throw new Error(`[${contextLabel}] Ambiguous review panel: expected exactly 1 .planning-review-panel, found ${diagnostics.reviewPanel.count}`);
  }

  const panelLocator = page.locator('.planning-review-panel');
  return panelLocator;
}

// --------------------------------------------------------------------------
// Keyboard Navigation & Action Accessibility Proofs
// --------------------------------------------------------------------------
export function evaluateKeyboardActionProof({
  focusedCount = 0,
  hasFocusRing = false,
  targetFocused = false,
  actionActivated = false,
  openStateVerified = false,
  closeStateVerified = false
} = {}) {
  if (typeof focusedCount !== 'number' || focusedCount < 3) {
    return { passed: false, reason: `Insufficient interactive elements focused: ${focusedCount} < 3` };
  }
  if (!hasFocusRing) {
    return { passed: false, reason: 'No visible focus outline/ring detected on focused elements' };
  }
  if (!targetFocused) {
    return { passed: false, reason: 'Target interactive control was not focused via keyboard traversal' };
  }
  if (!actionActivated || !openStateVerified || !closeStateVerified) {
    return { passed: false, reason: 'Keyboard focus occurred but interactive action activation failed or had no effect' };
  }
  return { passed: true, reason: null };
}

export async function executeKeyboardActionProof(page, { maxTabs = 120 } = {}) {
  // 1. Reset focus to document body
  await page.locator('body').click();

  let focusedCount = 0;
  let hasFocusRing = false;
  let targetFocused = false;
  const visitedKeys = new Set();

  // 2. Traversal: press Tab sequentially, verifying focus rings on interactive elements
  for (let i = 0; i < maxTabs; i++) {
    await page.keyboard.press('Tab');
    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const style = window.getComputedStyle(el);
      const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      const isTarget = el.tagName === 'BUTTON' && el.getAttribute('aria-controls') === 'desktop-workspace-navigation';

      // Compute unique DOM path key for cycle detection
      const path = [];
      let curr = el;
      while (curr && curr !== document.body && curr !== document.documentElement) {
        let index = 1;
        let sibling = curr.previousElementSibling;
        while (sibling) {
          if (sibling.tagName === curr.tagName) index++;
          sibling = sibling.previousElementSibling;
        }
        path.unshift(`${curr.tagName}:nth-of-type(${index})`);
        curr = curr.parentElement;
      }
      const key = (el.id ? `#${el.id}` : '') + (path.length ? `>${path.join('>')}` : '');

      return {
        tag: el.tagName,
        isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.hasAttribute('tabindex'),
        hasVisibleFocus: Boolean(hasOutline || hasShadow),
        isTarget,
        key
      };
    });

    if (focusInfo?.isInteractive) {
      focusedCount++;
      if (focusInfo.hasVisibleFocus) hasFocusRing = true;
    }
    if (focusInfo?.isTarget) {
      targetFocused = true;
      break;
    }

    // Cycle detection: if a unique key was returned and already visited, break early
    const elementKey = focusInfo?.key || (focusInfo?.id ? `#${focusInfo.id}` : null);
    if (elementKey) {
      if (visitedKeys.has(elementKey)) {
        break;
      }
      visitedKeys.add(elementKey);
    }
  }

  if (!targetFocused) {
    return {
      focusedCount,
      hasFocusRing,
      targetFocused: false,
      openStateVerified: false,
      closeStateVerified: false,
      actionActivated: false,
      ...evaluateKeyboardActionProof({
        focusedCount,
        hasFocusRing,
        targetFocused: false,
        actionActivated: false,
        openStateVerified: false,
        closeStateVerified: false
      })
    };
  }

  // 4. Assert initial state: closed dropdown
  const initialExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const initialDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);

  if (initialExpanded === 'true' || initialDropdownVisible) {
    return {
      focusedCount,
      hasFocusRing,
      targetFocused: true,
      openStateVerified: false,
      closeStateVerified: false,
      actionActivated: false,
      passed: false,
      reason: 'Target control was unexpectedly already open before keyboard activation'
    };
  }

  // 5. Dispatch keyboard activation (Enter) without click substitution
  await page.keyboard.press('Enter');
  if (page.waitForTimeout) await page.waitForTimeout(150);

  // 6. Assert visible DOM open state resulted from keyboard activation
  const openExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const openDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);
  const openStateVerified = openExpanded === 'true' && Boolean(openDropdownVisible);

  // 7. Dispatch keyboard close action (Escape) and assert closed state
  await page.keyboard.press('Escape');
  if (page.waitForTimeout) await page.waitForTimeout(150);

  const closeExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const closeDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);
  const closeStateVerified = closeExpanded === 'false' && !closeDropdownVisible;

  const actionActivated = openStateVerified && closeStateVerified;

  const evalResult = evaluateKeyboardActionProof({
    focusedCount,
    hasFocusRing,
    targetFocused,
    actionActivated,
    openStateVerified,
    closeStateVerified
  });

  return {
    focusedCount,
    hasFocusRing,
    targetFocused,
    openStateVerified,
    closeStateVerified,
    actionActivated,
    ...evalResult
  };
}

// --------------------------------------------------------------------------
// Collector-Level Verification Logic & Assertions
// --------------------------------------------------------------------------
export async function locateReviewPanelHeaderElements(reviewPanelLocator) {
  if (!reviewPanelLocator) {
    throw new Error('Review panel locator is missing or undefined');
  }

  // Heading must be scoped to the direct .panel-heading of the review panel
  const headingEl = reviewPanelLocator.locator('.panel-heading h2#planning-review-title, .panel-heading h2');
  const headingCount = await headingEl.count();
  if (headingCount !== 1) {
    throw new Error(`Expected exactly 1 review panel heading in .panel-heading, got ${headingCount}`);
  }

  // Status badge must be scoped to the direct .panel-heading of the review panel
  // (history badges live under .review-history-section .review-history-row)
  const badgeEl = reviewPanelLocator.locator('.panel-heading .review-badge');
  const badgeCount = await badgeEl.count();
  if (badgeCount !== 1) {
    throw new Error(`Expected exactly 1 review panel status badge in .panel-heading, got ${badgeCount}`);
  }

  return {
    headingEl,
    badgeEl
  };
}

export function verifyClearance(measurements) {
  if (!Array.isArray(measurements) || measurements.length === 0) {
    return { passed: false, reason: 'No clearance measurements provided' };
  }
  for (const m of measurements) {
    if (!m.topbarBox || !m.headingBox || !m.badgeBox) {
      return { passed: false, reason: `Missing element bounding box in ${m.modeLabel}` };
    }
    const topbarBottom = m.topbarBox.y + m.topbarBox.height;
    if (m.headingBox.y < topbarBottom) {
      return {
        passed: false,
        reason: `Sticky topbar occludes review heading in ${m.modeLabel}: topbarBottom=${topbarBottom.toFixed(1)}, headingTop=${m.headingBox.y.toFixed(1)}`
      };
    }
    if (m.badgeBox.y < topbarBottom) {
      return {
        passed: false,
        reason: `Sticky topbar occludes review badge in ${m.modeLabel}: topbarBottom=${topbarBottom.toFixed(1)}, badgeTop=${m.badgeBox.y.toFixed(1)}`
      };
    }
    if (m.controlBox && m.controlBox.y < topbarBottom) {
      return {
        passed: false,
        reason: `Sticky topbar occludes focused review control in ${m.modeLabel}: topbarBottom=${topbarBottom.toFixed(1)}, controlTop=${m.controlBox.y.toFixed(1)}`
      };
    }
  }
  return { passed: true };
}

export function verifyReviseUiSelection(isChecked) {
  if (isChecked !== true) {
    return { passed: false, reason: 'Revise assumptions radio input is not checked in the DOM' };
  }
  return { passed: true };
}

function resolveRow(container, key, label = '') {
  if (!container || typeof container !== 'object') return null;
  const val = container[key] ?? container[`${key}Rows`];
  if (val === undefined || val === null) return null;
  const singular = key.endsWith('s') ? key.slice(0, -1) : key;
  const labelSuffix = label ? ` for ${label}` : '';
  if (Array.isArray(val)) {
    if (val.length !== 1) {
      return { __error: `Expected exactly 1 ${singular} row${labelSuffix}, found ${val.length}` };
    }
    return val[0];
  }
  return val;
}

export function verifyFinancialRevisionDiff(v2Data, v3Data) {
  if (!v2Data || !v3Data) {
    return { passed: false, reason: 'Missing Version 2 or Version 3 data for diff comparison' };
  }

  // Version 3 must have exactly one row in version, inputs, and results
  const v3VersionRow = resolveRow(v3Data, 'version', 'Version 3');
  if (!v3VersionRow || v3VersionRow.__error) {
    return { passed: false, reason: v3VersionRow?.__error || 'Expected exactly 1 version row for Version 3' };
  }
  const v3InputRow = resolveRow(v3Data, 'inputs', 'Version 3');
  if (!v3InputRow || v3InputRow.__error) {
    return { passed: false, reason: v3InputRow?.__error || 'Expected exactly 1 input row for Version 3' };
  }
  const v3ResultRow = resolveRow(v3Data, 'results', 'Version 3');
  if (!v3ResultRow || v3ResultRow.__error) {
    return { passed: false, reason: v3ResultRow?.__error || 'Expected exactly 1 result row for Version 3' };
  }

  // Version 2 must have exactly one row in inputs and results (and version if provided)
  const v2InputRow = resolveRow(v2Data, 'inputs', 'Version 2');
  if (!v2InputRow || v2InputRow.__error) {
    return { passed: false, reason: v2InputRow?.__error || 'Expected exactly 1 input row for Version 2' };
  }
  const v2ResultRow = resolveRow(v2Data, 'results', 'Version 2');
  if (!v2ResultRow || v2ResultRow.__error) {
    return { passed: false, reason: v2ResultRow?.__error || 'Expected exactly 1 result row for Version 2' };
  }
  if (v2Data.version !== undefined || v2Data.versionRows !== undefined) {
    const v2VersionRow = resolveRow(v2Data, 'version', 'Version 2');
    if (!v2VersionRow || v2VersionRow.__error) {
      return { passed: false, reason: v2VersionRow?.__error || 'Expected exactly 1 version row for Version 2' };
    }
  }

  // Parse input_json strings from raw D1 rows
  if (typeof v2InputRow.input_json !== 'string') {
    return { passed: false, reason: 'Version 2 input row missing input_json string' };
  }
  let v2Snapshot;
  try {
    v2Snapshot = JSON.parse(v2InputRow.input_json);
  } catch (e) {
    return { passed: false, reason: `Version 2 input_json is malformed JSON: ${e.message}` };
  }

  if (typeof v3InputRow.input_json !== 'string') {
    return { passed: false, reason: 'Version 3 input row missing input_json string' };
  }
  let v3Snapshot;
  try {
    v3Snapshot = JSON.parse(v3InputRow.input_json);
  } catch (e) {
    return { passed: false, reason: `Version 3 input_json is malformed JSON: ${e.message}` };
  }

  // Parse result_json strings from raw D1 rows
  if (typeof v2ResultRow.result_json !== 'string') {
    return { passed: false, reason: 'Version 2 result row missing result_json string' };
  }
  let v2Result;
  try {
    v2Result = JSON.parse(v2ResultRow.result_json);
  } catch (e) {
    return { passed: false, reason: `Version 2 result_json is malformed JSON: ${e.message}` };
  }

  if (typeof v3ResultRow.result_json !== 'string') {
    return { passed: false, reason: 'Version 3 result row missing result_json string' };
  }
  let v3Result;
  try {
    v3Result = JSON.parse(v3ResultRow.result_json);
  } catch (e) {
    return { passed: false, reason: `Version 3 result_json is malformed JSON: ${e.message}` };
  }

  // Validate finite annualExpense numbers
  const v2Expense = v2Snapshot?.plan?.annualExpense;
  const v3Expense = v3Snapshot?.plan?.annualExpense;

  if (typeof v2Expense !== 'number' || !Number.isFinite(v2Expense)) {
    return { passed: false, reason: `Version 2 missing finite snapshot.plan.annualExpense: ${v2Expense}` };
  }
  if (typeof v3Expense !== 'number' || !Number.isFinite(v3Expense)) {
    return { passed: false, reason: `Version 3 missing finite snapshot.plan.annualExpense: ${v3Expense}` };
  }

  if (v2Expense !== 50000) {
    return { passed: false, reason: `Expected Version 2 annualExpense to be 50000, got ${v2Expense}` };
  }
  if (v3Expense !== 45000) {
    return { passed: false, reason: `Expected Version 3 annualExpense to be 45000, got ${v3Expense}` };
  }
  if (v2Expense === v3Expense) {
    return {
      passed: false,
      reason: `Financial assumption unchanged between v2 and v3: annualExpense remained ${v2Expense}`
    };
  }

  // Validate finite requiredPortfolio numbers
  const v2Required = v2Result?.requiredPortfolio;
  const v3Required = v3Result?.requiredPortfolio;

  if (typeof v2Required !== 'number' || !Number.isFinite(v2Required)) {
    return { passed: false, reason: `Version 2 missing finite result.requiredPortfolio: ${v2Required}` };
  }
  if (typeof v3Required !== 'number' || !Number.isFinite(v3Required)) {
    return { passed: false, reason: `Version 3 missing finite result.requiredPortfolio: ${v3Required}` };
  }

  if (v2Required === v3Required) {
    return {
      passed: false,
      reason: `Calculation result unchanged between v2 and v3 despite assumption edit: requiredPortfolio=${v2Required}`
    };
  }

  return {
    passed: true,
    v2Expense,
    v3Expense,
    v2Required,
    v3Required
  };
}

export function verifyPriorVersionsImmutability(v1Before, v1After, v2Before, v2After) {
  if (!v1Before || !v1After || !v2Before || !v2After) {
    return { passed: false, reason: 'Missing prior version snapshot for immutability comparison' };
  }

  const snapshots = [
    { label: 'Version 1 before', data: v1Before },
    { label: 'Version 1 after', data: v1After },
    { label: 'Version 2 before', data: v2Before },
    { label: 'Version 2 after', data: v2After }
  ];

  const tables = ['version', 'inputs', 'results'];

  for (const { label, data } of snapshots) {
    for (const table of tables) {
      const rows = data[table];
      if (!Array.isArray(rows) || rows.length !== 1) {
        return {
          passed: false,
          reason: `Expected exactly 1 row in ${label} for ${table}, found ${Array.isArray(rows) ? rows.length : 'none'}`
        };
      }
    }
  }

  const v1VersionEqual = JSON.stringify(v1Before.version) === JSON.stringify(v1After.version);
  const v1InputsEqual = JSON.stringify(v1Before.inputs) === JSON.stringify(v1After.inputs);
  const v1ResultsEqual = JSON.stringify(v1Before.results) === JSON.stringify(v1After.results);

  if (!v1VersionEqual || !v1InputsEqual || !v1ResultsEqual) {
    return {
      passed: false,
      reason: `Version 1 mutated after Version 3 creation: version=${v1VersionEqual}, inputs=${v1InputsEqual}, results=${v1ResultsEqual}`
    };
  }

  const v2VersionEqual = JSON.stringify(v2Before.version) === JSON.stringify(v2After.version);
  const v2InputsEqual = JSON.stringify(v2Before.inputs) === JSON.stringify(v2After.inputs);
  const v2ResultsEqual = JSON.stringify(v2Before.results) === JSON.stringify(v2After.results);

  if (!v2VersionEqual || !v2InputsEqual || !v2ResultsEqual) {
    return {
      passed: false,
      reason: `Version 2 mutated after Version 3 creation: version=${v2VersionEqual}, inputs=${v2InputsEqual}, results=${v2ResultsEqual}`
    };
  }

  return { passed: true };
}

export function verifyIdempotentReplay({
  persistedReview,
  replayKey,
  replayDecision,
  replayStatus,
  replayBody,
  reviewCount,
  scopedReviewCount,
  totalReviewsBefore,
  totalReviewsAfter,
  expectedTotalReviews,
  postConflictReview
}) {
  if (!persistedReview) {
    return { passed: false, reason: 'No persisted review provided' };
  }
  const expectedKey = persistedReview.idempotency_key;
  if (!expectedKey) {
    return { passed: false, reason: 'Persisted review has empty idempotency_key' };
  }
  if (replayKey !== expectedKey) {
    return {
      passed: false,
      reason: `Mismatched replay key: attempted "${replayKey}" but persisted review key is "${expectedKey}"`
    };
  }

  const effectiveScopedCount = scopedReviewCount ?? reviewCount;

  if (replayDecision === persistedReview.decision) {
    // Exact replay branch
    if (replayStatus !== 200) {
      return { passed: false, reason: `Exact replay expected HTTP 200, got ${replayStatus}` };
    }
    if (!replayBody || replayBody.isDuplicate !== true) {
      return {
        passed: false,
        reason: `Exact replay expected isDuplicate: true in response body, got ${replayBody?.isDuplicate}`
      };
    }
    if (effectiveScopedCount !== 1) {
      return { passed: false, reason: `Exact replay expected 1 review row, found ${effectiveScopedCount}` };
    }
    if (totalReviewsBefore !== undefined && totalReviewsAfter !== undefined && totalReviewsBefore !== totalReviewsAfter) {
      return {
        passed: false,
        reason: `Total plan reviews changed during exact replay: before=${totalReviewsBefore}, after=${totalReviewsAfter}`
      };
    }
  } else {
    // Conflicting intent branch
    if (replayStatus !== 409) {
      return { passed: false, reason: `Conflicting intent expected HTTP 409, got ${replayStatus}` };
    }
    if (!replayBody || replayBody.code !== 'IDEMPOTENCY_CONFLICT') {
      return {
        passed: false,
        reason: `Conflicting intent expected code IDEMPOTENCY_CONFLICT, got ${replayBody?.code}`
      };
    }
    if (effectiveScopedCount !== 1) {
      return {
        passed: false,
        reason: `Conflicting intent expected 1 review row after conflict, found ${effectiveScopedCount}`
      };
    }
    if (!postConflictReview) {
      return {
        passed: false,
        reason: 'Conflicting intent requires postConflictReview to verify row preservation'
      };
    }
    if (postConflictReview.decision !== persistedReview.decision) {
      return {
        passed: false,
        reason: `Conflicting intent mutated original review decision: expected ${persistedReview.decision}, got ${postConflictReview.decision}`
      };
    }
    if (postConflictReview.idempotency_key !== expectedKey) {
      return {
        passed: false,
        reason: `Conflicting intent mutated original idempotency key: expected ${expectedKey}, got ${postConflictReview.idempotency_key}`
      };
    }
    if (persistedReview.id && postConflictReview.id && postConflictReview.id !== persistedReview.id) {
      return {
        passed: false,
        reason: `Conflicting intent mutated original review id: expected ${persistedReview.id}, got ${postConflictReview.id}`
      };
    }
    if (totalReviewsBefore !== undefined && totalReviewsAfter !== undefined) {
      if (totalReviewsBefore !== totalReviewsAfter) {
        return {
          passed: false,
          reason: `Total plan review count changed after conflicting replay: before=${totalReviewsBefore}, after=${totalReviewsAfter}`
        };
      }
      if (expectedTotalReviews !== undefined && totalReviewsAfter !== expectedTotalReviews) {
        return {
          passed: false,
          reason: `Expected total plan reviews to be ${expectedTotalReviews}, found ${totalReviewsAfter}`
        };
      }
    }
  }

  return { passed: true };
}

// --------------------------------------------------------------------------
// Explicit Evaluator
// --------------------------------------------------------------------------
export function persistEvidence(report, cleanup, writer = writeFileSync) {
  try {
    writer(CLEANUP_FILE, JSON.stringify(cleanup, null, 2) + '\n');
    writer(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
  } catch (error) {
    report.status = 'FAILED';
    report.error = 'Evidence write failed: ' + error.message;
    try { writer(REPORT_FILE, JSON.stringify(report, null, 2) + '\n'); } catch {}
    throw error;
  }
}

export function evaluateReport(report, cleanup, expectedConfig = null) {
  const failures = [];

  if (!report || typeof report !== 'object') {
    return { passed: false, failures: ['Report is missing or not an object'] };
  }
  if (!cleanup || typeof cleanup !== 'object') {
    return { passed: false, failures: ['Cleanup is missing or not an object'] };
  }

  if (report.error) failures.push('Recorded verification error: ' + report.error);
  if (report.status === 'FAILED') failures.push('Report marked FAILED');

  const expectedSha = expectedConfig?.candidateSha || expectedConfig?.candidate_sha || process.env.C09_CANDIDATE_SHA || CANDIDATE_SHA;
  const expectedDepId = expectedConfig?.deploymentId || expectedConfig?.deployment_id || process.env.C09_DEPLOYMENT_ID || DEPLOYMENT_ID;
  const expectedUrl = expectedConfig?.previewUrl || expectedConfig?.preview_url || process.env.C09_PREVIEW_URL || PREVIEW_URL;
  const expectedDb = expectedConfig?.previewDbId || expectedConfig?.preview_db_id || PREVIEW_DB_ID;

  if (report.preview_url !== expectedUrl) {
    failures.push(`Expected preview_url ${expectedUrl}, got ${report.preview_url}`);
  }

  // Preflight metadata
  if (report.candidate_sha !== expectedSha) {
    failures.push(`Expected candidate_sha ${expectedSha}, got ${report.candidate_sha}`);
  }
  if (report.deployment_id !== expectedDepId) {
    failures.push(`Expected deployment_id ${expectedDepId}, got ${report.deployment_id}`);
  }
  if (report.effective_db !== expectedDb) {
    failures.push(`Expected effective_db ${expectedDb}, got ${report.effective_db}`);
  }
  if (report.d1_migration_0007_verified !== true) {
    failures.push(`d1_migration_0007_verified expected true, got ${report.d1_migration_0007_verified}`);
  }
  if (report.d1_migration_0008_verified !== true) {
    failures.push(`d1_migration_0008_verified expected true, got ${report.d1_migration_0008_verified}`);
  }
  if (report.sqlite_plan_reviews_verified !== true) {
    failures.push(`sqlite_plan_reviews_verified expected true, got ${report.sqlite_plan_reviews_verified}`);
  }

  // B10 Saved Decision Navigation
  const b10 = report.b10_saved_decision_navigation;
  if (!b10 || typeof b10 !== 'object') {
    failures.push('Missing b10_saved_decision_navigation section in report');
  } else {
    if (b10.plan_created_version_1 !== true) failures.push(`B10: plan_created_version_1 expected true, got ${b10.plan_created_version_1}`);
    if (b10.plan_revised_version_2 !== true) failures.push(`B10: plan_revised_version_2 expected true, got ${b10.plan_revised_version_2}`);
    if (b10.exact_v1_link_navigated !== true) failures.push(`B10: exact_v1_link_navigated expected true, got ${b10.exact_v1_link_navigated}`);
    if (b10.exact_v1_inputs_restored_after_reload !== true) failures.push(`B10: exact_v1_inputs_restored_after_reload expected true, got ${b10.exact_v1_inputs_restored_after_reload}`);
    if (b10.v2_inputs_not_rendered_on_v1_link !== true) failures.push(`B10: v2_inputs_not_rendered_on_v1_link expected true, got ${b10.v2_inputs_not_rendered_on_v1_link}`);
    if (b10.unsaved_changes_modal_rendered_on_dirty_nav !== true) failures.push(`B10: unsaved_changes_modal_rendered_on_dirty_nav expected true, got ${b10.unsaved_changes_modal_rendered_on_dirty_nav}`);
    if (b10.unsaved_changes_cancel_preserves_dirty_state !== true) failures.push(`B10: unsaved_changes_cancel_preserves_dirty_state expected true, got ${b10.unsaved_changes_cancel_preserves_dirty_state}`);
    if (b10.unsaved_changes_confirm_proceeds_navigation !== true) failures.push(`B10: unsaved_changes_confirm_proceeds_navigation expected true, got ${b10.unsaved_changes_confirm_proceeds_navigation}`);
    if (b10.controlled_error_on_missing_plan !== true) failures.push(`B10: controlled_error_on_missing_plan expected true, got ${b10.controlled_error_on_missing_plan}`);
    if (b10.controlled_error_on_missing_version !== true) failures.push(`B10: controlled_error_on_missing_version expected true, got ${b10.controlled_error_on_missing_version}`);
    if (b10.tenant_b_cannot_access_tenant_a_plan !== true) failures.push(`B10: tenant_b_cannot_access_tenant_a_plan expected true, got ${b10.tenant_b_cannot_access_tenant_a_plan}`);
    if (b10.full_record_immutability_verified !== true) failures.push(`B10: full_record_immutability_verified expected true, got ${b10.full_record_immutability_verified}`);
  }

  // B11 Monthly Review Loop
  const b11 = report.b11_monthly_review_loop;
  if (!b11 || typeof b11 !== 'object') {
    failures.push('Missing b11_monthly_review_loop section in report');
  } else {
    if (b11.review_saved_keep_choice !== true) failures.push(`B11: review_saved_keep_choice expected true, got ${b11.review_saved_keep_choice}`);
    if (b11.review_completed_status_persisted_after_reload !== true) failures.push(`B11: review_completed_status_persisted_after_reload expected true, got ${b11.review_completed_status_persisted_after_reload}`);
    if (b11.review_next_due_date_computed !== true) failures.push(`B11: review_next_due_date_computed expected true, got ${b11.review_next_due_date_computed}`);
    if (b11.returning_review_rule_enforced_within_7_days !== true) failures.push(`B11: returning_review_rule_enforced_within_7_days expected true, got ${b11.returning_review_rule_enforced_within_7_days}`);
    if (b11.review_defer_choice_persisted !== true) failures.push(`B11: review_defer_choice_persisted expected true, got ${b11.review_defer_choice_persisted}`);
    if (b11.review_revise_ui_selected !== true) failures.push(`B11: review_revise_ui_selected expected true, got ${b11.review_revise_ui_selected}`);
    if (b11.review_revise_next_step_displayed !== true) failures.push(`B11: review_revise_next_step_displayed expected true, got ${b11.review_revise_next_step_displayed}`);
    if (b11.plan_revised_version_3_persisted !== true) failures.push(`B11: plan_revised_version_3_persisted expected true, got ${b11.plan_revised_version_3_persisted}`);
    if (b11.version_3_reload_verified !== true) failures.push(`B11: version_3_reload_verified expected true, got ${b11.version_3_reload_verified}`);
    if (b11.prior_versions_immutable_after_v3 !== true) failures.push(`B11: prior_versions_immutable_after_v3 expected true, got ${b11.prior_versions_immutable_after_v3}`);
    if (b11.review_revise_choice_triggers_revision !== true) failures.push(`B11: review_revise_choice_triggers_revision expected true, got ${b11.review_revise_choice_triggers_revision}`);
    if (b11.idempotent_repeat_review_not_duplicated !== true) failures.push(`B11: idempotent_repeat_review_not_duplicated expected true, got ${b11.idempotent_repeat_review_not_duplicated}`);
    if (b11.due_reviews_endpoint_returned_plans !== true) failures.push(`B11: due_reviews_endpoint_returned_plans expected true, got ${b11.due_reviews_endpoint_returned_plans}`);
    if (b11.tenant_b_cannot_review_tenant_a_plan !== true) failures.push(`B11: tenant_b_cannot_review_tenant_a_plan expected true, got ${b11.tenant_b_cannot_review_tenant_a_plan}`);
    if (b11.plan_reviews_participate_in_data_export !== true) failures.push(`B11: plan_reviews_participate_in_data_export expected true, got ${b11.plan_reviews_participate_in_data_export}`);
  }

  // B28 Presentation & Accessibility
  const b28 = report.b28_presentation_and_accessibility;
  if (!b28 || typeof b28 !== 'object') {
    failures.push('Missing b28_presentation_and_accessibility section in report');
  } else {
    if (b28.dashboard_reviews_rollup_rendered !== true) failures.push(`B28: dashboard_reviews_rollup_rendered expected true, got ${b28.dashboard_reviews_rollup_rendered}`);
    if (b28.dashboard_due_cards_have_deep_links !== true) failures.push(`B28: dashboard_due_cards_have_deep_links expected true, got ${b28.dashboard_due_cards_have_deep_links}`);
    if (b28.review_status_badges_explicit_text !== true) failures.push(`B28: review_status_badges_explicit_text expected true, got ${b28.review_status_badges_explicit_text}`);
    if (b28.review_panel_no_topbar_overlap !== true) failures.push(`B28: review_panel_no_topbar_overlap expected true, got ${b28.review_panel_no_topbar_overlap}`);
    if (b28.goals_panel_linked_plan_badge_rendered !== true) failures.push(`B28: goals_panel_linked_plan_badge_rendered expected true, got ${b28.goals_panel_linked_plan_badge_rendered}`);
    if (b28.goals_panel_evidence_date_disclosed !== true) failures.push(`B28: goals_panel_evidence_date_disclosed expected true, got ${b28.goals_panel_evidence_date_disclosed}`);
    if (b28.goals_panel_funding_gap_rendered !== true) failures.push(`B28: goals_panel_funding_gap_rendered expected true, got ${b28.goals_panel_funding_gap_rendered}`);
    if (b28.goals_panel_explicit_text_status !== true) failures.push(`B28: goals_panel_explicit_text_status expected true, got ${b28.goals_panel_explicit_text_status}`);
    if (b28.stale_evidence_warning_displayed_when_over_30_days !== true) failures.push(`B28: stale_evidence_warning_displayed_when_over_30_days expected true, got ${b28.stale_evidence_warning_displayed_when_over_30_days}`);
    if (b28.theme_switching_verified !== true) failures.push(`B28: theme_switching_verified expected true, got ${b28.theme_switching_verified}`);
    if (b28.contrast_review_badges_light_pass !== true) failures.push(`B28: contrast_review_badges_light_pass expected true, got ${b28.contrast_review_badges_light_pass}`);
    if (b28.contrast_review_badges_dark_pass !== true) failures.push(`B28: contrast_review_badges_dark_pass expected true, got ${b28.contrast_review_badges_dark_pass}`);
    if (b28.viewport_containment_mobile_320px_verified !== true) failures.push(`B28: viewport_containment_mobile_320px_verified expected true, got ${b28.viewport_containment_mobile_320px_verified}`);
    if (b28.viewport_containment_tablet_768px_verified !== true) failures.push(`B28: viewport_containment_tablet_768px_verified expected true, got ${b28.viewport_containment_tablet_768px_verified}`);
    if (b28.viewport_containment_desktop_1280px_verified !== true) failures.push(`B28: viewport_containment_desktop_1280px_verified expected true, got ${b28.viewport_containment_desktop_1280px_verified}`);
    if (b28.keyboard_navigation_accessible !== true) failures.push(`B28: keyboard_navigation_accessible expected true, got ${b28.keyboard_navigation_accessible}`);
  }

  // Cleanup Assertions for Synthetic Users
  const checkUserCleanup = (c, name) => {
    if (!c || typeof c !== 'object') {
      failures.push(`Cleanup for ${name} is missing or not an object`);
      return;
    }
    if (c.errors && c.errors.length > 0) {
      failures.push(`${name} cleanup reported errors: ${c.errors.join(', ')}`);
    }
    if (c.app_data_deleted !== true) failures.push(`${name} cleanup: app_data_deleted expected true, got ${c.app_data_deleted}`);
    if (c.user_tombstone_present !== true) failures.push(`${name} cleanup: user_tombstone_present expected true, got ${c.user_tombstone_present}`);
    if (c.clerk_user_deleted !== true) failures.push(`${name} cleanup: clerk_user_deleted expected true, got ${c.clerk_user_deleted}`);
    if (c.clerk_user_absent !== true) failures.push(`${name} cleanup: clerk_user_absent expected true, got ${c.clerk_user_absent}`);
    if (c.all_tables_zero !== true) failures.push(`${name} cleanup: all_tables_zero expected true, got ${c.all_tables_zero}`);

    if (!c.table_counts || typeof c.table_counts !== 'object') {
      failures.push(`${name} cleanup: table_counts is missing or not an object`);
    } else {
      for (const table of USER_TABLES) {
        const cnt = c.table_counts[table];
        if (typeof cnt !== 'number') {
          failures.push(`${name} cleanup: table_counts[${table}] expected number, got ${typeof cnt} (${cnt})`);
        } else if (cnt !== 0) {
          failures.push(`${name} cleanup: table_counts[${table}] expected 0, got ${cnt}`);
        }
      }
    }
  };

  checkUserCleanup(cleanup.userA, 'User A');
  checkUserCleanup(cleanup.userB, 'User B');

  return {
    passed: failures.length === 0,
    failures
  };
}

// --------------------------------------------------------------------------
// Scoped Cleanup Function
// --------------------------------------------------------------------------
export async function performCleanup({
  userId,
  page,
  clerkClient,
  queryD1Fn = queryD1,
  logFn = console.log
}) {
  logFn(`\n--- Executing Scoped Fail-Closed Cleanup for ${userId} ---`);
  const cleanupResult = {
    userId,
    app_data_deleted: false,
    user_tombstone_present: false,
    clerk_user_deleted: false,
    clerk_user_absent: false,
    all_tables_zero: false,
    table_counts: {},
    provider_deletion_withheld: false,
    errors: []
  };

  if (!userId) {
    logFn('No userId provided; skipping cleanup.');
    return cleanupResult;
  }

  // Step 1: Application data deletion via user session
  if (page && !page.isClosed()) {
    try {
      const delRes = await page.evaluate(async () => {
        const res = await fetch('/api/account-data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
        });
        return { status: res.status, ok: res.ok };
      });
      cleanupResult.app_data_deleted = delRes.ok || delRes.status === 410;
      logFn(`Application data deletion response: ok=${delRes.ok}, status=${delRes.status}`);
    } catch (e) {
      cleanupResult.errors.push(`App data delete error: ${e.message}`);
      logFn(`App data delete error: ${e.message}`);
    }
  }

  // Step 2: Query scoped table counts for this user across all 15 tables
  let allZero = true;
  for (const table of USER_TABLES) {
    try {
      const res = await queryD1Fn(`SELECT count(*) as cnt FROM ${table} WHERE user_id = ?;`, [userId]);
      const cnt = res[0]?.cnt ?? -1;
      cleanupResult.table_counts[table] = cnt;
      if (cnt !== 0) {
        allZero = false;
        cleanupResult.errors.push(`Table ${table} has ${cnt} remaining rows for user`);
      }
    } catch (e) {
      cleanupResult.table_counts[table] = `error: ${e.message}`;
      cleanupResult.errors.push(`Query error on ${table}: ${e.message}`);
      allZero = false;
    }
  }
  cleanupResult.all_tables_zero = allZero;
  logFn(`All 15 tables scoped to user clean (0 rows): ${allZero}`);

  // Step 3: Verify user tombstone in users table
  try {
    const uRows = await queryD1Fn('SELECT id, deleted_at FROM users WHERE id = ?;', [userId]);
    cleanupResult.user_tombstone_present = uRows.length > 0 && Boolean(uRows[0].deleted_at);
    logFn(`User tombstone present: ${cleanupResult.user_tombstone_present}`);
    if (!cleanupResult.user_tombstone_present) {
      cleanupResult.errors.push('User tombstone missing or deleted_at is null');
    }
  } catch (e) {
    cleanupResult.errors.push(`Tombstone query error: ${e.message}`);
  }

  // Step 4: Gated Clerk provider deletion
  if (cleanupResult.app_data_deleted && cleanupResult.all_tables_zero) {
    try {
      await clerkClient.users.deleteUser(userId);
      cleanupResult.clerk_user_deleted = true;
      logFn('Clerk provider user deleted successfully.');
    } catch (e) {
      if (e.status === 404) {
        cleanupResult.clerk_user_deleted = true;
      } else {
        cleanupResult.errors.push(`Clerk delete error: ${e.message}`);
        logFn(`Clerk delete error: ${e.message}`);
      }
    }

    // Verify Clerk absence (must be 404)
    try {
      await clerkClient.users.getUser(userId);
      cleanupResult.clerk_user_absent = false;
      cleanupResult.errors.push('Clerk user still returned after deletion');
    } catch (e) {
      cleanupResult.clerk_user_absent = e.status === 404;
      logFn(`Clerk user 404 absence verified: ${cleanupResult.clerk_user_absent}`);
    }
  } else {
    logFn(`[GATE ENFORCED] WITHHOLDING Clerk provider deletion for ${userId} because application cleanup failed.`);
    cleanupResult.clerk_user_deleted = false;
    cleanupResult.clerk_user_absent = false;
    cleanupResult.provider_deletion_withheld = true;
    cleanupResult.errors.push('Clerk provider deletion withheld due to application cleanup failure');
  }

  return cleanupResult;
}

// --------------------------------------------------------------------------
// Main Verification Runner
// --------------------------------------------------------------------------
export async function runAllProofs() {
  console.log('=== Starting C09 Comprehensive Hosted Verification (B10, B11 & B28) ===');
  // Strict validation of fresh runtime deployment inputs - no permissive/stale fallback allowed
  const deploymentConfig = validateDeploymentInputs(process.env);
  const { candidateSha, deploymentId, previewUrl } = deploymentConfig;
  const calculateFirePlan = await loadCalculateFirePlan();

  const env = readEnv();
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('Clerk configuration missing in .env.preview.local');
  }

  // Preflight 1: Deployment identity and bindings
  console.log('Checking immutable deployment identity and D1 binding...');
  await verifyDeployment(deploymentConfig);
  console.log(`Verified deployment ${deploymentId} on DB ${PREVIEW_DB_ID}`);

  // Preflight 2: Test D1 query reachability
  console.log('Testing D1 query reachability...');
  const testPing = await queryD1('SELECT 1 as ping;');
  if (testPing[0]?.ping !== 1) {
    throw new Error('D1 database ping failed');
  }
  console.log('D1 database query verified.');

  // Preflight 3: Verify migrations 0007 and 0008 applied on remote D1
  const m7Rows = await queryD1('SELECT id, name, applied_at FROM d1_migrations WHERE id = 7;');
  const m7Verified = m7Rows.length > 0 && m7Rows[0].name === '0007_monthly_plan_reviews.sql';
  console.log(`D1 migration 0007 verified: ${m7Verified}`);

  const m8Rows = await queryD1('SELECT id, name, applied_at FROM d1_migrations WHERE id = 8;');
  const m8Verified = m8Rows.length > 0 && m8Rows[0].name === '0008_plan_reviews_idempotency.sql';
  console.log(`D1 migration 0008 verified: ${m8Verified}`);

  const smRows = await queryD1("SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='plan_reviews';");
  const planReviewsTableVerified = (smRows[0]?.cnt ?? 0) === 1;
  console.log(`sqlite_master plan_reviews table verified: ${planReviewsTableVerified}`);

  // Preflight 4: Clerk client and testing token
  const clerkClient = createClerkClient({ secretKey });
  const rawKey = publishableKey.replace(/^pk_(?:test|live)_/, '');
  const fapi = Buffer.from(rawKey, 'base64').toString('utf8').replace(/\$$/, '');
  console.log(`Clerk Frontend API host: ${fapi}`);

  const testTokenObj = await clerkClient.testingTokens.createTestingToken();
  const testingToken = testTokenObj.token;
  console.log('Created Clerk development testing token.');

  // Create Synthetic User A
  const nonceA = Date.now().toString().slice(-6);
  const passwordA = generateDisposablePassword();
  const emailA = `finpath_c09_a_${nonceA}+clerk_test@example.com`;
  const phoneA = `+12015550184`;

  console.log(`Creating Synthetic User A: ${emailA}...`);
  const userA = await clerkClient.users.createUser({
    emailAddress: [emailA],
    phoneNumber: [phoneA],
    password: passwordA
  });
  const userAId = userA.id;
  recordManifestUser(userAId);
  console.log(`Created User A: ${userAId.slice(0, 14)}...`);

  // Create Synthetic User B
  const nonceB = (Date.now() + 1).toString().slice(-6);
  const passwordB = generateDisposablePassword();
  const emailB = `finpath_c09_b_${nonceB}+clerk_test@example.com`;
  const phoneB = `+12015550185`;

  console.log(`Creating Synthetic User B: ${emailB}...`);
  const userB = await clerkClient.users.createUser({
    emailAddress: [emailB],
    phoneNumber: [phoneB],
    password: passwordB
  });
  const userBId = userB.id;
  recordManifestUser(userBId);
  console.log(`Created User B: ${userBId.slice(0, 14)}...`);

  const report = {
    candidate_sha: candidateSha,
    deployment_id: deploymentId,
    preview_url: previewUrl,
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    d1_migration_0007_verified: m7Verified,
    d1_migration_0008_verified: m8Verified,
    sqlite_plan_reviews_verified: planReviewsTableVerified,
    b10_saved_decision_navigation: {},
    b11_monthly_review_loop: {},
    b28_presentation_and_accessibility: {},
    cleanup: {}
  };

  let browser = null;
  let contextA = null;
  let pageA = null;
  let contextB = null;
  let pageB = null;
  let cleanupA = null;
  let cleanupB = null;

  try {
    const chromium = await loadChromium();
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

    // Session A
    contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setupClerkInterception(contextA, testingToken, fapi);
    pageA = await contextA.newPage();
    await pageA.goto(`${previewUrl}/`, { waitUntil: 'domcontentloaded' });

    const ticketA = await clerkClient.signInTokens.createSignInToken({ userId: userAId, expiresInSeconds: 300 });
    await pageA.waitForFunction(() => Boolean(window.Clerk?.loaded));
    await pageA.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket status: ${res.status}`);
        }
      });
    }, ticketA.token);
    await pageA.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
    console.log('User A authenticated.');

    // Session B
    contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setupClerkInterception(contextB, testingToken, fapi);
    pageB = await contextB.newPage();
    await pageB.goto(`${previewUrl}/`, { waitUntil: 'domcontentloaded' });

    const ticketB = await clerkClient.signInTokens.createSignInToken({ userId: userBId, expiresInSeconds: 300 });
    await pageB.waitForFunction(() => Boolean(window.Clerk?.loaded));
    await pageB.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket status: ${res.status}`);
        }
      });
    }, ticketB.token);
    await pageB.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
    console.log('User B authenticated.');

    // ==========================================
    // B10 & B11 & B28 Journeys
    // ==========================================

    // Step 1: Create Goal and Plan Version 1 for User A
    console.log('\n--- Step 1: User A Creates Plan and Version 1 ---');
    const createGoalRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Retirement Independence',
          goalType: 'retirement',
          targetAmountCents: 150000000,
          currentAmountCents: 50000000,
          targetDate: '2045-06-01'
        })
      });
      return { status: res.status, body: await res.json() };
    });
    const goalAId = createGoalRes.body?.goal?.id || createGoalRes.body?.id;
    console.log(`Created Goal for User A: ${goalAId}, status: ${createGoalRes.status}`);
    if (!goalAId) {
      throw new Error(`Failed to create goal for User A: status=${createGoalRes.status}, body=${JSON.stringify(createGoalRes.body)}`);
    }

    const basePlanSnapshot = {
      calculatorMode: 'fire-number',
      timeline: { currentAge: 35, retirementAge: 55, planEndAge: 90 },
      scenarios: [],
      plan: {
        annualExpense: 40000,
        initialPortfolio: 500000,
        withdrawalTiming: 'start',
        desiredFinalValue: 0,
        ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }],
        oneOffEvents: []
      }
    };

    const basePlanResult = calculateFirePlan(basePlanSnapshot.plan);
    const createPlanRes = await pageA.evaluate(async ({ goalId, snapshot, result }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          name: 'Retirement Independence Roadmap',
          label: 'Baseline 2026',
          notes: 'Conservative 3.5% SWR',
          snapshot,
          result
        })
      });
      return { status: res.status, body: await res.json() };
    }, { goalId: goalAId, snapshot: basePlanSnapshot, result: basePlanResult });

    const planAId = createPlanRes.body.plan.id;
    console.log(`Created Plan for User A: ${planAId}, Version: ${createPlanRes.body.plan.versionNumber}`);
    report.b10_saved_decision_navigation.plan_created_version_1 = createPlanRes.status === 201 && createPlanRes.body.plan.versionNumber === 1;

    // Step 2: Create Revision (Version 2) for Plan A
    console.log('\n--- Step 2: User A Creates Plan Version 2 (Revision) ---');
    const v2Snapshot = {
      ...basePlanSnapshot,
      timeline: { currentAge: 35, retirementAge: 52, planEndAge: 90 },
      plan: {
        ...basePlanSnapshot.plan,
        annualExpense: 50000,
        initialPortfolio: 600000
      }
    };

    const v2Result = calculateFirePlan(v2Snapshot.plan);
    const createV2Res = await pageA.evaluate(async ({ planId, snapshot, result }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Retirement Independence Roadmap',
          label: 'Accelerated FIRE 2026',
          notes: 'Retire earlier at age 52',
          snapshot,
          result
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, snapshot: v2Snapshot, result: v2Result });

    console.log(`Created Version 2 for Plan A: status ${createV2Res.status}, versionNumber: ${createV2Res.body?.plan?.versionNumber}`);
    report.b10_saved_decision_navigation.plan_revised_version_2 = createV2Res.status === 200 && createV2Res.body?.plan?.versionNumber === 2;

    // Step 3: User A Navigates to Exact Older Version 1 Link
    console.log('\n--- Step 3: Exact Deep Link Navigation to Version 1 ---');
    const v1Url = `${previewUrl}/plans?planId=${planAId}&version=1`;
    await pageA.goto(v1Url, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });
    await pageA.waitForSelector('.historical-version-banner', { timeout: 15000 });

    const renderedVersionBanner = await pageA.locator('.historical-version-banner').innerText();
    const renderedOverview = await pageA.locator('.planning-overview').innerText();

    console.log(`Rendered on v1 deep link: Banner="${renderedVersionBanner}", Overview="${renderedOverview}"`);

    report.b10_saved_decision_navigation.exact_v1_link_navigated = renderedVersionBanner.includes('Version 1');
    report.b10_saved_decision_navigation.v2_inputs_not_rendered_on_v1_link =
      !renderedOverview.includes('$600,000') && renderedOverview.includes('$500,000');

    // Reload page on the exact link and assert immutability
    console.log(`Current URL before reload: ${pageA.url()}`);
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    console.log(`Current URL after reload: ${pageA.url()}`);
    await pageA.waitForSelector('.planning-workspace, .planning-controlled-error, .auth-gate-card', { timeout: 15000 });
    const domState = await pageA.evaluate(() => ({
      url: window.location.href,
      clerkLoaded: Boolean(window.Clerk?.loaded),
      clerkUser: Boolean(window.Clerk?.user),
      workspacePresent: Boolean(document.querySelector('.planning-workspace')),
      bannerPresent: Boolean(document.querySelector('.historical-version-banner')),
      bannerText: document.querySelector('.historical-version-banner')?.innerText,
      errorPresent: Boolean(document.querySelector('.planning-controlled-error')),
      errorText: document.querySelector('.planning-controlled-error')?.innerText,
      authGate: Boolean(document.querySelector('.auth-gate-card'))
    }));
    console.log('DOM state after reload:', JSON.stringify(domState));

    await pageA.waitForSelector('.historical-version-banner', { timeout: 15000 });

    const reloadOverview = await pageA.locator('.planning-overview').innerText();
    const reloadBanner = await pageA.locator('.historical-version-banner').innerText();
    console.log(`Reload on v1: Banner="${reloadBanner}", Overview="${reloadOverview}"`);
    report.b10_saved_decision_navigation.exact_v1_inputs_restored_after_reload =
      reloadOverview.includes('$500,000') && reloadBanner.includes('Version 1');

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '01_b10_v1_deep_link_restored.png'), fullPage: false });

    // Step 4: Unsaved changes protection modal
    console.log('\n--- Step 4: Unsaved Changes Protection Modal ---');
    // Ensure we are on the active plan workspace with Version 2 explicitly settled
    await pageA.goto(`${previewUrl}/plans?planId=${planAId}&version=2`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });

    // Wait until draft form and version state are fully settled with loaded Plan A Version 2
    await pageA.waitForFunction(
      () => {
        const input = document.querySelector('.planning-form-grid input');
        const overview = document.querySelector('.planning-overview')?.innerText || '';
        return (
          input &&
          input.value === 'Retirement Independence Roadmap' &&
          overview.includes('Version 2 loaded')
        );
      },
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.planning-history-panel article', { timeout: 15000 });
    await pageA.waitForTimeout(500);

    // Make the draft assumptions dirty by editing plan name in the form grid
    const planNameInput = pageA.locator('.planning-form-grid input').first();
    await planNameInput.fill('Retirement Base (Unsaved Assumptions)');
    await pageA.waitForTimeout(300);

    const filledValue = await planNameInput.inputValue();
    console.log(`Draft value immediately after fill: "${filledValue}"`);

    // Click "Load" on version 1 in history panel (specifically the row for Version 1)
    const loadVersionBtn = pageA.locator('.planning-history-panel article:has-text("Version 1") button:has-text("Load")');
    await loadVersionBtn.click();
    await pageA.waitForSelector('.modal-scrim', { timeout: 5000 }).catch(() => {});

    const modalVisible = await pageA.locator('.modal-scrim').isVisible().catch(() => false);
    console.log(`Unsaved changes modal appeared: ${modalVisible}`);
    report.b10_saved_decision_navigation.unsaved_changes_modal_rendered_on_dirty_nav = modalVisible;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '02_b10_unsaved_changes_modal.png') });

    if (modalVisible) {
      // Cancel / Keep editing
      const cancelBtn = pageA.locator('.modal-scrim button:has-text("Keep editing")').first();
      await cancelBtn.click();
      await pageA.locator('.modal-scrim').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      const modalClosed = !(await pageA.locator('.modal-scrim').isVisible().catch(() => false));
      // Verify dirty input is still intact
      const preservedName = await planNameInput.inputValue().catch(() => '');
      console.log(`Unsaved cancel check: modalClosed=${modalClosed}, preservedName="${preservedName}"`);
      report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state =
        modalClosed && preservedName === 'Retirement Base (Unsaved Assumptions)';

      // Re-trigger and Discard and load
      await loadVersionBtn.click();
      await pageA.waitForSelector('.modal-scrim', { timeout: 5000 }).catch(() => {});
      const discardBtn = pageA.locator('.modal-scrim button:has-text("Discard and load")').first();
      await discardBtn.click();
      await pageA.locator('.modal-scrim').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      const modalClosedAfterDiscard = !(await pageA.locator('.modal-scrim').isVisible().catch(() => false));
      const v1BannerLoaded = await pageA.locator('.historical-version-banner').isVisible().catch(() => false);
      console.log(`Unsaved discard check: modalClosedAfterDiscard=${modalClosedAfterDiscard}, v1BannerLoaded=${v1BannerLoaded}`);
      report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation =
        modalClosedAfterDiscard && v1BannerLoaded;
    } else {
      report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state = false;
      report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation = false;
    }

    // Step 5: Controlled 404 / Missing Plan and Version
    console.log('\n--- Step 5: Controlled 404 / Missing State ---');
    await pageA.goto(`${previewUrl}/plans?planId=nonexistent_plan_999&version=1`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-controlled-error, [data-testid="planning-error-state"], .planning-workspace', { timeout: 15000 });
    const errorStateText = await pageA.locator('.planning-controlled-error, [data-testid="planning-error-state"]').innerText().catch(() => '');
    console.log(`Controlled missing plan error text: "${errorStateText}"`);
    report.b10_saved_decision_navigation.controlled_error_on_missing_plan =
      errorStateText.toLowerCase().includes('not found') ||
      errorStateText.toLowerCase().includes('unavailable') ||
      errorStateText.toLowerCase().includes('plan');

    await pageA.goto(`${previewUrl}/plans?planId=${planAId}&version=99`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-controlled-error, [data-testid="planning-error-state"], .planning-workspace', { timeout: 15000 });
    const missingVersionText = await pageA.locator('.planning-controlled-error, [data-testid="planning-error-state"]').innerText().catch(() => '');
    console.log(`Controlled missing version error text: "${missingVersionText}"`);
    report.b10_saved_decision_navigation.controlled_error_on_missing_version =
      missingVersionText.toLowerCase().includes('version') ||
      missingVersionText.toLowerCase().includes('not found') ||
      missingVersionText.toLowerCase().includes('unavailable');

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '03_b10_controlled_missing_error.png') });

    // Step 6: Tenant B Isolation on Plan A
    console.log('\n--- Step 6: Tenant B Isolation Verification ---');
    const tenantBPlanFetch = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}`);
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B fetch Tenant A plan status: ${tenantBPlanFetch.status} (expected 404)`);
    report.b10_saved_decision_navigation.tenant_b_cannot_access_tenant_a_plan = tenantBPlanFetch.status === 404;

    const tenantBV1Fetch = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}/versions/1`);
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B fetch Tenant A version 1 status: ${tenantBV1Fetch.status} (expected 404)`);

    // Verify DB full record immutability
    const v1DbRow = await queryD1(
      'SELECT pv.version_number, fpi.input_json FROM plan_versions pv JOIN fire_plan_inputs fpi ON fpi.plan_version_id = pv.id WHERE pv.plan_id = ? AND pv.version_number = 1;',
      [planAId]
    );
    const v1Snapshot = JSON.parse(v1DbRow[0].input_json);
    report.b10_saved_decision_navigation.full_record_immutability_verified =
      v1Snapshot.plan.annualExpense === 40000 &&
      v1Snapshot.plan.initialPortfolio === 500000 &&
      v1Snapshot.timeline.retirementAge === 55;

    // ==========================================
    // B11: Monthly Review Loop & R5 Single Plan Lifecycle
    // ==========================================
    console.log('\n--- Step 7: B11 Monthly Review Loop & R5 Single Plan Lifecycle ---');
    const todayStr = new Date().toISOString().slice(0, 10);

    // Enforce >=7-day rule (submitting immediately on newly created plan must fail)
    console.log('Testing >=7-day returning review rule on newly created plan...');
    const tooEarlyRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          notes: 'Immediate review attempt on newly created plan'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Immediate repeat review response: status=${tooEarlyRes.status}, code=${tooEarlyRes.body?.code}`);
    report.b11_monthly_review_loop.returning_review_rule_enforced_within_7_days =
      tooEarlyRes.status === 400 && (tooEarlyRes.body?.code === 'TOO_EARLY_REVIEW' || (tooEarlyRes.body?.error && tooEarlyRes.body.error.includes('at least 7 days')));

    // Backdate Plan A in D1 to 35 days ago to establish a single aged plan needing monthly review (>30 days)
    // and backdate Goal A updated_at to 35 days ago to surface stale evidence warning
    console.log('Backdating Plan A and Goal A in D1 to 35 days ago (establishing single aged plan for R5)...');
    await queryD1("UPDATE plans SET created_at = datetime('now', '-35 days'), updated_at = datetime('now', '-35 days') WHERE id = ?;", [planAId]);
    await queryD1("UPDATE plan_versions SET created_at = datetime('now', '-35 days') WHERE plan_id = ?;", [planAId]);
    await queryD1("UPDATE goals SET updated_at = datetime('now', '-35 days') WHERE id = ?;", [goalAId]);

    // R5 Stage 1: Observe Dashboard in DUE state
    console.log('\n--- R5 Stage 1: Dashboard in DUE state ---');
    await pageA.goto(`${previewUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.dashboard-summary-grid, .financial-dashboard', { timeout: 15000 });
    // Wait for the due reviews check to settle past the loading placeholder
    await pageA.waitForFunction(
      () => !document.querySelector('.dashboard-reviews-rollup')?.innerText.includes('Checking review cadence'),
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.dashboard-reviews-rollup', { timeout: 15000 });

    const rollupVisible = await pageA.locator('.dashboard-reviews-rollup').isVisible().catch(() => false);
    console.log(`Dashboard reviews rollup visible (Due state): ${rollupVisible}`);
    report.b28_presentation_and_accessibility.dashboard_reviews_rollup_rendered = rollupVisible;

    // Wait for due review card or plan card to appear
    await pageA.waitForSelector('.dashboard-review-card, .dashboard-plan-card', { timeout: 15000 });
    const dueCardsCount = await pageA.locator('.dashboard-review-card, .dashboard-plan-card').count();
    console.log(`Dashboard due cards count: ${dueCardsCount}`);
    report.b28_presentation_and_accessibility.dashboard_due_cards_have_deep_links = dueCardsCount > 0;

    const statusBadgesCount = await pageA.locator('.review-status-badge, .review-badge').count();
    console.log(`Review status badges on dashboard: ${statusBadgesCount}`);
    report.b28_presentation_and_accessibility.review_status_badges_explicit_text = statusBadgesCount > 0;

    // Stage 1 visual capture: verify target locators visible before screenshots
    const stage1Rollup = await assertTargetLocatorVisible(
      pageA.locator('.dashboard-reviews-rollup'),
      '.dashboard-reviews-rollup'
    );
    const stage1DueCard = await assertTargetLocatorVisible(
      stage1Rollup.locator('.dashboard-review-card'),
      '.dashboard-review-card in .dashboard-reviews-rollup'
    );
    await assertTargetLocatorVisible(
      stage1DueCard.locator('.review-badge, .review-status-badge'),
      'review badge in due review card'
    );

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '05_b28_dashboard_review_rollup.png'), fullPage: true });
    await stage1Rollup.scrollIntoViewIfNeeded().catch(() => {});
    await stage1Rollup.screenshot({ path: join(SCREENSHOTS_DIR, '05_b28_dashboard_review_rollup_focused.png') });

    // R5 Stage 2: Perform DEFER review on Plan A (7 days)
    console.log('\n--- R5 Stage 2: Defer Plan A Review (7 days) ---');
    const deferRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'defer',
          status: 'deferred',
          deferDays: 7,
          idempotencyKey: 'review-defer-c09',
          notes: 'Deferring review for 1 week'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Defer review response: status=${deferRes.status}, decision=${deferRes.body?.review?.decision}`);
    report.b11_monthly_review_loop.review_defer_choice_persisted =
      (deferRes.status === 200 || deferRes.status === 201) && deferRes.body?.review?.decision === 'defer' && deferRes.body?.review?.status === 'deferred';

    // R5 Stage 3: Perform KEEP review on Plan A
    console.log('\n--- R5 Stage 3: Keep Plan A Review ---');
    const submitReviewRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          idempotencyKey: 'review-keep-c09',
          notes: 'Portfolio on track, assumptions validated'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });

    console.log(`Submit review response: status=${submitReviewRes.status}`);
    const reviewRecord = submitReviewRes.body?.review;
    report.b11_monthly_review_loop.review_saved_keep_choice = (submitReviewRes.status === 200 || submitReviewRes.status === 201) && reviewRecord?.decision === 'keep';
    report.b11_monthly_review_loop.review_next_due_date_computed = Boolean(reviewRecord?.nextReviewDue) && reviewRecord?.nextReviewDue > todayStr;

    // Reload page on /plans and review panel: verify status persisted
    await pageA.goto(`${previewUrl}/plans?planId=${planAId}&version=1`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-review-panel', { timeout: 15000 });

    const reviewStatusText = await pageA.locator('.planning-review-panel .review-status-card strong').innerText().catch(() => '');
    console.log(`Review status card text after reload: "${reviewStatusText}"`);
    report.b11_monthly_review_loop.review_completed_status_persisted_after_reload =
      reviewStatusText.toLowerCase().includes('up to date') ||
      reviewStatusText.toLowerCase().includes('completed') ||
      reviewStatusText.toLowerCase().includes('assumptions');

    // After Keep review visual capture: verify target locators visible before screenshots
    const reviewPanelLocator = await assertTargetLocatorVisible(
      pageA.locator('.planning-review-panel'),
      '.planning-review-panel'
    );
    const reviewStatusCardLocator = await assertTargetLocatorVisible(
      reviewPanelLocator.locator('.review-status-card'),
      '.review-status-card inside .planning-review-panel'
    );
    const reviewCardFullText = (await reviewStatusCardLocator.innerText().catch(() => '')).toLowerCase();
    if (!reviewCardFullText.includes('up to date') && !reviewCardFullText.includes('completed') && !reviewCardFullText.includes('assumptions')) {
      throw new Error(`Target status text missing in .review-status-card: got "${reviewCardFullText}"`);
    }
    if (!reviewCardFullText.includes('next review due')) {
      throw new Error(`Target next review due text missing in .review-status-card: got "${reviewCardFullText}"`);
    }

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '04_b11_review_completed_panel.png'), fullPage: true });

    // Measure clearance and capture focused screenshots at desktop and mobile in light and dark modes (B28)
    console.log('Verifying review panel clearance from sticky topbar (B28)...');
    const clearanceResults = [];

    const measureClearance = async (modeLabel, targetMode, width, height, screenshotFile) => {
      await pageA.setViewportSize({ width, height });
      const themeProps = await switchTheme(pageA, targetMode);
      if (themeProps.dataMode !== targetMode) {
        throw new Error(`Failed to activate ${targetMode} theme: data-mode is "${themeProps.dataMode}"`);
      }
      if (!themeProps.surface || !themeProps.heading) {
        throw new Error(`Computed theme tokens missing in ${modeLabel}: surface="${themeProps.surface}", heading="${themeProps.heading}"`);
      }

      await reviewPanelLocator.evaluate((el) => {
        el.scrollIntoView({ block: 'start', behavior: 'auto' });
      });
      await pageA.waitForTimeout(300);

      // Navigate by keyboard (Tab) into review control
      const precedingElement = pageA.locator('.planning-save-panel button').last();
      if (await precedingElement.isVisible().catch(() => false)) {
        await precedingElement.focus();
        await pageA.keyboard.press('Tab');
      } else {
        for (let i = 0; i < 40; i++) {
          await pageA.keyboard.press('Tab');
          const inPanel = await pageA.evaluate(() => {
            const active = document.activeElement;
            const panel = document.querySelector('.planning-review-panel');
            return Boolean(panel && panel.contains(active));
          });
          if (inPanel) break;
        }
      }

      const activeControlInfo = await pageA.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const panel = document.querySelector('.planning-review-panel');
        const isInside = Boolean(panel && panel.contains(el));
        const isInteractive = ['INPUT', 'BUTTON', 'A', 'SELECT', 'TEXTAREA'].includes(el.tagName);
        const rect = el.getBoundingClientRect();
        return {
          isInside,
          isInteractive,
          tag: el.tagName,
          type: el.getAttribute('type'),
          value: el.getAttribute('value'),
          name: el.getAttribute('name'),
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
        };
      });

      if (!activeControlInfo || !activeControlInfo.isInside || !activeControlInfo.isInteractive) {
        throw new Error(`Keyboard navigation failed to reach interactive control in .planning-review-panel: ${JSON.stringify(activeControlInfo)}`);
      }

      const topbarEl = pageA.locator('.topbar');
      const topbarCount = await topbarEl.count();
      if (topbarCount !== 1) {
        throw new Error(`Expected exactly 1 sticky topbar, got ${topbarCount}`);
      }

      const { headingEl, badgeEl } = await locateReviewPanelHeaderElements(reviewPanelLocator);
      const panelEl = reviewPanelLocator;

      const topbarBox = await topbarEl.boundingBox();
      const headingBox = await headingEl.boundingBox();
      const badgeBox = await badgeEl.boundingBox();
      const panelBox = await panelEl.boundingBox();
      const controlBox = activeControlInfo.rect;

      const topbarBottom = topbarBox ? topbarBox.y + topbarBox.height : 0;
      const headingTop = headingBox ? headingBox.y : 0;
      const badgeTop = badgeBox ? badgeBox.y : 0;
      const controlTop = controlBox ? controlBox.y : 0;

      const headingClearance = headingTop - topbarBottom;
      const badgeClearance = badgeTop - topbarBottom;
      const controlClearance = controlTop - topbarBottom;

      const noOverlap = Boolean(
        topbarBox && headingBox && badgeBox && controlBox &&
        headingTop >= topbarBottom &&
        badgeTop >= topbarBottom &&
        controlTop >= topbarBottom
      );

      console.log(`[Clearance Check - ${modeLabel}]: topbarBottom=${topbarBottom.toFixed(1)}, headingTop=${headingTop.toFixed(1)}, badgeTop=${badgeTop.toFixed(1)}, controlTop=${controlTop.toFixed(1)}, clearance=${headingClearance.toFixed(1)}px, noOverlap=${noOverlap}`);

      await pageA.screenshot({ path: join(SCREENSHOTS_DIR, screenshotFile) });

      return {
        modeLabel,
        targetMode,
        themeProps,
        topbarBox,
        headingBox,
        badgeBox,
        controlBox,
        panelBox,
        clearance: headingClearance,
        badgeClearance,
        controlClearance,
        noOverlap
      };
    };

    // 1. Desktop Light (1280px)
    const desktopLight = await measureClearance('Desktop Light 1280px', 'light', 1280, 800, '04_b11_review_completed_panel_focused.png');
    clearanceResults.push(desktopLight);

    // 2. Desktop Dark (1280px)
    const desktopDark = await measureClearance('Desktop Dark 1280px', 'dark', 1280, 800, '04_b11_review_completed_panel_focused_dark.png');
    clearanceResults.push(desktopDark);

    // 3. Mobile Light (320px)
    const mobileLight = await measureClearance('Mobile Light 320px', 'light', 320, 640, '04_b11_review_completed_panel_focused_mobile_320px.png');
    clearanceResults.push(mobileLight);

    // 4. Mobile Dark (320px)
    const mobileDark = await measureClearance('Mobile Dark 320px', 'dark', 320, 640, '04_b11_review_completed_panel_focused_mobile_dark.png');
    clearanceResults.push(mobileDark);

    // Restore desktop viewport and light theme
    await pageA.setViewportSize({ width: 1280, height: 800 });
    await switchTheme(pageA, 'light');

    const clearanceVerification = verifyClearance(clearanceResults);
    console.log(`All clearance checks passed (zero topbar overlap across viewports/themes): ${clearanceVerification.passed}`);
    report.b28_presentation_and_accessibility.review_panel_no_topbar_overlap = clearanceVerification.passed;

    // Idempotent repeat: submitting same evidence date, decision and idempotencyKey
    console.log('Testing idempotent repeat review submission...');
    const idempotencyRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          idempotencyKey: 'review-keep-c09',
          notes: 'Portfolio on track, assumptions validated'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Idempotent repeat status: ${idempotencyRes.status}`);
    const reviewCountDb = await queryD1('SELECT count(*) as cnt FROM plan_reviews WHERE plan_id = ?;', [planAId]);
    console.log(`Total reviews in DB for plan A: ${reviewCountDb[0]?.cnt}`);
    // 1 defer + 1 keep = 2 reviews; duplicate keep is idempotent and does not add a 3rd row
    report.b11_monthly_review_loop.idempotent_repeat_review_not_duplicated =
      idempotencyRes.status === 200 && (reviewCountDb[0]?.cnt ?? 0) === 2;

    // R5 Stage 4: Revise Review Choice (Full UI Journey -> Version 3 -> Reload -> Immutability)
    console.log('\n--- R5 Stage 4: Revise Review Choice Full Journey ---');
    await pageA.goto(`${previewUrl}/plans?planId=${planAId}&version=2`, { waitUntil: 'domcontentloaded' });
    const stage4Panel = await waitForPlanningWorkspaceReady(pageA, {
      expectedPlanId: planAId,
      expectedVersion: 2,
      timeout: 15000,
      contextLabel: 'Stage 4 Version 2',
      screenshotsDir: SCREENSHOTS_DIR
    });

    // Verify Version 2 review form radio controls
    const reviseChoiceCard = await assertTargetLocatorVisible(
      stage4Panel.locator('.review-choice-card:has(input[value="revise"])'),
      'Revise assumptions choice card'
    );
    await reviseChoiceCard.click();

    // Verify radio input is actually checked in the DOM
    const reviseRadioInput = stage4Panel.locator('input[value="revise"]');
    const reviseRadioCount = await reviseRadioInput.count();
    if (reviseRadioCount !== 1) {
      throw new Error(`Expected exactly 1 revise radio input in review panel, got ${reviseRadioCount}`);
    }
    const isRadioChecked = await reviseRadioInput.isChecked();
    const reviseSelectionResult = verifyReviseUiSelection(isRadioChecked);
    if (!reviseSelectionResult.passed) {
      throw new Error(`Revise UI selection failed: ${reviseSelectionResult.reason}`);
    }
    report.b11_monthly_review_loop.review_revise_ui_selected = true;

    // Fill review notes
    const reviewNotesInput = stage4Panel.locator('.review-notes-field input');
    const reviewNotesCount = await reviewNotesInput.count();
    if (reviewNotesCount === 1 && await reviewNotesInput.isVisible()) {
      await reviewNotesInput.fill('Revise assumptions: lower expenses and extended timeline');
    }

    // Capture D1 state of prior versions BEFORE Version 3 creation across version, inputs, AND results
    const v1Before = {
      version: await queryD1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = 1;', [planAId]),
      inputs: await queryD1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 1);', [planAId]),
      results: await queryD1('SELECT * FROM fire_plan_results WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 1);', [planAId])
    };
    const v2Before = {
      version: await queryD1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = 2;', [planAId]),
      inputs: await queryD1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 2);', [planAId]),
      results: await queryD1('SELECT * FROM fire_plan_results WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 2);', [planAId])
    };

    // Submit the revision review via UI button
    const recordReviewBtn = await assertTargetLocatorVisible(
      stage4Panel.locator('.review-action-container .primary-button'),
      'Record revision review button'
    );
    await recordReviewBtn.click();
    await pageA.waitForSelector('[data-testid="plan-revision-prompt"]', { timeout: 15000 });

    // Verify explicit revision next step prompt is rendered in the UI
    const revisionPrompt = await assertTargetLocatorVisible(
      pageA.locator('[data-testid="plan-revision-prompt"]'),
      'Explicit plan revision prompt banner'
    );
    const revisionPromptText = (await revisionPrompt.innerText().catch(() => '')).toLowerCase();
    const hasNextStepGuidance = revisionPromptText.includes('next step') && revisionPromptText.includes('calculator');
    report.b11_monthly_review_loop.review_revise_next_step_displayed = hasNextStepGuidance;
    console.log(`Revision prompt displayed: ${hasNextStepGuidance}`);

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '04_b11_review_revise_prompt.png'), fullPage: false });

    // Open calculator from the revision prompt to deliberately modify a real financial assumption
    console.log('Navigating to FIRE calculator to deliberately edit financial assumptions for Version 3...');
    const openCalcBtn = await assertTargetLocatorVisible(
      revisionPrompt.locator('button:has-text("Open calculator")'),
      'Open calculator button in revision prompt'
    );
    await openCalcBtn.click();
    await pageA.waitForURL('**/calculators/fire', { timeout: 15000 });

    // Verify the loaded plan context bar is displayed on the calculator
    const calcPlanContext = await assertTargetLocatorVisible(
      pageA.locator('[data-testid="calculator-plan-context"]'),
      'Calculator plan context bar'
    );
    console.log(`Calculator plan context banner visible on /calculators/fire`);

    // Verify current annual expense input (Version 2 value: 50,000)
    const annualExpenseInput = await assertTargetLocatorVisible(
      pageA.locator('input#fire-annual-expense'),
      'Annual expense input on FIRE calculator'
    );
    const initialExpenseVal = await annualExpenseInput.inputValue();
    console.log(`Loaded Version 2 annual expense: ${initialExpenseVal}`);
    if (initialExpenseVal !== '50000') {
      throw new Error(`Expected loaded Version 2 annual expense to be 50000, got "${initialExpenseVal}"`);
    }

    // Change numeric financial assumption: annualExpense from 50,000 to 45,000
    await annualExpenseInput.fill('45000');
    await annualExpenseInput.dispatchEvent('change');
    await pageA.waitForTimeout(300);

    const editedExpenseVal = await annualExpenseInput.inputValue();
    console.log(`Edited annual expense control value before saving: ${editedExpenseVal}`);
    if (editedExpenseVal !== '45000') {
      throw new Error(`Expected edited annual expense to be 45000, got "${editedExpenseVal}"`);
    }

    // Return to Planning Workspace using the context bar button
    const backToPlansBtn = await assertTargetLocatorVisible(
      calcPlanContext.locator('button:has-text("Back to Planning Workspace")'),
      'Back to Planning Workspace button'
    );
    await backToPlansBtn.click();
    await pageA.waitForURL('**/plans**', { timeout: 15000 });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });
    await pageA.waitForSelector('.planning-save-panel .planning-notes-field input', { timeout: 15000 });

    // In the planning workspace, provide version notes & label
    const notesInput = pageA.locator('.planning-save-panel .planning-notes-field input');
    const notesCount = await notesInput.count();
    if (notesCount !== 1) {
      throw new Error(`Expected exactly 1 notes input in .planning-save-panel, got ${notesCount}`);
    }
    await notesInput.fill('Version 3: Lowered annual expenses to $45,000');
    const labelInput = pageA.locator('.planning-save-panel .planning-form-grid label:has-text("Version label") input');
    const labelCount = await labelInput.count();
    if (labelCount === 1 && await labelInput.isVisible()) {
      await labelInput.fill('Revised $45k spend');
    }

    // Save Version 3 via UI
    const saveNewVersionBtn = await assertTargetLocatorVisible(
      pageA.locator('.planning-save-panel button:has-text("Save new version")'),
      'Save new version button'
    );
    await saveNewVersionBtn.click();

    // Wait for Version 3 to be persisted and displayed
    await pageA.waitForFunction(() => {
      const status = document.querySelector('.storage-status')?.innerText || '';
      const overview = document.querySelector('.planning-overview')?.innerText || '';
      return status.includes('Version 3 saved') || overview.includes('Version 3 loaded');
    }, { timeout: 15000 });

    // Verify Version 3 in D1
    const v3VersionRows = await queryD1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = 3;', [planAId]);
    const v3InputsRows = await queryD1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 3);', [planAId]);
    const v3ResultsRows = await queryD1('SELECT * FROM fire_plan_results WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 3);', [planAId]);

    const financialDiff = verifyFinancialRevisionDiff(
      { version: v2Before.version, inputs: v2Before.inputs, results: v2Before.results },
      { version: v3VersionRows, inputs: v3InputsRows, results: v3ResultsRows }
    );
    console.log(`Financial revision diff: v2 expense=${financialDiff.v2Expense}, v3 expense=${financialDiff.v3Expense}, diffPassed=${financialDiff.passed}`);
    report.b11_monthly_review_loop.plan_revised_version_3_persisted = v3VersionRows.length === 1 && financialDiff.passed;

    // Verify byte-exact immutability of Versions 1 and 2 across ALL THREE tables
    const v1After = {
      version: await queryD1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = 1;', [planAId]),
      inputs: await queryD1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 1);', [planAId]),
      results: await queryD1('SELECT * FROM fire_plan_results WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 1);', [planAId])
    };
    const v2After = {
      version: await queryD1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = 2;', [planAId]),
      inputs: await queryD1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 2);', [planAId]),
      results: await queryD1('SELECT * FROM fire_plan_results WHERE plan_version_id = (SELECT id FROM plan_versions WHERE plan_id = ? AND version_number = 2);', [planAId])
    };

    const immutabilityResult = verifyPriorVersionsImmutability(v1Before, v1After, v2Before, v2After);
    console.log(`Prior versions immutability verified across versions, inputs, and results: ${immutabilityResult.passed}`);
    report.b11_monthly_review_loop.prior_versions_immutable_after_v3 = immutabilityResult.passed;

    // Reload Version 3 via deep link
    console.log('Reloading Version 3 via deep link...');
    await pageA.goto(`${previewUrl}/plans?planId=${planAId}&version=3`, { waitUntil: 'domcontentloaded' });
    await waitForPlanningWorkspaceReady(pageA, {
      expectedPlanId: planAId,
      expectedVersion: 3,
      timeout: 15000,
      contextLabel: 'Version 3 Reload',
      screenshotsDir: SCREENSHOTS_DIR
    });
    console.log('Planning overview confirms Version 3 loaded');

    // Navigate to calculator via product route to inspect actual numerical input
    const openCalcFromOverviewBtn = await assertTargetLocatorVisible(
      pageA.locator('.planning-save-panel .panel-heading button:has-text("Open calculator")'),
      'Open calculator button in Plan identity'
    );
    await openCalcFromOverviewBtn.click();
    await pageA.waitForURL('**/calculators/fire', { timeout: 15000 });
    await pageA.waitForSelector('input#fire-annual-expense', { timeout: 15000 });

    const reloadedCalcExpenseInput = await assertTargetLocatorVisible(
      pageA.locator('input#fire-annual-expense'),
      'Reloaded annual expense input on FIRE calculator'
    );
    const reloadedExpenseVal = await reloadedCalcExpenseInput.inputValue();
    console.log(`Annual expense input after Version 3 reload: ${reloadedExpenseVal}`);

    // Cross-check that D1 v3 snapshot and UI agree
    const v3Snapshot = JSON.parse(v3InputsRows[0].input_json);
    const v3SnapshotExpense = v3Snapshot?.plan?.annualExpense;
    const v3Reloaded = reloadedExpenseVal === '45000' && v3SnapshotExpense === 45000 && String(v3SnapshotExpense) === reloadedExpenseVal;
    console.log(`Version 3 reload verified: UI=${reloadedExpenseVal}, D1=${v3SnapshotExpense}, matched=${v3Reloaded}`);
    report.b11_monthly_review_loop.version_3_reload_verified = v3Reloaded;

    // Navigate back to planning workspace
    const backToPlansFromCalcBtn = await assertTargetLocatorVisible(
      pageA.locator('[data-testid="calculator-plan-context"] button:has-text("Back to Planning Workspace")'),
      'Back to Planning Workspace button'
    );
    await backToPlansFromCalcBtn.click();
    await pageA.waitForURL('**/plans**', { timeout: 15000 });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });

    // Verify review row in D1 is linked to Version 2 with decision=revise and check server-derived key
    const reviseReviewDb = await queryD1(
      "SELECT * FROM plan_reviews WHERE plan_id = ? AND decision = 'revise' AND plan_version_number = 2;",
      [planAId]
    );
    const persistedReviseReview = reviseReviewDb[0];
    const reviseReviewLinked = Boolean(persistedReviseReview && persistedReviseReview.idempotency_key);
    console.log(`Persisted revise review linked in D1 with key: "${persistedReviseReview?.idempotency_key}"`);

    // Verify idempotent repeat using exact persisted key and fields
    console.log('Testing exact idempotent replay with persisted review fields...');
    const exactReplayRes = await pageA.evaluate(async ({ planId, key, evidenceDate, notes }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 2,
          evidenceDate,
          decision: 'revise',
          idempotencyKey: key,
          notes
        })
      });
      return { status: res.status, body: await res.json() };
    }, {
      planId: planAId,
      key: persistedReviseReview?.idempotency_key,
      evidenceDate: persistedReviseReview?.evidence_date,
      notes: persistedReviseReview?.notes
    });

    const totalReviewsBeforeReplay = (await queryD1(
      "SELECT count(*) as cnt FROM plan_reviews WHERE plan_id = ?;",
      [planAId]
    ))[0]?.cnt ?? 0;

    const scopedReviseReviewsAfterExact = await queryD1(
      "SELECT * FROM plan_reviews WHERE plan_id = ? AND plan_version_number = 2 AND idempotency_key = ?;",
      [planAId, persistedReviseReview?.idempotency_key]
    );
    const totalReviewsAfterExact = (await queryD1(
      "SELECT count(*) as cnt FROM plan_reviews WHERE plan_id = ?;",
      [planAId]
    ))[0]?.cnt ?? 0;

    const exactReplayVerification = verifyIdempotentReplay({
      persistedReview: persistedReviseReview,
      replayKey: persistedReviseReview?.idempotency_key,
      replayDecision: 'revise',
      replayStatus: exactReplayRes.status,
      replayBody: exactReplayRes.body,
      reviewCount: scopedReviseReviewsAfterExact.length,
      scopedReviewCount: scopedReviseReviewsAfterExact.length,
      totalReviewsBefore: totalReviewsBeforeReplay,
      totalReviewsAfter: totalReviewsAfterExact,
      expectedTotalReviews: 3
    });

    // Test changed-intent replay with the SAME idempotency key (should return 409 IDEMPOTENCY_CONFLICT)
    console.log('Testing conflicting intent replay with same idempotency key (expecting 409)...');
    const conflictingReplayRes = await pageA.evaluate(async ({ planId, key, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 2,
          evidenceDate,
          decision: 'keep', // Changed intent!
          idempotencyKey: key,
          notes: 'Attempting to change decision under same idempotency key'
        })
      });
      return { status: res.status, body: await res.json() };
    }, {
      planId: planAId,
      key: persistedReviseReview?.idempotency_key,
      evidenceDate: persistedReviseReview?.evidence_date
    });

    // Query D1 AFTER conflicting request to verify exactly 1 row still exists and original decision is preserved
    const scopedReviseReviewsAfterConflict = await queryD1(
      "SELECT * FROM plan_reviews WHERE plan_id = ? AND plan_version_number = 2 AND idempotency_key = ?;",
      [planAId, persistedReviseReview?.idempotency_key]
    );
    const totalReviewsAfterConflict = (await queryD1(
      "SELECT count(*) as cnt FROM plan_reviews WHERE plan_id = ?;",
      [planAId]
    ))[0]?.cnt ?? 0;

    const conflictingReplayVerification = verifyIdempotentReplay({
      persistedReview: persistedReviseReview,
      replayKey: persistedReviseReview?.idempotency_key,
      replayDecision: 'keep',
      replayStatus: conflictingReplayRes.status,
      replayBody: conflictingReplayRes.body,
      reviewCount: scopedReviseReviewsAfterConflict.length,
      scopedReviewCount: scopedReviseReviewsAfterConflict.length,
      totalReviewsBefore: totalReviewsBeforeReplay,
      totalReviewsAfter: totalReviewsAfterConflict,
      expectedTotalReviews: 3,
      postConflictReview: scopedReviseReviewsAfterConflict[0]
    });

    const idempotentRetryPassed = exactReplayVerification.passed && conflictingReplayVerification.passed;
    console.log(`Idempotent retry (200 replay & 409 conflict): ${idempotentRetryPassed}`);
    report.b11_monthly_review_loop.idempotent_repeat_review_not_duplicated = idempotentRetryPassed;

    report.b11_monthly_review_loop.review_revise_choice_triggers_revision =
      report.b11_monthly_review_loop.review_revise_ui_selected &&
      report.b11_monthly_review_loop.review_revise_next_step_displayed &&
      report.b11_monthly_review_loop.plan_revised_version_3_persisted &&
      report.b11_monthly_review_loop.version_3_reload_verified &&
      report.b11_monthly_review_loop.prior_versions_immutable_after_v3 &&
      reviseReviewLinked &&
      idempotentRetryPassed;

    // Due reviews endpoint verification
    const dueReviewsRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/plans/due-reviews');
      return { status: res.status, body: await res.json() };
    });
    const dueList = dueReviewsRes.body?.dueReviews ?? dueReviewsRes.body?.plans ?? [];
    console.log(`Due reviews API status: ${dueReviewsRes.status}, count: ${dueList.length}`);
    report.b11_monthly_review_loop.due_reviews_endpoint_returned_plans =
      dueReviewsRes.status === 200 && Array.isArray(dueList);

    // Tenant B cannot review Tenant A plan
    const tenantBReviewRes = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate: '2026-06-01',
          decision: 'keep',
          status: 'completed',
          notes: 'Foreign attempt'
        })
      });
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B review Tenant A plan: status=${tenantBReviewRes.status} (expected 404)`);
    report.b11_monthly_review_loop.tenant_b_cannot_review_tenant_a_plan = tenantBReviewRes.status === 404;

    // Check account export includes plan_reviews
    const exportRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/account-data/export');
      return { status: res.status, body: await res.json() };
    });
    const exportedReviews = exportRes.body?.export?.data?.planReviews ?? exportRes.body?.data?.plan_reviews ?? [];
    console.log(`Account data export contains plan_reviews: ${Array.isArray(exportedReviews)} (count: ${exportedReviews?.length})`);
    report.b11_monthly_review_loop.plan_reviews_participate_in_data_export =
      exportRes.status === 200 && Array.isArray(exportedReviews) && exportedReviews.length >= 2;

    // ==========================================
    // B28: Goals Panel Presentation
    // ==========================================
    console.log('\n--- Step 8: B28 Goals Panel Presentation ---');
    await pageA.goto(`${previewUrl}/goals`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.goal-card, .goal-badges', { timeout: 15000 });
    await pageA.waitForSelector('.goal-linked-plan', { timeout: 15000 });

    const linkedPlanBadge = await pageA.locator('.goal-linked-plan').first().isVisible().catch(() => false);
    console.log(`Goals panel linked plan badge visible: ${linkedPlanBadge}`);
    report.b28_presentation_and_accessibility.goals_panel_linked_plan_badge_rendered = linkedPlanBadge;

    const evidenceDateDisclosed = await pageA.locator('.goal-evidence-date').first().isVisible().catch(() => false);
    console.log(`Goals panel evidence date disclosed: ${evidenceDateDisclosed}`);
    report.b28_presentation_and_accessibility.goals_panel_evidence_date_disclosed = evidenceDateDisclosed;

    const fundingGapVisible = await pageA.locator('.goal-funding-gap-row').first().isVisible().catch(() => false);
    console.log(`Goals panel funding gap visible: ${fundingGapVisible}`);
    report.b28_presentation_and_accessibility.goals_panel_funding_gap_rendered = fundingGapVisible;

    const explicitGoalStatus = await pageA.locator('.goal-status-badge').first().innerText().catch(() => '');
    console.log(`Goals panel explicit status: "${explicitGoalStatus}"`);
    report.b28_presentation_and_accessibility.goals_panel_explicit_text_status = Boolean(explicitGoalStatus);

    const staleWarningVisible = await pageA.locator('.stale-evidence-box, .stale-evidence-badge').first().isVisible().catch(() => false);
    console.log(`Goals panel stale evidence warning visible: ${staleWarningVisible}`);
    report.b28_presentation_and_accessibility.stale_evidence_warning_displayed_when_over_30_days = staleWarningVisible;

    // Goals page visual capture: verify target locators visible before screenshots
    const goalCardLocator = await assertTargetLocatorVisible(
      pageA.locator('.goal-card'),
      '.goal-card'
    );
    await assertTargetLocatorVisible(
      goalCardLocator.locator('.goal-linked-plan'),
      '.goal-linked-plan inside .goal-card'
    );
    await assertTargetLocatorVisible(
      goalCardLocator.locator('.goal-evidence-date'),
      '.goal-evidence-date inside .goal-card'
    );
    await assertTargetLocatorVisible(
      goalCardLocator.locator('.goal-funding-gap-row'),
      '.goal-funding-gap-row inside .goal-card'
    );
    await assertTargetLocatorVisible(
      goalCardLocator.locator('.stale-evidence-box, .stale-evidence-badge'),
      'stale warning (.stale-evidence-box, .stale-evidence-badge) inside .goal-card'
    );

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '06_b28_goals_panel_linked_plan.png'), fullPage: true });
    await goalCardLocator.scrollIntoViewIfNeeded().catch(() => {});
    await goalCardLocator.screenshot({ path: join(SCREENSHOTS_DIR, '06_b28_goals_panel_linked_plan_focused.png') });

    // Navigate to dashboard for theme switching and review badge contrast measurement
    await pageA.goto(`${previewUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForFunction(
      () => !document.querySelector('.dashboard-reviews-rollup')?.innerText.includes('Checking review cadence'),
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.dashboard-reviews-rollup .dashboard-review-card', { timeout: 15000 });

    const dashboardReviewCard = await assertTargetLocatorVisible(
      pageA.locator('.dashboard-reviews-rollup .dashboard-review-card'),
      '.dashboard-review-card inside .dashboard-reviews-rollup'
    );
    const badgeLocator = dashboardReviewCard.locator('.review-badge, .review-status-badge');
    const badgeCount = await badgeLocator.count();
    if (badgeCount !== 1) {
      throw new Error(`Expected exactly 1 review badge in dashboard review card, got ${badgeCount}`);
    }

    const measureBadge = async () => badgeLocator.evaluate((el) => {
      const parse = (value) => {
        if (!value) return { r: NaN, g: NaN, b: NaN, a: NaN };
        const m = value.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: m[4] === undefined ? 1 : +m[4] };
        const h = value.match(/^#([0-9a-f]{6})$/i);
        return h ? { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: 1 } : { r: NaN, g: NaN, b: NaN, a: NaN };
      };
      const blend = (fg, bg) => {
        if (isNaN(fg.a)) return bg;
        return {
          r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
          g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
          b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
          a: 1
        };
      };
      const chain = [];
      let node = el;
      while (node && chain.length < 12) {
        chain.push({ tag: node.tagName, background: getComputedStyle(node).backgroundColor });
        node = node.parentElement;
      }
      const isDark = document.documentElement.getAttribute('data-mode') === 'dark' || document.querySelector('.app')?.getAttribute('data-mode') === 'dark';
      let bg = isDark ? { r: 8, g: 21, b: 28, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
      for (const item of chain.reverse()) {
        const parsed = parse(item.background);
        if (!isNaN(parsed.r)) bg = blend(parsed, bg);
      }
      const fgStyle = getComputedStyle(el).color;
      return {
        fg: fgStyle,
        ancestorBackgrounds: chain,
        compositedBackground: `rgb(${bg.r}, ${bg.g}, ${bg.b})`
      };
    });

    // Theme switching & contrast checks
    console.log('Testing true theme switching and contrast for review badges...');
    const lightTheme = await switchTheme(pageA, 'light');
    await pageA.waitForTimeout(300);
    const lightBadgeColors = await measureBadge();
    const lightBadgeContrast = calculateContrast(lightBadgeColors.fg, lightBadgeColors.compositedBackground);
    console.log(`Light badge contrast: ${lightBadgeContrast}:1 over ${lightBadgeColors.compositedBackground} (fg: ${lightBadgeColors.fg})`);
    report.b28_presentation_and_accessibility.contrast_review_badges_light_pass =
      !isNaN(lightBadgeContrast) && lightBadgeContrast >= 4.5;

    // Light theme visual capture: verify target locators visible before screenshots
    const lightReviewCard = await assertTargetLocatorVisible(
      pageA.locator('.dashboard-reviews-rollup .dashboard-review-card'),
      'review card in light theme'
    );
    await assertTargetLocatorVisible(
      lightReviewCard.locator('.review-badge, .review-status-badge'),
      '.review-badge in light theme'
    );

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '07_b28_light_theme_presentation.png'), fullPage: true });
    await lightReviewCard.scrollIntoViewIfNeeded().catch(() => {});
    await lightReviewCard.screenshot({ path: join(SCREENSHOTS_DIR, '07_b28_light_theme_review_focused.png') });

    const darkTheme = await switchTheme(pageA, 'dark');
    await pageA.waitForTimeout(300);
    const darkBadgeColors = await measureBadge();
    const darkBadgeContrast = calculateContrast(darkBadgeColors.fg, darkBadgeColors.compositedBackground);
    console.log(`Dark badge contrast: ${darkBadgeContrast}:1 over ${darkBadgeColors.compositedBackground} (fg: ${darkBadgeColors.fg})`);
    report.b28_presentation_and_accessibility.contrast_review_badges_dark_pass =
      !isNaN(darkBadgeContrast) && darkBadgeContrast >= 4.5;

    // Dark theme visual capture: verify target locators visible before screenshots
    const darkReviewCard = await assertTargetLocatorVisible(
      pageA.locator('.dashboard-reviews-rollup .dashboard-review-card'),
      'review card in dark theme'
    );
    await assertTargetLocatorVisible(
      darkReviewCard.locator('.review-badge, .review-status-badge'),
      '.review-badge in dark theme'
    );

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '08_b28_dark_theme_presentation.png'), fullPage: true });
    await darkReviewCard.scrollIntoViewIfNeeded().catch(() => {});
    await darkReviewCard.screenshot({ path: join(SCREENSHOTS_DIR, '08_b28_dark_theme_review_focused.png') });
    report.b28_presentation_and_accessibility.theme_switching_verified = lightTheme.dataMode === 'light' && darkTheme.dataMode === 'dark';

    // Restore light theme
    await switchTheme(pageA, 'light');

    // Viewport Containment Checks
    console.log('Verifying responsive viewport containment...');
    const testViewport = async (w, h, name) => {
      await pageA.setViewportSize({ width: w, height: h });
      await pageA.waitForTimeout(300);
      const hasHorizontalScroll = await pageA.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`Viewport ${name} (${w}px): horizontal overflow=${hasHorizontalScroll}`);
      return !hasHorizontalScroll;
    };

    report.b28_presentation_and_accessibility.viewport_containment_desktop_1280px_verified = await testViewport(1280, 800, 'desktop');
    report.b28_presentation_and_accessibility.viewport_containment_tablet_768px_verified = await testViewport(768, 1024, 'tablet');
    report.b28_presentation_and_accessibility.viewport_containment_mobile_320px_verified = await testViewport(320, 568, 'mobile320');
    // Mobile 320 visual capture: verify target locators visible before screenshots
    const mobileReviewCard = await assertTargetLocatorVisible(
      pageA.locator('.dashboard-review-card, .dashboard-plan-card'),
      'review card (.dashboard-review-card, .dashboard-plan-card) at 320px'
    );
    await assertTargetLocatorVisible(
      mobileReviewCard.locator('.review-badge'),
      '.review-badge on review card at 320px'
    );
    await assertTargetLocatorVisible(
      pageA.locator('.mobile-menu-button:visible'),
      'navigation/action controls at 320px'
    );

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '09_b28_mobile_320px_presentation.png'), fullPage: true });
    await mobileReviewCard.scrollIntoViewIfNeeded().catch(() => {});
    await mobileReviewCard.screenshot({ path: join(SCREENSHOTS_DIR, '09_b28_mobile_320px_review_card_focused.png') });

    // Restore desktop viewport
    await pageA.setViewportSize({ width: 1280, height: 800 });

    // Keyboard navigation and deterministic activation proof
    console.log('Testing keyboard navigation accessibility and deterministic activation...');
    const keyboardProof = await executeKeyboardActionProof(pageA);
    console.log(
      `Keyboard proof: focusedCount=${keyboardProof.focusedCount}, focusRing=${keyboardProof.hasFocusRing}, ` +
      `targetFocused=${keyboardProof.targetFocused}, open=${keyboardProof.openStateVerified}, ` +
      `close=${keyboardProof.closeStateVerified}, actionActivated=${keyboardProof.actionActivated}`
    );
    if (!keyboardProof.passed) {
      console.error(`Keyboard proof failed: ${keyboardProof.reason}`);
    }
    report.b28_presentation_and_accessibility.keyboard_navigation_accessible = keyboardProof.passed === true;

  } catch (err) {
    console.error('Execution error occurred:', err);
    report.status = 'FAILED';
    report.error = err.message;
  } finally {
    // ==========================================
    // Fail-Closed Cleanup Protocol
    // ==========================================
    console.log('\n=== Executing Fail-Closed Cleanup Protocol for Both Synthetic Users ===');
    cleanupA = await performCleanup({
      userId: userAId,
      page: pageA,
      clerkClient
    });

    cleanupB = await performCleanup({
      userId: userBId,
      page: pageB,
      clerkClient
    });

    if (browser) {
      await browser.close().catch(() => {});
    }

    const cleanupReport = {
      userA: cleanupA,
      userB: cleanupB
    };

    report.cleanup = cleanupReport;

    persistEvidence(report, cleanupReport);

    const evaluation = evaluateReport(report, cleanupReport, deploymentConfig);
    console.log('\n=== Explicit Evaluation Result ===');
    console.log(`Status: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
    if (!evaluation.passed) {
      console.error('Evaluation failures:');
      for (const fail of evaluation.failures) {
        console.error(` - ${fail}`);
      }
      process.exitCode = 1;
    } else {
      console.log('All criteria verified and evaluated successfully!');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllProofs().catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  });
}
