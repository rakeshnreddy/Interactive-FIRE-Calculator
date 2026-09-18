/**
 * FinPath B33 Pure Outcome Evaluator
 *
 * Implements strict, deterministic evaluation of B33 preview infrastructure and isolation.
 * Pure logic: no network calls, no subprocess calls, no side effects on import.
 *
 * Exit contract:
 *   PASS    => Exit 0 (all required checks present and passed)
 *   FAIL    => Exit 1 (any check failed, mismatch, pending migration, invalid endpoint)
 *   BLOCKED => Exit 2 (missing required check, unperformed test, or unknown policy)
 *
 * Note: FAIL takes precedence if other checks are blocked.
 */

const APPROVED_PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
const EXPECTED_PRODUCTION_DB_ID = 'a5860350-0a50-4ebe-9f5f-1d9916a908e6';
const EXPECTED_HEALTH_SCHEMA = {
  ok: true,
  app: 'interactive-fire-calculator',
  runtime: 'cloudflare-pages'
};

const CANONICAL_PRIVATE_ENDPOINTS = [
  '/api/me',
  '/api/profile',
  '/api/plans',
  '/api/accounts'
];

const EXPECTED_PREFLIGHT_CHECKS = [
  'Frontend key',
  'Production origin',
  'Clerk production instance',
  'Cloudflare publishable key',
  'Cloudflare server credential',
  'Cloudflare authorized parties'
];

const REQUIRED_CHECKS = [
  'project_preview_binding',
  'effective_deployment_binding',
  'git_deployment_policy',
  'migration_readiness',
  'endpoint_probes',
  'production_auth_guard'
];

/**
 * Wildcard glob pattern matcher for branch names
 */
function matchesPattern(branch, pattern) {
  if (typeof branch !== 'string' || typeof pattern !== 'string') {
    return false;
  }
  if (pattern === branch) return true;
  if (pattern === '*') return true;
  if (pattern.includes('*')) {
    const regexPattern = '^' + pattern
      .split('*')
      .map(segment => segment.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*') + '$';
    return new RegExp(regexPattern).test(branch);
  }
  return false;
}

function matchesAnyPattern(branch, patterns) {
  if (!Array.isArray(patterns) || typeof branch !== 'string') return false;
  return patterns.some(p => matchesPattern(branch, p));
}

/**
 * Pure Preflight Output Parser
 *
 * Validates the exact 6 named checks, summary totals, and consistent exit status.
 * Rejects empty output, duplicate checks, missing checks, substring-only CLERK errors,
 * crashed processes, and inconsistent exit codes.
 */
function parseAuthPreflightOutput({ stdout, stderr, exitCode }) {
  if (!stdout || typeof stdout !== 'string' || typeof exitCode !== 'number') {
    return {
      status: 'FAILED_TO_RUN',
      recognized: false,
      exit_code: exitCode ?? 1,
      passed_checks: 0,
      total_checks: 0,
      checks: [],
      error: 'Auth preflight process produced no stdout or crashed'
    };
  }

  const lines = stdout.split(/\r?\n/);
  const parsedChecks = [];
  const seenNames = new Set();
  let duplicateFound = false;

  for (const line of lines) {
    const match = line.match(/^(PASS|FAIL)\s{2}(.+)$/);
    if (match) {
      const status = match[1];
      const name = match[2].trim();
      if (seenNames.has(name)) {
        duplicateFound = true;
      }
      seenNames.add(name);
      parsedChecks.push({ name, passed: status === 'PASS' });
    }
  }

  const summaryMatch = stdout.match(/^(\d+)\/(\d+)\s+production-auth checks passed\./m);
  if (!summaryMatch || duplicateFound) {
    return {
      status: 'EXECUTED',
      recognized: false,
      exit_code: exitCode,
      passed_checks: parsedChecks.filter(c => c.passed).length,
      total_checks: parsedChecks.length,
      checks: parsedChecks,
      error: duplicateFound ? 'Duplicate checks found in preflight output' : 'Missing summary line'
    };
  }

  const passedFromSummary = parseInt(summaryMatch[1], 10);
  const totalFromSummary = parseInt(summaryMatch[2], 10);

  const missingExpected = EXPECTED_PREFLIGHT_CHECKS.filter(name => !seenNames.has(name));
  const hasUnexpected = parsedChecks.some(c => !EXPECTED_PREFLIGHT_CHECKS.includes(c.name));

  if (
    missingExpected.length > 0 ||
    hasUnexpected ||
    parsedChecks.length !== EXPECTED_PREFLIGHT_CHECKS.length ||
    totalFromSummary !== EXPECTED_PREFLIGHT_CHECKS.length
  ) {
    return {
      status: 'EXECUTED',
      recognized: false,
      exit_code: exitCode,
      passed_checks: passedFromSummary,
      total_checks: totalFromSummary,
      checks: parsedChecks,
      error: 'Preflight checks did not match exact expected 6 checks'
    };
  }

  const actualPassed = parsedChecks.filter(c => c.passed).length;
  if (actualPassed !== passedFromSummary) {
    return {
      status: 'EXECUTED',
      recognized: false,
      exit_code: exitCode,
      passed_checks: passedFromSummary,
      total_checks: totalFromSummary,
      checks: parsedChecks,
      error: 'Summary count does not match parsed PASS checks'
    };
  }

  // Consistent exit code: 6 passed => 0, <6 passed => 1
  const expectedExit = (actualPassed === EXPECTED_PREFLIGHT_CHECKS.length) ? 0 : 1;
  if (exitCode !== expectedExit) {
    return {
      status: 'EXECUTED',
      recognized: false,
      exit_code: exitCode,
      passed_checks: passedFromSummary,
      total_checks: totalFromSummary,
      checks: parsedChecks,
      error: `Inconsistent exit code: expected ${expectedExit} for ${actualPassed}/${EXPECTED_PREFLIGHT_CHECKS.length} checks, got ${exitCode}`
    };
  }

  return {
    status: 'EXECUTED',
    recognized: true,
    exit_code: exitCode,
    passed_checks: passedFromSummary,
    total_checks: totalFromSummary,
    checks: parsedChecks,
    raw_summary: parsedChecks.map(c => `${c.passed ? 'PASS' : 'FAIL'}  ${c.name}`).join('; ')
  };
}

/**
 * Pure evaluation function
 * @param {Object} input
 * @returns {Object} { status: 'PASS'|'FAIL'|'BLOCKED', exitCode: 0|1|2, summary: string, checks: Object }
 */
function evaluateB33Results(input) {
  if (!input || typeof input !== 'object') {
    return {
      status: 'BLOCKED',
      exitCode: 2,
      summary: 'Evaluation blocked: missing or invalid input payload',
      checks: {}
    };
  }

  const checks = {};
  const approvedTargetId = input.approved_target_id || APPROVED_PREVIEW_DB_ID;

  // 1. Project Preview Binding (V01)
  const projMeta = input.project_metadata;
  if (
    !projMeta ||
    !projMeta.preview_d1_id ||
    !projMeta.production_d1_id ||
    typeof projMeta.preview_d1_id !== 'string' ||
    typeof projMeta.production_d1_id !== 'string' ||
    projMeta.preview_d1_id.trim() === '' ||
    projMeta.production_d1_id.trim() === ''
  ) {
    checks.project_preview_binding = {
      status: 'BLOCKED',
      details: 'Missing or empty Cloudflare Pages project preview or production D1 binding metadata'
    };
  } else if (projMeta.preview_d1_id === projMeta.production_d1_id) {
    checks.project_preview_binding = {
      status: 'FAIL',
      details: `Project preview D1 binding (${projMeta.preview_d1_id}) matches production D1 database ID`
    };
  } else if (projMeta.preview_d1_id !== approvedTargetId) {
    checks.project_preview_binding = {
      status: 'FAIL',
      details: `Project preview D1 binding (${projMeta.preview_d1_id}) differs from approved target (${approvedTargetId})`
    };
  } else {
    checks.project_preview_binding = {
      status: 'PASS',
      details: `Project preview D1 binding matches approved target (${approvedTargetId}) and differs from production`
    };
  }

  // 2. Effective Deployment Binding (V02)
  const depMeta = input.deployment_metadata;
  const stageStatus = depMeta?.latest_stage_status || depMeta?.stage_status || depMeta?.latest_stage?.status || depMeta?.stage?.status;
  if (
    !depMeta ||
    !depMeta.effective_d1_id ||
    !depMeta.environment ||
    depMeta.uses_functions === undefined ||
    depMeta.uses_functions === null ||
    !depMeta.url ||
    (!depMeta.id && !depMeta.short_id && !depMeta.deployment_id) ||
    !stageStatus
  ) {
    checks.effective_deployment_binding = {
      status: 'BLOCKED',
      details: 'Missing required deployment metadata (effective_d1_id, environment, uses_functions, url, id, or stage status)'
    };
  } else if (depMeta.environment !== 'preview') {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Deployment environment is '${depMeta.environment}', expected 'preview'`
    };
  } else if (depMeta.uses_functions !== true) {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: 'Deployment uses_functions is false; Functions runtime not active'
    };
  } else if (stageStatus !== 'success') {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Deployment latest stage status is '${stageStatus}', expected 'success'`
    };
  } else if (depMeta.effective_d1_id === projMeta?.production_d1_id) {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Effective deployment D1 binding (${depMeta.effective_d1_id}) matches production D1 database ID`
    };
  } else if (depMeta.effective_d1_id !== approvedTargetId) {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Effective deployment D1 binding (${depMeta.effective_d1_id}) differs from approved target (${approvedTargetId})`
    };
  } else if (projMeta && projMeta.preview_d1_id && depMeta.effective_d1_id !== projMeta.preview_d1_id) {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Effective deployment D1 binding (${depMeta.effective_d1_id}) differs from project preview target (${projMeta.preview_d1_id})`
    };
  } else if (input.endpoint_probes?.deployment_url && input.endpoint_probes.deployment_url !== depMeta.url) {
    checks.effective_deployment_binding = {
      status: 'FAIL',
      details: `Endpoint probe URL (${input.endpoint_probes.deployment_url}) differs from deployment URL (${depMeta.url})`
    };
  } else {
    checks.effective_deployment_binding = {
      status: 'PASS',
      details: `Effective deployment D1 binding matches approved target (${approvedTargetId})`
    };
  }

  // 3. Git Deployment Policy (V06)
  const gitPolicy = input.git_policy;
  if (!gitPolicy || !gitPolicy.preview_deployment_setting ||
      typeof gitPolicy.deployments_enabled !== 'boolean' ||
      typeof gitPolicy.production_deployments_enabled !== 'boolean' ||
      !Array.isArray(gitPolicy.preview_branch_includes) ||
      !Array.isArray(gitPolicy.preview_branch_excludes) ||
      [...gitPolicy.preview_branch_includes, ...gitPolicy.preview_branch_excludes].some(p => typeof p !== 'string' || !p.trim())) {
    checks.git_deployment_policy = {
      status: 'BLOCKED',
      details: 'Missing Cloudflare Pages Git preview deployment policy'
    };
  } else {
    const setting = gitPolicy.preview_deployment_setting;
    const branch = gitPolicy.target_branch || 'codex/finpath-quality-execution';
    const includes = gitPolicy.preview_branch_includes;
    const excludes = gitPolicy.preview_branch_excludes;

    if (!gitPolicy.deployments_enabled || setting === 'none') {
      checks.git_deployment_policy = {
        status: 'PASS',
        auto_deploying: false,
        details: 'Preview deployments are disabled for all branches (none); automatic deployment safely excluded'
      };
    } else if (setting === 'all') {
      if (excludes !== undefined && !Array.isArray(excludes)) {
        checks.git_deployment_policy = {
          status: 'BLOCKED',
          details: 'preview_branch_excludes must be an array'
        };
      } else {
        const isExcluded = matchesAnyPattern(branch, excludes || []);
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: !isExcluded,
          details: isExcluded
            ? `Branch ${branch} is excluded from automatic deployments by preview_branch_excludes`
            : `Branch ${branch} is covered by setting 'all' (not excluded)`
        };
      }
    } else if (setting === 'custom') {
      if (!Array.isArray(includes) || (excludes !== undefined && !Array.isArray(excludes))) {
        checks.git_deployment_policy = {
          status: 'BLOCKED',
          details: 'preview_branch_includes and preview_branch_excludes must be arrays for custom setting'
        };
      } else {
        const isExcluded = matchesAnyPattern(branch, excludes || []);
        const isIncluded = matchesAnyPattern(branch, includes);
        const autoDeploying = !isExcluded && isIncluded;
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: autoDeploying,
          details: autoDeploying
            ? `Branch ${branch} matches preview_branch_includes; triggers automatic build`
            : `Branch ${branch} does not match preview_branch_includes (${JSON.stringify(includes)}); automatic deployment safely excluded`
        };
      }
    } else {
      checks.git_deployment_policy = {
        status: 'BLOCKED',
        details: `Unknown preview deployment setting '${setting}'`
      };
    }
  }

  // 4. Migration Readiness (V05)
  const mig = input.migration_evidence;
  if (!mig || mig.status !== 'COLLECTED') {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: mig?.error || 'Missing or uncollected migration evidence from approved preview database'
    };
  } else if (!mig.database_id || typeof mig.database_id !== 'string') {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: 'Missing database_id in migration evidence'
    };
  } else if (mig.database_id !== approvedTargetId) {
    checks.migration_readiness = {
      status: 'FAIL',
      details: `Migration evidence collected from database ${mig.database_id}, differing from approved target ${approvedTargetId}`
    };
  } else if (!Array.isArray(mig.applied_migrations) || !Array.isArray(mig.repository_migrations)) {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: 'Migration lists are malformed or missing'
    };
  } else if (!Array.isArray(mig.tables) || mig.tables.some(t => typeof t !== 'string' || !t.trim()) || mig.repository_migrations.some(m => typeof m !== 'string' || !m.trim())) {
    checks.migration_readiness = {status: 'BLOCKED', details: 'Malformed schema or repository migration rows'};
  } else if (mig.applied_migrations.some(m => !m || typeof m !== 'object' || typeof m.name !== 'string')) {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: 'Applied migration list contains invalid or null rows'
    };
  } else if (mig.applied_migrations.length === 0 && mig.repository_migrations.length > 0) {
    checks.migration_readiness = {
      status: 'FAIL',
      details: 'Empty applied migrations list cannot establish current repository schema'
    };
  } else {
    const appliedNames = new Set(mig.applied_migrations.map(m => m.name));
    const pending = mig.repository_migrations.filter(m => !appliedNames.has(m));
    const tables = mig.tables || [];

    if (pending.length > 0) {
      checks.migration_readiness = {
        status: 'FAIL',
        pending_migrations: pending,
        details: `Approved preview DB is missing repository migrations: ${pending.join(', ')}`
      };
    } else if (!Array.isArray(tables) || tables.length === 0) {
      checks.migration_readiness = {
        status: 'FAIL',
        details: 'Approved preview DB contains 0 tables; schema not found'
      };
    } else {
      const systemTables = mig.system_tables || tables.filter(t => t === '_cf_KV' || t === 'sqlite_sequence' || t === 'd1_migrations');
      const userTables = mig.user_tables || tables.filter(t => !systemTables.includes(t));
      checks.migration_readiness = {
        status: 'PASS',
        applied_count: mig.applied_migrations.length,
        total_tables: tables.length,
        user_tables_count: userTables.length,
        system_tables_count: systemTables.length,
        details: `All ${mig.repository_migrations.length} repository migrations applied cleanly (${userTables.length} user tables, ${systemTables.length} system tables)`
      };
    }
  }

  // 5. Endpoint Probes (V03 & V04)
  const probes = input.endpoint_probes;
  if (!probes || typeof probes.deployment_url !== 'string' || !probes.deployment_url.trim()) {
    checks.endpoint_probes = {
      status: 'BLOCKED',
      details: 'Missing endpoint probes evidence'
    };
  } else {
    let endpointsFail = false;
    let endpointsBlocked = false;
    const failures = [];
    const blockReasons = [];

    // Health probe: MUST be HTTP 200, application/json, and match expected schema
    const health = probes.health;
    const contentType = health?.contentType || health?.content_type;
    if (!health) {
      endpointsBlocked = true;
      blockReasons.push('Missing health probe');
    } else if (health.status !== 200) {
      endpointsFail = true;
      failures.push(`Health status ${health.status} !== 200`);
    } else if (!contentType || !contentType.includes('application/json')) {
      endpointsFail = true;
      failures.push(`Health content-type '${contentType}' is not JSON (HTML served)`);
    } else if (
      !health.body ||
      typeof health.body !== 'object' ||
      health.body.ok !== EXPECTED_HEALTH_SCHEMA.ok ||
      health.body.app !== EXPECTED_HEALTH_SCHEMA.app ||
      health.body.runtime !== EXPECTED_HEALTH_SCHEMA.runtime
    ) {
      endpointsFail = true;
      failures.push(`Health body does not match expected schema: ${JSON.stringify(health.body)}`);
    }

    // Canonical private probes: MUST be present and return 401
    const privates = probes.private_endpoints;
    if (!privates || typeof privates !== 'object' || Object.keys(privates).length === 0) {
      endpointsBlocked = true;
      blockReasons.push('Missing private endpoint probes map');
    } else {
      const missingCanonical = [];
      for (const canonicalPath of CANONICAL_PRIVATE_ENDPOINTS) {
        const shortKey = canonicalPath.replace('/api/', '');
        const entry = privates[canonicalPath] || privates[shortKey];
        if (!entry) {
          missingCanonical.push(canonicalPath);
        }
      }

      if (missingCanonical.length > 0) {
        endpointsBlocked = true;
        blockReasons.push(`Missing canonical private probe(s): ${missingCanonical.join(', ')}`);
      }

      for (const [name, p] of Object.entries(privates)) {
        if (!p || p.status !== 401) {
          endpointsFail = true;
          failures.push(`Private probe ${name} status ${p?.status} !== 401`);
        }
      }
    }

    if (endpointsFail) {
      checks.endpoint_probes = {
        status: 'FAIL',
        failures,
        details: `Endpoint probe violations: ${failures.join('; ')}`
      };
    } else if (endpointsBlocked) {
      checks.endpoint_probes = {
        status: 'BLOCKED',
        blockReasons,
        details: `Endpoint probes incomplete: ${blockReasons.join('; ')}`
      };
    } else {
      checks.endpoint_probes = {
        status: 'PASS',
        details: 'Public health returns JSON 200 with matching schema; all canonical private endpoints return 401 fail-closed'
      };
    }
  }

  // 6. Production Auth Guard (V07)
  const preflight = input.auth_preflight;
  if (!preflight || preflight.status !== 'EXECUTED') {
    checks.production_auth_guard = {
      status: 'BLOCKED',
      details: preflight?.error || 'Auth preflight process missing, crashed, or failed to execute'
    };
  } else if (!preflight.recognized) {
    checks.production_auth_guard = {
      status: 'BLOCKED',
      details: preflight?.error || 'Auth preflight output was unrecognized or unparseable'
    };
  } else {
    checks.production_auth_guard = {
      status: 'PASS',
      passed_checks: preflight.passed_checks,
      total_checks: preflight.total_checks,
      details: `Auth preflight executed cleanly (${preflight.passed_checks}/${preflight.total_checks} checks passed; fail-closed guard active)`
    };
  }

  // Aggregate final outcome (FAIL takes precedence over BLOCKED)
  let overallStatus = 'PASS';
  let exitCode = 0;
  const failingChecks = [];
  const blockedChecks = [];

  for (const name of REQUIRED_CHECKS) {
    const c = checks[name];
    if (!c || c.status === 'BLOCKED') {
      blockedChecks.push(name);
    } else if (c.status === 'FAIL') {
      failingChecks.push(name);
    }
  }

  if (failingChecks.length > 0) {
    overallStatus = 'FAIL';
    exitCode = 1;
  } else if (blockedChecks.length > 0) {
    overallStatus = 'BLOCKED';
    exitCode = 2;
  }

  const summary = overallStatus === 'PASS'
    ? 'All required B33 isolation and infrastructure checks passed cleanly.'
    : overallStatus === 'FAIL'
      ? `Verification failed: ${failingChecks.join(', ')} failed.`
      : `Verification blocked: ${blockedChecks.join(', ')} blocked or missing.`;

  return {
    status: overallStatus,
    exitCode,
    summary,
    failingChecks,
    blockedChecks,
    checks
  };
}

module.exports = {
  evaluateB33Results,
  parseAuthPreflightOutput,
  REQUIRED_CHECKS,
  APPROVED_PREVIEW_DB_ID,
  EXPECTED_PRODUCTION_DB_ID,
  EXPECTED_HEALTH_SCHEMA,
  CANONICAL_PRIVATE_ENDPOINTS,
  EXPECTED_PREFLIGHT_CHECKS,
  matchesPattern,
  matchesAnyPattern
};
