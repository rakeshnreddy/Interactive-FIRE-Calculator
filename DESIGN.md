# FinPath Design System

## Direction

FinPath uses a vivid precision aesthetic: calm operational surfaces, crisp typography, restrained borders, and a purposeful full-palette decision system. The interface should feel like a well-made financial workbook translated into a modern application, with enough color to create energy and orientation without becoming promotional or noisy.

## Color

### Light

- Canvas: `#eef3fa`
- Surface: `#ffffff`
- Surface strong: `#ffffff`
- Soft surface: `#f1f5fb`
- Ink: `#0f1e2e`
- Muted ink: `#465a6e`
- Border: `#d6dfeb`
- Control border: `#7c8fa3`
- Primary teal: `#0b7c6c`
- Data blue: `#3b6cf0`
- Supporting violet: `#7a63d9`
- Warm accent: `#d9653f`
- Success: `#178a5c`
- Warning: `#9a5a00`
- Danger: `#c4385a`
- Focus ring: `#3b6cf0` plus surface gap

### Dark

- Canvas: `#070d16`
- Surface: `#0f1a29`
- Surface strong: `#132234`
- Soft surface: `#0a1320`
- Ink: `#eef5fb`
- Muted ink: `#9fb3c4`
- Border: `#263a52`
- Control border: `#5f7690`
- Primary teal: `#5fe6c8`
- Data blue: `#8fb7ff`
- Supporting violet: `#c1b0ff`
- Warm accent: `#ff9b78`
- Success: `#7fe0b3`
- Warning: `#f4c46f`
- Danger: `#ff96ad`
- Focus ring: `#8fb7ff` plus surface gap

Teal identifies primary actions and current state. Cobalt supports growth, charts, and comparison. Warm coral identifies long-term or consequential decisions. Gold is reserved for warnings and select chart emphasis. Solid color bands may identify major decision families on public pages; operational pages use the same hues as thin hierarchy accents. Semantic colors retain their meaning. Keep financial text in a solid semantic ink. Gradients belong to the restrained entry atmosphere or primary action; never use color without a readable information role.

## Typography

Use Inter Variable throughout. Product headings use 600-680 weight; body copy uses 400-520; labels use 550-650. Letter spacing is always `0`. Use fixed rem-based sizes, balanced headings, and tabular numerals for financial values. Hero type may be larger, but compact panels keep compact headings.

## Layout

- Main product width: `1200px` with responsive side padding.
- Calculator reading width: `1180px`.
- Spacing follows a 4px base with practical steps of 8, 12, 16, 24, 32, 48, and 72px.
- Cards and controls use at most an 8px radius.
- Operational pages favor dense grids and aligned rows. Public pages use more whitespace but still expose the actual product in the first viewport.
- Avoid nested cards. Inside a framed tool, use dividers, bands, rows, or unframed groups.

## Surfaces

Ordinary content surfaces are opaque and border-led with a minimal shadow. Glass is reserved for sticky navigation, dropdown menus, and primary grouped work surfaces, using a solid fallback and reduced-transparency override. Full-width public decision bands may use solid teal, cobalt, coral, or deep blue. Avoid large diffuse shadows, decorative blur, and glass applied to every item.

## Components

- Primary button: filled teal, 44-48px height, 8px radius.
- Secondary button: neutral surface with a clear border.
- Icon button: square, 40-44px, tooltip or accessible label.
- Inputs: explicit labels, helper text where needed, visible focus, tabular numerals.
- Segmented controls: compact, bordered, and used only for mutually exclusive views.
- Toolkit panel: one decision-family summary with a small route list, never a card grid inside a card.
- Detail table: collapsed by default where long, scroll-contained on small screens, and exportable when the underlying schedule is useful.
- Optional calculator inputs: collapsed by default, explicitly labeled as optional, and initialized to a neutral zero value.
- Additional payments: show required payment, payoff period, time saved, total interest, interest saved, and a schedule that reconciles with the headline result.
- Navigation: expose frequent destinations directly and group lower-frequency account, plan, report, and settings destinations in an accessible disclosure.

## Implemented token and primitive foundation

`src/vivid-theme.css` is the single runtime owner for shared light/dark tokens. Historical selectors in `src/styles.css` may consume the compatibility aliases below, but that file no longer declares competing values for them. New work uses the semantic `--color-*`, `--space-*`, `--radius-*`, typography, and control-size roles directly. B32 may update the semantic color values for the approved glass/gradient direction without creating another token stack.

| Existing alias | Canonical role |
|---|---|
| `--canvas` | `--color-canvas` |
| `--surface`, `--surface-strong`, `--surface-soft`, `--field-bg` | `--color-surface`, `--color-surface-strong`, `--color-surface-inset`, `--color-field-surface` |
| `--heading`, `--text`, `--muted`, `--muted-strong` | `--color-heading`, `--color-body`, `--color-muted`, `--color-muted-strong` |
| `--border`, `--border-strong` | `--color-border`, `--color-control-border` |
| `--accent`, `--accent-hover`, `--accent-contrast` | `--color-primary-bg`, `--color-primary-hover-bg`, `--color-primary-fg` |
| `--success`, `--warning`, `--danger` | `--color-success`, `--color-warning`, `--color-danger` |
| `--chart-primary`, `--chart-secondary`, `--warm` | `--color-data-1`, `--color-data-2`, `--color-data-3`; `--color-data-4` completes the shared series set |

Paired interaction roles include primary default, hover, pressed, foreground and focus colors in each theme. The inverse surface has separate heading/body roles, so global heading rules cannot silently turn inverse copy dark. Controls use the 4/8/12/16/24/32/48/72px spacing scale, 4/6/8px radii, 1rem/1.5 editable text, and the following hit-area contract:

- Buttons using the shared application primitives have a 44px minimum block size; icon buttons are 44×44px.
- Editable fields retain their existing 44–48px minimum height and render text at 16px under default browser settings.
- Breadcrumb controls are the documented inline-text exception. Their surrounding route header supplies separation, and they retain a visible focus outline; they are not primary touch actions.
- Disabled controls remain labeled, busy buttons may use `aria-busy="true"`, invalid fields retain a semantic danger boundary, and selected controls preserve text/ARIA state in addition to color.

## Motion

Use 120-180ms opacity, color, border, and transform transitions. Movement is limited to direct feedback such as a 1px lift or disclosure rotation. Honor `prefers-reduced-motion` and never use `transition: all`.

## Content

Use exact calculator phrases for calculator page titles. Use user-centered toolkit names for browsing. Explain what a calculator answers, what each input means, what each result means, and which assumptions can change the outcome. Never mention search rankings, SEO, traffic, conversion funnels, or internal regional targeting in product copy.

## Owner-directed material update (2026-09-08)

The owner requested glassmorphism and gradients in both light and dark themes. [COLOR_AND_GLASS_SYSTEM.md](docs/COLOR_AND_GLASS_SYSTEM.md) defines the target palette and material behavior; [VISUAL_DESIGN_SPEC.md](docs/VISUAL_DESIGN_SPEC.md) defines composition and verification. Task B32 applies the luminous mineral palette, bounded glass for navigation and overlay surfaces with solid fallbacks, static atmosphere gradients on public stages, action gradients with paired hover/pressed states, and a distinctly light/dark hero treatment while maintaining strictly opaque reading surfaces behind financial inputs and calculator results.

## Verified UX refinement — 2026-09-30

`src/vivid-theme.css` defines the executable light/dark palette above. These values supersede the older proposal in the fresh audit; the proposal was not a deployed theme. Navy ink/solid surfaces carry reading, teal carries actions and cobalt carries comparisons. Public entry/navigation may use the existing bounded gradient/glass roles and solid fallbacks. The illustrative money answer, calculator inputs and results remain opaque. No new global palette is introduced by the landing refinement.

Homepage reading order: one clear question, public action/search, three decision paths, then optional example detail. The example's one main answer comes from the genuine FIRE engine fixture and is labeled illustrative; the explanatory chart/current-savings comparison remains inside a keyboard-accessible disclosure. Account creation stays a quiet secondary action. Library breadth is a secondary catalogue detail, not the value proposition.

## Luminous Observatory foundation — 2026-10-28 (B70/C31)

This dated direction supersedes the earlier radius and motion limits **for the application shell only**. FinPath keeps Inter Variable, opaque reading surfaces and tabular financial values. A mineral teal accent, daylight canvas and deep navy night theme support quiet instrument-like navigation; the footer uses a solid navy reading surface in both themes. Home, library, calculator, chart and workspace compositions retain their accepted designs until their own checkpoints.

`src/app.css` is the single CSS entry point. It declares `accessibility, legacy, tokens, shell` in that order. All unchanged component rules from `styles.css` and `vivid-theme.css` share the **same legacy layer**, preserving their previous source order and specificity. The 208 conflicting shell selectors have been removed from those files; `src/shell.css` owns the new navigation, shared footer, eyebrow ink and route animation. This is a bounded migration, not retirement of the remaining legacy styles (B76).

`src/vivid-theme.css` remains the sole semantic token owner. Six-digit sRGB token fallbacks have calculated OKLCH equivalents under a feature query; these are conversions of the accepted palette, not the unverified hex/OKLCH pairs in the earlier mood board. The light control boundary is strengthened to `#6b8096`; eyebrow ink is `#075f52` in light and `#5fe6c8` in dark. Navy footer text, muted text and teal accents have dedicated roles. Future stages must measure rendered/composited pairs, including translucent navigation, rather than quote a palette-only ratio. Financial digits remain solid ink and retain tabular numerals.

Shell controls have 10px radii, overlay menus 14px radii and at least 44px targets. The sticky navigation uses at most 16px backdrop blur with an opaque fallback. Reduced transparency removes blur and supplies a solid surface; forced colors use system colors. Normal shell rules outrank legacy normal rules. Accessibility exceptions are in the first layer because [important layer precedence reverses](https://www.w3.org/TR/css-cascade-5/). Unlayered runtime styling would outrank these normal layers and must not be added as an override shortcut.

Eyebrows now use solid semantic text, resetting background clipping and transparent text fill. The preserved screenshots show the former gradients painted visible glyphs; transparent computed `color` alone did not prove the audit's claimed 1:1 contrast or 22 invisible routes. Error eyebrows retain danger ink. The evidence must report the actual measured route/family count and any residual contrast failures; this change does not establish WCAG conformance.

Optional route transitions fade the main content over 120–160ms with a 3px entry offset. Browser history changes synchronously; interrupted navigation commits in order and failed snapshots fall back to one route update. Unsupported browsers and reduced-motion users navigate directly. The existing dirty-plan warning, route-heading focus, fragment scrolling and explicit result reveal remain part of the functional contract. The browser's [View Transition lifecycle](https://developer.mozilla.org/en-US/docs/Web/API/Document/startViewTransition) is progressive enhancement, never a prerequisite for reaching a page.

Before/after, responsive, rendered contrast and performance evidence belong to `docs/execution/evidence/C31/`; acceptance and deployment receipts belong to the C31 review. C31 implements this foundation; its review and release receipts govern acceptance. Later page and chart redesigns remain separately bounded checkpoints.


## Homepage stage — 2026-10-28 (B78/C38)

The Luminous Observatory homepage now uses a full-width atmospheric introduction, working topic finder, ruled decision rows and one opaque engine-backed FIRE example. Existing Inter, light/dark tokens and financial-number semantics remain. The three-step explanation and principles use editorial spacing and rules rather than nested cards. The fixture and collapsed chart/assumption disclosure retain their original math and language. Search delegates to existing library query URLs; no registry or new dependency enters the homepage.

`src/home.css` owns homepage layout in the `home` layer between tokens and shell. Homepage-only legacy selectors and homepage alternatives inside shared functional selector groups are removed from styles.css/vivid-theme.css; shared alternatives remain. `landing-workspace` restores full-width geometry after migration. Tokens remain in vivid-theme.css; global eyebrow, nav, footer and route motion remain shell.css. Scoped links have short movement feedback with reduced-motion removal; reduced transparency and print use opaque surfaces. This dated homepage layout supersedes prior card/hero spacing while keeping B70 palette and control conventions.

Homepage-scoped exceptions: display headings use fluid clamp sizes and -0.035em/-0.025em tracking; the example’s large tabular metric uses -0.035em. These deliberately supersede the older universal fixed-rem/zero-tracking display rules only on this page. Controls/reading typography keep their existing face; the editable finder is16px. Home control/finder/example radii10/12/14px supersede the historical8px cap under the owner’s visual authority, while shared defaults remain owned by B70 and legacy styles. The interface is client-rendered: prerendered pages provide an SEO heading/body, not a complete no-JavaScript application. The finder’s native GET contract applies to the rendered form if its handler cannot run.

## Unslop Stage A — Calculator library & shared studio template — 2026-11-10 (B74/C36)

Under the owner's `/unslop` directive (`/Users/Rakesh/.gemini/config/skills/unslop/SKILL.md`), Stage A applies the 9-pass redline craft across the calculator library (`/calculators`) and the shared calculator studio template (`src/CalculatorLibrary.tsx`, `src/studios.css`, `src/vivid-theme.css`, `src/app.css`):

- **Product.** FinPath is a free, account-optional personal-finance decision and planning workbook for US and India households across 84 public calculators and a private saved-plan workspace.
- **Character.** Calm, exact, a little warm.
- **World.** Financial ledger paper, crisp 1px ruling lines, and mineral teal ink by day; instrument-grade dark slate by night.
- **Moments.** The calculator result ledger and studio comparison chart — where the primary tabular answer and semantic series bars carry visual weight while surrounding inputs, panels, and navigation stay quiet.
- **Signature.** Ruled reconciliation equations and 1px hairline ledger dividers with tabular figures across every decision card, scenario table, and sensitivity driver.

**Superseded rules and cascade ownership:**
- `src/app.css` declares `@layer accessibility, legacy, tokens, home, studios, shell;` and imports `src/studios.css`.
- Supersedes the 2026-09-08 glass/gradient card treatment on public library and calculator studio panels: `.app::before` radial atmosphere blobs (`--app-atmosphere`) are removed (`none`), multi-stop `--action-gradient` and colored glow shadows on `.primary-button` and `.calculator-region-filter button.active` are replaced with solid semantic fills (`var(--color-primary-bg)`), default `backdrop-filter` glassmorphism on `.panel`, `.calculator-toolkit`, `.starting-path-card`, and `.calculator-card` is replaced with solid opaque surfaces (`var(--color-surface)`) and `1px solid var(--color-border)` hairlines, and 3px colored top accent stripes on `.calculator-input-panel`, `.calculator-result-panel`, `.calculator-explanation-panel`, `.calculator-related-panel`, and `.calculator-card-fire` are retired.
- Supersedes `999px` pill overload and `700`–`850` font weights across calculator studio controls: panels use `12px` outer radii, inner cards/tables/charts use `8px` radii, and controls/buttons/tabs use `6px`–`8px` radii; typography uses weights `400`–`600` in sentence case (`text-transform: none`) with `font-variant-numeric: tabular-nums` on all numeric outputs.
- Icons inside studio headings and disclosures (`.feature-icon`, `.calculator-toolkit-icon`) render as bare 16–18px muted line icons (`color: var(--color-muted)`) without decorative tinted boxes.
- Hover card lifts (`transform: translateY(-2px)`) are replaced with `160ms cubic-bezier(0.22, 1, 0.36, 1)` border and surface transitions with a full `prefers-reduced-motion: reduce` fallback.

## Unslop Stage B — Dedicated calculators, charts, workspace & legacy CSS retirement — 2026-11-10 (B76/C39)

- **Scope.** Complete the `/unslop` visual overhaul across dedicated calculator routes (`/calculators/fire`, `/calculators/compound-interest`, `/calculators/savings-goal`, `/calculators/budget`, `/calculators/net-worth`, `/calculators/emergency-fund`, `/calculators/xirr`, `/calculators/lease-vs-buy`), shared Recharts/CSS charts (`src/ProjectionChart.tsx` and inline chart components), signed-in workspace routes (`/dashboard`, `/accounts`, `/transactions`, `/goals`, `/plans`, `/reports`, `/settings`), and retire all remaining visual slop from `@layer legacy` (`src/styles.css`, `src/vivid-theme.css`).
- **Cascaded Layer Structure.** Register `@layer workspace` in `src/app.css` after `studios` and before `shell`: `@layer accessibility, legacy, tokens, home, studios, workspace, shell;`.
- **Charts & Instruments.** Standardize Recharts `LineChart` gridlines to subtle 1px solid horizontal rules (`vertical={false}`), 2px strokes (`strokeWidth={2}`), tabular numeric axis/tooltip formatters, subtle cursor wash, and quiet inline bars/meters (keeping `repeating-linear-gradient(` strictly where needed for colorblind-safe pattern redundancy).
- **Typography, Icons & Surfaces.** Cap weights at `<= 600` (`400`, `500`, `600`), eliminate `text-transform: uppercase`, `backdrop-filter` blur, non-repeating gradients, `border-radius: 999px` pill overload, and hover `translateY` lifts across legacy and workspace CSS. Normalize Stage B Lucide icons to `16px`/`18px` with `strokeWidth={1.5}` and bare `.feature-icon` presentation, and remove the trailing period from `#plans-title` (`Build a plan you can revisit`).

## Unslop Stage C — Homepage, application shell & footer — 2026-11-21 (B79/C40)

- **Scope.** Complete the 9-pass `/unslop` visual overhaul across the two surfaces designed before `/unslop`: the homepage (`src/home.css`, `src/LandingPage.tsx`, `src/lib/landingContent.ts`, `src/HeroFireExample.tsx`) and the application shell/footer (`src/shell.css`, `src/vivid-theme.css`).
- **Quiet Chrome & Surfaces.** Retire the `.landing-hero` radial color wash, the `.topbar` frosted-glass `backdrop-filter` blur and doubled hairline `box-shadow`, the `.landing-hero-example` 3px top accent stripe and large tinted floating shadow, and the `<linearGradient id="heroGradient">` fill inside `HeroFireExample`. Neutralize `--shadow-overlay` (`0 8px 24px rgba(0, 0, 0, 0.06)` light, `0 8px 24px rgba(0, 0, 0, 0.32)` dark) and `--shadow-rest` (`0 1px 2px rgba(0, 0, 0, 0.05)` light, `none` dark).
- **Spacing, Radii, Type & Copy.** Put `src/home.css` and `src/shell.css` on the 4px spacing grid while preserving the 44px hit-area contract for interactive navigation and footer controls. Unify container radii to `<= 12px` with nested math (`12px` menus/finder with `4px` padding hold `8px` controls; `4px` inner input focus). Limit font weights to `400`, `500`, `600`, drop trailing periods from single-line landing headlines, narrow the hero to one primary CTA (`See when you could retire`), one secondary CTA (`Find a calculator`), and a secondary `Search` finder submit, quiet footer column headings to `--color-footer-muted`, normalize Lucide icons to `16px`/`18px` at `strokeWidth={1.5}`, and align transitions to `160ms cubic-bezier(0.22, 1, 0.36, 1)`.

## Unslop Final Polish — Sitewide WCAG Contrast, Links & Legacy Alignment — 2026-11-21 (B80/C41)

- **Measured WCAG 2.2 AA Contrast Repair.** Fixed every remaining light-mode sub-4.5:1 pair detected across live OKLCH-resolved Chrome contrast audits: switched `.info-dot`, `.row-number`, `.pill`, tinted status/review badges (`.transaction-type-transfer`, `.goal-status-active`, `.review-badge-deferred`, `.review-badge-revise`, `.historical-version-banner .source-tag`, `.dashboard-calculator-card span`, `.compound-scenario-picker span`, `.calculator-card-meta`, `.calculator-comparison-grid span`), and `.compound-base-label` (bumped to `12px`) from `--accent` to `--color-primary-ink`; hardened light-mode `--color-success` (`#116b46`) and `--color-danger` (`#b02a4b`) with exact OKLCH equivalents so text on soft tinted badges clears `4.5:1`; and changed chart legend text labels (`.compound-chart-legend`, `.savings-runway-chart .compound-chart-legend`) to neutral `--color-body` while keeping series colors and colorblind-safe patterns strictly on `::before` swatches.
- **Semantic Links, Dark Overscroll & AuthGate Headings.** Replaced browser-default `#0000ee`/`#9e9eff` links on `.starting-path-card` (`src/studios.css`), `.calculator-methodology-panel a`, and dedicated calculator prose links (`src/workspace.css`) with `--color-body` / `--color-primary-ink`; synchronized dark-mode `html`/`body` background (`:has(.app[data-mode="dark"])`) to prevent white overscroll flashes; removed trailing periods from all three `AuthGate` H1 titles in `src/App.tsx`; and normalized the final 13 oversized legacy radii (`12` `14px`/`16px`/`18px` + `1` `50%`) and `2` `font-weight: 560` rules in `src/styles.css`.

## FIRE Calculator Split Financial Workbench & Default-Visible Projection — 2026-11-21 (B81/C42)

- **Above-the-Fold Split Financial Workbench (Option A).** Replaced the single-column `1,561px` vertical form stack on `/calculators/fire` with a 2-column `.fire-workbench-grid` inside `.workspace:has(.fire-workbench-grid)` (`minmax(450px, 500px) minmax(0, 1fr)` on `>= 1041px`, graceful single-column stack on `<= 1040px`).
- **6-Column Subgrid Input Workbench (`.fire-workbench-inputs`).** Paired `Planning question` and `Currency` (`span 3` each), grouped `Current age`, `Retirement age`, and `Plan end age` into a 3-across Age Triad (`.fire-age-field`, `span 2` each down to `381px`), paired money and rate fields 2-across (`span 3` each on `>= 601px`, `1 / -1` on `<= 600px`), unified `.calculator-input-control` into a single-border inline-unit box (`34px` high), and refined `.app.app .info-dot` to a `24×24px` WCAG 2.2 AA target so label rows stay compact and baseline-aligned.
- **Default-Visible Interactive Projection Stage (`.fire-workbench-outputs`).** Defaulted `calculatorPanel` to `'results'` and set `calculateNow()` / `applyLoadedSnapshot()` to `'results'`. Reordered the right-hand output stack so `.hero-result` (`Required FIRE number` / `First-year withdrawal` + retirement age summary), `.result-tabs-panel` (`Inputs | Results | Compare`), and `#results.chart-panel` (`Year-by-year cash flow` interactive Recharts `ProjectionChart` with `height={205}` and `isAnimationActive={false}`) sit above `.health-panel` and fit 100% inside a `1440×900` viewport without scrolling (`inputs.bottom: 876px`, `chartPanel.bottom: 836px`). Prior to calculation, `.fire-workbench-preview` explains the 3 output modules in place.

## FIRE Calculator `/unslop` Redline — Optional Refinements, Structured Repeat Cards & Ledger Table — 2026-11-21 (B82/C43)

- **1-Column Optional Refinements & Structured 6-Column Repeat Cards (`.fire-workbench-inputs .advanced-shell`).** Overrode the legacy 2-column `.planner-grid` inside `.fire-workbench-inputs` (`grid-template-columns: minmax(0, 1fr)`) so every refinement group (`Market periods`, `Retirement model options`, `One-off events`, `Recurring income streams`, `Recurring spending phases`) receives the full input-workbench width inside compact `12px` inset ledger cards (`border-radius: 8px`). Replaced overflowing multi-column horizontal rows with `32px repeat(3, minmax(0, 1fr)) 32px` on `.period-list .repeat-row` (wrapping cleanly on `<= 420px`) and 6-column structured cards (`repeat(6, minmax(0, 1fr))`) on `.event-row` (`Label` `span 5` + `×` `span 1` on row 1; `Year` `span 2` + `Amount` `span 4` on row 2) and `.recurring-row` (`Label` `span 5` + `×` `span 1` on row 1; `Start`/`End`/`Annual` `span 2` each on row 2; ruled inline `Growth` segmented bar on row 3). Reset `.fire-workbench-inputs { order: 0; }` so mobile (`<= 720px`) keeps inputs before outputs in reading order.
- **Right-Aligned Tabular Cash-Flow Ledger, Compare Cards & Auto-Fit Plan Health (`.fire-workbench-outputs`).** Scoped `#results .table-wrap` to `max-height: 320px; overflow: auto;` with sticky `thead th`, `min-width: 640px` on `#results table`, compact `8px` cell padding, and right-aligned tabular figures on columns `3..11` (`:is(th, td):nth-child(n+3)`), fitting all 11 columns across the desktop right-hand stage without horizontal clipping. Switched `.health-grid` to `repeat(auto-fit, minmax(200px, 1fr))` to eliminate the orphan 4th column slot, added 1px ledger dividers and `32px` shift inputs to `#compare .scenario-card` (stacking `1fr` on `<= 900px`), quieted `.estimate-customization` into a bottom-ruled header bar, and wired the `Inputs` tab in `.result-tabs-panel` to open `#fire-optional-refinements`.

## Stage 1 — Shared Studio Option A Split Financial Workbench (75 Calculators) — 2026-11-21 (B83/C44)

- **Wide Option A Split Workbench (`.workspace:has(.calculator-detail)`).** Brought the calm Option A Split Financial Workbench from `/calculators/fire` to all 75 shared studio calculators (`src/CalculatorLibrary.tsx`, `src/studios.css`, `src/workspace.css`, `src/styles.css`): expanded `.workspace:has(.calculator-detail)` to `min(1320px, calc(100% - 2rem))`, compacted `.calculator-detail > .calculator-library-heading` into a 2-column header with the toolkit backlink right-aligned on `>= 721px`, and set `.calculator-detail-grid` to `minmax(440px, 500px) minmax(0, 1fr)` on `>= 1041px` (single-column stack on `<= 1040px`).
- **Single-Border Compact Input Workbench.** Scoped the `@layer workspace` border rule in `src/workspace.css` from `.field input` to direct-child `.field > input` so inputs nested inside `.calculator-input-control` no longer inherit a second box-in-a-box inner border across all 75 studios and dedicated planners. Aligned `.calculator-input-grid` with `align-items: start`, tightened controls to `36px`, quieted `.estimate-customization` into a single-row bottom-ruled jump bar, and tightened `.calculator-options-shell`, `.calculator-result-action`, and `.calculator-scenario-panel` so primary inputs and `View result` sit comfortably above the `900px` desktop fold.
- **Above-the-Fold Result Ledger & Clean Studio Visual.** Promoted `<CalculatorStudioVisual>` directly beneath `.calculator-result-metrics` and reconciliation strips (before `<CalculatorScopeNotice>` and `<VariantChips>`), switched `.calculator-result-metrics` to a smart 6-column grid (`span 3` for 2/4 supporting metrics, `span 2` for 3/5/6 supporting metrics) so no orphan column slots appear, defined `.sr-only` alongside `.visually-hidden` in `src/styles.css` so screen-reader series prefixes do not repeat visibly on every chart row, tightened `.calculator-studio-chart-row` headers and tracks, right-aligned numeric columns in `.calculator-chart-table` (keeping `.calculator-note-column` left-aligned), and dropped the legacy `1040px` `min-width` on `.calculator-breakdown-table-wrap table`.
