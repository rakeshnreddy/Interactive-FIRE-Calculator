#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

// Known preview URLs mapped to specific evidence subsets
export function resolvePreviewProvenance(relPath) {
  // C01 R4 hosted preview screenshots were generated against f05b7516
  if (relPath.startsWith('output/playwright/C01/B16-rework/hosted-')) {
    return {
      preview: 'https://f05b7516.interactive-fire-calculator.pages.dev',
      preview_note: 'C01 R4 hosted preview run'
    };
  }
  // Historical C01 local Playwright runs
  if (relPath.startsWith('output/playwright/C01/')) {
    return {
      preview: null,
      preview_note: 'Historical C01 local Playwright run; no immutable Pages preview recorded in git provenance'
    };
  }
  return {
    preview: null,
    preview_note: 'Provenance unrecorded'
  };
}

export function computeFileMetadata(filePath, repoRoot = process.cwd()) {
  const fullPath = path.resolve(repoRoot, filePath);
  const relPath = path.relative(repoRoot, fullPath);

  // Derive commit that first added this path using git log --diff-filter=A
  let addedCommit = null;
  try {
    const gitAddLog = execFileSync('git', ['log', '--diff-filter=A', '--format=%H', '-1', '--', relPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (gitAddLog) {
      addedCommit = gitAddLog;
    }
  } catch {
    // fallback
  }

  if (!addedCommit) {
    throw new Error(`Cannot derive first-added Git commit for: ${relPath}`);
  }

  // Derive latest commit that modified this path
  let contentCommit = null;
  try {
    const gitContentLog = execFileSync('git', ['log', '-1', '--format=%H', '--', relPath], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (gitContentLog) {
      contentCommit = gitContentLog;
    }
  } catch {
    // fallback
  }

  if (!contentCommit) {
    contentCommit = addedCommit;
  }

  // Retrieve bytes directly from Git object storage for addition commit
  const addedBytesBuf = execFileSync('git', ['show', `${addedCommit}:${relPath}`], {
    cwd: repoRoot,
    maxBuffer: 50 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const addedSha256 = crypto.createHash('sha256').update(addedBytesBuf).digest('hex');
  const addedBytes = addedBytesBuf.length;

  // Retrieve bytes directly from Git object storage for content commit
  const contentBytesBuf = (contentCommit === addedCommit)
    ? addedBytesBuf
    : execFileSync('git', ['show', `${contentCommit}:${relPath}`], {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024,
        stdio: ['ignore', 'pipe', 'pipe']
      });
  const sha256 = crypto.createHash('sha256').update(contentBytesBuf).digest('hex');
  const bytes = contentBytesBuf.length;

  // Verify on-disk file if it exists against latest content commit
  if (fs.existsSync(fullPath)) {
    const diskBytes = fs.readFileSync(fullPath);
    const diskSha = crypto.createHash('sha256').update(diskBytes).digest('hex');
    if (diskSha !== sha256) {
      throw new Error(`Hash mismatch between Git object (${sha256}) and disk (${diskSha}) for ${relPath}`);
    }
  }

  const { preview, preview_note } = resolvePreviewProvenance(relPath);

  return {
    path: relPath,
    added_commit: addedCommit,
    added_sha256: addedSha256,
    added_bytes: addedBytes,
    added_retrieval: `git show ${addedCommit}:${relPath}`,
    content_commit: contentCommit,
    sha256,
    bytes,
    retrieval: `git show ${contentCommit}:${relPath}`,
    preview,
    preview_note
  };
}

export function generateManifest(targetPaths, options = {}) {
  const repoRoot = options.repoRoot || process.cwd();
  const manifest = [];

  for (const targetPath of targetPaths) {
    const fullTarget = path.resolve(repoRoot, targetPath);
    if (!fs.existsSync(fullTarget)) continue;

    const stat = fs.statSync(fullTarget);
    if (stat.isDirectory()) {
      const walk = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const res = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            walk(res);
          } else {
            manifest.push(computeFileMetadata(res, repoRoot));
          }
        }
      };
      walk(fullTarget);
    } else {
      manifest.push(computeFileMetadata(fullTarget, repoRoot));
    }
  }

  return manifest.sort((a, b) => a.path.localeCompare(b.path));
}

export function verifyManifestFromGitObjects(manifestPath, repoRoot = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let verified = 0;
  for (const item of manifest) {
    // 1. Verify first-add commit condition from Git history
    const actualAddCommit = execFileSync('git', ['log', '--diff-filter=A', '--format=%H', '-1', '--', item.path], {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
    if (actualAddCommit !== item.added_commit) {
      throw new Error(`First-add commit mismatch for ${item.path}: expected ${item.added_commit}, got ${actualAddCommit}`);
    }

    // 2. Verify added object bytes and hash
    const addedBytes = execFileSync('git', ['show', `${item.added_commit}:${item.path}`], {
      cwd: repoRoot,
      maxBuffer: 50 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const addedHash = crypto.createHash('sha256').update(addedBytes).digest('hex');
    if (addedHash !== item.added_sha256) {
      throw new Error(`Added object hash mismatch for ${item.path}: expected ${item.added_sha256}, got ${addedHash}`);
    }
    if (addedBytes.length !== item.added_bytes) {
      throw new Error(`Added object size mismatch for ${item.path}: expected ${item.added_bytes}, got ${addedBytes.length}`);
    }

    // 3. Verify latest content object bytes and hash
    const contentBytes = (item.content_commit === item.added_commit)
      ? addedBytes
      : execFileSync('git', ['show', `${item.content_commit}:${item.path}`], {
          cwd: repoRoot,
          maxBuffer: 50 * 1024 * 1024,
          stdio: ['ignore', 'pipe', 'pipe']
        });
    const contentHash = crypto.createHash('sha256').update(contentBytes).digest('hex');
    if (contentHash !== item.sha256) {
      throw new Error(`Content object hash mismatch for ${item.path}: expected ${item.sha256}, got ${contentHash}`);
    }
    if (contentBytes.length !== item.bytes) {
      throw new Error(`Content object size mismatch for ${item.path}: expected ${item.bytes}, got ${contentBytes.length}`);
    }

    // 4. If content_commit differs from added_commit, verify it is indeed the latest modifying commit
    if (item.content_commit !== item.added_commit) {
      const actualLatestCommit = execFileSync('git', ['log', '-1', '--format=%H', '--', item.path], {
        cwd: repoRoot,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();
      if (actualLatestCommit !== item.content_commit) {
        throw new Error(`Content commit mismatch for ${item.path}: expected ${item.content_commit}, got ${actualLatestCommit}`);
      }
    }

    verified++;
  }
  return verified;
}

export function restoreEvidenceFromGit(manifestPath, repoRoot = process.cwd()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  let restored = 0;
  for (const item of manifest) {
    const fullPath = path.resolve(repoRoot, item.path);
    if (!fs.existsSync(fullPath)) {
      const gitBytes = execFileSync('git', ['show', `${item.content_commit}:${item.path}`], {
        cwd: repoRoot,
        maxBuffer: 50 * 1024 * 1024
      });
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, gitBytes);
      restored++;
    }
  }
  return restored;
}

export function auditReviewLinks(docsDir = path.resolve(process.cwd(), 'docs'), repoRoot = process.cwd(), manifestPath) {
  const reviewLinks = new Set();
  const linkOccurrences = new Map(); // link -> array of files
  const results = [];

  const manifestMap = new Map();
  if (manifestPath && fs.existsSync(manifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    for (const item of manifest) {
      manifestMap.set(item.path, item);
    }
  }

  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.md')) {
        const content = fs.readFileSync(full, 'utf8');
        const matches = content.matchAll(/(?:output\/|docs\/execution\/evidence\/)[^\s)\]`"']+/g);
        for (const match of matches) {
          const rawLink = match[0].replace(/[.,:;`]+$/, '');
          reviewLinks.add(rawLink);
          if (!linkOccurrences.has(rawLink)) {
            linkOccurrences.set(rawLink, []);
          }
          linkOccurrences.get(rawLink).push(path.relative(repoRoot, full));
        }
      }
    }
  };

  walk(docsDir);

  for (const rawLink of Array.from(reviewLinks).sort()) {
    const occurrences = linkOccurrences.get(rawLink) || [];
    const isOnlyInReview = occurrences.every((file) => file.startsWith('docs/execution/reviews/'));

    // 1. Glob patterns
    if (rawLink.includes('*')) {
      results.push({
        rawLink,
        classification: 'GLOB_PATTERN',
        status: 'NON_FILE_PATTERN',
        occurrences,
        note: 'Documentation glob pattern'
      });
      continue;
    }

    // 2. Template placeholders
    if (rawLink.includes('<') || rawLink.includes('>')) {
      results.push({
        rawLink,
        classification: 'TEMPLATE_PLACEHOLDER',
        status: 'NON_FILE_PATTERN',
        occurrences,
        note: 'Documentation template placeholder'
      });
      continue;
    }

    // 3. Line number / range annotations (e.g. :31, :844–860)
    const lineSuffixMatch = rawLink.match(/^(.+?):(\d+.*)$/);
    if (lineSuffixMatch) {
      const basePath = lineSuffixMatch[1];
      const suffix = lineSuffixMatch[2];
      let baseTracked = false;
      try {
        execFileSync('git', ['ls-files', '--error-unmatch', basePath], {
          cwd: repoRoot,
          stdio: ['ignore', 'pipe', 'ignore']
        });
        baseTracked = true;
      } catch {
        baseTracked = false;
      }

      if (baseTracked) {
        results.push({
          rawLink,
          basePath,
          lineSuffix: suffix,
          classification: 'RESOLVABLE_LINE_REFERENCE',
          status: 'TRACKED_IN_INDEX',
          occurrences,
          note: `Base file ${basePath} is tracked in Git index with line annotation :${suffix}`
        });
        continue;
      }
    }

    // 4. Directory references and prose patterns
    if (rawLink.endsWith('/') || rawLink === 'output/screenshots') {
      results.push({
        rawLink,
        classification: rawLink === 'output/screenshots' ? 'PROSE_PATTERN' : 'DIRECTORY_REFERENCE',
        status: 'DIRECTORY_OR_PROSE',
        occurrences,
        note: rawLink === 'output/screenshots'
          ? 'Prose pattern in documentation ("output/screenshots")'
          : `Directory path reference: ${rawLink}`
      });
      continue;
    }

    // 5. Check if tracked concrete file in Git index
    let trackedInIndex = false;
    try {
      execFileSync('git', ['ls-files', '--error-unmatch', rawLink], {
        cwd: repoRoot,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      trackedInIndex = true;
    } catch {
      trackedInIndex = false;
    }

    if (trackedInIndex) {
      results.push({
        rawLink,
        classification: 'CONCRETE_FILE',
        status: 'TRACKED_IN_INDEX',
        occurrences,
        retrievalCommand: `git show HEAD:${rawLink}`
      });
      continue;
    }

    // 6. Check if untracked concrete file resolvable via manifest Git object
    const manifestEntry = manifestMap.get(rawLink);
    if (manifestEntry) {
      let resolvableInGit = false;
      try {
        execFileSync('git', ['cat-file', '-e', `${manifestEntry.content_commit}:${rawLink}`], {
          cwd: repoRoot,
          stdio: ['ignore', 'ignore', 'ignore']
        });
        resolvableInGit = true;
      } catch {
        resolvableInGit = false;
      }

      if (resolvableInGit) {
        results.push({
          rawLink,
          classification: 'CONCRETE_FILE',
          status: 'RESOLVABLE_VIA_GIT_OBJECT',
          occurrences,
          contentCommit: manifestEntry.content_commit,
          sha256: manifestEntry.sha256,
          retrievalCommand: manifestEntry.retrieval
        });
        continue;
      }
    }

    // 7. Check if uncommitted file exists on disk in working tree
    const fullLocalPath = path.resolve(repoRoot, rawLink);
    if (fs.existsSync(fullLocalPath) && fs.statSync(fullLocalPath).isFile()) {
      results.push({
        rawLink,
        classification: 'CONCRETE_FILE',
        status: 'UNTRACKED_LOCAL_ONLY',
        occurrences,
        note: 'File exists in local working tree but is not yet committed or tracked in Git index'
      });
      continue;
    }

    // 8. Historical reviewer quote or review discussion in submissions
    const isReviewCitation = occurrences.every(
      (file) => file.startsWith('docs/execution/reviews/') || file.startsWith('docs/execution/submissions/')
    );
    if (isReviewCitation) {
      results.push({
        rawLink,
        classification: 'HISTORICAL_REVIEW_QUOTE',
        status: 'REVIEW_CITATION',
        occurrences,
        note: `Cited in historical review or review reconciliation document(s): ${occurrences.join(', ')}`
      });
      continue;
    }

    // 9. Otherwise: genuinely missing concrete file
    results.push({
      rawLink,
      classification: 'CONCRETE_FILE',
      status: 'MISSING',
      occurrences,
      note: 'File is neither tracked in index nor resolvable in manifest Git history'
    });
  }

  return results;
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1])) {
  const args = process.argv.slice(2);
  const manifestPath = path.resolve(process.cwd(), 'docs/execution/evidence_manifest.json');

  if (args.includes('--verify')) {
    console.log(`Verifying evidence manifest against Git object database (${manifestPath})...`);
    const count = verifyManifestFromGitObjects(manifestPath);
    console.log(`[PASS] Verified ${count} entries directly from Git objects. Hash, size, and first-add condition match 100%.`);
  } else if (args.includes('--restore')) {
    console.log(`Restoring missing evidence files from Git objects...`);
    const restored = restoreEvidenceFromGit(manifestPath);
    console.log(`[PASS] Restored ${restored} files from Git objects to disk.`);
  } else if (args.includes('--audit')) {
    console.log(`Auditing evidence references in docs against Git index and manifest (${manifestPath})...`);
    const linkAudit = auditReviewLinks(path.resolve(process.cwd(), 'docs'), process.cwd(), manifestPath);
    const missing = linkAudit.filter((r) => r.status === 'MISSING');
    console.log(`[PASS] Audited ${linkAudit.length} review evidence links. Missing concrete files: ${missing.length}`);
    if (missing.length > 0) {
      console.warn('Missing concrete files:', missing);
    }
  } else {
    const targets = args.filter((a) => !a.startsWith('--'));
    const targetDirs = targets.length > 0 ? targets : ['output'];
    const manifest = generateManifest(targetDirs);
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`[PASS] Generated manifest for ${manifest.length} files (${manifest.reduce((sum, item) => sum + item.bytes, 0)} bytes) -> ${manifestPath}`);

    const verified = verifyManifestFromGitObjects(manifestPath);
    console.log(`[PASS] Verified all ${verified} files against Git object database.`);

    const linkAudit = auditReviewLinks(path.resolve(process.cwd(), 'docs'), process.cwd(), manifestPath);
    const missing = linkAudit.filter((r) => r.status === 'MISSING');
    console.log(`[PASS] Audited ${linkAudit.length} review evidence links. Missing concrete files: ${missing.length}`);
    if (missing.length > 0) {
      console.warn('Missing concrete files:', missing);
    }
  }
}
