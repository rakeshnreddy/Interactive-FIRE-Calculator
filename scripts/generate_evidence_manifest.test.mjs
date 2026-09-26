import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import {
  computeFileMetadata,
  generateManifest,
  verifyManifestFromGitObjects,
  auditReviewLinks,
  resolvePreviewProvenance
} from './generate_evidence_manifest.mjs';

function setupTempGitRepo({ withModification = true } = {}) {
  const root = fs.mkdtempSync(path.join(tmpdir(), 'finpath-manifest-test-'));
  execFileSync('git', ['init'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test Agent'], { cwd: root });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });

  const fileRelPath = 'output/playwright/C01/test-image.png';
  const fullFilePath = path.join(root, fileRelPath);
  fs.mkdirSync(path.dirname(fullFilePath), { recursive: true });

  // Commit 1: initial addition
  const initialBytes = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02]);
  fs.writeFileSync(fullFilePath, initialBytes);
  execFileSync('git', ['add', fileRelPath], { cwd: root });
  execFileSync('git', ['commit', '-m', 'add test image'], { cwd: root });
  const addedCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

  // Commit 2: optional content modification
  const modifiedBytes = withModification
    ? Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x01, 0x02, 0x03, 0x04])
    : initialBytes;
  if (withModification) {
    fs.writeFileSync(fullFilePath, modifiedBytes);
    execFileSync('git', ['add', fileRelPath], { cwd: root });
    execFileSync('git', ['commit', '-m', 'update test image'], { cwd: root });
  }
  const contentCommit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

  return { root, fileRelPath, fullFilePath, addedCommit, contentCommit, initialBytes, modifiedBytes };
}

test('computeFileMetadata identifies both added_commit and content_commit', () => {
  const { root, fileRelPath, addedCommit, contentCommit, initialBytes, modifiedBytes } = setupTempGitRepo();
  try {
    const meta = computeFileMetadata(fileRelPath, root);
    assert.equal(meta.added_commit, addedCommit);
    assert.equal(meta.content_commit, contentCommit);
    assert.notEqual(meta.added_commit, meta.content_commit);
    assert.equal(meta.added_bytes, initialBytes.length);
    assert.equal(meta.bytes, modifiedBytes.length);
    assert.equal(meta.added_sha256, crypto.createHash('sha256').update(initialBytes).digest('hex'));
    assert.equal(meta.sha256, crypto.createHash('sha256').update(modifiedBytes).digest('hex'));
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verifyManifestFromGitObjects validates objects directly from Git history when files are absent on disk', () => {
  const { root, fileRelPath, fullFilePath } = setupTempGitRepo();
  try {
    const manifest = generateManifest(['output'], { repoRoot: root });
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    // Remove file on disk to prove verification reads Git objects, not disk
    fs.rmSync(fullFilePath);
    assert.equal(fs.existsSync(fullFilePath), false);

    const verifiedCount = verifyManifestFromGitObjects(manifestPath, root);
    assert.equal(verifiedCount, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verifyManifestFromGitObjects fails closed when content hash is altered', () => {
  const { root } = setupTempGitRepo();
  try {
    const manifest = generateManifest(['output'], { repoRoot: root });
    manifest[0].sha256 = '0000000000000000000000000000000000000000000000000000000000000000';
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    assert.throws(
      () => verifyManifestFromGitObjects(manifestPath, root),
      /Content object hash mismatch/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('verifyManifestFromGitObjects fails closed when added_commit is altered', () => {
  const { root } = setupTempGitRepo();
  try {
    const manifest = generateManifest(['output'], { repoRoot: root });
    manifest[0].added_commit = '0000000000000000000000000000000000000000';
    const manifestPath = path.join(root, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest));

    assert.throws(
      () => verifyManifestFromGitObjects(manifestPath, root),
      /First-add commit mismatch/
    );
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('resolvePreviewProvenance truthfully separates C01 local from C01 R4 hosted', () => {
  const localMeta = resolvePreviewProvenance('output/playwright/C01/B15/b15-home-light-1440-after.png');
  assert.equal(localMeta.preview, null);
  assert.match(localMeta.preview_note, /Historical C01 local Playwright run/);

  const hostedMeta = resolvePreviewProvenance('output/playwright/C01/B16-rework/hosted-home-mobile-390x844.png');
  assert.equal(hostedMeta.preview, 'https://f05b7516.interactive-fire-calculator.pages.dev');
  assert.match(hostedMeta.preview_note, /C01 R4 hosted preview run/);

  // Assert no C09 preview URL is ever assigned to C01 files
  assert.notEqual(localMeta.preview, 'https://18b043da.interactive-fire-calculator.pages.dev');
  assert.notEqual(hostedMeta.preview, 'https://18b043da.interactive-fire-calculator.pages.dev');
});


test('verification survives a later committed deletion of added or modified evidence', () => {
  for (const withModification of [false, true]) {
    const { root, fileRelPath } = setupTempGitRepo({ withModification });
    try {
      const manifest = generateManifest(['output'], { repoRoot: root });
      const manifestPath = path.join(root, 'manifest.json');
      fs.writeFileSync(manifestPath, JSON.stringify(manifest));
      execFileSync('git', ['rm', fileRelPath], { cwd: root, stdio: 'ignore' });
      execFileSync('git', ['commit', '-m', 'untrack test image'], { cwd: root, stdio: 'ignore' });
      assert.equal(verifyManifestFromGitObjects(manifestPath, root), 1);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  }
});
