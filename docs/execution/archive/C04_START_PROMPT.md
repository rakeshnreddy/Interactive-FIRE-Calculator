# Execute C04 autonomously: truthful mortgage payoff, usable calculators, honest charts

You are FinPath's implementation worker. The primary session owns acceptance and release. Work sequentially through B08 → B20 → B21, then stop at the C04 review boundary. Do not stop after each passing task to ask permission for the next task inside this released checkpoint.

## Establish the exact starting point

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/finpath-quality-execution`, existing PR140. Inspect git status, branch, HEAD, remotes and applicable AGENTS.md. Fetch and fast-forward only if safe and clean. Preserve existing work; no force-push, reset, auto-stash or concurrent writers. Read `docs/execution/CHECKPOINTS.md` and `TASK_STATUS.json`: C03 must be accepted and C04 released before implementation. The ledger overrides this prompt if not yet released.

Read PRODUCT.md, DESIGN.md, docs/COLOR_AND_GLASS_SYSTEM.md, docs/VISUAL_DESIGN_SPEC.md, docs/execution/IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md, FREE_TIER_EXECUTION.md, reviews/C03.md and prompts/B08.md, B20.md, B21.md. Read current implementation and tests, following imports if a path is stale. Preserve C02 currency, atomic save/retry, test-environment and isolation fixes; preserve the C03 public hero, search, public auth escape and print fixes. `src/lib/fire.ts` is outside scope.

The owner's C03 screen-reader deferral is recorded in ACCESSIBILITY_DEFERRALS.md with B31 follow-up. It is not permission to claim WCAG conformance or silently waive unrelated task requirements. Finish all available checks before reporting any remaining assisted check.

## One contract and one acceptance matrix per task

Read authoritative contracts/B08.md, B20.md and B21.md when present. Preserve reviewer-authored requirements; put worker clarifications in contracts/<ID>-working.md using the existing templates. Include every criterion from its task prompt. For each row name observed defect, exact expected behavior, likely function/component, fixture, assertion, negative case, and evidence output. Separate product changes from verifier changes. Contracts may clarify implementation; they cannot expand authorization or weaken requirements. No approval pause is needed for routine implementation choices inside the contract.

## B08: reconcile mortgage headline with the actual schedule

1. Locate the actual mortgage calculation, schedule construction and headline months derivation (likely src/lib/seoCalculators.ts and calculator presentation imports). Reproduce 200000 principal, 6.5% annual rate, 30 years; compare 300000. Record raw final residual, scheduled rows and reported payoff months before editing. If the known defect is already repaired, prove why and add only missing meaningful regression coverage.
2. Write failing tests for the reproduced discrepancy. Cover zero interest, zero extra payment, extra principal, a negligible floating residual, a real residual that must require another payment, and final payment smaller than regular payment. Assert headline count equals schedule count, the final balance is settled only under the documented tolerance, and principal/interest/payment sums reconcile. Never hardcode 360 for all loans.
3. Before shared math changes, write docs/calculators/mortgage-payoff-rounding.md with the fixed-payment formula, a primary formula reference, annual-to-periodic units, numerical residual/tolerance decision in currency units, why material debt is not forgiven, saved-result compatibility and rollback. A source that simply repeats the implementation is not an independent reference. No rounding every balance merely to hide the final discrepancy.
4. Make the smallest correction at the source of divergence. Prefer one shared termination rule over contradictory headline and schedule calculations. Preserve existing return types and other calculator families. Do not change inflation/return/FIRE formulas or existing saved records.
5. Test the actual mortgage page at 390px, both themes: calculate both reference amounts, expand schedule, compare headline payoff and last row. Include console/page errors and actual numeric output. Run relevant goldens before the next task.

## B20: bring inputs and answer before repetitive explanation

1. Capture mortgage, SIP and India-tax at 390px with current defaults. Measure document y of the first visible editable input and save screenshots. Locate the shared CalculatorDetail/ScenarioPanel/SchedulePanel in src/CalculatorLibrary.tsx and their CSS; inspect dedicated families before changing a shared selector.
2. Move the repetitive introductory blocks below the working calculator. Keep the exact H1 and one concise scope/material assumption before inputs. Do not remove substantive methodology; place it after the answer in a clearly labeled section/disclosure.
3. At 390px and normal text, first representative control begins at or before y=650. Desktop may align inputs and answer; DOM/tab order must still flow logically. Make the primary result visually dominant and limit supporting figures to the relevant existing outputs. Never invent a “recommended” outcome or hide financial warnings.
4. Replace title-only explanatory help with associated visible text or a native disclosure button. Behavioral disclosure changes need tests first: keyboard open/close, expanded state, unique label association and preserved focus. Avoid inaccessible hover-only replacements.
5. Preserve numeric parsing, scenario selection, draft/save/share actions, warning behavior and schedule access. Do not add global overflow:hidden to disguise clipping. Test zero, lower and large inputs; record unrelated math defects separately without silently broadening this task.
6. Verify desktop/tablet/320/390, both themes, real browser zoom, keyboard, no overlap, long values and print where changed. Reuse C03 verification techniques with the correct task-specific expected sets; do not copy C03 counts as proof of C04 coverage.

## B21: charts must represent the quantities they label

Read prompts/B21.md in full. Inventory the shared chart renderer, category rows and timeline mappings before editing. For each selected mortgage/SIP/tax example, write down each plotted quantity, unit, denominator and time basis from actual engine output.

Replace misleading relative bars or decorative path geometry with a representation that preserves meaning. Monetary portions need a common denominator when shown as proportions. Rates, years and dollars must not share an unlabeled scale. Timelines use explicit year/period labels and correct zero/negative handling; never convert losses to absolute-value gains or conceal them with a minimum positive bar. Use existing chart facilities and tokens, no new chart library. Provide visible labels/values plus a text/table alternative and non-color status cues; tooltip-only information is insufficient.

Before implementation, create tests with deliberately unequal values to distinguish real proportional geometry from normalized-per-item bars; include all zero, mixed-sign and negative-result fixtures. Assert the displayed unit and denominator, finite geometry and meaningful labels. Preserve raw engine results; any display rounding is separate. Verify actual rendered mortgage, SIP, tax and a negative-result fixture in both themes and at 320px. Test B08 and B20 again if B21 touches their shared output path.

## Verification that cannot silently pass

- Fixed required case identities, not just array length. Reject duplicates, missing routes/states/themes, malformed measurements, NaN and absent targets.
- Compute each acceptance decision from observations. Persist the same result that determines CLI exit status. False or missing mandatory checks must not become a success message.
- Native zoom means actual browser UI zoom; record its observed 200% control. CSS zoom/device scale are supplemental only. CUA can operate Chrome native zoom in this environment; do not assume headless Playwright is the only available browser surface.
- Contrast sampling must use actual text foreground and composited background. Hide descendant glyphs/icons during background capture; avoid treating rounded control corners as text background. Sample across text runs and gradient positions, enforce the correct threshold, do not round a failing ratio up. Save source samples. Unsupported composition is not pass.
- Test reduced-motion/transparency with actual matching media queries and computed behavior, not query match alone. Inspect real print PDFs when printing is affected, not only print-media screenshots. `scripts/verify_home_print.cjs` protects the accepted landing print journey; configure FINPATH_PLAYWRIGHT and FINPATH_PDF_PYTHON from available runtime paths rather than installing paid tools.
- Report unexpected console errors and page exceptions. A status file, accessibility-tree dump or screenshot filename is not independent proof of behavior.

## Publication, final candidate and review boundary

Use only free services. No production/main merge, DNS, purchases, financial connections, real user records, new analytics, new schema/migrations or auth bypass. Keep automatic production deployment disabled. Preview publication is authorized after checks pass, using the explicit execution branch. Verify the intended and effective preview DB is `0dbad68e-7493-452f-8504-98d4c61ee5da` and differs from production. Do not write financial data as part of these public calculator tasks.

For each meaningful change run relevant tests. Before push run `./scripts/test_all.sh` and capture complete output and true exit status; audit if dependencies changed (none expected). Run git diff --check and packet validation. Commit B08, B20 and B21 separately with concise problem/behavior messages. Do not deploy after every documentation edit. Once the combined candidate is frozen, deploy its tested build to the explicit preview branch, verify literal provider commit/dirty flag and build identity, run all 84 public-route smoke checks, and recheck each task's affected journey on that same immutable URL. Await exact-candidate CI. Later executable changes invalidate affected prior results; evidence-only commits require tree-equivalence proof, not repeated full suites.

Fill submissions/B08.md, B20.md, B21.md and evidence/<ID>/validation-matrix.md with actual observations, passing/failing/blocked criteria, exact code SHA, CI and immutable URL. Set only ready_for_review when complete; otherwise blocked with a concrete remaining condition. Never set done, edit primary reviews, check master backlog items or release C05.

At C04 boundary hand off one packet: final candidate and evidence SHAs; CI URL; PR140; immutable preview and DB isolation; test counts/log; before/after key figures and screenshots; limitations; each criterion's evidence. Ask the primary to review C04. If a specific task becomes blocked, finish independent authorized work in C04 and consolidate the missing items instead of repeatedly asking for the same permission. The primary owns final quality, acceptance and the next release.

## Cost-conscious execution amendment (primary authorized)

This checkpoint-level rule supersedes inherited per-task publication instructions: run targeted tests and make separate local task commits, then run one full suite before the combined push and one final immutable preview/CI verification. Earlier tasks may advance provisionally within C04 with complete local evidence while hosted evidence awaits the combined candidate; keep them in_progress until final evidence is complete. If a later change affects an earlier task, rerun its affected tests. No unchanged full-suite/deployment repetitions solely for documentation. No acceptance criterion is removed.

Keep a compact progress digest in evidence/C04/progress.md: current task, completed contract rows, failing/blocked rows, changed files, latest tests and exact next action. Give the primary a concise review index linking evidence instead of pasting large logs. The primary will reproduce material failure cases and audit revision identity; worker claims never confer acceptance. Stop only at the C04 boundary or a concrete prerequisite affecting dependent work. Do not start C05.
