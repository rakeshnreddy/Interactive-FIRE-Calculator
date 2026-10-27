# Current continuation — 2026-10-27

Read [RESUME.md](RESUME.md) first. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`. C30R/B77 is verified on the shared beta; resolve PR #154 landing/main CI, then implement [B68/C30](prompts/B68.md), release it, and continue to [B70/C31](prompts/B70.md). B68/B70 are pending. Push, exact-head CI, isolated candidate verification, shared-beta promotion/verification and clear resumption docs are required per step.

The October 18 analysis is complete and preserved in `docs/calculator-excellence/ANALYSIS_2026-10-18.md`; do not rerun it. Direct implementation; no Gemini or broad agent fan-out. Narrow independent reviews may be used. Production/owner evidence gates remain in force. This continuation supersedes the older brief's initial-analysis instructions, counts and release state.

---

# FinPath — next-session brief (written 2026-10-18, state as of C29)

You are the next primary agent for FinPath: architect, implementer and responsible reviewer. The owner has asked for two large pieces of work, overlapping in execution:

1. **A comprehensive multi-agent analysis of every calculator**, turned into a ranked, evidence-backed fix backlog and then fixed in bounded checkpoints.
2. **A complete visual redesign of the whole site** — you have the owner's authority to decide the entire visual presentation and to make it look stunning, using every technique and capability available to you.

The owner explicitly asked for a multi-agent workflow. That request is your opt-in to orchestrate subagents and workflows at the scale the work needs (if the Workflow tool's size guideline is too small, ask the owner to raise "Dynamic workflow size"). No Gemini: the historical Gemini-worker role in AGENTS.md is superseded by the owner's direct-implementation continuation; you and the subagents you launch do the work, and you remain the single integrator and reviewer.

---

## 1. What FinPath is

FinPath is a personal-finance **decision and planning** web app for people in the **United States and India**. Its promise: answer a focused money question quickly, explain *why* the number is what it is, compare realistic alternatives, and — if the person wants — keep that decision connected to real accounts, goals, transactions and saved plans. Read `PRODUCT.md` (purpose, users, principles) and `DESIGN.md` (current design system) first.

**Two halves**

- **Public calculator library (no account needed):** 82 registry calculators plus a dedicated FIRE planner, **84 public routes** under `/calculators/*`. Regions: 34 US, 26 India, 22 global. Seven toolkits ("studios"): Loan & Home (36), Growth & Goal (12), Retirement Income (9), Income & Tax (9), Debt Payoff (7), Return Analysis (5), Cashflow & Balance Sheet (4); about 60 distinct formulas. Every calculator has validated inputs, a headline result with supporting metrics, three what-if scenarios, an input-sensitivity summary, a year-by-year schedule with CSV export, share links, local drafts and save-to-account.
  - Dedicated, richer experiences: FIRE (`src/lib/fire.ts`), compound interest, savings goal, cashflow/budget/emergency fund/net worth, XIRR with dated cash flows, vehicle lease-vs-buy, mortgage affordability with housing costs.
- **Signed-in workspace (Clerk auth, Cloudflare D1):** `/dashboard`, `/accounts`, `/transactions` (CSV import), `/goals`, `/plans` (saved scenarios, reviews, deep links), `/reports`, `/settings`. Records are private and identity-scoped; data deletion and recovery are documented.

**Stack:** React 18 + TypeScript + Vite SPA with prerendered public routes (92 pages); Cloudflare Pages + Pages Functions (`functions/api/*`) + D1; Clerk; Recharts; lucide-react; Inter Variable (bundled); Vitest + jsdom; playwright-core is available for browser automation. CSS is hand-written: `src/vivid-theme.css` (~2.2k lines, token owner) and `src/styles.css` (~10.8k lines of historical selectors). No CSS framework.

**Code map:** registry and engines `src/lib/seoCalculators.ts`; studio metadata, scenarios and schedules `src/lib/calculatorStudios.ts`; copy and quality `calculatorContent.ts`, `calculatorQuality.ts`, `calculatorScope.ts`; sensitivity/share/summary CSV `calculatorEngagement.ts`; validation `calculatorInputState.ts`; shared calculator page `src/CalculatorLibrary.tsx`; app shell and routing `src/App.tsx`, `src/lib/navigation.ts`.

## 2. Where things stand (verify before trusting)

- **main** = `4b2472b` (PR #152 merged, CI green), working tree clean at handoff. Confirm with `git status --short --branch`, `git log origin/main -5` and the open-PR list. Work in `/Users/Rakesh/Projects/Interactive-FIRE-Calculator` (the copy under Documents/ChatGPT is stale). Never reset, stash or overwrite another session's edits; stage only your own paths.
- **Accepted:** checkpoints through **C29**; **64/67 registered tasks** (a task count, not launch readiness). The C24–C29 run: FD/CD/RD deposit presentation and rate basis; exact-term schedules wherever a table tracks a headline; PPF whole financial years and ₹1,50,000 cap (read from the PPF Scheme 2019 gazette); gratuity table; truthful generated input helpers; lump sum/SIP market-growth presentation. Details in `docs/execution/RESUME.md`, `TASK_STATUS.json`, `CHECKPOINTS.md` and `docs/execution/reviews/C24.md`–`C29.md`.
- **Tests:** 105 files / 2,777 tests via `PATH=/opt/homebrew/bin:$PATH ./scripts/test_all.sh` (typecheck, Vitest, build, prerender, build isolation).
- **Stable beta (shared preview):** https://codex-finpath-quality-execut.interactive-fire-calculator.pages.dev — currently C29, immutable https://d5ce67a4.interactive-fire-calculator.pages.dev. Protocol: `docs/execution/BETA_RELEASE_PROTOCOL.md`.
- **Production is gated and stays untouched:** it still serves old `3399dbb`; automatic production deploys are off; the auth preflight cannot start until the owner supplies `.env.production.local` (live Clerk key + an owned domain, OA-1). Never bypass this.
- **Owner-gated, never faked:** B51 real-user study, B13 paid offer, B14 mobile study, OA-1/OA-3 production, native screen-reader and 200%-zoom checks (A11Y-F01–F03 in `DEFERRED_CHECKS.md`). No WCAG conformance claim exists yet.
- **Known open residuals:** loan EMI routes (EMI, home/car/personal loan EMI, mortgage) still have generic copy; gratuity statutory part-year counting needs a re-readable primary source and a versioned model; most generated input helpers are true but generic; the PPF "Annual return" helper is generic.

## 3. Workstream A — multi-agent calculator analysis

**Goal:** a complete, evidence-backed picture of every calculator's correctness, honesty and usability, then fixes delivered in bounded checkpoints. Findings must be reproduced, never guessed.

**Orchestrate it with the Workflow tool** (load the `workflow-authoring` skill first). Suggested shape — adapt as needed:

1. **Inventory (deterministic, no model):** a read-only Vitest capture script that dumps, for every route: slug, region, studio, formula, inputs (key/label/helper/unit/min/max/default), default result object, scenario vectors and results, schedule columns and last rows at the default term and default + 0.5, and rendered page text. The C25–C29 evidence folders contain working examples; never commit the temporary script.
2. **Fan-out review, one read-only agent per toolkit (7):** each audits its routes against a fixed checklist and returns structured findings:
   - *Math:* re-derive the engine formula from source; compute independent oracles (Python `Decimal`); probe edge cases (zero, very large, fractional terms, zero rate, invalid input); reconcile headline ↔ metrics ↔ schedule ↔ CSV ↔ chart ↔ reconciliation line.
   - *Domain truth:* region-correct terminology and rules (US vs India); dated primary sources (CFPB, IRS, RBI, India Post, Income Tax Department, PFRDA, EPFO) for any statutory claim; flag any claim the page cannot support.
   - *Copy honesty:* inputs describe what the engine actually does (timing, compounding, units); exclusions stated; no forecast or guarantee language; neutral scenario labels; no SEO or marketing leakage.
   - *UX:* answer visible above the fold at 390 and 1440, keyboard reveal, invalid-input behaviour, long-value containment, chart readability.
   - Finding schema: `{route, category (math|domain|copy|ux|a11y|perf), severity, evidence (input → observed vs expected, with oracle), source, proposed fix, blast radius (results / saved records / share links)}`.
3. **Adversarial verification:** for each finding, a separate agent tries to *disprove* it (re-runs the oracle, re-reads the engine, checks whether the behaviour is intentional and documented). Only confirmed findings survive.
4. **Synthesis:** one ranked backlog in `docs/calculator-excellence/ANALYSIS_<date>.md`, grouping findings into bounded contracts (roughly 1–4 routes or one cross-cutting fix each), each flagged when it changes results or saved records.
5. **Implementation:** register each contract (prompt + `TASK_STATUS.json` + `CHECKPOINTS.md` + `EXECUTION_BACKLOG.md`) *before* edits, write failing tests first, then fix, verify and release through §5. Parallel implementation is fine in separate git worktrees when contracts touch disjoint files; you integrate, review, and every merge still passes the full suite.

Honesty rules: never cite a source you could not re-read (official PDFs can be read by zlib-decompressing their streams locally — see the C27 evidence); any change to a calculated result needs a model version and must keep historical saved results readable; scenario vectors and share links stay stable unless a contract says otherwise.

## 4. Workstream B — make the whole site visually stunning

**Authority:** the owner has handed you full control of the visual presentation of the entire site — public pages, the calculator library, every calculator template, dedicated calculators, charts and the signed-in workspace. You may replace the palette, typography (including Inter, if a better pairing serves the product), layout system, iconography, illustration, motion and chart language. Earlier restraints in `DESIGN.md`, `docs/VISUAL_DESIGN_SPEC.md` and `docs/COLOR_AND_GLASS_SYSTEM.md` (8px radius cap, motion limits, glass limits, Inter-only) are **advisory, not binding** for this redesign. Record what you keep and what you supersede, with reasons, in a new dated section of `DESIGN.md`.

**Non-negotiable:** calculated results and their honesty; financial values stay legible solid ink with tabular numerals and are never decorative (no gradient digits, no glass behind inputs or results that harms contrast); estimates never look like promises or advice; no fake trust badges, testimonials or invented data; public routes and URLs unchanged; WCAG 2.2 AA as the target in both themes (measure real contrast pairs), keyboard operability and visible focus, `prefers-reduced-motion` and reduced-transparency fallbacks, 200% zoom reflow, no horizontal page overflow at 320px; performance at or better than today (LCP, CLS, JS weight), and every new dependency justified.

**Process:**

1. **Audit what exists:** screenshot every page family (home, library, one calculator per studio, each dedicated calculator, workspace pages, empty/error/auth states) at 1440, 768, 390 and 320 px in light and dark. Read `docs/VISUAL_AND_UI_AUDIT.md`, `docs/LANDING_PAGE_REVIEW.md` and `docs/design/theme-board.html`.
2. **Research and choose a direction:** study best-in-class financial, data-visualisation and editorial products for patterns worth beating, not copying. Use the installed gstack design skills: `gstack-design-consultation` (full design-system proposal), `gstack-design-shotgun` (several distinct directions on a comparison board), `gstack-plan-design-review`, then `gstack-design-review` and `gstack-qa` during rollout. Produce at least three genuinely different directions, pick one decisively, and explain why it suits a calm, trustworthy, quietly optimistic money tool for US and India audiences.
3. **Design system first:** tokens in OKLCH for light, dark (and ideally high-contrast) themes; a type system with a distinctive display face and a highly legible UI/number face; spacing, radius, elevation and material scales; a data-visualisation language (series colours with pattern/label redundancy, axes, annotations, the result "hero"); iconography and illustration rules; motion principles. Make one runtime source of truth (`src/vivid-theme.css` or a successor) and **retire the conflicting legacy rules in `src/styles.css`** rather than layering on top of them.
4. **Use the modern platform where it earns its place:** `@property` for animatable gradients, `color-mix()` and OKLCH, container queries, `:has()`, cascade layers, subgrid, the View Transitions API for route and result changes, scroll-driven animations, variable-font axes, refined Recharts theming or custom SVG charts, skeleton/loading and empty states, and purposeful micro-interactions on direct feedback (result reveal, scenario switch, save, copy share link). Every motion needs a reduced-motion path; theme switching follows the system setting and transitions smoothly.
5. **Roll out in staged checkpoints**, each a registered contract released through §5: (a) tokens + shell/navigation/footer; (b) home page; (c) calculator library and toolkit pages; (d) the shared calculator template (inputs, result hero, scenarios, sensitivity, schedule, scope notice, actions); (e) charts; (f) dedicated calculators; (g) signed-in workspace; (h) a polish pass. Keep every checkpoint shippable and the suite green.
6. **Verify each stage:** before/after screenshots at every breakpoint and both themes; measured contrast for real colour pairs; keyboard walk-through; reduced-motion and reduced-transparency checks; no layout shift while typing (the `resultReveal` contract); no overflow at 320px; a Lighthouse/web-vitals snapshot (`web-perf` skill) against the prior baseline. Consider adding a Playwright-based visual snapshot runner (playwright-core is already a dev dependency) so later work catches visual regressions.
7. **Show the owner:** publish a private design-board artifact summarising the chosen direction (palette, type, key components, before/after screenshots) and share the preview link at each stage. The owner granted authority to decide, so do not block on approval — just make the result easy to see.

## 5. Release loop (every checkpoint, both workstreams)

Register the contract → failing behavioural tests first → implement → run the relevant tests, then `PATH=/opt/homebrew/bin:$PATH ./scripts/test_all.sh` → commit explicitly staged paths and open a PR → exact-head CI green → `npm run build:preview-auth` from a clean tree, then `npx wrangler pages deploy dist --project-name interactive-fire-calculator --branch <feature-branch> --commit-hash <sha> --commit-dirty=false` → verify the candidate (provider commit/branch/success; preview D1 exactly `0dbad68e-7493-452f-8504-98d4c61ee5da`; runtime JS/CSS hashes equal the local build; `/api/health` 200 and protected routes 401; `node scripts/smoke_public_calculators.mjs <url>` passes all 84 routes; real browser journeys in both themes at 1440/390/320 with keyboard reveal) → write the submission, review and compact evidence (raw logs stay in ignored `evidence/<C>/raw/`; committed manifests carry hashes) → mark accepted → promote the same product to the stable beta label `codex/finpath-quality-execution` and verify it the same way (the alias can lag about 15 seconds; re-check and record only a matching check) → merge after the final docs CI → confirm main CI → update `RESUME.md` and this file.

Verification habits that prevented false claims in C24–C29 (memory `finpath-review-pitfalls`): static renders skip `useEffect`, so use the `createRoot` + `act` live-render pattern for typed-value tests; tab order differs by route; capture CSV content by wrapping `URL.createObjectURL` and suppressing the download; clear local drafts before measuring typing stability; separate scroll anchoring from real layout shift by measuring the field's on-screen position.

## 6. Hard limits

Never deploy production, change DNS, buy services, run paid campaigns, or touch production D1 `a5860350-0a50-4ebe-9f5f-1d9916a908e6`. Never print keys or read personal browser credentials. No financial values in analytics; sample data only in artifacts. Never fabricate hosted results, user research, retention data or source citations. If a permission prompt blocks a shared-beta deploy or a merge, ask the owner rather than routing around it. Stop at verified checkpoints and report what changed, the evidence, remaining risk, the next item, and PR and preview links.
