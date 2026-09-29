// C11 hosted scenario (B12): consented measurement is off by default, pseudonymous, and purged on
// withdrawal.
let fail;

const count = async (d1, sql, ...params) => (await d1(sql, params))?.[0]?.cnt;

export default {
  name: 'c11-analytics',
  requiredStages: ['signed-out-sends-nothing', 'off-by-default', 'opt-in-through-settings', 'events-are-pseudonymous', 'activation-starts-cohort', 'opt-out-purges'],

  async run({ config, tenants, stage, d1, browser, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a, b] = tenants;
    let pseudonym;

    await stage('signed-out-sends-nothing', async () => {
      const anon = await browser.newAnonymousPage();
      await anon.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'networkidle' });
      await anon.page.locator('button:has-text("Use example values")').click();
      await anon.page.locator('.quick-actions .primary-button').click();
      await anon.page.waitForTimeout(2500);
      const analyticsCalls = anon.requests.filter((url) => url.includes('/api/analytics'));
      if (analyticsCalls.length) fail(`signed-out visitor sent analytics: ${analyticsCalls.length}`);
    });

    await stage('off-by-default', async () => {
      const consent = await a.api('GET', '/api/analytics/consent');
      if (consent.status !== 200 || consent.body?.granted !== false) fail(`consent default: ${consent.status} ${JSON.stringify(consent.body)}`);
      const event = { eventId: crypto.randomUUID(), eventName: 'comparison_viewed', eventVersion: 1, occurredDay: new Date().toISOString().slice(0, 10), release: 'smoke', props: { family: 'fire' } };
      const denied = await b.api('POST', '/api/analytics/events', { events: [event] });
      if (denied.status !== 403 || denied.body?.code !== 'CONSENT_REQUIRED') fail(`events without consent: ${denied.status}`);
      if ((await count(d1, 'SELECT count(*) AS cnt FROM analytics_consent WHERE user_id IN (?, ?);', a.id, b.id)) !== 0) fail('consent rows exist before opt-in');
    });

    await stage('opt-in-through-settings', async () => {
      await a.page.goto(`${config.url}/settings`, { waitUntil: 'domcontentloaded' });
      const toggle = a.page.locator('.analytics-toggle input');
      await toggle.waitFor({ state: 'visible', timeout: 30000 });
      await a.page.waitForFunction(() => !document.querySelector('.analytics-toggle input')?.disabled, null, { timeout: 30000 });
      if (await toggle.isChecked()) fail('toggle starts checked');
      // The control reflects the server-confirmed state, so wait for it after clicking.
      await toggle.click();
      await a.page.waitForFunction(() => document.querySelector('.analytics-toggle input')?.checked === true, null, { timeout: 30000 });
      const rows = await d1('SELECT pseudonym FROM analytics_consent WHERE user_id = ?;', [a.id]);
      if (rows.length !== 1) fail('consent row not created');
      pseudonym = rows[0].pseudonym;
      if (!pseudonym || pseudonym === a.id || pseudonym.includes('user_')) fail('pseudonym is not independent of the user id');
    });

    await stage('events-are-pseudonymous', async () => {
      await a.page.goto(`${config.url}/calculators/fire`, { waitUntil: 'domcontentloaded' });
      await a.page.locator('button:has-text("Use example values")').click();
      await a.page.locator('.quick-actions .primary-button').click();
      let events = 0;
      for (let i = 0; i < 15 && events === 0; i += 1) {
        await a.page.waitForTimeout(1000);
        events = await count(d1, "SELECT count(*) AS cnt FROM analytics_events WHERE pseudonym = ? AND event_name = 'calculation_completed';", pseudonym);
      }
      if (events !== 1) fail(`expected one calculation_completed event, found ${events}`);
      const stored = await d1('SELECT props_json FROM analytics_events WHERE pseudonym = ?;', [pseudonym]);
      if (JSON.stringify(stored).includes(a.id)) fail('event rows contain the user id');
      if (stored.some((row) => /\d{4,}/.test(row.props_json))) fail('event props contain numeric amounts');
      return { props: stored.map((row) => row.props_json) };
    });

    await stage('activation-starts-cohort', async () => {
      const saved = await a.api('POST', '/api/plans', { name: 'Smoke analytics plan', snapshot: { plan: {}, timeline: {} }, result: {} });
      if (saved.status !== 201) fail(`plan save returned ${saved.status}`);
      if ((await count(d1, "SELECT count(*) AS cnt FROM analytics_events WHERE pseudonym = ? AND event_name = 'decision_saved';", pseudonym)) !== 1) fail('decision_saved not recorded');
      if ((await count(d1, 'SELECT count(*) AS cnt FROM analytics_cohorts WHERE pseudonym = ?;', pseudonym)) !== 1) fail('cohort not started');
    });

    await stage('opt-out-purges', async () => {
      await a.page.goto(`${config.url}/settings`, { waitUntil: 'domcontentloaded' });
      const toggle = a.page.locator('.analytics-toggle input');
      await a.page.waitForFunction(() => document.querySelector('.analytics-toggle input')?.checked === true, null, { timeout: 30000 });
      await toggle.click();
      await a.page.waitForFunction(() => /collected records were deleted/.test(document.querySelector('.analytics-consent-panel .profile-status')?.textContent ?? ''), null, { timeout: 30000 });
      for (const table of ['analytics_events', 'analytics_cohorts']) {
        if ((await count(d1, `SELECT count(*) AS cnt FROM ${table} WHERE pseudonym = ?;`, pseudonym)) !== 0) fail(`${table} not purged`);
      }
      if ((await count(d1, 'SELECT count(*) AS cnt FROM analytics_consent WHERE user_id = ?;', a.id)) !== 0) fail('consent row not removed');
    });
  }
};
