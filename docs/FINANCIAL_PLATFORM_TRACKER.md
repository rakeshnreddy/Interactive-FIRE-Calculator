# Financial Platform Tracker

Last updated: June 11, 2026

This tracker is the working source of truth for moving the product from a standalone FIRE calculator into a full personal financial tracker and planner.

## Current Status

- Branch: `codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://2801f6a1.interactive-fire-calculator.pages.dev`
- Current production target: React, TypeScript, Vite, Cloudflare Pages
- Legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

## Phase Progress

| Phase | Status | Completion | Notes |
| --- | --- | ---: | --- |
| Phase 1: Product Shell and IA | Complete | 100% | Public landing, app shell, target IA placeholders, FIRE module route, compact calculator UX, and progressive disclosure are in place. |
| Phase 2: Auth and User Accounts | Dev credentials wired, production instance blocked | 85% | Clerk selected and integrated; sign-up/sign-in/sign-out controls, signed-in shell state, route gates, `/api/me`, local dev env, and Cloudflare Pages preview secrets exist. Real production auth needs a Clerk production instance/domain before it can be marked complete. |
| Phase 3: Server Persistence | Not started | 0% | Add D1 schema/migrations and user-owned plan APIs. |
| Phase 4: Financial Tracker MVP | Not started | 0% | Add manual accounts, assets, liabilities, balances, and dashboard data. |
| Phase 5: Goals System | Not started | 0% | Add goal creation, progress tracking, target dates, and plan links. |
| Phase 6: Planning Workspace | Not started | 0% | Add plan versions, scenario history, and profile/account-connected FIRE inputs. |
| Phase 7: Imports and Automation | Not started | 0% | Add CSV imports, review flows, optional R2 storage, and optional queues. |
| Phase 8: Insights and Recommendations | Not started | 0% | Add plan health explanations, spending insights, and retirement risk guidance. |
| Phase 9: Hardening and Launch | Not started | 0% | Privacy/export/delete flows, accessibility, performance, monitoring, and launch readiness. |

## Phase 1 Completion Checklist

- [x] `/` is a public platform landing page.
- [x] FIRE calculator is no longer the whole front page.
- [x] FIRE calculator lives at `/calculators/fire`.
- [x] Target authenticated IA routes exist:
  - `/dashboard`
  - `/accounts`
  - `/transactions`
  - `/goals`
  - `/plans`
  - `/calculators`
  - `/reports`
  - `/settings`
- [x] Placeholder routes have distinct headings and content.
- [x] Top-level navigation labels map to distinct screens.
- [x] Calculator has one planning-question mode control.
- [x] Duplicate hero links and duplicate mode cards were removed.
- [x] Core FIRE inputs and `Calculate` are visible in the first viewport on desktop and mobile QA sizes.
- [x] Advanced FIRE assumptions are hidden behind progressive disclosure.
- [x] Existing FIRE engine in `src/lib/fire.ts` remains intact.
- [x] Current test suite passes before push.
- [x] Cloudflare Pages preview deploy succeeds.

## Phase 2 Entry Criteria

- Phase 1 merged or accepted as the product shell baseline.
- Auth provider decision made or explicitly scoped as the first Phase 2 task.
- Clerk selected for fastest robust consumer auth on the current Vite SPA + Cloudflare Pages/Functions stack.
- Confirm persistence direction:
  - D1 for relational user/profile/account/goal/plan data.
  - Pages Functions or Workers for API routes.

## Phase 2 Progress Checklist

- [x] Researched Clerk, Auth0, and Better Auth against current official docs.
- [x] Selected Clerk for the current Cloudflare Pages/Functions implementation.
- [x] Added `@clerk/react` browser auth boundary.
- [x] Added sign-up, sign-in, sign-out, signed-in profile basics, and signed-in shell state.
- [x] Kept `/` and `/calculators/fire` unauthenticated.
- [x] Gated `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/reports`, and `/settings`.
- [x] Added Clerk-backed Pages Function `GET /api/me` for session validation and basic identity.
- [x] Added `.env.example` and `.dev.vars.example`.
- [x] Confirmed earlier deployed `/api/me` returned `503 {"authConfigured":false}` while credentials were absent.
- [x] Did not add D1 persistence.
- [x] Link Clerk development app and pull local env.
- [x] Configure Cloudflare Pages preview secrets for Clerk development keys.
- [x] Redeploy with real `VITE_CLERK_PUBLISHABLE_KEY` build env.
- [ ] Verify real sign up, sign in, sign out, signed-in route access, and authenticated `/api/me`.
- [ ] Create/configure Clerk production instance for an owned launch domain.

## Required Clerk Configuration

- Browser build env: `VITE_CLERK_PUBLISHABLE_KEY`.
- Pages Functions env/secrets: `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
- Optional but recommended: `CLERK_AUTHORIZED_PARTIES`, comma-separated origins for local Pages dev and deployed Pages/custom domains.
- Current Clerk app: `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`).
- Current Clerk development instance: `ins_3EzmNoRe49U12NtPgfiqgXHKsgh`.
- Local ignored env files are present: `.env.local` and `.dev.vars`.
- Cloudflare Pages preview secrets now include `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`.
- Cloudflare Pages production secrets are intentionally empty until Clerk production keys exist.
- `clerk doctor --spotlight` reports the production instance is not configured.
- `clerk deploy status` reports production deployment is `not_started` and requires `clerk deploy` with human/domain setup.

## Open Decisions

- Auth provider: Clerk selected for Phase 2.
- Production auth domain for Clerk deployment.
- Whether to keep Vite SPA or move to a framework with richer routing/loaders.
- Whether Pages Functions are enough for API needs or if a separate Worker should own API routes.
- D1 schema and migration strategy.
- How much sensitive financial data to store in the first MVP.
- Data export and deletion policy.
- Whether legacy Flask parity tests remain long term.

## Required Verification Before Push

Run:

```bash
./scripts/test_all.sh
```

For frontend-only iterations, at minimum:

```bash
npm run typecheck
npm test
npm run build
```

For significant UI changes:

- Browser-test desktop at `1280x720`.
- Browser-test mobile at `390x844`.
- Confirm no horizontal overflow.
- Confirm no overlapping text.
- Confirm primary action is visible in the first viewport.
- Confirm navigation labels map to distinct screens.
