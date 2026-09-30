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
