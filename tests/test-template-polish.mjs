/** Regression checks for contact classification and legacy photo-source repair. */
import { mkdirSync, writeFileSync } from 'node:fs';
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
const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

ok('email gets email icon class', mod.classifyContactValue('name@example.com') === 'email');
ok('Indian phone gets phone icon class', mod.classifyContactValue('+91 98765 43210') === 'phone');
ok('city remains location', mod.classifyContactValue('Delhi, India') === 'location');
ok('LinkedIn is distinct from website', mod.classifyContactValue('linkedin.com/in/test') === 'linkedin');
ok('portfolio is website', mod.classifyContactValue('example.dev') === 'website');

const spacedJpeg = 'data:image/jpeg;base64,/9j/ AAAA\nBBBB';
ok('whitespace in old JPEG data URL is repaired',
  mod.repairResumeImageSource(spacedJpeg) === 'data:image/jpeg;base64,/9j/AAAABBBB');
ok('raw JPEG base64 gets MIME prefix',
  mod.repairResumeImageSource('/9j/AAAA') === 'data:image/jpeg;base64,/9j/AAAA');
ok('raw PNG base64 gets MIME prefix',
  mod.repairResumeImageSource('iVBORw0KGgo=') === 'data:image/png;base64,iVBORw0KGgo=');
ok('normal URL is left untouched',
  mod.repairResumeImageSource('https://example.com/photo.jpg') === 'https://example.com/photo.jpg');

process.exit(checks(out) ? 0 : 1);
