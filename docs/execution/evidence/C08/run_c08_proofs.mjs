#!/usr/bin/env node

/**
 * C08 Verification & Evidence Capture Harness
 * Covers B26 (Dashboard & Accounts) and B27 (Transactions & Import Review)
 * on immutable preview deployment f737cfbb-0d0f-4ffc-9a43-5e3cda77d31a.
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createClerkClient } from '@clerk/backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

export const CANDIDATE_SHA = 'a95053b19108634656aef491e46b9be9fe3ea57d';
export const DEPLOYMENT_ID = 'f737cfbb-0d0f-4ffc-9a43-5e3cda77d31a';
export const PREVIEW_URL = 'https://f737cfbb.interactive-fire-calculator.pages.dev';
export const PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
export const ACCOUNT_ID = '4e1b7f6a7440770a01779a67602ec5e9';
export const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const WRANGLER_CONFIG = join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');

export const EVIDENCE_DIR = join(REPO_ROOT, 'docs/execution/evidence/C08');
export const SCREENSHOTS_DIR = join(EVIDENCE_DIR, 'screenshots');
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
export const REPORT_FILE = join(EVIDENCE_DIR, 'report.json');
export const CLEANUP_FILE = join(EVIDENCE_DIR, 'cleanup.json');
export const PRIVATE_MANIFEST_FILE = resolve(REPO_ROOT, '.env.manifest.local');

export const USER_TABLES = [
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

export async function verifyDeployment() {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/interactive-fire-calculator/deployments/${DEPLOYMENT_ID}`, {
    headers: { Authorization: `Bearer ${getCloudflareToken()}` }
  });
  const payload = await response.json();
  const deployment = payload.result;
  if (!response.ok || !payload.success || deployment?.environment !== 'preview' ||
      deployment?.url !== PREVIEW_URL || deployment?.latest_stage?.status !== 'success' ||
      deployment?.deployment_trigger?.metadata?.commit_hash !== CANDIDATE_SHA ||
      deployment?.d1_databases?.DB?.id !== PREVIEW_DB_ID) {
    throw new Error(`Deployment preflight failed: url=${deployment?.url}, commit=${deployment?.deployment_trigger?.metadata?.commit_hash}, db=${deployment?.d1_databases?.DB?.id}`);
  }
  return true;
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
  if (!colorStr || typeof colorStr !== 'string') return { r: 0, g: 0, b: 0, a: 1 };
  const rgbMatch = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    };
  }
  if (colorStr.startsWith('#')) {
    const hex = colorStr.replace('#', '');
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length >= 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      };
    }
  }
  return { r: 0, g: 0, b: 0, a: 1 };
}

export function sRgbLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(textColorStr, bgColorStr) {
  const fg = parseRgb(textColorStr);
  const bg = parseRgb(bgColorStr);
  const lum1 = sRgbLuminance(fg.r, fg.g, fg.b);
  const lum2 = sRgbLuminance(bg.r, bg.g, bg.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

// --------------------------------------------------------------------------
// Real Theme Switching & Verification (R2)
// --------------------------------------------------------------------------
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
      await page.reload({ waitUntil: 'networkidle' });
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
      primaryBg: style.getPropertyValue('--color-primary-bg').trim(),
      dataMode: app.getAttribute('data-mode')
    };
  });

  if (targetMode === 'dark') {
    if (themeProps.dataMode !== 'dark') {
      throw new Error(`Failed to activate dark mode: data-mode is "${themeProps.dataMode}"`);
    }
    if (!themeProps.canvas.includes('08151c') && !themeProps.surface.includes('10232c')) {
      throw new Error(`Dark mode CSS variables not applied: ${JSON.stringify(themeProps)}`);
    }
  } else {
    if (themeProps.dataMode !== 'light') {
      throw new Error(`Failed to activate light mode: data-mode is "${themeProps.dataMode}"`);
    }
    if (!themeProps.canvas.includes('f4f8fb') && !themeProps.surface.includes('fbfdff')) {
      throw new Error(`Light mode CSS variables not applied: ${JSON.stringify(themeProps)}`);
    }
  }

  return themeProps;
}

// --------------------------------------------------------------------------
// Explicit Evaluator (R1)
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

export function evaluateReport(report, cleanup) {
  const failures = [];

  if (!report || typeof report !== 'object') {
    return { passed: false, failures: ['Report is missing or not an object'] };
  }
  if (!cleanup || typeof cleanup !== 'object') {
    return { passed: false, failures: ['Cleanup is missing or not an object'] };
  }

  if (report.error) failures.push('Recorded verification error: ' + report.error);
  if (cleanup.errors?.length) failures.push('Recorded cleanup errors: ' + cleanup.errors.join('; '));
  if (report.preview_url !== PREVIEW_URL) failures.push('Unexpected preview URL');

  // Preflight metadata
  if (report.candidate_sha !== CANDIDATE_SHA) {
    failures.push(`Expected candidate_sha ${CANDIDATE_SHA}, got ${report.candidate_sha}`);
  }
  if (report.deployment_id !== DEPLOYMENT_ID) {
    failures.push(`Expected deployment_id ${DEPLOYMENT_ID}, got ${report.deployment_id}`);
  }
  if (report.effective_db !== PREVIEW_DB_ID) {
    failures.push(`Expected effective_db ${PREVIEW_DB_ID}, got ${report.effective_db}`);
  }

  // B26 Accounts & Dashboard Polish
  const b26 = report.b26_accounts_polish;
  if (!b26 || typeof b26 !== 'object') {
    failures.push('Missing b26_accounts_polish section in report');
  } else {
    if (b26.profile_email_deduplicated !== true) {
      failures.push(`B26: profile_email_deduplicated expected true, got ${b26.profile_email_deduplicated}`);
    }
    if (b26.user_facing_copy !== true) {
      failures.push(`B26: user_facing_copy expected true, got ${b26.user_facing_copy}`);
    }
    if (b26.account_created_via_ui !== true) {
      failures.push(`B26: account_created_via_ui expected true, got ${b26.account_created_via_ui}`);
    }
    if (b26.balance_updated_via_ui !== true) {
      failures.push(`B26: balance_updated_via_ui expected true, got ${b26.balance_updated_via_ui}`);
    }
    if (b26.exact_cents_displayed !== true) {
      failures.push(`B26: exact_cents_displayed expected true, got ${b26.exact_cents_displayed}`);
    }
    if (b26.as_of_date_rendered !== true) {
      failures.push(`B26: as_of_date_rendered expected true, got ${b26.as_of_date_rendered}`);
    }
    if (b26.balance_history_persisted !== true) {
      failures.push(`B26: balance_history_persisted expected true, got ${b26.balance_history_persisted}`);
    }
    if (b26.stale_badge_present_for_old_account !== true) {
      failures.push(`B26: stale_badge_present_for_old_account expected true, got ${b26.stale_badge_present_for_old_account}`);
    }
    if (b26.stale_badge_absent_for_fresh_account !== true) {
      failures.push(`B26: stale_badge_absent_for_fresh_account expected true, got ${b26.stale_badge_absent_for_fresh_account}`);
    }
    if (!b26.date_input_width || typeof b26.date_input_width !== 'string' || !Number.isFinite(parseFloat(b26.date_input_width)) || parseFloat(b26.date_input_width) < 160) {
      failures.push(`B26: date_input_width expected >= 160px, got ${b26.date_input_width}`);
    }
    if (b26.dashboard_user_facing_copy !== true) {
      failures.push(`B26: dashboard_user_facing_copy expected true, got ${b26.dashboard_user_facing_copy}`);
    }
    if (b26.dashboard_renders_accounts !== true) {
      failures.push(`B26: dashboard_renders_accounts expected true, got ${b26.dashboard_renders_accounts}`);
    }
  }

  // B27 Transactions & Import Review
  const b27 = report.b27_transactions_polish;
  if (!b27 || typeof b27 !== 'object') {
    failures.push('Missing b27_transactions_polish section in report');
  } else {
    if (b27.initial_empty_state !== true) {
      failures.push(`B27: initial_empty_state expected true, got ${b27.initial_empty_state}`);
    }
    if (!b27.preview_summary || typeof b27.preview_summary !== 'object') {
      failures.push('B27: preview_summary is missing or invalid');
    } else {
      if (b27.preview_summary.totalRows !== 3) {
        failures.push(`B27: preview_summary.totalRows expected 3, got ${b27.preview_summary.totalRows}`);
      }
      if (b27.preview_summary.readyRows !== 2) {
        failures.push(`B27: preview_summary.readyRows expected 2, got ${b27.preview_summary.readyRows}`);
      }
      if (b27.preview_summary.errorRows !== 1) {
        failures.push(`B27: preview_summary.errorRows expected 1, got ${b27.preview_summary.errorRows}`);
      }
    }
    if (b27.selection_did_not_commit !== true) {
      failures.push(`B27: selection_did_not_commit expected true, got ${b27.selection_did_not_commit}`);
    }
    if (b27.actionable_row_error_displayed !== true) {
      failures.push(`B27: actionable_row_error_displayed expected true, got ${b27.actionable_row_error_displayed}`);
    }
    if (b27.commit_imported_rows !== 2) {
      failures.push(`B27: commit_imported_rows expected 2, got ${b27.commit_imported_rows}`);
    }
    if (b27.ledger_renders_signed_amounts !== true) {
      failures.push(`B27: ledger_renders_signed_amounts expected true, got ${b27.ledger_renders_signed_amounts}`);
    }
    if (b27.balances_unmodified_equality !== true) {
      failures.push(`B27: balances_unmodified_equality expected true, got ${b27.balances_unmodified_equality}`);
    }
    if (b27.duplicate_detection_passed !== true) {
      failures.push(`B27: duplicate_detection_passed expected true, got ${b27.duplicate_detection_passed}`);
    }
    if (b27.persisted_count_unchanged !== true) {
      failures.push(`B27: persisted_count_unchanged expected true, got ${b27.persisted_count_unchanged}`);
    }
  }

  // Visual & Accessibility Checks (R2)
  const visual = report.visual_and_accessibility;
  if (!visual || typeof visual !== 'object') {
    failures.push('Missing visual_and_accessibility section in report');
  } else {
    if (visual.theme_switching_verified !== true) {
      failures.push(`visual: theme_switching_verified expected true, got ${visual.theme_switching_verified}`);
    }
    if (visual.light_dark_screenshots_distinct !== true) {
      failures.push(`visual: light_dark_screenshots_distinct expected true, got ${visual.light_dark_screenshots_distinct}`);
    }
    if (visual.stale_badge_contrast_light_pass !== true) {
      failures.push(`visual: stale_badge_contrast_light_pass expected true, got ${visual.stale_badge_contrast_light_pass}`);
    }
    if (visual.stale_badge_contrast_dark_pass !== true) {
      failures.push(`visual: stale_badge_contrast_dark_pass expected true, got ${visual.stale_badge_contrast_dark_pass}`);
    }
    if (visual.viewport_containment_verified !== true) {
      failures.push(`visual: viewport_containment_verified expected true, got ${visual.viewport_containment_verified}`);
    }
    if (visual.keyboard_interaction_verified !== true) {
      failures.push(`visual: keyboard_interaction_verified expected true, got ${visual.keyboard_interaction_verified}`);
    }
    if (visual.motion_transparency_fallbacks_verified !== true) {
      failures.push(`visual: motion_transparency_fallbacks_verified expected true, got ${visual.motion_transparency_fallbacks_verified}`);
    }
  }

  // Fail-Closed Cleanup Assertions (R1)
  if (cleanup.app_data_deleted !== true) {
    failures.push(`cleanup: app_data_deleted expected true, got ${cleanup.app_data_deleted}`);
  }
  if (cleanup.user_tombstone_present !== true) {
    failures.push(`cleanup: user_tombstone_present expected true, got ${cleanup.user_tombstone_present}`);
  }
  if (cleanup.clerk_user_deleted !== true) {
    failures.push(`cleanup: clerk_user_deleted expected true, got ${cleanup.clerk_user_deleted}`);
  }
  if (cleanup.clerk_user_absent !== true) {
    failures.push(`cleanup: clerk_user_absent expected true, got ${cleanup.clerk_user_absent}`);
  }
  if (cleanup.all_tables_zero !== true) {
    failures.push(`cleanup: all_tables_zero expected true, got ${cleanup.all_tables_zero}`);
  }
  if (!cleanup.table_counts || typeof cleanup.table_counts !== 'object') {
    failures.push('cleanup: table_counts is missing or not an object');
  } else {
    for (const table of USER_TABLES) {
      const cnt = cleanup.table_counts[table];
      if (typeof cnt !== 'number') {
        failures.push(`cleanup: table_counts[${table}] expected number, got ${typeof cnt} (${cnt})`);
      } else if (cnt !== 0) {
        failures.push(`cleanup: table_counts[${table}] expected 0, got ${cnt}`);
      }
    }
  }

  return {
    passed: failures.length === 0,
    failures
  };
}

// --------------------------------------------------------------------------
// Scoped Cleanup Function (R1)
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

  // Step 2: Query scoped table counts for this user (WHERE user_id = ?) across all 14 tables
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
  logFn(`All 14 tables scoped to user clean (0 rows): ${allZero}`);

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
  // Provider deletion must ONLY occur if app data deletion succeeded and scoped tables are clean!
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
  console.log('=== Starting C08 Comprehensive Hosted Verification (B26 & B27) ===');
  const env = readEnv();
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('Clerk configuration missing in .env.preview.local');
  }

  // Preflight 1: Deployment identity and bindings
  console.log('Checking immutable deployment identity and D1 binding...');
  await verifyDeployment();
  console.log(`Verified deployment ${DEPLOYMENT_ID} on DB ${PREVIEW_DB_ID}`);

  // Preflight 2: Test D1 query reachability
  console.log('Testing D1 query reachability...');
  const testPing = await queryD1('SELECT 1 as ping;');
  if (testPing[0]?.ping !== 1) {
    throw new Error('D1 database ping failed');
  }
  console.log('D1 database query verified.');

  // Preflight 3: Clerk client and testing token
  const clerkClient = createClerkClient({ secretKey });
  const rawKey = publishableKey.replace(/^pk_(?:test|live)_/, '');
  const fapi = Buffer.from(rawKey, 'base64').toString('utf8').replace(/\$$/, '');
  console.log(`Clerk Frontend API host: ${fapi}`);

  const testTokenObj = await clerkClient.testingTokens.createTestingToken();
  const testingToken = testTokenObj.token;
  console.log('Created Clerk development testing token.');

  // Create disposable test user
  const nonce = Date.now().toString().slice(-6);
  const password = generateDisposablePassword();
  const email = `finpath_c08_${nonce}+clerk_test@example.com`;
  const phone = `+12015550183`;

  const user = await clerkClient.users.createUser({
    emailAddress: [email],
    phoneNumber: [phone],
    password
  });
  const userId = user.id;
  recordManifestUser(userId);
  console.log(`Created synthetic test user: ${userId.slice(0, 14)}...`);

  const report = {
    candidate_sha: CANDIDATE_SHA,
    deployment_id: DEPLOYMENT_ID,
    preview_url: PREVIEW_URL,
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    b26_accounts_polish: {},
    b27_transactions_polish: {},
    visual_and_accessibility: {},
    cleanup: {}
  };

  let browser = null;
  let context = null;
  let page = null;
  let cleanupResult = null;

  try {
    const { chromium } = await import('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setupClerkInterception(context, testingToken, fapi);

    page = await context.newPage();
    await page.goto(`${PREVIEW_URL}/`, { waitUntil: 'networkidle' });

    // Authenticate via ticket
    const ticketObj = await clerkClient.signInTokens.createSignInToken({ userId, expiresInSeconds: 300 });
    await page.waitForFunction(() => Boolean(window.Clerk?.loaded));
    await page.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket status: ${res.status}`);
        }
      });
    }, ticketObj.token);

    await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
    const me = await page.evaluate(async () => {
      const res = await fetch('/api/me');
      return { status: res.status, body: await res.json() };
    });
    console.log(`Authenticated as synthetic user. /api/me status: ${me.status}`);
    if (me.status !== 200 || me.body?.userId !== userId) {
      throw new Error(`Auth mismatch: expected ${userId}, got ${me.body?.userId}`);
    }

    // ==========================================
    // B26: Accounts and Dashboard Polish (UI Journeys)
    // ==========================================
    console.log('\n--- Executing B26 Accounts & Dashboard Verification ---');
    await page.goto(`${PREVIEW_URL}/accounts`, { waitUntil: 'networkidle' });

    // 1. Profile band email deduplication check
    const profileBandHtml = await page.locator('.profile-band').innerHTML();
    const emailOccurrences = (profileBandHtml.match(new RegExp(email, 'g')) || []).length;
    console.log(`Profile band email occurrences: ${emailOccurrences} (expected <= 1)`);
    report.b26_accounts_polish.profile_email_deduplicated = emailOccurrences <= 1;

    // 2. Eyebrow copy: "Accounts and balances are active."
    const statusText = await page.locator('.next-module-band strong').innerText();
    console.log(`Platform status text: "${statusText}"`);
    report.b26_accounts_polish.user_facing_copy = statusText.includes('Accounts and balances are active.');

    // Compute dynamic relative dates (R3)
    const today = new Date();
    const toYmd = (d) => d.toISOString().slice(0, 10);
    const freshDate = toYmd(new Date(today.getTime() - 5 * 86400000));
    const updatedFreshDate = toYmd(new Date(today.getTime() - 2 * 86400000));
    const staleDate = toYmd(new Date(today.getTime() - 45 * 86400000));
    report.b26_accounts_polish.declared_dates = { freshDate, updatedFreshDate, staleDate };

    // 3. Add Account 1 ("Primary Checking") via UI Form
    console.log(`Adding fresh account "Primary Checking" via browser UI (date: ${freshDate})...`);
    const addAccountForm = page.locator('.account-form-grid');
    await addAccountForm.getByLabel('Account name').fill('Primary Checking');
    await addAccountForm.getByLabel('Type').selectOption('checking');
    await addAccountForm.getByLabel('Institution').fill('Chase');
    await addAccountForm.getByLabel('Currency').fill('USD');
    await addAccountForm.getByLabel('Balance / debt').fill('12345.67');
    await addAccountForm.getByLabel('Balance date').fill(freshDate);

    const addAccountPromise1 = page.waitForResponse(
      (resp) => resp.url().includes('/api/accounts') && resp.request().method() === 'POST' && resp.status() === 201
    );
    await addAccountForm.locator('button[type="submit"]:has-text("Add account")').click();
    const addAccountResp1 = await addAccountPromise1;
    const addAccountBody1 = await addAccountResp1.json();
    console.log(`Account 1 created via UI: ID=${addAccountBody1.account?.id}`);
    await page.waitForFunction(() => !document.querySelector('.account-form-grid button[type="submit"]')?.hasAttribute('disabled'));

    // 4. Add Account 2 ("Old Savings") via UI Form
    console.log(`Adding stale account "Old Savings" via browser UI (date: ${staleDate})...`);
    await addAccountForm.getByLabel('Account name').fill('Old Savings');
    await addAccountForm.getByLabel('Type').selectOption('savings');
    await addAccountForm.getByLabel('Institution').fill('Ally');
    await addAccountForm.getByLabel('Currency').fill('USD');
    await addAccountForm.getByLabel('Balance / debt').fill('2500.00');
    await addAccountForm.getByLabel('Balance date').fill(staleDate);

    const addAccountPromise2 = page.waitForResponse(
      (resp) => resp.url().includes('/api/accounts') && resp.request().method() === 'POST' && resp.status() === 201
    );
    await addAccountForm.locator('button[type="submit"]:has-text("Add account")').click();
    const addAccountResp2 = await addAccountPromise2;
    const addAccountBody2 = await addAccountResp2.json();
    console.log(`Account 2 created via UI: ID=${addAccountBody2.account?.id}`);
    report.b26_accounts_polish.account_created_via_ui = Boolean(addAccountBody1.account?.id && addAccountBody2.account?.id);
    await page.waitForFunction(() => !document.querySelector('.account-form-grid button[type="submit"]')?.hasAttribute('disabled'));

    // 5. Update Balance on "Primary Checking" via its UI .balance-form
    console.log(`Recording updated balance ($15,432.10, date: ${updatedFreshDate}) on Primary Checking via UI form...`);
    const primaryCard = page.locator('.account-card').filter({ hasText: 'Primary Checking' });
    const balanceForm = primaryCard.locator('.balance-form');
    await balanceForm.getByLabel('New balance').fill('15432.10');
    await balanceForm.locator('input[type="date"]').fill(updatedFreshDate);

    const recordBalancePromise = page.waitForResponse(
      (resp) => resp.url().includes('/balances') && resp.request().method() === 'POST' && resp.status() === 201
    );
    await balanceForm.locator('button[type="submit"]:has-text("Record")').click();
    const recordBalanceResp = await recordBalancePromise;
    const recordBalanceBody = await recordBalanceResp.json();
    const updatedCents = recordBalanceBody.account?.latestBalanceCents ?? recordBalanceBody.balance?.balanceCents;
    console.log(`Balance recorded via UI: status=${recordBalanceResp.status()}, latestBalanceCents=${updatedCents}`);
    report.b26_accounts_polish.balance_updated_via_ui = updatedCents === 1543210;
    await page.waitForFunction(() => !document.querySelector('.balance-form button[type="submit"]')?.hasAttribute('disabled'));

    // 6. Reload page to verify persisted values and rendered presentation
    await page.reload({ waitUntil: 'networkidle' });

    // Verify exact cents in account cards
    const accountsHtml = await page.locator('.account-card-list').innerHTML();
    const hasExactCents1 = accountsHtml.includes('$15,432.10');
    const hasExactCents2 = accountsHtml.includes('$2,500.00');
    console.log(`Account card exact cents ($15,432.10): ${hasExactCents1}, ($2,500.00): ${hasExactCents2}`);
    report.b26_accounts_polish.exact_cents_displayed = hasExactCents1 && hasExactCents2;

    // Verify as-of dates
    const hasAsOfDate1 = accountsHtml.includes(`As of ${updatedFreshDate}`);
    const hasAsOfDate2 = accountsHtml.includes(`As of ${staleDate}`);
    console.log(`As-of dates rendered: ${hasAsOfDate1 && hasAsOfDate2}`);
    report.b26_accounts_polish.as_of_date_rendered = hasAsOfDate1 && hasAsOfDate2;

    // Verify balance history persistence (contains both balances for Primary Checking)
    const primaryCardHtml = await page.locator('.account-card').filter({ hasText: 'Primary Checking' }).innerHTML();
    const hasHist1 = primaryCardHtml.includes('$15,432.10');
    const hasHist2 = primaryCardHtml.includes('$12,345.67');
    console.log(`Balance history persisted: ${hasHist1 && hasHist2}`);
    report.b26_accounts_polish.balance_history_persisted = hasHist1 && hasHist2;

    // Verify stale badge on Old Savings and absent on Primary Checking
    const oldSavingsCard = page.locator('.account-card').filter({ hasText: 'Old Savings' });
    const staleBadgesOnOld = await oldSavingsCard.locator('.account-stale-badge').count();
    const staleBadgesOnPrimary = await primaryCard.locator('.account-stale-badge').count();
    console.log(`Stale badge on Old Savings: ${staleBadgesOnOld > 0}, on Primary Checking: ${staleBadgesOnPrimary === 0}`);
    report.b26_accounts_polish.stale_badge_present_for_old_account = staleBadgesOnOld > 0;
    report.b26_accounts_polish.stale_badge_absent_for_fresh_account = staleBadgesOnPrimary === 0;

    // Verify record-balance date input width
    const dateInputWidth = await page.locator('.balance-form input[type="date"]').first().evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    console.log(`Computed date input width in .balance-form: ${dateInputWidth}`);
    report.b26_accounts_polish.date_input_width = dateInputWidth;

    // 7. Visual & Contrast Verification on /accounts (R2)
    const viewports = [
      { name: '1280', width: 1280, height: 800 },
      { name: '768', width: 768, height: 1024 },
      { name: '390', width: 390, height: 844 },
      { name: '320', width: 320, height: 640 }
    ];

    let allScreenshotsDistinct = true;
    let allViewportsContained = true;

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // Light mode capture
      await switchTheme(page, 'light');
      // Scroll to account cards so controls are in view
      await page.locator('.account-card-list').scrollIntoViewIfNeeded().catch(() => {});
      const lightPath = join(SCREENSHOTS_DIR, `accounts-${vp.name}-light.png`);
      await page.screenshot({ path: lightPath, fullPage: true });
      const lightBuf = readFileSync(lightPath);

      // Check containment & horizontal overflow
      const overflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth + 1;
      });
      if (overflow) allViewportsContained = false;

      // Dark mode capture
      await switchTheme(page, 'dark');
      await page.locator('.account-card-list').scrollIntoViewIfNeeded().catch(() => {});
      const darkPath = join(SCREENSHOTS_DIR, `accounts-${vp.name}-dark.png`);
      await page.screenshot({ path: darkPath, fullPage: true });
      const darkBuf = readFileSync(darkPath);

      if (lightBuf.equals(darkBuf)) {
        console.error(`ERROR: Light and dark screenshots for accounts-${vp.name} are identical!`);
        allScreenshotsDistinct = false;
      }

      // Restore light mode
      await switchTheme(page, 'light');
    }
    console.log(`Accounts multi-viewport captures complete. All pairs distinct: ${allScreenshotsDistinct}`);

    // Stale Badge Contrast Measurement (R2): composite the badge over its
    // actual ancestor backgrounds; a hard-coded card colour is not evidence.
    const staleBadge = page.locator('.account-stale-badge').first();
    if (await staleBadge.count() !== 1) throw new Error('Missing stale badge for contrast measurement');
    const measureBadge = async () => staleBadge.evaluate((el) => {
      const parse = (value) => {
        const m = value.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
        const h = value.match(/^#([0-9a-f]{6})$/i);
        return h ? { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: 1 } : { r: 0, g: 0, b: 0, a: 0 };
      };
      const blend = (fg, bg) => ({ r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)), g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)), b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)), a: 1 });
      const chain = [];
      let node = el;
      while (node && chain.length < 12) { chain.push({ tag: node.tagName, background: getComputedStyle(node).backgroundColor }); node = node.parentElement; }
      let bg = { r: 255, g: 255, b: 255, a: 1 };
      for (const item of chain.reverse()) bg = blend(parse(item.background), bg);
      const fg = parse(getComputedStyle(el).color);
      return { fg: getComputedStyle(el).color, ancestorBackgrounds: chain, compositedBackground: `rgb(${bg.r}, ${bg.g}, ${bg.b})`, foreground: fg };
    });
    await switchTheme(page, 'light');
    const lightBadgeColors = await measureBadge();
    const lightContrast = calculateContrast(lightBadgeColors.fg, lightBadgeColors.compositedBackground);
    console.log(`Stale badge contrast (Light mode): ${lightContrast}:1 over ${lightBadgeColors.compositedBackground}`);

    await switchTheme(page, 'dark');
    const darkBadgeColors = await measureBadge();
    const darkContrast = calculateContrast(darkBadgeColors.fg, darkBadgeColors.compositedBackground);
    console.log(`Stale badge contrast (Dark mode): ${darkContrast}:1 over ${darkBadgeColors.compositedBackground}`);

    report.visual_and_accessibility.stale_badge_contrast = {
      light: { ratio: lightContrast, fg: lightBadgeColors.fg, bg: lightBadgeColors.compositedBackground, ancestors: lightBadgeColors.ancestorBackgrounds, pass: lightContrast >= 4.5 },
      dark: { ratio: darkContrast, fg: darkBadgeColors.fg, bg: darkBadgeColors.compositedBackground, ancestors: darkBadgeColors.ancestorBackgrounds, pass: darkContrast >= 4.5 }
    };
    report.visual_and_accessibility.stale_badge_contrast_light_pass = lightContrast >= 4.5;
    report.visual_and_accessibility.stale_badge_contrast_dark_pass = darkContrast >= 4.5;
    await switchTheme(page, 'light');

    // 8. Dashboard Navigation & Account List Observation
    console.log('Navigating to /dashboard...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'networkidle' });

    const dashboardStatusText = await page.locator('.next-module-band strong').innerText();
    console.log(`Dashboard status text: "${dashboardStatusText}"`);
    report.b26_accounts_polish.dashboard_user_facing_copy = dashboardStatusText.includes('Dashboard overview is active.');

    // Wait specifically for the dashboard account list
    await page.waitForSelector('.dashboard-account-list', { timeout: 8000 });
    const dashboardAccountsHtml = await page.locator('.dashboard-account-list').innerHTML();
    const dashboardHasPrimary = dashboardAccountsHtml.includes('Primary Checking') && dashboardAccountsHtml.includes('$15,432.10');
    const dashboardHasOld = dashboardAccountsHtml.includes('Old Savings') && dashboardAccountsHtml.includes('$2,500.00');
    const dashboardHasBadge = dashboardAccountsHtml.includes('Update due');
    console.log(`Dashboard account list renders Primary Checking: ${dashboardHasPrimary}, Old Savings: ${dashboardHasOld}, Stale badge: ${dashboardHasBadge}`);
    report.b26_accounts_polish.dashboard_renders_accounts = dashboardHasPrimary && dashboardHasOld;

    // Dashboard screenshots (1280 and 390)
    for (const vp of [{ name: '1280', width: 1280, height: 800 }, { name: '390', width: 390, height: 844 }]) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await switchTheme(page, 'light');
      const dLightPath = join(SCREENSHOTS_DIR, `dashboard-${vp.name}-light.png`);
      await page.screenshot({ path: dLightPath, fullPage: true });
      const dLightBuf = readFileSync(dLightPath);

      await switchTheme(page, 'dark');
      const dDarkPath = join(SCREENSHOTS_DIR, `dashboard-${vp.name}-dark.png`);
      await page.screenshot({ path: dDarkPath, fullPage: true });
      const dDarkBuf = readFileSync(dDarkPath);

      if (dLightBuf.equals(dDarkBuf)) {
        console.error(`ERROR: Dashboard-${vp.name} light and dark screenshots are identical!`);
        allScreenshotsDistinct = false;
      }
      await switchTheme(page, 'light');
    }
    console.log('Captured Dashboard multi-viewport screenshots.');

    // ==========================================
    // B27: Transactions & Import Review (R3)
    // ==========================================
    console.log('\n--- Executing B27 Transactions & Import Review Verification ---');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${PREVIEW_URL}/transactions`, { waitUntil: 'networkidle' });

    // 1. Initial empty ledger state
    const emptyNotice = await page.locator('.empty-card span').innerText();
    console.log(`Initial ledger state: "${emptyNotice}"`);
    report.b27_transactions_polish.initial_empty_state = emptyNotice.includes('No transactions yet');

    // 2. Query scoped account_balances BEFORE transaction import
    const balancesBefore = await queryD1(
      'SELECT id, account_id, user_id, balance_date, balance_cents, created_at FROM account_balances WHERE user_id = ? ORDER BY id ASC;',
      [userId]
    );
    console.log(`Account balances before transaction import: ${balancesBefore.length} records`);

    // Prepare CSV with 1 valid expense, 1 valid income, 1 invalid amount row
    const testCsv = [
      'transaction_date,description,amount,type,category,account,notes',
      '2026-09-10,Whole Foods Market,123.45,expense,Groceries,Primary Checking,Weekly groceries',
      '2026-09-05,Employer Payroll,4500.00,income,Salary,Primary Checking,Direct deposit',
      '2026-09-02,Coffee Shop,-4.50,expense,Dining,Primary Checking,Negative amount invalid'
    ].join('\n');

    const csvFilePayload = {
      name: 'synthetic-transactions.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(testCsv, 'utf8')
    };

    // Step 1: Real browser file selection (must NOT commit)
    console.log('Selecting CSV file in browser...');
    const fileInput = page.locator('.transaction-import-panel input[type="file"]');
    const previewPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/imports/transactions/preview') && resp.status() === 200
    );

    await fileInput.setInputFiles(csvFilePayload);
    const previewResp = await previewPromise;
    const previewBody = await previewResp.json();
    console.log(`Preview response: total=${previewBody.preview?.summary?.totalRows}, ready=${previewBody.preview?.summary?.readyRows}, error=${previewBody.preview?.summary?.errorRows}`);
    report.b27_transactions_polish.preview_summary = previewBody.preview?.summary;

    // Assert that selecting a file did NOT commit (scoped transactions table remains 0 rows)
    const d1TxBeforeCommit = await queryD1('SELECT count(*) as cnt FROM transactions WHERE user_id = ?;', [userId]);
    console.log(`D1 transactions count after preview (before commit): ${d1TxBeforeCommit[0]?.cnt} (must be 0)`);
    report.b27_transactions_polish.selection_did_not_commit = d1TxBeforeCommit[0]?.cnt === 0;

    // Check actionable error row in preview table
    await page.waitForSelector('.transaction-import-table');
    const tableHtml = await page.locator('.transaction-import-table').innerHTML();
    const hasActionableError = tableHtml.includes('Amount must be a positive amount');
    console.log(`Actionable validation message visible in preview: ${hasActionableError}`);
    report.b27_transactions_polish.actionable_row_error_displayed = hasActionableError;

    // Capture preview screenshot
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'transaction-import-preview.png'), fullPage: true });

    // Step 2: Explicit confirmation commit
    console.log('Committing reviewed import...');
    const commitButton = page.locator('.balance-import-actions button:has-text("Import 2 transactions")');
    const commitPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/imports/transactions/commit') && resp.status() === 201
    );

    await commitButton.click();
    const commitResp = await commitPromise;
    const commitBody = await commitResp.json();
    console.log(`Commit response: importedRows=${commitBody.importRecord?.importedRows}`);
    report.b27_transactions_polish.commit_imported_rows = commitBody.importRecord?.importedRows;

    // Reload page to verify persisted transactions in ledger
    await page.reload({ waitUntil: 'networkidle' });

    const ledgerHtml = await page.locator('.transaction-row-list').innerHTML();
    const hasTx1 = ledgerHtml.includes('Whole Foods Market') && ledgerHtml.includes('-$123.45');
    const hasTx2 = ledgerHtml.includes('Employer Payroll') && ledgerHtml.includes('+$4,500.00');
    console.log(`Ledger renders Expense (-$123.45): ${hasTx1}, Income (+$4,500.00): ${hasTx2}`);
    report.b27_transactions_polish.ledger_renders_signed_amounts = hasTx1 && hasTx2;

    // Step 3: Complete balance record immutability comparison (R3)
    const balancesAfter = await queryD1(
      'SELECT id, account_id, user_id, balance_date, balance_cents, created_at FROM account_balances WHERE user_id = ? ORDER BY id ASC;',
      [userId]
    );
    console.log(`Account balances after transaction import: ${balancesAfter.length} records`);

    const balancesUnchanged = balancesBefore.length === balancesAfter.length &&
      balancesBefore.every((b, i) => {
        const a = balancesAfter[i];
        return b.id === a.id &&
               b.account_id === a.account_id &&
               b.user_id === a.user_id &&
               b.balance_date === a.balance_date &&
               b.balance_cents === a.balance_cents &&
               b.created_at === a.created_at;
      });
    console.log(`Account balance record equality before vs after import: ${balancesUnchanged}`);
    report.b27_transactions_polish.balances_unmodified_equality = balancesUnchanged;

    // Step 4: Duplicate detection verification
    console.log('Testing duplicate detection with exact same CSV...');
    const duplicatePreviewPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/imports/transactions/preview') && resp.status() === 200
    );

    await fileInput.setInputFiles(csvFilePayload);
    const dupPreviewResp = await duplicatePreviewPromise;
    const dupPreviewBody = await dupPreviewResp.json();
    console.log(`Duplicate preview summary: duplicateRows=${dupPreviewBody.preview?.summary?.duplicateRows}, readyRows=${dupPreviewBody.preview?.summary?.readyRows}`);
    report.b27_transactions_polish.duplicate_summary = dupPreviewBody.preview?.summary;
    report.b27_transactions_polish.duplicate_detection_passed =
      dupPreviewBody.preview?.summary?.duplicateRows === 2 && dupPreviewBody.preview?.summary?.readyRows === 0;

    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'transaction-import-duplicate.png'), fullPage: true });

    // Verify persisted transaction count remains 2 (no unintended commit on duplicate selection)
    const d1TxAfterDuplicate = await queryD1('SELECT count(*) as cnt FROM transactions WHERE user_id = ?;', [userId]);
    console.log(`Persisted transaction count after duplicate check: ${d1TxAfterDuplicate[0]?.cnt} (must be 2)`);
    report.b27_transactions_polish.persisted_count_unchanged = d1TxAfterDuplicate[0]?.cnt === 2;

    // Multi-viewport screenshots for Transactions (1280, 768, 390, 320 light and dark)
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await switchTheme(page, 'light');
      const tLightPath = join(SCREENSHOTS_DIR, `transactions-${vp.name}-light.png`);
      await page.screenshot({ path: tLightPath, fullPage: true });
      const tLightBuf = readFileSync(tLightPath);

      await switchTheme(page, 'dark');
      const tDarkPath = join(SCREENSHOTS_DIR, `transactions-${vp.name}-dark.png`);
      await page.screenshot({ path: tDarkPath, fullPage: true });
      const tDarkBuf = readFileSync(tDarkPath);

      if (tLightBuf.equals(tDarkBuf)) {
        console.error(`ERROR: Transactions-${vp.name} light and dark screenshots are identical!`);
        allScreenshotsDistinct = false;
      }
      await switchTheme(page, 'light');
    }
    console.log('Captured Transactions multi-viewport screenshots.');

    // Keyboard and motion accessibility checks (R2): require real tab focus.
    console.log('Verifying keyboard traversal, motion and transparency fallbacks...');
    const searchInput = page.locator('input[type="search"]').first();
    if (await searchInput.count() !== 1 || !(await searchInput.isVisible())) throw new Error('Search control missing; keyboard verification cannot pass');
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    let tabCount = 0;
    let reachedSearch = false;
    for (; tabCount < 60; tabCount += 1) {
      await page.keyboard.press('Tab');
      if (await page.evaluate((el) => document.activeElement === el, await searchInput.elementHandle())) { reachedSearch = true; break; }
    }
    const focusStyle = await searchInput.evaluate((el) => { const s = getComputedStyle(el); return { outline: s.outline, outlineStyle: s.outlineStyle, boxShadow: s.boxShadow }; });
    const focusVisible = reachedSearch && (focusStyle.outlineStyle !== 'none' || focusStyle.boxShadow !== 'none');
    if (!focusVisible) throw new Error(`Keyboard search focus not visibly reached after ${tabCount + 1} tabs`);
    const beforeRows = await page.locator('.transaction-row-card:visible, .transaction-row:visible').count();
    await page.keyboard.type('Fresh');
    await page.waitForTimeout(50);
    const afterRows = await page.locator('.transaction-row-card:visible, .transaction-row:visible').count();
    report.visual_and_accessibility.keyboard_interaction = { reachedSearch, tabs: tabCount + 1, focusStyle, rowsBefore: beforeRows, rowsAfter: afterRows, filterChanged: afterRows < beforeRows };
    report.visual_and_accessibility.keyboard_interaction_verified = focusVisible && afterRows < beforeRows;
    if (!report.visual_and_accessibility.keyboard_interaction_verified) throw new Error('Keyboard filter action did not change transaction rows');

    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: 'reduce' }] });
    const media = await page.evaluate(() => {
      const targets = [...document.querySelectorAll('.transaction-filter-panel, .transaction-row-card, .account-card')].slice(0, 3).map(el => { const s = getComputedStyle(el); return { className: el.className, transitionDuration: s.transitionDuration, animationDuration: s.animationDuration, backgroundColor: s.backgroundColor, backdropFilter: s.backdropFilter }; });
      return { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches, targets };
    });
    const motionPass = media.reducedMotion && media.targets.length > 0 && media.targets.every(t => ['0.01ms', '1e-05s', '0s'].includes(t.transitionDuration) && ['0.01ms', '1e-05s', '0s'].includes(t.animationDuration));
    const transparencyPass = media.reducedTransparency && media.targets.length > 0 && media.targets.every(t => {
      const opaque = !t.backgroundColor.startsWith('rgba(') && !t.backgroundColor.includes('/');
      const noBlur = !t.backdropFilter || t.backdropFilter === 'none';
      return opaque && noBlur;
    });
    report.visual_and_accessibility.motion_transparency = { media, motionPass, transparencyPass };
    report.visual_and_accessibility.motion_transparency_fallbacks_verified = motionPass && transparencyPass;
    if (!report.visual_and_accessibility.motion_transparency_fallbacks_verified) throw new Error('Reduced motion/transparency computed fallback failed');
    await cdp.detach();

    report.visual_and_accessibility.theme_switching_verified = true;
    report.visual_and_accessibility.light_dark_screenshots_distinct = allScreenshotsDistinct;
    report.visual_and_accessibility.viewport_containment_verified = allViewportsContained;
  } catch (error) {
    console.error('Verification error occurred:', error);
    report.error = error.message;
  } finally {
    // ==========================================
    // Fail-Closed Cleanup (R1)
    // ==========================================
    try {
      cleanupResult = await performCleanup({
      userId,
      page,
      clerkClient,
      queryD1Fn: queryD1,
      logFn: console.log
      });
    } catch (error) {
      cleanupResult = { errors: ['Unexpected cleanup failure: ' + error.message] };
    } finally {
      if (browser) {
        try { await browser.close(); } catch (error) { report.error = 'Browser close failed: ' + error.message; }
      }
    }

    report.cleanup = cleanupResult;

    // Evaluate entire report using explicit evaluator (R1)
    const evaluation = evaluateReport(report, cleanupResult);
    if (evaluation.passed) {
      report.status = 'SUCCESS';
      report.evaluation_failures = [];
    } else {
      report.status = 'FAILED';
      report.evaluation_failures = evaluation.failures;
      console.error(`\n[FAIL-CLOSED EVALUATOR] Verification failed with ${evaluation.failures.length} errors:`);
      for (const err of evaluation.failures) {
        console.error(`  - ${err}`);
      }
    }

    persistEvidence(report, cleanupResult);
    console.log(`\nReport written to ${REPORT_FILE}`);
    console.log(`Cleanup manifest written to ${CLEANUP_FILE}`);
  }

  if (report.status !== 'SUCCESS') {
    throw new Error(`Hosted verification failed: ${report.evaluation_failures?.join('; ') || report.error}`);
  }
  console.log('=== All C08 Proofs and Cleanup Verified Successfully ===');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllProofs().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
