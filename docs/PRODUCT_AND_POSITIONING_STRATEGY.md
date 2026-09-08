# Product and positioning strategy

Research date: 2026-09-07. Facts are linked to primary sources or the [audit](CURRENT_STATE_AUDIT.md); user demand, retention mechanisms, market weaknesses and proposed prices are hypotheses unless explicitly described otherwise. Competitor marketing is not independent evidence of retention.

## Thesis and positioning

**Primary wedge:** a single-currency, self-directed FIRE accumulator who already reviews a spreadsheet monthly or quarterly and wants to know whether new balances or spending change the contribution plan. Start with a small US/USD pilot because private goals/transactions currently lack currency semantics. Continue serving India public tools; validate India users separately and repair currency contracts before inviting INR tracking. Do not promise cross-border tax or FX planning.

Proposed positioning: “Keep your financial independence plan current. Review what changed, understand the effect, and choose your next step.” The repeated job is a 10-minute monthly review, not daily market checking. A completed review may conclude “no change needed,” with its evidence preserved.

Why this wedge now: `fire.ts`, immutable FIRE versions, explicit account imports and `planHealth.ts` already provide useful parts. A household budgeting competitor would require dependable transaction reconciliation and collaboration; an advisor service adds role/permission and professional obligations; another directory does not create a repeated job. First interviews must determine whether the spreadsheet is actually painful enough to replace.

## Market evidence and return mechanisms

| Product / category | Verified offer and boundary | Likely return mechanism and implication (inference) |
|---|---|---|
| [ProjectionLab](https://projectionlab.com/pricing), FIRE/retirement | Basic free; Premium $129/year; Pro $549/year with 10 client seats and additional clients $2/month. Premium includes scenarios, tax estimates, reports; states it does not sell data | Life changes and what-if reviews; saved model creates switching cost. FinPath cannot win on scenario count. Complexity may increase setup burden; test a shorter review rather than asserting competitor dissatisfaction |
| [Boldin](https://www.boldin.com/retirement/pricing/), retirement planning | Basic free; PlannerPlus $144/year, 14-day trial, scenario comparison/account linking; advisor checkup $3,200 flat fee. Some advertised items explicitly “coming soon” | Ongoing tax/withdrawal decisions and education create return reasons. Distinguish shipped from promised features; FinPath should not imply equivalent tax sophistication |
| [YNAB](https://www.ynab.com/pricing), budgeting/goals | $109/year or $14.99/month plus applicable tax; 34-day direct trial without card; account/transaction import, goals, subscription sharing. Direct import covers selected US/Canada/UK/EU banks; one currency per spending plan | Frequent allocating/reconciling, method education and shared practice. Strong recurring job but higher behavior-change burden; India direct-bank assumptions would be wrong |
| [Monarch](https://www.monarch.com/pricing), household net worth/budget | Paid subscription; 7-day trial and no-ad/no-data-sale positioning. Exact current tier amount was not exposed in retrieved pricing content, so not quoted | Connected accounts, recurring cashflow and household visibility provide continuity. Connection reliability becomes product/support burden. FinPath should first prove manual review value |
| [INDmoney](https://www.indmoney.com/networth), India aggregation/goals | Markets a net-worth tracker across investments/assets/liabilities; [family accounts](https://www.indmoney.com/networth/family-accounts) separate family members and show combined wealth; mobile app distribution. No standalone subscription price verified | Refreshed holdings and family visibility attract repeat checks. Requires broad trust/coverage; an independent “why did my plan change?” review is the proposed alternative, not a claim of superior aggregation |
| [Groww calculators](https://groww.in/calculators), India loans/tax/investing | Public directory includes SIP, EMI, EPF/NPS and tax tools | Search answers an immediate question; execution elsewhere may end the visit. Free calculation alone is a weak payment boundary; do not infer actual bounce rates |
| [Value Research Premium](https://www.valueresearchonline.com/premium/subscribe/), research/portfolio | Standard service states it remains free; premium offers deeper analysis. Current payable amount not verified from accessible content | Portfolio monitoring and analysis can recur; professional/recommendation value is a different business from neutral calculations. Do not copy a securities-advice model without review |
| [Zerodha Varsity](https://zerodha.com/varsity/), education | Free/open financial education, with web lessons and app | Learning progression rather than personal-state tracking. Better to link authoritative learning than build a redundant encyclopedia |
| [Plaid](https://plaid.com/pricing/), infrastructure adjacent | PAYG, growth and custom; one-time, subscription-per-connected-account and request-based charging. Unit quote not public in retrieved page | Enabler, not a consumer competitor. Recurring data costs and reconnect support constrain gross margin; no free-production assumption |
| [Sahamati AA resources](https://sahamati.org.in/account-aggregator-key-resources/), India ecosystem | Consent-based AA specifications and regulator resources; not a turnkey unrestricted bank feed | Coverage, eligibility and revocation are dependencies. Validate FIU/partner route before making aggregation promises |

Study method: official public pricing/product pages and FinPath's running preview, not purchased competitor accounts or longitudinal observation. Onboarding/deep paid workflows and actual competitor retention are unverified. Next research action: recruit users who already use spreadsheets or these products and observe their last review, without asking for credentials or statement uploads.

## Segment hypotheses, ranked

All willingness-to-pay bands below are proposed interview/price-test ranges, not measured customer demand. Frequency means expected job frequency, not observed app use.

| Segment | Urgency / frequency / WTP hypothesis | Switching, trust, channel, burden, exposure | Decision/test |
|---|---|---|---|
| Immediate calculator visitor | High at decision; episodic; $0 baseline | Near-zero switching; credible math; exact-question search; low support; estimates/affiliate disclosure | Keep free; measure result comprehension and voluntary saves, not pageviews |
| FIRE accumulator | Medium/high during life change; monthly/quarterly; $48–84/year | Spreadsheet/model history; transparent assumptions; existing FIRE communities via permitted useful posts; moderate support; avoid personalized security selections | Primary. Observe 8 real reviews; win only if saving/updating reduces work |
| Household cashflow/goals | High bills stress; weekly/monthly; $60–120/year | History, bank links, partner habits; very high privacy/reliability; household referrals; high import/support burden; tenancy/consent | Defer full ledger competition; interview 4 for review overlap |
| US retirement/debt/home/tax | High near a decision; irregular/tax annual; $10–25 report or $48–84/year if repeated | Existing lender/tax workflow; official-year sources; calculator entry paths; high edge-case questions; advice/tax expectations | Keep utility entry; require a saved recurring job before paid promotion |
| India SIP/EPF/NPS/EMI/tax | Contributions monthly, tax periodic; ₹999–1,499/year test | Broker/statement ecosystem; INR/Indian number format and rule-year accuracy; relevant communities/tools; high coverage expectations; local data/advice review | 8 discovery sessions, currency-safe later pilot; no geographic demand claims |
| Coach/advisor | Client meetings monthly/quarterly; $25–50/month workspace test | Client permissions, reports, compliance archive; professional networks; very high support; fiduciary/registration exposure | Not year-one primary. Require 3 professionals asking for the same workflow and legal/tenancy design |

## Alternatives rejected and invalidation

- **More calculator excellence work as the central strategy:** retain targeted correctness fixes; postpone the remaining 77 aesthetic upgrades until a specific user decision needs them.
- **Daily all-in-one budgeting:** defer automatic categorization, bank sync and collaboration. Those are a separate service promise.
- **AI advisor:** no opaque individualized recommendations or financial records sent to a model by default.
- **India-first private tracker:** plausible market, but current data model cannot safely represent the claim. Reverse pilot order only if interview evidence is stronger and currency isolation is fixed.

Invalidate the wedge if fewer than 5 of 8 primary interviewees already perform repeated reviews, if fewer than 6 of the first 20 activated pilot users complete a second meaningful review within 45 days, or if most value comes only from tax optimization or bank automation that FinPath cannot safely supply. Small samples are directional, not statistically definitive. Stop feature expansion and revisit the problem after two failed cohorts.

## Distribution and founder assignment

Start with 20 consenting pilot users, recruited personally by the owner; no outbound messages or campaigns sent by this agent. Ask each to demonstrate their most recent review with synthetic/redacted amounts. Record the unanswered decision, steps/time, exact confusion, and what they would lose if FinPath vanished. Offer the existing public calculator first and watch without coaching. A saved scenario is activation evidence; an unprompted return with updated facts is stronger evidence.

Maintain current URLs and useful explanatory content; do not put acquisition or regional strategy language into the product. Referral prompts come after a successful second review, with no raw financial data in shared links. Paid distribution waits for measured retention and viable support economics.
