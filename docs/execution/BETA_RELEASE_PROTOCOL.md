# Stable Beta Release Protocol

## 1. Stable Shareable URL & Current State
- **Bookmarkable Beta URL:** `https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`
- **Observed Candidate Parity:** HTML references matching first-party asset filenames (`/assets/main-Db8VaZlc.js`, `/assets/main-DUQkqalD.css`, `/assets/jsx-runtime-CdvZGgm7.js`), which match those observed on immutable preview `https://3b006fb1.interactive-fire-calculator.pages.dev`.
- **Inference Boundary:** Alignment with candidate `3b006fb1` is inferred from these matching asset references; bundle content hashes and Cloudflare deployment mappings were not verified, and this does not prove exact commit SHA live.

## 2. Rolling Beta Channel Nature
Per Cloudflare Pages docs ([Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/), updated June 3, 2026), a branch alias tracks the latest deployment of that working branch. 

- **Rolling Beta Link:** The alias is a rolling beta URL, **not** an accepted-only checkpoint release channel. Any new preview deployment published on this branch immediately advances the alias before review; procedural policy cannot prevent that Cloudflare behavior.
- **No Git Mutations:** No fast-forward, rebase, branch reset, or Git changes are needed to share or maintain the current alias.
- **Future Accepted Channel:** Delivering an "accepted-only" release channel would require a separately configured beta branch, alias, and isolated binding verification. That is currently neither implemented nor required to provide friends with one stable beta URL.

## 3. Future Deployment & Binding Prerequisites
No deployment is authorized now. For any future deployment:
1. **Authenticated Preview Build:** Builds must execute `npm run build:preview-auth`, consuming the ignored local environment strictly through that script. Plain `npm run build` is not an approved alternative for authenticated previews.
2. **Mandatory Binding Verification:**
   - **Pre-deployment:** Verify the intended binding targets the isolated `finpath-preview` D1 database (`0dbad68e-7493-452f-8504-98d4c61ee5da`), never production.
   - **Post-deployment:** Verify effective deployed bindings against the live deployment. Never assume preview defaults.
3. **Execution:** The existing B33 documented manual deployment command is permitted only behind these pre- and post-binding checks. No automatic checkpoint deployment has been configured.

## 4. Rollback Procedure
If an issue appears on the rolling beta URL:
1. Rebuild and redeploy a previously identified compatible preview candidate bundle to the branch.
2. Perform an explicit schema compatibility review before redeploying older candidates against current D1 state.
3. Do not rely on unverified Wrangler preview rollback commands.

## 5. Verification Status & Tester Guidance
- **Rendering & Auth Boundaries:** HTTP 200 on `/`, `/calculators/fire`, and `/dashboard` confirms SPA shell delivery only, not client-side UI rendering. Interactive browser execution remains pending. `/api/health` returned 200 and unauthenticated `/api/me` returned 401.
- **Tester Warning:** Warn testers to use sample financial data only. Beta D1 records are subject to resets, migrations, and test purges; long-term data retention is not promised.
- **Production Guard:** Production `main` and custom domain requirements remain completely isolated and intact.
