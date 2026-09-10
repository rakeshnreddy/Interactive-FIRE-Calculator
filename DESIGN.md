# FinPath Design System

## Direction

FinPath uses a vivid precision aesthetic: calm operational surfaces, crisp typography, restrained borders, and a purposeful full-palette decision system. The interface should feel like a well-made financial workbook translated into a modern application, with enough color to create energy and orientation without becoming promotional or noisy.

## Color

### Light

- Canvas: `#f4f7f7`
- Surface: `#ffffff`
- Soft surface: `#edf2f1`
- Ink: `#17211f`
- Muted ink: `#5c6966`
- Border: `#d9e1df`
- Primary teal: `#087f72`
- Data blue: `#3267c8`
- Warm accent: `#b34e30`
- Success: `#247a56`
- Warning: `#9a5c12`
- Danger: `#b63e4d`

### Dark

- Canvas: `#111715`
- Surface: `#18201e`
- Soft surface: `#202a27`
- Ink: `#f1f5f3`
- Muted ink: `#aab7b3`
- Border: `#34413d`
- Primary teal: `#5bc7b5`
- Data blue: `#83a9f4`
- Warm accent: `#ef916f`
- Success: `#75cda4`
- Warning: `#e4b15f`
- Danger: `#f18491`

Teal identifies primary actions and current state. Cobalt supports growth, charts, and comparison. Warm coral identifies long-term or consequential decisions. Gold is reserved for warnings and select chart emphasis. Solid color bands may identify major decision families on public pages; operational pages use the same hues as thin hierarchy accents. Semantic colors retain their meaning. Never use gradient text, color blobs, or color without an information role.

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

The owner requested glassmorphism and gradients in both light and dark themes. [COLOR_AND_GLASS_SYSTEM.md](docs/COLOR_AND_GLASS_SYSTEM.md) now defines the target palette and material behavior; [VISUAL_DESIGN_SPEC.md](docs/VISUAL_DESIGN_SPEC.md) defines composition and verification. This supersedes earlier blanket anti-gradient restrictions while preserving legible opaque text, correct chart semantics, bounded blur and solid accessibility fallbacks. B16 establishes token ownership; B32 implements the palette/material update. These are planned changes, not a claim that this document's current color table is already applied.
