# FinPath execution resume — 2026-10-04 (after C28)

**C25–C28 accepted; B61–B66 complete; beta promotion verified.** Astra implements/reviews directly under the owner override; no Gemini. Canonical [TASK_STATUS.json](TASK_STATUS.json) and [CHECKPOINTS.md](CHECKPOINTS.md); start the next session with [the handoff prompt](START_NEXT_TASK_PROMPT.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`; Documents/ChatGPT is stale. C27 is on main via PR #150 merge `55bf608a6ed6cce706327ff238c3b16b9d5b783c` (main CI 37186490279). C28 lives on branch `codex/truthful-input-helpers`, [PR #151](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/151): registration `f0b67fe`, accepted product `7fc0170bc4996dd96d6eb7449574702df73fdc81`, docs only after it. Resolve the observed PR state/mergeCommit; never reset existing changes.
- C25: RD timing/basis/exclusions; exact-term lump-sum and monthly recurring schedules. C26: exact-term return/CAGR, inflation, Roth/traditional and EPF tables. C27: PPF follows the PPF Scheme, 2019 (whole financial years; ₹1,50,000 yearly deposit cap, with a clear validation message; optimistic what-if capped); gratuity table ends at the entered service. C28: generated input helpers say only what the label and unit support (196 of 359 helpers; no "recurring amount", "unless the label says otherwise" or "years in years"). Reviews [C25](reviews/C25.md), [C26](reviews/C26.md), [C27](reviews/C27.md), [C28](reviews/C28.md).
- In the audit of every route with a `years` input, each table that tracks a balance or rate headline now ends at that headline at whole and part-year terms (PPF rejects part years by rule); routes whose headline is not a table balance (savings-goal monthly amount, loan comparisons and similar) were not in scope. Full suite **104 files / 2,760 tests**; C28 product CI 37186645870.
- **63/66 accepted (95.5%, registered task count only).** B51 real users and OA-5 remain owner-deferred; B13 paid and B14 mobile remain locked. No synthetic retention or willingness-to-pay proof.
- Native reader A11Y-F01/F02 and native zoom A11Y-F03 remain open in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No WCAG conformance claim.

## Verified release

Bookmarkable beta **https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev**, immutable **https://b91c11d7.interactive-fire-calculator.pages.dev**, deployment `b91c11d7-76ec-4622-be5a-7a1813045159`. Clean source `5582715d87c9e3e3ef68054aac1ed256bd463222`, product equal to accepted `7fc0170`. Provider commit/branch/success/preview D1, 16 runtime JS/CSS hashes (immutable and alias, equal to the verified candidate after alias propagation), health 200/protected 401, 84 calculator routes and a paycheck helper + keyboard journey on the alias pass. [Provider/assets](evidence/C28/beta-release.json), [journey](evidence/C28/beta-journey.json), [release protocol](BETA_RELEASE_PROTOCOL.md). Rollback: redeploy C27 `4488726` to the same label.

Production stays at old `3399dbbd8d7f0e6379972356a790b236e6b177b1`; automatic production deployments disabled (re-checked 2026-10-04); last auth preflight 0/6. The preflight cannot start without `.env.production.local` (live Clerk publishable key and owned production origin), so production was not deployed. OA-1 needs owned HTTPS origin/completed production Clerk; OA-3 retains restore/setup gates. Preview D1 only `0dbad68e-7493-452f-8504-98d4c61ee5da`; production D1 untouched.

## Next

1. Route-specific helpers for high-traffic routes still on true-but-generic generated text (lump sum, SIP, step-up SIP, compound interest, loans, PPF rate): one contract per small group, primary sources only for factual claims.
2. Gratuity statutory part-year counting/eligibility stays a disclosed exclusion; changing results needs a re-readable primary source and a versioned model.
3. Owner-gated: B51 real users, OA-1/OA-3 production, A11Y-F01–F03 native checks, B13/B14.
