# FinPath execution resume — 2026-10-04 (after C27)

**C25–C27 accepted; B61–B65 complete; beta promotion verified.** Astra implements/reviews directly under the owner override; no Gemini. Canonical [TASK_STATUS.json](TASK_STATUS.json) and [CHECKPOINTS.md](CHECKPOINTS.md); start the next session with [the handoff prompt](START_NEXT_TASK_PROMPT.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`; Documents/ChatGPT is stale. C26 is on main via PR #149 merge `6413640cc90019c25fc77bbf2592a979747ff98a`. C27 lives on branch `codex/ppf-gratuity-terms`, [PR #150](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/150): registration `bac147a`, accepted product `3e2569c6f0482876f7f02c753f99146cd372787f`, docs only after it. Resolve the observed PR state/mergeCommit; never reset existing changes.
- C25: RD timing/basis/exclusions; exact-term lump-sum and monthly recurring schedules. C26: exact-term return/CAGR, inflation, Roth/traditional and EPF tables. C27: PPF follows the PPF Scheme, 2019 (whole financial years; ₹1,50,000 yearly deposit cap, with a clear validation message; optimistic what-if capped); gratuity table ends at the entered service. Reviews [C25](reviews/C25.md), [C26](reviews/C26.md), [C27](reviews/C27.md).
- In the audit of every route with a `years` input, each table that tracks a balance or rate headline now ends at that headline at whole and part-year terms (PPF rejects part years by rule); routes whose headline is not a table balance (savings-goal monthly amount, loan comparisons and similar) were not in scope. Full suite **103 files / 2,755 tests**; C27 product CI 37186118509.
- **62/65 accepted (95.4%, registered task count only).** B51 real users and OA-5 remain owner-deferred; B13 paid and B14 mobile remain locked. No synthetic retention or willingness-to-pay proof.
- Native reader A11Y-F01/F02 and native zoom A11Y-F03 remain open in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No WCAG conformance claim.

## Verified release

Bookmarkable beta **https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev**, immutable **https://d01dd062.interactive-fire-calculator.pages.dev**, deployment `d01dd062-c273-4ee4-a8a5-5735801e073f`. Clean source `4488726bcf9470f2369cfc78ff77941214661c3f`, product equal to accepted `3e2569c`. Provider commit/branch/success/preview D1, 16 runtime JS/CSS hashes (immutable and alias, equal to the verified candidate after alias propagation), health 200/protected 401, 84 calculator routes and a PPF validation + 20-year keyboard journey on the alias pass. [Provider/assets](evidence/C27/beta-release.json), [journey](evidence/C27/beta-journey.json), [release protocol](BETA_RELEASE_PROTOCOL.md). Rollback: redeploy C26 `d0e0801` to the same label.

Production stays at old `3399dbbd8d7f0e6379972356a790b236e6b177b1`; automatic production deployments disabled (re-checked 2026-10-04); last auth preflight 0/6. The preflight cannot start without `.env.production.local` (live Clerk publishable key and owned production origin), so production was not deployed. OA-1 needs owned HTTPS origin/completed production Clerk; OA-3 retains restore/setup gates. Preview D1 only `0dbad68e-7493-452f-8504-98d4c61ee5da`; production D1 untouched.

## Next

1. Small independent presentation cleanups, each with its own contract: generic "Annual return … unless the label says otherwise" helper copy remains on PPF and other market-linked calculators (lump sum, SIP, compound); survey before scoping.
2. Gratuity statutory part-year counting/eligibility stays a disclosed exclusion; changing results needs a re-readable primary source and a versioned model.
3. Owner-gated: B51 real users, OA-1/OA-3 production, A11Y-F01–F03 native checks, B13/B14.
