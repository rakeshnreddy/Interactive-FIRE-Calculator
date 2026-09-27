// Shared helpers for the B31 visual/accessibility sweep scenarios (b31-visual, b31-zoom).
// Screenshots go to docs/execution/evidence/B31/raw/ (ignored by Git); the runner's JSON report
// carries the measured numbers.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RAW_DIR = join(REPO_ROOT, 'docs/execution/evidence/B31/raw');
mkdirSync(RAW_DIR, { recursive: true });

export const PUBLIC_ROUTES = ['/', '/calculators', '/calculators/fire', '/calculators/mortgage', '/calculators/sip', '/calculators/income-tax-india', '/calculators/compound-interest', '/calculators/emi'];
export const WORKSPACE_ROUTES = ['/dashboard', '/accounts', '/transactions', '/goals', '/plans', '/reports', '/settings'];
export const THEMES = ['light', 'dark'];

export async function shot(page, name, fullPage = false) {
  const file = join(RAW_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage, scale: 'css' });
  return `raw/${name}.png`;
}

// The persisted preference is the real path a visitor's choice takes, so set it and reload.
export async function setTheme(page, mode) {
  await page.evaluate((m) => window.localStorage.setItem('finpath.colorMode', m), mode);
  await page.reload({ waitUntil: 'networkidle' });
  const applied = await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-mode'));
  if (applied !== mode) throw new Error(`theme ${mode} not applied (got ${applied})`);
}

export async function gotoTheme(page, url, mode) {
  await page.goto(url, { waitUntil: 'networkidle' });
  const current = await page.evaluate(() => document.querySelector('.app')?.getAttribute('data-mode'));
  if (current !== mode) await setTheme(page, mode);
}

// Collects console errors and uncaught exceptions for the life of the page.
export function attachConsole(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text().slice(0, 200));
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${String(error?.message || error).slice(0, 200)}`));
  return errors;
}

// Layout facts a visual gate needs: horizontal overflow, controls clipped outside the document,
// controls smaller than the 24px target minimum, and text overflowing its own box.
export const LAYOUT_SCRIPT = `(() => {
  const doc = document.documentElement;
  const visible = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden'; };
  const name = (el) => (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || el.getAttribute('placeholder') || '').trim().slice(0, 40);
  const controls = [...document.querySelectorAll('a[href], button, input, select, textarea, summary, [role="tab"]')].filter(visible);
  const clipped = controls.filter((el) => { const r = el.getBoundingClientRect(); return r.right + window.scrollX > doc.scrollWidth + 1 || r.left + window.scrollX < -1; }).map((el) => el.tagName.toLowerCase() + ':' + name(el));
  const small = controls.filter((el) => !(el.tagName === 'A' && el.closest('p, li, small, td')) && el.type !== 'checkbox' && el.type !== 'radio').filter((el) => { const r = el.getBoundingClientRect(); return r.height < 24 || r.width < 24; }).map((el) => el.tagName.toLowerCase() + ':' + name(el));
  // Leaf text elements only, so tooltips and other hidden descendants do not count as overflow.
  const textBoxes = [...document.querySelectorAll('h1, h2, h3, p, small, label, dd, dt, td, th, strong, span, li, a, button, output')].filter((el) => visible(el) && el.children.length === 0 && el.textContent.trim().length > 0);
  const overflowingText = textBoxes.filter((el) => { const cs = getComputedStyle(el); const r = el.getBoundingClientRect(); return cs.overflow === 'visible' && cs.whiteSpace !== 'nowrap' && cs.clip === 'auto' && r.width > 2 && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0 && !el.closest('table, pre, code, [role="tooltip"]'); }).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '') + ' in .' + String(el.parentElement.className || '').split(' ')[0] + ':' + name(el) + ' (' + el.scrollWidth + '>' + el.clientWidth + 'px)');
  return { innerWidth: window.innerWidth, outerWidth: window.outerWidth, devicePixelRatio: window.devicePixelRatio, scrollWidth: doc.scrollWidth, horizontalOverflow: doc.scrollWidth > window.innerWidth + 1, controls: controls.length, clipped, small, overflowingText, unnamed: controls.filter((el) => !name(el) && !(el.labels && el.labels.length) && !el.getAttribute('aria-labelledby')).map((el) => el.tagName.toLowerCase() + (el.className ? '.' + String(el.className).split(' ')[0] : '')) };
})()`;

// Measure after fonts load and layout transitions settle, and only report problems that persist.
export async function measureLayout(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);
  const first = await page.evaluate(LAYOUT_SCRIPT);
  if (!layoutProblems(first).length) return first;
  await page.waitForTimeout(600);
  return page.evaluate(LAYOUT_SCRIPT);
}

export function writeRaw(name, data) {
  writeFileSync(join(RAW_DIR, `${name}.json`), JSON.stringify(data, null, 2));
  return `raw/${name}.json`;
}

export function layoutProblems(report) {
  const problems = [];
  if (report.horizontalOverflow) problems.push(`horizontal overflow ${report.scrollWidth}>${report.innerWidth}`);
  if (report.clipped.length) problems.push(`clipped controls: ${report.clipped.slice(0, 5).join(', ')}`);
  if (report.overflowingText.length) problems.push(`text overflowing its box: ${report.overflowingText.slice(0, 5).join(', ')}`);
  if (report.unnamed.length) problems.push(`controls without an accessible name: ${report.unnamed.slice(0, 5).join(', ')}`);
  return problems;
}

// --- Contrast measured from effective pairs -------------------------------------------------
// Text color comes from computed style; the background is sampled from a real screenshot beneath
// the element (the most common pixel colour in its box), so glass, gradients and overlays count.

const channel = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]) => 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
export const contrastRatio = (a, b) => { const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x); return (l1 + 0.05) / (l2 + 0.05); };

const parseColor = (text) => {
  const m = text.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(/[\s,\/]+/).filter(Boolean).map(Number);
  return { rgb: parts.slice(0, 3), alpha: parts[3] ?? 1 };
};

export const TEXT_SAMPLE_SCRIPT = `(() => {
  const seen = new Set();
  const out = [];
  const nodes = [...document.querySelectorAll('h1, h2, h3, p, small, label, a, button, dd, dt, th, td, strong, span, li, summary, output, legend')];
  for (const el of nodes) {
    if (out.length >= 90) break;
    const hasText = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!hasText) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8 || r.bottom < 0 || r.top > window.innerHeight || r.right < 0 || r.left > window.innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0) continue;
    // Gradient text (background-clip: text) has a transparent colour; judge its worst gradient stop.
    const clipText = (cs.webkitBackgroundClip === 'text' || cs.backgroundClip === 'text') && /gradient/.test(cs.backgroundImage);
    const gradientStops = clipText ? (cs.backgroundImage.match(/rgba?\\([^)]+\\)/g) || []) : [];
    const key = Math.round(r.top) + ':' + Math.round(r.left) + ':' + el.tagName;
    if (seen.has(key)) continue;
    seen.add(key);
    const isDisabled = el.matches(':disabled, [aria-disabled="true"]');
    out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className || '').split(' ')[0], text: el.textContent.trim().slice(0, 40), color: cs.color, gradientStops, fontSize: parseFloat(cs.fontSize), fontWeight: Number(cs.fontWeight) || 400, disabled: isDisabled, rect: { x: Math.max(0, r.left), y: Math.max(0, r.top), w: Math.min(r.width, window.innerWidth - Math.max(0, r.left)), h: Math.min(r.height, window.innerHeight - Math.max(0, r.top)) } });
  }
  return out;
})()`;

export async function contrastReport(context, page) {
  const samples = await page.evaluate(TEXT_SAMPLE_SCRIPT);
  const png = (await page.screenshot({ scale: 'css' })).toString('base64');
  // Sample inside the box (inset 20% / 25%) so rounded corners and neighbours are not counted.
  const points = samples.map((s) => {
    const list = [];
    const x0 = s.rect.x + Math.max(1, s.rect.w * 0.2);
    const y0 = s.rect.y + Math.max(1, s.rect.h * 0.25);
    const w = Math.max(1, s.rect.w - 2 * Math.max(1, s.rect.w * 0.2));
    const h = Math.max(1, s.rect.h - 2 * Math.max(1, s.rect.h * 0.25));
    for (let i = 0; i < 7; i += 1) for (let j = 0; j < 5; j += 1) list.push([Math.floor(x0 + w * (i / 6)), Math.floor(y0 + h * (j / 4))]);
    return list;
  });
  const decoder = await context.newPage();
  await decoder.goto('about:blank');
  const pixels = await decoder.evaluate(async ({ png, points }) => {
    const img = new Image();
    img.src = `data:image/png;base64,${png}`;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return points.map((list) => list.map(([x, y]) => [...ctx.getImageData(Math.min(x, img.width - 1), Math.min(y, img.height - 1), 1, 1).data.slice(0, 3)]));
  }, { png, points });
  await decoder.close();
  const rows = samples.map((s, index) => {
    const counts = new Map();
    for (const px of pixels[index]) { const k = px.map((v) => v >> 4).join(','); counts.set(k, { n: (counts.get(k)?.n ?? 0) + 1, px }); }
    const background = [...counts.values()].sort((a, b) => b.n - a.n)[0].px;
    const large = s.fontSize >= 24 || (s.fontSize >= 18.66 && s.fontWeight >= 700);
    const required = s.disabled ? 0 : large ? 3 : 4.5;
    const stops = s.gradientStops.map(parseColor).filter(Boolean).map((c) => c.rgb);
    if (stops.length) {
      const ratios = stops.map((rgb) => contrastRatio(rgb, background));
      const worst = Math.min(...ratios);
      return { element: `${s.tag}${s.cls ? '.' + s.cls : ''}`, text: s.text, fontSize: s.fontSize, ratio: Number(worst.toFixed(2)), required, background: `rgb(${background.join(',')})`, color: `gradient worst stop rgb(${stops[ratios.indexOf(worst)].join(',')})` };
    }
    const fg = parseColor(s.color);
    if (!fg) return null;
    const text = fg.alpha < 1 ? fg.rgb.map((v, i) => Math.round(v * fg.alpha + background[i] * (1 - fg.alpha))) : fg.rgb;
    const ratio = contrastRatio(text, background);
    return { element: `${s.tag}${s.cls ? '.' + s.cls : ''}`, text: s.text, fontSize: s.fontSize, ratio: Number(ratio.toFixed(2)), required, background: `rgb(${background.join(',')})`, color: `rgb(${text.join(',')})` };
  }).filter(Boolean);
  const failures = rows.filter((r) => r.ratio < r.required);
  return { sampled: rows.length, minimum: Math.min(...rows.map((r) => r.ratio)), failures, lowest: [...rows].sort((a, b) => a.ratio - b.ratio).slice(0, 8) };
}

export const FOCUS_SCRIPT = `(() => {
  const el = document.activeElement;
  if (!el || el === document.body) return { tag: 'body' };
  const cs = getComputedStyle(el);
  const r = el.getBoundingClientRect();
  const label = (el.getAttribute('aria-label') || el.textContent || (el.labels && el.labels[0] && el.labels[0].textContent) || el.getAttribute('title') || el.getAttribute('placeholder') || (el.getAttribute('aria-labelledby') && document.getElementById(el.getAttribute('aria-labelledby'))?.textContent) || '').trim().slice(0, 40);
  const indicator = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none') || (cs.borderColor !== getComputedStyle(el.parentElement).borderColor && el.tagName === 'INPUT');
  return { tag: el.tagName.toLowerCase(), label, indicator, inViewport: r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth, hidden: r.width === 0 && r.height === 0 };
})()`;
