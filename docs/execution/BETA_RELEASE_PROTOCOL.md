# Stable beta release protocol — verified 2026-10-01

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) is updated by controlled preview promotion at accepted checkpoints. Current immutable deployment: https://463dcb01.interactive-fire-calculator.pages.dev, deployment `463dcb01-f9f5-466e-baff-505d24897107`, clean commit `f943a5ade74910ab9ec3a79a4efdabcbe7f96334`. Product equals accepted C22 source `2a2f3efc49a4282be1e8a6258e05a95b1d771fa9` (review documents differ). [Provider/asset hashes](evidence/C22/beta-release.json), [beta journey](evidence/C22/beta-journey.json), [C22 review](reviews/C22.md).

Only isolated preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`; 16 actual runtime asset hashes match. Health 200, anonymous protected APIs 401, all 84 calculator HTTP routes and the method-guidance → empty dated journey pass. C22 performed no hosted financial-data write or authenticated save/download rerun. Native reader/zoom and actual-user B51 remain deferred. The immediate asset read was not a PASS; full verification passed after the observed deployment transition without another upload. Allow navigation/asset readiness before recording results; no unsupported root-cause claim.

## Promotion discipline

A [Pages branch alias](https://developers.cloudflare.com/pages/configuration/preview-deployments/) always tracks its latest preview. It is technically a rolling alias, not an enforced accepted-only gate. Astra now promotes accepted artifacts to the existing `codex/finpath-quality-execution` label; active implementation uses other branches. Avoid deploying unreviewed work to that label. No Git reset, force push, DNS change or Git mutation of the historical execution branch is needed to update the beta URL.

1. Accept the candidate and verify exact-code CI. Resolve the full SHA from Git; do not manually reconstruct it.
2. Check live project metadata: only isolated preview DB, production branch `main`, automatic production deployments disabled. Fail closed on a mismatch.
3. Build with `npm run build:preview-auth`, consuming the ignored development environment only through that script. Verify a clean Git tree and equivalence to the accepted product. Plain build is not an authenticated preview substitute.
4. Publish the verified artifact with `wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution --commit-hash <resolved-full-sha> --commit-dirty=false`.
5. Verify actual effective deployed binding, commit, success stage, alias mapping, bundle contents, health/auth boundaries and changed journey; record the immutable URL. A successful CLI exit alone is insufficient. One earlier mistyped-SHA upload was replaced in this promotion; the accepted mapping above uses the Git-resolved SHA.

No automatic checkpoint promotion has been configured. Repository code/CI can advance independently of this shareable beta. The owner has authorized free preview updates; production remains separately gated.

## Recovery and beta data

To roll back, rebuild a previously accepted compatible source with the authenticated preview script, verify schema compatibility and isolated bindings, then redeploy to the same branch label. Do not assume an unverified provider preview-rollback command works. Retain the immutable evidence URL for each release. C19–C21 introduce versioned JSON interpretations, including an actual-date input envelope. Do not blindly redeploy C17 or older readers that cannot understand those snapshots. Prefer reverting the new route behavior while retaining new version/input-envelope read and export support; no schema purge or historical backfill. C15 HYSA and C19–C21 migration decisions govern snapshot interpretation.

Testers should use sample data. Beta records may be reset; this environment does not promise permanent storage. Do not share real financial records with agents or evidence collectors. Production remains on old `3399dbb`; automatic production deployments are disabled and the last production-auth preflight is 0/6. An owned domain and completed production Clerk setup remain required before production publication.
