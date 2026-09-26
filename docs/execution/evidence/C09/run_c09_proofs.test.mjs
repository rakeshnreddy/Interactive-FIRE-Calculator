import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
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
  sRgbLuminance,
  evaluateKeyboardActionProof,
  executeKeyboardActionProof,
  assertTargetLocatorVisible,
  verifyClearance,
  verifyReviseUiSelection,
  verifyFinancialRevisionDiff,
  verifyPriorVersionsImmutability,
  verifyIdempotentReplay,
  validateDeploymentInputs,
  verifyDeployment,
  loadCalculateFirePlan
} from './run_c09_proofs.mjs';
import { createFixtureServer } from '../../../../scripts/measure_local_clearance.mjs';

function buildBaselineValidReport() {
  return {
    candidate_sha: CANDIDATE_SHA,
    deployment_id: DEPLOYMENT_ID,
    preview_url: PREVIEW_URL,
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    d1_migration_0007_verified: true,
    d1_migration_0008_verified: true,
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
      review_revise_ui_selected: true,
      review_revise_next_step_displayed: true,
      plan_revised_version_3_persisted: true,
      version_3_reload_verified: true,
      prior_versions_immutable_after_v3: true,
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
      review_panel_no_topbar_overlap: true,
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

test('Negative Test 7b: unverified d1_migration_0008 fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.d1_migration_0008_verified = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('d1_migration_0008_verified')));
});

test('Contrast Utilities: WCAG 2.1 calculation logic', () => {
  const contrastBlackOnWhite = calculateContrast('#000000', '#ffffff');
  assert.equal(contrastBlackOnWhite, 21);

  const contrastWhiteOnWhite = calculateContrast('#ffffff', '#ffffff');
  assert.equal(contrastWhiteOnWhite, 1);
});

test('Collector Negative 8: missing modal marks cancel and confirm false, failing closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b10_saved_decision_navigation.unsaved_changes_modal_rendered_on_dirty_nav = false;
  report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state = false;
  report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('unsaved_changes_modal_rendered_on_dirty_nav')));
  assert.ok(evaluation.failures.some(f => f.includes('unsaved_changes_cancel_preserves_dirty_state')));
  assert.ok(evaluation.failures.some(f => f.includes('unsaved_changes_confirm_proceeds_navigation')));
});

test('Collector Negative 9: draft lost on cancel fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('unsaved_changes_cancel_preserves_dirty_state')));
});

test('Collector Negative 10: unchanged destination after confirm fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('unsaved_changes_confirm_proceeds_navigation')));
});

test('Collector Negative 11: unexecuted revise action fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b11_monthly_review_loop.review_revise_choice_triggers_revision = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('review_revise_choice_triggers_revision')));
});

test('Collector Negative 12: stale warning absent when over 30 days fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.stale_evidence_warning_displayed_when_over_30_days = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('stale_evidence_warning_displayed_when_over_30_days')));
});

test('Collector Negative 13: keyboard action not reaching target fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.keyboard_navigation_accessible = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('keyboard_navigation_accessible')));
});

test('Collector Negative 14: 3.1:1 small text contrast fails 4.5 requirement', () => {
  // #949494 on #ffffff is approx 3.1:1
  const ratio = calculateContrast('#949494', '#ffffff');
  assert.ok(ratio < 4.5, `Expected < 4.5, got ${ratio}`);
  const pass = !isNaN(ratio) && ratio >= 4.5;
  assert.equal(pass, false);

  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.contrast_review_badges_light_pass = pass;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('contrast_review_badges_light_pass')));
});

test('Collector Negative 15: transparent or unsupported colors return NaN and fail closed', () => {
  assert.ok(isNaN(calculateContrast('rgba(0,0,0,0.5)', '#ffffff')));
  assert.ok(isNaN(calculateContrast('invalid-color', '#ffffff')));
  assert.ok(isNaN(calculateContrast('#ffffff', 'rgba(0,0,0,0)')));

  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.contrast_review_badges_dark_pass = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('contrast_review_badges_dark_pass')));
});

test('Collector Negative 16: thrown step records failure and fails evaluation', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.status = 'FAILED';
  report.error = 'Uncaught evaluation error during step';

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('Recorded verification error')));
});

test('Collector Negative 17: report-write failure invalidates success and preserves error', () => {
  const report = { status: 'SUCCESS' };
  let calls = 0;
  assert.throws(() => persistEvidence(report, {}, () => {
    calls++;
    if (calls === 2) throw new Error('disk full');
  }), /disk full/);
  assert.equal(report.status, 'FAILED');
  assert.match(report.error, /Evidence write failed/);
  assert.equal(calls, 3);
});

test('Collector Negative 18: cleanup gate withholds Clerk deletion when app delete fails', async () => {
  const userId = 'user_synthetic_gate_test';
  let clerkDeleteCalled = false;

  const mockClerkClient = {
    users: {
      deleteUser: async () => { clerkDeleteCalled = true; },
      getUser: async () => ({ id: userId })
    }
  };
  const mockPage = {
    isClosed: () => false,
    evaluate: async () => ({ status: 500, ok: false })
  };
  const mockQueryD1 = async (sql) => {
    if (sql.includes('count(*)')) return [{ cnt: 1 }];
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

test('Collector Negative 19: focus occurs but activation has no effect fails closed', async () => {
  // 1. Exported collector unit assertion: focus occurs (3+ items, visible focus ring, target focused)
  // but activation produces no visible open/close effect on the DOM
  const evalResult = evaluateKeyboardActionProof({
    focusedCount: 5,
    hasFocusRing: true,
    targetFocused: true,
    actionActivated: false,
    openStateVerified: false,
    closeStateVerified: false
  });
  assert.equal(evalResult.passed, false);
  assert.match(evalResult.reason, /activation failed or had no effect/i);

  // 2. Exported execution helper with mock page:
  // Actual Tab presses focus elements with focus rings and reach target control,
  // but pressing Enter produces NO change in aria-expanded or dropdown visibility.
  let evaluateCallCount = 0;
  const mockPage = {
    locator: (selector) => ({
      click: async () => {},
      isVisible: async () => false // Dropdown stays hidden even after activation
    }),
    keyboard: {
      press: async (key) => {}
    },
    evaluate: async (fn) => {
      evaluateCallCount++;
      // Tab 1: Skip link (interactive with focus outline)
      if (evaluateCallCount === 1) {
        return { tag: 'A', isInteractive: true, hasVisibleFocus: true, isTarget: false };
      }
      // Tab 2: Brand link (interactive with focus outline)
      if (evaluateCallCount === 2) {
        return { tag: 'A', isInteractive: true, hasVisibleFocus: true, isTarget: false };
      }
      // Tab 3: Workspace button (target interactive control with focus outline)
      if (evaluateCallCount === 3) {
        return { tag: 'BUTTON', isInteractive: true, hasVisibleFocus: true, isTarget: true };
      }
      // Check initial state before activation: closed
      if (evaluateCallCount === 4) {
        return 'false';
      }
      // Check open state after Enter key press: BUG SIMULATION - remains 'false' (no effect)
      if (evaluateCallCount === 5) {
        return 'false';
      }
      // Check close state after Escape: 'false'
      return 'false';
    },
    waitForTimeout: async () => {}
  };

  const proofResult = await executeKeyboardActionProof(mockPage);
  assert.equal(proofResult.targetFocused, true, 'Target control should be focused');
  assert.equal(proofResult.hasFocusRing, true, 'Focus ring must be verified');
  assert.equal(proofResult.focusedCount >= 3, true, 'Sufficient interactive elements focused');
  assert.equal(proofResult.openStateVerified, false, 'Open state must fail when activation had no effect');
  assert.equal(proofResult.actionActivated, false, 'Action activation must be false');
  assert.equal(proofResult.passed, false, 'Proof must fail closed when activation has no effect');

  // 3. Connect to existing evaluator: report fails closed
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.keyboard_navigation_accessible = proofResult.passed;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some((f) => f.includes('keyboard_navigation_accessible')));
});

test('Collector Behavioral 20: target Workspace button reachable beyond 15-Tab window (at 30th step)', async () => {
  let evaluateCallCount = 0;
  let tabPressCount = 0;
  let isDropdownOpen = false;

  const mockPage = {
    locator: (selector) => ({
      click: async () => {},
      isVisible: async () => isDropdownOpen
    }),
    keyboard: {
      press: async (key) => {
        if (key === 'Tab') {
          tabPressCount++;
        } else if (key === 'Enter') {
          isDropdownOpen = true;
        } else if (key === 'Escape') {
          isDropdownOpen = false;
        }
      }
    },
    evaluate: async (fn) => {
      evaluateCallCount++;
      // Traversal step: step 1 to 29 are intermediate interactive elements with focus rings
      if (evaluateCallCount < 30) {
        return {
          tag: 'BUTTON',
          isInteractive: true,
          hasVisibleFocus: true,
          isTarget: false,
          key: `element-${evaluateCallCount}`
        };
      }
      // Step 30: Workspace navigation button target
      if (evaluateCallCount === 30) {
        return {
          tag: 'BUTTON',
          isInteractive: true,
          hasVisibleFocus: true,
          isTarget: true,
          key: 'workspace-navigation-button'
        };
      }
      // Step 31: initialExpanded before Enter
      if (evaluateCallCount === 31) {
        return isDropdownOpen ? 'true' : 'false';
      }
      // Step 32: openExpanded after Enter
      if (evaluateCallCount === 32) {
        return isDropdownOpen ? 'true' : 'false';
      }
      // Step 33: closeExpanded after Escape
      return isDropdownOpen ? 'true' : 'false';
    },
    waitForTimeout: async () => {}
  };

  const proofResult = await executeKeyboardActionProof(mockPage);
  assert.equal(proofResult.targetFocused, true, 'Target control at step 30 must be focused via extended traversal');
  assert.equal(proofResult.hasFocusRing, true, 'Focus ring must be verified on traversed elements');
  assert.ok(proofResult.focusedCount >= 30, `Expected at least 30 focused elements, got ${proofResult.focusedCount}`);
  assert.equal(proofResult.openStateVerified, true, 'Open state must be verified after Enter');
  assert.equal(proofResult.closeStateVerified, true, 'Close state must be verified after Escape');
  assert.equal(proofResult.actionActivated, true, 'Action activation must succeed');
  assert.equal(proofResult.passed, true, 'Proof must pass when target at step 30 is reached and activated');

  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.keyboard_navigation_accessible = proofResult.passed;
  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, true, 'Evaluator must accept report when keyboard proof succeeds');
});

test('Collector Behavioral 21: target never reachable fails closed with cycle detection', async () => {
  let evaluateCallCount = 0;
  let tabPressCount = 0;

  // 5 focusable elements looping cyclically; none is the target
  const mockPage = {
    locator: (selector) => ({
      click: async () => {},
      isVisible: async () => false
    }),
    keyboard: {
      press: async (key) => {
        if (key === 'Tab') {
          tabPressCount++;
        }
      }
    },
    evaluate: async (fn) => {
      evaluateCallCount++;
      const elementIndex = ((evaluateCallCount - 1) % 5) + 1;
      return {
        tag: 'BUTTON',
        isInteractive: true,
        hasVisibleFocus: true,
        isTarget: false,
        key: `cyclic-element-${elementIndex}`
      };
    },
    waitForTimeout: async () => {}
  };

  const proofResult = await executeKeyboardActionProof(mockPage);
  assert.equal(proofResult.targetFocused, false, 'Target should never be focused when unreachable');
  assert.equal(proofResult.passed, false, 'Proof must fail closed when target is unreachable');
  assert.ok(proofResult.reason.includes('not focused'), 'Failure reason should explain target was not focused');

  // Verify bounded latency: cycle detection terminates traversal without wasting full budget
  assert.ok(tabPressCount <= 10, `Expected early cycle termination (<= 10 tabs), but took ${tabPressCount} tabs`);

  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.keyboard_navigation_accessible = proofResult.passed;
  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false, 'Evaluator must reject report when keyboard proof fails');
  assert.ok(evaluation.failures.some((f) => f.includes('keyboard_navigation_accessible')));
});

test('Collector Behavioral 22: assertTargetLocatorVisible passes when visible and fails closed when missing/hidden', async () => {
  const visibleMock = {
    first: () => visibleMock,
    isVisible: async () => true
  };
  const resolved = await assertTargetLocatorVisible(visibleMock, 'test-element');
  assert.equal(resolved, visibleMock);

  const hiddenMock = {
    first: () => hiddenMock,
    isVisible: async () => false
  };
  await assert.rejects(
    async () => assertTargetLocatorVisible(hiddenMock, 'hidden-element'),
    /hidden-element is not visible on page/
  );

  const throwingMock = {
    first: () => throwingMock,
    isVisible: async () => { throw new Error('DOM detached'); }
  };
  await assert.rejects(
    async () => assertTargetLocatorVisible(throwingMock, 'detached-element'),
    /detached-element is not visible on page/
  );

  await assert.rejects(
    async () => assertTargetLocatorVisible(null, 'null-element'),
    /null-element is missing or undefined/
  );
});

test('Collector Behavioral 23: assertTargetLocatorVisible resolves visible element when earlier matched element is hidden', async () => {
  const hiddenEarlier = {
    isVisible: async () => false
  };
  const visibleMobileButton = {
    isVisible: async () => true
  };
  const multiLocatorAll = {
    all: async () => [hiddenEarlier, visibleMobileButton],
    first: () => hiddenEarlier,
    isVisible: async () => false
  };

  const resolvedAll = await assertTargetLocatorVisible(multiLocatorAll, 'navigation/action controls at 320px');
  assert.equal(resolvedAll, visibleMobileButton, 'Must resolve the visible mobile control rather than being masked by earlier hidden element (via all)');

  const multiLocatorNth = {
    count: async () => 2,
    nth: (i) => (i === 0 ? hiddenEarlier : visibleMobileButton),
    first: () => hiddenEarlier,
    isVisible: async () => false
  };

  const resolvedNth = await assertTargetLocatorVisible(multiLocatorNth, 'navigation/action controls at 320px');
  assert.equal(resolvedNth, visibleMobileButton, 'Must resolve the visible mobile control rather than being masked by earlier hidden element (via nth)');
});

test('Collector Negative 24: direct review POST alone fails full revise journey', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  // Simulates a direct POST where UI was never exercised
  report.b11_monthly_review_loop.review_revise_ui_selected = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('review_revise_ui_selected')));
});

test('Collector Negative 25: unpersisted Version 3 fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  // Simulates a scenario where Version 3 failed to save in D1
  report.b11_monthly_review_loop.plan_revised_version_3_persisted = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('plan_revised_version_3_persisted')));
});

test('Collector Negative 26: mutation of prior versions after Version 3 fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  // Simulates a mutation where Version 1 or 2 was altered when Version 3 was saved
  report.b11_monthly_review_loop.prior_versions_immutable_after_v3 = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('prior_versions_immutable_after_v3')));
});

test('Collector Negative 27: unverified Version 3 reload fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b11_monthly_review_loop.version_3_reload_verified = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('version_3_reload_verified')));
});

test('Collector Negative 28: review panel topbar overlap fails closed', () => {
  const report = buildBaselineValidReport();
  const cleanup = buildBaselineValidCleanup();
  report.b28_presentation_and_accessibility.review_panel_no_topbar_overlap = false;

  const evaluation = evaluateReport(report, cleanup);
  assert.equal(evaluation.passed, false);
  assert.ok(evaluation.failures.some(f => f.includes('review_panel_no_topbar_overlap')));
});

test('Collector Negative 29: verifyReviseUiSelection fails closed when radio is unchecked', () => {
  assert.equal(verifyReviseUiSelection(false).passed, false);
  assert.equal(verifyReviseUiSelection(null).passed, false);
  assert.equal(verifyReviseUiSelection(undefined).passed, false);
  assert.equal(verifyReviseUiSelection(true).passed, true);
});

// --- Helper functions for Raw D1 Schema Testing ---
function makeD1InputRow(planVersionId, annualExpense, extra = {}) {
  return {
    plan_version_id: planVersionId,
    user_id: 'user_synthetic_c09',
    input_json: JSON.stringify({
      calculatorMode: 'fire-number',
      plan: {
        annualExpense,
        currentAge: 30,
        expectedReturn: 0.07,
        inflationRate: 0.025,
        initialPortfolio: 500000,
        retirementAge: 55,
        swr: 0.04,
        ...extra
      }
    }),
    created_at: '2026-09-25T12:00:00.000Z'
  };
}

function makeD1ResultRow(planVersionId, requiredPortfolio, extra = {}) {
  return {
    plan_version_id: planVersionId,
    user_id: 'user_synthetic_c09',
    result_json: JSON.stringify({
      annualSavingsNeeded: 12000,
      fireNumber: requiredPortfolio,
      requiredPortfolio,
      yearsToFire: 25,
      ...extra
    }),
    created_at: '2026-09-25T12:00:00.000Z'
  };
}

function makeD1VersionRow(planVersionId, versionNumber) {
  return {
    id: planVersionId,
    plan_id: 'plan_synthetic_c09',
    user_id: 'user_synthetic_c09',
    version_number: versionNumber,
    label: `Version ${versionNumber}`,
    notes: `Notes for version ${versionNumber}`,
    created_at: '2026-09-25T12:00:00.000Z'
  };
}

function buildValidD1Fixtures() {
  const v2 = {
    version: [makeD1VersionRow('v2_id', 2)],
    inputs: [makeD1InputRow('v2_id', 50000)],
    results: [makeD1ResultRow('v2_id', 1250000)]
  };
  const v3 = {
    version: [makeD1VersionRow('v3_id', 3)],
    inputs: [makeD1InputRow('v3_id', 45000)],
    results: [makeD1ResultRow('v3_id', 1125000)]
  };
  return { v2, v3 };
}

test('Collector Positive: verifyFinancialRevisionDiff passes with valid raw D1 rows', () => {
  const { v2, v3 } = buildValidD1Fixtures();
  const res = verifyFinancialRevisionDiff(v2, v3);
  assert.equal(res.passed, true, `Expected pass, got: ${res.reason}`);
  assert.equal(res.v2Expense, 50000);
  assert.equal(res.v3Expense, 45000);
  assert.equal(res.v2Required, 1250000);
  assert.equal(res.v3Required, 1125000);
});

test('Collector Negative 30a: verifyFinancialRevisionDiff fails closed when Version 3 version, inputs, or results row is missing or empty', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Missing Version 3 version row
  const resNoVersion = verifyFinancialRevisionDiff(v2, { ...v3, version: [] });
  assert.equal(resNoVersion.passed, false);
  assert.ok(resNoVersion.reason.includes('version row'));

  // Missing Version 3 input row
  const resNoInputs = verifyFinancialRevisionDiff(v2, { ...v3, inputs: [] });
  assert.equal(resNoInputs.passed, false);
  assert.ok(resNoInputs.reason.includes('input row'));

  // Missing Version 3 result row
  const resNoResults = verifyFinancialRevisionDiff(v2, { ...v3, results: [] });
  assert.equal(resNoResults.passed, false);
  assert.ok(resNoResults.reason.includes('result row'));

  // Missing Version 2 input row
  const resNoV2Inputs = verifyFinancialRevisionDiff({ ...v2, inputs: [] }, v3);
  assert.equal(resNoV2Inputs.passed, false);
  assert.ok(resNoV2Inputs.reason.includes('Version 2'));

  // Missing Version 2 result row
  const resNoV2Results = verifyFinancialRevisionDiff({ ...v2, results: [] }, v3);
  assert.equal(resNoV2Results.passed, false);
  assert.ok(resNoV2Results.reason.includes('Version 2'));

  // Multiple rows (>1) in Version 3
  const resMultiV3 = verifyFinancialRevisionDiff(v2, {
    ...v3,
    inputs: [makeD1InputRow('v3_id', 45000), makeD1InputRow('v3_id_dup', 45000)]
  });
  assert.equal(resMultiV3.passed, false);
  assert.ok(resMultiV3.reason.includes('Expected exactly 1'));
});

test('Collector Negative 30b: verifyFinancialRevisionDiff fails closed on malformed input_json or result_json', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Malformed v2 input_json
  const resV2BadInput = verifyFinancialRevisionDiff(
    { ...v2, inputs: [{ ...v2.inputs[0], input_json: '{malformed: true,' }] },
    v3
  );
  assert.equal(resV2BadInput.passed, false);
  assert.ok(resV2BadInput.reason.includes('malformed JSON'));

  // Malformed v3 input_json
  const resV3BadInput = verifyFinancialRevisionDiff(
    v2,
    { ...v3, inputs: [{ ...v3.inputs[0], input_json: 'not_json_at_all' }] }
  );
  assert.equal(resV3BadInput.passed, false);
  assert.ok(resV3BadInput.reason.includes('malformed JSON'));

  // Malformed v2 result_json
  const resV2BadResult = verifyFinancialRevisionDiff(
    { ...v2, results: [{ ...v2.results[0], result_json: '{"unclosed": ' }] },
    v3
  );
  assert.equal(resV2BadResult.passed, false);
  assert.ok(resV2BadResult.reason.includes('malformed JSON'));

  // Malformed v3 result_json
  const resV3BadResult = verifyFinancialRevisionDiff(
    v2,
    { ...v3, results: [{ ...v3.results[0], result_json: '42_not_object' }] }
  );
  assert.equal(resV3BadResult.passed, false);
});

test('Collector Negative 30c: verifyFinancialRevisionDiff fails closed on missing or non-finite annualExpense or requiredPortfolio', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Missing annualExpense in v2
  const resV2NoExpense = verifyFinancialRevisionDiff(
    { ...v2, inputs: [{ ...v2.inputs[0], input_json: JSON.stringify({ plan: {} }) }] },
    v3
  );
  assert.equal(resV2NoExpense.passed, false);
  assert.ok(resV2NoExpense.reason.includes('missing finite snapshot.plan.annualExpense'));

  // Non-finite annualExpense in v3 (string instead of number)
  const resV3StrExpense = verifyFinancialRevisionDiff(
    v2,
    { ...v3, inputs: [{ ...v3.inputs[0], input_json: JSON.stringify({ plan: { annualExpense: '45000' } }) }] }
  );
  assert.equal(resV3StrExpense.passed, false);
  assert.ok(resV3StrExpense.reason.includes('missing finite snapshot.plan.annualExpense'));

  // Non-finite requiredPortfolio in v2
  const resV2NonFiniteResult = verifyFinancialRevisionDiff(
    { ...v2, results: [{ ...v2.results[0], result_json: JSON.stringify({ requiredPortfolio: 'invalid' }) }] },
    v3
  );
  assert.equal(resV2NonFiniteResult.passed, false);
  assert.ok(resV2NonFiniteResult.reason.includes('missing finite result.requiredPortfolio'));

  // Missing requiredPortfolio in v3
  const resV3NoResult = verifyFinancialRevisionDiff(
    v2,
    { ...v3, results: [{ ...v3.results[0], result_json: JSON.stringify({ other: 123 }) }] },
  );
  assert.equal(resV3NoResult.passed, false);
  assert.ok(resV3NoResult.reason.includes('missing finite result.requiredPortfolio'));
});

test('Collector Negative 30d: verifyFinancialRevisionDiff fails closed when Version 2 annualExpense is not 50000 or Version 3 is not 45000', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Version 2 annualExpense is 48000 instead of expected 50000
  const resWrongV2 = verifyFinancialRevisionDiff(
    { ...v2, inputs: [makeD1InputRow('v2_id', 48000)] },
    v3
  );
  assert.equal(resWrongV2.passed, false);
  assert.ok(resWrongV2.reason.includes('Expected Version 2 annualExpense to be 50000'));

  // Version 3 annualExpense is 40000 instead of expected 45000
  const resWrongV3 = verifyFinancialRevisionDiff(
    v2,
    { ...v3, inputs: [makeD1InputRow('v3_id', 40000)] }
  );
  assert.equal(resWrongV3.passed, false);
  assert.ok(resWrongV3.reason.includes('Expected Version 3 annualExpense to be 45000'));
});

test('Collector Negative 30e: verifyFinancialRevisionDiff fails closed when financial assumption is unchanged', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Version 3 annualExpense unchanged at 50000
  const resUnchanged = verifyFinancialRevisionDiff(
    v2,
    { ...v3, inputs: [makeD1InputRow('v3_id', 50000)] }
  );
  assert.equal(resUnchanged.passed, false);
  assert.ok(resUnchanged.reason.includes('annualExpense'));
});

test('Collector Negative 31: verifyFinancialRevisionDiff fails closed when calculation result is unchanged', () => {
  const { v2, v3 } = buildValidD1Fixtures();

  // Version 3 result unchanged at 1250000 (same as v2)
  const resUnchangedResult = verifyFinancialRevisionDiff(
    v2,
    { ...v3, results: [makeD1ResultRow('v3_id', 1250000)] }
  );
  assert.equal(resUnchangedResult.passed, false);
  assert.ok(resUnchangedResult.reason.includes('Calculation result unchanged'));
});

test('Collector Negative 32a: verifyPriorVersionsImmutability fails closed when any table set has missing or multiple rows', () => {
  const buildSnapshots = () => ({
    v1Before: {
      version: [makeD1VersionRow('v1_id', 1)],
      inputs: [makeD1InputRow('v1_id', 40000)],
      results: [makeD1ResultRow('v1_id', 1000000)]
    },
    v1After: {
      version: [makeD1VersionRow('v1_id', 1)],
      inputs: [makeD1InputRow('v1_id', 40000)],
      results: [makeD1ResultRow('v1_id', 1000000)]
    },
    v2Before: {
      version: [makeD1VersionRow('v2_id', 2)],
      inputs: [makeD1InputRow('v2_id', 50000)],
      results: [makeD1ResultRow('v2_id', 1250000)]
    },
    v2After: {
      version: [makeD1VersionRow('v2_id', 2)],
      inputs: [makeD1InputRow('v2_id', 50000)],
      results: [makeD1ResultRow('v2_id', 1250000)]
    }
  });

  // Case A: 0 rows in v1Before.version
  const snaps1 = buildSnapshots();
  snaps1.v1Before.version = [];
  const res0Row = verifyPriorVersionsImmutability(snaps1.v1Before, snaps1.v1After, snaps1.v2Before, snaps1.v2After);
  assert.equal(res0Row.passed, false);
  assert.ok(res0Row.reason.includes('Expected exactly 1 row'));

  // Case B: 0 rows in v2After.results
  const snaps2 = buildSnapshots();
  snaps2.v2After.results = [];
  const res0RowAfter = verifyPriorVersionsImmutability(snaps2.v1Before, snaps2.v1After, snaps2.v2Before, snaps2.v2After);
  assert.equal(res0RowAfter.passed, false);
  assert.ok(res0RowAfter.reason.includes('Expected exactly 1 row'));

  // Case C: 2 rows in v1After.inputs
  const snaps3 = buildSnapshots();
  snaps3.v1After.inputs = [makeD1InputRow('v1_id', 40000), makeD1InputRow('v1_id', 40000)];
  const res2Row = verifyPriorVersionsImmutability(snaps3.v1Before, snaps3.v1After, snaps3.v2Before, snaps3.v2After);
  assert.equal(res2Row.passed, false);
  assert.ok(res2Row.reason.includes('Expected exactly 1 row'));
});

test('Collector Negative 32b: verifyPriorVersionsImmutability fails closed when prior version inputs or results mutate', () => {
  const v1Before = {
    version: [makeD1VersionRow('v1_id', 1)],
    inputs: [makeD1InputRow('v1_id', 40000)],
    results: [makeD1ResultRow('v1_id', 1000000)]
  };
  const v2Before = {
    version: [makeD1VersionRow('v2_id', 2)],
    inputs: [makeD1InputRow('v2_id', 50000)],
    results: [makeD1ResultRow('v2_id', 1250000)]
  };

  // Case A: v1 results mutated
  const v1MutatedResults = {
    version: [makeD1VersionRow('v1_id', 1)],
    inputs: [makeD1InputRow('v1_id', 40000)],
    results: [makeD1ResultRow('v1_id', 999999)] // Mutated!
  };
  const resMutatedV1 = verifyPriorVersionsImmutability(v1Before, v1MutatedResults, v2Before, v2Before);
  assert.equal(resMutatedV1.passed, false);
  assert.ok(resMutatedV1.reason.includes('Version 1 mutated'));

  // Case B: v2 inputs mutated
  const v2MutatedInputs = {
    version: [makeD1VersionRow('v2_id', 2)],
    inputs: [makeD1InputRow('v2_id', 45000)], // Mutated!
    results: [makeD1ResultRow('v2_id', 1250000)]
  };
  const resMutatedV2 = verifyPriorVersionsImmutability(v1Before, v1Before, v2Before, v2MutatedInputs);
  assert.equal(resMutatedV2.passed, false);
  assert.ok(resMutatedV2.reason.includes('Version 2 mutated'));

  // Case C: byte-identical passes
  const resIdentical = verifyPriorVersionsImmutability(v1Before, v1Before, v2Before, v2Before);
  assert.equal(resIdentical.passed, true);
});

test('Collector Negative 33: verifyIdempotentReplay fails closed on mismatched replay key or missing persisted key', () => {
  const persistedReview = {
    id: 'rev_123',
    idempotency_key: 'v2:2026-09-25',
    decision: 'revise',
    evidence_date: '2026-09-25'
  };

  // Replay using mismatched key
  const resMismatched = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'wrong-key-c09',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: true },
    reviewCount: 1
  });
  assert.equal(resMismatched.passed, false);
  assert.ok(resMismatched.reason.includes('Mismatched replay key'));

  // Persisted review with empty key
  const resEmptyKey = verifyIdempotentReplay({
    persistedReview: { ...persistedReview, idempotency_key: '' },
    replayKey: '',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: true },
    reviewCount: 1
  });
  assert.equal(resEmptyKey.passed, false);
  assert.ok(resEmptyKey.reason.includes('empty idempotency_key'));
});

test('Collector Negative 34: verifyIdempotentReplay fails closed on exact replay if isDuplicate is missing/false, status not 200, or reviewCount !== 1', () => {
  const persistedReview = {
    id: 'rev_123',
    idempotency_key: 'v2:2026-09-25',
    decision: 'revise',
    evidence_date: '2026-09-25'
  };

  // Absent isDuplicate in response body
  const resNoDuplicateFlag = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: {}, // Missing isDuplicate: true!
    reviewCount: 1
  });
  assert.equal(resNoDuplicateFlag.passed, false);
  assert.ok(resNoDuplicateFlag.reason.includes('isDuplicate: true'));

  // isDuplicate is explicitly false
  const resDuplicateFalse = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: false },
    reviewCount: 1
  });
  assert.equal(resDuplicateFalse.passed, false);

  // Status is 201 instead of 200
  const resWrongStatus = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'revise',
    replayStatus: 201, // Should be 200 for duplicate!
    replayBody: { isDuplicate: true },
    reviewCount: 1
  });
  assert.equal(resWrongStatus.passed, false);
  assert.ok(resWrongStatus.reason.includes('HTTP 200'));

  // Replay created duplicate row in D1 (count = 2)
  const resDupRow = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: true },
    reviewCount: 2 // Duplicate row!
  });
  assert.equal(resDupRow.passed, false);
  assert.ok(resDupRow.reason.includes('expected 1 review row'));
});

test('Collector Negative 35: verifyIdempotentReplay fails closed on conflicting intent if status not 409, code not IDEMPOTENCY_CONFLICT, count !== 1, or row mutated', () => {
  const persistedReview = {
    id: 'rev_123',
    idempotency_key: 'v2:2026-09-25',
    decision: 'revise',
    evidence_date: '2026-09-25'
  };

  // Status is 200 instead of 409
  const resWrongStatus = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 200, // Should be 409!
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    reviewCount: 1
  });
  assert.equal(resWrongStatus.passed, false);
  assert.ok(resWrongStatus.reason.includes('expected HTTP 409'));

  // Wrong error code
  const resWrongCode = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'BAD_REQUEST' }, // Wrong code!
    reviewCount: 1
  });
  assert.equal(resWrongCode.passed, false);
  assert.ok(resWrongCode.reason.includes('code IDEMPOTENCY_CONFLICT'));

  // Missing response body
  const resNoBody = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    reviewCount: 1
  });
  assert.equal(resNoBody.passed, false);

  // Review count in D1 after conflict is 2 (second row created!)
  const resSecondRow = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    reviewCount: 2 // Second row!
  });
  assert.equal(resSecondRow.passed, false);
  assert.ok(resSecondRow.reason.includes('expected 1 review row after conflict'));

  // Post-conflict review had its decision mutated
  const resMutatedDecision = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    reviewCount: 1,
    postConflictReview: { ...persistedReview, decision: 'keep' } // Mutated!
  });
  assert.equal(resMutatedDecision.passed, false);
  assert.ok(resMutatedDecision.reason.includes('mutated original review decision'));

  // Post-conflict review had its idempotency key mutated
  const resMutatedKey = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    reviewCount: 1,
    postConflictReview: { ...persistedReview, idempotency_key: 'mutated-key' }
  });
  assert.equal(resMutatedKey.passed, false);
  assert.ok(resMutatedKey.reason.includes('mutated original idempotency key'));
});

test('Collector Positive: verifyIdempotentReplay passes valid exact replay and valid conflicting replay', () => {
  const persistedReview = {
    id: 'rev_123',
    idempotency_key: 'v2:2026-09-25',
    decision: 'revise',
    evidence_date: '2026-09-25'
  };

  // Valid exact replay
  const validExact = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: true, review: persistedReview },
    reviewCount: 1
  });
  assert.equal(validExact.passed, true);

  // Valid conflicting replay
  const validConflict = verifyIdempotentReplay({
    persistedReview,
    replayKey: 'v2:2026-09-25',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT', error: 'Conflicting review' },
    reviewCount: 1,
    postConflictReview: persistedReview
  });
  assert.equal(validConflict.passed, true);
});

test('Collector Negative 36: verifyClearance fails closed when topbar overlaps review heading or badge', () => {
  // Case A: topbar overlaps heading
  const occludedHeading = [
    {
      modeLabel: 'Desktop 1280px light',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 65, height: 28 }, // 65 < 72 (overlap!)
      badgeBox: { y: 110, height: 24 }
    }
  ];
  const resHeading = verifyClearance(occludedHeading);
  assert.equal(resHeading.passed, false);
  assert.ok(resHeading.reason.includes('occludes review heading'));

  // Case B: topbar overlaps badge
  const occludedBadge = [
    {
      modeLabel: 'Mobile 320px dark',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 80, height: 28 },
      badgeBox: { y: 70, height: 24 } // 70 < 72 (overlap!)
    }
  ];
  const resBadge = verifyClearance(occludedBadge);
  assert.equal(resBadge.passed, false);
  assert.ok(resBadge.reason.includes('occludes review badge'));

  // Case C: Positive clearance passes
  const clearCases = [
    {
      modeLabel: 'Desktop 1280px light',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 96, height: 28 }, // 96 > 72
      badgeBox: { y: 135, height: 24 } // 135 > 72
    },
    {
      modeLabel: 'Mobile 320px dark',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 92, height: 28 }, // 92 > 72
      badgeBox: { y: 130, height: 24 } // 130 > 72
    }
  ];
  const resClear = verifyClearance(clearCases);
  assert.equal(resClear.passed, true);
});

test('Fixture Server Security: createFixtureServer enforces path traversal and allowlist defense', async () => {
  const server = createFixtureServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;

  try {
    // 1. Path traversal rejected with 403 (using harmless path)
    const traversalStatus = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/../harmless_outside_fixture.txt' }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(traversalStatus, 403, `Expected 403 for path traversal, got ${traversalStatus}`);

    // 2. Unlisted asset rejected with 404
    const unlistedStatus = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/harmless_unlisted_fixture.json' }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(unlistedStatus, 404, `Expected 404 for unlisted asset, got ${unlistedStatus}`);

    // 3. Allowlisted asset returns 200
    const allowlistedStatus = await new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port, path: '/src/styles.css' }, (res) => {
        resolve(res.statusCode);
      });
      req.on('error', reject);
      req.end();
    });
    assert.equal(allowlistedStatus, 200, `Expected 200 for allowlisted asset, got ${allowlistedStatus}`);
  } finally {
    server.close();
  }
});

test('Collector Positive: Truthful synthetic seed accepts v2-to-v3 revision with calculateFirePlan results', async () => {
  const calculateFirePlan = await loadCalculateFirePlan();

  const v2Plan = {
    annualExpense: 50000,
    initialPortfolio: 600000,
    withdrawalTiming: 'start',
    desiredFinalValue: 0,
    ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }],
    oneOffEvents: []
  };
  const v2Snapshot = {
    calculatorMode: 'fire-number',
    timeline: { currentAge: 35, retirementAge: 52, planEndAge: 90 },
    scenarios: [],
    plan: v2Plan
  };
  const v2Result = calculateFirePlan(v2Plan);

  const v3Plan = {
    annualExpense: 45000,
    initialPortfolio: 600000,
    withdrawalTiming: 'start',
    desiredFinalValue: 0,
    ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }],
    oneOffEvents: []
  };
  const v3Snapshot = {
    calculatorMode: 'fire-number',
    timeline: { currentAge: 35, retirementAge: 52, planEndAge: 90 },
    scenarios: [],
    plan: v3Plan
  };
  const v3Result = calculateFirePlan(v3Plan);

  // Exact D1 raw shape
  const v2Data = {
    inputs: [{ input_json: JSON.stringify(v2Snapshot) }],
    results: [{ result_json: JSON.stringify(v2Result) }]
  };
  const v3Data = {
    version: [{ id: 'ver_3', version_number: 3 }],
    inputs: [{ input_json: JSON.stringify(v3Snapshot) }],
    results: [{ result_json: JSON.stringify(v3Result) }]
  };

  const diffResult = verifyFinancialRevisionDiff(v2Data, v3Data);
  assert.equal(diffResult.passed, true);
  assert.equal(diffResult.v2Expense, 50000);
  assert.equal(diffResult.v3Expense, 45000);
  assert.ok(Number.isFinite(diffResult.v2Required));
  assert.ok(Number.isFinite(diffResult.v3Required));
  assert.notEqual(diffResult.v2Required, diffResult.v3Required);
});

test('Collector Negative 37: verifyFinancialRevisionDiff fails closed on old fake result shape without requiredPortfolio', () => {
  const oldFakeV2Result = { success: true, fireNumber: 1250000, yearsToFire: 17 };
  const v3Result = { requiredPortfolio: 832158, maxAnnualExpense: 45000 };

  const v2Data = {
    inputs: [{ input_json: JSON.stringify({ plan: { annualExpense: 50000 } }) }],
    results: [{ result_json: JSON.stringify(oldFakeV2Result) }]
  };
  const v3Data = {
    version: [{ id: 'ver_3', version_number: 3 }],
    inputs: [{ input_json: JSON.stringify({ plan: { annualExpense: 45000 } }) }],
    results: [{ result_json: JSON.stringify(v3Result) }]
  };

  const diffResult = verifyFinancialRevisionDiff(v2Data, v3Data);
  assert.equal(diffResult.passed, false);
  assert.ok(diffResult.reason.includes('Version 2 missing finite result.requiredPortfolio'));
});

test('Collector Positive: verifyIdempotentReplay passes real three-review sequence with defer, keep, and revise', () => {
  const v1Defer = {
    id: 'rev_v1_defer',
    plan_id: 'plan_1',
    plan_version_number: 1,
    idempotency_key: 'defer-key-1',
    decision: 'defer',
    evidence_date: '2026-09-20'
  };
  const v1Keep = {
    id: 'rev_v1_keep',
    plan_id: 'plan_1',
    plan_version_number: 1,
    idempotency_key: 'keep-key-1',
    decision: 'keep',
    evidence_date: '2026-09-22'
  };
  const v2Revise = {
    id: 'rev_v2_revise',
    plan_id: 'plan_1',
    plan_version_number: 2,
    idempotency_key: 'revise-key-2',
    decision: 'revise',
    evidence_date: '2026-09-25',
    notes: 'Revise assumptions'
  };

  // Full plan reviews history before replay: 3 rows
  const allReviewsBefore = [v1Defer, v1Keep, v2Revise];
  const totalReviewsBefore = allReviewsBefore.length; // 3

  // Scoped query for the revise review row by plan_id, plan_version_number, and idempotency_key
  const scopedReviewsBefore = allReviewsBefore.filter(
    (r) => r.plan_id === 'plan_1' && r.plan_version_number === 2 && r.idempotency_key === 'revise-key-2'
  );
  assert.equal(scopedReviewsBefore.length, 1);

  // Exact replay of the revise review
  const exactResult = verifyIdempotentReplay({
    persistedReview: v2Revise,
    replayKey: 'revise-key-2',
    replayDecision: 'revise',
    replayStatus: 200,
    replayBody: { isDuplicate: true, review: v2Revise },
    scopedReviewCount: scopedReviewsBefore.length,
    totalReviewsBefore,
    totalReviewsAfter: totalReviewsBefore,
    expectedTotalReviews: 3
  });
  assert.equal(exactResult.passed, true);

  // Conflicting replay (attempting 'keep' under same idempotency key 'revise-key-2')
  // Post-conflict query scoped by plan_id, plan_version_number, and idempotency_key yields original row
  const scopedReviewsAfterConflict = [v2Revise];
  const totalReviewsAfterConflict = 3;

  const conflictResult = verifyIdempotentReplay({
    persistedReview: v2Revise,
    replayKey: 'revise-key-2',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT', error: 'Conflicting review' },
    scopedReviewCount: scopedReviewsAfterConflict.length,
    totalReviewsBefore,
    totalReviewsAfter: totalReviewsAfterConflict,
    expectedTotalReviews: 3,
    postConflictReview: scopedReviewsAfterConflict[0]
  });
  assert.equal(conflictResult.passed, true);
});

test('Collector Negative 38: verifyIdempotentReplay fails closed on missing postConflictReview or duplicate row after conflict', () => {
  const v2Revise = {
    id: 'rev_v2_revise',
    plan_id: 'plan_1',
    plan_version_number: 2,
    idempotency_key: 'revise-key-2',
    decision: 'revise'
  };

  // Missing postConflictReview fails closed
  const resMissingPost = verifyIdempotentReplay({
    persistedReview: v2Revise,
    replayKey: 'revise-key-2',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    scopedReviewCount: 1,
    totalReviewsBefore: 3,
    totalReviewsAfter: 3,
    postConflictReview: null
  });
  assert.equal(resMissingPost.passed, false);
  assert.ok(resMissingPost.reason.includes('requires postConflictReview'));

  // Duplicate matching row after conflict (scoped count = 2) fails closed
  const resDuplicateScoped = verifyIdempotentReplay({
    persistedReview: v2Revise,
    replayKey: 'revise-key-2',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    scopedReviewCount: 2,
    totalReviewsBefore: 3,
    totalReviewsAfter: 4,
    postConflictReview: v2Revise
  });
  assert.equal(resDuplicateScoped.passed, false);
  assert.ok(resDuplicateScoped.reason.includes('expected 1 review row after conflict'));

  // Total count increased (e.g. 3 -> 4) fails closed
  const resTotalCountIncrease = verifyIdempotentReplay({
    persistedReview: v2Revise,
    replayKey: 'revise-key-2',
    replayDecision: 'keep',
    replayStatus: 409,
    replayBody: { code: 'IDEMPOTENCY_CONFLICT' },
    scopedReviewCount: 1,
    totalReviewsBefore: 3,
    totalReviewsAfter: 4,
    expectedTotalReviews: 3,
    postConflictReview: v2Revise
  });
  assert.equal(resTotalCountIncrease.passed, false);
  assert.ok(resTotalCountIncrease.reason.includes('Total plan review count changed'));
});

test('Collector Negative 39: validateDeploymentInputs fails closed on missing or malformed inputs', () => {
  // Missing candidate SHA
  assert.throws(() => {
    validateDeploymentInputs({
      C09_DEPLOYMENT_ID: '51acbf88-db0a-47d1-b399-814dad835a9b',
      C09_PREVIEW_URL: 'https://test-preview.interactive-fire-calculator.pages.dev'
    });
  }, /Missing required environment variable: C09_CANDIDATE_SHA/);

  // Malformed candidate SHA (not 40-char hex)
  assert.throws(() => {
    validateDeploymentInputs({
      C09_CANDIDATE_SHA: 'invalid-sha-too-short',
      C09_DEPLOYMENT_ID: '51acbf88-db0a-47d1-b399-814dad835a9b',
      C09_PREVIEW_URL: 'https://test-preview.interactive-fire-calculator.pages.dev'
    });
  }, /Invalid C09_CANDIDATE_SHA format/);

  // Missing deployment ID
  assert.throws(() => {
    validateDeploymentInputs({
      C09_CANDIDATE_SHA: '0123456789abcdef0123456789abcdef01234567',
      C09_PREVIEW_URL: 'https://test-preview.interactive-fire-calculator.pages.dev'
    });
  }, /Missing required environment variable: C09_DEPLOYMENT_ID/);

  // Malformed deployment ID (not UUID)
  assert.throws(() => {
    validateDeploymentInputs({
      C09_CANDIDATE_SHA: '0123456789abcdef0123456789abcdef01234567',
      C09_DEPLOYMENT_ID: 'not-a-uuid',
      C09_PREVIEW_URL: 'https://test-preview.interactive-fire-calculator.pages.dev'
    });
  }, /Invalid C09_DEPLOYMENT_ID format/);

  // Missing preview URL
  assert.throws(() => {
    validateDeploymentInputs({
      C09_CANDIDATE_SHA: '0123456789abcdef0123456789abcdef01234567',
      C09_DEPLOYMENT_ID: '51acbf88-db0a-47d1-b399-814dad835a9b'
    });
  }, /Missing required environment variable: C09_PREVIEW_URL/);

  // Malformed preview URL (not pages.dev)
  assert.throws(() => {
    validateDeploymentInputs({
      C09_CANDIDATE_SHA: '0123456789abcdef0123456789abcdef01234567',
      C09_DEPLOYMENT_ID: '51acbf88-db0a-47d1-b399-814dad835a9b',
      C09_PREVIEW_URL: 'https://malicious-site.example.com'
    });
  }, /Invalid C09_PREVIEW_URL format/);
});

test('Collector Positive: validateDeploymentInputs parses valid runtime inputs and verifyDeployment validates metadata', async () => {
  const validEnv = {
    C09_CANDIDATE_SHA: 'abcdef0123456789abcdef0123456789abcdef01',
    C09_DEPLOYMENT_ID: '12345678-1234-1234-1234-1234567890ab',
    C09_PREVIEW_URL: 'https://fresh-preview.interactive-fire-calculator.pages.dev'
  };

  const config = validateDeploymentInputs(validEnv);
  assert.equal(config.candidateSha, validEnv.C09_CANDIDATE_SHA);
  assert.equal(config.deploymentId, validEnv.C09_DEPLOYMENT_ID);
  assert.equal(config.previewUrl, validEnv.C09_PREVIEW_URL);
  assert.equal(config.previewDbId, PREVIEW_DB_ID);

  // Mock Cloudflare API fetch for verifyDeployment
  const mockFetchMatching = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      result: {
        environment: 'preview',
        url: validEnv.C09_PREVIEW_URL,
        latest_stage: { status: 'success' },
        deployment_trigger: { metadata: { commit_hash: validEnv.C09_CANDIDATE_SHA } },
        d1_databases: { DB: { id: PREVIEW_DB_ID } }
      }
    })
  });

  const verified = await verifyDeployment(config, mockFetchMatching, 'mock-token');
  assert.equal(verified.verified, true);
  assert.equal(verified.candidateSha, validEnv.C09_CANDIDATE_SHA);
});

test('Collector Negative 40: verifyDeployment fails closed on mismatched Cloudflare deployment metadata', async () => {
  const config = {
    candidateSha: 'abcdef0123456789abcdef0123456789abcdef01',
    deploymentId: '12345678-1234-1234-1234-1234567890ab',
    previewUrl: 'https://fresh-preview.interactive-fire-calculator.pages.dev',
    previewDbId: PREVIEW_DB_ID,
    accountId: 'test-account'
  };

  // Case A: Production environment instead of preview
  const mockFetchProduction = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      result: {
        environment: 'production', // Wrong environment!
        url: config.previewUrl,
        latest_stage: { status: 'success' },
        deployment_trigger: { metadata: { commit_hash: config.candidateSha } },
        d1_databases: { DB: { id: PREVIEW_DB_ID } }
      }
    })
  });
  await assert.rejects(
    () => verifyDeployment(config, mockFetchProduction, 'mock-token'),
    /Deployment environment must be "preview"/
  );

  // Case B: Commit hash mismatch
  const mockFetchHashMismatch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      result: {
        environment: 'preview',
        url: config.previewUrl,
        latest_stage: { status: 'success' },
        deployment_trigger: { metadata: { commit_hash: 'different_hash_000000000000000000000000' } },
        d1_databases: { DB: { id: PREVIEW_DB_ID } }
      }
    })
  });
  await assert.rejects(
    () => verifyDeployment(config, mockFetchHashMismatch, 'mock-token'),
    /Deployment commit hash mismatch/
  );

  // Case C: D1 database mismatch (e.g. accidentally pointing to production D1)
  const mockFetchDbMismatch = async () => ({
    ok: true,
    json: async () => ({
      success: true,
      result: {
        environment: 'preview',
        url: config.previewUrl,
        latest_stage: { status: 'success' },
        deployment_trigger: { metadata: { commit_hash: config.candidateSha } },
        d1_databases: { DB: { id: 'production-db-uuid-wrong' } }
      }
    })
  });
  await assert.rejects(
    () => verifyDeployment(config, mockFetchDbMismatch, 'mock-token'),
    /Deployment D1 database mismatch/
  );
});

test('Collector Negative 41: verifyClearance fails closed when focused control is occluded by topbar', () => {
  const occludedControl = [
    {
      modeLabel: 'Desktop 1280px light',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 80, height: 28 }, // 80 > 72 (clear)
      badgeBox: { y: 120, height: 24 }, // 120 > 72 (clear)
      controlBox: { y: 65, height: 36 } // 65 < 72 (occluded!)
    }
  ];
  const res = verifyClearance(occludedControl);
  assert.equal(res.passed, false);
  assert.ok(res.reason.includes('occludes focused review control'));

  // When control is clear
  const clearControl = [
    {
      modeLabel: 'Desktop 1280px light',
      topbarBox: { y: 0, height: 72 },
      headingBox: { y: 80, height: 28 },
      badgeBox: { y: 120, height: 24 },
      controlBox: { y: 160, height: 36 } // 160 > 72 (clear)
    }
  ];
  const resClear = verifyClearance(clearControl);
  assert.equal(resClear.passed, true);
});
