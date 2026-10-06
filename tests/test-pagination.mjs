import fs from 'node:fs';
import assert from 'node:assert/strict';

const pagination = fs.readFileSync(new URL('../src/pagination.css', import.meta.url), 'utf8');
const main = fs.readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const pdf = fs.readFileSync(new URL('../api/pdf.ts', import.meta.url), 'utf8');

assert.match(main, /import ['"]\.\/pagination\.css['"];?/,
  'pagination.css must be loaded by the app');

assert.match(pagination, /@page\s*\{[\s\S]*size:\s*A4;[\s\S]*margin:/,
  'A4 print rules must define repeated physical page margins');
assert.match(pagination, /\.print-root \.sheet\s*\{[\s\S]*width:\s*auto\s*!important/,
  'print sheet must fit the page content box instead of overflowing 210mm');
assert.match(pagination, /\.sheet \.s-item[\s\S]*break-inside:\s*auto\s*!important/,
  'long resume entries must be allowed to continue on the next page');
assert.match(pagination, /\.sheet \.s-item-head[\s\S]*break-after:\s*avoid-page/,
  'role/company/date headers must stay attached to their evidence');
assert.match(pagination, /\.tpl-timeline \.tl-row[\s\S]*display:\s*block\s*!important/,
  'timeline entries must not remain an indivisible one-row CSS grid in print');
assert.match(pagination, /orphans:\s*3/,
  'print typography should protect against stranded lines');
assert.match(pagination, /widows:\s*3/,
  'print typography should protect against stranded lines');

assert.match(pdf, /PRINT_GUARD_CSS/,
  'server PDF renderer must include a layout safety guard');
assert.match(pdf, /@page \{ size: A4; margin: 10mm 9mm 12mm 9mm; \}/,
  'server PDF guard must enforce the same repeated safe margins');
assert.match(pdf, /\$\{css\}[\s\S]*\$\{PRINT_GUARD_CSS\}/,
  'server safety guard must be injected after collected client CSS');

console.log('✓ professional multi-page pagination contract');
