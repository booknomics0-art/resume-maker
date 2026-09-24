/**
 * CraftCV PDF Extraction Engine
 * ─────────────────────────────
 * Replaces the old "read raw bytes and grep parentheses" hack that produced
 * garbage for any real-world (compressed) PDF.
 *
 * Two-stage pipeline, 100% in the browser (no server upload):
 *   1. TEXT LAYER  — pdf.js (Mozilla) walks the real PDF structure, decompresses
 *      content streams and returns positioned text items. We reconstruct lines
 *      and paragraphs from item coordinates. Works for ~95% of resumes
 *      (Word / Google Docs / Canva / LaTeX exports).
 *   2. OCR FALLBACK — if a page has (almost) no text layer it is a scanned /
 *      image PDF. We render each page to a canvas via pdf.js and run
 *      tesseract.js OCR on it (also in-browser). The better result per page wins.
 */

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
  warning?: string;
}

/** Max pages we are willing to OCR (OCR is heavy; resumes are 1-3 pages). */
const OCR_MAX_PAGES = 8;
/** Below this many chars/page we consider the PDF "scanned". */
const SCANNED_THRESHOLD = 40;

// ─────────────────────────────────────────────────────────────────────────────
// pdf.js loader (dynamic import keeps it out of the main bundle)
// ─────────────────────────────────────────────────────────────────────────────

let pdfjsMod: any = null;
let customWorkerUrl: string | null = null;

/** The app entry sets this from `pdfjs-dist/build/pdf.worker.min.mjs?url`. */
export function setPdfWorkerUrl(url: string) {
  customWorkerUrl = url;
}

async function getPdfjs(): Promise<any> {
  if (!pdfjsMod) {
    const lib: any = await import('pdfjs-dist');
    if (customWorkerUrl) lib.GlobalWorkerOptions.workerSrc = customWorkerUrl;
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
  const chunks: Chunk[] = [];
  for (const it of tc.items as any[]) {
    if (!it.str || !it.str.trim()) continue;
    chunks.push({
      str: it.str,
      x: it.transform[4],
      y: it.transform[5],
      w: typeof it.width === 'number' ? it.width : 0,
    });
  }
  return chunksToText(chunks);
}

// ─────────────────────────────────────────────────────────────────────────────
// OCR fallback (scanned PDFs)
// ─────────────────────────────────────────────────────────────────────────────

async function ocrDocument(
  doc: any,
  numPages: number,
  onProgress?: (p: PdfProgress) => void,
): Promise<string[]> {
  const Tesseract: any = await import('tesseract.js');
  const pagesToOcr = Math.min(numPages, OCR_MAX_PAGES);
  let ocrPageDone = 0;
  const worker = await Tesseract.createWorker('eng', 1, {
    logger: (m: any) => {
      if (!onProgress) return;
      const status = String(m.status || '');
      const p = Number(m.progress || 0);
      if (status.includes('loading') || status.includes('initializ')) {
        onProgress({ stage: 'Loading OCR engine (first run only)…', pct: 55 + p * 5 });
      } else if (status.includes('recognizing')) {
        // spread recognition progress of each page across the remaining range
        onProgress({
          stage: `Running OCR — reading scanned text…`,
          pct: 60 + ((ocrPageDone + p) / pagesToOcr) * 38,
        });
      }
    },
  });
  try {
    await worker.setParameters({ preserve_interword_spaces: '1', user_defined_dpi: '300' });
    const out: string[] = [];
    for (let i = 1; i <= pagesToOcr; i++) {
      ocrPageDone = i - 1;
      const page = await doc.getPage(i);
      const canvas = await renderPageToCanvas(page);
      const res = await worker.recognize(canvas);
      let text = res.data.text || '';

      // Page 1 extra pass: very large/stylized title lines (name!) are sometimes
      // skipped by the default segmentation. A sparse-text pass recovers them.
      if (i === 1) {
        try {
          await worker.setParameters({ tessedit_pageseg_mode: '11' });
          const res2 = await worker.recognize(canvas);
          await worker.setParameters({ tessedit_pageseg_mode: '3' });
          text = mergeTitleLines(text, res2.data.text || '');
        } catch {
          /* second pass is best-effort */
        }
      }

      out.push(cleanOcrText(text));
      if (i < pagesToOcr) page.cleanup?.();
    }
    return out;
  } finally {
    await worker.terminate?.();
  }
}

/**
 * Prepend lines from the sparse pass that the main pass completely missed
 * (typically the big name header). Containment filter keeps it conservative.
 */
function mergeTitleLines(main: string, sparse: string): string {
  const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const mainNorm = norm(main);
  if (!mainNorm) return sparse || main;
  const sparseLines = sparse.split('\n').map(l => l.trim()).filter(Boolean).slice(0, 6);
  const missing = sparseLines.filter(l => {
    const n = norm(l);
    return n.length >= 4 && !mainNorm.includes(n);
  });
  if (!missing.length) return main;
  return [...missing, ...main.split('\n')].join('\n');
}

let ocrPageDone = 0;

async function renderPageToCanvas(page: any): Promise<HTMLCanvasElement> {
  const vp1 = page.getViewport({ scale: 1 });
  // ~200 DPI but never exceed 2200px on the long edge (OCR speed/quality balance)
  const scale = Math.min(2.6, 2200 / Math.max(vp1.width, vp1.height));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(viewport.width));
  canvas.height = Math.max(1, Math.floor(viewport.height));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported in this browser');
  await page.render({ canvasContext: ctx, viewport }).promise;
  return canvas;
}

function cleanOcrText(t: string): string {
  return t
    .replace(/\r/g, '')
    .replace(/(\w)-\n(\w)/g, '$1$2') // de-hyphenate line breaks
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

const countChars = (s: string) => s.replace(/\s/g, '').length;

export async function extractPdfSmart(
  file: File,
  onProgress?: (p: PdfProgress) => void,
  forceOcr = false,
): Promise<PdfExtractResult> {
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
  } catch {
    throw new Error('This file could not be opened as a PDF — it may be corrupted or not a real PDF.');
  }

  const numPages: number = doc.numPages;

  // Stage 1 — text layer
  const textPages: string[] = [];
  let textChars = 0;
  for (let i = 1; i <= numPages; i++) {
    const page = await doc.getPage(i);
    const t = await extractPageText(page);
    textPages.push(t);
    textChars += countChars(t);
    page.cleanup?.();
    onProgress?.({ stage: `Extracting text — page ${i}/${numPages}`, pct: 4 + (i / numPages) * 50 });
  }

  const perPage = textChars / Math.max(1, numPages);
  const looksScanned = perPage < SCANNED_THRESHOLD;
  const warnings: string[] = [];
  let method: PdfExtractMethod = 'text';
  let ocrChars = 0;

  // Stage 2 — OCR fallback when needed (or forced by the user)
  if (forceOcr || looksScanned) {
    try {
      onProgress?.({ stage: looksScanned ? 'Scanned PDF detected — starting OCR…' : 'Running OCR…', pct: 55 });
      const ocrPages = await ocrDocument(doc, numPages, onProgress);
      // merge per page: OCR text wins only when it clearly recovered more
      let ocrUsed = false;
      const merged = textPages.map((t, i) => {
        const o = ocrPages[i] || '';
        const oc = countChars(o);
        if (oc > countChars(t) * 1.5 && oc > 40) {
          ocrUsed = true;
          ocrChars += oc;
          return o;
        }
        return t;
      });
      if (ocrUsed) {
        method = textChars > 50 ? 'mixed' : 'ocr';
        textPages.length = 0;
        textPages.push(...merged);
        if (method === 'ocr') warnings.push('Scanned/image PDF — text was recovered using in-browser OCR.');
        else warnings.push('Some pages were images — OCR was used to read them.');
        if (numPages > OCR_MAX_PAGES) warnings.push(`OCR covered the first ${OCR_MAX_PAGES} pages only.`);
      } else if (forceOcr) {
        warnings.push('OCR ran but did not find additional text.');
      }
    } catch (e: any) {
      warnings.push(`OCR could not run (${e?.message || 'unknown error'}).`);
    }
  }

  if (method === 'text' && perPage < 200 && textChars > 0) {
    warnings.push('Very little text was found — if results look incomplete, the PDF may be partly scanned.');
  }
  if (method === 'text' && looksScanned) {
    throw new Error(
      'This PDF has no readable text (it is a scanned image) and OCR could not recover it. Please upload a text-based PDF, DOCX or TXT file.',
    );
  }

  onProgress?.({ stage: 'Done', pct: 100 });
  return {
    text: textPages.join('\n\n'),
    method,
    pages: numPages,
    textChars,
    ocrChars,
    warning: warnings.length ? warnings.join(' ') : undefined,
  };
}
