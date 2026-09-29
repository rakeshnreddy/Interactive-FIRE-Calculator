# Worker handoff: landing theme and content amendments

Copy the following prompt into the implementation session:

```text
Continue FinPath on the existing execution branch in /Users/Rakesh/Projects/Interactive-FIRE-Calculator. Inspect branch, HEAD, working tree and remote first. Preserve other work; do not reset, force-push or start a second writer.

Read docs/execution/MASTER_WORKER_PROMPT.md, README.md, CHECKPOINTS.md, TASK_STATUS.json, docs/LANDING_PAGE_REVIEW.md, docs/COLOR_AND_GLASS_SYSTEM.md and the current task prompt. The landing review is a new task amendment; incorporate it even if you already started B32.

Read the actual release ledger. At this handoff only C01T/B32 is released. Implement B32, including the distinctly light/dark hero treatment in the landing review, without redesigning the homepage or changing its copy early. Follow docs/execution/prompts/B32.md completely. Capture matched before/after hero screenshots and composited contrast, plus all required browser and full-suite evidence. Submit ready_for_review and stop for master review; do not mark done, release the next checkpoint, merge or deploy production.

When C03 is explicitly released later, implement B18 using its amended prompt and the landing review: replace the phone/card image with a labeled synthetic example computed by the existing FIRE engine, apply the exact copy baseline and public action hierarchy, simplify repeated sections, preserve calculator destinations and handle account availability honestly. Do not modify financial formulas. Continue B19 and B09 only as allowed within that released checkpoint; stop at its review boundary.

Use one small commit per coherent change, tests first for behavior, and ./scripts/test_all.sh before pushing. Use only the authorized codex branch and allowed preview publication procedure; respect B33 isolation gates and never perform hosted financial writes. Record exact code SHA, PR, immutable preview, evidence and limitations in the submission. Missing proof is blocked, not passed. The master reviewer alone approves closure.
```

Master checkpoint prompt:

```text
Review checkpoint C01T using docs/execution/MASTER_REVIEW_PROMPT.md. Include the B32 requirements added by docs/LANDING_PAGE_REVIEW.md. Independently verify the final candidate, matched light/dark hero evidence and all existing gates. Close only passing tasks and release the next checkpoint only when its requirements are met.
```

For the later homepage checkpoint, replace C01T/B32 with C03/B18–B19–B09; retain the landing review requirement. Do not use that later prompt to bypass intermediate checkpoints.
