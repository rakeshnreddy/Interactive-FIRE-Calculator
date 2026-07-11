# FinPath Design System

## Direction

FinPath uses a precision-led product aesthetic: quiet neutral surfaces, crisp typography, restrained borders, and a small multi-hue data palette. The interface should feel like a well-made financial workbook translated into a modern application. It is minimal without becoming sterile and polished without becoming promotional.

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

Teal identifies primary actions and current state. Blue supports charts and comparison. Warm coral is reserved for secondary data emphasis. Semantic colors retain their meaning. No gradient text and no decorative color fields.

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

Ordinary content surfaces are opaque and border-led with a minimal shadow. Glass is reserved for sticky navigation and primary grouped work surfaces, using a solid fallback and reduced-transparency override. Avoid large diffuse shadows and decorative blur.

## Components

- Primary button: filled teal, 44-48px height, 8px radius.
- Secondary button: neutral surface with a clear border.
- Icon button: square, 40-44px, tooltip or accessible label.
- Inputs: explicit labels, helper text where needed, visible focus, tabular numerals.
- Segmented controls: compact, bordered, and used only for mutually exclusive views.
- Toolkit panel: one decision-family summary with a small route list, never a card grid inside a card.
- Detail table: collapsed by default where long, scroll-contained on small screens, and exportable when the underlying schedule is useful.

## Motion

Use 120-180ms opacity, color, border, and transform transitions. Movement is limited to direct feedback such as a 1px lift or disclosure rotation. Honor `prefers-reduced-motion` and never use `transition: all`.

## Content

Use exact calculator phrases for calculator page titles. Use user-centered toolkit names for browsing. Explain what a calculator answers, what each input means, what each result means, and which assumptions can change the outcome. Never mention search rankings, SEO, traffic, conversion funnels, or internal regional targeting in product copy.
