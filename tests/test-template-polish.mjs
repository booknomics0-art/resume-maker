/** Regression checks for contact classification, legacy photo repair, and premium template polish. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });
const entry = join(tmpDir, 'template-polish-entry.ts');
const outfile = join(tmpDir, 'template-polish-bundle.js');
writeFileSync(entry, `
  export { classifyContactValue, repairResumeImageSource } from '../../src/lib/templatePolish';
`);

await build({
  entryPoints: [entry],
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  outfile,
  logLevel: 'error',
});

const mod = await import(pathToFileURL(outfile).href);
const polishCss = readFileSync('src/template-polish.css', 'utf8');
const polishTs = readFileSync('src/lib/templatePolish.ts', 'utf8');
const gallery = readFileSync('src/components/TemplateGallery.tsx', 'utf8');
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

ok('email gets email icon class', mod.classifyContactValue('name@example.com') === 'email');
ok('Indian phone gets phone icon class', mod.classifyContactValue('+91 98765 43210') === 'phone');
ok('city remains location', mod.classifyContactValue('Delhi, India') === 'location');
ok('LinkedIn is distinct from website', mod.classifyContactValue('linkedin.com/in/test') === 'linkedin');
ok('portfolio is website', mod.classifyContactValue('example.dev') === 'website');

// Every contact rendering family is normalized by one runtime enhancer, so
// individual templates cannot silently miss the icon treatment.
ok('contact enhancer covers standard, masthead, tint and quick-editor surfaces',
  polishTs.includes('.s-contact > span') &&
  polishTs.includes('.contact-line') &&
  polishTs.includes('.mast-strip > span') &&
  polishTs.includes('.tint-contact > span') &&
  polishTs.includes('.quick-contact'));
ok('contact enhancer also covers facts-rail Contact blocks',
  polishTs.includes('enhanceRailContactBlocks') && polishTs.includes("heading !== 'contact'"));

// Font glyphs disappeared on some mobile/PDF environments. Email, phone and
// location must use SVG masks instead of Unicode characters so all 50 template
// variants and exported PDFs render the same icon geometry.
ok('email icon is a font-independent SVG mask',
  polishCss.includes('data-contact-kind="email"') &&
  polishCss.includes("viewBox='0 0 24 24'") && polishCss.includes('mask-image: var(--contact-icon)'));
ok('phone icon is a font-independent SVG mask',
  polishCss.includes('data-contact-kind="phone"') && polishCss.includes('M22 16.9v3'));
ok('location icon is a font-independent SVG mask',
  polishCss.includes('data-contact-kind="location"') && polishCss.includes("M20 10c0 5-8 12-8 12"));
ok('contact icons are forced into downloaded PDFs',
  polishCss.includes('-webkit-print-color-adjust: exact') && polishCss.includes('print-color-adjust: exact'));
ok('legacy Unicode email/phone/location glyphs are not used',
  !polishCss.includes('content: "✉"') &&
  !polishCss.includes('content: "☎"') &&
  !polishCss.includes('content: "⌖"'));

const spacedJpeg = 'data:image/jpeg;base64,/9j/ AAAA\nBBBB';
ok('whitespace in old JPEG data URL is repaired',
  mod.repairResumeImageSource(spacedJpeg) === 'data:image/jpeg;base64,/9j/AAAABBBB');
ok('raw JPEG base64 gets MIME prefix',
  mod.repairResumeImageSource('/9j/AAAA') === 'data:image/jpeg;base64,/9j/AAAA');
ok('raw PNG base64 gets MIME prefix',
  mod.repairResumeImageSource('iVBORw0KGgo=') === 'data:image/png;base64,iVBORw0KGgo=');
ok('normal URL is left untouched',
  mod.repairResumeImageSource('https://example.com/photo.jpg') === 'https://example.com/photo.jpg');

ok('Analyst Spine is removed from the public catalogue',
  gallery.includes("'data-spine', 'care-spine'") && gallery.includes('REMOVED_TEMPLATE_IDS'));
ok('legacy spine resumes no longer render a vertical candidate name',
  polishCss.includes('.tpl-spine .spine-name') && polishCss.includes('display: none !important'));
ok('legacy spine resumes use a restrained top-right photo treatment',
  polishCss.includes('.tpl-spine .spine-photo') && polishCss.includes('right: 42px !important'));
ok('mobile imported editor hides redundant mode copy',
  polishCss.includes('.import-editor-copy span') && polishCss.includes('display: none !important'));
ok('mobile premium editor hides technical page metadata',
  polishCss.includes('.premium3-page-label') && polishCss.includes('.premium3-meta'));
ok('mobile template picker hides duplicated explanatory copy',
  polishCss.includes('.tpl-meta') && polishCss.includes('.tpl-blurb'));

process.exit(checks(out) ? 0 : 1);
