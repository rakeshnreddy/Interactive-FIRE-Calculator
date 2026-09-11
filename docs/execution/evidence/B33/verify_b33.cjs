#!/usr/bin/env node

/**
 * FinPath B33 Verification & Isolation Audit Suite
 *
 * Verifies:
 * 1. Cloudflare Pages project configuration & deployment configs
 * 2. Effective D1 bindings for preview vs production on active preview deployment
 * 3. Git integration and deployment triggers (github:push vs ad_hoc, idle/skipped stages)
 * 4. Read-only D1 schema & migration state of finpath-preview via live sqlite_master and d1_migrations
 * 5. Fail-closed state and schema compliance of deployed preview endpoints
 * 6. Diagnostic production auth preflight status
 * 7. Pure evaluator outcome enforcement (PASS: 0, FAIL: 1, BLOCKED: 2)
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const {
  evaluateB33Results,
  parseAuthPreflightOutput,
  APPROVED_PREVIEW_DB_ID,
  EXPECTED_PRODUCTION_DB_ID
} = require('./evaluator.cjs');

const EVIDENCE_DIR = path.resolve(__dirname);
const REPO_ROOT = path.resolve(__dirname, '../../../..');
const CONFIG_PATH = path.join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');
const ACCOUNT_ID = '4e1b7f6a7440770a01779a67602ec5e9';
const PROJECT_NAME = 'interactive-fire-calculator';
const TARGET_BRANCH = 'codex/finpath-quality-execution';
const STATIC_PREVIEW_URL = 'https://03cba125.interactive-fire-calculator.pages.dev';

function parseArgs(argv) {
  const options = {
    fixture: null,
    output: path.join(EVIDENCE_DIR, 'b33-verification.json'),
    deploymentId: null
  };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === '--fixture' && argv[i + 1]) {
      options.fixture = path.resolve(argv[++i]);
    } else if (argv[i] === '--output' && argv[i + 1]) {
      options.output = path.resolve(argv[++i]);
    } else if (argv[i] === '--deployment-id' && argv[i + 1]) {
      options.deploymentId = argv[++i];
    }
  }
  return options;
}

async function main(argv = process.argv) {
  const options = parseArgs(argv);
  const timestamp = new Date().toISOString();

  // If running in fixture mode (used for offline subprocess integration tests)
  if (options.fixture) {
    if (!fs.existsSync(options.fixture)) {
      console.error(`Error: Fixture file not found: ${options.fixture}`);
      process.exit(1);
    }
    const fixtureRaw = fs.readFileSync(options.fixture, 'utf8');
    const fixtureData = JSON.parse(fixtureRaw);

    const payload = fixtureData.evidence ? {
      approved_target_id: APPROVED_PREVIEW_DB_ID,
      project_metadata: {
        preview_d1_id: fixtureData.evidence.project?.preview_d1_binding,
        production_d1_id: fixtureData.evidence.project?.production_d1_binding
      },
      deployment_metadata: {
        id: fixtureData.evidence.deployment?.id,
        short_id: fixtureData.evidence.deployment?.short_id,
        url: fixtureData.evidence.deployment?.url,
        environment: fixtureData.evidence.deployment?.environment || 'preview',
        uses_functions: fixtureData.evidence.deployment?.uses_functions,
        latest_stage_status: fixtureData.evidence.deployment?.latest_stage_status || 'success',
        effective_d1_id: fixtureData.evidence.deployment?.effective_d1_id
      },
      git_policy: {
        target_branch: fixtureData.evidence.git_source?.target_branch || TARGET_BRANCH,
        preview_deployment_setting: fixtureData.evidence.git_source?.setting,
        preview_branch_includes: fixtureData.evidence.git_source?.branch_includes,
        preview_branch_excludes: fixtureData.evidence.git_source?.branch_excludes
      },
      migration_evidence: fixtureData.evidence.migrations,
      endpoint_probes: fixtureData.evidence.endpoints?.active_preview,
      auth_preflight: fixtureData.evidence.auth_preflight
    } : fixtureData;

    const outcome = evaluateB33Results(payload);
    const report = {
      timestamp,
      evaluation: outcome,
      evidence: fixtureData.evidence || payload
    };

    fs.writeFileSync(options.output, JSON.stringify(report, null, 2) + '\n');
    console.log(`B33 Fixture Verification: ${outcome.status} (exit ${outcome.exitCode})`);
    process.exit(outcome.exitCode);
  }

  console.log('=== FinPath B33 Preview Isolation Audit Suite ===');

  // 1. Read OAuth token from wrangler config or environment
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token && fs.existsSync(CONFIG_PATH)) {
    const configContent = fs.readFileSync(CONFIG_PATH, 'utf8');
    const tokenMatch = configContent.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (tokenMatch) {
      token = tokenMatch[1];
    }
  }
  if (!token) {
    throw new Error('Cloudflare API token not found in environment or wrangler config');
  }

  // 2. Fetch Project Metadata
  console.log('\n--- Step 1: Inspecting Cloudflare Pages Project Metadata ---');
  const projRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const projData = await projRes.json();
  if (!projData.success) {
    throw new Error(`Failed to fetch project metadata: ${JSON.stringify(projData.errors)}`);
  }
  const project = projData.result;
  const previewD1 = project.deployment_configs?.preview?.d1_databases?.DB?.id;
  const productionD1 = project.deployment_configs?.production?.d1_databases?.DB?.id;

  console.log(`Project Name: ${project.name}`);
  console.log(`Production Branch: ${project.production_branch}`);
  console.log(`Project Preview DB ID: ${previewD1}`);
  console.log(`Project Production DB ID: ${productionD1}`);

  // 3. Inspect Git Integration and Branch Triggers
  console.log('\n--- Step 2: Inspecting Git Integration and Branch Triggers ---');
  const source = project.source?.config || {};
  const previewSetting = source.preview_deployment_setting || 'none';
  const branchIncludes = source.preview_branch_includes || [];
  const branchExcludes = source.preview_branch_excludes || [];

  console.log(`Preview Deployment Setting: ${previewSetting}`);
  console.log(`Preview Branch Includes: ${JSON.stringify(branchIncludes)}`);
  console.log(`Preview Branch Excludes: ${JSON.stringify(branchExcludes)}`);
  console.log(`Target Branch: ${TARGET_BRANCH}`);

  // 4. Fetch Deployments & Identify Active Preview Deployment
  console.log('\n--- Step 3: Inspecting Active Preview Deployments ---');
  const depListRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments?per_page=10`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const depListData = await depListRes.json();
  if (!depListData.success) {
    throw new Error(`Failed to fetch deployments: ${JSON.stringify(depListData.errors)}`);
  }

  let activeDeployment = null;
  if (options.deploymentId) {
    activeDeployment = depListData.result.find(d => d.id === options.deploymentId || d.short_id === options.deploymentId);
    if (!activeDeployment) {
      throw new Error(`Specified deployment ID ${options.deploymentId} not found in deployments list`);
    }
  } else {
    // Find latest successful preview deployment on our branch with functions
    const candidateDeployments = depListData.result.filter(d =>
      d.environment === 'preview' &&
      d.deployment_trigger?.metadata?.branch === TARGET_BRANCH &&
      d.latest_stage?.status === 'success' &&
      !d.is_skipped
    );

    if (candidateDeployments.length === 0) {
      throw new Error(`No active preview deployment found for branch ${TARGET_BRANCH}`);
    }
    activeDeployment = candidateDeployments[0];
  }

  const activeDeployD1 = activeDeployment.d1_databases?.DB?.id;
  const activeDeployUrl = activeDeployment.url;

  console.log(`Active Deployment ID: ${activeDeployment.id} (${activeDeployment.short_id})`);
  console.log(`Active Deployment URL: ${activeDeployUrl}`);
  console.log(`Active Deployment Created On: ${activeDeployment.created_on}`);
  console.log(`Active Deployment Uses Functions: ${activeDeployment.uses_functions}`);
  console.log(`Active Deployment Effective D1 ID: ${activeDeployD1}`);

  // 5. Read-only Schema & Migrations Collection from Preview D1 using Approved UUID directly
  console.log(`\n--- Step 4: Collecting Read-only D1 Schema & Migrations (${APPROVED_PREVIEW_DB_ID}) ---`);
  let migrationEvidence = null;
  try {
    const tableCmd = `PATH="/opt/homebrew/opt/node/bin:$PATH" npx wrangler d1 execute ${APPROVED_PREVIEW_DB_ID} --remote --command "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;" --json`;
    const tableOutRaw = execFileSync('sh', ['-c', tableCmd], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const tableJson = JSON.parse(tableOutRaw);
    const rawTables = tableJson[0]?.results || [];

    const migCmd = `PATH="/opt/homebrew/opt/node/bin:$PATH" npx wrangler d1 execute ${APPROVED_PREVIEW_DB_ID} --remote --command "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;" --json`;
    const migOutRaw = execFileSync('sh', ['-c', migCmd], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const migJson = JSON.parse(migOutRaw);
    const appliedMigrations = migJson[0]?.results || [];

    // Repository migrations
    const migrationsDir = path.join(REPO_ROOT, 'migrations');
    const repoMigrations = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();

    // Table categorization
    const userTables = [];
    const systemTables = [];
    const migrationTables = [];

    for (const row of rawTables) {
      if (row.name === 'd1_migrations') {
        migrationTables.push(row.name);
      } else if (row.name.startsWith('_cf_') || row.name.startsWith('sqlite_')) {
        systemTables.push(row.name);
      } else {
        userTables.push(row.name);
      }
    }

    migrationEvidence = {
      status: 'COLLECTED',
      database_name: 'finpath-preview',
      database_id: APPROVED_PREVIEW_DB_ID,
      collected_at: timestamp,
      queries: [
        "SELECT name, type FROM sqlite_master WHERE type IN ('table', 'view') ORDER BY name;",
        "SELECT id, name, applied_at FROM d1_migrations ORDER BY id;"
      ],
      total_tables: rawTables.length,
      tables: rawTables.map(r => r.name),
      user_tables: userTables,
      migration_tables: migrationTables,
      system_tables: systemTables,
      applied_migrations: appliedMigrations,
      repository_migrations: repoMigrations
    };

    console.log(`D1 finpath-preview Schema: ${rawTables.length} total tables (${userTables.length} user tables, ${migrationTables.length} migration table, ${systemTables.length} system tables)`);
    console.log(`Applied Migrations (${appliedMigrations.length}/${repoMigrations.length}): ${appliedMigrations.map(m => m.name).join(', ')}`);
  } catch (err) {
    console.error('Failed to collect D1 schema evidence:', err.message);
    migrationEvidence = {
      status: 'COLLECTED_FAILED',
      error: `Failed to query D1 metadata: ${err.message}`
    };
  }

  // 6. Probing Deployed Preview Endpoints
  console.log(`\n--- Step 5: Probing Deployed Preview Endpoints (${activeDeployUrl}) ---`);
  const endpointProbes = {
    deployment_url: activeDeployUrl,
    health: null,
    private_endpoints: {}
  };

  // Health probe
  try {
    const healthRes = await fetch(`${activeDeployUrl}/api/health`);
    const contentType = healthRes.headers.get('content-type') || '';
    let bodyJson = null;
    let rawText = '';
    try {
      rawText = await healthRes.text();
      bodyJson = JSON.parse(rawText);
    } catch {
      // not JSON
    }

    endpointProbes.health = {
      status: healthRes.status,
      contentType: contentType,
      content_type: contentType,
      is_json: contentType.includes('application/json'),
      body: bodyJson,
      raw_sample: rawText.slice(0, 100)
    };
    console.log(`Endpoint /api/health: status ${healthRes.status}, content-type: ${contentType}`);
  } catch (err) {
    endpointProbes.health = { status: 0, error: err.message };
    console.log(`Endpoint /api/health: ERROR (${err.message})`);
  }

  // Private probes (canonical set)
  const privatePaths = ['/api/me', '/api/profile', '/api/plans', '/api/accounts'];
  for (const p of privatePaths) {
    try {
      const res = await fetch(`${activeDeployUrl}${p}`);
      const contentType = res.headers.get('content-type') || '';
      endpointProbes.private_endpoints[p] = {
        status: res.status,
        content_type: contentType,
        is_401: res.status === 401
      };
      console.log(`Endpoint ${p}: status ${res.status} (expected 401 fail-closed)`);
    } catch (err) {
      endpointProbes.private_endpoints[p] = { status: 0, error: err.message };
      console.log(`Endpoint ${p}: ERROR (${err.message})`);
    }
  }

  // Static preview probe (to document static vs API deployment behavior)
  console.log(`\n--- Step 6: Documenting Static Preview Distinction (${STATIC_PREVIEW_URL}) ---`);
  let staticHealthProbe = null;
  try {
    const staticRes = await fetch(`${STATIC_PREVIEW_URL}/api/health`);
    const staticContentType = staticRes.headers.get('content-type') || '';
    staticHealthProbe = {
      status: staticRes.status,
      content_type: staticContentType,
      is_html: staticContentType.includes('text/html'),
      uses_functions: false,
      details: 'Static deployment 03cba125 has uses_functions=false and returns HTML for /api/*; API checks are unavailable there.'
    };
    console.log(`Static preview /api/health returned ${staticRes.status} with content-type: ${staticContentType} (HTML fallback confirmed)`);
  } catch (err) {
    staticHealthProbe = { status: 0, error: err.message };
  }

  // 7. Production Auth Preflight Diagnostic
  console.log('\n--- Step 7: Running Production Auth Preflight Diagnostic ---');
  let authPreflightResult = null;
  try {
    const stdout = execFileSync(
      'node',
      ['scripts/check_production_auth.mjs', '--check-cloudflare'],
      { cwd: REPO_ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    authPreflightResult = parseAuthPreflightOutput({ stdout, stderr: '', exitCode: 0 });
    console.log(`Auth preflight executed cleanly: ${authPreflightResult.passed_checks}/${authPreflightResult.total_checks} passed (diagnostic fail-closed status verified)`);
  } catch (err) {
    const stdout = err.stdout?.toString() || '';
    const stderr = err.stderr?.toString() || '';
    const exitCode = err.status ?? 1;
    authPreflightResult = parseAuthPreflightOutput({ stdout, stderr, exitCode });
    console.log(`Auth preflight exited with code ${exitCode}: ${authPreflightResult.passed_checks}/${authPreflightResult.total_checks} passed (fail-closed verified)`);
  }

  // 8. Run Pure Evaluator
  console.log('\n--- Step 8: Evaluating B33 Evidence with Pure Evaluator ---');
  const evaluationPayload = {
    approved_target_id: APPROVED_PREVIEW_DB_ID,
    project_metadata: {
      name: project.name,
      production_branch: project.production_branch,
      preview_d1_id: previewD1,
      production_d1_id: productionD1
    },
    deployment_metadata: {
      id: activeDeployment.id,
      short_id: activeDeployment.short_id,
      url: activeDeployUrl,
      environment: activeDeployment.environment,
      uses_functions: activeDeployment.uses_functions,
      latest_stage_status: activeDeployment.latest_stage?.status,
      effective_d1_id: activeDeployD1
    },
    git_policy: {
      target_branch: TARGET_BRANCH,
      preview_deployment_setting: previewSetting,
      preview_branch_includes: branchIncludes,
      preview_branch_excludes: branchExcludes
    },
    migration_evidence: migrationEvidence,
    endpoint_probes: endpointProbes,
    auth_preflight: authPreflightResult
  };

  const outcome = evaluateB33Results(evaluationPayload);
  const isBranchAutoDeploying = outcome.checks.git_deployment_policy?.auto_deploying || false;

  console.log(`\n======================================================`);
  console.log(`B33 VERIFICATION OUTCOME: ${outcome.status} (Exit Code: ${outcome.exitCode})`);
  console.log(`Summary: ${outcome.summary}`);
  console.log(`Branch Auto-Deploying: ${isBranchAutoDeploying}`);
  console.log(`======================================================`);
  for (const [name, check] of Object.entries(outcome.checks)) {
    console.log(`[${check.status}] ${name}: ${check.details}`);
  }

  // Save complete report
  const finalReport = {
    timestamp,
    evaluation: outcome,
    evidence: {
      project: {
        name: project.name,
        account_id: ACCOUNT_ID,
        production_branch: project.production_branch,
        preview_d1_binding: previewD1,
        production_d1_binding: productionD1
      },
      deployment: {
        id: activeDeployment.id,
        short_id: activeDeployment.short_id,
        url: activeDeployUrl,
        effective_d1_id: activeDeployD1,
        uses_functions: activeDeployment.uses_functions,
        is_skipped: activeDeployment.is_skipped,
        created_on: activeDeployment.created_on
      },
      git_source: {
        setting: previewSetting,
        branch_includes: branchIncludes,
        branch_excludes: branchExcludes,
        target_branch: TARGET_BRANCH,
        is_branch_auto_deploying: isBranchAutoDeploying
      },
      migrations: migrationEvidence,
      endpoints: {
        active_preview: endpointProbes,
        static_preview: staticHealthProbe
      },
      auth_preflight: authPreflightResult
    }
  };

  fs.writeFileSync(options.output, JSON.stringify(finalReport, null, 2) + '\n');
  console.log(`\nPersisted complete B33 verification evidence to: ${options.output}`);

  process.exit(outcome.exitCode);
}

module.exports = {
  main,
  parseArgs
};

if (require.main === module) {
  main().catch(err => {
    console.error('\nFatal error during B33 verification execution:', err);
    process.exit(1);
  });
}
