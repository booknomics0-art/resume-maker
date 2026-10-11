#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const pairs = [
  ['public/legal/privacy.html', 'dist/privacy/index.html'],
  ['public/legal/cookies.html', 'dist/cookies/index.html'],
];

for (const [source, target] of pairs) {
  if (!fs.existsSync(source)) throw new Error(`Missing legal source: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

console.log('✓ Published accurate static privacy + cookie pages');
