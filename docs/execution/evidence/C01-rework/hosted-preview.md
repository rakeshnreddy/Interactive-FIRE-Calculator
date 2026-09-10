# C01 R4 hosted-preview evidence

Candidate code SHA: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

## CI

GitHub Actions `Verify` run [34461062495](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34461062495) is successful at the exact candidate SHA. The single `Full suite` job completed every checkout, dependency, test/build, and audit step successfully.

## Successful immutable static preview

After explicit owner authorization, only the exact candidate's static `dist` directory was published from `/tmp/finpath-static-deploy.QXa4Qy`, which contained no repository `functions/` directory or `wrangler.toml`. The command used the explicit preview branch, project, full commit hash, and `--commit-dirty=false`. It did not publish Functions or backend code.

Cloudflare reports:

- deployment: `f05b7516-bcbc-4e07-9925-5de3385d9e0f`
- environment: `Preview`
- branch: `codex/finpath-quality-execution`
- source: `ccebac7`
- immutable URL: [https://f05b7516.interactive-fire-calculator.pages.dev](https://f05b7516.interactive-fire-calculator.pages.dev)

The immutable root and both hashed assets returned HTTP 200. Remote SHA-256 values exactly equal the clean candidate build:

| File | Local and hosted SHA-256 |
|---|---|
| `index.html` | `f454579872c6339a715dad5b7934a727969ce1ad4b9fdb6a92d0a0b564fdd356` |
| `assets/index-D43Xm0d1.js` | `fdc1178ce435465540d140ca7cfdc4b5b7e8d2e15b2cc20a34e83b5f3d2dfc23` |
| `assets/index-FOuMMIUu.css` | `6cbfe011971158e0a2fab00ae03acd2ecd7c6429c653a64a20048dfc33ff4658` |

## Hosted smoke and rendered journeys

`npm run smoke:calculators -- https://f05b7516.interactive-fire-calculator.pages.dev` exited `0`: `Verified 84 public calculator routes without authentication`.

Installed Chrome 152.0.7977.83 rendered the immutable preview through Playwright:

- Desktop `/calculators`: `Calculators` exposed `aria-current="page"`; Workspace opened with keyboard Enter, rendered its four native links on an opaque white reduced-transparency dropdown with no backdrop filter, closed with Escape, and restored focus. FIRE navigation reached `/calculators/fire`. Zero console messages or page errors.
- Mobile home at 390x844 with reduced transparency/motion: open navigation exposed Calculators, FIRE, and Workspace; document/client width both measured 390px; Escape removed the panel and restored focus to Open navigation. [`hosted-home-mobile-390x844.png`](../../../../output/playwright/C01/B16-rework/hosted-home-mobile-390x844.png).
- Savings Goal: invalid `-1` produced `aria-invalid="true"`, helper and error IDs in `aria-describedby`, and an alert containing the exact error. Zero console messages or page errors. [`hosted-savings-error-1440x900.png`](../../../../output/playwright/C01/B16-rework/hosted-savings-error-1440x900.png).
- `/accounts`: GET-only render remained fail-closed at the existing missing-config AuthGate (`Production Clerk configuration is required` semantics; no authenticated UI or write path). Zero console messages or page errors.
- Calculator library desktop render: [`hosted-calculators-1440x900.png`](../../../../output/playwright/C01/B16-rework/hosted-calculators-1440x900.png).

No production deploy, hosted write, auth bypass, save, import, deletion, real identity, or financial record was used.

Reviewer clarification 2026-09-10: Cloudflare reports `uses_functions=false` for this static deployment, but its metadata still lists the shared D1 binding. This is not proof of database isolation; B33 remains unaccepted.
