# C04 bounded rework: units, settlement edges, trustworthy verification

Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/finpath-quality-execution`, PR140. Read reviews/C04.md and C04_START_PROMPT.md, original B08/B20/B21 prompts and contracts. This is the first consolidated C04 rework. Preserve reviewer-authored contracts; write clarifications in contracts/<ID>-working.md. Inspect current HEAD and working tree; preserve others' changes. No C05, main merge, production, paid service, new financial data writes or src/lib/fire.ts edits.

Keep the passing mortgage reference fixes, input-first layout, visible helpers, disclosures, true-zero/signed bars and table alternative. Repair only R1–R4. Do not redo C03 or redesign calculator pages. The existing execution amendment still applies: targeted checks per meaningful change, separate local commits, one full suite before combined push, one final candidate CI and preview.

## R1 — carry units from source to every displayed chart value

Files: src/lib/calculatorStudios.ts chart types/builders; src/CalculatorLibrary.tsx CalculatorStudioVisual/formatChartValue; chart tests. Trace all four chart builders, not just the CAGR route.

Before implementation add a failing test using the actual CAGR calculator/default input: headline annualized return and Base chart/table must both show approximately 12.47%, not 0.1. Add negative CAGR initial10000/final5000/years5 (~-12.94%), a currency value below1000, zero currency, numeric/years >1000 that must not acquire a currency symbol, dual-series formatting and mixed-unit fixtures. Expected results come from metric valueType and independent formatting expectations, not the current formatter's output.

Add explicit unit metadata at the appropriate chart/series/entry boundary. Carry source metric valueType and currency through comparison/waterfall builders; give amortization/timeline series their actual currency meaning. Preserve percentage conventions: metric percent ratios (0.1247) differ from percent input values (12.47). Normalize only at a documented presentation boundary; never change engine output to fix a label. Remove magnitude-based unit guessing. Both visible row labels and semantic tables must use the same unit-aware formatting.

Review waterfall's arbitrary first metrics/input fallback. Never put unlike currency/percent/years quantities on one shared scale. Group only compatible measures, or retain incompatible context as clearly labeled text outside the chart. Do not manufacture a denominator or delete important values. All-zero/mixed-sign geometry stays finite; bars retain common scale for compatible values. Include an unequal-value geometry regression (e.g. 25 vs100), not only a width-presence assertion. Check series labels/swatches remain meaningful for actual row tones.

## R2 — distinguish opening principal from a terminal floating residual

Files: seoCalculators.ts payoffDebt, calculatorStudios.ts schedule helpers, mortgageReconciliation.test.ts and docs/calculators/mortgage-payoff-rounding.md.

Write failing coverage for a positive opening balance0.005 at rate0/payment0.001: it must not vanish as zero payments/zero principal paid. Prefer applying tolerance only to a final actual-payment settlement, with principal/payment conservation. If public inputs intentionally reject precision, make that validation explicit and test it; an implicit helper early-return is not validation.

Add boundary cases balances1000.004,1000.005,1000.006 with rate0/payment1000. Under the current approved inclusive half-cent final-adjustment policy, first two settle in one payment and third in two. Assert headline/schedule count agreement, total principal paid, payment totals and exact zero ending balance. Retain $200k/$300k, zero-rate, shorter term and prepayment cases. Do not raise tolerance or round every period to hide the discrepancy.

Correct the document: frontend annual rate6.5 percent converts to0.065, then monthly0.065/12; decimal0.065 must not be divided by100 again. Final actual payment may exceed the scheduled amount by at most the documented tolerance; do not promise it can never exceed it. Describe this as FinPath's numerical modeling policy; do not attribute a specific half-cent tolerance to regulation unless the cited primary source actually establishes it.

## R3 — verify the actual theme, not a screenshot filename

Fix B20/B21 and C04 browser collectors. html[data-theme] and localStorage.theme do not control FinPath. Use the actual theme toggle, or `.app[data-mode]` with explicit observed-state assertions for isolated rendering. Record requested mode, observed `.app` mode and a computed canvas/text color pair before each case. Light/dark observations must differ appropriately. Never label the same light rendering as both themes. Regenerate only invalid/stale evidence and cases affected by new code.

Add a negative verifier test where requested dark/observed light is rejected. The actual browser flow must also confirm the mode, so a unit fixture cannot substitute for applying it.

## R4 — failure flags must fail the real verifier

Repair `evidence/C04/verify_hosted_c04.cjs`; reuse appropriate existing utilities rather than building another large framework. Define required case IDs from this checkpoint's routes/states/themes. Require each exactly once. Aggregate all required assertions and unexpected console/page errors into one persisted verdict and the actual CLI exit code. A caught collection error, false bXX_pass, missing case, duplicate replacement, wrong theme, incorrect percentage unit or malformed measurement cannot print success or exit0.

Write small negative tests that run the production evaluator/CLI fixture path. Demonstrate expected nonzero exit plus persisted failure for each defect above, and a fully valid synthetic packet that passes. Do not simulate only a different test CLI. Browser assertions must compare actual numeric labels and meaningful geometry, not merely existence of a table, swatch or minus sign.

Complete applicable original gates for changed surfaces: actual 200% browser zoom, keyboard disclosure expansion/collapse with retained focus, both themes, reduced-motion/transparency computed behavior, contrast for changed text/control treatments and real print output if affected. Use the native Chrome CUA method documented in C03-final/primary-observations.md; do not falsely claim headless limitations cover all available tools. Keep evidence honest if a required assisted check remains unavailable. The owner's C03 reader deferral is not a blanket conformance claim. Finish independent authorized work before reporting a precise remaining assistance need.

## Freeze and hand off once

Run relevant tests after each repair, then ./scripts/test_all.sh once for the final executable candidate before combined push. No new dependencies expected; audit if changed. Commit fixes separately, push the existing branch, deploy its tested build only to the explicit free preview branch, verify intended/effective isolated DB, exact provider SHA/dirty flag and asset identity. Verify all84 public routes and all affected C04 journeys on one immutable URL; wait for exact candidate CI. Later documentation-only updates require identity proof rather than repeating full tests/deployment.

Update progress digest, task matrices and submissions with R1–R4 fixed/failed/blocked, actual observations, complete logs and exact identifiers. Do not set ready_for_review while required evidence is missing; do not set done, edit primary reviews or release C05. Return a compact index of evidence and the concrete changes, not pasted logs. Primary will independently inspect high-risk deltas and close only passing tasks.
