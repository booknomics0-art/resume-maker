/**
 * PDF import test — both halves of the pipeline in one run:
 *
 *   A. TEXT PDF     — a realistic compressed (FlateDecode) resume, the kind
 *                     Word/Canva/Google Docs export. Must go through the
 *                     pdf.js text layer, with NO OCR and complete fields.
 *
 *   B. SCANNED PDF  — the same photographed resume embedded as a JPEG image
 *                     page (DCTDecode), i.e. exactly the file shape that used
 *                     to fail with
 *                     "This PDF has no readable text (it is a scanned image)
 *                      and OCR could not recover it."
 *                     It must now come back fully parsed, via OCR.
 *
 * pdf.js cannot rasterise pages in a plain Node process, so the test injects a
 * renderer that decodes the same JPEG the PDF embeds. Every other stage —
 * page/text-layer analysis, scanned-page detection, preprocessing, Tesseract,
 * section detection, field mapping — is the production code.
 *
 *   npm run test:pdf
 */

import fs from 'node:fs';
import zlib from 'node:zlib';
import { join } from 'node:path';
import { buildLibs, checks, getCanvas, grayFromImageFile, pngFromGray, skip, tmpDir, LANG_PATH, SCAN_JPG } from './_harness.mjs';
import { mkdirSync } from 'node:fs';

if (!(await getCanvas())) {
  skip('@napi-rs/canvas is not installed — skipping pixel tests (npm i -D @napi-rs/canvas)');
}

const { parser } = await buildLibs();

// ── minimal PDF writers ─────────────────────────────────────────────────────

/** Text PDF with a compressed content stream (like Word/Canva output). */
function buildTextPdf(lines) {
  let content = 'BT\n';
  let lastSize = null;
  for (const l of lines) {
    if (l.size !== lastSize) {
      content += `/F1 ${l.size} Tf\n`;
      lastSize = l.size;
    }
    const esc = l.text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    content += `1 0 0 1 ${l.x} ${l.y} Tm (${esc}) Tj\n`;
  }
  content += 'ET';
  const stream = zlib.deflateSync(Buffer.from(content, 'latin1'));
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    { stream, dict: `/Length ${stream.length} /Filter /FlateDecode` },
  ]);
}

/** Image-only ("scanned") PDF: one page showing a JPEG. */
function buildScannedPdf(jpeg) {
  const content = 'q 612 0 0 792 0 0 cm /Im0 Do Q';
  return assemblePdf([
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>',
    { stream: Buffer.from(content, 'latin1'), dict: `/Length ${content.length}` },
    { raw: jpeg, dict: `/Length ${jpeg.length} /Filter /DCTDecode /Width 768 /Height 1376 /ColorSpace /DeviceRGB /BitsPerComponent 8` },
  ]);
}

function assemblePdf(objs) {
  objs = [null, ...objs];
  let out = '%PDF-1.4\n';
  const offsets = [0];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(out, 'latin1');
    const o = objs[i];
    if (typeof o === 'string') {
      out += `${i} 0 obj\n${o}\nendobj\n`;
    } else if (o.raw) {
      out += `${i} 0 obj\n<< /Type /XObject /Subtype /Image ${o.dict} >>\nstream\n`;
      out = Buffer.concat([Buffer.from(out, 'latin1'), o.raw, Buffer.from('\nendstream\nendobj\n', 'latin1')]).toString('latin1');
    } else {
      out += `${i} 0 obj\n<< ${o.dict} >>\nstream\n${o.stream.toString('latin1')}\nendstream\nendobj\n`;
    }
  }
  const xref = Buffer.byteLength(out, 'latin1');
  out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  out += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(out, 'latin1');
}

// ── A. text PDF ─────────────────────────────────────────────────────────────

const lines = [];
let y = 750;
const line = (text, { x = 72, size = 10, dy = 14 } = {}) => { lines.push({ x, y, size, text }); y -= dy; };
const gap = (n = 10) => { y -= n; };

line('AARAV SHARMA', { x: 200, size: 20, dy: 22 });
line('Frontend Developer', { x: 230, size: 12, dy: 18 });
line('Pune, Maharashtra | +91 98765 43210 | aarav.sharma@gmail.com', { x: 110 });
line('linkedin.com/in/aaravsharma', { x: 150 });
gap(8);
line('PROFESSIONAL SUMMARY', { size: 13 });
line('Frontend developer with 3+ years of experience building responsive web', { dy: 13 });
line('applications using React and TypeScript.', { dy: 16 });
gap(6);
line('WORK EXPERIENCE', { size: 13 });
line('Software Engineer | TCS, Pune', { size: 11 });
line('Jan 2022 - Present');
line('- Built 12+ reusable React components used across 4 products', { dy: 12 });
line('- Improved page load time by 38% via code-splitting', { dy: 16 });
line('Web Developer Intern | Infosys, Bengaluru', { size: 11 });
line('May 2021 - Dec 2021');
line('- Developed dashboard UI with React and REST API integration', { dy: 16 });
gap(6);
line('EDUCATION', { size: 13 });
line('B.Tech Computer Science, Savitribai Phule Pune University', { dy: 14 });
line('2020 - 2024 | CGPA 8.6', { dy: 16 });
gap(6);
line('TECHNICAL SKILLS', { size: 13 });
line('JavaScript, TypeScript, React, Node.js, MySQL, Docker', { dy: 16 });
gap(6);
line('CERTIFICATIONS', { size: 13 });
line('Meta Front-End Developer - Coursera - 2023', { dy: 16 });
gap(6);
line('ACHIEVEMENTS', { size: 13 });
line('- Winner, Smart India Hackathon 2023 (team of 6)', { dy: 12 });

mkdirSync(tmpDir, { recursive: true });
const textPdfPath = join(tmpDir, 'sample-resume.pdf');
fs.writeFileSync(textPdfPath, buildTextPdf(lines));
console.log(`built ${textPdfPath}`);

const textFile = new File([fs.readFileSync(textPdfPath)], 'sample-resume.pdf', { type: 'application/pdf' });
const textRes = await parser.parseResumeFile(textFile, { onProgress: (p) => process.stdout.write(`\r  [${String(Math.round(p.pct)).padStart(3)}%] ${p.stage.padEnd(58)}`) });
process.stdout.write('\r' + ' '.repeat(80) + '\r');
const tr = textRes.resume;

console.log('── A. text-based PDF ──');
console.log(`format=${textRes.format} method=${textRes.meta?.method} ocrPages=${textRes.meta?.ocrPages ?? 0}`);
const aChecks = [
  ['no error', !textRes.error],
  ['read from the text layer, without OCR', textRes.meta?.method === 'text' && (textRes.meta?.ocrPages || 0) === 0],
  ['name', tr?.personal.fullName === 'AARAV SHARMA'],
  ['headline', /frontend developer/i.test(tr?.personal.headline || '')],
  ['email', tr?.personal.email === 'aarav.sharma@gmail.com'],
  ['phone', String(tr?.personal.phone).replace(/\D/g, '').endsWith('9876543210')],
  ['city', /pune/i.test(tr?.personal.city || '')],
  ['2 jobs', (tr?.experience.length || 0) >= 2],
  ['job dates', /jan 2022/i.test(tr?.experience[0]?.start || '') && tr?.experience[0]?.current === true],
  ['education', /b\.?tech/i.test(tr?.education[0]?.degree || '')],
  ['skills', (tr?.skills.length || 0) >= 4 && tr.skills.some((s) => /react/i.test(s))],
  ['certification', (tr?.certs.length || 0) >= 1],
  ['no PDF internals leaked into the text', !/%PDF|endobj|FlateDecode/.test(textRes.text)],
];

// ── B. scanned / image-only PDF (the reported failing case) ─────────────────

const scannedPdfPath = join(tmpDir, 'scanned-resume.pdf');
fs.writeFileSync(scannedPdfPath, buildScannedPdf(fs.readFileSync(SCAN_JPG)));
console.log(`built ${scannedPdfPath} (image-only page — the file that used to fail)`);

const scannedFile = new File([fs.readFileSync(scannedPdfPath)], 'scanned-resume.pdf', { type: 'application/pdf' });
let sawScannedDetection = false;
const t1 = Date.now();
const scanRes = await parser.parseResumeFile(scannedFile, {
  ocr: { langPath: LANG_PATH, toSource: (g) => pngFromGray(g) },
  // pdf.js would rasterise the page here; Node decodes the embedded image
  renderPage: async () => grayFromImageFile(SCAN_JPG),
  onProgress: (p) => {
    if (/scanned pdf detected/i.test(p.stage)) sawScannedDetection = true;
    process.stdout.write(`\r  [${String(Math.round(p.pct)).padStart(3)}%] ${p.stage.padEnd(58)}`);
  },
});
process.stdout.write('\r' + ' '.repeat(84) + '\r');
const sr = scanRes.resume;

console.log('── B. scanned (image-only) PDF ──');
console.log(`took ${((Date.now() - t1) / 1000).toFixed(1)}s · method=${scanRes.meta?.method} ocrPages=${scanRes.meta?.ocrPages} confidence=${scanRes.meta?.ocrConfidence}%`);
console.log(`warning: ${scanRes.meta?.warning || '—'}`);
if (scanRes.error) console.log(`error: ${scanRes.error}`);
console.log(`parsed: ${sr?.personal.fullName} · ${sr?.personal.email} · ${sr?.personal.phone} · ${sr?.personal.city} → ${sr?.experience[0]?.role} @ ${sr?.experience[0]?.company}`);

const bChecks = [
  ['no error (the reported bug)', !scanRes.error],
  ['scanned page was detected automatically', sawScannedDetection],
  ['text came back through OCR', scanRes.meta?.method === 'ocr' && (scanRes.meta?.ocrPages || 0) >= 1],
  ['user is told OCR was used', /ocr/i.test(scanRes.meta?.warning || '')],
  ['error is NOT the old dead-end message', !/could not recover it/i.test(scanRes.error || '')],
  ['name', /rahul\s+verma/i.test(sr?.personal.fullName || '')],
  ['email', sr?.personal.email === 'rahul.verma@gmail.com'],
  ['phone', String(sr?.personal.phone).replace(/\D/g, '').endsWith('9820011223')],
  ['city', /mumbai/i.test(sr?.personal.city || '')],
  ['headline', /developer/i.test(sr?.personal.headline || '')],
  ['company', /tcs/i.test(sr?.experience[0]?.company || '')],
  ['dates', /jun 2021/i.test(sr?.experience[0]?.start || '') && sr?.experience[0]?.current === true],
  ['bullets/best experience', (sr?.experience[0]?.bullets || []).length >= 1],
  ['skills', (sr?.skills.length || 0) >= 3],
];

const ok = checks([...aChecks, ...bChecks]);
process.exit(ok ? 0 : 1);
