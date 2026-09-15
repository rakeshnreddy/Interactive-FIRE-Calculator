# Post-task-34 calculator functionality and visual excellence program

Owner requested 2026-09-13. Queued after the existing B01–B34 program; not released and not part of current C05 scope. The primary reviewer will register new child task IDs/checkpoints at the next safe planning boundary, preserving the active worker's ledger. Do not mark this complete after producing an analysis alone. Completion requires implementing and verifying the resulting per-calculator improvements.

## Intended outcome

Every public calculator should answer its user's specific question accurately, explain the result and its drivers, provide useful optional control, and present evidence in an understandable visual form. Essential inputs and the main answer come first; advanced settings and detailed analysis remain discoverable without overwhelming first-time users. More controls or charts are not inherently improvements.

## Stage 1 — inspect every calculator and define the missing work

Implementing/research agent: lower-cost capable model. Primary reviewer: scope, mathematical/security risk, priority and acceptance authority. Read current repository and deployed behavior, PRODUCT.md, DESIGN.md, current color/design specifications, execution protocol, CALCULATOR_VALUE_ROADMAP.md, CALCULATOR_HIGH_STANDARD_IMPLEMENTATION_PLAN.md and CURRENT_STATE_AUDIT.md. Treat historical completion claims as unverified until reproduced.

1. Generate the current route inventory from code and router configuration; reconcile public URLs, aliases, shared engines and dedicated calculators. Do not assume an old 82/84 count. Include every calculator and distinguish substantive routes from aliases. Preserve public URLs and signed-out use.
2. For each route record: intended decision/user, actual engine/component/tests, essential/advanced inputs and defaults, current outputs, assumptions/limitations, scenarios, charts/tables, warnings, save/share/export, input persistence and accessible/mobile behavior. Reproduce real default, zero, negative where valid, blank, invalid, extreme/long and boundary cases. Use synthetic data only.
3. Classify each capability as verified present, present but defective, missing, or not applicable with rationale. Cite source paths, route/state observations and evidence. A missing feature requires an explanation of the user decision it enables; avoid checklist inflation.
4. Inspect result comprehension: what does the headline mean, which inputs drive it, what changes under another scenario, what important cost/risk is omitted, and what reasonable next action is supported? Separate educational interpretation from unsupported personalized financial advice or promises.
5. Audit visual fit per calculator: information hierarchy, input grouping, units/locale, negative/zero values, chart axes/baselines, labels/legends, data density, mobile layout, both themes and the no-chart/text-table alternative. Derive visual requirements from actual model outputs, not a template selected for decoration.
6. Research current authoritative formula/statutory references where adding or changing functionality requires them. Date assumptions, jurisdiction and effective tax year. Keep US/India applicability explicit without internal targeting copy. Do not present unverified tax-law coverage or estimates as guarantees.
7. Prioritize functional/correctness gaps before decorative improvements. Group shared-engine improvements into small family tasks but retain a per-route acceptance row. Start with high-value recurring decisions; do not expand into a new calculator directory.

Deliver `docs/calculator-excellence/INVENTORY.md`, `GAP_MATRIX.md`, `VISUAL_SPECIFICATIONS.md` and `EXECUTION_PLAN.md`. Each gap row includes current evidence, proposed behavior, user benefit, scope/non-goals, dependencies, formula/data/migration risk and verification method. Explicitly distinguish user-research hypotheses from observed usability and from actual user satisfaction evidence.

## Stage 2 — create detailed implementer tasks and checkpoint gates

After primary review of the inventory, create `docs/execution/prompts/<new-id>.md` for each bounded slice and consistently update EXECUTION_BACKLOG.md, CHECKPOINTS.md and TASK_STATUS.json. Do not renumber existing tasks or make all calculators one unreviewable PR. Register the final cross-calculator regression/completeness task too.

Each task must specify:
- Exact calculator routes, user problem, code/evidence and measurable expected outcome.
- Essential input flow; precise advanced controls/defaults/help; preserved input/draft/save semantics.
- Result contract: headline, units, supporting breakdown, assumptions, warnings, explanation of drivers, scenario behavior and any detailed schedule/export.
- Visual contract: exact mathematical data series and transformations, axes/baseline, units, legend, interpretation, meaningful empty/zero/negative states, mobile arrangement, light/dark tokens and text/table alternative. Specify why this visualization helps this decision.
- Likely files, non-goals, dependencies, independent expected fixtures, failing tests first for behavior, browser states and acceptance criteria; analytics only under the approved privacy contract.
- Formula sources and written migration decision when needed, versioning/saved-result compatibility, security/privacy, rollback, human/agent effort and primary review checkpoint.

Release and execute a small initial family pilot. Review usefulness, output clarity, correctness and interaction quality before rolling shared patterns to other families. Then execute the remaining approved slices sequentially within released checkpoints. If a feature genuinely does not fit a calculator, document why rather than adding it to satisfy a count.

## Stage 3 — implement functional and visual improvements

Use these examples as design candidates, not mandatory features for every route:

| Calculator decision | Potential useful controls/details | Appropriate visuals when the engine supports them |
|---|---|---|
| Mortgage, loan, EMI | Extra payments, fees, timing, payoff comparison, amortization breakdown | Balance over time, principal/interest split, aligned payment schedule; break-even only when alternatives/costs are modeled |
| Savings, SIP, compound growth | Deposit timing, step-ups, fees, inflation, goal date and shortfall | Contributions versus growth, milestone timeline, nominal/real comparison, scenario sensitivity |
| FIRE and retirement | Existing timeline/withdrawal controls, cash-flow events, assumptions and scenario comparison | Portfolio/runway timeline, required-versus-current gap, withdrawal schedule and clearly labelled sensitivity; no probability cone without a justified probabilistic model |
| Budget, net worth, emergency fund | Editable categories, explicit deficits, liquid reserves, coverage assumptions | Category breakdown, assets versus liabilities, cash-flow waterfall or reserve coverage; no historical trend without actual history |
| Tax and take-home pay | Applicable year/regime, supported deductions and income assumptions | Gross-to-net breakdown, bracket/slab table and like-for-like regime comparison; unsupported deductions clearly identified |
| Insurance or protection | Dependents, coverage period and existing protection where modeled | Coverage gap and obligations timeline; assumptions and exclusions adjacent to result |
| Return/rate/ratio tools | Timing, basis, percentage conventions and comparison inputs | Properly unit-labelled comparison/sensitivity; a clear numerical explanation may be better than a time-series chart where no time series exists |

Do not fabricate chart data, smooth away meaningful negative values, give zero a positive bar, compare incompatible units, imply forecast certainty, or use decorative gradients as data encodings. Use shared accessible primitives when suitable while retaining route-specific meaning. Maintain the light/dark material system with legible labels and honest scales.

## Verification and completion

Routine execution and interactive browser checks belong to the lower-cost worker; primary independently examines critical math/interpretation boundaries and spot-checks evidence. No acceptance based solely on self-reported PASS or screenshot creation.

For each changed calculator require formula/behavior regression evidence, reconciled headline/chart/table/export values, default and edge cases, essential versus advanced disclosure behavior, scenarios where applicable, desktop/mobile/320px, both themes, real keyboard/200% zoom, reduced-motion/transparency and composited contrast. Apply the accessibility release requirements and deferral status current at execution time; this queued program does not extend the existing screen-reader deferral beyond B31.

Use the required full suite before executable pushes, exact-revision CI and clean isolated free-tier preview provenance. Reuse trustworthy evidence for unchanged surfaces; rerun affected shared consumers after shared changes. Keep stable routes and run all public-route smoke checks. No production data, paid service, DNS, banking connection, main merge or production launch is authorized here.

Program closure requires every inventoried calculator to have a reviewed outcome: improved and verified, already meets the agreed standard with evidence, or an explicit primary-approved non-applicability/defer decision. Missing applicable functionality cannot silently become done. List all remaining gaps and their owners. An audit document alone is not functionality completion; actual user satisfaction and retention remain unproven until user evidence is collected.

## Start instruction for the future worker

Read this file and the current authoritative checkpoint ledger. Do not begin until the primary releases this program after the existing implementation work. Start with Stage1 inventory/gaps and propose bounded per-route tasks; stop for primary scope review before functional changes. Preserve the current agent's work. Owner-blocked monetization/mobile experiments do not authorize skipping their gates or buying services; primary may explicitly schedule this independent calculator program while those experiments remain blocked.
