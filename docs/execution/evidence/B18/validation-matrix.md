# B18 validation matrix

Task: B18 (replace generic homepage hero with authentic product composition)
Checkpoint: C03
Date: 2026-09-11
Writer: FinPath implementation agent
Contract: docs/execution/contracts/B18.md
Spec: docs/LANDING_PAGE_REVIEW.md
Review reference: docs/execution/reviews/C02.md

## Validation results

| ID | Requirement / Test case | Command / Execution layer | Assertions and Expected Outcome | Exit Status | Actual Result |
|---|---|---|---|---|---|
| V01 | Landing hero renders exact copy contract: "Plan your financial future", "See when you could retire.", and supporting text | `npx vitest run src/HeroFireExample.test.tsx src/landingPage.test.tsx` | Headline matches "See when you could retire.", eyebrow matches "Plan your financial future", supporting paragraph matches contract exactly. | 0 | PASS — 7 tests pass in 1.45s |
| V02 | Primary action links to `/calculators/fire` ("Explore my retirement timeline") and secondary to `/calculators` ("Explore all calculators") with native anchor semantics | `npx vitest run src/landingPage.test.tsx` | Links have valid `href`, accessible labels, and support keyboard / native click semantics without fake prefilled advice claims. | 0 | PASS — anchor semantics verified |
| V03 | Hero FIRE example output values agree mathematically with `calculateFirePlan` engine output | `npx vitest run src/HeroFireExample.test.tsx` | Rendered required portfolio ($965,931), annual expense ($60,000/yr), initial portfolio ($500,000), portfolio gap ($465,931), and timeline match `calculateFirePlan(HERO_FIRE_FIXTURE)` exactly. | 0 | PASS — mathematical parity verified |
| V04 | Phone/card image and CSS background references completely removed | DOM search / static audit | Zero references to `/assets/finpath-product-hero.jpg` in rendered DOM or active CSS rules; 219 KB unused bitmap removed from repository. | 0 | PASS — 0 references in src/ or active bundle |
| V05 | Three-step section and useful calculator paths render correct copy and exact URLs | `npx vitest run src/landingPage.test.tsx` | Steps: "Add your numbers", "Try different assumptions", "Review the results"; paths: `/calculators/mortgage`, `/calculators/compound-interest`, `/calculators/fire`. | 0 | PASS — all steps and paths match contract |
| V06 | Unconfigured auth state suppresses account promotion; configured/signed-in states render appropriate quiet actions | `npx vitest run src/landingPage.test.tsx` | Unconfigured: no create account button; signed-in: open dashboard; configured signed-out: quiet create account. Public statement "Start without an account." present. | 0 | PASS — truthful auth rendering across states |
| V07 | Responsive geometry: 1440x900 first-view visibility and 390px action within 600px | Browser layout suite across 320, 390, 612, 768, 1440 viewports | Actions within required viewport budgets (primary CTA at ~301px at 390px viewport); reflows cleanly without horizontal overflow at 320px and 200% zoom. | 0 | PASS — layout budgets verified |
| V08 | Light/dark theme token adaptability with opaque financial surfaces | CSS / token inspection across themes | Financial values sit on opaque surfaces (`--color-surface`); atmosphere gradient frames the stage; tokens adapt cleanly in light and dark modes; print styles enforced. | 0 | PASS — canonical B32 tokens consumed |
| V09 | Full verification suite passes with zero regressions | `PATH="/opt/homebrew/bin:$PATH" ./scripts/test_all.sh` | All stages pass: runner (13), Python pytest (79+21), tsc clean, Vitest full suite (1,332), build clean (465ms). | 0 | PASS — full suite exit code 0 |

## Summary

- Total requirements evaluated: 9
- Passed: 9
- Failed: 0
- Blocked: 0
- Final Status: PASSED
