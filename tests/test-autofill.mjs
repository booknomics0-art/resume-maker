/**
 * Auto-fill + live-sync test (no browser needed).
 *
 * The import flow has one contract the user cares about most:
 *   "whatever is extracted must land in the form, and whatever I change in the
 *    form must show up in the resume — immediately."
 *
 * Both halves go through one object: the import draft. This test drives that
 * object exactly like the UI does (parse → fill → type → save) and asserts the
 * draft, the resume that the preview renders, and the hand-over to the editor
 * never drift apart.
 *
 *   node tests/test-autofill.mjs
 */

import { buildLibs, checks, shimSessionStorage, tmpDir } from './_harness.mjs';

shimSessionStorage();
const { parser, draft: store } = await buildLibs();

const SCANNED_OCR_TEXT = `RAHUL VERMA
Software Developer
Email: rahul.verma@gmail.com | Phone: +91 98200 11223 | Mumbai
WORK EXPERIENCE
Software Developer at TCS Mumbai Jun 2021 - Present
- Built REST API with Node.js
- Worked with MySQL database
SKILLS
JavaScript, Node.js, MySQL, Docker`;

// 1 ── extraction → structured fields (what the form is filled with)
const parsed = parser.parseResumeText(SCANNED_OCR_TEXT, { ocr: true });
const resume = parser.parsedToResume(parsed);

// 2 ── the importer writes the draft, exactly like ResumeImporter.handleFile
store.saveImportDraft({
  resume,
  fileName: 'icc-scanned-resume.pdf',
  fileSize: 87113,
  format: 'pdf',
  meta: { method: 'ocr', pages: 1, ocrPages: 1, ocrConfidence: 86, warning: 'Scanned/image PDF — text was read with the built-in OCR engine.' },
  rawText: SCANNED_OCR_TEXT,
});
store.rememberImportInfo(resume.id, {
  fileName: 'icc-scanned-resume.pdf',
  format: 'pdf',
  meta: { method: 'ocr', ocrConfidence: 86 },
});

const loaded = store.loadImportDraft();
const filled = loaded?.resume;

// 3 ── "type in the form": a keystroke goes through the same set() the UI uses
const edited = { ...filled, personal: { ...filled.personal, city: 'Thane', headline: 'Senior Software Developer' } };
store.updateDraftResume(edited);

// 4 ── the preview renders draftResumeFor(id) — it must already show the edit
const previewed = store.draftResumeFor(edited.id);

// 5 ── the editor picks the unsaved draft up instead of an empty page
const resumedForEditor = store.draftResumeFor(edited.id);

// 6 ── saving clears the draft but keeps the "imported from" info for the editor
store.clearImportDraft();
const afterSave = store.loadImportDraft();
const info = store.importInfoFor(edited.id);

const ok = checks([
  ['name extracted into the form', filled?.personal.fullName === 'Rahul Verma'],
  ['headline extracted', /developer/i.test(filled?.personal.headline || '')],
  ['email extracted', filled?.personal.email === 'rahul.verma@gmail.com'],
  ['phone extracted', String(filled?.personal.phone).replace(/\D/g, '').endsWith('9820011223')],
  ['city extracted', /mumbai/i.test(filled?.personal.city || '')],
  ['experience row built (role · company · dates)', !!filled?.experience[0] && /tcs/i.test(filled.experience[0].company) && filled.experience[0].current === true],
  ['skills parsed', (filled?.skills.length || 0) >= 4],
  ['draft is stored with the file it came from', loaded?.fileName === 'icc-scanned-resume.pdf' && loaded?.format === 'pdf'],
  ['preview shows the edit as soon as it is typed', previewed?.personal.city === 'Thane'],
  ['preview shows the edited headline too', previewed?.personal.headline === 'Senior Software Developer'],
  ['the editor opens the same unsaved draft', resumedForEditor?.personal.city === 'Thane'],
  ['everything else survives the edit', resumedForEditor?.skills.length === filled.skills.length],
  ['saving retires the draft', afterSave === null],
  ['the editor still knows it was an import', info?.fileName === 'icc-scanned-resume.pdf' && info?.meta?.method === 'ocr'],
]);

console.log(`\ndraft store key: craftcv.import.draft.v1 · editor hand-over: ${resumedForEditor?.id}`);
process.exit(ok ? 0 : 1);
