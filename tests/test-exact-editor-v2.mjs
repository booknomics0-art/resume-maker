import fs from 'node:fs';

const exact = fs.readFileSync('src/components/ExactResumeEditor.tsx', 'utf8');
const mobileExact = fs.readFileSync('src/components/MobileExactResumeEditor.tsx', 'utf8');
const premium = fs.readFileSync('src/components/PremiumPdfEditor.tsx', 'utf8');
const enhanced = fs.readFileSync('src/components/EnhancedEditor.tsx', 'utf8');
const exactCss = fs.readFileSync('src/exact-editor-v2.css', 'utf8');
const original = fs.readFileSync('src/lib/originalDocument.ts', 'utf8');
const navigation = fs.readFileSync('src/lib/navigation.ts', 'utf8');
const motion = fs.readFileSync('src/lib/routeMotion.ts', 'utf8');
const mobileSaveGuard = fs.readFileSync('src/lib/mobileImportSaveGuard.ts', 'utf8');
const main = fs.readFileSync('src/main.tsx', 'utf8');

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
check(exactCss.includes('.exact2-workspace.viewing .exact2-replacement'), 'Original mode must hide all edited overlays.');
check(main.includes("import './exact-editor-v2.css'"), 'Original-view safeguard CSS must be loaded.');

// Premium editing must work on the preserved source PDF/image instead of
// reconstructing an OCR parse into the generic QuickResumeEditor template.
check(enhanced.includes("import PremiumPdfEditor from './PremiumPdfEditor'"), 'Imported resumes must expose the premium source-preserving editor.');
check(!enhanced.includes("import QuickResumeEditor from './QuickResumeEditor'"), 'Imported Premium edit must not rebuild the document in QuickResumeEditor.');
check(enhanced.includes("mode === 'word'") && enhanced.includes('<PremiumPdfEditor'), 'Premium edit mode must route to PremiumPdfEditor.');
check(premium.includes('loadOriginalDocument') && premium.includes('claimPendingOriginal'), 'Premium editor must load the original uploaded file.');
check(premium.includes("import('pdfjs-dist')"), 'Premium editor must render the real PDF with pdf.js.');
check(premium.includes('original PDF is the canvas'), 'Premium editor must make source preservation explicit.');
check(premium.includes('premium-ribbon'), 'Premium editor must provide a desktop-quality formatting ribbon.');
check(premium.includes('type="color"') && premium.includes('fontFamily') && premium.includes('lineHeight'), 'Premium editor must support font, colour and line spacing controls.');
check(premium.includes('applyList(false)') && premium.includes('applyList(true)'), 'Premium editor must support bullet and numbered list formatting.');
check(premium.includes('undoRef') && premium.includes('redoRef'), 'Premium editor must provide undo/redo history.');
check(premium.includes('1080') && premium.includes("matchMedia('(max-width: 760px)')"), 'Premium mobile PDF rendering must cap canvas memory.');
check(premium.includes('position:fixed') && premium.includes('46dvh'), 'Premium mobile editing must use a touch-friendly bottom sheet.');
check(premium.includes('min-width:20px!important') && premium.includes('min-height:20px!important'), 'Premium mobile text targets must remain touchable.');
check(!premium.includes('autoFocus'), 'Premium mobile editor must not force-open the keyboard.');

// Mobile imported resumes get a purpose-built lightweight Original editor rather
// than squeezing the desktop exact workspace into a phone viewport.
check(enhanced.includes('MobileExactResumeEditor'), 'Imported mobile resumes must keep the lightweight Original editor.');
check(enhanced.includes("matchMedia('(max-width: 900px)')"), 'Mobile exact routing must match the app mobile breakpoint.');
check(mobileExact.includes('1050 / Math.max'), 'Mobile PDF rendering must cap canvas resolution to avoid memory spikes.');
check(mobileExact.includes('min-width:18px!important') && mobileExact.includes('min-height:18px!important'), 'Mobile text edit hit targets must remain touchable.');
check(mobileExact.includes("useState<Mode>('view')"), 'Mobile exact editor must open in untouched Original view.');
check(!mobileExact.includes('autoFocus'), 'Mobile editor must not force-open the keyboard on text selection.');

// Source preservation must cover both file picker and drag/drop uploads.
check(original.includes("addEventListener('change'"), 'File-picker source capture is required.');
check(original.includes("addEventListener('drop'"), 'Drag/drop source capture is required.');
check(original.includes('savePendingOriginal(file)'), 'Original Blob must be saved before exact editing.');

// Same-route navigation must emit a signal because hashchange does not fire.
check(navigation.includes("'craftcv:navigate'"), 'navigate() must emit the app navigation event.');
check(navigation.includes('sameRoute'), 'navigate() must detect same-route clicks.');
check(navigation.includes('active.blur()'), 'Mobile navigation must dismiss active controls/keyboard before mounting the next screen.');
check(motion.includes("addEventListener('craftcv:navigate'"), 'Route motion must listen for same-route navigation.');

// When Save is tapped from the hidden mobile Preview pane, importer validation
// errors must automatically return the user to the visible Edit fields pane.
check(main.includes('installMobileImportSaveGuard'), 'Mobile import save guard must be installed.');
check(mobileSaveGuard.includes('surfaceImportError'), 'Mobile save guard must surface validation errors.');
check(mobileSaveGuard.includes('Edit fields'.toLowerCase()) || mobileSaveGuard.toLowerCase().includes('edit fields'), 'Mobile save guard must return to Edit fields.');

console.log('✓ Exact Editor V2 + premium PDF editor + mobile save-flow guard passed');
