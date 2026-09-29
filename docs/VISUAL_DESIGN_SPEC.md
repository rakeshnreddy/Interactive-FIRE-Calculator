# FinPath visual implementation contract

2026-09-07. Proposed target for B15–B32, not a description of shipped improvements. This operationalizes PRODUCT.md and DESIGN.md. Those documents retain the product constraints; this contract defines reviewable visual details. Do not replace Inter, introduce a new logo, or invent a financial product to achieve novelty.

Color amendment 2026-09-08: [COLOR_AND_GLASS_SYSTEM.md](COLOR_AND_GLASS_SYSTEM.md) is the more recent authority for palette, gradients and glass. User-requested gradients and bounded glass are allowed; prior blanket restrictions on them are superseded. Typography, composition and objective quality gates below still apply.

## Design thesis

A precise financial workbook with editorial clarity. The question is obvious, the primary answer is legible, the supporting evidence explains its limits, and the next action is honest. Distinctiveness comes from deliberate typography, excellent charts, concise language and coherent composition. Avoid device mockups, ornamental finance cards, gradient financial digits, glass that reduces readability, giant shadowed cards, emoji branding and invented trust badges.

## Tokens and type

B16 establishes canonical role ownership using the documented palette as a temporary baseline; B32 applies COLOR_AND_GLASS_SYSTEM.md as the target palette and must verify contrast of actual pairs, and record any necessary adjustments in DESIGN.md and a token mapping table. Do not retain two conflicting palettes merely to avoid touching CSS. Use CSS custom properties for roles, not individual page colors.

Roles: canvas, surface, inset surface, heading, body, muted text, border, control border, primary/hover/pressed foreground and background, focus, success, warning, danger, data series 1–4. Include corresponding dark and inverse-surface roles. A semantic token must pair foreground and background; ordinary heading tokens must not override inverse-section text. Teal is action/current plan, blue is comparison, coral is sparse emphasis, semantic warning/error retains meaning. Chart series need text/pattern differentiation as well as color.

Use the existing locally bundled Inter Variable. Body and editable inputs: 1rem/1.5. Labels and supporting metadata: 0.875rem/1.4; genuinely secondary captions may be 0.75rem minimum. Page h1: 2.5rem desktop / 2rem small screens, 1.15–1.2 line-height. Homepage h1 may reach 3.5rem desktop, 2.5rem small screens. Section h2: 1.5rem; panel h3: 1.125rem. Primary result: 2.5–3rem desktop / 2–2.5rem mobile, with explicit units and time horizon adjacent. Use rem-based steps and media queries, not viewport-only font scaling. No letter spacing. Use weights 400–680 and tabular numerals for changing values and tables. Financial values must wrap or scale within this range without losing digits; never truncate a balance with ellipsis.

Main width 1200px, calculator width 1180px; gutters 16px mobile, 24px tablet, at least 32px wide desktop. Spacing scale 4/8/12/16/24/32/48/72px. Radius 4px small badges, 6px controls, 8px panels maximum. Ordinary content uses borders or spacing, not diffuse shadow. Reserve shadows for genuine overlays. No global `overflow-x:hidden` to conceal broken layout.

## Composition by surface

### Public home

Desktop: concise question-led copy and one primary public calculator action on the left; a labeled synthetic example of the real FIRE result/comparison on the right. Explain the example's currency, horizon and assumptions. Use existing computed output captured in a fixture, not independently invented finance math. At 1440x900 the example's main answer and primary action should be visible without scrolling. Mobile: headline, short purpose, working public action, compact example, then decision links. Main public action should appear within the first 600 CSS px at 390px width under normal text settings. These placement targets relax under zoom/text enlargement to preserve readability.

Suggested copy direction: “A clearer answer. A plan you can revisit.” Supporting copy must describe available behavior. A synthetic preview can describe the planned review loop only if explicitly labeled as a preview, never as an already working account feature. Retain exact mortgage, compound-interest, debt and FIRE links. Replace the repeated feature grid with one concrete calculate → understand → revisit narrative. Authentication unavailable is a real state, not a CTA that loops to an engineering message. Footer must use honest privacy/education wording, with links only to existing substantive destinations; no placeholder legal pages.

### Calculator library

Search, 3–4 clear decision starting points, then eight compact toolkit groups with progressive disclosure. Counts are secondary. FIRE must be discoverable by its exact name even if separate from the 82 registry calculators. Keep every route, keyboard search, no-match guidance, query refresh/back behavior and native link semantics. Do not add filters without a clear query-state contract. No result cards nested inside promotional cards.

### Generic calculator

Order: exact title and short scope → inputs + primary answer → chart / scenario comparison → optional detailed schedule → assumptions/method → related next tools. Desktop inputs and answer align at their top edges. Mobile has one logical DOM reading order; avoid visual reordering that contradicts keyboard order. At 390x844 first editable control should appear within 650px for the representative mortgage/SIP/India-tax fixtures at normal text settings. Move repeated introductory prose beneath the working area. Keep one material assumption sentence visible.

One primary answer; 2–4 essential supporting measures; secondary detail via clearly labeled disclosures. Editing, valid zero, negative where allowed, invalid, loading, save failure and stale-result states must be distinct. Do not rewrite generic parsing and all calculator formula validation inside a styling task. If a broken numeric contract is discovered, record the exact case and request a bounded follow-up.

### Dedicated compound/savings and cash-flow families

Same page header, form, result and evidence hierarchy. Preserve dedicated formulas, currency interpretation, scenario semantics and schedule audits. Reduce the three-row trust banner to concise scope text with detail below the calculation. Label compare views consistently. Inputs remain editable at 16px; errors sit beside fields and are programmatically associated. Do not turn budgeting into an investment return chart. Keep money flowing in/out and assets/liabilities visibly different.

### FIRE

Keep FIRE-number and withdrawal modes. Shorten the preamble; make timeline ages, spending units and assumptions explicit. Before calculation, show useful input guidance without presenting invented results. After calculation: primary required portfolio or supported withdrawal; gap/context; chart; warnings; expandable assumptions. Keep warnings close to the result and reachable on keyboard. Changes to input must not silently leave an old answer looking current. Do not alter `src/lib/fire.ts` in B24. Preserve draft/import/export and future saved-version compatibility.

### Authenticated workspace

Fixture-first design, then actual isolated hosted proof. Dashboard: dated financial snapshot and review-due action, then accounts/cash flow/goals. Separate cash balances from projections and group currencies safely. No fabricated trend line without history. Transactions: readable aligned amount/date/description/category rows, usable filters and a contained table or equivalent mobile list. Imports: choose file → mapped preview → row errors → explicit confirmation → truthful completion. Never imply an import succeeded because a panel closed.

Goals/plans: target, current evidence date, gap and next review; statuses combine text and symbol. Reports: explain period, included data and missing data; tables/export remain usable without chart interaction. Settings: personal preferences separate from data lifecycle; export and deletion are visible, plain and precise. Destructive controls need specific consequence confirmation and server-confirmed completion. UI copy must match B07's actual erasure boundary.

## Component states

Every changed interactive component needs default, hover, focus-visible, pressed/selected, disabled, busy and error states where applicable. Use native button/link/input/select/details semantics. Label icon buttons. A disclosure is not a menu or dialog unless its interaction model actually requires that role. Keep helpers available by touch and keyboard, not title-only. Use `aria-describedby` for help/error; do not repeat helper prose in the accessible name. Announce completed actions politely without announcing every changing financial number on every keystroke.

Motion: 120–180ms only for direct feedback, explicit properties, no entrance choreography or chart tween required to understand results. Reduced motion must suppress non-essential transforms/animation. Reduced transparency needs an opaque fallback. Respect forced colors; do not remove native focus without a replacement. Sticky headers/results must not obscure fields or focused content at zoom or small height.

## Data visualization truth contract

Never compare dollars, percentages and months on one numerical scale. No fixed minimum nonzero fill for zero values. Show negative direction and a labeled zero baseline where relevant. One chart should answer one decision question. Prefer an existing chart dependency or simple semantic HTML/SVG; no new chart framework. Use matching units within each plotted domain. Provide legend labels with visible swatches/patterns, accessible text or table and readable values for both series. Tooltips may supplement, never exclusively carry, material information. Preserve exact values separately from rounded display. Do not change engine results to make a chart prettier.

## Quality gates

1. No open critical/major visual, keyboard, data-integrity, privacy or auth defect on changed surfaces. Reviewer marks any accepted minor issue with a follow-up ID; “looks good” is not evidence.
2. Contrast measured from composited effective styles: normal text >=4.5:1, qualifying large text >=3:1, required UI boundaries/status graphics >=3:1. Exceptions must cite applicable criteria. Product target: 44x44px actions or equivalently generous hit area; inline text links follow a documented exception, not oversized line boxes everywhere.
3. Viewport cases: 1440x900, 1024x768, 768x1024, 390x844, 320x800. Light/dark for changed components; representative normal/empty/error/loading/long-number states. At least one real browser 200% zoom run. 320px alone is not zoom evidence.
4. Keyboard: skip link, full task, disclosure Escape/focus return, route focus and no trap. Screen-reader smoke for changed labels, results, errors and dialogs. If unavailable, record blocked evidence and submit for review; do not claim pass.
5. Reduced motion and reduced transparency via actual supported emulation or OS/browser setting. Record method. Do not substitute deleting CSS from a screenshot.
6. No body horizontal overflow except a deliberately labeled, keyboard-accessible data-table region; no overlap, clipped digits, hidden error, offscreen focused control, or sticky obstruction. Test long localized currency and negative/zero values using synthetic data.
7. Performance: retain recorded build/chunk sizes, avoid new dependencies by default. Reproducible three-run before/after lab measurement, same browser/version/device/network/cache policy. Field goals: LCP <=2.5s, INP <=200ms, CLS <=0.1 at the 75th percentile when sufficient real-user data exists. These are goals, not current verified results. No >10% median lab regression without explicit reviewer explanation; do not call a single Lighthouse score proof of speed.
8. Visual rubric: hierarchy, typography, spacing, color, chart clarity, states and responsive composition each >=8/10; target average >=9/10 on independently reviewed representative screenshots. Reviewer must justify scores with concrete evidence. These subjective scores do not replace gates 1–7 or promise “the world's best website.”

## Screenshot protocol

Capture an unchanged baseline before editing and the final same route/state/viewport/theme afterward. Wait for real UI readiness and document fonts to load. Name files `{task}-{route}-{state}-{theme}-{width}-before/after.png`. Include viewport crops for hierarchy and full-page shots for rhythm. Evidence must be committed or attached at a durable PR URL, with code commit and immutable preview recorded. Synthetic examples carry a visible fixture label. Avoid real account screenshots. Never approve a loading placeholder as the final page.
