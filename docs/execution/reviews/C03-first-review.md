# Checkpoint C03 independent review

Primary reviewer, 2026-09-11. Decision: **CHANGES_REQUESTED**. No C03 task accepted. C04 remains locked. Accepted progress remains 10/34 (29.4% by task count).

Reviewed baseline 5ac75c8 through product fcc011e3914fdc63fee8dc577491533d0211754b; submission HEAD 832d37e. PR140 is open, base codex/dependency-security-refresh. Actual Cloudflare deployment and green CI 34604754497 identify **9cc7a338c863e998ccedb9882ce9cc2d7c3b0adf**, not fcc011e. Their source/test/config trees match: the intervening commit changes documentation/status only. This is an attribution correction, not proof of a different website. Immutable preview: https://a26c412b.interactive-fire-calculator.pages.dev. Effective Functions DB is isolated UUID 0dbad68e-7493-452f-8504-98d4c61ee5da; deployment successful, clean. [Metadata](../evidence/C03-review/deployment.json).

## Independent checks actually performed

Read the changes, contracts, tests and submissions. Reran ./scripts/test_all.sh under Node 22:13 runner tests;79 Python tests+21 subtests;1508 Vitest tests/35 files; TypeScript/build pass, exit 0. [Full log](../evidence/C03-review/full-suite.log). Hosted CI succeeds on 9cc7a33; candidate attribution corrected above. No dependencies or shared formulas changed.

Rendered /, /calculators and /dashboard in Chromium at 320/390/768/1440 in both themes: 24 cases, no page errors or document overflow. Mobile 390 primary CTA y 332.25px, within 600px; desktop 1440 CTA and example visible above 900px. These measured values supersede the worker's inferred301px. [Matrix](../evidence/C03-review/matrix.json), screenshots in same folder. Native Chrome toolbar reports 200%; actual theme toggle works; enlarged landing, library and unavailable gate visually inspected. Home accessibility tree omits the entire meaningful chart, confirming R2. Native screenshots/tree are bounded observations, not a full screen-reader or all-state accessibility pass.

Actual hosted interactions pass: mixed-case/trimmed FIRE query, no-match, Clear restoration, keyboard Enter opens FIRE, unavailable auth gate's public action opens library. [Interaction results](../evidence/C03-review/interactions.json). All 84 public routes pass [smoke](../evidence/C03-review/smoke.log). The public layout is materially clearer and phone/card asset is removed. Preserve this work.

## Task decisions

| Task | Decision | Scope of remaining work |
|---|---|---|
| B18 | changes_requested | R1 financial scenario/outcome consistency; R2 accessible chart; R3 honest complete evidence |
| B19 | changes_requested | R3 evidence-only correction/completion; no new confirmed search implementation defect in the reproduced journey |
| B09 | changes_requested | R3 evidence-only correction/completion; copy cleanup/public escape passes reproduced checks, preserve it |

### R1 — P1: hero chart and outcome contradict the displayed assumptions

src/HeroFireExample.tsx:10–11 uses result.portfolioMode; src/lib/fire.ts:932 computes that mode using solved maxAnnualExpense, not the input annualExpense. With the shipped fixture, required target=$965,931.46, current starting balance=$500,000 and **plotted annual spending=$31,058.0969**, while visible assumptions say $60,000/year. Plot final balance≈$0.9094. Line 75 determines “Sustained” by lexically comparing formatted.initialPortfolio with '$0'; it never reads a final result. There is no labeled dollar y-axis or numeric final balance to make the discrepancy clear. The existing parity test checks target output and strings but does not establish that the curve/status uses the stated scenario.

Required correction: use the existing engine's expenseMode for a clearly named retirement drawdown from the modeled target at the displayed $60,000 initial annual spending, inflated according to assumptions. Keep the $500,000 savings/gap comparison clearly separate. Show numeric start/end, USD balance units and horizon. Delete the string-based Sustained/Depleted branch. No formula edits. A test must prove selected series, withdrawal basis, start/end values and accessible/visible description all agree, rather than merely testing that the engine was called. See the precise implementation in C03_REWORK_PROMPT.md.

### R2 — P1: meaningful chart is hidden from assistive technology

src/HeroFireExample.tsx:69 sets aria-hidden=true on the entire chart including its heading, final status and SVG. The descendant aria-label does not override the hidden ancestor. Native AX tree independently includes target/current amounts but not the chart description/outcome. The test named “renders accessible SVG” only checks that an aria-label string exists and misses the exclusion.

Required correction: expose one concise chart alternative with scenario, time range, currency, start and end. Use figure/caption or role=img/title/desc with stable IDs; keep decorative icons hidden. A chart may remain decorative only if equivalent meaningful outcome/trend information is available outside its hidden subtree; recommended implementation below exposes the figure. Test effective semantics and inspect the browser accessibility tree. Complete the original reader smoke or record unavailable evidence honestly; B32's specific deferral is not a B18 waiver.

### R3 — P2: validation packets declare checks that were not evidenced

All three submissions mark browser/zoom/accessibility passes using semantic markup/CSS descriptions. B18 V07 claims a “Browser layout suite” and exit 0, but its evidence directory contains only validation-matrix.md, with no script/log/screenshots. Full-suite log paths are missing. B18 SVG accessibility pass is directly disproved by R2. B19 static render tests do not exercise input/clear events; B09 static auth rendering does not demonstrate that App routing or callbacks preserve every protected route. Public-smoke remains “To be executed” despite final submission. Claims such as “fully compliant” and “zero blockers” are unsupported.

Primary evidence now supplies the executed checks above and durable full log; reuse it with its revision/limits rather than rerunning unchanged work. Complete the remaining original gates on the corrected common candidate: actual CSS/browser cases at required widths including 612px, keyboard controls, genuine 200%zoom for affected changed states, reduced motion/transparency and opaque fallback, measured contrast over applicable backgrounds, print with/without backgrounds, and actual required reader smoke or a truthful blocked state. Exercise B09 loading/signed-out states in local real-component fixtures excluded from bundles; inspect representative mortgage/amortization copy on a real browser. Do not assert unavailable checks passed. Synchronize all three packets and current code SHA/CI/deployment relation, giving raw evidence paths.

## Visual judgment and scope discipline

Hierarchy8/10: headline and primary action clear; desktop answer visible. Theme8/10: different canvases and opaque cards, no irrelevant photograph. Responsive composition7/10: sampled layouts and native zoom reflow, further required states remain. Financial chart clarity3/10: mislabeled spending and unjustified outcome are blockers regardless of visual polish. Accessibility not passed: hidden meaningful chart and incomplete reader evidence. Discovery7/10: useful starting paths and functional search; lengthy toolkit page is an optional future refinement, not a new closure requirement. Copy8/10: internal phases/config directions removed; duplicate public-access sentence and “30 years horizon” are optional tiny polish edits within B18, not reasons to rewrite the design.

No main merge or production publication. No hosted writes, purchases or secrets. C02 remains accepted. Do not discard successful C03 code or redesign it from scratch. This is the first C03 clarified rework; use [C03_REWORK_PROMPT.md](../C03_REWORK_PROMPT.md), then resubmit the same checkpoint. The primary takes over a bounded repair if the protocol's repeated clarified-retry threshold is met. No owner business decision is needed for R1/R2 or executable R3 work; actual-reader evidence may need assistance if the implementing environment cannot provide it.
