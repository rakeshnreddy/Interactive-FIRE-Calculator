# Stable beta release protocol — verified 2026-10-27 (C30R/B77)

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) is updated by controlled preview promotion at verified checkpoints. Current immutable deployment: https://10ca2f8d.interactive-fire-calculator.pages.dev, deployment `10ca2f8d-71e3-4424-b616-31fcbff63448`, clean source `34e077caca1562c600cafa51ceeb3487fb610e11`. Product equals accepted C30R/B77 source `7d0f1782b03f9f49de3491eaac1be2067c9222e2` (documentation-only delta). [Provider/asset/routes](evidence/C30R/beta-release.json), [beta browser](evidence/C30R/beta-browser-checks.json), [review](reviews/C30R.md). Previous verified beta: C29 `d5ce67a4` / `11ea34ee9365676bebdcc3c301f7c922022f8389` ([record](evidence/C29/beta-release.json)).

Only isolated preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`; all 16 runtime JS/CSS hashes match the tested candidate at both immutable and alias URLs. Health 200/protected 401, all 84 routes on both URLs and six signed-out light/dark 1440/390/320 browser cases pass. No hosted financial-data write occurred. Native reader/zoom and B51 actual-user evidence remain deferred. Publication does not open production gates.

## Promotion discipline

A [Pages branch alias](https://developers.cloudflare.com/pages/configuration/preview-deployments/) always tracks its latest preview. It is technically a rolling alias, not an enforced accepted-only gate. Astra now promotes accepted artifacts to the existing `codex/finpath-quality-execution` label; active implementation uses other branches. Avoid deploying unreviewed work to that label. No Git reset, force push, DNS change or Git mutation of the historical execution branch is needed to update the beta URL.

1. Accept the candidate and verify exact-code CI. Resolve the full SHA from Git; do not manually reconstruct it.
2. Check live project metadata: only isolated preview DB, production branch `main`, automatic production deployments disabled. Fail closed on a mismatch.
3. Build with `npm run build:preview-auth`, consuming the ignored development environment only through that script. Verify a clean Git tree and equivalence to the accepted product. Plain build is not an authenticated preview substitute.
4. Publish the verified artifact with `wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution --commit-hash <resolved-full-sha> --commit-dirty=false`.
5. Verify actual effective deployed binding, commit, success stage, alias mapping, bundle contents, health/auth boundaries and changed journey; record the immutable URL. A successful CLI exit alone is insufficient. One earlier mistyped-SHA upload was replaced in this promotion; the accepted mapping above uses the Git-resolved SHA.

No automatic checkpoint promotion has been configured. Repository code/CI can advance independently of this shareable beta. The owner has authorized free preview updates; production remains separately gated.

## Recovery and beta data

To roll back, rebuild a previously accepted compatible source with the authenticated preview script, verify schema compatibility and isolated bindings, then redeploy to the same branch label. Do not assume an unverified provider preview-rollback command works. Retain the immutable evidence URL for each release and housing-budget-v1 read support after C23. After C30, rollback must also retain savings-goal-monthly-v1 and retirement-exact-term-v1 readers and their calculator-slug mappings; old readers reject these new snapshots. C19–C23 introduce versioned JSON interpretations, including an actual-date input envelope. Do not blindly redeploy C17 or older readers that cannot understand those snapshots. Prefer reverting the new route behavior while retaining new version/input-envelope read and export support; no schema purge or historical backfill. C15 HYSA and C19–C23 migration decisions govern snapshot interpretation.

Testers should use sample data. Beta records may be reset; this environment does not promise permanent storage. Do not share real financial records with agents or evidence collectors. Production remains on old `3399dbb`; automatic production deployments are disabled and the last production-auth preflight is 0/6. An owned domain and completed production Clerk setup remain required before production publication.
