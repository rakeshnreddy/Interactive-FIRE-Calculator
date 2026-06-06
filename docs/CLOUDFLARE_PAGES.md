# Cloudflare Pages Deployment

## Target

Production deploy target: Cloudflare Pages project `interactive-fire-calculator`.

The production app is the TypeScript/Vite build in `dist/`. The Flask app is legacy reference code and should not be deployed to Pages.

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

The connected Cloudflare account was checked on June 6, 2026. It had existing Pages projects named `ipl-playoff-pulse` and `spy-options-analyzer-web`, but no `interactive-fire-calculator` project yet.
