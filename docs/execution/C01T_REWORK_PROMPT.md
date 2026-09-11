# C01T worker rework handoff

Continue in /Users/Rakesh/Projects/Interactive-FIRE-Calculator on codex/finpath-quality-execution. Read AGENTS.md, MASTER_WORKER_PROMPT.md, CHECKPOINTS.md, TASK_STATUS.json, prompts/B32.md and reviews/C01T.md. Preserve other work and synchronize safely; do not reset or force-push.

B32 is changes_requested. Work only within C01T. The review covers code 02650c44509340cf698bfeb0a26708164d4dddf6 and preview https://6567c09b.interactive-fire-calculator.pages.dev, including the later worker polish. Do not reapply already completed path-strip/toolkit changes.

Implement R1 first: dark-mode print still keeps the dark hero image/scrim beneath new black text. Make all retained print layers and header descendants readable. Capture before/after actual print evidence in both themes, with background graphics enabled and disabled. Keep the accepted palette and B18 scope unchanged.

Then complete R2–R5 exactly as written in the review: actual composed contrast and all material fallbacks; real browser 200% zoom and real screen-reader smoke; second-engine coverage; three-run baseline/candidate loading and scrolling comparison; a harness that exits nonzero for failures and accurately records console errors. Correct CI attribution rather than relabeling a documentation run as a code-SHA run. Missing mandatory capabilities must be marked blocked with the exact missing capability.

Run relevant checks after the repair and ./scripts/test_all.sh before push. Publish only the permitted static preview, respecting B33 isolation restrictions and no hosted financial writes. Record one final candidate SHA/immutable preview and exact CI run identity. Update submissions/B32.md with every R1–R5 result and durable evidence. Mark ready_for_review only with complete evidence, otherwise blocked. Stop for master review; do not close B32, release C01I, start B18, merge main or deploy production.
