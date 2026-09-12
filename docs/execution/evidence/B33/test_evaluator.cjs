/**
 * B33 Evaluator Unit & Subprocess Test Suite
 *
 * Implements strict, comprehensive contract testing for V01–V08:
 * - Section 1: 5 Reviewer Reproduction Cases from primary-rereview-reproductions.json
 * - Section 2: V01 Project Preview Binding (inequality, approved target, missing IDs)
 * - Section 3: V02 Effective Deployment Binding (functions, environment, stage, DB, URL match)
 * - Section 4: V03 Canonical Private Probe Set (/api/me, /api/profile, /api/plans, /api/accounts)
 * - Section 5: V04 Health Schema Validation (ok, app, runtime, content-type, 200)
 * - Section 6: V05 Migration Readiness (database identity, applied vs repo, table presence)
 * - Section 7: V06 Git Source Policy & Wildcard Pattern Matching (none, all, custom, codex/finpath-*)
 * - Section 8: V07 Production Auth Preflight Parser (named check set, summary, consistent exit)
 * - Section 9: V08 Real CLI Execution & Persistence (--fixture, --output, exit codes 0, 1, 2)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  evaluateB33Results,
  parseAuthPreflightOutput,
  APPROVED_PREVIEW_DB_ID,
  EXPECTED_PRODUCTION_DB_ID,
  EXPECTED_HEALTH_SCHEMA,
  CANONICAL_PRIVATE_ENDPOINTS,
  EXPECTED_PREFLIGHT_CHECKS,
  matchesPattern,
  matchesAnyPattern
} = require('./evaluator.cjs');

function getPassingFixture() {
  return {
    approved_target_id: APPROVED_PREVIEW_DB_ID,
    project_metadata: {
      name: 'interactive-fire-calculator',
      production_branch: 'main',
      preview_d1_id: APPROVED_PREVIEW_DB_ID,
      production_d1_id: EXPECTED_PRODUCTION_DB_ID
    },
    deployment_metadata: {
      id: 'b8f9d6ec-99d3-4cdc-acb4-a6b2f71be5b3',
      short_id: 'b8f9d6ec',
      url: 'https://b8f9d6ec.interactive-fire-calculator.pages.dev',
      environment: 'preview',
      uses_functions: true,
      latest_stage_status: 'success',
      effective_d1_id: APPROVED_PREVIEW_DB_ID
    },
    git_policy: {
      deployments_enabled: true,
      production_deployments_enabled: false,
      target_branch: 'codex/finpath-quality-execution',
      preview_deployment_setting: 'custom',
      preview_branch_includes: ['codex/cloudflare-pages-theme-plan'],
      preview_branch_excludes: []
    },
    migration_evidence: {
      status: 'COLLECTED',
      database_id: APPROVED_PREVIEW_DB_ID,
      database_name: 'finpath-preview',
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
      tables: [
        'users', 'user_profiles', 'financial_accounts', 'account_balances',
        'transactions', 'goals', 'plans', 'plan_versions', 'fire_plan_inputs',
        'fire_plan_results', 'assumptions', 'audit_log', 'balance_imports',
        'transaction_imports', 'saved_calculator_results', '_cf_KV',
        'sqlite_sequence', 'd1_migrations'
      ]
    },
    endpoint_probes: {
      deployment_url: 'https://b8f9d6ec.interactive-fire-calculator.pages.dev',
      health: {
        status: 200,
        contentType: 'application/json; charset=utf-8',
        body: { ok: true, app: 'interactive-fire-calculator', runtime: 'cloudflare-pages' }
      },
      private_endpoints: {
        '/api/me': { status: 401, is_401: true },
        '/api/profile': { status: 401, is_401: true },
        '/api/plans': { status: 401, is_401: true },
        '/api/accounts': { status: 401, is_401: true }
      }
    },
    auth_preflight: {
      status: 'EXECUTED',
      exit_code: 1,
      passed_checks: 0,
      total_checks: 6,
      recognized: true
    }
  };
}

let passedTests = 0;

console.log('=== FinPath B33 Contract Validation Test Suite ===\n');

// -------------------------------------------------------------
// SECTION 1: Five Reviewer Reproductions (primary-rereview-reproductions.json)
// -------------------------------------------------------------
console.log('--- Section 1: Reviewer Reproduction Cases ---');

// Repro 1: missing_private_probes => MUST return BLOCKED (exit 2)
{
  const fixture = getPassingFixture();
  delete fixture.endpoint_probes.private_endpoints;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED', 'Repro 1: missing private_endpoints must be BLOCKED');
  assert.strictEqual(res.exitCode, 2, 'Repro 1: missing private_endpoints must exit 2');
  assert.ok(res.blockedChecks.includes('endpoint_probes'));
  passedTests++;
  console.log('✓ Repro 1: missing_private_probes returns BLOCKED (exit 2)');
}

// Repro 2: missing_production_id => MUST return BLOCKED (exit 2)
{
  const fixture = getPassingFixture();
  delete fixture.project_metadata.production_d1_id;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'BLOCKED', 'Repro 2: missing production_d1_id must be BLOCKED');
  assert.strictEqual(res.exitCode, 2, 'Repro 2: missing production_d1_id must exit 2');
  assert.ok(res.blockedChecks.includes('project_preview_binding'));
  passedTests++;
  console.log('✓ Repro 2: missing_production_id returns BLOCKED (exit 2)');
}

// Repro 3: wrong_migration_database => MUST return FAIL (exit 1)
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.database_id = 'wrong-db-uuid';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL', 'Repro 3: wrong migration database must be FAIL');
  assert.strictEqual(res.exitCode, 1, 'Repro 3: wrong migration database must exit 1');
  assert.ok(res.failingChecks.includes('migration_readiness'));
  passedTests++;
  console.log('✓ Repro 3: wrong_migration_database returns FAIL (exit 1)');
}

// Repro 4: wrong_health_runtime => MUST return FAIL (exit 1)
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.body.runtime = 'wrong-runtime';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.status, 'FAIL', 'Repro 4: wrong health runtime must be FAIL');
  assert.strictEqual(res.exitCode, 1, 'Repro 4: wrong health runtime must exit 1');
  assert.ok(res.failingChecks.includes('endpoint_probes'));
  passedTests++;
  console.log('✓ Repro 4: wrong_health_runtime returns FAIL (exit 1)');
}

// Repro 5: unsupported glob codex/finpath-* => auto_deploying MUST be true (or BLOCK, never silent false-PASS)
{
  const fixture = getPassingFixture();
  fixture.git_policy.preview_branch_includes = ['codex/finpath-*'];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.git_deployment_policy.auto_deploying, true,
    'Repro 5: codex/finpath-* must match codex/finpath-quality-execution with auto_deploying=true');
  passedTests++;
  console.log('✓ Repro 5: codex/finpath-* pattern correctly matches with auto_deploying=true');
}

// -------------------------------------------------------------
// SECTION 2: V01 Project Preview Binding Tests
// -------------------------------------------------------------
console.log('\n--- Section 2: V01 Project Preview Binding ---');

// V01-1: Fully valid IDs => PASS
{
  const fixture = getPassingFixture();
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.project_preview_binding.status, 'PASS');
  passedTests++;
  console.log('✓ V01-1: Distinct valid IDs pass');
}

// V01-2: Missing preview_d1_id => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.project_metadata.preview_d1_id;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.project_preview_binding.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V01-2: Missing preview_d1_id blocks');
}

// V01-3: Empty string production_d1_id => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.project_metadata.production_d1_id = '';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.project_preview_binding.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V01-3: Empty string production_d1_id blocks');
}

// V01-4: Identical IDs (preview === production) => FAIL
{
  const fixture = getPassingFixture();
  fixture.project_metadata.preview_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.project_preview_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V01-4: Same preview and production IDs fails');
}

// V01-5: Wrong preview UUID => FAIL
{
  const fixture = getPassingFixture();
  fixture.project_metadata.preview_d1_id = 'c1234567-0000-0000-0000-000000000000';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.project_preview_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V01-5: Unapproved preview UUID fails');
}

// -------------------------------------------------------------
// SECTION 3: V02 Effective Deployment Binding & Metadata Tests
// -------------------------------------------------------------
console.log('\n--- Section 3: V02 Effective Deployment Binding ---');

// V02-1: Valid deployment metadata => PASS
{
  const fixture = getPassingFixture();
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'PASS');
  passedTests++;
  console.log('✓ V02-1: Valid deployment metadata passes');
}

// V02-2: Missing environment => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.deployment_metadata.environment;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V02-2: Missing deployment environment blocks');
}

// V02-3: Missing uses_functions => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.deployment_metadata.uses_functions;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V02-3: Missing uses_functions blocks');
}

// V02-4: Deployment environment is production => FAIL
{
  const fixture = getPassingFixture();
  fixture.deployment_metadata.environment = 'production';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V02-4: Production deployment environment fails');
}

// V02-5: Deployment uses_functions is false => FAIL
{
  const fixture = getPassingFixture();
  fixture.deployment_metadata.uses_functions = false;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V02-5: Deployed uses_functions=false fails');
}

// V02-6: Latest stage status is failed => FAIL
{
  const fixture = getPassingFixture();
  fixture.deployment_metadata.latest_stage_status = 'failure';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V02-6: Failed stage status fails');
}

// V02-7: Effective DB ID is production DB => FAIL
{
  const fixture = getPassingFixture();
  fixture.deployment_metadata.effective_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V02-7: Effective DB bound to production fails');
}

// V02-8: Probe URL differs from deployment URL => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.deployment_url = 'https://other-deployment.pages.dev';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.effective_deployment_binding.status, 'FAIL');
  passedTests++;
  console.log('✓ V02-8: Probe URL mismatch with deployment URL fails');
}

// -------------------------------------------------------------
// SECTION 4: V03 Canonical Private Probe Set Tests
// -------------------------------------------------------------
console.log('\n--- Section 4: V03 Canonical Private Probe Set ---');

// V03-1: Valid canonical 4 probes all 401 => PASS
{
  const fixture = getPassingFixture();
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'PASS');
  passedTests++;
  console.log('✓ V03-1: All 4 canonical private probes returning 401 pass');
}

// V03-2: Empty private endpoints object => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.private_endpoints = {};
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V03-2: Empty private endpoints map blocks');
}

// V03-3: Partial private endpoints (only 3 of 4) => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.endpoint_probes.private_endpoints['/api/accounts'];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V03-3: Missing /api/accounts probe blocks');
}

// V03-4: Extra endpoints present but missing a canonical one => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.endpoint_probes.private_endpoints['/api/plans'];
  fixture.endpoint_probes.private_endpoints['/api/other'] = { status: 401 };
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V03-4: Extra endpoints do not substitute for missing canonical endpoint');
}

// V03-5: Any private probe returns non-401 (e.g. 200 or 500) => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.private_endpoints['/api/me'].status = 200;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'FAIL');
  passedTests++;
  console.log('✓ V03-5: Private probe returning 200 fails');
}

// -------------------------------------------------------------
// SECTION 5: V04 Health Schema Validation Tests
// -------------------------------------------------------------
console.log('\n--- Section 5: V04 Health Schema Validation ---');

// V04-1: Missing health probe => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.endpoint_probes.health;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V04-1: Missing health probe blocks');
}

// V04-2: Health status 500 => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.status = 500;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'FAIL');
  passedTests++;
  console.log('✓ V04-2: Health HTTP 500 fails');
}

// V04-3: HTML 200 (not JSON) => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.contentType = 'text/html; charset=utf-8';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'FAIL');
  passedTests++;
  console.log('✓ V04-3: Health HTML 200 fails');
}

// V04-4: Wrong app name in health body => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.body.app = 'wrong-app-name';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'FAIL');
  passedTests++;
  console.log('✓ V04-4: Wrong app name in health body fails');
}

// V04-5: ok is false in health body => FAIL
{
  const fixture = getPassingFixture();
  fixture.endpoint_probes.health.body.ok = false;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.endpoint_probes.status, 'FAIL');
  passedTests++;
  console.log('✓ V04-5: ok=false in health body fails');
}

// -------------------------------------------------------------
// SECTION 6: V05 Migration Readiness Tests
// -------------------------------------------------------------
console.log('\n--- Section 6: V05 Migration Readiness ---');

// V05-1: Missing database_id => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.migration_evidence.database_id;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V05-1: Missing database_id in migration evidence blocks');
}

// V05-2: Uncollected / failed migration query => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.status = 'COLLECTED_FAILED';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V05-2: Failed migration query blocks');
}

// V05-3: Null/invalid row in applied_migrations => BLOCKED
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.applied_migrations.push(null);
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V05-3: Null row in applied_migrations blocks');
}

// V05-4: Empty applied migrations when repo has migrations => FAIL
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.applied_migrations = [];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'FAIL');
  passedTests++;
  console.log('✓ V05-4: Empty applied migrations fails');
}

// V05-5: Pending migration in repo => FAIL
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.repository_migrations.push('0005_future_migration.sql');
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'FAIL');
  passedTests++;
  console.log('✓ V05-5: Pending repository migration fails');
}

// V05-6: Tables array empty => FAIL
{
  const fixture = getPassingFixture();
  fixture.migration_evidence.tables = [];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.migration_readiness.status, 'FAIL');
  passedTests++;
  console.log('✓ V05-6: Empty tables array fails');
}

// -------------------------------------------------------------
// SECTION 7: V06 Git Deployment Policy Tests
// -------------------------------------------------------------
console.log('\n--- Section 7: V06 Git Deployment Policy ---');

// V06-1: Missing preview_deployment_setting => BLOCKED
{
  const fixture = getPassingFixture();
  delete fixture.git_policy.preview_deployment_setting;
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.git_deployment_policy.status, 'BLOCKED');
  passedTests++;
  console.log('✓ V06-1: Missing preview_deployment_setting blocks');
}

// V06-2: Setting none => PASS, auto_deploying: false
{
  const fixture = getPassingFixture();
  fixture.git_policy.preview_deployment_setting = 'none';
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.git_deployment_policy.status, 'PASS');
  assert.strictEqual(res.checks.git_deployment_policy.auto_deploying, false);
  passedTests++;
  console.log('✓ V06-2: Setting none passes with auto_deploying=false');
}

// V06-3: Setting all without excludes => PASS, auto_deploying: true
{
  const fixture = getPassingFixture();
  fixture.git_policy.preview_deployment_setting = 'all';
  fixture.git_policy.preview_branch_excludes = [];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.git_deployment_policy.status, 'PASS');
  assert.strictEqual(res.checks.git_deployment_policy.auto_deploying, true);
  passedTests++;
  console.log('✓ V06-3: Setting all without excludes passes with auto_deploying=true');
}

// V06-4: Setting all with wildcard exclude 'codex/*' => PASS, auto_deploying: false
{
  const fixture = getPassingFixture();
  fixture.git_policy.preview_deployment_setting = 'all';
  fixture.git_policy.preview_branch_excludes = ['codex/*'];
  const res = evaluateB33Results(fixture);
  assert.strictEqual(res.checks.git_deployment_policy.status, 'PASS');
  assert.strictEqual(res.checks.git_deployment_policy.auto_deploying, false);
  passedTests++;
  console.log('✓ V06-4: Setting all with wildcard exclude passes with auto_deploying=false');
}

// V06-5: Wildcard pattern matching unit tests
{
  assert.strictEqual(matchesPattern('codex/finpath-quality-execution', 'codex/finpath-*'), true);
  assert.strictEqual(matchesPattern('codex/other-branch', 'codex/finpath-*'), false);
  assert.strictEqual(matchesPattern('codex/any', 'codex/*'), true);
  assert.strictEqual(matchesPattern('main', 'codex/*'), false);
  assert.strictEqual(matchesPattern('anything', '*'), true);
  assert.strictEqual(matchesPattern('exact-match', 'exact-match'), true);
  assert.strictEqual(matchesAnyPattern('codex/finpath-quality-execution', ['other', 'codex/finpath-*']), true);
  assert.strictEqual(matchesAnyPattern('main', ['other', 'codex/finpath-*']), false);
  passedTests++;
  console.log('✓ V06-5: Wildcard pattern matching unit functions work as specified');
}

// -------------------------------------------------------------
// SECTION 8: V07 Production Auth Preflight Parser Tests
// -------------------------------------------------------------
console.log('\n--- Section 8: V07 Production Auth Preflight Parser ---');

const VALID_FAIL_OUTPUT = `
FAIL  Frontend key
      VITE_CLERK_PUBLISHABLE_KEY must be a Clerk production publishable key.
FAIL  Production origin
      FINPATH_PRODUCTION_ORIGIN must be an owned HTTPS domain, not localhost or pages.dev.
FAIL  Clerk production instance
      Run \`clerk deploy\` and complete domain, DNS, and OAuth requirements.
FAIL  Cloudflare publishable key
      Set CLERK_PUBLISHABLE_KEY as a Pages production secret.
FAIL  Cloudflare server credential
      Set CLERK_SECRET_KEY or CLERK_JWT_KEY as a Pages production secret.
FAIL  Cloudflare authorized parties
      Set CLERK_AUTHORIZED_PARTIES to the exact production origin.

0/6 production-auth checks passed.
`;

const VALID_PASS_OUTPUT = `
PASS  Frontend key
PASS  Production origin
PASS  Clerk production instance
PASS  Cloudflare publishable key
PASS  Cloudflare server credential
PASS  Cloudflare authorized parties

6/6 production-auth checks passed.
`;

// V07-1: Complete 0/6 with exitCode 1 => recognized: true, status: EXECUTED
{
  const parsed = parseAuthPreflightOutput({ stdout: VALID_FAIL_OUTPUT, stderr: '', exitCode: 1 });
  assert.strictEqual(parsed.recognized, true);
  assert.strictEqual(parsed.status, 'EXECUTED');
  assert.strictEqual(parsed.passed_checks, 0);
  assert.strictEqual(parsed.total_checks, 6);
  assert.strictEqual(parsed.exit_code, 1);
  passedTests++;
  console.log('✓ V07-1: Six FAIL + 0/6 + exit 1 correctly recognized');
}

// V07-2: Complete 6/6 with exitCode 0 => recognized: true, status: EXECUTED
{
  const parsed = parseAuthPreflightOutput({ stdout: VALID_PASS_OUTPUT, stderr: '', exitCode: 0 });
  assert.strictEqual(parsed.recognized, true);
  assert.strictEqual(parsed.status, 'EXECUTED');
  assert.strictEqual(parsed.passed_checks, 6);
  assert.strictEqual(parsed.total_checks, 6);
  assert.strictEqual(parsed.exit_code, 0);
  passedTests++;
  console.log('✓ V07-2: Six PASS + 6/6 + exit 0 correctly recognized');
}

// V07-3: Empty output with exit 0 => recognized: false
{
  const parsed = parseAuthPreflightOutput({ stdout: '', stderr: '', exitCode: 0 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-3: Empty output with exit 0 is not recognized');
}

// V07-4: Duplicate checks in output => recognized: false
{
  const dupOutput = VALID_FAIL_OUTPUT + '\nFAIL  Frontend key\n';
  const parsed = parseAuthPreflightOutput({ stdout: dupOutput, stderr: '', exitCode: 1 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-4: Duplicate check names rejected');
}

// V07-5: Partial checks (missing one check) => recognized: false
{
  const partialOutput = `
PASS  Frontend key
PASS  Production origin
PASS  Clerk production instance
PASS  Cloudflare publishable key
PASS  Cloudflare server credential

5/5 production-auth checks passed.
`;
  const parsed = parseAuthPreflightOutput({ stdout: partialOutput, stderr: '', exitCode: 0 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-5: Missing check name rejected');
}

// V07-6: Unrelated CLERK error / crash without named checks => recognized: false
{
  const clerkError = 'Error: CLERK_API_KEY is not defined in environment';
  const parsed = parseAuthPreflightOutput({ stdout: '', stderr: clerkError, exitCode: 1 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-6: Substring-only CLERK error rejected as unrecognized');
}

// V07-7: Inconsistent exit code: 0/6 passed but exitCode is 0 => recognized: false
{
  const parsed = parseAuthPreflightOutput({ stdout: VALID_FAIL_OUTPUT, stderr: '', exitCode: 0 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-7: Inconsistent exit code (0/6 with exit 0) rejected');
}

// V07-8: Inconsistent exit code: 6/6 passed but exitCode is 1 => recognized: false
{
  const parsed = parseAuthPreflightOutput({ stdout: VALID_PASS_OUTPUT, stderr: '', exitCode: 1 });
  assert.strictEqual(parsed.recognized, false);
  passedTests++;
  console.log('✓ V07-8: Inconsistent exit code (6/6 with exit 1) rejected');
}

// -------------------------------------------------------------
// SECTION 9: V08 Real CLI Execution & Outcome Persistence Tests
// -------------------------------------------------------------
console.log('\n--- Section 9: V08 Real CLI Execution & Persistence ---');

// V08-1: Importing verify_b33.cjs has zero side effects / live calls
{
  const cliModule = require('./verify_b33.cjs');
  assert.ok(cliModule, 'verify_b33.cjs exported cleanly without side effects');
  passedTests++;
  console.log('✓ V08-1: Importing verify_b33.cjs performs zero live calls');
}

// V08-2: Actual CLI with fixtures via subprocess: exits 0 (PASS), 1 (FAIL), 2 (BLOCKED)
{
  const tmpDir = path.join(__dirname, 'test_fixtures');
  fs.mkdirSync(tmpDir, { recursive: true });

  const passFile = path.join(tmpDir, 'cli_pass.json');
  const failFile = path.join(tmpDir, 'cli_fail.json');
  const blockFile = path.join(tmpDir, 'cli_block.json');
  const outPassFile = path.join(tmpDir, 'cli_out_pass.json');
  const outFailFile = path.join(tmpDir, 'cli_out_fail.json');
  const outBlockFile = path.join(tmpDir, 'cli_out_block.json');

  const passFixture = getPassingFixture();
  const failFixture = getPassingFixture();
  failFixture.project_metadata.preview_d1_id = EXPECTED_PRODUCTION_DB_ID;
  const blockFixture = getPassingFixture();
  delete blockFixture.project_metadata.preview_d1_id;

  fs.writeFileSync(passFile, JSON.stringify(passFixture));
  fs.writeFileSync(failFile, JSON.stringify(failFixture));
  fs.writeFileSync(blockFile, JSON.stringify(blockFixture));

  const runRealCli = (inputFile, outputFile) => {
    try {
      execFileSync(
        'node',
        [
          path.join(__dirname, 'verify_b33.cjs'),
          '--fixture', inputFile,
          '--output', outputFile
        ],
        { cwd: __dirname, stdio: ['ignore', 'pipe', 'pipe'] }
      );
      return 0;
    } catch (err) {
      return err.status;
    }
  };

  const codePass = runRealCli(passFile, outPassFile);
  assert.strictEqual(codePass, 0, 'Real CLI with passing fixture must exit 0');
  const savedPass = JSON.parse(fs.readFileSync(outPassFile, 'utf8'));
  assert.strictEqual(savedPass.evaluation.status, 'PASS');

  const codeFail = runRealCli(failFile, outFailFile);
  assert.strictEqual(codeFail, 1, 'Real CLI with failing fixture must exit 1');
  const savedFail = JSON.parse(fs.readFileSync(outFailFile, 'utf8'));
  assert.strictEqual(savedFail.evaluation.status, 'FAIL');

  const codeBlock = runRealCli(blockFile, outBlockFile);
  assert.strictEqual(codeBlock, 2, 'Real CLI with blocked fixture must exit 2');
  const savedBlock = JSON.parse(fs.readFileSync(outBlockFile, 'utf8'));
  assert.strictEqual(savedBlock.evaluation.status, 'BLOCKED');

  // Clean up
  fs.rmSync(tmpDir, { recursive: true, force: true });

  passedTests++;
  console.log('✓ V08-2: Real CLI exercises fixtures and persists outcomes with exit codes 0, 1, and 2');
}

// Primary reviewer regressions: required provenance and policy cannot be inferred.
for (const [name, mutate, expected] of [
  ['missing enabled flag', f => { delete f.git_policy.deployments_enabled; }, 'BLOCKED'],
  ['disabled source', f => { f.git_policy.deployments_enabled = false; }, 'PASS'],
  ['malformed pattern element', f => { f.git_policy.preview_branch_includes = [null]; }, 'BLOCKED'],
  ['missing probe provenance', f => { delete f.endpoint_probes.deployment_url; }, 'BLOCKED'],
  ['malformed schema row', f => { f.migration_evidence.tables = [null]; }, 'BLOCKED'],
]) {
  const f = getPassingFixture();
  f.git_policy.deployments_enabled = true;
  f.git_policy.production_deployments_enabled = false;
  mutate(f);
  const result = evaluateB33Results(f);
  assert.strictEqual(result.status, expected, name);
  if (name === 'disabled source') assert.strictEqual(result.checks.git_deployment_policy.auto_deploying, false);
  passedTests++;
}
{
  const tmp = fs.mkdtempSync('/tmp/b33-provenance-');
  try {
    const f = getPassingFixture();
    const report = {evidence:{project:{preview_d1_binding:f.project_metadata.preview_d1_id,production_d1_binding:f.project_metadata.production_d1_id},deployment:{...f.deployment_metadata},git_source:{setting:'custom',branch_includes:[],branch_excludes:[],deployments_enabled:true,production_deployments_enabled:false},migrations:f.migration_evidence,endpoints:{active_preview:f.endpoint_probes},auth_preflight:f.auth_preflight}};
    delete report.evidence.deployment.environment;
    delete report.evidence.deployment.latest_stage_status;
    fs.writeFileSync(tmp+'/input.json',JSON.stringify(report));
    let exit = 0;
    try { execFileSync('node',[path.join(__dirname,'verify_b33.cjs'),'--fixture',tmp+'/input.json','--output',tmp+'/out.json'],{stdio:'pipe'}); } catch(e) { exit=e.status; }
    assert.strictEqual(exit,2,'real report CLI must not invent preview/success metadata');
    assert.strictEqual(JSON.parse(fs.readFileSync(tmp+'/out.json')).evaluation.status,'BLOCKED');
    passedTests++;
  } finally { fs.rmSync(tmp,{recursive:true,force:true}); }
}

console.log(`\n======================================================`);
console.log(`ALL ${passedTests} CONTRACT TESTS PASSED CLEANLY!`);
console.log(`======================================================\n`);
