# Stable beta release protocol —verified2026-10-28(C31/B70)

## Share one URL

[Bookmarkable beta](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) updates at verified checkpoints. Current immutable [9a8e7915](https://9a8e7915.interactive-fire-calculator.pages.dev), deployment9a8e7915-b568-46cf-8eb6-e85960fcd360, clean source `2aec033f905a5f906bf9958f843239aea2ecd676`. Same accepted candidate [09de7c48](https://09de7c48.interactive-fire-calculator.pages.dev), exact CI40759239554. [Receipt](evidence/C31/beta-release.json), [browser](evidence/C31/beta-browser.json), [auth shell](evidence/C31/beta-signed-shell.json), [calculator/CSV](evidence/C31/beta-calculator-preservation.json), [review](reviews/C31.md). Previous B68 beta602127ca/source25af47e remains historical compatible evidence in C30.

Only preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`;15runtime hashes and API200/401 boundaries plus84routes pass on immutable and alias. Alias136public/24preference and48calculator/CSV cases pass in both themes at1440/768/390/320(public matrix); immutable10signed-in/28anonymous-gate cases pass with synthetic cleanup. Paired candidate performance applies to identical beta runtime bytes. No native reader/zoom, field-performance, real-user or production gate is opened.

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
