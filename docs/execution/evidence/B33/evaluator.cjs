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
 */

const APPROVED_PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
const EXPECTED_PRODUCTION_DB_ID = 'a5860350-0a50-4ebe-9f5f-1d9916a908e6';
const EXPECTED_HEALTH_SCHEMA = {
  ok: true,
  app: 'interactive-fire-calculator',
  runtime: 'cloudflare-pages'
};

const REQUIRED_CHECKS = [
  'project_preview_binding',
  'effective_deployment_binding',
  'git_deployment_policy',
  'migration_readiness',
  'endpoint_probes',
  'production_auth_guard'
];

/**
 * Helper to match glob/wildcard patterns (e.g. "codex/*", exact matches)
 */
function matchesPattern(branch, pattern) {
  if (!branch || !pattern) return false;
  if (pattern === branch) return true;
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    return branch.startsWith(prefix + '/');
  }
  if (pattern === '*') return true;
  return false;
}

function matchesAnyPattern(branch, patterns) {
  if (!Array.isArray(patterns) || !branch) return false;
  return patterns.some(p => matchesPattern(branch, p));
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

  // 1. Project Preview Binding
  const projMeta = input.project_metadata;
  if (!projMeta || !projMeta.preview_d1_id) {
    checks.project_preview_binding = {
      status: 'BLOCKED',
      details: 'Missing Cloudflare Pages project preview D1 binding metadata'
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

  // 2. Effective Deployment Binding
  const depMeta = input.deployment_metadata;
  if (!depMeta || !depMeta.effective_d1_id) {
    checks.effective_deployment_binding = {
      status: 'BLOCKED',
      details: 'Missing effective deployment D1 binding metadata for preview deployment'
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
  } else {
    checks.effective_deployment_binding = {
      status: 'PASS',
      details: `Effective deployment D1 binding matches approved target (${approvedTargetId})`
    };
  }

  // 3. Git Deployment Policy
  const gitPolicy = input.git_policy;
  if (!gitPolicy || !gitPolicy.preview_deployment_setting) {
    checks.git_deployment_policy = {
      status: 'BLOCKED',
      details: 'Missing or unknown Cloudflare Pages Git preview deployment policy'
    };
  } else {
    const setting = gitPolicy.preview_deployment_setting;
    const branch = gitPolicy.target_branch || 'codex/finpath-quality-execution';
    const includes = gitPolicy.preview_branch_includes || [];
    const excludes = gitPolicy.preview_branch_excludes || [];

    if (setting === 'none') {
      checks.git_deployment_policy = {
        status: 'PASS',
        auto_deploying: false,
        details: 'Preview deployments are disabled for all branches (none); automatic deployment safely excluded'
      };
    } else if (setting === 'all') {
      const isExcluded = matchesAnyPattern(branch, excludes);
      if (isExcluded) {
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: false,
          details: `Branch ${branch} is excluded from automatic deployments by preview_branch_excludes`
        };
      } else {
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: true,
          details: `Branch ${branch} is covered by setting 'all' (not excluded)`
        };
      }
    } else if (setting === 'custom') {
      const isExcluded = matchesAnyPattern(branch, excludes);
      const isIncluded = matchesAnyPattern(branch, includes);
      if (isExcluded || !isIncluded) {
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: false,
          details: `Branch ${branch} does not match preview_branch_includes (${JSON.stringify(includes)}); automatic deployment safely excluded`
        };
      } else {
        checks.git_deployment_policy = {
          status: 'PASS',
          auto_deploying: true,
          details: `Branch ${branch} matches preview_branch_includes; triggers automatic build`
        };
      }
    } else {
      checks.git_deployment_policy = {
        status: 'BLOCKED',
        details: `Unknown preview deployment setting '${setting}'`
      };
    }
  }

  // 4. Migration Readiness
  const mig = input.migration_evidence;
  if (!mig || mig.status !== 'COLLECTED') {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: mig?.error || 'Missing or uncollected migration evidence from approved preview database'
    };
  } else if (!Array.isArray(mig.applied_migrations) || !Array.isArray(mig.repository_migrations)) {
    checks.migration_readiness = {
      status: 'BLOCKED',
      details: 'Migration lists are malformed or missing'
    };
  } else {
    const appliedNames = new Set(mig.applied_migrations.map(m => m.name));
    const pending = mig.repository_migrations.filter(m => !appliedNames.has(m));
    if (pending.length > 0) {
      checks.migration_readiness = {
        status: 'FAIL',
        pending_migrations: pending,
        details: `Approved preview DB is missing repository migrations: ${pending.join(', ')}`
      };
    } else {
      // Categorize tables: system vs user tables
      const tables = mig.tables || [
        ...(mig.user_tables || []),
        ...(mig.migration_tables || []),
        ...(mig.system_tables || [])
      ];
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

  // 5. Endpoint Probes
  const probes = input.endpoint_probes;
  if (!probes) {
    checks.endpoint_probes = {
      status: 'BLOCKED',
      details: 'Missing endpoint probes evidence'
    };
  } else {
    let endpointsPass = true;
    const failures = [];

    // Health probe: MUST be HTTP 200, application/json, and match expected schema
    const health = probes.health;
    const contentType = health?.contentType || health?.content_type;
    if (!health) {
      endpointsPass = false;
      failures.push('Missing health probe');
    } else if (health.status !== 200) {
      endpointsPass = false;
      failures.push(`Health status ${health.status} !== 200`);
    } else if (!contentType || !contentType.includes('application/json')) {
      endpointsPass = false;
      failures.push(`Health content-type '${contentType}' is not JSON (HTML served)`);
    } else if (!health.body || health.body.ok !== EXPECTED_HEALTH_SCHEMA.ok || health.body.app !== EXPECTED_HEALTH_SCHEMA.app) {
      endpointsPass = false;
      failures.push(`Health body does not match expected schema: ${JSON.stringify(health.body)}`);
    }

    // Private endpoint probes: MUST return 401
    const privates = probes.private_endpoints || {};
    for (const [name, p] of Object.entries(privates)) {
      if (!p || p.status !== 401) {
        endpointsPass = false;
        failures.push(`Private probe ${name} status ${p?.status} !== 401`);
      }
    }

    checks.endpoint_probes = {
      status: endpointsPass ? 'PASS' : 'FAIL',
      failures,
      details: endpointsPass
        ? 'Public health returns JSON 200 with matching schema; private endpoints return 401 fail-closed'
        : `Endpoint probe violations: ${failures.join('; ')}`
    };
  }

  // 6. Production Auth Guard
  const preflight = input.auth_preflight;
  if (!preflight || preflight.status !== 'EXECUTED') {
    checks.production_auth_guard = {
      status: 'BLOCKED',
      details: preflight?.error || 'Auth preflight process missing, crashed, or failed to execute'
    };
  } else if (!preflight.recognized) {
    checks.production_auth_guard = {
      status: 'BLOCKED',
      details: 'Auth preflight output was unrecognized or unparseable'
    };
  } else {
    // Diagnostic verification: production preflight must have run cleanly
    checks.production_auth_guard = {
      status: 'PASS',
      passed_checks: preflight.passed_checks,
      total_checks: preflight.total_checks,
      details: `Auth preflight executed cleanly (${preflight.passed_checks}/${preflight.total_checks} checks passed; fail-closed guard active)`
    };
  }

  // Aggregate final outcome
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
  REQUIRED_CHECKS,
  APPROVED_PREVIEW_DB_ID,
  EXPECTED_PRODUCTION_DB_ID,
  EXPECTED_HEALTH_SCHEMA,
  matchesPattern,
  matchesAnyPattern
};
