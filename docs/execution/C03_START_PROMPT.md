# Execute C03: homepage, discovery and clear copy

You are FinPath's implementing agent. Work sequentially and autonomously within C03. The primary reviewing session alone accepts tasks and releases checkpoints. Read the live ledger; this file does not override a locked checkpoint.

## 1. Establish a safe starting point

Use `/Users/Rakesh/Projects/Interactive-FIRE-Calculator`, branch `codex/finpath-quality-execution`, existing PR140. Inspect applicable AGENTS.md, git status, branch and HEAD. Fetch origin and fast-forward only when safe and clean. Never reset, force-push, auto-stash or discard another agent's work. Stop if another writer is active. Do not switch to main or create a duplicate implementation checkout merely to avoid checking current state.

Read `docs/execution/README.md`, `CHECKPOINTS.md`, `TASK_STATUS.json`, `reviews/C02.md`, `IMPLEMENTATION_AND_VALIDATION_PROTOCOL.md`, `FREE_TIER_EXECUTION.md`, `PRODUCT.md`, `DESIGN.md`, `docs/VISUAL_DESIGN_SPEC.md`, `docs/COLOR_AND_GLASS_SYSTEM.md`, and `docs/LANDING_PAGE_REVIEW.md`. Paths for PRODUCT/DESIGN are repository-root files; resolve actual paths rather than inventing duplicates. C02 must be accepted and C03 released. Preserve all currency, retry, atomicity and isolation fixes. Migration0005 is already applied to isolated preview; do not rerun raw ALTER statements or request it again.

## 2. Implementation order and concrete outcomes

### B18 first: replace the landing hero and simplify landing content

Read `docs/execution/prompts/B18.md` and its latest owner amendment. Inventory the current rendered headline, paragraph, CTA labels, claims and image references. Capture before screenshots. The copy baseline is **“See when you could retire.”** Follow the rest of LANDING_PAGE_REVIEW.md's latest copy contract, including assumptions and limitations.

Remove the unrelated phone/card picture from the landing page. Replace it with an accessible DOM/SVG composition showing a clearly labeled synthetic example from the existing FIRE engine. Use real computed values with units and named assumptions; never hard-code an attractive financial result or change src/lib/fire.ts. Test that rendered example values agree with the engine for the defined inputs. The visual must visibly adapt to light/dark tokens; do not recolor a photograph or overlay another gradient and call it complete. No new chart library, stock service, font, dependency or paid asset.

At1440x900 show the public CTA and example answer in the first view. At390px width place the primary action within600px at normal text size. Keep one primary public action and a quieter optional account action whose behavior reflects actual auth availability. Preserve popular calculator URLs. Remove repetitive vague feature copy; retain honest education, privacy and estimate limitations. No invented banking, connected-account, app, customer or testimonial claims. Provide before/after copy inventory and removed-image references.

### B19 second: make the calculator library easier to choose from

Read `prompts/B19.md`. Inspect actual CalculatorLibrary components and route registry. Simplify repeated panels/counts into a clear hierarchy. Keep FIRE easy to find and every existing public calculator reachable. Search must support case/whitespace normalization, clearing, keyboard operation, helpful zero-results recovery and native links. Write meaningful behavioral tests for these states before implementation. Do not change formulas or add tools/search services. Verify actual search interaction after navigation, not just rendered strings or HTTP200.

### B09 third: replace remaining internal product copy

Read `prompts/B09.md`. B18 owns landing copy; B09 covers remaining calculator and auth-gate text. Inventory and replace Phase/SEO/internal setup directions with plain user explanations. In particular the missing-config gate must stop saying “Connect Clerk before opening account routes.” Explain that account features are unavailable and offer a working public-calculator route. Preserve all auth guards; do not make the account workflow look functional if configuration is absent. Cover configured/signed-out, loading and missing-config states with tests. Test product source strings, excluding developer docs. Keep substantive financial assumptions and limits.

## 3. Per-task execution contract

Before each task, fill its implementation contract and validation matrix using the protocol templates. Name exact files/functions, positive/negative cases, pass thresholds and evidence outputs. Inspect the source first; stale prompt paths are not permission to create another component. Implement only that task's scope. Behavioral edits: show a failing regression then green. CSS edits: capture the actual defect and the repaired browser result; avoid tests that simply assert CSS strings. Commit each task separately after relevant checks and the required full suite. Complete a truthful submission before proceeding to the next task in C03. These dependencies are provisional, not master approvals.

## 4. Browser evidence that counts

Use the actual app with its real built CSS. For local fixtures use the real components and `.app[data-mode="light|dark"]`; exclude fixtures and auth mocks from published bundles. Static renderToStaticMarkup tests are formatting/semantic evidence only: they cannot pass viewport, focus, zoom or material checks.

Verify both themes at320,390,612,768 and1440 CSS pixels. Check document overflow AND bounding rectangles/clipping of headings, results, links, buttons and form controls; overflow:hidden can conceal a broken form. Capture and inspect screenshots, including long text/numbers, loading/empty/error/zero-search states. Native browser zoom must actually report200%; device scale factor, smaller viewport and CSS zoom are not substitutes. Verify tab order, visible focus, Enter/Space where applicable, escape/clear controls and working links. Check reduced motion/transparency, opaque fallback and composited text contrast; ensure theme toggling changes the actual page. Follow the task's applicable reader checks; record unavailable mandatory checks as blocked, never passed. Do not borrow B32's specific reader deferral as a blanket waiver.

For the hero verify actual CTA position and example visibility numerically; for discovery exercise query/clear/no-match and open a result. Capture console/page errors and fail verification on unexpected errors. State each script's limitations. Screenshots must be real product renders, not generated designs.

## 5. Publish one verified final C03 candidate

Use free services only. No main merge, production deployment, paid subscriptions, DNS, production data writes, schema changes, financial connections or auth bypass. Do not print credentials/records. B33's effective preview-binding checks apply before publication. Only the existing isolated preview D1 UUID0dbad68e-7493-452f-8504-98d4c61ee5da is allowed; no hosted financial writes are needed for C03.

Run `./scripts/test_all.sh` before pushes. CI uses Node22: use that major locally when available. Server SQLite integration tests deliberately use the Node Vitest environment; preserve that fix. Do not infer CI success from local success. Run git diff --check. Push only the execution branch and keep PR140 unmerged. Deploy the tested final candidate with an explicit preview branch after tests pass, then verify effective DB binding, deployment code SHA and delivered asset references. Run `npm run smoke:calculators -- <immutable-preview-url>` (all84 routes expected unless the verified registry count changes). Render and exercise the changed journey on the hosted preview. Check health200 and signed-out protected APIs401. Do not present the current preview as a fully signed-in product; B06/C07 owns hosted lifecycle proof.

All B18/B19/B09 submissions must converge on the same final code SHA, immutable preview and successful exact-candidate CI. If B09 changes B18/B19 surfaces, retest affected criteria. Distinguish historical per-task SHAs from final candidate. Include raw logs, screenshots, validation statuses and limitations; never attach old test counts as current evidence.

## 6. Stop boundary and handoff

Set only B18/B19/B09 to ready_for_review when each packet is complete, or blocked with an exact reproducible reason. Do not mark done, check the master backlog, edit reviews, release C04 or approve yourself. Run `python3 docs/execution/validate_packet.py`; its success proves packet consistency only.

At the C03 boundary STOP and report: branch/HEAD; common code SHA; PR URL; immutable preview; effective preview DB; exact-candidate CI; full-suite counts/exit; screenshots and matrix paths; unresolved mandatory checks; and all three task statuses. Ask the owner to send the primary reviewer: “Review checkpoint C03 using docs/execution/MASTER_REVIEW_PROMPT.md. Independently verify the final candidate, close only passing tasks, and release C04 only if its gates are met.”

If a bounded defect remains after a clarified retry, provide the exact reproduction, source location, expected/actual behavior and attempted fixes. Preserve passing work; do not repeatedly submit the same unsupported claim. The primary reviewer will own final judgment and any necessary bounded repair.
