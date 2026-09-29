# Cloudflare Pages deployment

FinPath builds the React/TypeScript application into `dist/`. Legacy Flask code and its static demo have been retired; do not use old Python deployment instructions.

## Release authority

Project: `interactive-fire-calculator`. Production branch: `main`. Read the [current resume](execution/RESUME.md) and [release review](execution/reviews/RELEASE-2026-09-29.md) for verified SHAs and URLs. The default `interactive-fire-calculator.pages.dev` URL is the production deployment, not the latest authenticated preview.

Production auto-deploy was verified disabled at the last release review. It must remain disabled until the owned-domain/production-Clerk [auth preflight](PRODUCTION_AUTH_RUNBOOK.md) passes. An idle Cloudflare deployment record does not mean the new code shipped.

## Local verification

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
./scripts/test_all.sh
```

The application suite requires Node 22+ and does not require Python. Use `npm run cf:dev` for local Pages emulation. Vite build configuration, prerendering, `public/_redirects`, Pages Functions and `wrangler.toml` define the deployed route behavior.

## Hosted previews and production

A hosted authenticated preview must use the private ignored preview environment file and the reviewed build/deploy procedure in [FREE_TIER_EXECUTION.md](execution/FREE_TIER_EXECUTION.md) and [BETA_RELEASE_PROTOCOL.md](execution/BETA_RELEASE_PROTOCOL.md). Verify effective deployment bindings target `finpath-preview`; a local `preview_database_id` alone is not proof. Avoid publishing local fixtures or development auth bypasses.

Production publication uses `npm run cf:deploy:production` from main only after the [production runbook](PRODUCTION_AUTH_RUNBOOK.md) gates pass. The production D1 migration authorization is conditional on that gate and a captured restore bookmark. Keep preview and production retention Worker bindings separate.
