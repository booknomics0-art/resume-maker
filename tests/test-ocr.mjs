/**
 * OCR test: runs tesseract.js directly on a scanned-resume JPEG (exactly what
 * the browser fallback does after pdf.js renders a scanned page to canvas).
 * Verifies OCR recovers name/email/phone/skills text that the parser accepts.
 */
import fs from 'node:fs';
import { createWorker } from 'tesseract.js';
import { parseResumeText } from '../src/lib/resumeParser.js';

const img = fs.readFileSync(process.argv[2] || '/tmp/scan.jpg');
console.log('Running OCR on scanned image…');
const worker = await createWorker('eng', 1, {
  logger: m => { if (m.status === 'recognizing text') process.stdout.write(`\rOCR progress: ${Math.round(m.progress * 100)}%`); },
});
try {
  await worker.setParameters({ preserve_interword_spaces: '1' });
  const { data } = await worker.recognize(img);
  const text = (data.text || '').replace(/\r/g, '');
  console.log('\n\n── OCR text ──');
  console.log(text.trim().slice(0, 600));

  const checks = [
    ['email', /rahul\.verma@gmail\.com/i.test(text)],
    ['phone', /98200\s*11223/.test(text.replace(/[^\d\s]/g, ' ').replace(/\s+/g, ' ')) || /98200/.test(text)],
    ['experience header', /WORK\s+EXPERIENCE/i.test(text)],
    ['company', /TCS/i.test(text)],
    ['date range', /Jun\s*2021/i.test(text) && /Present/i.test(text)],
    ['bullets', /REST\s*APIs/i.test(text) && /Node\.?js/i.test(text)],
    ['skills', /MySQL/i.test(text) && /Docker/i.test(text)],
  ];
  let pass = 0;
  console.log('');
  for (const [n, ok] of checks) { console.log(`${ok ? '✅' : '❌'} ${n}`); if (ok) pass++; }

  // ── end-to-end: OCR text → structured resume ──
  const parsed = parseResumeText(text);
  const r = parsed;
  const pchecks = [
    ['parsed name (email fallback)', /rahul\s+verma/i.test(r.contact.name || '')],
    ['parsed email', r.contact.email === 'rahul.verma@gmail.com'],
    ['parsed phone', (r.contact.phone || '').replace(/\D/g, '').endsWith('9820011223')],
    ['parsed city', /mumbai/i.test(r.contact.city || '')],
    ['parsed experience', r.experience.length >= 1 && /developer/i.test(r.experience[0]?.role || '')],
    ['parsed company', /tcs/i.test(r.experience[0]?.company || '')],
    ['parsed dates', /jun 2021/i.test(r.experience[0]?.start || '') && r.experience[0]?.current === true],
    ['parsed skills', r.skills.length >= 3 && r.skills.some(s => /docker/i.test(s))],
  ];
  for (const [n, ok] of pchecks) { console.log(`${ok ? '✅' : '❌'} e2e ${n}`); if (ok) pass++; }
  console.log(`\n${pass}/${checks.length + pchecks.length} OCR checks passed`);
  process.exit(pass === checks.length + pchecks.length ? 0 : 1);
} finally {
  await worker.terminate();
}
