#!/usr/bin/env node
// B25 local fixture evidence: interaction and media queries only. No hosted auth
// or persistence is exercised by this artifact.
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '/Users/Rakesh/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const base = process.env.FIXTURE_URL || 'http://127.0.0.1:4173/fixtures.html';
const outDir = new URL('./', import.meta.url).pathname;
const shots = `${outDir}/screenshots`;
mkdirSync(shots, { recursive: true });
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
const results = [];
try {
  for (const mode of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: mode });
    const cdp = await context.newCDPSession(await context.newPage());
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }, { name: 'prefers-reduced-transparency', value: 'reduce' }] });
    const page = context.pages()[0];
    await page.goto(`${base}?component=transactions&state=populated&theme=${mode}`, { waitUntil: 'networkidle' });
    await page.waitForSelector('input[type="search"]');
    await page.locator('body').click({ position: { x: 2, y: 2 } });
    let tabs = 0;
    let reached = false;
    const search = page.locator('input[type="search"]').first();
    for (; tabs < 50; tabs += 1) {
      await page.keyboard.press('Tab');
      if (await page.evaluate(el => document.activeElement === el, await search.elementHandle())) { reached = true; break; }
    }
    const focus = await search.evaluate(el => { const s = getComputedStyle(el); return { outline: s.outline, outlineStyle: s.outlineStyle, boxShadow: s.boxShadow }; });
    const before = await page.locator('.transaction-row-card:visible, .transaction-row:visible').count();
    await page.keyboard.type('Fresh');
    await page.waitForTimeout(100);
    const after = await page.locator('.transaction-row-card:visible, .transaction-row:visible').count();
    const typedValue = await search.inputValue();
    const clear = page.getByRole('button', { name: 'Clear filters' });
    const clearEnabled = await clear.isEnabled();
    await page.keyboard.press('Shift+Tab');
    const clearFocused = await page.evaluate(() => document.activeElement?.textContent?.includes('Clear filters'));
    await page.keyboard.press('Enter');
    await page.waitForTimeout(50);
    const clearedValue = await search.inputValue();
    const media = await page.evaluate(() => {
      const targets = [...document.querySelectorAll('.transaction-filter-panel, .transaction-row-card')].slice(0, 2).map(el => { const s = getComputedStyle(el); return { className: el.className, transitionDuration: s.transitionDuration, animationDuration: s.animationDuration, backgroundColor: s.backgroundColor, backdropFilter: s.backdropFilter }; });
      return { reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches, reducedTransparency: matchMedia('(prefers-reduced-transparency: reduce)').matches, targets };
    });
    const screenshot = `${shots}/primary-local-${mode}-reduced.png`;
    await page.screenshot({ path: screenshot, fullPage: false });
    results.push({ mode, url: page.url(), tabs: tabs + 1, reached, focus, typedValue, clearEnabled, clearFocused, clearedValue, rowsBefore: before, rowsAfter: after, fixtureRowsUnchangedExpected: true, filterChanged: typedValue.length > 0 && clearedValue === '', media, screenshot });
    await context.close();
  }
} finally { await browser.close(); }
const ok = results.length === 2 && results.every(r =>
  r.reached && r.clearEnabled && r.clearFocused && r.filterChanged &&
  r.media.reducedMotion && r.media.reducedTransparency && r.media.targets.length > 0 &&
  r.media.targets.every(t =>
    ['0.01ms', '1e-05s', '0s'].includes(t.transitionDuration) &&
    ['0.01ms', '1e-05s', '0s'].includes(t.animationDuration) &&
    (!t.backdropFilter || t.backdropFilter === 'none') &&
    !t.backgroundColor.startsWith('rgba(') && !t.backgroundColor.includes('/')
  )
);
const report = { generatedAt: new Date().toISOString(), candidate: 'local B25 fixture app', base, observations: results, result: ok ? 'PASS' : 'FAILED' };
writeFileSync(`${outDir}/primary-local-accessibility.json`, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 });
console.log(JSON.stringify(report, null, 2));
if (!ok) process.exitCode = 1;
