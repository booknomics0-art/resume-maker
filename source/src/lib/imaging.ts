/**
 * CraftCV imaging — pure pixel helpers used to make scanned/photographed
 * resumes readable by OCR.
 *
 * Everything here works on a plain grayscale buffer ({ data, width, height })
 * so it runs identically in the browser (on a canvas) and in Node tests
 * (on @napi-rs/canvas) with zero DOM dependencies.
 *
 * Pipeline that actually recovers text from a phone photo of a resume:
 *   grayscale → percentile contrast stretch → page crop → (Otsu | Sauvola) →
 *   optional unsharp mask.
 * Verified against tests/scan-resume.jpg (a real photographed resume):
 * unprocessed recognition was unreliable; stretch + crop + Otsu reads the whole
 * document, including the name line and the date ranges.
 */

export interface GrayImage {
  data: Uint8ClampedArray;
  width: number;
  height: number;
}

export interface RgbImage {
  data: Uint8ClampedArray; // RGBA, like ImageData
  width: number;
  height: number;
}

const LUM_R = 0.299;
const LUM_G = 0.587;
const LUM_B = 0.114;

/** RGBA (ImageData) → single-channel grayscale. */
export function toGray(src: RgbImage): GrayImage {
  const n = src.width * src.height;
  const out = new Uint8ClampedArray(n);
  const d = src.data;
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    out[p] = LUM_R * d[i] + LUM_G * d[i + 1] + LUM_B * d[i + 2];
  }
  return { data: out, width: src.width, height: src.height };
}

/** Grayscale → RGBA, ready to put back on a canvas. */
export function toRgba(src: GrayImage): RgbImage {
  const n = src.width * src.height;
  const out = new Uint8ClampedArray(n * 4);
  for (let p = 0, i = 0; p < n; p++, i += 4) {
    const v = src.data[p];
    out[i] = v; out[i + 1] = v; out[i + 2] = v; out[i + 3] = 255;
  }
  return { data: out, width: src.width, height: src.height };
}

/**
 * Percentile contrast stretch. Photos of paper have a compressed dynamic range
 * (the "white" of the page sits around 150–210), which is the single biggest
 * cause of lost characters. Stretching 2%–99% of the histogram to 0–255
 * recovers that range without clipping the ink.
 */
export function contrastStretch(src: GrayImage, loPct = 0.02, hiPct = 0.985): GrayImage {
  const hist = new Uint32Array(256);
  for (let i = 0; i < src.data.length; i++) hist[src.data[i]]++;
  const total = src.data.length;
  let acc = 0;
  let lo = 0;
  let hi = 255;
  for (let v = 0; v < 256; v++) {
    acc += hist[v];
    if (acc >= total * loPct) { lo = v; break; }
  }
  acc = 0;
  for (let v = 255; v >= 0; v--) {
    acc += hist[v];
    if (acc >= total * (1 - hiPct)) { hi = v; break; }
  }
  const span = Math.max(1, hi - lo);
  const out = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < src.data.length; i++) {
    const v = ((src.data[i] - lo) / span) * 255;
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return { data: out, width: src.width, height: src.height };
}

/** Otsu's method — the global threshold that best separates ink from paper. */
export function otsuThreshold(src: GrayImage): number {
  const hist = new Uint32Array(256);
  for (let i = 0; i < src.data.length; i++) hist[src.data[i]]++;
  const total = src.data.length;
  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * hist[v];
  let sumB = 0;
  let wB = 0;
  let best = 0;
  let thr = 128;
  for (let v = 0; v < 256; v++) {
    wB += hist[v];
    if (!wB) continue;
    const wF = total - wB;
    if (!wF) break;
    sumB += v * hist[v];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; thr = v; }
  }
  return thr;
}

/** Hard black/white conversion (fast, great for clean scans). */
export function binarizeOtsu(src: GrayImage): GrayImage {
  const thr = otsuThreshold(src);
  const out = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < src.data.length; i++) out[i] = src.data[i] > thr ? 255 : 0;
  return { data: out, width: src.width, height: src.height };
}

/**
 * Sauvola adaptive threshold (integral-image version, O(n)).
 * Handles the uneven lighting you get from a phone photo: a shadow across one
 * corner of the page no longer swallows the text in it.
 */
export function adaptiveThreshold(src: GrayImage, radius = 16, k = 0.32): GrayImage {
  const { width: w, height: h } = src;
  const stride = w + 1;
  const integral = new Float64Array(stride * (h + 1));
  const integralSq = new Float64Array(stride * (h + 1));
  for (let y = 0; y < h; y++) {
    let rowSum = 0;
    let rowSumSq = 0;
    for (let x = 0; x < w; x++) {
      const v = src.data[y * w + x];
      rowSum += v;
      rowSumSq += v * v;
      integral[(y + 1) * stride + (x + 1)] = integral[y * stride + (x + 1)] + rowSum;
      integralSq[(y + 1) * stride + (x + 1)] = integralSq[y * stride + (x + 1)] + rowSumSq;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    const y0 = y - radius < 0 ? 0 : y - radius;
    const y1 = y + radius >= h ? h - 1 : y + radius;
    for (let x = 0; x < w; x++) {
      const x0 = x - radius < 0 ? 0 : x - radius;
      const x1 = x + radius >= w ? w - 1 : x + radius;
      const area = (y1 - y0 + 1) * (x1 - x0 + 1);
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] - integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] + integral[y0 * stride + x0];
      const sumSq =
        integralSq[(y1 + 1) * stride + (x1 + 1)] - integralSq[y0 * stride + (x1 + 1)] -
        integralSq[(y1 + 1) * stride + x0] + integralSq[y0 * stride + x0];
      const mean = sum / area;
      const variance = Math.max(0, sumSq / area - mean * mean);
      const std = Math.sqrt(variance);
      const t = mean * (1 + k * (std / 128 - 1));
      out[y * w + x] = src.data[y * w + x] > t ? 255 : 0;
    }
  }
  return { data: out, width: w, height: h };
}

/**
 * Faded photocopy / "white paper" rescue. The ink sits only a few levels below
 * the paper, so a normal stretch clips it away. Pull the top of the histogram
 * down to white and sharpen what remains.
 */
export function enhanceFaintInk(src: GrayImage): GrayImage {
  return unsharpMask(contrastStretch(src, 0.002, 0.9), 1.15);
}

/** Negative of the page — some scanner drivers store the scan inverted. */
export function invertGray(src: GrayImage): GrayImage {
  const out = new Uint8ClampedArray(src.data.length);
  for (let i = 0; i < out.length; i++) out[i] = 255 - src.data[i];
  return { data: out, width: src.width, height: src.height };
}

/**
 * A render that failed (or a truly empty page) is almost entirely white.
 * Real paper, even a light scan, has a few percent of pixels darker than the
 * paper. Used to decide "don't OCR this blank canvas, read the embedded image".
 */
export function isMostlyBlank(src: GrayImage): boolean {
  if (!src?.data?.length) return true;
  const step = Math.max(1, Math.floor(src.data.length / 50000));
  let dark = 0;
  let n = 0;
  for (let i = 0; i < src.data.length; i += step) {
    n++;
    if (src.data[i] < 226) dark++;
  }
  return n === 0 || dark / n < 0.005;
}

/** 3×3 unsharp mask — brings back edges that JPEG compression smeared. */
export function unsharpMask(src: GrayImage, amount = 0.8): GrayImage {
  const { width: w, height: h } = src;
  const blur = new Uint8ClampedArray(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let sum = 0;
      let wsum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const yy = y + dy;
        if (yy < 0 || yy >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          if (xx < 0 || xx >= w) continue;
          const k = dx === 0 && dy === 0 ? 4 : dx === 0 || dy === 0 ? 2 : 1;
          sum += src.data[yy * w + xx] * k;
          wsum += k;
        }
      }
      blur[y * w + x] = sum / wsum;
    }
  }
  const out = new Uint8ClampedArray(w * h);
  for (let i = 0; i < out.length; i++) {
    const v = src.data[i] + amount * (src.data[i] - blur[i]);
    out[i] = v < 0 ? 0 : v > 255 ? 255 : v;
  }
  return { data: out, width: w, height: h };
}

function resizeGray(src: GrayImage, nw: number, nh: number): GrayImage {
  const { data, width: w, height: h } = src;
  const out = new Uint8ClampedArray(nw * nh);
  const sx = w / nw;
  const sy = h / nh;
  for (let y = 0; y < nh; y++) {
    const srcY = Math.min(h - 1, y * sy);
    const y0 = Math.floor(srcY);
    const y1 = Math.min(h - 1, y0 + 1);
    const fy = srcY - y0;
    for (let x = 0; x < nw; x++) {
      const srcX = Math.min(w - 1, x * sx);
      const x0 = Math.floor(srcX);
      const x1 = Math.min(w - 1, x0 + 1);
      const fx = srcX - x0;
      const top = data[y0 * w + x0] * (1 - fx) + data[y0 * w + x1] * fx;
      const bot = data[y1 * w + x0] * (1 - fx) + data[y1 * w + x1] * fx;
      out[y * nw + x] = top * (1 - fy) + bot * fy;
    }
  }
  return { data: out, width: nw, height: nh };
}

/**
 * Resize so the long edge lands in the range OCR likes best (≈1400–2400 px for
 * a full page). Never upscales past `maxLong` and never shrinks below
 * `minLong` — a tiny thumbnail gets upscaled, a 4000 px phone photo gets
 * downscaled (which also makes recognition faster).
 */
export function fitForOcr(src: GrayImage, maxLong = 2200, minLong = 1000): GrayImage {
  const long = Math.max(src.width, src.height);
  let scale = 1;
  if (long > maxLong) scale = maxLong / long;
  else if (long < minLong) scale = Math.min(2, minLong / long);
  if (Math.abs(scale - 1) < 0.02) return src;
  return resizeGray(src, Math.max(1, Math.round(src.width * scale)), Math.max(1, Math.round(src.height * scale)));
}

export interface CropResult extends GrayImage {
  cropped: boolean;
  box: [number, number, number, number];
}

/**
 * Trims the dark surroundings from a photo of a page (desk, floor, fingers).
 * A dark border is what makes Tesseract's auto page-segmentation give up, so we
 * keep the largest bright region instead. A no-op for rendered PDF pages.
 */
export function cropToPage(src: GrayImage, brightThr = 110, minKeepRatio = 0.35): CropResult {
  const { data, width: w, height: h } = src;
  const colCount = new Uint32Array(w);
  const rowCount = new Uint32Array(h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y * w + x] > brightThr) {
        colCount[x]++;
        rowCount[y]++;
      }
    }
  }
  let colMax = 0;
  let rowMax = 0;
  for (let x = 0; x < w; x++) if (colCount[x] > colMax) colMax = colCount[x];
  for (let y = 0; y < h; y++) if (rowCount[y] > rowMax) rowMax = rowCount[y];
  if (colMax === 0 || rowMax === 0) return { ...src, cropped: false, box: [0, 0, w - 1, h - 1] };

  const colMin = colMax * 0.5;
  const rowMin = rowMax * 0.5;
  let x0 = 0;
  let x1 = w - 1;
  let y0 = 0;
  let y1 = h - 1;
  while (x0 < w - 1 && colCount[x0] < colMin) x0++;
  while (x1 > x0 && colCount[x1] < colMin) x1--;
  while (y0 < h - 1 && rowCount[y0] < rowMin) y0++;
  while (y1 > y0 && rowCount[y1] < rowMin) y1--;

  const keptArea = (x1 - x0 + 1) * (y1 - y0 + 1);
  if (keptArea < minKeepRatio * w * h) return { ...src, cropped: false, box: [0, 0, w - 1, h - 1] };

  const nw = x1 - x0 + 1;
  const nh = y1 - y0 + 1;
  const cropped = x0 > 2 || y0 > 2 || x1 < w - 3 || y1 < h - 3;
  if (!cropped) return { ...src, cropped: false, box: [0, 0, w - 1, h - 1] };
  const out = new Uint8ClampedArray(nw * nh);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) out[y * nw + x] = data[(y + y0) * w + x + x0];
  }
  return { data: out, width: nw, height: nh, cropped: true, box: [x0, y0, x1, y1] };
}

/**
 * Share of dark pixels. Used as a sanity check after thresholding: a page with
 * almost no ink, or a page that turned nearly black, means the threshold was
 * wrong and the other strategy should be tried too.
 */
export function inkRatio(src: GrayImage, dark = 128): number {
  let count = 0;
  for (let i = 0; i < src.data.length; i++) if (src.data[i] < dark) count++;
  return count / src.data.length;
}

/** Smallest Otsu-thresholded view of the page, for the "is the ink sane" check. */
export function thresholdLooksSane(src: GrayImage): boolean {
  const r = inkRatio(src);
  return r > 0.002 && r < 0.4;
}
