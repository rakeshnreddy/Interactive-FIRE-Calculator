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

## Owner amendment — 2026-09-26: proof cost, correction cap and answer quality

This dated amendment governs conflicts with earlier per-task/per-checkpoint proof instructions from C09B onward. PA-2 and PA-3 apply to the open C09 checkpoint immediately. Existing truthful C09 evidence and owner-authorized isolated hosted checks remain valid; do not delete or relabel them retroactively.

1. **PA-1, proof pyramid.** Prove business behavior primarily with unit and integration tests in the normal suite. Create one reusable `scripts/hosted_smoke.mjs` in B42 (or a documented equivalent), then add bounded steps to it for later tasks. B37 is hygiene only. A hosted step signs in two disposable synthetic tenants, makes one minimal scoped write, reads it back, proves cross-tenant denial where relevant, and verifies application/provider cleanup. Add no bespoke checkpoint harness. Target at most 150 new hosted-proof lines per checkpoint; exceeding this requires a documented necessity, not weaker proof. A public-only UI task may use the same runner without synthetic writes.
2. **PA-2, tooling failures.** A selector, timeout or runner defect that leaves product behavior unobserved is a tooling failure, not a product regression. Repair tooling in one bounded pass, rerun once, and review only the delta. Record the unobserved behavior honestly. A failing product assertion remains a product finding.
3. **PA-3, correction cap.** At most three correction rounds **per checkpoint**, not per individual finding. After the third, Astra chooses a documented residual acceptance, a new scoped task, or an owner deferral. No fourth FINISH/REWORK prompt for that checkpoint. C09's current Stage 4 readiness pass is final; its exact post-rerun decision tree is in `CHECKPOINTS.md`. This supersedes section 6's second-rework ownership language and the older per-task cap in AGENTS/GEMINI where they conflict; neither permits fabricating a PASS.
4. **PA-4, evidence storage.** From C09B onward, raw run output and screenshots go under gitignored `docs/execution/evidence/**/raw/` and, when available, CI/PR artifacts. Commit a criterion matrix and a manifest recording artifact path, SHA-256, byte size and Git-derived source commit. Record an immutable preview URL only when provenance is verified; use null/unknown for historical assets whose preview is not known. Keep at most three selected PNGs per task in Git, each at most 300 KB, only when needed for review. The manifest must identify retained accepted evidence or an archived artifact; never make an accepted review link dead. A PASS row cites an actual runner/test result, never a hand-authored value. B37 untracks legacy bulk files from the current index only; no Git history rewrite without a separate owner decision.
5. **PA-5, owner queue.** Maintain top-level `owner_actions` in `TASK_STATUS.json` with ID, requested action, blocking task or release, requested date and status. Batch asks. A pending owner action blocks only its named dependent operation, not unrelated free-preview work.
6. **PA-6, resume.** The active Astra role overwrites `docs/execution/RESUME.md` at each session end with exact candidate SHA, immutable preview and deployment ID, exact-code CI, open tasks/blockers, owner actions and next prompt path. Move root checkpoint prompts for accepted C01–C08 to `archive/`; do not move any open C09 prompts until C09 closes. Leave canonical per-task `prompts/Bxx.md` links intact.
7. **PA-7, answer-quality gate.** Every checkpoint review walks each changed user flow at normal desktop and 375px in one theme and answers: “Does it answer the user's question?” Record defects with severity and route/state. Screenshots are required only when they explain a defect. This is additional to math, auth, privacy, visual and proof-truthfulness gates; it is not a substitute for them.
8. **PA-8, parallel lanes.** Gemini may implement the released checkpoint while Astra drafts a future prompt. Standby read-only audits feed a temporary intake file; Astra verifies/merges its claims into canonical trackers and removes that intake in one commit. No parallel permanent task ledger.
9. **PA-9, touch it, move it.** A task editing a feature region of `src/App.tsx` extracts that region into a focused module with behavior-preserving tests. A task prompt may explicitly opt out with a reason and reviewer-visible limit. Pure-module B39 extraction precedes B36/C10. Do not combine unrelated rewrites with a narrow fix.

**C09 closure application.** The pending Gemini Stage 4 pass is final. Astra reviews its diff, runs one hosted proof against an exact-code isolated preview and independently checks cleanup. If the run passes, close B11/B28 and release C09B. If product behavior fails, split that defect into a new C09B task and close C09 with a named residual. If only tooling/readiness fails again, close C09 from the passing unit/integration evidence and already observed hosted stages, label the revise-journey hosted proof unobserved, and carry that proof into B42's shared runner in C09B. Do not call an unobserved step PASS or issue another C09 repair prompt. Owner-deferred native zoom and reader checks remain B31/C11.

## Owner amendment — 2026-09-26: PA-10 worker-hosted boundary

**PA-10, authority-aware evidence.** The Gemini worker never produces, simulates or labels live/hosted results. A step requiring deployment authority, credentials, hosted account creation, D1 writes or provider cleanup that Gemini lacks is reported exactly as **`NOT RUN — requires Astra`**, with the exact command and prerequisites for Astra. Local adapter tests and dry runs may be marked LOCAL PASS only; they cannot be presented as hosted observation. Any worker-authored hosted PASS is automatic rejection. Astra alone verifies the exact deployed SHA and isolated binding, runs the hosted scenario, independently checks cleanup and records the live outcome. B37 is hygiene only; B42 implements the shared runner and carries C09's unobserved revise residual. This amendment supersedes PA-1's prior B37 runner assignment and any older task/submission instructions that require Gemini to provide hosted proof.
