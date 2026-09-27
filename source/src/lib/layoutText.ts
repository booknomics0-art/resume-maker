/**
 * Reading-order reconstruction for PDF text.
 *
 * pdf.js hands back text items in content-stream order, which is not reading
 * order on two-column / sidebar resumes. Interleaving the columns is the main
 * reason an import used to fill the name and then drop experience or skills.
 *
 * This walks positioned items into visual lines, detects a real column gap,
 * and emits header → left column → right column so each section stays intact.
 * A single-column page (the common Word export) is returned top-to-bottom,
 * unchanged in substance.
 */

export interface PositionedItem {
  str: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Line {
  y: number;
  x: number;
  w: number;
  h: number;
  text: string;
  items: PositionedItem[];
}

export function itemsToText(items: PositionedItem[], pageWidth = 0): string {
  const usable = items.filter((it) => it.str && it.str.replace(/\s/g, '').length > 0);
  if (!usable.length) return '';

  const heights = usable.map((it) => it.h || 0).filter((h) => h > 1 && h < 80).sort((a, b) => a - b);
  const medH = heights.length ? heights[Math.floor(heights.length / 2)] : 11;
  const yTol = Math.max(2.4, medH * 0.45);
  const width = pageWidth > 0
    ? pageWidth
    : Math.max(...usable.map((it) => it.x + Math.max(it.w, 1))) * 1.05;

  const sorted = [...usable].sort((a, b) => {
    if (Math.abs(a.y - b.y) <= yTol) return a.x - b.x;
    return b.y - a.y;
  });

  const lines: Line[] = [];
  for (const it of sorted) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(it.y - last.y) <= yTol) {
      last.items.push(it);
      continue;
    }
    lines.push({ y: it.y, x: it.x, w: it.w, h: it.h || medH, text: '', items: [it] });
  }

  for (const line of lines) {
    line.items.sort((a, b) => a.x - b.x);
    line.x = line.items[0].x;
    const end = line.items[line.items.length - 1];
    line.w = Math.max(1, end.x + Math.max(end.w, 1) - line.x);
    line.h = Math.max(...line.items.map((it) => it.h || medH));
    line.text = joinItems(line.items, medH);
  }

  return paragraphize(orderColumns(lines.filter((l) => l.text), width));
}

function joinItems(items: PositionedItem[], medH: number): string {
  let text = '';
  let prevEnd: number | null = null;
  for (const it of items) {
    const w = it.w > 0 ? it.w : Math.max(it.str.length, 1) * (it.h || medH) * 0.45;
    if (prevEnd !== null) {
      const gap = it.x - prevEnd;
      if (gap > Math.max(1.6, (it.h || medH) * 0.22)) text += gap > (it.h || medH) * 2.8 ? '   ' : ' ';
      else if (gap < -1.5) text += ' ';
    }
    text += it.str;
    prevEnd = it.x + w;
  }
  return text.replace(/[ \t]{2,}/g, (m) => (m.length >= 3 ? '   ' : ' ')).replace(/\s+$/g, '').trim();
}

function findColumnGap(lines: Line[], pageWidth: number): { start: number; end: number } | null {
  if (lines.length < 8 || pageWidth < 80) return null;
  const bins = 40;
  const bw = pageWidth / bins;
  const cov = new Float64Array(bins);
  let counted = 0;
  for (const l of lines) {
    if (l.w > pageWidth * 0.72) continue;
    counted++;
    const a = Math.max(0, Math.min(bins - 1, Math.floor(l.x / bw)));
    const b = Math.max(0, Math.min(bins - 1, Math.floor((l.x + l.w) / bw)));
    for (let i = a; i <= b; i++) cov[i]++;
  }
  if (counted < 6) return null;

  const lo = Math.floor(bins * 0.18);
  const hi = Math.floor(bins * 0.82);
  let bestI = -1;
  let bestV = Infinity;
  for (let i = lo; i <= hi; i++) {
    if (cov[i] < bestV) { bestV = cov[i]; bestI = i; }
  }
  if (bestI < 0 || bestV > counted * 0.08) return null;

  let s = bestI;
  let e = bestI;
  const valley = counted * 0.1;
  while (s > 1 && cov[s - 1] <= valley) s--;
  while (e < bins - 2 && cov[e + 1] <= valley) e++;
  const gapW = (e - s + 1) * bw;
  if (gapW < Math.max(10, pageWidth * 0.035)) return null;

  let leftMass = 0;
  let rightMass = 0;
  for (let i = 0; i < s; i++) leftMass += cov[i];
  for (let i = e + 1; i < bins; i++) rightMass += cov[i];
  if (leftMass < counted * 0.35 || rightMass < counted * 0.35) return null;
  return { start: s * bw, end: (e + 1) * bw };
}

function orderColumns(lines: Line[], pageWidth: number): Line[] {
  const gap = findColumnGap(lines, pageWidth);
  if (!gap) return lines;

  const spans = (l: Line) => l.w > pageWidth * 0.62 || (l.x < gap.start - 6 && l.x + l.w > gap.end + 6);
  const onLeft = (l: Line) => !spans(l) && l.x + l.w <= gap.end + 8;
  const onRight = (l: Line) => !spans(l) && l.x >= gap.start - 8;
  const leftN = lines.filter(onLeft).length;
  const rightN = lines.filter(onRight).length;
  if (leftN < 3 || rightN < 3) return lines;

  const out: Line[] = [];
  let i = 0;
  while (i < lines.length) {
    if (spans(lines[i])) {
      out.push(lines[i]);
      i++;
      continue;
    }
    const band: Line[] = [];
    while (i < lines.length && !spans(lines[i])) band.push(lines[i++]);
    out.push(...band.filter(onLeft), ...band.filter((l) => !onLeft(l) && !onRight(l)), ...band.filter(onRight));
  }

  // The name almost always sits in the top band. Pull that band forward so a
  // long left sidebar cannot bury it under skills.
  const yMax = Math.max(...lines.map((l) => l.y));
  const yMin = Math.min(...lines.map((l) => l.y));
  const span = Math.max(1, yMax - yMin);
  const topCut = yMax - span * 0.16;
  const top = lines.filter((l) => l.y >= topCut);
  if (top.length > 0 && top.length < lines.length * 0.45) {
    const topSet = new Set(top);
    return [...top, ...out.filter((l) => !topSet.has(l))];
  }
  return out;
}

function paragraphize(lines: Line[]): string {
  if (!lines.length) return '';
  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    if (g > 0.5 && g < 90) gaps.push(g);
  }
  gaps.sort((a, b) => a - b);
  const median = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 13;
  const threshold = Math.max(median * 1.7, median + 4);
  let out = lines[0].text;
  for (let i = 1; i < lines.length; i++) {
    const g = lines[i - 1].y - lines[i].y;
    // g < 0 means we jumped back up into the next column.
    out += (g < -1 || g > threshold ? '\n\n' : '\n') + lines[i].text;
  }
  return out;
}
