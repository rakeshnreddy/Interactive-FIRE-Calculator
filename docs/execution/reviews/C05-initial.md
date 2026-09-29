# C05 independent review — CHANGES_REQUESTED

Primary reviewer, 2026-09-13. Submitted code `db6b9e36a499dafda6e43cd0f7258cd483d4c97a`; evidence/tooling HEAD `1e31a3f62030df0be52d174bfd022e82fbbdfe17`. PR [140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140), base `codex/dependency-security-refresh`. Submitted preview https://f51c818b.interactive-fire-calculator.pages.dev.

## Independent checks

Read changed FIRE state/form code, dedicated calculator presentation changes, task submissions and collector code. Lower-cost evidence audit supplied candidate findings; primary independently corroborated the blocking findings below. Exact submitted HEAD CI [34784371718](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34784371718) is successful. Post-code diff contains evidence and executable verification scripts, not website source/config changes; there is no separate candidate CI URL in the submission, so reference this verified run with that qualification. Worker full-suite log records 1,548 Vitest tests; existing public-route smoke reports 84/84. No redundant full-suite rerun was warranted to establish the defects below.

Primary ran a short independent Playwright Chrome probe on the submitted public preview. [Probe and observations](../evidence/C05-primary-review/critical-probe.json) reproduce nine duplicate-ID groups, second Years label focusing the first field, and closed help reporting aria-expanded=false while computed opacity remains1 after transition settlement. No authenticated writes were performed.

## Required corrections

**R1 / B24 — repeated field labels target the wrong input (P1, confidence10/10).** `src/App.tsx:2550`: `const resolvedId = childId || `field-${fieldSlugify(label)}`;`. Repeated Years/Return/Inflation, event labels and recurring fields share IDs. On the preview, clicking the second Years label focuses the first period input. This is ordinary label/keyboard correctness, not the deferred actual-reader check. Give each Field instance a stable unique fallback ID and preserve explicit IDs. Test repeated period/event/scenario labels and associated issue/help IDs, including adding/removing rows.

**R2 / B24 — disclosure state and visual state disagree (P2, confidence10/10).** `src/styles.css:2107` keeps `.info-tip:focus-within .info-popover` visible regardless of `isOpen`; `InfoTip` reports only `isOpen` in aria-expanded. Focus Current age help, press Enter twice, retain focus: aria-expanded=false but tooltip opacity1. Define one coherent open/close model; Enter/Space toggle, Escape closes without losing the trigger, and closed help must remain visually closed while focused. Test computed visibility after transitions, not just ARIA. Keep descriptions available to inputs.

**R3 / B24 — stale result snapshot is only partially applied (P2, confidence9/10 from source).** `projectionRows` uses `activeResultForDisplay`, while `src/App.tsx:7892` still renders `plan.withdrawalTiming` and `comparisonRows` at5795 uses live `plan`/`result`. After Calculate then changing withdrawal timing, old projection rows are labelled with new timing; compare values also update while the hero remains frozen. Preserve a coherent calculation snapshot across result metadata/rows/compare/export, or explicitly separate live comparison and prevent mismatched stale metadata. Do not silently change draft saving semantics. Add interaction tests for timing changes, comparison, CSV and recalculation, both modes. No formulas change.

**R4 / B22+B23+B24 — browser evidence can pass without the claimed behavior (P1, confidence10/10).**
- Hosted `setTheme` writes attributes on documentElement instead of `.app[data-mode]`; local B22/B23 use similarly incorrect theme state. SHA1 of hosted FIRE light and dark screenshots is identical (`2b0abdf8137eb19612cbebb16710c3566ed6d2da`). Use the real toggle or pre-navigation `finpath.colorMode`, assert requested/observed theme and different computed colors, then capture.
- Hosted collector178–195 mutates React inputs directly and accepts default `Estimated net worth` as evidence of a deficit. Use real fill/input actions and exact independently expected negative headline/value, plus a positive control.
- Hosted collector322–364 checks only media query matches and foreground text color: these do not establish reduced behavior or contrast. Native200 is explicitly BLOCKED but also says “verified via manual spot-check” without durable proof. There are no actual keyboard actions in submitted collectors. Collect real observations or mark required rows blocked. Actual-reader smoke remains owner-deferred and is not a blocker.
- Hosted collector ends successfully after writing results even when statuses/telemetry/general checks fail. Local B22 disclosure status ignores its timing/schedule flags. Add one fail-closed evaluator and negative fixtures; no missing required case, missing observation, wrong theme, FAIL, console exception or mandatory BLOCKED may produce success/exit0.
- Complete missing task-specific state coverage (warning-heavy/invalid/zero/long inputs, edit/reset, disclosure reachability, both FIRE modes, draft/compare/export). Browser states need real observations; scoped component evidence may cover injected save errors if browser rendering is separately evidenced. Do not create production auth bypasses. Reasoned N/A is appropriate for genuinely unchanged/unaffected behaviors, not as a replacement for explicit task criteria.

**R5 / combined checkpoint — preview provenance not established (P1, confidence10/10 about the record).** `evidence/C05/deployment.json:12–13` records `commit_hash:8d9a4c4`, `commit_dirty:true`, while submissions identify db6b9e3. This does not prove the deployed product is wrong; it proves the record cannot establish exact-candidate correspondence. Build/deploy the repaired combined candidate from a clean checkout and retain provider trigger SHA/dirty flag plus local/deployed asset correspondence. Use exact hosted CI revision and preserve isolated preview DB binding. No production deployment.

## Decisions and visual limits

| Task | Decision | Preserve |
|---|---|---|
| B22 | changes_requested, shared R4/R5 | Compact header/trust-strip removal, 16px inputs and existing specialized calculations |
| B23 | changes_requested, shared R4/R5 | Explicit deficit/reserve labels, blank/nonfinite formatting and FAQ disclosures |
| B24 | changes_requested, R1–R5 | Concise core labels, described help intent, visible stale notice and frozen financial engine |

A final light/dark visual score is withheld because the supplied theme evidence is invalid; screenshots existing on disk are not proof of theme or interaction. No other previously accepted task is reopened. No src/lib/fire.ts change, main merge, production deploy or paid service occurred.

## Closure actions

No C05 tasks accepted. 16/34 remain accepted (47.1%, task count). C06 locked. Follow [C05_REWORK_PROMPT.md](../C05_REWORK_PROMPT.md) for one consolidated repair. The lower-cost worker owns implementation and routine verification. Primary reviews exact-revision evidence and reproduces critical claims; it does not automatically repeat the worker's whole matrix. No additional business decision is required for these repairs. Missing native browser capability must be reported early and truthfully; reader access is deferred under ACCESSIBILITY_DEFERRALS.md.
