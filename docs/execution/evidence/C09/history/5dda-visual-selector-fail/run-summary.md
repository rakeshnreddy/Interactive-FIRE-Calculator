# Current-candidate visual collector selector failure

Date: 2026-09-25. Product SHA `5dda3d2be24246e3470a65e7653a0b6e425cbece`. The hosted visual run failed closed at a 320px navigation-control assertion. Public Chrome inspection found a visible `.mobile-menu-button` with a 44×44 box, but the broad comma selector chose an earlier hidden `.topbar button` via `.first()`. This is an evidence collector false negative, not a proven product defect. All synthetic users were deleted and all 15 scoped tables were zero. Packet retained; not accepted.
