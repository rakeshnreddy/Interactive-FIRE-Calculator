# Stable beta release protocol — verified 2026-10-03

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) is updated by controlled preview promotion at accepted checkpoints. Current immutable deployment: https://82ed082d.interactive-fire-calculator.pages.dev, deployment `82ed082d-fd60-4e30-94ba-3b1ef5d1426e`, clean commit `f4f96f74f0d0c32f6db79853bd4bb81b931b3d4a`. Product equals accepted C23 source `aab17a026bcda53ba25925377edb7cb4c205b3fd` (review documents differ). [Provider/asset hashes](evidence/C23/beta-release.json), [beta journey](evidence/C23/beta-journey.json), [C23 review](reviews/C23.md).

Only isolated preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`; 16 actual runtime asset hashes match. Health200/protected401, all84 calculator HTTP routes and the actual cost-inclusive affordability keyboard journey pass. No hosted financial-data write in C23. Native reader/zoom and B51 actual-user evidence remain deferred. One local precondition and one download-event attempt were not PASS; the documented clean hosted keyboard and actual file-content checks passed without pretending those earlier attempts passed.

## Promotion discipline

A [Pages branch alias](https://developers.cloudflare.com/pages/configuration/preview-deployments/) always tracks its latest preview. It is technically a rolling alias, not an enforced accepted-only gate. Astra now promotes accepted artifacts to the existing `codex/finpath-quality-execution` label; active implementation uses other branches. Avoid deploying unreviewed work to that label. No Git reset, force push, DNS change or Git mutation of the historical execution branch is needed to update the beta URL.

1. Accept the candidate and verify exact-code CI. Resolve the full SHA from Git; do not manually reconstruct it.
2. Check live project metadata: only isolated preview DB, production branch `main`, automatic production deployments disabled. Fail closed on a mismatch.
3. Build with `npm run build:preview-auth`, consuming the ignored development environment only through that script. Verify a clean Git tree and equivalence to the accepted product. Plain build is not an authenticated preview substitute.
4. Publish the verified artifact with `wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution --commit-hash <resolved-full-sha> --commit-dirty=false`.
5. Verify actual effective deployed binding, commit, success stage, alias mapping, bundle contents, health/auth boundaries and changed journey; record the immutable URL. A successful CLI exit alone is insufficient. One earlier mistyped-SHA upload was replaced in this promotion; the accepted mapping above uses the Git-resolved SHA.

No automatic checkpoint promotion has been configured. Repository code/CI can advance independently of this shareable beta. The owner has authorized free preview updates; production remains separately gated.

## Recovery and beta data

To roll back, rebuild a previously accepted compatible source with the authenticated preview script, verify schema compatibility and isolated bindings, then redeploy to the same branch label. Do not assume an unverified provider preview-rollback command works. Retain the immutable evidence URL for each release and housing-budget-v1 read support after C23. C19–C23 introduce versioned JSON interpretations, including an actual-date input envelope. Do not blindly redeploy C17 or older readers that cannot understand those snapshots. Prefer reverting the new route behavior while retaining new version/input-envelope read and export support; no schema purge or historical backfill. C15 HYSA and C19–C23 migration decisions govern snapshot interpretation.

Testers should use sample data. Beta records may be reset; this environment does not promise permanent storage. Do not share real financial records with agents or evidence collectors. Production remains on old `3399dbb`; automatic production deployments are disabled and the last production-auth preflight is 0/6. An owned domain and completed production Clerk setup remain required before production publication.
