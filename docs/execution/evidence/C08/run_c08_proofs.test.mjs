import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATE_SHA,
  DEPLOYMENT_ID,
  PREVIEW_DB_ID,
  USER_TABLES,
  evaluateReport,
  performCleanup,
  calculateContrast,
  parseRgb,
  sRgbLuminance
} from './run_c08_proofs.mjs';

function buildBaselineValidReport() {
  return {
    candidate_sha: CANDIDATE_SHA,
    deployment_id: DEPLOYMENT_ID,
    preview_url: 'https://f737cfbb.interactive-fire-calculator.pages.dev',
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    b26_accounts_polish: {
      profile_email_deduplicated: true,
      user_facing_copy: true,
      account_created_via_ui: true,
      balance_updated_via_ui: true,
      exact_cents_displayed: true,
      as_of_date_rendered: true,
      balance_history_persisted: true,
      stale_badge_present_for_old_account: true,
      stale_badge_absent_for_fresh_account: true,
      date_input_width: '180px',
      dashboard_user_facing_copy: true,
      dashboard_renders_accounts: true
    },
    b27_transactions_polish: {
      initial_empty_state: true,
      preview_summary: {
        totalRows: 3,
        readyRows: 2,
        errorRows: 1
      },
      selection_did_not_commit: true,
      actionable_row_error_displayed: true,
      commit_imported_rows: 2,
      ledger_renders_signed_amounts: true,
      balances_unmodified_equality: true,
      duplicate_detection_passed: true,
      persisted_count_unchanged: true
    },
    visual_and_accessibility: {
      theme_switching_verified: true,
      light_dark_screenshots_distinct: true,
      stale_badge_contrast_light_pass: true,
      stale_badge_contrast_dark_pass: true,
      viewport_containment_verified: true,
      keyboard_interaction_verified: true,
      motion_transparency_fallbacks_verified: true
    }
  };
}

function buildBaselineValidCleanup() {
  const tableCounts = {};
  for (const table of USER_TABLES) {
    tableCounts[table] = 0;
  }
  return {
    userId: 'user_test_synthetic',
    app_data_deleted: true,
    user_tombstone_present: true,
    clerk_user_deleted: true,
    clerk_user_absent: true,
    all_tables_zero: true,
    table_counts: tableCounts
  };
}

test('Baseline: evaluateReport accepts a completely compliant report and cleanup', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, true, `Expected pass, got failures: ${evaluation.failures.join(', ')}`);
  assert.equal(evaluation.failures.length, 0);
});

test('R1 Negative Test 1: false dashboard fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b26_accounts_polish.dashboard_renders_accounts = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('dashboard_renders_accounts')));
});

test('R1 Negative Test 2: missing observation fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  delete report.b26_accounts_polish.exact_cents_displayed;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('exact_cents_displayed')));
});

test('R1 Negative Test 3: wrong import count fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b27_transactions_polish.commit_imported_rows = 1; // expected 2

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('commit_imported_rows')));
});

test('R1 Negative Test 4: failed app delete fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.app_data_deleted = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('app_data_deleted')));
});

test('R1 Negative Test 5: provider-delete failure fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.clerk_user_deleted = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('clerk_user_deleted')));
});

test('R1 Negative Test 6: provider still present (non-404) fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.clerk_user_absent = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('clerk_user_absent')));
});

test('R1 Negative Test 7: missing or non-numeric D1 table count fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.table_counts.transactions = 'error: connection failed';

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('transactions')));

  // Also test nonzero count
  cleanup.table_counts.transactions = 1;
  const evalNonzero = evaluateReport(report, cleanup);
  assert.equal(evalNonzero.passed, false);
  assert.ok(evalNonzero.failures.some(f => f.includes('transactions') && f.includes('expected 0')));
});

test('R1 Negative Test 8: tombstone absence fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.user_tombstone_present = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('user_tombstone_present')));
});

test('R1 Negative Test 9: premature selection commit fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b27_transactions_polish.selection_did_not_commit = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('selection_did_not_commit')));
});

test('R1 Negative Test 10: balance immutability record inequality fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b27_transactions_polish.balances_unmodified_equality = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('balances_unmodified_equality')));
});

test('R1 Cleanup Gate: provider deletion is WITHHELD when app data deletion fails', async () => {
  const userId = 'user_synthetic_test_withheld';
  let clerkDeleteCalled = false;

  const mockClerkClient = {
    users: {
      deleteUser: async () => {
        clerkDeleteCalled = true;
      },
      getUser: async () => ({ id: userId })
    }
  };

  const mockPage = {
    isClosed: () => false,
    evaluate: async () => {
      // Simulate failed app delete
      return { status: 500, ok: false };
    }
  };

  const mockQueryD1 = async (sql) => {
    if (sql.includes('count(*)')) return [{ cnt: 2 }]; // 2 remaining rows
    if (sql.includes('deleted_at')) return [{ id: userId, deleted_at: null }];
    return [];
  };

  const cleanupResult = await performCleanup({
    userId,
    page: mockPage,
    clerkClient: mockClerkClient,
    queryD1Fn: mockQueryD1,
    logFn: () => {}
  });

  assert.equal(cleanupResult.app_data_deleted, false);
  assert.equal(cleanupResult.provider_deletion_withheld, true);
  assert.equal(clerkDeleteCalled, false, 'Provider deletion MUST NOT be called when app delete fails');
  assert.equal(cleanupResult.clerk_user_deleted, false);
});

test('R1 Cleanup Gate: provider deletion proceeds ONLY when app deletion and table purge succeed', async () => {
  const userId = 'user_synthetic_test_allowed';
  let clerkDeleteCalled = false;

  const mockClerkClient = {
    users: {
      deleteUser: async () => {
        clerkDeleteCalled = true;
      },
      getUser: async () => {
        const err = new Error('not found');
        err.status = 404;
        throw err;
      }
    }
  };

  const mockPage = {
    isClosed: () => false,
    evaluate: async () => {
      return { status: 200, ok: true };
    }
  };

  const mockQueryD1 = async (sql) => {
    if (sql.includes('count(*)')) return [{ cnt: 0 }];
    if (sql.includes('deleted_at')) return [{ id: userId, deleted_at: '2026-09-17T00:00:00.000Z' }];
    return [];
  };

  const cleanupResult = await performCleanup({
    userId,
    page: mockPage,
    clerkClient: mockClerkClient,
    queryD1Fn: mockQueryD1,
    logFn: () => {}
  });

  assert.equal(cleanupResult.app_data_deleted, true);
  assert.equal(cleanupResult.all_tables_zero, true);
  assert.equal(cleanupResult.user_tombstone_present, true);
  assert.equal(clerkDeleteCalled, true, 'Provider deletion should proceed after verified app purge');
  assert.equal(cleanupResult.clerk_user_deleted, true);
  assert.equal(cleanupResult.clerk_user_absent, true);
});

test('R2 Contrast Formula: calculates accurate contrast ratios for theme colors', () => {
  // Pure black on pure white = 21:1
  assert.equal(calculateContrast('#000000', '#ffffff'), 21);

  // Light mode stale badge: #885100 on #fbfdff
  const lightBadgeContrast = calculateContrast('#885100', '#fbfdff');
  assert.ok(lightBadgeContrast >= 4.5, `Expected >= 4.5, got ${lightBadgeContrast}`);

  // Dark mode stale badge: #f0bf72 on #10232c
  const darkBadgeContrast = calculateContrast('#f0bf72', '#10232c');
  assert.ok(darkBadgeContrast >= 4.5, `Expected >= 4.5, got ${darkBadgeContrast}`);
});
