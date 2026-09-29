# Companion app decision

2026-09-07. Decision: responsive web first. No native app or PWA offline financial cache in this milestone. Reconsider after retained review behavior and a stable authenticated API, no earlier than a 90-day pilot with mature cohorts.

## The mobile job

A user opens a due review, enters or confirms two or three dated balances, reads the change in their saved plan, and chooses keep/revise/defer. This is distinct from a mobile trading terminal or full CSV reconciliation workflow. Current 390px calculator routes work in sampled states; authenticated mobile use is blocked by browser auth configuration. No demand evidence currently establishes a missing device capability.

Potential useful device needs: quick unlock/re-authentication, generic reminder delivery and optional document selection. Camera/OCR, background bank refresh, widgets and biometric access are hypotheses, not required features. A reminder should never expose balances, retirement targets or debt on a lock screen.

## Options

| Option | Fit / advantages | Tradeoffs / decision |
|---|---|---|
| Responsive web | Existing React/UI/API; one release; public calculators and monthly review accessible by URL | Validate keyboard/reflow and authentication first; chosen now |
| PWA | Possible install affordance and opt-in web push while reusing UI | Service-worker versioning/offline cache and platform constraints need work; prototype only if installation/reminder friction is observed |
| React Native | Potential shared TypeScript domain contracts; separate mobile presentation | Web UI is not automatically reusable; token storage, app links, release/signing, accessibility and sync all need design; defer |
| Native iOS/Android | Greatest platform-specific control if an indispensable device task exists | Two client implementations and larger correctness/release surface; unjustified for current monthly review |

These are engineering judgments, not benchmark claims. Apple's [WebKit web-push documentation](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) describes push for Home Screen web apps on iOS/iPadOS 16.4+, requiring direct user interaction for permission. Validate the actual supported OS/browser matrix before promising reminders. Push alone is not evidence that native is needed. The current repo has no service worker/mobile app implementation.

## Shared contract required before a second client

Version money as `{minorUnits, currency}` with explicit currency handling, never bare mixed cents. Stable identifiers: user-owned account, dated balance, decision, immutable plan version, review and source provenance. Server validates current identity/ownership on every operation. Explicit schema/engine versions prevent silent reinterpretation of stored calculations. Add idempotency keys, optimistic concurrency, paginated reads, structured typed errors and deletion tombstones before introducing mobile writes.

Keep `src/lib/fire.ts` and other deterministic engines shareable, with their regression fixtures. Do not couple domain logic to Clerk React hooks, DOM storage or app navigation. A published stable internal API/OpenAPI contract and contract tests precede second-client development; the existing Pages APIs alone are not proof of stability.

## Offline, sync and security

Initially online-only private workspace; public calculations may work locally after assets load, with explicit device-draft disclosure. Never display stale balances as current. Do not cache authenticated API responses in a service worker. If offline editing later proves necessary: encrypted device store, per-account isolation, explicit pending state, server-authoritative versions, conflict choice and replay-safe mutations. Sign-out clears private caches; lost-device response revokes sessions; deletion wins over delayed offline writes. No secrets in push payloads or deep links.

Use platform-secure token storage for any native client and current provider-supported auth flows after a dedicated review; do not invent a homegrown biometric auth scheme. Clipboard/export/share can expose data even without a bank connection. Test session expiry, wrong-account switch, backup restore, lost connectivity mid-save, revoked consent and deletion during offline state.

## Decision gate

All required: >=50 activated users across two cohorts; >=30% M1 meaningful reviewers and >=25% matured M3 reviewers; at least 15 retained users perform most reviews on mobile; at least 5 observed failures attributable to web/device limitations that responsive improvements cannot solve; stable currency/idempotency/deletion API for 8 weeks; no unresolved P0 data/security findings; owner approves budget/store accounts/support.

First compare an improved responsive journey against an opt-in PWA prototype, using completion time, failed saves, return reviews and notification opt-outs. Build a native client only if an evidenced device need remains. Tentative responsible milestone: evaluate at month 4–6, not a promise to release then. Pilot targets are learning thresholds, not statistical certainty. Human effort: responsive improvements 3–5 days; PWA proof 1–2 weeks; second-client proof 4–8 weeks plus store/review work. Agent effort roughly 1–2, 3–5 and 10–20 days respectively, excluding owner work. Re-estimate from observed requirements.

Kill criterion: if users do not return on web, stop companion development and revisit the recurring job. More distribution surfaces do not cure absent value.
