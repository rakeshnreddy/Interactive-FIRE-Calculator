# FinPath visual and interaction audit

Date: 2026-09-07. Reviewer: primary Codex session. Repository HEAD inspected: `99c7834bd93532be503b951a58cfaa8cd2e39562`. Live immutable preview: https://75358a37.interactive-fire-calculator.pages.dev (implementation `10ccc1a`; subsequent commits changed documentation only). This is an audit and execution specification, not a claim that redesign work has shipped.

## Verdict

FinPath has a useful visual foundation: restrained teal, Inter, plain financial labels, visible assumptions, generous controls and mostly contained mobile layouts. It does not yet meet a premium product standard. The strongest weaknesses are a broken light-mode contrast cascade, a promotional first screen disconnected from the actual calculator, excessive reading before interaction, inconsistent calculator families, and charts that visually imply invalid comparisons. Improving the look should make the financial decision easier to understand, not make estimates look more certain.

The direction is a precise financial workbook: light neutral canvas, confident typography, one clearly dominant answer, quieter supporting evidence, truthful comparison charts, and deliberate space. Keep the existing Inter/teal identity. Replace the generic phone/payment-card hero with an accurately labeled example of the real planning experience. No invented financial products, testimonials, live-user counters, guarantees or mobile-app claims.

## Scope and evidence limits

Headless Chromium inspected the homepage, calculator library, FIRE, mortgage, compound interest, savings goal, budget, net worth, SIP, India income tax, retirement, and the dashboard/accounts/transactions/goals/plans/reports/settings auth boundaries. Desktop: 1440x1000. Mobile: 390x844. Additional mortgage checks: 768x1024 and 320x800. Light and dark samples were captured. Search no-match and mobile-menu Escape were exercised; FIRE Calculate was clicked. Screenshots are in [the evidence directory](design/evidence/2026-09-07/).

Seven account routes display the configuration gate. Their populated layouts are **source-reviewed only**, not visually verified. No identity was created, auth bypass added, account cookies imported or remote data written. An isolated fixture harness and an approved isolated hosted database are distinct requirements in the backlog.

This pass did not execute a screen reader, native 200% browser zoom, forced reduced-motion emulation, or a complete performance benchmark. Default browser reduced-motion query was false. A 320px viewport is a reflow sample, not proof of browser zoom. These remain explicit closure tests. Loading screenshots were recaptured after the route h1 appeared; HTTP 200 alone was never treated as a rendered-page check. Scores below are reviewer judgments on sampled evidence, not an automated certification.

## Scorecard

Scale: 0 unusable, 5 serviceable with material gaps, 8 polished and coherent, 9 exceptional with all acceptance gates passed. Aesthetic preference cannot certify accessibility or financial correctness.

| Dimension | Current /10 | Evidence and implication | Closure target |
|---|---:|---|---|
| Brand distinctiveness | 5 | Hero depicts a phone/card rather than the actual web workflow | Recognizable FinPath identity, authentic product example |
| Hierarchy and first-use clarity | 5 | Large hero, four explanatory blocks above generic inputs | Clear question, input and answer hierarchy |
| Typography | 6 | Inter consistent; savings inputs 12.16px vs FIRE 16px | 16px editable inputs, readable metadata and number scale |
| Color and contrast | 3 | Invisible Sign in; low-contrast continuity heading | Measured passing semantic pairs in both themes |
| Layout and spacing | 6 | Contained pages; repeated card stacks and long mobile introductions | Compact decision-first layout with coherent rhythm |
| Calculator consistency | 5 | Dedicated tools, generic tools and FIRE use different arrangements | Shared visual grammar with appropriate domain differences |
| Data visualization | 3 | Mixed-unit metric bars; 8% minimum width for zero values | Same-unit axes, honest zero/negative states and accessible equivalents |
| Navigation and interaction | 5 | Mobile Escape does not dismiss; signed-out nav leads with private routes | Coherent public/account navigation and keyboard behavior |
| Mobile usability | 5 | 390px samples contain horizontally; India first input at y=1206 | Inputs reachable without marketing preamble; no clipping |
| Empty/error/auth states | 4 | Search no-match useful; account gate exposes environment instructions | User-facing recovery with real next actions |
| Dark theme | 6 | Sampled surfaces are legible; complete token/interaction coverage unproven | All component states checked in both modes |
| Operational UI | Unrated | Hosted pages gated; source review alone cannot score their appearance | Fixture + hosted synthetic evidence before closure |
| Delivery of visual quality | 4 | 9,898-line stylesheet plus late overrides; no visual closure record | Stable examples, evidence and reviewer-owned acceptance |

Do not average away a failed contrast, privacy or data-truth gate. An attractive screenshot with misleading charts fails closure.

## Findings and task mapping

### V01 — Invisible desktop Sign in (critical usability)

[Homepage desktop](design/evidence/2026-09-07/home-desktop.png). Computed `.topbar-link` color is `rgba(255,255,255,0.8)` over `rgb(255,255,255)`: effective white on white, contrast 1:1. The accessible name still exists, but the visible label disappears. `src/vivid-theme.css` changes topbar text without owning all button backgrounds. Fix explicit paired foreground/background tokens for default, hover, focus and active in B15. Do not solve by hiding sign-in.

### V02 — Homepage continuity heading fails contrast

Same full-page screenshot. `.landing-continuity-band` background is `rgb(23,59,82)`; its h2 computes to `rgb(18,37,34)` despite an earlier white declaration in `src/styles.css`. Later heading rules win. Fix and measure in B15; reduce competing selectors in B16. This demonstrates why another end-of-file override is insufficient as the long-term design method.

### V03 — Stylesheet and documentation disagree

`src/main.tsx` imports `styles.css`, then `vivid-theme.css`. The first contains 9,898 lines and repeated landing rules; the second adds 242 lines. DESIGN.md canvas `#f4f7f7` differs from effective theme `#f1f6f5`; primary `#087f72` differs from `#00776d`. The problem is not that either palette is inherently bad; there is no authoritative applied contract. B16 consolidates token ownership incrementally, documents old-to-new mappings, and prohibits a mass CSS rewrite.

### V04 — Homepage promises a different-looking product

`LandingPage` in `src/App.tsx:4333` uses `/assets/finpath-product-hero.jpg`, a phone, card and coin image, while the actual site is a web calculator/workspace. The composition is visually competent but generic and may imply banking/mobile functionality not offered. B18 replaces it with a labeled, accessible, synthetic decision example based on existing calculator output. No simulated bank connection or manufactured live balances. Retain useful exact-calculator links.

### V05 — Public navigation prioritizes private destinations

Desktop header begins Dashboard, Transactions and Goals even when account access is unavailable. Several account creation actions lead to a developer configuration gate. `DesktopNavigation`, `TopbarAuthActions`, `AuthGate` and mobile navigation live in App.tsx. B17 makes public tools the primary signed-out navigation, preserves account destinations when signed in, and B09 owns user-facing unavailability copy. Do not hide a security gate by faking a signed-in workspace.

### V06 — Mobile navigation does not close on Escape

At 390px: open navigation, press Escape, `aria-expanded` remains `true`. [Evidence](design/evidence/2026-09-07/mobile-menu-after-escape.png). Desktop Workspace has Escape code; mobile menu does not share it. B17 must define non-modal disclosure behavior, Escape, focus return and route-change dismissal. Use real links for navigation and preserve modifier-click behavior. Do not add dialog roles or a focus trap to a non-modal menu.

### V07 — Generic calculators put an essay before the tool

At 390x844 on India income tax, first input top is **1206px**, result panel top **1844px**. [First viewport](design/evidence/2026-09-07/india-tax-first-viewport.png) shows explanation cards but no input. Mortgage tablet and 320px screenshots show the same problem. `CalculatorDetail` renders What it answers / Why it matters / How it fits / How to read it before the form. B20 keeps one concise scope/assumption statement above inputs and moves detailed context below the working area. Preserve substantive information; eliminate repetition, not disclosure.

### V08 — Result emphasis is too even

Mortgage has many equal metric tiles plus repeated bars. Required payment, payment with extra, term and savings compete. B20 establishes one answer, 2–4 supporting measures, followed by a domain-specific chart and optional schedule. Zero extra payment should not create a competing duplicate hero metric. Do not suppress warnings or alter calculations to simplify the screen.

### V09 — Generic charts visually compare incompatible units

`CalculatorStudioVisual` in `src/CalculatorLibrary.tsx:1078` uses one `maxVisualValue` across the first four metrics, including currency and month counts. Both chart and metric bars use `Math.max(8, ...)`; zero therefore gets a visible bar. Absolute values erase the visual sign in timeline bars. These are source-confirmed rendering problems, not changes requested to the underlying financial engines. B21 removes heterogeneous bars or groups only compatible units, uses zero-length zero bars, conveys negative direction, and labels both series with values. Accessibility text and visual geometry must agree.

### V10 — Dedicated tools improve explanation but remain tall

Mobile document heights: compound 5,874px, savings 5,545px, budget 6,138px, net worth 5,577px. Height alone is not a defect; much is useful detail. However, trust banners, multiple metric cards, repeated guidance and FAQs compete with the actual decision. B22 (compound/savings) and B23 (cash-flow family) use shared framing, concise assumption summaries, a clear result and progressively disclosed evidence. Preserve each dedicated engine and domain-specific controls.

### V11 — Savings form typography regresses

[Savings first viewport](design/evidence/2026-09-07/savings-first-viewport.png). First three inputs compute to 12.16px; FIRE, compound, budget and net worth sampled at 16px. Heights are 48px, so the issue is font hierarchy rather than small container height. B16 sets the component standard; B22 removes the savings-specific conflicting rule. Test real focus and editable values on mobile; do not rely on screenshot scale.

### V12 — Help and labels need interaction review

Generic inputs use focusable spans with `title`/aria-label; keyboard focus does not guarantee a usable visible explanation. FIRE accessibility snapshot repeats helper text within several input names. B20/B24 use concise label + `aria-describedby` help and a real disclosure button only when hidden help is needed. Full screen-reader behavior remains unverified; do not claim a failure of a specific assistive technology from DOM inspection alone.

### V13 — Library is organized, but visually monotonous

[Library](design/evidence/2026-09-07/library-desktop.png). Eight large repeated panels, repeated “Also useful” labels and prominent tool counts make scanning laborious. Search and grouped routes are useful and should stay. B19 tightens decision groups, surfaces FIRE as an explicit starting path, preserves all exact calculator routes and query state, and uses descriptive links rather than decorative repeated badges. [No-match state](design/evidence/2026-09-07/library-empty.png) already gives useful retry guidance.

### V14 — Internal copy leaks into public experience

[Auth gate](design/evidence/2026-09-07/auth-gate-desktop.png) exposes Clerk and environment variable names. Mortgage “Decision checks” includes instructions such as “Connect loan results to a liability account or payoff plan.” This expands B09's existing copy task; it is not a duplicate new task. Technical configuration stays in the runbook. Honest user copy explains unavailable account features and provides a working public-tool action.

### V15 — Authenticated aesthetic quality is unknown

Dashboard, accounts, transactions, goals, plans, reports and settings all display the same gate. `DashboardPanel`, `TransactionsPanel`, `GoalsPanel`, `AccountsPanel`, `PrivacyControlsPanel`, `InsightsPanel` and `PlanningWorkspace.tsx` provide the source starting points. B25 introduces local synthetic component fixtures with no deployed auth bypass. B26–B30 polish real components, and B06 supplies safe hosted validation. A fixture screenshot must be labeled synthetic and cannot establish persistence or tenancy safety.

### V16 — Long-term visual quality lacks a closure system

No submitted/reviewed distinction, canonical screenshot cases or immutable approval records existed in the previous checklist. [Execution protocol](execution/README.md) now specifies task prompts, evidence packets, checkpoint gates, exact code revisions and primary-reviewer-only closure. B31 completes the cross-surface accessibility/performance regression matrix after changes. Documentation preparation does not count as UI implementation.

## Keep and strengthen

Keep public calculator routes, Inter, tabular numerals, teal identity, the existing restrained radius, honest assumption language, default-collapsed long schedules, useful search, and dedicated calculator explanations. Sampled input heights are 48px. All eight mobile calculator geometry samples fit 390px horizontally; mortgage also fits 320px. These strengths must survive redesign.

The style brief is in [VISUAL_DESIGN_SPEC.md](VISUAL_DESIGN_SPEC.md). New tasks are B15–B32 (including the 2026-09-08 color amendment), integrated with B01–B14 in [EXECUTION_BACKLOG.md](EXECUTION_BACKLOG.md). They are planned, not complete.

## Standards and interpretation

Reviewed 2026-09-07: [WCAG 2.2](https://www.w3.org/TR/WCAG22/) supports the contrast, reflow, keyboard and focus requirements; [WAI disclosure pattern](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) informs disclosure controls. FinPath's 44px interaction target is a product standard, stricter than the WCAG 2.2 AA 24px minimum subject to its exceptions. [Web Vitals](https://web.dev/articles/vitals) defines LCP, INP and CLS; field targets are not certified by a single local run. Visual direction and scores are this reviewer's judgments, not claims made by those sources.
