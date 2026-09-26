# C08 execution: B26 dashboard/accounts, then B27 transactions/import review

You implement and verify; the primary reviewer alone accepts tasks. Read CHECKPOINTS.md before starting: execute only if C08 is released. Work sequentially in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/finpath-quality-execution`, PR140. Preserve existing changes. Never reset, force-push, merge main or deploy production.

## Outcome and boundaries

Make the authenticated financial picture understandable and useful: dated account balances grouped by currency, an honest next action, and a clear transaction/import review flow. Complete B26 then B27 on one final candidate. Read prompts/B26.md and prompts/B27.md, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md, COLOR_AND_GLASS_SYSTEM.md, PRODUCT.md, DESIGN.md, ACCESSIBILITY_DEFERRALS.md and the relevant source/tests. Those task contracts still apply. Native 200% zoom and actual screen-reader checks are deferred to B31/C11; do not repeat them or claim WCAG conformance.

No banking integrations, FX aggregation, invented trends, new financial formulas, schemas/migrations, dependencies, analytics, payments or paid services. Leave src/lib/fire.ts untouched. Preserve public URLs and signed-out public calculators. Keep fixtures outside production bundles. Backend changes are out of this visual/interaction scope unless a demonstrated defect requires a narrowly tested correction; report that scope change explicitly.

## Step 1 — establish the narrow baseline

1. Inspect branch, HEAD, worktree and current checkpoint ledger; read C07 review and final evidence. Do not rerun C07's entire lifecycle or reconfigure Clerk.
2. Locate DashboardPanel, AccountsPanel, TransactionsPanel and import components in actual current source (start with src/App.tsx). Follow imports; do not create duplicate implementations because a document path is stale.
3. Read the currency, date, transaction sign, deduplication and import contracts and existing tests. Identify concrete gaps against B26/B27. Record no more than one page of findings with file/line and user-visible consequences.
4. Make a task-specific acceptance matrix BEFORE implementation. Each row specifies fixture/setup, action, expected observable outcome and evidence path. Keep implementation and verification separate.

## Observed starting defects to include in B26

The primary C07 real account screenshot `evidence/C07/remaining/import_result.png` shows: record-balance date text crowded by the native calendar icon; imported12345.67 displayed as12346 throughout account/history; redundant signed-in email lines; internal copy “Accounts route is wired.” Give native date controls enough width at every supported viewport, expose exact cents for account/history values (summary rounding only if explicit), simplify identity presentation and replace implementation language with helpful user copy. Validate these against actual current code before changing them. This is display work; stored values/formulas must remain unchanged.

## Step 2 — B26 implementation and verification

- Show net worth and balances separately per currency. Label assets/liabilities and their sign consistently; no mixed-currency total or misleading conversion.
- Show balance date/as-of context. Derive stale status from a documented rule using real dates; never invent account activity or chart history. Use neutral copy that explains the next available action.
- Align account names, amounts, currency and dates. Long names must wrap without pushing actions off screen. Provide clear empty, loading, error/retry, archived and liability states. Keep edit/save controls and validation discoverable.
- Preserve existing persistence semantics. For behavioral changes, write a failing test with realistic inputs before the smallest fix. Test mixed currencies, negative net worth, stale/fresh dates, empty accounts, long labels and failed loading/retry. Do not add CSS-string tests.
- Verify actual fixture renders at desktop, tablet, mobile and 320px in light/dark. Capture representative screenshots and record keyboard traversal, visible focus, label/error association, reduced motion/transparency, contrast and no overlap. Review images yourself; screenshots alone are not assertions.
- Verify an authorized synthetic hosted add/update/reload against the isolated preview. Require correct amount/date/currency after reload, not merely HTTP200. Capture method/path/status and boolean value checks without tokens or personal records.

## Step 3 — B27 implementation and verification

- Align date, description, category and signed amount with explicit currency and active period. Preserve filters and provide a usable mobile representation; long descriptions must not hide amounts/actions.
- Clearly distinguish file selection, review/mapping where supported, invalid/duplicate rows, explicit confirmation, pending state and completion. Selecting a file must NEVER commit it. Preserve supported CSV schema, limits and duplicate rules.
- Show actionable validation errors with row context, accepted/rejected counts and honest failure copy. Do not claim an import succeeded until the server confirms it. Support retry without double submission; preserve entered/reviewed context when feasible.
- Test empty search, long merchant names, negative values, duplicate import, rejected rows, total failure and retry. Use exact parser/API contracts; do not guess field names/statuses. Preserve existing transaction semantics.
- Verify keyboard operation and focus restoration for dialogs; error messages must be connected to controls. Tables may scroll within their own labeled container; the whole page must not overflow at normal scale.
- Exercise real browser file selection, review, explicit confirm and reload using a synthetic hosted CSV, then re-import to verify the application's documented duplicate behavior and unchanged persisted count. API-only requests do not prove browser file selection. Record actual response statuses and persisted values.

## Hosted execution: reuse the proven path, no credential loops

- Free preview only. Allowed D1: `finpath-preview`, `0dbad68e-7493-452f-8504-98d4c61ee5da`. Forbidden production DB: `a5860350-0a50-4ebe-9f5f-1d9916a908e6`. Migration0006 is already applied; do not reapply it.
- Clerk development instance is already configured. Private ignored `.env.preview.local` contains development configuration, mode0600. Read it only into process memory; never print values or add secrets to commands, screenshots, HAR, traces, git or VITE variables. Do not read browser cookies, keychains or shell histories. If access disappears, stop before creating identities and report the exact missing capability once.
- Reuse `evidence/C07/remaining/run_remaining_proofs.mjs` helpers and lessons, not the full C07 test run. The instance requires email AND phone. Use documented `+clerk_test` email and distinct unused fictional `+1 (XXX) 555-01XX` phone numbers. No real email/SMS. See https://clerk.com/docs/guides/development/testing/test-emails-and-phones . Use strong generated passwords and real Clerk sessions. Testing tokens may facilitate test authentication; never mock provider auth/security responses.
- If the Cloudflare API returns an expired OAuth error, `npx wrangler whoami` can refresh existing OAuth. Reverify immutable deployment SHA, environment=preview and effective DB before any hosted writes. Never weaken the binding check to get past it.
- Validate required fields and browser availability BEFORE creation. Record exact created IDs immediately in a private0600 ignored manifest. A successful provider creation response must never be lost during later failure.
- Await Clerk loaded and a real user/session. Use supported Playwright `input.setInputFiles`; no repeated CUA fileChooser attempts. Attach response observers immediately before their action and handle rejection. Wait for observable state, not fixed sleeps. After out-of-band setup, reload the UI before interacting.
- Keep sessions alive through required assertions. Cleanup only this run's manifest identities: application-data deletion, scoped D1 zero counts/tombstones, then provider removal and provider absence verification. Retain the manifest and report failure if cleanup is incomplete. Never delete unrelated identities or historical tombstones.
- Local fixtures require no provider writes. Hosted synthetic add/update/import/delete is within the owner's existing isolated-preview authorization. No repeated permission question for that exact scope. No new authorization for paid or production operations is implied.

## Anti-loop rule and evidence quality

For a failure, record exact operation, sanitized provider error code/parameter, expected/actual, and root cause before changing code. One diagnosed repair and focused retry; if the same failure recurs, stop that path and supply a minimal reproducible blocker, keeping independent local work moving. Do not repeat global audits or ask the owner to perform an agent-capable step. Never replace failed assertions with weaker ones. A missing response/count is UNKNOWN/FAIL, not zero/PASS.

Assert actual results: reloaded values/history, before/after record equality where isolation matters, exact success/error statuses and cleanup absence. HTTP200, screenshots or tool exit0 alone cannot establish a user journey. Keep sanitized raw observations and negative tests for verification helpers that could incorrectly report success. Do not spend time testing trivial implementation details.

## Final candidate and checkpoint boundary

1. Relevant tests after meaningful changes. Run `./scripts/test_all.sh` before pushing; preserve log and exit status. Audit dependencies only if changed. Verify production build contains no fixtures or secrets.
2. Small reviewable commits, then push only the codex execution branch. Record exact code SHA and require green CI for that SHA. If code changes after verification, rerun affected checks.
3. Publish a free isolated Cloudflare preview only after tests pass; read back effective DB and deployment SHA. Run all public-route smoke checks, recording the actual route count. No production release.
4. Recheck BOTH B26 and B27 against the same final candidate and immutable preview. Existing accepted calculator/math/auth evidence need not be repeated unless your changes affect it.
5. Create submissions/B26.md and submissions/B27.md plus evidence/C08/validation-matrix.md, progress.md and cleanup proof. Include candidate/source/tooling/evidence SHAs, PR/base, exact CI URL, immutable preview/deployment ID, DB binding, test commands/counts, screenshots, actual hosted assertions, remaining risks and explicit accessibility deferrals. Keep a compact digest so primary review can spot-check the high-risk assertions without rerunning everything.
6. Mark each task ready_for_review only when every nondeferred requirement is proved. Otherwise mark blocked with exact missing evidence. Leave backlog unchecked. Do not mark done, release C09, merge main or deploy production.

End: `Review C08 using docs/execution/MASTER_REVIEW_PROMPT.md`, followed by exact candidate, preview, CI and evidence paths. The primary reviewer owns acceptance.
