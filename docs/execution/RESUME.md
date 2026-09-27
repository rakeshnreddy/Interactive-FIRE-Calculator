# FinPath execution resume — 2026-09-26

Astra is architect, sole publisher and reviewer; Gemini implements. Read `CHECKPOINTS.md`, `TASK_STATUS.json`, PA-10 and the active prompt. Historical review records are not the live task ledger.

## Exact code and hosted state

- Branch/PR: `codex/finpath-quality-execution`, [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140), still separate from `main`.
- B37 initial candidate: `0c6e35cd9720a1e79b05a1dc7baad7498848ff93` ([CI 36237024836](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36237024836) succeeded); final two-file manifest verification fix: `83bc1a27b54203a3d30e85b85a042c5b308190fe` ([Verify run 36237336507](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/36237336507) succeeded). Reviewer closure is in `reviews/B37-closure-2026-09-26.md`. B37 hygiene made no new hosted deployment claim.
- Last immutable isolated preview remains C09 code `c4bf784b106878e7e0c940564216ec44a72ecb38` at <https://18b043da.interactive-fire-calculator.pages.dev>, deployment `18b043da-e736-4f8f-83b0-3a0642ff6685`, bound to `finpath-preview` D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`. This preview is **not** B37 or B39 exact-code evidence. Production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6` remains untouched.

## Open work and exact next action

- 30/42 tasks are accepted (71.4% by count, not effort). C09B is released in order **B39 → B42 → B36**; C10 stays locked. B39 is `changes_requested` after its first independent review: the extraction is preserved, but the claimed parity test rewrites its own baseline, normal desktop/375px browser evidence is absent, and two API parse-error paths changed. [B39 focused correction](B39_REWORK_PROMPT.md) is the exact next Gemini task. Astra publishes only after corrected local evidence and review.
- The two untracked `scripts/hosted_smoke*` files are reserved for B42. Preserve them; they are neither B37 proof nor a permission to run hosted tests. B42 owns the C09 Version 2 revise → Version 3 hosted residual. No result for that journey is claimed yet.

## Owner actions and guards

- OA-1 production Clerk setup is pending for later production readiness only; it does not block free-preview B39 work. OA-2 current-index evidence untracking is done; no history rewrite.
- No purchase, DNS change, production data write, main merge or production deployment. Production-auth preflight remains fail-closed. Native 200% zoom and actual screen reader are deferred to B31/C11 and have not passed.

Verify live Git/hosted state rather than treating narrative as live state.


## Claude takeover — completed delivery, 2026-09-26/27 (handoff to Codex verification)

All work is on PR #140, branch `codex/finpath-quality-execution`, unmerged. Claude implemented, tested and hosted-verified; **no task is accepted**. Codex verifies with [CODEX_VERIFICATION_PROMPT.md](CODEX_VERIFICATION_PROMPT.md).

- **Final candidate:** `f85c6dd9c092720b0b0a1070cab657458be57cb6`. Immutable preview `https://d120fe09.interactive-fire-calculator.pages.dev` (deployment `d120fe09-d666-4bf5-9a12-508650dd05f1`, preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`, migration 0009 applied there only). On it: public smoke 84/84 and hosted `c09-revise`, `c10-reports-settings`, `c11-api-boundary`, `c11-delivery`, `c11-analytics`, `b31-visual`, `b31-zoom --zoom 200` all PASS with verified cleanup. Full suite: 79 files, 2,458 tests.
- **ready_for_review (submission in `submissions/`):** B39 `c7c5b31`, B42 `a09ff46`, B36 `a8f7422`, B29/B30 `f1db7db`, B41 `b4c7919`, B38 `2292aee` (+ `f994eca`), B12 `f994eca`, B40 `f85c6dd`, B31 `f85c6dd`.
- **Owner-directed work outside the original task list** (2026-09-26 requests): liquid-glass theme, new light/dark palettes and landing page for discoverability (`d8991ed`); functional pass over all 83 calculators with engine corrections and goldens, library grouping and region filter (`7d087d5`). Reviewed under B40 and B31; see `docs/calculator-excellence/GAP_MATRIX.md` for what stays open.
- **Pre-handoff independent review:** `/gstack-review` (local `codex` CLI adversarial + structured passes) found 13 defects in the calculator pass; all fixed in `f85c6dd` with regression tests and listed in `docs/calculator-excellence/GAP_MATRIX.md`. The Claude specialist sub-reviews were cut off by a session limit and were not rerun; Codex's own verification is the acceptance gate.
- **Not done, stated plainly:** native screen-reader check (B31 blocker, needs a person with VoiceOver); production readiness needs OA-1 (Clerk production keys) and OA-3 (migration 0009 on production D1). B13/B14 stay gated on retention evidence.
- **Next action for Codex:** run the verification prompt; record acceptance or `changes_requested` per task; release/close checkpoints C09B, C10, C11, C14 as the evidence supports. Keep PR #140 unmerged until the owner decides on production.
