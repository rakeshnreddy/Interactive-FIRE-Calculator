# C01 R3 comparable performance check

The executable harness is [`performance-lab.cjs`](performance-lab.cjs); the complete machine-readable result is [`performance-lab.json`](performance-lab.json).

Baseline: `ae10ea516e1df38cf2fce5f0c704e1c855c9db01`

Corrected candidate: `ccebac7d5bcaf645721e2e67ea490a7f447e1db9`

Both revisions were exported and built independently, then served by Vite preview on the same Mac. One installed Chrome 152.0.7977.83 process sampled them in interleaved order. Every sample used a fresh 1440×900 context, blocked service workers, disabled and cleared the browser cache through CDP, and used the same unthrottled device/network policy. The public home route was loaded to network idle and stable fonts. The representative interaction clicked the real desktop Calculators anchor and waited for the `/calculators` URL and main heading.

| Metric | Baseline runs | Candidate runs | Baseline median | Candidate median | Delta |
|---|---:|---:|---:|---:|---:|
| Response start (ms) | 33.4, 3.0, 2.4 | 5.3, 2.0, 2.9 | 3.0 | 2.9 | -3.33% |
| DOM content loaded (ms) | 102.2, 41.1, 43.2 | 46.1, 40.8, 46.9 | 43.2 | 46.1 | +6.71% |
| Load (ms) | 102.3, 41.2, 43.8 | 46.1, 41.0, 47.0 | 43.8 | 46.1 | +5.25% |
| FCP (ms) | 188, 100, 100 | 104, 100, 108 | 100 | 104 | +4.00% |
| LCP (ms) | 188, 112, 112 | 116, 116, 124 | 112 | 116 | +3.57% |
| CLS | 0, 0, 0 | 0, 0, 0 | 0 | 0 | 0 |
| Route interaction (ms) | 101.48, 83.29, 87.31 | 85.04, 145.25, 72.60 | 87.31 | 85.04 | -2.60% |
| Encoded resource bytes | 435,740 each | 436,275 each | 435,740 | 436,275 | +0.12% |

No median regressed by more than 10%, so no checkpoint-specific regression explanation or remediation is required. The run-2 interaction outlier is preserved rather than discarded; the predeclared three-run median remains slightly faster for the candidate. This is a bounded local laboratory comparison, not field data or a Web Vitals certification.
