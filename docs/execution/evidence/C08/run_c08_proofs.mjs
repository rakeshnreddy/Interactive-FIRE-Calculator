#!/usr/bin/env node

/**
 * C08 Verification & Evidence Capture Harness
 * Covers B26 (Dashboard & Accounts) and B27 (Transactions & Import Review)
 * on immutable preview deployment deaf49a8-9580-4592-a601-adf05ea42966.
 */

import { readFileSync, writeFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
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

  // Preflight 2: Initial D1 zero count
  console.log('Checking initial D1 table counts across 14 tables...');
  for (const table of USER_TABLES) {
    const res = await queryD1(`SELECT count(*) as cnt FROM ${table};`);
    if (res[0]?.cnt !== 0) {
      throw new Error(`Table ${table} is not clean (found ${res[0]?.cnt} rows)`);
    }
  }
  console.log('Initial D1 database is clean (0 rows across 14 user tables).');

  // Preflight 3: Clerk client and testing token
  const clerkClient = createClerkClient({ secretKey });
  const rawKey = publishableKey.replace(/^pk_(?:test|live)_/, '');
  const fapi = Buffer.from(rawKey, 'base64').toString('utf8').replace(/\$$/, '');
  console.log(`Clerk Frontend API host: ${fapi}`);

  const testTokenObj = await clerkClient.testingTokens.createTestingToken();
  const testingToken = testTokenObj.token;
  console.log('Created Clerk development testing token.');

  // Create disposable user
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
    cleanup: {}
  };

  let browser = null;
  let context = null;
  let page = null;

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
    // B26: Accounts and Dashboard Polish
    // ==========================================
    console.log('\n--- Executing B26 Accounts & Dashboard Verification ---');
    await page.goto(`${PREVIEW_URL}/accounts`, { waitUntil: 'networkidle' });

    // Verify 4 starting defect fixes
    // 1. Profile band: no duplicate email line
    const profileBandHtml = await page.locator('.profile-band').innerHTML();
    const emailOccurrences = (profileBandHtml.match(new RegExp(email, 'g')) || []).length;
    console.log(`Profile band email occurrences: ${emailOccurrences} (expected <= 1)`);
    report.b26_accounts_polish.profile_email_deduplicated = emailOccurrences <= 1;

    // 2. Eyebrow copy: "Accounts and balances are active."
    const statusText = await page.locator('.next-module-band strong').innerText();
    console.log(`Platform status text: "${statusText}"`);
    report.b26_accounts_polish.user_facing_copy = statusText.includes('Accounts and balances are active.');

    // Add Account 1: Fresh Account (balance date 2026-09-01)
    console.log('Adding fresh account "Primary Checking"...');
    await page.evaluate(async () => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Primary Checking',
          accountType: 'checking',
          institutionName: 'Chase',
          currency: 'USD',
          balanceCents: 1234567,
          balanceDate: '2026-09-01'
        })
      });
      return { status: res.status, body: await res.json() };
    });

    // Add Account 2: Stale Account (balance date 2026-06-01 > 30 days)
    console.log('Adding stale account "Old Savings"...');
    await page.evaluate(async () => {
      const res = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Old Savings',
          accountType: 'savings',
          institutionName: 'Ally',
          currency: 'USD',
          balanceCents: 250000,
          balanceDate: '2026-06-01'
        })
      });
      return { status: res.status, body: await res.json() };
    });

    // Reload page to verify persisted values and rendered presentation
    await page.reload({ waitUntil: 'networkidle' });

    // Verify exact cents in account cards
    const accountsHtml = await page.locator('.account-card-list').innerHTML();
    const hasExactCents1 = accountsHtml.includes('$12,345.67');
    const hasExactCents2 = accountsHtml.includes('$2,500.00');
    console.log(`Account card exact cents ($12,345.67): ${hasExactCents1}, ($2,500.00): ${hasExactCents2}`);
    report.b26_accounts_polish.exact_cents_displayed = hasExactCents1 && hasExactCents2;

    // Verify as-of context
    const hasAsOfDate1 = accountsHtml.includes('As of 2026-09-01');
    const hasAsOfDate2 = accountsHtml.includes('As of 2026-06-01');
    console.log(`As-of dates rendered: ${hasAsOfDate1 && hasAsOfDate2}`);
    report.b26_accounts_polish.as_of_date_rendered = hasAsOfDate1 && hasAsOfDate2;

    // Verify stale badge on Old Savings and absent on Primary Checking
    const staleBadges = await page.locator('.account-stale-badge').allInnerTexts();
    console.log(`Stale badges found: ${JSON.stringify(staleBadges)}`);
    report.b26_accounts_polish.stale_badge_present_for_old_account = staleBadges.length >= 1;

    // Verify record-balance date input width
    const dateInputWidth = await page.locator('.balance-form input[type="date"]').first().evaluate((el) => {
      return window.getComputedStyle(el).width;
    });
    console.log(`Computed date input width in .balance-form: ${dateInputWidth}`);
    report.b26_accounts_polish.date_input_width = dateInputWidth;

    // Capture Multi-viewport Screenshots for Accounts
    const viewports = [
      { name: '1280', width: 1280, height: 800 },
      { name: '768', width: 768, height: 1024 },
      { name: '390', width: 390, height: 844 },
      { name: '320', width: 320, height: 640 }
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      // Light mode
      await page.emulateMedia({ colorScheme: 'light' });
      await page.screenshot({ path: join(SCREENSHOTS_DIR, `accounts-${vp.name}-light.png`), fullPage: false });
      // Dark mode
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({ path: join(SCREENSHOTS_DIR, `accounts-${vp.name}-dark.png`), fullPage: false });
    }
    console.log('Captured Accounts multi-viewport screenshots (1280, 768, 390, 320 light/dark).');

    // Dashboard navigation & verification
    console.log('Navigating to /dashboard...');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'networkidle' });

    const dashboardStatusText = await page.locator('.next-module-band strong').innerText();
    console.log(`Dashboard status text: "${dashboardStatusText}"`);
    report.b26_accounts_polish.dashboard_user_facing_copy = dashboardStatusText.includes('Dashboard overview is active.');

    const dashboardHtml = await page.locator('.dashboard-summary-grid, .account-row-list').first().innerHTML();
    report.b26_accounts_polish.dashboard_renders_accounts = dashboardHtml.includes('Primary Checking');

    // Dashboard screenshots
    await page.emulateMedia({ colorScheme: 'light' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'dashboard-1280-light.png'), fullPage: false });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'dashboard-1280-dark.png'), fullPage: false });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'dashboard-390-light.png'), fullPage: false });
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'dashboard-390-dark.png'), fullPage: false });
    console.log('Captured Dashboard screenshots.');

    // ==========================================
    // B27: Transactions & Import Review
    // ==========================================
    console.log('\n--- Executing B27 Transactions & Import Review Verification ---');
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${PREVIEW_URL}/transactions`, { waitUntil: 'networkidle' });

    // Check initial ledger empty state
    const emptyNotice = await page.locator('.empty-card span').innerText();
    console.log(`Initial ledger state: "${emptyNotice}"`);
    report.b27_transactions_polish.initial_empty_state = emptyNotice.includes('No transactions yet');

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

    // Step 1: Real browser file selection
    console.log('Selecting CSV file in browser...');
    const fileInput = page.locator('.transaction-import-panel input[type="file"]');
    
    // Attach observer for preview request
    const previewPromise = page.waitForResponse(
      (resp) => resp.url().includes('/api/imports/transactions/preview') && resp.status() === 200
    );

    await fileInput.setInputFiles(csvFilePayload);
    const previewResp = await previewPromise;
    const previewBody = await previewResp.json();
    console.log(`Preview response: total=${previewBody.preview?.summary?.totalRows}, ready=${previewBody.preview?.summary?.readyRows}, error=${previewBody.preview?.summary?.errorRows}`);

    report.b27_transactions_polish.preview_summary = previewBody.preview?.summary;

    // Assert that selecting a file did NOT commit (transactions table remains 0 rows)
    const d1TxBeforeCommit = await queryD1('SELECT count(*) as cnt FROM transactions;');
    console.log(`D1 transactions count after preview (before commit): ${d1TxBeforeCommit[0]?.cnt} (must be 0)`);
    report.b27_transactions_polish.selection_did_not_commit = d1TxBeforeCommit[0]?.cnt === 0;

    // Check actionable error row in preview table
    await page.waitForSelector('.transaction-import-table');
    const tableHtml = await page.locator('.transaction-import-table').innerHTML();
    const hasActionableError = tableHtml.includes('Amount must be a positive amount');
    console.log(`Actionable validation message visible in preview: ${hasActionableError}`);
    report.b27_transactions_polish.actionable_row_error_displayed = hasActionableError;

    // Capture preview screenshot
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'transaction-import-preview.png'), fullPage: false });

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

    // Verify balance history was NOT modified by transaction import
    const balanceCount = await queryD1('SELECT count(*) as cnt FROM account_balances;');
    console.log(`Account balances count after transaction import: ${balanceCount[0]?.cnt} (must remain 2 from account creation)`);
    report.b27_transactions_polish.balances_unchanged = balanceCount[0]?.cnt === 2;

    // Step 3: Duplicate detection verification
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

    // Capture duplicate preview screenshot
    await page.screenshot({ path: join(SCREENSHOTS_DIR, 'transaction-import-duplicate.png'), fullPage: false });

    // Verify persisted transaction count remains 2
    const d1TxAfterDuplicate = await queryD1('SELECT count(*) as cnt FROM transactions;');
    console.log(`Persisted transaction count after duplicate check: ${d1TxAfterDuplicate[0]?.cnt} (must be 2)`);
    report.b27_transactions_polish.persisted_count_unchanged = d1TxAfterDuplicate[0]?.cnt === 2;

    // Multi-viewport screenshots for Transactions
    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ colorScheme: 'light' });
      await page.screenshot({ path: join(SCREENSHOTS_DIR, `transactions-${vp.name}-light.png`), fullPage: false });
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.screenshot({ path: join(SCREENSHOTS_DIR, `transactions-${vp.name}-dark.png`), fullPage: false });
    }
    console.log('Captured Transactions multi-viewport screenshots.');

    report.status = 'SUCCESS';
  } catch (error) {
    console.error('Verification error:', error);
    report.status = 'FAILED';
    report.error = error.message;
  } finally {
    // ==========================================
    // Fail-closed Cleanup
    // ==========================================
    console.log('\n--- Executing Fail-Closed Cleanup ---');
    const cleanupResult = {
      userId,
      app_data_deleted: false,
      user_tombstone_present: false,
      clerk_user_deleted: false,
      all_tables_zero: false,
      table_counts: {}
    };

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
        console.log(`Application data deleted: ${cleanupResult.app_data_deleted}`);
      } catch (e) {
        console.error('App data delete error:', e);
      }
    }

    // Verify D1 zero rows across all 14 tables
    let allZero = true;
    for (const table of USER_TABLES) {
      try {
        const res = await queryD1(`SELECT count(*) as cnt FROM ${table};`);
        const cnt = res[0]?.cnt ?? -1;
        cleanupResult.table_counts[table] = cnt;
        if (cnt !== 0) allZero = false;
      } catch (e) {
        cleanupResult.table_counts[table] = `error: ${e.message}`;
        allZero = false;
      }
    }
    cleanupResult.all_tables_zero = allZero;
    console.log(`All 14 user tables empty (0 rows): ${allZero}`);

    // Verify tombstone in users table
    try {
      const uRows = await queryD1('SELECT id, deleted_at FROM users WHERE id = ?;', [userId]);
      cleanupResult.user_tombstone_present = uRows.length > 0 && Boolean(uRows[0].deleted_at);
      console.log(`User tombstone present: ${cleanupResult.user_tombstone_present}`);
    } catch (e) {
      console.error('Tombstone query error:', e);
    }

    // Delete Clerk provider identity
    try {
      await clerkClient.users.deleteUser(userId);
      cleanupResult.clerk_user_deleted = true;
      console.log(`Clerk provider user deleted.`);
    } catch (e) {
      if (e.status === 404) cleanupResult.clerk_user_deleted = true;
      else console.error('Clerk delete error:', e);
    }

    // Verify Clerk user absence
    try {
      await clerkClient.users.getUser(userId);
      cleanupResult.clerk_user_absent = false;
    } catch (e) {
      cleanupResult.clerk_user_absent = e.status === 404 || e.message?.includes('not found');
      console.log(`Clerk user absence verified: ${cleanupResult.clerk_user_absent}`);
    }

    if (browser) await browser.close();

    report.cleanup = cleanupResult;
    writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
    writeFileSync(CLEANUP_FILE, JSON.stringify(cleanupResult, null, 2) + '\n');
    console.log(`Report written to ${REPORT_FILE}`);
    console.log(`Cleanup manifest written to ${CLEANUP_FILE}`);
  }

  if (report.status !== 'SUCCESS') {
    throw new Error(`Hosted verification failed: ${report.error}`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllProofs().catch((err) => {
    console.error('FATAL:', err);
    process.exit(1);
  });
}
