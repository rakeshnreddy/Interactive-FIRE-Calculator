# Project Memory

Last updated: June 11, 2026

## Repository

- Path: `/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator`
- Branch: `codex/cloudflare-pages-theme-plan`
- Remote branch: `origin/codex/cloudflare-pages-theme-plan`
- Draft PR: `https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/137`
- Cloudflare Pages project: `interactive-fire-calculator`
- Branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Latest known preview: `https://fb92f0fd.interactive-fire-calculator.pages.dev`

## Product Direction

The product is no longer a standalone FIRE calculator. It is becoming a comprehensive personal financial tracker and planner where users can eventually create accounts, store financial data, track goals, save plans, and revisit progress over time.

FIRE remains important, but it is now the first calculator/planning module inside the broader platform.

## Current Architecture

- React + TypeScript + Vite app in `src/`.
- Clerk is selected for consumer auth. The browser auth boundary lives in `src/auth.tsx`.
- FIRE engine in `src/lib/fire.ts`.
- FIRE tests in `src/lib/fire.test.ts`.
- Cloudflare Pages Function health endpoint in `functions/api/health.ts`.
- Clerk-backed Pages Function identity endpoint in `functions/api/me.ts`.
- SPA routing supported by `public/_redirects`.
- Legacy Flask/Jinja app remains in `app.py`, `project/`, `templates/`, and `static/` for reference/parity only.

## Completed Work

Phase 1 Product Shell and IA is complete:

- `/` public financial platform landing page.
- `/calculators/fire` dedicated FIRE calculator module.
- `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/calculators`, `/reports`, and `/settings` app shell routes.
- Compact FIRE calculator with one planning-question control.
- Advanced FIRE assumptions behind progressive disclosure.
- Results and compare views appear after calculation.
- Browser QA performed on desktop and mobile.

Phase 2 provider-ready auth shell is implemented, but production auth is not complete because Clerk credentials are not configured:

- Clerk was chosen over Auth0 and Better Auth for the current Vite SPA + Cloudflare Pages/Functions shape.
- `@clerk/react` wraps the app when `VITE_CLERK_PUBLISHABLE_KEY` is present.
- Landing and topbar actions use real Clerk sign-up/sign-in/sign-out controls when configured.
- Authenticated app routes are gated when signed out or when auth env is missing.
- `/calculators/fire` remains public and unauthenticated.
- Signed-in profile display is limited to Clerk identity fields only.
- `/api/me` validates Clerk sessions in Pages Functions and returns only basic identity.
- FIRE plan saves remain browser-local; no D1 persistence was added.
- `npm run cf:deploy` deployed the gated auth-ready state to `https://fb92f0fd.interactive-fire-calculator.pages.dev`.
- Verification passed with `./scripts/test_all.sh` and browser QA at `1280x720` and `390x844`.

## Next Phase

Finish Phase 2: Auth and User Accounts by configuring real Clerk credentials and validating an end-to-end sign-up/sign-in/sign-out flow on Cloudflare Pages.

Remaining Phase 2 work:

1. Create/configure a Clerk application.
2. Add build/client env `VITE_CLERK_PUBLISHABLE_KEY`.
3. Add Pages Function env/secrets `CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
4. Add `CLERK_AUTHORIZED_PARTIES` for local Pages dev and deployed Pages origins.
5. Redeploy after env is present.
6. Verify real sign up, sign in, sign out, signed-in route access, and `/api/me`.
7. Do not add D1 plan persistence until this identity flow is stable.

## Working Rules

- Do not deploy Flask to Cloudflare Pages.
- Do not rewrite the FIRE engine unless the task is explicitly about calculation behavior.
- Preserve legacy Flask tests unless the user explicitly asks to remove the legacy reference app.
- Use `apply_patch` for manual edits.
- Run `./scripts/test_all.sh` before pushing.
- Deploy with `npm run cf:deploy` when ready.
- If context is getting tight, update this file and `docs/FINANCIAL_PLATFORM_TRACKER.md`, push all changes, deploy if app behavior changed, and provide the handoff prompt below.

## Useful Commands

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
./scripts/test_all.sh
npm run typecheck
npm test
npm run build
npm run cf:deploy
```

## Handoff Prompt

Use this prompt to start a new session:

```text
We are working in this repo:

/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator

Branch:
codex/cloudflare-pages-theme-plan

Remote:
origin/codex/cloudflare-pages-theme-plan

First read:
docs/PROJECT_MEMORY.md
docs/FINANCIAL_PLATFORM_TRACKER.md
docs/FINANCIAL_PLATFORM_HANDOFF.md

Product context:
The product has pivoted from a standalone FIRE calculator to a comprehensive personal financial tracker and planner. FIRE is now only the first calculator module inside the broader platform.

Current status:
Phase 1 Product Shell and IA is complete. Phase 2 has a Clerk provider-ready auth shell, route gates, signed-in shell state, and /api/me identity validation, but real production auth is blocked until Clerk credentials are configured in Cloudflare Pages and the Vite build env.

Next goal:
Finish Phase 2 by configuring Clerk credentials and verifying a real hosted sign-up/sign-in/sign-out flow.

Do not deploy Flask to Cloudflare Pages. Keep the FIRE engine in src/lib/fire.ts intact unless calculation behavior is explicitly in scope. Run ./scripts/test_all.sh before pushing. Deploy with npm run cf:deploy when ready.
```

## Detailed Phase 2 Handoff Prompt

Use this more detailed prompt when starting the coding session that should complete Phase 2:

```text
We are working in this repo:

/Users/bhuvan/Documents/Rakesh/firecalculator/Interactive-FIRE-Calculator

Branch:
codex/cloudflare-pages-theme-plan

Remote:
origin/codex/cloudflare-pages-theme-plan

First read:
docs/PROJECT_MEMORY.md
docs/FINANCIAL_PLATFORM_TRACKER.md
docs/FINANCIAL_PLATFORM_HANDOFF.md

Current state:
Phase 1 Product Shell and IA is complete and pushed. Phase 2 selected Clerk and implemented a provider-ready auth shell, route gates, signed-in profile basics, and a Clerk-backed `/api/me` Pages Function. Real production auth is not complete because Clerk credentials are missing from Cloudflare Pages and local build env. The public landing page is `/`. The dedicated FIRE calculator route is `/calculators/fire` and remains unauthenticated. Placeholder app-shell routes exist for `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/calculators`, `/reports`, and `/settings`; account routes show an auth/configuration gate when signed out or unconfigured. The FIRE engine in `src/lib/fire.ts` is intact and should not be changed unless calculation behavior is explicitly in scope. The legacy Flask/Jinja app remains reference-only and must not be deployed to Cloudflare Pages.

Latest known Cloudflare Pages preview:
https://fb92f0fd.interactive-fire-calculator.pages.dev

Branch alias:
https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev

Goal:
Finish Phase 2: Auth and User Accounts by configuring Clerk credentials and validating real hosted auth.

Phase 2 target:
- Choose an auth provider suitable for Cloudflare Pages/Functions.
- Add sign up, sign in, sign out, and signed-in shell state.
- Keep the unauthenticated FIRE calculator demo available.
- Protect authenticated app routes or clearly gate them with signed-out states.
- Add user profile basics only as far as auth identity allows.
- Do not add D1 plan persistence until auth and user identity are stable.

Important decision:
Clerk is the selected provider. Do not switch providers unless the product owner explicitly redirects. Avoid Cloudflare Access as primary consumer auth.

Required Clerk environment:
- Browser build env: `VITE_CLERK_PUBLISHABLE_KEY`.
- Pages Functions env/secrets: `CLERK_PUBLISHABLE_KEY` plus `CLERK_SECRET_KEY` or `CLERK_JWT_KEY`.
- Optional but recommended: `CLERK_AUTHORIZED_PARTIES` as comma-separated origins for local Pages dev and deployed Pages/custom domains.
- Examples live in `.env.example` and `.dev.vars.example`.

Use multi-agent parallelism:
1. Spawn one explorer to research current official auth docs for Clerk/Auth0/Better Auth on Cloudflare Pages or Workers and summarize tradeoffs.
2. Spawn one explorer to inspect the current repo and identify exact integration points in `src/App.tsx`, `functions/`, `wrangler.toml`, and env typing.
3. After provider choice, spawn workers only for disjoint write scopes, for example frontend auth shell vs Pages Function/API validation.
4. Do not let agents edit overlapping files without clear ownership.

Likely implementation scope:
- `src/App.tsx` or new `src` auth modules/components for signed-in state and route gating.
- `src/styles.css` for auth UI states if needed.
- `functions/` for auth callback/session/user endpoint only if the selected provider requires it.
- `wrangler.toml` and `.dev.vars.example` or docs for required environment variables.
- `docs/FINANCIAL_PLATFORM_TRACKER.md` and `docs/PROJECT_MEMORY.md` to update Phase 2 status.

Required verification before push:
./scripts/test_all.sh

For frontend-only iterations:
npm run typecheck
npm test
npm run build

For UI/auth flow changes:
- Run local dev server with `./scripts/run_local.sh`.
- Browser-test desktop at 1280x720 and mobile at 390x844.
- Confirm signed-out landing and FIRE demo work.
- Confirm app routes show correct signed-out/sign-in state.
- Confirm no horizontal overflow or overlapping text.

Deploy:
npm run cf:deploy

If blocked by missing provider credentials or product decisions:
- Do not fake a production auth implementation and call it complete.
- Implement a clean provider-ready auth boundary only if useful.
- Update `docs/FINANCIAL_PLATFORM_TRACKER.md` and `docs/PROJECT_MEMORY.md` with exact blockers, required env vars, and next steps.
- Push any useful documentation or preparatory code.
```
