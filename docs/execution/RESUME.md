# FinPath execution resume — 2026-09-26

This is the single current resume file. Astra is the active architect/reviewer role (Codex or Claude); Gemini implements. Read `CHECKPOINTS.md`, `TASK_STATUS.json`, the 2026-09-26 protocol amendment and the latest task submission before acting. Historic checkpoint reviews remain evidence, not current release state.

## Exact code and hosted state

- Branch/PR: `codex/finpath-quality-execution`, [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140); `main` is not merged.
- Last reviewed hosted proof-runner candidate: `f422cb31f517d747247207996dcdb3007bc760a5`. Product code is unchanged from `74671167fa6f373ccb8f979efad7efd1b188f66e` in that revision. Reviewer documentation commits follow; check the actual current HEAD before any edit or publication.
- Exact candidate CI: [GitHub Actions 36225833709](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36225833709), passed.
- Immutable isolated preview: <https://5a5481de.interactive-fire-calculator.pages.dev>, deployment `5a5481de-8eb1-4450-83f0-8a800668037a`, verified candidate SHA and `finpath-preview` D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`. Production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6` was untouched. All 84 public calculator routes passed smoke on this preview.

## Open work and exact next action

- 27/41 tasks accepted (65.9% by task count after registering six pending tasks). B10 is accepted. **B11 and B28 are blocked, C09 is open, C09B and C10 are locked.** Gemini is currently executing [the final C09 Stage 4 readiness prompt](C09_STAGE4_READINESS_PROMPT.md) in the stable checkout. Do not overwrite its working-tree files under `evidence/C09/**`, `src/**`, `submissions/B11.md`, `submissions/B28.md` or `validation-matrix.md`.
- Last hosted run passed review-panel clearance at desktop/light and dark and mobile/light and dark, then stopped before the Version 2 revise/Version 3 journey because it checked the panel before it was visible. The [review](reviews/C09-hosted-attempt-f422cb3.md) and preserved [raw attempt](evidence/C09/attempt-f422cb3/) distinguish observed PASS from unobserved downstream checks. Both disposable users were independently verified absent from Clerk and all 15 preview tables, with tombstones retained.
- **Next prompt path:** `docs/execution/C09_STAGE4_READINESS_PROMPT.md` is already with Gemini; do not send it again. When Gemini submits, review only its delta, run one exact-code isolated hosted proof, independently verify cleanup, then apply the C09 final-round decision tree in `CHECKPOINTS.md`. Do not write another C09 FINISH/REWORK prompt.
- [Draft B37 start prompt](prompts/B37.md) is ready but **must not be sent until C09 closes and C09B releases**. C09B order is B37 → B39 → B36. C10 then B29 → B30; C11 B41 → B38 → B12 → B31. B40 is queued after C11.

## Owner actions and guards

- **OA-1 pending:** owner creates a production Clerk instance and securely provides production keys before production readiness; B38/free-preview work may proceed without it.
- **OA-2 pending:** owner confirms B37 will untrack bulk evidence from the current Git index only, with no history rewrite. B37's evidence-untracking step waits for this; other independent preparation may proceed.
- Free-tier isolated previews only. No purchase, DNS change, production data write or production deployment. Production-auth preflight remains fail-closed. Native 200% zoom and actual screen-reader checks remain deferred to B31/C11, not passed.

At session end, the active Astra role overwrites this file with fresh candidate/preview/CI, open tasks, blockers, owner actions and exact next prompt. Never use it as a substitute for current Git and hosted verification.
