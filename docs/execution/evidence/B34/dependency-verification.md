# B34 dependency verification

Evidence date: 2026-09-08. Code candidate: `b48ac00328f356746bd501921562e727feb7a8e5`. Baseline: `4a6f54a4bfc750b4b86faf0c23bdfc48705caf8b`.

## Baseline reproduction

On the baseline lockfile, `npm audit --json` exited nonzero with five development-tool findings: two moderate and three high. The affected paths were:

- `vitest@4.1.8 -> @vitest/mocker@4.1.8` for [GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9).
- `wrangler@4.129.0 -> miniflare@5.20260903.0-alpha -> sharp@0.35.2` for [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c).

The failing hosted baseline was [workflow run 34300491728](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34300491728): tests and build passed, then the audit gate failed. The installed repository `node_modules` was a symlink to a shared cache, so all clean-install proof below came from the isolated checkout `/tmp/finpath-b34.7zGMfU` rather than deleting or mutating that cache.

## Advisory and compatibility decision

The official GitHub advisories were rechecked on 2026-09-08. The Vitest advisory identifies 4.1.11 as patched; the sharp advisory identifies 0.35.4 as patched. The selected direct tools remain supported same-major updates:

- Vitest `^4.1.8` -> `^4.1.11`, resolving `@vitest/mocker` to 4.1.11.
- Wrangler `^4.129.0` -> `^4.130.0`, its current supported release, resolving Miniflare to `5.20260908.0-alpha`.

Wrangler 4.130.0's Miniflare release still declared sharp 0.35.2, so a direct-tool update alone could not cross sharp's fixed threshold. `package.json` therefore pins a single global `overrides.sharp` edge to 0.35.4. This is a patch-only override on Miniflare's sole sharp dependency, not the audit command's unsafe suggestion to downgrade Wrangler to 4.15.2. Compatibility was checked with a clean npm 10 install, the entire repository suite and build, a real Sharp PNG transformation, Wrangler compilation, Wrangler local runtime, and hosted CI.

Authoritative release references:

- [Vitest 4.1.11 release](https://github.com/vitest-dev/vitest/releases/tag/v4.1.11)
- [Wrangler 4.130.0 release](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler%404.130.0)
- [sharp security policy and releases](https://github.com/lovell/sharp/security)

## Candidate results

All commands below exited 0 against the candidate manifest and lockfile.

| Check | Result | Durable output |
|---|---|---|
| `npx --yes npm@10.9.4 ci --no-audit --no-fund` in an empty isolated dependency tree | 184 packages installed | [`clean-install.txt`](clean-install.txt) |
| `npm audit --json` | 0 findings at every severity; 265 dependencies | [`npm-audit.json`](npm-audit.json) |
| `npm ls vitest @vitest/mocker wrangler miniflare sharp` | Vitest/mocker 4.1.11; Wrangler 4.130.0; Miniflare 5.20260908.0-alpha; overridden sharp 0.35.4 | [`dependency-tree.txt`](dependency-tree.txt) |
| `npm explain vitest @vitest/mocker wrangler miniflare sharp` | All paths are development dependencies and resolve from the declared tools/override | [`dependency-explain.txt`](dependency-explain.txt) |
| Sharp one-pixel PNG creation | `sharp 0.35.4 png-bytes=91` | [`sharp-smoke.txt`](sharp-smoke.txt) |
| `./scripts/test_all.sh` after the clean install | 13 runner tests, 79 Python tests + 21 subtests, 1,269 Vitest tests / 26 files, typecheck and production build pass | [`full-suite.txt`](full-suite.txt) |
| `wrangler pages functions build functions --outdir /tmp/finpath-b34-functions-final --project-directory . --compatibility-date=2026-06-06` | Wrangler 4.130.0 compiled the Worker without secrets | [`wrangler-build.txt`](wrangler-build.txt) |
| `npm run smoke:calculators -- http://127.0.0.1:8795` against loopback-only `wrangler pages dev` | 84 public routes pass | [`public-smoke.txt`](public-smoke.txt) |
| Hosted GitHub Actions on the exact code SHA | All steps, including clean `npm ci`, full suite/build, and `npm audit`, pass | [run 34315086331](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34315086331) / [job 102349511778](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34315086331/job/102349511778) |

The build remains at the baseline bundle sizes (entry JS 512.10 kB / 140.36 kB gzip; calculator library 313.23 / 83.55; projection chart 347.89 / 102.40; CSS 157.13 / 26.46). The existing entry-chunk warning remains; B34 did not change application code.

## Exposure assessment

The findings are in development dependencies, not browser or Pages production dependencies. The Vitest flaw concerns its development server/browser-mode control surface; this repository's development script is explicitly loopback-bound and no such server was published. The sharp path is used by Miniflare/Wrangler developer tooling; FinPath application code does not import sharp or expose an image-upload path. That means no production exploit was demonstrated, but the vulnerable packages still presented avoidable risk to developer/CI machines and correctly failed the repository audit gate.

The local Wrangler check bound only to `127.0.0.1`, used local D1 persistence, supplied no secrets, performed only GET requests, and was stopped after verification. `/api/health` returned 200; `/api/me` returned the expected fail-closed 503 without auth configuration. No hosted preview, backend publication, database write, production configuration, real identity, or financial record was used. The task-specific pre-B33 exception permits this local/CI evidence and defers a manual preview until isolation is established.

## Limits and rollback

The local Wrangler server repeated a pre-existing warning that the generated `dist/_redirects` SPA fallback is ignored as an infinite loop; route smoke still passed. GitHub also emitted its existing runner-maintenance annotation about pinned actions moving from Node 20 to Node 24. Neither is caused by the dependency repair.

Rollback is `git revert b48ac00328f356746bd501921562e727feb7a8e5` only after a supported replacement is ready. Do not resume the known-vulnerable Vitest or Wrangler/Miniflare development-server paths after a revert; disable those tools until a patched graph is restored.
