# Free-tier execution constraint

Owner instruction, 2026-09-11: use only free versions of all services and work toward a fully functional preview site. No paid subscriptions, paid trials, billing upgrades, purchases or paid add-ons are authorized. If a free quota is exhausted, report the limit and use local verification or wait for reset; never upgrade automatically.

Target: Cloudflare Pages preview hostname, Pages Functions and the existing isolated finpath-preview D1 database. Keep existing Clerk development-instance setup for preview testing where supported. Do not buy a domain or require production setup to complete preview development. Never bypass production-auth preflight or label a development instance production-ready.

Sources checked 2026-09-11:
- https://developers.cloudflare.com/d1/platform/pricing/ — D1 Free supports prototyping; free daily/storage limits apply and quota exhaustion blocks queries.
- https://developers.cloudflare.com/pages/functions/pricing/ — Pages Functions share Workers Free quotas.
- https://clerk.com/docs/guides/development/managing-environments — distinguish development and production instance behavior. Verify required features against the actual free account before relying on them.

## Authorized preview setup and actual progress

The owner's request to proceed using free services followed the exact scoped preview-binding proposal. Primary reviewer treated this as authorization for that bounded free preview setup. On 2026-09-11 the primary reviewer PATCHed only the existing Pages project's preview DB binding to existing finpath-preview (0dbad68e-7493-452f-8504-98d4c61ee5da). No subscription change, new database, migration, DNS change or financial write was performed.

Fresh read-back verifies the preview target differs from production. Production DB remains a5860350-0a50-4ebe-9f5f-1d9916a908e6. Source deployment policy, listed environment-variable names, compatibility settings and the other captured non-secret settings match the prior redacted inventory. The initial strict whole-object verification failed after the PATCH succeeded; a subsequent independent read confirmed the binding and compared the redacted fields. Do not claim an exhaustive secret-value comparison from this record.

Evidence: [redacted read-back](evidence/B33/preview-binding-after-owner-instruction.json).

Existing deployments retain historical bindings. This project-level change does not accept B33 or authorize publishing changed backend code. B33 audit repairs, migration proof, local Wrangler preview configuration safety and effective bootstrap deployment verification remain required. The previously requested configuration-only bootstrap with unchanged identified backend and read-only verification may proceed on free services under the recorded scope after intended isolation is verified. No repeated owner approval is needed for that exact scope. No production settings, migrations or financial writes are covered by this amendment.

## Definition of the functional preview milestone

The relevant checkpoints must prove hosted development sign-up/sign-in/sign-out, authenticated identity, persistence, calculator save and revisit, export and deletion with disposable test data under their authorized task scopes. Static HTML, health200 or screenshots alone do not establish these behaviors. Keep checkpoint review boundaries and financial-data safety intact. Prefer manual entry and existing import/export flows over paid account aggregation. Defer paid email, payments, custom domains, paid analytics and mobile-store release requirements. Choose free/local alternatives where features need them; document genuine unsupported features rather than faking functionality.
