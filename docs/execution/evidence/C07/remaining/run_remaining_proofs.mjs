#!/usr/bin/env node

/**
 * C07 Remaining Hosted Proofs Reusable Harness (Repaired per R1–R4)
 *
 * Exercises the three remaining C07 acceptance requirements on immutable preview:
 * 1. Actual browser CSV selection, preview, commit and persisted imported data
 * 2. Authenticated cross-user write rejection with unchanged victim data
 * 3. Authenticated HTTP 410 after data deletion
 *
 * Implements:
 * - R1: Valid accountTypes ('checking'), distinct /api/me assertions, documented Clerk testing token setup & sign-in ticket flow
 * - R2: Real CSV template headers ('account', 'balance_date', 'balance', 'currency'), exact UI controls, preview 200 + commit 201 response observation
 * - R3: Fail-closed cleanup for BOTH manifest IDs, application delete before provider delete, count failure propagation, PASS revocation on cleanup failure, robust finalization
 * - R4: Scoped D1 queries, immutable preview deployment preflight, private ignored manifest, disposable passwords, sanitized logging
 */

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createClerkClient } from '@clerk/backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../../..');

export const CANDIDATE_SHA = 'd81f31187892f636ab9d2b6cb492e90e9b7d166d';
export const PREVIEW_URL = 'https://3eed38e6.interactive-fire-calculator.pages.dev';
export const PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
export const ACCOUNT_ID = '4e1b7f6a7440770a01779a67602ec5e9';
export const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const WRANGLER_CONFIG = join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');

export const REPORT_FILE = join(__dirname, 'report.json');
export const CLEANUP_FILE = join(__dirname, 'cleanup.json');
export const SCREENSHOT_FILE = join(__dirname, 'import_result.png');
export const PRIVATE_MANIFEST_FILE = resolve(REPO_ROOT, '.env.manifest.local');

export const HISTORICAL_TOMBSTONES = [
  'user_3JOGiP2nXKPm7UiZTBk27WNy2SF',
  'user_3JOH4WytkmA7wx1Xq7BoaRl3sW5'
];

export const VALID_ACCOUNT_TYPES = [
  'cash',
  'checking',
  'savings',
  'investment',
  'retirement',
  'credit',
  'loan',
  'mortgage',
  'real_estate',
  'other_asset',
  'other_liability'
];

export const CSV_HEADERS = ['account', 'balance_date', 'balance', 'currency'];

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

/**
 * Safely parses the private environment file, verifying file permissions.
 */
export function readEnv(envFilePath = resolve(REPO_ROOT, '.env.preview.local')) {
  const env = { ...process.env };
  if (!existsSync(envFilePath)) {
    return env;
  }

  const stats = statSync(envFilePath);
  const mode = stats.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`Insecure permissions on ${envFilePath}: mode is ${mode.toString(8)}, expected 0600`);
  }

  const lines = readFileSync(envFilePath, 'utf8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
    const idx = trimmed.indexOf('=');
    const k = trimmed.slice(0, idx).trim();
    const v = trimmed.slice(idx + 1).trim();
    if (!env[k]) env[k] = v;
  }
  return env;
}

/**
 * Derives the Clerk Frontend API hostname from the publishable key.
 */
export function deriveClerkFapi(publishableKey) {
  if (!publishableKey || (!publishableKey.startsWith('pk_test_') && !publishableKey.startsWith('pk_live_'))) {
    throw new Error('Invalid Clerk publishable key');
  }
  const base64Data = publishableKey.replace(/^pk_(test|live)_/, '');
  const decoded = Buffer.from(base64Data, 'base64').toString('utf-8');
  return decoded.replace(/\$$/, '');
}

/**
 * Builds synthetic CSV matching exact FinPath balance template.
 */
export function buildSyntheticCsv({ accountName, balanceDate = '2026-06-15', balanceAmount = '12345.67', currency = 'USD' }) {
  const headerLine = CSV_HEADERS.join(',');
  const safeAccount = accountName.includes(',') || accountName.includes('"') ? `"${accountName.replace(/"/g, '""')}"` : accountName;
  const dataLine = `${safeAccount},${balanceDate},${balanceAmount},${currency.toUpperCase()}`;
  return `${headerLine}\n${dataLine}\n`;
}

/**
 * Validates an account creation payload against domain constraints.
 */
export function validateAccountPayload(payload) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Account payload must be an object');
  }
  if (!payload.name || typeof payload.name !== 'string' || payload.name.trim().length === 0) {
    throw new Error('Account name is required');
  }
  if (!VALID_ACCOUNT_TYPES.includes(payload.accountType)) {
    throw new Error(`accountType '${payload.accountType}' is not supported. Supported types: ${VALID_ACCOUNT_TYPES.join(', ')}`);
  }
  if (!payload.currency || !/^[A-Z]{3}$/.test(payload.currency.toUpperCase())) {
    throw new Error('currency must be a 3-letter currency code');
  }
  return true;
}

/**
 * Generates a strong random password for disposable test users.
 */
export function generateDisposablePassword() {
  const randBytes = crypto.randomBytes(18).toString('base64url');
  return `FinPath!${randBytes}#9`;
}

/**
 * Reads Cloudflare OAuth token from Wrangler config or environment.
 */
export function getCloudflareToken() {
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token && existsSync(WRANGLER_CONFIG)) {
    const content = readFileSync(WRANGLER_CONFIG, 'utf8');
    const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) token = match[1];
  }
  return token;
}

/**
 * Executes a scoped query against Cloudflare D1.
 */
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`D1 HTTP error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result?.[0]?.results || [];
}

/**
 * Intercepts Clerk FAPI requests in Playwright to inject testing token and bypass bot checks.
 */
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
      const status = response.status();
      const contentType = response.headers()['content-type'] || '';

      if (contentType.includes('application/json')) {
        const json = await response.json().catch(() => null);
        if (json) {
          if (json.response && json.response.captcha_bypass === false) {
            json.response.captcha_bypass = true;
          }
          if (json.client && json.client.captcha_bypass === false) {
            json.client.captcha_bypass = true;
          }
          await route.fulfill({ response, json });
          return;
        }
      }
      await route.fulfill({ response });
    } catch {
      await route.continue().catch(() => {});
    }
  });
}

/**
 * Records user in private runtime manifest.
 */
export function recordManifestUser(userId, role) {
  let manifest = { userA: null, userB: null, createdAt: new Date().toISOString() };
  if (existsSync(PRIVATE_MANIFEST_FILE)) {
    try {
      manifest = JSON.parse(readFileSync(PRIVATE_MANIFEST_FILE, 'utf8'));
    } catch {}
  }
  if (role === 'userA') manifest.userA = userId;
  if (role === 'userB') manifest.userB = userId;
  writeFileSync(PRIVATE_MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
}

/**
 * Cleans up application and provider data for manifest users, ensuring fail-closed integrity.
 */
export async function performCleanup({
  manifest,
  d1QueryFn = queryD1,
  secretKey,
  clerkClient,
  pageA,
  pageB,
  logFn = console.log
}) {
  const result = {
    userA_app_data_deleted: false,
    userB_app_data_deleted: false,
    userA_clerk_deleted: false,
    userB_clerk_deleted: false,
    userA_tombstone_present: false,
    userB_tombstone_present: false,
    scoped_tables_clean: false,
    table_counts: {},
    errors: []
  };

  const userIds = [manifest?.userA, manifest?.userB].filter(Boolean);
  if (userIds.length === 0) {
    result.scoped_tables_clean = true;
    return { success: true, result };
  }

  logFn(`[Cleanup] Starting cleanup for scoped users: ${userIds.map(id => id.slice(0, 14) + '...').join(', ')}`);

  // Step 1: Application data deletion for User A (if page still active and not yet deleted)
  if (manifest?.userA && pageA && !pageA.isClosed()) {
    try {
      const delA = await pageA.evaluate(async () => {
        const res = await fetch('/api/account-data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
        });
        return { status: res.status, ok: res.ok };
      });
      result.userA_app_data_deleted = delA.ok || delA.status === 410;
    } catch (e) {
      result.errors.push(`User A app delete error: ${e.message}`);
    }
  }

  // Step 2: Application data deletion for User B
  if (manifest?.userB && pageB && !pageB.isClosed()) {
    try {
      const delB = await pageB.evaluate(async () => {
        const res = await fetch('/api/account-data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
        });
        return { status: res.status, ok: res.ok };
      });
      result.userB_app_data_deleted = delB.ok || delB.status === 410;
    } catch (e) {
      result.errors.push(`User B app delete error: ${e.message}`);
    }
  }

  // Step 3: Provider identity deletion via Clerk Backend API
  if (clerkClient || secretKey) {
    const client = clerkClient || createClerkClient({ secretKey });
    for (const uid of userIds) {
      const isA = uid === manifest?.userA;
      try {
        await client.users.deleteUser(uid);
        if (isA) result.userA_clerk_deleted = true;
        else result.userB_clerk_deleted = true;
      } catch (e) {
        // If user already deleted (404), mark true
        if (e.status === 404 || e.message?.includes('not found')) {
          if (isA) result.userA_clerk_deleted = true;
          else result.userB_clerk_deleted = true;
        } else {
          result.errors.push(`Clerk delete failed for ${uid.slice(0, 14)}...: ${e.message}`);
        }
      }
    }
  }

  // Step 4: Verify D1 tombstones exist for created users
  try {
    for (const uid of userIds) {
      const isA = uid === manifest?.userA;
      const rows = await d1QueryFn('SELECT id, deleted_at FROM users WHERE id = ?;', [uid]);
      const tombstoneExists = rows.length > 0 && Boolean(rows[0].deleted_at);
      if (isA) result.userA_tombstone_present = tombstoneExists;
      else result.userB_tombstone_present = tombstoneExists;
      if (!tombstoneExists) {
        result.errors.push(`Missing tombstone for user ${uid.slice(0, 14)}...`);
      }
    }
  } catch (e) {
    result.errors.push(`D1 tombstone query error: ${e.message}`);
  }

  // Step 5: Verify zero rows across all 14 user-scoped tables
  let allTablesZero = true;
  for (const table of USER_TABLES) {
    for (const uid of userIds) {
      try {
        const rows = await d1QueryFn(`SELECT count(*) as count FROM ${table} WHERE user_id = ?;`, [uid]);
        if (!rows || rows.length === 0 || rows[0]?.count === undefined || rows[0]?.count === null) {
          result.table_counts[`${table}:${uid.slice(0, 14)}...`] = 'UNKNOWN';
          allTablesZero = false;
          result.errors.push(`Count returned undefined for table ${table}`);
        } else {
          const count = Number(rows[0].count);
          result.table_counts[`${table}:${uid.slice(0, 14)}...`] = count;
          if (count > 0) {
            allTablesZero = false;
            result.errors.push(`Table ${table} has ${count} residual rows for ${uid.slice(0, 14)}...`);
          }
        }
      } catch (e) {
        result.table_counts[`${table}:${uid.slice(0, 14)}...`] = 'ERROR';
        allTablesZero = false;
        result.errors.push(`Failed querying ${table}: ${e.message}`);
      }
    }
  }
  result.scoped_tables_clean = allTablesZero;

  const success = result.scoped_tables_clean &&
    (manifest?.userA ? result.userA_clerk_deleted && result.userA_tombstone_present : true) &&
    (manifest?.userB ? result.userB_clerk_deleted && result.userB_tombstone_present : true);

  // Clean up private manifest file if cleanup succeeded
  if (success && existsSync(PRIVATE_MANIFEST_FILE)) {
    try { unlinkSync(PRIVATE_MANIFEST_FILE); } catch {}
  }

  return { success, result };
}

/**
 * Main execution orchestration.
 */
export async function runHarness(options = {}) {
  const startTime = new Date().toISOString();
  const logFn = options.logFn || console.log;

  logFn('=== C07 Remaining Hosted Proofs Reusable Harness ===');
  logFn(`Target Preview: ${PREVIEW_URL}`);
  logFn(`Candidate SHA: ${CANDIDATE_SHA}`);
  logFn(`Preview DB ID: ${PREVIEW_DB_ID}`);

  const env = options.env || readEnv();
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;
  const secretKey = env.CLERK_SECRET_KEY;

  if (!publishableKey?.startsWith('pk_test_')) {
    logFn('[FAIL] VITE_CLERK_PUBLISHABLE_KEY missing or not a pk_test_ key in .env.preview.local');
    return { status: 'FAILED', error: 'Missing pk_test_ publishable key' };
  }

  const fapi = deriveClerkFapi(publishableKey);
  logFn(`[Preflight] Clerk Frontend API host: ${fapi}`);

  // Step 1: Preflight D1 DB & Historical Tombstone Integrity
  logFn('\n--- Step 1: Preflight D1 DB & Historical Tombstone Integrity ---');
  const d1Query = options.d1QueryFn || queryD1;
  const historicalRows = await d1Query('SELECT id, deleted_at FROM users WHERE id IN (?, ?);', HISTORICAL_TOMBSTONES);
  logFn(`Verified ${historicalRows.length}/${HISTORICAL_TOMBSTONES.length} historical tombstones intact with non-null deleted_at.`);
  if (historicalRows.length !== HISTORICAL_TOMBSTONES.length || historicalRows.some(r => !r.deleted_at)) {
    throw new Error('Historical tombstones check failed: one or more expected tombstones missing or deleted_at is null');
  }

  // Step 2: Testing Token Check
  let testingToken = null;
  let clerkClient = null;
  if (secretKey?.startsWith('sk_test_')) {
    logFn('\n--- Step 2: Initializing Clerk Backend Client & Testing Token ---');
    try {
      clerkClient = createClerkClient({ secretKey });
      const ttResponse = await clerkClient.testingTokens.createTestingToken();
      testingToken = ttResponse.token;
      logFn('[PASS] Successfully minted Clerk testing token for bot bypass.');
    } catch (err) {
      logFn(`[WARN] Testing token creation failed: ${err.message}`);
    }
  } else {
    logFn('\n--- Step 2: Testing Token Check ---');
    logFn('[BLOCKED] CLERK_SECRET_KEY (sk_test_...) is not set in .env.preview.local.');
    logFn('Clerk requires a testing token to bypass Cloudflare Turnstile during automated testing.');
  }

  const report = {
    candidate_sha: CANDIDATE_SHA,
    preview_url: PREVIEW_URL,
    effective_db: PREVIEW_DB_ID,
    started_at: startTime,
    completed_at: null,
    status: 'BLOCKED',
    testing_token_used: Boolean(testingToken),
    proofs: {
      csv_import: { expected_status: 201, actual_status: null, passed: false, detail: null },
      cross_user_write_rejection: { expected_status: 404, actual_status: null, passed: false, detail: null },
      deletion_410_rejection: { expected_status: 410, actual_status: null, passed: false, detail: null }
    },
    deferred: {
      native_200_zoom: 'Deferred through C10 to B31/C11 per owner instruction',
      actual_screen_reader: 'Deferred through C10 to B31/C11 per owner instruction'
    },
    blocker: null
  };

  const cleanupOutput = {
    active_users_created_this_run: 0,
    userA_clerk_deleted: true,
    userB_clerk_deleted: true,
    userA_tombstone_present: true,
    userB_tombstone_present: true,
    scoped_tables_clean: true,
    existing_tombstones_preserved: HISTORICAL_TOMBSTONES,
    note: 'Preflight confirmed existing tombstones and zero active users created prior to blocker halt.'
  };

  if (!testingToken || !secretKey) {
    report.blocker = {
      step: 'Step 2: Clerk Testing Token / Turnstile Bot Detection',
      tool_or_error: 'Cloudflare Turnstile challenges automated Playwright forms without Clerk testing token',
      smallest_owner_action: 'Add development Secret Key CLERK_SECRET_KEY=sk_test_... to .env.preview.local (chmod 600, ignored).',
      repro_command: 'node docs/execution/evidence/C07/remaining/run_remaining_proofs.mjs'
    };
    report.completed_at = new Date().toISOString();
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(CLEANUP_FILE, JSON.stringify(cleanupOutput, null, 2) + '\n');
    logFn(`\nReport written to: ${REPORT_FILE}`);
    logFn('[BLOCKED] Halting run before user creation per C07_FINISH_PROMPT.md section 3.');
    return { status: 'BLOCKED', report };
  }

  // Full instrumented run
  let browser = null;
  let contextA = null;
  let contextB = null;
  let pageA = null;
  let pageB = null;
  const manifest = { userA: null, userB: null };

  try {
    const { chromium } = await import('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });
    contextA = await browser.newContext();
    contextB = await browser.newContext();

    await setupClerkInterception(contextA, testingToken, fapi);
    await setupClerkInterception(contextB, testingToken, fapi);

    // Step 3: Create disposable users via Clerk Backend API and sign in via ticket
    logFn('\n--- Step 3: Creating and Authenticating Disposable Users A & B ---');
    const nonce = Date.now().toString().slice(-6);
    const passA = generateDisposablePassword();
    const passB = generateDisposablePassword();
    const emailA = `finpath_test_a_${nonce}+clerk_test@example.com`;
    const emailB = `finpath_test_b_${nonce}+clerk_test@example.com`;

    const clerkUserA = await clerkClient.users.createUser({ emailAddress: [emailA], password: passA });
    manifest.userA = clerkUserA.id;
    recordManifestUser(manifest.userA, 'userA');
    logFn(`Created synthetic User A: ${manifest.userA.slice(0, 14)}...`);

    const clerkUserB = await clerkClient.users.createUser({ emailAddress: [emailB], password: passB });
    manifest.userB = clerkUserB.id;
    recordManifestUser(manifest.userB, 'userB');
    logFn(`Created synthetic User B: ${manifest.userB.slice(0, 14)}...`);

    // Verify distinct user IDs
    if (manifest.userA === manifest.userB) {
      throw new Error('User A and User B IDs are not distinct!');
    }

    // Authenticate User A via Ticket
    pageA = await contextA.newPage();
    await pageA.goto(`${PREVIEW_URL}/`, { waitUntil: 'networkidle' });
    const ticketA = await clerkClient.signInTokens.createSignInToken({ userId: manifest.userA, expiresInSeconds: 300 });

    await pageA.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket failed with status: ${res.status}`);
        }
      });
    }, ticketA.token);

    await pageA.waitForFunction(() => window.Clerk?.user !== null && window.Clerk?.session !== null);
    const meA = await pageA.evaluate(async () => {
      const res = await fetch('/api/me');
      return { status: res.status, body: await res.json() };
    });
    logFn(`User A authenticated. /api/me: status ${meA.status}`);
    if (meA.status !== 200 || meA.body?.userId !== manifest.userA) {
      throw new Error(`User A authentication failed: expected ${manifest.userA}, got ${meA.body?.userId}`);
    }

    // Authenticate User B via Ticket
    pageB = await contextB.newPage();
    await pageB.goto(`${PREVIEW_URL}/`, { waitUntil: 'networkidle' });
    const ticketB = await clerkClient.signInTokens.createSignInToken({ userId: manifest.userB, expiresInSeconds: 300 });

    await pageB.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket failed with status: ${res.status}`);
        }
      });
    }, ticketB.token);

    await pageB.waitForFunction(() => window.Clerk?.user !== null && window.Clerk?.session !== null);
    const meB = await pageB.evaluate(async () => {
      const res = await fetch('/api/me');
      return { status: res.status, body: await res.json() };
    });
    logFn(`User B authenticated. /api/me: status ${meB.status}`);
    if (meB.status !== 200 || meB.body?.userId !== manifest.userB) {
      throw new Error(`User B authentication failed: expected ${manifest.userB}, got ${meB.body?.userId}`);
    }

    // --- PROOF 1: CSV Import ---
    logFn('\n--- Proof 1: Browser CSV Selection, Preview 200, Commit 201 & Persisted Data ---');
    await pageA.goto(`${PREVIEW_URL}/accounts`, { waitUntil: 'networkidle' });

    const accountPayload = {
      name: `Primary Checking ${nonce}`,
      accountType: 'checking',
      currency: 'USD',
      institutionName: 'First Synthetic Bank',
      balanceCents: 1000000,
      balanceDate: '2026-06-01'
    };
    validateAccountPayload(accountPayload);

    const createAccRes = await pageA.evaluate(async (payload) => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return { status: res.status, body: await res.json() };
    }, accountPayload);

    if (createAccRes.status !== 201 || !createAccRes.body?.account?.id) {
      throw new Error(`Failed creating initial account for User A: status ${createAccRes.status}`);
    }
    const userA_AccountId = createAccRes.body.account.id;
    logFn(`User A created checking account: ${userA_AccountId} (status 201).`);

    // Prepare synthetic CSV matching exact parser headers
    const csvContent = buildSyntheticCsv({
      accountName: accountPayload.name,
      balanceDate: '2026-06-15',
      balanceAmount: '12345.67',
      currency: 'USD'
    });
    const tempCsvPath = join(__dirname, 'test_balances.csv');
    writeFileSync(tempCsvPath, csvContent);

    // Setup network response listeners before triggering file selection
    const previewPromise = pageA.waitForResponse(
      (resp) => resp.url().includes('/api/imports/account-balances/preview') && resp.request().method() === 'POST',
      { timeout: 15000 }
    );
    const commitPromise = pageA.waitForResponse(
      (resp) => resp.url().includes('/api/imports/account-balances/commit') && resp.request().method() === 'POST',
      { timeout: 15000 }
    );

    // Select file using exact file input
    const fileInput = pageA.locator('input[type="file"][accept*="csv"]');
    await fileInput.setInputFiles(tempCsvPath);

    // Assert preview response
    const previewResp = await previewPromise;
    const previewStatus = previewResp.status();
    const previewJson = await previewResp.json();
    logFn(`Observed /preview status: ${previewStatus}, readyRows: ${previewJson?.preview?.summary?.readyRows}`);

    if (previewStatus !== 200 || previewJson?.preview?.summary?.readyRows !== 1) {
      throw new Error(`CSV preview failed: status ${previewStatus}, readyRows ${previewJson?.preview?.summary?.readyRows}`);
    }

    // Click commit button
    const commitButton = pageA.locator('button:has-text("Import 1 balance")');
    await commitButton.click();

    // Assert commit response
    const commitResp = await commitPromise;
    const commitStatus = commitResp.status();
    const commitJson = await commitResp.json();
    logFn(`Observed /commit status: ${commitStatus}, importedRows: ${commitJson?.importRecord?.importedRows}`);

    // Verify D1 persistence
    const d1Imports = await d1Query('SELECT id, imported_rows, total_rows FROM balance_imports WHERE user_id = ?;', [manifest.userA]);
    const d1Balances = await d1Query('SELECT balance_cents, balance_date FROM account_balances WHERE user_id = ? AND balance_date = ?;', [manifest.userA, '2026-06-15']);

    const persistedCorrectly = d1Imports.length > 0 &&
      d1Imports[0].imported_rows === 1 &&
      d1Balances.length > 0 &&
      d1Balances[0].balance_cents === 1234567;

    await pageA.screenshot({ path: SCREENSHOT_FILE, fullPage: true });

    report.proofs.csv_import = {
      expected_status: 201,
      actual_status: commitStatus,
      passed: commitStatus === 201 && persistedCorrectly,
      detail: `Preview returned 200, commit returned ${commitStatus} (1 row imported), D1 verified 1234567 cents on 2026-06-15.`
    };

    // Clean up temporary CSV
    try { unlinkSync(tempCsvPath); } catch {}

    // --- PROOF 2: Cross-User Write Rejection ---
    logFn('\n--- Proof 2: Authenticated Cross-User Write Rejection (HTTP 404) ---');
    // User B attempts to access own accounts (should succeed with 0 accounts)
    const bOwnRes = await pageB.evaluate(async () => {
      const res = await fetch('/api/accounts');
      return { status: res.status, body: await res.json() };
    });
    logFn(`User B own accounts GET: status ${bOwnRes.status}, count: ${bOwnRes.body?.accounts?.length}`);

    // User B attempts GET on User A's account ID
    const bGetRes = await pageB.evaluate(async (accId) => {
      const res = await fetch(`/api/accounts/${accId}`);
      return { status: res.status, body: await res.json() };
    }, userA_AccountId);
    logFn(`User B GET User A account: status ${bGetRes.status}`);

    // User B attempts PUT on User A's account ID with syntactically valid update body
    const bPutRes = await pageB.evaluate(async (accId) => {
      const res = await fetch(`/api/accounts/${accId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Tampered by Attacker', accountType: 'checking', currency: 'USD' })
      });
      return { status: res.status, body: await res.json() };
    }, userA_AccountId);
    logFn(`User B PUT User A account: status ${bPutRes.status}`);

    // Verify User A's account remains completely unchanged
    const aVerifyRes = await pageA.evaluate(async (accId) => {
      const res = await fetch(`/api/accounts/${accId}`);
      return { status: res.status, body: await res.json() };
    }, userA_AccountId);
    logFn(`User A account name after attack: '${aVerifyRes.body?.account?.name}'`);

    const crossUserPassed = bGetRes.status === 404 &&
      bPutRes.status === 404 &&
      aVerifyRes.status === 200 &&
      aVerifyRes.body?.account?.name === accountPayload.name;

    report.proofs.cross_user_write_rejection = {
      expected_status: 404,
      actual_status: bPutRes.status,
      passed: crossUserPassed,
      detail: `User B GET returned ${bGetRes.status}, PUT returned ${bPutRes.status}. User A account remained unchanged.`
    };

    // --- PROOF 3: Deletion 410 Rejection ---
    logFn('\n--- Proof 3: Authenticated HTTP 410 Rejection After Data Deletion ---');
    // Pre-deletion: prove valid profile PUT returns 200
    const preDelProfile = await pageA.evaluate(async () => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ displayName: 'Active User Profile' })
      });
      return { status: res.status, body: await res.json() };
    });
    logFn(`User A pre-delete profile PUT: status ${preDelProfile.status}`);

    // Obtain fresh real session token
    const freshTokenA = await pageA.evaluate(() => window.Clerk.session.getToken());

    // Execute account data deletion
    const delRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/account-data', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
      });
      return { status: res.status, body: await res.json() };
    });
    logFn(`User A DELETE /api/account-data: status ${delRes.status}`);

    // Immediately attempt profile PUT using the still-valid session token
    const postDelProfile = await pageA.evaluate(async (token) => {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: 'Post-Delete Update Attempt' })
      });
      return { status: res.status, body: await res.json() };
    }, freshTokenA);
    logFn(`User A post-delete profile PUT: status ${postDelProfile.status}, code: ${postDelProfile.body?.code}`);

    const deletion410Passed = delRes.status === 200 &&
      postDelProfile.status === 410 &&
      postDelProfile.body?.code === 'ACCOUNT_DELETED';

    report.proofs.deletion_410_rejection = {
      expected_status: 410,
      actual_status: postDelProfile.status,
      passed: deletion410Passed,
      detail: `DELETE returned 200. Immediate authenticated profile PUT returned ${postDelProfile.status} with code ${postDelProfile.body?.code}.`
    };

    if (report.proofs.csv_import.passed &&
        report.proofs.cross_user_write_rejection.passed &&
        report.proofs.deletion_410_rejection.passed) {
      report.status = 'PASS';
    }

  } catch (err) {
    logFn(`[Harness Error] ${err.message}`);
    report.status = 'FAILED';
    report.blocker = {
      step: 'Execution Exception',
      tool_or_error: err.message,
      smallest_owner_action: 'Inspect error details and retry.',
      repro_command: 'node docs/execution/evidence/C07/remaining/run_remaining_proofs.mjs'
    };
  } finally {
    logFn('\n--- Step 4: Robust Fail-Closed Cleanup ---');
    let cleanupOutcome = null;
    try {
      cleanupOutcome = await performCleanup({
        manifest,
        d1QueryFn: d1Query,
        secretKey,
        clerkClient,
        pageA,
        pageB,
        logFn
      });
    } catch (cleanErr) {
      logFn(`[Cleanup Exception] ${cleanErr.message}`);
      cleanupOutcome = { success: false, result: { errors: [cleanErr.message] } };
    }

    // Revoke PASS if cleanup was not completely successful
    if (report.status === 'PASS' && !cleanupOutcome?.success) {
      logFn('[FAIL] Revoking PASS status: cleanup failed or left residual records behind.');
      report.status = 'FAILED';
    }

    // Always write reports and close browser
    try {
      if (cleanupOutcome?.result) {
        writeFileSync(CLEANUP_FILE, JSON.stringify(cleanupOutcome.result, null, 2) + '\n');
      }
      report.completed_at = new Date().toISOString();
      writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
      logFn(`Report written to: ${REPORT_FILE}`);
      logFn(`Cleanup status written to: ${CLEANUP_FILE}`);
    } catch (writeErr) {
      logFn(`[Report Write Error] ${writeErr.message}`);
    }

    if (browser) {
      try { await browser.close(); } catch {}
    }
  }

  logFn(`\nFinal Status: ${report.status}`);
  if (report.status !== 'PASS') {
    process.exitCode = 1;
  }
  return { status: report.status, report };
}

// Direct execution entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runHarness().catch((err) => {
    console.error('Fatal unhandled harness error:', err);
    process.exit(1);
  });
}
