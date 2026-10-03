# FinPath execution resume — 2026-10-03 (after C24)

**C24 accepted; B60 complete. Stable-beta promotion of C24 is NOT RUN — it requires an explicit owner permission in the agent session — and PR #146 awaits merge.** Astra implements/reviews directly under the owner override; no Gemini. Canonical [TASK_STATUS.json](TASK_STATUS.json) and [CHECKPOINTS.md](CHECKPOINTS.md); start the next session with [the handoff prompt](START_NEXT_TASK_PROMPT.md).

- Stable checkout `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`; Documents/ChatGPT is stale. C23 is on main via PR #145 merge `04be90d4422e2e3e3c9822dd45f54bda201b27ca`. C24 lives on branch `codex/deposit-presentation`, [PR #146](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/146): registration `f1da2e5`, accepted product `485070fc39db78eb3f27c9ed56b2a069f7eb566a`, acceptance docs `c7339d4` plus this handoff commit (docs only). Resolve the observed PR state/mergeCommit; never reset existing changes.
- B60 gives `/calculators/fd` and `/calculators/cd` a before-input rate basis (FD: yearly rate compounded once a year, paid at maturity; CD: APY applied once a year, not converted again), tax/TDS, fee and early-withdrawal exclusions, one-time deposit/term helpers, a deposit + interest = maturity line, neutral what-if labels, deposit guidance, dated CFPB/RBI scope and an exact-term schedule (18-month CD ends at $10,682.54 = headline). Results, inputs and scenario vectors are byte-equal to baseline; no formula, model version, schema or dependency change. [Review](reviews/C24.md).
- Final full suite **100 files / 2,721 tests**, Python-free runner, typecheck/build/isolation. Exact product CI **37119436276** passes. Candidate https://5b937d2c.interactive-fire-calculator.pages.dev (deployment `5b937d2c-55e6-479e-95a4-9736510c67a4`, preview D1 only, clean): 16/16 runtime assets equal the build, health 200/protected 401, 84 public calculator routes, twelve light/dark 1440/390/320 layouts, real keyboard reveal and actual CSV content. [Evidence](evidence/C24/).
- **57/60 accepted (95.0%, registered task count only).** B51 real users and OA-5 remain owner-deferred; B13 paid and B14 mobile remain locked. No synthetic retention or willingness-to-pay proof.
- Native reader A11Y-F01/F02 and native zoom A11Y-F03 remain open in [DEFERRED_CHECKS.md](DEFERRED_CHECKS.md). No WCAG conformance claim.

## Verified release (unchanged by C24 until promotion)

Bookmarkable beta **https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev** still serves C23: immutable **https://82ed082d.interactive-fire-calculator.pages.dev**, deployment `82ed082d-fd60-4e30-94ba-3b1ef5d1426e`, source `f4f96f74f0d0c32f6db79853bd4bb81b931b3d4a`. [Provider/assets](evidence/C23/beta-release.json), [release protocol](BETA_RELEASE_PROTOCOL.md).

**Pending C24 promotion (NOT RUN — requires owner permission):** from a clean checkout at the final reviewed docs commit on `codex/deposit-presentation` (product equal to `485070f`), with Node 22+:

```
PATH=/opt/homebrew/bin:$PATH npm run build:preview-auth
PATH=/opt/homebrew/bin:$PATH npx wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution --commit-hash "$(git rev-parse HEAD)" --commit-dirty=false
```

Then verify provider commit/branch/success/preview D1 and runtime asset hashes, health/protected, one FD/CD journey, record `evidence/C24/beta-release.json`, update BETA_RELEASE_PROTOCOL and merge PR #146 after final docs CI.

Production stays at old `3399dbbd8d7f0e6379972356a790b236e6b177b1`; automatic production deployments disabled (re-checked 2026-10-03); last auth preflight 0/6. OA-1 needs owned HTTPS origin/completed production Clerk; OA-3 retains restore/setup gates. Preview D1 only `0dbad68e-7493-452f-8504-98d4c61ee5da`; production D1 untouched. A queued Git-integration preview `04a93a16` exists for `485070f`; it is not evidence.

## Next

1. Owner decision: allow the C24 beta promotion and the PR #146 merge (or merge without promotion).
2. Next independent proposals, each needing its own registered contract first: **B61 RD presentation** (B50 row 22 — deposit timing, interest basis, top-up versus instalment; RD still says "Annual return / rate"), and **lumpsum schedule exact-term reconciliation** (`lumpsum-mutual-fund` still rounds a fractional term up, the same defect fixed for FD/CD). B51 remains the next gated registered item.
