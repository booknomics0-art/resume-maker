/**
 * Regression test for the reported bug:
 *   "This PDF has no readable text (it is a scanned image) and OCR could not
 *    recover it."
 *
 * It runs the *production* preprocessing + OCR pipeline against
 * tests/scan-resume.jpg — a real photo of a resume (dark desk around a slightly
 * rotated page, uneven lighting) — and then pushes the recovered text through
 * the real resume parser, asserting that every field the user cares about lands
 * in the structured resume.
 *
 *   npm run test:ocr
 *   node tests/test-image-ocr.mjs path/to/other-scan.jpg
 *
 * Needs @napi-rs/canvas (dev-only, stands in for the browser canvas):
 *   npm i -D @napi-rs/canvas
 */

import { buildLibs, checks, getCanvas, grayFromImageFile, pngFromGray, skip, LANG_PATH, SCAN_JPG } from './_harness.mjs';

if (!(await getCanvas())) {
  skip('@napi-rs/canvas is not installed — skipping pixel tests (npm i -D @napi-rs/canvas)');
}

const imagePath = process.argv[2] || SCAN_JPG;
const { ocr, parser } = await buildLibs();

console.log(`── OCR pipeline on ${imagePath} ──`);
const gray = await grayFromImageFile(imagePath);
console.log(`image: ${gray.width}×${gray.height}px`);

const t0 = Date.now();
const out = await ocr.ocrGrayPage(gray, {
  isFirstPage: true,
  langPath: LANG_PATH, // the same model the app serves from public/ocr
  toSource: (g) => pngFromGray(g), // browser: a <canvas>
  onProgress: (p) => process.stdout.write(`\r  [${String(Math.round(p.pct)).padStart(3)}%] ${p.stage.padEnd(60)}`),
});
const ms = Date.now() - t0;
process.stdout.write('\r' + ' '.repeat(80) + '\r');
console.log(`OCR finished in ${(ms / 1000).toFixed(1)}s · confidence ${Math.round(out.confidence)} · quality ${out.quality} · passes: ${out.passes.join(', ')}`);
console.log(`page auto-crop: ${out.cropped ? 'yes' : 'no'}\n── recovered text ──\n${out.text}\n`);

const r = parser.parseResumeText(out.text, { ocr: true });
const resume = parser.parsedToResume(r);
const digits = (s) => String(s || '').replace(/\D/g, '');

const ocrChecks = [
  ['OCR recovered the candidate name', /rahul\s+verma/i.test(out.text)],
  ['OCR recovered the e-mail exactly', /rahul\.verma@gmail\.com/i.test(out.text)],
  ['OCR recovered the phone number', otp(out.text)],
  ['OCR recovered the employer and dates', /tcs/i.test(out.text) && /jun\s*2021/i.test(out.text)],
  ['OCR recovered the skills line', /docker/i.test(out.text) && /mysql/i.test(out.text)],
  ['nothing but readable text (no mojibake/garbage runs)', !/[\uFFFD\u0000]/.test(out.text) && !/\S{30,}/.test(out.text)],
];

const parseChecks = [
  ['form field · full name', /rahul\s+verma/i.test(resume.personal.fullName)],
  ['form field · e-mail', resume.personal.email === 'rahul.verma@gmail.com'],
  ['form field · phone', digits(resume.personal.phone).endsWith('9820011223')],
  ['form field · city', /mumbai/i.test(resume.personal.city)],
  ['form field · headline (target role)', /developer/i.test(resume.personal.headline)],
  ['form field · experience entry', resume.experience.length >= 1],
  ['form field · company', /tcs/i.test(resume.experience[0]?.company || '')],
  ['form field · start date', /jun\s*2021/i.test(resume.experience[0]?.start || '')],
  ['form field · still employed', resume.experience[0]?.current === true],
  ['form field · bullet points', (resume.experience[0]?.bullets || []).some((b) => /rest/i.test(b))],
  ['form field · skills', resume.skills.length >= 3 && resume.skills.some((s) => /docker/i.test(s))],
];

const ok = checks([...ocrChecks, ...parseChecks]);
console.log('\n── structured resume that auto-fills the form ──');
console.log(JSON.stringify({
  personal: resume.personal,
  experience: resume.experience.map((e) => ({ role: e.role, company: e.company, start: e.start, end: e.end, current: e.current, bullets: e.bullets })),
  skills: resume.skills,
}, null, 2));

process.exit(ok ? 0 : 1);

/** Phone numbers come back with spaces/dashes in several shapes — normalise. */
function otp(text) {
  const norm = text.replace(/[^\d\n]/g, ' ').replace(/\s+/g, ' ');
  return /98200\s*11223/.test(norm) || /9820011223/.test(norm.replace(/\s/g, ''));
}
