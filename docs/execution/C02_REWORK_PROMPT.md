# C02 first rework — implementation and validation

Read MASTER_WORKER_PROMPT.md, IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md, FREE_TIER_EXECUTION.md, reviews/C02.md and original B02/B03/B04 prompts/contracts. Work in /Users/Rakesh/Projects/Interactive-FIRE-Calculator on codex/finpath-quality-execution. Preserve passing currency guards, grouping and atomic batches. No unrelated redesign, formula change or paid service.

## Implementation tasks

1. R1: move idempotency ownership out of each network invocation. Define a logical-save state with a stable key and immutable request snapshot through uncertain failure/retry. Clear on confirmed completion, explicit new save or account transition as appropriate. Do not store private calculator payloads persistently merely to implement retries. Prevent parallel clicks for the same operation. Do not change to a hash-only key that prevents users intentionally saving twice.
2. R2: align hashing with destination semantics. Keep deterministic object key ordering, but preserve metric order because current converters use first currency metric. Do not change formulas or reinterpret historical records. Add the supplied reproduction as a regression proving reordered destination-affecting metrics conflict under a reused key.
3. R3: normalize header/body keys in one validated API path. Both present and different => typed400; chosen key must satisfy the same type/length rules. Preserve backward-compatible missing-key behavior only if explicitly documented in the original contract. Zero destination/result writes on malformed keys.
4. Keep B02/B03 behavior; do not call them unaffected without running final relevant tests. Repair any regression revealed by B04 final changes.

## Validation tasks, separate from implementation

- Client integration: first response lost after server commit, then retry -> same header/body key and identical request snapshot, one destination/result. Changed request must not accidentally reuse old key; intentional new save allowed. Account transition cannot share a prior user's pending operation. Assert observable request behavior, not just presence of crypto.randomUUID in source.
- Real local database/API: same key+same payload returns original result; conflicting payload409; metric reorder that changes destination409; concurrent same-key one result; injected failure leaves no destination/result; all destination types remain covered; tenant-scoped keys preserved. Keep transaction destination no fake entries.
- Key input table: body only, header only, matching both, mismatched both, whitespace, oversized header and body, invalid body type, missing key. Validate expected status and zero-write assertions for invalid requests.
- B03 UI: rendered local fixture with empty, USD-only, INR-only, mixed USD/INR, liabilities, excluded accounts and long values. Verify dashboard and Accounts in light/dark,320/390/1440, real200%zoom and relevant keyboard/focus. No hosted auth bypass or real records. Check currency labels, no cross-currency total, seed rejection and no overlap. Record exact fixture setup and evidence; don't mark changed UI N/A.
- Fill one matrix mapping R1–R5 plus all original task criteria to commands/assertions/exits/evidence. Write failing tests first, inspect the failure reason, then green. Self-review against omitted/partial/wrong-resource cases.
- Run ./scripts/test_all.sh before push, relevant audits if dependencies changed, diff checks and exact candidate CI. Update all three submissions to the same final candidate rather than separate provisional commits. Record provider trigger and dirty flag truthfully.

## Deployment gate and checkpoint

The existing b8f9d6ec deployment predates C02 and is not C02 evidence. Before deploying backend changes requiring migration0005, verify isolated binding and request scoped authorization to apply only reviewed0005 to finpath-preview if absent. No production migration, data copy, paid service, main merge or production deploy. Do all local repairs and tests before stopping for that precise external action. Do not report no blockers while migration/deployment remains unperformed.

After safe preview setup, verify new immutable candidate API health, signed-out gates,84 public-route smoke and changed rendered journeys. Actual signed-in lifecycle remains under the appropriate authorized task scope; never fabricate it. Preserve evidence of tests that were local rather than hosted. Submit C02 only after requirements pass, otherwise record exact blocker. Primary reviewer owns task closure and C03 release.
