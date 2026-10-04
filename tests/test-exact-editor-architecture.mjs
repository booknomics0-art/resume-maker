import fs from 'node:fs';

const exact = fs.readFileSync('src/components/ExactResumeEditor.tsx', 'utf8');
const enhanced = fs.readFileSync('src/components/EnhancedEditor.tsx', 'utf8');
const original = fs.readFileSync('src/lib/originalDocument.ts', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');
const importer = fs.readFileSync('src/components/ResumeImporter.tsx', 'utf8');
const parser = fs.readFileSync('src/lib/resumeParser.ts', 'utf8');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(enhanced.includes("ExactResumeEditor"), 'Imported resumes must route to ExactResumeEditor.');
check(!enhanced.includes("QuickResumeEditor"), 'Quick rebuild editor must not be the imported-resume default.');
check(main.includes('installOriginalUploadCapture();'), 'Original upload capture must be installed before editing.');
check(main.includes('installRouteMotion();'), 'Route slide motion must be installed.');
check(original.includes('IndexedDB') || original.includes('indexedDB'), 'Original resume must be stored as a local Blob, not reconstructed fields only.');
check(original.includes("accept.includes('.pdf')") && original.includes("accept.includes('.docx')"), 'Capture guard must target the resume upload input.');
check(exact.includes('page.render'), 'Exact editor must render the original PDF page artwork.');
check(exact.includes('page.getTextContent'), 'Exact editor must derive editable text positions from the PDF text layer.');
check(exact.includes('saveBlob(source.blob'), 'Unchanged PDFs must download the preserved original file.');
check(exact.includes('original layout preserved'), 'Exact editor must communicate source-layout preservation.');

// Guard the systems the user explicitly asked us not to replace.
check(importer.includes('parseResumeFile'), 'Existing upload/OCR pipeline must remain present.');
check(parser.includes('extractPdfSmart'), 'Existing smart PDF extraction/OCR pipeline must remain present.');

console.log('✓ exact editor architecture guard passed');
