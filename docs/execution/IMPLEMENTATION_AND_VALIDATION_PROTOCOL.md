# Implementation and validation protocol

Applies to subsequent worker submissions. Primary reviewer owns acceptance. This protocol improves completeness; it does not guarantee one-pass correctness or substitute for independent review. Free-tier execution, task authorization and checkpoint boundaries remain in force.

## Why the process changed

B32/B33 reviews found the same class of error: positive fixtures covered happy paths, but omitted evidence became success; collected evidence was not tied to the tested resource; full SHAs were manually transcribed incorrectly. More prose alone will not fix this. Each requirement needs an explicit output, invariant, negative example and executable verification method.

## 1. Establish the bounded contract

Read current task prompt and latest primary review, not obsolete handoffs. Preserve successful work explicitly identified by the review. Use a reviewer-authored contracts/<TASK>.md when available; otherwise create contracts/<TASK>-working.md using CONTRACT_TEMPLATE.md. This working document explains implementation, it cannot weaken approved criteria or confer authorization.

For each original acceptance criterion assign a stable row ID and specify: required behavior; intended files/functions; valid input/state; missing/malformed input/state; observed bad state; expected result; test command/assertion; durable evidence. Include all original criteria, not just review findings. State non-goals and fields/files that must remain unchanged. Distinguish the product problem from a verification-tooling problem.

The worker may continue immediately when the contract follows the approved task without ambiguity. Send concise progress showing the contract path and requirement count; do not require owner approval for ordinary design details. Stop dependent work only for unresolved permission, business decision or materially conflicting requirements; continue independent authorized work.

## 2. Implement against the contract

Write failing behavioral tests before implementation. Verify that each failure is the intended assertion, not syntax/setup failure. Prefer modifying the existing implementation over replacing it. Share validation rules between collector/evaluator/CLI; do not duplicate logic that can disagree. Validate required sets, types, identity and cross-field relationships at boundaries. Do not catch errors and substitute empty values that look successful.

For UI tasks use before screenshots and actual content/interaction criteria. Derive financial examples from existing engines. Never invent product data, simulate a screenshot as evidence, or change formulas outside scope. Use existing design tokens and free dependencies/services.

For verification tools, establish a valid baseline, then independently remove each required field, corrupt its type, substitute the wrong resource, and change each expected status. Check the resulting contract outcome and persisted CLI result. This is targeted table-driven testing, not a requirement for a new mutation-testing dependency or exhaustive random inputs.

## 3. Separate validation from implementation

For every row verify the implementation without deriving the expected answer from that same implementation. Examples: required endpoint names come from the task/API contract, not the keys returned by the collector; expected migration target comes from approved configuration, not the submitted fixture; math references/regression results come from the approved engine contract. A test that only copies implementation logic is insufficient.

Run these layers as applicable:
1. Unit/fixture tests for the changed contract, including reviewer reproductions and adjacent omissions/mismatches.
2. Integration tests through the actual production collector/parser/CLI path with injected fixture adapters when network is inappropriate. A miniature test-only CLI cannot establish the real CLI's behavior.
3. Live verification on the exact approved resource/preview when required; read-only unless writes are authorized. Confirm content/schema as well as HTTP status. Local tests do not replace hosted criteria.
4. Full ./scripts/test_all.sh before push, dependency audit if dependencies changed, diff checks and exact-commit CI. Do not repeat a completed full suite just for a later evidence-only documentation commit; prove the product/tooling/config tree relation and name both revisions.
5. UI gates only where affected: actual routes/states, themes, viewports, keyboard, zoom, applicable reader checks, fallback/print and honest values. Give reasoned N/A for non-UI tasks; preserve scoped owner deferrals accurately.

Retest after relevant changes. Freeze the implementation candidate when relevant and full tests pass. Later executable/config changes require affected checks again. Documentation-only corrections do not justify rerunning all browser checks.

## 4. Evidence and attribution gate

Create evidence/<TASK>/validation-matrix.md mapping every contract row to command/assertion, observed result and file. PASS requires evidence; UNKNOWN/BLOCKED must not be presented as PASS. For expected failure fixtures, explain that the test passes by proving the application/evaluator fails correctly.

Record revision metadata directly from git/GitHub/provider output. Never type a full SHA from memory. Record separately:
- task baseline;
- final implementation/config/tooling commit;
- website tree revision if unchanged;
- CI run ID, exact head SHA and conclusion;
- deployment ID, immutable URL, literal trigger SHA and dirty flag;
- evidence-only commit and proof of relevant tree equivalence, if applicable.

A dirty deployment is not automatically invalid, but cannot claim an exact clean commit merely from its trigger. Supply build hashes/relevant tree comparison or publish a properly attributed candidate if needed. Do not re-deploy an identical product just for a tooling-only repair.

Inspect the evidence files, not merely terminal summaries. Report command exit statuses without pipes that hide failures. No credentials, private bodies or financial records in logs. Validate packet structure, but do not call validate_packet.py a product-quality test.

## 5. Worker self-review before submission

Switch perspective after tests: read the original criteria and final diff as a reviewer. Ask for each required field/check: what happens if absent, malformed, wrong-target, stale or partially collected? Can an empty collection pass vacuously? Can a failed check be lost during aggregation? Do logs, persisted JSON and exit code agree? Are test fixtures omitting requirements? Are assertions claiming observations never made?

For each prior finding report fixed/not-fixed with row ID and evidence. Do not say all findings fixed when any row is incomplete. Run every supplied reviewer reproduction and document expected changed result. Stop at ready_for_review only when all current criteria are evidenced. Otherwise submit BLOCKED with exact remaining condition; do not spend a pass merely restating the issue without completing available fixes.

## 6. Primary reviewer feedback and convergence

Primary review classifies findings: (a) original requirement violated, (b) regression introduced, (c) missing evidence, (d) external blocker, or (e) new improvement outside scope. Only a–d block the current task; put unrelated improvements into future backlog work. Do not move the acceptance target through optional improvements.

Each blocking finding must include stable ID, file/function, observed vs expected behavior, minimal reproduction, smallest correction scope and retest. Review the full relevant boundary in one pass and consolidate sibling failures into one contract repair. Identify already-passing work that must be preserved. Never send only “make it robust” or “improve quality.”

After one failed rework, improve the contract and supply concrete failing cases. If the same bounded defect remains after a second rework under the clarified contract, the primary reviewer takes ownership of that repair or supplies a tested patch; do not send a third nearly identical instruction cycle. This does not waive verification or promise acceptance. Review genuinely new regressions separately and proportionately. Coordinate the writer before touching shared files.

## Submission boundary

Workers do not set done, approve themselves, edit primary review records or release checkpoints. The primary reviewer alone independently verifies and closes passing tasks. Owner approval is never inferred from a worker-authored contract. No paid services, production launch or main merge follows from this process.


## 7. Worker-first verification and bounded primary review (owner direction, 2026-09-13)

The lower-cost implementing agent owns routine browser interaction, screenshots, responsive/theme checks, test execution and evidence collection. Primary owns acceptance, risk assessment and targeted independent corroboration. A higher-cost model is not intrinsically required to operate a browser.

Before coding a UI task, probe available browser capabilities. Distinguish native desktop app/CUA control from headless Playwright. If native zoom or a required reader is unavailable, record the exact missing capability early; continue independent authorized work. Do not wait until submission to discover the gap. Where available, use the lower-cost model with the needed browser tools in its own session. Do not silently change session models or grant new permissions.

Use these explicit gates on affected surfaces:
- Native zoom: operate browser UI to 200%, retain browser-chrome/AX proof of the actual level, then inspect inputs, results and expanded details. No lost controls, clipped essential text or page-level horizontal scrolling. CDP page scale/device scale and a smaller viewport do not establish native zoom.
- Responsive/themes: capture identified routes at 320/390, tablet and desktop widths in light and dark; record viewport, state and computed observed theme. Verify task-specific input placement, wrapping and long/zero/negative values. File names are not proof of theme.
- Keyboard: use actual Tab/Enter/Space/Escape actions as applicable. Observe focus, accessible names, disclosure state and visible help. Do not set DOM attributes to manufacture interaction results.
- Media/contrast: verify that the requested media query matches and inspect resulting computed behavior. Measure real composited backgrounds; missing targets/dependencies and unsupported measurements fail or block. Never insert guessed colors, literal opacity or unconditional pass flags.
- Diagnostics: capture console errors/page exceptions; state exact code SHA, immutable preview, test commands, exit codes and evidence paths. Distinguish automated checks, manual observations and owner-deferred checks. Do not call an AX tree a screen-reader test.
- Reliability: add targeted negative tests for missing/false observations and collector failures. Preserve raw failures and blocked cases; primary-assisted evidence belongs in a separate supplement.

Primary reads a compact criterion-to-evidence matrix, the relevant diff and exact-revision CI, then independently reproduces the highest-risk changed behavior or suspicious claim. Reuse trustworthy full-suite and screenshot evidence for unchanged code. Do not repeat every browser case or the full suite simply because the reviewer is a different model. Expand review only for actual failures, unverified critical boundaries or affected changes. Closure remains solely the primary reviewer's decision; no quality gate is waived to save model usage.

Owner amendment 2026-09-13: actual screen-reader/VoiceOver smoke is deferred for implementation checkpoints through C10 to B31/C11; it alone must not block otherwise passing task closure or checkpoint release. This supersedes generic reader-smoke requirements in older task prompts. Follow ACCESSIBILITY_DEFERRALS.md, retain all other checks and make no full WCAG-conformance claim. Lower-cost agents perform the deferred checks; primary owns acceptance.


## Owner amendment — 2026-09-15: consolidate zoom verification at B31/C11

The owner directed: “push it to the end of verification of all tasks … if there is any zoom issue it can be fixed later.” Native browser 200% zoom checks and zoom-specific layout repairs are therefore DEFERRED through C10 to the final B31/C11 verification. Their absence or a known zoom-only issue must not block otherwise passing implementation tasks or checkpoint release. This supersedes earlier per-task native zoom gates, including older prompt/contract language. Do not rerun native zoom at every checkpoint. Preserve existing evidence and record newly noticed zoom defects without spending implementation time on them now. Functional correctness, tenancy, deletion, auth boundaries, normal-size usability, mobile layouts, keyboard, contrast and reduced-motion/transparency checks remain required. Deferred means not passed; no full WCAG-conformance claim.

B31/C11 follow-up ZOOM-FINAL: a lower-cost capable agent performs one consolidated actual-browser 200% sweep of final public and authorized synthetic authenticated journeys, in both themes. Verify reachable essential controls, readable inputs/results, no text overlap or clipped actions, and reflow. Record browser version, actual zoom level, exact candidate, route, screenshot, defect and focused retest. Pixel density, CSS zoom and viewport resizing do not substitute for native browser zoom evidence. Primary reviews the evidence and closes the task. Existing C06 account-import/fixture toolbar repairs and screenshots are retained; repeat only if the final sweep finds a regression.
