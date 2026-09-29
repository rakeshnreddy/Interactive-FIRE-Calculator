# B16 browser and token evidence

Evidence date: 2026-09-09. Baseline: `31bbd2bc421baef6706e10f066ffc5bc86e33e56`. B16 code: `bcfcfd288eb3e27d7bfed8d32d09fd5b63b43a99`.

The production build was served on `127.0.0.1:4174` and exercised in Playwright Chromium after fonts loaded. All values below came from computed styles and element bounding boxes, not CSS-source assertions.

## Baseline inventory

`src/styles.css` contained four generations of shared `.app` light/dark token declarations before the late `src/vivid-theme.css` table. The browser therefore rendered whichever late declaration won, while earlier component selectors continued to carry unrelated type/size assumptions.

| Surface | Baseline observation |
|---|---|
| Home | Effective late palette was `#f1f6f5` canvas, `#122522` heading, `#263c38` body, `#00776d` primary. Workspace, Create account, and theme controls rendered at 40px; Sign in was already 44px after B15. |
| FIRE | Editable fields rendered at 16px/24px and 48px high. Several segmented controls were approximately 34–36px high. |
| Mortgage | Number fields rendered at 16px/24px and 48px high, while the schedule period select inherited 11.84px text and measured 36px high. |
| Savings | Number inputs inherited 12.16px/15.81px text from their field wrapper; schedule select inherited 12.16px and measured 40px. |
| Auth gate | Missing-config guard remained semantic; its disabled `Auth not configured` action provided an actual disabled-state sample. |

Representative baselines:

- [`b16-home-light-1440-before.png`](../../../../output/playwright/C01/B16/b16-home-light-1440-before.png)
- [`b16-fire-light-1440-before.png`](../../../../output/playwright/C01/B16/b16-fire-light-1440-before.png)
- [`b16-mortgage-light-1440-before.png`](../../../../output/playwright/C01/B16/b16-mortgage-light-1440-before.png)
- [`b16-savings-light-1440-before.png`](../../../../output/playwright/C01/B16/b16-savings-light-1440-before.png)
- [`b16-auth-gate-light-1440-before.png`](../../../../output/playwright/C01/B16/b16-auth-gate-light-1440-before.png)

## Canonical rendered roles

The browser resolved the documented baseline values and every compatibility alias back to the same late owner.

| Role | Light | Dark |
|---|---|---|
| canvas / surface / inset | `#f4f7f7` / `#ffffff` / `#edf2f1` | `#111715` / `#18201e` / `#202a27` |
| heading / body / muted | `#17211f` / `#293431` / `#5c6966` | `#f1f5f3` / `#dce5e2` / `#aab7b3` |
| decorative / control border | `#d9e1df` / `#71827d` | `#34413d` / `#6b827b` |
| primary / hover / pressed / foreground | `#087f72` / `#05695f` / `#04554e` / white | `#5bc7b5` / `#75d4c4` / `#47aa99` / `#0d2420` |
| focus | `#3267c8` | `#83a9f4` |
| data 1–4 | `#087f72`, `#3267c8`, `#b34e30`, `#9a5c12` | `#5bc7b5`, `#83a9f4`, `#ef916f`, `#e4b15f` |
| inverse surface / heading / body | `#173b52` / white / `#dce9ec` | same fixed inverse pair |

Actual pairs measured in Chromium:

- Light primary: white on `rgb(8,127,114)`, 4.90:1.
- Dark primary: `rgb(13,36,32)` on `rgb(91,199,181)`, 7.97:1.
- Light control boundary: `rgb(113,130,125)` beside white, 4.05:1.
- Dark control boundary: `rgb(107,130,123)` beside `rgb(28,37,34)`, 3.82:1.
- Dark field text: `rgb(241,245,243)` on `rgb(20,27,25)`, 15.91:1.
- Inverse heading: white on `rgb(23,59,82)`, 11.77:1 in both modes.

## Primitive and responsive results

Across visible controls on FIRE, mortgage, and savings, the post-change query found zero editable controls below 16px or 44px and zero non-breadcrumb buttons below 44px. Inputs report 16px/24px text; ordinary fields remain 44–48px high. The sole documented button exception is the inline breadcrumb control.

The actual Savings invalid state used `-1` for the synthetic goal amount. The field exposed `aria-invalid="true"`, associated both help and error IDs through `aria-describedby`, announced `Goal amount must be greater than 0…` in `role="alert"`, and rendered the dark danger boundary as `rgb(241,132,145)`. A checked native scenario radio proved selected state. The missing-config gate proved a labeled native disabled state. Adding `aria-busy="true"` temporarily to the actual Reset primitive in the browser produced a progress cursor while retaining its 44px label and target; this was a synthetic style probe, not a production auth/save claim.

Chromium DevTools media emulation set both `prefers-reduced-transparency: reduce` and `prefers-reduced-motion: reduce`; both media queries matched. The topbar computed an opaque `rgb(11,36,33)` background with `backdrop-filter: none`. Browser console after the production journeys reported 0 errors and 0 warnings.

| Viewport / state | Result and evidence |
|---|---|
| 1440×900 light | Home, FIRE, mortgage, savings, and auth gate inspected; [`home`](../../../../output/playwright/C01/B16/b16-home-light-1440-after.png), [`FIRE`](../../../../output/playwright/C01/B16/b16-fire-light-1440-after.png), [`mortgage`](../../../../output/playwright/C01/B16/b16-mortgage-light-1440-after.png), [`savings`](../../../../output/playwright/C01/B16/b16-savings-light-1440-after.png), [`auth`](../../../../output/playwright/C01/B16/b16-auth-gate-light-1440-after.png). |
| 1440×900 dark | Same representative surface family inspected; [`home`](../../../../output/playwright/C01/B16/b16-home-dark-1440-after.png), [`FIRE`](../../../../output/playwright/C01/B16/b16-fire-dark-1440-after.png), [`mortgage`](../../../../output/playwright/C01/B16/b16-mortgage-dark-1440-after.png), [`savings`](../../../../output/playwright/C01/B16/b16-savings-dark-1440-after.png), [`auth`](../../../../output/playwright/C01/B16/b16-auth-gate-dark-1440-after.png). |
| 1024×768 | Savings: zero overflow and zero undersized visible controls; [`screenshot`](../../../../output/playwright/C01/B16/b16-savings-light-1024-after.png). |
| 768×1024 | Mortgage: zero overflow and zero undersized visible controls; [`screenshot`](../../../../output/playwright/C01/B16/b16-mortgage-light-768-after.png). |
| 390×844 | Savings: zero overflow and zero undersized visible controls; [`screenshot`](../../../../output/playwright/C01/B16/b16-savings-light-390-after.png). |
| 320×800 | Home: zero overflow and zero undersized visible buttons; [`screenshot`](../../../../output/playwright/C01/B16/b16-home-light-320-after.png). |
| Dark invalid | Savings actual error state; [`screenshot`](../../../../output/playwright/C01/B16/b16-savings-error-dark-1440-after.png). |
| Reduced transparency/motion | Opaque no-blur navigation fallback; [`screenshot`](../../../../output/playwright/C01/B16/b16-home-reduced-transparency-dark-1440-after.png). |

Native browser UI zoom at 200% remains unavailable through the current automation surface and is not claimed. A viewport reduction is not substituted for zoom evidence. B17 will refresh affected navigation and the final checkpoint matrix against its final candidate.
