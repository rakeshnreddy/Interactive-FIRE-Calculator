# Codex verification prompt — owner-takeover delivery on PR #140

Paste the block below into Codex (Astra). It is the independent acceptance pass the owner asked for after Claude finished the remaining C09B–C14 work autonomously on 2026-09-26. Claude marked every task `ready_for_review`; only Codex records `done`, APPROVED closures and checkpoint releases.

---

You are Astra, the sole reviewer. Claude (staffing the delivery role under the 2026-09-26 owner takeover amendment in `docs/execution/CHECKPOINTS.md`) implemented, tested and hosted-verified the remaining tasks and marked each `ready_for_review`. Verify independently and record acceptance or `changes_requested` per task. Do not trust self-reports: rerun what matters. **No `main` merge and no production deploy or production D1 write are authorised.** Production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6` must not be touched. Never print secrets; Clerk dev keys stay in `.env.preview.local`.

## Candidate

- Branch `codex/finpath-quality-execution`, PR https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140 (keep unmerged).
- Final candidate code: `7f67cfacdaf32c361ea1631478f60af0b9e278d0`.
- Final immutable preview: `https://4c6ff32c.interactive-fire-calculator.pages.dev` (Cloudflare Pages deployment `4c6ff32c-a241-4623-9c0d-95348c3070a6`, commit `7f67cfa`, bound to the preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`; migration 0009 applied there only).
- Commits since the pause point `68b4c4a`, oldest first: `d8991ed` design/theme/landing, `7d087d5` calculator functional pass, `d0ade7f` analytics buffering, `f994eca` auth remount fix, `a9e4a0a` B40 remainder + B12 submission, `5531694` B31 sweep tooling, `b9aa64a` layout fixes, `df9a764` contrast tokens, `dcfc377` muted text + CSV input names + B40 docs, `7f67cfa` site icons, 24px targets, placeholder page removed.
- Earlier takeover commits (already `ready_for_review` before the pause): B39 `c7c5b31`, B42 `a09ff46`, B36 `a8f7422`, B29/B30 `f1db7db`, B41 `b4c7919`, B38 `2292aee`.

## Tasks to accept or reject (read each `docs/execution/submissions/<id>.md` first)

| Task | Checkpoint | Code SHA | What to verify independently |
|---|---|---|---|
| B39 | C09B | `c7c5b31` | Extraction preserved behaviour; parity test is read-only against the immutable baseline fixture; `reviews/B39-claude-prereview-2026-09-26.md`. |
| B42 | C09B | `a09ff46` | Shared runner `scripts/hosted_smoke.mjs` + `scripts/smoke/*.mjs`; provider-verified preflight; fail-closed cleanup; C09 revise residual. |
| B36 | C09B | `a8f7422` | OD-1/OD-2: empty required rates, additive accumulation engine goldens (`src/lib/fireAccumulation.test.ts`), `fire.ts` drawdown untouched. Formula review required. |
| B29, B30 | C10 | `f1db7db` | Reports and settings polish; `c10-reports-settings` hosted scenario. |
| B41 | C11 | `b4c7919` | API middleware: body caps, error shape, auth boundaries; `c11-api-boundary`. |
| B38 | C11 | `2292aee` (+ `f994eca` regression fix) | Lazy Clerk, prerendered route HTML, 404, `_headers` CSP; `c11-delivery`. Check that `f994eca` (app no longer remounts when Clerk loads; `src/auth.test.tsx`) is sound. |
| B12 | C11 | `f994eca` | Consent-gated, pseudonymous measurement per `docs/MEASUREMENT_AND_EXPERIMENT_PLAN.md`; off by default; `c11-analytics`. OA-3 (production migration) stays pending. |
| B31 | C11 | `7f67cfa` | Visual/accessibility/performance matrix: `b31-visual` and `b31-zoom --zoom 200` scenarios, evidence under `docs/execution/evidence/B31/`. Screen reader is **not done** (blocked, see submission). |
| B40 | C14 | `a9e4a0a` | Library consolidation, region filter, copy guard, signed-out navigation, scenario labels, rate caps; `docs/calculator-excellence/GAP_MATRIX.md`. Includes owner-directed engine fixes from `7d087d5` — review those formulas against the goldens in `src/lib/seoCalculators.test.ts`. |

## Commands (Node ≥ 22: `export PATH=/opt/homebrew/bin:$PATH`)

1. `git fetch && git checkout codex/finpath-quality-execution && git status` — confirm HEAD `7f67cfa` and a clean tree.
2. Full gate, Python removed from PATH as the protocol requires: `./scripts/test_all.sh` (expected: 78 files, 2,443 tests, isolation PASS).
3. Public delivery: `node scripts/smoke_public_calculators.mjs https://4c6ff32c.interactive-fire-calculator.pages.dev` (expected: 84 routes).
4. Hosted scenarios on the candidate (each writes `docs/execution/evidence/smoke/raw/<scenario>-7f67cfa.json`):
   ```
   for s in c09-revise c10-reports-settings c11-api-boundary c11-delivery c11-analytics b31-visual; do
     node --no-warnings scripts/hosted_smoke.mjs --sha 7f67cfacdaf32c361ea1631478f60af0b9e278d0 --deployment-id 4c6ff32c-a241-4623-9c0d-95348c3070a6 --url https://4c6ff32c.interactive-fire-calculator.pages.dev --db-id 0dbad68e-7493-452f-8504-98d4c61ee5da --account-id 4e1b7f6a7440770a01779a67602ec5e9 --scenario $s
   done
   node --no-warnings scripts/hosted_smoke.mjs --sha 7f67cfacdaf32c361ea1631478f60af0b9e278d0 --deployment-id 4c6ff32c-a241-4623-9c0d-95348c3070a6 --url https://4c6ff32c.interactive-fire-calculator.pages.dev --db-id 0dbad68e-7493-452f-8504-98d4c61ee5da --account-id 4e1b7f6a7440770a01779a67602ec5e9 --scenario b31-zoom --zoom 200
   ```
   Every run must end `"status": "PASS"` with cleanup verified for each synthetic tenant. The runner refuses the production D1.
5. `python3 docs/execution/validate_packet.py` — packet consistency.
6. Spot-check in a real browser (both themes, 1440 and 390 wide): `/`, `/calculators?region=India`, `/calculators/mortgage` (scenario tabs list changed inputs), `/calculators/fire` (blank rates blocked; "Use example values"), signed-out `/dashboard` (auth gate, no Workspace menu), then a synthetic signed-in pass through Settings → "Help improve FinPath" (off by default).

## Independent review focus (risk-based)

- **Formulas** (B36 accumulation; B40/`7d087d5` engines: affordability, ARM, points, rent-vs-buy, balance transfer, XIRR, Roth comparison, biweekly, NPS, gratuity cap). Each has a closed-form golden; confirm the goldens are right, not just that tests pass.
- **Privacy** (B12): no event carries amounts, free text or the Clerk user id; consent revocation and account deletion purge; signed-out visitors never send analytics.
- **Auth boundary** (B38/B41): public pages make no Clerk request before intent; CSP has no violations; API error shape and body caps.
- **Accessibility** (B31): the sweep is automated evidence, not a WCAG claim; the native screen-reader check remains open. Decide whether that stays a B31 blocker or a recorded deferral.
- **Scope honesty**: `docs/calculator-excellence/GAP_MATRIX.md` open rows must stay open.

## Record

Per task: acceptance or `changes_requested` with exact findings in `docs/execution/reviews/`, `TASK_STATUS.json` status/`review`, checkpoint rows in `CHECKPOINTS.md`, backlog checkboxes in `docs/EXECUTION_BACKLOG.md`. Maximum three correction rounds per task. Leave PR #140 unmerged; production remains blocked on OA-1 and OA-3.
