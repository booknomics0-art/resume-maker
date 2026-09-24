/**
 * Test harness for the CraftCV import pipeline.
 *
 * The library code is written for the browser (canvas, DOM, workers), so the
 * tests:
 *   1. bundle `src/lib/*.ts` with esbuild (Node cannot resolve the app's
 *      extensionless TS imports on its own), and
 *   2. stand in for the browser's canvas with @napi-rs/canvas, which is the
 *      only part of the pipeline Node cannot provide.
 *
 * Everything else — preprocessing, Tesseract, section detection, field
 * extraction — is the real production code path.
 *
 * @napi-rs/canvas is optional: install it with
 *   npm i -D @napi-rs/canvas
 * Tests that need pixels skip themselves (exit 0 with a note) when it is
 * missing, so `npm test` works on any machine.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const tmpDir = join(root, 'tests', '.tmp');
export const LANG_PATH = join(root, 'node_modules', '@tesseract.js-data', 'eng', '4.0.0_best_int');

export const SCAN_JPG = join(root, 'tests', 'scan-resume.jpg');

let canvasMod = null;
export async function getCanvas() {
  if (canvasMod === null) {
    try {
      canvasMod = await import('@napi-rs/canvas');
    } catch {
      canvasMod = false;
    }
  }
  return canvasMod || null;
}

/** Bundles the app libraries into tests/.tmp so plain Node can import them. */
export async function buildLibs() {
  const esbuild = await import('esbuild');
  mkdirSync(tmpDir, { recursive: true });
  await esbuild.build({
    entryPoints: [
      join(root, 'src', 'lib', 'ocr.ts'),
      join(root, 'src', 'lib', 'resumeParser.ts'),
      join(root, 'src', 'lib', 'importDraft.ts'),
    ],
    outdir: tmpDir,
    bundle: true,
    format: 'esm',
    platform: 'neutral',
    target: 'node20',
    logLevel: "error",
    // keep the npm packages out of the bundle: Node resolves them at runtime,
    // and tesseract.js must load its *node* build, not its browser build
    external: ['tesseract.js', 'pdfjs-dist', 'tesseract.js-core'],
  });
  const load = async (name) => import(pathToFileURL(join(tmpDir, `${name}.js`)).href);
  return { ocr: await load('ocr'), parser: await load('resumeParser'), draft: await load('importDraft') };
}

/** Decode an image file into the grayscale buffer the pipeline works on. */
export async function grayFromImageFile(path) {
  const canvas = await getCanvas();
  if (!canvas) throw new Error('@napi-rs/canvas is not installed');
  const img = await canvas.loadImage(path);
  const c = canvas.createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, c.width, c.height);
  const gray = new Uint8ClampedArray(c.width * c.height);
  for (let p = 0, i = 0; p < gray.length; p++, i += 4) {
    gray[p] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }
  return { data: gray, width: c.width, height: c.height };
}

/** Encode a grayscale buffer as PNG — what the browser hands to the worker. */
export async function pngFromGray(gray) {
  const canvas = await getCanvas();
  const c = canvas.createCanvas(gray.width, gray.height);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(gray.width, gray.height);
  for (let p = 0, i = 0; p < gray.data.length; p++, i += 4) {
    const v = gray.data[p];
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c.toBuffer('image/png');
}

/** Minimal check runner: prints ✅/❌ and exits non-zero on failure. */
export function checks(list) {
  let pass = 0;
  for (const [name, ok] of list) {
    console.log(`${ok ? '✅' : '❌'} ${name}`);
    if (ok) pass++;
  }
  console.log(`\n${pass}/${list.length} checks passed`);
  return pass === list.length;
}

/** Minimal sessionStorage for Node (the draft store is session-scoped). */
export function shimSessionStorage() {
  const map = new Map();
  globalThis.sessionStorage = {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    clear: () => map.clear(),
    key: (i) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
  return map;
}

export function skip(msg) {
  console.log(`⏭️  ${msg}`);
  process.exit(0);
}

export { existsSync };
