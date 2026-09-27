/**
 * Pull decoded images out of a pdf.js page.
 *
 * A scanned "white paper" PDF often has no text layer, and painting it to a
 * canvas can come back blank (soft mask, missing canvas, a white rectangle
 * drawn over the scan). The image bytes are still in the page's XObjects.
 * After getOperatorList() pdf.js has already decoded them into raw pixels —
 * we OCR those pixels instead of the blank canvas.
 */

import { toGray, type GrayImage } from './imaging';

const KIND_1BPP = 1;
const KIND_RGB = 2;
const KIND_RGBA = 3;

export interface PageImages {
  /** Page-sized scans, largest first. */
  scans: GrayImage[];
  /** Small headshot, as a JPEG data URL. Only set in the browser. */
  photoDataUrl?: string;
}

interface PdfImage {
  width: number;
  height: number;
  kind?: number;
  data?: Uint8Array | Uint8ClampedArray;
  bitmap?: CanvasImageSource;
}

export function collectPdfImages(page: any): PdfImage[] {
  const found: PdfImage[] = [];
  const seen = new Set<unknown>();
  const push = (img: any) => {
    if (!img || seen.has(img)) return;
    if (typeof img.width !== 'number' || typeof img.height !== 'number') return;
    if (img.width < 8 || img.height < 8) return;
    if (!img.data && !img.bitmap) return;
    seen.add(img);
    found.push(img as PdfImage);
  };
  for (const store of [page?.objs, page?.commonObjs]) {
    if (!store) continue;
    try {
      if (typeof store[Symbol.iterator] === 'function') {
        for (const entry of store) {
          const data = Array.isArray(entry) ? entry[1] : entry;
          push(data);
        }
      }
    } catch {
      /* store not iterable in this build */
    }
  }
  return found;
}

export function pdfImageToGray(img: PdfImage): GrayImage | null {
  const w = img.width;
  const h = img.height;
  if (!img.data || w < 2 || h < 2) return null;
  const src = img.data;
  const kind = img.kind;
  if (kind === KIND_1BPP || (kind == null && src.length === Math.ceil(w / 8) * h)) {
    return { data: unpack1bpp(src, w, h), width: w, height: h };
  }
  if (kind === KIND_RGBA || src.length === w * h * 4) {
    return packGray(src, w, h, 4);
  }
  if (kind === KIND_RGB || src.length === w * h * 3) {
    return packGray(src, w, h, 3);
  }
  if (src.length === w * h) {
    return { data: Uint8ClampedArray.from(src), width: w, height: h };
  }
  return null;
}

function packGray(src: Uint8Array | Uint8ClampedArray, w: number, h: number, stride: number): GrayImage {
  const out = new Uint8ClampedArray(w * h);
  for (let p = 0, i = 0; p < out.length; p++, i += stride) {
    out[p] = 0.299 * src[i] + 0.587 * src[i + 1] + 0.114 * src[i + 2];
  }
  return { data: out, width: w, height: h };
}

/** pdf.js 1bpp: a set bit is white, a clear bit is black. Rows are byte-padded. */
function unpack1bpp(src: Uint8Array | Uint8ClampedArray, width: number, height: number): Uint8ClampedArray {
  const out = new Uint8ClampedArray(width * height);
  const stride = (width + 7) >> 3;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const byte = src[y * stride + (x >> 3)] ?? 255;
      const on = (byte >> (7 - (x & 7))) & 1;
      out[y * width + x] = on ? 255 : 0;
    }
  }
  return out;
}

export function classifyImages(images: PdfImage[]): PageImages {
  const decoded = images
    .map((img) => ({ img, gray: pdfImageToGray(img) }))
    .filter((x): x is { img: PdfImage; gray: GrayImage } => !!x.gray);
  if (!decoded.length) return { scans: [] };

  const largest = Math.max(...decoded.map((d) => Math.max(d.gray.width, d.gray.height)));
  const scans = decoded
    .filter((d) => {
      const long = Math.max(d.gray.width, d.gray.height);
      const area = d.gray.width * d.gray.height;
      return long >= 480 && (long >= largest * 0.62 || area > 350_000);
    })
    .map((d) => d.gray)
    .sort((a, b) => b.width * b.height - a.width * a.height);

  const portraits = decoded.filter((d) => {
    const w = d.gray.width;
    const h = d.gray.height;
    const long = Math.max(w, h);
    const short = Math.min(w, h);
    if (scans.includes(d.gray)) return false;
    if (long >= largest * 0.62 && largest >= 480) return false;
    if (short < 72 || long > 860) return false;
    const ratio = w / h;
    return ratio > 0.55 && ratio < 1.4;
  });
  portraits.sort((a, b) => b.gray.width * b.gray.height - a.gray.width * a.gray.height);
  const photoDataUrl = portraits[0] ? portraitDataUrl(portraits[0].img) : undefined;
  return { scans: scans.slice(0, 2), photoDataUrl };
}

function portraitDataUrl(img: PdfImage): string | undefined {
  if (typeof document === 'undefined') return undefined;
  try {
    const src = drawImage(img);
    if (!src) return undefined;
    const max = 360;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
  } catch {
    return undefined;
  }
}

function drawImage(img: PdfImage): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  if (img.bitmap) {
    ctx.drawImage(img.bitmap, 0, 0, img.width, img.height);
    return canvas;
  }
  const gray = pdfImageToGray(img);
  if (!gray) return null;
  const imageData = ctx.createImageData(img.width, img.height);
  const dest = imageData.data;
  const src = img.data;
  if (src && (img.kind === KIND_RGBA || src.length === img.width * img.height * 4)) {
    dest.set(src);
  } else if (src && (img.kind === KIND_RGB || src.length === img.width * img.height * 3)) {
    for (let s = 0, d = 0; d < dest.length; s += 3, d += 4) {
      dest[d] = src[s];
      dest[d + 1] = src[s + 1];
      dest[d + 2] = src[s + 2];
      dest[d + 3] = 255;
    }
  } else {
    for (let p = 0, d = 0; p < gray.data.length; p++, d += 4) {
      dest[d] = dest[d + 1] = dest[d + 2] = gray.data[p];
      dest[d + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
