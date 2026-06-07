# Financial Platform Tracker

Last updated: June 7, 2026

This tracker is the working source of truth for moving the product from a standalone FIRE calculator into a full personal financial tracker and planner.

## Current Status

- Branch: `codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://343e5503.interactive-fire-calculator.pages.dev`
- Current production target: React, TypeScript, Vite, Cloudflare Pages
- Legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

## Phase Progress

| Phase | Status | Completion | Notes |
| --- | --- | ---: | --- |
| Phase 1: Product Shell and IA | Complete | 100% | Public landing, app shell, target IA placeholders, FIRE module route, compact calculator UX, and progressive disclosure are in place. |
| Phase 2: Auth and User Accounts | Not started | 0% | Select auth provider, add sign up/sign in/sign out, protect app routes, and create user profile basics. |
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
- Confirm whether to use:
  - Clerk or Auth0 for fastest robust consumer auth.
  - Better Auth for a more app-owned Cloudflare/D1-friendly path if research confirms fit.
- Confirm persistence direction:
  - D1 for relational user/profile/account/goal/plan data.
  - Pages Functions or Workers for API routes.

## Open Decisions

- Auth provider: Clerk, Auth0, Better Auth, or custom.
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
