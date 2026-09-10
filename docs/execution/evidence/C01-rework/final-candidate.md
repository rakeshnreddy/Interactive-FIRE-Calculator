# C01 corrected final candidate

Date: 2026-09-10 (America/Los_Angeles)

Baseline: `ae10ea516e1df38cf2fce5f0c704e1c855c9db01`

Final code candidate: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

PR: [#140](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140), base `codex/dependency-security-refresh`, branch `codex/finpath-quality-execution`. The PR remains unmerged.

Immutable static preview: [f05b7516](https://f05b7516.interactive-fire-calculator.pages.dev), deployment `f05b7516-bcbc-4e07-9925-5de3385d9e0f`, provider branch `codex/finpath-quality-execution`, provider source `ccebac7`. Only the verified static `dist` directory was published from an isolated temporary working directory; no Functions, backend, database binding, or hosted write was included.

## Review corrections

- R1: corrected the reduced-transparency selector so the opaque surface applies to `.desktop-nav-dropdown`, not the transparent `.desktop-nav-menu` trigger wrapper. Light/dark, normal/reduced, closed/open, hover/focus/current, mobile, B15 Sign in/inverse pairs, and native Chrome 200% zoom pass. See [`R1-browser.md`](R1-browser.md).
- R2: completed a real VoiceOver/Chrome smoke, retained an actual caption of the skip-link announcement, recorded reader/browser versions and observed operation, and separately corroborated expanded/current/field/error semantics. VoiceOver was restored to off. See [`voiceover.md`](voiceover.md).
- R3: ran interleaved three-sample baseline/candidate measurements with identical browser, viewport, cache, service-worker, device, and network conditions. No median regressed by more than 10%. See [`performance.md`](performance.md) and [`performance-lab.json`](performance-lab.json).
- R4: exact-candidate CI passed; a successful immutable preview reports source `ccebac7`; HTML/JS/CSS are byte-identical to the verified build; all 84 public routes passed; desktop/mobile navigation, FIRE routing, savings validation, and the private missing-config boundary rendered without console warnings, exceptions, or page errors. See [`hosted-preview.md`](hosted-preview.md).

## Exact candidate gate

The unmodified `./scripts/test_all.sh` passed from a clean `git archive` of the final code candidate: 13 runner tests, 79 Python tests plus 21 subtests, 27 Vitest files / 1,276 tests, TypeScript, and Vite production build. `npm audit --json` reports zero findings across 265 dependencies. See [`candidate-verification.md`](candidate-verification.md) and [`npm-audit.json`](npm-audit.json).

GitHub Actions `Verify` [run 34461062495](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34461062495) passed at the exact full SHA. Later packet-only changes do not modify product/config files.

Known non-blocking advisory: Vite still reports the pre-existing main entry chunk above 500 kB. Production deployment remains out of scope; C01 is submitted for review only.
