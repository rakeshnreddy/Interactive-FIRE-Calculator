# B03 Rendered Local UI Verification Evidence (R5)

Task: B03 (prevent mixed-currency account totals) / C02 rework R5
Date: 2026-09-11
Writer: FinPath implementation agent
Test Suite: `src/accountUiFixtures.test.tsx` (8 passing tests)

## Overview

As required by C02 rework requirement R5, the original eight tests verify static React markup and formatting only. They did not exercise CSS, viewports, keyboard or actual zoom. Primary browser evidence is now recorded in ../C02-review/browser-verification.md; these are separate kinds of evidence.

## Test Harness and Execution

- **Command**: `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/accountUiFixtures.test.tsx`
- **Output**: 8 passed in 1.18s
- **Framework**: Vitest + `react-dom/server` `renderToStaticMarkup` with React 18 and Vite 8

## Rendered State Verification Matrix

| State | Fixture Setup | Rendered Assertions | Status |
|---|---|---|---|
| **1. Empty State** | 0 accounts, 0 goals, empty cashflow rollup | `Net worth` displays `$0`, `0 active accounts`, `0 debt accounts`. No `NaN`, no `Unavailable`, clean zero states. | PASS |
| **2. USD-only State** | 1 asset ($100,000), 1 liability ($25,000), currency `USD` | `Net worth` displays `$75,000`, `Assets` displays `$100,000`, `Liabilities` displays `$25,000`. `2 active accounts`, `1 debt accounts`. Clean single currency USD formatting with `$`. | PASS |
| **3. INR-only State** | 1 asset (₹50,00,000), 1 liability (₹10,00,000), currency `INR` | Overview strip displays `₹4,000,000` net worth, `₹5,000,000` assets, `₹1,000,000` liabilities. Contains rupee symbol `₹` and zero dollar `$` signs in the overview strip. | PASS |
| **4. Mixed USD/INR State** | Asset USD ($50,000), Asset INR (₹80,00,000), Liability USD ($5,000) | Top-level aggregated cards render `<strong>Unavailable</strong>` to prevent false cross-currency addition. `<small className="currency-breakdown">` renders `USD: $45,000 · INR: ₹8,000,000`. No false combined sum ($8,045,000 or ₹8,045,000) is ever produced. | PASS |
| **5. Excluded Accounts** | 1 active ($20,000), 1 archived ($999,999), 1 inactive ($888,888) | Only the active account ($20,000) appears in the dashboard summary and latest account snapshot list. Archived and inactive accounts are completely omitted from rendered HTML. | PASS |
| **6. Long Values** | Single high-net-worth balance of $12,345,678,901 | Formatted cleanly as `$12,345,678,901`. No exponential notation (`e+`), no integer truncation, layout was not tested by this assertion. | PASS |
| **7. Semantic structure only** | Light/dark theme wrappers (`data-color-mode="dark"`, `className="theme-dark"`) | Semantic `<section className="financial-dashboard" aria-label="Financial dashboard">`, `<div className="dashboard-summary-grid">`, `<article className="tracker-metric tracker-metric-primary">` render semantic HTML only. The wrapper used here does not activate the production theme selector; viewport and zoom were not exercised. | PASS |
| **8. Plan Seed Rejection** | INR account import into USD FIRE plan | `previewPlanSeed` returns `ok: false`, with `error: 'India Account uses INR, not USD.'` and `reason: PLAN_SEED_ERROR_REASONS.CURRENCY_MISMATCH`. Cross-currency contamination is rejected at the plan seeding boundary. | PASS |

## Security and Isolation Statement

- No hosted Clerk auth bypass was used.
- All auth states used synthetic local test objects (`mockAuth` with `id: 'user_ui_fixture'`).
- Zero production or real user financial records were accessed or created.
