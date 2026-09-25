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
  sRgbLuminance,
  evaluateKeyboardActionProof,
  executeKeyboardActionProof
} from './run_c09_proofs.mjs';

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

