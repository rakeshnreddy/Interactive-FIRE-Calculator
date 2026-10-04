# FinPath execution resume — 2026-10-03 (after C26)

**C25 and C26 accepted; B61 (RD presentation), B62 and B63 (exact-term schedules) complete; beta promotion verified.** Astra implements/reviews directly under the owner override; no Gemini. Canonical [TASK_STATUS.json](TASK_STATUS.json) and [CHECKPOINTS.md](CHECKPOINTS.md); start the next session with [the handoff prompt](START_NEXT_TASK_PROMPT.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`; Documents/ChatGPT is stale. C25 is on main via PR #148 merge `ce338a744722a93b0e30c20ad026a7582ef0a624`. C26 lives on branch `codex/exact-term-schedules`, [PR #149](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/149): registration `943a14d`, accepted product `5181cb1411e5f680521de25538da493c7a76b774`, docs only after it. Resolve the observed PR state/mergeCommit; never reset existing changes.
- B61: `/calculators/rd` states end-of-month instalments, monthly compounding at rate ÷ 12 and tax/TDS/fee/penalty exclusions before the fields, separates the extra yearly deposit from instalments, and reconciles deposits + interest = maturity. B62/B63: lump sum, compound, SIP, step-up SIP, RD, NPS, EPF, investment return/CAGR, inflation and Roth/traditional tables end at the exact term, so table/CSV equal the headline (CAGR's table rate now equals its headline rate). Results, inputs and scenario vectors byte-equal; no formula, model version, schema or dependency change. Reviews [C25](reviews/C25.md), [C26](reviews/C26.md).
- Full suite **102 files / 2,748 tests**; exact product CI 37171713085 (C25) and 37172181319 (C26). Candidates b342aae0 and 3eaac24e verified with real CSV content. [C25 evidence](evidence/C25/), [C26 evidence](evidence/C26/).
- **60/63 accepted (95.2%, registered task count only).** B51 real users and OA-5 remain owner-deferred; B13 paid and B14 mobile remain locked. No synthetic retention or willingness-to-pay proof.
- Native reader A11Y-F01/F02 and native zoom A11Y-F03 remain open in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No WCAG conformance claim.

## Verified release

Bookmarkable beta **https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev**, immutable **https://775103db.interactive-fire-calculator.pages.dev**, deployment `775103db-d1f0-40ba-b38c-a8bc3aa5eada`. Clean source `d0e08013d6c108c8dbcfcfd500f9ce008559b047`, product equal to accepted `5181cb1`. Provider commit/branch/success/preview D1, 16 runtime JS/CSS hashes (immutable and alias, equal to the verified candidate), health 200/protected 401, 84 calculator routes and a 5.5-year CAGR keyboard journey on the alias pass. [Provider/assets](evidence/C26/beta-release.json), [journey](evidence/C26/beta-journey.json), [release protocol](BETA_RELEASE_PROTOCOL.md). Rollback: redeploy C25 `40ede27` to the same label (no data-format change).

Production stays at old `3399dbbd8d7f0e6379972356a790b236e6b177b1`; automatic production deployments disabled (re-checked 2026-10-03); last auth preflight 0/6. On 2026-10-03 the owner asked for a production deploy if possible; the preflight could not start because `.env.production.local` (live Clerk publishable key and owned production origin) does not exist, so production was not deployed. OA-1 needs owned HTTPS origin/completed production Clerk; OA-3 retains restore/setup gates. Preview D1 only `0dbad68e-7493-452f-8504-98d4c61ee5da`; production D1 untouched.

## Next

1. Domain contracts, each sourced before any change: **PPF** fractional term (yearly deposits — restrict to whole years or define part-year treatment) and **gratuity** part-year service (statutory rounding of a part year over six months). Both still disagree with their tables at part-year terms.
2. Owner-gated: B51 real users, OA-1/OA-3 production, A11Y-F01–F03 native checks, B13/B14.
