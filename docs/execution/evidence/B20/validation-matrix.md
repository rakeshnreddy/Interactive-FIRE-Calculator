# B20 Validation Matrix: Reorder Generic Calculators Around Inputs and Answer

- **Task**: B20 — Reorder generic calculators around inputs and answer
- **Checkpoint**: C04
- **Date**: 2026-09-13
- **Baseline Commit**: `7ad9d6cda5c13aabad2c0bc98a99fd52eeed371b`

## Implementation Requirements Matrix

| ID | Criterion | Expected Behavior | Verification Method / Fixture | Outcome | Observations |
|---|---|---|---|---|---|
| R01 | Input visibility above fold | First editable input element has document vertical coordinate $y \le 650\text{px}$ at 390px viewport | Mobile 390x844 Playwright: Mortgage, SIP, India Tax (light & dark) | **PASS** | Mortgage: $y=490.58\text{px}$ (baseline $1133.42\text{px}$); SIP: $y=456.03\text{px}$ (baseline $1146.88\text{px}$); India Tax: $y=516.17\text{px}$ (baseline $1207.02\text{px}$). All well under $650\text{px}$ limit. |
| R02 | Context & methodology repositioning | 4 context articles moved below calculator grid into `.calculator-methodology-panel` with clear semantic label | DOM query & position comparison in unit tests and Playwright | **PASS** | `.calculator-detail-grid` precedes `.calculator-methodology-panel` in DOM order. Heading has concise `.calculator-scope-note`. |
| R03 | Exact H1 preservation | Exact title and keyword preserved in `h1#calculator-detail-title` | Unit test & Playwright inspection | **PASS** | H1 text exact across all calculators (e.g., "Mortgage Payment Calculator", "SIP Calculator"). |
| R04 | Helper text association | Inputs have visible `.calculator-field-helper` associated via `aria-describedby`; no title-only help dot in labels | Unit tests (`CalculatorLibraryDetail.test.tsx`) & Playwright | **PASS** | Input `id` matches `htmlFor`; helper text `id` matched to `aria-describedby`; zero title-only help dots in label. |
| R05 | Visual hierarchy & primary metric | Primary metric card designated with `.calculator-result-metric-primary`, dominant font size and full-width layout | Unit tests, CSS inspection & Playwright | **PASS** | Primary metric card spans full grid width (`1 / -1`) with prominent font scale (`clamp(1.4rem, 2.6vw, 2.2rem)`). |
| R06 | Accessible metric disclosure | Metric descriptions use native `<button type="button" class="calculator-help-btn">` with `aria-expanded` and `aria-controls` | Unit test interaction & Playwright browser | **PASS** | Default `aria-expanded="false"`; clicking toggles to `"true"`, renders `<p class="calculator-metric-help-text" role="region">`, preserves button focus. |

## Validation Results

| ID | Gate | Command / Layer | Target | Result | Evidence |
|---|---|---|---|---|---|
| V01 | Targeted React Unit Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/CalculatorLibraryDetail.test.tsx` | 5 unit tests covering layout, ordering, disclosures, helpers, scenarios | **PASS** (5/5 passed) | `src/CalculatorLibraryDetail.test.tsx` |
| V02 | Full Studio & SEO Suite | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/lib/seoCalculators.test.ts src/lib/calculatorStudios.test.ts` | 641 tests across all calculator suites | **PASS** (641/641 passed) | Unit test runner |
| V03 | Multi-Viewport Browser Verification | `node docs/execution/evidence/B20/verify_b20.cjs` | 320, 390, 768, 1440 across Light & Dark themes with screenshots | **PASS** (11/11 cases passed) | `docs/execution/evidence/B20/verify_b20_results.json` and 11 screenshots |
