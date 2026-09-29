import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { readPreviewAuthEnv } from './build_preview_auth.mjs';

const developmentKey = `pk_test_${'a'.repeat(32)}`;

test('requires a development publishable key', () => {
  assert.throws(
    () => readPreviewAuthEnv({ env: {}, envFile: join(tmpdir(), 'missing-finpath-preview-env') }),
    /requires a Clerk development publishable key/
  );
  assert.throws(
    () => readPreviewAuthEnv({ env: { VITE_CLERK_PUBLISHABLE_KEY: `pk_live_${'a'.repeat(32)}` } }),
    /requires a Clerk development publishable key/
  );
});

test('reads the client-visible key from a private ignored env file', () => {
  const directory = mkdtempSync(join(tmpdir(), 'finpath-preview-auth-'));
  const envFile = join(directory, '.env.preview.local');
  writeFileSync(envFile, `VITE_CLERK_PUBLISHABLE_KEY=${developmentKey}\n`, { mode: 0o600 });

  assert.deepEqual(readPreviewAuthEnv({ env: {}, envFile }), {
    VITE_CLERK_PUBLISHABLE_KEY: developmentKey
  });
});

test('rejects a key file readable by other users', () => {
  const directory = mkdtempSync(join(tmpdir(), 'finpath-preview-auth-'));
  const envFile = join(directory, '.env.preview.local');
  writeFileSync(envFile, `VITE_CLERK_PUBLISHABLE_KEY=${developmentKey}\n`);
  chmodSync(envFile, 0o644);

  assert.throws(() => readPreviewAuthEnv({ env: {}, envFile }), /must be private/);
});

test('rejects server credentials exposed through Vite client variables', () => {
  assert.throws(
    () =>
      readPreviewAuthEnv({
        env: {
          VITE_CLERK_PUBLISHABLE_KEY: developmentKey,
          VITE_CLERK_SECRET_KEY: `sk_test_${'b'.repeat(32)}`
        }
      }),
    /Refusing to build with server credentials in client variables: VITE_CLERK_SECRET_KEY/
  );
});

test('rejects server credentials loaded by Vite from production env files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'finpath-preview-auth-'));
  writeFileSync(
    join(directory, '.env.production.local'),
    `VITE_CLERK_PUBLISHABLE_KEY=${developmentKey}\nVITE_PROVIDER_SECRET=do-not-bundle\n`
  );

  assert.throws(
    () => readPreviewAuthEnv({ cwd: directory, env: {} }),
    /Refusing to build with server credentials in client variables: VITE_PROVIDER_SECRET/
  );
});
