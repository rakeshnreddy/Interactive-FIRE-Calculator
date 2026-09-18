# C01 initial candidate recheck (historical)

> Superseded by [the corrected final candidate](../C01-rework/final-candidate.md) and [accepted review](../../reviews/C01.md). The blocked items below describe the earlier submission.

Evidence date: 2026-09-09. Final code candidate: `ad580088938fc9f2a0e499eb70f0608be0c89aff` (B17). Evidence-only commits after this SHA do not change the candidate product code.

## Exact candidate verification

- Clean archive: `/tmp/finpath-b17.QGMe23`, created with `git archive ad58008`.
- Locked install: 265 packages, zero vulnerabilities.
- `./scripts/test_all.sh`: exit 0; 13/13 runner tests; 79 Python tests plus 21 subtests; 27 Vitest files and 1,276 tests; TypeScript and production build passed.
- `npm audit --json`: zero info, low, moderate, high, or critical findings.
- Local production-browser matrix: 1440, 1024, 768, 390, and 320 widths; light/dark; keyboard; semantic snapshot; history; native middle-click; reduced motion/transparency.

## Earlier-task rechecks on the final candidate

| Task | Recheck at `ad58008` | Result |
|---|---|---|
| B15 header and inverse contrast | Sign in retained `rgb(237,247,244)`, a 44px transparent topbar control and paired border; the inverse heading remained white on `rgb(23,59,82)` (11.77:1). Light primary remained white on `rgb(8,127,114)` (4.90:1); dark primary remained `rgb(13,36,32)` on `rgb(91,199,181)` (7.97:1). | PASS locally |
| B16 token and primitive contract | FIRE, mortgage, and savings-goal scans found zero visible editable controls below 16px or 44px and zero visible non-breadcrumb buttons below 44px. The three routes had zero horizontal overflow. Reduced-transparency/motion both matched; topbar was opaque with no blur. | PASS locally |
| B17 navigation and keyboard behavior | Public-first navigation, real hrefs, unmodified interception, middle-click, back/forward/reload, current-route semantics, desktop/mobile Escape, focus return, breakpoint cleanup, skip link, and one-shot route-heading focus all passed. | PASS locally |

Durable details are in [`B15-browser.md`](B15-browser.md), [`B16-browser.md`](B16-browser.md), and [`B17-browser.md`](B17-browser.md).

## Blocked external evidence

- Immutable Cloudflare preview and hosted smoke: BLOCKED because the environment denied the preview publication as sensitive third-party egress. No production/default deployment or workaround occurred.
- Exact-SHA hosted CI for B16/B17: BLOCKED because the environment denied pushing these private-repository commits to the configured remote as unverified egress. PR #140 therefore ends at the already-pushed B15 evidence commit, not the local final candidate.
- Native browser UI zoom at 200%: BLOCKED because the automation surface cannot set or prove browser chrome zoom. Responsive viewport evidence is not substituted for this check.

No backend/functions/auth/migration code changed, no hosted write occurred, and B33 isolation was not assumed.
