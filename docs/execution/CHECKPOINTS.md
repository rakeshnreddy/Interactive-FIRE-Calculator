# Checkpoints and release ledger

The table below is the current checkpoint state. Task/owner-action status is in [TASK_STATUS.json](TASK_STATUS.json); release deployment and the exact next action are in [RESUME.md](RESUME.md). Only the primary reviewer changes acceptance, accepted SHA or downstream release.

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
| C09 | Saved decision and monthly review | B10 → B11 → B28 | accepted | c4bf784b106878e7e0c940564216ec44a72ecb38 | [closure review](reviews/C09-closure-2026-09-26.md) |
| C09A | Owner-prioritized FIRE assumption control and calculator audit | B35 | accepted | 5dda3d2be24246e3470a65e7653a0b6e425cbece | [approved](reviews/C09A.md) |
| C09B | Delivery hygiene, App extraction, shared hosted proof, flagship FIRE correction | B37 → B39 → B42 → B36 | accepted | f85c6dd9c092720b0b0a1070cab657458be57cb6 | [approved](reviews/C09B.md) |
| C10 | Reports and settings | B29 → B30 | accepted | f85c6dd9c092720b0b0a1070cab657458be57cb6 | [approved](reviews/C10.md) |
| C11 | API/public delivery, measurement and final quality | B41 → B38 → B12 → B31 | accepted | 2277b80ce089d0ddf0caf22a21c0c809ae6a31f5 | [approved with recorded reader limits](reviews/C11.md) |
| C14 | First calculator-excellence child | B40 | accepted | 2277b80ce089d0ddf0caf22a21c0c809ae6a31f5 | [approved](reviews/C14.md) |
| C15 | Financial chart truth and HYSA APY correction | B47 → B48 | accepted | 7192bdd13f8a7b4744df45ef296687e2abe62f9b | [approved](reviews/C15.md) |
| C16 | Natural editing and visible customization | B45 → B43 → B44 | accepted | 324be91322c791836bc5e5f105312944e0ec935a | [approved](reviews/C16.md) |
| C17 | Intentional landing and calculator depth contracts | B46 → B52 → B49 → B50 | accepted | 9f3789b9190680fff70222b422c7bfda473c814c | [approved](reviews/C17.md) |
| C18 | Genuine usability and recurring-value validation | B51 | released | — | Protocol prepared; B51 blocked on OA-5 real participants/observation |
| C19 | Truthful payback and benefit catch-up states | B53 → B56 | accepted | 89052295d0fbed72d8531cadefe027e5d5efecfd | [approved](reviews/C19.md) |
| C20 | Dated cash-flow returns | B54 | accepted | 9375c990049ea79f5775aaee009d745ac28ac698 | [approved](reviews/C20.md) |
| C21 | Vehicle cost and resale comparison | B55 | accepted | 92c752ac37b0fadf59ad1716ae1c2546e0702312 | [approved](reviews/C21.md) |
| C22 | Return-method suitability and honest sensitivities | B57, B58 | accepted | 2a2f3efc49a4282be1e8a6258e05a95b1d771fa9 | [approved](reviews/C22.md) |
| C23 | Mortgage affordability with entered housing costs | B59 | accepted | aab17a026bcda53ba25925377edb7cb4c205b3fd | [approved](reviews/C23.md) |
| C24 | Deposit-specific FD/CD presentation and rate basis | B60 | accepted | 485070fc39db78eb3f27c9ed56b2a069f7eb566a | [approved](reviews/C24.md) |
| C25 | RD presentation and exact-term growth schedules | B61, B62 | accepted | 5f2fdbf2021d946d9e6b51bf31c268801aec037d | [approved](reviews/C25.md) |
| C26 | Exact-term return, inflation, Roth and EPF tables | B63 | accepted | 5181cb1411e5f680521de25538da493c7a76b774 | [approved](reviews/C26.md) |
| C27 | PPF whole years and gratuity service table | B64, B65 | accepted | 3e2569c6f0482876f7f02c753f99146cd372787f | [approved](reviews/C27.md) |
| C28 | Truthful generated input helpers | B66 | accepted | 7fc0170bc4996dd96d6eb7449574702df73fdc81 | [approved](reviews/C28.md) |
| C29 | Market-growth presentation for lump sum and SIP | B67 | released | — | Contract registered; implementation and review pending |
| C12 | Paid offer, only after retention | B13 | locked | — | — |
| C13 | Mobile study, only after evidence | B14 | locked | — | — |

## Ordering and safety rules

- Task IDs remain stable; each is scheduled exactly once. A released checkpoint can use earlier complete submissions provisionally, but cross-checkpoint dependencies must be accepted. A worker stops at the review boundary.
- Acceptance applies to the recorded code and scope. Any later change must reverify affected behavior and may reopen a regression. Tests/HTTP smoke alone do not establish visual, hosted lifecycle or real-reader proof.
- C12/B13 and C13/B14 remain locked until their user-evidence and owner-decision criteria pass. B13 also requires genuine B51 evidence; new code completion is not retention proof. Synthetic observations cannot establish retention or willingness to pay.
- Preview publication and hosted writes require verified isolated bindings and applicable authority. Production remains separately gated by the owned-origin/live-Clerk preflight and restore-before-migration procedure. Follow [FREE_TIER_EXECUTION.md](FREE_TIER_EXECUTION.md).
- The [implementation protocol](IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md) controls correction limits, evidence provenance and worker/primary authority. No fabricated PASS or fourth repair round.
- FIRE return/inflation start empty and required; explicit zero is valid and examples require user action (OD-1). Sourced accumulation additions do not authorize changing existing drawdown behavior (OD-2). Keep the [assumptions decision](../calculator-excellence/FIRE_ASSUMPTIONS_DECISION.md) and existing formula goldens.
- Reader and zoom decisions are recorded in [ACCESSIBILITY_DEFERRALS.md](ACCESSIBILITY_DEFERRALS.md); outstanding A11Y-F01/F02 are in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No broad WCAG conformance claim.

## Decision provenance

Earlier release announcements and repair instructions are historical, not live scheduling commands. Each table row links its acceptance review; the [release review](reviews/RELEASE-2026-09-29.md) records main merges and the production blocker. Full earlier owner amendments, correction-round outcomes, audit adjustments and chronology are preserved in [the pre-cleanup ledger](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/blob/5e4b703958bf98374dea61235e314f8ba21af283/docs/execution/CHECKPOINTS.md). No acceptance, task dependency, owner authorization or residual was changed by documentation consolidation.

## Owner amendment — 2026-09-30: independent continuation

Owner defers actual-user validation and asks Astra to close work needing no intervention. B51/OA-5 remain open/deferred, not passed. C19–C21 are independent of real cohort evidence; register B53–B55 from the existing bounded contracts and B56 for the identified SSA residual. Order B53 → B56 → B54 → B55. B13/B14 and production retain their explicit evidence/setup gates. Owner's direct implementation instruction overrides the historical Gemini/non-coder role for this pass. No fabricated observations or paid/production action.

## Independent follow-up — 2026-10-01

Owner continues autonomous implementation with B51 still deferred. C22/B57 scopes the existing investment-return/CAGR cash-flow suitability finding now that B54 is accepted. No formula, financial payload, paid, production or owner-evidence gate changes. Astra implements and reviews directly; no Gemini. The larger route proposals remain unregistered until separately scoped.

C22 browser review additionally reproduced B58: the endpoint-return copy implied cash-flow/cost/inflation adjustment and displayed inverse conservative/optimistic results (13.44% versus 11.72% around base 12.47%). Correct scope and neutral labels only; original scenario input vectors/arithmetic/IDs remain unchanged. This is a verified UI-content defect, not a new formula contract.

## Deposit presentation continuation — 2026-10-03

Owner continues direct independent implementation without Gemini after C23. C24/B60 scopes B50 rows 21/78 (FD/CD) from source inspection: annual application of the entered rate/APY, generic recurring-amount copy, missing tax/fee/penalty exclusions and a fractional-term schedule row that disagrees with the headline. Presentation and reconciliation only; no formula, payout/compounding-frequency, RD, schema or production change. B51, B13/B14 and production gates are unchanged.

## RD and exact-term schedule continuation — 2026-10-03

Owner asked to finish the work that needs no owner unblock. C25/B61 scopes B50 row 22 (RD) from source: end-of-month instalments, monthly compounding at rate ÷ 12, generic recurring/contribution copy and no exclusions. B62 fixes the C24 residual: lump-sum and shared monthly recurring schedules round a fractional term up to whole years and contradict the exact-term headline. Presentation and schedule reconciliation only; no formula, model version, schema or production change. B51, B13/B14 and production gates are unchanged.

## Exact-term schedule audit — 2026-10-03

The B62 residual audit measured every route with a `years` input at its default and default + 0.5. C26/B63 fixes the four builders whose tables contradict an exact-term engine at a part-year term: investment return/CAGR (table rate 10.29% versus headline 11.28%), inflation, Roth/traditional and EPF. PPF (yearly deposits) and gratuity (statutory part-year rule) are domain questions recorded as residuals, not folded in. Presentation only; no formula, model version, schema or production change.

## PPF and gratuity terms — 2026-10-04

Owner said "continue" after C26. B64 applies the PPF Scheme 2019 (G.S.R. 915(E), read from the official India Post PDF): terms are whole financial years and deposits are capped at ₹1,50,000 a year, so impossible part-year and over-limit results are rejected with a clear message. B65 keeps gratuity's documented "service used exactly as entered" model and only makes its table end at the entered service; no statutory part-year rule is claimed because the cited Labour Codes FAQ could not be re-read. No model version, schema or production change.

## Generated input helper copy — 2026-10-04

A survey of all 359 inputs found the label-only helper generator calling one-time payments "recurring", shares/fees/taxes "annual percentages", pay periods "years" and writing "Enter the years in years." C28/B66 makes generated helpers say only what the label and unit suffix support. Copy only; explicit helpers, inputs, validation and results unchanged.

## Market-growth presentation — 2026-10-04

Owner approved route-specific copy for high-traffic routes. C29/B67 covers lump sum, SIP and step-up SIP (compound interest already has a dedicated experience): state the engine's timing and compounding basis, that a constant return is not a forecast, and what is not deducted; relabel lump sum's deposit-style result; neutral what-ifs; reconciliation lines. Results/vectors byte-equal (lump-sum metric labels excepted). No formula, schema or production change.

