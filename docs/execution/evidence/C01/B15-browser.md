# B15 browser and contrast evidence

Evidence date: 2026-09-09. Baseline: `ae10ea516e1df38cf2fce5f0c704e1c855c9db01`. B15 code: `7057cb220d488a3dc049dc11c544c466c0fa1b58`.

The production build was served on `127.0.0.1:4174` and inspected with Playwright/Chromium after `document.fonts.status` reported `loaded`. The Vite development server was not used for visual evidence because the repository's shared `node_modules` symlink made its Inter request fail the development server's filesystem allowlist; built font assets loaded correctly.

## Reproduced baseline

| Target | Effective foreground | Effective background | Contrast | Winning problem |
|---|---|---|---:|---|
| `.topbar-link` in light mode | `rgba(255,255,255,.8)` | `rgb(255,255,255)` | 1.00:1 after alpha composition | Late theme text color combined with the inherited opaque secondary-button surface. |
| `.landing-continuity-band h2` in light mode | `#122522` | `#173b52` | 1.36:1 | Later global `.app h2` color overrode the earlier inverse heading declaration. |
| `.topbar-link` in dark mode | `rgba(255,255,255,.8)` | `#16201f` button surface | readable baseline | The defect was theme-specific but the component still lacked a complete paired state contract. |

Baseline screenshots:

- [`b15-home-light-1440-before.png`](../../../../output/playwright/C01/B15/b15-home-light-1440-before.png)
- [`b15-home-light-1440-full-before.png`](../../../../output/playwright/C01/B15/b15-home-light-1440-full-before.png)
- [`b15-home-light-390-before.png`](../../../../output/playwright/C01/B15/b15-home-light-390-before.png)
- [`b15-auth-gate-light-1440-before.png`](../../../../output/playwright/C01/B15/b15-auth-gate-light-1440-before.png)

## B15 result

The late-loaded component owner now pairs Sign in's foreground, border and transparent topbar surface explicitly. It also owns hover, focus-visible, pressed and disabled states. The inverse band now owns its heading and action foreground/background pairs after global heading rules.

| Target/state | Effective pair or focus result | Measured result |
|---|---|---:|
| Sign in, light default | `#edf7f4` over composited topbar `[39,61,58]` | 10.56:1 |
| Sign in, dark default | `#edf7f4` over composited topbar | 15.17:1 |
| Sign in, hover | white over 9% white topbar overlay | readable; computed state captured |
| Sign in, focus-visible | 3px `#8ee7d9` outline with offset | visible in actual browser focus |
| Sign in, pressed | white over 16% white overlay | computed state captured; 1px press translated feedback |
| Sign in, disabled | 68% inverse text over 6% inverse overlay; opacity remains 1 | distinct without disappearing |
| Continuity h2, both themes | white over `#173b52` | 11.77:1 |
| Continuity action, default / hover / pressed | `#102b28/#8ee7d9`; `#0a211f/#b0f0e6`; `#102b28/#75d7c8` | 10.43:1 / 13.16:1 / 8.80:1 |

After screenshots:

- [`b15-home-light-1440-after.png`](../../../../output/playwright/C01/B15/b15-home-light-1440-after.png)
- [`b15-home-light-1440-full-after.png`](../../../../output/playwright/C01/B15/b15-home-light-1440-full-after.png)
- [`b15-home-dark-1440-after.png`](../../../../output/playwright/C01/B15/b15-home-dark-1440-after.png)
- [`b15-home-light-390-after.png`](../../../../output/playwright/C01/B15/b15-home-light-390-after.png)
- [`b15-auth-gate-light-1440-after.png`](../../../../output/playwright/C01/B15/b15-auth-gate-light-1440-after.png)

The Playwright accessibility snapshot exposed visible `Sign in`, `Create account`, theme toggle, skip link, primary navigation, page headings, and continuity heading/action names. No label or auth guard was removed. Browser zoom at a native 200% setting and immutable hosted preview remain blocked evidence in the current automation environment and are not claimed as passing.
