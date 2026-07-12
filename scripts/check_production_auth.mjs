#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const options = readOptions(process.argv.slice(2));
const checks = [];
const env = {
  ...readEnvFile(options.envFile),
  ...process.env
};

check(
  'Frontend key',
  env.VITE_CLERK_PUBLISHABLE_KEY?.startsWith('pk_live_') === true,
  'VITE_CLERK_PUBLISHABLE_KEY must be a Clerk production publishable key.'
);

const productionOrigin = readProductionOrigin(env.FINPATH_PRODUCTION_ORIGIN);
check(
  'Production origin',
  Boolean(productionOrigin),
  'FINPATH_PRODUCTION_ORIGIN must be an owned HTTPS domain, not localhost or pages.dev.'
);

const clerkStatus = readClerkStatus();
check(
  'Clerk production instance',
  clerkStatus?.complete === true && clerkStatus.productionInstanceId,
  clerkStatus?.nextAction ?? 'Run `clerk deploy` and complete domain, DNS, and OAuth requirements.'
);

if (productionOrigin && clerkStatus?.domain) {
  const clerkDomain = normalizeHostname(clerkStatus.domain);
  const appDomain = normalizeHostname(productionOrigin.hostname);
  check(
    'Clerk domain match',
    appDomain === clerkDomain || appDomain.endsWith(`.${clerkDomain}`) || clerkDomain.endsWith(`.${appDomain}`),
    'The configured Clerk production domain must match the FinPath production origin.'
  );
}

if (options.checkCloudflare) {
  const secretNames = readCloudflareSecretNames(options.projectName);
  check(
    'Cloudflare publishable key',
    secretNames.has('CLERK_PUBLISHABLE_KEY'),
    'Set CLERK_PUBLISHABLE_KEY as a Pages production secret.'
  );
  check(
    'Cloudflare server credential',
    secretNames.has('CLERK_SECRET_KEY') || secretNames.has('CLERK_JWT_KEY'),
    'Set CLERK_SECRET_KEY or CLERK_JWT_KEY as a Pages production secret.'
  );
  check(
    'Cloudflare authorized parties',
    secretNames.has('CLERK_AUTHORIZED_PARTIES'),
    'Set CLERK_AUTHORIZED_PARTIES to the exact production origin.'
  );
}

if (options.dist) {
  const bundle = readBundle(options.dist);
  const livePublishableKey = env.VITE_CLERK_PUBLISHABLE_KEY?.trim();
  const developmentPublishableKey = readEnvFile('.env.local').VITE_CLERK_PUBLISHABLE_KEY?.trim();
  check(
    'Production key in bundle',
    Boolean(livePublishableKey?.startsWith('pk_live_') && bundle.includes(livePublishableKey)),
    'The built client bundle does not contain a Clerk production publishable key.'
  );
  check(
    'No development key in bundle',
    !developmentPublishableKey || !bundle.includes(developmentPublishableKey),
    'The built client bundle still contains a Clerk development publishable key.'
  );
}

if (options.site) {
  await checkHostedSite(options.site);
}

for (const item of checks) {
  const marker = item.passed ? 'PASS' : 'FAIL';
  console.log(`${marker.padEnd(4)}  ${item.name}`);
  if (!item.passed) console.log(`      ${item.message}`);
}

const failures = checks.filter((item) => !item.passed);
console.log(`\n${checks.length - failures.length}/${checks.length} production-auth checks passed.`);

if (failures.length > 0) process.exitCode = 1;

function check(name, passed, message) {
  checks.push({ message, name, passed: Boolean(passed) });
}

function readOptions(args) {
  const result = {
    checkCloudflare: false,
    dist: '',
    envFile: '.env.production.local',
    projectName: 'interactive-fire-calculator',
    site: ''
  };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--check-cloudflare') result.checkCloudflare = true;
    else if (argument === '--dist') result.dist = args[++index] ?? '';
    else if (argument === '--env-file') result.envFile = args[++index] ?? '';
    else if (argument === '--project-name') result.projectName = args[++index] ?? '';
    else if (argument === '--site') result.site = args[++index] ?? '';
    else if (argument === '--help') {
      console.log('Usage: node scripts/check_production_auth.mjs [--env-file path] [--check-cloudflare] [--dist path] [--site url]');
      process.exit(0);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }

  return result;
}

function readEnvFile(path) {
  if (!path || !existsSync(path)) return {};

  return Object.fromEntries(
    readFileSync(path, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        const key = line.slice(0, separator).trim();
        const value = line.slice(separator + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        return [key, value];
      })
  );
}

function readProductionOrigin(value) {
  try {
    const url = new URL(value);
    const hostname = normalizeHostname(url.hostname);
    if (url.protocol !== 'https:' || url.pathname !== '/' || url.search || url.hash) return null;
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.pages.dev')) return null;
    return url;
  } catch {
    return null;
  }
}

function readClerkStatus() {
  try {
    const output = execFileSync('clerk', ['deploy', '--mode', 'agent'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    return JSON.parse(output);
  } catch (error) {
    const output = error?.stdout?.toString().trim();
    try {
      return output ? JSON.parse(output) : null;
    } catch {
      return null;
    }
  }
}

function readCloudflareSecretNames(projectName) {
  try {
    const output = execFileSync(
      'npx',
      ['wrangler', 'pages', 'secret', 'list', '--project-name', projectName],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return new Set(
      ['CLERK_PUBLISHABLE_KEY', 'CLERK_SECRET_KEY', 'CLERK_JWT_KEY', 'CLERK_AUTHORIZED_PARTIES']
        .filter((name) => output.includes(name))
    );
  } catch {
    return new Set();
  }
}

function readBundle(directory) {
  const root = resolve(directory);
  if (!existsSync(root)) return '';

  return walk(root)
    .filter((path) => /\.(html|js|mjs)$/.test(path))
    .map((path) => readFileSync(path, 'utf8'))
    .join('\n');
}

function walk(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

async function checkHostedSite(site) {
  let origin;
  try {
    const url = new URL(site);
    if (url.protocol !== 'https:') throw new Error('HTTPS is required.');
    origin = url.origin;
  } catch {
    check('Hosted site URL', false, '--site must be a valid HTTPS URL.');
    return;
  }

  const probes = [
    ['Hosted landing page', '/', 200],
    ['Hosted public calculator', '/calculators/fire', 200],
    ['Hosted signed-out gate', '/dashboard', 200],
    ['Hosted identity protection', '/api/me', 401]
  ];

  for (const [name, path, expectedStatus] of probes) {
    try {
      const response = await fetch(`${origin}${path}`, { redirect: 'manual' });
      check(name, response.status === expectedStatus, `${path} returned ${response.status}; expected ${expectedStatus}.`);
    } catch {
      check(name, false, `${path} could not be reached.`);
    }
  }
}

function normalizeHostname(value) {
  return value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
}
