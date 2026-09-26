# Checkpoints and release ledger

C06 is accepted. C07 is released for owner-authorized free preview Clerk setup and disposable hosted lifecycle verification. C05 is accepted with actual-reader checks deferred to B31. C04 is accepted with the owner-authorized reader deferral tracked in B31. C03 is accepted with the owner-deferred reader check tracked in B31. C02 and C01I are accepted. C01T is accepted with the owner-deferred actual-reader check tracked in B31. C01 was accepted on 2026-09-10. C00R/B34 was accepted on 2026-09-09. This is the user's requested checkpoint process, not a request to merge or deploy production. C00 records already accepted B01. The primary reviewer owns changes to Release, Accepted SHA and Review columns. Workers can submit tasks, not release checkpoints.

| Checkpoint | Purpose | Task order | Release | Accepted SHA | Review |
|---|---|---|---|---|---|
| C00 | Existing verification foundation | B01 | accepted | 1664043 | [record](reviews/C00.md) |
| C00R | Development-tool security repair | B34 | accepted | b48ac00328f356746bd501921562e727feb7a8e5 | [record](reviews/C00R.md) |
| C01 | Visible defects and design foundation | B15 → B16 → B17 | accepted | ccebac7d5bcaf645721e2e67ea490a7f447e1db9 | [record](reviews/C01.md) |
| C01T | Light/dark glass and gradient palette | B32 | accepted | 32584da7e47307a35730911e3567f02f9095550b | [accepted with reader deferral](reviews/C01T.md) |
| C01I | Isolated preview publication prerequisite | B33 | accepted | 78df4f850112ee3c1fbc76853b6e071a7c75bf2e | [approved](reviews/C01I.md) |
| C02 | Currency and save integrity | B02 → B03 → B04 | accepted | ef2cded6441191a26537adf8ddf1a3e1909cf73b | [approved](reviews/C02.md) |
| C03 | Public homepage and discovery | B18 → B19 → B09 | accepted | 285e9eadf2d854951cec75d02afc6cce97d4d6c5 | [approved with reader deferral](reviews/C03.md) |
| C04 | Generic calculator and chart truth | B08 → B20 → B21 | accepted | 733e76c217058cafc3e5d418f09cb55ced531f4c | [approved with reader deferral](reviews/C04.md) |
| C05 | Dedicated calculator families | B22 → B23 → B24 | accepted | 1c73bffbb4a5d1f179d67f2934c900a8b44711e5 | [approved](reviews/C05.md) |
| C06 | Tenancy, lifecycle and UI fixtures | B05 → B07 → B25 | accepted | 0f3ae8d9cc4d447518e484b8de7a34ee1b54f38a | [approved](reviews/C06.md) |
| C07 | Owner setup and hosted proof | B06 | accepted | d81f31187892f636ab9d2b6cb492e90e9b7d166d | [record](reviews/C07.md) |
| C08 | Dashboard and transactions | B26 → B27 | accepted | a95053b19108634656aef491e46b9be9fe3ea57d | [record](reviews/C08.md) |
| C09 | Saved decision and monthly review | B10 → B11 → B28 | released | — | B10 accepted; B11/B28 final correction: [latest review](reviews/C09-hosted-attempt-f422cb3.md) · [worker prompt](C09_STAGE4_READINESS_PROMPT.md) |
| C09A | Owner-prioritized FIRE assumption control and calculator audit | B35 | accepted | 5dda3d2be24246e3470a65e7653a0b6e425cbece | [approved](reviews/C09A.md) |
| C09B | Delivery hygiene, App extraction, flagship FIRE correction | B37 → B39 → B36 | locked | — | [draft B37 prompt](prompts/B37.md); requires C09 closure |
| C10 | Reports and settings | B29 → B30 | locked | — | requires C09B acceptance |
| C11 | API/public delivery, measurement and final quality | B41 → B38 → B12 → B31 | locked | — | requires C10 acceptance |
| C14 | First calculator-excellence child | B40 | locked | — | [program](CALCULATOR_EXCELLENCE_PROGRAM.md); queued after C11 |
| C12 | Paid offer, only after retention | B13 | locked | — | — |
| C13 | Mobile study, only after evidence | B14 | locked | — | — |

## Ordering rules

- Every task is listed exactly once. Numerical IDs remain stable so old links work. C01 repairs visible contrast/navigation and establishes the styling contract; C02 then addresses money integrity before larger product changes.
- Start the next task in this row only after earlier work in the same row has a complete submission and passes its tests. Those are provisional dependencies, not approvals. Cross-checkpoint prerequisites must be `done` with a reviewer record.
- C06's local fixture work does not authorize hosted auth bypass. C07 is blocked until the owner provides isolated preview DB/config authorization and secure Clerk setup. C08 and later hosted workflows do not proceed around it.
- C09 adds the review behavior before visual integration. C11 implements consented measurement and final cross-surface verification; it cannot fabricate user retention data. C12 and C13 require elapsed-time user evidence and owner decisions, and may stay locked indefinitely.
- When all tasks in a checkpoint are ready_for_review, or work reaches a real blocker, stop. Give the owner the review prompt and immutable evidence. Do not quietly start the next row.
- Reviewer can approve some tasks and return others as changes_requested. The checkpoint remains locked downstream until all required tasks pass. Any dependency/scope change needs a written reviewer amendment here and consistent task prompts/status updates.

Color amendment 2026-09-08: C01T follows C01 and precedes C02. B32 applies the user-requested material system before homepage/discovery composition. It is not released until C01 passes. This adds one checkpoint without renumbering existing checkpoint IDs.

Safety amendment: C01I/B33 precedes C02. It covers automatic Git deployments as well as manual publication. Missing isolation blocks backend pushes/deployments, not merely deliberate test writes. C07/B06 retains complete hosted Clerk lifecycle verification after local safety work.

Acceptance amendment: all tasks in a checkpoint must satisfy their applicable criteria on one final candidate code SHA and immutable preview. Earlier per-task SHAs are historical evidence only. Retest any provisional or accepted task affected by a later edit before requesting checkpoint closure.

B33 bootstrap exception: with explicit owner authorization, publish configuration only using unchanged, identified backend code. Verify intended isolated preview binding before publication and effective deployed binding afterward. This is the narrow setup operation needed to prove isolation, not permission to publish changed APIs or perform financial writes. Those remain blocked until B33 is accepted. If the provider cannot establish the intended binding safely before publication, stop and request a separate isolated target.

Latest audit amendment (2026-09-08): C00R/B34 is now the first released checkpoint because hosted npm audit detected current advisories. C01 and all other implementation checkpoints are locked. This is a newly discovered dependency issue, not a failure of B01’s fail-closed runner. No historical acceptance is rewritten.

Reviewer release 2026-09-09: C00R/B34 accepted at `b48ac00328f356746bd501921562e727feb7a8e5`; [independent review](reviews/C00R.md). This supersedes the September 8 release amendment. C01 alone is released, beginning B15. Later checkpoints remain locked.

C01 review 2026-09-09: CHANGES_REQUESTED at code `ad580088938fc9f2a0e499eb70f0608be0c89aff`; no C01 task accepted. Same-checkpoint rework order: fix R1 in B16 first, then refresh all B15/B16/B17 evidence and satisfy R2–R4 in [initial C01 review](reviews/C01-initial.md). C01 remains released for this rework only; C01T and later checkpoints remain locked.

C01 acceptance 2026-09-10: all three tasks accepted at `ccebac7d5bcaf645721e2e67ea490a7f447e1db9` on immutable static preview f05b7516. [Review](reviews/C01.md) supersedes the earlier rework-only release. C01T/B32 alone is now released; C01I/B33 and later work remain locked. This does not establish database isolation or production readiness.

C01T final acceptance supersedes earlier release notes: B32 accepted under owner-amended scope; actual-reader verification is deferred to B31, not passed. C01I/B33 alone is released. All B33 external authorization and publication gates remain effective.

Final C01I acceptance supersedes earlier rework notes: B33 passes at `78df4f850112ee3c1fbc76853b6e071a7c75bf2e`; C02 alone is released, starting B02. Free-tier, publication isolation and task-specific write authorization remain required.

C02 acceptance 2026-09-11 supersedes earlier release notes: B02/B03/B04 pass together at `ef2cded6441191a26537adf8ddf1a3e1909cf73b` on immutable preview 51c5e746. C03 alone is released, order B18→B19→B09.0005 has been applied only to the authorized isolated preview. Free-only, no main merge/production and primary-only closure rules remain.

C03 first review 2026-09-11: changes requested for B18 chart scenario/accessibility and shared evidence integrity. No C03 tasks closed; C04 stays locked. C03 is released only for the bounded rework in C03_REWORK_PROMPT.md.

C03 rework review 2026-09-12 UTC: R1/R2 implementation repaired at 3100b70; R3 verification remains changes_requested (CSS zoom mislabeled native, no contrast ratios, ignored failing media check). No C03 closure or C04 release. Follow C03_VALIDATION_REWORK_PROMPT.md; preserve repaired product code.

C03 second rework review 2026-09-12: primary repaired eight evaluator false-pass paths; actual submitted PDF pagination fails and visual/assisted evidence remains incomplete. Primary owns remaining bounded repair under protocol section 6. No C03 closure or C04 release. See reviews/C03.md.

C03 final acceptance 2026-09-13 supersedes prior rework notes: all three tasks accepted on immutable preview e37c574d at 285e9eadf2d854951cec75d02afc6cce97d4d6c5. C04 only is released. Follow C04_START_PROMPT.md. Reader deferral explicitly authorized by owner and tracked in B31; all other gates preserved.

C04 first review: changes requested for chart units, opening-balance/tolerance boundary and verification truthfulness. C04 remains released only for its bounded repair; C05 locked. See C04_REWORK_PROMPT.md.

C04 first rework review: product unit/settlement repairs preserved; R4 real-observation and missing-field failures remain. Follow C04_VERIFICATION_REPAIR_PROMPT.md. No C05 release or task closure.

C04 assisted review 2026-09-13: native Chrome 200% verified by primary; bounded collector repair and full suite pass. C04 remains pending required reader smoke or scoped owner deferral; C05 locked. See reviews/C04.md and protocol section 7 for worker-first verification.

C04 acceptance 2026-09-13 supersedes the pending-reader amendment above: owner deferred actual-reader verification through C10 to B31/C11. B08/B20/B21 accepted at 733e76c217058cafc3e5d418f09cb55ced531f4c; 16/34 accepted (47.1%). C05 alone released, starting B22. Follow ACCESSIBILITY_DEFERRALS.md and C05_START_PROMPT.md. Other quality and production gates remain unchanged.

C05 review 2026-09-13: B22/B23/B24 require consolidated R1–R5 rework in C05_REWORK_PROMPT.md. No closure; C06 remains locked. Actual-reader deferral remains in force.

C05 first rework review: R1–R3 product repairs preserved; R4 observation/evaluator gaps and native zoom remain. Follow C05_VERIFICATION_REPAIR_PROMPT.md. C06 locked; no additional task closure.

C05 acceptance2026-09-14 supersedes prior rework notes: B22/B23/B24 accepted at website1c73bffbb4a5d1f179d67f2934c900a8b44711e5 with reviewer tooling35607a5 and separate native UI proof.19/34 accepted (55.9%). C06 alone released, B05→B07→B25; see C06_START_PROMPT.md. C07 and production remain gated.


## Owner amendment — 2026-09-15: consolidate zoom verification at B31/C11

The owner directed: “push it to the end of verification of all tasks … if there is any zoom issue it can be fixed later.” Native browser 200% zoom checks and zoom-specific layout repairs are therefore DEFERRED through C10 to the final B31/C11 verification. Their absence or a known zoom-only issue must not block otherwise passing implementation tasks or checkpoint release. This supersedes earlier per-task native zoom gates, including older prompt/contract language. Do not rerun native zoom at every checkpoint. Preserve existing evidence and record newly noticed zoom defects without spending implementation time on them now. Functional correctness, tenancy, deletion, auth boundaries, normal-size usability, mobile layouts, keyboard, contrast and reduced-motion/transparency checks remain required. Deferred means not passed; no full WCAG-conformance claim.

B31/C11 follow-up ZOOM-FINAL: a lower-cost capable agent performs one consolidated actual-browser 200% sweep of final public and authorized synthetic authenticated journeys, in both themes. Verify reachable essential controls, readable inputs/results, no text overlap or clipped actions, and reflow. Record browser version, actual zoom level, exact candidate, route, screenshot, defect and focused retest. Pixel density, CSS zoom and viewport resizing do not substitute for native browser zoom evidence. Primary reviews the evidence and closes the task. Existing C06 account-import/fixture toolbar repairs and screenshots are retained; repeat only if the final sweep finds a regression.

C06 final acceptance2026-09-15 supersedes earlier C06 release-only notes. B05/B07/B25 accepted together,22/34. C07 is not released; read-only preparation may resolve its exact external gates.


Owner authorization / primary release: the owner explicitly answered “yes i authorize it. i never used or setup the clerk” to free Clerk preview configuration and two disposable synthetic users including preview-data deletion. C07/B06 is now released for that exact scope. Independently verify ownership, existing development instance and preview DB before writes; earlier readiness inventory is unverified until reproduced. Use no paid services, production configuration, personal identities or DNS changes. Exact origin only; do not authorize all pages.dev origins. C08 remains locked. See C07_START_PROMPT.md.

C07 review2026-09-16: B06 changes_requested per reviews/C07.md. Three hosted proofs unexecuted; submitted harness requires R1–R4 repair before credentialed execution. C08 remains locked,22/34 accepted. No repeated broad audit authorized by this review.

## Current primary decision — 2026-09-16

C07/B06 APPROVED after primary-executed hosted CSV, tenant-denial and deletion410 proofs plus independent cleanup. Earlier C07 blocked/locked statements above are historical and superseded. C08 is released in order B26 → B27; C09 remains locked.23/34 tasks accepted (67.6% by task count, not effort). Use C08_START_PROMPT.md. Preview only; no main merge or production release.

C08 primary review2026-09-17: B26/B27 changes_requested per reviews/C08.md and C08_REWORK_PROMPT.md. False-success evaluator, cleanup failure safety and missing true-theme/changed-control evidence prevent acceptance. C08 remains released for rework; C09 locked.23/34 accepted.

Current primary decision2026-09-17: C08/B26/B27 APPROVED after rework and primary supplemental local verification. Earlier changes_requested statements are history. C09 released B10 → B11 → B28; C10 stays locked.25/34 accepted (73.5%, task count). New remote migrations need exact-target owner authorization; local implementation/testing can proceed.

C09 primary review2026-09-17: B10/B11/B28 changes_requested per reviews/C09.md; execute C09_REWORK_PROMPT.md. C09 remains released for repair; C10 locked.25/34 accepted.

Primary scheduling amendment2026-09-24: Owner requested immediate correction of hidden FIRE assumptions before continuing. Release C09A/B35 for that bounded implementation and comprehensive source audit; other calculator changes remain queued for reviewed child contracts. C09 remains open, C10 locked. Task universe now35,25 accepted (71.4% by count); denominator increased for new owner scope, no prior acceptance removed.

Primary review 2026-09-25: C09A/B35 APPROVED at website code `5dda3d2be24246e3470a65e7653a0b6e425cbece` on immutable isolated preview 51acbf88. 26/35 accepted (74.3% by task count). C09 remains released for B10/B11/B28 rework/review on the final shared candidate; C10 stays locked. Native zoom and actual screen reader remain deferred to B31/C11; no production release or `main` merge. See [C09A review](reviews/C09A.md).

C09 follow-up review 2026-09-25: B10/B11/B28 remain blocked on final-candidate hosted lifecycle evidence after local Cloudflare OAuth error 10000 and timed-out login. 22/22 evaluator tests pass, but historical 0fe proof does not establish 5dda behavior. C10 stays locked; 26/35 accepted. See [pending review](reviews/C09-pending-2026-09-25.md).

C09 hosted follow-up 2026-09-26: B10 is accepted in the task ledger, bringing the total to 27/35. On exact-code preview `5a5481de`, the reviewed `f422cb3` proof runner passed the prior selector and measured four normal-scale review-panel clearance cases, but stopped before the Version 2 revise journey because it checked the panel immediately after only the workspace shell appeared. B11/B28 remain blocked, C10 locked. Both disposable users were independently verified deleted from Clerk and all 15 isolated D1 tables; tombstones remain. See [hosted attempt](reviews/C09-hosted-attempt-f422cb3.md) and [focused Gemini repair](C09_STAGE4_READINESS_PROMPT.md). No main merge or production deployment.

## Owner amendment — 2026-09-26

The owner confirmed OD-1 through OD-4 and PA-1 through PA-9 from the independent audit. Astra is the active architect/reviewer **role**, whether staffed by Codex or Claude; Gemini implements. OD-1 supersedes only B35's implicit zero/optional rule for FIRE return and inflation: both begin empty and required, a deliberate 0% remains valid, and the user may explicitly apply sourced illustrative values. B35's ban on injected cash flows remains. OD-2 allows one additive accumulation function with independent formula goldens; existing drawdown behavior must remain unchanged. The homepage's 7%/2.5% numbers are verified as illustrative values in `src/lib/heroExample.ts`, not accepted as historical market statistics. B36 must source any historical framing separately.

C09B is registered but **locked until C09 closes**, then executes B37 → B39 → B36 before C10. C11 executes B41 → B38 → B12 → B31. C14/B40 is the first registered calculator-excellence child and remains queued after C11, independently of retention-gated C12/C13. Task universe is 41; existing 27 accepted tasks remain accepted (65.9% by task count, not effort). Archived files cover root checkpoint prompts for C01–C08 only; task prompt links and all open C09 prompts remain in place.

PA-2/PA-3 apply to C09 immediately. The Gemini Stage 4 readiness pass is C09's **final correction round**. After one primary-reviewed hosted rerun: if it passes, accept B11/B28, close C09 and release C09B; if actual product behavior fails, register a new C09B defect task, accept the passing C09 scope with an explicit residual and close C09; if verification tooling/readiness fails again without observed product failure, accept B11/B28 using existing unit/integration evidence and already observed hosted stages, record the unobserved revise journey as a residual for PA-1's shared smoke runner in C09B, then close C09. Do not issue another C09 FINISH/REWORK prompt. No residual may be called a hosted PASS. All branches retain isolation, cleanup and production-auth guards.

From C09B onward, PA-1 uses one reusable hosted smoke runner; PA-4 moves raw output/screenshots into ignored storage plus artifact/manifest evidence. PA-5 records owner asks in `TASK_STATUS.json`. PA-6 uses one `RESUME.md`; PA-7 adds a normal-size desktop/375px answer-quality walkthrough; PA-8 permits independent read-only intake merged into canonical trackers; PA-9 extracts touched App feature regions unless the task prompt explicitly opts out. The dated protocol section governs conflicts with older per-checkpoint prompts; it does not retroactively erase C09 evidence.

Audit adjustments recorded rather than silently dropped: the audit's “61 `useState` hooks” is not used as a gate because a simple current-source search finds 63 `useState` occurrences without isolating the root component; B39 uses the verified 8,841-line baseline and a measured ≥2,000-line reduction instead. Its 7%/2.5% example matches `src/lib/heroExample.ts`, but those figures are **illustrative** until B36 sources any historical claim. B40 is bounded to discovery, aliases, jurisdiction labels and copy; mortgage PITI/scenario semantics and compound-interest extreme-rate behavior remain required entries for later per-route calculator-excellence contracts, because changing those engines inside B40 would defeat its reviewable library scope. The audit's observed defects remain hypotheses until their task reproductions, not accepted product failures by this amendment.

B37 records both checkout/index savings and fresh full/shallow-clone sizes. Without history rewrite, old blobs remain in a full clone, so no full-clone shrinkage is promised or accepted merely from `git rm --cached`. This corrects the audit's implied clone-size outcome while preserving its measurement requirement and OA-2 owner decision.
