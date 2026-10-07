/**
 * copy-ocr-assets — vendors the Tesseract OCR engine into `public/ocr/`.
 *
 * WHY THIS EXISTS
 * ───────────────
 * tesseract.js downloads its three moving parts from jsDelivr by default:
 *   1. the web worker      (tesseract.js/dist/worker.min.js)
 *   2. the wasm core       (tesseract.js-core/tesseract-core-simd-lstm.wasm.js)
 *   3. the language model  (@tesseract.js-data/eng/eng.traineddata.gz)
 * ResumeMakery ships a strict Content-Security-Policy (`script-src 'self'`,
 * `connect-src 'self'`) and `Cross-Origin-Embedder-Policy: require-corp`, so
 * every one of those CDN requests is BLOCKED in production. That is exactly why
 * scanned PDFs failed with "OCR could not recover it" — the OCR engine never
 * even loaded.
 *
 * Fix: serve all three files from our own origin (`<base>/ocr/…`). They are
 * only fetched when the user actually runs OCR, so the normal page weight of
 * the app is unchanged.
 *
 * The files are generated (not committed) — run `npm run dev` / `npm run build`
 * and the pre-scripts call this automatically.
 */

import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'ocr');
// `best_int` is the integer-LSTM English model: ~3 MB instead of ~11 MB, and
// nothing is lost on a printed/typed resume.
const LANG_DIR = join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int');

const FILES = [
  // [source, destination name, what it is]
  [join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js'), 'worker.min.js', 'OCR web worker'],
  [join(root, 'node_modules', 'tesseract.js-core', 'tesseract-core-simd-lstm.wasm.js'), 'tesseract-core-simd-lstm.wasm.js', 'wasm core (SIMD)'],
  [join(root, 'node_modules', 'tesseract.js-core', 'tesseract-core-lstm.wasm.js'), 'tesseract-core-lstm.wasm.js', 'wasm core (no SIMD)'],
  [join(LANG_DIR, 'eng.traineddata.gz'), 'eng.traineddata.gz', 'English language model'],
];

mkdirSync(outDir, { recursive: true });

let copied = 0;
const missing = [];
for (const [src, name, label] of FILES) {
  const dest = join(outDir, name);
  try {
    if (!existsSync(src)) throw new Error('not installed');
    const same = existsSync(dest) && statSync(dest).size === statSync(src).size;
    if (same) continue;
    copyFileSync(src, dest);
    copied++;
    console.log(`  + ${name} — ${label}`);
  } catch (e) {
    missing.push(`${name} (${label}) — ${e.message}`);
  }
}

if (copied === 0 && missing.length === 0) {
  console.log('OCR engine already vendored in public/ocr — nothing to do.');
} else if (missing.length === 0) {
  console.log(`OCR engine ready in public/ocr (${readdirSync(outDir).length} files).`);
}
if (missing.length) {
  console.warn(
    '\n⚠️  OCR assets missing:\n' + missing.map((m) => `   - ${m}`).join('\n') +
    '\n   Scanned-PDF OCR will fall back to the jsDelivr CDN, which the app\'s\n' +
    '   Content-Security-Policy blocks on deployed builds. Run `npm install` first.\n',
  );
  // never fail the build over an optional asset — the app degrades gracefully
}
