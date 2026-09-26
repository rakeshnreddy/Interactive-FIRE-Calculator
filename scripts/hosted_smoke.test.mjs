import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import {
  EXPECTED_USER_TABLES, PRODUCTION_DB_ID, SmokeError, WORKSPACE_SNAPSHOT_SCRIPT,
  classifyWorkspace, cleanupTenant, deriveUserScopedTables, parseArgs, runSmoke, verifyPreflight, waitForWorkspace
} from './hosted_smoke.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SHA = 'a'.repeat(40);
const DEPLOYMENT = '11111111-2222-4333-8444-555555555555';
const DB = '0dbad68e-7493-452f-8504-98d4c61ee5da';
const ACCOUNT = 'b'.repeat(32);
const URL_OK = 'https://11111111.interactive-fire-calculator.pages.dev';
const ARGS = ['--sha', SHA, '--deployment-id', DEPLOYMENT, '--url', URL_OK, '--db-id', DB, '--account-id', ACCOUNT, '--scenario', 'fake'];

const deployment = (overrides = {}) => ({
  id: DEPLOYMENT, short_id: '11111111', project_name: 'interactive-fire-calculator', environment: 'preview',
  url: URL_OK, latest_stage: { status: 'success' }, deployment_trigger: { metadata: { commit_hash: SHA } },
  d1_databases: { DB: { id: DB } }, ...overrides
});

function fakeAdapters({ dep = deployment(), counts = () => 0, tombstone = 'x', deleteStatus = 200, deleteProviderError = null, stillExists = false } = {}) {
  const calls = { createTenant: 0, signIn: 0, deleteUser: [], closed: false };
  return {
    calls,
    cloudflare: { getDeployment: async () => (dep instanceof Error ? Promise.reject(dep) : dep) },
    d1: async (sql) => {
      if (sql.startsWith('SELECT 1')) return [{ ping: 1 }];
      if (sql.includes('FROM users')) return tombstone === null ? [] : [{ deleted_at: tombstone }];
      const table = sql.match(/FROM (\w+) WHERE user_id/)[1];
      return [{ cnt: counts(table) }];
    },
    clerk: {
      createTenant: async (label) => {
        calls.createTenant += 1;
        return { id: `user_${label}`, label, touchedApp: true, deleteAppData: async () => deleteStatus };
      },
      deleteUser: async (id) => {
        if (deleteProviderError) throw deleteProviderError;
        calls.deleteUser.push(id);
      },
      userExists: async () => stillExists
    },
    browser: { signIn: async () => { calls.signIn += 1; }, close: async () => { calls.closed = true; } }
  };
}

const passingScenario = {
  name: 'fake',
  requiredStages: ['observe'],
  run: async ({ stage }) => stage('observe', async () => 'seen')
};

const run = (adapters, scenario = passingScenario) => runSmoke({ config: parseArgs(ARGS), adapters, scenario, tables: EXPECTED_USER_TABLES });

test('inputs: every value is required and production DB is refused', () => {
  assert.doesNotThrow(() => parseArgs(ARGS));
  assert.throws(() => parseArgs([]), SmokeError);
  for (let i = 0; i < ARGS.length; i += 2) {
    const partial = [...ARGS.slice(0, i), ...ARGS.slice(i + 2)];
    assert.throws(() => parseArgs(partial), SmokeError, `missing ${ARGS[i]}`);
  }
  const prod = [...ARGS];
  prod[prod.indexOf('--db-id') + 1] = PRODUCTION_DB_ID;
  assert.throws(() => parseArgs(prod), /production/);
});

test('CLI without inputs exits nonzero and reports no PASS', () => {
  const res = spawnSync(process.execPath, [join(ROOT, 'scripts/hosted_smoke.mjs')], { encoding: 'utf8', env: { PATH: process.env.PATH } });
  assert.equal(res.status, 2);
  assert.doesNotMatch(res.stdout + res.stderr, /PASS/);
});

test('cleanup table contract is derived from migrations and fails on drift', () => {
  assert.deepEqual(deriveUserScopedTables(), [...EXPECTED_USER_TABLES].sort());
  assert.equal(EXPECTED_USER_TABLES.length, 15);
  const dir = mkdtempSync(join(tmpdir(), 'smoke-migrations-'));
  for (const f of readdirSync(join(ROOT, 'migrations'))) copyFileSync(join(ROOT, 'migrations', f), join(dir, f));
  writeFileSync(join(dir, '0099_new.sql'), 'CREATE TABLE new_user_things (\n  id TEXT PRIMARY KEY,\n  user_id TEXT NOT NULL\n);\n');
  assert.throws(() => deriveUserScopedTables(dir), /contract changed/);
});

test('preflight rejects every metadata mismatch', async () => {
  const config = parseArgs(ARGS);
  await assert.doesNotReject(verifyPreflight(config, { getDeployment: async () => deployment() }));
  const bad = {
    project: { project_name: 'other' },
    environment: { environment: 'production' },
    status: { latest_stage: { status: 'failure' } },
    sha: { deployment_trigger: { metadata: { commit_hash: 'c'.repeat(40) } } },
    deploymentId: { id: '99999999-2222-4333-8444-555555555555' },
    aliasHost: { url: 'https://codex-branch.interactive-fire-calculator.pages.dev' },
    db: { d1_databases: { DB: { id: '99999999-2222-4333-8444-555555555555' } } },
    productionDb: { d1_databases: { DB: { id: PRODUCTION_DB_ID } } },
    noBinding: { d1_databases: {} }
  };
  for (const [name, override] of Object.entries(bad)) {
    await assert.rejects(verifyPreflight(config, { getDeployment: async () => deployment(override) }), SmokeError, name);
  }
  await assert.rejects(verifyPreflight(config, { getDeployment: async () => { throw new Error('Cloudflare API 500'); } }), /500/);
});

test('preflight failure means no synthetic user and no PASS', async () => {
  for (const dep of [deployment({ environment: 'production' }), new Error('api down')]) {
    const adapters = fakeAdapters({ dep });
    const result = await run(adapters);
    assert.equal(result.status, 'FAIL');
    assert.equal(adapters.calls.createTenant, 0);
    assert.equal(result.cleanup.length, 0);
  }
});

test('workspace classification separates transient from terminal states', () => {
  const expected = { planId: 'p1', version: 2 };
  const ok = { clerkLoaded: true, signedIn: true, pathname: '/plans', planId: 'p1', version: '2', authGateVisible: false, controlledError: '', loading: false, reviewPanels: 1, overviewText: 'Version 2 loaded' };
  assert.equal(classifyWorkspace(ok, expected).state, 'ready');
  assert.equal(classifyWorkspace({ ...ok, clerkLoaded: false, signedIn: false, authGateVisible: true }, expected).state, 'waiting');
  assert.equal(classifyWorkspace({ ...ok, signedIn: false }, expected).state, 'failed');
  assert.equal(classifyWorkspace({ ...ok, authGateVisible: true }, expected).state, 'waiting');
  assert.equal(classifyWorkspace({ ...ok, planId: 'p2' }, expected).state, 'failed');
  assert.equal(classifyWorkspace({ ...ok, version: '1' }, expected).state, 'failed');
  assert.equal(classifyWorkspace({ ...ok, overviewText: '' }, expected).state, 'waiting');
  assert.equal(classifyWorkspace({ ...ok, overviewText: 'Version 1 loaded' }, expected).state, 'failed');
  assert.equal(classifyWorkspace({ ...ok, reviewPanels: 0 }, expected).state, 'waiting');
  assert.equal(classifyWorkspace({ ...ok, reviewPanels: 2 }, expected).state, 'failed');
  assert.equal(classifyWorkspace({ ...ok, controlledError: 'Plan not found' }, expected).state, 'failed');
});

test('waitForWorkspace tolerates transient Clerk loading and times out when never ready', async () => {
  const ready = { clerkLoaded: true, signedIn: true, pathname: '/plans', planId: 'p', version: '2', reviewPanels: 1, overviewText: 'Version 2 loaded' };
  const seq = [{ clerkLoaded: false }, { clerkLoaded: false }, { ...ready, reviewPanels: 0 }, ready];
  let clock = 0;
  const opts = { now: () => clock, sleep: async (ms) => { clock += ms; } };
  assert.equal((await waitForWorkspace(async () => seq.shift(), { planId: 'p', version: 2 }, opts)).state, 'ready');
  clock = 0;
  await assert.rejects(waitForWorkspace(async () => ({ clerkLoaded: false }), { planId: 'p', version: 2 }, { ...opts, timeoutMs: 1000 }), /within 1000ms: Clerk loading/);
});

test('happy path passes only with observed stages and verified cleanup', async () => {
  const adapters = fakeAdapters();
  const result = await run(adapters);
  assert.equal(result.status, 'PASS', JSON.stringify(result));
  assert.deepEqual(adapters.calls.deleteUser, ['user_A', 'user_B']);
  assert.ok(result.cleanup.every((c) => c.ok && Object.keys(c.tableCounts).length === 15));
  assert.equal(adapters.calls.closed, true);
});

test('scenario that skips a required stage or throws is FAIL, and cleanup still runs', async () => {
  const skipping = { name: 'skip', requiredStages: ['observe', 'never'], run: passingScenario.run };
  const throwing = { name: 'throw', requiredStages: ['observe'], run: async () => { throw new SmokeError('no Version 3'); } };
  for (const scenario of [skipping, throwing]) {
    const adapters = fakeAdapters();
    const result = await run(adapters, scenario);
    assert.equal(result.status, 'FAIL');
    assert.equal(result.cleanup.length, 2);
  }
});

test('cleanup fails closed on bad counts, failed deletion or provider errors', async () => {
  const cases = {
    nonzero: { counts: (t) => (t === 'plans' ? 1 : 0) },
    nonNumeric: { counts: (t) => (t === 'goals' ? '0' : 0) },
    missingCount: { counts: (t) => (t === 'audit_log' ? undefined : 0) },
    appDeleteFailed: { deleteStatus: 500 },
    tombstoneNotSet: { tombstone: '' },
    providerDeleteFailed: { deleteProviderError: Object.assign(new Error('clerk 500'), { status: 500 }) },
    providerStillThere: { stillExists: true }
  };
  for (const [name, opts] of Object.entries(cases)) {
    const adapters = fakeAdapters(opts);
    const result = await run(adapters);
    assert.equal(result.status, 'FAIL', name);
    if (!name.startsWith('provider')) assert.deepEqual(adapters.calls.deleteUser, [], `${name}: provider deletion must be withheld`);
  }
});

test('tenant that never touched the app can be cleaned without a tombstone', async () => {
  const report = await cleanupTenant({
    tenant: { id: 'u', label: 'A', touchedApp: false },
    tables: EXPECTED_USER_TABLES,
    d1: async (sql) => (sql.includes('FROM users') ? [] : [{ cnt: 0 }]),
    clerk: { deleteUser: async () => {}, userExists: async () => false }
  });
  assert.equal(report.ok, true);
  assert.equal(report.tombstone, 'never-created');
});

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
test('real Chrome: readiness waits through delayed Clerk and workspace hydration', { skip: !existsSync(CHROME) && 'Google Chrome not installed on this machine' }, async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  try {
    const page = await browser.newPage();
    await page.route('https://smoke.test/**', (route) => route.fulfill({
      contentType: 'text/html',
      body: `<!doctype html><body><div class="auth-gate">Sign in</div><script>
        setTimeout(() => { window.Clerk = { loaded: true, user: {}, session: {} }; document.querySelector('.auth-gate').remove();
          document.body.insertAdjacentHTML('beforeend', '<div class="planning-overview">Loading</div>'); }, 400);
        setTimeout(() => { document.querySelector('.planning-overview').textContent = 'Version 2 loaded';
          document.body.insertAdjacentHTML('beforeend', '<section class="planning-review-panel">Review</section>'); }, 900);
      </script></body>`
    }));
    await page.goto('https://smoke.test/plans?planId=p9&version=2');
    const snapshot = () => page.evaluate(WORKSPACE_SNAPSHOT_SCRIPT);
    assert.equal((await waitForWorkspace(snapshot, { planId: 'p9', version: 2 }, { timeoutMs: 5000, pollMs: 100 })).state, 'ready');
    await page.goto('https://smoke.test/plans?planId=p9&version=3');
    await assert.rejects(waitForWorkspace(snapshot, { planId: 'p9', version: 3 }, { timeoutMs: 5000, pollMs: 100 }), /different version/);
  } finally {
    await browser.close();
  }
});
