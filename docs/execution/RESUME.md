# FinPath execution resume — 2026-10-03 (after C25)

**C25 accepted; B61 (RD presentation) and B62 (exact-term growth schedules) complete; beta promotion verified.** Astra implements/reviews directly under the owner override; no Gemini. Canonical [TASK_STATUS.json](TASK_STATUS.json) and [CHECKPOINTS.md](CHECKPOINTS.md); start the next session with [the handoff prompt](START_NEXT_TASK_PROMPT.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`; Documents/ChatGPT is stale. C24 is on main (PR #146 merge `71c582b`, PR #147 merge `65feeef`). C25 lives on branch `codex/rd-lumpsum-presentation`, [PR #148](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/148): registration `384508b`, accepted product `5f2fdbf2021d946d9e6b51bf31c268801aec037d`, docs only after it. Resolve the observed PR state/mergeCommit; never reset existing changes.
- B61 gives `/calculators/rd` a before-input basis (end-of-month instalments, monthly compounding at rate ÷ 12, tax/TDS/fee/penalty exclusions, bank quotes may differ), RD labels with the extra yearly deposit separated from instalments, a deposits + interest = maturity line, neutral what-ifs and a scope notice with no claimed sources. B62 makes lump-sum and the shared monthly recurring schedules (compound, SIP, step-up SIP, RD, NPS) end at the exact term so table/CSV equal the headline. Results, inputs and scenario vectors byte-equal; no formula, model version, schema or dependency change. [Review](reviews/C25.md).
- Full suite **101 files / 2,742 tests**; exact product CI **37171713085**. Candidate https://b342aae0.interactive-fire-calculator.pages.dev verified (16/16 assets, health/protected, 84 routes, RD six layouts with keyboard reveal, RD and lump-sum CSV content). [Evidence](evidence/C25/).
- **59/62 accepted (95.2%, registered task count only).** B51 real users and OA-5 remain owner-deferred; B13 paid and B14 mobile remain locked. No synthetic retention or willingness-to-pay proof.
- Native reader A11Y-F01/F02 and native zoom A11Y-F03 remain open in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No WCAG conformance claim.

## Verified release

Bookmarkable beta **https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev**, immutable **https://7677dac2.interactive-fire-calculator.pages.dev**, deployment `7677dac2-d23d-4ab0-87f9-a22726689f63`. Clean source `40ede27935cf306807c8a7da1aacae6d935c2114`, product equal to accepted `5f2fdbf`. Provider commit/branch/success/preview D1, 16 runtime JS/CSS hashes (immutable and alias, equal to the verified candidate), health 200/protected 401, 84 calculator routes and an 18-month RD keyboard journey on the alias pass. [Provider/assets](evidence/C25/beta-release.json), [journey](evidence/C25/beta-journey.json), [release protocol](BETA_RELEASE_PROTOCOL.md). Rollback: redeploy C24 `19291d4` to the same label (no data-format change).

Production stays at old `3399dbbd8d7f0e6379972356a790b236e6b177b1`; automatic production deployments disabled (re-checked 2026-10-03); last auth preflight 0/6. On 2026-10-03 the owner asked for a production deploy if possible; the preflight could not start because `.env.production.local` (live Clerk publishable key and owned production origin) does not exist, so production was not deployed. OA-1 needs owned HTTPS origin/completed production Clerk; OA-3 retains restore/setup gates. Preview D1 only `0dbad68e-7493-452f-8504-98d4c61ee5da`; production D1 untouched.

## Next

1. Audit the remaining whole-year schedule builders for fractional terms (EPF, PPF, savings goal, inflation, investment return, XIRR approximation, Roth/traditional, rent-vs-buy, interest-only, flat-rate, gratuity — B62 residual); register a contract only for those that actually contradict their headline.
2. Owner-gated: B51 real users, OA-1/OA-3 production, A11Y-F01–F03 native checks, B13/B14.
