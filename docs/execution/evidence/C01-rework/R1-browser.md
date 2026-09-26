# C01 R1 reduced-transparency correction

Corrected candidate: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

The reviewer reproduction at the previous candidate made `.desktop-nav-menu` itself opaque white, leaving the Workspace button's translucent white foreground on white. The correction keeps that trigger wrapper transparent and applies the no-blur/opaque fallback to the actual `.desktop-nav-dropdown` surface.

Installed Chrome 152.0.7977.83 was exercised against the production build at 1440×1000. Browser media emulation set the real supported `prefers-reduced-transparency` and `prefers-reduced-motion` features. Effective foreground/background colors were composited in sRGB before calculating WCAG contrast.

| Theme / media / state | Effective foreground | Effective background | Contrast | Focus / semantics |
|---|---|---|---:|---|
| Light, normal, Workspace closed | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | `aria-expanded=false` |
| Light, reduced transparency + motion, closed | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | Wrapper transparent; no backdrop filter |
| Light, reduced, hover | `rgb(255,255,255)` | `rgb(33,56,53)` | 12.52:1 | Visible label and icon |
| Light, reduced, keyboard focus | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | 3px `rgb(50,103,200)` outline, 2px offset |
| Light, reduced, disclosure open | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | `aria-expanded=true`; first dropdown link 12.88:1 |
| Dark, reduced, keyboard focus | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | 3px `rgb(131,169,244)` outline, 2px offset |
| Dark, reduced, disclosure open | `rgb(206,211,211)` | `rgb(11,36,33)` | 10.79:1 | First dropdown link 12.23:1 |
| Workspace route active | `rgb(142,231,217)` | `rgb(22,58,53)` | 8.67:1 | `aria-current=page` |

All sampled label/link pairs exceed 4.5:1. Enter opens Workspace, Tab reaches Accounts, and Escape closes it and returns focus to the trigger. At 390×844 with both reduced preferences active, the mobile navigation computed to opaque `rgb(255,255,255)` with no backdrop filter; its Workspace label computed to `rgb(23,33,31)`, document scroll width remained exactly 390px, and Escape removed the navigation and returned focus to Open navigation.

B15's Sign in pair and inverse continuity heading were re-read from the actual corrected render in both themes. Sign in was `rgb(237,247,244)` over the effective `rgb(11,36,33)` topbar (14.91:1), and the heading remained white over `rgb(23,59,82)` (11.77:1).

Native Chrome zoom was independently reset with Command+0, raised with five Command+plus actions, and Chrome's own accessibility tree reported both `Zoom: 200%` controls. At that actual browser zoom the header reflowed to the mobile composition; Calculators, FIRE, Workspace, Sign in, and Create account were visible without overlap. Escape removed the menu and returned focus to Open navigation. Chrome was restored to 100%. This was browser chrome zoom, not CSS zoom or a resized Playwright viewport.

Durable renders:

- [Reviewer failure reproduction](../../../../output/playwright/C01/B16-rework/B16-home-reduced-transparency-light-1440-before-open.png)
- [Corrected light disclosure](../../../../output/playwright/C01/B16-rework/B16-home-reduced-transparency-light-1440-after-open.png)
- [Corrected dark disclosure](../../../../output/playwright/C01/B16-rework/B16-home-reduced-transparency-dark-1440-after-open.png)
