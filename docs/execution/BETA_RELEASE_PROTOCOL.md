# Stable beta release protocol — verified 2026-10-04 (C29)

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) is updated by controlled preview promotion at accepted checkpoints. Current immutable deployment: https://d5ce67a4.interactive-fire-calculator.pages.dev, deployment `d5ce67a4-5461-429a-a23a-93aa1e93cedc`, clean commit `11ea34ee9365676bebdcc3c301f7c922022f8389`. Product equals accepted C29 source `698ce790a18ae016564264c074689ed304370c30` (review documents differ). [Provider/asset hashes](evidence/C29/beta-release.json), [beta journey](evidence/C29/beta-journey.json), [C29 review](reviews/C29.md). Previous verified beta: C28 `b91c11d7` / `5582715d87c9e3e3ef68054aac1ed256bd463222` ([record](evidence/C28/beta-release.json)).

Only isolated preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`; 16 actual runtime asset hashes match the build and the verified C29 candidate on both the immutable URL and the beta alias. An alias check made immediately after deploy can still see the previous deployment; re-check until it matches and record only the matching check. Health200/protected401, all84 calculator HTTP routes and the actual 1.5-year lump-sum keyboard journey pass. No hosted financial-data write in C29. Native reader/zoom and B51 actual-user evidence remain deferred.

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
