// C11 hosted scenario (B41): shared API boundary on the deployed Functions runtime.
let fail;

const rawPost = (page, path, body) => page.evaluate(async ({ path, body }) => {
  const token = await window.Clerk.session.getToken();
  const res = await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}, { path, body });

export default {
  name: 'c11-api-boundary',
  requiredStages: ['public-and-signed-out', 'oversized-body-rejected', 'malformed-json-rejected', 'tenant-denial-has-code'],

  async run({ config, tenants, stage, d1, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a, b] = tenants;

    await stage('public-and-signed-out', async () => {
      const health = await fetch(`${config.url}/api/health`);
      const me = await fetch(`${config.url}/api/me`);
      const meBody = await me.json().catch(() => null);
      if (health.status !== 200) fail(`health returned ${health.status}`);
      if (me.status !== 401 || typeof meBody?.code !== 'string' || typeof meBody?.error !== 'string') fail(`signed-out /api/me returned ${me.status} ${JSON.stringify(meBody)}`);
      return { health: health.status, me: me.status, code: meBody.code };
    });

    await stage('oversized-body-rejected', async () => {
      const huge = JSON.stringify({ name: 'x'.repeat(300 * 1024), goalType: 'retirement', targetAmountCents: 1, currentAmountCents: 0 });
      a.touchedApp = true;
      const res = await rawPost(a.page, '/api/goals', huge);
      if (res.status !== 413 || res.body?.code !== 'PAYLOAD_TOO_LARGE') fail(`oversized body returned ${res.status} ${JSON.stringify(res.body)}`);
      const rows = await d1('SELECT count(*) AS cnt FROM goals WHERE user_id = ?;', [a.id]);
      if (rows?.[0]?.cnt !== 0) fail('oversized request still wrote a goal');
      return { status: res.status };
    });

    await stage('malformed-json-rejected', async () => {
      const res = await rawPost(a.page, '/api/goals', '{"name": ');
      if (res.status !== 400 || typeof res.body?.code !== 'string') fail(`malformed JSON returned ${res.status} ${JSON.stringify(res.body)}`);
      return { status: res.status, code: res.body.code };
    });

    await stage('tenant-denial-has-code', async () => {
      const goal = await a.api('POST', '/api/goals', { name: 'Smoke boundary goal', goalType: 'retirement', targetAmountCents: 100_000, currentAmountCents: 0, targetDate: '2045-01-01' });
      const goalId = goal.body?.goal?.id;
      if (goal.status !== 201 || !goalId) fail(`goal create returned ${goal.status}`);
      const denied = await b.api('GET', `/api/goals/${goalId}`);
      if (denied.status !== 404 || typeof denied.body?.code !== 'string') fail(`tenant B got ${denied.status} ${JSON.stringify(denied.body)}`);
      return { status: denied.status, code: denied.body.code };
    });
  }
};
