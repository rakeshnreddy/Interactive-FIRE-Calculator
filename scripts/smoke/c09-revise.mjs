// C09 residual (B42): monthly review "Revise" journey on a real saved plan.
// Version 2 -> Revise in the UI -> explicit next step -> change annual expense 50,000 -> 45,000 in the
// calculator -> save Version 3 -> hard reload -> D1 agrees with the UI -> Versions 1 and 2 unchanged
// -> tenant B denied -> dashboard review card transitions from due to cleared.
// Helpers arrive through the run() context so scenarios never import the runner (no import cycle).
let fail;
let waitForWorkspace;

const versionRows = async (d1, planId, versionNumber) => {
  const version = await d1('SELECT * FROM plan_versions WHERE plan_id = ? AND version_number = ?;', [planId, versionNumber]);
  if (version.length !== 1) fail(`expected one plan_versions row for version ${versionNumber}, got ${version.length}`);
  const inputs = await d1('SELECT * FROM fire_plan_inputs WHERE plan_version_id = ?;', [version[0].id]);
  const results = await d1('SELECT * FROM fire_plan_results WHERE plan_version_id = ?;', [version[0].id]);
  if (inputs.length !== 1 || results.length !== 1) fail(`version ${versionNumber} is missing inputs or results`);
  return JSON.stringify({ version, inputs, results });
};

const visibleCount = (page, selector) => page.locator(selector).evaluateAll((els) => els.filter((el) => el.getClientRects().length > 0).length);

async function exactlyOne(page, selector, label) {
  const count = await visibleCount(page, selector);
  if (count !== 1) fail(`${label}: expected exactly one visible match, found ${count}`);
  return page.locator(selector).first();
}

async function dashboardReviewState(page, baseUrl, planName) {
  const response = page.waitForResponse((r) => r.url().includes('/api/plans/due-reviews') && r.request().method() === 'GET', { timeout: 30000 });
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' });
  const res = await response;
  if (res.status() !== 200) fail(`due-reviews returned ${res.status()}`);
  const item = ((await res.json())?.dueReviews || []).find((r) => r.planName === planName);
  await page.waitForFunction(() => !document.body.innerText.includes('Checking review cadence'), null, { timeout: 30000 });
  await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
  if (await visibleCount(page, '.dashboard-reviews-rollup .error-banner')) fail('dashboard review status is in an error state');
  const cards = await page.locator('.dashboard-review-card').filter({ hasText: planName }).count();
  return { apiStatus: item?.status ?? null, cards };
}

async function navigateByClick(page, locator, urlPattern, label) {
  await locator.click();
  try {
    await page.waitForURL(urlPattern, { timeout: 20000, waitUntil: 'commit' });
  } catch {
    const seen = await page.evaluate(() => ({
      path: location.pathname,
      dialog: (document.querySelector('[role="dialog"], [role="alertdialog"]')?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 200)
    }));
    fail(`${label} did not navigate: ${JSON.stringify(seen)}`);
  }
}

export default {
  name: 'c09-revise',
  requiredStages: [
    'seed-plan-versions',
    'dashboard-shows-due-review',
    'version-2-workspace-ready',
    'revise-selected-and-recorded',
    'calculator-edit-annual-expense',
    'version-3-saved',
    'd1-version-3-and-immutability',
    'version-3-reload-matches-d1',
    'tenant-b-denied',
    'dashboard-review-cleared',
    'review-panel-layout'
  ],

  async run({ config, tenants, stage, d1, helpers }) {
    ({ waitForWorkspace } = helpers);
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a, b] = tenants;
    const { calculateFirePlan } = await import('../../src/lib/fire.ts');
    const planName = `Smoke revise ${Date.now().toString(36)}`;
    const snapshot = (annualExpense, initialPortfolio, retirementAge) => ({
      calculatorMode: 'fire-number',
      timeline: { currentAge: 35, retirementAge, planEndAge: 90 },
      scenarios: [],
      plan: { annualExpense, initialPortfolio, withdrawalTiming: 'start', desiredFinalValue: 0, ratePeriods: [{ duration: 35, r: 0.07, i: 0.025 }], oneOffEvents: [] }
    });

    let planId;
    await stage('seed-plan-versions', async () => {
      const goal = await a.api('POST', '/api/goals', { name: 'Smoke retirement', goalType: 'retirement', targetAmountCents: 150000000, currentAmountCents: 50000000, targetDate: '2045-06-01' });
      const goalId = goal.body?.goal?.id;
      if (goal.status !== 201 || !goalId) fail(`goal create returned ${goal.status}`);
      const v1 = snapshot(40000, 500000, 55);
      const created = await a.api('POST', '/api/plans', { goalId, name: planName, label: 'Baseline', notes: 'smoke v1', snapshot: v1, result: calculateFirePlan(v1.plan) });
      const id = created.body?.plan?.id;
      if (created.status !== 201 || created.body?.plan?.versionNumber !== 1) fail(`plan create returned ${created.status}`);
      const v2 = snapshot(50000, 600000, 52);
      const revised = await a.api('PUT', `/api/plans/${id}`, { name: planName, label: 'Second', notes: 'smoke v2', snapshot: v2, result: calculateFirePlan(v2.plan) });
      if (revised.status !== 200 || revised.body?.plan?.versionNumber !== 2) fail(`version 2 save returned ${revised.status}`);
      // Scoped synthetic date setup: make this synthetic plan eligible for its first review (>= 7 days).
      for (const [sql, params] of [
        ["UPDATE plans SET created_at = datetime('now','-35 days'), updated_at = datetime('now','-35 days') WHERE id = ? AND user_id = ?;", [id, a.id]],
        ["UPDATE plan_versions SET created_at = datetime('now','-35 days') WHERE plan_id = ? AND user_id = ?;", [id, a.id]]
      ]) await d1(sql, params);
      planId = id;
      return { versions: 2 };
    });
    const detail = { planId: '[synthetic]' };

    await stage('dashboard-shows-due-review', async () => {
      const state = await dashboardReviewState(a.page, config.url, planName);
      if (!['due', 'overdue'].includes(state.apiStatus) || state.cards !== 1) fail(`aged plan review state ${JSON.stringify(state)}; expected due/overdue with one card`);
      return { ...detail, ...state };
    });

    const expectedV2 = { planId, version: 2 };
    await stage('version-2-workspace-ready', async () => {
      await a.page.goto(`${config.url}/plans?planId=${planId}&version=2`, { waitUntil: 'domcontentloaded' });
      await waitForWorkspace(a.snapshot, expectedV2);
    });

    const before = { v1: await versionRows(d1, planId, 1), v2: await versionRows(d1, planId, 2) };

    await stage('revise-selected-and-recorded', async () => {
      const panel = '.planning-review-panel';
      let reachedByKeyboard = false;
      for (let i = 0; i < 120 && !reachedByKeyboard; i += 1) {
        await a.page.keyboard.press('Tab');
        reachedByKeyboard = await a.page.evaluate(() => Boolean(document.activeElement?.closest('.planning-review-panel .review-decision-group')));
      }
      if (!reachedByKeyboard) fail('keyboard Tab never reached the review decision controls');
      const card = await exactlyOne(a.page, `${panel} .review-choice-card:has(input[value="revise"])`, 'revise choice');
      await card.click();
      if (!(await a.page.locator(`${panel} input[value="revise"]`).isChecked())) fail('revise radio is not checked after click');
      const submit = await exactlyOne(a.page, `${panel} .review-action-container .primary-button`, 'record review button');
      await submit.click();
      await a.page.waitForSelector('[data-testid="plan-revision-prompt"]', { state: 'visible', timeout: 20000 });
      const text = (await a.page.locator('[data-testid="plan-revision-prompt"]').innerText()).toLowerCase();
      if (!text.includes('next step') || !text.includes('version 3')) fail('revision prompt does not state the next step toward Version 3');
      const reviews = await d1('SELECT decision FROM plan_reviews WHERE plan_id = ? AND user_id = ?;', [planId, a.id]);
      if (reviews.length !== 1 || reviews[0].decision !== 'revise') fail(`expected one persisted revise review, found ${JSON.stringify(reviews)}`);
    });

    await stage('calculator-edit-annual-expense', async () => {
      const open = await exactlyOne(a.page, '[data-testid="plan-revision-prompt"] button:has-text("Open calculator")', 'open calculator');
      await navigateByClick(a.page, open, '**/calculators/fire', 'Open calculator from revision prompt');
      await exactlyOne(a.page, '[data-testid="calculator-plan-context"]', 'calculator plan context');
      const input = await exactlyOne(a.page, 'input#fire-annual-expense', 'annual expense input');
      if ((await input.inputValue()) !== '50000') fail(`calculator did not load Version 2 expense (got ${await input.inputValue()})`);
      await input.fill('45000');
      await input.blur();
      if ((await input.inputValue()) !== '45000') fail('annual expense edit did not stick');
    });

    await stage('version-3-saved', async () => {
      const back = await exactlyOne(a.page, '[data-testid="calculator-plan-context"] button:has-text("Back to Planning Workspace")', 'back to workspace');
      await navigateByClick(a.page, back, '**/plans**', 'Back to Planning Workspace');
      const notes = await exactlyOne(a.page, '.planning-save-panel .planning-notes-field input', 'version notes');
      await notes.fill('Smoke v3: annual expense 45,000');
      const save = await exactlyOne(a.page, '.planning-save-panel button:has-text("Save new version")', 'save new version');
      await save.click();
      await a.page.waitForFunction(() => {
        const text = `${document.querySelector('.storage-status')?.textContent || ''} ${document.querySelector('.planning-overview')?.textContent || ''}`;
        return text.includes('Version 3 saved') || text.includes('Version 3 loaded');
      }, null, { timeout: 20000 });
    });

    let v3Expense;
    await stage('d1-version-3-and-immutability', async () => {
      const v3 = JSON.parse(await versionRows(d1, planId, 3));
      const v2 = JSON.parse(before.v2);
      v3Expense = JSON.parse(v3.inputs[0].input_json)?.plan?.annualExpense;
      if (v3Expense !== 45000) fail(`Version 3 annualExpense is ${v3Expense}`);
      if (v3.results[0].result_json === v2.results[0].result_json) fail('Version 3 result did not change with the new expense');
      if ((await versionRows(d1, planId, 1)) !== before.v1) fail('Version 1 rows changed');
      if ((await versionRows(d1, planId, 2)) !== before.v2) fail('Version 2 rows changed');
      return { v3AnnualExpense: v3Expense };
    });

    await stage('version-3-reload-matches-d1', async () => {
      await a.page.goto(`${config.url}/plans?planId=${planId}&version=3`, { waitUntil: 'domcontentloaded' });
      await a.page.reload({ waitUntil: 'domcontentloaded' });
      await waitForWorkspace(a.snapshot, { planId, version: 3 });
      const open = await exactlyOne(a.page, '.planning-save-panel .panel-heading button:has-text("Open calculator")', 'open calculator from plan');
      await navigateByClick(a.page, open, '**/calculators/fire', 'Open calculator from plan');
      const value = await (await exactlyOne(a.page, 'input#fire-annual-expense', 'annual expense input')).inputValue();
      if (value !== String(v3Expense)) fail(`reloaded calculator shows ${value}, D1 has ${v3Expense}`);
    });

    await stage('tenant-b-denied', async () => {
      const read = await b.api('GET', `/api/plans/${planId}`);
      const review = await b.api('POST', `/api/plans/${planId}/reviews`, { planVersionNumber: 3, evidenceDate: new Date().toISOString().slice(0, 10), decision: 'keep', status: 'completed', idempotencyKey: `smoke-b-${Date.now()}` });
      if (read.status !== 404 || review.status !== 404) fail(`tenant B got ${read.status}/${review.status}, expected 404/404`);
    });

    await stage('dashboard-review-cleared', async () => {
      const state = await dashboardReviewState(a.page, config.url, planName);
      if (['due', 'overdue'].includes(state.apiStatus) || state.cards !== 0) fail(`after the revise review: ${JSON.stringify(state)}; expected no due card`);
      return state;
    });

    await stage('review-panel-layout', async () => {
      const observations = [];
      for (const [width, height] of [[1280, 800], [375, 812]]) {
        for (const scheme of ['light', 'dark']) {
          await a.page.setViewportSize({ width, height });
          await a.page.emulateMedia({ colorScheme: scheme });
          await a.page.goto(`${config.url}/plans?planId=${planId}&version=3`, { waitUntil: 'domcontentloaded' });
          await waitForWorkspace(a.snapshot, { planId, version: 3 });
          const m = await a.page.evaluate(() => {
            const panel = document.querySelector('.planning-review-panel');
            panel.scrollIntoView({ block: 'start' });
            const top = panel.getBoundingClientRect().top;
            const bar = document.querySelector('.topbar')?.getBoundingClientRect().bottom ?? 0;
            return { overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, clearsTopbar: top >= bar - 1 };
          });
          if (m.overflow || !m.clearsTopbar) fail(`layout at ${width}px ${scheme}: ${JSON.stringify(m)}`);
          observations.push(`${width}/${scheme}`);
        }
      }
      await a.page.setViewportSize({ width: 1280, height: 800 });
      return { observations };
    });
  }
};
