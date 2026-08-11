# Production Authentication Runbook

Last updated: July 12, 2026

## Current Blocker

The FinPath code integration is ready, but Clerk production is not active. The Clerk application has only a development instance, and the Cloudflare Pages project currently has only `interactive-fire-calculator.pages.dev`. Clerk production requires a domain you own and DNS access. A `pages.dev` hostname is not an eligible substitute.

Do not place `pk_live_` or `sk_live_` values in committed files, terminal history, issue comments, or chat.

## 1. Choose The Production Origin

Choose the exact HTTPS origin users will visit, such as:

```text
https://app.example.com
```

The domain must be owned by the product owner. A subdomain is preferable because it leaves the root domain available for other uses.

## 2. Attach The Domain To Cloudflare Pages

In Cloudflare:

1. Open Workers & Pages.
2. Select `interactive-fire-calculator`.
3. Open Custom domains and choose Set up a domain.
4. Enter the selected production hostname.
5. Wait until the domain and certificate are active.

For a subdomain outside a Cloudflare-managed zone, create the required CNAME to `interactive-fire-calculator.pages.dev` only after associating the domain in the Pages dashboard. For an apex domain, the zone and nameservers must be managed by the same Cloudflare account.

## 3. Create The Clerk Production Instance

From the repository in a human terminal:

```bash
clerk deploy
```

Use the same production hostname attached to Pages. Clone the development settings unless there is a deliberate reason to start from Clerk defaults.

The CLI will print the required Clerk DNS records. Add them at the DNS provider. When DNS is managed by Cloudflare, Clerk records used for Frontend API and verification must be DNS only rather than reverse proxied.

If social sign-in is enabled, provide production OAuth credentials and register the exact redirect URLs shown by Clerk. Development shared OAuth credentials cannot be used in production.

Resume the wizard after DNS or OAuth changes and verify:

```bash
clerk deploy status
```

Do not continue until the status reports a complete production instance and no pending DNS or OAuth work.

## 4. Configure The Frontend Build

Create the ignored production Vite environment file:

```bash
cp .env.production.example .env.production.local
```

Set only:

```dotenv
VITE_CLERK_PUBLISHABLE_KEY=pk_live_...
FINPATH_PRODUCTION_ORIGIN=https://app.example.com
```

The publishable key is intentionally embedded into the browser bundle. Never place `CLERK_SECRET_KEY` in a `VITE_` variable.

## 5. Configure Cloudflare Pages Function Secrets

Set these interactively so values do not enter shell history:

```bash
npx wrangler pages secret put CLERK_PUBLISHABLE_KEY --project-name interactive-fire-calculator
npx wrangler pages secret put CLERK_SECRET_KEY --project-name interactive-fire-calculator
npx wrangler pages secret put CLERK_AUTHORIZED_PARTIES --project-name interactive-fire-calculator
```

Values:

- `CLERK_PUBLISHABLE_KEY`: the same `pk_live_` key used by Vite.
- `CLERK_SECRET_KEY`: the production `sk_live_` key.
- `CLERK_AUTHORIZED_PARTIES`: the exact production origin, for example `https://app.example.com`.

`CLERK_JWT_KEY` may replace `CLERK_SECRET_KEY` only after its rotation and verification process is documented. Do not configure both without a reason.

## 6. Run The Fail-Closed Preflight

```bash
npm run auth:preflight
```

The command verifies:

- A `pk_live_` frontend key is available.
- The production origin is HTTPS, owned, and not `pages.dev` or localhost.
- Clerk reports a complete production instance.
- Required Cloudflare Pages secret names exist.

No key values are printed.

## 7. Merge Before Production Deployment

The Cloudflare Pages production branch is `main`. This feature branch creates preview deployments only. Merge the reviewed branch first, switch to `main`, and pull the merge commit.

The production deployment script refuses to publish from another branch unless `FINPATH_ALLOW_PRODUCTION_FROM_BRANCH=1` is deliberately set.

## 8. Deploy The Verified Production Bundle

From `main`:

```bash
npm run cf:deploy:production
```

This command:

1. Runs the production-auth preflight.
2. Runs `./scripts/test_all.sh`.
3. Builds with `.env.production.local`.
4. Rejects a bundle containing the configured development key or missing the exact configured live key.
5. Deploys explicitly to the Cloudflare Pages production branch.

## 9. Hosted Verification

Run the public and signed-out checks:

```bash
node scripts/check_production_auth.mjs \
  --env-file .env.production.local \
  --check-cloudflare \
  --dist dist \
  --site https://app.example.com
```

Then verify in a real browser:

1. Create a disposable production test user.
2. Sign out and sign back in.
3. Confirm `/api/me` returns that identity only with a valid session.
4. Open Dashboard, Accounts, Transactions, Goals, Plans, Reports, and Settings.
5. Save a calculator result and confirm history plus the intended goal, account, plan, or transaction follow-up.
6. Export account data.
7. Delete the disposable user data and remove the test Clerk user.
8. Confirm public `/`, `/calculators`, all calculator routes, and `/calculators/fire` still work signed out.

## Completion Rule

Phase 2 reaches 100% only after all of these are true:

- Owned domain attached and active on Cloudflare Pages.
- Clerk production instance complete.
- Production DNS and OAuth requirements complete.
- Live keys configured without development-key leakage.
- Hosted sign-up, sign-in, sign-out, API identity, route gates, calculator saves, and downstream follow-ups verified.
- Disposable test data removed.
