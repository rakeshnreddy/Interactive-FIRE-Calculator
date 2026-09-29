# Technical and security roadmap

2026-09-07. Grounded in [current audit](CURRENT_STATE_AUDIT.md). This is a threat model and delivery plan, not an assertion that all controls have been tested. Production remains blocked by the existing preflight and owner authorization.

## Security model and release invariants

Assets: financial records and assumptions, identities/session credentials, imports, exports, local drafts, deletion records, deployment authority. Adversaries: unauthenticated caller, malicious authenticated tenant, stolen session, compromised dependency/deployment credential, accidental operator action, and shared-device access. Trust boundaries are browser/local storage, Clerk, Pages API, D1 and operator tooling.

| Boundary | Existing control | Threat / required proof |
|---|---|---|
| Auth | Clerk session verification; missing config 503, invalid session 401; no-store JSON | Prove expired/wrong-origin/wrong-token rejection against current SDK, configuration mismatch and token refresh. Enforce exact authorized parties before production |
| Preview data boundary | Separate preview ID exists in local config | Effective Cloudflare preview binding points at configured production DB. Prove distinct effective binding before any authenticated mutation test |
| Tenant authorization | `user_id` predicates in helpers and ownership checks for associations | Two actual D1 tenants: enumerate/cross-reference IDs on all CRUD, versions, imports, exports and delete; no 200/side effects for foreign IDs. SQL fakes do not prove this |
| Currency | Accounts/save records store code; some public UI guards | Mixed cents summed, goals lack currency; prevent contamination on server before accepting private INR or mixed currency data |
| Saves | Payload validation, prepared statements | Destination then save record are separate writes. Atomicity, idempotency and stale-write tests required |
| Imports | Local CSV parsing, 500 rows, review/commit and user/hash dedup; batches | Byte limit before JSON parse; concurrency and near-duplicate ambiguity; file name/description retained as personal data; test rollback and no account balance mutation |
| Exports | User-scoped JSON table reads; no-store | No page bounds/consistent snapshot; protect filename/CSV formulas, avoid logged bodies; expired sessions and large datasets |
| Deletion | Exact phrase, table-scoped batch; explicit Clerk distinction | Recent-auth policy, concurrent writes, local drafts, Clerk lifecycle, analytics join deletion and recovery replay. No promise of erasing exported copies |
| Browser storage/sharing | Versioned local drafts and input-only links | Financial inputs can still be sensitive; explicit warning before sharing, no raw URL in analytics/referrer, clear device drafts; handle storage failures |
| Secrets/supply chain | npm lockfile, ignored local env, no known npm advisories | No broad secret exposure found in inspected config; this is not exhaustive historical leak clearance. Scan with value-redacted outputs; rotate any confirmed leak |
| Logs/analytics | Generic catch responses, no analytics SDK found | Prove provider log settings/body redaction; allowlisted first-party consent events only; no session replay |
| Backups/recovery | Provider facility, no app recovery drill evidenced | Verify plan-specific retention, isolated restore exercise and deletion replay before restored data serves users |
| Delivery | Auth preflight and production wrapper | Missing baseline test CI; skip-on-missing runtime; unprotected main; review and check enforcement required |

[D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) documents automatic point-in-time recovery, with 7 days on Free and 30 days on Paid. Actual account plan and restoration operation were not verified or changed. The recovery design must account for deleted records reappearing; a backup facility is not an application erasure policy.

Privacy notice, service terms, support contact, retention schedule and incident owner were not found as public product routes. Before private pilot, owner/counsel must define them. [SEC investment-adviser guidance](https://www.sec.gov/interps/legal/slbim11.htm) and [SEBI's investor explanation](https://investor.sebi.gov.in/investment_advisor.html) make individualized advice a substantive concern; “not advice” copy does not by itself settle applicability. No regulated recommendation engine is in scope.

## Delivery plan

P0 configuration prerequisite: correct effective preview DB binding to an approved isolated test database and verify deployed binding metadata before any authenticated write/delete. The local `preview_database_id` does not prove Pages preview isolation. No database/config binding changes were performed in this milestone.

P0 code work: fail-closed full verification; currency-safe summaries/conversions; atomic idempotent calculator saves; disposable real-D1 tenancy and lifecycle tests; correct preview-auth configuration and demonstrate a full disposable-user journey. P0 external work: owned origin, Clerk production setup, exact secrets/authorized parties, data policies and explicit production permission. Treat these as separate tracks.

P1: one saved FIRE decision with precise return link, dates/source provenance, keep/revise/defer review, and an honest due state. Correct mortgage precision discrepancy under a referenced regression contract; remove internal product copy; keyboard/zoom/failure-state audit. Add minimal consented measurement only after the event contract is approved in product policy.

P2: entitlements, cancellation and price experiment only when retention passes. Read-only data access/export must survive downgrade. Email only after verified domain/provider/consent, with generic notification text and unsubscribe.

P3: selective aggregation, household roles and mobile investment only after proven demand and isolated data/security designs. No microservice rewrite. Extract cohesive App modules when implementing the journey, not an unrelated 7,636-line refactor.

## First slice: reliable full-suite evidence

Problem: a contributor without npm or Python can get exit 0 from `scripts/test_all.sh`, and #139's sole baseline check is a deployment check. A green status should certify every required verification stage ran.

Scope: test the runner behavior in isolated temporary fixtures first; require Python, Node and npm; use deterministic `npm ci` when dependencies are absent; propagate compile/pytest/TypeScript/Vitest/build failures. Add a public-repository Linux PR workflow using pinned official actions, read-only contents permission and no deployment/Clerk secrets. No `pull_request_target`, production command, branch-policy change, or database access. The repository is public and uses a standard Linux runner, which [GitHub documents as free](https://docs.github.com/en/billing/concepts/product-billing/github-actions); no paid service is provisioned. [GitHub secure-use guidance](https://docs.github.com/en/actions/reference/security/secure-use) supports minimum token permissions and full-SHA action pins; [Python](https://docs.github.com/en/actions/tutorials/build-and-test-code/python) and [Node](https://docs.github.com/en/actions/tutorials/build-and-test-code/nodejs) setup documentation supports reproducible runtime provisioning.

Acceptance: absent runtime fails before any test stage; every nonzero stage stops subsequent work; valid fixture executes the full ordered chain; real full suite passes locally and on PR. Required check enforcement is a separate owner setting, not accomplished by merely adding YAML. Rollback: revert the delivery-only commit; no schema or product migration. Human estimate 0.5–1 day; agent estimate 1–2 hours plus CI execution and review. These are ranges, not promises.

## External setup: smallest owner input

| Dependency | Smallest input / action | When |
|---|---|---|
| Pilot users | 8 primary users to interview and consent to observation; no records or credentials in chat | Now |
| Preview database | Confirm approved disposable database; configure distinct preview binding and verify effective deployed metadata before any write | Before hosted private QA |
| Preview auth | Identify approved Clerk development instance and enter its public build key/compatible server configuration through existing secure settings | Before authenticated preview QA; no new paid service |
| Owned domain | Exact owned HTTPS origin and DNS provider; explicit authorization for eventual DNS changes | Before production; not changed in this review |
| Clerk production | Complete deployment wizard/DNS/OAuth; confirm ready status; enter secrets in provider UI/interactive secret tooling | Before production; [official deployment guide](https://clerk.com/docs/guides/development/deployment/production) |
| Authorized parties | Exact production and intended preview origins, separately scoped; never an unbounded wildcard | Before hosted auth validation |
| GitHub merge policy | Owner confirms `main` must require full-suite check and review, then applies protection/ruleset | Before merge; none changed |
| Legal/tax/payment | Legal entity country, counsel/tax owner, eligible processor, tax registrations, approved terms/refund policy | Before real financial data/charging as applicable |
| Aggregation | Approved vendor/regulated-partner path, eligible countries, institution requirements, explicit budget | Only after retention; no bank accounts connected |
| Email | Approved sender domain/provider, budget, consent/unsubscribe wording | After in-app loop works |
| App stores | Owner developer accounts, legal/support identities, budget and signing custody | Only after mobile gate |

Never ask the owner to paste server secrets into chat. Production release still requires owned-domain sign-up, sign-in/out, session renewal, save/reload, export and deletion proof plus explicit release permission.

## Time horizons and effort

Two-week foundation is a capacity-limited sprint, not a claim that all P0 work fits: target B01–B04 (about 5.5–7 human days and 11–22 agent hours), then begin B05 and owner setup if capacity remains. B01–B07 together require about 11.5–19 human engineering days and 29–58 agent hours, plus owner/provider waiting time. A synthetic review sketch may support interviews; it is not a completed or safe private pilot. B05–B07 and the relevant owner gates must finish before real-data pilot enrollment.
30 days: aim to finish the safety foundation, a review prototype and recruitment; enroll up to 20 activated participants only after gates pass. M1 matures 45 days after each activation, so activation on project days 15–30 yields first mature M1 results on days 60–75. Earlier readings are preliminary.

90 days: two pilot cohorts where feasible, matured M1 retention, preliminary M3 observations, refined review loop and paid intent/authorized beta only if gates pass. M3 matures at day 105 after activation, or project days 120–135 for users activated on days 15–30. B01–B12 sum to roughly 20–35 human engineering days and 49–97 agent hours, plus recruiting, support and owner waits; budget 5–8 human weeks and 60–110 agent hours including integration/review margin. Re-estimate rather than calling a partial pilot complete.

12 months: durable consumer subscription if retained value exists; selected regional workflows after currency/rule provenance; email/aggregation/mobile only through their gates. Capacity placeholder 1 owner/product lead + part-time engineering/security/legal support, not a committed staffing plan. Stop expansion if two cohorts fail.

Non-goals: all 77 excellence upgrades, daily trading alerts, broker execution, native apps, automatic account syncing, AI advice, paid campaigns, wholesale framework migration, and deleting public URLs. Keep Flask parity tests until an explicit retirement decision has replacement oracle evidence.
