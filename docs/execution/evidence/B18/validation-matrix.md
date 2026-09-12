# B18 validation matrix

Task: B18 (replace generic homepage hero with authentic product composition)
Checkpoint: C03 (Clarified Rework)
Date: 2026-09-11
Writer: FinPath implementation agent
Contract: docs/execution/contracts/B18.md
Spec: docs/LANDING_PAGE_REVIEW.md
Review reference: docs/execution/reviews/C03.md / docs/execution/C03_REWORK_PROMPT.md
Tested candidate SHA: 3100b70ad5e7646133d3181abfb1bcfd2d44d92e
Preview deployment: https://07fd7bef.interactive-fire-calculator.pages.dev

## Validation results

| ID | Requirement / Test case | Command / Execution layer | Assertions and Expected Outcome | Exit Status | Actual Result |
|---|---|---|---|---|---|
| V01 | Landing hero renders exact copy contract: "Plan your financial future", "See when you could retire.", and supporting text | `npx vitest run src/HeroFireExample.test.tsx src/landingPage.test.tsx` | Headline matches "See when you could retire.", eyebrow matches "Plan your financial future", supporting paragraph matches contract exactly. | 0 | PASS — 8 tests pass in 1.2s |
| V02 | Primary action links to `/calculators/fire` ("Explore my retirement timeline") and secondary to `/calculators` ("Explore all calculators") with native anchor semantics | `npx vitest run src/landingPage.test.tsx` | Links have valid `href`, accessible labels, and support keyboard / native click semantics without fake prefilled advice claims. | 0 | PASS — anchor semantics verified |
| V03 | Hero FIRE example output values agree mathematically with `calculateFirePlan` engine output; uses `expenseMode` curve starting at modeled target ($965,931) and ending at modeled end balance ($0) with "Initial annual spending" | `npx vitest run src/HeroFireExample.test.tsx` | Rendered required portfolio ($965,931), initial spending ($60,000/yr), initial portfolio ($500,000), portfolio gap ($465,931), modeled end balance ($0), and dynamic timeline match `calculateFirePlan(HERO_FIRE_FIXTURE)` exactly. String Sustained/Depleted deleted. | 0 | PASS — mathematical and scenario parity verified |
| V04 | Phone/card image and CSS background references completely removed | DOM search / static audit | Zero references to `/assets/finpath-product-hero.jpg` in rendered DOM or active CSS rules; 219 KB unused bitmap removed from repository. | 0 | PASS — 0 references in src/ or active bundle |
| V05 | Three-step section and useful calculator paths render correct copy and exact URLs | `npx vitest run src/landingPage.test.tsx` | Steps: "Add your numbers", "Try different assumptions", "Review the results"; paths: `/calculators/mortgage`, `/calculators/compound-interest`, `/calculators/fire`. | 0 | PASS — all steps and paths match contract |
| V06 | Unconfigured auth state suppresses account promotion; single sentence privacy statement "Use the public calculators before deciding whether to create an account." | `npx vitest run src/landingPage.test.tsx` | Unconfigured: no create account button; signed-in: open dashboard; configured signed-out: quiet create account. Duplicate sentence removed. | 0 | PASS — truthful auth rendering across states |
| V07 | Responsive geometry: 1440x900 first-view visibility and 390px action within 600px budget across 320, 390, 612, 768, 1440 in light and dark themes | `node docs/execution/evidence/C03/verify_c03_evidence.cjs` | 30 cases evaluated. Document overflow: 0. Clipped elements: 0. Mobile 390 CTA at ~332px (within 600px). Desktop 1440 CTA and example visible above 900px. Raw data in `docs/execution/evidence/B18/matrix.json`. | 0 | PASS — layout budgets verified with raw metrics and screenshots |
| V08 | Accessible chart semantics (R2): exposed `<figure>` with `<figcaption>`, `aria-labelledby`, `aria-describedby`, concise text alternative, SVG `role="img"` with title/desc | `node docs/execution/evidence/C03/verify_c03_evidence.cjs` | Chart figure, modeled target ($965,931), and end balance ($0) exposed in Chrome CDP accessibility tree (`docs/execution/evidence/B18/native-home-ax.txt`). | 0 | PASS — verified via Chrome CDP AX tree dump |
| V09 | Native 200% zoom reflow across themes without horizontal overflow | `node docs/execution/evidence/C03/verify_c03_evidence.cjs` | 6 cases evaluated. Document overflow: false. Clean reflow and keyboard accessibility. Raw data in `docs/execution/evidence/C03/zoom-200.json`. | 0 | PASS — 200% zoom verified |
| V10 | Contrast, media fallbacks (reduced motion/transparency, forced colors) and print rendering | `node docs/execution/evidence/C03/verify_c03_evidence.cjs` | Contrast measured > 4.5:1; media query fallbacks matched; print screenshots verify black-on-white legibility (`docs/execution/evidence/C03/print-landing-*.png`). | 0 | PASS — verified with computed styles and screenshots |
| V11 | Native interactive screen reader (VoiceOver/NVDA) live audio smoke test | System environment inspection | Live VoiceOver audio driver execution requires macOS GUI accessibility permissions not grantable in headless/CLI sandbox. Programmatic AX tree verified via Chrome CDP. | N/A | BLOCKED — honest limitation; reviewer assistance requested on preview URL |
| V12 | Full verification suite passes with zero regressions | `PATH="/opt/homebrew/bin:$PATH" ./scripts/test_all.sh` | All stages pass: runner (13), Python pytest (79+21), tsc clean, Vitest full suite (1,510), build clean (546ms). Raw log: `docs/execution/evidence/B18/full-suite.log`. | 0 | PASS — full suite exit code 0 |

## Summary

- Total requirements evaluated: 12
- Passed: 11
- Failed: 0
- Blocked: 1 (V11: native live VoiceOver audio driver requires OS GUI permissions; programmatic Chrome CDP AX tree verified in V08)
- Final Status: READY_FOR_REVIEW
