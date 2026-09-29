#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const distPath = path.join(repoRoot, 'dist');

console.log('[verify_build_isolation] Inspecting production build in:', distPath);

if (!fs.existsSync(distPath)) {
  console.error('[FAIL] dist/ directory does not exist. Run "npm run build" first.');
  process.exit(1);
}

// 1. fixtures.html must NOT exist in dist
const fixturesHtmlPath = path.join(distPath, 'fixtures.html');
if (fs.existsSync(fixturesHtmlPath)) {
  console.error('[FAIL] fixtures.html was leaked into production dist output!');
  process.exit(1);
}

// 2. index.html must exist and must not contain fixture markers
const indexHtmlPath = path.join(distPath, 'index.html');
if (!fs.existsSync(indexHtmlPath)) {
  console.error('[FAIL] index.html missing from dist output.');
  process.exit(1);
}

const indexContent = fs.readFileSync(indexHtmlPath, 'utf8');
const forbiddenIndexTokens = ['fixtures.html', 'src/fixtures', 'synthetic_fixture_v1', 'SYNTHETIC FIXTURE'];
for (const token of forbiddenIndexTokens) {
  if (indexContent.includes(token)) {
    console.error(`[FAIL] index.html contains forbidden fixture token: "${token}"`);
    process.exit(1);
  }
}

// 3. Inspect all assets (JS, CSS, source maps)
const assetsDir = path.join(distPath, 'assets');
if (!fs.existsSync(assetsDir)) {
  console.error('[FAIL] dist/assets/ directory does not exist.');
  process.exit(1);
}

const forbiddenTokens = [
  'synthetic_fixture_v1',
  'usr_synthetic_alex_mercer_2026',
  'SYNTHETIC FIXTURE HARNESS',
  'alex.mercer.synthetic@example.org',
  'synthetic_mock_fixture_token',
  'fixtures.html'
];

const assetFiles = fs.readdirSync(assetsDir);
let inspectedFiles = 0;

for (const file of assetFiles) {
  if (file.endsWith('.js') || file.endsWith('.css') || file.endsWith('.map')) {
    inspectedFiles++;
    const filePath = path.join(assetsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');

    for (const token of forbiddenTokens) {
      if (content.includes(token)) {
        console.error(`[FAIL] Asset file ${file} contains forbidden fixture token: "${token}"`);
        process.exit(1);
      }
    }
  }
}

console.log(`[PASS] Verified build isolation: ${inspectedFiles} production asset files (JS, CSS, Source Maps) clean. 0 fixture leaks.`);
process.exit(0);
