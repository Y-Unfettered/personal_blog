#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const templateDir = path.resolve(process.cwd(), 'data/seed');
const dataDir = path.resolve(process.cwd(), process.env.BLOG_DATA_DIR || 'data/seed');
const files = ['posts', 'categories', 'tags', 'nav', 'settings', 'issues', 'tools'];

for (const name of files) {
  const target = path.join(dataDir, `${name}.json`);
  const example = path.join(templateDir, `${name}.example.json`);
  if (fs.existsSync(target)) continue;
  if (!fs.existsSync(example)) {
    console.warn(`skip ${name}: missing example file ${example}`);
    continue;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(example, target);
  console.log(`created ${target}`);
}
