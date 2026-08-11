# Cloudflare Pages Deployment

## Target

Production deploy target: Cloudflare Pages project `interactive-fire-calculator`.

The production app is the TypeScript/Vite build in `dist/`. The Flask app is legacy reference code and should not be deployed to Pages.

## Current Project

The Cloudflare Pages project has been created.

- Project: `interactive-fire-calculator`
- Pages domain: `https://interactive-fire-calculator.pages.dev`
- Current deployment URL: `https://025c08aa.interactive-fire-calculator.pages.dev`
- Current branch alias: `https://codex-cloudflare-pages-theme.interactive-fire-calculator.pages.dev`
- Health endpoint: `https://025c08aa.interactive-fire-calculator.pages.dev/api/health`

Production auto-deploy is disabled while the TypeScript rewrite is in draft PR review, so the current `main` branch does not deploy the legacy Flask app by accident.

## Local Commands

```bash
./scripts/bootstrap_node.sh
./scripts/run_local.sh
./scripts/test_all.sh
./scripts/deploy_cloudflare_pages.sh
```

Use `APP_TARGET=legacy ./scripts/run_local.sh` to run the Flask app on port `5001`.

## Cloudflare Notes

- Build command: `npm run build`
- Build output directory: `dist`
- Preview command: `npm run cf:dev`
- Deploy command: `npm run cf:deploy`
- Pages config: `wrangler.toml`
- SPA routing: `public/_redirects`
- Health function: `/api/health`

The connected Cloudflare account was checked on June 6, 2026. The project `interactive-fire-calculator` was created and deployed from the `codex/cloudflare-pages-theme-plan` branch.
