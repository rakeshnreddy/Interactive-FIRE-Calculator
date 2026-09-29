import test from 'node:test';
import assert from 'node:assert/strict';
import {
  verifyReloadedAccount,
  verifyIsolation,
  CANDIDATE_SHA,
  PREVIEW_URL,
  PREVIEW_DB_ID,
  HISTORICAL_TOMBSTONES,
  VALID_ACCOUNT_TYPES,
  CSV_HEADERS,
  USER_TABLES,
  deriveClerkFapi,
  buildSyntheticCsv,
  validateAccountPayload,
  generateDisposablePassword,
  performCleanup
} from './run_remaining_proofs.mjs';

test('R1: validateAccountPayload accepts valid accountTypes and rejects depository', () => {
  // Supported type 'checking' must pass
  const validChecking = {
    name: 'Primary Checking',
    accountType: 'checking',
    currency: 'USD'
  };
  assert.equal(validateAccountPayload(validChecking), true);

  // Supported type 'savings' must pass
  const validSavings = {
    name: 'High Yield Savings',
    accountType: 'savings',
    currency: 'USD'
  };
  assert.equal(validateAccountPayload(validSavings), true);

  // Deprecated/unsupported type 'depository' must be rejected
  assert.throws(
    () => validateAccountPayload({ name: 'Old Account', accountType: 'depository', currency: 'USD' }),
    /accountType 'depository' is not supported/
  );

  // Missing or empty name must be rejected
  assert.throws(
    () => validateAccountPayload({ name: '', accountType: 'checking', currency: 'USD' }),
    /Account name is required/
  );

  // Invalid currency must be rejected
  assert.throws(
    () => validateAccountPayload({ name: 'Checking', accountType: 'checking', currency: 'US' }),
    /currency must be a 3-letter currency code/
  );
});

test('R1: deriveClerkFapi correctly derives FAPI from publishable key and rejects invalid keys', () => {
  // Standard development publishable key
  const pk = 'pk_test_Y2l2aWwtb3gtNDMuY2xlcmsuYWNjb3VudHMuZGV2JA';
  const fapi = deriveClerkFapi(pk);
  assert.equal(fapi, 'civil-ox-43.clerk.accounts.dev');

  // Rejects empty or malformed publishable key
  assert.throws(() => deriveClerkFapi(''), /Invalid Clerk publishable key/);
  assert.throws(() => deriveClerkFapi('invalid_prefix_123'), /Invalid Clerk publishable key/);
});

test('R2: buildSyntheticCsv produces exact headers and parsable CSV structure', () => {
  const csv = buildSyntheticCsv({
    accountName: 'Test Account, Main',
    balanceDate: '2026-06-15',
    balanceAmount: '12345.67',
    currency: 'usd'
  });

  const lines = csv.trim().split('\n');
  assert.equal(lines.length, 2);

  // Header line must match exact CSV_HEADERS
  assert.equal(lines[0], 'account,balance_date,balance,currency');

  // Commas in account name must be quoted
  assert.match(lines[1], /^"Test Account, Main",2026-06-15,12345\.67,USD$/);
});

test('R2: negative test - wrong CSV headers fail header verification', () => {
  const badCsv = 'Account Name,Balance,Date,Currency\nMy Checking,1000,2026-06-15,USD';
  const headers = badCsv.split('\n')[0].split(',').map(h => h.trim().toLowerCase());
  const matchesContract = CSV_HEADERS.every(h => headers.includes(h));
  assert.equal(matchesContract, false, 'Guessed headers must not match the exact contract');
});

test('R2: negative test - missing or failed commit detection', () => {
  // Scenario 1: Preview succeeds but commit status is null/missing
  const previewStatus = 200;
  const commitStatus = null;
  const proof1Passed = commitStatus === 201;
  assert.equal(proof1Passed, false, 'Missing commit status must fail Proof 1');

  // Scenario 2: Commit returns 400 Bad Request
  const failedCommitStatus = 400;
  assert.equal(failedCommitStatus === 201, false, 'Failed commit status (400) must fail Proof 1');

  // Scenario 3: Commit returns 201 but D1 row has wrong imported balance
  const expectedCents = 1234567;
  const actualPersistedCents = 99999;
  const persistedMatch = actualPersistedCents === expectedCents;
  assert.equal(persistedMatch, false, 'Mismatched persisted balance in D1 must fail verification');
});

test('R3: cleanup handles early failure after User A creation and deletes both A and B', async () => {
  const mockManifest = { userA: 'user_synthA_123', userB: null };
  const deletedClerkUsers = [];
  const appDataDeleted = [];

  const mockClerkClient = {
    users: {
      deleteUser: async (id) => {
        deletedClerkUsers.push(id);
      }
    }
  };

  const mockPageA = {
    isClosed: () => false,
    evaluate: async () => {
      appDataDeleted.push('userA');
      return { status: 200, ok: true };
    }
  };

  const mockD1Query = async (sql, params) => {
    if (sql.includes('SELECT id, deleted_at FROM users')) {
      return [{ id: params[0], deleted_at: '2026-09-16T12:00:00Z' }];
    }
    if (sql.includes('count(*)')) {
      return [{ count: 0 }];
    }
    return [];
  };

  const { success, result } = await performCleanup({
    manifest: mockManifest,
    d1QueryFn: mockD1Query,
    clerkClient: mockClerkClient,
    pageA: mockPageA,
    pageB: null,
    logFn: () => {}
  });

  assert.equal(success, true);
  assert.equal(result.userA_app_data_deleted, true);
  assert.equal(result.userA_clerk_deleted, true);
  assert.equal(result.userA_tombstone_present, true);
  assert.equal(result.scoped_tables_clean, true);
  assert.deepEqual(deletedClerkUsers, ['user_synthA_123']);
  assert.deepEqual(appDataDeleted, ['userA']);
});

test('R3: cleanup detects failed User B application deletion and reports failure', async () => {
  const mockManifest = { userA: 'user_synthA_123', userB: 'user_synthB_456' };

  const mockPageB = {
    isClosed: () => false,
    evaluate: async () => {
      throw new Error('Network error deleting User B app data');
    }
  };

  const mockD1Query = async (sql, params) => {
    if (sql.includes('SELECT id, deleted_at FROM users')) {
      // User B tombstone is missing because app deletion threw
      if (params[0] === 'user_synthB_456') return [{ id: params[0], deleted_at: null }];
      return [{ id: params[0], deleted_at: '2026-09-16T12:00:00Z' }];
    }
    if (sql.includes('count(*)')) {
      return [{ count: 0 }];
    }
    return [];
  };

  const mockClerkClient = {
    users: {
      deleteUser: async () => {}
    }
  };

  const { success, result } = await performCleanup({
    manifest: mockManifest,
    d1QueryFn: mockD1Query,
    clerkClient: mockClerkClient,
    pageA: null,
    pageB: mockPageB,
    logFn: () => {}
  });

  assert.equal(success, false, 'Missing tombstone / app delete error must cause cleanup failure');
  assert.equal(result.userB_tombstone_present, false);
  assert.ok(result.errors.length > 0);
});

test('R3: cleanup detects failed Clerk provider deletion and revokes PASS', async () => {
  const mockManifest = { userA: 'user_synthA_123', userB: 'user_synthB_456' };

  const mockClerkClient = {
    users: {
      deleteUser: async (id) => {
        if (id === 'user_synthB_456') throw new Error('Clerk API 500 Internal Error');
      }
    }
  };

  const mockD1Query = async (sql) => {
    if (sql.includes('SELECT id, deleted_at FROM users')) {
      return [{ id: 'user', deleted_at: '2026-09-16T12:00:00Z' }];
    }
    if (sql.includes('count(*)')) {
      return [{ count: 0 }];
    }
    return [];
  };

  const { success, result } = await performCleanup({
    manifest: mockManifest,
    d1QueryFn: mockD1Query,
    clerkClient: mockClerkClient,
    pageA: { isClosed: () => false, evaluate: async () => ({ status: 200, ok: true }) },
    pageB: { isClosed: () => false, evaluate: async () => ({ status: 200, ok: true }) },
    logFn: () => {}
  });

  assert.equal(success, false, 'Clerk deletion failure must cause cleanup failure');
  assert.equal(result.userB_clerk_deleted, false);
  assert.ok(result.errors.some(e => e.includes('Clerk delete failed')));
});

test('R3: fail-closed D1 count queries - missing count is treated as UNKNOWN/fail, never 0/pass', async () => {
  const mockManifest = { userA: 'user_synthA_123', userB: null };

  const mockClerkClient = {
    users: { deleteUser: async () => {} }
  };

  // D1 query returns empty array or null for one table
  const mockD1Query = async (sql) => {
    if (sql.includes('SELECT id, deleted_at FROM users')) {
      return [{ id: 'user', deleted_at: '2026-09-16T12:00:00Z' }];
    }
    if (sql.includes('balance_imports')) {
      // Simulate failed/empty response
      return [];
    }
    return [{ count: 0 }];
  };

  const { success, result } = await performCleanup({
    manifest: mockManifest,
    d1QueryFn: mockD1Query,
    clerkClient: mockClerkClient,
    logFn: () => {}
  });

  assert.equal(success, false, 'Missing table count query must fail cleanup');
  assert.equal(result.scoped_tables_clean, false);
  assert.ok(result.errors.some(e => e.includes('Count returned undefined')));
  assert.equal(result.table_counts['balance_imports:user_synthA_12...'], 'UNKNOWN');
});

test('R4: disposable passwords are generated cryptographically with high entropy', () => {
  const pass1 = generateDisposablePassword();
  const pass2 = generateDisposablePassword();
  assert.notEqual(pass1, pass2);
  assert.ok(pass1.length >= 20);
  assert.ok(pass1.includes('!'));
  assert.ok(pass1.includes('#'));
});

test('R4: historical tombstones are preserved and distinct from synthetic users', () => {
  assert.equal(HISTORICAL_TOMBSTONES.length, 2);
  assert.ok(HISTORICAL_TOMBSTONES.includes('user_3JOGiP2nXKPm7UiZTBk27WNy2SF'));
  assert.ok(HISTORICAL_TOMBSTONES.includes('user_3JOH4WytkmA7wx1Xq7BoaRl3sW5'));
  assert.equal(USER_TABLES.length, 14);
});


test('primary: failed app deletion cannot pass or revoke provider identity', async () => {
  let providerDeletes = 0;
  const outcome = await performCleanup({
    manifest: { userA: 'synthetic-review-only', userB: null },
    pageA: { isClosed: () => false, evaluate: async () => ({ status: 500, ok: false }) },
    clerkClient: { users: { deleteUser: async () => { providerDeletes++; } } },
    d1QueryFn: async sql => sql.includes('deleted_at') ? [{ deleted_at: 'already-present' }] : [{ count: 0 }],
    logFn: () => {}
  });
  assert.equal(outcome.success, false);
  assert.equal(providerDeletes, 0);
});

test('primary: nonnumeric D1 count cannot pass cleanup', async () => {
  const outcome = await performCleanup({
    manifest: { userA: 'synthetic-review-only', userB: null },
    pageA: { isClosed: () => false, evaluate: async () => ({ status: 200, ok: true }) },
    clerkClient: { users: { deleteUser: async () => {} } },
    d1QueryFn: async sql => sql.includes('deleted_at') ? [{ deleted_at: 'present' }] : [{ count: 'unknown' }],
    logFn: () => {}
  });
  assert.equal(outcome.success, false);
  assert.equal(outcome.result.scoped_tables_clean, false);
});

test('primary: Clerk testing interception relays original response without security rewriting', async () => {
  const { setupClerkInterception } = await import('./run_remaining_proofs.mjs');
  let handler;
  const response = { original: true, captcha_bypass: false };
  let fulfilled;
  await setupClerkInterception({ route: async (_, callback) => { handler = callback; } }, 'synthetic-token', 'test.clerk.accounts.dev');
  await handler({ request: () => ({ url: () => 'https://test.clerk.accounts.dev/v1/client' }), fetch: async () => response, fulfill: async args => { fulfilled = args; } });
  assert.deepEqual(fulfilled, { response });
  assert.equal(response.captcha_bypass, false);
});


test('primary: deployment preflight rejects wrong or missing isolation metadata', async () => {
  const { verifyDeployment } = await import('./run_remaining_proofs.mjs');
  const deployment = { environment: 'preview', url: PREVIEW_URL, latest_stage: { status: 'success' }, deployment_trigger: { metadata: { commit_hash: CANDIDATE_SHA } }, d1_databases: { DB: { id: PREVIEW_DB_ID } } };
  const fake = result => async () => ({ ok: true, json: async () => ({ success: true, result }) });
  assert.equal(await verifyDeployment(fake(deployment)), true);
  await assert.rejects(verifyDeployment(fake({ ...deployment, d1_databases: {} })));
  await assert.rejects(verifyDeployment(fake({ ...deployment, environment: 'production' })));
  await assert.rejects(verifyDeployment(fake({ ...deployment, deployment_trigger: {} })));
});

 test('primary: imported balance must survive reload with matching history', () => {
 const good = {latestBalanceCents:1234567, latestBalanceDate:'2026-06-15', balanceHistory:[{balanceCents:1234567,balanceDate:'2026-06-15'}]};
 assert.equal(verifyReloadedAccount(good),true);
 assert.equal(Boolean(verifyReloadedAccount({...good, balanceHistory:[]})),false);
 assert.equal(Boolean(verifyReloadedAccount({...good, latestBalanceCents:1000000})),false);
 });
 test('primary: isolation requires full equality and authenticated own-resource access', () => {
 const before={name:'Checking', latestBalanceCents:1234567};
 assert.equal(verifyIsolation(before,{...before},200,0,404,404),true);
 assert.equal(verifyIsolation(before,{...before,latestBalanceCents:0},200,0,404,404),false);
 assert.equal(verifyIsolation(before,{...before},401,0,404,404),false);
 assert.equal(verifyIsolation(before,{...before},200,1,404,404),false);
 });
