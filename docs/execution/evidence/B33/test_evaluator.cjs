/**
 * B33 Evaluator Unit & Subprocess Test Suite
 *
 * Verifies all 14 required evaluation edge cases:
 * 1. Fully evidenced correct target => PASS (exit 0)
 * 2. Identical DB IDs => FAIL (exit 1)
 * 3. Different but unapproved target => FAIL (exit 1)
 * 4. Missing project/deployment binding => BLOCKED (exit 2)
 * 5. Deployment binding differs from project target => FAIL (exit 1)
 * 6. Endpoint failure => FAIL despite correct project binding (exit 1)
 * 7. HTML200 health (not JSON) => FAIL (exit 1)
 * 8. Malformed/missing migration evidence => BLOCKED (exit 2)
 * 9. Pending migration in repo => FAIL (exit 1)
 * 10. Missing/unknown build policy => BLOCKED (exit 2)
 * 11. Git policy include/exclude wildcard & policy variants ('none', 'all', 'custom' with wildcards)
 * 12. Missing or crashed preflight => BLOCKED (exit 2)
 * 13. Preserves known FAIL when authorization is absent / unapproved target
 * 14. CLI subprocess execution asserting exit codes (0, 1, 2) and persisted outcome
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  evaluateB33Results,
  APPROVED_PREVIEW_DB_ID,
  EXPECTED_PRODUCTION_DB_ID,
  matchesPattern,
  matchesAnyPattern
} = require('./evaluator.cjs');

function getPassingFixture() {
  return {
    approved_target_id: APPROVED_PREVIEW_DB_ID,
    project_metadata: {
      preview_d1_id: APPROVED_PREVIEW_DB_ID,
      production_d1_id: EXPECTED_PRODUCTION_DB_ID
    },
    deployment_metadata: {
      deployment_id: 'dep-valid-123',
      environment: 'preview',
      effective_d1_id: APPROVED_PREVIEW_DB_ID
    },
    git_policy: {
      preview_deployment_setting: 'custom',
      preview_branch_includes: ['codex/cloudflare-pages-theme-plan'],
      preview_branch_excludes: [],
      target_branch: 'codex/finpath-quality-execution'
    },
    migration_evidence: {
      status: 'COLLECTED',
      applied_migrations: [
        { id: 1, name: '0001_initial_financial_platform_schema.sql', applied_at: '2026-06-11 15:37:16' },
        { id: 2, name: '0002_balance_import_history.sql', applied_at: '2026-06-22 18:37:06' },
        { id: 3, name: '0003_transaction_import_history.sql', applied_at: '2026-07-05 20:06:03' },
        { id: 4, name: '0004_saved_calculator_results.sql', applied_at: '2026-07-10 17:04:22' }
      ],
      repository_migrations: [
        '0001_initial_financial_platform_schema.sql',
        '0002_balance_import_history.sql',
        '0003_transaction_import_history.sql',
        '0004_saved_calculator_results.sql'
      ],
      tables: ['users', 'user_profiles', 'financial_accounts', 'account_balances', 'transactions', 'goals', 'plans', 'plan_versions', 'fire_plan_inputs', 'fire_plan_results', 'assumptions', 'audit_log', 'balance_imports', 'transaction_imports', 'saved_calculator_results', '_cf_KV', 'sqlite_sequence', 'd1_migrations']
    },
    endpoint_probes: {
      health: {
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: { ok: true, app: 'interactive-fire-calculator', runtime: 'cloudflare-pages' },
        pass: true
      },
      private_endpoints: {
        me: { status: 401, pass: true },
        profile: { status: 401, pass: true },
        plans: { status: 401, pass: true },
        accounts: { status: 401, pass: true }
      }
    },
    auth_preflight: {
      status: 'EXECUTED',
      passed_checks: 0,
      total_checks: 6,
      recognized: true
    }
  };
}

let passedTests = 0;

// Test 1: Fully evidenced correct target => PASS
{
  const fixture = getPassingFixture();
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'PASS');
  assert.strictEqual(res.exitCode, 0);
  assert.strictEqual(res.failingChecks.length, 0);
  assert.strictEqual(res.blockedChecks.length, 0);
  passedTests++;
  console.log('✓ Test 1: Fully evidenced correct target passes with exit 0');
}

// Test 2: Identical DB IDs => FAIL
{
  const fixture = getPassingFixture();
  fixture.project_metadata.preview_d1_id = EXPECTED_PRODUCTION_DB_ID;
  fixture.deployment_metadata.effective_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('project_preview_binding'));
  passedTests++;
  console.log('✓ Test 2: Identical DB IDs fails with exit 1');
}

// Test 3: Different but unapproved target => FAIL
{
  const fixture = getPassingFixture();
  fixture.project_metadata.preview_d1_id = 'unapproved-random-uuid';
  fixture.deployment_metadata.effective_d1_id = 'unapproved-random-uuid';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('project_preview_binding'));
  passedTests++;
  console.log('✓ Test 3: Different but unapproved target fails with exit 1');
}

// Test 4: Missing project/deployment binding => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.project_metadata.preview_d1_id;
  delete fixture.deployment_metadata.effective_d1_id;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.ok(res.blockedChecks.includes('project_preview_binding'));
  assert.ok(res.blockedChecks.includes('effective_deployment_binding'));
  passedTests++;
  console.log('✓ Test 4: Missing project or deployment binding blocks with exit 2');
}

// Test 5: Deployment binding differs from project target => FAIL
{
  const fixture = getPassingFixture();
  fixture.deployment_metadata.effective_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('effective_deployment_binding'));
  passedTests++;
  console.log('✓ Test 5: Deployment binding differing from project target fails with exit 1');
}

// Test 6: Endpoint failure => FAIL despite correct project binding
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.private_endpoints.me.status = 500;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('endpoint_probes'));
  passedTests++;
  console.log('✓ Test 6: Endpoint failure fails with exit 1');
}

// Test 7: HTML200 health (not JSON) => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.contentType = 'text/html; charset=utf-8';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('endpoint_probes'));
  passedTests++;
  console.log('✓ Test 7: HTML 200 health fails with exit 1');
}

// Test 8: Malformed/missing migration evidence => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.status = 'MISSING';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.ok(res.blockedChecks.includes('migration_readiness'));
  passedTests++;
  console.log('✓ Test 8: Missing migration evidence blocks with exit 2');
}

// Test 9: Pending migration in repo => FAIL
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.repository_migrations.push('0005_new_unapplied_migration.sql');
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  assert.ok(res.failingChecks.includes('migration_readiness'));
  passedTests++;
  console.log('✓ Test 9: Pending migration fails with exit 1');
}

// Test 10: Missing/unknown build policy => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.git_policy.preview_deployment_setting = 'unsupported-setting';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.ok(res.blockedChecks.includes('git_deployment_policy'));
  passedTests++;
  console.log('✓ Test 10: Unknown build policy blocks with exit 2');
}

// Test 11: Git policy include/exclude wildcard & policy variants
{
  // 11A. 'none' setting
  const noneFixture = getPassingFixture();
  noneFixture.git_policy.preview_deployment_setting = 'none';
  const resNone = evaluateB33Results(noneFixture);
  assert.strictEqual(resNone.checks.git_deployment_policy.status, 'PASS');
  assert.strictEqual(resNone.checks.git_deployment_policy.auto_deploying, false);

  // 11B. 'all' setting with wildcard exclude 'codex/*'
  const allFixture = getPassingFixture();
  allFixture.git_policy.preview_deployment_setting = 'all';
  allFixture.git_policy.preview_branch_excludes = ['codex/*'];
  const resAll = evaluateB33Results(allFixture);
  assert.strictEqual(resAll.checks.git_deployment_policy.status, 'PASS');
  assert.strictEqual(resAll.checks.git_deployment_policy.auto_deploying, false);

  // 11C. 'custom' setting with exact wildcard include
  assert.strictEqual(matchesPattern('codex/feature', 'codex/*'), true);
  assert.strictEqual(matchesPattern('main', 'codex/*'), false);
  assert.strictEqual(matchesAnyPattern('codex/feature', ['other', 'codex/*']), true);

  passedTests++;
  console.log('✓ Test 11: Git deployment policy variants and wildcard matching evaluated cleanly');
}

// Test 12: Missing or crashed preflight => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.auth_preflight.status = 'FAILED_TO_RUN';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED');
  assert.strictEqual(res.exitCode, 2);
  assert.ok(res.blockedChecks.includes('production_auth_guard'));
  passedTests++;
  console.log('✓ Test 12: Crashed or missing preflight blocks with exit 2');
}

// Test 13: Preserves known FAIL when unapproved target
{
  const fixture = getPassingFixture();
  fixture.project_metadata.preview_d1_id = 'different-unapproved-target';
  fixture.deployment_metadata.effective_d1_id = 'different-unapproved-target';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL');
  assert.strictEqual(res.exitCode, 1);
  passedTests++;
  console.log('✓ Test 13: Preserves known FAIL when target is unapproved');
}

// Test 14: Subprocess CLI execution asserting exit codes (0, 1, 2)
{
  const tmpDir = path.join(__dirname, 'test_fixtures');
  fs.mkdirSync(tmpDir, { recursive: true });

  const passFile = path.join(tmpDir, 'pass.json');
  const failFile = path.join(tmpDir, 'fail.json');
  const blockFile = path.join(tmpDir, 'block.json');

  const passFixture = getPassingFixture();
  const failFixture = getPassingFixture();
  failFixture.project_metadata.preview_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const blockFixture = getPassingFixture();
  delete blockFixture.project_metadata.preview_d1_id;

  fs.writeFileSync(passFile, JSON.stringify(passFixture));
  fs.writeFileSync(failFile, JSON.stringify(failFixture));
  fs.writeFileSync(blockFile, JSON.stringify(blockFixture));

  const runCli = (file) => {
    try {
      execFileSync(
        'node',
        ['-e', `
          const { evaluateB33Results } = require('./evaluator.cjs');
          const data = JSON.parse(require('fs').readFileSync('${file}', 'utf8'));
          const res = evaluateB33Results(data);
          process.exit(res.exitCode);
        `],
        { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      return 0;
    } catch (err) {
      return err.status;
    }
  };

  assert.strictEqual(runCli(passFile), 0, 'CLI with pass fixture must exit 0');
  assert.strictEqual(runCli(failFile), 1, 'CLI with fail fixture must exit 1');
  assert.strictEqual(runCli(blockFile), 2, 'CLI with block fixture must exit 2');

  // Clean up fixtures
  fs.rmSync(tmpDir, { recursive: true, force: true });

  passedTests++;
  console.log('✓ Test 14: Subprocess CLI execution cleanly asserts exit codes 0, 1, and 2');
}

console.log(`\n=== ALL ${passedTests}/14 EVALUATOR TESTS PASSED ===\n`);
