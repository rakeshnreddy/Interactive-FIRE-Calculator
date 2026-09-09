# Light and dark color, glass and gradient system

2026-09-08. Owner direction: explicitly requested aesthetic glassmorphism and gradient colors in both themes. This updates earlier restraints against decorative gradients. The constraints on readable financial information, truthful graphics, accessibility and performance remain. This is a proposed design contract and local visual board; the production UI has not been restyled in this planning milestone.

## Choice

Use a luminous mineral palette: sea-glass teal, clear blue and a small pearlescent violet contribution over cool neutrals. Light mode feels bright and airy; dark mode uses deep blue-green surfaces, luminous mint actions and soft blue comparison accents. Avoid using the same neon hue at the same intensity in both modes. Warm amber is reserved for caution and coral/rose for negative or consequential states.

The current vivid theme has a recognizable teal foundation but light-mode foreground/background collisions. Sign in measures 1:1; the dark continuity heading on its blue background measures about1.36:1. Correct these in B15 before embellishment. B16 establishes role ownership. B32 applies the new light/dark palette and carefully bounded glass/gradients across those roles.

[Open the interactive theme board](design/theme-board.html). It is an explicitly labeled design proposal with synthetic values, working theme and opaque-surface controls, and no account/API connection. It illustrates material/color, not a replacement for actual React implementation or hosted testing. B18 still owns the real homepage composition.

## Canonical candidate tokens

| Role | Light | Dark |
|---|---|---|
| Canvas | `#f4f8fb` | `#08151c` |
| Solid surface | `#fbfdff` | `#10232c` |
| Inset field surface | `#eef4f7` | `#0b1b23` |
| Heading/body strong | `#102c35` | `#eaf6f7` |
| Secondary text | `#526873` | `#a4bbc4` |
| Decorative separator | `#cfdee4` | `#304b57` |
| Required control boundary | `#71858e` | `#66838f` |
| Primary | `#006b60` | `#69e3ca` |
| On primary | `#ffffff` | `#08151c` |
| Comparison blue | `#2455a6` | `#8abaff` |
| Supporting violet | `#6552a5` | `#bba9ef` |
| Success | `#1d714f` | `#83ddb0` |
| Warning | `#885100` | `#f0bf72` |
| Danger | `#a32d48` | `#ff9aae` |
| Focus | `#2455a6` plus surface gap | `#8abaff` plus surface gap |

Do not use decorative separators as the sole control boundary unless required contrast is verified. Input text stays fully opaque. Semantic states require text/icon as well as hue. Tiny pale metadata is not an acceptable way to create hierarchy.

## Gradient recipes and placement

- Light atmosphere: `linear-gradient(125deg, #e9faf3 0%, #eaf2ff 55%, #f1eefe 100%)` for homepage product-stage and selected public section background. Ordinary tables and forms use solid/inset roles.
- Dark atmosphere: `linear-gradient(125deg, #10352f 0%, #122943 55%, #26213e 100%)`. Limit saturation and brightness; the surface is not a neon poster.
- Primary action, if a gradient is used: light `#006b60 → #2455a6`, with white label; dark `#69e3ca → #8abaff`, with deep ink label. Define hover/pressed as complete paired variants, not opacity applied to the entire control. Secondary and destructive buttons remain explicit solid roles.
- Fine glass edge: a 1px highlight with a solid fallback, never the only focus or control boundary. No animated hue rotation, wandering background blobs, gradient financial digits, or color scale that changes the meaning of a chart.
- Chart area fill may fade only within one labeled series. Series identity and data magnitude must come from line/shape/axis/labels, not gradient intensity alone.

These gradients are allowed by the latest user preference, including blue/violet atmosphere; this explicitly supersedes earlier blanket anti-reference language. Avoid generic copy and unsupported product imagery, which remain unrelated defects.

## Glass recipe

Use glass for navigation, disclosure overlays and at most one featured product-stage panel per viewport. Light glass candidate `rgba(251,253,255,.86)`; dark `rgba(16,35,44,.88)`. Use `backdrop-filter: blur(14px) saturate(115%)` only behind those bounded surfaces, with a subtle theme-specific edge and shadow. Keep body text/numbers opaque. Avoid nested glass and full-page/backdrop animation.

Start from an opaque background, then opt into supported blur with `@supports`; older/non-supporting browsers must remain fully usable. In `prefers-reduced-transparency: reduce`, forced-colors and print, remove blur and use solid surfaces. Keep reduced-motion rules separate: reducing motion does not automatically mean reduced transparency. Provide an application appearance option for solid surfaces only if it can reuse settings cleanly; the theme board has a preview-only toggle, not a committed product preference feature.

Test glass over the actual darkest/lightest gradient stops, scrolled underlying content, overlays and hover/focus states. Never validate contrast only against a nominal white surface when the actual surface is translucent. B32 must provide computed/composited evidence and measurements in Chromium plus another available browser engine; missing required platform coverage remains a recorded review gap.

## Measured candidate pairs

Calculated using sRGB relative luminance, rounded to two decimals. These are solid color-pair calculations, not certification of all gradients or rendered glass.

| Foreground / background | Ratio |
|---|---:|
| White / light primary teal | 6.42:1 |
| White / light primary blue stop | 7.18:1 |
| Deep ink / dark primary mint | 11.85:1 |
| Deep ink / dark primary blue stop | 9.30:1 |
| Light secondary text / light canvas | 5.48:1 |
| Dark secondary text / dark solid surface | 8.07:1 |
| Light heading / light violet atmosphere stop | 12.83:1 |
| Dark body / dark solid surface | 14.65:1 |

Gradient endpoints alone are insufficient; B32 tests intermediate stops, alpha composition and actual control states. Tune tokens with evidence if a pair fails, update this table and DESIGN.md together, and explain the change. Never just lower opacity or remove a label.

## Implementation and acceptance

B32 is a separate checkpoint after C01's contrast/token/navigation foundation. It owns palette, paired theme roles, material styles, gradient placement and fallbacks. B18/B19 and later UI tasks consume these roles rather than choosing new ad hoc palettes. It must preserve B15 contrast fixes and B17 interactions. No new animation/font/chart packages or remote assets are needed.

Acceptance: both themes visually reviewed on home, library, FIRE, mortgage, savings and auth gate; light/dark contrast and all component states pass; glass-disabled/unsupported/forced-colors/print paths stay legible; no financial digit or input on an uncontrolled background; no new layout shift; three-run scrolling/loading comparisons show no unexplained regression. Color/motion cannot substitute for content hierarchy. Mark B32 ready_for_review, never done, until the primary reviewer accepts actual product renders.

## Current references

Reviewed 2026-09-08: [MDN backdrop-filter](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter) describes support and backdrop behavior; [MDN reduced transparency](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency) documents the preference query. Fallbacks are required rather than assuming every browser supports the preference. [WCAG2.2](https://www.w3.org/TR/WCAG22/) remains the normative accessibility reference. Aesthetic choices are this project's proposed direction, not claims from these sources.
