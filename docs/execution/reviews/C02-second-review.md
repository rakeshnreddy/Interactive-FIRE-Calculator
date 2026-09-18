# C02 rework review and migration gate

Date: 2026-09-11. Primary reviewer / sole closure owner.
Decision: NOT ACCEPTED YET — local repairs improve R1–R3; R4 deployment and R5 actual-browser evidence remain outstanding.
Candidate7743983d81ca7d5868d394b766d99bd385b39504; documentation b025fd2244418620d48a43827d649b0b4349966c. PR140, base codex/dependency-security-refresh. No current C02 immutable preview supplied; b8f9d6ec remains pre-C02.

## Independent checks

Inspected coordinator lifecycle and App integration, metric-order hashing, unified header/body parsing, SQL migration and UI-fixture method. Independently ran calculatorSaveManager, calculatorResults and accountUiFixtures:41 tests/3 files pass. [Log](../evidence/C02-review/rework-targeted-tests.log).

R1 now retains a logical-operation key across failed requests, deduplicates in-flight requests and clears coordinator state on account transition. R2 preserves metric order. R3 normalizes header/body keys together and rejects conflicts/oversized keys. Preserve these fixes. Local component render tests improve formatting coverage but are not browser layout proof.

## Migration recommendation — ready for scoped owner authorization

Reviewed migrations/0005_saved_calculator_idempotency.sql: adds nullable idempotency_key and payload_hash columns and a partial unique index on user_id/idempotency_key. Existing rows have null keys; no row rewrite, deletion or production change is specified. Local SQLite integration tests exercise migration and uniqueness. Recommend applying only this migration to existing isolated finpath-preview UUID0dbad68e-7493-452f-8504-98d4c61ee5da after explicit owner authorization, fresh binding/schema checks and confirmation it is not already applied. Do not rerun raw ALTER statements on an already migrated DB. No production DB operation authorized.

Use the migration runner to track application. Verify applied filenames, columns and index read-only afterward. Keep additive schema on rollback; do not revert the database to remove columns containing later data. This review recommends the action but does not substitute for owner consent. A copied worker authorization request is not the owner's affirmative authorization.

## Evidence corrections still required

R4: Worker claims1325 tests but attached evidence/B04/full-suite.log reports1306 and28 files. Do not claim exact-candidate evidence from it. Primary current rerun is recorded separately; final CI, new immutable preview and full common-candidate attribution remain required. Do not mark no blockers until deployment requirements are met.

R5: accountUiFixtures.test.tsx uses renderToStaticMarkup; no real CSS layout engine, viewport, browser zoom, keyboard or screenshot is exercised. ui-verification.md nonetheless marks320/390/1440,200%zoom and no layout explosion PASS. Reclassify these assertions as semantic/formatting unit coverage only, correct React19 claim against installed React18, and supply actual browser evidence. Local synthetic fixtures are allowed; no production or hosted auth bypass is necessary. Preserve the8 useful HTML tests rather than deleting them.

No newly confirmed financial regression was found in this bounded rework review. No C02 task closes until required evidence exists. B02/B03/B04 remain open; C03 stays locked; accepted7/34(20.6% by task count).

## Exact next work

Finish local browser verification of dashboard/accounts mixed/single/empty/long-value states in both themes,320/390/1440 and actual200%zoom plus relevant keyboard/focus. Use existing components and actual CSS in a local-only fixture that is excluded from published builds. Capture screenshots/observations and distinguish unavailable checks. This remains independently executable while migration authorization is pending.

After scoped authorization, apply only reviewed0005 to isolated preview, deploy the tested common candidate, verify effective binding and health/auth gates/public smoke, and submit actual candidate CI plus all three synchronized evidence packets. Free services only; no main merge or production deployment. Prior [first review](C02-first-review.md) remains historical; do not redo resolved R1–R3 merely because its old wording persists.

Final primary full-suite rerun at7743983 product tree: exit0;13 runner tests,79 Python tests+21 subtests,1325 Vitest tests/30 files,typecheck/build pass. [Current log](../evidence/C02-review/rework-full-suite.log). This supplies current local verification; old worker log remains historical, not corrected provenance.
