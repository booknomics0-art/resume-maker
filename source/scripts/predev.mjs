#!/usr/bin/env node
/**
 * `npm run dev` / `npm run build` prep.
 *
 * Two generated things the app needs that are not in git:
 *   1. public/ocr/   — the offline OCR engine (tesseract worker + wasm + model)
 *   2. public/template-preview.html — the whole template catalogue rendered
 *      through Preview.tsx, for reviewing designs without opening the wizard
 *
 * Both are best-effort: if either fails, the dev server/build still starts and
 * just prints why. A missing preview page must never be able to break `npm run dev`.
 */

import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const steps = [
  ['OCR assets', 'scripts/copy-ocr-assets.mjs'],
  ['Template preview', 'scripts/render-templates.mjs'],
];

for (const [label, script] of steps) {
  const r = spawnSync(process.execPath, [join(root, script)], { cwd: root, encoding: 'utf8' });
  const out = (r.stdout || '').trim().split('\n').filter(Boolean).pop();
  if (r.status === 0) {
    if (out) console.log(`✓ ${label}: ${out.replace(/^✓\s*/, '')}`);
  } else {
    console.warn(`⚠ ${label} skipped — ${(r.stderr || r.stdout || '').trim().split('\n')[0]}`);
  }
}
