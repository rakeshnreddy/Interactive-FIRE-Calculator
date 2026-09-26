#!/usr/bin/env node
// Shared hosted smoke runner (PA-1). One runner for every checkpoint: a checkpoint adds a
// scenario module under scripts/smoke/, never a new harness.
//
// Guarantees:
// - No default candidate SHA, deployment, URL, database or credentials. Missing inputs exit nonzero.
// - Preflight reads Cloudflare deployment metadata and must match every requested value before any
//   synthetic user or write exists.
// - Every stage records PASS/FAIL from an observation; skipped stages are never PASS.
// - Cleanup always runs, requires an exact zero count from every user-scoped table derived from
//   migrations/, and deletes the Clerk user only after application data is verified gone.
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import crypto from 'node:crypto';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export const PROJECT_NAME = 'interactive-fire-calculator';
export const PRODUCTION_DB_ID = 'a5860350-0a50-4ebe-9f5f-1d9916a908e6';
export const DELETE_CONFIRMATION = 'DELETE MY FINPATH DATA';
export const EXPECTED_USER_TABLES = [
  'account_balances', 'assumptions', 'audit_log', 'balance_imports', 'financial_accounts',
  'fire_plan_inputs', 'fire_plan_results', 'goals', 'plan_reviews', 'plan_versions', 'plans',
  'saved_calculator_results', 'transaction_imports', 'transactions', 'user_profiles'
];

const SHA_RE = /^[0-9a-f]{40}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

export class SmokeError extends Error {}

// ---------------------------------------------------------------------------
// Inputs
// ---------------------------------------------------------------------------

export function parseArgs(argv) {
  const values = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) throw new SmokeError(`Unexpected argument: ${arg}`);
    const [key, inline] = arg.slice(2).split('=', 2);
    values[key] = inline ?? argv[++i];
  }
  const config = {
    sha: values.sha?.trim().toLowerCase(),
    deploymentId: values['deployment-id']?.trim().toLowerCase(),
    url: values.url?.trim().replace(/\/+$/, ''),
    dbId: values['db-id']?.trim().toLowerCase(),
    accountId: values['account-id']?.trim(),
    scenario: values.scenario?.trim(),
    out: values.out?.trim()
  };
  const errors = [];
  if (!config.sha || !SHA_RE.test(config.sha)) errors.push('--sha must be the full 40-character candidate SHA');
  if (!config.deploymentId || !UUID_RE.test(config.deploymentId)) errors.push('--deployment-id must be a deployment UUID');
  if (!config.url || !/^https:\/\/[a-z0-9-]+\.interactive-fire-calculator\.pages\.dev$/.test(config.url)) {
    errors.push('--url must be an https://<id>.interactive-fire-calculator.pages.dev preview URL');
  }
  if (!config.dbId || !UUID_RE.test(config.dbId)) errors.push('--db-id must be the preview D1 UUID');
  if (config.dbId === PRODUCTION_DB_ID) errors.push('--db-id is the production database; refusing');
  if (!config.accountId || !/^[0-9a-f]{32}$/.test(config.accountId)) errors.push('--account-id must be the 32-character Cloudflare account ID');
  if (!config.scenario || !/^[a-z0-9-]+$/.test(config.scenario)) errors.push('--scenario must name a module in scripts/smoke/');
  if (errors.length) throw new SmokeError(`Invalid inputs:\n- ${errors.join('\n- ')}`);
  return config;
}

// ---------------------------------------------------------------------------
// Cleanup table contract
// ---------------------------------------------------------------------------

export function deriveUserScopedTables(migrationsDir = join(REPO_ROOT, 'migrations')) {
  const tables = new Set();
  for (const file of readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort()) {
    const sql = readFileSync(join(migrationsDir, file), 'utf8');
    for (const match of sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+(\w+)\s*\(([\s\S]*?)\n\);/gi)) {
      if (/^\s*user_id\s/m.test(match[2]) && match[1] !== 'users') tables.add(match[1]);
    }
    for (const match of sql.matchAll(/ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+user_id\s/gi)) tables.add(match[1]);
  }
  const derived = [...tables].sort();
  const expected = [...EXPECTED_USER_TABLES].sort();
  if (derived.join(',') !== expected.join(',')) {
    throw new SmokeError(`User-scoped table contract changed: migrations define [${derived.join(', ')}]; update EXPECTED_USER_TABLES deliberately.`);
  }
  return derived;
}

// ---------------------------------------------------------------------------
// Preflight: provider metadata must match every requested value
// ---------------------------------------------------------------------------

export async function verifyPreflight(config, cloudflare) {
  const deployment = await cloudflare.getDeployment(config.deploymentId);
  const problems = [];
  if (!deployment || typeof deployment !== 'object') throw new SmokeError('Cloudflare returned no deployment metadata');
  if (deployment.id !== config.deploymentId) problems.push('deployment ID mismatch');
  if (deployment.project_name !== PROJECT_NAME) problems.push(`project is "${deployment.project_name}"`);
  if (deployment.environment !== 'preview') problems.push(`environment is "${deployment.environment}"`);
  if (deployment.latest_stage?.status !== 'success') problems.push(`latest stage is "${deployment.latest_stage?.status}"`);
  const immutableUrl = `https://${deployment.short_id}.${PROJECT_NAME}.pages.dev`;
  if (!deployment.short_id || deployment.url !== immutableUrl || config.url !== immutableUrl) {
    problems.push('URL is not this deployment\'s immutable hostname');
  }
  if (deployment.deployment_trigger?.metadata?.commit_hash !== config.sha) problems.push('deployed commit does not match --sha');
  const boundDb = deployment.d1_databases?.DB?.id;
  if (boundDb !== config.dbId) problems.push('effective DB binding does not match --db-id');
  if (boundDb === PRODUCTION_DB_ID) problems.push('deployment is bound to the production database');
  if (problems.length) throw new SmokeError(`Preflight failed: ${problems.join('; ')}`);
  return {
    deploymentId: deployment.id,
    url: deployment.url,
    sha: config.sha,
    dbId: boundDb,
    commitDirty: Boolean(deployment.deployment_trigger?.metadata?.commit_dirty)
  };
}

// ---------------------------------------------------------------------------
// Planning workspace readiness (pure classification + polling loop)
// ---------------------------------------------------------------------------

// snapshot: { clerkLoaded, signedIn, pathname, planId, version, authGateVisible, controlledError,
//             loading, reviewPanels, overviewText }
export function classifyWorkspace(snapshot, expected) {
  if (!snapshot) return { state: 'waiting', reason: 'no snapshot' };
  if (!snapshot.clerkLoaded) return { state: 'waiting', reason: 'Clerk loading' };
  if (!snapshot.signedIn) return { state: 'failed', reason: 'Clerk settled signed out' };
  if (snapshot.pathname !== '/plans') return { state: 'failed', reason: `route is ${snapshot.pathname}` };
  if (snapshot.planId !== expected.planId || snapshot.version !== String(expected.version)) {
    return { state: 'failed', reason: 'route plan/version differs from the requested one' };
  }
  if (snapshot.controlledError) return { state: 'failed', reason: `controlled error: ${snapshot.controlledError}` };
  if (snapshot.loading || snapshot.authGateVisible) return { state: 'waiting', reason: 'workspace hydrating' };
  const marker = `Version ${expected.version} loaded`;
  if (!snapshot.overviewText) return { state: 'waiting', reason: 'overview empty' };
  if (!snapshot.overviewText.includes(marker)) {
    return /Version \d+ loaded/.test(snapshot.overviewText)
      ? { state: 'failed', reason: 'a different version is loaded' }
      : { state: 'waiting', reason: 'version not yet loaded' };
  }
  if (snapshot.reviewPanels === 0) return { state: 'waiting', reason: 'review panel not yet visible' };
  if (snapshot.reviewPanels > 1) return { state: 'failed', reason: `${snapshot.reviewPanels} review panels` };
  return { state: 'ready' };
}

export async function waitForWorkspace(takeSnapshot, expected, {
  timeoutMs = 30000,
  pollMs = 250,
  now = Date.now,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms))
} = {}) {
  const deadline = now() + timeoutMs;
  let last = { state: 'waiting', reason: 'not polled' };
  while (now() <= deadline) {
    last = classifyWorkspace(await takeSnapshot(), expected);
    if (last.state === 'ready') return last;
    if (last.state === 'failed') throw new SmokeError(`Workspace not ready: ${last.reason}`);
    await sleep(pollMs);
  }
  throw new SmokeError(`Workspace not ready within ${timeoutMs}ms: ${last.reason}`);
}

export const WORKSPACE_SNAPSHOT_SCRIPT = `(() => {
  const visible = (el) => Boolean(el && el.getClientRects().length > 0);
  const params = new URLSearchParams(location.search);
  const error = document.querySelector('.planning-controlled-error');
  return {
    clerkLoaded: Boolean(window.Clerk && window.Clerk.loaded),
    signedIn: Boolean(window.Clerk && window.Clerk.user && window.Clerk.session),
    pathname: location.pathname,
    planId: params.get('planId'),
    version: params.get('version'),
    authGateVisible: visible(document.querySelector('.auth-gate')),
    controlledError: visible(error) ? (error.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 160) : '',
    loading: Boolean(document.querySelector('.planning-loading-panel, .planning-workspace [aria-busy="true"]')),
    reviewPanels: [...document.querySelectorAll('.planning-review-panel')].filter(visible).length,
    overviewText: (document.querySelector('.planning-overview')?.textContent || '').replace(/\\s+/g, ' ').trim()
  };
})()`;

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------

export async function cleanupTenant({ tenant, tables, d1, clerk }) {
  const report = { tenant: tenant.label, appDataDeleted: false, tableCounts: {}, tombstone: 'unchecked', providerDeleted: false, providerAbsent: false, ok: false, errors: [] };
  if (tenant.deleteAppData) {
    try {
      const status = await tenant.deleteAppData();
      report.appDataDeleted = status === 200 || status === 410;
      if (!report.appDataDeleted) report.errors.push(`app data deletion returned ${status}`);
    } catch (error) {
      report.errors.push(`app data deletion failed: ${error.message}`);
    }
  }
  let allZero = true;
  for (const table of tables) {
    try {
      const rows = await d1(`SELECT count(*) AS cnt FROM ${table} WHERE user_id = ?;`, [tenant.id]);
      const count = rows?.[0]?.cnt;
      report.tableCounts[table] = count;
      if (!Number.isInteger(count) || count !== 0) {
        allZero = false;
        report.errors.push(`${table} count is ${JSON.stringify(count)}`);
      }
    } catch (error) {
      allZero = false;
      report.tableCounts[table] = null;
      report.errors.push(`${table} count query failed: ${error.message}`);
    }
  }
  try {
    const rows = await d1('SELECT deleted_at FROM users WHERE id = ?;', [tenant.id]);
    if (rows.length === 0) {
      report.tombstone = tenant.touchedApp ? 'missing' : 'never-created';
    } else {
      report.tombstone = rows[0].deleted_at ? 'present' : 'not-deleted';
    }
    if (report.tombstone === 'missing' || report.tombstone === 'not-deleted') report.errors.push(`user tombstone ${report.tombstone}`);
  } catch (error) {
    report.errors.push(`tombstone query failed: ${error.message}`);
  }
  const appClean = allZero && (report.tombstone === 'present' || report.tombstone === 'never-created')
    && (report.appDataDeleted || !tenant.touchedApp);
  if (!appClean) {
    report.errors.push('provider deletion withheld because application cleanup is unverified');
    return report;
  }
  try {
    await clerk.deleteUser(tenant.id);
    report.providerDeleted = true;
  } catch (error) {
    if (error?.status === 404) report.providerDeleted = true;
    else report.errors.push(`provider deletion failed: ${error.message}`);
  }
  try {
    report.providerAbsent = !(await clerk.userExists(tenant.id));
    if (!report.providerAbsent) report.errors.push('provider still returns the user');
  } catch (error) {
    report.errors.push(`provider absence check failed: ${error.message}`);
  }
  report.ok = report.errors.length === 0 && report.providerDeleted && report.providerAbsent;
  return report;
}

// ---------------------------------------------------------------------------
// Orchestration
// ---------------------------------------------------------------------------

export async function runSmoke({ config, adapters, scenario, tables, log = () => {} }) {
  const result = { status: 'FAIL', scenario: scenario?.name, target: null, stages: [], cleanup: [], error: null, startedAt: new Date().toISOString() };
  const tenants = [];
  const stage = async (name, fn) => {
    log(`[stage] ${name}`);
    try {
      const detail = await fn();
      result.stages.push({ name, status: 'PASS', detail: detail ?? null });
      return detail;
    } catch (error) {
      result.stages.push({ name, status: 'FAIL', error: String(error?.message || error).slice(0, 400) });
      throw error;
    }
  };
  try {
    if (!scenario || typeof scenario.run !== 'function' || !Array.isArray(scenario.requiredStages)) {
      throw new SmokeError('Scenario module must export name, requiredStages and run()');
    }
    result.target = await stage('preflight', () => verifyPreflight(config, adapters.cloudflare));
    await stage('d1-reachable', async () => {
      const rows = await adapters.d1('SELECT 1 AS ping;');
      if (rows?.[0]?.ping !== 1) throw new SmokeError('D1 ping failed');
    });
    for (const label of ['A', 'B']) {
      const tenant = await adapters.clerk.createTenant(label);
      tenants.push(tenant);
    }
    await stage('sign-in', async () => {
      for (const tenant of tenants) await adapters.browser.signIn(tenant, config.url);
    });
    await scenario.run({ config, tenants, stage, d1: adapters.d1, log, helpers: { SmokeError, waitForWorkspace } });
    const recorded = new Set(result.stages.filter((s) => s.status === 'PASS').map((s) => s.name));
    const missing = scenario.requiredStages.filter((name) => !recorded.has(name));
    if (missing.length) throw new SmokeError(`Scenario ended without observing: ${missing.join(', ')}`);
  } catch (error) {
    result.error = String(error?.message || error).slice(0, 600);
  } finally {
    for (const tenant of tenants) {
      result.cleanup.push(await cleanupTenant({ tenant, tables, d1: adapters.d1, clerk: adapters.clerk }));
    }
    try {
      await adapters.browser?.close?.();
    } catch {}
  }
  const cleanupOk = result.cleanup.length === tenants.length && result.cleanup.every((c) => c.ok);
  const stagesOk = result.stages.length > 0 && result.stages.every((s) => s.status === 'PASS');
  result.status = !result.error && stagesOk && cleanupOk && tenants.length === 2 ? 'PASS' : 'FAIL';
  result.finishedAt = new Date().toISOString();
  return result;
}

// ---------------------------------------------------------------------------
// Live adapters (used only by the CLI; never by tests)
// ---------------------------------------------------------------------------

function readPrivateEnv(file) {
  if (!existsSync(file)) throw new SmokeError(`Missing ${file}`);
  if ((statSync(file).mode & 0o077) !== 0) throw new SmokeError(`${file} must be mode 0600`);
  const env = {};
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim();
    const eq = t.indexOf('=');
    if (t && !t.startsWith('#') && eq > 0) env[t.slice(0, eq).trim()] = t.slice(eq + 1).trim();
  }
  return env;
}

function cloudflareToken() {
  if (process.env.CLOUDFLARE_API_TOKEN) return process.env.CLOUDFLARE_API_TOKEN;
  const file = join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');
  const token = existsSync(file) ? readFileSync(file, 'utf8').match(/oauth_token\s*=\s*"([^"]+)"/)?.[1] : null;
  if (!token) throw new SmokeError('No Cloudflare credentials (CLOUDFLARE_API_TOKEN or wrangler login)');
  return token;
}

async function createLiveAdapters(config) {
  const token = cloudflareToken();
  const env = readPrivateEnv(join(REPO_ROOT, '.env.preview.local'));
  if (!env.CLERK_SECRET_KEY?.startsWith('sk_test_') || !env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
    throw new SmokeError('Clerk development keys (sk_test_/pk_test_) are required in .env.preview.local');
  }
  const cfBase = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}`;
  const cfFetch = async (path, init = {}) => {
    const res = await fetch(`${cfBase}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
    const body = await res.json().catch(() => null);
    if (!res.ok || !body?.success) throw new SmokeError(`Cloudflare API ${res.status} for ${path.split('/').slice(0, 4).join('/')}`);
    return body.result;
  };
  const d1 = async (sql, params = []) => {
    const result = await cfFetch(`/d1/database/${config.dbId}/query`, { method: 'POST', body: JSON.stringify({ sql, params }) });
    return result?.[0]?.results ?? [];
  };

  const { createClerkClient } = await import('@clerk/backend');
  const clerkClient = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
  const fapi = Buffer.from(env.VITE_CLERK_PUBLISHABLE_KEY.replace(/^pk_test_/, ''), 'base64').toString('utf8').replace(/\$$/, '');
  const testingToken = (await clerkClient.testingTokens.createTestingToken()).token;
  // Distinct Clerk test numbers (555-0100..0199) for the tenants of one run.
  const phoneBase = crypto.randomInt(100);

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });

  return {
    d1,
    cloudflare: { getDeployment: (id) => cfFetch(`/pages/projects/${PROJECT_NAME}/deployments/${id}`) },
    clerk: {
      async createTenant(label) {
        const nonce = crypto.randomBytes(4).toString('hex');
        // Clerk development test identities: +clerk_test emails and 555-01xx numbers never send messages.
        const user = await clerkClient.users.createUser({
          emailAddress: [`finpath_smoke_${label.toLowerCase()}_${nonce}+clerk_test@example.com`],
          phoneNumber: [`+1201555${String(100 + ((phoneBase + label.charCodeAt(0)) % 100)).padStart(4, '0')}`],
          password: `FinPath!${crypto.randomBytes(18).toString('base64url')}#9`
        }).catch((error) => {
          throw new SmokeError(`Clerk createUser failed: ${error?.errors?.[0]?.code || error?.status || 'unknown'}`);
        });
        return { id: user.id, label, touchedApp: false };
      },
      deleteUser: (id) => clerkClient.users.deleteUser(id),
      async userExists(id) {
        try {
          await clerkClient.users.getUser(id);
          return true;
        } catch (error) {
          if (error?.status === 404) return false;
          throw error;
        }
      }
    },
    browser: {
      async signIn(tenant, baseUrl) {
        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        await context.route(new RegExp(`^https://${escaped}/v1/`), async (route) => {
          const url = new URL(route.request().url());
          url.searchParams.set('__clerk_testing_token', testingToken);
          await route.fulfill({ response: await route.fetch({ url: url.toString() }) });
        });
        const page = await context.newPage();
        await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
        await page.waitForFunction(() => Boolean(window.Clerk?.loaded), null, { timeout: 30000 });
        const ticket = await clerkClient.signInTokens.createSignInToken({ userId: tenant.id, expiresInSeconds: 300 });
        await page.evaluate(async (t) => {
          const res = await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket: t });
          if (res.status !== 'complete') throw new Error(`sign-in status ${res.status}`);
          await window.Clerk.setActive({ session: res.createdSessionId });
        }, ticket.token);
        await page.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session), null, { timeout: 30000 });
        tenant.page = page;
        tenant.api = (method, path, body) => {
          tenant.touchedApp = true;
          return page.evaluate(async ({ method, path, body }) => {
          const token = await window.Clerk.session.getToken();
          const res = await fetch(path, {
            method,
            headers: { authorization: `Bearer ${token}`, ...(body ? { 'content-type': 'application/json' } : {}) },
            body: body ? JSON.stringify(body) : undefined
          });
          let json = null;
          try { json = await res.json(); } catch {}
          return { status: res.status, body: json };
          }, { method, path, body });
        };
        tenant.snapshot = () => page.evaluate(WORKSPACE_SNAPSHOT_SCRIPT);
        tenant.deleteAppData = async () => (await tenant.api('DELETE', '/api/account-data', { confirmation: DELETE_CONFIRMATION })).status;
      },
      close: () => browser.close()
    }
  };
}

async function main() {
  let config;
  try {
    config = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    console.error('Usage: node scripts/hosted_smoke.mjs --sha <40-hex> --deployment-id <uuid> --url https://<id>.interactive-fire-calculator.pages.dev --db-id <preview-d1-uuid> --account-id <cf-account> --scenario <name> [--out <file>]');
    process.exit(2);
  }
  const scenarioPath = join(REPO_ROOT, 'scripts/smoke', `${config.scenario}.mjs`);
  if (!existsSync(scenarioPath)) {
    console.error(`Unknown scenario: ${config.scenario}`);
    process.exit(2);
  }
  let result;
  try {
    const tables = deriveUserScopedTables();
    const scenario = (await import(pathToFileURL(scenarioPath).href)).default;
    const adapters = await createLiveAdapters(config);
    result = await runSmoke({ config, adapters, scenario, tables, log: (m) => console.log(m) });
  } catch (error) {
    result = { status: 'FAIL', error: String(error?.message || error), stages: [], cleanup: [] };
  }
  const out = config.out || join(REPO_ROOT, 'docs/execution/evidence/smoke/raw', `${config.scenario}-${config.sha.slice(0, 7)}.json`);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify({ status: result.status, error: result.error, stages: result.stages?.map((s) => `${s.status} ${s.name}`), cleanup: result.cleanup?.map((c) => ({ tenant: c.tenant, ok: c.ok, errors: c.errors })), report: out }, null, 2));
  process.exit(result.status === 'PASS' ? 0 : 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
