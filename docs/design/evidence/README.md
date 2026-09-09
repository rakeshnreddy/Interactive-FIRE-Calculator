# Visual evidence index

The 2026-09-07 directory contains baseline product captures from immutable preview https://75358a37.interactive-fire-calculator.pages.dev, inspected against repository 99c7834. Default browser context used synthetic calculator defaults, with no authenticated identity or remote writes. Full-page images preserve page length; named first-viewport images preserve readable input hierarchy.

Desktop 1440x1000: home, library, mortgage, FIRE before/after calculation, savings and auth gate. Mobile 390x844: home, FIRE, compound, savings, budget, net worth, retirement, SIP, India tax and menu after Escape. Mortgage also captured at 768x1024 and 320x800 in dark mode. All final calculator captures waited for the route h1. home-dark and india-tax-dark are theme samples, not full dark-mode certification.

The 2026-09-08 directory contains the local theme-board proposal, not application screenshots. Its values are explicitly synthetic and based on the recorded FIRE baseline. Light/dark at 1440x1000, dark 390x844, light 320x800. The local board loaded Inter, showed 16px input text, no 320px overflow, working light/dark and solid-surface controls, and no console errors. Solid toggle produced backdrop-filter:none. This is not proof that the production CSS supports these states.

Browser 200% zoom, screen-reader, forced-colors and actual OS reduced-transparency validation were not completed in this planning pass. Those are required implementation acceptance evidence, not waived. See VISUAL_AND_UI_AUDIT.md and VISUAL_DESIGN_SPEC.md.
