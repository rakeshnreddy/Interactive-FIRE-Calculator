# Checkpoints and release ledger

Only C06 is released for implementation now. C05 is accepted with actual-reader checks deferred to B31. C04 is accepted with the owner-authorized reader deferral tracked in B31. C03 is accepted with the owner-deferred reader check tracked in B31. C02 and C01I are accepted. C01T is accepted with the owner-deferred actual-reader check tracked in B31. C01 was accepted on 2026-09-10. C00R/B34 was accepted on 2026-09-09. This is the user's requested checkpoint process, not a request to merge or deploy production. C00 records already accepted B01. The primary reviewer owns changes to Release, Accepted SHA and Review columns. Workers can submit tasks, not release checkpoints.

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
| C06 | Tenancy, lifecycle and UI fixtures | B05 → B07 → B25 | released | — | — |
| C07 | Owner setup and hosted proof | B06 | locked | — | — |
| C08 | Dashboard and transactions | B26 → B27 | locked | — | — |
| C09 | Saved decision and monthly review | B10 → B11 → B28 | locked | — | — |
| C10 | Reports and settings | B29 → B30 | locked | — | — |
| C11 | Measurement and final quality | B12 → B31 | locked | — | — |
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
