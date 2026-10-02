/**
 * Regression test for resume profile-photo persistence.
 * The sanitizer must preserve validated raster image data URLs instead of
 * truncating them to the generic 5,000-character text limit.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { checks, tmpDir } from './_harness.mjs';

mkdirSync(tmpDir, { recursive: true });

const entry = join(tmpDir, 'photo-persistence-entry.ts');
const outfile = join(tmpDir, 'photo-persistence-bundle.js');
writeFileSync(entry, `
  export { sanitizeResumeData, isSafeString } from '../../src/lib/security';
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

const security = await import(pathToFileURL(outfile).href);
const { sanitizeResumeData, isSafeString } = security;

const out = [];
const ok = (name, cond) => out.push([name, !!cond]);

const photo = 'data:image/jpeg;base64,' + 'A'.repeat(12000);
const sanitized = sanitizeResumeData({ personal: { photo } });
ok('long JPEG data URL survives unchanged', sanitized.personal.photo === photo);

const png = 'data:image/png;base64,' + 'B'.repeat(9000);
ok('long PNG data URL survives unchanged',
  sanitizeResumeData({ photo: png }).photo === png);

const svg = 'data:image/svg+xml;base64,' + 'PHN2Zz48L3N2Zz4=';
ok('SVG data URL is rejected', sanitizeResumeData({ photo: svg }).photo === '');

const htmlData = 'data:text/html,<script>alert(1)</script>';
ok('dangerous HTML data is not preserved as an image',
  sanitizeResumeData({ photo: htmlData }).photo !== htmlData);

const longText = 'x'.repeat(7000);
ok('ordinary long text still uses the 5,000-char guard',
  sanitizeResumeData({ summary: longText }).summary.length === 5000);

ok('repeated global-regex checks stay deterministic',
  isSafeString('javascript:alert(1)') === false &&
  isSafeString('javascript:alert(1)') === false);

process.exit(checks(out) ? 0 : 1);
