# Landing page image, copy and theme review

Reviewed 2026-09-10 against code ccebac7d5bcaf645721e2e67ea490a7f447e1db9 and [immutable static preview](https://f05b7516.interactive-fire-calculator.pages.dev). This is a design recommendation and task amendment, not a shipped redesign or user research result.

## Observed evidence

Actual Chrome renders: [light 1440×900](execution/evidence/landing-review/light-1440.png), [dark 1440×900](execution/evidence/landing-review/dark-1440.png). Both render `/assets/finpath-product-hero.jpg`. Source: `src/App.tsx`, `LandingPage`, plus the layered landing rules in `src/styles.css` and `src/vivid-theme.css`. These captures establish the desktop defect; they do not certify mobile, accessibility or conversion.

| Finding | Why change it | Task |
|---|---|---|
| Dark full-bleed phone/card image dominates both themes; changing buttons and lower canvas barely changes the first screen | Light mode needs a visibly light hero, with its own readable ink and surfaces | B32 material treatment now; B18 final composition |
| Phone, payment card and generic charts show no actual FinPath result | May suggest a card or native app and provides little evidence of calculator usefulness | B18 image replacement |
| “Make the number mean something” omits the financial question | Use the documented FIRE wedge to make the first action understandable | B18 copy |
| “One clear thread,” “keep the decision alive” and similar sections repeat an aspiration | Explain inputs, output and next step once, concretely | B18 section hierarchy |
| Account creation is prominent even on a preview without configured hosted authentication | Match the CTA to actual availability; do not imply save/account workflows were verified | B18 availability-aware copy; B09 handles remaining non-home internal copy |
| “Private by account boundary” is implementation language; “Pay less over time” sounds like an outcome claim | State observable public access and exploratory actions instead of guarantees | B18 copy |
| Three equally saturated path blocks compete with the hero | Use quiet surface cards, small accents and one clear primary action | B32 palette; B18 layout |

## Recommended presentation

Use a real HTML/SVG product example instead of a second stock image. Left: specific question, two short explanatory sentences and a public calculator action. Right: a labeled synthetic FIRE result with readable units, assumptions and a simple trajectory. No fake application chrome, payment card, invented notifications, testimonials or decorative financial numbers.

Light: pale mint-to-blue atmosphere, deep teal text, near-white result panel and restrained border/shadow. Dark: deep teal/navy atmosphere, pale text, dark solid result panel and small mint/blue accents. Use COLOR_AND_GLASS_SYSTEM.md tokens. Glass belongs to the surrounding decorative frame, not the financial values. Keep the same information and semantic colors in both modes. Never invert a bitmap, recolor numbers arbitrarily, or animate the background to demonstrate theme switching.

## Copy contract for B18

Use this as the implementation baseline; document any factual or accessibility reason to adjust it:

- Eyebrow: **Financial independence, explained**
- H1: **See what it takes to reach financial independence.**
- Supporting text: **Explore how your savings, spending and assumptions shape your FIRE estimate. Start with a calculation—no account required.**
- Primary link: **Try the FIRE calculator** → `/calculators/fire`.
- Secondary text link: **Explore all calculators** → `/calculators`.
- Example label: **Illustrative example · USD** (USD is explicitly the example currency, not an inferred visitor locale).
- Example note: **An estimate based on the assumptions shown, not a guaranteed outcome.**
- Lower section heading: **Understand what changes your estimate.** Three steps: **Enter your starting point** / **Explore the assumptions** / **Choose your next step**. Supporting sentences must describe behaviors verified in the actual calculator, not future saved-plan features.
- Retain mortgage, debt payoff, compound interest and FIRE links. Path labels: **Explore borrowing costs**, **Explore compound growth**, **Explore financial independence**. Keep current exact destinations; do not invent routes.
- Public-access statement: **Explore calculators without an account.** Do not claim anonymous processing, no data collection, encryption, compliance, bank connections or completed lifecycle guarantees without evidence.
- When hosted account creation is unavailable, omit the landing-page account promotion and keep public calculator actions. Preserve the existing fail-closed route/auth gate and header behavior. When configured, retain a quiet account action using existing auth APIs; signed-in users retain a dashboard link. Availability is not proof of verified production readiness.

The narrower hero is a positioning hypothesis based on PRODUCT_AND_POSITIONING_STRATEGY.md. Savings and borrowing remain easy to discover below it. Validate comprehension and action selection with users later; do not call this a demonstrated conversion improvement.

## Ordered implementation and review gates

### B32 / C01T: theme response on existing composition

Keep current layout and content. Make hero canvas, scrim, foreground and image opacity explicitly theme-aware using canonical roles. Light mode must have a pale copy backdrop and dark text, dark mode a deep backdrop and pale text. The existing decorative bitmap may remain temporarily, confined visually by the scrim; if it prevents a readable pale light-mode composition, suppress it in light mode rather than invert it. Do not add a replacement image. B18 removes this temporary dependency. Capture matching viewport screenshots with theme toggled at the same scroll position; measure text/CTA contrast against the actual composed background. Submit B32 and stop for master review.

### B18 / C03: permanent product evidence and content

1. Capture baseline and inventory all landing links, auth states and hero asset references before changing anything.
2. Implement the copy above, one primary public action and quiet secondary navigation. Write meaningful behavior tests first for changed destination and auth-availability rendering.
3. Replace the image with a reusable presentational example component. Inspect the existing FIRE engine/types first; compute from one named synthetic fixture through the existing engine, without changing `src/lib/fire.ts`. Show the meaningful output supported by that engine, units and all assumptions necessary to interpret it. Handle non-finite/unreachable results honestly. No invented target age or canned growth curve. Keep fixture inputs out of user records/local storage.
4. Prefer a static, responsive result illustration with a short text equivalent. If a chart is included, derive every point from actual output; use labeled axes and a non-color distinction. Do not add another chart library. The primary link opens the real calculator; do not imply the example transfers unless an existing supported input contract is implemented and tested.
5. Replace repetitive capability bands with the three-step explanation and useful calculator paths. Apply the availability and privacy copy rules. Coordinate B09 so it does not undo homepage copy or duplicate this work.
6. Apply accepted B32 roles to light/dark product panels. Remove obsolete hero CSS only after tracing references; retain unrelated pages. Remove the old asset only if no remaining reference needs it.
7. Submit matched screenshots, behavior tests, asset/bundle comparison, full suite, immutable preview and public-route smoke. Stop at C03 for master review after its released tasks are submitted.

## Acceptance checklist for master review

- Same viewport/theme pair clearly changes the hero atmosphere, text, panel and CTA treatment without losing content or contrast. Merely changing the toggle icon or button color fails.
- At 1440×900, headline, primary action and meaningful example result are visible. At 390px width, the primary action begins within the first 600px at normal text size. At 320px and real 200% browser zoom, natural reflow takes priority over a fixed height target; no clipping, horizontal scrolling or overlap.
- Verify 320/390/768/1440 widths in both themes; keyboard order and visible focus; real screen-reader smoke; reduced motion/transparency, unavailable backdrop-filter, forced colors and print. No essential information depends on a gradient or chart color.
- Public links remain anchors supporting keyboard and modified clicks; unavailable account state has no misleading landing CTA. Test configured signed-out and signed-in rendering with local test fixtures, never a hosted auth bypass.
- Synthetic outputs match existing engine results, currency/units are explicit, and screen readers can understand the example without the illustration.
- No new external font, image service, tracker, chart dependency or remote write. Compare three same-setup performance runs and transferred assets before/after; explain any regression.
- No task is closed by screenshots alone. Follow MASTER_REVIEW_PROMPT.md and the checkpoint final-candidate rule.

No task IDs or release states change in this amendment: B32 is next; B18 stays gated in C03. This expands existing tasks rather than creating duplicate homepage work.
