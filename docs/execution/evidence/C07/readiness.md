# Checkpoint C07 Read-Only Preparation & Readiness Packet

**Document**: `docs/execution/evidence/C07/readiness.md`  
**Date**: September 15, 2026  
**Status**: READ-ONLY PREPARATION (C07 is LOCKED pending owner authorization)  
**PR**: [PR #140 (codex/finpath-quality-execution)](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/pull/140)  
**Accepted C06 Candidate SHA**: `0f3ae8d9cc4d447518e484b8de7a34ee1b54f38a` (recorded at `923deea`)  
**Active Preview URL**: `https://5e68409d.interactive-fire-calculator.pages.dev`  
**Effective Database**: Isolated `finpath-preview` D1 UUID `0dbad68e-7493-452f-8504-98d4c61ee5da` (Migration 0006 verified with 29 active triggers; no reapplication requested)

---

## 1. Concrete Observed Defect

When opening `/dashboard` at 390px (and all standard desktop/mobile viewports) on `https://5e68409d.interactive-fire-calculator.pages.dev/dashboard`:
- The page renders HTTP 200 with an unconfigured auth gate panel:
  > **"Account features are currently unavailable."**  
  > *"Saved plans, accounts, and cross-device sync require account services that are not active in this preview. You can use all interactive financial calculators without an account."*
- All 84+ public financial calculator routes and homepage pass with HTTP 200.
- Server-side protected API endpoint `GET /api/me` returns HTTP 401 (`{"error":"Unauthorized"}`).

---

## 2. Root Cause Analysis & Technical Evidence

### 2.1 Build-Time Key Omission in Direct Asset Uploads
- **Frontend Contract (`src/auth.tsx`)**:
  ```ts
  const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  export function AuthProviderBoundary({ children }: { children: (auth: AuthState) => ReactNode }) {
    if (!clerkPublishableKey) {
      return children({
        provider: 'clerk',
        status: 'not-configured',
        isConfigured: false,
        isSignedIn: false,
        missingEnv: ['VITE_CLERK_PUBLISHABLE_KEY'],
        user: null
      });
    }
    return <ClerkProvider publishableKey={clerkPublishableKey} ...>{...}</ClerkProvider>;
  }
  ```
- **Vite Bundler Behavior**:
  Vite evaluates `import.meta.env.VITE_*` variables statically at build time. When `npm run build` is executed in an environment lacking `VITE_CLERK_PUBLISHABLE_KEY`, Vite replaces `clerkPublishableKey` with `undefined`. Terser/Rollup optimizes `if (!clerkPublishableKey)` into an unconditional constant return, tree-shaking away `<ClerkProvider>` entirely.
- **Compiled Bundle Evidence (`assets/main-bAwZozDl.js` on `5e68409d`)**:
  ```js
  function Dd({children:e}){return e({provider:"clerk",status:"not-configured",isConfigured:!1,isSignedIn:!1,missingEnv:["VITE_CLERK_PUBLISHABLE_KEY"],user:null})}
  ```
- **Deployment Pipeline Architecture**:
  Cloudflare Pages project `interactive-fire-calculator` has Git preview builds scoped exclusively to `preview_branch_includes: ["codex/cloudflare-pages-theme-plan"]`. Deployments on `codex/finpath-quality-execution` are performed via `wrangler pages deploy dist` (`ad_hoc` upload, where stages `clone_repo` and `build` remain `idle`). The bundle is compiled on the local workstation/agent shell, where `VITE_CLERK_PUBLISHABLE_KEY` was not exported. Thus, presence of the key in Cloudflare Pages project secrets had zero effect on the static client bundle.

### 2.2 Server-Side Functions Runtime State
- **Pages Functions Environment (`functions/_lib/session.ts`)**:
  When `GET /api/me` is invoked, `requireClerkAuth` reads `env.CLERK_PUBLISHABLE_KEY` and `env.CLERK_SECRET_KEY`.
  If either were missing, it would return HTTP 503 (`{"authConfigured":false}`).
- **Observed Response**:
  `curl -s https://5e68409d.interactive-fire-calculator.pages.dev/api/me` returns HTTP 401 (`{"error":"Unauthorized"}`).
- **Conclusion**:
  Server-side preview credentials are active and functioning correctly on Cloudflare edge. Only the frontend build-time key was missing from the client artifact.

---

## 3. Provider Metadata & Configuration Classification Inventory

| Configuration Parameter | Target / Location | Presence | Classification | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **Clerk Application** | Clerk Dashboard | **PRESENT** | DEVELOPMENT | Linked App `app_3EzmNqZyUgQlO1n2nrftcHWizyV` (`Finpath`) |
| **Clerk Instance** | Clerk Dashboard | **PRESENT** | DEVELOPMENT | Instance `ins_3EzmNoRe49U12NtPgfiqgXHKsgh` (`development`) |
| **Server Publishable Key** (`CLERK_PUBLISHABLE_KEY`) | Pages Project Preview Secret | **PRESENT** | DEVELOPMENT (`pk_test_`) | Injected into Pages Functions runtime via Cloudflare binding |
| **Server Secret Key** (`CLERK_SECRET_KEY`) | Pages Project Preview Secret | **PRESENT** | DEVELOPMENT (`sk_test_`) | Injected into Pages Functions runtime via Cloudflare binding |
| **Server Authorized Parties** (`CLERK_AUTHORIZED_PARTIES`) | Pages Project Preview Secret | **ABSENT** | N/A | Defaults safely in `session.ts` to `[new URL(request.url).origin]` |
| **Client Publishable Key** (`VITE_CLERK_PUBLISHABLE_KEY`) | Pages Project Preview Secret | **PRESENT** | DEVELOPMENT (`pk_test_`) | Stored in Cloudflare, but unused during ad-hoc `wrangler pages deploy dist` |
| **Local Client Build Key** (`VITE_CLERK_PUBLISHABLE_KEY`) | Workstation / Agent Shell | **ABSENT** | N/A | Missing from local environment during `npm run build` |
| **Allowed Preview Origin** | Clerk Dashboard / Redirects | **REQUIRES CONFIRMATION** | DEVELOPMENT | Needs confirmation that `https://*.pages.dev` or exact preview URL is whitelisted |
| **Target Database** | Cloudflare D1 Preview Binding | **PRESENT** | DEVELOPMENT / ISOLATED | UUID `0dbad68e-7493-452f-8504-98d4c61ee5da` (`finpath-preview`) |

*Security Notice: Per protocol, no secret values, raw tokens, or credential strings are recorded or transmitted.*

---

## 4. Proposed Concrete Execution Sequence (Pending C07 Release)

Once the primary reviewer releases Checkpoint C07 and the owner provides the missing authorization:

1. **Secure Local Build-Time Injection**:
   - Provide the development publishable key (`pk_test_...`) to the build environment via transient environment variable:
     `VITE_CLERK_PUBLISHABLE_KEY="<development_key>" npm run build`
   - Verify build isolation via `node scripts/verify_build_isolation.mjs` (ensuring 0 fixture leaks, no synthetic test markers in production bundle).
   - Inspect output bundle to confirm `ClerkProvider` is preserved and `pk_test_` is present.
2. **Deploy to Preview Branch**:
   - Deploy exclusively to the codex branch:
     `npx wrangler pages deploy dist --project-name interactive-fire-calculator --branch codex/finpath-quality-execution`
   - Re-verify deployment metadata via Cloudflare API: confirm effective DB binding remains `0dbad68e-7493-452f-8504-98d4c61ee5da`.
3. **Synthetic User Lifecycle Verification (Users A & B)**:
   - Use two disposable synthetic accounts (e.g., `synthetic-user-a@example.org`, `synthetic-user-b@example.org`):
     - **Sign-up / Sign-in / Sign-out**: Verify Clerk modals render, redirect correctly to `/dashboard`, and clear sessions cleanly.
     - **Session Refresh & Expiry**: Validate token refresh without unexpected logouts.
     - **Save & Reload**: Create a financial plan / account entry for User A; reload page and confirm persistence from isolated D1.
     - **Profile & Export**: Confirm profile identity matches session; test JSON export of account data.
     - **Cross-User Isolation**: Sign in as User B; verify User B cannot view, query, or mutate User A data (tenancy guard).
     - **Account Deletion & Resurrection Guard**: Delete User A account data; verify soft-deletion tombstone in D1, verify subsequent writes reject with 410, and delete Clerk test identity.
4. **Safety & Scope Boundary Controls**:
   - **No Personal Account Impact**: Strictly forbidden to use or delete any personal or production identity.
   - **Fail-Closed Production Guard**: `npm run auth:preflight` must continue to fail-close until live domain, DNS, and production Clerk keys are configured.
   - **Accessibility Scope**: Native 200% zoom and actual screen-reader tests remain deferred to B31/C11 per owner instruction; normal desktop/mobile, contrast, reduced motion, and keyboard checks apply.

---

## 5. Reproducible Verification Commands (One Per Outcome)

| Verification Outcome | Exact Reproducible Command | Expected Result |
| :--- | :--- | :--- |
| **1. Public Calculator Routing** | `npm run smoke:calculators -- https://<preview-url>` | Exit code 0; all 85 public routes return HTTP 200 |
| **2. Unauthenticated API Gate** | `curl -s -o /dev/null -w "%{http_code}\n" https://<preview-url>/api/me` | HTTP 401 (`Unauthorized`) |
| **3. Server Health Probe** | `curl -s https://<preview-url>/api/health` | `{"ok":true,"app":"interactive-fire-calculator","runtime":"cloudflare-pages"}` |
| **4. Client Auth Gate Configuration** | Browser navigation to `https://<preview-url>/dashboard` | Renders Clerk sign-in UI (eyebrow: "Sign in to open Dashboard"), **not** "Account features are currently unavailable" |
| **5. Build Isolation & Clean Assets** | `node scripts/verify_build_isolation.mjs` | Exit code 0; "0 fixture leaks" |
| **6. Production Auth Preflight** | `node scripts/check_production_auth.mjs` | Exit code 1; fail-closed rejection for non-live domain and keys |
| **7. D1 Preview Schema Integrity** | `npx wrangler d1 execute DB --remote --config wrangler.preview.toml --command "SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'trg_%_deleted';"` | Returns 28 triggers (plus 1 user resurrection trigger = 29 total) |

---

## 6. Exact Missing Owner Input / Authorization

To proceed with C07 execution upon release, **only the following items are required**:

1. **Transient Build-Time Injection of Development Publishable Key**:
   - Either provide the development publishable key (`pk_test_...`) for the local Vite build step, or authorize pulling it via `clerk env pull` / secret manager.
2. **Clerk Allowed Origin / Redirect Whitelist**:
   - Confirm that `https://*.interactive-fire-calculator.pages.dev` (or the specific preview hostname) is added to the Clerk development instance allowed origins / redirect URLs.
3. **Disposable Hosted Test Scope Authorization**:
   - Explicit authorization to create two temporary disposable synthetic user accounts in the Clerk development instance and execute synthetic writes/deletions against isolated preview D1 database `0dbad68e-7493-452f-8504-98d4c61ee5da`.
   - *(Note: No re-authorization is requested for migration 0006, which is already applied and verified).*
