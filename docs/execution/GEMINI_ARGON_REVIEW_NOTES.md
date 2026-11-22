# FinPath — Review Handoff Notes for Gemini Argon

**Prepared:** 2026-11-22
**Workspace:** `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`
**Live Shared Beta (Stable Alias):** [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev)
**Latest Verified Immutable Beta (`B85 / C46`):** [`https://176f20ff.interactive-fire-calculator.pages.dev`](https://176f20ff.interactive-fire-calculator.pages.dev) (`176f20ff-6641-4325-b868-1e90747341d7`)
**Latest Accepted Product SHA (`B85 / C46`):** `ab37dc8dc1c6b2572b8424a218935f8b737a998f` ([PR #171](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/171), exact-head `Verify` CI [`45011064285`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/45011064285))
**Production Status (Untouched):** Still serving `3399dbbd8d7f0e6379972356a790b236e6b177b1`; production D1 (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`) untouched; automatic production deployments remain off.

---

## 1. Executive Summary

All autonomous engineering, calculator-correctness (`B68–B75`), `/unslop` visual overhaul (`B70`, `B78`, `B74`, `B76`, `B79`, `B80`), Option A Split Financial Workbench rollout (`B81–B84`), and Pre-Launch Polish Pack (`B85 / C46`) checkpoints are complete (`82` of `85` registered tasks done; the remaining `3` are owner-gated `B51`, `B13`, `B14`). The site has been delivered incrementally in bounded checkpoints—each passing red/green unit tests, `./scripts/test_all.sh`, independent adversarial review, exact-head GitHub Actions `Verify` CI, isolated candidate preview, shared-beta promotion (`codex/finpath-quality-execution` on preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`), and `main` merge.

This handoff document is structured so **Gemini Argon** can independently verify:
1. Every architectural, visual, accessibility, and performance change across the full `/unslop` overhaul (`B74/C36` -> `B76/C39` -> `B79/C40` -> `B80/C41`), the Option A Split Financial Workbench rollout (`B81/C42` -> `B82/C43` -> `B83/C44` -> `B84/C45`), the Pre-Launch Polish Pack (`B85/C46`), and the preceding calculator-analysis checkpoints (`B68–B75`).
2. Every hard invariant and safety boundary (untouched FIRE engine, preserved 14 `calculatorModelVersions`, zero Worker/Functions/D1 schema drift, zero production mutations, clean build isolation).
3. Exact observed verification receipts, contrast numbers, Web Vitals, and copy-pasteable verification commands.
4. Remaining owner-gated items and explicit non-claims.

---

## 2. Complete Release Ledger (Calculator Analysis & `/unslop` Overhaul)

### A. `/unslop` Visual Overhaul (4 Staged Releases on Top of B70/B78 Foundation)

| Stage | Task / Checkpoint | Scope | Product SHA | PR | Exact-Head CI | Shared Beta Deployment |
|---|---|---|---|---|---|---|
| Foundation | `B70 / C31` | OKLCH token owner (`src/vivid-theme.css`), cascade layers (`src/app.css`), shell (`src/shell.css`) | `2aec033f905a5f906bf9958f843239aea2ecd676` | [#156](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/156) | `Verify` passed | See [C31 review](reviews/C31.md) |
| Homepage v1 | `B78 / C38` | Homepage question finder (`src/LandingPage.tsx`, `src/home.css`) | `27e2ece8d4a664e4f43fe27a3c407b0fefae6ab4` | [#157](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/157) | `Verify` passed | See [C38 review](reviews/C38.md) |
| **Unslop Stage A** | `B74 / C36` | Calculator library (`/calculators`) & shared studio template (`src/studios.css`, `src/CalculatorLibrary.tsx`) | `4bbc07514b6530a22213c3ccd879347f7be24b5a` | [#160](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/160) | [`43572151004`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/43572151004) | `1c7bf155-51d3-4194-aa61-71f51f05c6b0` |
| **Unslop Stage B** | `B76 / C39` | Dedicated calculators, Recharts/CSS charts (`src/ProjectionChart.tsx`), signed-in workspace (`src/workspace.css`), legacy CSS slop retirement (`src/styles.css`) | `9d1266654f84b7d076e828ef1ffb2649d68d2e35` | [#161](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/161) | [`43579533077`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/43579533077) | `aa251d67-e7e4-4c8c-8e33-0a4624d1c24f` |
| **Unslop Stage C** | `B79 / C40` | Homepage, application shell, footer, flat `HeroFireExample` SVG, neutral shadow tokens (`src/home.css`, `src/shell.css`, `src/vivid-theme.css`, `src/LandingPage.tsx`, `src/HeroFireExample.tsx`) | `3d2eec784501ff5de884d96dd0e0d6819370344b` | [#165](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/165) | [`44906248663`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44906248663) | `47932667-2094-444b-94ed-4543f98ab44d` |
| **Unslop Final Polish** | `B80 / C41` | Sitewide OKLCH-resolved WCAG 2.2 AA contrast repair, semantic link styling, dark overscroll hygiene, `AuthGate` H1 copy, final legacy radius/weight cleanup, cold-load Web Vitals verification | `58b1a3604196842c64a8af224f24616b6f8cd0c9` | [#166](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/166) | [`44910672642`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44910672642) | `6467d8ac-ead9-4a40-8e0c-54dcc329cd8d` |
| **FIRE Workbench** | `B81 / C42` | FIRE Calculator Option A Split Financial Workbench & default-visible projection | `6edc13d56da54ee40d7e9214fdb0f456d46fba6a` | [#167](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/167) | [`44959390226`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44959390226) | `112689f1-1dc1-4c56-8b5a-6acb43ac8fad` |
| **FIRE Redline** | `B82 / C43` | FIRE Optional refinements non-overlapping cards, 6-col repeat rows, right-aligned output ledger | `fbbabb15c6de5eb542d63269261d0c60eaf63502` | [#168](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/168) | [`44962862164`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44962862164) | `84c5320a-fe2d-4df3-b001-4e3e4487fb9e` |
| **Shared Studios Workbench** | `B83 / C44` | Stage 1 Option A Split Financial Workbench & above-the-fold charts across 75 shared studio routes | `b22877cebb122db8024d8a67b8a01d08815ec83d` | [#169](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/169) | [`44978472742`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44978472742) | `090cdedb-0983-4fb6-b940-c29f509a8cf7` |
| **Dedicated Planners Workbench** | `B84 / C45` | Stage 2 Option A Split Financial Workbench & above-the-fold charts across 7 dedicated calculators | `42b4d608f383486375ab06be617ea79999db3c46` | [#170](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/170) | [`44992445526`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/44992445526) | `1a13441c-a940-4da5-b5cd-bcd9d1405d1c` |
| **Pre-Launch Polish Pack** | `B85 / C46` | Dynamic production origin, public `/privacy` & `/terms`, `1200×630` `og-card.png`, footer feedback link, build-time sitemap/robots/llms | `ab37dc8dc1c6b2572b8424a218935f8b737a998f` | [#171](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/171) | [`45011064285`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/45011064285) | `176f20ff-6641-4325-b868-1e90747341d7` |

### B. Preceding Calculator Excellence Checkpoints (`ANALYSIS_2026-10-18.md`, All 10 Accepted)

| Task / Checkpoint | Summary | Product SHA | PR | Review |
|---|---|---|---|---|
| `B77 / C30R` | Dev-tool advisory patch (Vite/Vitest/Undici) | `7d0f1782b03f9f49de3491eaac1be2067c9222e2` | [#154](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/154) | [C30R](reviews/C30R.md) |
| `B68 / C30` | Exact-term reconciliation & contribution accounting | `25af47ee5785c747155aad675ebade42d576e849` | [#155](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/155) | [C30](reviews/C30.md) |
| `B71 / C32` | Debt payoff truth, balance transfer, mortgage recast, PMI, balloon loans | `b39e5ab89a860c20b890ccb38e8a2d4faf875450` | [#158](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/158) | [C32](reviews/C32.md) |
| `B69 / C33` | Word-bounded scenario perturbations & bidirectional sensitivity drivers | `cc30c52681a9a1b5ed7d8597de375b483ead098e` | [#159](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/159) | [C33](reviews/C33.md) |
| `B72 / C34` | Cross-field & boundary validation across Loan, Return, Tax, Retirement | `4abce6598fa702caf5688d0bf9018ef31eb2334f` | [#162](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/162) | [C34](reviews/C34.md) |
| `B73 / C35` | Dedicated planner & saved-record integrity fixes (Net Worth, Emergency Fund, Life Insurance, FIRE Withdrawal) | `171c3f57c7d725b882accd947a68a2b7edd94dd0` | [#163](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/163) | [C35](reviews/C35.md) |
| `B75 / C37` | Charts, schedules, statutory provenance links & P2/P3 copy honesty across all 7 studios | `e9e4963d0eff19c3c6cf20bcb0b2b50089633254` | [#164](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/164) | [C37](reviews/C37.md) |

---

## 3. Architecture & File-by-File Change Map (Focus for Review: B79–B85)

### CSS Cascade Ownership (`src/app.css` & `DESIGN.md`)
`src/app.css` is the single CSS entry point declaring:
```css
@layer accessibility, legacy, tokens, home, studios, workspace, shell;
```
- `accessibility` is declared first because `!important` layer precedence reverses per CSS Cascade Level 5 (`prefers-reduced-motion`, forced colors, print).
- `src/vivid-theme.css` owns all semantic tokens in light/dark sRGB hex + `@supports (color: oklch(0 0 0))` OKLCH equivalents.
- `src/home.css` owns `/`, `src/studios.css` owns `/calculators` and the shared studio template, `src/workspace.css` owns dedicated calculators, `/privacy` & `/terms`, and the signed-in workspace, `src/shell.css` owns `.topbar`, dropdown/mobile navigation, eyebrows, and `.site-footer`.
- `src/styles.css` holds legacy layout/component rules inside `@layer legacy`, scrubbed of visual slop (`0` radii `> 12px` or `%`, `0` off-scale font weights, `0` non-repeating gradients, `0` `backdrop-filter` blur, `0` `text-transform: uppercase`, `0` `font-style: italic`, `0` `transition: all`).

### Key Changes in `B79 / C40` (Stage C — Homepage, Shell & Footer)
- `src/home.css`: Retired `.landing-hero` radial color wash, `.landing-hero-example` 3px top accent stripe & tinted shadow, and `!important` overrides outside `@media print`; unified spacing onto 4px scale (`column-gap` capped at `72px`, symmetric `4px` `.landing-finder-field` padding + `8px` SVG inline margin for `12 - 4 = 8px` nested radii), capped weights at `400`/`500`/`600`, tightened display tracking to `<= -0.03em`, and standardized `160ms cubic-bezier(0.22, 1, 0.36, 1)` motion.
- `src/shell.css`: Removed `@supports (backdrop-filter: blur(16px))` frosted glass and doubled hairline shadow from `.topbar` (now opaque `--color-nav-solid` with `1px solid var(--color-nav-border)`), standardized `.desktop-nav-dropdown` / `.mobile-nav` to `12px` outer / `4px` padding / `8px` items, fixed UA `700` on `.site-footer-brand strong` (`font-weight: inherit`), muted `.site-footer-group > strong` (`--color-footer-muted`), and preserved the `44px` hit-area contract.
- `src/vivid-theme.css`: Neutralized `--shadow-overlay` (`rgba(0, 0, 0, 0.06)` light / `0.32` dark), `--shadow-rest` (`0 1px 2px rgba(0, 0, 0, 0.05)` light / `none` dark), and `--color-nav-surface`.
- `src/LandingPage.tsx`, `src/lib/landingContent.ts`, `src/HeroFireExample.tsx`: Dropped trailing periods from single-line landing headlines, narrowed hero to one primary CTA (`See when you could retire`) by making the finder submit a secondary `Search` button, standardized Lucide icons (`16`/`18px`, `strokeWidth={1.5}`, `aria-hidden="true"`), and replaced `<linearGradient id="heroGradient">` with flat `.hero-svg-area` fill, subtle `.hero-svg-grid` mid-rule, and `strokeWidth="2"`.

### Key Changes in `B80 / C41` (Final Polish, WCAG Contrast & Performance)
- `src/styles.css` & `src/vivid-theme.css`: Repaired light-mode WCAG 2.2 AA contrast on `.info-dot`, `.row-number`, `.pill`, `.compound-base-label`, badge/status pills, and chart legend labels; hardened light-mode `--color-success` (`#116b46`) and `--color-danger` (`#b02a4b`); added dark canvas overscroll sync (`#090f19`); retired final oversized legacy radii and `font-weight: 560` rules.
- `src/studios.css`, `src/workspace.css`, `src/App.tsx`: Styled bare inline links (`var(--color-primary-ink)`, `underline`, `3px` offset) and dropped trailing periods on `AuthGate` H1s.

### Key Changes in `B81–B84 / C42–C45` (Option A Split Financial Workbench Across All 83 Calculators)
- **`B81 / C42` & `B82 / C43` (`/calculators/fire`):** Migrated the flagship FIRE calculator to the calm Option A Split Financial Workbench with default-visible projection, resolved overlapping inputs in `#fire-optional-refinements`, structured `.period-list .repeat-row` and 6-column `.event-row` / `.recurring-row` cards, right-aligned the 11-column `#results` ledger table (`sticky` header), removed the 4th orphan column on `.health-grid`, and refined `#compare` scenario cards (`src/FireWorkbenchUsability.test.tsx`).
- **`B83 / C44` (75 Shared Studio Calculators):** Eliminated double box-in-a-box `.calculator-input-control` borders via `.field > input`, expanded `.workspace:has(.calculator-detail)` with compact 2-column header and inline `.estimate-customization` jump bar, introduced a 6-column zero-orphan `.calculator-result-metrics` grid, promoted `<CalculatorStudioVisual>` above the `900px` desktop fold (`src/CalculatorStudioWorkbench.test.tsx`).
- **`B84 / C45` (7 Dedicated Calculators):** Unified `36px` inputs/selects, retired legacy 3px top panel stripes, flattened `<fieldset><legend>` headers, compacted `.calculator-mode-choice`, eliminated orphan metric slots, right-aligned numeric schedule columns, and brought charts/visuals cleanly above the `900px` fold across Compound Interest, Savings Goal, Budget, Net Worth, Emergency Fund, Dated XIRR, and Lease vs Buy (`src/DedicatedWorkbench.test.tsx`).

### Key Changes in `B85 / C46` (Pre-Launch Polish Pack)
- **`vite.config.ts`, `src/lib/routeMetadata.ts`, `scripts/prerender_routes.mjs`, `scripts/smoke_public_calculators.mjs`:** Added `DEFAULT_SITE_ORIGIN`, `resolveSiteOrigin`, `ogImageUrl`, and `resolveFeedbackUrl` (rejecting non-HTTPS origins, credentials, empty `mailto:`, and unsafe schemes; sanitizing `import.meta.env.VITE_SITE_ORIGIN` and `VITE_FEEDBACK_URL` at build time). Prerender now emits origin-accurate `dist/sitemap.xml`, `dist/robots.txt` (`Sitemap:` pointer), `dist/llms.txt`, `dist/404.html`, and all `94` route pages (`87` public + `7` workspace) using `$`-safe replacer functions.
- **`src/LegalPages.tsx`, `src/App.tsx`, `src/lib/navigation.ts`, `src/workspace.css`, `src/shell.css`:** Added public, indexed, prerendered `/privacy` and `/terms` routes reflecting FinPath's actual local-first/Clerk/D1 architecture and planning-estimate disclaimers, plus a quiet `.site-footer-bottom` row with `Privacy`, `Terms`, and `Send feedback` links (`44px` hit areas).
- **`public/og-card.png`, `index.html`, `public/robots.txt`, `public/sitemap.xml`, `.env.production.example`, `docs/PRODUCTION_AUTH_RUNBOOK.md`:** Added a crisp `1200×630` PNG social card (`og:image` + `twitter:card="summary_large_image"`), synced `public/sitemap.xml` and `public/robots.txt`, and documented automatic origin propagation on production cutover (`src/PreLaunchPolish.test.tsx`).

### Intentional Design & Audit Nuances (Do Not Flag as Bugs Unless Broken)
1. **44px Hit-Area Preservation:** Interactive shell/footer buttons and links keep `min-height: 44px` (`DESIGN.md` accessibility contract), even when surrounded by a 4px spacing grid.
2. **`repeating-linear-gradient(` Pattern Redundancy:** Retained deliberately on chart fills and legend `::before` swatches for colorblind-safe series differentiation; all non-repeating decorative `linear-gradient(` / `radial-gradient(` declarations are banned and zero.
3. **Clerk Third-Party UserButton Exclusion:** On signed-in pages, `window.Clerk.mountUserButton` replaces `.account-user-button` with `.cl-rootBox` / `cl-*` elements whose avatar uses circular `50%` radii. Hosted smoke scripts (`c40-unslop-stage-c.mjs`, `c41-unslop-final-polish.mjs`) explicitly exclude `.account-user-button, .cl-rootBox, [data-clerk-component]` and `cl-*` classes so third-party Clerk chrome does not cause false positives while every FinPath DOM/SVG node is strictly audited.
4. **Native Radio/Checkbox Inputs:** Browser-native `<input type="radio">` elements report circular computed border-radius in Chrome; `c41-unslop-final-polish.mjs` exempts native radio/checkbox inputs only.

---

## 4. Verified Metrics & Live Evidence Summary

### Sitewide CSS Invariants (Static + Live Computed)
Across all `7` stylesheets (`src/app.css`, `src/styles.css`, `src/vivid-theme.css`, `src/studios.css`, `src/workspace.css`, `src/shell.css`, `src/home.css`):
- `border-radius > 12px`, `> 0.75rem`, or `%`: **0**
- Off-scale `font-weight` (outside `400`, `500`, `600`, `inherit`, `normal`): **0**
- `text-transform: uppercase`: **0**
- `font-style: italic`: **0**
- Non-repeating CSS gradients (`linear-gradient` / `radial-gradient`): **0**
- `backdrop-filter` blur: **0**
- `transition: all`: **0**

### Local, CI & Live Shared-Beta Verification Receipts (`B85 / C46`)
- **Product SHA & Exact-Head CI:** `ab37dc8dc1c6b2572b8424a218935f8b737a998f`, GitHub Actions `Verify` run [`45011064285`](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/45011064285) (`SUCCESS`) + local `./scripts/test_all.sh` (`exit 0`):
  - Node script tests: **30 passed** (`11 + 5 + 14`)
  - TypeScript (`tsc --noEmit`): **PASS**
  - Vitest: **123 files / 2,985 tests passed** (`4/4` in `src/PreLaunchPolish.test.tsx`, `7/7` in `src/DedicatedWorkbench.test.tsx`, `4/4` in `src/UnslopFinalPolish.test.tsx`, `3/3` in `src/UnslopStageC.test.tsx`, `4/4` in `src/UnslopStageB.test.tsx`, `8/8` in `src/CalculatorStudioUnslop.test.tsx`)
  - Prerender: **94 route pages** (`87` public including `/privacy` and `/terms`, `7` workspace) + `404.html`, `sitemap.xml`, `robots.txt`, and `llms.txt`
  - Build isolation: **26** standard + **28** preview-auth production assets clean (`assets/main-BZjYS_X-.js`, `assets/main-B3wbRNpz.css`, `278.21 kB` / `42.53 kB` gzip CSS), **0 fixture leaks**
- **Candidate & Shared Beta Hosted Proof (`c41-unslop-final-polish`, Preview D1 `0dbad68e-7493-452f-8504-98d4c61ee5da`):**
  - Candidate: [`https://f149e843.interactive-fire-calculator.pages.dev`](https://f149e843.interactive-fire-calculator.pages.dev) (`f149e843-efc5-4be7-ac45-80d97991d1db`) — **PASS** (`84/84` public calculator routes + all `7` hosted stages)
  - Shared beta: [`https://176f20ff.interactive-fire-calculator.pages.dev`](https://176f20ff.interactive-fire-calculator.pages.dev) (`176f20ff-6641-4325-b868-1e90747341d7`, stable alias [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev)) — **PASS** (`84/84` public calculator routes on immutable & alias, HTTP `200` `image/png` `/og-card.png`, HTTP `200` `/privacy` & `/terms`, `/robots.txt` `Sitemap:`, all `7` hosted stages)
  - `sitewide-contrast-unslop`: **`18` routes / `82` live cases**, **`globalMinContrast: 4.58`**, `errors: []`
  - `web-vitals-snapshot` (shared beta cold loads): `/` (`LCP 424ms`, `CLS 0`, `43.6 KB` CSS), `/calculators` (`LCP 376ms`, `CLS 0`), `/calculators/mortgage` (`LCP 452ms`, `CLS 0.0348`), `/calculators/fire` (`LCP 288ms`, `CLS 0.0006`)
  - Cleanup: 16-table zero-row D1 cleanup + tombstone present + Clerk provider deletion verified (`ok: true`, `errors: []`); full provenance in `docs/execution/evidence/C46/manifest.json`.

---

## 5. Independent Verification Checklist for Gemini Argon

Run these commands from `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` to independently audit every boundary and claim:

```bash
# 1. Confirm clean main branch and recent merged PR history
git status --short --branch
git log --oneline -n 12

# 2. Verify zero forbidden edits across B79–B85 (compare against B75 merge commit 63299bb)
git diff 63299bb..HEAD -- src/lib/fire.ts src/lib/seoCalculators.ts src/lib/calculatorModelVersion.ts worker/ functions/ migrations/
# Expected: completely empty output

# 3. Verify all 14 calculatorModelVersions remain intact
grep -n "calculatorModelVersions" -A 20 src/lib/calculatorModelVersion.ts

# 4. Run full local verification suite (Node tests, tsc, Vitest, Vite build, prerender, build isolation)
PATH=/opt/homebrew/bin:$PATH ./scripts/test_all.sh

# 5. Run focused /unslop, Split Workbench, and Pre-Launch regression suites
PATH=/opt/homebrew/bin:$PATH npx vitest run \
  src/CalculatorStudioUnslop.test.tsx \
  src/UnslopStageB.test.tsx \
  src/UnslopStageC.test.tsx \
  src/UnslopFinalPolish.test.tsx \
  src/FireWorkbenchUsability.test.tsx \
  src/CalculatorStudioWorkbench.test.tsx \
  src/DedicatedWorkbench.test.tsx \
  src/PreLaunchPolish.test.tsx

# 6. Audit evidence manifests and confirm zero raw/ leaks or missing files
PATH=/opt/homebrew/bin:$PATH node scripts/generate_evidence_manifest.mjs --audit

# 7. Verify live shared beta alias passes all 84 public calculator routes and serves /og-card.png + /robots.txt
curl -fsSL https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev/robots.txt
curl -fsSI https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev/og-card.png
PATH=/opt/homebrew/bin:$PATH node scripts/smoke_public_calculators.mjs https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev

# 8. Inspect committed hosted evidence manifests (C41–C46)
cat docs/execution/evidence/C45/manifest.json
cat docs/execution/evidence/C46/manifest.json
```

### Suggested High-Value Review Angles for Gemini Argon
1. **Visual & Interaction Spot-Check (Real Browser):** Load [`https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev`](https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev) in desktop (`1440px`) and mobile (`320px`/`390px`) in both light and dark modes across `/`, `/calculators`, `/calculators/fire`, `/calculators/mortgage`, `/calculators/compound-interest` (expand "Compare scenarios & year-by-year table"), `/calculators/xirr?returnMode=dated`, `/calculators/lease-vs-buy`, `/privacy`, `/terms`, and `/dashboard` (signed-out `AuthGate` + signed-in workspace).
2. **Interactive State Contrast Spot-Check:** Our automated audit checks default rendered DOM states + expanded `details.compound-analysis-card`. Gemini Argon can additionally exercise dynamic states (validation error banners on invalid inputs, hovered/focused buttons, open mobile drawer, open desktop workspace dropdown, saved-plan history compare cards) to confirm no dynamic state drops below `4.5:1`.
3. **Dark-Mode & High-Contrast / Print Spot-Check:** Verify `prefers-reduced-motion: reduce`, `forced-colors: active`, and `@media print` rendering across `/`, `/calculators/fire`, and `/calculators/mortgage`.
4. **Deferred Accessibility Checks:** Note that automated Chrome contrast/layout verification does **not** claim full WCAG conformance — native OS screen-reader (VoiceOver/NVDA) and native browser `200%` zoom sweeps (`A11Y-F01`–`A11Y-F03`, `ZOOM-FINAL` in `docs/execution/DEFERRED_CHECKS.md`) remain explicitly deferred.

---

## 6. Remaining Owner-Gated Items (Unchanged & Un-Fabricated)

No autonomous task remains blocked on engineering. Only owner-gated items stay open:
- **`OA-1` / `OA-3` (Production Cutover):** Owned HTTPS domain, live Clerk production instance/keys (`.env.production.local` + Pages production secrets), and production D1 backup/migrations (`a5860350-0a50-4ebe-9f5f-1d9916a908e6`). Production stays frozen at `3399dbb` until the owner executes the preflight.
- **`B51 / OA-5` (Real-User Validation):** Consented usability & genuine saved-plan return cohort (owner-deferred 2026-09-30; never fabricated).
- **`B13 / C12` (Paid Offer) & `B14 / C13` (Mobile Study):** Locked pending `B51` real-user retention evidence and owner go-ahead.
- **Native Assistive-Tech & 200% Zoom Sweeps:** `A11Y-F01`–`A11Y-F03` and `ZOOM-FINAL` tracked in `docs/execution/DEFERRED_CHECKS.md`.
