import fs from 'node:fs';

const exact = fs.readFileSync('src/components/ExactResumeEditor.tsx', 'utf8');
const original = fs.readFileSync('src/lib/originalDocument.ts', 'utf8');
const navigation = fs.readFileSync('src/lib/navigation.ts', 'utf8');
const motion = fs.readFileSync('src/lib/routeMotion.ts', 'utf8');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

// The exact editor must default to a clean untouched document view, not an
// always-on contentEditable/Word-like surface.
check(exact.includes("useState<ViewMode>('original')"), 'Exact editor must open in Original mode.');
check(!exact.includes('contentEditable'), 'Exact editor must not place contentEditable boxes across the PDF.');
check(exact.includes('Quick edit'), 'Explicit Quick edit mode is required.');
check(exact.includes('Download original'), 'Original-file download must remain available.');
check(exact.includes('loadSavedEdits') && exact.includes('serializeEdits'), 'Exact edits must persist locally across refreshes.');
check(exact.includes('exact2-inspector'), 'Editing controls must live in a separate inspector instead of over the document.');
check(exact.includes('exact2-hit'), 'PDF text hit areas are required in Quick edit mode.');
check(exact.includes('exact2-replacement'), 'Only changed text should render as a replacement overlay.');

// Source preservation must cover both file picker and drag/drop uploads.
check(original.includes("addEventListener('change'"), 'File-picker source capture is required.');
check(original.includes("addEventListener('drop'"), 'Drag/drop source capture is required.');
check(original.includes('savePendingOriginal(file)'), 'Original Blob must be saved before exact editing.');

// Same-route navigation must emit a signal because hashchange does not fire.
check(navigation.includes("'craftcv:navigate'"), 'navigate() must emit the app navigation event.');
check(navigation.includes('sameRoute'), 'navigate() must detect same-route clicks.');
check(motion.includes("addEventListener('craftcv:navigate'"), 'Route motion must listen for same-route navigation.');

console.log('✓ Exact Editor V2 architecture guard passed');
