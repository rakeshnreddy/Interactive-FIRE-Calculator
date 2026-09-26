import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';

// Exercise the real shell runner in an isolated repository, with no network,
// installed dependencies, credentials, or access to the caller's runtimes.
function runFixture({ missing = [], fail = '', installed = true, virtualenv = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'finpath-test-runner-'));
  try {
    mkdirSync(join(root, 'scripts'));
    mkdirSync(join(root, 'bin'));
    if (installed) mkdirSync(join(root, 'node_modules'));
    copyFileSync(new URL('./test_all.sh', import.meta.url), join(root, 'scripts/test_all.sh'));
    symlinkSync('/usr/bin/dirname', join(root, 'bin/dirname'));
    for (const command of ['node', 'npm']) {
      if (missing.includes(command)) continue;
      writeFileSync(join(root, 'bin', command), `#!/bin/bash
stage="${command} $*"
printf '%s\\n' "$stage" >> "$FINPATH_RUNNER_TRACE"
if [[ "$stage" == "$FINPATH_FAIL_STAGE" ]]; then exit 23; fi
`, { mode: 0o755 });
    }
    const trace = join(root, 'trace');
    writeFileSync(trace, '');
    const result = spawnSync('/bin/bash', ['scripts/test_all.sh'], {
      cwd: root,
      env: { PATH: join(root, 'bin'), FINPATH_RUNNER_TRACE: trace, FINPATH_FAIL_STAGE: fail },
      encoding: 'utf8',
      timeout: 5000
    });
    assert.ifError(result.error);
    return { ...result, stages: readFileSync(trace, 'utf8').trim().split('\n').filter(Boolean) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

const stages = [
  'node --test scripts/test_all.test.mjs',
  'node --test scripts/build_preview_auth.test.mjs',
  'node --test scripts/hosted_smoke.test.mjs',
  'npm run typecheck',
  'npm test',
  'npm run build'
];

for (const runtime of ['node', 'npm']) {
  test(`fails before running any stage when ${runtime} is missing`, () => {
    const result = runFixture({ missing: [runtime] });
    assert.notEqual(result.status, 0);
    assert.deepEqual(result.stages, []);
    assert.match(result.stderr, /required|not found/i);
  });
}

test('runs every verification stage in order without Python installed', () => {
  const result = runFixture();
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.stages, stages);
});

for (const [index, stage] of stages.entries()) {
  test(`stops and preserves failure status from ${stage}`, () => {
    const result = runFixture({ fail: stage });
    assert.equal(result.status, 23, result.stderr);
    assert.deepEqual(result.stages, stages.slice(0, index + 1));
  });
}

test('installs missing dependencies from the lockfile', () => {
  const result = runFixture({ installed: false });
  assert.equal(result.status, 0, result.stderr);
  const dependencyBoundary = stages.indexOf('npm run typecheck');
  assert.deepEqual(result.stages, [
    ...stages.slice(0, dependencyBoundary),
    'npm ci',
    ...stages.slice(dependencyBoundary)
  ]);
});

test('does not run frontend verification after a failed install', () => {
  const result = runFixture({ installed: false, fail: 'npm ci' });
  assert.equal(result.status, 23, result.stderr);
  const dependencyBoundary = stages.indexOf('npm run typecheck');
  assert.deepEqual(result.stages, [...stages.slice(0, dependencyBoundary), 'npm ci']);
});
