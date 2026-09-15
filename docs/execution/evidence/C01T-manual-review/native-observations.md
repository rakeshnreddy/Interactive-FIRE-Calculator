# Reviewer native Chrome observations

Candidate dd47fa3; hosted preview https://757f65cd.interactive-fire-calculator.pages.dev.

Used native Google Chrome through CUA, not Playwright device emulation or CSS zoom. Opened a dedicated review tab. After loading the site, reset zoom and pressed the actual browser zoom-in shortcut five times. Chrome accessibility state explicitly showed `button Zoom: 200%`; the native popup showed 200%. Confirmed this indicator again on library, FIRE, mortgage and savings.

Inspected home, library, FIRE, mortgage, savings and auth-gate first-screen layouts in light and dark modes. No horizontal text clipping or overlap was observed in these sampled first screens. Scrolled to FIRE controls in light mode and savings controls in both themes: fields and labels remained readable. These are bounded native zoom observations, not a complete keyboard/error/result or screen-reader certification. Private auth gate remains unconfigured; no account access attempted.

Native screenshot observations are present in the reviewing conversation; local captures are under /tmp/finpath-native-review. They include unrelated browser tab titles, so they are not copied to the public repository. This written observation record is the durable review record; do not invent additional screenshots or broader coverage.

VoiceOver: Command-F5 did not activate the reader; app inventory still reported VoiceOver not running. A direct CUA launch of com.apple.VoiceOver timed out with computer-use server error -10005 after approximately153 seconds. No actual speech/announcements were verified. This is an observed launch failure, not proof of a TCC denial. A later process-list attempt was unavailable under sandbox. No OS accessibility permission was changed. Native Chrome zoom restored to100% and the dedicated review tab closed.

## Final reviewer interaction checks and owner amendment

Completed the remaining sampled interactions in a separate Chrome window containing only the review site, at actual browser 200% zoom (Chrome accessibility state confirmed the zoom control). An invalid/blank savings goal produced the visible message “Goal amount must be a finite number.” Both light and dark versions were readable with textual error identification. Opened navigation, pressed Tab to the Calculators link and observed visible focus; Escape closed the menu and restored focus to Open navigation. Reloaded defaults and inspected the result: $425.29 monthly through 10 years, with readable units and explanation. These are bounded observations, not exhaustive accessibility certification.

Clean captures: [dark error](final-error-dark.png), [light error](final-error-light.png), [menu focus](final-menu-light.png), [result](final-result-light.png). Zoom restored to 100% and the review window closed.

Owner explicitly deferred actual screen-reader/VoiceOver testing. It is DEFERRED, not PASS, and carried into B31 in [DEFERRED_CHECKS.md](../../DEFERRED_CHECKS.md). This supersedes the previous pending manual interaction gate; reader coverage remains outstanding under the owner amendment.
