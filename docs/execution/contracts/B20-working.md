# B20 working implementation contract

Checkpoint / task / status: C04 / B20 (Reorder generic calculators around inputs and the answer) / in_progress
Baseline / branch / writer: 6dacd29 / codex/finpath-quality-execution / FinPath implementation agent
User-visible outcome: In all generic calculators (specifically verified on Mortgage, SIP, and Income Tax India), the working area is prioritized. The repetitive 4-card introduction panel ("What it answers", "Why it matters", "How it fits", "How to read it") is relocated below the working calculator into a labeled Methodology & Context section. The calculator page heading preserves the exact H1 and a concise scope note. At 390px mobile viewport, the first editable input begins at or before y=650. The primary result metric is styled as visually dominant. Inaccessible `title`-only help icons are replaced with visible associated helper text on input fields (`aria-describedby`) and accessible native disclosure buttons on result metrics (`aria-expanded`, `aria-controls`, focus preserved).
Non-goals: No formula rewrites, no chart changes (B21 scope), no new saving APIs or schema changes.

## Implementation requirements

| ID | Criterion | Observed defect | Exact expected behavior | Likely function / file | Fixture | Assertion | Negative case | Evidence output |
|---|---|---|---|---|---|---|---|---|
| R01 | Input position on mobile | First input begins at y=1133 to y=1207 on 390px phone | First editable input begins at or before y=650 at 390px viewport | `CalculatorDetail` (`src/CalculatorLibrary.tsx`), `src/styles.css` | `/calculators/mortgage`, `/calculators/sip`, `/calculators/income-tax-india` | `firstInputDocumentY <= 650` | Retaining 4 intro cards above inputs leaves y > 1100 | `docs/execution/evidence/B20/verification-report.json` |
| R02 | Context & methodology relocation | 4 repetitive context cards clutter above-the-fold space | Context cards relocated below calculator grid in labeled methodology section; exact H1 and scope note retained | `CalculatorDetail` (`src/CalculatorLibrary.tsx`) | Any calculator route | `h1` matches original; methodology section exists after calculator grid | Removing methodology text entirely or altering H1 | `src/CalculatorLibraryDetail.test.tsx` |
| R03 | Visually dominant primary result | All metrics rendered with identical 2-column card styling | Primary result metric styled as prominent (full width, larger typography, accent surface) | `src/CalculatorLibrary.tsx`, `src/styles.css` | All calculator routes | Primary metric has `.calculator-result-metric-primary` class | Equal sizing on all metrics without visual hierarchy | `src/CalculatorLibraryDetail.test.tsx`, screenshots |
| R04 | Accessible helper disclosures | Inaccessible `title`-only attribute on `<span className="calculator-help-dot">` | Input fields have visible `<small className="calculator-field-helper">` with `aria-describedby`; metrics have native disclosure button with `aria-expanded` and `aria-controls` | `src/CalculatorLibrary.tsx` | Input helper and metric descriptions | Disclosure toggles open/close on click and keyboard; focus preserved | Hover-only or title-only tooltips | `src/CalculatorLibraryDetail.test.tsx` |
| R05 | Preservation of calculator state & behavior | Potential regression in values, scenarios, draft, save, or schedule | Scenario switching, input parsing, drafts, save callbacks, and schedule expand operate cleanly | `src/CalculatorLibrary.tsx` | Mortgage, SIP, Income Tax | Value changes update result; scenarios switch; schedule expands | Breaking scenario state or numeric parsing | `src/CalculatorLibraryDetail.test.tsx` |
| R06 | Responsive & theme verification | Ensure layout does not overflow or clip at 320px and 390px in light and dark modes | Zero overflow, zero console errors, clean print and keyboard navigation across viewports | `src/styles.css`, browser runner | 320px, 390px, 768px, 1440px; light & dark | Zero horizontal scroll, zero clipped controls, clean contrast | Overflow on small screens or broken dark theme colors | `docs/execution/evidence/B20/verification-report.json` |

## Validation requirements

| ID | Expected result | Test command / layer | Evidence destination | Actual result |
|---|---|---|---|---|
| V01 | Component unit & accessibility tests pass | `PATH="/opt/homebrew/bin:$PATH" npx vitest run src/CalculatorLibraryDetail.test.tsx` | `docs/execution/evidence/B20/validation-matrix.md` | Pending |
| V02 | Full repository test suite passes with zero regressions | `PATH="/opt/homebrew/bin:$PATH" ./scripts/test_all.sh` | `docs/execution/evidence/B20/validation-matrix.md` | Pending |
| V03 | Browser verification across viewports and themes confirms y <= 650 and zero console errors | Playwright browser runner `docs/execution/evidence/B20/verify_b20.cjs` | `docs/execution/evidence/B20/validation-matrix.md` | Pending |
