# B39 implementer-side pre-review — 2026-09-26 (not an acceptance)

Author: Claude, staffing the delivery role under the 2026-09-26 owner takeover amendment. Under that amendment Claude does not accept tasks; B39 is `ready_for_review` for Codex's final independent verification. Code commit: `c7c5b31`.

## Checks performed

- **Parity fixture provenance:**
  - Exported baseline `42780b4` with `git archive` into an isolated directory.
  - Copied the candidate `src/appParity.test.tsx` and the fixture into it.
  - Ran the test against the baseline source: 7/7 pass. So the fixture reflects baseline rendering.
- **Parity sensitivity:**
  - Changed one class name in `src/components/InfoTip.tsx`. The suite failed (1 failed, 6 passed), then passed again after the change was restored.
  - The test only reads the fixture and never writes it.
- **API semantics:**
  - `readApiJson` (`src/lib/api/client.ts`) checks `!response.ok` first, then calls `await response.json()` directly.
  - This matches baseline `readFinancialAccountResponse` and `readGoalResponse` at baseline `App.tsx:1265` and `:1830`.
- **Full suite:**
  - Ran `./scripts/test_all.sh` with Python removed from PATH, using Node 24. Exit 0.
  - 62 files and 1,777 Vitest tests pass. Typecheck, build and isolation pass (21 assets, 0 leaks).
- **Browser (local `vite preview` of the candidate build):**
  - At desktop: `/`, `/calculators/fire`, `/calculators/mortgage` and signed-out `/dashboard`.
  - At 375px: `/calculators/fire`.
  - Correct h1 on each, no horizontal overflow, no console errors.
  - Gemini's CDP script could not bind port 9222 here because another Chrome held it. That is an environment conflict, not a product result.
- **Scope:**
  - `App.tsx` is 6,600 lines (baseline 8,841).
  - `fire.ts`, Functions and migrations are unchanged.
  - `scripts/hosted_smoke*` are left for B42.

## For Codex verification

Repeat the provenance and sensitivity checks, confirm the API semantics, and decide acceptance. Known non-blocking item: the Vite large-chunk warning, which belongs to B38.
