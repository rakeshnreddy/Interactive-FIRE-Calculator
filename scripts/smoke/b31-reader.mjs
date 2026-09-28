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
const voCommand = (name) => vo(`perform command "${name.replace(/"/g, '\\"')}"`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const RECORD = [];

// Capture what VoiceOver said after an action, compared against what a listener should hear.
async function hear({ route, action, expect, settle = 700 }) {
  await sleep(settle);
  const heard = lastPhrase();
  const ok = expect.every((pattern) => pattern.test(heard));
  RECORD.push({ route, action, expected: expect.map(String), heard, ok });
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
      voCommand('Read Current Item');
      await hear({ route: '/', action: 'page load: read current item', expect: [/FinPath|Clear answers|web content|calculators/i] });
      await focusStep(anon.page, '/', 'skip link', [/skip to content/i, /link/i]);
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/', action: 'Enter on skip link → main content', expect: [/main|content|heading|Clear answers/i] });
      await anon.page.keyboard.press('Tab');
      await hear({ route: '/', action: 'Tab after skip → first main control', expect: [/link|button/i] });
      // Heading structure through VoiceOver's own navigation, not the DOM.
      voCommand('Move to Next Heading');
      const h1 = await hear({ route: '/', action: 'Move to Next Heading', expect: [/heading level 1/i, /Clear answers to your money questions/i] });
      voCommand('Move to Next Heading');
      await hear({ route: '/', action: 'Move to Next Heading (2)', expect: [/heading level 2/i] });
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
      voCommand('Move to Next Heading');
      await hear({ route: '/calculators/fire', action: 'Move to Next Heading', expect: [/heading level 1/i, /FIRE Calculator/i] });
      await anon.page.locator('#fire-current-age').focus();
      await hear({ route: '/calculators/fire', action: 'focus Current age', expect: [/current age/i, /edit text|text field|stepper|incrementable/i] });
      await anon.page.locator('#fire-return').focus();
      await hear({ route: '/calculators/fire', action: 'focus Expected return (blank, required)', expect: [/return/i, /required|edit text|text field/i] });
      const calculate = anon.page.locator('.quick-actions .primary-button');
      await calculate.focus();
      await hear({ route: '/calculators/fire', action: 'focus Calculate while rates are blank', expect: [/calculate/i, /dimmed|unavailable|disabled|enter expected return/i] });
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
      await calculate.focus();
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/fire', action: 'Enter on Calculate → result', expect: [/retire|age|result|portfolio|FIRE number/i], settle: 2000 });
      // The savings-path table is the text alternative to the chart.
      const table = anon.page.locator('table').first();
      await table.scrollIntoViewIfNeeded();
      const caption = await table.locator('caption, th').first().innerText().catch(() => '');
      await anon.page.locator('table th').first().focus().catch(() => {});
      voCommand('Read Current Item');
      await hear({ route: '/calculators/fire', action: 'read the results table header', expect: [/table|column|row|age|year|balance|portfolio/i] });
      return { tableHeader: caption };
    });

    await stage('mortgage-result-schedule-help', async () => {
      await anon.page.goto(`${config.url}/calculators/mortgage`, { waitUntil: 'networkidle' });
      await anon.page.bringToFront();
      await sleep(1000);
      voCommand('Move to Next Heading');
      await hear({ route: '/calculators/mortgage', action: 'Move to Next Heading', expect: [/heading level 1/i, /Mortgage Payment/i] });
      await anon.page.locator('#input-mortgage-rate').focus();
      await hear({ route: '/calculators/mortgage', action: 'focus Interest rate', expect: [/interest rate/i, /edit text|text field|stepper|incrementable/i] });
      const help = anon.page.locator('.calculator-help-btn').first();
      await help.focus();
      await hear({ route: '/calculators/mortgage', action: 'focus a metric help button', expect: [/about|help/i, /button/i] });
      await anon.page.keyboard.press('Enter');
      await hear({ route: '/calculators/mortgage', action: 'Enter on help → explanation', expect: [/payment|principal|interest|month/i], settle: 1200 });
      const schedule = anon.page.locator('table').first();
      await schedule.scrollIntoViewIfNeeded();
      await anon.page.locator('table th').first().focus().catch(() => {});
      voCommand('Read Current Item');
      await hear({ route: '/calculators/mortgage', action: 'read the schedule table header', expect: [/table|column|row|month|payment|balance|interest/i] });
      const tabs = anon.page.locator('.calculator-scenario-tab').first();
      await tabs.focus();
      await hear({ route: '/calculators/mortgage', action: 'focus scenario tab', expect: [/tab/i, /conservative|base|optimistic/i] });
    });

    await stage('signed-in-workspace', async () => {
      const page = tenant.page;
      for (const [route, expectHeading] of [['/dashboard', /dashboard/i], ['/plans', /plan/i], ['/reports', /report/i], ['/transactions', /transaction/i], ['/settings', /settings/i]]) {
        await page.goto(`${config.url}${route}`, { waitUntil: 'networkidle' });
        await page.bringToFront();
        await page.waitForFunction(() => Boolean(window.Clerk?.user) && !document.querySelector('.auth-gate-panel'), null, { timeout: 30000 });
        await sleep(1200);
        voCommand('Move to Next Heading');
        await hear({ route, action: 'Move to Next Heading', expect: [/heading level 1/i, expectHeading] });
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
