#!/usr/bin/env node
const { execFileSync } = require('child_process');
const { resolve } = require('path');

const root = resolve(__dirname, '..');

try {
  execFileSync(process.execPath, [resolve(root, 'server', 'dist', 'index.js')], {
    cwd: root,
    stdio: 'inherit',
  });
} catch (e) {
  process.exit(e.status ?? 1);
}
