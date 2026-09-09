# Checkpoints and release ledger

Only C01 is released for implementation now. C00R/B34 was accepted on 2026-09-09. This is the user's requested checkpoint process, not a request to merge or deploy production. C00 records already accepted B01. The primary reviewer owns changes to Release, Accepted SHA and Review columns. Workers can submit tasks, not release checkpoints.

| Checkpoint | Purpose | Task order | Release | Accepted SHA | Review |
|---|---|---|---|---|---|
| C00 | Existing verification foundation | B01 | accepted | 1664043 | [record](reviews/C00.md) |
| C00R | Development-tool security repair | B34 | accepted | b48ac00328f356746bd501921562e727feb7a8e5 | [record](reviews/C00R.md) |
| C01 | Visible defects and design foundation | B15 → B16 → B17 | released | — | — |
| C01T | Light/dark glass and gradient palette | B32 | locked | — | — |
| C01I | Isolated preview publication prerequisite | B33 | locked | — | — |
| C02 | Currency and save integrity | B02 → B03 → B04 | locked | — | — |
| C03 | Public homepage and discovery | B18 → B19 → B09 | locked | — | — |
| C04 | Generic calculator and chart truth | B08 → B20 → B21 | locked | — | — |
| C05 | Dedicated calculator families | B22 → B23 → B24 | locked | — | — |
| C06 | Tenancy, lifecycle and UI fixtures | B05 → B07 → B25 | locked | — | — |
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
