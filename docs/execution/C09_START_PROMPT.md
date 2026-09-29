# C09 — restore a saved decision, complete a monthly review, polish the journey

Execute only when CHECKPOINTS.md records C09 released. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/finpath-quality-execution`, PR140. Read MASTER_REVIEW_PROMPT.md, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md, ACCESSIBILITY_DEFERRALS.md, prompts/B10.md, prompts/B11.md and prompts/B28.md. Follow current PRODUCT.md, DESIGN.md and COLOR_AND_GLASS_SYSTEM.md. Preserve other work. Primary alone accepts tasks and releases C10.

## Order and reviewable outcome

Implement B10 → B11 → B28 sequentially. A returning user opens the exact saved FIRE decision/version, understands its assumptions and dated financial picture, deliberately keeps/revises/defers a monthly review, and sees that choice persist after reload. No extra calculators, banking connections, notifications/email, payments, FX conversion or financial formula changes. Leave src/lib/fire.ts untouched. Do not create a second persistence model or substitute localStorage for server persistence.

First inspect actual handlers, migrations, saved-calculator destination IDs, plan/version APIs, auth/tenant helpers, existing tests and B04 idempotency behavior. Write a concise implementation contract and assertion matrix before coding. Reference exact files/endpoint schemas; do not guess payloads or statuses. Each matrix row must describe setup, action, expected state/HTTP result, test/evidence path and cleanup obligation.

## B10: exact saved-decision navigation

1. Trace the real saved result → plan/version relationship. Preserve existing public URLs. Use stable opaque IDs/version in links; never put money, private inputs or tokens in URLs.
2. Add tests first for exact owned version, multiple versions, missing/archived/foreign records, refresh/back and malformed links. Server-side ownership remains mandatory; client routing is not authorization.
3. Load the named version and show its immutable assumptions/date/source. A missing or forbidden link must show a controlled state, never silently load another plan or the latest version.
4. Protect unsaved edits before navigation replaces them. Cancel preserves edits; confirm loads the exact destination. Test both paths and return navigation.
5. Hosted proof: synthetic A saves two distinguishable versions, opens the older exact link, reloads and verifies expected inputs/version. Synthetic B's valid session cannot fetch/change A's record. Record actual statuses and A's full unchanged state. Existing accepted C07 signup walkthrough need not repeat.

## B11: monthly review loop

1. Reuse existing data contracts where possible. Define review fields and semantics: owning user, exact plan/version reference, recorded evidence date, explicit keep/revise/defer choice, completion or deferral date, and next review due. Distinguish saved draft from completed review. Do not label automatic recalculation as review completion.
2. If a migration is required, write an additive migration and rollback/recovery note; test locally including deletion/export coverage and tenant ownership. Existing remote authorization covered named historical migrations only. Do not apply a new remote migration without the owner's exact-target authorization. Finish local implementation/tests and present the reviewed SQL, expected effects and isolated DB target as the only remaining gate; do not stop at a speculative schema proposal.
3. Write behavioral tests before implementation: the documented >=7-day returning-review rule (initial activation is not retention), timezone/day boundaries, no-input-change confirmation, repeat confirmation/idempotency, stale evidence, missing/archived/foreign version, save failure/retry, and completion versus deferral. No optimistic success that survives a failed save. Repeating a confirmation must not create duplicate reviews.
4. Implement in-app due list and explicit completion. Keep/revise/defer must be understandable. Keep original versions immutable; a revision creates/uses the established version mechanism. No advice, email or background account changes.
5. Hosted proof after any required migration authorization: save/reload each choice, confirm due-state behavior with declared reference time, verify repeat-safe confirmation and tenant isolation. New user-scoped data must participate in export and deletion; test and verify cleanup before provider removal. B12 analytics is not yet permission to collect events: no new tracking here.

## B28: goals and review presentation

Use the B10/B11 behavior, not another review model. Show source/version, evidence date, target/current state/gap and meaningful progress with honest units. Do not combine currencies or invent trends. Make due/overdue/deferred/completed states explicit in text, not color alone. Preserve unsaved edits and clear error recovery.

Verify empty goals, long names/amounts, completed goals, overdue/deferred review, missing version, stale inputs, loading and failed save/retry. Use isolated local fixtures for deterministic failure simulation, clearly labeled as local evidence; hosted auth/security responses must never be mocked. Verify responsive desktop/tablet/mobile320px, both actual app themes, keyboard control/focus and error association, reduced motion/transparency and measured composited contrast. Native200% zoom and actual readers remain deferred to B31/C11. Do not block on or claim those deferred checks.

## Verification quality — lessons from C08

- An explicit assertion evaluator must reject missing/false/unknown results, recorded exceptions, wrong statuses/counts and incomplete cleanup. Add injected negative tests before hosted execution, including report-write failure. Never set SUCCESS just because a script reached the bottom.
- Missing controls fail a required check; never convert absence into PASS. Use keyboard Tab/Enter/Space and observable resulting state, not focus() alone. A matchMedia result proves preference emulation, not animation suppression or opaque surfaces: inspect computed behavior.
- Set the actual app theme with its toggle or persisted finpath.colorMode plus reload; assert .app[data-mode] and changed computed colors. OS colorScheme emulation alone is insufficient. Capture controls at their actual scroll positions in viewport shots; full-page screenshots may place sticky headers misleadingly. Inspect images yourself.
- Contrast must use actual rendered foreground plus composited badge/surface/ancestor background. Do not hardcode a surface color while ignoring alpha. Prove full record equality when claiming immutability; counts alone can hide overwritten values.
- Keep raw observations and expected/actual results, not a collection of unchecked true flags. Bind evidence to exact code, fixture build and immutable preview. Reuse accepted unchanged evidence instead of rerunning broad audits.

## Hosted scope and credentials

Only free preview project interactive-fire-calculator and D1 finpath-preview `0dbad68e-7493-452f-8504-98d4c61ee5da`. Production DB `a5860350-0a50-4ebe-9f5f-1d9916a908e6` is forbidden. Reverify deployment environment=preview, exact code SHA and effective binding before every hosted write run. No main merge, production deploy, DNS, paid services or financial connections.

Reuse private ignored0600 .env.preview.local and proven Clerk helpers. Never print secret values, tokens, raw user exports or credentials in logs/screenshots/traces. Do not read cookies/keychains/shell history. The development instance requires email AND phone: documented +clerk_test email and fictional test phone, generated password, real Clerk session; supported testing token only, no fabricated auth responses. Existing scoped synthetic lifecycle authorization persists; request only genuinely new actions such as a new migration.

Prepare all local tests, browser availability and cleanup before creating users. Record each exact created ID immediately in a private manifest. Keep sessions through required assertions. Cleanup those IDs only: app deletion, all relevant user-table zero counts plus tombstones, then provider removal and actual404 absence. Withhold provider removal if application cleanup is unverified. No blanket empty-database assumption, unrelated user deletion or historical tombstone removal. Retain recovery manifest and partial evidence on any failure.

## Finish and checkpoint boundary

Run relevant tests after changes and ./scripts/test_all.sh before pushing. Use small commits; no force-push or unrelated rewrites. Obtain green exact-code CI. Deploy one final isolated preview after tests, read back binding/SHA, run public-route smoke checks and all affected B10/B11/B28 journeys on that same candidate. Audit dependencies only if changed; prefer no new packages.

Publish submissions/B10.md, B11.md, B28.md and evidence/C09/validation-matrix.md, compact progress.md, sanitized execution logs, actual screenshots and cleanup proof. Record implementation versus evidence SHAs separately. Explain any remaining authorization or missing evidence precisely. After one diagnosed repair/retry of a repeated blocker, report the reproducible issue and smallest next action; do not cycle frameworks or fabricate a pass.

All three tasks remain ready_for_review only if every applicable nondeferred criterion is evidenced, otherwise blocked with exact reason. Leave backlog unchecked; do not close tasks or release C10. End with “Review C09 using docs/execution/MASTER_REVIEW_PROMPT.md” plus candidate, PR, exact CI, immutable preview/deployment/binding and evidence paths. Primary reviewer owns closure.
