# FinPath execution resume — 2026-09-26

This is the single current resume file. Astra is the architect/reviewer role (Codex or Claude); Gemini implements. Read `CHECKPOINTS.md`, `TASK_STATUS.json`, the 2026-09-26 protocol amendment and the next task prompt before acting. Historic checkpoint reviews remain evidence, not current release state.

## Exact code and hosted state

- Branch/PR: `codex/finpath-quality-execution`, [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140); `main` is not merged.
- C09 accepted code candidate: `c4bf784b106878e7e0c940564216ec44a72ecb38`; [exact-code CI 36229177941](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36229177941) succeeded. Reviewer documentation commits may follow; verify actual HEAD before work.
- Immutable isolated preview: <https://18b043da.interactive-fire-calculator.pages.dev>, deployment `18b043da-e736-4f8f-83b0-3a0642ff6685`, verified exact candidate and `finpath-preview` D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`. All 84 public calculators passed smoke. Production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6` was untouched.

## Open work and exact next action

- 29/41 tasks accepted (70.7% by task count, not effort). C09 is **accepted with an explicit hosted residual**; B11/B28 are closed under the owner PA-2/PA-3 final-round rule. The [C09 closure review](reviews/C09-closure-2026-09-26.md) and [failed final hosted attempt](evidence/C09/attempt-c4bf784/) explain the limit. The hosted revise → Version 3 journey and downstream B28 stages were not observed on the final candidate; they are **not PASS**. Cleanup of both disposable users was independently confirmed across Clerk and all 15 isolated D1 tables.
- C09B is **released** in order B37 → B39 → B36. **Next Gemini prompt:** [`docs/execution/prompts/B37.md`](prompts/B37.md). B37 creates PA-1's shared hosted smoke and must observe the C09 residual without another bespoke C09 runner. If corrected observation reveals a product defect, stop and register a scoped task; do not suppress it. B37 also handles owner-approved current-index evidence untracking, legacy-stack retirement and delivery hygiene. Gemini implements and submits; Astra reviews, commits and closes.
- C10 B29 → B30 remains locked until C09B acceptance. C11 B41 → B38 → B12 → B31 follows. B40 remains queued after C11. Native 200% browser zoom and actual screen-reader checks are deferred to B31/C11, not passed.

## Owner actions and guards

- **OA-1 pending:** owner creates a production Clerk instance and securely provides production keys for later production readiness; free-preview implementation may continue.
- **OA-2 done:** owner authorized B37 to untrack bulk evidence from the current Git index only. No history rewrite. Preserve accepted evidence references and independently review the exact index changes before publication.
- Free-tier isolated previews only. No purchase, DNS change, production data write or production deployment. Production-auth preflight remains fail-closed.

At session end, the active Astra role refreshes this file with exact candidate, immutable preview/deployment, exact-code CI, open tasks, blockers, owner actions and next prompt. Verify live Git/hosted state rather than treating this file as live state.
