# B23 Validation Matrix — Unified Budget, Net-Worth, and Emergency-Fund Presentation

**Tested At**: `2026-09-13T21:31:15.164Z`  
**Target Routes**: `/calculators/net-worth`, `/calculators/budget`, `/calculators/emergency-fund`  
**Console Errors**: 0  
**Page Exceptions**: 0  

## Scope & Framing Checks (V10 Remediation)

| Target | Scope Note Present | Scope Note Text | Duplicate Trust Banner Removed | Native FAQ Disclosure | Status |
|---|---|---|---|---|---|
| Net Worth | Yes | "Build a dated household balance sheet, see what is liquid, and test how asset-value changes affect the snapshot." | Yes (Removed) | Yes | **PASS** |
| Budget | Yes | "Turn take-home income into an auditable monthly plan, separate spending from saving, and stress-test the cash left over." | Yes (Removed) | Yes | **PASS** |
| Emergency Fund | Yes | "Size a liquid reserve from essential spending, see current runway, and build a transparent month-by-month funding path." | Yes (Removed) | Yes | **PASS** |

## Accounting Labels & Negative States Checks

| Case | Expected | Observed | Status |
|---|---|---|---|
| Net worth deficit (k mortgage) | Estimated net deficit | Estimated net deficit | **PASS** |
| Budget deficit (k housing expense) | Monthly deficit | Monthly deficit | **PASS** |
| Emergency fund fully funded (default 6 months reserve) | Reserve target fully covered | Reserve target fully covered$27,000$4,500 × 6 months | **PASS** |

## Computed Typography Checks

| Target | Total Inputs | All Inputs Computed 16px | Total Selects | All Selects Computed 16px | Status |
|---|---|---|---|---|---|
| Net Worth | 11 | PASS (16px) | 2 | PASS (16px) | **PASS** |
| Budget | 16 | PASS (16px) | 2 | PASS (16px) | **PASS** |
| Emergency Fund | 9 | PASS (16px) | 4 | PASS (16px) | **PASS** |

## Progressive Disclosure Checks

| Target | Total Disclosures | Status |
|---|---|---|
| Net Worth | 5 | **PASS** |
| Budget | 6 | **PASS** |
| Emergency Fund | 6 | **PASS** |

## Viewport & Theme Screenshot Artifacts

| Target | Viewport | Theme | First Viewport Screenshot | Full Page Screenshot | Status |
|---|---|---|---|---|---|
| Net Worth | 1440x900 (desktop) | light | `net-worth-desktop-light-viewport.png` | `net-worth-desktop-light-full.png` | **PASS** |
| Net Worth | 1440x900 (desktop) | dark | `net-worth-desktop-dark-viewport.png` | `net-worth-desktop-dark-full.png` | **PASS** |
| Budget | 1440x900 (desktop) | light | `budget-desktop-light-viewport.png` | `budget-desktop-light-full.png` | **PASS** |
| Budget | 1440x900 (desktop) | dark | `budget-desktop-dark-viewport.png` | `budget-desktop-dark-full.png` | **PASS** |
| Emergency Fund | 1440x900 (desktop) | light | `emergency-fund-desktop-light-viewport.png` | `emergency-fund-desktop-light-full.png` | **PASS** |
| Emergency Fund | 1440x900 (desktop) | dark | `emergency-fund-desktop-dark-viewport.png` | `emergency-fund-desktop-dark-full.png` | **PASS** |
| Net Worth | 768x1024 (tablet) | light | `net-worth-tablet-light-viewport.png` | N/A | **PASS** |
| Net Worth | 768x1024 (tablet) | dark | `net-worth-tablet-dark-viewport.png` | N/A | **PASS** |
| Budget | 768x1024 (tablet) | light | `budget-tablet-light-viewport.png` | N/A | **PASS** |
| Budget | 768x1024 (tablet) | dark | `budget-tablet-dark-viewport.png` | N/A | **PASS** |
| Emergency Fund | 768x1024 (tablet) | light | `emergency-fund-tablet-light-viewport.png` | N/A | **PASS** |
| Emergency Fund | 768x1024 (tablet) | dark | `emergency-fund-tablet-dark-viewport.png` | N/A | **PASS** |
| Net Worth | 390x844 (mobile) | light | `net-worth-mobile-light-viewport.png` | `net-worth-mobile-light-full.png` | **PASS** |
| Net Worth | 390x844 (mobile) | dark | `net-worth-mobile-dark-viewport.png` | `net-worth-mobile-dark-full.png` | **PASS** |
| Budget | 390x844 (mobile) | light | `budget-mobile-light-viewport.png` | `budget-mobile-light-full.png` | **PASS** |
| Budget | 390x844 (mobile) | dark | `budget-mobile-dark-viewport.png` | `budget-mobile-dark-full.png` | **PASS** |
| Emergency Fund | 390x844 (mobile) | light | `emergency-fund-mobile-light-viewport.png` | `emergency-fund-mobile-light-full.png` | **PASS** |
| Emergency Fund | 390x844 (mobile) | dark | `emergency-fund-mobile-dark-viewport.png` | `emergency-fund-mobile-dark-full.png` | **PASS** |
| Net Worth | 320x568 (narrow) | light | `net-worth-narrow-light-viewport.png` | N/A | **PASS** |
| Net Worth | 320x568 (narrow) | dark | `net-worth-narrow-dark-viewport.png` | N/A | **PASS** |
| Budget | 320x568 (narrow) | light | `budget-narrow-light-viewport.png` | N/A | **PASS** |
| Budget | 320x568 (narrow) | dark | `budget-narrow-dark-viewport.png` | N/A | **PASS** |
| Emergency Fund | 320x568 (narrow) | light | `emergency-fund-narrow-light-viewport.png` | N/A | **PASS** |
| Emergency Fund | 320x568 (narrow) | dark | `emergency-fund-narrow-dark-viewport.png` | N/A | **PASS** |
