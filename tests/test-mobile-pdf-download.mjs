import fs from 'node:fs';

const editor = fs.readFileSync('src/components/Editor.tsx', 'utf8');
const helper = fs.readFileSync('src/lib/mobilePdfDownload.ts', 'utf8');

function check(condition, message) {
  if (!condition) throw new Error(message);
}

check(helper.includes("/iPad|iPhone|iPod/i"), 'iOS/iPadOS browsers must be detected for download handoff.');
check(helper.includes('link.download = download.filename'), 'Normal browsers must keep a real download-attribute path.');
check(helper.includes('navigator.share') && helper.includes('files: [file]'), 'Mobile save flow must support native file sharing.');
check(helper.includes("window.open(download.url, '_blank'"), 'There must be a user-gesture Open PDF fallback.');
check(editor.includes('pdf-download-status') && editor.includes('aria-live="polite"'), 'Editor must show a visible PDF status notification.');
check(editor.includes('PDF ready') && editor.includes('Download again'), 'Ready state must provide an explicit retry/download action.');
check(editor.includes('Save PDF') && editor.includes('Open PDF'), 'Mobile users must get explicit Save and Open actions after generation.');
check(editor.includes('AbortController') && editor.includes('PDF generation timed out'), 'Generation must not remain stuck on Preparing PDF forever.');

console.log('✓ Mobile PDF download handoff + visible ready state passed');
