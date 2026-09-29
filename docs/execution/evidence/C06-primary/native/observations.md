# C06 native Chrome observation

- Candidate: `7b5cc31` (worktree `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`)
- Captured: 2026-09-14, America/Los_Angeles
- Server: `npm run dev:fixtures`, Vite `http://127.0.0.1:5173/` (owned local process)
- Browser: Google Chrome native desktop window, agent-created tab group `🧪 C06 native zoom`
- Native zoom proof: Chrome toolbar accessibility state exposed `button Zoom: 200%`; opening that control exposed `window Zoom: 200%` and `container Zoom: 200%`. No CSS/document zoom or viewport emulation was used.

## States

### Dashboard, populated, light

- URL: `http://127.0.0.1:5173/fixtures.html?component=dashboard&state=populated&theme=light`
- Screenshot: `dashboard-light-populated-200.png`
- Chrome proof screenshot: `dashboard-light-populated-200-chrome-proof.png`
- AX observations: dashboard heading and populated metrics were present: Net worth `$200,300`, Assets `$522,750`, Liabilities `$322,450`, Goals funded `60%`, Monthly cash flow `+$2,827`; priority insights, saved calculator result, transaction rows, goal progress, and five account snapshot rows were visible in the accessibility tree.
- The rendered screenshot shows the light theme and readable primary cards at native 200%; the page continues vertically below the viewport, with no evidence of a native zoom transform or horizontal page scrollbar in the captured window.

### Accounts, long-value, dark

- URL: `http://127.0.0.1:5173/fixtures.html?component=accounts&state=long-value&theme=dark`
- Screenshot: `accounts-dark-long-value-200.png`
- AX observations: dark theme was explicitly exposed as `🌙 Dark`; the form exposed Account name, Type (`Checking`), Institution, Currency, Balance/debt, Balance date, and Add account. CSV import controls and both long-value saved account rows were present, including `$1,234,567,890` and `$98,765,432`, with Record and Archive actions.
- The account Type control exposed a native `Expand` action and its option set (Cash, Checking, Savings, Investment, Retirement, real estate, Other asset, Credit card, Loan, Mortgage, Other liability) in the AX state. Long account names and the large balances remain represented in the page state.

### Dashboard, populated, dark

- URL: `http://127.0.0.1:5173/fixtures.html?component=dashboard&state=populated&theme=dark`
- Screenshot: `dashboard-dark-populated-200.png`
- AX observations: `🌙 Dark` was explicitly exposed and the same populated dashboard metrics, priority insights, saved result, cash-flow rows, goal progress and account snapshot were present at the native `Zoom: 200%` toolbar state.

## Diagnostics and limits

- The fixture announced `ISOLATED LOCAL TEST` and `NETWORK MUTATIONS BLOCKED`; the accounts state also announced an in-memory `LoadBalanceImportHistory` action with zero network mutation.
- The CUA surface provided accessibility state and native Chrome UI state, but did not expose console/page-error log retrieval. No page error was surfaced in the native AX observations; console/page-error logging is therefore recorded as unavailable from this tool surface rather than claimed as a pass.
- This is bounded representative evidence for dashboard and accounts at native 200%, light/dark and populated/long-value states. It does not certify every C06 component or responsive width.
