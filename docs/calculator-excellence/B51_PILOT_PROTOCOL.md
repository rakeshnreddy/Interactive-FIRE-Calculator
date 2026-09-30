# B51 real-user validation protocol — prepared 2026-09-30

Protocol prepared, observations **NOT RUN**. Canonical task status is in TASK_STATUS.json. Preparation is not B51 acceptance. Owner recruits and communicates; Astra has contacted nobody. Use the current accepted beta from RESUME.md, not a historical immutable URL in a prompt.

## Cohort and consent

Owner recruits 10 consenting usability participants (5 US / 5 India) and 20 genuine saved-plan creators. They may overlap; record both denominators separately and do not count duplicate users twice. Use random study IDs U01–U10 and P01–P20, kept outside Git with identity mapping controlled by the owner. Exclude staff/agent/synthetic accounts, scripted sessions and forced return visits. No bank connection, statement upload, contact details, balances or account IDs enter the evidence packet.

Read before each session: “We are testing the website, not your financial knowledge. Use the supplied made-up example or values you choose not to disclose. You can stop or skip any task. We record task outcomes, elapsed time and anonymous comments, not your financial inputs. Optional product analytics requires separate consent; declining does not stop you from using the calculators.” Obtain explicit recording permission before any audio/video recording; the default is observer notes only. Store notes privately, report aggregate categories and delete identity links/notes after the 45-day pilot plus 30 days of analysis, or on withdrawal. In-product deletion/revocation follows the existing authenticated lifecycle; do not export identities to analytics.

## Usability sessions: one 20–30 minute session each

Do not point to a control or say “open advanced options.” Record first discovery and whether assistance was needed. Counterbalance task order to avoid learning from a previous calculator. Use realistic but wholly invented amounts; the observer need not record them.

| Segment / route | Neutral task | Evidence to record |
|---|---|---|
| US retirement / FIRE | Find when retirement could work; identify required return/inflation and adjust a future assumption. | Distinguishes required entry vs example; finds optional refinements; explains one driver without claiming a promise. |
| US borrowing / mortgage | Compare the payment and the cash needed for housing. Include a known annual tax and consider paying extra. | Finds costs/extra controls without direction; distinguishes P&I, costs and extra principal; sees result after explicit action. |
| US saving / savings-goal | Find the monthly amount to reach a goal, then inspect inflation-adjusted target settings. | Finds real target/basis control; understands monthly amount and deadline; follows View result. |
| US tax / paycheck or income-tax-us | Explain what the result covers and what would still need checking elsewhere. | Does not treat entered withholding or state placeholder as a complete tax return; can find official context. |
| India investing / SIP or compound-interest | Compare a monthly investment with a yearly top-up and explain deposits versus growth. | Finds optional contribution settings; recognizes illustrated inputs and constant returns; chart/table totals understood. |
| India tax / income-tax-india | Explain old/new estimate, income basis and one important omission. | Recognizes assessment year, no automatic salary deduction and marginal-relief limitation; does not infer filing advice. |
| India loan / EMI or loan-eligibility-india | Assess repayment amount and explain whether this gives approval. | Correct payment units; no approval inference; finds next useful comparison. |
| Reserve / emergency-fund, either country | Explore how a larger buffer changes the reserve need. | Finds optional buffer, explains reserve target; no false income/growth chart reading. |
| Landing / both groups | From the homepage, choose a route for a debt or savings question. | First click, time to relevant calculator, unnecessary detours; distinguishes illustration from personal result. |

Each participant completes one landing task, two segment-appropriate calculator tasks, and one result/scope explanation. At least one calculator has relevant optional controls and one has a scope notice. Log per task: study ID, country category, route slug, start/end time, unassisted/assisted/failed, first clicked control category, comprehension yes/no, serious misconception category, optional anonymous suggestion. No financial values or full URLs with input queries.

Proposed usability gate: >=8/10 participants unpromptedly discover the relevant customization and understand sample/model scope; zero serious calculation/chart misconception. Count partial failures honestly. If a failure occurs, capture the exact route/control and propose one corrective hypothesis; do not coach and then label the original attempt passed. The primary reviewer decides whether the evidence supports release quality.

## Genuine recurring-value pilot

Activation: a person creates a genuine saved decision, names a useful next action and connects/enters the current financial picture as needed. Saving a test/example without a real decision does not count. Time-to-value is from calculator entry to an understood useful answer; activation time separately records save completion. Existing analytics events may help only with opt-in consent and the current taxonomy; no new event is necessary for this protocol.

Observe a meaningful plan review >=7 days after baseline within 45 days: the person checks actual progress, revises an assumption/next step or records an explicit keep-the-plan decision. A refresh/login/session, exported file, or a forced reminder alone is not meaningful value. Use the saved-plan/review implementation and allowed aggregate event/cohort system; never query or publish real financial records for this pilot.

Gate hypothesis: >=6/20 genuinely activated plan creators return meaningfully within their full 45-day windows. Define denominator=eligible activated creators with completed windows; also report recruited, activated, withdrawn, pending windows and internal exclusions separately. Do not silently divide by 20 before everyone has equal opportunity. Week 1/month 1/month 3 definitions remain in MEASUREMENT_AND_EXPERIMENT_PLAN.md; this 45-day pilot cannot prove month-3 retention.

Weekly review of anonymized categories is sufficient; no constant polling or automated messages. Owner may invite opt-in reminders only under the existing consent/sending authorization and delivery controls; this protocol creates no outbound service or campaign. Record reasons for return and nonreturn in neutral language. If the gate misses, revise the product hypothesis before paid development.

## No-charge value/price study for later B13

After a useful decision/review, ask which proposed paid capability would remove repeated work: scenario history, household coordination, a shareable review/report or reminder automation. Ask what they use today and why they might switch. Test annual price hypotheses separately by country, with the order alternated: US $24 vs $48/year; India ₹799 vs ₹1,499/year. These are hypotheses, not approved prices, market evidence, exchange-rate equivalents or a promise to charge. No checkout, card details or payments; do not equate a stated preference with purchase. Clarify the candidate cancellation/refund/support policy before any real sale. B13 retains its original evidence and owner gates.

## Compact report schema and review boundary

Report accepted code/preview, dates, cohort denominators, consent/exclusions, table of actual task outcomes, reasons for return, misconception/defect counts, meaningful returns and incomplete windows. Report observations only; screenshots and synthetic tests establish engineering behavior, not user success. B51 remains open until genuine data is observed and reviewed. Exact owner input now: confirm recruitment capacity and observation availability, or choose to defer the study; provide no private financial records. Publication/main/production authority remains separate.
