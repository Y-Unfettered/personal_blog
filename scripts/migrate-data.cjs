#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const SOURCE_DIR = path.resolve(process.cwd(), 'data/seed');
const FILES = ['posts', 'categories', 'tags', 'nav', 'settings', 'issues', 'tools'];

function parseArgs(argv) {
  const opts = { force: false, target: '' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') {
      opts.force = true;
      continue;
    }
    if (a === '--target') {
      opts.target = argv[i + 1] || '';
      i += 1;
    }
  }
  return opts;
}

function resolveTargetDir(input) {
  const raw = String(input || process.env.BLOG_DATA_DIR || '/srv/blog-data').trim();
  if (!raw) return path.resolve('/srv/blog-data/seed');
  const normalized = raw.replace(/\\/g, '/');
  if (normalized.endsWith('/seed')) return path.resolve(raw);
  return path.resolve(raw, 'seed');
}

function readFromGitHistory(relPath) {
  const listResult = spawnSync('git', ['log', '--format=%H', '--', relPath], {
    cwd: process.cwd(),
    encoding: 'utf8',
    stdio: 'pipe',
  });
  if (listResult.status !== 0) return null;
  const commits = String(listResult.stdout || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  for (const hash of commits) {
    const showResult = spawnSync('git', ['show', `${hash}:${relPath}`], {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: 'pipe',
    });
    if (showResult.status === 0) {
      return String(showResult.stdout || '');
    }
  }
  return null;
}

function main() {
  const opts = parseArgs(process.argv);
  const targetDir = resolveTargetDir(opts.target);
  fs.mkdirSync(targetDir, { recursive: true });

  let copied = 0;
  let skipped = 0;
  let missing = 0;

  for (const name of FILES) {
    const relPath = `data/seed/${name}.json`;
    const srcFile = path.join(SOURCE_DIR, `${name}.json`);
    const dstFile = path.join(targetDir, `${name}.json`);

    if (fs.existsSync(dstFile) && !opts.force) {
      console.log(`skip ${name}: target exists (${dstFile})`);
      skipped += 1;
      continue;
    }

    if (fs.existsSync(srcFile)) {
      fs.copyFileSync(srcFile, dstFile);
      console.log(`copied ${name}: ${srcFile} -> ${dstFile}`);
      copied += 1;
      continue;
    }

    const fallback = readFromGitHistory(relPath);
    if (fallback !== null) {
      fs.writeFileSync(dstFile, fallback, 'utf8');
      console.log(`restored ${name} from git history -> ${dstFile}`);
      copied += 1;
      continue;
    }

    console.warn(`missing ${name}: no source file and no git history`);
    missing += 1;
  }

  console.log(`done: copied=${copied}, skipped=${skipped}, missing=${missing}, target=${targetDir}`);
}

main();
