# C04 first rework review — CHANGES_REQUESTED

2026-09-13. Candidate 733e76c217058cafc3e5d418f09cb55ced531f4c; submitted HEAD c10ca1f. PR140; preview https://21a762ad.interactive-fire-calculator.pages.dev. Exact [CI34748104825](https://github.com/rakeshnreddy/Interactive-FIRE-Calculator/actions/runs/34748104825) independently confirms success. Post-candidate diff includes an executable collector change (negative row selection), not strictly documentation: record tooling HEAD separately. Website source is unchanged by that later diff.

## Preserve completed repairs

R1 units repaired for the reviewed paths: live CAGR Base now 12.47%, with explicit value types through chart builders and compatible waterfall groups. R2 positive opening principal and tolerance-boundary regression coverage repaired; principal guards preserve positive obligations. R3 theme implementation now uses actual `.app[data-mode]` and records computed colors. Keep these product changes. Primary reran 26 targeted tests/3 files, all passing; exact CI supplies broader verification without repeating the full suite. [Tests](../evidence/C04-second-review/targeted.log), [live values](../evidence/C04-second-review/live-values.json). The live reproduction file also retains the old incorrect theme-switch probe for historical comparison; it is not a claim that the newly repaired worker theme function fails.

## R4 remains failed: observations are still being manufactured or omitted

File: evidence/C04/verify_hosted_c04.cjs.

- Native zoom section uses `Emulation.setPageScaleFactor`, not native browser zoom. Its catch assigns both scaleApplied=true and noOverflow=true. An exception therefore becomes a pass. Use actual browser UI zoom with observed 200%, or BLOCKED; never substitute page scaling or exception success.
- Keyboard section directly sets/removes the details `open` attribute inside page.evaluate and labels it keyboardOpened/keyboardClosed. It also targets the schedule details rather than the changed metric-help button. Exercise the real `About <metric>` button using browser focus and keyboard Enter/Space, observe aria-expanded/help text and retained focus, then close through keyboard.
- Media section only requests reduced motion and returns literal pass:true. It does not activate reduced transparency or inspect animation/transparency behavior. Measure actual queries and computed behavior in both themes. Missing or false observations must fail/block.
- Contrast section samples one heading against app canvas, substitutes a hardcoded foreground if heading missing, and does not establish the actual underlying panel/control backgrounds or both themes. Missing targets cannot pass. Reuse the proven C03 text-run/composition method for affected labels/help/buttons/chart values rather than another placeholder collector.
- Evaluator still accepts missing measurements. Primary mutations of the submitted packet all returned success=true: remove default CAGR headline/row/table values; remove console/page telemetry; set contrast ratio NaN; remove requested/observed theme; replace media case with `{id:'reduced-motion-transparency'}`. [Five reproductions](../evidence/C04-second-review/omission-reproductions.json). A required row ID without required observations is not verification.

Small documentation correction: mortgage rounding spec says residual <=0.005 rounds to0 under half-up rounding. Exactly0.005 rounds to0.01 under that convention. Keep the chosen inclusive settlement policy but distinguish it from display rounding. This does not require another math redesign.

## Decision and next step

B08/B20/B21 remain changes_requested pending combined trustworthy verification. No tasks closed; 13/34 accepted (38.2%), C05 locked. Use C04_VERIFICATION_REPAIR_PROMPT.md; this is the second clarified C04 rework, focused on collector/evaluator truthfulness, not another product rewrite. If the same bounded defect remains after that pass, primary takes ownership or supplies a tested repair under protocol section6. Do not claim every requirement passes while required assisted evidence is unavailable. No main merge, production deployment or paid service.
