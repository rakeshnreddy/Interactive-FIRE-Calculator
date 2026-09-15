// docs/execution/evidence/C06/evaluator.cjs
// Pure, fail-closed evaluator for browser fixture test results.

/**
 * Calculates relative luminance according to WCAG 2.1 spec.
 * @param {number} r 0-255
 * @param {number} g 0-255
 * @param {number} b 0-255
 * @returns {number}
 */
function getRelativeLuminance(r, g, b) {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

/**
 * Parses RGB or RGBA string into [r, g, b].
 * @param {string} rgbStr
 * @returns {[number, number, number]}
 */
function parseRgb(rgbStr) {
  const match = typeof rgbStr === 'string' && rgbStr.trim().match(/^rgba?\(\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?),\s*(\d+(?:\.\d+)?)(?:,\s*(\d+(?:\.\d+)?))?\s*\)$/i);
  // Alpha requires actual background compositing; never silently discard it.
  if (!match || (match[4] !== undefined && Number(match[4]) !== 1)) return [NaN, NaN, NaN];
  const channels = match.slice(1, 4).map(Number);
  return channels.every(c => Number.isFinite(c) && c >= 0 && c <= 255) ? channels : [NaN, NaN, NaN];
}

/**
 * Computes WCAG 2.1 contrast ratio between two colors.
 * @param {string} color1 rgb(...) string
 * @param {string} color2 rgb(...) string
 * @returns {number}
 */
function calculateContrastRatio(color1, color2) {
  const [r1, g1, b1] = parseRgb(color1);
  const [r2, g2, b2] = parseRgb(color2);
  const l1 = getRelativeLuminance(r1, g1, b1);
  const l2 = getRelativeLuminance(r2, g2, b2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Evaluates a single collected case with fail-closed assertions.
 * @param {object} c Collected case
 * @returns {{ status: 'PASS' | 'FAIL' | 'BLOCKED', reasons: string[] }}
 */
function evaluateCase(c) {
  const reasons = [];
  let isBlocked = false;

  // 1. Collector Error
  if (c.collectorError) {
    return { status: 'FAIL', reasons: [`Collector error: ${c.collectorError}`] };
  }

  // 2. Missing diagnostics
  if (!c.themeInfo || !c.geometry || !Array.isArray(c.consoleErrors) || !Array.isArray(c.pageErrors)) {
    return { status: 'FAIL', reasons: ['Missing required target or console diagnostics in case payload'] };
  }

  if (!Number.isFinite(c.screenshotSizeBytes) || c.screenshotSizeBytes <= 0) reasons.push('Missing valid screenshot byte count');
  if (!Number.isFinite(c.geometry.viewportWidth) || c.geometry.viewportWidth <= 0 || !Number.isFinite(c.geometry.documentScrollWidth)) reasons.push('Missing finite geometry widths');
  if (!['light', 'dark'].includes(c.theme) || !Number.isFinite(calculateContrastRatio(c.themeInfo.textColor, c.themeInfo.bgColor))) reasons.push('Missing or unsupported observed theme colors');
  if (!c.renderedContent || c.renderedContent.matchedStateExpectation !== true || !c.renderedContent.detail) reasons.push('Missing verified rendered-state observation');
  if (!c.contrast || c.contrast.tested !== true) reasons.push('Missing required contrast observation');
  if (String(c.id).startsWith('keyboard-') && c.keyboardFocus?.attempted !== true) reasons.push('Missing required keyboard observation');
  if (String(c.id).startsWith('reduced-') && c.mediaCheck?.requested !== true) reasons.push('Missing required media observation');
  if (String(c.id).startsWith('native-zoom-') && c.zoomCheck?.requestedLevel !== 2) reasons.push('Missing required native zoom observation');

  // 3. Console & Unhandled Page Errors
  if (c.consoleErrors.length > 0) {
    reasons.push(`Console error(s) observed: ${c.consoleErrors.join('; ')}`);
  }
  if (c.pageErrors.length > 0) {
    reasons.push(`Page error(s) observed: ${c.pageErrors.join('; ')}`);
  }

  // 4. Screenshot existence and validity
  if (!c.screenshot || !c.screenshotExists || (typeof c.screenshotSizeBytes === 'number' && c.screenshotSizeBytes <= 0)) {
    reasons.push('Screenshot is missing, not persisted, or 0 bytes');
  }

  // 5. Theme verification
  if (c.theme) {
    if (c.themeInfo.rootDataMode !== c.theme || c.themeInfo.shellDataMode !== c.theme) {
      reasons.push(
        `Theme mismatch: requested ${c.theme}, but observed root=${c.themeInfo.rootDataMode} and shell=${c.themeInfo.shellDataMode}`
      );
    }
  }

  // 6. Horizontal layout overflow
  if (c.geometry) {
    const overflowDelta = c.geometry.documentScrollWidth - c.geometry.viewportWidth;
    if (c.geometry.hasHorizontalOverflow || overflowDelta > 2) {
      reasons.push(
        `Horizontal overflow detected: document width (${c.geometry.documentScrollWidth}px) exceeds viewport width (${c.geometry.viewportWidth}px) by ${overflowDelta}px`
      );
    }
  }

  // 7. Keyboard focus
  if (c.keyboardFocus?.attempted) {
    if (c.keyboardFocus.isBodyFocus || c.keyboardFocus.focusedTag === 'BODY') {
      reasons.push('Keyboard focus remained on document BODY instead of an interactive product control');
    }
    if (!c.keyboardFocus.hasVisibleFocusRing) {
      reasons.push('Focused interactive control lacks a visible focus indicator (outline/box-shadow)');
    }
    if (c.keyboardFocus.occluded) {
      reasons.push('Focused interactive control is occluded by toolbar or outside viewport');
    }
  }

  // 8. Native zoom
  if (c.zoomCheck?.requestedLevel && c.zoomCheck.requestedLevel > 1.0) {
    if (c.zoomCheck.deviceScaleFactorUsed) {
      reasons.push('deviceScaleFactor used to simulate native zoom; pixel density change does not equal application UI zoom');
    } else if (!c.zoomCheck.appliedViaAppChrome || c.zoomCheck.observedZoomPercent !== 200 || !c.zoomCheck.nativeProofPath) {
      isBlocked = true;
      reasons.push('Native desktop browser UI application zoom (200%) is unavailable in headless CLI automation');
    }
  }

  // 9. Media query emulation
  if (c.mediaCheck?.requested) {
    if (!c.mediaCheck.matched) {
      isBlocked = true;
      reasons.push(`Media query for ${c.mediaCheck.type} was requested but not matched by browser engine`);
    } else if (!c.mediaCheck.active) {
      reasons.push(`Media query for ${c.mediaCheck.type} matched, but expected CSS fallback styles were not active`);
    }
  }

  // 10. Contrast verification
  if (c.contrast?.tested) {
    const minRatio = c.contrast.minRequired || 4.5;
    if (!Number.isFinite(c.contrast.ratio) || c.contrast.ratio < Math.max(4.5, minRatio)) {
      const observed = typeof c.contrast.ratio === 'number' ? c.contrast.ratio.toFixed(2) : 'unknown';
      reasons.push(
        `Insufficient contrast ratio: observed ${observed}:1, required minimum ${minRatio}:1 for text '${c.contrast.fgColor}' on '${c.contrast.bgColor}'`
      );
    }
  }

  if (c.contrast?.codeRatio !== undefined && (!Number.isFinite(c.contrast.codeRatio) || c.contrast.codeRatio < 4.5)) reasons.push('Insufficient debug URL contrast');

  // 11. Rendered content expectation
  if (c.renderedContent && c.renderedContent.matchedStateExpectation === false) {
    reasons.push(`Rendered content did not match expected state: ${c.renderedContent.detail}`);
  }

  // 12. Network mutation lock verification
  if (c.networkLock?.tested) {
    if (c.networkLock.outgoingMutationsCount > 0) {
      reasons.push(`Network lock violation: ${c.networkLock.outgoingMutationsCount} outbound mutating request(s) observed`);
    }
    if (!c.networkLock.trapVerified) {
      reasons.push('Network lock trap verification failed: synthetic endpoints not handled or unhandled mutations not blocked');
    }
  }

  if (reasons.length > 0) {
    if (isBlocked && reasons.every((r) => r.includes('unavailable') || r.includes('not matched'))) {
      return { status: 'BLOCKED', reasons };
    }
    return { status: 'FAIL', reasons };
  }

  return { status: 'PASS', reasons: [] };
}

/**
 * Evaluates full suite of cases.
 * @param {Array<object>} cases
 * @returns {{ allPassed: boolean, passCount: number, failCount: number, blockedCount: number, evaluatedCases: Array<object> }}
 */
function evaluateSuite(cases) {
  let passCount = 0;
  let failCount = 0;
  let blockedCount = 0;

  const evaluatedCases = cases.map((c) => {
    const evaluation = evaluateCase(c);
    if (evaluation.status === 'PASS') passCount++;
    else if (evaluation.status === 'FAIL') failCount++;
    else if (evaluation.status === 'BLOCKED') blockedCount++;

    return {
      ...c,
      status: evaluation.status,
      evaluationReasons: evaluation.reasons,
      passed: evaluation.status === 'PASS'
    };
  });

  return {
    allPassed: cases.length > 0 && new Set(cases.map(c => c.id)).size === cases.length && failCount === 0 && blockedCount === 0,
    passCount,
    failCount,
    blockedCount,
    evaluatedCases
  };
}

module.exports = {
  calculateContrastRatio,
  getRelativeLuminance,
  evaluateCase,
  evaluateSuite
};
