# Measurement and experiment plan

2026-09-07. No behavioral analytics has been enabled by this review. No baseline retention or conversion rate is known. Definitions and thresholds below are proposed operating decisions.

## Value and cohort definitions

North star: **monthly returning decision reviewers**: distinct consenting users who complete a review of the same saved decision on a later visit at least 7 days after its prior review, reference a dated financial update or explicitly confirm that inputs remain current, inspect the comparison, and record keep/revise/defer. Activation creates a baseline decision record with `baselineAt`, not a completed review. The first returning review qualifies at least 7 days after that baseline; later returning reviews qualify at least 7 days after the previous completed review. Count each user once per month. Do not count logins, calculator runs, refreshing the page, auto-generated reminders, or background saves.

Activation: public result -> user chooses a scenario -> successful saved decision with explicit intent and next-review date. Time-to-value: first usable public result under 2 minutes; activation target under 10 minutes, measured as median and p90, excluding inactive/background time. These are targets, not measured performance.

Cohorts start at activation, deduplicated by user. W1: explicit follow-up (updated/confirmed inputs plus keep/revise/defer) on days 1–7; this is a separate early-learning metric and only day-7-or-later reviews can enter the north star; M1: meaningful review on days 21–45; M3: meaningful review on days 76–105. Report only matured denominators; users whose window has not closed are not churn. Quarterly-intent cohort is reported separately with day 60–105 return. A review requires a new session/day and explicit decision, not an arbitrary financial amount changing.

Funnels: eligible completed public calculation -> save attempt -> save success (7-day window); save success -> currency-valid profile plus at least one dated account balance (7 days); profile completion -> completed returning review (45 days). Anonymous-to-account linkage occurs only after opt-in, never via fingerprinting. Also report consent coverage and aggregate server save success; never present opt-in cohorts as all users.

Paid: paid accounts / eligible retained users offered paid plan; logo churn = start-of-month paid customers canceled and no longer paid / start-of-month paid customers; revenue churn excludes new customers; expansion = extra recurring revenue from existing customers. Report refunds, disputes, overdue payments, retained reviews per paid account, gross contribution after support, and annual users with no review in 90 days. Annual cash collected is not monthly recurring recognized value.

## Minimal event contract

Each event has `eventVersion`, random `eventId`, UTC occurrence day (exact time only where operationally needed), controlled event name, release version, and consent version. Optional enumerated route slug, outcome, source (`manual`/`csv`), device bucket and error class. Authenticated analytics ID is a separate pseudonym, not Clerk user ID. Product database IDs may be used only in a private server join table with deletion policy, never sent to third parties.

| Event | Trigger / owner | Allowed payload | Must not include |
|---|---|---|---|
| `calculation_completed` | User explicitly obtains valid output / client | Registry slug, engine version, valid/invalid | Amounts, rates, encoded share URL, query/hash |
| `comparison_viewed` | User opens comparison / client | Decision family | Inputs, scenario names/free text |
| `decision_save_attempted` | Explicit save / client | Family, destination | Full payload, token |
| `decision_saved` | Transaction committed / server | Opaque decision reference, family | Financial values, email, Clerk ID |
| `financial_picture_updated` | Accepted balance/CSV write / server | Source, currency eligibility boolean | Filenames, merchant descriptions, balances |
| `review_completed` | Explicit keep/revise/defer / server | Opaque review reference, decision enum, freshness bucket | Notes, reason free text, plan JSON |
| `review_due_opened` | User opens due item / client | In-app/email source | Full URLs, recipient identity |
| `subscription_started/canceled/refunded` | Verified future billing webhook | Tier, currency, reason enum | Payment instruments, billing addresses |
| `data_deletion_completed` | Verified service deletion / server | Request reference, completion duration bucket | Deleted records, stable analytics identity |
| `operation_failed` | Typed service failure / server | Route template, status/error enum, release | Request bodies, headers, tokens, raw exception text |

No session replay, advertising SDK, keyboard recording, fingerprinting, third-party URL collection, or financial payloads in logs. Do not infer income or health/financial vulnerability segments from records for marketing.

## Proposed architecture and consent

Optional product analytics off until opt-in. Core save/export/delete functionality must work if the user declines. Separate operational security/error counters from optional product analytics; publish purposes and retention. Client validates an allowlisted schema; server validates again, checks body limits and consent, deduplicates event IDs, assigns safe receipt time. Use a first-party endpoint with bounded retention in D1 or an approved equivalent, not a broad vendor SDK. No endpoints/migrations added yet.

Proposed raw optional event retention: 90 days. A separate minimal consented cohort table retains analytics pseudonym, activation day, consent version, intended cadence, and W1/M1/M3 completion flags through day 120 after activation; it contains no financial values or free text. This permits attribution of a day-104 return after day-90 raw cleanup. Delete cohort membership immediately on withdrawal/account deletion; purge it at day 120 after producing matured counts. Aggregated cohort reports persist 13 months without stable individual references and with suppression for cells <10. Report withdrawals separately and freeze denominators under the documented consented-cohort rule rather than silently changing past rates. Revocation stops collection immediately and removes identifiable analytics within 7 days; deletion removes product joins and queued reminders. Keep security records only under a separately reviewed justified policy. Publish a deletion receipt that does not falsely assert provider-backup erasure.

Country/legal applicability must be reviewed before collection. India rules are notified with phased commencement; consult [MeitY's final rules](https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf) and [August 2026 government implementation note](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2294910&lang=1&reg=3). This design chooses minimization/opt-in; it is not a blanket legal conclusion about required consent in every jurisdiction.

## Ordered experiments

| Experiment | Sample / duration | Pass / stop | What it decides |
|---|---|---|---|
| Observe current review | 8 FIRE, 8 India, 4 household interviews; 2 weeks | >=5/8 FIRE already revisit; observe actual steps; stop if invented problem | Primary segment and data needed |
| First value | 10 unassisted sessions on synthetic data | 8/10 explain result and one driver; >=7 save in 10 min; stop on wrong-currency result | Onboarding scope |
| Review loop | 20 activated consented pilot users, 45 days; repeat cohort | >=6 meaningful M1 returns; zero unresolved severe data/auth incidents | Whether to deepen retention work |
| Notification increment | Only consented due users; random assignment in-app only vs generic opt-in email after provider setup; 45 days | Compare review completion with exact n and uncertainty; stop on complaint/data leak | Whether email adds value, not just opens |
| Payment | >=20 retention-qualified offers, 30 days | >=3 willing actual purchases at disclosed price; refund/support metrics acceptable | Paid beta, not proof of market size |
| Quarterly value | Matured day-105 cohorts | >=25% M3; report quarterly cohort separately | Continued investment |

Do not claim statistical significance at these samples. Pre-register hypothesis, assignment, eligibility, exclusions, duration and stopping rule in a dated experiment record; avoid changing price and review UX together. Use interviews to explain effects, not substitute for behavior.

Guardrails: zero unresolved cross-tenant exposure, data loss or currency corruption; correction count and time-to-fix; unauthorized request rate separate from signed-in auth failure rate; deletion completion within stated policy; import duplicate/failure rates; p95 save latency; user-reported confusion and support minutes. Halt pilot expansion immediately on a severe data incident. CI pass rate and runtime-skip count are delivery metrics only, not the north star.

## Definition regression fixtures

Activation without return: no retention/north-star credit. Day-3 explicit follow-up: W1 only. Day-7 follow-up: W1 and first returning-review credit. Day-30 review: M1; it qualifies again only if at least 7 days since prior completed review. Day-104 review after raw day-90 cleanup: M3 attribution survives via cohort membership. At day 105 cohort is mature; at day 120 identifiable membership is purged. Revocation before return prevents new collection and removes membership. Add these fixtures before implementing B12.
