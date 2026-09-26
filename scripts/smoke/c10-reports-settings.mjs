// C10 hosted scenario (B29 reports scope + B30 privacy lifecycle) for the shared runner.
// Tenant A records one account and one transaction, sees them in the report scope, exports, then
// deletes through the real Settings UI. Tenant B sees none of A's data.
let fail;

export default {
  name: 'c10-reports-settings',
  requiredStages: [
    'seed-report-sources',
    'report-scope-shows-sources',
    'tenant-b-report-isolated',
    'export-contains-only-own-data',
    'ui-delete-confirmed-by-server',
    'd1-empty-after-ui-delete'
  ],

  async run({ config, tenants, stage, d1, helpers }) {
    fail = (message) => {
      throw new helpers.SmokeError(message);
    };
    const [a, b] = tenants;
    const accountName = `Smoke checking ${Date.now().toString(36)}`;
    const today = new Date().toISOString().slice(0, 10);

    await stage('seed-report-sources', async () => {
      const account = await a.api('POST', '/api/accounts', { name: accountName, accountType: 'checking', currency: 'USD', institutionName: null, balanceCents: 250_000, balanceDate: today });
      const accountId = account.body?.account?.id;
      if (account.status !== 201 || !accountId) fail(`account create returned ${account.status}`);
      const tx = await a.api('POST', '/api/transactions', { accountId, amountCents: -4_200, category: 'Groceries', description: 'Smoke groceries', notes: null, transactionDate: today, transactionType: 'expense' });
      if (tx.status !== 201) fail(`transaction create returned ${tx.status}`);
      return { accounts: 1, transactions: 1 };
    });

    const readScope = async (page) => {
      await page.goto(`${config.url}/reports`, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('[data-testid="report-scope"]', { timeout: 30000 });
      await page.waitForFunction(() => !document.body.innerText.includes('Loading'), null, { timeout: 30000 }).catch(() => {});
      return page.evaluate(() => {
        const scope = document.querySelector('[data-testid="report-scope"]');
        const value = (label) => [...scope.querySelectorAll('dt')].find((dt) => dt.textContent === label)?.nextElementSibling?.textContent ?? null;
        return { accounts: value('Accounts'), transactions: value('Transactions'), text: scope.textContent };
      });
    };

    await stage('report-scope-shows-sources', async () => {
      await a.page.waitForTimeout(0);
      let scope;
      for (let attempt = 0; attempt < 10; attempt += 1) {
        scope = await readScope(a.page);
        if (scope.accounts?.startsWith('1') && scope.transactions?.startsWith('1')) break;
        await a.page.waitForTimeout(1000);
      }
      if (!scope.accounts?.startsWith('1') || !scope.transactions?.startsWith(`1 · ${today} to ${today}`)) {
        fail(`report scope did not reflect the seeded sources: ${JSON.stringify({ accounts: scope.accounts, transactions: scope.transactions })}`);
      }
      if (!/Download CSV/.test(await a.page.locator('[data-testid="report-scope"]').innerText())) fail('report export action missing');
      return { accounts: scope.accounts, transactions: scope.transactions };
    });

    await stage('tenant-b-report-isolated', async () => {
      const scope = await readScope(b.page);
      if (scope.accounts !== '0' || !scope.transactions?.startsWith('0') || scope.text.includes(accountName)) {
        fail(`tenant B report shows data: ${JSON.stringify({ accounts: scope.accounts, transactions: scope.transactions })}`);
      }
    });

    await stage('export-contains-only-own-data', async () => {
      const own = await a.api('GET', '/api/account-data/export');
      const other = await b.api('GET', '/api/account-data/export');
      if (own.status !== 200 || other.status !== 200) fail(`export returned ${own.status}/${other.status}`);
      if (!JSON.stringify(own.body).includes(accountName)) fail('tenant A export is missing its account');
      if (JSON.stringify(other.body).includes(accountName)) fail("tenant B export contains tenant A's account");
    });

    await stage('ui-delete-confirmed-by-server', async () => {
      await a.page.goto(`${config.url}/settings`, { waitUntil: 'domcontentloaded' });
      const input = a.page.locator('.privacy-delete-form input');
      await input.waitFor({ state: 'visible', timeout: 30000 });
      const deleteButton = a.page.locator('.privacy-delete-form button[type="submit"]');
      if (!(await deleteButton.isDisabled())) fail('delete is enabled before confirmation');
      await input.fill('DELETE MY FINPATH DATA');
      await deleteButton.click();
      const status = a.page.locator('.privacy-status-success');
      await status.waitFor({ state: 'visible', timeout: 30000 });
      const text = await status.innerText();
      if (!/Deleted \d+ saved records? from your FinPath data/.test(text) || !/sign-in account still exists/.test(text)) fail(`unexpected outcome copy: ${text}`);
      if (/\bD1\b|Clerk/.test(text)) fail('outcome copy leaks internal names');
      return { outcome: text.slice(0, 80) };
    });

    await stage('d1-empty-after-ui-delete', async () => {
      for (const table of ['financial_accounts', 'account_balances', 'transactions', 'audit_log']) {
        const rows = await d1(`SELECT count(*) AS cnt FROM ${table} WHERE user_id = ?;`, [a.id]);
        if (rows?.[0]?.cnt !== 0) fail(`${table} still has rows after UI deletion`);
      }
      const tombstone = await d1('SELECT deleted_at FROM users WHERE id = ?;', [a.id]);
      if (!tombstone[0]?.deleted_at) fail('tombstone not set after UI deletion');
    });
  }
};
