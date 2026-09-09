# FinPath current-state audit

> Update 2026-09-08: the zero-vulnerability result below is historical. CI 34300491728 now reports 5 findings (2 moderate,3 high) involving Vitest/mocker and sharp/miniflare/Wrangler; tests and build pass. See execution/prompts/B34.md and execution/PACKET_REVIEW.md. Dependency repair is the first released checkpoint.

Evidence date: 2026-09-07. Baseline: `e18c517927b75f325e0e8fe482c1877b1c36bf45` on `codex/dependency-security-refresh`. Checkout: `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. This audit distinguishes observed behavior, code findings, and hypotheses. Historical completion percentages are not launch criteria.

## Executive verdict

FinPath is a capable public calculation workbench with a substantial private-workspace implementation, but it is not yet a verified tracking service. Its best initial prospect is a self-directed, single-currency FIRE planner who already revisits a spreadsheet. The opportunity is a short monthly review connecting updated balances to an explicit decision and an immutable plan version. Adding calculator routes does not establish that habit.

The largest immediate obstacle is that neither the supplied preview nor the latest preview supports the browser sign-in journey. The largest product uncertainty is demand: no interviews, cohort data, paying-customer evidence, or observed repeat use was supplied. Scores below measure inspectable readiness, not market success.

## Reproducible baseline

| Check | Observed result |
|---|---|
| Working tree | Clean before this review; no existing changes discarded |
| Branch relation | Explicitly fetched `origin/main`; 0 commits behind, 2 ahead of `3399dbb` |
| Open PRs | #139 only; HEAD `e18c517`; Cloudflare Pages check succeeded; no test workflow in `.github/workflows/` |
| Merge enforcement | GitHub branch-protection endpoint: `Branch not protected`; repository rulesets: empty. No settings changed |
| Current deployment | `https://eaa38318.interactive-fire-calculator.pages.dev`, successful preview of `e18c517`, created 2026-09-06 17:20 UTC |
| Supplied deployment | `https://3dc4d337.interactive-fire-calculator.pages.dev`, successful preview of `298ad4e`, created 17:14 UTC; not current HEAD |
| Full local verification | `./scripts/test_all.sh`: 79 Python tests + 21 subtests, 1,269 Vitest tests / 26 files, TypeScript and production build pass |
| Dependencies | `npm audit --json`: zero vulnerabilities; installed graph 265 dependencies. This is not a security certification |
| Production setup | `npm run auth:preflight`: expected failure, 0/6 checks pass. Guard preserved |
| Hosted HTTP | `npm run smoke:calculators -- <latest-preview>`: 84 paths pass: library + FIRE + 82 registry calculators |
| API probes | Node fetch: `/api/health` 200; all 11 protected GET endpoints below 401; all `Cache-Control: no-store` |
| Preview database isolation | Cloudflare project API `deployment_configs.preview.d1_databases.DB.id` matches the configured `finpath-production` database, not `preview_database_id`; no DB writes performed |
| Browser auth | Both previews: `/dashboard` says “Connect Clerk before opening account routes.” Missing frontend key. Backend 401 does not demonstrate working browser auth |

Protected GET probes: `/api/me`, `/api/profile`, `/api/dashboard`, `/api/accounts`, `/api/transactions`, `/api/goals`, `/api/plans`, `/api/calculator-results`, `/api/account-data/export`, `/api/imports/transactions`, `/api/imports/account-balances`. Python urllib was blocked with edge 403, including health; Node fetch reached the application. Distinguish edge rejection from application authorization.

Baseline verification was actually rerun, not copied from the handoff. Build output: entry JS 512.10 kB / 140.36 kB gzip; calculator chunk 313.23 / 83.55; projection chart 347.89 / 102.40; CSS 157.13 / 26.46. Vite emitted a >500 kB chunk warning. Source maps are enabled. These are transfer/build measurements, not real-user Core Web Vitals.

## Architecture and trust boundaries

```text
public browser -> React/Vite static assets -> typed calculator engines
                  | local drafts / explicit input share links / local exports
                  v
Clerk browser SDK -> session token -> same-origin Bearer request
                  -> Pages Function -> requireClerkAuth -> userId
                  -> validation + ownership predicates -> D1 prepared statements
                  -> no-store JSON -> private workspace
```

`src/main.tsx` wraps the application in `AuthProviderBoundary` (`src/auth.tsx`). No public key produces a public-only application. `src/App.tsx:authenticatedJsonRequest` obtains a token from Clerk for each request. `functions/_lib/session.ts` accepts session tokens and checks authorized parties, falling back to the request origin when no list is configured. Missing auth config returns 503; unauthenticated requests return 401. Neither route gates nor a client-provided user ID grants database access.

The browser publishable key is public configuration. Server `CLERK_SECRET_KEY` or `CLERK_JWT_KEY` stays in Pages secrets. `CLERK_AUTHORIZED_PARTIES` defines allowed origins. Wrangler/GitHub deployment credentials belong to developer tooling, not browser bundles. D1 is a bound service, not a client database credential. No values were printed or added to documents.

Four migrations create users/profiles, financial accounts, balances, transactions, goals, plans/versions, FIRE snapshots, assumptions/audit log, two import-history tables, and saved calculator results. Ownership is enforced in helper queries. Most persistence tests use fake statements; that does not prove real D1 constraints, concurrency, or two-user isolation.

Imports parse CSV locally, review rows on the server, then revalidate and batch a commit. Both import helpers cap rows at 500 and deduplicate a user-scoped normalized hash. Transaction imports deliberately do not change account balances. Export enumerates user-scoped tables; deletion batches explicit user predicates. Clerk identity and local browser drafts survive D1 deletion. `ensureUserProfile` can recreate an empty profile while the identity remains active.

## Route inventory and classification

| Surface | Classification | Evidence / disposition |
|---|---|---|
| `/` | Public acquisition entry | Real calculator links; broad promise; working browser render |
| `/calculators` | Public utility and acquisition | 8 toolkits, 82 registry tools; real links and search |
| `/calculators/fire` | Public utility | Separate FIRE engine; live default calculation $1,301,620 |
| 82 registry routes | Public utilities; some share engines | Preserve all URLs; per-route appendix below; 5 dedicated excellence experiences |
| `/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/reports`, `/settings` | Authenticated workflows, currently browser-blocked | Substantial UI/API code, not empty placeholders; authenticated behavior unverified on supplied hosts |
| Non-FIRE plan drafts | Partial workflow | `createPlanDraft` inserts plan metadata without a calculation version; do not promise a fully executable plan |
| Unknown paths | Dead/ambiguous surface | `normalizeRoute` falls back to `/`; SPA fallback returns 200 rather than a genuine not-found response |
| `app.py`, `project/`, `templates/`, `static/` | Legacy | Retain parity harness; never deploy Flask to Pages |
| Similar calculator families | Potential duplication, not established dead routes | Shared engine is not sufficient reason to delete a URL; measure distinct decision value first |

## Browser evidence and limits

1280×720 desktop and 390×844 mobile: landing, library, FIRE, Compound Interest, Savings Goal, Budget, Mortgage, India tax, SIP, Retirement, and all workspace gates were inspected. No document horizontal overflow in the sampled mobile states. Compound's asynchronous mount required a follow-up observation; eventual H1 and inputs rendered. FIRE Calculate returned a required portfolio and explicit drawdown warnings; error/warn log query returned no entries at that checkpoint.

Mobile mortgage: changing principal from 300,000 to 200,000 produced a displayed payment of $1,264; expanding the schedule rendered 360 body rows with table scrolling contained. **Found discrepancy:** visual summary displayed payoff months 361 while the schedule says 360. Needs a formula-boundary regression and written decision before altering shared math. Mortgage content also exposes “Phase 22” and imperative internal design instructions in the visible decision checks (`calculatorStudios.ts` / `calculatorQuality.ts`).

Compound starting capital 10,000 -> 20,000 and Budget income 7,000 -> 8,000 were exercised; India tax income 1,500,000 -> 1,800,000 produced lower-regime net income ₹1,633,600 with separate tax metrics. This is interaction evidence, not validation of tax law. Retirement/SIP/Savings rendered; deeper cases remain a separate test obligation.

No authenticated account was created, no real records queried, and no production writes performed. Consequently hosted persistence, imports, exports, deletion, expired-session recovery, and cross-tenant behavior are **not passed**. Keyboard/zoom/reduced-motion checks and any further verification are recorded in the milestone appendix rather than inferred from CSS. This audit is not a WCAG conformance certification or a load test.

## Current-state scorecard

Scores use 0=absent, 5=implemented with material gaps, 10=verified under real use. Judgment is intentionally falsifiable.

| Dimension | /10 | Evidence and limiting factor |
|---|---:|---|
| User value / differentiation | 5 | Rich calculations; no user evidence; extensive adjacent alternatives |
| First-use clarity / time-to-value | 6 | Public calculation works; generic hero; authenticated navigation competes with first action |
| Repeat-use / retention | 2 | Version/history/follow-up code exists; no closed hosted loop or cohort evidence |
| IA / interaction design | 6 | 8 toolkit structure and disclosures; generic destination links lose entity context |
| Accuracy / explanation / support | 6 | Strong formula regression suite, five versioned engines; mortgage discrepancy and current tax review needed |
| Authenticated tracking | 3 | CRUD/import/planning implementation; frontend configuration blocks hosted verification |
| Trust / privacy / lifecycle | 4 | Auth predicates/no-store/export/delete; currency, storage, recovery and policy gaps |
| Accessibility / mobile | 6 | Labels, text warnings, sample layouts work; no full assistive-tech audit |
| Performance / reliability / observability | 4 | Lazy chunks and health endpoint; large entry, no evidence of monitoring/recovery exercises |
| Search / content | 5 | Metadata tests, sitemap, real links; client-rendered metadata, wrong unknown-route response, internal copy |
| Monetization readiness | 1 | No billing/entitlement model, demand evidence, or production-auth journey |
| Architecture / tests / delivery | 6 | Passing 1,269+79 tests; 7,636-line App, fake DB coverage, no automatic test gate at baseline |

## Truth table: corrections to the handoff

| Claim | Evidence | Correction |
|---|---|---|
| All 82 upgrades complete | Phase 25 shared feature coverage is present | Scope claim to old shared roadmap; it does not mean excellence or production-ready |
| 5/82 complete | Dedicated Compound, Savings and three Cashflow routes/engines/tests; Phase 26 tracker | Correct for stricter pass; 77 remain; do not use an overall product completion percentage |
| 32% complete | High-standard plan's Phase 20 paragraph predates later work | Label historical; current index points here |
| PR #137 / older checkout / preview current | GitHub #139, stable Projects checkout, Cloudflare deployment metadata | Mark older entries historical, retain their commit context |
| Dependency HEAD assumed | Actual HEAD `e18c517`; refresh itself `298ad4e` | Record both; do not equate doc commit with dependency commit |
| All public routes work | 84-path HTTP script verifies SPA shell only | Keep result, but distinguish render/interaction checks and formula tests |
| Auth nearly done / only production setup left | Both previews lack frontend key; private journey not executed | Add preview auth and disposable end-to-end verification as blockers |
| Privacy ready / deletion complete | D1 deletion excludes Clerk, drafts and provider recovery history | Publish exact boundaries and prove lifecycle before private pilot |
| US and India tracking supported | Accounts have currency, but `summarizeAccounts` sums all cents; goals/transactions lack currency columns | Public regional tools exist; mixed-currency tracking is unsafe until corrected |
| Tests passing means safe release | No test workflow; runner can skip runtimes; no branch protection/rulesets | Add a fail-closed test gate; require owner to enforce review/check policy |

## Technical risk register

0. **P0 preview isolation:** live project configuration binds preview `DB` to the configured production database despite a separate `preview_database_id` in `wrangler.toml`. Do not run authenticated write/delete tests until explicit environment bindings and effective deployed metadata prove isolation. A preview hostname does not isolate data.
1. **P0 currency correctness:** `functions/_lib/accounts.ts:summarizeAccounts` adds USD and INR balances without conversion; `goalPayloadFromCalculator` drops currency into currency-less goals. UI-only USD guards do not protect the API. Avoid real mixed-currency data until server contracts are fixed.
2. **P0 persistence integrity:** `createSavedCalculatorResult` creates a destination before separately inserting the saved result. Failure/retry can orphan or duplicate destinations; no idempotency key. Tests need real local D1 fault/concurrency coverage.
3. **P0 lifecycle:** deletion is not full account erasure; concurrent writes/recovery may resurrect data. Export reads tables sequentially, so it is not a consistent multi-table snapshot. No documented restoration drill or deletion replay.
4. **P0 delivery:** successful build check is not a full test check. Full runner must fail on missing Python/npm. First implementation slice addresses this bounded risk.
5. **P1 security validation:** prove two-tenant CRUD/foreign-key/import/export/delete isolation; expired/wrong-origin/wrong-token rejection; request byte limits, rate limits, export pagination and recent-auth deletion. No exploit claim without a reproduction.
6. **P1 continuity:** dashboard saved-result cards route to a destination list, not a precise saved decision; no review completion/scheduling model. Non-FIRE drafts do not supply a runnable plan version.
7. **P1 honesty:** review shared-copy internals, mortgage payoff precision, year-sensitive tax content and generic XIRR approximation. Do not rewrite `fire.ts` or shared formulas opportunistically.
8. **P1 resilience:** local drafts are device-global; some App localStorage access is unguarded. No observed recovery UI for blocked storage or lazy-chunk/network failure. No repository `_headers`; evaluate CSP/referrer policy with Clerk before rollout.
9. **P2 discoverability:** initial HTML canonical/title is generic; metadata changes in JS; unknown paths normalize to home. Google's [JavaScript guidance](https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics) describes rendering dependencies; indexing is not proven by a sitemap.

See [technical roadmap](TECHNICAL_AND_SECURITY_ROADMAP.md), [strategy](PRODUCT_AND_POSITIONING_STRATEGY.md), and [ordered execution backlog](EXECUTION_BACKLOG.md). All changes, tests, CI and deployment evidence for this review will be appended below.

## Full public calculator path inventory

Generated from committed `public/sitemap.xml`; classification cross-checked against `CalculatorLibrary.tsx` route selection. “Shared” means shared renderer/engine family, not duplicate or dead.

| Path | Classification | Implementation tier |
|---|---|---|
| `/calculators` | Public utility | Library |
| `/calculators/fire` | Public utility | Dedicated FIRE |
| `/calculators/compound-interest` | Public utility | Dedicated excellence |
| `/calculators/savings-goal` | Public utility | Dedicated excellence |
| `/calculators/net-worth` | Public utility | Dedicated excellence |
| `/calculators/budget` | Public utility | Dedicated excellence |
| `/calculators/emergency-fund` | Public utility | Dedicated excellence |
| `/calculators/retirement` | Public utility | Shared studio |
| `/calculators/debt-payoff` | Public utility | Shared studio |
| `/calculators/investment-return` | Public utility | Shared studio |
| `/calculators/sip` | Public utility | Shared studio |
| `/calculators/step-up-sip` | Public utility | Shared studio |
| `/calculators/sip-goal` | Public utility | Shared studio |
| `/calculators/lumpsum-mutual-fund` | Public utility | Shared studio |
| `/calculators/swp` | Public utility | Shared studio |
| `/calculators/emi` | Public utility | Shared studio |
| `/calculators/home-loan-emi` | Public utility | Shared studio |
| `/calculators/car-loan-emi` | Public utility | Shared studio |
| `/calculators/personal-loan-emi` | Public utility | Shared studio |
| `/calculators/income-tax-india` | Public utility | Shared studio |
| `/calculators/salary-india` | Public utility | Shared studio |
| `/calculators/hra-exemption` | Public utility | Shared studio |
| `/calculators/fd` | Public utility | Shared studio |
| `/calculators/rd` | Public utility | Shared studio |
| `/calculators/ppf` | Public utility | Shared studio |
| `/calculators/epf` | Public utility | Shared studio |
| `/calculators/nps` | Public utility | Shared studio |
| `/calculators/gratuity` | Public utility | Shared studio |
| `/calculators/home-loan-prepayment` | Public utility | Shared studio |
| `/calculators/home-loan-foreclosure` | Public utility | Shared studio |
| `/calculators/home-loan-balance-transfer-india` | Public utility | Shared studio |
| `/calculators/flat-vs-reducing-rate` | Public utility | Shared studio |
| `/calculators/loan-eligibility-india` | Public utility | Shared studio |
| `/calculators/stamp-duty-registration` | Public utility | Shared studio |
| `/calculators/mortgage` | Public utility | Shared studio |
| `/calculators/mortgage-affordability` | Public utility | Shared studio |
| `/calculators/mortgage-refinance` | Public utility | Shared studio |
| `/calculators/amortization` | Public utility | Shared studio |
| `/calculators/extra-mortgage-payment` | Public utility | Shared studio |
| `/calculators/mortgage-payoff` | Public utility | Shared studio |
| `/calculators/biweekly-mortgage-payment` | Public utility | Shared studio |
| `/calculators/mortgage-recast` | Public utility | Shared studio |
| `/calculators/mortgage-points` | Public utility | Shared studio |
| `/calculators/15-vs-30-year-mortgage` | Public utility | Shared studio |
| `/calculators/arm-mortgage` | Public utility | Shared studio |
| `/calculators/interest-only-mortgage` | Public utility | Shared studio |
| `/calculators/balloon-loan` | Public utility | Shared studio |
| `/calculators/closing-costs` | Public utility | Shared studio |
| `/calculators/escrow` | Public utility | Shared studio |
| `/calculators/debt-to-income` | Public utility | Shared studio |
| `/calculators/loan-comparison` | Public utility | Shared studio |
| `/calculators/apr` | Public utility | Shared studio |
| `/calculators/home-equity-loan` | Public utility | Shared studio |
| `/calculators/fha-loan` | Public utility | Shared studio |
| `/calculators/va-loan` | Public utility | Shared studio |
| `/calculators/fha-vs-conventional` | Public utility | Shared studio |
| `/calculators/rent-vs-buy` | Public utility | Shared studio |
| `/calculators/credit-card-payoff` | Public utility | Shared studio |
| `/calculators/debt-snowball-avalanche` | Public utility | Shared studio |
| `/calculators/auto-loan` | Public utility | Shared studio |
| `/calculators/personal-loan` | Public utility | Shared studio |
| `/calculators/student-loan-payoff` | Public utility | Shared studio |
| `/calculators/401k` | Public utility | Shared studio |
| `/calculators/roth-vs-traditional-ira` | Public utility | Shared studio |
| `/calculators/paycheck` | Public utility | Shared studio |
| `/calculators/income-tax-us` | Public utility | Shared studio |
| `/calculators/social-security-break-even` | Public utility | Shared studio |
| `/calculators/rmd` | Public utility | Shared studio |
| `/calculators/cagr` | Public utility | Shared studio |
| `/calculators/xirr` | Public utility | Shared studio |
| `/calculators/inflation` | Public utility | Shared studio |
| `/calculators/rule-of-72` | Public utility | Shared studio |
| `/calculators/capital-gains-tax` | Public utility | Shared studio |
| `/calculators/gst` | Public utility | Shared studio |
| `/calculators/tds` | Public utility | Shared studio |
| `/calculators/down-payment` | Public utility | Shared studio |
| `/calculators/pmi` | Public utility | Shared studio |
| `/calculators/heloc` | Public utility | Shared studio |
| `/calculators/balance-transfer` | Public utility | Shared studio |
| `/calculators/cd` | Public utility | Shared studio |
| `/calculators/hysa` | Public utility | Shared studio |
| `/calculators/life-insurance-needs` | Public utility | Shared studio |
| `/calculators/lease-vs-buy` | Public utility | Shared studio |
| `/calculators/roi` | Public utility | Shared studio |

## First implementation milestone — 2026-09-07

B01 is implemented in `1664043`, with planning corrections through `10ccc1a`. The runner fails when required runtimes are missing and stops on every failed stage. Thirteen isolated runner tests passed, followed by 79 Python tests plus 21 subtests, 1,269 Vitest tests, TypeScript and the production build. The [hosted Verify workflow](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34194698348) passed all steps, including npm audit. GitHub reported an action-runtime deprecation annotation; this is maintenance work, not a failed test.

[PR 139](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/139) remains unmerged. The [immutable implementation preview](https://75358a37.interactive-fire-calculator.pages.dev) was deployed from `10ccc1a`; all 84 public HTTP route smoke checks passed, health returned 200, and 11 signed-out protected GET endpoints returned 401 with no-store caching. These HTTP checks do not prove calculator math or authenticated persistence. Earlier browser findings in this audit apply to the unchanged UI; no new UI was introduced by B01. No production deployment or database write was performed.

Metric to watch: no skipped verification stages and a passing full-suite check on each PR. Remaining priority risks include currency integrity, non-atomic saves, incomplete hosted authentication, and preview database isolation. The exact next implementation item is B02, server-side rejection of incompatible currency conversion into goals.
