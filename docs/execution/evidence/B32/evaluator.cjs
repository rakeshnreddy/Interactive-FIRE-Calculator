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
  'screen_reader',
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

  // 1. Evaluate performance acceptance derivation
  if (rawResults.performanceComparison && rawResults.performanceComparison.verdict) {
    const verdict = rawResults.performanceComparison.verdict;
    const isAcceptable = Boolean(
      !verdict.fcpRegressed &&
      !verdict.loadRegressed &&
      !verdict.fpsRegressed
    );
    verdict.acceptable = isAcceptable;

    if (!isAcceptable) {
      const reasons = [
        verdict.fcpRegressed ? 'FCP regressed' : null,
        verdict.loadRegressed ? 'Load regressed' : null,
        verdict.fpsRegressed ? 'FPS regressed' : null
      ].filter(Boolean).join(', ');
      rawChecks.comparative_performance = {
        status: 'FAIL',
        details: `Performance regression: ${reasons}`
      };
    }
  }

  // 2. Evaluate console cleanliness
  const consoleErrors = rawResults.recordedConsoleErrors || [];
  if (consoleErrors.length > 0) {
    rawChecks.console_cleanliness = {
      status: 'FAIL',
      details: `${consoleErrors.length} console error(s) recorded: ${consoleErrors.map(e => e.text || e).join('; ')}`
    };
  } else if (!rawChecks.console_cleanliness) {
    rawChecks.console_cleanliness = { status: 'PASS', details: 'Zero console errors' };
  }

  // 3. Evaluate page cleanliness (exceptions)
  const pageExceptions = rawResults.recordedPageExceptions || [];
  if (pageExceptions.length > 0) {
    rawChecks.page_cleanliness = {
      status: 'FAIL',
      details: `${pageExceptions.length} unhandled page exception(s): ${pageExceptions.join('; ')}`
    };
  } else if (!rawChecks.page_cleanliness) {
    rawChecks.page_cleanliness = { status: 'PASS', details: 'Zero page exceptions' };
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
    checks: evaluation.checks
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
