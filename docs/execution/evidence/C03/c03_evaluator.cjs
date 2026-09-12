const fs = require('fs');
const path = require('path');

const REQUIRED_CHECKS = [
  'responsive_layout_matrix',
  'browser_interactions',
  'composed_contrast',
  'media_reduced_transparency',
  'media_reduced_motion',
  'media_forced_colors',
  'print_output',
  'copy_inspection',
  'accessibility_tree',
  'native_zoom_200',
  'screen_reader_smoke',
  'console_cleanliness',
  'page_cleanliness'
];

/**
 * Parses RGB or RGBA string into { r, g, b, a } (0-255 for RGB, 0-1 for a).
 */
function parseRgb(colorStr) {
  if (!colorStr || typeof colorStr !== 'string') return null;
  const rgbMatch = colorStr.match(/rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/i);
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1], 10),
      g: parseInt(rgbMatch[2], 10),
      b: parseInt(rgbMatch[3], 10),
      a: rgbMatch[4] !== undefined ? parseFloat(rgbMatch[4]) : 1
    };
  }
  const hexMatch = colorStr.match(/^#([0-9a-f]{3,8})$/i);
  if (hexMatch) {
    let hex = hexMatch[1];
    if (hex.length === 3 || hex.length === 4) {
      hex = hex.split('').map(c => c + c).join('');
    }
    return {
      r: parseInt(hex.slice(0, 2), 16),
      g: parseInt(hex.slice(2, 4), 16),
      b: parseInt(hex.slice(4, 6), 16),
      a: hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
    };
  }
  return null;
}

/**
 * Calculates WCAG 2.1 relative luminance for an sRGB color.
 */
function calculateLuminance(colorStr) {
  const rgb = parseRgb(colorStr);
  if (!rgb) throw new Error(`Invalid color string: ${colorStr}`);

  const srgb = [rgb.r / 255, rgb.g / 255, rgb.b / 255];
  const linear = srgb.map(c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));

  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

/**
 * Calculates WCAG 2.1 contrast ratio between two colors: (L1 + 0.05) / (L2 + 0.05).
 */
function calculateContrastRatio(fgStr, bgStr) {
  const l1 = calculateLuminance(fgStr);
  const l2 = calculateLuminance(bgStr);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return ratio; // Never round a failing value up to the acceptance threshold.
}

/**
 * Pure evaluator for C03 verification packet.
 * Enforces:
 * - All REQUIRED_CHECKS must be present, validly evaluated, and pass.
 * - Missing or malformed required checks result in BLOCKED.
 * - Any FAIL check results in overall status FAIL and exit code 1.
 * - Any BLOCKED check (and zero FAIL) results in overall status BLOCKED and exit code 2.
 * - Target counts and visibility are strictly asserted before geometry checks.
 * - Contrast ratios are calculated with relative luminance and verified against thresholds.
 * - Media fallback query match and styles are verified.
 * - Exit code and logs are derived from this single evaluator.
 */
function evaluateResults(rawResults = {}) {
  const checks = {};
  const failures = [];
  const blocked = [];

  // 1. Console and Page Exception Cleanliness
  for (const [field, checkId] of [
    ['recordedConsoleErrors', 'console_cleanliness'],
    ['recordedPageExceptions', 'page_cleanliness']
  ]) {
    const observations = rawResults[field];
    if (Array.isArray(observations) && observations.length > 0) {
      checks[checkId] = {
        status: 'FAIL',
        details: `${observations.length} unexpected ${checkId}: ${observations.map(e => e?.text || String(e)).join('; ')}`
      };
      failures.push(`${checkId}: ${checks[checkId].details}`);
    } else if (!Array.isArray(observations) || rawResults.telemetryComplete !== true) {
      checks[checkId] = {
        status: 'BLOCKED',
        details: `Missing or incomplete telemetry for ${field}`
      };
      blocked.push(`${checkId}: Missing or incomplete telemetry`);
    } else {
      checks[checkId] = {
        status: 'PASS',
        details: `Zero errors recorded in ${field}`
      };
    }
  }

  // 2. Responsive Layout Matrix
  const matrix = rawResults.matrix;
  if (!Array.isArray(matrix) || matrix.length !== 30) {
    checks.responsive_layout_matrix = {
      status: 'BLOCKED',
      details: `Matrix incomplete or missing: expected 30 cases, observed ${Array.isArray(matrix) ? matrix.length : 'none'}`
    };
    blocked.push('responsive_layout_matrix: Incomplete matrix cases');
  } else {
    const layoutFailures = [];
    for (const c of matrix) {
      const caseLabel = `${c.route} (${c.width}px, ${c.mode})`;

      // Check malformed structure
      if (typeof c.width !== 'number' || typeof c.overflow !== 'boolean' || !Array.isArray(c.clipped) || !Array.isArray(c.errors)) {
        layoutFailures.push(`${caseLabel}: Malformed case structure`);
        continue;
      }

      // Assert target count and visibility before geometry measurement
      if (typeof c.h1Count !== 'number' || c.h1Count < 1 || !c.h1 || typeof c.h1.bottom !== 'number') {
        layoutFailures.push(`${caseLabel}: Missing or invisible h1 target (count=${c.h1Count})`);
      }

      if (c.route === '/') {
        if (typeof c.ctaCount !== 'number' || c.ctaCount < 1 || !Array.isArray(c.cta) || c.cta.length < 1) {
          layoutFailures.push(`${caseLabel}: Missing primary CTA target (count=${c.ctaCount})`);
        }
        if (typeof c.exampleCount !== 'number' || c.exampleCount < 1 || !Array.isArray(c.example) || c.example.length < 1) {
          layoutFailures.push(`${caseLabel}: Missing hero example target (count=${c.exampleCount})`);
        }
      }

      // Assert zero overflow, zero clipping, zero unexpected page errors
      if (c.overflow) {
        layoutFailures.push(`${caseLabel}: Horizontal overflow detected`);
      }
      if (c.clipped.length > 0) {
        layoutFailures.push(`${caseLabel}: Clipped elements: ${c.clipped.join(', ')}`);
      }
      if (c.errors.length > 0) {
        layoutFailures.push(`${caseLabel}: Browser errors: ${c.errors.join(', ')}`);
      }

      // Contract geometry rules
      // Mobile 390px on '/': primary action within 600px from top (bottom <= 600)
      if (c.route === '/' && c.width === 390 && Array.isArray(c.cta) && c.cta[0]) {
        const ctaBottom = c.cta[0].bottom;
        const ctaTop = c.cta[0].y;
        if (ctaTop < 0 || ctaBottom > 600) {
          layoutFailures.push(`${caseLabel}: Mobile 390 CTA out of bounds (top=${ctaTop}px, bottom=${ctaBottom}px > 600px)`);
        }
      }

      // Desktop 1440px on '/': headline, primary action, and example answer visible in first view (< 900px)
      if (c.route === '/' && c.width === 1440) {
        if (c.h1 && (c.h1.y < 0 || c.h1.bottom > 900)) {
          layoutFailures.push(`${caseLabel}: Desktop 1440 headline below fold (bottom=${c.h1.bottom}px > 900px)`);
        }
        if (Array.isArray(c.cta) && c.cta[0] && (c.cta[0].y < 0 || c.cta[0].bottom > 900)) {
          layoutFailures.push(`${caseLabel}: Desktop 1440 CTA below fold (bottom=${c.cta[0].bottom}px > 900px)`);
        }
        if (Array.isArray(c.example) && c.example[0] && (c.example[0].y < 0 || c.example[0].bottom > 900)) {
          layoutFailures.push(`${caseLabel}: Desktop 1440 Hero Example below fold (bottom=${c.example[0].bottom}px > 900px)`);
        }
      }
    }

    if (layoutFailures.length > 0) {
      checks.responsive_layout_matrix = {
        status: 'FAIL',
        details: `${layoutFailures.length} layout geometry/overflow violation(s): ${layoutFailures.slice(0, 3).join('; ')}`
      };
      failures.push(`responsive_layout_matrix: ${checks.responsive_layout_matrix.details}`);
    } else {
      checks.responsive_layout_matrix = {
        status: 'PASS',
        details: 'All 30 responsive layout cases passed with zero overflow, clipping, or geometry violations'
      };
    }
  }

  // 3. Browser Interactions
  const interactions = rawResults.interactions;
  if (!Array.isArray(interactions) || interactions.length < 5) {
    checks.browser_interactions = {
      status: 'BLOCKED',
      details: 'Missing or incomplete browser interactions collection'
    };
    blocked.push('browser_interactions: Incomplete interactions');
  } else {
    const failedInteractions = interactions.filter(i => !i || i.pass !== true);
    if (failedInteractions.length > 0) {
      checks.browser_interactions = {
        status: 'FAIL',
        details: `Failed interaction cases: ${failedInteractions.map(i => i?.case || 'unknown').join(', ')}`
      };
      failures.push(`browser_interactions: ${checks.browser_interactions.details}`);
    } else {
      checks.browser_interactions = {
        status: 'PASS',
        details: `All ${interactions.length} browser interactions verified (search, clear, keyboard nav, auth escape)`
      };
    }
  }

  // 4. Composed Contrast
  const contrastPairs = rawResults.contrastPairs;
  if (!Array.isArray(contrastPairs) || contrastPairs.length < 10) {
    checks.composed_contrast = {
      status: 'BLOCKED',
      details: 'Missing or incomplete contrast measurements'
    };
    blocked.push('composed_contrast: Incomplete contrast measurements');
  } else {
    const failedPairs = [];
    for (const p of contrastPairs) {
      if (!p || typeof p.ratio !== 'number' || typeof p.threshold !== 'number' || typeof p.pass !== 'boolean') {
        failedPairs.push(`${p?.id || 'unknown'}: Malformed contrast measurement`);
        continue;
      }
      if (p.ratio < p.threshold || !p.pass) {
        failedPairs.push(`${p.id}: Ratio ${p.ratio}:1 below required threshold ${p.threshold}:1`);
      }
    }
    if (failedPairs.length > 0) {
      checks.composed_contrast = {
        status: 'FAIL',
        details: `${failedPairs.length} contrast violation(s): ${failedPairs.join('; ')}`
      };
      failures.push(`composed_contrast: ${checks.composed_contrast.details}`);
    } else {
      checks.composed_contrast = {
        status: 'PASS',
        details: `All ${contrastPairs.length} text and control pairs meet WCAG thresholds`
      };
    }
  }

  // 5. Media Fallbacks (Reduced Transparency, Reduced Motion, Forced Colors)
  const media = rawResults.mediaFallbacks;
  if (!media || typeof media !== 'object') {
    checks.media_reduced_transparency = { status: 'BLOCKED', details: 'Missing mediaFallbacks data' };
    checks.media_reduced_motion = { status: 'BLOCKED', details: 'Missing mediaFallbacks data' };
    checks.media_forced_colors = { status: 'BLOCKED', details: 'Missing mediaFallbacks data' };
    blocked.push('mediaFallbacks: Data missing');
  } else {
    // Reduced Transparency
    const rt = media.reducedTransparency;
    if (!rt || rt.matches !== true || rt.pass !== true) {
      checks.media_reduced_transparency = {
        status: 'FAIL',
        details: `prefers-reduced-transparency failed: matches=${rt?.matches}, pass=${rt?.pass}`
      };
      failures.push(`media_reduced_transparency: ${checks.media_reduced_transparency.details}`);
    } else {
      checks.media_reduced_transparency = {
        status: 'PASS',
        details: 'prefers-reduced-transparency matched and opaque material fallback verified'
      };
    }

    // Reduced Motion
    const rm = media.reducedMotion;
    if (!rm || rm.matches !== true || rm.pass !== true) {
      checks.media_reduced_motion = {
        status: 'FAIL',
        details: `prefers-reduced-motion failed: matches=${rm?.matches}, pass=${rm?.pass}`
      };
      failures.push(`media_reduced_motion: ${checks.media_reduced_motion.details}`);
    } else {
      checks.media_reduced_motion = {
        status: 'PASS',
        details: 'prefers-reduced-motion matched and animations suppressed'
      };
    }

    // Forced Colors
    const fc = media.forcedColors;
    if (!fc || fc.matches !== true || fc.pass !== true) {
      checks.media_forced_colors = {
        status: 'FAIL',
        details: `forced-colors failed: matches=${fc?.matches}, pass=${fc?.pass}`
      };
      failures.push(`media_forced_colors: ${checks.media_forced_colors.details}`);
    } else {
      checks.media_forced_colors = {
        status: 'PASS',
        details: 'forced-colors matched and system color borders applied'
      };
    }
  }

  // 6. Print Output
  const print = rawResults.print;
  if (!print || typeof print !== 'object') {
    checks.print_output = { status: 'BLOCKED', details: 'Missing print inspection data' };
    blocked.push('print_output: Missing print data');
  } else if (!print.pass || !Array.isArray(print.pdfs) || print.pdfs.length !== 4 || !print.mediaOmitted || !print.navOmitted) {
    checks.print_output = {
      status: 'FAIL',
      details: `Print inspection failed: 4 PDFs generated=${print?.pdfs?.length === 4}, mediaOmitted=${print?.mediaOmitted}, navOmitted=${print?.navOmitted}, pass=${print?.pass}`
    };
    failures.push(`print_output: ${checks.print_output.details}`);
  } else {
    checks.print_output = {
      status: 'PASS',
      details: '4 PDFs generated across themes and printBackground options; decorative overlays hidden, readable text'
    };
  }

  // 7. Copy Inspection
  const copy = rawResults.copy;
  if (!Array.isArray(copy) || copy.length < 4) {
    checks.copy_inspection = { status: 'BLOCKED', details: 'Missing or incomplete copy inspection routes' };
    blocked.push('copy_inspection: Incomplete inspected routes');
  } else {
    const dirtyCopy = copy.filter(c => !c || !c.clean || c.hasPhase || c.hasEnvLeak || c.hasInternalDirectives);
    if (dirtyCopy.length > 0) {
      checks.copy_inspection = {
        status: 'FAIL',
        details: `Internal directive or leak detected on: ${dirtyCopy.map(c => c.route).join(', ')}`
      };
      failures.push(`copy_inspection: ${checks.copy_inspection.details}`);
    } else {
      checks.copy_inspection = {
        status: 'PASS',
        details: `Clean user copy verified across ${copy.length} routes including amortization`
      };
    }
  }

  // 8. Accessibility Tree Snapshot
  const ax = rawResults.axTree;
  if (!ax || typeof ax !== 'object') {
    checks.accessibility_tree = { status: 'BLOCKED', details: 'Missing accessibility tree snapshot' };
    blocked.push('accessibility_tree: Missing AX snapshot');
  } else if (!ax.hasChartFigure || !ax.hasEndBalance || !ax.hasModeledTarget || !ax.hasHorizon || !ax.pass) {
    checks.accessibility_tree = {
      status: 'FAIL',
      details: `AX tree missing semantic elements: figure=${ax.hasChartFigure}, endBalance=${ax.hasEndBalance}, target=${ax.hasModeledTarget}, horizon=${ax.hasHorizon}`
    };
    failures.push(`accessibility_tree: ${checks.accessibility_tree.details}`);
  } else {
    checks.accessibility_tree = {
      status: 'PASS',
      details: 'CDP accessibility tree exposes accessible chart figure, end balance $0, target, and horizon'
    };
  }

  // 9. Native 200% Zoom (R3a)
  const nz = rawResults.nativeZoom;
  if (!nz || typeof nz !== 'object') {
    checks.native_zoom_200 = { status: 'BLOCKED', details: 'Missing native zoom evaluation' };
    blocked.push('native_zoom_200: Missing evaluation');
  } else if (nz.status === 'BLOCKED') {
    checks.native_zoom_200 = {
      status: 'BLOCKED',
      details: nz.details || 'Native 200% browser UI zoom unavailable in automated headless environment',
      attemptedMethod: nz.attemptedMethod,
      limitation: nz.limitation
    };
    blocked.push(`native_zoom_200: ${checks.native_zoom_200.details}`);
  } else if (nz.status === 'FAIL' || nz.overflow === true) {
    checks.native_zoom_200 = {
      status: 'FAIL',
      details: nz.details || 'Native zoom 200% produced horizontal overflow'
    };
    failures.push(`native_zoom_200: ${checks.native_zoom_200.details}`);
  } else if (nz.status === 'PASS') {
    checks.native_zoom_200 = {
      status: 'PASS',
      details: nz.details || 'Native browser zoom 200% verified with zero overflow'
    };
  } else {
    checks.native_zoom_200 = { status: 'BLOCKED', details: `Unknown status: ${nz.status}` };
    blocked.push(`native_zoom_200: Unknown status: ${nz.status}`);
  }

  // 10. Screen Reader Smoke (B18)
  const sr = rawResults.screenReader;
  if (!sr || typeof sr !== 'object') {
    checks.screen_reader_smoke = { status: 'BLOCKED', details: 'Missing screen reader evaluation' };
    blocked.push('screen_reader_smoke: Missing evaluation');
  } else if (sr.status === 'BLOCKED') {
    checks.screen_reader_smoke = {
      status: 'BLOCKED',
      details: sr.details || 'Interactive VoiceOver/screen reader session requires reviewer assistance',
      limitation: sr.limitation,
      assistedAction: sr.assistedAction
    };
    blocked.push(`screen_reader_smoke: ${checks.screen_reader_smoke.details}`);
  } else if (sr.status === 'FAIL') {
    checks.screen_reader_smoke = {
      status: 'FAIL',
      details: sr.details || 'Screen reader smoke failed'
    };
    failures.push(`screen_reader_smoke: ${checks.screen_reader_smoke.details}`);
  } else if (sr.status === 'PASS') {
    checks.screen_reader_smoke = {
      status: 'PASS',
      details: sr.details || 'Screen reader smoke passed'
    };
  } else {
    checks.screen_reader_smoke = { status: 'BLOCKED', details: `Unknown status: ${sr.status}` };
    blocked.push(`screen_reader_smoke: Unknown status: ${sr.status}`);
  }

  // Check that every REQUIRED check is evaluated
  for (const requiredId of REQUIRED_CHECKS) {
    if (!checks[requiredId]) {
      checks[requiredId] = { status: 'BLOCKED', details: `Missing required check: ${requiredId}` };
      blocked.push(`Missing required check: ${requiredId}`);
    }
  }

  // Independent completeness checks: cardinality cannot prove case identity.
  // These checks supplement observed failures; they never promote a blocked row.
  const reject = (id, details) => {
    checks[id] = { status: 'FAIL', details };
    failures.push(`${id}: ${details}`);
  };
  const exactSet = (id, rows, key, expected) => {
    if (!Array.isArray(rows)) return;
    const actual = rows.map(row => row && key(row));
    if (actual.length !== expected.length || new Set(actual).size !== actual.length ||
        expected.some(value => !actual.includes(value))) {
      reject(id, 'Missing, duplicate, or unexpected required case identity');
    }
  };
  exactSet('responsive_layout_matrix', matrix, c => `${c.route}|${c.width}|${c.mode}`,
    ['/', '/calculators', '/dashboard'].flatMap(route =>
      [320, 390, 612, 768, 1440].flatMap(width =>
        ['light', 'dark'].map(mode => `${route}|${width}|${mode}`))));
  exactSet('browser_interactions', interactions, c => c.case, [
    'mixed-case trim FIRE', 'no match', 'clear restoration', 'keyboard FIRE navigation',
    'auth public escape', 'auth loading public escape', 'auth signed-out public escape'
  ]);
  exactSet('copy_inspection', copy, c => c.route, [
    '/calculators/mortgage', '/calculators/compound-interest',
    '/calculators/debt-payoff', '/calculators/amortization'
  ]);
  exactSet('composed_contrast', contrastPairs, c => c.id,
    ['light', 'dark'].flatMap(mode => [
      'heading', 'subtext', 'eyebrow', 'cta_primary', 'cta_secondary', 'metric_label',
      'metric_value', 'chart_legend_label', 'chart_legend_end', 'chart_context', 'assumption_text'
    ].map(id => `contrast_${mode}_${id}`)));
  if (Array.isArray(contrastPairs) && contrastPairs.some(p =>
      !p || !Number.isFinite(p.ratio) || !Number.isFinite(p.threshold) ||
      p.ratio < 1 || p.ratio > 21 || ![3, 4.5].includes(p.threshold))) {
    reject('composed_contrast', 'Nonfinite, invalid ratio or invalid text threshold');
  }
  const validRect = r => r && ['x', 'y', 'width', 'height', 'right', 'bottom']
    .every(k => Number.isFinite(r[k])) && r.width > 0 && r.height > 0 &&
    Math.abs(r.x + r.width - r.right) < 0.1 &&
    Math.abs(r.y + r.height - r.bottom) < 0.1;
  if (Array.isArray(matrix) && matrix.some(c => !c || !validRect(c.h1) ||
      (c.route === '/' && (!Array.isArray(c.cta) || !c.cta.length || !c.cta.every(validRect) ||
       !Array.isArray(c.example) || !c.example.length || !c.example.every(validRect))))) {
    reject('responsive_layout_matrix', 'Missing, nonfinite, invisible or inconsistent rectangle');
  }
  if (print && (print.readableText !== true || print.noClipping !== true)) {
    reject('print_output', 'Readable text and no clipping must both be observed true');
  }
  exactSet('print_output', print?.pdfs, name => name,
    ['print-light-bg.pdf', 'print-light-nobg.pdf', 'print-dark-bg.pdf', 'print-dark-nobg.pdf']);

  // Derive overall status and exit code
  let overallStatus = 'PASS';
  let exitCode = 0;
  let summary = 'All required checks passed.';

  if (failures.length > 0) {
    overallStatus = 'FAIL';
    exitCode = 1;
    summary = `Verification failed: ${failures.length} check(s) failed.`;
  } else if (blocked.length > 0) {
    overallStatus = 'BLOCKED';
    exitCode = 2;
    summary = `Verification blocked: ${blocked.length} check(s) blocked/unperformed.`;
  }

  return {
    overallStatus,
    exitCode,
    summary,
    checks,
    failures,
    blocked,
    evaluatedAt: new Date().toISOString()
  };
}

/**
 * Finalizes evaluation, stores it on rawResults, writes report to disk, and returns the evaluation.
 */
function finalizeAndPersistReport(rawResults, outputPath) {
  const evaluation = evaluateResults(rawResults);

  rawResults.evaluated = evaluation;

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(rawResults, null, 2));
  }

  return evaluation;
}

module.exports = {
  REQUIRED_CHECKS,
  parseRgb,
  calculateLuminance,
  calculateContrastRatio,
  evaluateResults,
  finalizeAndPersistReport
};
