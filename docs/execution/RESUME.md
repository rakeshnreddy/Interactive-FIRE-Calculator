# FinPath execution resume — 2026-09-26

Astra is the architect/reviewer; Gemini implements. Read `CHECKPOINTS.md`, `TASK_STATUS.json`, the PA-10 amendment and the current task prompt. Historical reviews are evidence, not the live release ledger.

## Exact code and hosted state

- Branch/PR: `codex/finpath-quality-execution`, [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140); `main` is not merged. Last committed local HEAD at the B37 hygiene review: `60ec03b45cc523d124e012e02a2255c88448080c` (docs-only scope split; verify remote before publication). Gemini B37 files remain uncommitted.
- C09 accepted code candidate remains `c4bf784b106878e7e0c940564216ec44a72ecb38`; [exact-code CI 36229177941](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36229177941) succeeded. Its immutable isolated preview is <https://18b043da.interactive-fire-calculator.pages.dev>, deployment `18b043da-e736-4f8f-83b0-3a0642ff6685`, bound to `finpath-preview` D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`. This is **not** a B37 or B42 preview/proof. Production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6` remains untouched.

## Open work and exact next action

- 29/42 tasks accepted (69.0% by task count, not effort). C09B is released in order **B37 → B39 → B42 → B36**; C10 remains locked. B37 is changes_requested. Gemini's legacy retirement, goldens, staged evidence untracking and manifest remain uncommitted in the stable working tree. The old stub smoke runner remains untracked for B42. The narrowed B37 review found incorrect first-add provenance for seven screenshots, two missing concrete evidence references, stale normative inventory, and submission accounting/coverage gaps. Preserve all worker files.
- **Next Gemini prompt:** [B37 focused hygiene correction](B37_HYGIENE_CORRECTION_PROMPT.md). B37 covers only legacy retirement, finance goldens, PA-4 manifest/ignore, `.pyc` index removal and current normative docs. Gemini must exclude `scripts/hosted_smoke*` and its test invocation from B37 candidate, leave the untracked files untouched for B42, and label any authority-dependent step `NOT RUN — requires Astra`. Astra commits only passing B37 hygiene and then measures post-commit clone sizes.
- [B42 prompt](prompts/B42.md) is registered but remains locked behind accepted B37 and B39. Gemini writes the shared runner with injected adapters and local fail-closed tests; Astra alone runs and records the hosted C09 revise/Version 3 and downstream B28 residual. The [C09 closure review](reviews/C09-closure-2026-09-26.md) did not claim those hosted steps passed.

## Owner actions and guards

- OA-1 pending for later production Clerk setup; it does not block free-preview B37/B39/B42 work. OA-2 done: current-index evidence untracking only, no history rewrite.
- Free-tier isolated previews only. No purchase, DNS change, production data write, main merge or production deployment. Production-auth preflight remains fail-closed. Native 200% browser zoom and actual screen reader remain deferred to B31/C11, not passed.

At session end, Astra refreshes this file with exact candidate/preview/CI, open tasks, owner actions and next prompt. Verify live Git/hosted state rather than treating narrative as live state.
