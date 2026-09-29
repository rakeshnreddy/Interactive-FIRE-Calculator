import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv } from 'vite';

const DEFAULT_ENV_FILE = '.env.preview.local';

export function readPreviewAuthEnv({ cwd = process.cwd(), env = process.env, envFile = DEFAULT_ENV_FILE } = {}) {
  const viteEnv = loadEnv('production', cwd, 'VITE_');
  const fileValues = env.VITE_CLERK_PUBLISHABLE_KEY
    ? {}
    : readProtectedEnvFile(resolve(cwd, envFile));
  const effectiveClientEnv = { ...viteEnv, ...fileValues, ...pickViteEnv(env) };
  const publishableKey = effectiveClientEnv.VITE_CLERK_PUBLISHABLE_KEY?.trim();

  if (!publishableKey?.startsWith('pk_test_')) {
    throw new Error(
      'Preview build requires a Clerk development publishable key in VITE_CLERK_PUBLISHABLE_KEY or .env.preview.local.'
    );
  }

  const forbiddenNames = Object.keys(effectiveClientEnv).filter(
    (name) => name.startsWith('VITE_') && /(?:SECRET|PRIVATE|JWT_KEY)/i.test(name)
  );
  if (forbiddenNames.length > 0) {
    throw new Error(`Refusing to build with server credentials in client variables: ${forbiddenNames.join(', ')}`);
  }

  return { VITE_CLERK_PUBLISHABLE_KEY: publishableKey };
}

function pickViteEnv(env) {
  return Object.fromEntries(Object.entries(env).filter(([name]) => name.startsWith('VITE_')));
}

function readProtectedEnvFile(path) {
  let metadata;
  try {
    metadata = statSync(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return {};
    throw error;
  }

  if ((metadata.mode & 0o077) !== 0) {
    throw new Error(`${DEFAULT_ENV_FILE} must be private to the current user (chmod 600).`);
  }

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => {
        const separator = line.indexOf('=');
        if (separator < 1) throw new Error(`Invalid entry in ${DEFAULT_ENV_FILE}.`);
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
  );
}

function main() {
  let authEnv;
  try {
    authEnv = readPreviewAuthEnv();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const result = spawnSync('npm', ['run', 'build'], {
    env: { ...process.env, ...authEnv },
    stdio: 'inherit'
  });
  process.exit(result.status ?? 1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
