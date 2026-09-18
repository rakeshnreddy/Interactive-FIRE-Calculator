import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CANDIDATE_SHA,
  DEPLOYMENT_ID,
  PREVIEW_DB_ID,
  PREVIEW_URL,
  USER_TABLES,
  evaluateReport,
  persistEvidence,
  performCleanup,
  calculateContrast,
  parseRgb,
  sRgbLuminance
} from './run_c09_proofs.mjs';

function buildBaselineValidReport() {
  return {
    candidate_sha: CANDIDATE_SHA,
    deployment_id: DEPLOYMENT_ID,
    preview_url: PREVIEW_URL,
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    d1_migration_0007_verified: true,
    sqlite_plan_reviews_verified: true,
    b10_saved_decision_navigation: {
      plan_created_version_1: true,
      plan_revised_version_2: true,
      exact_v1_link_navigated: true,
      exact_v1_inputs_restored_after_reload: true,
      v2_inputs_not_rendered_on_v1_link: true,
      unsaved_changes_modal_rendered_on_dirty_nav: true,
      unsaved_changes_cancel_preserves_dirty_state: true,
      unsaved_changes_confirm_proceeds_navigation: true,
      controlled_error_on_missing_plan: true,
      controlled_error_on_missing_version: true,
      tenant_b_cannot_access_tenant_a_plan: true,
      full_record_immutability_verified: true
    },
    b11_monthly_review_loop: {
      review_saved_keep_choice: true,
      review_completed_status_persisted_after_reload: true,
      review_next_due_date_computed: true,
      returning_review_rule_enforced_within_7_days: true,
      review_defer_choice_persisted: true,
      review_revise_choice_triggers_revision: true,
      idempotent_repeat_review_not_duplicated: true,
      due_reviews_endpoint_returned_plans: true,
      tenant_b_cannot_review_tenant_a_plan: true,
      plan_reviews_participate_in_data_export: true
    },
    b28_presentation_and_accessibility: {
      dashboard_reviews_rollup_rendered: true,
      dashboard_due_cards_have_deep_links: true,
      review_status_badges_explicit_text: true,
      goals_panel_linked_plan_badge_rendered: true,
      goals_panel_evidence_date_disclosed: true,
      goals_panel_funding_gap_rendered: true,
      goals_panel_explicit_text_status: true,
      stale_evidence_warning_displayed_when_over_30_days: true,
      theme_switching_verified: true,
      contrast_review_badges_light_pass: true,
      contrast_review_badges_dark_pass: true,
      viewport_containment_mobile_320px_verified: true,
      viewport_containment_tablet_768px_verified: true,
      viewport_containment_desktop_1280px_verified: true,
      keyboard_navigation_accessible: true
    }
  };
}

function buildBaselineValidCleanup() {
  const tableCounts = {};
  for (const table of USER_TABLES) {
    tableCounts[table] = 0;
  }
  const userCleanup = {
    userId: 'user_test_synthetic',
    app_data_deleted: true,
    user_tombstone_present: true,
    clerk_user_deleted: true,
    clerk_user_absent: true,
    all_tables_zero: true,
    table_counts: { ...tableCounts }
  };
  return {
    userA: { ...userCleanup, userId: 'user_a_synthetic' },
    userB: { ...userCleanup, userId: 'user_b_synthetic' }
  };
}

test('Baseline: evaluateReport accepts a completely compliant report and cleanup', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, true, `Expected pass, got failures: ${evaluation.failures.join(', ')}`);
  assert.equal(evaluation.failures.length, 0);
});

test('Negative Test 1: false b10 observation fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b10_saved_decision_navigation.exact_v1_inputs_restored_after_reload = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('exact_v1_inputs_restored_after_reload')));
});

test('Negative Test 2: false b11 observation fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b11_monthly_review_loop.returning_review_rule_enforced_within_7_days = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('returning_review_rule_enforced_within_7_days')));
});

test('Negative Test 3: false b28 observation fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.dashboard_reviews_rollup_rendered = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('dashboard_reviews_rollup_rendered')));
});

test('Negative Test 4: nonzero plan_reviews table in cleanup fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.userA.table_counts.plan_reviews = 1;
  cleanup.userA.all_tables_zero = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('plan_reviews') && f.includes('1')));
});

test('Negative Test 5: missing tombstone fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.userA.user_tombstone_present = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('user_tombstone_present')));
});

test('Negative Test 6: Clerk deletion withheld/failed fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  cleanup.userB.clerk_user_deleted = false;
  cleanup.userB.clerk_user_absent = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('clerk_user_deleted')));
});

test('Negative Test 7: wrong candidate_sha fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.candidate_sha = 'wrong_sha_123';

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('candidate_sha')));
});

test('Contrast Utilities: WCAG 2.1 calculation logic', () => {
  const contrastBlackOnWhite = calculateContrast('#000000', '#ffffff');
  assert.equal(contrastBlackOnWhite, 21);

  const contrastWhiteOnWhite = calculateContrast('#ffffff', '#ffffff');
  assert.equal(contrastWhiteOnWhite, 1);
});
