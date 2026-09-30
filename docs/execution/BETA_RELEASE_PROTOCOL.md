# Stable beta release protocol — verified 2026-09-30

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) is updated by controlled preview promotion at accepted checkpoints. Current immutable deployment: https://9cb7d11d.interactive-fire-calculator.pages.dev, deployment `9cb7d11d-7f8a-49f1-9e21-0d9465ce8ffb`, clean commit `e941093aaa71c3ed2de1aaa221b3342ae8da547a`. Its product is byte-equivalent to accepted C17 source `9f3789b` (only review documents differ). [Provider mapping and bundle hashes](evidence/C17/beta-release.json), [C17 review](reviews/C17.md).

Provider metadata confirms the branch alias maps to this deployment and Functions bind only isolated preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`. All 16 runtime JS/CSS files served from the alias match the local authenticated candidate build by SHA-256. This supersedes the old filename-only parity inference. All 84 public HTTP routes, health 200, anonymous protected APIs 401 and actual beta result navigation were verified. C17's fuller interactive scope is 66 desktop/mobile/light/dark cases; not every calculator workflow or authenticated lifecycle was rerun for unchanged server code.

## Promotion discipline

A [Pages branch alias](https://developers.cloudflare.com/pages/configuration/preview-deployments/) always tracks its latest preview. It is technically a rolling alias, not an enforced accepted-only gate. Astra now promotes accepted artifacts to the existing `codex/finpath-quality-execution` label; active implementation uses other branches. Avoid deploying unreviewed work to that label. No Git reset, force push, DNS change or Git mutation of the historical execution branch is needed to update the beta URL.

1. Accept the candidate and verify exact-code CI. Resolve the full SHA from Git; do not manually reconstruct it.
2. Check live project metadata: only isolated preview DB, production branch `main`, automatic production deployments disabled. Fail closed on a mismatch.
3. Build with `npm run build:preview-auth`, consuming the ignored development environment only through that script. Verify a clean Git tree and equivalence to the accepted product. Plain build is not an authenticated preview substitute.
4. Publish the verified artifact with `wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution --commit-hash <resolved-full-sha> --commit-dirty=false`.
5. Verify actual effective deployed binding, commit, success stage, alias mapping, bundle contents, health/auth boundaries and changed journey; record the immutable URL. A successful CLI exit alone is insufficient. One earlier mistyped-SHA upload was replaced in this promotion; the accepted mapping above uses the Git-resolved SHA.

No automatic checkpoint promotion has been configured. Repository code/CI can advance independently of this shareable beta. The owner has authorized free preview updates; production remains separately gated.

## Recovery and beta data

To roll back, rebuild a previously accepted compatible source with the authenticated preview script, verify schema compatibility and isolated bindings, then redeploy to the same branch label. Do not assume an unverified provider preview-rollback command works. Retain the immutable evidence URL for each release. C17 introduced no schema change; the earlier C16 source is the compatible UI rollback candidate, while the C15 HYSA migration decision still governs historical snapshots.

Testers should use sample data. Beta records may be reset; this environment does not promise permanent storage. Do not share real financial records with agents or evidence collectors. Production remains on old `3399dbb`; automatic production deployments are disabled and the last production-auth preflight is 0/6. An owned domain and completed production Clerk setup remain required before production publication.
