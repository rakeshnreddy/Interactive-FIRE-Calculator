# C01 corrected candidate verification

Date: 2026-09-10 (America/Los_Angeles)

Candidate code SHA: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

The candidate was exported with `git archive` into `/tmp/finpath-c01-candidate.Taygep`. The archive was provisioned only from the repository's declared inputs: `npm ci`, a local `venv`, `requirements-dev.txt`, and `requirements.txt`. The first preflight correctly stopped before product tests when the bare archive had no `pytest`; the second correctly reported missing runtime packages. After both declared Python requirement files were installed, the unmodified repository gate completed successfully.

## Final clean-archive gate

Command: `./scripts/test_all.sh`

Exit: `0`

- Test-runner contract: 13 passed.
- Python: 79 passed plus 21 subtests.
- Vitest 4.1.11: 27 files and 1,276 tests passed.
- TypeScript: `tsc --noEmit` passed.
- Production build: Vite 8.0.16 passed; 2,403 modules transformed.
- Main CSS: `158.85 kB` raw / `26.33 kB` gzip (`index-FOuMMIUu.css`).
- Main JS: `513.78 kB` raw / `140.98 kB` gzip (`index-D43Xm0d1.js`).
- Existing advisory: Vite still warns that a chunk exceeds 500 kB; this checkpoint did not add a production dependency.

`git diff --check ccebac7^ ccebac7` also exited `0`.

## Dependency audit

`npm audit --json` exited `0`: zero info, low, moderate, high, or critical findings across 265 dependencies. The machine-readable result is in [`npm-audit.json`](npm-audit.json).

## Hosted CI

GitHub Actions workflow `Verify`, run [34461062495](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34461062495), completed successfully at the exact full SHA above. Its `Full suite` job installed locked Node/Python dependencies, ran every suite and build, and ran the Node audit.
