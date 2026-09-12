const fs = require('fs');
const path = require('path');

const REQUIRED_CHECKS = [
  'print_legibility',
  'composited_contrast',
  'material_fallbacks',
  'browser_coverage',
  'responsive_layout',
  'clipping_inspection',
  'native_zoom',
  'journey_execution',
  'console_cleanliness',
  'page_cleanliness',
  'comparative_performance'
];

/**
 * Pure evaluator for verification outcomes.
 * Guarantees that:
 * - Any FAIL check results in overall status FAIL and nonzero exit code (1)
 * - Any BLOCKED required check results in overall status BLOCKED and nonzero exit code (2)
 * - Missing required checks are treated as BLOCKED
 * - Performance acceptance is derived, not hardcoded
 * - Console errors and page exceptions are strictly enforced
 * - Report persistence happens after complete aggregation
 */
function evaluateResults(rawResults = {}) {
  const checks = {};
  const failures = [];
  const blocked = [];
  const rawChecks = Object.assign({}, rawResults.checks || {});

  // Only complete observations may establish a clean run.
  const verdict = rawResults.performanceComparison?.verdict;
  const flags = ['fcpRegressed', 'loadRegressed', 'fpsRegressed'];
  const completePerformance = !!verdict && flags.every(key => typeof verdict[key] === 'boolean');
  if (verdict && typeof verdict === 'object') {
    verdict.acceptable = completePerformance ? !flags.some(key => verdict[key]) : null;
  }
  if (!completePerformance) {
    rawChecks.comparative_performance = {
      status: 'BLOCKED', details: 'Missing or malformed performance observations'
    };
  } else if (flags.some(key => verdict[key])) {
    rawChecks.comparative_performance = {
      status: 'FAIL', details: 'Performance regression: ' + flags.filter(key => verdict[key]).join(', ')
    };
  }

  for (const [field, checkId] of [
    ['recordedConsoleErrors', 'console_cleanliness'],
    ['recordedPageExceptions', 'page_cleanliness']
  ]) {
    const observations = rawResults[field];
    if (Array.isArray(observations) && observations.length > 0) {
      rawChecks[checkId] = {
        status: 'FAIL', details: `${observations.length} error(s): ${observations.map(e => e?.text || String(e)).join('; ')}`
      };
    } else if (!Array.isArray(observations) || rawResults.telemetryComplete !== true) {
      rawChecks[checkId] = {
        status: 'BLOCKED', details: `Missing, malformed or incomplete collection: ${field}`
      };
    } else if (!rawChecks[checkId]) {
      rawChecks[checkId] = { status: 'PASS', details: 'Completed collection; zero errors' };
    }
  }

  // 4. Evaluate each required check
  for (const checkId of REQUIRED_CHECKS) {
    const entry = rawChecks[checkId];
    if (!entry) {
      checks[checkId] = {
        status: 'BLOCKED',
        details: `Missing required check: ${checkId}`
      };
      blocked.push(`Missing required check: ${checkId}`);
      continue;
    }

    const checkStatus = String(entry.status || '').toUpperCase();
    const details = entry.details || '';

    if (checkStatus === 'PASS') {
      checks[checkId] = { status: 'PASS', details };
    } else if (checkStatus === 'FAIL') {
      checks[checkId] = { status: 'FAIL', details };
      failures.push(`${checkId}: ${details}`);
    } else if (checkStatus === 'BLOCKED') {
      checks[checkId] = { status: 'BLOCKED', details };
      blocked.push(`${checkId}: ${details}`);
    } else {
      checks[checkId] = {
        status: 'BLOCKED',
        details: `Unknown status "${entry.status}" for check ${checkId}`
      };
      blocked.push(`${checkId}: Unknown status "${entry.status}"`);
    }
  }

  // 5. Fold any raw validationFailures into failures list
  if (Array.isArray(rawResults.validationFailures)) {
    for (const failure of rawResults.validationFailures) {
      if (!failures.includes(failure)) {
        failures.push(failure);
      }
    }
  }

  // 6. Determine overall outcome and exit code
  let overallStatus = 'PASS';
  let exitCode = 0;
  let summary = 'All required checks passed.';

  if (failures.length > 0) {
    overallStatus = 'FAIL';
    exitCode = 1;
    summary = `Verification failed with ${failures.length} failure(s).`;
  } else if (blocked.length > 0) {
    overallStatus = 'BLOCKED';
    exitCode = 2;
    summary = `Verification blocked: ${blocked.length} required check(s) blocked/unperformed.`;
  }

  return {
    overallStatus,
    exitCode,
    summary,
    checks,
    failures,
    blocked,
    // Owner explicitly deferred reader/VoiceOver for C01T; never label it PASS.
    deferred: [{ id: 'screen_reader', status: 'DEFERRED', followUp: 'B31',
      reason: 'Owner requested deferral; see docs/execution/DEFERRED_CHECKS.md' }],
    diagnostics: rawResults.diagnostics || {}
  };
}

/**
 * Finalizes evaluation, updates the report object, writes it to disk, and returns the evaluation.
 */
function finalizeAndPersistReport(rawResults, outputPath) {
  const evaluation = evaluateResults(rawResults);

  rawResults.evaluated = {
    overallStatus: evaluation.overallStatus,
    exitCode: evaluation.exitCode,
    summary: evaluation.summary,
    evaluatedAt: new Date().toISOString(),
    failures: evaluation.failures,
    blocked: evaluation.blocked,
    checks: evaluation.checks,
    deferred: evaluation.deferred
  };

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(rawResults, null, 2));
  }

  return evaluation;
}

module.exports = {
  REQUIRED_CHECKS,
  evaluateResults,
  finalizeAndPersistReport
};
