/**
 * ResumeMakery PDF Extraction Engine
 * ─────────────────────────────
 * Replaces the old "read raw bytes and grep parentheses" hack that produced
 * garbage for any real-world (compressed) PDF.
 *
 * Two-stage pipeline, 100% in the browser (no server upload):
 *   1. TEXT LAYER  — pdf.js (Mozilla) walks the real PDF structure, decompresses
 *      content streams and returns positioned text items. We reconstruct lines
 *      and paragraphs from item coordinates. Works for ~95% of resumes
 *      (Word / Google Docs / Canva / LaTeX exports).
 *   2. OCR FALLBACK — pages without a usable text layer are scanned /
 *      photographed pages. We render them to a canvas and run the vendored
 *      Tesseract engine (see ocr.ts) on a preprocessed copy of the image. The
 *      better result per page wins.
 *
 * Notes for maintainers
 *  • The OCR engine is served from our own origin (`public/ocr/…`) — the app's
 *    CSP forbids the jsDelivr CDN that tesseract.js uses by default. That was
 *    the reason scanned PDFs used to fail with "OCR could not recover it".
 *  • A page is never thrown away: if either stage produced text, we return it
 *    and describe the result in `warning`, instead of failing the whole import.
 */

import type { GrayImage } from './imaging';
import { enhanceFaintInk, isMostlyBlank, toGray } from './imaging';
import { itemsToText, type PositionedItem } from './layoutText';
import { ocrAssetMode, ocrGrayPage, OcrUnavailableError, type OcrRunOptions } from './ocr';
import { ocrQuality, unionText } from './ocrText';
import { classifyImages, collectPdfImages } from './pdfImages';

export interface PdfProgress {
  stage: string;
  pct: number; // 0 - 100
}

export type PdfExtractMethod = 'text' | 'ocr' | 'mixed';

export interface PdfExtractResult {
  text: string;
  method: PdfExtractMethod;
  pages: number;
  textChars: number; // alphanumeric chars recovered from the text layer
  ocrChars: number; // alphanumeric chars recovered via OCR
  ocrConfidence?: number; // average Tesseract confidence for OCR pages
  ocrPages: number;
  warning?: string;
  /** Headshot lifted out of the PDF, if one was embedded (not the page scan). */
  photoDataUrl?: string;
}

/** Renders one PDF page for OCR — injectable so tests can run headless. */
export type PageRenderer = (page: any, num: number) => Promise<GrayImage | any>;

export interface PdfExtractOptions {
  /** Ignore the text layer and OCR every page (the "Re-run with OCR" button). */
  forceOcr?: boolean;
  /** Test hook: replaces the canvas renderer. */
  renderPage?: PageRenderer;
  /** OCR tweaks — used by tests to inject a canvas-free image encoder. */
  ocr?: OcrRunOptions;
}

/** Max pages we are willing to OCR (OCR is heavy; resumes are 1-3 pages). */
const OCR_MAX_PAGES = 10;
/** Below this many chars/page we consider the PDF "scanned". */
const SCANNED_THRESHOLD = 40;
/** A page whose text layer is this thin is worth OCR-ing as well. */
const THIN_PAGE_CHARS = 260;
/** Target long edge (px) for a rendered page ≈ 200 DPI for A4/Letter. */
const RENDER_LONG_EDGE = 2200;

// ─────────────────────────────────────────────────────────────────────────────
// pdf.js loader (dynamic import keeps it out of the main bundle)
// ─────────────────────────────────────────────────────────────────────────────

let pdfjsMod: any = null;
let customWorkerUrl: string | null = null;

/** Tests or embedders may override the pdf.js worker URL explicitly. */
export function setPdfWorkerUrl(url: string) {
  customWorkerUrl = url;
}

async function getPdfjs(): Promise<any> {
  if (!pdfjsMod) {
    const lib: any = await import('pdfjs-dist');
    if (customWorkerUrl) {
      lib.GlobalWorkerOptions.workerSrc = customWorkerUrl;
    } else if (typeof document !== 'undefined') {
      // Only browsers need an emitted worker URL. Node-based parser tests use
      // pdf.js' own non-browser path and must not receive a Vite ?url module.
      const workerModule: any = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
      lib.GlobalWorkerOptions.workerSrc = workerModule.default;
    }
    pdfjsMod = lib;
  }
  return pdfjsMod;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text-layer extraction
// ─────────────────────────────────────────────────────────────────────────────

interface Chunk {
  str: string;
  x: number;
  y: number;
  w: number;
}

/** Pure helper (unit-testable): turn positioned chunks into lines + paragraphs. */
export function chunksToText(chunks: Chunk[]): string {
  const lines: Array<{ y: number; text: string }> = [];
  let cur: Chunk[] = [];
  let baseY: number | null = null;

  const flush = () => {
    if (cur.length) lines.push({ y: baseY ?? cur[0].y, text: lineToText(cur) });
    cur = [];
    baseY = null;
  };

  for (const c of chunks) {
    if (!c.str) continue;
    // new baseline → new visual line (tolerance covers font-size jitter)
    if (baseY !== null && Math.abs(c.y - baseY) > 3.2) flush();
    if (baseY === null) baseY = c.y;
    cur.push(c);
  }
  flush();
  return insertParagraphBreaks(lines);
}

function lineToText(items: Chunk[]): string {
  let text = '';
  let prevEnd: number | null = null;
  for (const it of items) {
    if (prevEnd !== null) {
      const gap = it.x - prevEnd;
      if (gap > 1) text += ' '; // horizontal gap → word separator
      else if (gap < -2) text += ' '; // jumped backwards → column break
    }
    text += it.str;
    prevEnd = it.x + it.w;
  }
  return text.replace(/\s{2,}/g, ' ').trim();
}

/** Blank line between blocks when the vertical gap is much larger than the leading. */
function insertParagraphBreaks(lines: Array<{ y: number; text: string }>): string {
  if (lines.length === 0) return '';
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    if (g > 0.5 && g < 200) gaps.push(g);
  }
  gaps.sort((a, b) => a - b);
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 12;
  const threshold = Math.max(median * 1.6, median + 3);

  let out = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    out += (g > threshold ? '\n\n' : '\n') + lines[i].text;
  }
  return out;
}

async function extractPageText(page: any): Promise<string> {
  const tc = await page.getTextContent();
  const viewport = page.getViewport({ scale: 1 });
  const items: PositionedItem[] = [];
  for (const it of tc.items as any[]) {
    if (!it.str || !String(it.str).trim()) continue;
    items.push({
      str: it.str,
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0,
      w: typeof it.width === 'number' ? it.width : 0,
      h: typeof it.height === 'number' ? it.height : Math.abs(it.transform?.[3] ?? 0) || 11,
    });
  }
  let text = itemsToText(items, viewport?.width || 0);
  // Designed resumes hide the email / LinkedIn behind a link annotation.
  // The visible word is just "Email" — the address only exists as the URL.
  try {
    const annots = await page.getAnnotations();
    const extras: string[] = [];
    const have = text.toLowerCase();
    for (const a of annots as any[]) {
      const url = String(a?.url || a?.unsafeUrl || '').trim();
      if (!url || url.length > 300) continue;
      const bare = url.replace(/^mailto:/i, '').replace(/^tel:/i, '');
      const key = bare.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');
      if (key.length < 5 || have.includes(key.slice(0, 24))) continue;
      extras.push(bare);
    }
    if (extras.length) text = `${text}\n${extras.join('\n')}`;
  } catch {
    /* annotations are optional */
  }
  return text;
}

/**
 * Image to OCR for one page.
 * Tests inject `renderPage` and that path is preserved exactly.
 * In the app, a scanned page is read from its embedded image first — painting
 * it often returns a blank white canvas, which is why "white paper" uploads
 * used to extract nothing at all.
 */
async function pageImageForOcr(
  page: any,
  pageNo: number,
  opts: PdfExtractOptions,
): Promise<{ gray: GrayImage | null; photo?: string; via: string }> {
  if (opts.renderPage) {
    return { gray: await opts.renderPage(page, pageNo), via: 'render-hook' };
  }

  const readEmbedded = () => {
    try {
      return classifyImages(collectPdfImages(page));
    } catch {
      return { scans: [] as GrayImage[] };
    }
  };

  let assets: { scans: GrayImage[]; photoDataUrl?: string } = { scans: [] };
  try {
    await page.getOperatorList();
    assets = readEmbedded();
  } catch {
    /* operator list is a bonus, not a requirement */
  }

  const embedded = assets.scans.find((s) => !isMostlyBlank(s)) || null;
  if (embedded) return { gray: embedded, photo: assets.photoDataUrl, via: 'embedded' };

  if (typeof document !== 'undefined') {
    try {
      const rendered = await renderPageGray(page);
      if (!isMostlyBlank(rendered)) return { gray: rendered, photo: assets.photoDataUrl, via: 'render' };
    } catch {
      /* paint failed — the decoded image may still be sitting in page.objs */
    }
    assets = readEmbedded();
  }

  const faint = assets.scans[0];
  if (faint) return { gray: enhanceFaintInk(faint), photo: assets.photoDataUrl, via: 'embedded-faint' };
  return { gray: null, photo: assets.photoDataUrl, via: 'none' };
}

function personFromMeta(info: any): string {
  const author = String(info?.Author || info?.author || '').replace(/\s+/g, ' ').trim();
  if (!author || author.length < 3 || author.length > 48) return '';
  if (/department|resume|template|microsoft|word|adobe|canva|google|untitled|document|office|admin|user|www\.|@|acrobat|nitro|wps/i.test(author)) return '';
  const words = author.split(' ');
  if (words.length > 4) return '';
  if (!words.every((w) => /^[A-Za-z][A-Za-z.'-]*$/.test(w))) return '';
  return author;
}

/**
 * A "text layer" that came out as gibberish (broken font encoding, CID maps) is
 * worse than no text at all — those pages must go to OCR.
 */
function looksLikeGarbage(text: string): boolean {
  if (text.trim().length < 20) return false;
  const bad = (text.match(/[\uFFFD\u0000-\u0008\u000E-\u001F]/g) || []).length;
  const letters = (text.match(/[A-Za-z]/g) || []).length;
  if (bad / Math.max(1, text.length) > 0.06) return true;
  return letters / Math.max(1, text.length) < 0.35;
}

// ─────────────────────────────────────────────────────────────────────────────
// Rendering (PDF page → grayscale)
// ─────────────────────────────────────────────────────────────────────────────

/** Render a PDF page at ~200 DPI and return its grayscale pixels. */
async function renderPageGray(page: any): Promise<GrayImage> {
  const vp1 = page.getViewport({ scale: 1 });
  const scale = Math.min(3, RENDER_LONG_EDGE / Math.max(vp1.width, vp1.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d', { willReadFrequently: true } as any) as CanvasRenderingContext2D | null;
  if (!ctx) throw new Error('Canvas not supported in this browser');
  // A white base layer: transparent PDF backgrounds would otherwise read as
  // black once converted to grayscale.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport }).promise;
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return toGray({ data: img.data, width: canvas.width, height: canvas.height });
}

const countChars = (s: string) => s.replace(/\s/g, '').length;

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

function normalizeOptions(forceOcrOrOptions?: boolean | PdfExtractOptions): PdfExtractOptions {
  if (typeof forceOcrOrOptions === 'boolean') return { forceOcr: forceOcrOrOptions };
  return forceOcrOrOptions || {};
}

export async function extractPdfSmart(
  file: File,
  onProgress?: (p: PdfProgress) => void,
  forceOcrOrOptions?: boolean | PdfExtractOptions,
): Promise<PdfExtractResult> {
  const opts = normalizeOptions(forceOcrOrOptions);
  const pdfjs = await getPdfjs();
  onProgress?.({ stage: 'Reading PDF structure…', pct: 4 });

  const buf = await file.arrayBuffer();
  let doc: any;
  try {
    doc = await pdfjs.getDocument({
      data: new Uint8Array(buf),
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  } catch (e: any) {
    if (e?.name === 'PasswordException') {
      throw new Error('This PDF is password-protected. Remove the password (or export a fresh copy) and upload it again.');
    }
    if (e?.name === 'InvalidPDFException') {
      throw new Error('This file could not be opened as a PDF — it may be corrupted or not a real PDF. Try exporting it again, or upload a DOCX/TXT.');
    }
    throw new Error('This file could not be opened as a PDF — it may be corrupted or not a real PDF.');
  }

  const numPages: number = doc.numPages;
  let authorHint = '';
  try {
    const meta = await doc.getMetadata();
    authorHint = personFromMeta(meta?.info);
  } catch {
    /* metadata is optional */
  }

  // ── Stage 1 — text layer ───────────────────────────────────────────────────
  const textPages: string[] = [];
  const needsOcr: boolean[] = [];
  /** Pages with some text that may still hide a scanned column in an image. */
  const imageMerge: boolean[] = [];
  let textChars = 0;

  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    let t = '';
    try {
      t = await extractPageText(page);
    } catch {
      t = '';
    }
    const chars = countChars(t);
    textChars += chars;
    textPages.push(t);
    const thin = opts.forceOcr === true || chars < THIN_PAGE_CHARS || looksLikeGarbage(t);
    needsOcr.push(thin);
    imageMerge.push(!thin && chars < 900);
    page.cleanup?.();
    onProgress?.({ stage: `Reading text layer — page ${i}/${numPages}`, pct: 4 + (i / numPages) * 40 });
  }

  const perPage = textChars / Math.max(1, numPages);
  const looksScanned = perPage < SCANNED_THRESHOLD;
  const warnings: string[] = [];
  let method: PdfExtractMethod = 'text';
  let ocrChars = 0;
  let ocrPages = 0;
  let confidenceSum = 0;
  let assetMode: string | null = null;
  let photoDataUrl: string | undefined;
  let usedEmbedded = false;

  // ── Stage 2 — OCR the pages that need it ───────────────────────────────────
  const pagesToOcr = Math.min(numPages, OCR_MAX_PAGES);
  const ocrTargets = needsOcr.slice(0, pagesToOcr).filter(Boolean).length;
  const mergeTargets = imageMerge.slice(0, pagesToOcr).filter(Boolean).length;
  let ocrDone = 0;

  if (ocrTargets > 0 || mergeTargets > 0) {
    try {
      if (looksScanned) onProgress?.({ stage: 'Scanned PDF detected — starting OCR…', pct: 46 });
      let mode: string | null = null;
      try {
        mode = await ocrAssetMode(opts.ocr);
      } catch {
        /* probe failure is not fatal — the engine reports its own errors */
      }
      assetMode = mode;
      const slots = Math.max(1, ocrTargets + mergeTargets);

      for (let i = 1; i <= numPages && ocrDone < OCR_MAX_PAGES; i++) {
        const must = needsOcr[i - 1] === true;
        const maybe = imageMerge[i - 1] === true;
        if (!must && !maybe) continue;
        const page = await doc.getPage(i);

        let gray: GrayImage | null = null;
        let via = 'none';
        if (!must) {
          // Don't paint a page we already have text for. Only recover a real
          // embedded scan (the other column of a designed resume).
          try { await page.getOperatorList(); } catch { /* ignore */ }
          const assets = classifyImages(collectPdfImages(page));
          if (assets.photoDataUrl && !photoDataUrl) photoDataUrl = assets.photoDataUrl;
          gray = assets.scans.find((s) => !isMostlyBlank(s)) || null;
          via = gray ? 'embedded' : 'none';
          if (!gray) { page.cleanup?.(); continue; }
        } else {
          const recovered = await pageImageForOcr(page, i, opts);
          gray = recovered.gray;
          via = recovered.via;
          if (recovered.photo && !photoDataUrl) photoDataUrl = recovered.photo;
          if (via.startsWith('embedded')) usedEmbedded = true;
          if (!gray || (isMostlyBlank(gray) && via !== 'embedded-faint')) {
            warnings.push(`Page ${i} looked like a blank white page and no embedded scan could be read.`);
            page.cleanup?.();
            continue;
          }
        }

        const slot = ocrDone;
        const out = await ocrGrayPage(gray, {
          ...(opts.ocr || {}),
          isFirstPage: i === 1,
          onProgress: (p) => onProgress?.({
            stage: via.startsWith('embedded')
              ? `Page ${i}/${numPages} · reading the scanned page image · ${p.stage}`
              : `Page ${i}/${numPages} · ${p.stage}`,
            pct: 46 + ((slot + p.pct / 100) / slots) * 48,
          }),
        });
        ocrDone++;
        page.cleanup?.();

        const textLayer = textPages[i - 1] || '';
        if (!out.text.trim()) continue;
        // Never throw a source away. The stronger pass leads; unique lines
        // from the other pass are kept so a sidebar or a scanned column
        // cannot silently disappear.
        const leadWithOcr = opts.forceOcr === true
          || countChars(textLayer) < SCANNED_THRESHOLD
          || ocrQuality(out.text) > ocrQuality(textLayer) + 4;
        textPages[i - 1] = leadWithOcr ? unionText(out.text, textLayer) : unionText(textLayer, out.text);
        ocrChars += countChars(out.text);
        ocrPages++;
        confidenceSum += out.confidence;
      }

      if (ocrPages > 0) {
        method = textChars > 120 ? 'mixed' : 'ocr';
        warnings.push(
          looksScanned
            ? `Scanned/image PDF — text was read with the built-in OCR engine (${assetMode === 'cdn' ? 'downloaded once from the CDN' : 'runs fully offline on your device'}${usedEmbedded ? ', from the page image itself' : ''}). Check dates and numbers.`
            : `${ocrPages} page${ocrPages > 1 ? 's' : ''} had no usable text layer — read with OCR. Check dates and numbers.`,
        );
        if (numPages > OCR_MAX_PAGES) warnings.push(`OCR covered the first ${OCR_MAX_PAGES} pages only.`);
      } else if (ocrTargets > 0) {
        warnings.push('OCR ran but did not find more text than the PDF already contained.');
      }
    } catch (e: any) {
      if (e instanceof OcrUnavailableError) {
        warnings.push(
          `${e.message} (The scan itself is readable — your device just could not start the OCR engine.)`,
        );
      } else {
        warnings.push(`OCR could not run (${e?.message || 'unknown error'}).`);
      }
    } finally {
      doc.destroy?.();
    }
  } else {
    doc.destroy?.();
  }

  // ── Result ────────────────────────────────────────────────────────────────
  const text = textPages.join('\n\n').trim();
  const alnum = countChars(text);

  if (alnum < 20) {
    if (looksScanned || ocrTargets > 0) {
      throw new Error(
        'This PDF is a scanned image and no text could be read from it — the scan may be too dark, blurry or low-resolution. ' +
        'Try re-scanning at 300 DPI, take a fresh photo in bright light (Upload & Edit accepts JPG/PNG photos too), ' +
        'or upload a text-based PDF, DOCX or TXT file.',
      );
    }
    throw new Error('No readable text was found in this PDF. Please upload a text-based PDF, DOCX or TXT file.');
  }

  if (method === 'text' && perPage < 200) {
    warnings.push('Very little text was found — if the result looks incomplete, the PDF may be partly scanned.');
  }
  if (ocrPages > 0) {
    const avg = Math.round(confidenceSum / ocrPages);
    if (avg < 65) {
      warnings.push(`OCR confidence was low (${avg}%). Please double-check names, numbers and dates.`);
    }
  }

  onProgress?.({ stage: 'Done', pct: 100 });
  return {
    text,
    method,
    pages: numPages,
    textChars,
    ocrChars,
    ocrConfidence: ocrPages ? Math.round(confidenceSum / ocrPages) : undefined,
    ocrPages,
    photoDataUrl,
    warning: warnings.length ? warnings.join(' ') : undefined,
  };
}
