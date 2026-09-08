# Retention and monetization plan

2026-09-07. Strategy proposal, not an enabled paywall or revenue forecast. [Current evidence](CURRENT_STATE_AUDIT.md) and [market sources](PRODUCT_AND_POSITIONING_STRATEGY.md) bound the recommendations.

## The recurring value loop

| Step | User outcome | Existing capability / missing work |
|---|---|---|
| Ask and calculate | Answer one decision without login | Public routes, deterministic engines; preserve |
| Explain and compare | Understand drivers and uncertainty | Scenarios/sensitivity; fix internal copy and precision defects |
| Save intent | Capture what decision the result supports | Saved results and FIRE versions; need precise entity link, atomic/idempotent save and currency safety |
| Update picture | Enter dated balances and spending assumptions | Manual accounts and explicit imports; need stale-data labeling and currency isolation |
| Review change | Separate balance changes from assumption changes | `planHealth` groundwork; add a review record referencing old/new versions and source dates |
| Choose next action | Keep, revise or defer with explanation | Missing explicit review completion and next date |
| Return | Receive a useful, consented signal | In-app due state first; optional generic email only after delivery/consent setup; no market-noise alerts |

No automatic edits to a user's financial plan. A notification links to evidence and requires an explicit decision. If nothing material changed, say so; do not manufacture urgency or daily streaks.

## Primary revenue model: consumer planning subscription

Keep all public calculators, schedules, CSV/JSON data portability, assumption explanations, basic comparisons, one active saved FIRE plan, manual balances and basic monthly review free. Never paywall deletion, export of existing data, corrections, accessibility or security. Preserve access to existing data after cancellation.

Proposed Plus value: multiple active planning projects, richer version comparisons/history views, custom review triggers, and a client-readable generated review report. Core stored history remains exportable even when enhanced history UI is paid. Household collaboration and automation enter Plus only after separately verified permissions and reliable data contracts; they are not launch promises.

Test two annual offers after retention gate: US $48 vs $72; India ₹999 vs ₹1,499, with local currency and applicable tax treatment shown before payment. Candidate monthly alternatives $7 / ₹149; these are price experiments, not inferred willingness to pay. No paid price test before owner chooses entity/payment provider and counsel confirms tax/refund terms. Start with mock purchase-intent screens that clearly say payment is not yet available, then run an opt-in paid beta when authorized. Never fake scarcity or charge an inactive subscription.

Primary success: retained paid reviews and low refunds, not annual prepayment masking inactivity. Proposed 14-day refund window after first charge, easy self-service cancellation, annual renewal reminder 14 days before charge, and 2-business-day support response target. Keep existing records readable/exportable after downgrade; disclose quotas before users exceed them. Legal rights override proposed policy. Do not promise advisor support.

## Unit economics: explicit assumptions

The following are sensitivity assumptions, not provider quotes. Taxes are excluded from net revenue; variable support labor is included. Fixed hosting, engineering, legal, tax compliance and acquisition spend are separate.

| Example annual customer | Revenue/month | Processing assumption | Infra/auth/email | Support + refunds allowance | Contribution/month |
|---|---:|---:|---:|---:|---:|
| US $72 annual | $6.00 | 3% + $0.30 once/year = $0.205/month | $0.35 | $0.80 + $0.18 | $4.47, about 74% |
| US $48 annual | $4.00 | $0.145/month | $0.35 | $0.80 + $0.12 | $2.59, about 65% |
| India ₹1,499 annual (illustrative tax-exclusive) | ₹124.92 | 3% = ₹3.75/month | ₹20 | ₹30 + ₹3.75 | ₹67.42, about 54% |
| India ₹999 annual (illustrative tax-exclusive) | ₹83.25 | ₹2.50/month | ₹20 | ₹30 + ₹2.50 | ₹28.25, about 34% |

At the $72 case, 100 payers produce $600 monthly recognized revenue and about $447 contribution before fixed costs. Ten free active users per payer at assumed $0.03/month each reduce margin another $0.30/payer. A hypothetical $2/payer/month aggregation cost reduces contribution to $2.47; four support minutes at $30/hour cost another $2. Do not sign a data contract on these assumptions. [Plaid pricing](https://plaid.com/pricing/) confirms differing charging models, not these unit amounts. Measure actual bills and support minutes before offering automation.

[Stripe pricing](https://stripe.com/pricing) varies by product/payment method/country; our 3% model is only a budget allowance. [Stripe India requirements](https://docs.stripe.com/india-accept-international-payments) currently describe invite-only access and business/export requirements. Owner must supply legal entity country, eligible provider and tax registrations; do not assume US checkout can be reused for India. India consumer prices may need to be tax-inclusive; rerun economics on net receipts after qualified tax advice. Set no tax rates in code from this memo.

Model fails if support exceeds 5 minutes per active paid household/month, infrastructure/data costs exceed 20% of net revenue, month-3 meaningful retention is below 25%, or fewer than 3 of 20 retention-qualified users choose a clearly priced paid pilot. Treat low-N thresholds as stop/go learning gates, not market estimates.

## At most one secondary model

A self-serve one-time decision-review report at proposed $15 / ₹299 can test episodic demand after retention and report accuracy are proven. It must identify inputs, dates, engine version and uncertainty; no personalized product recommendation. A human review at those prices is not viable: even 30 minutes at $30/hour consumes the entire US price before other costs. If it cannibalizes subscription or creates an advice expectation, stop it. No paid report implementation in this milestone.

## Alternatives evaluated

- Coach workspace: $25–50/month proposed research band; permissions, audit records, client support and regulatory review are too large for the first consumer pilot. Defer.
- Affiliates: illustrative 1,000 relevant visits × 2% qualified outbound × 5% completion × $50 commission = $50; no validated rates. Commission must never change calculator output, ranking or assumptions. [FTC guidance](https://www.ftc.gov/business-guidance/resources/ftcs-endorsement-guides-what-people-are-asking) requires clear disclosure of material connections; counsel reviews before activation. Not selected year one.
- Advertising/sponsorship: illustrative 10,000 pageviews at $10 revenue/1,000 = $100/month before costs. The trust/distraction cost conflicts with the wedge; no targeted financial-data advertising. Reject for year one.
- Subscription without repeat value: reject. A useful one-time calculator cannot justify repeated charges merely because billing supports them.

## Gates and retention experiments

Weeks 1–2: close launch-blocking data/auth gaps, observe 8 existing FIRE reviews; no charges. Days 15–30: invite 20 users only into a safe disposable/pilot environment; target first saved and revisited decision. Days 31–90: second cohort and preliminary month-3 observations; matured M3 results arrive 105 days after activation (approximately project days 120–135 for days 15–30 activations); test actual payment only with explicit owner setup. Month-1 gate: >=30% of eligible activated users perform a meaningful second review, with zero unresolved serious auth/data-loss incidents. Maintain quarterly retention as a separate cohort for naturally quarterly users; do not label them monthly churn.
