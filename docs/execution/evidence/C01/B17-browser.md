# B17 browser and navigation evidence

Evidence date: 2026-09-09. Baseline: `2c9881118bfc8c0cde7fcce59bc010cccfff2303`. Final C01 code candidate: `ad580088938fc9f2a0e499eb70f0608be0c89aff`.

The production build was served locally at `127.0.0.1:4174` and exercised with Playwright Chromium. The environment had no configured auth provider, so the actual fail-closed `not-configured` state supplied the public-user journey. Signed-in, signed-out, loading, and missing-config ordering are covered by the pure navigation tests without adding a production fixture or bypass.

## Reproduced baseline

At the B16 baseline, missing-config visitors saw Dashboard, Transactions, Goals, then Calculators in primary navigation. Desktop Workspace used application-menu roles despite ordinary link traversal; all SPA link handlers unconditionally prevented native behavior; mobile route controls were buttons; and the mobile disclosure had no Escape/focus-return or desktop-breakpoint cleanup. The source baseline and the B16 final screenshots are durable pre-change evidence:

- [`b16-home-light-1440-after.png`](../../../../output/playwright/C01/B16/b16-home-light-1440-after.png)
- [`b16-home-light-320-after.png`](../../../../output/playwright/C01/B16/b16-home-light-320-after.png)

## Final behavior

| Journey | Actual result |
|---|---|
| Missing-config primary navigation | Exactly two primary anchors: `Calculators → /calculators` and `FIRE → /calculators/fire`; private routes remain in the clearly labeled Workspace disclosure. |
| Signed-out/loading/signed-in model | Seven focused tests pass. Missing-config, loading, and signed-out use the public pair; signed-in uses Dashboard, Transactions, Goals, Calculators. |
| Native link behavior | Every changed route control is an `A` with a real `href`. Unmodified primary clicks use the SPA transition. Middle-click opened `/calculators` in a second page while the original stayed `/`. |
| Browser history | `/ → /calculators`, Back returned `/`, Forward restored `/calculators`, and Reload retained `/calculators`. The same sequence passed for mobile `/calculators/fire`. |
| Selected route | Exactly the most-specific primary item gets `aria-current="page"`; FIRE is current on `/calculators/fire`, while signed-in model selection falls back to Calculators. Workspace child links expose their current route when rendered. |
| Desktop Workspace keyboard | Enter opened the disclosure; Tab moved to the Accounts anchor; Escape removed the disclosure and returned focus to the Workspace trigger. No `menu`/`menuitem` roles remain on ordinary links. |
| Mobile keyboard/disclosure | Closed navigation is absent from the DOM (zero hidden focusables). Enter opens it, Tab reaches Calculators, Escape removes it and returns focus to `Open navigation`. Route changes close it. |
| Breakpoint cleanup | Opening the mobile disclosure at 1024px then resizing to 1440px removed it from the DOM. The media listener and key listener are cleaned up with the disclosure effect. |
| Route focus | An SPA transition to lazy `/calculators` and mobile `/calculators/fire` focused the rendered H1 once. Focusing an editable calculator input afterward remained stable, proving no delayed focus theft. |
| Skip link | First Tab focused `Skip to content`; Enter focused `MAIN#main-content` with `tabIndex=-1`. |
| Theme state | Light rendered `Switch to dark mode`, `aria-pressed=false`; activation rendered `Switch to light mode`, `aria-pressed=true`. |
| Target size | Mobile primary/Workspace anchors and disclosure summary measured 48px high. |

The Playwright semantic snapshot exposed a named Primary navigation containing Calculators, FIRE, and Workspace; a named theme toggle; Skip to content; real route links; and the page headings. This is a screen-reader smoke check, not a conformance certification.

## Responsive and theme evidence

All tested widths had `documentElement.scrollWidth === innerWidth`. No overlap or clipping was observed.

| Viewport/state | Evidence |
|---|---|
| 1440×1000 light | [`B17-after-desktop-light.png`](../../../../output/playwright/C01/B17/B17-after-desktop-light.png) |
| 1440×1000 Workspace open | [`B17-after-desktop-workspace.png`](../../../../output/playwright/C01/B17/B17-after-desktop-workspace.png) |
| 1440×1000 dark | [`B17-after-desktop-dark.png`](../../../../output/playwright/C01/B17/B17-after-desktop-dark.png) |
| 1024×900 dark | [`B17-after-tablet-1024-dark.png`](../../../../output/playwright/C01/B17/B17-after-tablet-1024-dark.png) |
| 768×900 dark | [`B17-after-tablet-768-dark.png`](../../../../output/playwright/C01/B17/B17-after-tablet-768-dark.png) |
| 390×844 light, navigation open | [`B17-after-mobile-390-light-open.png`](../../../../output/playwright/C01/B17/B17-after-mobile-390-light-open.png) |
| 390×844 dark, navigation open | [`B17-after-mobile-390-dark-open.png`](../../../../output/playwright/C01/B17/B17-after-mobile-390-dark-open.png) |
| 320×720 dark | [`B17-after-mobile-320-dark.png`](../../../../output/playwright/C01/B17/B17-after-mobile-320-dark.png) |

Chromium DevTools media emulation matched both `prefers-reduced-transparency: reduce` and `prefers-reduced-motion: reduce`; after style recomputation the topbar was opaque `rgb(11, 36, 33)` with `backdrop-filter: none`. Native browser chrome zoom at an actual 200% setting is unavailable through the current automation surface and is explicitly blocked rather than replaced with viewport resizing.

The application produced zero runtime exceptions or warnings during the navigation journeys. Chromium requested the pre-existing absent `/favicon.ico` once and logged its 404 as a resource error; this is not represented as a clean-console pass.
