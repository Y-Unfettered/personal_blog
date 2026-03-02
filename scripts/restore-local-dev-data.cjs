#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');

const args = ['scripts/migrate-data.cjs', '--target', '.local-dev-data'];
const result = spawnSync('node', args, {
  stdio: 'inherit',
  env: process.env,
});

if (result.status !== 0) {
  process.exit(result.status || 1);
}
