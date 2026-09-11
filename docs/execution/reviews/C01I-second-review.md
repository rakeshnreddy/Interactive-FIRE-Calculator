# C01I independent re-review

Reviewer: primary session / sole closure owner
Date: 2026-09-11
Decision: CHANGES_REQUESTED. Infrastructure isolation independently passes; the audit still contains false-PASS paths. No new owner permission is needed for the local repair.
Reviewed HEAD: d3419cdb63bc0d9841fce3f46f48ec903cb64292. Product/backend baseline 452fbdc is unchanged; wrangler.toml and audit tooling are changed, so 452fbdc is not the final configuration/tooling revision.
PR: https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140; base codex/dependency-security-refresh.
Preview: https://b8f9d6ec.interactive-fire-calculator.pages.dev
History: [first review](C01I-first-review.md).

## Independent evidence and passing work

Read the new collector, evaluator and tests. Queried exact live deployment b8f9d6ec-99d3-4cdc-acb4-a6b2f71be5b3 plus project metadata. Both bind preview DB to 0dbad68e-7493-452f-8504-98d4c61ee5da; production remains a5860350-0a50-4ebe-9f5f-1d9916a908e6. Deployment is preview, successful and uses_functions=true. JSON health matches all three expected fields; /api/me, /api/profile, /api/plans and /api/accounts independently return JSON401. [Live evidence](../evidence/B33/primary-rereview-live.json).

Explicit env.preview configuration is present. Current custom Git filter includes the other named branch, not execution. The collector now performs schema/migration reads rather than hard-coding their result; submitted evidence lists four repository migrations. Preserve these improvements and the isolated deployment. No need to redo the binding setup, alter subscriptions or redeploy unchanged product code just to repair tooling.

Supplied 14 fixture/CLI tests pass independently with necessary filesystem permission. The first attempt's denied temporary directory creation was a sandbox issue, not a product failure. [Tests](../evidence/B33/primary-rereview-tests.log). Hosted run34557424040 succeeded, but actual head is cf350f9197b2b6b63aa01f525946c47287b71ccc, not the full suffix written in the submission. Full-suite CI supports the unchanged product/config candidate; it does not establish the evaluator's missing edge cases.

## Remaining blocking defects

Reproductions start from the submitted live report, alter one field, and call evaluateB33Results. All five returned PASS. [Results](../evidence/B33/primary-rereview-reproductions.json).

1. Delete endpoint_probes.private_endpoints: PASS. The evaluator loops over whatever exists, so zero/private partial checks pass. Require the complete named endpoint set; missing evidence BLOCKED, observed non401 FAIL. Check all three health schema fields, including runtime; changed runtime currently passes.
2. Delete project_metadata.production_d1_id: PASS. Require live production identity before claiming inequality; validate deployment environment and uses_functions too. A successful matching DB ID alone cannot establish the right target/revision.
3. Set migration_evidence.database_id to wrong-db: PASS. Require the approved queried identity, successful structured query evidence and valid migration rows. Empty/malformed tables or migration evidence must not silently become complete. Read using the approved UUID or independently prove name-to-ID mapping; the collector currently writes the expected UUID into evidence regardless of name lookup.
4. Use include pattern codex/finpath-*: PASS with auto_deploying=false, although this pattern is unsupported by matchesPattern. Either support documented wildcard semantics or BLOCK unsupported patterns; never interpret them as proven exclusion. Preserve missing policy instead of collector defaulting it to none. Include actual deployment-enabled flags and avoid a separate exact-match log contradicting the evaluator.
5. Preflight parser still sets recognized=true for any exit0 output and accepts errors merely containing CLERK. Require the six expected checks, summary/count and consistent exit status; missing/partial/crashed output is unavailable diagnostic evidence. Do not require production configuration to remain absent.

These are verification defects, not evidence the currently isolated site is misbound. The requested reliable gate is still part of B33 acceptance.

## Attribution correction

Use git/CI output verbatim: cf350f9197b2b6b63aa01f525946c47287b71ccc is the verified run head. Live deployment trigger is 092a4a2cd0a59a889fe06a47bb4b2b1de1bec861 with commit_dirty=true. Distinguish that metadata from product-tree equivalence and identify final tooling/config HEAD. Do not describe the new Functions preview as pure static delivery or claim it proves signed-in save/export/deletion. Those remain later checks.

## Closure and next action

B33 remains changes_requested; no external authorization blocker for this bounded repair. C02 stays locked. Accepted total 6/34 (17.6% by task count). Earlier UI tasks are unaffected; no UI rerender or visual score needed for this audit-only defect. No production merge, deploy, financial records or paid services used in review.
Next: follow [bounded rework](../C01I_REWORK_PROMPT.md), add the missing regression cases, repair only the audit and attribution, rerun relevant/full tests, submit for primary review. Preserve the successful infrastructure setup.
