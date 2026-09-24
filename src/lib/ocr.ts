/**
 * CraftCV OCR engine — Tesseract, running 100% in the browser, with the engine
 * itself served from our own origin.
 *
 * The important change vs. the previous build: tesseract.js used to fetch its
 * worker, wasm core and language model from jsDelivr. The app ships a strict
 * CSP (`script-src 'self'`, `connect-src 'self'`) plus
 * `Cross-Origin-Embedder-Policy: require-corp`, so those requests were blocked
 * on the deployed site and any scanned/photo PDF failed with
 * "OCR could not recover it" — even though the file was perfectly readable.
 *
 * Now: `scripts/copy-ocr-assets.mjs` vendors worker + core + eng.traineddata
 * into `public/ocr/` (same origin → allowed by the CSP), and this module
 * prefers those. If they are missing (e.g. a bare `vite build` without the
 * pre-script) it falls back to the CDN, and if that is blocked too it reports
 * exactly what went wrong instead of a generic failure.
 */

import type { GrayImage } from './imaging';
import {
  adaptiveThreshold, binarizeOtsu, contrastStretch, cropToPage, fitForOcr, toGray, thresholdLooksSane,
} from './imaging';
import { cleanOcrLayout, mergeMissingLines, ocrQuality, repairOcrText } from './ocrText';

export interface OcrProgress {
  stage: string;
  pct: number; // 0 - 100 of the OCR work this call was asked to do
}

export type OcrAssetMode = 'local' | 'cdn';

export interface OcrOutcome {
  text: string;
  /** Tesseract's own confidence for the pass we kept (0-100). */
  confidence: number;
  /** Our resume-shaped quality score for the text we kept. */
  quality: number;
  /** Which preprocessing/segmentation passes produced the kept text. */
  passes: string[];
  assetMode: OcrAssetMode;
  cropped: boolean;
}

export interface OcrRunOptions {
  onProgress?: (p: OcrProgress) => void;
  /** Page 1 gets an extra segmentation pass (the name line lives there). */
  isFirstPage?: boolean;
  /**
   * Turns a preprocessed grayscale buffer into something tesseract can read.
   * Browser default: a <canvas>. Tests pass a PNG buffer instead.
   */
  toSource?: (gray: GrayImage) => unknown;
  /** Node/tests: point the engine at a local traineddata folder. */
  langPath?: string;
  /** Force a specific asset origin (used by tests). */
  assetBase?: string;
}

/** Below this quality we try a second, more aggressive image treatment. */
const GOOD_ENOUGH = 55;

// ─────────────────────────────────────────────────────────────────────────────
// Engine (tesseract.js) lifecycle
// ─────────────────────────────────────────────────────────────────────────────

let tesseractMod: any = null;
let workerPromise: Promise<any> | null = null;
let assetProbe: { mode: OcrAssetMode; workerPath?: string; corePath?: string; langPath?: string } | null = null;
let assetBaseOverride: string | null = null;

async function getTesseract(): Promise<any> {
  if (!tesseractMod) tesseractMod = await import('tesseract.js');
  return tesseractMod;
}

function documentBase(): string {
  if (typeof document !== 'undefined' && document.baseURI) return document.baseURI;
  if (typeof location !== 'undefined' && location.href) return location.href;
  return 'http://localhost/';
}

/**
 * Are the vendored OCR assets being served? Probe once with a HEAD request.
 * Anything other than a 200 means "fall back to the CDN and say so".
 */
async function resolveAssets(opts?: OcrRunOptions): Promise<{ mode: OcrAssetMode; workerPath?: string; corePath?: string; langPath?: string }> {
  if (opts?.langPath) {
    const base = (opts.assetBase || '').replace(/\/$/, '');
    return { mode: 'local', workerPath: base ? `${base}/worker.min.js` : undefined, corePath: base || undefined, langPath: opts.langPath };
  }
  if (assetProbe && !opts?.assetBase) return assetProbe;
  const base = new URL('ocr/', opts?.assetBase || documentBase()).href.replace(/\/$/, '');
  let mode: OcrAssetMode = 'cdn';
  if (typeof fetch === 'function') {
    const url = `${base}/worker.min.js`;
    try {
      // HEAD first (cheapest). Some static hosts reject HEAD, so fall back to a
      // real GET before concluding the vendored engine is missing.
      let ok = (await fetch(url, { method: 'HEAD' })).ok;
      if (!ok) ok = (await fetch(url)).ok;
      if (ok) mode = 'local';
    } catch {
      mode = 'cdn';
    }
  }
  const resolved = mode === 'local'
    ? { mode, workerPath: `${base}/worker.min.js`, corePath: base, langPath: base }
    : { mode };
  assetProbe = resolved;
  return resolved;
}

/** Which engine source the next OCR run will use (for the UI / diagnostics). */
export async function ocrAssetMode(opts?: OcrRunOptions): Promise<OcrAssetMode> {
  if (opts?.assetBase) assetBaseOverride = opts.assetBase;
  return (await resolveAssets(opts)).mode;
}

export class OcrUnavailableError extends Error {
  readonly detail: string;
  constructor(detail: string) {
    super(
      'The built-in OCR engine could not start on this device. ' +
      'A text-based PDF, DOCX or TXT will import instantly — or switch off ' +
      'private browsing / ad-blockers and try the scanned file again.',
    );
    this.name = 'OcrUnavailableError';
    this.detail = detail;
  }
}

async function getWorker(onProgress?: (p: OcrProgress) => void, opts?: OcrRunOptions): Promise<any> {
  if (workerPromise) return workerPromise;
  workerPromise = (async () => {
    const Tesseract: any = await getTesseract();
    const assets = await resolveAssets(opts);
    const language = 'eng';
    const setup: Record<string, unknown> = {
      // A same-origin worker keeps strict CSP happy (no blob:, no CDN).
      workerBlobURL: false,
      gzip: true,
      logger: (m: any) => {
        if (!onProgress) return;
        const status = String(m?.status || '');
        const p = Number(m?.progress || 0) * 100;
        if (/loading tesseract core|initializ.*tesseract/i.test(status)) {
          onProgress({ stage: 'Starting OCR engine (first run only)…', pct: Math.min(12, p * 0.12) });
        } else if (/load.*language|loading traineddata/i.test(status)) {
          onProgress({ stage: `Loading English text model${assets.mode === 'cdn' ? ' (downloading)' : ''}…`, pct: 12 + Math.min(13, p * 0.13) });
        } else if (/recognizing/i.test(status)) {
          onProgress({ stage: 'Reading the scanned text…', pct: 25 + p * 0.7 });
        }
      },
    };
    if (assets.workerPath) setup.workerPath = assets.workerPath;
    if (assets.corePath) setup.corePath = assets.corePath;
    if (assets.langPath) setup.langPath = assets.langPath;
    try {
      const worker = await Tesseract.createWorker(language, 1, setup);
      return worker;
    } catch (e: any) {
      workerPromise = null;
      throw new OcrUnavailableError(String(e?.message || e || 'unknown error'));
    }
  })();
  return workerPromise;
}

/** Frees the wasm core (~30 MB). Safe to call at any time. */
export async function releaseOcrEngine() {
  const p = workerPromise;
  workerPromise = null;
  if (!p) return;
  try {
    const w = await p;
    await w?.terminate?.();
  } catch {
    /* engine was never up */
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Preprocessing → recognizable image
// ─────────────────────────────────────────────────────────────────────────────

/** Default converter: grayscale buffer → <canvas> that tesseract can read. */
function grayToCanvas(gray: GrayImage): unknown {
  const canvas = document.createElement('canvas');
  canvas.width = gray.width;
  canvas.height = gray.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available in this browser');
  const img = ctx.createImageData(gray.width, gray.height);
  for (let p = 0, i = 0; p < gray.data.length; p++, i += 4) {
    const v = gray.data[p];
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

async function recognize(
  source: unknown | Promise<unknown>,
  psm: string,
  worker: any,
): Promise<{ text: string; confidence: number }> {
  // `toSource` may be async (a canvas conversion, a test encoder…)
  const image = await source;
  await worker.setParameters({
    tessedit_pageseg_mode: psm,
    preserve_interword_spaces: '1',
    // A resume is a document, not a photo of a sign: assume a normal page DPI
    // so tesseract's layout analysis does not resize the image behind our back.
    user_defined_dpi: '300',
  });
  const res = await worker.recognize(image);
  return { text: String(res?.data?.text || ''), confidence: Number(res?.data?.confidence || 0) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: OCR a grayscale page
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Runs the full preprocessing + multi-pass OCR strategy on one page and returns
 * the best text we can get out of it.
 */
export async function ocrGrayPage(gray: GrayImage, opts: OcrRunOptions = {}): Promise<OcrOutcome> {
  const onProgress = opts.onProgress;
  // Several segmentation passes may run inside one page; the bar must never
  // jump backwards, so remember the highest value reported so far.
  let reported = 0;
  const report = (stage: string, pct: number) => {
    const clamped = Math.max(reported, Math.max(0, Math.min(100, pct)));
    if (clamped === reported && onProgress === undefined) return;
    reported = clamped;
    onProgress?.({ stage, pct: clamped });
  };
  const toSource = opts.toSource || grayToCanvas;
  const worker = await getWorker(onProgress, opts);
  const assets = await resolveAssets(opts);

  report('Preparing the page image…', 8);
  const cropped = cropToPage(contrastStretch(gray));
  const pre = fitForOcr(cropped);
  const pageLabel = opts.isFirstPage ? 'Page 1' : 'Page';

  let best = { text: '', confidence: 0, quality: -1, pass: '' };
  const passes: string[] = [];
  const consider = (text: string, confidence: number, pass: string) => {
    passes.push(pass);
    const quality = ocrQuality(text);
    if (quality > best.quality) best = { text, confidence, quality, pass };
    return quality;
  };

  // Pass 1 — Otsu binarisation: the workhorse for print on paper.
  const otsu = binarizeOtsu(pre);
  if (thresholdLooksSane(otsu)) {
    report(`${pageLabel}: reading text…`, 22);
    const r = await recognize(toSource(otsu), '3', worker);
    consider(cleanOcrLayout(r.text), r.confidence, 'otsu+auto');
  } else {
    // Threshold went wrong (heavy shadow / glare) — try grayscale first.
    report(`${pageLabel}: reading text (uneven lighting)…`, 22);
    const r = await recognize(toSource(pre), '3', worker);
    consider(cleanOcrLayout(r.text), r.confidence, 'gray+auto');
  }

  // Pass 2 — adaptive threshold: rescues the shadowed / low-contrast photos
  // that Otsu fails on. Only worth the seconds when pass 1 came up short.
  if (best.quality < GOOD_ENOUGH) {
    report(`${pageLabel}: second attempt with adaptive contrast…`, 45);
    const adaptive = adaptiveThreshold(pre);
    const r = await recognize(toSource(adaptive), '3', worker);
    const q = consider(cleanOcrLayout(r.text), r.confidence, 'adaptive+auto');
    if (q < GOOD_ENOUGH) {
      // Pass 3 — single-column / sparse segmentation. Overlapping columns and
      // stylised headers often need this to be read at all.
      report(`${pageLabel}: third attempt, scanning for missed lines…`, 62);
      const r2 = await recognize(toSource(pre), '11', worker);
      const sparse = cleanOcrLayout(r2.text);
      consider(sparse, r2.confidence, 'gray+sparse');
      const merged = mergeMissingLines(best.text, sparse);
      if (ocrQuality(merged) > best.quality) {
        best = { text: merged, confidence: r2.confidence, quality: ocrQuality(merged), pass: `${best.pass}+sparse` };
      }
    }
  } else if (opts.isFirstPage) {
    // Page 1 always gets the sparse pass: big name lines / contact rows are
    // exactly what whole-page auto-segmentation drops.
    report(`${pageLabel}: double-checking the header lines…`, 55);
    const r2 = await recognize(toSource(pre), '11', worker);
    const sparse = cleanOcrLayout(r2.text);
    const merged = mergeMissingLines(best.text, sparse);
    if (ocrQuality(merged) > best.quality) {
      best = { text: merged, confidence: r2.confidence, quality: ocrQuality(merged), pass: `${best.pass}+sparse` };
    }
  }

  report(`${pageLabel}: done`, 100);
  return {
    text: repairOcrText(best.text),
    confidence: best.confidence,
    quality: best.quality,
    passes: best.pass ? best.pass.split('+') : passes,
    assetMode: assets.mode,
    cropped: cropped.cropped,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Public: OCR a photo / screenshot of a resume (JPEG, PNG, HEIC-less formats)
// ─────────────────────────────────────────────────────────────────────────────

async function loadBitmap(file: File): Promise<{ draw: (ctx: any) => void; width: number; height: number }> {
  // createImageBitmap honours EXIF rotation, which phone photos need.
  if (typeof createImageBitmap === 'function') {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as any);
      return { draw: (ctx) => ctx.drawImage(bmp, 0, 0), width: bmp.width, height: bmp.height };
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('This image could not be opened'));
      el.src = url;
    });
    return { draw: (ctx) => ctx.drawImage(img, 0, 0), width: img.naturalWidth, height: img.naturalHeight };
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

/** OCR a raw image file (a photo or screenshot of a resume). */
export async function ocrImageFile(file: File, opts: OcrRunOptions = {}): Promise<OcrOutcome> {
  const onProgress = opts.onProgress;
  onProgress?.({ stage: 'Opening the image…', pct: 3 });
  const bmp = await loadBitmap(file);
  const maxLong = 2600; // plenty for OCR, and keeps memory sane on phones
  const scale = Math.min(1, maxLong / Math.max(bmp.width, bmp.height));
  const w = Math.max(1, Math.round(bmp.width * scale));
  const h = Math.max(1, Math.round(bmp.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Canvas is not available in this browser');
  bmp.draw(ctx);
  const img = ctx.getImageData(0, 0, w, h);
  onProgress?.({ stage: 'Preparing the image…', pct: 10 });
  const gray = toGray({ data: img.data, width: w, height: h });
  return ocrGrayPage(gray, { ...opts, isFirstPage: true });
}
