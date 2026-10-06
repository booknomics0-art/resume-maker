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
const editor = readFileSync('src/components/Editor.tsx', 'utf8');
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

// PDF regression: CSS masks can render in the live browser but disappear when
// headless Chromium prints the serialized sheet. The icon must therefore be an
// actual inline SVG child. Editor exports sheet.outerHTML, so that SVG travels
// with the document into /api/pdf and becomes vector geometry in the PDF.
ok('contact icons are created as real inline SVG nodes',
  polishTs.includes("document.createElementNS(SVG_NS, name)") &&
  polishTs.includes("class: 'contact-icon'") &&
  polishTs.includes("'data-contact-icon': kind"));
ok('all five contact kinds have SVG geometry',
  polishTs.includes("kind === 'email'") &&
  polishTs.includes("kind === 'phone'") &&
  polishTs.includes("kind === 'location'") &&
  polishTs.includes("kind === 'linkedin'") &&
  polishTs.includes("svgNode('circle'"));
ok('runtime prepends the SVG into each contact line',
  polishTs.includes('el.prepend(createContactIcon(kind))'));
ok('contact changes are reclassified without duplicating icons',
  polishTs.includes("querySelector(':scope > .contact-icon')") &&
  polishTs.includes("existing?.getAttribute('data-contact-icon') === kind"));
ok('PDF export serializes the enhanced sheet HTML',
  editor.includes('html: sheet.outerHTML'));
ok('CSS no longer relies on masks or Unicode icon glyphs',
  !polishCss.includes('mask-image: var(--contact-icon)') &&
  !polishCss.includes('content: "✉"') &&
  !polishCss.includes('content: "☎"') &&
  !polishCss.includes('content: "⌖"'));
ok('inline SVG icons are print-preserved',
  polishCss.includes('.sheet .contact-icon') &&
  polishCss.includes('-webkit-print-color-adjust: exact') &&
  polishCss.includes('print-color-adjust: exact'));

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
