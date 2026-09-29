// B31 hosted scenario: an actual VoiceOver pass. Runs with `--headed` (VoiceOver cannot see a
// headless window) and requires VoiceOver to be running with "Allow VoiceOver to be controlled
// with AppleScript" enabled. Every recorded announcement is VoiceOver's own spoken phrase, read
// back through its scripting interface (`content of last phrase`); nothing here is synthesised
// from the accessibility tree.
import { execFileSync } from 'node:child_process';
import { writeRaw } from './_b31_helpers.mjs';

let fail;

function osascript(script) {
  return execFileSync('osascript', ['-e', script], { encoding: 'utf8', timeout: 15000 }).trim();
}
const vo = (command) => osascript(`tell application "VoiceOver" to ${command}`);
const lastPhrase = () => osascript('tell application "VoiceOver" to return content of last phrase');
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// VoiceOver is driven the way a person drives it: real VO key chords sent through System Events
// (VO = Control-Option). Key codes: F3 = 99, H = 4, Down = 125, Up = 126, Right = 124, Left = 123.
const KEY = { F3: 99, H: 4, DOWN: 125, UP: 126, RIGHT: 124, LEFT: 123, A: 0 };
function voKey(keyCode, extra = []) {
  const modifiers = ['control down', 'option down', ...extra].join(', ');
  osascript(`tell application "System Events" to key code ${keyCode} using {${modifiers}}`);
}
let keystrokesAllowed = false;
const VO = {
  readItem: () => voKey(KEY.F3),                     // VO-F3: describe the item in the VoiceOver cursor
  nextHeading: () => voKey(KEY.H, ['command down']),  // VO-Command-H: next heading
  interact: () => voKey(KEY.DOWN, ['shift down']),    // VO-Shift-Down: interact with item
  right: () => voKey(KEY.RIGHT),
  left: () => voKey(KEY.LEFT)
};

// VoiceOver's cursor follows keyboard focus and it speaks each newly focused element. When macOS
// has not (yet) granted keystroke permission, headings and table headers are reached by moving
// keyboard focus to them (tabindex=-1 plus focus()), which makes VoiceOver announce the element's
// own role, level and name. The method used is recorded with every step.
async function focusAndHear(page, selector, index, entry) {
  const found = await page.evaluate(({ selector, index }) => {
    const el = [...document.querySelectorAll(selector)].filter((node) => node.getClientRects().length > 0)[index];
    if (!el) return false;
    if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1');
    el.scrollIntoView({ block: 'center' });
    el.focus();
    return true;
  }, { selector, index });
  if (!found) {
    RECORD.push({ ...entry, heard: '', ok: false, method: 'focus', note: `no element for ${selector}[${index}]` });
    return { heard: '', ok: false };
  }
  return hear({ ...entry, method: 'focus' });
}

async function nextHeading(page, route, index, expect) {
  if (keystrokesAllowed) {
    VO.nextHeading();
    return hear({ route, action: 'VO-Command-H (next heading)', expect, method: 'vo-keys' });
  }
  return focusAndHear(page, 'h1, h2, h3', index, { route, action: `focus heading #${index + 1}`, expect });
}

async function openDisclosure(page, route, summaryText) {
  const summary = page.locator('summary', { hasText: summaryText }).first();
  await summary.scrollIntoViewIfNeeded();
  await summary.focus();
  await hear({ route, action: `focus disclosure "${summaryText}"`, expect: [new RegExp(summaryText, 'i'), /collapsed|disclosure|summary/i] });
  await page.keyboard.press('Enter');
  return hear({ route, action: `Enter expands "${summaryText}"`, expect: [/expanded/i] });
}

// Start keyboard traversal from the top of the document, as after a fresh page load.
async function resetFocus(page) {
  await page.evaluate(() => {
    (document.activeElement instanceof HTMLElement) && document.activeElement.blur();
    const body = document.body;
    body.setAttribute('tabindex', '-1');
    body.focus();
    body.removeAttribute('tabindex');
    window.scrollTo(0, 0);
  });
}

async function readTableHeader(page, route, expect) {
  if (keystrokesAllowed) {
    await page.locator('table th').first().scrollIntoViewIfNeeded().catch(() => {});
    VO.readItem();
    return hear({ route, action: 'VO-F3 on the table', expect, method: 'vo-keys' });
  }
  return focusAndHear(page, 'table th', 0, { route, action: 'focus first table header', expect });
}

const RECORD = [];

// Capture what VoiceOver said after an action, compared against what a listener should hear.
async function hear({ route, action, expect, settle = 900, method = 'keyboard' }) {
  await sleep(settle);
  const heard = lastPhrase();
  const ok = expect.every((pattern) => pattern.test(heard));
  RECORD.push({ route, action, method, expected: expect.map(String), heard, ok });
  return { heard, ok };
}

async function focusStep(page, route, action, expect) {
  await page.keyboard.press('Tab');
  return hear({ route, action: `Tab → ${action}`, expect });
}

export default {
  name: 'b31-reader',
  requiredStages: ['voiceover-ready', 'homepage-and-discovery', 'fire-inputs-errors-result', 'mortgage-result-schedule-help', 'signed-in-workspace', 'mobile-width-and-theme', 'announcement-matrix'],

  async run({ config, tenants, stage, browser, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [tenant] = tenants;
    const versions = {};

    await stage('voiceover-ready', async () => {
      if (!browser.headed) fail('run this scenario with --headed: a screen reader cannot observe a headless window');
      let running = false;
      try {
        running = execFileSync('pgrep', ['-x', 'VoiceOver'], { encoding: 'utf8' }).trim().length > 0;
      } catch {
        running = false;
      }
      if (!running) fail('VoiceOver is not running: press Command-F5 (or System Settings > Accessibility > VoiceOver) and rerun');
      try {
        vo('output "FinPath reader check starting"');
        await sleep(600);
        const phrase = lastPhrase();
        if (!/reader check starting/i.test(phrase)) fail(`VoiceOver did not report the test phrase it was asked to speak; last phrase was "${phrase}"`);
      } catch (error) {
        if (error instanceof helpers.SmokeError) throw error;
        fail('VoiceOver AppleScript control is off: enable "Allow VoiceOver to be controlled with AppleScript" in VoiceOver Utility > General, then rerun');
      }
      try {
        osascript('tell application "System Events" to key code 63');
        keystrokesAllowed = true;
      } catch {
        keystrokesAllowed = false;
      }
      versions.navigation = keystrokesAllowed ? 'VoiceOver key chords via System Events' : 'keyboard focus (Tab / programmatic focus); VO key chords not permitted in this session';
      versions.macOS = execFileSync('sw_vers', ['-productVersion'], { encoding: 'utf8' }).trim();
      versions.voiceOver = `VoiceOver (macOS ${versions.macOS})`;
      versions.browser = `Google Chrome ${await browser.version()}`;
      return versions;
    });

    const anon = await browser.newAnonymousPage();
    await anon.page.bringToFront();

    await stage('homepage-and-discovery', async () => {
      await anon.page.goto(`${config.url}/`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1200);
      await resetFocus(anon.page);
      await focusStep(anon.page, '/', 'skip link', [/skip to content/i, /link/i]);
      await anon.page.keyboard.press('Enter');
      // VoiceOver describes the <main id="main-content"> target as a region; focus must actually be there.
      const skipped = await hear({ route: '/', action: 'Enter on skip link → main content', expect: [/main|content|region|heading|Clear answers/i] });
      const onMain = await anon.page.evaluate(() => document.activeElement?.id === 'main-content' || Boolean(document.activeElement?.closest('#main-content')));
      if (!onMain) RECORD.push({ route: '/', action: 'skip link moved focus into #main-content', method: 'dom', expected: ['focus inside #main-content'], heard: skipped.heard, ok: false });
      await anon.page.keyboard.press('Tab');
      await hear({ route: '/', action: 'Tab after skip → first main control', expect: [/link|button/i] });
      // Heading structure through VoiceOver's own navigation, not the DOM.
      const h1 = await nextHeading(anon.page, '/', 0, [/heading level 1/i, /Clear answers to your money questions/i]);
      await nextHeading(anon.page, '/', 1, [/heading level 2/i]);
      // Discovery: search with no matches announces the empty state.
      await anon.page.goto(`${config.url}/calculators`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1000);
      const search = anon.page.locator('input[type="search"], input[placeholder*="Search"]').first();
      await search.focus();
      await hear({ route: '/calculators', action: 'focus search field', expect: [/search|edit text|text field/i] });
      await search.fill('zzzzqqq');
      await hear({ route: '/calculators', action: 'type a phrase with no matches', expect: [/no calculator matches|zzzzqqq|search results|calculator/i], settle: 1500 });
      return { firstHeading: h1.heard };
    });

    await stage('fire-inputs-errors-result', async () => {
      await anon.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1000);
      await nextHeading(anon.page, '/calculators/fire', 0, [/heading level 1/i, /FIRE Calculator/i]);
      await anon.page.locator('#fire-current-age').focus();
      await hear({ route: '/calculators/fire', action: 'focus Current age', expect: [/current age/i, /edit text|text field|stepper|incrementable/i] });
      await anon.page.locator('#fire-return').focus();
      await hear({ route: '/calculators/fire', action: 'focus Expected return (blank, required)', expect: [/return/i, /required|edit text|text field/i] });
      const calculate = anon.page.locator('.quick-actions .primary-button');
      await calculate.focus();
      await hear({ route: '/calculators/fire', action: 'focus Calculate while rates are blank', expect: [/calculate/i, /dimmed|unavailable|disabled/i, /enter expected return/i] });
      await anon.page.locator('#fire-return').fill('99');
      await sleep(400);
      await anon.page.locator('#fire-return').focus();
      await anon.page.keyboard.press('Tab');
      await anon.page.keyboard.press('Shift+Tab');
      await hear({ route: '/calculators/fire', action: 're-focus Expected return with 99 (invalid)', expect: [/return/i, /invalid|between -50% and 50%/i], settle: 900 });
      await anon.page.locator('button:has-text("Use example values")').focus();
      await hear({ route: '/calculators/fire', action: 'focus Use example values', expect: [/use example values/i, /button/i] });
      await anon.page.keyboard.press('Enter');
      await sleep(500);
      // Annual savings lets the page answer "when could I retire" and render the savings-path table.
      await anon.page.locator('#fire-annual-savings').fill('40000');
      await calculate.focus();
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/fire', action: 'Enter on Calculate → result is announced', expect: [/Result updated/i, /FIRE number/i, /retire at about age \d+/i], settle: 2500 });
      // The savings-path table is the text alternative to the chart.
      const table = anon.page.locator('table').first();
      const hasTable = (await anon.page.locator('table').count()) > 0;
      if (hasTable) await openDisclosure(anon.page, '/calculators/fire', 'Savings path by age');
      else RECORD.push({ route: '/calculators/fire', action: 'savings-path table present after Calculate', method: 'dom', expected: ['a table'], heard: '', ok: false, note: 'no table element rendered' });
      const caption = hasTable ? await table.locator('caption, th').first().innerText().catch(() => '') : '';
      await readTableHeader(anon.page, '/calculators/fire', [/\bAge\b/, /column|header|table|row/i]);
      return { tableHeader: caption };
    });

    await stage('mortgage-result-schedule-help', async () => {
      await anon.page.goto(`${config.url}/calculators/mortgage`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1000);
      await nextHeading(anon.page, '/calculators/mortgage', 0, [/heading level 1/i, /Mortgage Payment/i]);
      await anon.page.locator('#input-mortgage-rate').focus();
      await hear({ route: '/calculators/mortgage', action: 'focus Interest rate', expect: [/interest rate/i, /edit text|text field|stepper|incrementable/i] });
      const help = anon.page.locator('.calculator-help-btn').first();
      await help.focus();
      await hear({ route: '/calculators/mortgage', action: 'focus a metric help button', expect: [/about|help/i, /button/i] });
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/mortgage', action: 'Enter on help → explanation', expect: [/payment|principal|interest|month/i], settle: 1200 });
      // Scenario tabs are read before the 361-row schedule is expanded, which keeps VoiceOver busy.
      const tabs = anon.page.locator('.calculator-scenario-tab').first();
      await tabs.scrollIntoViewIfNeeded();
      await tabs.focus();
      await hear({ route: '/calculators/mortgage', action: 'focus scenario tab', expect: [/tab/i, /conservative|base|optimistic/i], settle: 1200 });
      await openDisclosure(anon.page, '/calculators/mortgage', 'Monthly amortization schedule');
      await focusAndHear(anon.page, 'details[open] table th', 0, { route: '/calculators/mortgage', action: 'focus first schedule column header', expect: [/Payment #/i, /column|header|table|row/i] });
    });

    await stage('signed-in-workspace', async () => {
      const page = tenant.page;
      for (const [route, expectHeading] of [['/dashboard', /financial snapshot/i], ['/plans', /plan you can revisit/i], ['/reports', /evidence attached/i], ['/transactions', /manual ledger/i], ['/settings', /profile and privacy/i]]) {
        await page.goto(`${config.url}${route}`, { waitUntil: 'networkidle' });
        await page.bringToFront();
        await page.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'), null, { timeout: 30000 });
        await sleep(1200);
        await page.locator('main h1').first().waitFor({ state: 'visible', timeout: 20000 });
        await sleep(800);
        await focusAndHear(page, 'main h1', 0, { route, action: 'focus the page heading', expect: [/heading level 1/i, expectHeading], settle: 1400 });
      }
      // Workspace menu: open, first item, Escape returns focus.
      const trigger = page.locator('.desktop-nav-menu > button');
      await trigger.focus();
      await hear({ route: '/settings', action: 'focus Workspace menu button', expect: [/workspace/i, /button/i, /collapsed|expanded|menu/i] });
      await page.keyboard.press('Enter');
      await hear({ route: '/settings', action: 'Enter opens the Workspace menu', expect: [/expanded|menu|workspace/i] });
      await page.keyboard.press('Tab');
      await hear({ route: '/settings', action: 'Tab into the menu', expect: [/link/i, /accounts|plans|reports|settings/i] });
      await page.keyboard.press('Escape');
      await hear({ route: '/settings', action: 'Escape closes the menu and returns focus', expect: [/workspace/i, /collapsed|button/i] });
      // Consent toggle and deletion control announce their state and name.
      const toggle = page.locator('.analytics-toggle input');
      await toggle.focus();
      await hear({ route: '/settings', action: 'focus analytics consent toggle', expect: [/improve|analytics|consent/i, /checkbox|switch|toggle/i, /unchecked|off|not checked/i] });
      const confirmation = page.locator('.privacy-delete-form input[type="text"]');
      await confirmation.scrollIntoViewIfNeeded();
      await confirmation.focus();
      await hear({ route: '/settings', action: 'focus the deletion confirmation field', expect: [/confirmation/i, /edit text|text field/i, /cannot be undone|type/i] });
    });

    await stage('mobile-width-and-theme', async () => {
      await anon.page.setViewportSize({ width: 390, height: 844 });
      await anon.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1000);
      const menu = anon.page.locator('.mobile-menu-button');
      await menu.focus();
      await hear({ route: '/calculators/fire@390', action: 'focus mobile menu button', expect: [/menu|navigation/i, /button/i, /collapsed|expanded/i] });
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/fire@390', action: 'Enter opens the mobile menu', expect: [/expanded|menu|navigation/i] });
      await anon.page.keyboard.press('Escape');
      await hear({ route: '/calculators/fire@390', action: 'Escape closes the mobile menu', expect: [/collapsed|button|menu/i] });
      // Theme switch: the control announces its purpose in both directions.
      const theme = anon.page.locator('button[aria-label^="Switch to"]');
      await theme.focus();
      await hear({ route: '/calculators/fire@390', action: 'focus theme switch', expect: [/switch to (dark|light) mode/i, /button/i] });
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/fire@390', action: 'Enter toggles the theme', expect: [/switch to (dark|light) mode/i], settle: 900 });
    });

    await stage('announcement-matrix', async () => {
      const file = writeRaw('b31-reader-announcements', { versions, record: RECORD });
      const failures = RECORD.filter((entry) => !entry.ok);
      if (failures.length) fail(`${failures.length}/${RECORD.length} announcements did not match (${file}): ${failures.slice(0, 4).map((f) => `${f.route} ${f.action}: heard "${f.heard.slice(0, 80)}"`).join(' | ')}`);
      return { versions, steps: RECORD.length, matrix: RECORD, file };
    });
  }
};
