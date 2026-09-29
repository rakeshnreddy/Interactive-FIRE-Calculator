# Codex final handoff — close the program, merge, and deploy to production

Owner instruction (2026-09-28): "complete the rest of the tasks … you can merge and deploy and close the work." This prompt is that authorisation, recorded in the repository. Paste everything below the line into Codex.

---

You are Astra, the architect and sole reviewer, now also authorised by the owner to **merge and deploy to production** and close the program. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. Use Node ≥ 22 (`export PATH=/opt/homebrew/bin:$PATH`); refresh the Cloudflare CLI session with `npx wrangler whoami` if an API call returns 401. Never print secrets. Do not trust self-reports: verify before you accept, merge or deploy.

## Where things stand

- Ledger: 38/42 accepted. Open: **B31** (`ready_for_review`), **B40** (implementation passed your review; waits on C11), **B13/B14** (gated on retention evidence; not launch work).
- Branch `codex/finpath-quality-execution` → [PR #140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140) → base `codex/dependency-security-refresh` → [PR #139](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/139) → `main`. Cloudflare Pages production branch is `main`.
- Final candidate code `2277b80ce089d0ddf0caf22a21c0c809ae6a31f5` (docs/evidence on top up to `5471fe7`). Preview `https://d0d235df.interactive-fire-calculator.pages.dev` (deployment `d0d235df-3d54-4d7d-9f88-745ff9f6f71b`, preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`). On it: public smoke 84/84; `b31-visual`, `b31-zoom --zoom 200`, `b31-reader --headed`, `c09-revise`, `c10-reports-settings`, `c11-api-boundary`, `c11-delivery`, `c11-analytics` all PASS with cleanup. Full gate 79 files / 2,465 tests.
- B31 reader gate: an actual VoiceOver pass (macOS 26.6.2, Chrome 154) matched 41/41 steps; it found two defects (FIRE answer not announced; disabled Calculate unreachable), fixed in `2277b80` with tests. Limitations are stated in `submissions/B31.md` (focus-driven navigation rather than VO key chords, search empty-state announcement not verified, NVDA not tested). Before-fix run kept as `evidence/B31/b31-reader-b3416cb.json`.
- Preview analytics retention Worker `finpath-analytics-retention-preview` is live (daily `17 3 * * *`, preview D1 only). There is **no production retention Worker yet**.

## Phase 1 — review and close the remaining tasks

1. `git fetch && git checkout codex/finpath-quality-execution && git pull`; confirm HEAD contains `2277b80` and the tree is clean.
2. Review B31 against `prompts/B31.md`, `B31_READER_PROMPT.md`, `reviews/C11.md` and `submissions/B31.md`. Inspect `evidence/B31/b31-reader-2277b80.json` (every step has VoiceOver's spoken phrase). Decide explicitly whether the stated limitations are acceptable for closure or need a recorded follow-up task; record either in `reviews/C11.md`. Re-run `./scripts/test_all.sh` (Python removed from PATH) and, if you want independent hosted proof, `b31-visual` or `c11-analytics` on the preview above.
3. If B31 passes: mark B31 `done`, accept **C11**, release and close **C14**, and accept **B40** (its correction already passed your implementation review; confirm nothing in `2277b80` regressed it: `src/lib/calculatorConsistency.test.ts`, `evidence/B40/routes-b3416cb.json`). Update `TASK_STATUS.json`, `CHECKPOINTS.md`, `docs/EXECUTION_BACKLOG.md` checkboxes, `RESUME.md`, and `python3 docs/execution/validate_packet.py` must pass.
4. Leave B13/B14 open and gated; they are not launch work.
5. If you find a defect, fix it or hand it back with a bounded prompt; do not merge until the reviewed candidate is green.

## Phase 2 — merge to main (authorised)

6. Update PR #140's description with the final state; confirm its CI is green on the final head.
7. Merge **PR #140** into `codex/dependency-security-refresh`, then merge **PR #139** into `main` (merge commits; no force-push, no history rewrite). Confirm CI on `main` and that `main` contains `2277b80`.
8. After the merge, Cloudflare may build a production deployment of `main` automatically if Git integration is on. Check with `npx wrangler pages deployment list --project-name interactive-fire-calculator`; if a production build without live Clerk keys appears, verify public calculators work signed out and that sign-in fails closed rather than using development keys. Record what you observe.

## Phase 3 — production deployment (authorised, but fail-closed on OA-1)

Follow `docs/PRODUCTION_AUTH_RUNBOOK.md` exactly. Production D1 is `finpath-production` `a5860350-0a50-4ebe-9f5f-1d9916a908e6`.

9. **Gate — OA-1 (owner only):** Clerk production requires a domain the owner owns, attached to Pages, with Clerk DNS records and `clerk deploy status` complete, live keys in the ignored `.env.production.local`, and Pages secrets `CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_AUTHORIZED_PARTIES` set. Run `npm run auth:preflight`. **If it fails, stop here**: report exactly which runbook step is missing, leave production untouched, and give the owner the checklist (runbook sections 1–5). Do not create a domain, DNS records, or keys yourself, and never substitute development keys or `pages.dev`.
10. **Database (OA-3, authorised by this handoff):** before any change, capture a restore point (`npx wrangler d1 time-travel info finpath-production` and record the bookmark; optionally `npx wrangler d1 export finpath-production --remote --output <ignored path>`). List pending migrations with `npx wrangler d1 migrations list finpath-production --remote`, then apply them with `npx wrangler d1 migrations apply finpath-production --remote`. Verify the analytics tables and triggers exist and existing row counts are unchanged. Mark OA-3 done with the bookmark.
11. **Deploy:** from `main`, `npm run cf:deploy:production` (preflight → full suite → live-key build checks → production deploy). Record the deployment ID and commit.
12. **Production retention Worker:** create a separate reviewed config (for example `workers/analytics-retention/wrangler.production.toml`, name `finpath-analytics-retention`, same cron, binding only to `finpath-production`), keep the preview config preview-only, deploy it, and prove one run with `wrangler dev --remote --test-scheduled` against a **synthetic aged row only**, then remove the synthetic rows. Never touch real user rows.
13. **Verify production** per runbook section 9: `node scripts/check_production_auth.mjs --env-file .env.production.local --check-cloudflare --dist dist --site <production origin>`, all 84 public routes (`node scripts/smoke_public_calculators.mjs <origin>`), and a disposable production test user through sign-up → sign-in → workspace routes → save → export → delete, then remove that user. Confirm analytics stays off by default.
14. **Rollback plan, recorded before step 11:** previous production deployment ID (Pages rollback in the dashboard or redeploy of the prior commit) and the D1 time-travel bookmark (`npx wrangler d1 time-travel restore finpath-production --bookmark <id>`), used only if verification fails.

## Phase 4 — close the work

15. Record the launch in `reviews/` (what shipped, production deployment ID, D1 bookmark, Worker version, verification results, known limitations: B31 reader limitations, dated XIRR and other open rows in `docs/calculator-excellence/GAP_MATRIX.md`, B13/B14 gated).
16. Update `RESUME.md` to "launched" (or "merged; production blocked on OA-1" if step 9 stopped you), `TASK_STATUS.json` owner actions (OA-1, OA-3 status), and run the packet validator. Commit and push.
17. Report to the owner: what was accepted, what merged, whether production is live (URL, deployment ID), anything still needing them, and the monitoring to watch (first unattended production retention run at 03:17 UTC; Pages and Worker error rates for the first days).

Hard rules: no secret values in files, logs or chat; synthetic data only for tests; no DNS, domain purchase or paid service; stop and report at any failed gate instead of forcing it.
