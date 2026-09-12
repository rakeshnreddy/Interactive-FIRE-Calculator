# C03 clarified rework: accurate hero and verifiable evidence

Implement only the following repairs on `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, `codex/finpath-quality-execution`, PR140. First inspect clean state and HEAD, read `reviews/C03.md`, `C03_START_PROMPT.md` and the implementation/validation protocol. This is the first C03 clarified rework, not a new checkpoint. B18/B19/B09 remain open; C04 locked. One writer. Preserve unrelated work. Free services and preview only; no main merge, production, schema/financial writes, new dependencies or src/lib/fire.ts edits.

## Preserve passing work

Keep the new headline, absence of stock phone/card image, desktop/mobile composition, exact public links, theme tokens, question-led starting paths, FIRE search, no-match/Clear behavior, and internal-copy/auth-gate cleanup. Primary review reproduced successful search, keyboard FIRE navigation and public auth escape; no search rewrite is requested. Existing C02 currency/atomicity/Node-test-environment/isolation fixes must remain.

Read `evidence/C03-review/` for actual primary observations and their limitations. Do not reclassify those bounded observations as complete accessibility conformance. The previously submitted deployment/CI identify 9cc7a33 (documentation commit over source fcc011e); record exact identifiers, do not manually guess a SHA. Do not deploy unchanged code merely to repair an attribution typo.

## R1 / B18: make the financial story internally consistent

Files: `src/lib/heroExample.ts`, `src/HeroFireExample.tsx`, their tests, small corresponding styles only if required.

Observed reproduction: current fixture has $500,000 savings, $60,000 initial annual spending, 7% nominal return, 2.5% inflation and 30 years. calculateFirePlan returns requiredPortfolio≈965931.4603 and maxAnnualExpense≈31058.0969. portfolioMode uses that solved ~$31,058 spending, but the hero labels the curve as if spending were $60,000. The final string “Sustained” is chosen by comparing formatted.initialPortfolio > '$0', unrelated to the outcome.

Use this exact product interpretation to avoid another ambiguous implementation:

1. The target card remains the engine-derived requiredPortfolio for the displayed initial annual spending. Keep current savings and target gap as separate comparison cards.
2. Plot **result.expenseMode**, which begins with the modeled target and funds input annualExpense under the existing engine semantics. Do not plot portfolioMode while labeling input annualExpense. Do not modify the engine, rerun a made-up formula or invent an accumulation curve.
3. Name the chart “Retirement withdrawals from the modeled target”. Show that starting portfolio is the modeled target, not the user's/example's $500,000 current savings. A short sentence should explain that the separate gap is between current savings and the modeled target.
4. State “Initial annual spending” rather than implying $60,000 stays constant when inflation applies. Show nominal return, inflation, horizon and that this is a USD example. Retain the estimate disclaimer. No promise that the user's retirement is assured.
5. Delete the string-based Sustained/Depleted branch completely. Render the numeric final balance from the selected expenseMode. For this fixture it is approximately $0.0111 and rounds to $0; say “Modeled end balance: $0”, not “Sustained” or “Failed”. A near-zero final balance is the fixture's desired terminal amount, not a generic success/failure signal.
6. Derive chart years from the selected series and render a readable USD balance axis or clearly labeled start/end amounts tied to the curve. Do not hard-code Year15/Year30 apart from the data. Include a zero baseline. Keep text readable on mobile. No new controls or scenario editor required.
7. Do not broaden this into a new FIRE forecast or change the approved headline/CTA.

Tests FIRST: add a regression that fails current implementation because the selected curve uses portfolioMode/$500k start instead of expenseMode/modeled target. Assert data series, plotted starting value, final value and visible spending label all agree with the same engine mode. Assert no string-derived “Sustained” status remains. Check the rendered end balance uses actual selected finalBalance and the chart's start is explicitly the modeled target. Comparing getHeroFireExampleData.requiredPortfolio to the same engine alone is insufficient: it missed this bug. Keep useful old tests; repair the misleading “accessible SVG” test described below.

## R2 / B18: provide the chart's information accessibly

Current `.hero-example-chart` ancestor is aria-hidden=true. A descendant SVG aria-label cannot undo that exclusion. The primary native accessibility tree confirms it omits the chart and its outcome.

Implement an exposed figure with a visible caption and concise text alternative naming the scenario, start/end years, USD start/end balance, and initial spending/inflation assumption. Use stable IDs (React useId if needed) to connect aria-labelledby/aria-describedby correctly. SVG can be role=img with title/desc; decorative icons remain aria-hidden. Avoid announcing every SVG point. Keep equivalent outcome/trend information in accessible DOM. Do not put any meaningful final-value statement solely inside an aria-hidden subtree.

Test that the chart/alternative is not under a hidden ancestor and that required scenario/value text is exposed. Inspect the real browser accessibility tree after rendering. Complete the original reader smoke where available; if unavailable, record it as blocked with the exact limitation, not “screen-reader accessible” based on string matches. B32's owner-specific deferral does not automatically waive B18. Do not alter OS security permissions or bypass protections to fabricate a pass.

## R3 / all three tasks: close the evidence gap truthfully

No new B19/B09 product redesign is required. Correct submissions and matrices: each claimed execution needs its real command/method, tested SHA/state, raw output and limitation. Remove unsupported “fully compliant”, inferred geometry PASS and zero-blocker claims. Static renderToStaticMarkup verifies markup, not event behavior, browser CSS, focus or zoom. Raw existing primary evidence may be reused when source is unchanged and attribution is explicit.

Complete original applicable gates for the corrected common candidate:

- Real built app at 320/390/612/768/1440 in both themes; measure document AND individual element bounds, clipping, long text/digits. Preserve primary CTA within 600px at 390; desktop 1440x900 CTA/example visible. Screenshots must be actual renders.
- Browser interactions: search mixed case/spaces, unknown query, clear, keyboard focus/Enter, disclosure expansion, result navigation; auth public escape. For B09 loading and signed-out states use real-component local fixtures outside published bundle, exercising the relevant callback/navigation. No hosted auth bypass or real records.
- Actual native 200% zoom with recorded browser zoom state. Test affected surfaces, keyboard and focus; deviceScaleFactor/CSSzoom/narrow viewport are not proof.
- Reduced motion and reduced transparency with media state actually matched; verify material fallback, not just that CSS contains a rule. Measure text contrast against the actual surfaces/gradient regions that sit behind it. State method and worst observed pair. Do not infer 14:1 for all text from a single palette color.
- Print landing in light/dark with print backgrounds on/off; record numerical/visual legibility. Hero must work without bitmap loading. Inspect representative mortgage and amortization copy in real browser, not only registry regex.
- Actual required reader smoke or explicit blocked status. Accessibility tree is valuable additional evidence, not evidence that VoiceOver was used.

Use scripts that fail nonzero when a real assertion fails. Save raw results and inspect them; do not paste “PASS” because the command was intended to run. Record actual browser/version, date and tested revision. No test that mirrors a CSS string or counts existence of an aria-label can certify layout/accessibility. Attach before/after R1/R2 repro evidence. Optional tiny polish: remove duplicate “without an account” sentence and use “30-year horizon”; these do not justify larger changes.

## Final verification and review boundary

Run relevant red/green tests, then `./scripts/test_all.sh` with Node 22 available, recording exit status and full counts/log. Full current baseline is 1508 Vitest/35 files,79 Python+21 subtests,13 runner,typecheck/build; new meaningful tests may increase counts. Do not copy an earlier number. No dependency changes expected. `git diff --check`, separate reviewable commits, push execution branch only.

Publish corrected product after passing tests to an explicitly named preview branch. Verify effective isolated preview DB UUID 0dbad68e-7493-452f-8504-98d4c61ee5da; no migration or hosted financial write is required. Record actual deployment trigger SHA and exact-candidate CI, or a precise source/test/config tree comparison when evidence is on a documentation-only descendant. Run all 84 public-route smoke checks and browser journey on the new immutable preview. Update all three submissions to one common final candidate; retest affected provisional tasks after later edits.

Run `python3 docs/execution/validate_packet.py`. It checks packet structure, not product quality. Only mark ready_for_review when applicable evidence is complete. Otherwise blocked with precise missing check and all independently executable work finished. Never mark done, edit primary reviews, check master backlog, release C04, merge main or deploy production.

Stop at C03 boundary. Handoff must list R1/R2/R3 fixed or blocked with exact evidence links, candidate/full HEAD, PR, immutable preview, CI and remaining limitations. Ask the primary session to review C03 again using MASTER_REVIEW_PROMPT.md. Do not resubmit the same unsupported success claims. The primary reviewer retains final acceptance and will take ownership if the clarified retry threshold is reached.
