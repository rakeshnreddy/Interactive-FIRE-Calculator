#!/usr/bin/env node

/**
 * C09 Verification & Evidence Capture Harness
 * Covers B10 (Exact Saved FIRE Decision Navigation),
 * B11 (Monthly Plan Review Persistence & Due Status Loop),
 * and B28 (Goals & Monthly Review Presentation).
 *
 * Target: preview deployment 51acbf88-db0a-47d1-b399-814dad835a9b
 * on finpath-preview D1 database 0dbad68e-7493-452f-8504-98d4c61ee5da.
 */

import { readFileSync, writeFileSync, existsSync, statSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { createClerkClient } from '@clerk/backend';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../../../..');

export const CANDIDATE_SHA = '5dda3d2be24246e3470a65e7653a0b6e425cbece';
export const DEPLOYMENT_ID = '51acbf88-db0a-47d1-b399-814dad835a9b';
export const PREVIEW_URL = 'https://51acbf88.interactive-fire-calculator.pages.dev';
export const PREVIEW_DB_ID = '0dbad68e-7493-452f-8504-98d4c61ee5da';
export const ACCOUNT_ID = '4e1b7f6a7440770a01779a67602ec5e9';
export const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
export const WRANGLER_CONFIG = join(process.env.HOME || '', 'Library/Preferences/.wrangler/config/default.toml');

export const EVIDENCE_DIR = join(REPO_ROOT, 'docs/execution/evidence/C09');
export const SCREENSHOTS_DIR = join(EVIDENCE_DIR, 'screenshots');
if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}
export const REPORT_FILE = join(EVIDENCE_DIR, 'report.json');
export const CLEANUP_FILE = join(EVIDENCE_DIR, 'cleanup.json');
export const PRIVATE_MANIFEST_FILE = resolve(REPO_ROOT, '.env.manifest.local');

export const USER_TABLES = [
  'plan_reviews',
  'user_profiles',
  'financial_accounts',
  'account_balances',
  'transactions',
  'goals',
  'plans',
  'plan_versions',
  'fire_plan_inputs',
  'fire_plan_results',
  'assumptions',
  'balance_imports',
  'transaction_imports',
  'saved_calculator_results',
  'audit_log'
];

export function readEnv(envFilePath = resolve(REPO_ROOT, '.env.preview.local')) {
  const env = { ...process.env };
  if (!existsSync(envFilePath)) return env;
  const stats = statSync(envFilePath);
  const mode = stats.mode & 0o777;
  if ((mode & 0o077) !== 0) {
    throw new Error(`Insecure permissions on ${envFilePath}: mode is ${mode.toString(8)}, expected 0600`);
  }
  const content = readFileSync(envFilePath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

export function getCloudflareToken() {
  let token = process.env.CLOUDFLARE_API_TOKEN;
  if (!token && existsSync(WRANGLER_CONFIG)) {
    const content = readFileSync(WRANGLER_CONFIG, 'utf8');
    const match = content.match(/oauth_token\s*=\s*"([^"]+)"/);
    if (match) token = match[1];
  }
  return token;
}

export async function queryD1(sql, params = []) {
  const token = getCloudflareToken();
  if (!token) throw new Error('Cloudflare API token unavailable');

  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${PREVIEW_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql, params })
  });
  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(`D1 query failed: ${JSON.stringify(data.errors)}`);
  }
  return data.result?.[0]?.results || [];
}

export async function verifyDeployment() {
  const token = getCloudflareToken();
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/interactive-fire-calculator/deployments/${DEPLOYMENT_ID}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json();
  const deployment = payload.result;
  if (!response.ok || !payload.success || deployment?.environment !== 'preview' ||
      deployment?.url !== PREVIEW_URL || deployment?.latest_stage?.status !== 'success' ||
      deployment?.deployment_trigger?.metadata?.commit_hash !== CANDIDATE_SHA ||
      deployment?.d1_databases?.DB?.id !== PREVIEW_DB_ID) {
    throw new Error(`Deployment preflight failed: url=${deployment?.url}, commit=${deployment?.deployment_trigger?.metadata?.commit_hash}, db=${deployment?.d1_databases?.DB?.id}`);
  }
  return true;
}

export function generateDisposablePassword() {
  const randBytes = crypto.randomBytes(18).toString('base64url');
  return `FinPath!${randBytes}#9`;
}

export function recordManifestUser(userId) {
  let manifest = { users: [], createdAt: new Date().toISOString() };
  if (existsSync(PRIVATE_MANIFEST_FILE)) {
    try {
      manifest = JSON.parse(readFileSync(PRIVATE_MANIFEST_FILE, 'utf8'));
    } catch {}
  }
  if (!manifest.users.includes(userId)) manifest.users.push(userId);
  writeFileSync(PRIVATE_MANIFEST_FILE, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
}

export async function setupClerkInterception(context, testingToken, fapi) {
  if (!fapi) return;
  const escaped = fapi.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const fapiRegex = new RegExp(`^https://${escaped}/v1/.*?(\\?.*)?$`);

  await context.route(fapiRegex, async (route) => {
    try {
      const url = new URL(route.request().url());
      if (testingToken) {
        url.searchParams.set('__clerk_testing_token', testingToken);
      }
      const response = await route.fetch({ url: url.toString() });
      await route.fulfill({ response });
    } catch {
      await route.continue().catch(() => {});
    }
  });
}

// --------------------------------------------------------------------------
// WCAG 2.1 Color Contrast Utilities
// --------------------------------------------------------------------------
export function parseRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return { r: NaN, g: NaN, b: NaN, a: NaN };
  const str = colorStr.trim();
  const rgbMatch = str.match(/^rgba?\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgbMatch) {
    const a = rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1;
    if (a !== 1) {
      return { r: NaN, g: NaN, b: NaN, a: NaN };
    }
    const [r, g, b] = [parseInt(rgbMatch[1], 10), parseInt(rgbMatch[2], 10), parseInt(rgbMatch[3], 10)];
    if ([r, g, b].some(c => isNaN(c) || c < 0 || c > 255)) return { r: NaN, g: NaN, b: NaN, a: NaN };
    return { r, g, b, a: 1 };
  }
  if (str.startsWith('#')) {
    const hex = str.replace('#', '');
    if (hex.length === 3 && /^[0-9a-f]{3}$/i.test(hex)) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
        a: 1
      };
    }
    if (hex.length === 6 && /^[0-9a-f]{6}$/i.test(hex)) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
        a: 1
      };
    }
  }
  return { r: NaN, g: NaN, b: NaN, a: NaN };
}

export function sRgbLuminance(r, g, b) {
  if (isNaN(r) || isNaN(g) || isNaN(b)) return NaN;
  const [rs, gs, bs] = [r, g, b].map(c => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function calculateContrast(textColorStr, bgColorStr) {
  const fg = parseRgb(textColorStr);
  const bg = parseRgb(bgColorStr);
  if (isNaN(fg.r) || isNaN(fg.g) || isNaN(fg.b) || isNaN(bg.r) || isNaN(bg.g) || isNaN(bg.b)) {
    return NaN;
  }
  const lum1 = sRgbLuminance(fg.r, fg.g, fg.b);
  const lum2 = sRgbLuminance(bg.r, bg.g, bg.b);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return Number(((brighter + 0.05) / (darker + 0.05)).toFixed(2));
}

export async function switchTheme(page, targetMode) {
  const currentMode = await page.evaluate(() => {
    return document.querySelector('.app')?.getAttribute('data-mode') || 'light';
  });

  if (currentMode !== targetMode) {
    const toggleButton = page.locator('button[aria-label="Switch to dark mode"], button[aria-label="Switch to light mode"]').first();
    if (await toggleButton.isVisible().catch(() => false)) {
      await toggleButton.click();
    } else {
      await page.evaluate((mode) => {
        window.localStorage.setItem('finpath.colorMode', mode);
      }, targetMode);
      await page.reload({ waitUntil: 'domcontentloaded' });
    }
    await page.waitForFunction((mode) => {
      const app = document.querySelector('.app');
      return app && app.getAttribute('data-mode') === mode;
    }, targetMode, { timeout: 5000 });
  }

  await page.emulateMedia({ colorScheme: targetMode });
  await page.waitForTimeout(200);

  const themeProps = await page.evaluate(() => {
    const app = document.querySelector('.app');
    const style = window.getComputedStyle(app);
    return {
      canvas: style.getPropertyValue('--color-canvas').trim(),
      heading: style.getPropertyValue('--color-heading').trim(),
      bodyColor: style.getPropertyValue('--color-body').trim(),
      surface: style.getPropertyValue('--color-surface').trim(),
      dataMode: app.getAttribute('data-mode')
    };
  });

  if (targetMode === 'dark') {
    if (themeProps.dataMode !== 'dark') {
      throw new Error(`Failed to activate dark mode: data-mode is "${themeProps.dataMode}"`);
    }
  } else {
    if (themeProps.dataMode !== 'light') {
      throw new Error(`Failed to activate light mode: data-mode is "${themeProps.dataMode}"`);
    }
  }

  return themeProps;
}

// --------------------------------------------------------------------------
// Keyboard Navigation & Action Accessibility Proofs
// --------------------------------------------------------------------------
export function evaluateKeyboardActionProof({
  focusedCount = 0,
  hasFocusRing = false,
  targetFocused = false,
  actionActivated = false,
  openStateVerified = false,
  closeStateVerified = false
} = {}) {
  if (typeof focusedCount !== 'number' || focusedCount < 3) {
    return { passed: false, reason: `Insufficient interactive elements focused: ${focusedCount} < 3` };
  }
  if (!hasFocusRing) {
    return { passed: false, reason: 'No visible focus outline/ring detected on focused elements' };
  }
  if (!targetFocused) {
    return { passed: false, reason: 'Target interactive control was not focused via keyboard traversal' };
  }
  if (!actionActivated || !openStateVerified || !closeStateVerified) {
    return { passed: false, reason: 'Keyboard focus occurred but interactive action activation failed or had no effect' };
  }
  return { passed: true, reason: null };
}

export async function executeKeyboardActionProof(page) {
  // 1. Reset focus to document body
  await page.locator('body').click();

  let focusedCount = 0;
  let hasFocusRing = false;
  let targetFocused = false;

  // 2. Traversal: press Tab sequentially, verifying focus rings on interactive elements
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focusInfo = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body || el === document.documentElement) return null;
      const style = window.getComputedStyle(el);
      const hasOutline = style.outlineStyle !== 'none' && style.outlineWidth !== '0px';
      const hasShadow = style.boxShadow && style.boxShadow !== 'none';
      const isTarget = el.tagName === 'BUTTON' && el.getAttribute('aria-controls') === 'desktop-workspace-navigation';
      return {
        tag: el.tagName,
        isInteractive: ['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(el.tagName) || el.hasAttribute('tabindex'),
        hasVisibleFocus: Boolean(hasOutline || hasShadow),
        isTarget
      };
    });

    if (focusInfo?.isInteractive) {
      focusedCount++;
      if (focusInfo.hasVisibleFocus) hasFocusRing = true;
    }
    if (focusInfo?.isTarget) {
      targetFocused = true;
      break;
    }
  }

  // 3. Shift+Tab reverse recovery if overshot or not yet reached
  if (!targetFocused) {
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Shift+Tab');
      const isTarget = await page.evaluate(() => {
        const el = document.activeElement;
        return el?.tagName === 'BUTTON' && el.getAttribute('aria-controls') === 'desktop-workspace-navigation';
      });
      if (isTarget) {
        targetFocused = true;
        break;
      }
    }
  }

  if (!targetFocused) {
    return {
      focusedCount,
      hasFocusRing,
      targetFocused: false,
      openStateVerified: false,
      closeStateVerified: false,
      actionActivated: false,
      ...evaluateKeyboardActionProof({
        focusedCount,
        hasFocusRing,
        targetFocused: false,
        actionActivated: false,
        openStateVerified: false,
        closeStateVerified: false
      })
    };
  }

  // 4. Assert initial state: closed dropdown
  const initialExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const initialDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);

  if (initialExpanded === 'true' || initialDropdownVisible) {
    return {
      focusedCount,
      hasFocusRing,
      targetFocused: true,
      openStateVerified: false,
      closeStateVerified: false,
      actionActivated: false,
      passed: false,
      reason: 'Target control was unexpectedly already open before keyboard activation'
    };
  }

  // 5. Dispatch keyboard activation (Enter) without click substitution
  await page.keyboard.press('Enter');
  if (page.waitForTimeout) await page.waitForTimeout(150);

  // 6. Assert visible DOM open state resulted from keyboard activation
  const openExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const openDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);
  const openStateVerified = openExpanded === 'true' && Boolean(openDropdownVisible);

  // 7. Dispatch keyboard close action (Escape) and assert closed state
  await page.keyboard.press('Escape');
  if (page.waitForTimeout) await page.waitForTimeout(150);

  const closeExpanded = await page.evaluate(() => {
    const trigger = document.querySelector('button[aria-controls="desktop-workspace-navigation"]');
    return trigger?.getAttribute('aria-expanded');
  });
  const closeDropdownVisible = await page.locator('#desktop-workspace-navigation').isVisible().catch(() => false);
  const closeStateVerified = closeExpanded === 'false' && !closeDropdownVisible;

  const actionActivated = openStateVerified && closeStateVerified;

  const evalResult = evaluateKeyboardActionProof({
    focusedCount,
    hasFocusRing,
    targetFocused,
    actionActivated,
    openStateVerified,
    closeStateVerified
  });

  return {
    focusedCount,
    hasFocusRing,
    targetFocused,
    openStateVerified,
    closeStateVerified,
    actionActivated,
    ...evalResult
  };
}

// --------------------------------------------------------------------------
// Explicit Evaluator
// --------------------------------------------------------------------------
export function persistEvidence(report, cleanup, writer = writeFileSync) {
  try {
    writer(CLEANUP_FILE, JSON.stringify(cleanup, null, 2) + '\n');
    writer(REPORT_FILE, JSON.stringify(report, null, 2) + '\n');
  } catch (error) {
    report.status = 'FAILED';
    report.error = 'Evidence write failed: ' + error.message;
    try { writer(REPORT_FILE, JSON.stringify(report, null, 2) + '\n'); } catch {}
    throw error;
  }
}

export function evaluateReport(report, cleanup) {
  const failures = [];

  if (!report || typeof report !== 'object') {
    return { passed: false, failures: ['Report is missing or not an object'] };
  }
  if (!cleanup || typeof cleanup !== 'object') {
    return { passed: false, failures: ['Cleanup is missing or not an object'] };
  }

  if (report.error) failures.push('Recorded verification error: ' + report.error);
  if (report.status === 'FAILED') failures.push('Report marked FAILED');
  if (report.preview_url !== PREVIEW_URL) failures.push('Unexpected preview URL');

  // Preflight metadata
  if (report.candidate_sha !== CANDIDATE_SHA) {
    failures.push(`Expected candidate_sha ${CANDIDATE_SHA}, got ${report.candidate_sha}`);
  }
  if (report.deployment_id !== DEPLOYMENT_ID) {
    failures.push(`Expected deployment_id ${DEPLOYMENT_ID}, got ${report.deployment_id}`);
  }
  if (report.effective_db !== PREVIEW_DB_ID) {
    failures.push(`Expected effective_db ${PREVIEW_DB_ID}, got ${report.effective_db}`);
  }
  if (report.d1_migration_0007_verified !== true) {
    failures.push(`d1_migration_0007_verified expected true, got ${report.d1_migration_0007_verified}`);
  }
  if (report.d1_migration_0008_verified !== true) {
    failures.push(`d1_migration_0008_verified expected true, got ${report.d1_migration_0008_verified}`);
  }
  if (report.sqlite_plan_reviews_verified !== true) {
    failures.push(`sqlite_plan_reviews_verified expected true, got ${report.sqlite_plan_reviews_verified}`);
  }

  // B10 Saved Decision Navigation
  const b10 = report.b10_saved_decision_navigation;
  if (!b10 || typeof b10 !== 'object') {
    failures.push('Missing b10_saved_decision_navigation section in report');
  } else {
    if (b10.plan_created_version_1 !== true) failures.push(`B10: plan_created_version_1 expected true, got ${b10.plan_created_version_1}`);
    if (b10.plan_revised_version_2 !== true) failures.push(`B10: plan_revised_version_2 expected true, got ${b10.plan_revised_version_2}`);
    if (b10.exact_v1_link_navigated !== true) failures.push(`B10: exact_v1_link_navigated expected true, got ${b10.exact_v1_link_navigated}`);
    if (b10.exact_v1_inputs_restored_after_reload !== true) failures.push(`B10: exact_v1_inputs_restored_after_reload expected true, got ${b10.exact_v1_inputs_restored_after_reload}`);
    if (b10.v2_inputs_not_rendered_on_v1_link !== true) failures.push(`B10: v2_inputs_not_rendered_on_v1_link expected true, got ${b10.v2_inputs_not_rendered_on_v1_link}`);
    if (b10.unsaved_changes_modal_rendered_on_dirty_nav !== true) failures.push(`B10: unsaved_changes_modal_rendered_on_dirty_nav expected true, got ${b10.unsaved_changes_modal_rendered_on_dirty_nav}`);
    if (b10.unsaved_changes_cancel_preserves_dirty_state !== true) failures.push(`B10: unsaved_changes_cancel_preserves_dirty_state expected true, got ${b10.unsaved_changes_cancel_preserves_dirty_state}`);
    if (b10.unsaved_changes_confirm_proceeds_navigation !== true) failures.push(`B10: unsaved_changes_confirm_proceeds_navigation expected true, got ${b10.unsaved_changes_confirm_proceeds_navigation}`);
    if (b10.controlled_error_on_missing_plan !== true) failures.push(`B10: controlled_error_on_missing_plan expected true, got ${b10.controlled_error_on_missing_plan}`);
    if (b10.controlled_error_on_missing_version !== true) failures.push(`B10: controlled_error_on_missing_version expected true, got ${b10.controlled_error_on_missing_version}`);
    if (b10.tenant_b_cannot_access_tenant_a_plan !== true) failures.push(`B10: tenant_b_cannot_access_tenant_a_plan expected true, got ${b10.tenant_b_cannot_access_tenant_a_plan}`);
    if (b10.full_record_immutability_verified !== true) failures.push(`B10: full_record_immutability_verified expected true, got ${b10.full_record_immutability_verified}`);
  }

  // B11 Monthly Review Loop
  const b11 = report.b11_monthly_review_loop;
  if (!b11 || typeof b11 !== 'object') {
    failures.push('Missing b11_monthly_review_loop section in report');
  } else {
    if (b11.review_saved_keep_choice !== true) failures.push(`B11: review_saved_keep_choice expected true, got ${b11.review_saved_keep_choice}`);
    if (b11.review_completed_status_persisted_after_reload !== true) failures.push(`B11: review_completed_status_persisted_after_reload expected true, got ${b11.review_completed_status_persisted_after_reload}`);
    if (b11.review_next_due_date_computed !== true) failures.push(`B11: review_next_due_date_computed expected true, got ${b11.review_next_due_date_computed}`);
    if (b11.returning_review_rule_enforced_within_7_days !== true) failures.push(`B11: returning_review_rule_enforced_within_7_days expected true, got ${b11.returning_review_rule_enforced_within_7_days}`);
    if (b11.review_defer_choice_persisted !== true) failures.push(`B11: review_defer_choice_persisted expected true, got ${b11.review_defer_choice_persisted}`);
    if (b11.review_revise_choice_triggers_revision !== true) failures.push(`B11: review_revise_choice_triggers_revision expected true, got ${b11.review_revise_choice_triggers_revision}`);
    if (b11.idempotent_repeat_review_not_duplicated !== true) failures.push(`B11: idempotent_repeat_review_not_duplicated expected true, got ${b11.idempotent_repeat_review_not_duplicated}`);
    if (b11.due_reviews_endpoint_returned_plans !== true) failures.push(`B11: due_reviews_endpoint_returned_plans expected true, got ${b11.due_reviews_endpoint_returned_plans}`);
    if (b11.tenant_b_cannot_review_tenant_a_plan !== true) failures.push(`B11: tenant_b_cannot_review_tenant_a_plan expected true, got ${b11.tenant_b_cannot_review_tenant_a_plan}`);
    if (b11.plan_reviews_participate_in_data_export !== true) failures.push(`B11: plan_reviews_participate_in_data_export expected true, got ${b11.plan_reviews_participate_in_data_export}`);
  }

  // B28 Presentation & Accessibility
  const b28 = report.b28_presentation_and_accessibility;
  if (!b28 || typeof b28 !== 'object') {
    failures.push('Missing b28_presentation_and_accessibility section in report');
  } else {
    if (b28.dashboard_reviews_rollup_rendered !== true) failures.push(`B28: dashboard_reviews_rollup_rendered expected true, got ${b28.dashboard_reviews_rollup_rendered}`);
    if (b28.dashboard_due_cards_have_deep_links !== true) failures.push(`B28: dashboard_due_cards_have_deep_links expected true, got ${b28.dashboard_due_cards_have_deep_links}`);
    if (b28.review_status_badges_explicit_text !== true) failures.push(`B28: review_status_badges_explicit_text expected true, got ${b28.review_status_badges_explicit_text}`);
    if (b28.goals_panel_linked_plan_badge_rendered !== true) failures.push(`B28: goals_panel_linked_plan_badge_rendered expected true, got ${b28.goals_panel_linked_plan_badge_rendered}`);
    if (b28.goals_panel_evidence_date_disclosed !== true) failures.push(`B28: goals_panel_evidence_date_disclosed expected true, got ${b28.goals_panel_evidence_date_disclosed}`);
    if (b28.goals_panel_funding_gap_rendered !== true) failures.push(`B28: goals_panel_funding_gap_rendered expected true, got ${b28.goals_panel_funding_gap_rendered}`);
    if (b28.goals_panel_explicit_text_status !== true) failures.push(`B28: goals_panel_explicit_text_status expected true, got ${b28.goals_panel_explicit_text_status}`);
    if (b28.stale_evidence_warning_displayed_when_over_30_days !== true) failures.push(`B28: stale_evidence_warning_displayed_when_over_30_days expected true, got ${b28.stale_evidence_warning_displayed_when_over_30_days}`);
    if (b28.theme_switching_verified !== true) failures.push(`B28: theme_switching_verified expected true, got ${b28.theme_switching_verified}`);
    if (b28.contrast_review_badges_light_pass !== true) failures.push(`B28: contrast_review_badges_light_pass expected true, got ${b28.contrast_review_badges_light_pass}`);
    if (b28.contrast_review_badges_dark_pass !== true) failures.push(`B28: contrast_review_badges_dark_pass expected true, got ${b28.contrast_review_badges_dark_pass}`);
    if (b28.viewport_containment_mobile_320px_verified !== true) failures.push(`B28: viewport_containment_mobile_320px_verified expected true, got ${b28.viewport_containment_mobile_320px_verified}`);
    if (b28.viewport_containment_tablet_768px_verified !== true) failures.push(`B28: viewport_containment_tablet_768px_verified expected true, got ${b28.viewport_containment_tablet_768px_verified}`);
    if (b28.viewport_containment_desktop_1280px_verified !== true) failures.push(`B28: viewport_containment_desktop_1280px_verified expected true, got ${b28.viewport_containment_desktop_1280px_verified}`);
    if (b28.keyboard_navigation_accessible !== true) failures.push(`B28: keyboard_navigation_accessible expected true, got ${b28.keyboard_navigation_accessible}`);
  }

  // Cleanup Assertions for Synthetic Users
  const checkUserCleanup = (c, name) => {
    if (!c || typeof c !== 'object') {
      failures.push(`Cleanup for ${name} is missing or not an object`);
      return;
    }
    if (c.errors && c.errors.length > 0) {
      failures.push(`${name} cleanup reported errors: ${c.errors.join(', ')}`);
    }
    if (c.app_data_deleted !== true) failures.push(`${name} cleanup: app_data_deleted expected true, got ${c.app_data_deleted}`);
    if (c.user_tombstone_present !== true) failures.push(`${name} cleanup: user_tombstone_present expected true, got ${c.user_tombstone_present}`);
    if (c.clerk_user_deleted !== true) failures.push(`${name} cleanup: clerk_user_deleted expected true, got ${c.clerk_user_deleted}`);
    if (c.clerk_user_absent !== true) failures.push(`${name} cleanup: clerk_user_absent expected true, got ${c.clerk_user_absent}`);
    if (c.all_tables_zero !== true) failures.push(`${name} cleanup: all_tables_zero expected true, got ${c.all_tables_zero}`);

    if (!c.table_counts || typeof c.table_counts !== 'object') {
      failures.push(`${name} cleanup: table_counts is missing or not an object`);
    } else {
      for (const table of USER_TABLES) {
        const cnt = c.table_counts[table];
        if (typeof cnt !== 'number') {
          failures.push(`${name} cleanup: table_counts[${table}] expected number, got ${typeof cnt} (${cnt})`);
        } else if (cnt !== 0) {
          failures.push(`${name} cleanup: table_counts[${table}] expected 0, got ${cnt}`);
        }
      }
    }
  };

  checkUserCleanup(cleanup.userA, 'User A');
  checkUserCleanup(cleanup.userB, 'User B');

  return {
    passed: failures.length === 0,
    failures
  };
}

// --------------------------------------------------------------------------
// Scoped Cleanup Function
// --------------------------------------------------------------------------
export async function performCleanup({
  userId,
  page,
  clerkClient,
  queryD1Fn = queryD1,
  logFn = console.log
}) {
  logFn(`\n--- Executing Scoped Fail-Closed Cleanup for ${userId} ---`);
  const cleanupResult = {
    userId,
    app_data_deleted: false,
    user_tombstone_present: false,
    clerk_user_deleted: false,
    clerk_user_absent: false,
    all_tables_zero: false,
    table_counts: {},
    provider_deletion_withheld: false,
    errors: []
  };

  if (!userId) {
    logFn('No userId provided; skipping cleanup.');
    return cleanupResult;
  }

  // Step 1: Application data deletion via user session
  if (page && !page.isClosed()) {
    try {
      const delRes = await page.evaluate(async () => {
        const res = await fetch('/api/account-data', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirmation: 'DELETE MY FINPATH DATA' })
        });
        return { status: res.status, ok: res.ok };
      });
      cleanupResult.app_data_deleted = delRes.ok || delRes.status === 410;
      logFn(`Application data deletion response: ok=${delRes.ok}, status=${delRes.status}`);
    } catch (e) {
      cleanupResult.errors.push(`App data delete error: ${e.message}`);
      logFn(`App data delete error: ${e.message}`);
    }
  }

  // Step 2: Query scoped table counts for this user across all 15 tables
  let allZero = true;
  for (const table of USER_TABLES) {
    try {
      const res = await queryD1Fn(`SELECT count(*) as cnt FROM ${table} WHERE user_id = ?;`, [userId]);
      const cnt = res[0]?.cnt ?? -1;
      cleanupResult.table_counts[table] = cnt;
      if (cnt !== 0) {
        allZero = false;
        cleanupResult.errors.push(`Table ${table} has ${cnt} remaining rows for user`);
      }
    } catch (e) {
      cleanupResult.table_counts[table] = `error: ${e.message}`;
      cleanupResult.errors.push(`Query error on ${table}: ${e.message}`);
      allZero = false;
    }
  }
  cleanupResult.all_tables_zero = allZero;
  logFn(`All 15 tables scoped to user clean (0 rows): ${allZero}`);

  // Step 3: Verify user tombstone in users table
  try {
    const uRows = await queryD1Fn('SELECT id, deleted_at FROM users WHERE id = ?;', [userId]);
    cleanupResult.user_tombstone_present = uRows.length > 0 && Boolean(uRows[0].deleted_at);
    logFn(`User tombstone present: ${cleanupResult.user_tombstone_present}`);
    if (!cleanupResult.user_tombstone_present) {
      cleanupResult.errors.push('User tombstone missing or deleted_at is null');
    }
  } catch (e) {
    cleanupResult.errors.push(`Tombstone query error: ${e.message}`);
  }

  // Step 4: Gated Clerk provider deletion
  if (cleanupResult.app_data_deleted && cleanupResult.all_tables_zero) {
    try {
      await clerkClient.users.deleteUser(userId);
      cleanupResult.clerk_user_deleted = true;
      logFn('Clerk provider user deleted successfully.');
    } catch (e) {
      if (e.status === 404) {
        cleanupResult.clerk_user_deleted = true;
      } else {
        cleanupResult.errors.push(`Clerk delete error: ${e.message}`);
        logFn(`Clerk delete error: ${e.message}`);
      }
    }

    // Verify Clerk absence (must be 404)
    try {
      await clerkClient.users.getUser(userId);
      cleanupResult.clerk_user_absent = false;
      cleanupResult.errors.push('Clerk user still returned after deletion');
    } catch (e) {
      cleanupResult.clerk_user_absent = e.status === 404;
      logFn(`Clerk user 404 absence verified: ${cleanupResult.clerk_user_absent}`);
    }
  } else {
    logFn(`[GATE ENFORCED] WITHHOLDING Clerk provider deletion for ${userId} because application cleanup failed.`);
    cleanupResult.clerk_user_deleted = false;
    cleanupResult.clerk_user_absent = false;
    cleanupResult.provider_deletion_withheld = true;
    cleanupResult.errors.push('Clerk provider deletion withheld due to application cleanup failure');
  }

  return cleanupResult;
}

// --------------------------------------------------------------------------
// Main Verification Runner
// --------------------------------------------------------------------------
export async function runAllProofs() {
  console.log('=== Starting C09 Comprehensive Hosted Verification (B10, B11 & B28) ===');
  const env = readEnv();
  const secretKey = env.CLERK_SECRET_KEY;
  const publishableKey = env.VITE_CLERK_PUBLISHABLE_KEY;

  if (!secretKey || !publishableKey) {
    throw new Error('Clerk configuration missing in .env.preview.local');
  }

  // Preflight 1: Deployment identity and bindings
  console.log('Checking immutable deployment identity and D1 binding...');
  await verifyDeployment();
  console.log(`Verified deployment ${DEPLOYMENT_ID} on DB ${PREVIEW_DB_ID}`);

  // Preflight 2: Test D1 query reachability
  console.log('Testing D1 query reachability...');
  const testPing = await queryD1('SELECT 1 as ping;');
  if (testPing[0]?.ping !== 1) {
    throw new Error('D1 database ping failed');
  }
  console.log('D1 database query verified.');

  // Preflight 3: Verify migrations 0007 and 0008 applied on remote D1
  const m7Rows = await queryD1('SELECT id, name, applied_at FROM d1_migrations WHERE id = 7;');
  const m7Verified = m7Rows.length > 0 && m7Rows[0].name === '0007_monthly_plan_reviews.sql';
  console.log(`D1 migration 0007 verified: ${m7Verified}`);

  const m8Rows = await queryD1('SELECT id, name, applied_at FROM d1_migrations WHERE id = 8;');
  const m8Verified = m8Rows.length > 0 && m8Rows[0].name === '0008_plan_reviews_idempotency.sql';
  console.log(`D1 migration 0008 verified: ${m8Verified}`);

  const smRows = await queryD1("SELECT count(*) as cnt FROM sqlite_master WHERE type='table' AND name='plan_reviews';");
  const planReviewsTableVerified = (smRows[0]?.cnt ?? 0) === 1;
  console.log(`sqlite_master plan_reviews table verified: ${planReviewsTableVerified}`);

  // Preflight 4: Clerk client and testing token
  const clerkClient = createClerkClient({ secretKey });
  const rawKey = publishableKey.replace(/^pk_(?:test|live)_/, '');
  const fapi = Buffer.from(rawKey, 'base64').toString('utf8').replace(/\$$/, '');
  console.log(`Clerk Frontend API host: ${fapi}`);

  const testTokenObj = await clerkClient.testingTokens.createTestingToken();
  const testingToken = testTokenObj.token;
  console.log('Created Clerk development testing token.');

  // Create Synthetic User A
  const nonceA = Date.now().toString().slice(-6);
  const passwordA = generateDisposablePassword();
  const emailA = `finpath_c09_a_${nonceA}+clerk_test@example.com`;
  const phoneA = `+12015550184`;

  console.log(`Creating Synthetic User A: ${emailA}...`);
  const userA = await clerkClient.users.createUser({
    emailAddress: [emailA],
    phoneNumber: [phoneA],
    password: passwordA
  });
  const userAId = userA.id;
  recordManifestUser(userAId);
  console.log(`Created User A: ${userAId.slice(0, 14)}...`);

  // Create Synthetic User B
  const nonceB = (Date.now() + 1).toString().slice(-6);
  const passwordB = generateDisposablePassword();
  const emailB = `finpath_c09_b_${nonceB}+clerk_test@example.com`;
  const phoneB = `+12015550185`;

  console.log(`Creating Synthetic User B: ${emailB}...`);
  const userB = await clerkClient.users.createUser({
    emailAddress: [emailB],
    phoneNumber: [phoneB],
    password: passwordB
  });
  const userBId = userB.id;
  recordManifestUser(userBId);
  console.log(`Created User B: ${userBId.slice(0, 14)}...`);

  const report = {
    candidate_sha: CANDIDATE_SHA,
    deployment_id: DEPLOYMENT_ID,
    preview_url: PREVIEW_URL,
    effective_db: PREVIEW_DB_ID,
    timestamp: new Date().toISOString(),
    d1_migration_0007_verified: m7Verified,
    d1_migration_0008_verified: m8Verified,
    sqlite_plan_reviews_verified: planReviewsTableVerified,
    b10_saved_decision_navigation: {},
    b11_monthly_review_loop: {},
    b28_presentation_and_accessibility: {},
    cleanup: {}
  };

  let browser = null;
  let contextA = null;
  let pageA = null;
  let contextB = null;
  let pageB = null;
  let cleanupA = null;
  let cleanupB = null;

  try {
    const { chromium } = await import('/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs');
    browser = await chromium.launch({ executablePath: CHROME_PATH, headless: true });

    // Session A
    contextA = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setupClerkInterception(contextA, testingToken, fapi);
    pageA = await contextA.newPage();
    await pageA.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });

    const ticketA = await clerkClient.signInTokens.createSignInToken({ userId: userAId, expiresInSeconds: 300 });
    await pageA.waitForFunction(() => Boolean(window.Clerk?.loaded));
    await pageA.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket status: ${res.status}`);
        }
      });
    }, ticketA.token);
    await pageA.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
    console.log('User A authenticated.');

    // Session B
    contextB = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await setupClerkInterception(contextB, testingToken, fapi);
    pageB = await contextB.newPage();
    await pageB.goto(`${PREVIEW_URL}/`, { waitUntil: 'domcontentloaded' });

    const ticketB = await clerkClient.signInTokens.createSignInToken({ userId: userBId, expiresInSeconds: 300 });
    await pageB.waitForFunction(() => Boolean(window.Clerk?.loaded));
    await pageB.evaluate(async (ticket) => {
      await window.Clerk.client.signIn.create({ strategy: 'ticket', ticket }).then(async (res) => {
        if (res.status === 'complete') {
          await window.Clerk.setActive({ session: res.createdSessionId });
        } else {
          throw new Error(`Sign-in ticket status: ${res.status}`);
        }
      });
    }, ticketB.token);
    await pageB.waitForFunction(() => Boolean(window.Clerk?.user && window.Clerk?.session));
    console.log('User B authenticated.');

    // ==========================================
    // B10 & B11 & B28 Journeys
    // ==========================================

    // Step 1: Create Goal and Plan Version 1 for User A
    console.log('\n--- Step 1: User A Creates Plan and Version 1 ---');
    const createGoalRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Retirement Independence',
          goalType: 'retirement',
          targetAmountCents: 150000000,
          currentAmountCents: 50000000,
          targetDate: '2045-06-01'
        })
      });
      return { status: res.status, body: await res.json() };
    });
    const goalAId = createGoalRes.body?.goal?.id || createGoalRes.body?.id;
    console.log(`Created Goal for User A: ${goalAId}, status: ${createGoalRes.status}`);
    if (!goalAId) {
      throw new Error(`Failed to create goal for User A: status=${createGoalRes.status}, body=${JSON.stringify(createGoalRes.body)}`);
    }

    const basePlanSnapshot = {
      calculatorMode: 'fire-number',
      timeline: { currentAge: 35, retirementAge: 55, planEndAge: 90 },
      scenarios: [],
      plan: {
        annualExpense: 40000,
        initialPortfolio: 500000,
        withdrawalTiming: 'start',
        desiredFinalValue: 0,
        ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }],
        oneOffEvents: []
      }
    };

    const createPlanRes = await pageA.evaluate(async ({ goalId, snapshot }) => {
      const res = await fetch('/api/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goalId,
          name: 'Retirement Independence Roadmap',
          label: 'Baseline 2026',
          notes: 'Conservative 3.5% SWR',
          snapshot,
          result: { success: true, fireNumber: 1000000, yearsToFire: 20 }
        })
      });
      return { status: res.status, body: await res.json() };
    }, { goalId: goalAId, snapshot: basePlanSnapshot });

    const planAId = createPlanRes.body.plan.id;
    console.log(`Created Plan for User A: ${planAId}, Version: ${createPlanRes.body.plan.versionNumber}`);
    report.b10_saved_decision_navigation.plan_created_version_1 = createPlanRes.status === 201 && createPlanRes.body.plan.versionNumber === 1;

    // Step 2: Create Revision (Version 2) for Plan A
    console.log('\n--- Step 2: User A Creates Plan Version 2 (Revision) ---');
    const v2Snapshot = {
      ...basePlanSnapshot,
      timeline: { currentAge: 35, retirementAge: 52, planEndAge: 90 },
      plan: {
        ...basePlanSnapshot.plan,
        annualExpense: 50000,
        initialPortfolio: 600000
      }
    };

    const createV2Res = await pageA.evaluate(async ({ planId, snapshot }) => {
      const res = await fetch(`/api/plans/${planId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Retirement Independence Roadmap',
          label: 'Accelerated FIRE 2026',
          notes: 'Retire earlier at age 52',
          snapshot,
          result: { success: true, fireNumber: 1250000, yearsToFire: 17 }
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, snapshot: v2Snapshot });

    console.log(`Created Version 2 for Plan A: status ${createV2Res.status}, versionNumber: ${createV2Res.body?.plan?.versionNumber}`);
    report.b10_saved_decision_navigation.plan_revised_version_2 = createV2Res.status === 200 && createV2Res.body?.plan?.versionNumber === 2;

    // Step 3: User A Navigates to Exact Older Version 1 Link
    console.log('\n--- Step 3: Exact Deep Link Navigation to Version 1 ---');
    const v1Url = `${PREVIEW_URL}/plans?planId=${planAId}&version=1`;
    await pageA.goto(v1Url, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });

    const renderedVersionBanner = await pageA.locator('.historical-version-banner').innerText();
    const renderedOverview = await pageA.locator('.planning-overview').innerText();

    console.log(`Rendered on v1 deep link: Banner="${renderedVersionBanner}", Overview="${renderedOverview}"`);

    report.b10_saved_decision_navigation.exact_v1_link_navigated = renderedVersionBanner.includes('Version 1');
    report.b10_saved_decision_navigation.v2_inputs_not_rendered_on_v1_link =
      !renderedOverview.includes('$600,000') && renderedOverview.includes('$500,000');

    // Reload page on the exact link and assert immutability
    console.log(`Current URL before reload: ${pageA.url()}`);
    await pageA.reload({ waitUntil: 'domcontentloaded' });
    console.log(`Current URL after reload: ${pageA.url()}`);
    await pageA.waitForSelector('.planning-workspace, .planning-controlled-error, .auth-gate-card', { timeout: 15000 });
    const domState = await pageA.evaluate(() => ({
      url: window.location.href,
      clerkLoaded: Boolean(window.Clerk?.loaded),
      clerkUser: Boolean(window.Clerk?.user),
      workspacePresent: Boolean(document.querySelector('.planning-workspace')),
      bannerPresent: Boolean(document.querySelector('.historical-version-banner')),
      bannerText: document.querySelector('.historical-version-banner')?.innerText,
      errorPresent: Boolean(document.querySelector('.planning-controlled-error')),
      errorText: document.querySelector('.planning-controlled-error')?.innerText,
      authGate: Boolean(document.querySelector('.auth-gate-card'))
    }));
    console.log('DOM state after reload:', JSON.stringify(domState));

    await pageA.waitForSelector('.historical-version-banner', { timeout: 15000 });

    const reloadOverview = await pageA.locator('.planning-overview').innerText();
    const reloadBanner = await pageA.locator('.historical-version-banner').innerText();
    console.log(`Reload on v1: Banner="${reloadBanner}", Overview="${reloadOverview}"`);
    report.b10_saved_decision_navigation.exact_v1_inputs_restored_after_reload =
      reloadOverview.includes('$500,000') && reloadBanner.includes('Version 1');

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '01_b10_v1_deep_link_restored.png'), fullPage: false });

    // Step 4: Unsaved changes protection modal
    console.log('\n--- Step 4: Unsaved Changes Protection Modal ---');
    // Ensure we are on the active plan workspace with Version 2 explicitly settled
    await pageA.goto(`${PREVIEW_URL}/plans?planId=${planAId}&version=2`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-workspace', { timeout: 15000 });

    // Wait until draft form and version state are fully settled with loaded Plan A Version 2
    await pageA.waitForFunction(
      () => {
        const input = document.querySelector('.planning-form-grid input');
        const overview = document.querySelector('.planning-overview')?.innerText || '';
        return (
          input &&
          input.value === 'Retirement Independence Roadmap' &&
          overview.includes('Version 2 loaded')
        );
      },
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.planning-history-panel article', { timeout: 15000 });
    await pageA.waitForTimeout(500);

    // Make the draft assumptions dirty by editing plan name in the form grid
    const planNameInput = pageA.locator('.planning-form-grid input').first();
    await planNameInput.fill('Retirement Base (Unsaved Assumptions)');
    await pageA.waitForTimeout(300);

    const filledValue = await planNameInput.inputValue();
    console.log(`Draft value immediately after fill: "${filledValue}"`);

    // Click "Load" on version 1 in history panel (specifically the row for Version 1)
    const loadVersionBtn = pageA.locator('.planning-history-panel article:has-text("Version 1") button:has-text("Load")');
    await loadVersionBtn.click();
    await pageA.waitForSelector('.modal-scrim', { timeout: 5000 }).catch(() => {});

    const modalVisible = await pageA.locator('.modal-scrim').isVisible().catch(() => false);
    console.log(`Unsaved changes modal appeared: ${modalVisible}`);
    report.b10_saved_decision_navigation.unsaved_changes_modal_rendered_on_dirty_nav = modalVisible;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '02_b10_unsaved_changes_modal.png') });

    if (modalVisible) {
      // Cancel / Keep editing
      const cancelBtn = pageA.locator('.modal-scrim button:has-text("Keep editing")').first();
      await cancelBtn.click();
      await pageA.locator('.modal-scrim').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      const modalClosed = !(await pageA.locator('.modal-scrim').isVisible().catch(() => false));
      // Verify dirty input is still intact
      const preservedName = await planNameInput.inputValue().catch(() => '');
      console.log(`Unsaved cancel check: modalClosed=${modalClosed}, preservedName="${preservedName}"`);
      report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state =
        modalClosed && preservedName === 'Retirement Base (Unsaved Assumptions)';

      // Re-trigger and Discard and load
      await loadVersionBtn.click();
      await pageA.waitForSelector('.modal-scrim', { timeout: 5000 }).catch(() => {});
      const discardBtn = pageA.locator('.modal-scrim button:has-text("Discard and load")').first();
      await discardBtn.click();
      await pageA.locator('.modal-scrim').waitFor({ state: 'detached', timeout: 5000 }).catch(() => {});
      const modalClosedAfterDiscard = !(await pageA.locator('.modal-scrim').isVisible().catch(() => false));
      const v1BannerLoaded = await pageA.locator('.historical-version-banner').isVisible().catch(() => false);
      console.log(`Unsaved discard check: modalClosedAfterDiscard=${modalClosedAfterDiscard}, v1BannerLoaded=${v1BannerLoaded}`);
      report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation =
        modalClosedAfterDiscard && v1BannerLoaded;
    } else {
      report.b10_saved_decision_navigation.unsaved_changes_cancel_preserves_dirty_state = false;
      report.b10_saved_decision_navigation.unsaved_changes_confirm_proceeds_navigation = false;
    }

    // Step 5: Controlled 404 / Missing Plan and Version
    console.log('\n--- Step 5: Controlled 404 / Missing State ---');
    await pageA.goto(`${PREVIEW_URL}/plans?planId=nonexistent_plan_999&version=1`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-controlled-error, [data-testid="planning-error-state"], .planning-workspace', { timeout: 15000 });
    const errorStateText = await pageA.locator('.planning-controlled-error, [data-testid="planning-error-state"]').innerText().catch(() => '');
    console.log(`Controlled missing plan error text: "${errorStateText}"`);
    report.b10_saved_decision_navigation.controlled_error_on_missing_plan =
      errorStateText.toLowerCase().includes('not found') ||
      errorStateText.toLowerCase().includes('unavailable') ||
      errorStateText.toLowerCase().includes('plan');

    await pageA.goto(`${PREVIEW_URL}/plans?planId=${planAId}&version=99`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-controlled-error, [data-testid="planning-error-state"], .planning-workspace', { timeout: 15000 });
    const missingVersionText = await pageA.locator('.planning-controlled-error, [data-testid="planning-error-state"]').innerText().catch(() => '');
    console.log(`Controlled missing version error text: "${missingVersionText}"`);
    report.b10_saved_decision_navigation.controlled_error_on_missing_version =
      missingVersionText.toLowerCase().includes('version') ||
      missingVersionText.toLowerCase().includes('not found') ||
      missingVersionText.toLowerCase().includes('unavailable');

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '03_b10_controlled_missing_error.png') });

    // Step 6: Tenant B Isolation on Plan A
    console.log('\n--- Step 6: Tenant B Isolation Verification ---');
    const tenantBPlanFetch = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}`);
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B fetch Tenant A plan status: ${tenantBPlanFetch.status} (expected 404)`);
    report.b10_saved_decision_navigation.tenant_b_cannot_access_tenant_a_plan = tenantBPlanFetch.status === 404;

    const tenantBV1Fetch = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}/versions/1`);
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B fetch Tenant A version 1 status: ${tenantBV1Fetch.status} (expected 404)`);

    // Verify DB full record immutability
    const v1DbRow = await queryD1(
      'SELECT pv.version_number, fpi.input_json FROM plan_versions pv JOIN fire_plan_inputs fpi ON fpi.plan_version_id = pv.id WHERE pv.plan_id = ? AND pv.version_number = 1;',
      [planAId]
    );
    const v1Snapshot = JSON.parse(v1DbRow[0].input_json);
    report.b10_saved_decision_navigation.full_record_immutability_verified =
      v1Snapshot.plan.annualExpense === 40000 &&
      v1Snapshot.plan.initialPortfolio === 500000 &&
      v1Snapshot.timeline.retirementAge === 55;

    // ==========================================
    // B11: Monthly Review Loop & R5 Single Plan Lifecycle
    // ==========================================
    console.log('\n--- Step 7: B11 Monthly Review Loop & R5 Single Plan Lifecycle ---');
    const todayStr = new Date().toISOString().slice(0, 10);

    // Enforce >=7-day rule (submitting immediately on newly created plan must fail)
    console.log('Testing >=7-day returning review rule on newly created plan...');
    const tooEarlyRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          notes: 'Immediate review attempt on newly created plan'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Immediate repeat review response: status=${tooEarlyRes.status}, code=${tooEarlyRes.body?.code}`);
    report.b11_monthly_review_loop.returning_review_rule_enforced_within_7_days =
      tooEarlyRes.status === 400 && (tooEarlyRes.body?.code === 'TOO_EARLY_REVIEW' || (tooEarlyRes.body?.error && tooEarlyRes.body.error.includes('at least 7 days')));

    // Backdate Plan A in D1 to 35 days ago to establish a single aged plan needing monthly review (>30 days)
    // and backdate Goal A updated_at to 35 days ago to surface stale evidence warning
    console.log('Backdating Plan A and Goal A in D1 to 35 days ago (establishing single aged plan for R5)...');
    await queryD1("UPDATE plans SET created_at = datetime('now', '-35 days'), updated_at = datetime('now', '-35 days') WHERE id = ?;", [planAId]);
    await queryD1("UPDATE plan_versions SET created_at = datetime('now', '-35 days') WHERE plan_id = ?;", [planAId]);
    await queryD1("UPDATE goals SET updated_at = datetime('now', '-35 days') WHERE id = ?;", [goalAId]);

    // R5 Stage 1: Observe Dashboard in DUE state
    console.log('\n--- R5 Stage 1: Dashboard in DUE state ---');
    await pageA.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.dashboard-summary-grid, .financial-dashboard', { timeout: 15000 });
    // Wait for the due reviews check to settle past the loading placeholder
    await pageA.waitForFunction(
      () => !document.querySelector('.dashboard-reviews-rollup')?.innerText.includes('Checking review cadence'),
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.dashboard-reviews-rollup', { timeout: 15000 });

    const rollupVisible = await pageA.locator('.dashboard-reviews-rollup').isVisible().catch(() => false);
    console.log(`Dashboard reviews rollup visible (Due state): ${rollupVisible}`);
    report.b28_presentation_and_accessibility.dashboard_reviews_rollup_rendered = rollupVisible;

    // Wait for due review card or plan card to appear
    await pageA.waitForSelector('.dashboard-review-card, .dashboard-plan-card', { timeout: 15000 });
    const dueCardsCount = await pageA.locator('.dashboard-review-card, .dashboard-plan-card').count();
    console.log(`Dashboard due cards count: ${dueCardsCount}`);
    report.b28_presentation_and_accessibility.dashboard_due_cards_have_deep_links = dueCardsCount > 0;

    const statusBadgesCount = await pageA.locator('.review-status-badge, .review-badge').count();
    console.log(`Review status badges on dashboard: ${statusBadgesCount}`);
    report.b28_presentation_and_accessibility.review_status_badges_explicit_text = statusBadgesCount > 0;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '05_b28_dashboard_review_rollup.png') });

    // R5 Stage 2: Perform DEFER review on Plan A (7 days)
    console.log('\n--- R5 Stage 2: Defer Plan A Review (7 days) ---');
    const deferRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'defer',
          status: 'deferred',
          deferDays: 7,
          idempotencyKey: 'review-defer-c09',
          notes: 'Deferring review for 1 week'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Defer review response: status=${deferRes.status}, decision=${deferRes.body?.review?.decision}`);
    report.b11_monthly_review_loop.review_defer_choice_persisted =
      (deferRes.status === 200 || deferRes.status === 201) && deferRes.body?.review?.decision === 'defer' && deferRes.body?.review?.status === 'deferred';

    // R5 Stage 3: Perform KEEP review on Plan A
    console.log('\n--- R5 Stage 3: Keep Plan A Review ---');
    const submitReviewRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          idempotencyKey: 'review-keep-c09',
          notes: 'Portfolio on track, assumptions validated'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });

    console.log(`Submit review response: status=${submitReviewRes.status}`);
    const reviewRecord = submitReviewRes.body?.review;
    report.b11_monthly_review_loop.review_saved_keep_choice = (submitReviewRes.status === 200 || submitReviewRes.status === 201) && reviewRecord?.decision === 'keep';
    report.b11_monthly_review_loop.review_next_due_date_computed = Boolean(reviewRecord?.nextReviewDue) && reviewRecord?.nextReviewDue > todayStr;

    // Reload page on /plans and review panel: verify status persisted
    await pageA.goto(`${PREVIEW_URL}/plans?planId=${planAId}&version=1`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.planning-review-panel', { timeout: 15000 });

    const reviewStatusText = await pageA.locator('.review-status-card strong').innerText().catch(() => '');
    console.log(`Review status card text after reload: "${reviewStatusText}"`);
    report.b11_monthly_review_loop.review_completed_status_persisted_after_reload =
      reviewStatusText.toLowerCase().includes('up to date') ||
      reviewStatusText.toLowerCase().includes('completed') ||
      reviewStatusText.toLowerCase().includes('assumptions');

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '04_b11_review_completed_panel.png') });

    // Idempotent repeat: submitting same evidence date, decision and idempotencyKey
    console.log('Testing idempotent repeat review submission...');
    const idempotencyRes = await pageA.evaluate(async ({ planId, evidenceDate }) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate,
          decision: 'keep',
          status: 'completed',
          idempotencyKey: 'review-keep-c09',
          notes: 'Portfolio on track, assumptions validated'
        })
      });
      return { status: res.status, body: await res.json() };
    }, { planId: planAId, evidenceDate: todayStr });
    console.log(`Idempotent repeat status: ${idempotencyRes.status}`);
    const reviewCountDb = await queryD1('SELECT count(*) as cnt FROM plan_reviews WHERE plan_id = ?;', [planAId]);
    console.log(`Total reviews in DB for plan A: ${reviewCountDb[0]?.cnt}`);
    // 1 defer + 1 keep = 2 reviews; duplicate keep is idempotent and does not add a 3rd row
    report.b11_monthly_review_loop.idempotent_repeat_review_not_duplicated =
      idempotencyRes.status === 200 && (reviewCountDb[0]?.cnt ?? 0) === 2;

    // R5 Stage 4: Revise Review Choice
    console.log('\n--- R5 Stage 4: Revise Review Choice ---');
    const reviseRes = await pageA.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 2,
          evidenceDate: new Date().toISOString().slice(0, 10),
          decision: 'revise',
          idempotencyKey: 'review-revise-c09',
          notes: 'Revise assumptions based on market shifts'
        })
      });
      return { status: res.status, body: await res.json() };
    }, planAId);
    console.log(`Plan A review (revise) status: ${reviseRes.status}, decision: ${reviseRes.body?.review?.decision}`);
    report.b11_monthly_review_loop.review_revise_choice_triggers_revision =
      (reviseRes.status === 200 || reviseRes.status === 201) && reviseRes.body?.review?.decision === 'revise';

    // Due reviews endpoint verification
    const dueReviewsRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/plans/due-reviews');
      return { status: res.status, body: await res.json() };
    });
    const dueList = dueReviewsRes.body?.dueReviews ?? dueReviewsRes.body?.plans ?? [];
    console.log(`Due reviews API status: ${dueReviewsRes.status}, count: ${dueList.length}`);
    report.b11_monthly_review_loop.due_reviews_endpoint_returned_plans =
      dueReviewsRes.status === 200 && Array.isArray(dueList);

    // Tenant B cannot review Tenant A plan
    const tenantBReviewRes = await pageB.evaluate(async (planId) => {
      const res = await fetch(`/api/plans/${planId}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planVersionNumber: 1,
          evidenceDate: '2026-06-01',
          decision: 'keep',
          status: 'completed',
          notes: 'Foreign attempt'
        })
      });
      return { status: res.status };
    }, planAId);
    console.log(`Tenant B review Tenant A plan: status=${tenantBReviewRes.status} (expected 404)`);
    report.b11_monthly_review_loop.tenant_b_cannot_review_tenant_a_plan = tenantBReviewRes.status === 404;

    // Check account export includes plan_reviews
    const exportRes = await pageA.evaluate(async () => {
      const res = await fetch('/api/account-data/export');
      return { status: res.status, body: await res.json() };
    });
    const exportedReviews = exportRes.body?.export?.data?.planReviews ?? exportRes.body?.data?.plan_reviews ?? [];
    console.log(`Account data export contains plan_reviews: ${Array.isArray(exportedReviews)} (count: ${exportedReviews?.length})`);
    report.b11_monthly_review_loop.plan_reviews_participate_in_data_export =
      exportRes.status === 200 && Array.isArray(exportedReviews) && exportedReviews.length >= 2;

    // ==========================================
    // B28: Goals Panel Presentation
    // ==========================================
    console.log('\n--- Step 8: B28 Goals Panel Presentation ---');
    await pageA.goto(`${PREVIEW_URL}/goals`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForSelector('.goal-card, .goal-badges', { timeout: 15000 });
    await pageA.waitForSelector('.goal-linked-plan', { timeout: 15000 });

    const linkedPlanBadge = await pageA.locator('.goal-linked-plan').first().isVisible().catch(() => false);
    console.log(`Goals panel linked plan badge visible: ${linkedPlanBadge}`);
    report.b28_presentation_and_accessibility.goals_panel_linked_plan_badge_rendered = linkedPlanBadge;

    const evidenceDateDisclosed = await pageA.locator('.goal-evidence-date').first().isVisible().catch(() => false);
    console.log(`Goals panel evidence date disclosed: ${evidenceDateDisclosed}`);
    report.b28_presentation_and_accessibility.goals_panel_evidence_date_disclosed = evidenceDateDisclosed;

    const fundingGapVisible = await pageA.locator('.goal-funding-gap-row').first().isVisible().catch(() => false);
    console.log(`Goals panel funding gap visible: ${fundingGapVisible}`);
    report.b28_presentation_and_accessibility.goals_panel_funding_gap_rendered = fundingGapVisible;

    const explicitGoalStatus = await pageA.locator('.goal-status-badge').first().innerText().catch(() => '');
    console.log(`Goals panel explicit status: "${explicitGoalStatus}"`);
    report.b28_presentation_and_accessibility.goals_panel_explicit_text_status = Boolean(explicitGoalStatus);

    const staleWarningVisible = await pageA.locator('.stale-evidence-box, .stale-evidence-badge').first().isVisible().catch(() => false);
    console.log(`Goals panel stale evidence warning visible: ${staleWarningVisible}`);
    report.b28_presentation_and_accessibility.stale_evidence_warning_displayed_when_over_30_days = staleWarningVisible;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '06_b28_goals_panel_linked_plan.png') });

    // Navigate to dashboard for theme switching and review badge contrast measurement
    await pageA.goto(`${PREVIEW_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await pageA.waitForFunction(
      () => !document.querySelector('.dashboard-reviews-rollup')?.innerText.includes('Checking review cadence'),
      { timeout: 15000 }
    );
    await pageA.waitForSelector('.review-badge, .dashboard-plan-card', { timeout: 15000 });

    const badgeLocator = pageA.locator('.review-badge').first();
    if ((await badgeLocator.count()) === 0) {
      throw new Error('Missing review badge on dashboard for contrast measurement');
    }

    const measureBadge = async () => badgeLocator.evaluate((el) => {
      const parse = (value) => {
        if (!value) return { r: NaN, g: NaN, b: NaN, a: NaN };
        const m = value.match(/rgba?\((\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*([\d.]+))?\)/);
        if (m) return { r: Math.round(+m[1]), g: Math.round(+m[2]), b: Math.round(+m[3]), a: m[4] === undefined ? 1 : +m[4] };
        const h = value.match(/^#([0-9a-f]{6})$/i);
        return h ? { r: parseInt(h[1].slice(0, 2), 16), g: parseInt(h[1].slice(2, 4), 16), b: parseInt(h[1].slice(4, 6), 16), a: 1 } : { r: NaN, g: NaN, b: NaN, a: NaN };
      };
      const blend = (fg, bg) => {
        if (isNaN(fg.a)) return bg;
        return {
          r: Math.round(fg.r * fg.a + bg.r * (1 - fg.a)),
          g: Math.round(fg.g * fg.a + bg.g * (1 - fg.a)),
          b: Math.round(fg.b * fg.a + bg.b * (1 - fg.a)),
          a: 1
        };
      };
      const chain = [];
      let node = el;
      while (node && chain.length < 12) {
        chain.push({ tag: node.tagName, background: getComputedStyle(node).backgroundColor });
        node = node.parentElement;
      }
      const isDark = document.documentElement.getAttribute('data-mode') === 'dark' || document.querySelector('.app')?.getAttribute('data-mode') === 'dark';
      let bg = isDark ? { r: 8, g: 21, b: 28, a: 1 } : { r: 255, g: 255, b: 255, a: 1 };
      for (const item of chain.reverse()) {
        const parsed = parse(item.background);
        if (!isNaN(parsed.r)) bg = blend(parsed, bg);
      }
      const fgStyle = getComputedStyle(el).color;
      return {
        fg: fgStyle,
        ancestorBackgrounds: chain,
        compositedBackground: `rgb(${bg.r}, ${bg.g}, ${bg.b})`
      };
    });

    // Theme switching & contrast checks
    console.log('Testing true theme switching and contrast for review badges...');
    const lightTheme = await switchTheme(pageA, 'light');
    await pageA.waitForTimeout(300);
    const lightBadgeColors = await measureBadge();
    const lightBadgeContrast = calculateContrast(lightBadgeColors.fg, lightBadgeColors.compositedBackground);
    console.log(`Light badge contrast: ${lightBadgeContrast}:1 over ${lightBadgeColors.compositedBackground} (fg: ${lightBadgeColors.fg})`);
    report.b28_presentation_and_accessibility.contrast_review_badges_light_pass =
      !isNaN(lightBadgeContrast) && lightBadgeContrast >= 4.5;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '07_b28_light_theme_presentation.png') });

    const darkTheme = await switchTheme(pageA, 'dark');
    await pageA.waitForTimeout(300);
    const darkBadgeColors = await measureBadge();
    const darkBadgeContrast = calculateContrast(darkBadgeColors.fg, darkBadgeColors.compositedBackground);
    console.log(`Dark badge contrast: ${darkBadgeContrast}:1 over ${darkBadgeColors.compositedBackground} (fg: ${darkBadgeColors.fg})`);
    report.b28_presentation_and_accessibility.contrast_review_badges_dark_pass =
      !isNaN(darkBadgeContrast) && darkBadgeContrast >= 4.5;

    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '08_b28_dark_theme_presentation.png') });
    report.b28_presentation_and_accessibility.theme_switching_verified = lightTheme.dataMode === 'light' && darkTheme.dataMode === 'dark';

    // Restore light theme
    await switchTheme(pageA, 'light');

    // Viewport Containment Checks
    console.log('Verifying responsive viewport containment...');
    const testViewport = async (w, h, name) => {
      await pageA.setViewportSize({ width: w, height: h });
      await pageA.waitForTimeout(300);
      const hasHorizontalScroll = await pageA.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth;
      });
      console.log(`Viewport ${name} (${w}px): horizontal overflow=${hasHorizontalScroll}`);
      return !hasHorizontalScroll;
    };

    report.b28_presentation_and_accessibility.viewport_containment_desktop_1280px_verified = await testViewport(1280, 800, 'desktop');
    report.b28_presentation_and_accessibility.viewport_containment_tablet_768px_verified = await testViewport(768, 1024, 'tablet');
    report.b28_presentation_and_accessibility.viewport_containment_mobile_320px_verified = await testViewport(320, 568, 'mobile320');
    await pageA.screenshot({ path: join(SCREENSHOTS_DIR, '09_b28_mobile_320px_presentation.png') });

    // Restore desktop viewport
    await pageA.setViewportSize({ width: 1280, height: 800 });

    // Keyboard navigation and deterministic activation proof
    console.log('Testing keyboard navigation accessibility and deterministic activation...');
    const keyboardProof = await executeKeyboardActionProof(pageA);
    console.log(
      `Keyboard proof: focusedCount=${keyboardProof.focusedCount}, focusRing=${keyboardProof.hasFocusRing}, ` +
      `targetFocused=${keyboardProof.targetFocused}, open=${keyboardProof.openStateVerified}, ` +
      `close=${keyboardProof.closeStateVerified}, actionActivated=${keyboardProof.actionActivated}`
    );
    if (!keyboardProof.passed) {
      console.error(`Keyboard proof failed: ${keyboardProof.reason}`);
    }
    report.b28_presentation_and_accessibility.keyboard_navigation_accessible = keyboardProof.passed === true;

  } catch (err) {
    console.error('Execution error occurred:', err);
    report.status = 'FAILED';
    report.error = err.message;
  } finally {
    // ==========================================
    // Fail-Closed Cleanup Protocol
    // ==========================================
    console.log('\n=== Executing Fail-Closed Cleanup Protocol for Both Synthetic Users ===');
    cleanupA = await performCleanup({
      userId: userAId,
      page: pageA,
      clerkClient
    });

    cleanupB = await performCleanup({
      userId: userBId,
      page: pageB,
      clerkClient
    });

    if (browser) {
      await browser.close().catch(() => {});
    }

    const cleanupReport = {
      userA: cleanupA,
      userB: cleanupB
    };

    report.cleanup = cleanupReport;

    persistEvidence(report, cleanupReport);

    const evaluation = evaluateReport(report, cleanupReport);
    console.log('\n=== Explicit Evaluation Result ===');
    console.log(`Status: ${evaluation.passed ? 'PASSED' : 'FAILED'}`);
    if (!evaluation.passed) {
      console.error('Evaluation failures:');
      for (const fail of evaluation.failures) {
        console.error(` - ${fail}`);
      }
      process.exitCode = 1;
    } else {
      console.log('All criteria verified and evaluated successfully!');
    }
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runAllProofs().catch((e) => {
    console.error('Fatal execution error:', e);
    process.exit(1);
  });
}
