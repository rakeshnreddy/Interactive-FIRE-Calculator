# Finish C07/B06: three proofs, one instrumented run

You are the implementing/verification agent. The primary reviewer alone closes B06 and releases C08. Complete the three remaining hosted proofs; do not restart C07 or conduct another broad audit.

## 1. Exact context and authorization

- Worktree: /Users/Rakesh/Projects/Interactive-FIRE-Calculator.
- Branch: codex/finpath-quality-execution; PR140 https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140. Inspect current HEAD/status first; preserve changes. Baseline handoff documentation commit dd6fa57a274156fdcdff86cc863a3ad4758dac4b.
- Website candidate: d81f31187892f636ab9d2b6cb492e90e9b7d166d. Immutable preview: https://3eed38e6.interactive-fire-calculator.pages.dev. Deployment ID3eed38e6-e45b-4844-b62b-dd9655f6b57d. Exact green CI35046701891.
- Only allowed remote database: finpath-preview, UUID0dbad68e-7493-452f-8504-98d4c61ee5da. Production UUIDa5860350-0a50-4ebe-9f5f-1d9916a908e6 is forbidden. Migration0006 is applied; never reapply or remove its guards.
- Owner authorized free preview Clerk setup, disposable synthetic A/B users, their financial writes and deletion/cleanup. Owner has signed in; owner-controlled Finpath development instance was verified in Personal/Hobby workspace. Existing authorization persists for a fresh disposable pair needed to finish this verification. Never touch personal identities. No production, main merge, DNS, paid services or additional migrations.
- All previous A/B identities have been removed. Their financial rows are gone and two deletion tombstones remain. Do not reuse their deleted provider IDs. Primary independently verified cleanup in evidence/C07/primary-cleanup-verification.json.
- C07 is released. C08 remains locked until primary approval. Read submissions/B06.md, evidence/C07/validation-matrix.md, C07_START_PROMPT.md, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md and ACCESSIBILITY_DEFERRALS.md. This finish prompt supersedes stale demands for repeated authorization or a complete browser rerun.

## 2. Preserve what passed

Do not repeat the previous broad signup/signin/signout walkthrough, plan/profile/account persistence, export, ownership investigation, or visual audits. Existing full suite:79 Python +21 subtests,1608 Vitest, typecheck/build/isolation, exact CI. Validate that source has not materially changed before reusing evidence. Native200% zoom and actual screen-reader work are deferred to B31/C11. No cosmetic edits or formula changes.

Remaining acceptance gaps ONLY:
1. Actual browser CSV selection, preview, commit and persisted imported data.
2. Authenticated B attempting direct access/write to A's resource is denied and leaves A unchanged.
3. Authenticated A receives HTTP410 for a valid write after FinPath data deletion, before Clerk session/identity revocation.
Cleanup and truthful durable evidence are mandatory parts of this same run.

## 3. Resolve automation before creating users

Use a dedicated Playwright-owned browser and two isolated contexts; do not extract cookies from the owner's browser. CUA fileChooser previously returned CDP error Not allowed. Do not repeat that operation or call it a failed product import. Use supported Playwright input.setInputFiles for the synthetic CSV. An actual automatic approval rejection must not be worked around; preserve its reason and stop the rejected operation.

Clerk's documented development Testing Token is the intended bot-detection test mechanism. For this owned development-instance verification, use it to avoid repeated CAPTCHA attempts. It does NOT replace real Clerk authentication, FinPath token verification, authorized-party validation or tenant checks. Never install a fake user header, disable auth, mock hosted API responses, disable web security, or weaken application authorization. Do not claim testing-token execution proves production bot protection.

Current official references verified2026-09-16:
- https://clerk.com/docs/guides/development/testing/overview
- https://clerk.com/docs/guides/development/testing/playwright/overview
- https://clerk.com/docs/guides/development/testing/playwright/test-helpers

Use documented clerkSetup/setupClerkTestingToken or the documented Backend API mechanism. Read the actual installed API/version first; prefer an isolated test harness using installed packages, not an unnecessary app dependency upgrade. Obtain the development key securely from the owner's authenticated provider settings or an existing ignored environment file. Never print keys, tokens, passwords or complete provider environment objects. Server secret stays in the test process only, never in VITE variables, client code, screenshots, traces or committed files. Do not reset keys or alter the production environment. If secure key access is unavailable, request the one exact owner login/secure setup step and stop BEFORE creating users. Do not solve CAPTCHA through unsupported evasion.

Preflight must establish: usable Playwright browser and input API; secure development test configuration; the deployed exact SHA and effective preview DB; schema current; HTTP capture/redaction working; and an executable cleanup path. Cloudflare Wrangler CLI has returned7403 while connected Cloudflare tools work. Use the connected read-only deployment/D1 APIs; do not retry the same failed CLI authentication.

Save a reusable harness under scripts/ or evidence/C07/remaining/, with no embedded credentials. Do not leave the only useful script in /tmp and delete it on failure. Runtime credentials/state belong in ignored private files, with cleanup in finally. Write a protected manifest immediately after each created user ID; cleanup may operate only on those IDs. Avoid blanket delete/list-all-user exports.

## 4. Prepare exact assertions before running

Read actual handlers/parsers rather than guessing bodies:
- functions/api/accounts/index.ts and functions/api/accounts/[id].ts
- functions/_lib/accounts.ts (parseAccountUpdatePayload)
- functions/api/imports/account-balances/preview.ts and commit.ts
- functions/_lib/balanceImports.ts and the real CSV template/UI parser
- functions/api/profile.ts
- functions/api/account-data/index.ts and its deletion confirmation parser
- functions/_lib/persistence.ts and session.ts

Attach response observers before any actions. Capture only method, origin/path without token query strings, status, elapsed time, sanitized assertion results and safe synthetic labels. Never log headers, cookies, raw tokens, exported records or unrestricted request bodies. Disable sensitive traces/HAR by default.

Use real Clerk sessions. Keep tokens only in test-process/browser memory. A same-origin fetch inside the isolated authenticated test page or an API request using that real session is valid evidence. Do not confuse an expired401, malformed400, failed origin check or server500 with tenant isolation or deletion410.

## 5. One ordered run

A. Create one fresh disposable A/B pair with documented Clerk test identities, no real email/SMS delivery. Sign in normally through Clerk or its supported authenticated testing helper. Previous UI signup proof remains separate. Verify each session through /api/me; record only principal equality/difference assertions. Capture sessions before creating data.

B. As A, create a uniquely named USD account. Verify its own GET200 and record the initial balance/name in memory. Build a minimal synthetic CSV using the actual template/parser with a deliberate changed balance and valid date; derive expected row counts and totals from its content before import. Through the real account UI select this file using input.setInputFiles, review preview, commit, and observe POST /api/imports/account-balances/preview200 and /commit201. Reload and verify the expected balance/history/import record persisted for A. Save a sanitized screenshot of the import result. API-only import does not prove browser file selection; if UI fails, preserve the exact failure.

C. As B, first prove B can access its own valid resource. GET A's account ID must return404 under the current handler contract. PUT that same A ID with a syntactically valid account-update body must return404, not400/401/500. Then A GET must still return200 and exactly the pre-attack state. Verify B sees none of A's imported account/history. Record before/after equality and statuses. A generic empty list alone is insufficient. If contract changed legitimately, cite handler and test supporting the new exact status; do not broaden acceptance arbitrarily.

D. As A, before deletion prove PUT /api/profile with the chosen valid payload returns200, and obtain a fresh real session token. DELETE /api/account-data with the exact valid confirmation payload must succeed. BEFORE signing out or deleting Clerk A, immediately repeat that profile PUT using the still-valid session; require410. This establishes deletion rejection rather than revoked-auth401. Assert all A financial rows remain absent and a tombstone exists. Record redacted actual HTTP statuses; a UI message alone is insufficient. Keep B alive until A's isolated deletion and B's remaining data are checked.

E. Complete B's application-data deletion and verify scoped cleanup; then remove exact A/B Clerk identities. Preserve tombstones. In finally, perform best-effort cleanup only for manifest IDs and report every incomplete step. Verify zero financial rows across all14 user-scoped tables for the created IDs, both expected tombstones, and provider absence for those two identities. Never delete old tombstones or any unrelated user.

## 6. No-loop execution limits

- One harness run; at most one targeted repair/retry for a new diagnosed tooling defect, reusing live sessions when safe.
- Never start another agent, browser framework or full verification cycle after hitting the same blocker again.
- If a genuine application defect appears: preserve evidence, write a focused failing regression, fix only that defect, and rerun the affected checks. A material scope expansion returns to primary review.
- Do not clean up live identities until the required assertions have either been recorded or explicitly declared blocked. Always cleanup at the end; never leave users behind to avoid the gate.
- A blocked result must name the exact step, tool/error, evidence, remaining cleanup and smallest owner action. Preserve the reusable harness and completed results. No repeated generic progress messages.

## 7. Deliverable and candidate rules

Update evidence/C07/validation-matrix.md and submissions/B06.md with links to actual artifacts. Add:
- remaining/report.json: candidate SHA, immutable URL, effective DB, timestamps, per-assertion expected/actual status and boolean result, explicit deferred/blocked cases;
- remaining/cleanup.json: manifest-scoped count/identity-absence outcomes without credentials;
- reusable harness and concise reproduction instructions;
- sanitized import screenshot and run log.

Ensure the harness exits nonzero for any failed/missing assertion or incomplete cleanup. Missing observations are not PASS. Test fail-closed assertions as appropriate. Do not fabricate raw evidence from prose recollections.

If only evidence/docs change, retain the same verified website candidate and preview; no deployment/full-suite rerun is needed. If executable tooling changes, validate that tooling and run repository-required checks before pushing. If application/build/runtime/dependency code changes, run ./scripts/test_all.sh (npm audit for dependency changes), push code, require green exact-candidate CI, publish an isolated preview, verify binding and rerun affected hosted proofs plus all public-route smoke checks. State actual route count, not a fixed85. Record source, tooling and documentation SHAs separately.

Set B06 ready_for_review only if all applicable nondeferred requirements now have evidence; otherwise blocked with exact reason. Commit/push only the codex branch. Keep C08 locked, B06 unchecked, no main merge or production deploy. End with the primary-review command and exact candidate/preview/CI/evidence identifiers.

## 8. Primary reviewer gate to unblock C08

Primary will inspect the real HTTP assertions, verify cleanup and candidate relationship, and rerun only a suspicious/missing check. When B06 genuinely passes, primary marks it done, records C07 acceptance, validates the ledger, and releases C08 in order B26 then B27. Worker self-review does not release C08. No further business decision or paid service is implied by C08 release.


## Current reviewer correction — 2026-09-16

Read reviews/C07.md first. Submitted harness4a7e785 is not safe/complete to run with a key. Repair R1–R4 and add fail-closed local negative tests before executing the remaining hosted proofs. This supersedes any claim that simply supplying CLERK_SECRET_KEY completes setup. Do not repeat previously accepted product tests unless code changes justify it.

Primary follow-up2026-09-16: use the primary-corrected harness after13ced36; review latest reviews/C07.md addendum. Do not restore mocked Clerk captcha_bypass response changes. Local15-test pass is not hosted proof. Load secrets through private ignored configuration/editor, never echo literal keys into shell history.
